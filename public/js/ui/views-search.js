import {
  escapeHtml,
  formatDateBR,
  formatNumber,
  getLocalDateStr,
  getLocalTimeStr,
  getMonthBounds,
  addDays
} from '../utils.js';
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

export function renderReportsView({ db, user }) {
  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));
  const userMap = new Map(db.usuarios.map((u) => [u.id, u]));

  const todayStr = getLocalDateStr();
  const currentMonthStr = todayStr.slice(0, 7);

  let mode = 'dia'; // 'dia' | 'mes' | 'hoje' | '7dias' | 'mes_atual' | 'mes_anterior' | 'personalizado'
  let selectedDate = todayStr;
  let selectedMonth = currentMonthStr;
  let customStart = todayStr;
  let customEnd = todayStr;
  let filterSector = 'ALL';
  let filterDest = 'ALL';

  function getRangeAndLabel() {
    let start = todayStr;
    let end = todayStr;
    let label = '';

    if (mode === 'dia') {
      start = selectedDate || todayStr;
      end = selectedDate || todayStr;
      label = `Dia ${formatDateBR(start)}`;
    } else if (mode === 'mes') {
      const parts = (selectedMonth || currentMonthStr).split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const lastDay = new Date(y, m, 0).getDate();
      start = `${parts[0]}-${String(m).padStart(2, '0')}-01`;
      end = `${parts[0]}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      label = `Mês de ${monthNames[m - 1] || m}/${y}`;
    } else if (mode === 'hoje') {
      start = todayStr;
      end = todayStr;
      label = `Hoje (${formatDateBR(todayStr)})`;
    } else if (mode === '7dias') {
      start = addDays(todayStr, -6);
      end = todayStr;
      label = `Últimos 7 Dias (${formatDateBR(start)} a ${formatDateBR(end)})`;
    } else if (mode === 'mes_atual') {
      const bounds = getMonthBounds(new Date(), 0);
      start = bounds.start;
      end = bounds.end;
      label = `Este Mês (${formatDateBR(start)} a ${formatDateBR(end)})`;
    } else if (mode === 'mes_anterior') {
      const bounds = getMonthBounds(new Date(), -1);
      start = bounds.start;
      end = bounds.end;
      label = `Mês Anterior (${formatDateBR(start)} a ${formatDateBR(end)})`;
    } else if (mode === 'personalizado') {
      start = customStart || todayStr;
      end = customEnd || todayStr;
      label = `Período de ${formatDateBR(start)} a ${formatDateBR(end)}`;
    }

    return { start, end, label };
  }

  function getFilteredItems() {
    const { start, end } = getRangeAndLabel();
    return db.producoes.filter((r) => {
      const d = r.data || '';
      if (d < start || d > end) return false;
      if (filterSector !== 'ALL' && r.setor !== filterSector) return false;
      if (filterDest === 'ESTOQUE' && r.tipoDestino === 'PEDIDO') return false;
      if (filterDest === 'PEDIDO' && r.tipoDestino !== 'PEDIDO') return false;
      return true;
    }).sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));
  }

  return {
    html: `
      <div class="main-content">
        <div class="page-header no-print">
          <div>
            <h1 class="page-title">📊 RELATÓRIOS DE PRODUÇÃO</h1>
            <div class="page-date">Emissão e impressão de relatórios diários ou mensais</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-primary btn-sm" id="rep-print-btn">🖨️ IMPRIMIR RELATÓRIO</button>
            <button type="button" class="btn btn-outline btn-sm" id="rep-export-csv">⬇️ Exportar CSV</button>
          </div>
        </div>

        <div class="card no-print" id="rep-controls-card" style="margin-bottom:16px;">
          <div class="fw-800" style="margin-bottom:10px;font-size:0.85rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;">
            Período e Filtros do Relatório
          </div>

          <div class="chip-row" id="rep-mode-chips" style="margin-bottom:12px;">
            <button type="button" class="chip active" data-mode="dia">📅 Por Dia</button>
            <button type="button" class="chip" data-mode="mes">🗓️ Por Mês</button>
            <button type="button" class="chip" data-mode="hoje">Hoje</button>
            <button type="button" class="chip" data-mode="7dias">7 dias</button>
            <button type="button" class="chip" data-mode="mes_atual">Este mês</button>
            <button type="button" class="chip" data-mode="mes_anterior">Mês anterior</button>
            <button type="button" class="chip" data-mode="personalizado">Personalizado</button>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;align-items:flex-end;">
            <div id="rep-box-day" class="field" style="margin-bottom:0;">
              <label>Escolha a Data</label>
              <input type="date" id="rep-day-val" class="input" value="${todayStr}" />
            </div>

            <div id="rep-box-month" class="field" style="margin-bottom:0;display:none;">
              <label>Escolha o Mês / Ano</label>
              <input type="month" id="rep-month-val" class="input" value="${currentMonthStr}" />
            </div>

            <div id="rep-box-custom" class="field" style="margin-bottom:0;display:none;">
              <div style="display:flex;gap:6px;">
                <div style="flex:1;"><label>De</label><input type="date" id="rep-cust-start" class="input" value="${todayStr}" /></div>
                <div style="flex:1;"><label>Até</label><input type="date" id="rep-cust-end" class="input" value="${todayStr}" /></div>
              </div>
            </div>

            <div class="field" style="margin-bottom:0;">
              <label>Setor</label>
              <select id="rep-filter-sector" class="select">
                <option value="ALL">Todos os setores</option>
                <option value="${SECTORS.PRE_MOLDADOS}">🧱 Pré-Moldados</option>
                <option value="${SECTORS.MARCENARIA}">🪵 Marcenaria</option>
              </select>
            </div>

            <div class="field" style="margin-bottom:0;">
              <label>Destino</label>
              <select id="rep-filter-dest" class="select">
                <option value="ALL">Todos os destinos</option>
                <option value="ESTOQUE">📦 Para Estoque</option>
                <option value="PEDIDO">📋 Para Pedido</option>
              </select>
            </div>
          </div>
        </div>

        <div id="rep-body"></div>
      </div>
    `,
    mount: () => {
      const bodyEl = document.getElementById('rep-body');
      const boxDay = document.getElementById('rep-box-day');
      const boxMonth = document.getElementById('rep-box-month');
      const boxCustom = document.getElementById('rep-box-custom');

      function updateControlBoxes() {
        boxDay.style.display = mode === 'dia' ? 'block' : 'none';
        boxMonth.style.display = mode === 'mes' ? 'block' : 'none';
        boxCustom.style.display = mode === 'personalizado' ? 'block' : 'none';
      }

      function renderRep() {
        const { label } = getRangeAndLabel();
        const items = getFilteredItems();

        let totalProd = 0;
        let totalQuebra = 0;
        let totalAprov = 0;
        let totalConf = 0;
        let totalEntradas = 0;
        let totalPendentes = 0;
        let totalParaEstoque = 0;
        let totalParaPedido = 0;

        const divs = [];

        items.forEach((r) => {
          const s = computeProductionSummary(r);
          totalProd += s.produzida;
          totalQuebra += s.quebrada;
          totalAprov += s.aproveitavel;
          if (s.conferida != null) totalConf += s.conferida;
          if (s.entradaRealizada) totalEntradas += s.quantidadeEfetivaEntrada;
          else totalPendentes += s.aproveitavel;

          if (r.tipoDestino === 'PEDIDO') totalParaPedido += s.produzida;
          else totalParaEstoque += s.produzida;

          if (s.temDivergencia) divs.push({ r, s });
        });

        const percQuebra = totalProd > 0 ? ((totalQuebra / totalProd) * 100).toFixed(1) : '0.0';

        const sectorLabelText = filterSector === 'ALL'
          ? 'Todos os Setores'
          : (SECTOR_LABELS[filterSector] || filterSector);

        const destLabelText = filterDest === 'ALL'
          ? 'Todos os Destinos'
          : (filterDest === 'PEDIDO' ? 'Somente Pedidos' : 'Somente Estoque');

        bodyEl.innerHTML = `
          <!-- Printable Header -->
          <div class="print-doc-header" style="border-bottom:2px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-size:1.35rem;font-weight:900;letter-spacing:0.5px;color:var(--text);">
                  SOMADEIRAS — CONTROLE DE PRODUÇÃO
                </div>
                <div style="font-size:1.1rem;font-weight:800;color:var(--blue);margin-top:2px;">
                  RELATÓRIO DE PRODUÇÃO: ${escapeHtml(label)}
                </div>
                <div style="font-size:0.85rem;color:var(--text-muted);font-weight:700;margin-top:4px;">
                  Setor: <strong style="color:var(--text);">${escapeHtml(sectorLabelText)}</strong> •
                  Destino: <strong style="color:var(--text);">${escapeHtml(destLabelText)}</strong>
                </div>
              </div>
              <div style="text-align:right;font-size:0.82rem;color:var(--text-muted);font-weight:600;line-height:1.4;">
                <div>📅 <strong>Emissão:</strong> ${formatDateBR(todayStr)} às ${getLocalTimeStr()}</div>
                <div>👤 <strong>Usuário:</strong> ${escapeHtml(user?.nome || 'Sistema')}</div>
                <div>🏭 <strong>Unidade:</strong> Somadeiras (Pré-Moldados & Marcenaria)</div>
              </div>
            </div>
          </div>

          <!-- KPI Summary Grid -->
          <div class="kpi-grid" style="margin-bottom:16px;">
            <div class="kpi-card">
              <span class="kpi-label">Total Produzido</span>
              <span class="kpi-value">${formatNumber(totalProd)}</span>
              <span class="text-muted" style="font-size:0.8rem;font-weight:700;">${items.length} lote(s) registrados</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Total Quebras</span>
              <span class="kpi-value" style="color:${totalQuebra > 0 ? 'var(--amber)' : 'inherit'};">${formatNumber(totalQuebra)}</span>
              <span class="text-muted" style="font-size:0.8rem;font-weight:700;">${percQuebra}% de perda</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Total Aproveitável</span>
              <span class="kpi-value" style="color:var(--green);">${formatNumber(totalAprov)}</span>
              <span class="text-muted" style="font-size:0.8rem;font-weight:700;">Apto para uso/venda</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Entradas no Estoque</span>
              <span class="kpi-value" style="color:var(--blue);">${formatNumber(totalEntradas)}</span>
              <span class="text-muted" style="font-size:0.8rem;font-weight:700;">${formatNumber(totalPendentes)} pendente(s)</span>
            </div>
          </div>

          <div class="card" style="margin-bottom:16px;padding:12px 14px;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;font-weight:700;font-size:0.9rem;">
              <div>📦 <strong>Destinado ao Estoque:</strong> ${formatNumber(totalParaEstoque)} un</div>
              <div>📋 <strong>Destinado a Pedidos:</strong> ${formatNumber(totalParaPedido)} un</div>
              <div>🔴 <strong>Divergências no Período:</strong> ${divs.length} ocorrência(s)</div>
            </div>
          </div>

          ${divs.length > 0 ? `
            <div class="section-title" style="margin-top:14px;color:var(--red);">🔴 Divergências Registradas (${divs.length})</div>
            <div class="stack" style="margin-bottom:16px;">
              ${divs.map(({ r, s }) => {
                const p = getRecordProduct(r, prodMap);
                return `
                  <div class="div-alert">
                    <strong>${escapeHtml(p?.nome || 'Produto')}</strong> (${formatDateBR(r.data)} às ${r.hora}) —
                    Aproveitável: <strong>${s.aproveitavel}</strong> | Conferido: <strong>${s.conferida}</strong> |
                    Diferença: <strong style="text-decoration:underline;">${s.diferenca > 0 ? '+' : ''}${s.diferenca}</strong>
                    ${r.motivoDivergencia ? `<br><small>Motivo: ${escapeHtml(r.motivoDivergencia)}</small>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          <!-- Detailed Table -->
          <div class="section-title" style="margin-top:14px;">📋 Detalhamento dos Lotes Produzidos</div>
          ${items.length === 0 ? `
            <div class="empty-state">Nenhuma produção registrada no período selecionado.</div>
          ` : `
            <div style="overflow-x:auto;margin-bottom:16px;background:var(--surface);border-radius:12px;border:1px solid var(--border);">
              <table class="table-print" style="width:100%;border-collapse:collapse;font-size:0.85rem;text-align:left;">
                <thead>
                  <tr style="background:var(--surface-alt);border-bottom:2px solid var(--border);">
                    <th style="padding:10px 8px;font-weight:800;">Data/Hora</th>
                    <th style="padding:10px 8px;font-weight:800;">Setor</th>
                    <th style="padding:10px 8px;font-weight:800;">Produto</th>
                    <th style="padding:10px 8px;font-weight:800;">Destino</th>
                    <th style="padding:10px 8px;font-weight:800;text-align:right;">Produzido</th>
                    <th style="padding:10px 8px;font-weight:800;text-align:right;">Quebra</th>
                    <th style="padding:10px 8px;font-weight:800;text-align:right;">Aproveitável</th>
                    <th style="padding:10px 8px;font-weight:800;text-align:right;">Conferido</th>
                    <th style="padding:10px 8px;font-weight:800;text-align:center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((r, idx) => {
                    const prod = getRecordProduct(r, prodMap);
                    const s = computeProductionSummary(r);
                    const resp = userMap.get(r.usuarioId)?.nome || 'Operador';
                    const isEven = idx % 2 === 0;

                    return `
                      <tr style="border-bottom:1px solid var(--border);background:${isEven ? 'transparent' : 'var(--surface-alt)'};">
                        <td style="padding:8px;font-weight:700;white-space:nowrap;">
                          ${formatDateBR(r.data)} <span class="text-muted">${r.hora}</span>
                        </td>
                        <td style="padding:8px;font-weight:700;white-space:nowrap;">
                          ${r.setor === SECTORS.PRE_MOLDADOS ? '🧱 Pré-Mold.' : '🪵 Marcen.'}
                        </td>
                        <td style="padding:8px;font-weight:800;">
                          ${escapeHtml(prod?.nome || 'Produto')}
                          <div class="text-muted" style="font-size:0.75rem;font-weight:600;">Resp: ${escapeHtml(resp)}</div>
                        </td>
                        <td style="padding:8px;white-space:nowrap;">
                          ${r.tipoDestino === 'PEDIDO'
                            ? `<span style="display:inline-block;padding:2px 6px;border-radius:6px;background:#EFF6FF;color:var(--blue);font-weight:800;font-size:0.8rem;">📋 Pedido #${escapeHtml(r.numeroPedido || '')}</span>`
                            : `<span style="display:inline-block;padding:2px 6px;border-radius:6px;background:#F3F4F6;color:#4B5563;font-weight:700;font-size:0.8rem;">📦 Estoque</span>`
                          }
                        </td>
                        <td style="padding:8px;text-align:right;font-weight:800;">${formatNumber(s.produzida)}</td>
                        <td style="padding:8px;text-align:right;font-weight:800;color:${s.quebrada > 0 ? 'var(--amber)' : 'inherit'};">${formatNumber(s.quebrada)}</td>
                        <td style="padding:8px;text-align:right;font-weight:800;color:var(--green);">${formatNumber(s.aproveitavel)}</td>
                        <td style="padding:8px;text-align:right;font-weight:800;color:var(--blue);">${s.conferida != null ? formatNumber(s.conferida) : '-'}</td>
                        <td style="padding:8px;text-align:center;">
                          ${renderStatusPill(s.statusTone, s.statusBadge)}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr style="background:var(--surface-alt);font-weight:900;border-top:2px solid var(--border);">
                    <td colspan="4" style="padding:10px 8px;">TOTAL GERAL (${items.length} lotes)</td>
                    <td style="padding:10px 8px;text-align:right;">${formatNumber(totalProd)}</td>
                    <td style="padding:10px 8px;text-align:right;color:var(--amber);">${formatNumber(totalQuebra)}</td>
                    <td style="padding:10px 8px;text-align:right;color:var(--green);">${formatNumber(totalAprov)}</td>
                    <td style="padding:10px 8px;text-align:right;color:var(--blue);">${formatNumber(totalConf)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          `}

          <!-- Signatures for printed document -->
          <div class="print-signatures" style="margin-top:40px;padding-top:20px;border-top:1px dashed var(--border);display:flex;justify-content:space-between;gap:20px;">
            <div class="print-signature-box" style="flex:1;text-align:center;">
              <div style="border-top:1px solid #444;margin:0 12px;padding-top:6px;font-weight:800;font-size:0.82rem;">
                Responsável pela Produção
              </div>
            </div>
            <div class="print-signature-box" style="flex:1;text-align:center;">
              <div style="border-top:1px solid #444;margin:0 12px;padding-top:6px;font-weight:800;font-size:0.82rem;">
                Conferente / Almoxarifado
              </div>
            </div>
            <div class="print-signature-box" style="flex:1;text-align:center;">
              <div style="border-top:1px solid #444;margin:0 12px;padding-top:6px;font-weight:800;font-size:0.82rem;">
                Visto da Direção / Gerência
              </div>
            </div>
          </div>
        `;
      }

      // Mode chips handling
      document.querySelectorAll('#rep-mode-chips .chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#rep-mode-chips .chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          mode = btn.dataset.mode;
          updateControlBoxes();
          renderRep();
        });
      });

      // Filter events
      document.getElementById('rep-day-val')?.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        renderRep();
      });

      document.getElementById('rep-month-val')?.addEventListener('change', (e) => {
        selectedMonth = e.target.value;
        renderRep();
      });

      document.getElementById('rep-cust-start')?.addEventListener('change', (e) => {
        customStart = e.target.value;
        renderRep();
      });

      document.getElementById('rep-cust-end')?.addEventListener('change', (e) => {
        customEnd = e.target.value;
        renderRep();
      });

      document.getElementById('rep-filter-sector')?.addEventListener('change', (e) => {
        filterSector = e.target.value;
        renderRep();
      });

      document.getElementById('rep-filter-dest')?.addEventListener('change', (e) => {
        filterDest = e.target.value;
        renderRep();
      });

      // Print Button
      document.getElementById('rep-print-btn')?.addEventListener('click', () => {
        window.print();
      });

      // CSV Export Button
      document.getElementById('rep-export-csv')?.addEventListener('click', () => {
        const { label } = getRangeAndLabel();
        const items = getFilteredItems();
        const rows = [
          ['Data', 'Hora', 'Setor', 'Codigo', 'Produto', 'Destino', 'NumeroPedido', 'Produzida', 'Quebrada', 'Aproveitavel', 'Conferida', 'Status', 'Responsavel']
        ];

        for (const r of items) {
          const p = getRecordProduct(r, prodMap);
          const s = computeProductionSummary(r);
          const resp = userMap.get(r.usuarioId)?.nome || '';
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
            r.status,
            `"${resp.replace(/"/g, '""')}"`
          ]);
        }

        const csv = rows.map((row) => row.join(';')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanLabel = label.replace(/[^a-zA-Z0-9]/g, '_');
        a.download = `relatorio-producao-${cleanLabel}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });

      updateControlBoxes();
      renderRep();
    }
  };
}
  };
}
