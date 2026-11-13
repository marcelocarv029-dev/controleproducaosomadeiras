import {
  generateId,
  getLocalDateStr,
  getLocalTimeStr,
  formatShortDateBR,
  addDays,
  getMonthBounds,
  normalizeText,
  replacePortugueseNumbers
} from './utils.js';

export const SECTORS = {
  PRE_MOLDADOS: 'PRE_MOLDADOS',
  MARCENARIA: 'MARCENARIA'
};

export const SECTOR_LABELS = {
  PRE_MOLDADOS: '🧱 PRÉ-MOLDADOS',
  MARCENARIA: '🪵 MARCENARIA'
};

export const SECTOR_SHORT = {
  PRE_MOLDADOS: 'Pré-Moldados',
  MARCENARIA: 'Marcenaria'
};

export const ROLES = {
  ADMIN: 'ADMIN',
  PRODUCAO: 'PRODUCAO',
  CONFERENCIA: 'CONFERENCIA',
  PATRAO: 'PATRAO'
};

export const ROLE_LABELS = {
  ADMIN: 'Administrador',
  PRODUCAO: 'Produção',
  CONFERENCIA: 'Conferência',
  PATRAO: 'Gestão / Patrão'
};

export const UNITS = ['UN', 'M', 'M²', 'KG', 'TON', 'JOGO', 'DÚZIA', 'PEÇA'];

export const DEMO_PROD_IDS = new Set([
  'reg_hoje_1', 'reg_hoje_2', 'reg_hoje_3', 'reg_hoje_4', 'reg_hoje_5',
  'reg_ontem_1', 'reg_ontem_2', 'reg_2dias_1'
]);
export const DEMO_QUEBRA_IDS = new Set(['qbr_1', 'qbr_2', 'qbr_3']);
export const DEMO_ENTRADA_IDS = new Set(['ent_1', 'ent_2', 'ent_3', 'ent_4', 'ent_5', 'ent_6']);
export const DEMO_NOTIF_IDS = new Set(['notif_1', 'notif_2']);
export const DEMO_PRODUCT_IDS = new Set([
  'prd_canaleta14', 'prd_canaleta19', 'prd_manilha30', 'prd_estaca2m', 'prd_bloco14',
  'prd_porta080', 'prd_janela', 'prd_aduela', 'prd_alisar', 'prd_mesa', 'prd_cadeira', 'prd_banco'
]);

export function purgeDemoData(state) {
  if (!state || typeof state !== 'object') return { state, changed: false };
  let changed = false;

  if (Array.isArray(state.producoes)) {
    const before = state.producoes.length;
    state.producoes = state.producoes.filter((r) => {
      if (!r || !r.id) return false;
      if (DEMO_PROD_IDS.has(r.id)) return false;
      if (typeof r.id === 'string' && (r.id.startsWith('reg_hoje') || r.id.startsWith('reg_ontem') || r.id.startsWith('reg_2dias'))) return false;
      return true;
    });
    if (state.producoes.length !== before) changed = true;
  }

  if (Array.isArray(state.quebras)) {
    const before = state.quebras.length;
    state.quebras = state.quebras.filter((q) => {
      if (!q || !q.id) return false;
      if (DEMO_QUEBRA_IDS.has(q.id)) return false;
      if (DEMO_PROD_IDS.has(q.producaoId)) return false;
      return true;
    });
    if (state.quebras.length !== before) changed = true;
  }

  if (Array.isArray(state.entradas)) {
    const before = state.entradas.length;
    state.entradas = state.entradas.filter((e) => {
      if (!e || !e.id) return false;
      if (DEMO_ENTRADA_IDS.has(e.id)) return false;
      if (DEMO_PROD_IDS.has(e.producaoId)) return false;
      return true;
    });
    if (state.entradas.length !== before) changed = true;
  }

  if (Array.isArray(state.notificacoes)) {
    const before = state.notificacoes.length;
    state.notificacoes = state.notificacoes.filter((n) => {
      if (!n || !n.id) return false;
      if (DEMO_NOTIF_IDS.has(n.id)) return false;
      if (DEMO_PROD_IDS.has(n.refId)) return false;
      return true;
    });
    if (state.notificacoes.length !== before) changed = true;
  }

  if (Array.isArray(state.produtos)) {
    const before = state.produtos.length;
    state.produtos = state.produtos.filter((p) => !p || !DEMO_PRODUCT_IDS.has(p.id));
    if (state.produtos.length !== before) changed = true;
  }

  if (Array.isArray(state.usuarios)) {
    for (const u of state.usuarios) {
      if (u && u.id === 'usr_pre') {
        if (String(u.nome).toLowerCase().includes('suino') || String(u.usuario).toLowerCase().includes('suino')) {
          u.nome = 'Produção Pré-Moldados';
          u.usuario = 'premoldados';
          changed = true;
        }
      }
      if (u && u.id === 'usr_conf') {
        if (u.nome === 'Carlos Conferente') {
          u.nome = 'Conferente';
          changed = true;
        }
      }
      if (u && u.id === 'usr_mar') {
        if (u.nome === 'Marcos (Marcenaria)') {
          u.nome = 'Produção Marcenaria';
          changed = true;
        }
      }
    }
    const beforeUsrs = state.usuarios.length;
    state.usuarios = state.usuarios.filter((u) => {
      if (!u) return false;
      if (u.id !== 'usr_pre' && (String(u.nome).toLowerCase() === 'suino' || String(u.usuario).toLowerCase() === 'suino')) {
        return false;
      }
      return true;
    });
    if (state.usuarios.length !== beforeUsrs) changed = true;
  }

  if (changed) {
    state.updatedAt = new Date().toISOString();
  }

  return { state, changed };
}

export const PROD_STATUS = {
  PRODUZIDO: 'PRODUZIDO',
  CONFERIDO: 'CONFERIDO',
  DIVERGENCIA: 'DIVERGENCIA',
  ENTRADA_REALIZADA: 'ENTRADA_REALIZADA'
};

export function getDefaultRouteForUser(user) {
  if (!user) return 'login';
  switch (user.perfil) {
    case ROLES.PATRAO:
      return 'painel';
    case ROLES.CONFERENCIA:
      return 'conferencia';
    case ROLES.PRODUCAO:
      return user.setor === SECTORS.MARCENARIA ? 'marcenaria' : 'premoldados';
    case ROLES.ADMIN:
    default:
      return 'inicio';
  }
}

export function getAllowedSectorsForUser(user) {
  if (!user) return [];
  if (user.perfil === ROLES.PRODUCAO && (user.setor === SECTORS.PRE_MOLDADOS || user.setor === SECTORS.MARCENARIA)) {
    return [user.setor];
  }
  return [SECTORS.PRE_MOLDADOS, SECTORS.MARCENARIA];
}

export function canAccessModule(user, mod) {
  if (!user) return false;
  const p = user.perfil;
  if (p === ROLES.ADMIN) return true;

  const allowedSectors = getAllowedSectorsForUser(user);
  switch (mod) {
    case 'inicio':
    case 'pesquisar':
    case 'historico':
      return true;
    case 'producao':
    case 'producao-rapida':
      return p === ROLES.PRODUCAO;
    case 'premoldados':
      return (p === ROLES.PRODUCAO && allowedSectors.includes(SECTORS.PRE_MOLDADOS)) || p === ROLES.PATRAO;
    case 'marcenaria':
      return (p === ROLES.PRODUCAO && allowedSectors.includes(SECTORS.MARCENARIA)) || p === ROLES.PATRAO;
    case 'quebras':
      return p === ROLES.PRODUCAO || p === ROLES.CONFERENCIA || p === ROLES.PATRAO;
    case 'conferencia':
    case 'entradas':
      return p === ROLES.CONFERENCIA || p === ROLES.PATRAO;
    case 'painel':
    case 'relatorios':
      return p === ROLES.PATRAO;
    case 'produtos':
    case 'usuarios':
    case 'configuracoes':
    case 'corrigir':
      return false;
    default:
      return false;
  }
}

export function canEditEntry(user) {
  return user && (user.perfil === ROLES.ADMIN || user.perfil === ROLES.CONFERENCIA);
}

export function canCorrectProduction(user, rec) {
  if (!user || !rec) return false;
  if (user.perfil === ROLES.ADMIN || user.perfil === ROLES.PATRAO || user.perfil === ROLES.CONFERENCIA) {
    return true;
  }
  if (user.perfil === ROLES.PRODUCAO && rec.status !== PROD_STATUS.ENTRADA_REALIZADA) {
    if (user.setor === 'AMBOS' || user.setor === rec.setor) return true;
  }
  return false;
}

export function canUndoEntry(user) {
  return Boolean(user && (user.perfil === ROLES.ADMIN || user.perfil === ROLES.CONFERENCIA || user.perfil === ROLES.PATRAO));
}

export function canRegisterProduction(user) {
  return user && (user.perfil === ROLES.ADMIN || user.perfil === ROLES.PRODUCAO);
}

export function canRegisterBreakage(user) {
  return user && (user.perfil === ROLES.ADMIN || user.perfil === ROLES.PRODUCAO || user.perfil === ROLES.CONFERENCIA);
}

/**
 * Calcula quantidades e status visual padronizado de um registro de produção.
 */
export function computeProductionSummary(prod) {
  const produzida = Math.max(0, Number(prod.quantidade) || 0);
  const quebrada = Math.max(0, Math.min(produzida, Number(prod.quantidadeQuebrada) || 0));
  const aproveitavel = Math.max(0, produzida - quebrada);
  const conferida = prod.quantidadeConferida !== null && prod.quantidadeConferida !== undefined
    ? Number(prod.quantidadeConferida)
    : null;
  const diferenca = conferida !== null ? conferida - aproveitavel : 0;
  const entradaRealizada = prod.status === PROD_STATUS.ENTRADA_REALIZADA;
  const temDivergencia = prod.status === PROD_STATUS.DIVERGENCIA || (conferida !== null && diferenca !== 0);
  const foiConferido = conferida !== null || prod.status === PROD_STATUS.CONFERIDO || temDivergencia || entradaRealizada;

  let statusKey = 'AGUARDANDO';
  let statusBadge = '🟠 AGUARDANDO ENTRADA';
  let statusShort = '🟠 Entrada pendente';
  let statusTone = 'orange';

  if (entradaRealizada) {
    statusKey = 'ENTRADA_REALIZADA';
    statusBadge = '🟢 ENTRADA REALIZADA';
    statusShort = '🟢 Entrada realizada';
    statusTone = 'green';
  } else if (temDivergencia && prod.status === PROD_STATUS.DIVERGENCIA) {
    statusKey = 'DIVERGENCIA';
    statusBadge = '🔴 DIVERGÊNCIA';
    statusShort = '🔴 Divergência';
    statusTone = 'red';
  } else if (prod.status === PROD_STATUS.CONFERIDO) {
    statusKey = 'CONFERIDO';
    statusBadge = '🔵 CONFERIDO';
    statusShort = '🔵 Conferido';
    statusTone = 'blue';
  }

  return {
    produzida,
    quebrada,
    aproveitavel,
    conferida,
    diferenca,
    entradaRealizada,
    foiConferido,
    temDivergencia,
    temQuebra: quebrada > 0,
    quantidadeEfetivaEntrada: conferida !== null ? conferida : aproveitavel,
    statusKey,
    statusBadge,
    statusShort,
    statusTone
  };
}

export function computeDashboardKpis(producoes) {
  let produzidos = 0;
  let quebrados = 0;
  let aproveitaveis = 0;
  let conferidos = 0;
  let entradasRealizadas = 0;
  let pendentes = 0;
  let divergencias = 0;

  for (const p of producoes) {
    const s = computeProductionSummary(p);
    produzidos += s.produzida;
    quebrados += s.quebrada;
    aproveitaveis += s.aproveitavel;
    if (s.foiConferido) {
      conferidos += s.conferida !== null ? s.conferida : s.aproveitavel;
    }
    if (s.entradaRealizada) {
      entradasRealizadas += s.quantidadeEfetivaEntrada;
    } else {
      pendentes += s.quantidadeEfetivaEntrada;
    }
    if (s.temDivergencia) {
      divergencias += 1;
    }
  }

  return {
    produzidos,
    quebrados,
    aproveitaveis,
    conferidos,
    entradasRealizadas,
    pendentes,
    divergencias
  };
}

export function computeSectorTotals(producoes) {
  const pre = producoes.filter((p) => p.setor === SECTORS.PRE_MOLDADOS);
  const mar = producoes.filter((p) => p.setor === SECTORS.MARCENARIA);
  return {
    premoldados: computeDashboardKpis(pre),
    marcenaria: computeDashboardKpis(mar)
  };
}

export function computeDailyProduction(producoes) {
  const byDate = new Map();
  for (const p of producoes) {
    const dt = p.data || getLocalDateStr();
    if (!byDate.has(dt)) {
      byDate.set(dt, []);
    }
    byDate.get(dt).push(p);
  }

  return Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([data, items]) => {
      const kpis = computeDashboardKpis(items);
      return {
        data,
        dataCurta: formatShortDateBR(data),
        totalProduzido: kpis.produzidos,
        totalQuebrado: kpis.quebrados,
        totalAproveitavel: kpis.aproveitaveis,
        totalEntradas: kpis.entradasRealizadas,
        totalPendente: kpis.pendentes,
        items
      };
    });
}

export function filterByPeriod(items, period, customStart = '', customEnd = '', refDate = new Date()) {
  const today = getLocalDateStr(refDate);
  let start = today;
  let end = today;

  switch (period) {
    case 'hoje':
      start = today;
      end = today;
      break;
    case 'ontem': {
      const y = addDays(today, -1);
      start = y;
      end = y;
      break;
    }
    case '7dias':
      start = addDays(today, -6);
      end = today;
      break;
    case 'mes': {
      const bounds = getMonthBounds(refDate, 0);
      start = bounds.start;
      end = bounds.end;
      break;
    }
    case 'mes_anterior': {
      const bounds = getMonthBounds(refDate, -1);
      start = bounds.start;
      end = bounds.end;
      break;
    }
    case 'personalizado':
      start = customStart || '1970-01-01';
      end = customEnd || '2999-12-31';
      break;
    case 'todos':
    default:
      return items;
  }

  return items.filter((item) => {
    const d = item.data || '';
    return d >= start && d <= end;
  });
}

/**
 * Agrupa produções do mesmo produto dentro de uma lista (ex.: para Painel do Patrão),
 * mantendo também acesso individual caso queira detalhar.
 * Aqui preservamos cada registro ou agrupamos por produto+status? O prompt exemplifica cada produto no dia:
 * se um produto teve múltiplos lotes no dia, agregamos por produto ou exibimos os lotes?
 * Se houver apenas 1 lote, é idêntico; se houver vários, agregamos por produto + mostramos entradas/pendentes claramente!
 */
export function getRecordProduct(rec, prodMap) {
  if (rec?.produtoId && prodMap.has(rec.produtoId)) {
    return { ...prodMap.get(rec.produtoId), naoCadastrado: false };
  }
  if (rec?.produtoTemp) {
    return {
      id: null,
      nome: rec.produtoTemp.nome || 'Produto Novo',
      setor: rec.setor || rec.produtoTemp.setor || SECTORS.MARCENARIA,
      unidade: rec.produtoTemp.unidade || 'UN',
      codigo: 'NOVO',
      foto: rec.produtoTemp.foto || '',
      naoCadastrado: Boolean(rec.produtoNaoCadastrado)
    };
  }
  return {
    id: rec?.produtoId || null,
    nome: 'Produto',
    setor: rec?.setor || SECTORS.PRE_MOLDADOS,
    unidade: 'UN',
    codigo: '',
    foto: '',
    naoCadastrado: Boolean(rec?.produtoNaoCadastrado)
  };
}

export function generateNextProductCode(produtos, setor) {
  const prefix = setor === SECTORS.MARCENARIA ? 'MC' : 'PM';
  let maxNum = 0;
  for (const p of produtos || []) {
    const code = String(p.codigo || '').toUpperCase();
    if (code.startsWith(prefix)) {
      const n = parseInt(code.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

export function aggregateProductsForBoard(producoes) {
  const map = new Map();
  for (const p of producoes) {
    const key = p.produtoId || `temp:${p.setor}:${normalizeText(p.produtoTemp?.nome || p.id)}`;
    const s = computeProductionSummary(p);
    if (!map.has(key)) {
      map.set(key, {
        produtoId: p.produtoId,
        produtoTemp: p.produtoTemp || null,
        produtoNaoCadastrado: Boolean(p.produtoNaoCadastrado),
        setor: p.setor,
        produzida: 0,
        quebrada: 0,
        aproveitavel: 0,
        conferidaTotal: 0,
        hasConferida: false,
        todasEntradas: true,
        algumaEntrada: false,
        temDivergencia: false,
        todosConferidos: true,
        registros: []
      });
    }
    const g = map.get(key);
    if (p.produtoNaoCadastrado) g.produtoNaoCadastrado = true;
    g.produzida += s.produzida;
    g.quebrada += s.quebrada;
    g.aproveitavel += s.aproveitavel;
    if (s.conferida !== null) {
      g.conferidaTotal += s.conferida;
      g.hasConferida = true;
    }
    if (!s.entradaRealizada) g.todasEntradas = false;
    if (s.entradaRealizada) g.algumaEntrada = true;
    if (s.temDivergencia) g.temDivergencia = true;
    if (!s.foiConferido) g.todosConferidos = false;
    g.registros.push(p);
  }

  return Array.from(map.values()).map((g) => {
    let statusBadge = '🟠 AGUARDANDO ENTRADA';
    let statusTone = 'orange';
    if (g.todasEntradas) {
      statusBadge = '🟢 ENTRADA REALIZADA';
      statusTone = 'green';
    } else if (g.temDivergencia) {
      statusBadge = '🔴 DIVERGÊNCIA';
      statusTone = 'red';
    } else if (g.todosConferidos) {
      statusBadge = '🔵 CONFERIDO';
      statusTone = 'blue';
    } else if (g.algumaEntrada) {
      statusBadge = '🟠 AGUARDANDO ENTRADA';
      statusTone = 'orange';
    }
    return {
      ...g,
      statusBadge,
      statusTone
    };
  });
}

function singularizeWord(w) {
  if (w.length <= 3) return w;
  if (w.endsWith('oes')) return w.slice(0, -3) + 'ao';
  if (w.endsWith('aes')) return w.slice(0, -3) + 'ao';
  if (w.endsWith('is') && w.length > 4) return w.slice(0, -2) + 'l';
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function tokenizeForMatch(str) {
  return normalizeText(str)
    .split(' ')
    .filter(Boolean)
    .map(singularizeWord);
}

/**
 * Interpreta comando de voz para registro de produção.
 * Ex.: "Produzi 120 canaletas 14" -> { product: Canaleta 14, quantity: 120, confidence: 'high' }
 */
export function parseVoiceProduction(rawTranscript, produtos, allowedSectors = null) {
  const rawText = String(rawTranscript || '').trim();
  if (!rawText) {
    return { product: null, quantity: null, confidence: 'none', rawText, candidates: [] };
  }

  const activeProducts = (produtos || []).filter((p) => {
    if (p.ativo === false) return false;
    if (allowedSectors && allowedSectors.length > 0) {
      return allowedSectors.includes(p.setor);
    }
    return true;
  });

  const normalized = replacePortugueseNumbers(normalizeText(rawText));
  const stopWords = new Set([
    'produzi', 'produzimos', 'produzido', 'produzidas', 'produzidos',
    'fiz', 'fizemos', 'registrar', 'registre', 'salva', 'salvar',
    'unidade', 'unidades', 'peca', 'pecas', 'de', 'da', 'do', 'das', 'dos', 'com', 'hoje'
  ]);

  const rawTokens = normalized.split(' ').filter((t) => t && !stopWords.has(t));

  // Find candidate numbers in text (integers or decimals like 120, 25, 8)
  const numberPositions = [];
  rawTokens.forEach((tok, idx) => {
    const cleanNum = tok.replace(',', '.');
    if (/^\d+(\.\d+)?$/.test(cleanNum)) {
      numberPositions.push({ idx, value: Number(cleanNum), token: tok });
    }
  });

  // Score each product trying each candidate number as quantity (removing that occurrence from product tokens)
  const scored = [];
  for (const prod of activeProducts) {
    const prodTokens = tokenizeForMatch(`${prod.nome} ${prod.codigo || ''}`);
    const prodNameTokens = tokenizeForMatch(prod.nome);

    const tryQuantities = numberPositions.length > 0 ? numberPositions : [{ idx: -1, value: null, token: null }];

    let bestForProduct = null;
    for (const numCand of tryQuantities) {
      const remainingTokens = rawTokens
        .filter((_, idx) => idx !== numCand.idx)
        .map(singularizeWord);

      if (remainingTokens.length === 0) continue;

      let matchedProdTokens = 0;
      let exactOrderScore = 0;
      let unmatchedUserTokens = 0;

      for (const ut of remainingTokens) {
        if (prodTokens.includes(ut)) {
          matchedProdTokens += 1;
        } else {
          // Partial prefix match for words >= 4 chars
          const partial = prodTokens.some((pt) => pt.length >= 4 && ut.length >= 4 && (pt.startsWith(ut) || ut.startsWith(pt)));
          if (partial) {
            matchedProdTokens += 0.7;
          } else {
            unmatchedUserTokens += 1;
          }
        }
      }

      // Bonus if all product name tokens matched
      const coverage = matchedProdTokens / Math.max(1, prodNameTokens.length);
      // Prefer quantity at the start of the phrase (e.g., "120 canaletas 14" -> 120 is qty, 14 is model)
      const positionBonus = numCand.idx === 0 ? 0.35 : numCand.idx === 1 ? 0.2 : 0;
      // Penalize if the chosen quantity matches a numeric specification inside the product name while another number exists
      const isModelNumber = prodNameTokens.includes(String(numCand.value)) && numberPositions.length > 1;
      const modelPenalty = isModelNumber ? -0.8 : 0;

      const score = matchedProdTokens * 2 + coverage * 2 - unmatchedUserTokens * 0.4 + positionBonus + modelPenalty + exactOrderScore;

      if (!bestForProduct || score > bestForProduct.score) {
        bestForProduct = {
          product: prod,
          quantity: numCand.value,
          score,
          matchedProdTokens,
          coverage
        };
      }
    }

    if (bestForProduct && bestForProduct.matchedProdTokens >= 0.7) {
      scored.push(bestForProduct);
    }
  }

  scored.sort((a, b) => b.score - a.score);

  let parsedPedido = null;
  const matchPedido = rawText.match(/\bpedidos?\s*(?:numero|n[ºo])?\s*(\d+)\b/i);
  if (matchPedido) {
    parsedPedido = matchPedido[1];
  }

  if (scored.length === 0) {
    return {
      product: null,
      quantity: numberPositions[0]?.value ?? null,
      tipoDestino: parsedPedido ? 'PEDIDO' : 'ESTOQUE',
      numeroPedido: parsedPedido,
      confidence: 'none',
      rawText,
      candidates: []
    };
  }

  const best = scored[0];
  const second = scored[1];
  const clearLead = !second || (best.score - second.score >= 1.0);
  const validQty = best.quantity !== null && best.quantity > 0;

  let confidence = 'low';
  if (validQty && best.matchedProdTokens >= 1 && best.coverage >= 0.5 && clearLead) {
    confidence = 'high';
  }

  return {
    product: best.product,
    quantity: best.quantity,
    tipoDestino: parsedPedido ? 'PEDIDO' : 'ESTOQUE',
    numeroPedido: parsedPedido,
    confidence,
    rawText,
    candidates: scored.slice(0, 4).map((c) => c.product)
  };
}

/**
 * Interpreta intenção da busca global / por voz.
 */
export function interpretSearchQuery(rawQuery) {
  const norm = normalizeText(rawQuery);
  const intent = {
    onlyToday: false,
    onlyBroken: false,
    onlyPending: false,
    onlyEntered: false,
    onlyDivergence: false,
    sector: null,
    keywords: []
  };

  if (!norm) return intent;

  if (/\bhoje\b|\bdia\b/.test(norm)) {
    intent.onlyToday = true;
  }
  if (/\bquebrad[oa]s?\b|\bquebras?\b/.test(norm)) {
    intent.onlyBroken = true;
  }
  if (/\bpendentes?\b|\bnao entrou\b|\baguardando\b|\bsem entrada\b|\bfalta entrar\b/.test(norm)) {
    intent.onlyPending = true;
  } else if (/\bentrou\b|\bentradas realizadas\b|\bja deu entrada\b/.test(norm)) {
    intent.onlyEntered = true;
  }
  if (/\bdivergenc/.test(norm)) {
    intent.onlyDivergence = true;
  }
  if (/\bpre\s*moldad|\bpremoldad/.test(norm)) {
    intent.sector = SECTORS.PRE_MOLDADOS;
  } else if (/\bmarcenaria\b/.test(norm)) {
    intent.sector = SECTORS.MARCENARIA;
  }

  const ignore = new Set([
    'quero', 'ver', 'as', 'os', 'o', 'a', 'de', 'da', 'do', 'das', 'dos',
    'em', 'no', 'na', 'que', 'ainda', 'nao', 'entrou', 'esta', 'estao',
    'producao', 'producoes', 'produzido', 'produzida', 'produzidos', 'produzidas',
    'produtos', 'produto', 'hoje', 'quebrados', 'quebradas', 'quebrado', 'quebrada',
    'quebra', 'quebras', 'pendente', 'pendentes', 'aguardando', 'entrada', 'entradas',
    'marcenaria', 'pre', 'moldados', 'moldado', 'premoldados', 'com', 'sem', 'realizadas',
    'divergencia', 'divergencias', 'mostrar', 'mostre', 'buscar', 'pesquisar', 'dia'
  ]);

  intent.keywords = norm
    .split(' ')
    .filter((w) => w && !ignore.has(w))
    .map(singularizeWord);

  return intent;
}

export function executeGlobalSearch(db, rawQuery, user = null) {
  const intent = interpretSearchQuery(rawQuery);
  const today = getLocalDateStr();
  const allowedSectors = getAllowedSectorsForUser(user);
  const prodMap = new Map((db.produtos || []).map((p) => [p.id, p]));
  const userMap = new Map((db.usuarios || []).map((u) => [u.id, u]));

  const matchesKeywords = (text) => {
    if (intent.keywords.length === 0) return true;
    const tokens = tokenizeForMatch(text);
    const fullNorm = normalizeText(text);
    return intent.keywords.every((kw) =>
      tokens.some((t) => t === kw || t.startsWith(kw) || kw.startsWith(t)) || fullNorm.includes(kw)
    );
  };

  // Filter products
  const produtos = (db.produtos || []).filter((p) => {
    if (!allowedSectors.includes(p.setor)) return false;
    if (intent.sector && p.setor !== intent.sector) return false;
    if (intent.onlyToday || intent.onlyBroken || intent.onlyPending || intent.onlyEntered || intent.onlyDivergence) {
      if (intent.keywords.length === 0) return false;
    }
    return matchesKeywords(`${p.nome} ${p.codigo || ''} ${p.descricao || ''} ${SECTOR_SHORT[p.setor]}`);
  });

  // Filter productions (covers produções, quebras, conferências, entradas)
  const producoes = (db.producoes || []).filter((rec) => {
    if (!allowedSectors.includes(rec.setor)) return false;
    if (intent.sector && rec.setor !== intent.sector) return false;
    if (intent.onlyToday && rec.data !== today) return false;
    const s = computeProductionSummary(rec);
    if (intent.onlyBroken && s.quebrada <= 0) return false;
    if (intent.onlyPending && s.entradaRealizada) return false;
    if (intent.onlyEntered && !s.entradaRealizada) return false;
    if (intent.onlyDivergence && !s.temDivergencia) return false;

    const prod = getRecordProduct(rec, prodMap);
    const resp = userMap.get(rec.usuarioId);
    const destinoStr = rec.tipoDestino === 'PEDIDO' ? `pedido ${rec.numeroPedido || ''}` : 'estoque';
    const searchable = `${prod?.nome || ''} ${prod?.codigo || ''} ${SECTOR_SHORT[rec.setor]} ${resp?.nome || ''} ${s.statusBadge} ${rec.produtoNaoCadastrado ? 'nao cadastrado' : ''} ${destinoStr}`;
    return matchesKeywords(searchable);
  }).sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));

  const quebras = (db.quebras || []).filter((q) => {
    const prod = prodMap.get(q.produtoId);
    if (prod && !allowedSectors.includes(prod.setor)) return false;
    if (intent.sector && prod?.setor !== intent.sector) return false;
    if (intent.onlyToday && q.data !== today) return false;
    if (intent.onlyPending || intent.onlyEntered) return false;
    return matchesKeywords(`${prod?.nome || ''} ${q.motivo || ''}`);
  }).sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));

  const entradas = (db.entradas || []).filter((e) => {
    const prod = prodMap.get(e.produtoId);
    if (prod && !allowedSectors.includes(prod.setor)) return false;
    if (intent.sector && prod?.setor !== intent.sector) return false;
    if (intent.onlyToday && e.data !== today) return false;
    if (intent.onlyPending || intent.onlyBroken) return false;
    return matchesKeywords(`${prod?.nome || ''} ${prod?.codigo || ''}`);
  }).sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));

  return { intent, produtos, producoes, quebras, entradas };
}

function addNotification(db, tipo, titulo, mensagem, refId = null) {
  db.notificacoes = db.notificacoes || [];
  db.notificacoes.unshift({
    id: generateId('notif'),
    tipo,
    titulo,
    mensagem,
    refId,
    lida: false,
    criadaEm: new Date().toISOString()
  });
  // Keep latest 50 notifications to avoid bloat
  if (db.notificacoes.length > 50) {
    db.notificacoes = db.notificacoes.slice(0, 50);
  }
}

function addAuditLog(db, entidade, entidadeId, acao, usuarioId, usuarioNome, valorAnterior, novoValor, motivo = '') {
  db.historicoAlteracoes = db.historicoAlteracoes || [];
  db.historicoAlteracoes.unshift({
    id: generateId('aud'),
    entidade,
    entidadeId,
    acao,
    usuarioId,
    usuarioNome,
    valorAnterior,
    novoValor,
    motivo,
    dataHora: new Date().toISOString()
  });
}

/**
 * Aplica uma operação mutável no estado do banco de dados de forma idempotente (por opId).
 * Usado tanto localmente (IndexedDB) quanto no servidor (/api/sync).
 */
export function applySyncOp(db, op) {
  if (!op || !op.opId || !op.type) {
    return { ok: false, error: 'Operação inválida' };
  }

  db.processedOpIds = db.processedOpIds || [];
  if (db.processedOpIds.includes(op.opId)) {
    return { ok: true, duplicate: true };
  }

  const p = op.payload || {};
  const prodMap = new Map((db.produtos || []).map((item) => [item.id, item]));
  const actorId = op.actorId || p.usuarioId || 'usr_admin';
  const actorUser = (db.usuarios || []).find((u) => u.id === actorId);
  const actorName = op.actorName || actorUser?.nome || 'Sistema';

  let result = { ok: true };

  switch (op.type) {
    case 'SAVE_PRODUCTION': {
      const produto = prodMap.get(p.produtoId);
      if (!produto) return { ok: false, error: 'Produto não encontrado' };
      const qty = Number(p.quantidade);
      if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: 'Quantidade inválida' };

      const tipoDestino = p.tipoDestino === 'PEDIDO' ? 'PEDIDO' : 'ESTOQUE';
      const numeroPedido = tipoDestino === 'PEDIDO' ? String(p.numeroPedido || '').trim() : null;
      if (tipoDestino === 'PEDIDO' && !numeroPedido) {
        return { ok: false, error: 'Informe o número do pedido.' };
      }

      const record = {
        id: p.id || generateId('prod_reg'),
        produtoId: produto.id,
        setor: produto.setor,
        quantidade: qty,
        quantidadeQuebrada: 0,
        quantidadeAproveitavel: qty,
        quantidadeConferida: null,
        tipoDestino,
        numeroPedido,
        data: p.data || getLocalDateStr(),
        hora: p.hora || getLocalTimeStr(),
        usuarioId: actorId,
        criadoPorId: actorId,
        status: PROD_STATUS.PRODUZIDO,
        origem: p.origem || 'manual',
        criadoEm: op.createdAt || new Date().toISOString()
      };
      db.producoes.unshift(record);
      addAuditLog(db, 'producao', record.id, 'CRIAR', actorId, actorName, null, {
        produto: produto.nome,
        quantidade: qty,
        tipoDestino,
        numeroPedido
      });
      const destinoTxt = tipoDestino === 'PEDIDO' ? ` (Pedido #${numeroPedido})` : ' (Estoque)';
      addNotification(
        db,
        'NOVA_PRODUCAO',
        '🔔 Nova produção registrada',
        `${produto.nome}: ${qty} ${produto.unidade} (${SECTOR_SHORT[produto.setor]})${destinoTxt}`,
        record.id
      );
      addNotification(
        db,
        'AGUARDANDO_CONFERENCIA',
        '🔔 Produção aguardando conferência',
        `${produto.nome} — ${qty} ${produto.unidade}${destinoTxt}`,
        record.id
      );
      result.record = record;
      break;
    }

    case 'SAVE_UNREGISTERED_PRODUCTION': {
      const nome = String(p.nome || '').trim();
      if (!nome) return { ok: false, error: 'Informe o nome do produto' };
      const qty = Number(p.quantidade);
      if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: 'Quantidade inválida' };
      const setor = p.setor || SECTORS.MARCENARIA;
      const unidade = p.unidade || 'UN';
      const foto = p.foto || '';

      const tipoDestino = p.tipoDestino === 'PEDIDO' ? 'PEDIDO' : 'ESTOQUE';
      const numeroPedido = tipoDestino === 'PEDIDO' ? String(p.numeroPedido || '').trim() : null;
      if (tipoDestino === 'PEDIDO' && !numeroPedido) {
        return { ok: false, error: 'Informe o número do pedido.' };
      }

      const record = {
        id: p.id || generateId('prod_reg'),
        produtoId: null,
        produtoNaoCadastrado: true,
        produtoTemp: {
          nome,
          setor,
          unidade,
          foto
        },
        setor,
        quantidade: qty,
        quantidadeQuebrada: 0,
        quantidadeAproveitavel: qty,
        quantidadeConferida: null,
        tipoDestino,
        numeroPedido,
        data: p.data || getLocalDateStr(),
        hora: p.hora || getLocalTimeStr(),
        usuarioId: actorId,
        criadoPorId: actorId,
        status: PROD_STATUS.PRODUZIDO,
        origem: p.origem || 'novo_produto_setor',
        criadoEm: op.createdAt || new Date().toISOString()
      };
      db.producoes.unshift(record);
      addAuditLog(db, 'producao', record.id, 'CRIAR_NAO_CADASTRADO', actorId, actorName, null, {
        produto: nome,
        quantidade: qty,
        tipoDestino,
        numeroPedido,
        produtoNaoCadastrado: true
      });
      const destinoTxt = tipoDestino === 'PEDIDO' ? ` (Pedido #${numeroPedido})` : ' (Estoque)';
      addNotification(
        db,
        'PRODUTO_NAO_CADASTRADO',
        '⚠️ Produto novo aguardando cadastro',
        `${nome}: ${qty} ${unidade} (${SECTOR_SHORT[setor]})${destinoTxt} — cadastrar na Conferência`,
        record.id
      );
      result.record = record;
      break;
    }

    case 'REGISTER_TEMP_PRODUCT': {
      const rec = db.producoes.find((r) => r.id === p.producaoId);
      if (!rec) return { ok: false, error: 'Produção não encontrada' };
      if (!rec.produtoNaoCadastrado || !rec.produtoTemp) {
        return { ok: false, error: 'Este registro já possui produto cadastrado' };
      }

      const tempNomeNorm = normalizeText(rec.produtoTemp.nome);
      const setor = rec.setor || rec.produtoTemp.setor || SECTORS.MARCENARIA;

      // Se já existir um produto com mesmo nome e setor, vincula; senão cria automaticamente
      let produto = (db.produtos || []).find(
        (item) => item.setor === setor && normalizeText(item.nome) === tempNomeNorm
      );

      if (!produto) {
        produto = {
          id: p.produtoId || generateId('prd'),
          nome: rec.produtoTemp.nome,
          setor,
          unidade: rec.produtoTemp.unidade || 'UN',
          codigo: generateNextProductCode(db.produtos, setor),
          descricao: `Cadastrado automaticamente via Conferência (${SECTOR_SHORT[setor]})`,
          foto: rec.produtoTemp.foto || '',
          ativo: true,
          criadoEm: new Date().toISOString()
        };
        db.produtos.push(produto);
        addAuditLog(db, 'produto', produto.id, 'CADASTRO_AUTOMATICO', actorId, actorName, null, {
          nome: produto.nome,
          codigo: produto.codigo,
          setor: produto.setor
        });
      }

      // Vincula o registro atual e outros lotes pendentes com o mesmo nome temporário no mesmo setor
      for (const item of db.producoes || []) {
        if (
          item.id === rec.id ||
          (item.produtoNaoCadastrado && item.setor === setor && normalizeText(item.produtoTemp?.nome) === tempNomeNorm)
        ) {
          item.produtoId = produto.id;
          item.produtoNaoCadastrado = false;
        }
      }

      result.produto = produto;
      result.record = rec;
      break;
    }

    case 'REGISTER_BREAKAGE': {
      const rec = db.producoes.find((r) => r.id === p.producaoId);
      if (!rec) return { ok: false, error: 'Produção não encontrada' };
      const prod = getRecordProduct(rec, prodMap);
      const qAdd = Number(p.quantidade);
      if (!Number.isFinite(qAdd) || qAdd < 0) return { ok: false, error: 'Quantidade de quebra inválida' };

      const prevQ = Number(rec.quantidadeQuebrada) || 0;
      const newTotalQ = p.substituir ? qAdd : prevQ + qAdd;
      if (newTotalQ > rec.quantidade) {
        return { ok: false, error: 'Quebra não pode ser maior que a produção' };
      }

      const anterior = { quantidadeQuebrada: prevQ, quantidadeAproveitavel: rec.quantidadeAproveitavel };
      rec.quantidadeQuebrada = newTotalQ;
      rec.quantidadeAproveitavel = Math.max(0, rec.quantidade - newTotalQ);

      // Se já havia sido conferido antes e agora mudou aproveitável, recalcula divergência se aplicável
      if (rec.quantidadeConferida !== null && rec.status !== PROD_STATUS.ENTRADA_REALIZADA) {
        rec.status = rec.quantidadeConferida === rec.quantidadeAproveitavel
          ? PROD_STATUS.CONFERIDO
          : PROD_STATUS.DIVERGENCIA;
      }

      const quebraReg = {
        id: p.id || generateId('qbr'),
        producaoId: rec.id,
        produtoId: rec.produtoId,
        quantidadeProduzida: rec.quantidade,
        quantidade: qAdd,
        quantidadeAproveitavel: rec.quantidadeAproveitavel,
        motivo: p.motivo || 'Quebra operacional / manuseio',
        usuarioId: actorId,
        data: p.data || getLocalDateStr(),
        hora: p.hora || getLocalTimeStr()
      };
      db.quebras.unshift(quebraReg);

      addAuditLog(db, 'quebra', rec.id, 'REGISTRAR_QUEBRA', actorId, actorName, anterior, {
        quantidadeQuebrada: rec.quantidadeQuebrada,
        quantidadeAproveitavel: rec.quantidadeAproveitavel
      }, quebraReg.motivo);

      if (qAdd > 0) {
        addNotification(
          db,
          'QUEBRA',
          '🔔 Produção com quebra registrada',
          `${prod?.nome || 'Produto'}: ${qAdd} quebrada(s) — Aproveitáveis: ${rec.quantidadeAproveitavel}`,
          rec.id
        );
      }
      result.record = rec;
      result.quebra = quebraReg;
      break;
    }

    case 'CONFIRM_CONFERENCE': {
      const rec = db.producoes.find((r) => r.id === p.producaoId);
      if (!rec) return { ok: false, error: 'Produção não encontrada' };
      const prod = getRecordProduct(rec, prodMap);
      const qConf = Number(p.quantidadeConferida);
      if (!Number.isFinite(qConf) || qConf < 0) return { ok: false, error: 'Quantidade conferida inválida' };

      const summaryBefore = computeProductionSummary(rec);
      const esperado = summaryBefore.aproveitavel;
      const diferenca = qConf - esperado;

      const anterior = {
        quantidadeConferida: rec.quantidadeConferida,
        status: rec.status
      };

      rec.quantidadeConferida = qConf;
      rec.conferidoPorId = actorId;
      rec.conferidoData = p.data || getLocalDateStr();
      rec.conferidoHora = p.hora || getLocalTimeStr();
      rec.status = diferenca === 0 ? PROD_STATUS.CONFERIDO : PROD_STATUS.DIVERGENCIA;

      const confReg = {
        id: p.id || generateId('conf'),
        producaoId: rec.id,
        produtoId: rec.produtoId,
        esperado,
        conferido: qConf,
        diferenca,
        usuarioId: actorId,
        data: rec.conferidoData,
        hora: rec.conferidoHora
      };
      db.conferencias.unshift(confReg);

      if (diferenca !== 0) {
        const divReg = {
          id: generateId('div'),
          producaoId: rec.id,
          produtoId: rec.produtoId,
          producaoOriginal: rec.quantidade,
          quebras: rec.quantidadeQuebrada || 0,
          esperado,
          conferido: qConf,
          diferenca,
          usuarioId: actorId,
          data: rec.conferidoData,
          hora: rec.conferidoHora
        };
        db.divergencias.unshift(divReg);
        addNotification(
          db,
          'DIVERGENCIA',
          '🔔 Divergência encontrada',
          `${prod?.nome || 'Produto'}: esperado ${esperado}, conferido ${qConf} (${diferenca > 0 ? '+' : ''}${diferenca})`,
          rec.id
        );
      } else {
        addNotification(
          db,
          'ENTRADA_PENDENTE',
          '🔔 Produto com entrada pendente',
          `${prod?.nome || 'Produto'}: ${qConf} ${prod?.unidade || 'UN'} conferidos, pronto para entrada`,
          rec.id
        );
      }

      addAuditLog(db, 'conferencia', rec.id, 'CONFERIR', actorId, actorName, anterior, {
        quantidadeConferida: qConf,
        status: rec.status
      });
      result.record = rec;
      break;
    }

    case 'MARK_ENTRY': {
      const rec = db.producoes.find((r) => r.id === p.producaoId);
      if (!rec) return { ok: false, error: 'Produção não encontrada' };
      const prod = getRecordProduct(rec, prodMap);
      const s = computeProductionSummary(rec);
      const qtdEntrada = s.quantidadeEfetivaEntrada;

      const anterior = { status: rec.status };
      rec.status = PROD_STATUS.ENTRADA_REALIZADA;
      rec.entradaData = p.data || getLocalDateStr();
      rec.entradaHora = p.hora || getLocalTimeStr();
      rec.entradaUsuarioId = actorId;

      const entradaReg = {
        id: p.id || generateId('ent'),
        produtoId: rec.produtoId,
        producaoId: rec.id,
        quantidade: qtdEntrada,
        usuarioId: actorId,
        data: rec.entradaData,
        hora: rec.entradaHora
      };
      db.entradas.unshift(entradaReg);

      addAuditLog(db, 'entrada', rec.id, 'ENTRADA_REALIZADA', actorId, actorName, anterior, {
        status: rec.status,
        quantidade: qtdEntrada
      });
      result.record = rec;
      result.entrada = entradaReg;
      break;
    }

    case 'CORRECT_PRODUCTION': {
      const rec = db.producoes.find((r) => r.id === p.producaoId);
      if (!rec) return { ok: false, error: 'Registro não encontrado' };
      const rawQtd = p.quantidade !== undefined ? p.quantidade : (p.novaQuantidade !== undefined ? p.novaQuantidade : rec.quantidade);
      const rawQuebra = p.quantidadeQuebrada !== undefined ? p.quantidadeQuebrada : (p.novaQuebra !== undefined ? p.novaQuebra : (rec.quantidadeQuebrada || 0));
      const novaQtd = Number(rawQtd);
      const novaQuebra = Number(rawQuebra);
      if (!Number.isFinite(novaQtd) || novaQtd <= 0) return { ok: false, error: 'Quantidade inválida' };
      if (!Number.isFinite(novaQuebra) || novaQuebra < 0 || novaQuebra > novaQtd) {
        return { ok: false, error: 'Quebra inválida' };
      }

      const anterior = {
        quantidade: rec.quantidade,
        quantidadeQuebrada: rec.quantidadeQuebrada,
        quantidadeAproveitavel: rec.quantidadeAproveitavel,
        quantidadeConferida: rec.quantidadeConferida,
        tipoDestino: rec.tipoDestino,
        numeroPedido: rec.numeroPedido,
        status: rec.status
      };

      rec.quantidade = novaQtd;
      rec.quantidadeQuebrada = novaQuebra;
      rec.quantidadeAproveitavel = novaQtd - novaQuebra;
      if (p.tipoDestino !== undefined) {
        rec.tipoDestino = p.tipoDestino === 'PEDIDO' ? 'PEDIDO' : 'ESTOQUE';
        rec.numeroPedido = rec.tipoDestino === 'PEDIDO' ? String(p.numeroPedido || '').trim() : null;
      }
      if (p.quantidadeConferida !== undefined && p.quantidadeConferida !== null && p.quantidadeConferida !== '') {
        rec.quantidadeConferida = Number(p.quantidadeConferida);
      }
      if (rec.status !== PROD_STATUS.ENTRADA_REALIZADA && rec.quantidadeConferida !== null) {
        rec.status = rec.quantidadeConferida === rec.quantidadeAproveitavel
          ? PROD_STATUS.CONFERIDO
          : PROD_STATUS.DIVERGENCIA;
      }
      if (rec.status === PROD_STATUS.ENTRADA_REALIZADA) {
        const ent = (db.entradas || []).find((e) => e.producaoId === rec.id);
        if (ent) {
          ent.quantidade = rec.quantidadeAproveitavel;
        }
      }
      rec.alteradoPorId = actorId;
      rec.alteradoEm = new Date().toISOString();

      addAuditLog(db, 'producao', rec.id, 'CORRIGIR', actorId, actorName, anterior, {
        quantidade: rec.quantidade,
        quantidadeQuebrada: rec.quantidadeQuebrada,
        quantidadeAproveitavel: rec.quantidadeAproveitavel,
        quantidadeConferida: rec.quantidadeConferida,
        status: rec.status
      }, p.motivo || 'Correção de produção');
      result.record = rec;
      break;
    }

    case 'UNDO_ENTRY': {
      const rec = db.producoes.find((r) => r.id === p.producaoId);
      if (!rec) return { ok: false, error: 'Produção não encontrada' };
      if (rec.status !== PROD_STATUS.ENTRADA_REALIZADA) {
        return { ok: false, error: 'Este lote não possui entrada realizada para desfazer.' };
      }

      const anterior = {
        status: rec.status,
        entradaData: rec.entradaData,
        entradaHora: rec.entradaHora,
        entradaUsuarioId: rec.entradaUsuarioId
      };

      const entIdx = (db.entradas || []).findIndex((e) => e.producaoId === rec.id);
      let removedEntrada = null;
      if (entIdx !== -1) {
        removedEntrada = db.entradas.splice(entIdx, 1)[0];
      }

      delete rec.entradaData;
      delete rec.entradaHora;
      delete rec.entradaUsuarioId;

      if (rec.quantidadeConferida !== null && rec.quantidadeConferida !== undefined) {
        rec.status = Number(rec.quantidadeConferida) === Number(rec.quantidadeAproveitavel)
          ? PROD_STATUS.CONFERIDO
          : PROD_STATUS.DIVERGENCIA;
      } else {
        rec.status = PROD_STATUS.PRODUZIDO;
      }

      rec.alteradoPorId = actorId;
      rec.alteradoEm = new Date().toISOString();

      addAuditLog(db, 'entrada', rec.id, 'DESFAZER_ENTRADA', actorId, actorName, anterior, {
        status: rec.status
      }, p.motivo || 'Entrada desfeita pelo usuário (estorno)');
      result.record = rec;
      result.removedEntrada = removedEntrada;
      break;
    }

    case 'DELETE_PRODUCTION': {
      const rec = db.producoes.find((r) => r.id === p.producaoId);
      if (!rec) return { ok: false, error: 'Produção não encontrada' };
      if (rec.status === PROD_STATUS.ENTRADA_REALIZADA) {
        return { ok: false, error: 'Não é possível excluir um lote com entrada já realizada. Desfaça a entrada primeiro.' };
      }

      const idx = db.producoes.findIndex((r) => r.id === p.producaoId);
      const removed = db.producoes.splice(idx, 1)[0];
      db.quebras = (db.quebras || []).filter((q) => q.producaoId !== p.producaoId);

      addAuditLog(db, 'producao', p.producaoId, 'EXCLUIR', actorId, actorName, {
        produtoId: removed.produtoId,
        quantidade: removed.quantidade
      }, null, p.motivo || 'Produção excluída por engano');
      result.deletedId = p.producaoId;
      break;
    }

    case 'SAVE_PRODUCT': {
      const existing = p.id ? db.produtos.find((x) => x.id === p.id) : null;
      if (existing) {
        const anterior = { nome: existing.nome, setor: existing.setor, unidade: existing.unidade, codigo: existing.codigo, ativo: existing.ativo };
        existing.nome = p.nome;
        existing.setor = p.setor;
        existing.unidade = p.unidade;
        existing.codigo = p.codigo;
        existing.descricao = p.descricao || '';
        existing.ativo = p.ativo !== undefined ? Boolean(p.ativo) : existing.ativo;
        if (p.foto) existing.foto = p.foto;
        addAuditLog(db, 'produto', existing.id, 'EDITAR', actorId, actorName, anterior, {
          nome: existing.nome, setor: existing.setor, unidade: existing.unidade, codigo: existing.codigo, ativo: existing.ativo
        });
        result.produto = existing;
      } else {
        const novo = {
          id: p.id || generateId('prd'),
          nome: p.nome,
          setor: p.setor,
          unidade: p.unidade || 'UN',
          codigo: p.codigo || '',
          descricao: p.descricao || '',
          foto: p.foto || '',
          ativo: p.ativo !== undefined ? Boolean(p.ativo) : true,
          criadoEm: new Date().toISOString()
        };
        db.produtos.push(novo);
        addAuditLog(db, 'produto', novo.id, 'CRIAR', actorId, actorName, null, { nome: novo.nome, codigo: novo.codigo });
        result.produto = novo;
      }
      break;
    }

    case 'TOGGLE_PRODUCT': {
      const existing = db.produtos.find((x) => x.id === p.id);
      if (!existing) return { ok: false, error: 'Produto não encontrado' };
      const anterior = existing.ativo;
      existing.ativo = !existing.ativo;
      addAuditLog(db, 'produto', existing.id, 'ALTERAR_STATUS', actorId, actorName, { ativo: anterior }, { ativo: existing.ativo });
      result.produto = existing;
      break;
    }

    case 'DELETE_PRODUCT': {
      const used = (db.producoes || []).some((r) => r.produtoId === p.id);
      if (used) {
        return { ok: false, error: 'Produto já utilizado no histórico. Inative-o em vez de excluir.' };
      }
      const idx = db.produtos.findIndex((x) => x.id === p.id);
      if (idx === -1) return { ok: false, error: 'Produto não encontrado' };
      const removed = db.produtos.splice(idx, 1)[0];
      addAuditLog(db, 'produto', p.id, 'EXCLUIR', actorId, actorName, { nome: removed.nome }, null);
      break;
    }

    case 'SAVE_USER': {
      const existing = p.id ? db.usuarios.find((x) => x.id === p.id) : null;
      const duplicateLogin = db.usuarios.some((u) => u.usuario.toLowerCase() === String(p.usuario).trim().toLowerCase() && u.id !== p.id);
      if (duplicateLogin) {
        return { ok: false, error: 'Nome de usuário já está em uso.' };
      }
      if (existing) {
        const anterior = { nome: existing.nome, usuario: existing.usuario, perfil: existing.perfil, setor: existing.setor, ativo: existing.ativo };
        existing.nome = p.nome;
        existing.usuario = String(p.usuario).trim();
        if (p.senha) existing.senha = p.senha;
        existing.perfil = p.perfil;
        existing.setor = p.setor || 'AMBOS';
        existing.ativo = p.ativo !== undefined ? Boolean(p.ativo) : existing.ativo;
        addAuditLog(db, 'usuario', existing.id, 'EDITAR', actorId, actorName, anterior, {
          nome: existing.nome, usuario: existing.usuario, perfil: existing.perfil, ativo: existing.ativo
        });
        result.usuario = existing;
      } else {
        const novo = {
          id: p.id || generateId('usr'),
          nome: p.nome,
          usuario: String(p.usuario).trim(),
          senha: p.senha || '1234',
          perfil: p.perfil,
          setor: p.setor || 'AMBOS',
          ativo: p.ativo !== undefined ? Boolean(p.ativo) : true,
          criadoEm: new Date().toISOString()
        };
        db.usuarios.push(novo);
        addAuditLog(db, 'usuario', novo.id, 'CRIAR', actorId, actorName, null, { nome: novo.nome, usuario: novo.usuario, perfil: novo.perfil });
        result.usuario = novo;
      }
      break;
    }

    case 'DELETE_USER': {
      const used = (db.producoes || []).some((r) => r.usuarioId === p.id || r.criadoPorId === p.id) ||
        (db.entradas || []).some((e) => e.usuarioId === p.id) ||
        (db.quebras || []).some((q) => q.usuarioId === p.id);
      if (used) {
        return { ok: false, error: 'Usuário possui registros no histórico. Inative-o em vez de excluir.' };
      }
      const idx = db.usuarios.findIndex((x) => x.id === p.id);
      if (idx === -1) return { ok: false, error: 'Usuário não encontrado' };
      const removed = db.usuarios.splice(idx, 1)[0];
      addAuditLog(db, 'usuario', p.id, 'EXCLUIR', actorId, actorName, { usuario: removed.usuario }, null);
      break;
    }

    case 'MARK_NOTIFICATIONS_READ': {
      for (const n of db.notificacoes || []) {
        n.lida = true;
      }
      break;
    }

    case 'PURGE_DEMO_DATA': {
      purgeDemoData(db);
      addAuditLog(db, 'sistema', 'demo', 'PURGE_DEMO', actorId, actorName, null, { limpo: true });
      break;
    }

    default:
      return { ok: false, error: `Operação desconhecida: ${op.type}` };
  }

  db.processedOpIds.push(op.opId);
  if (db.processedOpIds.length > 500) {
    db.processedOpIds = db.processedOpIds.slice(-500);
  }
  db.updatedAt = new Date().toISOString();

  return result;
}
