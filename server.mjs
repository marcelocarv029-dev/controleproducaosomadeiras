import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createInitialDatabase } from './public/js/seed.js';
import { applySyncOp } from './public/js/logic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

export function loadOrCreateDb(dbFilePath = DB_FILE) {
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dbFilePath)) {
    const initial = createInitialDatabase();
    fs.writeFileSync(dbFilePath, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    const initial = createInitialDatabase();
    fs.writeFileSync(dbFilePath, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

export function saveDb(db, dbFilePath = DB_FILE) {
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpFile = `${dbFilePath}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, dbFilePath);
}

function readJsonBody(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload muito grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

export function createAppServer(options = {}) {
  const dbFilePath = options.dbFilePath || DB_FILE;
  let db = loadOrCreateDb(dbFilePath);

  const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(urlObj.pathname);

    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, time: new Date().toISOString() });
    }

    if (req.method === 'GET' && pathname === '/api/state') {
      return sendJson(res, 200, { ok: true, state: db });
    }

    if (req.method === 'POST' && pathname === '/api/sync') {
      try {
        const body = await readJsonBody(req);
        const ops = Array.isArray(body.ops) ? body.ops : [];
        const results = [];
        let changed = false;

        for (const op of ops) {
          const r = applySyncOp(db, op);
          results.push({ opId: op?.opId, ...r });
          if (r.ok && !r.duplicate) {
            changed = true;
          }
        }

        if (changed) {
          saveDb(db, dbFilePath);
        }

        return sendJson(res, 200, { ok: true, results, state: db });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (req.method === 'GET' && pathname === '/api/backup') {
      const dateStr = new Date().toISOString().slice(0, 10);
      return sendJson(res, 200, db, {
        'Content-Disposition': `attachment; filename="controle-producao-backup-${dateStr}.json"`
      });
    }

    if (req.method === 'POST' && pathname === '/api/restore') {
      try {
        const body = await readJsonBody(req);
        const candidate = body.state || body;
        if (!candidate || !Array.isArray(candidate.usuarios) || !Array.isArray(candidate.produtos) || !Array.isArray(candidate.producoes)) {
          return sendJson(res, 400, { ok: false, error: 'Arquivo de backup inválido' });
        }
        db = candidate;
        db.updatedAt = new Date().toISOString();
        saveDb(db, dbFilePath);
        return sendJson(res, 200, { ok: true, state: db });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // Serve static files from public/
    let relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const safePath = path.normalize(path.join(PUBLIC_DIR, relPath));
    if (!safePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('Acesso negado');
      return;
    }

    let targetFile = safePath;
    if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
      // SPA fallback for client routes
      targetFile = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(targetFile).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const cacheHeader = relPath === 'sw.js' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=300';

    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': cacheHeader
    });
    fs.createReadStream(targetFile).pipe(res);
  });

  return server;
}

function getLocalNetworkUrls(port) {
  const urls = [`http://localhost:${port}`];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${port}`);
      }
    }
  }
  return urls;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isMain) {
  const PORT = Number(process.env.PORT) || 3000;
  const server = createAppServer();
  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n=================================================');
    console.log('  CONTROLE DE PRODUÇÃO - SOMADEIRAS (PWA)');
    console.log('=================================================');
    for (const url of getLocalNetworkUrls(PORT)) {
      console.log(`  Acesse: ${url}`);
    }
    console.log('  Banco de dados: data/db.json');
    console.log('=================================================\n');
  });
}
