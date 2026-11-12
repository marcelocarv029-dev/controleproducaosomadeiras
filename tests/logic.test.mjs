import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { Writable } from 'node:stream';

import { createInitialDatabase } from '../public/js/seed.js';
import { getLocalDateStr } from '../public/js/utils.js';
import {
  SECTORS,
  ROLES,
  PROD_STATUS,
  computeProductionSummary,
  computeDashboardKpis,
  parseVoiceProduction,
  executeGlobalSearch,
  applySyncOp,
  canEditEntry,
  canRegisterProduction,
  getDefaultRouteForUser
} from '../public/js/logic.js';
import { createAppServer } from '../server.mjs';
import {
  getSupabaseConfig,
  loadSupabaseState,
  syncOpsWithSupabase
} from '../api/_lib/supabaseStore.js';
import healthHandler from '../api/health.js';

function createTestDatabase() {
  const db = createInitialDatabase();
  const hoje = getLocalDateStr();
  db.produtos = [
    { id: 'prd_canaleta14', nome: 'Canaleta 14', setor: SECTORS.PRE_MOLDADOS, unidade: 'UN', codigo: 'PM001', ativo: true, foto: '' },
    { id: 'prd_manilha30', nome: 'Manilha 30', setor: SECTORS.PRE_MOLDADOS, unidade: 'UN', codigo: 'PM003', ativo: true, foto: '' },
    { id: 'prd_estaca2m', nome: 'Estaca 2M', setor: SECTORS.PRE_MOLDADOS, unidade: 'UN', codigo: 'PM004', ativo: true, foto: '' },
    { id: 'prd_bloco14', nome: 'Bloco 14', setor: SECTORS.PRE_MOLDADOS, unidade: 'UN', codigo: 'PM005', ativo: true, foto: '' },
    { id: 'prd_porta080', nome: 'Porta 0,80 x 2,10', setor: SECTORS.MARCENARIA, unidade: 'UN', codigo: 'MC001', ativo: true, foto: '' },
    { id: 'prd_mesa', nome: 'Mesa de Madeira', setor: SECTORS.MARCENARIA, unidade: 'UN', codigo: 'MC005', ativo: true, foto: '' }
  ];
  db.producoes = [
    {
      id: 'reg_hoje_1', produtoId: 'prd_canaleta14', setor: SECTORS.PRE_MOLDADOS,
      quantidade: 120, quantidadeQuebrada: 8, quantidadeAproveitavel: 112, quantidadeConferida: 112,
      data: hoje, hora: '08:40', usuarioId: 'usr_pre', criadoPorId: 'usr_pre', status: PROD_STATUS.ENTRADA_REALIZADA
    },
    {
      id: 'reg_hoje_2', produtoId: 'prd_manilha30', setor: SECTORS.PRE_MOLDADOS,
      quantidade: 25, quantidadeQuebrada: 0, quantidadeAproveitavel: 25, quantidadeConferida: null,
      data: hoje, hora: '09:50', usuarioId: 'usr_pre', criadoPorId: 'usr_pre', status: PROD_STATUS.PRODUZIDO
    },
    {
      id: 'reg_hoje_3', produtoId: 'prd_estaca2m', setor: SECTORS.PRE_MOLDADOS,
      quantidade: 50, quantidadeQuebrada: 2, quantidadeAproveitavel: 48, quantidadeConferida: 48,
      data: hoje, hora: '11:10', usuarioId: 'usr_pre', criadoPorId: 'usr_pre', status: PROD_STATUS.ENTRADA_REALIZADA
    },
    {
      id: 'reg_hoje_4', produtoId: 'prd_porta080', setor: SECTORS.MARCENARIA,
      quantidade: 8, quantidadeQuebrada: 0, quantidadeAproveitavel: 8, quantidadeConferida: 8,
      data: hoje, hora: '10:05', usuarioId: 'usr_mar', criadoPorId: 'usr_mar', status: PROD_STATUS.ENTRADA_REALIZADA
    },
    {
      id: 'reg_hoje_5', produtoId: 'prd_mesa', setor: SECTORS.MARCENARIA,
      quantidade: 3, quantidadeQuebrada: 0, quantidadeAproveitavel: 3, quantidadeConferida: 3,
      data: hoje, hora: '14:20', usuarioId: 'usr_mar', criadoPorId: 'usr_mar', status: PROD_STATUS.CONFERIDO
    }
  ];
  return db;
}

test('Banco inicial em produção começa limpo (sem produtos nem produções falsas)', () => {
  const db = createInitialDatabase();
  assert.equal(db.produtos.length, 0);
  assert.equal(db.producoes.length, 0);
  assert.equal(db.quebras.length, 0);
  assert.equal(db.entradas.length, 0);
  assert.equal(db.notificacoes.length, 0);
  assert.equal(db.usuarios.length, 5);
});

test('Cálculo automático: produção bruta - quebras = aproveitável e status correto', () => {
  const db = createTestDatabase();
  const actor = db.usuarios[0];

  const r1 = applySyncOp(db, {
    opId: 'op_prod_1',
    type: 'SAVE_PRODUCTION',
    actorId: actor.id,
    actorName: actor.nome,
    payload: { produtoId: 'prd_canaleta14', quantidade: 120 }
  });
  assert.equal(r1.ok, true);
  assert.equal(r1.record.status, PROD_STATUS.PRODUZIDO);

  const r2 = applySyncOp(db, {
    opId: 'op_brk_1',
    type: 'REGISTER_BREAKAGE',
    actorId: actor.id,
    actorName: actor.nome,
    payload: { producaoId: r1.record.id, quantidade: 8, motivo: 'Desenforma' }
  });
  assert.equal(r2.ok, true);
  assert.equal(r2.record.quantidadeQuebrada, 8);
  assert.equal(r2.record.quantidadeAproveitavel, 112);

  const summary = computeProductionSummary(r2.record);
  assert.equal(summary.produzida, 120);
  assert.equal(summary.quebrada, 8);
  assert.equal(summary.aproveitavel, 112);
  assert.equal(summary.entradaRealizada, false);
  assert.equal(summary.statusBadge, '🟠 AGUARDANDO ENTRADA');
});

test('Conferência detecta divergência sem apagar valor original e permite entrada', () => {
  const db = createTestDatabase();
  const confUser = db.usuarios.find((u) => u.perfil === ROLES.CONFERENCIA);

  const r1 = applySyncOp(db, {
    opId: 'op_p2',
    type: 'SAVE_PRODUCTION',
    actorId: 'usr_pre',
    payload: { produtoId: 'prd_canaleta14', quantidade: 120 }
  });
  applySyncOp(db, {
    opId: 'op_b2',
    type: 'REGISTER_BREAKAGE',
    actorId: 'usr_pre',
    payload: { producaoId: r1.record.id, quantidade: 8 }
  });

  const c1 = applySyncOp(db, {
    opId: 'op_c2',
    type: 'CONFIRM_CONFERENCE',
    actorId: confUser.id,
    actorName: confUser.nome,
    payload: { producaoId: r1.record.id, quantidadeConferida: 110 }
  });
  assert.equal(c1.ok, true);
  assert.equal(c1.record.status, PROD_STATUS.DIVERGENCIA);
  assert.equal(c1.record.quantidade, 120);
  assert.equal(c1.record.quantidadeAproveitavel, 112);
  assert.equal(c1.record.quantidadeConferida, 110);
  assert.equal(db.divergencias.length, 1);
  assert.equal(db.divergencias[0].diferenca, -2);

  const e1 = applySyncOp(db, {
    opId: 'op_e2',
    type: 'MARK_ENTRY',
    actorId: confUser.id,
    actorName: confUser.nome,
    payload: { producaoId: r1.record.id }
  });
  assert.equal(e1.ok, true);
  assert.equal(e1.record.status, PROD_STATUS.ENTRADA_REALIZADA);
  assert.equal(e1.entrada.quantidade, 110);
});

test('Idempotência na sincronização offline: mesmo opId não duplica produção', () => {
  const db = createTestDatabase();
  const initialCount = db.producoes.length;

  const op = {
    opId: 'op_sync_dup_1',
    type: 'SAVE_PRODUCTION',
    actorId: 'usr_pre',
    payload: { produtoId: 'prd_manilha30', quantidade: 30 }
  };

  const first = applySyncOp(db, op);
  const second = applySyncOp(db, op);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.duplicate, true);
  assert.equal(db.producoes.length, initialCount + 1);
});

test('Auditoria: impede exclusão de produto utilizado e preserva histórico ao corrigir', () => {
  const db = createTestDatabase();

  const delUsed = applySyncOp(db, {
    opId: 'op_del_used',
    type: 'DELETE_PRODUCT',
    actorId: 'usr_admin',
    payload: { id: 'prd_canaleta14' }
  });
  assert.equal(delUsed.ok, false);

  const corr = applySyncOp(db, {
    opId: 'op_corr_1',
    type: 'CORRECT_PRODUCTION',
    actorId: 'usr_admin',
    actorName: 'Admin',
    payload: {
      producaoId: 'reg_hoje_2',
      quantidade: 30,
      quantidadeQuebrada: 2,
      motivo: 'Contagem revisada'
    }
  });
  assert.equal(corr.ok, true);
  assert.equal(corr.record.quantidade, 30);
  assert.equal(corr.record.quantidadeAproveitavel, 28);
  assert.equal(db.historicoAlteracoes.length, 1);
  assert.equal(db.historicoAlteracoes[0].valorAnterior.quantidade, 25);
  assert.equal(db.historicoAlteracoes[0].novoValor.quantidade, 30);
});

test('Comando de voz para produção interpreta corretamente frases em português', () => {
  const db = createTestDatabase();

  const p1 = parseVoiceProduction('Produzi 120 canaletas 14', db.produtos);
  assert.equal(p1.product?.id, 'prd_canaleta14');
  assert.equal(p1.quantity, 120);
  assert.equal(p1.confidence, 'high');

  const p2 = parseVoiceProduction('oito portas 0,80', db.produtos);
  assert.equal(p2.product?.id, 'prd_porta080');
  assert.equal(p2.quantity, 8);
  assert.equal(p2.confidence, 'high');

  const p3 = parseVoiceProduction('cinquenta manilhas 30', db.produtos);
  assert.equal(p3.product?.id, 'prd_manilha30');
  assert.equal(p3.quantity, 50);
  assert.equal(p3.confidence, 'high');
});

test('Busca global interpreta intenções por texto/voz', () => {
  const db = createTestDatabase();
  const admin = db.usuarios.find((u) => u.perfil === ROLES.ADMIN);

  const rTodayCanaleta = executeGlobalSearch(db, 'Quero ver as canaletas produzidas hoje', admin);
  assert.ok(rTodayCanaleta.producoes.some((r) => r.produtoId === 'prd_canaleta14'));

  const rPending = executeGlobalSearch(db, 'O que ainda não entrou?', admin);
  assert.ok(rPending.producoes.length >= 2);
  assert.ok(rPending.producoes.every((r) => r.status !== PROD_STATUS.ENTRADA_REALIZADA));

  const rBroken = executeGlobalSearch(db, 'Produtos quebrados', admin);
  assert.ok(rBroken.producoes.every((r) => (r.quantidadeQuebrada || 0) > 0));

  const rMarcenaria = executeGlobalSearch(db, 'Produção da marcenaria', admin);
  assert.ok(rMarcenaria.producoes.every((r) => r.setor === SECTORS.MARCENARIA));
});

test('Permissões e rotas iniciais por perfil de usuário', () => {
  const db = createTestDatabase();
  const admin = db.usuarios.find((u) => u.perfil === ROLES.ADMIN);
  const patrao = db.usuarios.find((u) => u.perfil === ROLES.PATRAO);
  const conf = db.usuarios.find((u) => u.perfil === ROLES.CONFERENCIA);
  const prodPre = db.usuarios.find((u) => u.usuario === 'premoldados');

  assert.equal(getDefaultRouteForUser(patrao), 'painel');
  assert.equal(getDefaultRouteForUser(conf), 'conferencia');
  assert.equal(getDefaultRouteForUser(prodPre), 'premoldados');
  assert.equal(getDefaultRouteForUser(admin), 'inicio');

  assert.equal(canEditEntry(prodPre), false);
  assert.equal(canEditEntry(conf), true);
  assert.equal(canRegisterProduction(conf), false);
  assert.equal(canRegisterProduction(prodPre), true);
});

test('KPIs do Painel somam corretamente produzidos, quebrados, entradas e pendentes', () => {
  const db = createTestDatabase();
  const kpis = computeDashboardKpis(db.producoes);

  assert.equal(kpis.produzidos, 206);
  assert.equal(kpis.quebrados, 10);
  assert.equal(kpis.entradasRealizadas, 168);
  assert.equal(kpis.pendentes, 28);
});

function invokeServer(server, { method = 'GET', url = '/', body = null }) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = { 'content-type': 'application/json' };
    req.destroy = () => {};

    const chunks = [];
    const res = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        cb();
      }
    });
    res.statusCode = 200;
    res.headers = {};
    res.writeHead = (code, headers = {}) => {
      res.statusCode = code;
      res.headers = headers;
    };
    res.end = (data) => {
      if (data) chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
      resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8')
      });
    };

    server.emit('request', req, res);
    queueMicrotask(() => {
      if (body !== null) {
        req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
      }
      req.emit('end');
    });
  });
}

test('Servidor HTTP PWA e API /api/sync funcionam ponta a ponta', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-test-'));
  const tmpDb = path.join(tmpDir, 'db.json');
  const server = createAppServer({ dbFilePath: tmpDb });

  try {
    const htmlRes = await invokeServer(server, { method: 'GET', url: '/' });
    assert.equal(htmlRes.status, 200);
    assert.ok(htmlRes.body.includes('CONTROLE DE PRODUÇÃO'));

    const manifestRes = await invokeServer(server, { method: 'GET', url: '/manifest.webmanifest' });
    assert.equal(manifestRes.status, 200);

    const syncRes = await invokeServer(server, {
      method: 'POST',
      url: '/api/sync',
      body: {
        ops: [
          {
            opId: 'api_op_prd_1',
            type: 'SAVE_PRODUCT',
            actorId: 'usr_admin',
            payload: { id: 'prd_teste_1', nome: 'Bloco 14', setor: SECTORS.PRE_MOLDADOS, unidade: 'UN', codigo: 'PM001' }
          },
          {
            opId: 'api_op_1',
            type: 'SAVE_PRODUCTION',
            actorId: 'usr_pre',
            payload: { produtoId: 'prd_teste_1', quantidade: 200 }
          }
        ]
      }
    });
    assert.equal(syncRes.status, 200);
    const syncData = JSON.parse(syncRes.body);
    assert.equal(syncData.ok, true);
    assert.ok(syncData.state.producoes.some((r) => r.produtoId === 'prd_teste_1' && r.quantidade === 200));

    const backupRes = await invokeServer(server, { method: 'GET', url: '/api/backup' });
    assert.equal(backupRes.status, 200);
    const backupJson = JSON.parse(backupRes.body);
    assert.ok(Array.isArray(backupJson.produtos));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Marcenaria lança produto novo com foto e Conferência cadastra automaticamente', () => {
  const db = createTestDatabase();
  const initialProds = db.produtos.length;

  const r1 = applySyncOp(db, {
    opId: 'op_unreg_1',
    type: 'SAVE_UNREGISTERED_PRODUCTION',
    actorId: 'usr_mar',
    actorName: 'Marcos',
    payload: {
      nome: 'Aparador Rústico 1,60m',
      unidade: 'UN',
      setor: SECTORS.MARCENARIA,
      foto: 'data:image/jpeg;base64,FAKEFOTO',
      quantidade: 4
    }
  });
  assert.equal(r1.ok, true);
  assert.equal(r1.record.produtoNaoCadastrado, true);
  assert.equal(r1.record.produtoId, null);
  assert.equal(r1.record.produtoTemp.nome, 'Aparador Rústico 1,60m');
  assert.equal(db.produtos.length, initialProds);

  const reg = applySyncOp(db, {
    opId: 'op_reg_temp_1',
    type: 'REGISTER_TEMP_PRODUCT',
    actorId: 'usr_conf',
    actorName: 'Conferente',
    payload: { producaoId: r1.record.id }
  });
  assert.equal(reg.ok, true);
  assert.equal(db.produtos.length, initialProds + 1);
  assert.equal(reg.produto.nome, 'Aparador Rústico 1,60m');
  assert.equal(reg.produto.setor, SECTORS.MARCENARIA);
  assert.equal(reg.produto.foto, 'data:image/jpeg;base64,FAKEFOTO');
  assert.ok(reg.produto.codigo.startsWith('MC'));
  assert.equal(r1.record.produtoNaoCadastrado, false);
  assert.equal(r1.record.produtoId, reg.produto.id);
});

test('Adaptador Vercel + Supabase inicializa, sincroniza ops e trata conflito de versão', async () => {
  const env = {
    SUPABASE_URL: 'https://demo.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test_key'
  };
  const cfg = getSupabaseConfig(env);
  assert.equal(cfg.configured, true);

  const nextPublicCfg = getSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123'
  });
  assert.equal(nextPublicCfg.configured, true);
  assert.equal(nextPublicCfg.url, 'https://demo.supabase.co');
  assert.equal(nextPublicCfg.key, 'sb_publishable_123');

  let storedRow = null;
  let forceConflictOnce = true;

  const mockFetch = async (url, init = {}) => {
    assert.equal(init.headers.apikey, 'sb_secret_test_key');
    assert.equal(init.headers.Authorization, undefined);
    const method = (init.method || 'GET').toUpperCase();
    if (method === 'GET' && url.includes('/rest/v1/cp_state?id=eq.main')) {
      return {
        ok: true,
        status: 200,
        json: async () => (storedRow ? [JSON.parse(JSON.stringify(storedRow))] : [])
      };
    }
    if (method === 'POST' && url.includes('/rest/v1/cp_state')) {
      const payload = JSON.parse(init.body);
      storedRow = { id: payload.id, data: payload.data, version: payload.version };
      return {
        ok: true,
        status: 201,
        json: async () => [JSON.parse(JSON.stringify(storedRow))]
      };
    }
    if (method === 'PATCH' && url.includes('/rest/v1/cp_state?')) {
      if (forceConflictOnce) {
        forceConflictOnce = false;
        return { ok: true, status: 200, json: async () => [] };
      }
      const payload = JSON.parse(init.body);
      storedRow = { id: 'main', data: payload.data, version: payload.version };
      return {
        ok: true,
        status: 200,
        json: async () => [JSON.parse(JSON.stringify(storedRow))]
      };
    }
    return { ok: false, status: 404, text: async () => 'Not found' };
  };

  const initState = await loadSupabaseState(mockFetch, env);
  assert.equal(initState.version, 1);
  assert.ok(Array.isArray(initState.state.produtos));

  const syncRes = await syncOpsWithSupabase(
    [
      {
        opId: 'sb_op_prd',
        type: 'SAVE_PRODUCT',
        actorId: 'usr_admin',
        payload: { id: 'prd_sb_1', nome: 'Canaleta 14', setor: SECTORS.PRE_MOLDADOS, unidade: 'UN', codigo: 'PM001' }
      },
      {
        opId: 'sb_op_1',
        type: 'SAVE_PRODUCTION',
        actorId: 'usr_pre',
        payload: { produtoId: 'prd_sb_1', quantidade: 75 }
      }
    ],
    mockFetch,
    env
  );
  assert.equal(syncRes.ok, true);
  assert.equal(forceConflictOnce, false);
  assert.ok(syncRes.state.producoes.some((r) => r.quantidade === 75));
  assert.equal(storedRow.version, 2);

  let bodyStr = '';
  const mockRes = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    end(s) { bodyStr = s; }
  };
  await healthHandler({ method: 'GET' }, mockRes);
  const health = JSON.parse(bodyStr);
  assert.equal(health.ok, true);
  assert.equal(health.backend, 'supabase');
});

test('server.mjs (Render) usa Supabase automaticamente quando variáveis estão configuradas', async () => {
  let storedRow = null;
  const env = {
    SUPABASE_URL: 'https://demo.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_render_test'
  };
  const mockFetch = async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    if (method === 'GET' && url.includes('/rest/v1/cp_state?id=eq.main')) {
      return { ok: true, status: 200, json: async () => (storedRow ? [JSON.parse(JSON.stringify(storedRow))] : []) };
    }
    if (method === 'POST' && url.includes('/rest/v1/cp_state')) {
      const payload = JSON.parse(init.body);
      storedRow = { id: payload.id, data: payload.data, version: payload.version };
      return { ok: true, status: 201, json: async () => [JSON.parse(JSON.stringify(storedRow))] };
    }
    if (method === 'PATCH' && url.includes('/rest/v1/cp_state?')) {
      const payload = JSON.parse(init.body);
      storedRow = { id: 'main', data: payload.data, version: payload.version };
      return { ok: true, status: 200, json: async () => [JSON.parse(JSON.stringify(storedRow))] };
    }
    return { ok: false, status: 404, text: async () => 'Not found' };
  };

  const server = createAppServer({ env, fetchImpl: mockFetch });
  const healthRes = await invokeServer(server, { method: 'GET', url: '/api/health' });
  assert.equal(healthRes.status, 200);
  assert.equal(JSON.parse(healthRes.body).backend, 'supabase');

  const syncRes = await invokeServer(server, {
    method: 'POST',
    url: '/api/sync',
    body: {
      ops: [
        {
          opId: 'render_op_prd',
          type: 'SAVE_PRODUCT',
          actorId: 'usr_admin',
          payload: { id: 'prd_rnd_1', nome: 'Mesa', setor: SECTORS.MARCENARIA, unidade: 'UN', codigo: 'MC001' }
        },
        {
          opId: 'render_op_1',
          type: 'SAVE_PRODUCTION',
          actorId: 'usr_mar',
          payload: { produtoId: 'prd_rnd_1', quantidade: 6 }
        }
      ]
    }
  });
  assert.equal(syncRes.status, 200);
  const syncData = JSON.parse(syncRes.body);
  assert.equal(syncData.ok, true);
  assert.ok(storedRow.data.producoes.some((r) => r.produtoId === 'prd_rnd_1' && r.quantidade === 6));
});
