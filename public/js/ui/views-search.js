import { escapeHtml, formatDateBR, formatNumber } from '../utils.js';
import {
  SECTORS,
  SECTOR_LABELS,
  computeProductionSummary,
  computeSectorTotals,
  computeDailyProduction,
  executeGlobalSearch,
  filterByPeriod,
  getAllowedSectorsForUser,
  getRecordProduct
} from '../logic.js';
import { renderStatusPill, openModal, closeModal } from './components.js';
import { startVoiceCapture } from '../voice.js';

export function renderSearchView({ db, user, params = {} }) {
  let query = params.initialQuery || '';

  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));
  const userMap = new Map(db.usuarios.map((u) => [u.id, u]));

  const quickChips = [
    'Produção de hoje',
    'O que ainda não entrou?',
    'Produtos quebrados',
    'Produção da marcenaria',
    'Canaleta 14'
  ];

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">🔎 PESQUISAR</h1>
            <div class="page-date">Produtos, produções, quebras, entradas e conferências</div>
          </div>
        </div>

        <div class="search-bar-box">
          <input id="global-search-input" class="input" type="search" placeholder="Digite ou fale o que procura..." value="${escapeHtml(query)}" />
          <button type="button" class="btn btn-primary" id="btn-voice-search" title="Pesquisar por voz">🎙️ FALAR</button>
        </div>

        <div class="chip-row">
          ${quickChips.map((c) => `
            <button type="button" class="chip quick-q-chip" data-q="${escapeHtml(c)}">${escapeHtml(c)}</button>
          `).join('')}
        </div>

        <div id="search-results-area"></div>
      </div>
    `,
    mount: () => {
      const inp = document.getElementById('global-search-input');
      const area = document.getElementById('search-results-area');

      function runSearch() {
        const q = inp.value.trim();
        if (!q) {
          area.innerHTML = `
            <div class="empty-state">
              Digite um produto (ex.: <strong>Canaleta 14</strong>) ou toque em <strong>🎙️ FALAR</strong> e diga:<br/>
              <em>"Quero ver o que está pendente"</em> ou <em>"Produção de hoje"</em>.
            </div>
          `;
          return;
        }

        const res = executeGlobalSearch(db, q, user);
        const total = res.produtos.length + res.producoes.length;

        if (total === 0) {
          area.innerHTML = `<div class="empty-state">Nenhum resultado encontrado para "<strong>${escapeHtml(q)}</strong>".</div>`;
          return;
        }

        let html = '';

        if (res.producoes.length > 0) {
          html += `<div class="section-title">Produções / Conferências / Entradas (${res.producoes.length})</div>`;
          html += `<div class="grid-cards">`;
          html += res.producoes.map((rec) => {
            const prod = getRecordProduct(rec, prodMap);
            const s = computeProductionSummary(rec);
            const resp = userMap.get(rec.usuarioId)?.nome || '';
            return `
              <div class="board-card">
                <div style="display:flex;gap:12px;align-items:center;">
                  <img src="${prod?.foto || ''}" alt="" style="width:82px;height:82px;object-fit:contain;border-radius:10px;border:1px solid var(--border);background:var(--surface-alt);flex-shrink:0;" />
                  <div style="flex:1;min-width:0;">
                    <div class="fw-800">${escapeHtml(prod?.nome || 'Produto')}</div>
                    <div class="text-muted" style="font-size:0.82rem;font-weight:700;">
                      📅 ${formatDateBR(rec.data)} ${rec.hora} • ${escapeHtml(resp)}
                    </div>
                    <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
                      ${renderStatusPill(s.statusTone, s.statusBadge)}
                      ${rec.tipoDestino === 'PEDIDO' ? renderStatusPill('blue', `📋 Pedido #${escapeHtml(rec.numeroPedido || '')}`) : renderStatusPill('gray', '📦 Estoque')}
                    </div>
                  </div>
                </div>
                <div class="board-metrics">
                  <div class="metric-item"><span class="metric-num">${formatNumber(s.produzida)}</span><span class="metric-lbl">produzidas</span></div>
                  <div class="metric-item"><span class="metric-num" style="color:${s.quebrada > 0 ? 'var(--amber)' : 'inherit'};">${formatNumber(s.quebrada)}</span><span class="metric-lbl">quebradas</span></div>
                  <div class="metric-item"><span class="metric-num" style="color:var(--green);">${formatNumber(s.aproveitavel)}</span><span class="metric-lbl">aproveitáveis</span></div>
                </div>
              </div>
            `;
          }).join('');
          html += `</div>`;
        }

        if (res.produtos.length > 0) {
          html += `<div class="section-title" style="margin-top:20px;">Produtos Cadastrados (${res.produtos.length})</div>`;
          html += `<div class="grid-cards grid-cards-3">`;
          html += res.produtos.map((p) => `
            <div class="board-card">
              <img src="${p.foto}" alt="${escapeHtml(p.nome)}" class="product-photo-md" />
              <div class="fw-800">${escapeHtml(p.nome)}</div>
              <div class="text-muted" style="font-size:0.84rem;font-weight:700;">
                ${SECTOR_LABELS[p.setor]} • ${escapeHtml(p.codigo || '')} (${escapeHtml(p.unidade)})
              </div>
            </div>
          `).join('');
          html += `</div>`;
        }

        area.innerHTML = html;
      }

      inp?.addEventListener('input', runSearch);

      document.querySelectorAll('.quick-q-chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          inp.value = btn.dataset.q;
          runSearch();
        });
      });

      const launchVoice = () => {
        openModal({
          title: '🎙️ Pesquisa por Voz',
          bodyHtml: `
            <div style="text-align:center;padding:8px 0;">
              <div id="vs-mic" class="voice-pulse" style="width:70px;height:70px;border-radius:999px;background:var(--blue);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:1.8rem;margin-bottom:10px;">🎙️</div>
              <div id="vs-msg" class="fw-800">Ouvindo... Diga o que procura</div>
              <div class="text-muted" style="font-size:0.85rem;margin-top:4px;">Ex: "O que ainda não entrou?" ou "Canaleta 14"</div>
            </div>
            <div class="field" style="margin-top:12px;">
              <label for="vs-fallback">Ou digite aqui:</label>
              <div style="display:flex;gap:8px;">
                <input id="vs-fallback" class="input" type="text" placeholder="Ex: Produtos quebrados" />
                <button type="button" class="btn btn-primary" id="vs-go">BUSCAR</button>
              </div>
            </div>
          `,
          onMount: () => {
            const msgEl = document.getElementById('vs-msg');
            const micEl = document.getElementById('vs-mic');
            const fbInp = document.getElementById('vs-fallback');

            const rec = startVoiceCapture({
              onResult: (transcript) => {
                closeModal();
                inp.value = transcript;
                runSearch();
              },
              onError: (errMsg) => {
                micEl?.classList.remove('voice-pulse');
                if (msgEl) {
                  msgEl.textContent = errMsg === 'FALLBACK'
                    ? 'Microfone indisponível neste navegador. Digite abaixo:'
                    : errMsg;
                }
                fbInp?.focus();
              }
            });

            document.getElementById('vs-go')?.addEventListener('click', () => {
              const t = fbInp.value.trim();
              if (!t) return;
              rec.stop();
              closeModal();
              inp.value = t;
              runSearch();
            });
          }
        });
      };

      document.getElementById('btn-voice-search')?.addEventListener('click', launchVoice);

      runSearch();
      if (params.autoVoice) {
        launchVoice();
      }
    }
  };
}

export function renderHistoryView({ db, user }) {
  let period = 'mes';
  let filterStatus = 'ALL';
  const allowedSectors = getAllowedSectorsForUser(user);
  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));
  const userMap = new Map(db.usuarios.map((u) => [u.id, u]));

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">📋 HISTÓRICO DE PRODUÇÃO</h1>
            <div class="page-date">Acompanhamento completo de fabricação, quebras e entradas</div>
          </div>
        </div>

        <div class="chip-row" id="hist-per-chips">
          <button type="button" class="chip" data-per="hoje">Hoje</button>
          <button type="button" class="chip" data-per="7dias">7 dias</button>
          <button type="button" class="chip active" data-per="mes">Este mês</button>
          <button type="button" class="chip" data-per="todos">Tudo</button>
        </div>

        <div class="chip-row" id="hist-st-chips">
          <button type="button" class="chip active" data-st="ALL">Todos</button>
          <button type="button" class="chip" data-st="PENDENTE">🟠 Pendentes</button>
          <button type="button" class="chip" data-st="ENTRADA_REALIZADA">🟢 Entradas</button>
          <button type="button" class="chip" data-st="DIVERGENCIA">🔴 Divergências</button>
        </div>

        <div id="hist-list" class="grid-cards"></div>
      </div>
    `,
    mount: () => {
      const listEl = document.getElementById('hist-list');

      function renderList() {
        let items = db.producoes.filter((r) => allowedSectors.includes(r.setor));
        items = filterByPeriod(items, period);
        items = items.filter((r) => {
          const s = computeProductionSummary(r);
          if (filterStatus === 'PENDENTE') return !s.entradaRealizada;
          if (filterStatus === 'ENTRADA_REALIZADA') return s.entradaRealizada;
          if (filterStatus === 'DIVERGENCIA') return s.temDivergencia;
          return true;
        }).sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));

        if (items.length === 0) {
          listEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Nenhum registro encontrado.</div>`;
          return;
        }

        listEl.innerHTML = items.map((r) => {
          const prod = getRecordProduct(r, prodMap);
          const s = computeProductionSummary(r);
          const resp = userMap.get(r.usuarioId)?.nome || 'Operador';
          return `
            <div class="board-card">
              <div style="display:flex;gap:12px;align-items:center;">
                <img src="${prod?.foto || ''}" alt="" style="width:82px;height:82px;object-fit:contain;border-radius:10px;border:1px solid var(--border);background:var(--surface-alt);flex-shrink:0;" />
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.75rem;font-weight:800;color:var(--text-muted);">${SECTOR_LABELS[r.setor]}</div>
                  <div class="fw-800" style="font-size:1.05rem;">${escapeHtml(prod?.nome || 'Produto')}</div>
                  <div class="text-muted" style="font-size:0.8rem;font-weight:700;">📅 ${formatDateBR(r.data)} ${r.hora} • ${escapeHtml(resp)}</div>
                  <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
                    ${renderStatusPill(s.statusTone, s.statusBadge)}
                    ${r.tipoDestino === 'PEDIDO' ? renderStatusPill('blue', `📋 Pedido #${escapeHtml(r.numeroPedido || '')}`) : renderStatusPill('gray', '📦 Estoque')}
                  </div>
                </div>
              </div>
              <div class="board-metrics">
                <div class="metric-item"><span class="metric-num">${formatNumber(s.produzida)}</span><span class="metric-lbl">produzidas</span></div>
                <div class="metric-item"><span class="metric-num" style="color:${s.quebrada > 0 ? 'var(--amber)' : 'inherit'};">${formatNumber(s.quebrada)}</span><span class="metric-lbl">quebradas</span></div>
                <div class="metric-item"><span class="metric-num" style="color:var(--green);">${formatNumber(s.aproveitavel)}</span><span class="metric-lbl">aproveitáveis</span></div>
              </div>
            </div>
          `;
        }).join('');
      }

      document.querySelectorAll('#hist-per-chips .chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#hist-per-chips .chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          period = btn.dataset.per;
          renderList();
        });
      });
      document.querySelectorAll('#hist-st-chips .chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#hist-st-chips .chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          filterStatus = btn.dataset.st;
          renderList();
        });
      });

      renderList();
    }
  };
}

export function renderReportsView({ db }) {
  let period = 'mes';
  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">📊 RELATÓRIOS</h1>
            <div class="page-date">Consolidado de Produção, Quebras, Divergências e Entradas</div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="rep-export-csv">⬇️ Exportar CSV</button>
        </div>

        <div class="chip-row" id="rep-per-chips">
          <button type="button" class="chip" data-per="hoje">Hoje</button>
          <button type="button" class="chip" data-per="7dias">7 dias</button>
          <button type="button" class="chip active" data-per="mes">Este mês</button>
          <button type="button" class="chip" data-per="mes_anterior">Mês anterior</button>
        </div>

        <div id="rep-body"></div>
      </div>
    `,
    mount: () => {
      const bodyEl = document.getElementById('rep-body');

      function getFiltered() {
        return filterByPeriod(db.producoes, period);
      }

      function renderRep() {
        const items = getFiltered();
        const totals = computeSectorTotals(items);
        const days = computeDailyProduction(items);
        const divs = items.filter((r) => computeProductionSummary(r).temDivergencia);

        bodyEl.innerHTML = `
          <div class="grid-cards" style="margin-bottom:16px;">
            <div class="card">
              <div class="fw-800" style="margin-bottom:10px;">🧱 PRÉ-MOLDADOS</div>
              <div class="stack" style="gap:6px;font-weight:700;">
                <div class="row-between"><span>Total produzido:</span><strong>${formatNumber(totals.premoldados.produzidos)}</strong></div>
                <div class="row-between"><span>Total quebrado:</span><strong style="color:var(--amber);">${formatNumber(totals.premoldados.quebrados)}</strong></div>
                <div class="row-between"><span>Total aproveitável:</span><strong>${formatNumber(totals.premoldados.aproveitaveis)}</strong></div>
                <div class="row-between"><span>Total conferido:</span><strong style="color:var(--blue);">${formatNumber(totals.premoldados.conferidos)}</strong></div>
                <div class="row-between"><span>Total com entrada:</span><strong style="color:var(--green);">${formatNumber(totals.premoldados.entradasRealizadas)}</strong></div>
                <div class="row-between"><span>Total pendente:</span><strong style="color:var(--orange);">${formatNumber(totals.premoldados.pendentes)}</strong></div>
              </div>
            </div>

            <div class="card">
              <div class="fw-800" style="margin-bottom:10px;">🪵 MARCENARIA</div>
              <div class="stack" style="gap:6px;font-weight:700;">
                <div class="row-between"><span>Total produzido:</span><strong>${formatNumber(totals.marcenaria.produzidos)}</strong></div>
                <div class="row-between"><span>Total conferido:</span><strong style="color:var(--blue);">${formatNumber(totals.marcenaria.conferidos)}</strong></div>
                <div class="row-between"><span>Total com entrada:</span><strong style="color:var(--green);">${formatNumber(totals.marcenaria.entradasRealizadas)}</strong></div>
                <div class="row-between"><span>Total pendente:</span><strong style="color:var(--orange);">${formatNumber(totals.marcenaria.pendentes)}</strong></div>
              </div>
            </div>
          </div>

          <div class="section-title">🔴 Divergências no Período (${divs.length})</div>
          ${divs.length === 0 ? `<div class="empty-state">Nenhuma divergência registrada neste período.</div>` : `
            <div class="stack" style="margin-bottom:16px;">
              ${divs.map((r) => {
                const p = getRecordProduct(r, prodMap);
                const s = computeProductionSummary(r);
                return `
                  <div class="div-alert">
                    <strong>${escapeHtml(p?.nome || '')}</strong> (${formatDateBR(r.data)}) —
                    Esperado: ${s.aproveitavel} | Conferido: ${s.conferida} | Diferença: ${s.diferenca > 0 ? '+' : ''}${s.diferenca}
                  </div>
                `;
              }).join('')}
            </div>
          `}

          <div class="section-title">📆 Resumo Diário</div>
          ${days.length === 0 ? `<div class="empty-state">Sem produções no período.</div>` : `
            <div class="stack">
              ${days.map((d) => `
                <div class="card row-between" style="padding:12px 14px;">
                  <span class="fw-800">${formatDateBR(d.data)}</span>
                  <span class="fw-700">${formatNumber(d.totalProduzido)} prod. • ${formatNumber(d.totalEntradas)} entradas</span>
                </div>
              `).join('')}
            </div>
          `}
        `;
      }

      document.querySelectorAll('#rep-per-chips .chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#rep-per-chips .chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          period = btn.dataset.per;
          renderRep();
        });
      });

      document.getElementById('rep-export-csv')?.addEventListener('click', () => {
        const rows = [['Data', 'Hora', 'Setor', 'Codigo', 'Produto', 'Destino', 'Pedido', 'Produzida', 'Quebrada', 'Aproveitavel', 'Conferida', 'Status']];
        for (const r of getFiltered()) {
          const p = getRecordProduct(r, prodMap);
          const s = computeProductionSummary(r);
          rows.push([
            r.data,
            r.hora,
            r.setor,
            p?.codigo || '',
            `"${(p?.nome || '').replace(/"/g, '""')}"`,
            r.tipoDestino === 'PEDIDO' ? 'PEDIDO' : 'ESTOQUE',
            r.numeroPedido || '',
            s.produzida,
            s.quebrada,
            s.aproveitavel,
            s.conferida ?? '',
            r.status
          ]);
        }
        const csv = rows.map((row) => row.join(';')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-producao-${period}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });

      renderRep();
    }
  };
}
