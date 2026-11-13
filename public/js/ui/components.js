import { escapeHtml, formatDateBR, formatNumber } from '../utils.js';
import { ROLES, PROD_STATUS, canAccessModule, canUndoEntry, getRecordProduct } from '../logic.js';
import { SYNC_STATUS } from '../sync.js';

export function showToast(message, tone = 'success', duration = 2600) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast toast-${tone}`;
  el.textContent = message;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s ease';
    setTimeout(() => el.remove(), 220);
  }, duration);
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

export function openModal({ title, bodyHtml, onMount }) {
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${escapeHtml(title)}</h3>
          <button type="button" class="btn btn-outline btn-sm" id="modal-close-btn">✕</button>
        </div>
        <div id="modal-body">${bodyHtml}</div>
      </div>
    </div>
  `;

  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });

  if (onMount) {
    onMount(document.getElementById('modal-body'));
  }
}

export function confirmDangerousAction({ title, message, confirmLabel = 'Confirmar Exclusão', onConfirm }) {
  openModal({
    title,
    bodyHtml: `
      <p style="margin-top:0;font-weight:600;color:var(--text-muted);">${escapeHtml(message)}</p>
      <div class="grid-2" style="margin-top:16px;">
        <button type="button" class="btn btn-outline" id="confirm-cancel-btn">Cancelar</button>
        <button type="button" class="btn btn-danger" id="confirm-ok-btn">${escapeHtml(confirmLabel)}</button>
      </div>
    `,
    onMount: () => {
      document.getElementById('confirm-cancel-btn')?.addEventListener('click', closeModal);
      document.getElementById('confirm-ok-btn')?.addEventListener('click', async () => {
        closeModal();
        await onConfirm();
      });
    }
  });
}

export function renderStatusPill(tone, text) {
  return `<span class="status-pill status-${escapeHtml(tone)}">${escapeHtml(text)}</span>`;
}

export function renderSyncBadge(syncInfo) {
  const st = syncInfo?.status || SYNC_STATUS.SYNCED;
  const count = syncInfo?.pendingCount || 0;
  if (st === SYNC_STATUS.OFFLINE) {
    const extra = count > 0 ? ` (${count})` : '';
    return `<span class="sync-pill offline">📡 OFFLINE${extra}</span>`;
  }
  if (st === SYNC_STATUS.SYNCING) {
    return `<span class="sync-pill syncing">🔄 SINCRONIZANDO...</span>`;
  }
  return `<span class="sync-pill synced">🟢 SINCRONIZADO</span>`;
}

export function renderTopBar({ user, syncInfo, unreadCount, onOpenNotifications, onLogout, onGoHome }) {
  return `
    <header class="topbar">
      <div class="topbar-left" id="topbar-brand" style="cursor:pointer;">
        <img src="/icons/icon.svg" alt="Logo" style="width:36px;height:36px;border-radius:8px;flex-shrink:0;" />
        <div style="min-width:0;">
          <div class="topbar-title">CONTROLE DE PRODUÇÃO</div>
          <div class="topbar-sub">${escapeHtml(user.nome)}</div>
        </div>
      </div>
      <div class="topbar-actions">
        ${renderSyncBadge(syncInfo)}
        <button type="button" class="icon-btn" id="btn-notifs" title="Notificações">
          🔔
          ${unreadCount > 0 ? `<span class="notif-dot">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
        </button>
        <button type="button" class="icon-btn" id="btn-logout" title="Sair">🚪</button>
      </div>
    </header>
  `;
}

export function getBottomNavItems(user) {
  if (!user) return [];
  const items = [];

  if (user.perfil === ROLES.PATRAO) {
    items.push({ route: 'painel', icon: '👔', label: 'PAINEL' });
    items.push({ route: 'premoldados', icon: '🧱', label: 'PRÉ-MOLD.' });
    items.push({ route: 'marcenaria', icon: '🪵', label: 'MARCENARIA' });
    items.push({ route: 'pesquisar', icon: '🔎', label: 'PESQUISAR' });
    items.push({ route: 'inicio', icon: '☰', label: 'MENU' });
    return items;
  }

  if (user.perfil === ROLES.CONFERENCIA) {
    items.push({ route: 'conferencia', icon: '📋', label: 'CONFERIR' });
    items.push({ route: 'entradas', icon: '📦', label: 'ENTRADAS' });
    items.push({ route: 'quebras', icon: '⚠️', label: 'QUEBRAS' });
    items.push({ route: 'pesquisar', icon: '🔎', label: 'PESQUISAR' });
    items.push({ route: 'inicio', icon: '☰', label: 'MENU' });
    return items;
  }

  if (user.perfil === ROLES.PRODUCAO) {
    items.push({ route: 'inicio', icon: '🏠', label: 'INÍCIO' });
    if (canAccessModule(user, 'premoldados')) {
      items.push({ route: 'premoldados', icon: '🧱', label: 'PRÉ-MOLD.' });
    }
    if (canAccessModule(user, 'marcenaria')) {
      items.push({ route: 'marcenaria', icon: '🪵', label: 'MARCENARIA' });
    }
    items.push({ route: 'producao-rapida', icon: '⚡', label: 'RÁPIDA' });
    items.push({ route: 'pesquisar', icon: '🔎', label: 'PESQUISAR' });
    return items;
  }

  // ADMIN
  items.push({ route: 'inicio', icon: '🏠', label: 'INÍCIO' });
  items.push({ route: 'producao', icon: '🏭', label: 'PRODUÇÃO' });
  items.push({ route: 'conferencia', icon: '📋', label: 'CONFERÊNCIA' });
  items.push({ route: 'pesquisar', icon: '🔎', label: 'PESQUISAR' });
  items.push({ route: 'configuracoes', icon: '☰', label: 'MENU' });
  return items;
}

export function renderBottomNav(user, currentRoute) {
  const items = getBottomNavItems(user);
  return `
    <nav class="bottom-nav" aria-label="Navegação principal">
      ${items.map((item) => `
        <button type="button" class="bottom-nav-btn ${currentRoute === item.route ? 'active' : ''}" data-nav-route="${item.route}">
          <span class="nav-ico">${item.icon}</span>
          <span>${item.label}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

export function compressImageFile(file, maxDim = 640) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

export function openCorrectionModal({ rec, db, user, onMutate, onDone }) {
  const prodMap = new Map((db.produtos || []).map((p) => [p.id, p]));
  const prod = getRecordProduct(rec, prodMap);
  const userMap = new Map((db.usuarios || []).map((u) => [u.id, u]));
  const resp = userMap.get(rec.usuarioId)?.nome || 'Operador';
  const isEntradaRealizada = rec.status === PROD_STATUS.ENTRADA_REALIZADA;
  const userCanUndo = canUndoEntry(user);
  let selectedDest = rec.tipoDestino || 'ESTOQUE';

  openModal({
    title: `✏️ Corrigir Lote: ${prod?.nome || 'Produto'}`,
    bodyHtml: `
      <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:14px;">
        <div class="row-between">
          <span class="fw-800" style="font-size:1.05rem;">${escapeHtml(prod?.nome || '')}</span>
          <span style="font-size:0.8rem;font-weight:700;color:var(--text-muted);">${formatDateBR(rec.data)} ${rec.hora}</span>
        </div>
        <div style="font-size:0.82rem;color:var(--text-muted);font-weight:700;margin-top:2px;">
          Lançado por: ${escapeHtml(resp)} • Status: <strong>${rec.status}</strong>
        </div>
      </div>

      <form id="shared-corr-form">
        <div class="field">
          <label for="sc-qtd">Quantidade Produzida (${escapeHtml(prod?.unidade || 'UN')})</label>
          <input id="sc-qtd" type="number" min="1" step="any" inputmode="decimal" class="input input-qty" required value="${rec.quantidade}" style="min-height:50px;font-size:1.35rem;" />
        </div>

        <div class="field">
          <label>Destino da Produção</label>
          <div class="segmented-control" id="sc-destino-seg">
            <button type="button" class="segmented-btn ${selectedDest === 'ESTOQUE' ? 'active' : ''}" data-dest="ESTOQUE">📦 Para Estoque</button>
            <button type="button" class="segmented-btn ${selectedDest === 'PEDIDO' ? 'active' : ''}" data-dest="PEDIDO">📋 Para Pedido</button>
          </div>
        </div>

        <div class="field" id="sc-box-pedido" style="${selectedDest === 'PEDIDO' ? '' : 'display:none;'}">
          <label for="sc-numpedido">Número do Pedido</label>
          <input id="sc-numpedido" class="input" type="text" value="${escapeHtml(rec.numeroPedido || '')}" placeholder="Ex: 1045" style="font-weight:700;" />
        </div>

        <div class="field">
          <label for="sc-motivo">Motivo do Ajuste / Correção</label>
          <input id="sc-motivo" class="input" type="text" required placeholder="Ex: Digitação errada de quantidade / pedido" />
        </div>

        <button type="submit" class="btn btn-success btn-block btn-lg" style="margin-top:14px;">
          💾 SALVAR CORREÇÃO
        </button>
      </form>

      ${isEntradaRealizada && userCanUndo ? `
        <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px;">
          <button type="button" class="btn btn-soft-amber btn-block" id="sc-btn-undo-entry">
            ↩️ Desfazer Entrada no Estoque (Estorno)
          </button>
          <div style="font-size:0.78rem;color:var(--text-muted);font-weight:600;margin-top:4px;text-align:center;">
            Se o botão de entrada foi apertado por engano, toque acima para cancelar a entrada.
          </div>
        </div>
      ` : ''}

      ${!isEntradaRealizada ? `
        <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px;">
          <button type="button" class="btn btn-outline btn-sm btn-block text-danger" id="sc-btn-delete-prod" style="border-color:#FCA5A5;color:var(--red);">
            🗑️ Excluir este lote lançado por engano
          </button>
        </div>
      ` : ''}
    `,
    onMount: () => {
      const destBox = document.getElementById('sc-box-pedido');
      const numPedInp = document.getElementById('sc-numpedido');

      document.querySelectorAll('#sc-destino-seg .segmented-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#sc-destino-seg .segmented-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          selectedDest = btn.dataset.dest;
          if (selectedDest === 'PEDIDO') {
            destBox.style.display = 'block';
            numPedInp?.focus();
          } else {
            destBox.style.display = 'none';
          }
        });
      });

      document.getElementById('shared-corr-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novaQtd = Number(document.getElementById('sc-qtd').value);
        if (!novaQtd || novaQtd <= 0) {
          showToast('Informe uma quantidade válida', 'warning');
          return;
        }

        let numPedido = null;
        if (selectedDest === 'PEDIDO') {
          numPedido = numPedInp?.value.trim();
          if (!numPedido) {
            showToast('Informe o número do pedido', 'warning');
            numPedInp?.focus();
            return;
          }
        }

        const motivo = document.getElementById('sc-motivo').value.trim();
        const res = await onMutate('CORRECT_PRODUCTION', {
          producaoId: rec.id,
          quantidade: novaQtd,
          quantidadeQuebrada: rec.quantidadeQuebrada || 0,
          tipoDestino: selectedDest,
          numeroPedido: numPedido,
          motivo: motivo || 'Correção de produção'
        });

        if (res.ok) {
          closeModal();
          showToast('✅ Produção corrigida com sucesso!');
          if (onDone) onDone();
        } else {
          showToast(res.error || 'Erro ao corrigir', 'error');
        }
      });

      document.getElementById('sc-btn-undo-entry')?.addEventListener('click', () => {
        confirmDangerousAction({
          title: 'Desfazer Entrada no Estoque',
          message: `Deseja realmente cancelar a entrada no estoque do lote "${prod?.nome || 'Produto'}"? O lote voltará a ficar pendente de entrada.`,
          confirmLabel: 'Sim, Desfazer Entrada',
          onConfirm: async () => {
            const res = await onMutate('UNDO_ENTRY', {
              producaoId: rec.id,
              motivo: 'Entrada desfeita pelo usuário (apertada sem querer)'
            });
            if (res.ok) {
              closeModal();
              showToast('↩️ Entrada desfeita com sucesso!');
              if (onDone) onDone();
            } else {
              showToast(res.error || 'Erro ao desfazer entrada', 'error');
            }
          }
        });
      });

      document.getElementById('sc-btn-delete-prod')?.addEventListener('click', () => {
        confirmDangerousAction({
          title: 'Excluir Produção',
          message: `Deseja excluir definitivamente este lote de "${prod?.nome || 'Produto'}" lançado por engano?`,
          confirmLabel: 'Excluir Definitivamente',
          onConfirm: async () => {
            const res = await onMutate('DELETE_PRODUCTION', {
              producaoId: rec.id,
              motivo: 'Lançado por engano'
            });
            if (res.ok) {
              closeModal();
              showToast('✅ Lote excluído');
              if (onDone) onDone();
            } else {
              showToast(res.error || 'Erro ao excluir lote', 'error');
            }
          }
        });
      });
    }
  });
}
