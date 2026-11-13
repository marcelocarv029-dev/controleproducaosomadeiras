import { escapeHtml, formatDateBR, formatNumber } from '../utils.js';
import {
  SECTORS,
  SECTOR_LABELS,
  PROD_STATUS,
  computeProductionSummary,
  filterByPeriod,
  canEditEntry,
  canCorrectProduction,
  canUndoEntry,
  getRecordProduct
} from '../logic.js';
import { renderStatusPill, showToast, confirmDangerousAction, openCorrectionModal } from './components.js';

export function renderConferenceView({ db, user, onMutate }) {
  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));
  const userMap = new Map(db.usuarios.map((u) => [u.id, u]));
  const canAct = canEditEntry(user);

  // Order: 1) PRODUZIDO (not yet conferred), 2) CONFERIDO / DIVERGENCIA (awaiting entry), 3) ENTRADA_REALIZADA (latest 10)
  const pendingConf = db.producoes
    .filter((r) => r.status === PROD_STATUS.PRODUZIDO)
    .sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));

  const awaitingEntry = db.producoes
    .filter((r) => r.status === PROD_STATUS.CONFERIDO || r.status === PROD_STATUS.DIVERGENCIA)
    .sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));

  const completedToday = db.producoes
    .filter((r) => r.status === PROD_STATUS.ENTRADA_REALIZADA)
    .sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`))
    .slice(0, 8);

  const renderConfCard = (rec) => {
    const prod = getRecordProduct(rec, prodMap);
    const s = computeProductionSummary(rec);
    const resp = userMap.get(rec.usuarioId)?.nome || 'Operador';
    const inputDefault = s.conferida !== null ? s.conferida : s.aproveitavel;

    return `
      <div class="board-card" data-conf-card="${rec.id}" style="${rec.produtoNaoCadastrado ? 'border-color:#F59E0B;' : ''}">
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${prod?.foto || ''}" alt="${escapeHtml(prod?.nome || '')}" style="width:94px;height:94px;object-fit:contain;border-radius:12px;border:1px solid var(--border);background:var(--surface-alt);flex-shrink:0;" />
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.78rem;font-weight:800;color:var(--text-muted);">${SECTOR_LABELS[rec.setor]}</div>
            <h3 class="board-card-title">${escapeHtml(prod?.nome || 'Produto')}</h3>
            <div style="font-size:0.82rem;color:var(--text-muted);font-weight:700;">
              📅 ${formatDateBR(rec.data)} ${rec.hora} • ${escapeHtml(resp)}
            </div>
            <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
              ${renderStatusPill(s.statusTone, s.statusBadge)}
              ${rec.tipoDestino === 'PEDIDO' ? renderStatusPill('blue', `📋 Pedido #${escapeHtml(rec.numeroPedido || '')}`) : renderStatusPill('gray', '📦 Estoque')}
            </div>
          </div>
        </div>

        ${rec.produtoNaoCadastrado ? `
          <div style="background:var(--amber-bg);border:1.5px solid #FCD34D;border-radius:12px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <div style="color:var(--amber);font-weight:800;font-size:0.9rem;">
              ⚠️ PRODUTO NÃO CADASTRADO
            </div>
            ${canAct ? `
              <button type="button" class="btn btn-warning btn-sm btn-auto-register-prod" data-id="${rec.id}">
                ➕ CADASTRAR
              </button>
            ` : ''}
          </div>
        ` : ''}

        <div class="board-metrics">
          <div class="metric-item">
            <span class="metric-num">${formatNumber(s.produzida)}</span>
            <span class="metric-lbl">informada</span>
          </div>
          <div class="metric-item">
            <span class="metric-num" style="color:${s.quebrada > 0 ? 'var(--amber)' : 'inherit'};">${formatNumber(s.quebrada)}</span>
            <span class="metric-lbl">quebras</span>
          </div>
          <div class="metric-item">
            <span class="metric-num" style="color:var(--blue);">${formatNumber(s.aproveitavel)}</span>
            <span class="metric-lbl">aproveitáveis</span>
          </div>
        </div>

        ${s.temDivergencia ? `
          <div class="div-alert">
            🔴 DIVERGÊNCIA<br/>
            Produção: ${formatNumber(s.produzida)} | Quebras: ${formatNumber(s.quebrada)} | Esperado: ${formatNumber(s.aproveitavel)}<br/>
            Conferido: ${formatNumber(s.conferida)} | Diferença: ${s.diferenca > 0 ? '+' : ''}${formatNumber(s.diferenca)}
          </div>
        ` : ''}

        ${canAct && !s.entradaRealizada ? `
          ${rec.status === PROD_STATUS.PRODUZIDO ? `
            <div style="display:flex;gap:8px;align-items:flex-end;">
              <div class="field" style="flex:1;margin-bottom:0;">
                <label for="conf-qty-${rec.id}">Quantidade conferida</label>
                <input id="conf-qty-${rec.id}" type="number" min="0" step="any" inputmode="decimal" class="input input-qty" style="min-height:52px;font-size:1.4rem;" value="${inputDefault}" />
              </div>
              <button type="button" class="btn btn-primary btn-conferir" data-id="${rec.id}" style="min-height:52px;">
                CONFERIR
              </button>
            </div>
          ` : `
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn btn-success btn-block btn-lg btn-dar-entrada" data-id="${rec.id}">
                🟢 JÁ DEI ENTRADA (${formatNumber(s.quantidadeEfetivaEntrada)} ${escapeHtml(prod?.unidade || 'UN')})
              </button>
            </div>
          `}
          <div style="margin-top:8px;text-align:right;">
            <button type="button" class="btn btn-outline btn-sm btn-edit-conf" data-id="${rec.id}">
              ✏️ Corrigir Lote
            </button>
          </div>
        ` : ''}

        ${canAct && s.entradaRealizada ? `
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button type="button" class="btn btn-outline btn-sm btn-edit-conf" data-id="${rec.id}" style="flex:1;">
              ✏️ Corrigir
            </button>
            <button type="button" class="btn btn-soft-amber btn-sm btn-undo-entry-conf" data-id="${rec.id}" style="flex:1;">
              ↩️ Desfazer Entrada
            </button>
          </div>
        ` : ''}
      </div>
    `;
  };

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">📋 CONFERÊNCIA</h1>
            <div class="page-date">Conferir quantidades e confirmar entrada no sistema oficial</div>
          </div>
        </div>

        <div class="section-title">Aguardando Conferência (${pendingConf.length})</div>
        ${pendingConf.length === 0 ? `
          <div class="empty-state">Tudo conferido no momento!</div>
        ` : `
          <div class="grid-cards">${pendingConf.map(renderConfCard).join('')}</div>
        `}

        <div class="section-title" style="margin-top:22px;">Conferidos — Aguardando Entrada (${awaitingEntry.length})</div>
        ${awaitingEntry.length === 0 ? `
          <div class="empty-state">Nenhuma entrada pendente após conferência.</div>
        ` : `
          <div class="grid-cards">${awaitingEntry.map(renderConfCard).join('')}</div>
        `}

        ${completedToday.length > 0 ? `
          <div class="section-title" style="margin-top:22px;">Últimas Entradas Realizadas</div>
          <div class="grid-cards">${completedToday.map(renderConfCard).join('')}</div>
        ` : ''}
      </div>
    `,
    mount: () => {
      document.querySelectorAll('.btn-conferir').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const inp = document.getElementById(`conf-qty-${id}`);
          const qty = Number(inp?.value);
          if (!Number.isFinite(qty) || qty < 0) {
            showToast('Informe uma quantidade conferida válida', 'warning');
            return;
          }
          const res = await onMutate('CONFIRM_CONFERENCE', {
            producaoId: id,
            quantidadeConferida: qty
          });
          if (res.ok) {
            const s = computeProductionSummary(res.record);
            if (s.temDivergencia) {
              showToast(`🔴 Divergência registrada (${s.diferenca > 0 ? '+' : ''}${s.diferenca})`, 'warning', 3500);
            } else {
              showToast('✅ Conferência salva! Pronto para entrada.');
            }
          } else {
            showToast(res.error || 'Erro na conferência', 'error');
          }
        });
      });

      document.querySelectorAll('.btn-dar-entrada').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const res = await onMutate('MARK_ENTRY', { producaoId: id });
          if (res.ok) {
            showToast('✅ Entrada registrada');
          } else {
            showToast(res.error || 'Erro ao registrar entrada', 'error');
          }
        });
      });

      document.querySelectorAll('.btn-auto-register-prod').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const res = await onMutate('REGISTER_TEMP_PRODUCT', { producaoId: id });
          if (res.ok) {
            showToast(`✅ Produto cadastrado: ${res.produto?.nome} (${res.produto?.codigo})`);
          } else {
            showToast(res.error || 'Erro ao cadastrar produto', 'error');
          }
        });
      });

      document.querySelectorAll('.btn-edit-conf').forEach((btn) => {
        btn.addEventListener('click', () => {
          const rec = db.producoes.find((r) => r.id === btn.dataset.id);
          if (rec) openCorrectionModal({ rec, db, user, onMutate });
        });
      });

      document.querySelectorAll('.btn-undo-entry-conf').forEach((btn) => {
        btn.addEventListener('click', () => {
          const rec = db.producoes.find((r) => r.id === btn.dataset.id);
          if (!rec) return;
          confirmDangerousAction({
            title: 'Desfazer Entrada',
            message: `Deseja realmente cancelar a entrada no estoque deste lote? O status voltará a ser conferido/pendente de entrada.`,
            confirmLabel: 'Sim, Desfazer Entrada',
            onConfirm: async () => {
              const res = await onMutate('UNDO_ENTRY', {
                producaoId: rec.id,
                motivo: 'Entrada desfeita pelo usuário (apertada sem querer)'
              });
              if (res.ok) showToast('↩️ Entrada desfeita com sucesso!');
              else showToast(res.error || 'Erro ao desfazer', 'error');
            }
          });
        });
      });
    }
  };
}

export function renderEntriesHistoryView({ db, user, onMutate }) {
  let period = '7dias';
  let customStart = '';
  let customEnd = '';
  let filterSector = 'ALL';
  let filterProd = 'ALL';
  let filterUser = 'ALL';
  let filterStatus = 'ENTRADA_REALIZADA';

  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));
  const userMap = new Map(db.usuarios.map((u) => [u.id, u]));

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">📦 HISTÓRICO DE ENTRADAS</h1>
            <div class="page-date">Entradas realizadas e pendências no sistema oficial</div>
          </div>
        </div>

        <div class="chip-row" id="ent-period-chips">
          <button type="button" class="chip" data-per="hoje">Hoje</button>
          <button type="button" class="chip" data-per="ontem">Ontem</button>
          <button type="button" class="chip active" data-per="7dias">7 dias</button>
          <button type="button" class="chip" data-per="mes">Este mês</button>
          <button type="button" class="chip" data-per="personalizado">Personalizado</button>
        </div>

        <div id="ent-custom-range" style="display:none;margin-bottom:12px;" class="card">
          <div class="grid-2">
            <div class="field" style="margin-bottom:0;"><label>De</label><input type="date" id="ent-start" class="input" /></div>
            <div class="field" style="margin-bottom:0;"><label>Até</label><input type="date" id="ent-end" class="input" /></div>
          </div>
        </div>

        <div class="card" style="margin-bottom:14px;">
          <div class="grid-2">
            <div class="field" style="margin-bottom:6px;">
              <label>Setor</label>
              <select id="ent-flt-sector" class="select">
                <option value="ALL">Todos os setores</option>
                <option value="${SECTORS.PRE_MOLDADOS}">🧱 Pré-Moldados</option>
                <option value="${SECTORS.MARCENARIA}">🪵 Marcenaria</option>
              </select>
            </div>
            <div class="field" style="margin-bottom:6px;">
              <label>Status</label>
              <select id="ent-flt-status" class="select">
                <option value="ENTRADA_REALIZADA">🟢 Entrada Realizada</option>
                <option value="PENDENTE">🟠 Aguardando Entrada</option>
                <option value="TODOS">Todos os Status</option>
              </select>
            </div>
            <div class="field" style="margin-bottom:0;">
              <label>Produto</label>
              <select id="ent-flt-prod" class="select">
                <option value="ALL">Todos os produtos</option>
                ${db.produtos.map((p) => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('')}
              </select>
            </div>
            <div class="field" style="margin-bottom:0;">
              <label>Responsável</label>
              <select id="ent-flt-user" class="select">
                <option value="ALL">Todos</option>
                ${db.usuarios.map((u) => `<option value="${u.id}">${escapeHtml(u.nome)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div id="ent-list" class="grid-cards"></div>
      </div>
    `,
    mount: () => {
      const listEl = document.getElementById('ent-list');
      const customBox = document.getElementById('ent-custom-range');

      function renderList() {
        let items = db.producoes.slice();
        items = filterByPeriod(items, period, customStart, customEnd);

        items = items.filter((r) => {
          if (filterSector !== 'ALL' && r.setor !== filterSector) return false;
          if (filterProd !== 'ALL' && r.produtoId !== filterProd) return false;
          const respId = r.entradaUsuarioId || r.usuarioId;
          if (filterUser !== 'ALL' && respId !== filterUser && r.usuarioId !== filterUser) return false;
          if (filterStatus === 'ENTRADA_REALIZADA' && r.status !== PROD_STATUS.ENTRADA_REALIZADA) return false;
          if (filterStatus === 'PENDENTE' && r.status === PROD_STATUS.ENTRADA_REALIZADA) return false;
          return true;
        }).sort((a, b) => `${b.entradaData || b.data} ${b.entradaHora || b.hora}`.localeCompare(`${a.entradaData || a.data} ${a.entradaHora || a.hora}`));

        if (items.length === 0) {
          listEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Nenhum registro encontrado com esses filtros.</div>`;
          return;
        }

        listEl.innerHTML = items.map((r) => {
          const prod = getRecordProduct(r, prodMap);
          const s = computeProductionSummary(r);
          const respId = r.entradaUsuarioId || r.conferidoPorId || r.usuarioId;
          const resp = userMap.get(respId)?.nome || 'Responsável';
          const dt = r.entradaData || r.data;
          const hr = r.entradaHora || r.hora;

          return `
            <div class="board-card">
              <div style="display:flex;gap:12px;align-items:center;">
                <img src="${prod?.foto || ''}" alt="" style="width:86px;height:86px;object-fit:contain;border-radius:10px;border:1px solid var(--border);background:var(--surface-alt);flex-shrink:0;" />
                <div style="flex:1;min-width:0;">
                  <div class="fw-800" style="font-size:1.05rem;">${escapeHtml(prod?.nome || 'Produto')}</div>
                  <div style="font-size:1.25rem;font-weight:800;color:var(--text);margin:2px 0;">
                    ${formatNumber(s.quantidadeEfetivaEntrada)} ${escapeHtml(prod?.unidade || 'UN')}
                  </div>
                  <div class="text-muted" style="font-size:0.82rem;font-weight:700;">
                    📅 ${formatDateBR(dt)} ${hr} • ${escapeHtml(resp)}
                  </div>
                  <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                    ${renderStatusPill(s.statusTone, s.statusBadge)}
                    ${r.tipoDestino === 'PEDIDO' ? renderStatusPill('blue', `📋 Pedido #${escapeHtml(r.numeroPedido || '')}`) : renderStatusPill('gray', '📦 Estoque')}
                  </div>
                </div>
              </div>
              ${(canCorrectProduction(user, r) || (canUndoEntry(user) && r.status === PROD_STATUS.ENTRADA_REALIZADA)) ? `
                <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border);display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                  ${canCorrectProduction(user, r) ? `<button type="button" class="btn btn-secondary btn-sm btn-edit-ent" data-id="${r.id}">✏️ Corrigir</button>` : ''}
                  ${(canUndoEntry(user) && r.status === PROD_STATUS.ENTRADA_REALIZADA) ? `<button type="button" class="btn btn-warning btn-sm btn-undo-ent" data-id="${r.id}">↩️ Desfazer Entrada</button>` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

        listEl.querySelectorAll('.btn-edit-ent').forEach((btn) => {
          btn.addEventListener('click', () => {
            const rec = db.producoes.find((r) => r.id === btn.dataset.id);
            if (rec) openCorrectionModal({ rec, db, user, onMutate });
          });
        });

        listEl.querySelectorAll('.btn-undo-ent').forEach((btn) => {
          btn.addEventListener('click', () => {
            const rec = db.producoes.find((r) => r.id === btn.dataset.id);
            if (!rec) return;
            confirmDangerousAction({
              title: 'Desfazer Entrada no Estoque',
              message: `Deseja realmente desfazer a entrada deste lote no estoque? O lote voltará a ficar aguardando conferência/entrada.`,
              confirmLabel: 'Sim, Desfazer Entrada',
              onConfirm: async () => {
                const res = await onMutate('UNDO_ENTRY', {
                  producaoId: rec.id,
                  motivo: 'Entrada desfeita pelo usuário (apertada sem querer)'
                });
                if (res.ok) {
                  showToast('↩️ Entrada desfeita com sucesso!');
                  renderList();
                } else {
                  showToast(res.error || 'Erro ao desfazer', 'error');
                }
              }
            });
          });
        });
      }

      document.querySelectorAll('#ent-period-chips .chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#ent-period-chips .chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          period = btn.dataset.per;
          customBox.style.display = period === 'personalizado' ? 'block' : 'none';
          renderList();
        });
      });

      document.getElementById('ent-start')?.addEventListener('change', (e) => { customStart = e.target.value; renderList(); });
      document.getElementById('ent-end')?.addEventListener('change', (e) => { customEnd = e.target.value; renderList(); });
      document.getElementById('ent-flt-sector')?.addEventListener('change', (e) => { filterSector = e.target.value; renderList(); });
      document.getElementById('ent-flt-status')?.addEventListener('change', (e) => { filterStatus = e.target.value; renderList(); });
      document.getElementById('ent-flt-prod')?.addEventListener('change', (e) => { filterProd = e.target.value; renderList(); });
      document.getElementById('ent-flt-user')?.addEventListener('change', (e) => { filterUser = e.target.value; renderList(); });

      renderList();
    }
  };
}
