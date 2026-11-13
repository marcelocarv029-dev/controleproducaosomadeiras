import { loadLocalState, saveLocalState, getSavedSessionUserId, setSavedSessionUserId, mutateAndQueue } from './db.js';
import { createSyncManager } from './sync.js';
import { SECTORS, canAccessModule, getDefaultRouteForUser } from './logic.js';
import { escapeHtml } from './utils.js';
import { renderTopBar, renderBottomNav, showToast, openModal, closeModal } from './ui/components.js';
import { renderLoginView, renderHomeView } from './ui/views-auth.js';
import {
  renderSectorProductionView,
  renderTodayProductionHubView,
  renderRegisterProductionView,
  renderFastProductionView,
  renderRegisterBreakageView,
  renderBreakageHistoryView
} from './ui/views-production.js';
import { renderConferenceView, renderEntriesHistoryView } from './ui/views-conference.js';
import { renderBossDashboardView } from './ui/views-boss.js';
import { renderSearchView, renderHistoryView, renderReportsView } from './ui/views-search.js';
import {
  renderProductsView,
  renderUsersView,
  renderCorrectionAndAuditView,
  renderSettingsView
} from './ui/views-admin.js';

let db = null;
let currentUser = null;
let currentRoute = 'login';
let routeParams = {};
let loginError = '';
let syncInfo = { status: 'SYNCED', pendingCount: 0 };
let syncManager = null;

function navigate(route, params = {}) {
  if (!currentUser) {
    currentRoute = 'login';
    render();
    return;
  }

  // Sub-routes map to parent permission checks
  const permKey = route === 'registrar-producao' ? 'producao' : route === 'registrar-quebra' ? 'quebras' : route;
  if (!canAccessModule(currentUser, permKey)) {
    showToast('Acesso não permitido para este perfil', 'warning');
    currentRoute = getDefaultRouteForUser(currentUser);
    routeParams = {};
  } else {
    currentRoute = route;
    routeParams = params || {};
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
  render();
}

async function handleMutate(type, payload) {
  const res = await mutateAndQueue(db, type, payload, currentUser);
  if (res.ok) {
    await syncManager.refreshPendingCount();
    // Trigger background sync without blocking UI
    syncManager.syncNow();
    render();
  }
  return res;
}

async function handleRestoreBackup(restoredState) {
  db = restoredState;
  await saveLocalState(db);
  try {
    await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: db })
    });
  } catch {
    // Offline/static fallback keeps local restored copy
  }
  // Re-validate current user session
  const found = db.usuarios.find((u) => u.id === currentUser?.id && u.ativo !== false);
  if (!found) {
    currentUser = null;
    setSavedSessionUserId(null);
    currentRoute = 'login';
  }
  render();
}

function openNotificationsDrawer() {
  const notifs = (db.notificacoes || []).slice(0, 25);
  openModal({
    title: '🔔 Notificações',
    bodyHtml: `
      ${notifs.length === 0 ? `
        <div class="empty-state">Nenhuma notificação recente.</div>
      ` : `
        <div style="margin-bottom:10px;text-align:right;">
          <button type="button" class="btn btn-outline btn-sm" id="btn-mark-notifs-read">Marcar todas como lidas</button>
        </div>
        <div class="stack">
          ${notifs.map((n) => `
            <div class="card" style="padding:12px;${!n.lida ? 'border-color:var(--blue);background:#F8FAFF;' : ''}">
              <div class="fw-800" style="font-size:0.95rem;">${escapeHtml(n.titulo)}</div>
              <div style="font-size:0.86rem;color:var(--text-muted);font-weight:600;margin-top:2px;">${escapeHtml(n.mensagem)}</div>
            </div>
          `).join('')}
        </div>
      `}
    `,
    onMount: () => {
      document.getElementById('btn-mark-notifs-read')?.addEventListener('click', async () => {
        await handleMutate('MARK_NOTIFICATIONS_READ', {});
        closeModal();
      });
    }
  });
}

function handleLogin(username, password, remember = true) {
  const match = db.usuarios.find(
    (u) => u.usuario.toLowerCase() === username.toLowerCase() && u.senha === password
  );
  if (!match) {
    loginError = 'Usuário ou senha incorretos.';
    render();
    return;
  }
  if (match.ativo === false) {
    loginError = 'Este usuário está inativo. Fale com o Administrador.';
    render();
    return;
  }
  loginError = '';
  currentUser = match;
  setSavedSessionUserId(match.id, remember);
  currentRoute = getDefaultRouteForUser(match);
  routeParams = {};
  render();
}

function handleLogout() {
  currentUser = null;
  setSavedSessionUserId(null);
  currentRoute = 'login';
  routeParams = {};
  render();
}

function render() {
  const app = document.getElementById('app');
  if (!app || !db) return;

  if (!currentUser || currentRoute === 'login') {
    const view = renderLoginView({ onLogin: handleLogin, errorMsg: loginError });
    app.innerHTML = view.html;
    view.mount();
    return;
  }

  // Keep currentUser synced with DB updates
  const freshUser = db.usuarios.find((u) => u.id === currentUser.id);
  if (freshUser) currentUser = freshUser;

  const unreadCount = (db.notificacoes || []).filter((n) => !n.lida).length;
  const ctx = {
    db,
    user: currentUser,
    params: routeParams,
    navigate,
    onMutate: handleMutate,
    onStartVoiceSearch: () => navigate('pesquisar', { autoVoice: true }),
    onSyncNow: () => syncManager.syncNow(),
    onRestoreBackup: handleRestoreBackup
  };

  let view;
  switch (currentRoute) {
    case 'inicio':
      view = renderHomeView(ctx);
      break;
    case 'premoldados':
      view = renderSectorProductionView({ ...ctx, sector: SECTORS.PRE_MOLDADOS });
      break;
    case 'marcenaria':
      view = renderSectorProductionView({ ...ctx, sector: SECTORS.MARCENARIA });
      break;
    case 'producao':
      view = renderTodayProductionHubView(ctx);
      break;
    case 'registrar-producao':
      view = renderRegisterProductionView(ctx);
      break;
    case 'producao-rapida':
      view = renderFastProductionView(ctx);
      break;
    case 'registrar-quebra':
      view = renderRegisterBreakageView(ctx);
      break;
    case 'quebras':
      view = renderBreakageHistoryView(ctx);
      break;
    case 'conferencia':
      view = renderConferenceView(ctx);
      break;
    case 'entradas':
      view = renderEntriesHistoryView(ctx);
      break;
    case 'painel':
      view = renderBossDashboardView(ctx);
      break;
    case 'pesquisar':
      view = renderSearchView(ctx);
      break;
    case 'historico':
      view = renderHistoryView(ctx);
      break;
    case 'relatorios':
      view = renderReportsView(ctx);
      break;
    case 'produtos':
      view = renderProductsView(ctx);
      break;
    case 'usuarios':
      view = renderUsersView(ctx);
      break;
    case 'corrigir':
      view = renderCorrectionAndAuditView(ctx);
      break;
    case 'configuracoes':
      view = renderSettingsView(ctx);
      break;
    default:
      view = renderHomeView(ctx);
  }

  app.innerHTML = `
    ${renderTopBar({ user: currentUser, syncInfo, unreadCount })}
    ${view.html}
    ${renderBottomNav(currentUser, currentRoute)}
  `;

  document.getElementById('topbar-brand')?.addEventListener('click', () => {
    navigate(getDefaultRouteForUser(currentUser));
  });
  document.getElementById('btn-notifs')?.addEventListener('click', openNotificationsDrawer);
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

  document.querySelectorAll('[data-nav-route]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.navRoute));
  });

  if (view.mount) view.mount();
}

async function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  db = await loadLocalState();
  const savedId = getSavedSessionUserId();
  if (savedId) {
    const found = db.usuarios.find((u) => u.id === savedId && u.ativo !== false);
    if (found) {
      currentUser = found;
      currentRoute = getDefaultRouteForUser(found);
    }
  }

  syncManager = createSyncManager({
    getState: () => db,
    setState: (nextState) => {
      db = nextState;
      render();
    },
    onStatusChange: (nextInfo) => {
      syncInfo = nextInfo;
      // Update topbar sync pill cleanly without full re-render if possible
      const pill = document.querySelector('.sync-pill');
      if (pill) {
        if (nextInfo.status === 'OFFLINE') {
          pill.className = 'sync-pill offline';
          pill.textContent = `📡 OFFLINE${nextInfo.pendingCount > 0 ? ` (${nextInfo.pendingCount})` : ''}`;
        } else if (nextInfo.status === 'SYNCING') {
          pill.className = 'sync-pill syncing';
          pill.textContent = '🔄 SINCRONIZANDO...';
        } else {
          pill.className = 'sync-pill synced';
          pill.textContent = '🟢 SINCRONIZADO';
        }
      }
    }
  });

  render();
  syncManager.start();
}

init();
