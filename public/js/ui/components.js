import { escapeHtml } from '../utils.js';
import { ROLES, canAccessModule } from '../logic.js';
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
