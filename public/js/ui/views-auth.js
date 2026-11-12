import { escapeHtml, getLocalDateStr, formatDateBR } from '../utils.js';
import { ROLES, ROLE_LABELS, canAccessModule } from '../logic.js';

export function renderLoginView({ onLogin, errorMsg = '' }) {
  return {
    html: `
      <div class="login-wrap">
        <div class="login-card">
          <div class="login-brand">
            <div class="login-logo-box">
              <img src="/icons/icon.svg" alt="Controle de Produção" style="width:100%;height:100%;" />
            </div>
            <h1 class="login-title">CONTROLE DE PRODUÇÃO</h1>
            <p class="login-sub">Pré-Moldados &amp; Marcenaria</p>
          </div>

          <form id="login-form" autocomplete="on">
            <div class="field">
              <label for="login-user">Usuário</label>
              <input id="login-user" class="input" type="text" placeholder="Digite seu usuário" required autocomplete="username" />
            </div>
            <div class="field">
              <label for="login-pass">Senha</label>
              <input id="login-pass" class="input" type="password" placeholder="Digite sua senha" required autocomplete="current-password" />
            </div>
            ${errorMsg ? `<div class="div-alert" style="margin-bottom:12px;">${escapeHtml(errorMsg)}</div>` : ''}
            <button type="submit" class="btn btn-dark btn-block btn-lg">ENTRAR</button>
          </form>

          <details style="margin-top:18px;border-top:1px solid var(--border);padding-top:12px;">
            <summary style="cursor:pointer;font-size:0.85rem;font-weight:700;color:var(--text-muted);">
              Acessos iniciais (clique para testar perfis)
            </summary>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">
              <button type="button" class="btn btn-outline btn-sm quick-fill-btn" data-u="patrao" data-p="123">👔 Patrão</button>
              <button type="button" class="btn btn-outline btn-sm quick-fill-btn" data-u="premoldados" data-p="123">🧱 Pré-Moldados</button>
              <button type="button" class="btn btn-outline btn-sm quick-fill-btn" data-u="marcenaria" data-p="123">🪵 Marcenaria</button>
              <button type="button" class="btn btn-outline btn-sm quick-fill-btn" data-u="conferencia" data-p="123">📋 Conferência</button>
              <button type="button" class="btn btn-outline btn-sm quick-fill-btn" data-u="admin" data-p="123">⚙️ Admin</button>
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:8px;">
              Senha padrão inicial: <strong>123</strong> (alterável pelo Administrador)
            </div>
          </details>
        </div>
      </div>
    `,
    mount: () => {
      const form = document.getElementById('login-form');
      const userInp = document.getElementById('login-user');
      const passInp = document.getElementById('login-pass');

      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        onLogin(userInp.value.trim(), passInp.value);
      });

      document.querySelectorAll('.quick-fill-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          onLogin(btn.dataset.u, btn.dataset.p);
        });
      });
    }
  };
}

export function renderHomeView({ user, navigate, onStartVoiceSearch }) {
  const hoje = formatDateBR(getLocalDateStr());
  const tiles = [];

  if (user.perfil === ROLES.ADMIN) {
    tiles.push({ route: 'premoldados', icon: '🧱', label: 'PRÉ-MOLDADOS', cls: '' });
    tiles.push({ route: 'marcenaria', icon: '🪵', label: 'MARCENARIA', cls: '' });
    tiles.push({ route: 'conferencia', icon: '📋', label: 'CONFERÊNCIA', cls: 'accent-blue' });
    tiles.push({ route: 'painel', icon: '👔', label: 'PAINEL', cls: 'accent-green' });
    tiles.push({ route: 'entradas', icon: '📦', label: 'ENTRADAS', cls: '' });
    tiles.push({ route: 'relatorios', icon: '📊', label: 'RELATÓRIOS', cls: '' });
    tiles.push({ route: 'produtos', icon: '🏷️', label: 'PRODUTOS', cls: '' });
    tiles.push({ route: 'configuracoes', icon: '⚙️', label: 'CONFIGURAÇÕES', cls: '' });
  } else if (user.perfil === ROLES.PRODUCAO) {
    if (canAccessModule(user, 'premoldados')) {
      tiles.push({ route: 'premoldados', icon: '🧱', label: 'PRÉ-MOLDADOS', cls: 'accent-blue' });
    }
    if (canAccessModule(user, 'marcenaria')) {
      tiles.push({ route: 'marcenaria', icon: '🪵', label: 'MARCENARIA', cls: 'accent-orange' });
    }
    tiles.push({ route: 'producao-rapida', icon: '⚡', label: 'PRODUÇÃO RÁPIDA', cls: 'accent-green' });
    tiles.push({ action: 'voice-search', icon: '🎙️', label: 'PESQUISAR POR VOZ', cls: '' });
    tiles.push({ route: 'quebras', icon: '⚠️', label: 'QUEBRAS', cls: '' });
    tiles.push({ route: 'historico', icon: '📋', label: 'HISTÓRICO', cls: '' });
  } else if (user.perfil === ROLES.CONFERENCIA) {
    tiles.push({ route: 'conferencia', icon: '📋', label: 'CONFERÊNCIA', cls: 'accent-blue' });
    tiles.push({ route: 'entradas', icon: '📦', label: 'ENTRADAS', cls: 'accent-green' });
    tiles.push({ route: 'quebras', icon: '⚠️', label: 'QUEBRAS', cls: 'accent-orange' });
    tiles.push({ route: 'pesquisar', icon: '🔎', label: 'PESQUISAR', cls: '' });
    tiles.push({ route: 'historico', icon: '📑', label: 'HISTÓRICO', cls: '' });
  } else if (user.perfil === ROLES.PATRAO) {
    tiles.push({ route: 'painel', icon: '👔', label: 'PAINEL DO PATRÃO', cls: 'accent-green' });
    tiles.push({ route: 'premoldados', icon: '🧱', label: 'PRÉ-MOLDADOS', cls: '' });
    tiles.push({ route: 'marcenaria', icon: '🪵', label: 'MARCENARIA', cls: '' });
    tiles.push({ route: 'entradas', icon: '📦', label: 'ENTRADAS', cls: '' });
    tiles.push({ route: 'quebras', icon: '⚠️', label: 'QUEBRAS', cls: '' });
    tiles.push({ route: 'relatorios', icon: '📊', label: 'RELATÓRIOS', cls: '' });
    tiles.push({ route: 'pesquisar', icon: '🔎', label: 'PESQUISAR', cls: '' });
  }

  return {
    html: `
      <div class="main-content main-narrow">
        <div class="page-header">
          <div>
            <h1 class="page-title">Olá, ${escapeHtml(user.nome.split(' ')[0])}</h1>
            <div class="page-date">${escapeHtml(ROLE_LABELS[user.perfil] || user.perfil)} • ${hoje}</div>
          </div>
        </div>

        <div class="module-grid">
          ${tiles.map((t) => `
            <button type="button" class="module-tile ${t.cls || ''}"
              ${t.route ? `data-go="${t.route}"` : ''}
              ${t.action ? `data-action="${t.action}"` : ''}>
              <span class="tile-ico">${t.icon}</span>
              <span>${escapeHtml(t.label)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `,
    mount: () => {
      document.querySelectorAll('[data-go]').forEach((btn) => {
        btn.addEventListener('click', () => navigate(btn.dataset.go));
      });
      document.querySelector('[data-action="voice-search"]')?.addEventListener('click', () => {
        if (onStartVoiceSearch) onStartVoiceSearch();
      });
    }
  };
}
