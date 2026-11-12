import { escapeHtml, formatDateBR, formatNumber, getLocalDateStr } from '../utils.js';
import {
  SECTORS,
  computeDashboardKpis,
  computeSectorTotals,
  computeDailyProduction,
  aggregateProductsForBoard,
  filterByPeriod,
  getRecordProduct
} from '../logic.js';
import { renderStatusPill, openModal } from './components.js';

export function renderBossDashboardView({ db }) {
  let period = 'hoje';
  let customStart = '';
  let customEnd = '';
  let viewTab = 'produtos'; // 'produtos' | 'por-dia'

  const hoje = getLocalDateStr();
  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));

  const renderBoardProductCard = (g, isPremoldados) => {
    const prod = getRecordProduct(g, prodMap);
    return `
      <div class="board-card">
        <img src="${prod?.foto || ''}" alt="${escapeHtml(prod?.nome || 'Produto')}" class="product-photo-lg" />
        <div class="row-between" style="align-items:flex-start;">
          <h3 class="board-card-title">${escapeHtml(prod?.nome || 'Produto')}</h3>
        </div>
        ${g.produtoNaoCadastrado ? `<div>${renderStatusPill('amber', '⚠️ Produto não cadastrado')}</div>` : ''}

        ${isPremoldados ? `
          <div class="board-metrics">
            <div class="metric-item">
              <span class="metric-num">${formatNumber(g.produzida)}</span>
              <span class="metric-lbl">produzidas</span>
            </div>
            <div class="metric-item">
              <span class="metric-num" style="color:${g.quebrada > 0 ? 'var(--amber)' : 'inherit'};">${formatNumber(g.quebrada)}</span>
              <span class="metric-lbl">quebradas</span>
            </div>
            <div class="metric-item">
              <span class="metric-num" style="color:var(--green);">${formatNumber(g.aproveitavel)}</span>
              <span class="metric-lbl">aproveitáveis</span>
            </div>
          </div>
        ` : `
          <div style="font-size:1.35rem;font-weight:800;color:var(--text);">
            ${formatNumber(g.produzida)} <span style="font-size:0.95rem;font-weight:700;color:var(--text-muted);">produzidas</span>
            ${g.quebrada > 0 ? `<span style="font-size:0.95rem;color:var(--amber);margin-left:8px;">(${formatNumber(g.quebrada)} quebradas)</span>` : ''}
          </div>
        `}

        <div>
          ${renderStatusPill(g.statusTone, g.statusBadge)}
        </div>
      </div>
    `;
  };

  const renderSectorSummaryCard = (title, stats, showBreak) => `
    <div class="card">
      <div class="fw-800" style="font-size:1.05rem;margin-bottom:10px;">${title}</div>
      <div class="grid-2" style="gap:8px;">
        <div style="background:var(--surface-alt);padding:10px;border-radius:10px;">
          <div class="kpi-label">Total produzido</div>
          <div style="font-size:1.4rem;font-weight:800;">${formatNumber(stats.produzidos)}</div>
        </div>
        ${showBreak ? `
          <div style="background:var(--amber-bg);padding:10px;border-radius:10px;">
            <div class="kpi-label" style="color:var(--amber);">Total quebrado</div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--amber);">${formatNumber(stats.quebrados)}</div>
          </div>
          <div style="background:var(--surface-alt);padding:10px;border-radius:10px;">
            <div class="kpi-label">Total aproveitável</div>
            <div style="font-size:1.4rem;font-weight:800;">${formatNumber(stats.aproveitaveis)}</div>
          </div>
        ` : ''}
        <div style="background:var(--blue-bg);padding:10px;border-radius:10px;">
          <div class="kpi-label" style="color:var(--blue);">Total conferido</div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--blue);">${formatNumber(stats.conferidos)}</div>
        </div>
        <div style="background:var(--green-bg);padding:10px;border-radius:10px;">
          <div class="kpi-label" style="color:var(--green);">Total com entrada</div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--green);">${formatNumber(stats.entradasRealizadas)}</div>
        </div>
        <div style="background:var(--orange-bg);padding:10px;border-radius:10px;">
          <div class="kpi-label" style="color:var(--orange);">Total pendente</div>
          <div style="font-size:1.4rem;font-weight:800;color:var(--orange);">${formatNumber(stats.pendentes)}</div>
        </div>
      </div>
    </div>
  `;

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title" id="boss-header-date">📅 HOJE • ${formatDateBR(hoje)}</h1>
            <div class="page-date">Painel Gerencial — Visão Direta da Produção</div>
          </div>
        </div>

        <div class="chip-row" id="boss-period-chips">
          <button type="button" class="chip active" data-per="hoje">Hoje</button>
          <button type="button" class="chip" data-per="7dias">7 dias</button>
          <button type="button" class="chip" data-per="mes">Este mês</button>
          <button type="button" class="chip" data-per="mes_anterior">Mês anterior</button>
          <button type="button" class="chip" data-per="personalizado">Personalizado</button>
        </div>

        <div id="boss-custom-range" style="display:none;margin-bottom:12px;" class="card">
          <div class="grid-2">
            <div class="field" style="margin-bottom:0;"><label>De</label><input type="date" id="boss-start" class="input" /></div>
            <div class="field" style="margin-bottom:0;"><label>Até</label><input type="date" id="boss-end" class="input" /></div>
          </div>
        </div>

        <div class="chip-row" id="boss-view-tabs">
          <button type="button" class="chip active" data-tab="produtos">📦 Produtos e Setores</button>
          <button type="button" class="chip" data-tab="por-dia">📆 Produção por Dia</button>
        </div>

        <div id="boss-body"></div>
      </div>
    `,
    mount: () => {
      const bodyEl = document.getElementById('boss-body');
      const headerDate = document.getElementById('boss-header-date');
      const customBox = document.getElementById('boss-custom-range');

      function openDayDetailModal(dayObj) {
        const preItems = aggregateProductsForBoard(dayObj.items.filter((r) => r.setor === SECTORS.PRE_MOLDADOS));
        const marItems = aggregateProductsForBoard(dayObj.items.filter((r) => r.setor === SECTORS.MARCENARIA));

        openModal({
          title: `📅 Produção de ${formatDateBR(dayObj.data)}`,
          bodyHtml: `
            <div class="stack">
              ${preItems.length > 0 ? `<div class="fw-800">🧱 PRÉ-MOLDADOS</div>` : ''}
              ${preItems.map((g) => renderBoardProductCard(g, true)).join('')}
              ${marItems.length > 0 ? `<div class="fw-800" style="margin-top:6px;">🪵 MARCENARIA</div>` : ''}
              ${marItems.map((g) => renderBoardProductCard(g, false)).join('')}
            </div>
          `
        });
      }

      function renderBody() {
        const periodLabels = {
          hoje: `📅 HOJE • ${formatDateBR(hoje)}`,
          '7dias': '📅 ÚLTIMOS 7 DIAS',
          mes: '📅 ESTE MÊS',
          mes_anterior: '📅 MÊS ANTERIOR',
          personalizado: '📅 PERÍODO PERSONALIZADO'
        };
        if (headerDate) headerDate.textContent = periodLabels[period] || periodLabels.hoje;

        const filtered = filterByPeriod(db.producoes, period, customStart, customEnd);
        const kpis = computeDashboardKpis(filtered);

        const kpiHtml = `
          <div class="kpi-grid">
            <div class="kpi-card kpi-blue">
              <span class="kpi-label">${period === 'hoje' ? 'PRODUZIDOS HOJE' : 'PRODUZIDOS'}</span>
              <span class="kpi-value">${formatNumber(kpis.produzidos)}</span>
            </div>
            <div class="kpi-card kpi-red">
              <span class="kpi-label">QUEBRADOS</span>
              <span class="kpi-value">${formatNumber(kpis.quebrados)}</span>
            </div>
            <div class="kpi-card kpi-green">
              <span class="kpi-label">ENTRADAS REALIZADAS</span>
              <span class="kpi-value">${formatNumber(kpis.entradasRealizadas)}</span>
            </div>
            <div class="kpi-card kpi-orange">
              <span class="kpi-label">PENDENTES</span>
              <span class="kpi-value">${formatNumber(kpis.pendentes)}</span>
            </div>
          </div>
        `;

        if (viewTab === 'por-dia') {
          const dailySource = period === 'hoje'
            ? filterByPeriod(db.producoes, 'mes')
            : filtered;
          const days = computeDailyProduction(dailySource);

          bodyEl.innerHTML = `
            ${kpiHtml}
            <div class="section-title">📆 Produção por Dia ${period === 'hoje' ? '(Este Mês)' : ''} — toque para detalhar</div>
            ${days.length === 0 ? `
              <div class="empty-state">Nenhuma produção registrada neste período.</div>
            ` : `
              <div class="stack">
                ${days.map((d) => `
                  <button type="button" class="day-row" data-open-day="${d.data}">
                    <div>
                      <div class="fw-800" style="font-size:1.1rem;">${d.dataCurta} <span class="text-muted" style="font-size:0.84rem;">(${formatDateBR(d.data)})</span></div>
                      <div style="font-size:0.84rem;color:var(--text-muted);font-weight:700;">
                        Quebras: ${formatNumber(d.totalQuebrado)} • Entradas: ${formatNumber(d.totalEntradas)} • Pendentes: ${formatNumber(d.totalPendente)}
                      </div>
                    </div>
                    <div style="text-align:right;">
                      <div style="font-size:1.3rem;font-weight:800;color:var(--blue);">${formatNumber(d.totalProduzido)}</div>
                      <div style="font-size:0.76rem;font-weight:700;color:var(--text-muted);">unidades</div>
                    </div>
                  </button>
                `).join('')}
              </div>
            `}
          `;

          bodyEl.querySelectorAll('[data-open-day]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const found = days.find((d) => d.data === btn.dataset.openDay);
              if (found) openDayDetailModal(found);
            });
          });
          return;
        }

        const preRecs = filtered.filter((r) => r.setor === SECTORS.PRE_MOLDADOS);
        const marRecs = filtered.filter((r) => r.setor === SECTORS.MARCENARIA);
        const preAgg = aggregateProductsForBoard(preRecs);
        const marAgg = aggregateProductsForBoard(marRecs);
        const sectorTotals = computeSectorTotals(filtered);

        bodyEl.innerHTML = `
          ${kpiHtml}

          ${period !== 'hoje' ? `
            <div class="section-title">Resumo por Setor</div>
            <div class="grid-cards" style="margin-bottom:16px;">
              ${renderSectorSummaryCard('🧱 PRÉ-MOLDADOS', sectorTotals.premoldados, true)}
              ${renderSectorSummaryCard('🪵 MARCENARIA', sectorTotals.marcenaria, false)}
            </div>
          ` : ''}

          <div class="section-title">🧱 PRÉ-MOLDADOS</div>
          ${preAgg.length === 0 ? `
            <div class="empty-state">Nenhuma produção de Pré-Moldados neste período.</div>
          ` : `
            <div class="grid-cards grid-cards-3">
              ${preAgg.map((g) => renderBoardProductCard(g, true)).join('')}
            </div>
          `}

          <div class="section-title" style="margin-top:22px;">🪵 MARCENARIA</div>
          ${marAgg.length === 0 ? `
            <div class="empty-state">Nenhuma produção de Marcenaria neste período.</div>
          ` : `
            <div class="grid-cards grid-cards-3">
              ${marAgg.map((g) => renderBoardProductCard(g, false)).join('')}
            </div>
          `}
        `;
      }

      document.querySelectorAll('#boss-period-chips .chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#boss-period-chips .chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          period = btn.dataset.per;
          customBox.style.display = period === 'personalizado' ? 'block' : 'none';
          renderBody();
        });
      });

      document.querySelectorAll('#boss-view-tabs .chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#boss-view-tabs .chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          viewTab = btn.dataset.tab;
          renderBody();
        });
      });

      document.getElementById('boss-start')?.addEventListener('change', (e) => { customStart = e.target.value; renderBody(); });
      document.getElementById('boss-end')?.addEventListener('change', (e) => { customEnd = e.target.value; renderBody(); });

      renderBody();
    }
  };
}
