import { escapeHtml, formatDateBR, getLocalDateStr } from '../utils.js';
import {
  SECTORS,
  SECTOR_LABELS,
  ROLES,
  ROLE_LABELS,
  UNITS,
  computeProductionSummary,
  getRecordProduct
} from '../logic.js';
import {
  showToast,
  openModal,
  closeModal,
  confirmDangerousAction,
  compressImageFile,
  renderStatusPill
} from './components.js';
import { PRODUCT_PHOTOS } from '../seed.js';

export function renderProductsView({ db, onMutate }) {
  let sectorFilter = 'ALL';

  const openProductForm = (existing = null) => {
    let fotoData = existing?.foto || PRODUCT_PHOTOS.canaleta14;

    openModal({
      title: existing ? '✏️ Editar Produto' : '+ Novo Produto',
      bodyHtml: `
        <form id="prod-form">
          <div style="text-align:center;margin-bottom:12px;">
            <img id="pf-preview" src="${fotoData}" alt="Foto" style="width:160px;height:120px;object-fit:contain;margin:0 auto 8px;border-radius:12px;border:1px solid var(--border);background:var(--surface-alt);" />
            <label class="btn btn-outline btn-sm" style="display:inline-flex;cursor:pointer;">
              📷 Escolher / Tirar Foto
              <input id="pf-file" type="file" accept="image/*" capture="environment" style="display:none;" />
            </label>
          </div>

          <div class="field">
            <label for="pf-nome">Nome do Produto</label>
            <input id="pf-nome" class="input" type="text" required value="${escapeHtml(existing?.nome || '')}" placeholder="Ex: Canaleta 14" />
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="pf-setor">Setor</label>
              <select id="pf-setor" class="select">
                <option value="${SECTORS.PRE_MOLDADOS}" ${existing?.setor === SECTORS.PRE_MOLDADOS ? 'selected' : ''}>🧱 Pré-Moldados</option>
                <option value="${SECTORS.MARCENARIA}" ${existing?.setor === SECTORS.MARCENARIA ? 'selected' : ''}>🪵 Marcenaria</option>
              </select>
            </div>
            <div class="field">
              <label for="pf-unidade">Unidade</label>
              <select id="pf-unidade" class="select">
                ${UNITS.map((u) => `<option value="${u}" ${existing?.unidade === u ? 'selected' : ''}>${u}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="pf-codigo">Código</label>
              <input id="pf-codigo" class="input" type="text" value="${escapeHtml(existing?.codigo || '')}" placeholder="Ex: PM001" />
            </div>
            <div class="field">
              <label for="pf-ativo">Situação</label>
              <select id="pf-ativo" class="select">
                <option value="true" ${existing?.ativo !== false ? 'selected' : ''}>Ativo</option>
                <option value="false" ${existing?.ativo === false ? 'selected' : ''}>Inativo</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label for="pf-desc">Descrição</label>
            <textarea id="pf-desc" class="textarea" placeholder="Detalhes opcionais">${escapeHtml(existing?.descricao || '')}</textarea>
          </div>

          <button type="submit" class="btn btn-success btn-block btn-lg">SALVAR PRODUTO</button>
        </form>
      `,
      onMount: () => {
        const fileInp = document.getElementById('pf-file');
        const prevImg = document.getElementById('pf-preview');

        fileInp?.addEventListener('change', async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            fotoData = await compressImageFile(f, 640);
            prevImg.src = fotoData;
          } catch {
            showToast('Não foi possível processar a imagem', 'error');
          }
        });

        document.getElementById('prod-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const payload = {
            id: existing?.id,
            nome: document.getElementById('pf-nome').value.trim(),
            setor: document.getElementById('pf-setor').value,
            unidade: document.getElementById('pf-unidade').value,
            codigo: document.getElementById('pf-codigo').value.trim(),
            descricao: document.getElementById('pf-desc').value.trim(),
            ativo: document.getElementById('pf-ativo').value === 'true',
            foto: fotoData
          };
          if (!payload.nome) return;
          const res = await onMutate('SAVE_PRODUCT', payload);
          if (res.ok) {
            closeModal();
            showToast('✅ Produto salvo');
          } else {
            showToast(res.error || 'Erro ao salvar produto', 'error');
          }
        });
      }
    });
  };

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">🏷️ PRODUTOS</h1>
            <div class="page-date">Cadastro visual de Pré-Moldados e Marcenaria</div>
          </div>
          <button type="button" class="btn btn-primary" id="btn-new-product">+ NOVO PRODUTO</button>
        </div>

        <div class="chip-row" id="prd-sec-chips">
          <button type="button" class="chip active" data-sec="ALL">Todos (${db.produtos.length})</button>
          <button type="button" class="chip" data-sec="${SECTORS.PRE_MOLDADOS}">🧱 Pré-Moldados</button>
          <button type="button" class="chip" data-sec="${SECTORS.MARCENARIA}">🪵 Marcenaria</button>
        </div>

        <div id="prd-grid" class="grid-cards grid-cards-3"></div>
      </div>
    `,
    mount: () => {
      document.getElementById('btn-new-product')?.addEventListener('click', () => openProductForm(null));

      const gridEl = document.getElementById('prd-grid');

      function renderGrid() {
        const list = db.produtos.filter((p) => sectorFilter === 'ALL' || p.setor === sectorFilter);
        gridEl.innerHTML = list.map((p) => {
          const used = db.producoes.some((r) => r.produtoId === p.id);
          return `
            <div class="board-card" style="${p.ativo === false ? 'opacity:0.65;' : ''}">
              <img src="${p.foto}" alt="${escapeHtml(p.nome)}" class="product-photo-md" />
              <div class="row-between">
                <div class="fw-800" style="font-size:1.05rem;">${escapeHtml(p.nome)}</div>
                ${p.ativo === false ? renderStatusPill('red', 'INATIVO') : renderStatusPill('green', 'ATIVO')}
              </div>
              <div class="text-muted" style="font-size:0.84rem;font-weight:700;">
                ${SECTOR_LABELS[p.setor]} • ${escapeHtml(p.codigo || 'S/C')} • ${escapeHtml(p.unidade)}
              </div>
              <div style="display:flex;gap:8px;margin-top:4px;">
                <button type="button" class="btn btn-outline btn-sm btn-edit-prod" data-id="${p.id}" style="flex:1;">✏️ Editar</button>
                ${!used ? `
                  <button type="button" class="btn btn-danger btn-sm btn-del-prod" data-id="${p.id}">🗑️</button>
                ` : `
                  <button type="button" class="btn btn-outline btn-sm btn-toggle-prod" data-id="${p.id}">
                    ${p.ativo === false ? 'Ativar' : 'Inativar'}
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('');

        gridEl.querySelectorAll('.btn-edit-prod').forEach((btn) => {
          btn.addEventListener('click', () => {
            const prod = db.produtos.find((x) => x.id === btn.dataset.id);
            if (prod) openProductForm(prod);
          });
        });

        gridEl.querySelectorAll('.btn-toggle-prod').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const res = await onMutate('TOGGLE_PRODUCT', { id: btn.dataset.id });
            if (res.ok) showToast('✅ Situação do produto atualizada');
          });
        });

        gridEl.querySelectorAll('.btn-del-prod').forEach((btn) => {
          btn.addEventListener('click', () => {
            const prod = db.produtos.find((x) => x.id === btn.dataset.id);
            confirmDangerousAction({
              title: 'Excluir Produto',
              message: `Deseja excluir definitivamente o produto "${prod?.nome}"?`,
              confirmLabel: 'Excluir Definitivamente',
              onConfirm: async () => {
                const res = await onMutate('DELETE_PRODUCT', { id: btn.dataset.id });
                if (res.ok) showToast('✅ Produto excluído');
                else showToast(res.error || 'Não foi possível excluir', 'error');
              }
            });
          });
        });
      }

      document.querySelectorAll('#prd-sec-chips .chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#prd-sec-chips .chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          sectorFilter = btn.dataset.sec;
          renderGrid();
        });
      });

      renderGrid();
    }
  };
}

export function renderUsersView({ db, onMutate }) {
  const openUserForm = (existing = null) => {
    let currentTipo = 'PRE_MOLDADOS';
    if (existing) {
      if (existing.perfil === ROLES.PATRAO) currentTipo = 'PATRAO';
      else if (existing.perfil === ROLES.ADMIN) currentTipo = 'ADMIN';
      else if (existing.perfil === ROLES.CONFERENCIA) currentTipo = 'CONFERENCIA';
      else if (existing.setor === SECTORS.MARCENARIA) currentTipo = 'MARCENARIA';
      else currentTipo = 'PRE_MOLDADOS';
    }

    openModal({
      title: existing ? '✏️ Editar Usuário' : '+ Novo Usuário',
      bodyHtml: `
        <form id="user-form">
          <div class="field">
            <label for="uf-nome">Nome completo</label>
            <input id="uf-nome" class="input" type="text" required value="${escapeHtml(existing?.nome || '')}" placeholder="Ex: João da Marcenaria" />
          </div>
          <div class="field">
            <label for="uf-usuario">Login (usuário)</label>
            <input id="uf-usuario" class="input" type="text" required value="${escapeHtml(existing?.usuario || '')}" placeholder="Ex: joao" autocomplete="off" />
          </div>
          <div class="field">
            <label for="uf-senha">${existing ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha'}</label>
            <input id="uf-senha" class="input" type="password" ${existing ? '' : 'required'} placeholder="${existing ? '••••' : 'Digite a senha'}" autocomplete="new-password" />
          </div>
          <div class="field">
            <label for="uf-tipo">Tipo / Setor do Usuário</label>
            <select id="uf-tipo" class="select" style="font-weight:700;">
              <option value="MARCENARIA" ${currentTipo === 'MARCENARIA' ? 'selected' : ''}>🪵 Marcenaria (Marceneiro / Produção)</option>
              <option value="PRE_MOLDADOS" ${currentTipo === 'PRE_MOLDADOS' ? 'selected' : ''}>🧱 Pré-Moldados (Operador / Produção)</option>
              <option value="PATRAO" ${currentTipo === 'PATRAO' ? 'selected' : ''}>👔 Patrão (Diretoria / Gestão)</option>
              <option value="CONFERENCIA" ${currentTipo === 'CONFERENCIA' ? 'selected' : ''}>📋 Conferência (Conferente)</option>
              <option value="ADMIN" ${currentTipo === 'ADMIN' ? 'selected' : ''}>⚙️ Administrador Geral</option>
            </select>
            <div style="font-size:0.8rem;color:var(--text-muted);font-weight:600;margin-top:4px;">
              Define se o funcionário lança produções da Marcenaria ou dos Pré-Moldados.
            </div>
          </div>
          <div class="field">
            <label for="uf-ativo">Situação da Conta</label>
            <select id="uf-ativo" class="select">
              <option value="true" ${existing?.ativo !== false ? 'selected' : ''}>🟢 Ativo (Acesso Liberado)</option>
              <option value="false" ${existing?.ativo === false ? 'selected' : ''}>🔴 Inativo (Bloqueado)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-success btn-block btn-lg" style="margin-top:16px;">SALVAR USUÁRIO</button>
        </form>
      `,
      onMount: () => {
        document.getElementById('user-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const tipo = document.getElementById('uf-tipo').value;
          let perfil = ROLES.PRODUCAO;
          let setor = SECTORS.PRE_MOLDADOS;

          if (tipo === 'MARCENARIA') {
            perfil = ROLES.PRODUCAO;
            setor = SECTORS.MARCENARIA;
          } else if (tipo === 'PRE_MOLDADOS') {
            perfil = ROLES.PRODUCAO;
            setor = SECTORS.PRE_MOLDADOS;
          } else if (tipo === 'PATRAO') {
            perfil = ROLES.PATRAO;
            setor = 'AMBOS';
          } else if (tipo === 'CONFERENCIA') {
            perfil = ROLES.CONFERENCIA;
            setor = 'AMBOS';
          } else if (tipo === 'ADMIN') {
            perfil = ROLES.ADMIN;
            setor = 'AMBOS';
          }

          const payload = {
            id: existing?.id,
            nome: document.getElementById('uf-nome').value.trim(),
            usuario: document.getElementById('uf-usuario').value.trim(),
            senha: document.getElementById('uf-senha').value,
            perfil,
            setor,
            ativo: document.getElementById('uf-ativo').value === 'true'
          };
          const res = await onMutate('SAVE_USER', payload);
          if (res.ok) {
            closeModal();
            showToast('✅ Usuário salvo com sucesso');
          } else {
            showToast(res.error || 'Erro ao salvar usuário', 'error');
          }
        });
      }
    });
  };

  const getUserBadgeHtml = (u) => {
    if (u.perfil === ROLES.PATRAO) return '<span class="status-pill status-green">👔 Patrão</span>';
    if (u.perfil === ROLES.ADMIN) return '<span class="status-pill status-purple">⚙️ Admin</span>';
    if (u.perfil === ROLES.CONFERENCIA) return '<span class="status-pill status-blue">📋 Conferência</span>';
    if (u.setor === SECTORS.MARCENARIA) return '<span class="status-pill status-orange">🪵 Marcenaria</span>';
    return '<span class="status-pill status-blue">🧱 Pré-Moldados</span>';
  };

  return {
    html: `
      <div class="main-content main-narrow">
        <div class="page-header">
          <div>
            <h1 class="page-title">👥 USUÁRIOS</h1>
            <div class="page-date">Cadastro de acessos (Marcenaria, Pré-Moldados e Patrão)</div>
          </div>
          <button type="button" class="btn btn-primary" id="btn-new-user">+ NOVO USUÁRIO</button>
        </div>

        <div class="stack">
          ${db.usuarios.map((u) => {
            const used = db.producoes.some((r) => r.usuarioId === u.id || r.criadoPorId === u.id);
            return `
              <div class="card row-between" style="padding:14px;">
                <div style="flex:1;min-width:0;margin-right:10px;">
                  <div class="row-between" style="margin-bottom:4px;gap:8px;flex-wrap:wrap;">
                    <span class="fw-800" style="font-size:1.02rem;">${escapeHtml(u.nome)}</span>
                    <div style="display:flex;gap:6px;align-items:center;">
                      ${getUserBadgeHtml(u)}
                      ${u.ativo === false ? '<span class="status-pill status-red">Inativo</span>' : ''}
                    </div>
                  </div>
                  <div class="text-muted" style="font-size:0.86rem;font-weight:700;">
                    Login: <strong>@${escapeHtml(u.usuario)}</strong>
                  </div>
                </div>
                <div style="display:flex;gap:6px;">
                  <button type="button" class="btn btn-outline btn-sm btn-edit-usr" data-id="${u.id}" title="Editar Usuário">✏️ Editar</button>
                  ${!used && u.id !== 'usr_admin' && u.id !== 'usr_patrao' ? `
                    <button type="button" class="btn btn-danger btn-sm btn-del-usr" data-id="${u.id}" title="Excluir">🗑️</button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `,
    mount: () => {
      document.getElementById('btn-new-user')?.addEventListener('click', () => openUserForm(null));
      document.querySelectorAll('.btn-edit-usr').forEach((btn) => {
        btn.addEventListener('click', () => {
          const usr = db.usuarios.find((u) => u.id === btn.dataset.id);
          if (usr) openUserForm(usr);
        });
      });
      document.querySelectorAll('.btn-del-usr').forEach((btn) => {
        btn.addEventListener('click', () => {
          const usr = db.usuarios.find((u) => u.id === btn.dataset.id);
          confirmDangerousAction({
            title: 'Excluir Usuário',
            message: `Excluir definitivamente o usuário "${usr?.nome}"?`,
            confirmLabel: 'Excluir',
            onConfirm: async () => {
              const res = await onMutate('DELETE_USER', { id: btn.dataset.id });
              if (res.ok) showToast('✅ Usuário excluído');
              else showToast(res.error || 'Erro ao excluir', 'error');
            }
          });
        });
      });
    }
  };
}

export function renderCorrectionAndAuditView({ db, onMutate }) {
  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));
  const recentRecs = db.producoes
    .slice()
    .sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`))
    .slice(0, 30);

  const openCorrectionModal = (rec) => {
    const prod = getRecordProduct(rec, prodMap);
    openModal({
      title: `🛠️ Corrigir: ${prod?.nome || 'Registro'}`,
      bodyHtml: `
        <div class="div-alert" style="background:var(--amber-bg);border-color:#FCD34D;color:var(--amber);margin-bottom:12px;">
          ⚠️ Alteração crítica: o valor anterior será preservado no histórico de auditoria.
        </div>
        <form id="corr-form">
          <div class="grid-2">
            <div class="field">
              <label for="cr-qtd">Qtd Produzida</label>
              <input id="cr-qtd" type="number" min="1" step="any" class="input" required value="${rec.quantidade}" />
            </div>
            <div class="field">
              <label for="cr-qbr">Qtd Quebrada</label>
              <input id="cr-qbr" type="number" min="0" step="any" class="input" required value="${rec.quantidadeQuebrada || 0}" />
            </div>
          </div>
          <div class="field">
            <label for="cr-conf">Qtd Conferida (opcional)</label>
            <input id="cr-conf" type="number" min="0" step="any" class="input" value="${rec.quantidadeConferida ?? ''}" />
          </div>
          <div class="field">
            <label for="cr-motivo">Motivo da correção</label>
            <input id="cr-motivo" type="text" class="input" required placeholder="Ex: Erro de digitação no turno da manhã" />
          </div>
          <button type="submit" class="btn btn-danger btn-block btn-lg">CONFIRMAR CORREÇÃO</button>
        </form>
      `,
      onMount: () => {
        document.getElementById('corr-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const res = await onMutate('CORRECT_PRODUCTION', {
            producaoId: rec.id,
            quantidade: Number(document.getElementById('cr-qtd').value),
            quantidadeQuebrada: Number(document.getElementById('cr-qbr').value),
            quantidadeConferida: document.getElementById('cr-conf').value,
            motivo: document.getElementById('cr-motivo').value.trim()
          });
          if (res.ok) {
            closeModal();
            showToast('✅ Registro corrigido e auditado');
          } else {
            showToast(res.error || 'Erro ao corrigir', 'error');
          }
        });
      }
    });
  };

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">🛠️ CORRIGIR &amp; AUDITORIA</h1>
            <div class="page-date">Registros nunca são apagados; toda alteração fica registrada</div>
          </div>
        </div>

        <div class="section-title">Corrigir Registros Recentes</div>
        <div class="grid-cards">
          ${recentRecs.map((r) => {
            const p = getRecordProduct(r, prodMap);
            const s = computeProductionSummary(r);
            return `
              <div class="board-card">
                <div class="row-between">
                  <div>
                    <div class="fw-800">${escapeHtml(p?.nome || 'Produto')}</div>
                    <div class="text-muted" style="font-size:0.82rem;font-weight:700;">${formatDateBR(r.data)} ${r.hora}</div>
                  </div>
                  ${renderStatusPill(s.statusTone, s.statusShort)}
                </div>
                <div style="font-size:0.9rem;font-weight:700;">
                  Prod: ${s.produzida} | Quebr: ${s.quebrada} | Aprov: ${s.aproveitavel}
                  ${s.conferida !== null ? ` | Conf: ${s.conferida}` : ''}
                </div>
                <button type="button" class="btn btn-outline btn-sm btn-corr-rec" data-id="${r.id}">✏️ Corrigir com Auditoria</button>
              </div>
            `;
          }).join('')}
        </div>

        <div class="section-title" style="margin-top:24px;">📜 Histórico de Alterações (${(db.historicoAlteracoes || []).length})</div>
        ${(db.historicoAlteracoes || []).length === 0 ? `
          <div class="empty-state">Nenhuma alteração registrada ainda.</div>
        ` : `
          <div class="stack">
            ${db.historicoAlteracoes.slice(0, 40).map((a) => `
              <div class="card" style="padding:12px 14px;">
                <div class="row-between">
                  <span class="fw-800">${escapeHtml(a.acao)} • ${escapeHtml(a.entidade)}</span>
                  <span class="text-muted" style="font-size:0.78rem;font-weight:700;">${new Date(a.dataHora).toLocaleString('pt-BR')}</span>
                </div>
                <div style="font-size:0.85rem;font-weight:700;margin-top:4px;">Por: ${escapeHtml(a.usuarioNome)}</div>
                ${a.motivo ? `<div style="font-size:0.82rem;color:var(--amber);font-weight:700;">Motivo: ${escapeHtml(a.motivo)}</div>` : ''}
                <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;word-break:break-word;">
                  Antes: ${escapeHtml(JSON.stringify(a.valorAnterior))} → Depois: ${escapeHtml(JSON.stringify(a.novoValor))}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `,
    mount: () => {
      document.querySelectorAll('.btn-corr-rec').forEach((btn) => {
        btn.addEventListener('click', () => {
          const rec = db.producoes.find((r) => r.id === btn.dataset.id);
          if (rec) openCorrectionModal(rec);
        });
      });
    }
  };
}

export function renderSettingsView({ db, navigate, onSyncNow, onRestoreBackup, onMutate }) {
  return {
    html: `
      <div class="main-content main-narrow">
        <div class="page-header">
          <div>
            <h1 class="page-title">⚙️ CONFIGURAÇÕES</h1>
            <div class="page-date">Administração, Backup e Sincronização</div>
          </div>
        </div>

        <div class="stack">
          <button type="button" class="btn btn-outline btn-block" id="cfg-products" style="justify-content:flex-start;">
            🏷️ Cadastro de Produtos e Fotos (${db.produtos.length})
          </button>
          <button type="button" class="btn btn-outline btn-block" id="cfg-users" style="justify-content:flex-start;">
            👥 Cadastro de Usuários (${db.usuarios.length})
          </button>
          <button type="button" class="btn btn-outline btn-block" id="cfg-audit" style="justify-content:flex-start;">
            🛠️ Corrigir Registros &amp; Auditoria
          </button>
          <button type="button" class="btn btn-soft-blue btn-block" id="cfg-sync" style="justify-content:flex-start;">
            🔄 Sincronizar Agora com Servidor
          </button>
          <button type="button" class="btn btn-soft-amber btn-block" id="cfg-purge-demo" style="justify-content:flex-start;">
            🧹 Eliminar Dados Fakes / Limpar Testes
          </button>

          <div class="card" style="margin-top:8px;">
            <h3 style="margin:0 0 8px;font-size:1.05rem;font-weight:800;">💾 BACKUP E RESTAURAÇÃO</h3>
            <p class="text-muted" style="margin:0 0 12px;font-size:0.88rem;font-weight:600;">
              Salve uma cópia completa de segurança ou restaure um arquivo JSON anterior.
            </p>
            <div class="stack">
              <button type="button" class="btn btn-success btn-block" id="cfg-backup">
                💾 FAZER BACKUP DOS DADOS
              </button>
              <label class="btn btn-outline btn-block" style="cursor:pointer;">
                ♻️ RESTAURAR BACKUP (.JSON)
                <input id="cfg-restore-file" type="file" accept="application/json,.json" style="display:none;" />
              </label>
            </div>
          </div>
        </div>
      </div>
    `,
    mount: () => {
      document.getElementById('cfg-products')?.addEventListener('click', () => navigate('produtos'));
      document.getElementById('cfg-users')?.addEventListener('click', () => navigate('usuarios'));
      document.getElementById('cfg-audit')?.addEventListener('click', () => navigate('corrigir'));
      document.getElementById('cfg-sync')?.addEventListener('click', async () => {
        await onSyncNow();
        showToast('🔄 Verificação de sincronização concluída');
      });

      document.getElementById('cfg-purge-demo')?.addEventListener('click', () => {
        confirmDangerousAction({
          title: 'Eliminar Dados Fakes',
          message: 'Deseja remover definitivamente todos os registros de demonstração/testes (produções, quebras e entradas fakes)?',
          confirmLabel: 'Eliminar Fakes',
          onConfirm: async () => {
            if (onMutate) {
              const res = await onMutate('PURGE_DEMO_DATA', {});
              if (res.ok) {
                await onSyncNow();
                showToast('✅ Dados fakes eliminados com sucesso!');
              } else {
                showToast(res.error || 'Erro ao limpar dados fakes', 'error');
              }
            }
          }
        });
      });

      document.getElementById('cfg-backup')?.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `controle-producao-backup-${getLocalDateStr()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('✅ Backup gerado com sucesso');
      });

      document.getElementById('cfg-restore-file')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(reader.result);
            if (!Array.isArray(parsed.usuarios) || !Array.isArray(parsed.produtos) || !Array.isArray(parsed.producoes)) {
              showToast('Arquivo de backup inválido', 'error');
              return;
            }
            confirmDangerousAction({
              title: '♻️ Restaurar Backup',
              message: `Isso substituirá todos os dados atuais pelos dados do arquivo "${file.name}". Deseja continuar?`,
              confirmLabel: 'Restaurar Agora',
              onConfirm: async () => {
                await onRestoreBackup(parsed);
                showToast('✅ Backup restaurado com sucesso');
              }
            });
          } catch {
            showToast('Erro ao ler o arquivo JSON', 'error');
          }
        };
        reader.readAsText(file);
      });
    }
  };
}
