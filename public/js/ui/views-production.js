import {
  escapeHtml,
  formatDateBR,
  formatNumber,
  getLocalDateStr
} from '../utils.js';
import {
  SECTORS,
  SECTOR_LABELS,
  UNITS,
  computeProductionSummary,
  filterByPeriod,
  getAllowedSectorsForUser,
  canRegisterProduction,
  canRegisterBreakage,
  parseVoiceProduction,
  getRecordProduct
} from '../logic.js';
import { renderStatusPill, showToast, openModal, closeModal, compressImageFile } from './components.js';
import { startVoiceCapture } from '../voice.js';
import { PRODUCT_PHOTOS } from '../seed.js';

export function openNewUnregisteredProductModal({ sector = SECTORS.MARCENARIA, onMutate, onSaved }) {
  let fotoData = PRODUCT_PHOTOS.mesa;

  openModal({
    title: '📸 Novo Produto da Marcenaria',
    bodyHtml: `
      <div style="background:var(--amber-bg);color:var(--amber);padding:10px 12px;border-radius:10px;font-size:0.86rem;font-weight:700;margin-bottom:12px;">
        Item fora do catálogo? Tire uma foto e lance a produção. Na Conferência aparecerá o botão para cadastrar automaticamente.
      </div>
      <form id="unreg-prod-form">
        <div style="text-align:center;margin-bottom:12px;">
          <img id="up-preview" src="${fotoData}" alt="Foto do produto" style="width:170px;height:130px;object-fit:contain;margin:0 auto 8px;border-radius:12px;border:1px solid var(--border);background:var(--surface-alt);" />
          <label class="btn btn-primary btn-sm" style="display:inline-flex;cursor:pointer;">
            📷 TIRAR / ESCOLHER FOTO
            <input id="up-file" type="file" accept="image/*" capture="environment" style="display:none;" />
          </label>
        </div>

        <div class="field">
          <label for="up-nome">Nome do Produto Fabricado</label>
          <input id="up-nome" class="input" type="text" required placeholder="Ex: Armário Rústico 1,50m" autofocus />
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="up-unidade">Unidade</label>
            <select id="up-unidade" class="select">
              ${UNITS.map((u) => `<option value="${u}" ${u === 'UN' ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="up-qty">Quantidade</label>
            <input id="up-qty" type="number" min="1" step="any" inputmode="decimal" class="input input-qty" style="min-height:50px;font-size:1.35rem;" placeholder="0" required />
          </div>
        </div>

        <div class="field">
          <label>Destino da Produção</label>
          <div class="segmented-control" id="up-destino-seg">
            <button type="button" class="segmented-btn active" data-dest="ESTOQUE">📦 Para Estoque</button>
            <button type="button" class="segmented-btn" data-dest="PEDIDO">📋 Para Pedido</button>
          </div>
        </div>

        <div class="field" id="up-box-pedido" style="display:none;">
          <label for="up-numpedido">Número do Pedido</label>
          <input id="up-numpedido" class="input" type="text" placeholder="Ex: 1045" style="font-size:1.1rem;font-weight:700;" />
        </div>

        <button type="submit" class="btn btn-success btn-block btn-lg" style="margin-top:14px;">SALVAR PRODUÇÃO</button>
      </form>
    `,
    onMount: () => {
      const fileInp = document.getElementById('up-file');
      const prevImg = document.getElementById('up-preview');
      let selectedDest = 'ESTOQUE';
      const destBox = document.getElementById('up-box-pedido');
      const numPedInp = document.getElementById('up-numpedido');

      document.querySelectorAll('#up-destino-seg .segmented-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#up-destino-seg .segmented-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          selectedDest = btn.dataset.dest;
          if (selectedDest === 'PEDIDO') {
            destBox.style.display = 'block';
            numPedInp.focus();
          } else {
            destBox.style.display = 'none';
          }
        });
      });

      fileInp?.addEventListener('change', async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try {
          fotoData = await compressImageFile(f, 640);
          prevImg.src = fotoData;
        } catch {
          showToast('Não foi possível processar a foto', 'error');
        }
      });

      document.getElementById('unreg-prod-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('up-nome').value.trim();
        const unidade = document.getElementById('up-unidade').value;
        const quantidade = Number(document.getElementById('up-qty').value);
        if (!nome || !quantidade || quantidade <= 0) {
          showToast('Informe nome e quantidade válida', 'warning');
          return;
        }

        let numPedido = null;
        if (selectedDest === 'PEDIDO') {
          numPedido = numPedInp.value.trim();
          if (!numPedido) {
            showToast('Informe o número do pedido', 'warning');
            numPedInp.focus();
            return;
          }
        }

        const res = await onMutate('SAVE_UNREGISTERED_PRODUCTION', {
          nome,
          unidade,
          setor: sector,
          foto: fotoData,
          quantidade,
          tipoDestino: selectedDest,
          numeroPedido: numPedido
        });

        if (res.ok) {
          closeModal();
          showToast('✅ Produção registrada');
          if (onSaved) onSaved(res);
        } else {
          showToast(res.error || 'Erro ao registrar produção', 'error');
        }
      });
    }
  });
}

export function startVoiceProductionFlow({ db, user, onMutate, navigate }) {
  const allowedSectors = getAllowedSectorsForUser(user);

  const handleTranscript = async (transcript) => {
    const parsed = parseVoiceProduction(transcript, db.produtos, allowedSectors);

    if (parsed.confidence === 'high' && parsed.product && parsed.quantity > 0) {
      const res = await onMutate('SAVE_PRODUCTION', {
        produtoId: parsed.product.id,
        quantidade: parsed.quantity,
        tipoDestino: parsed.tipoDestino || 'ESTOQUE',
        numeroPedido: parsed.numeroPedido || null,
        origem: 'voz'
      });
      if (res.ok) {
        const destTxt = parsed.tipoDestino === 'PEDIDO' ? ` (Pedido #${parsed.numeroPedido})` : '';
        showToast(`✅ Produção registrada: ${parsed.product.nome} — ${parsed.quantity} ${parsed.product.unidade}${destTxt}`);
      } else {
        showToast(res.error || 'Erro ao salvar', 'error');
      }
      return;
    }

    // Low confidence or ambiguous -> show compact correction modal
    const eligibleProducts = db.produtos.filter((p) => p.ativo !== false && allowedSectors.includes(p.setor));
    const selectedId = parsed.product?.id || eligibleProducts[0]?.id || '';
    const qtyVal = parsed.quantity && parsed.quantity > 0 ? parsed.quantity : '';
    let selectedDest = parsed.tipoDestino || 'ESTOQUE';

    openModal({
      title: '🎙️ Confirmar / Corrigir Registro',
      bodyHtml: `
        <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:14px;">
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);">VOCÊ DISSE:</div>
          <div style="font-weight:800;margin-top:2px;">"${escapeHtml(transcript)}"</div>
          ${parsed.product && parsed.quantity ? `
            <div style="margin-top:8px;font-weight:700;color:var(--blue);">
              Entendi: ${escapeHtml(parsed.product.nome)} — ${parsed.quantity} ${escapeHtml(parsed.product.unidade)}
            </div>
          ` : ''}
        </div>
        <div class="field">
          <label for="vc-prod">Produto</label>
          <select id="vc-prod" class="select">
            ${eligibleProducts.map((p) => `
              <option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.nome)} (${p.unidade})</option>
            `).join('')}
          </select>
        </div>
        <div class="field">
          <label for="vc-qty">Quantidade</label>
          <input id="vc-qty" type="number" min="1" step="any" class="input input-qty" value="${escapeHtml(qtyVal)}" placeholder="0" />
        </div>
        <div class="field">
          <label>Destino da Produção</label>
          <div class="segmented-control" id="vc-destino-seg">
            <button type="button" class="segmented-btn ${selectedDest === 'PEDIDO' ? '' : 'active'}" data-dest="ESTOQUE">📦 Para Estoque</button>
            <button type="button" class="segmented-btn ${selectedDest === 'PEDIDO' ? 'active' : ''}" data-dest="PEDIDO">📋 Para Pedido</button>
          </div>
        </div>
        <div class="field" id="vc-box-pedido" style="${selectedDest === 'PEDIDO' ? '' : 'display:none;'}">
          <label for="vc-numpedido">Número do Pedido</label>
          <input id="vc-numpedido" class="input" type="text" value="${escapeHtml(parsed.numeroPedido || '')}" placeholder="Ex: 1045" />
        </div>
        <div class="grid-2" style="margin-top:16px;">
          <button type="button" class="btn btn-outline" id="vc-retry">🎙️ Falar de Novo</button>
          <button type="button" class="btn btn-success" id="vc-save">SALVAR</button>
        </div>
      `,
      onMount: () => {
        const destBox = document.getElementById('vc-box-pedido');
        const numPedInp = document.getElementById('vc-numpedido');

        document.querySelectorAll('#vc-destino-seg .segmented-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('#vc-destino-seg .segmented-btn').forEach((b) => b.classList.remove('active'));
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

        document.getElementById('vc-retry')?.addEventListener('click', () => {
          closeModal();
          startVoiceProductionFlow({ db, user, onMutate, navigate });
        });
        document.getElementById('vc-save')?.addEventListener('click', async () => {
          const prodId = document.getElementById('vc-prod').value;
          const qty = Number(document.getElementById('vc-qty').value);
          if (!prodId || !qty || qty <= 0) {
            showToast('Informe produto e quantidade válida', 'warning');
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

          const res = await onMutate('SAVE_PRODUCTION', {
            produtoId: prodId,
            quantidade: qty,
            tipoDestino: selectedDest,
            numeroPedido,
            origem: 'voz'
          });
          if (res.ok) {
            closeModal();
            showToast('✅ Produção registrada');
          } else {
            showToast(res.error || 'Erro ao salvar', 'error');
          }
        });
      }
    });
  };

  openModal({
    title: '🎙️ Registrar Produção por Voz',
    bodyHtml: `
      <div style="text-align:center;padding:10px 0;">
        <div id="voice-mic-circle" class="voice-pulse" style="width:76px;height:76px;border-radius:999px;background:var(--blue);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:2rem;margin-bottom:12px;">🎙️</div>
        <div id="voice-status-msg" style="font-weight:800;font-size:1.05rem;">Ouvindo... Fale agora</div>
        <div style="font-size:0.86rem;color:var(--text-muted);margin-top:4px;">Ex: "Produzi 120 canaletas 14" ou "8 portas"</div>
      </div>
      <div id="voice-fallback-box" style="margin-top:14px;">
        <div class="field">
          <label for="voice-manual-text">Ou digite o comando de voz:</label>
          <div style="display:flex;gap:8px;">
            <input id="voice-manual-text" class="input" type="text" placeholder="Produzi 120 canaletas 14" />
            <button type="button" class="btn btn-primary" id="voice-manual-go">IR</button>
          </div>
        </div>
      </div>
    `,
    onMount: () => {
      const statusEl = document.getElementById('voice-status-msg');
      const circleEl = document.getElementById('voice-mic-circle');
      const manualInput = document.getElementById('voice-manual-text');

      const rec = startVoiceCapture({
        onStart: () => {
          if (statusEl) statusEl.textContent = 'Ouvindo... Fale o produto e quantidade';
        },
        onResult: (transcript) => {
          closeModal();
          handleTranscript(transcript);
        },
        onError: (errMsg) => {
          circleEl?.classList.remove('voice-pulse');
          if (statusEl) {
            statusEl.textContent = errMsg === 'FALLBACK'
              ? 'Microfone indisponível neste navegador. Digite abaixo:'
              : errMsg;
          }
          manualInput?.focus();
        }
      });

      document.getElementById('voice-manual-go')?.addEventListener('click', () => {
        const text = manualInput?.value.trim();
        if (!text) return;
        rec.stop();
        closeModal();
        handleTranscript(text);
      });

      manualInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const text = manualInput.value.trim();
          if (!text) return;
          rec.stop();
          closeModal();
          handleTranscript(text);
        }
      });
    }
  });
}

function renderSectorItemCard(rec, prod, userMap, canBreak) {
  const s = computeProductionSummary(rec);
  const resp = userMap.get(rec.usuarioId)?.nome || 'Operador';
  return `
    <div class="board-card">
      <div style="display:flex;gap:12px;align-items:center;">
        <img src="${prod?.foto || ''}" alt="${escapeHtml(prod?.nome || 'Produto')}" style="width:92px;height:92px;object-fit:contain;background:var(--surface-alt);border-radius:12px;border:1px solid var(--border);flex-shrink:0;padding:4px;" />
        <div style="flex:1;min-width:0;">
          <h3 class="board-card-title" style="font-size:1.08rem;">${escapeHtml(prod?.nome || 'Produto')}</h3>
          <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;margin-top:2px;">
            ${escapeHtml(rec.hora)} • ${escapeHtml(resp)}
          </div>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">
            ${renderStatusPill(s.statusTone, s.statusShort)}
            ${rec.tipoDestino === 'PEDIDO' ? renderStatusPill('blue', `📋 Pedido #${escapeHtml(rec.numeroPedido || '')}`) : renderStatusPill('gray', '📦 Estoque')}
            ${rec.produtoNaoCadastrado ? renderStatusPill('amber', '⚠️ Não cadastrado') : ''}
          </div>
        </div>
      </div>

      <div class="board-metrics">
        <div class="metric-item">
          <span class="metric-num">${formatNumber(s.produzida)}</span>
          <span class="metric-lbl">produzidas</span>
        </div>
        <div class="metric-item">
          <span class="metric-num" style="color:${s.quebrada > 0 ? 'var(--amber)' : 'inherit'};">${formatNumber(s.quebrada)}</span>
          <span class="metric-lbl">quebradas</span>
        </div>
        <div class="metric-item">
          <span class="metric-num" style="color:var(--green);">${formatNumber(s.aproveitavel)}</span>
          <span class="metric-lbl">aproveitáveis</span>
        </div>
      </div>

      ${canBreak && !s.entradaRealizada ? `
        <button type="button" class="btn btn-soft-amber btn-sm btn-block btn-break-item" data-prod-reg-id="${rec.id}">
          ⚠️ REGISTRAR QUEBRA NESTE LOTE
        </button>
      ` : ''}
    </div>
  `;
}

export function renderSectorProductionView({ db, user, sector, navigate, onMutate }) {
  const hoje = getLocalDateStr();
  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));
  const userMap = new Map(db.usuarios.map((u) => [u.id, u]));

  const canProduce = canRegisterProduction(user);
  const canBreak = canRegisterBreakage(user);

  const todayItems = db.producoes
    .filter((r) => r.setor === sector && r.data === hoje)
    .sort((a, b) => b.hora.localeCompare(a.hora));

  const title = SECTOR_LABELS[sector] || 'PRODUÇÃO';
  const isMarcenaria = sector === SECTORS.MARCENARIA;

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">${title}</h1>
            <div class="page-date">Produção de hoje • ${formatDateBR(hoje)}</div>
          </div>
        </div>

        ${canProduce ? `
          <div class="stack" style="margin-bottom:16px;">
            <button type="button" class="btn btn-primary btn-lg btn-block" id="btn-new-prod">
              + REGISTRAR PRODUÇÃO
            </button>
            ${isMarcenaria ? `
              <button type="button" class="btn btn-soft-amber btn-block" id="btn-new-unreg-prod">
                📸 + PRODUTO NOVO (TIRAR FOTO)
              </button>
            ` : ''}
            <div class="grid-2">
              <button type="button" class="btn btn-success" id="btn-fast-prod">⚡ PRODUÇÃO RÁPIDA</button>
              <button type="button" class="btn btn-soft-blue" id="btn-voice-prod">🎙️ POR VOZ</button>
            </div>
          </div>
        ` : ''}

        ${canBreak ? `
          <div class="grid-2" style="margin-bottom:16px;">
            <button type="button" class="btn btn-soft-amber" id="btn-reg-break">⚠️ REGISTRAR QUEBRA</button>
            <button type="button" class="btn btn-outline" id="btn-break-hist">📋 HIST. QUEBRAS</button>
          </div>
        ` : ''}

        <div class="section-title">Produzidos hoje (${todayItems.length})</div>

        ${todayItems.length === 0 ? `
          <div class="empty-state">
            Nenhuma produção registrada hoje neste setor.
          </div>
        ` : `
          <div class="grid-cards">
            ${todayItems.map((rec) => renderSectorItemCard(rec, getRecordProduct(rec, prodMap), userMap, canBreak)).join('')}
          </div>
        `}
      </div>
    `,
    mount: () => {
      document.getElementById('btn-new-prod')?.addEventListener('click', () => navigate('registrar-producao', { sector }));
      document.getElementById('btn-new-unreg-prod')?.addEventListener('click', () => {
        openNewUnregisteredProductModal({ sector, onMutate });
      });
      document.getElementById('btn-fast-prod')?.addEventListener('click', () => navigate('producao-rapida', { sector }));
      document.getElementById('btn-voice-prod')?.addEventListener('click', () => {
        startVoiceProductionFlow({ db, user, onMutate, navigate });
      });
      document.getElementById('btn-reg-break')?.addEventListener('click', () => navigate('registrar-quebra', { sector }));
      document.getElementById('btn-break-hist')?.addEventListener('click', () => navigate('quebras'));

      document.querySelectorAll('.btn-break-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          navigate('registrar-quebra', { sector, producaoId: btn.dataset.prodRegId });
        });
      });
    }
  };
}

export function renderTodayProductionHubView({ db, user, navigate, onMutate }) {
  const hoje = getLocalDateStr();
  const allowedSectors = getAllowedSectorsForUser(user);
  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));
  const userMap = new Map(db.usuarios.map((u) => [u.id, u]));

  const todayItems = db.producoes
    .filter((r) => r.data === hoje && allowedSectors.includes(r.setor))
    .sort((a, b) => b.hora.localeCompare(a.hora));

  const canProduce = canRegisterProduction(user);
  const canBreak = canRegisterBreakage(user);

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">PRODUÇÃO DE HOJE</h1>
            <div class="page-date">📅 ${formatDateBR(hoje)}</div>
          </div>
        </div>

        ${canProduce ? `
          <div class="stack" style="margin-bottom:16px;">
            <button type="button" class="btn btn-primary btn-lg btn-block" id="hub-new-prod">
              + REGISTRAR PRODUÇÃO
            </button>
            <div class="grid-2">
              <button type="button" class="btn btn-success" id="hub-fast-prod">⚡ PRODUÇÃO RÁPIDA</button>
              <button type="button" class="btn btn-soft-blue" id="hub-voice-prod">🎙️ REGISTRAR POR VOZ</button>
            </div>
          </div>
        ` : ''}

        <div class="section-title">Registros de Hoje (${todayItems.length})</div>
        ${todayItems.length === 0 ? `
          <div class="empty-state">Nenhuma produção registrada hoje.</div>
        ` : `
          <div class="grid-cards">
            ${todayItems.map((rec) => renderSectorItemCard(rec, getRecordProduct(rec, prodMap), userMap, canBreak)).join('')}
          </div>
        `}
      </div>
    `,
    mount: () => {
      document.getElementById('hub-new-prod')?.addEventListener('click', () => navigate('registrar-producao'));
      document.getElementById('hub-fast-prod')?.addEventListener('click', () => navigate('producao-rapida'));
      document.getElementById('hub-voice-prod')?.addEventListener('click', () => {
        startVoiceProductionFlow({ db, user, onMutate, navigate });
      });
      document.querySelectorAll('.btn-break-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          navigate('registrar-quebra', { producaoId: btn.dataset.prodRegId });
        });
      });
    }
  };
}

export function renderRegisterProductionView({ db, user, params = {}, navigate, onMutate }) {
  const allowedSectors = getAllowedSectorsForUser(user);
  let selectedSector = params.sector && allowedSectors.includes(params.sector) ? params.sector : (allowedSectors.length === 1 ? allowedSectors[0] : 'ALL');
  let selectedProductId = params.produtoId || null;

  const activeProducts = db.produtos.filter((p) => p.ativo !== false && allowedSectors.includes(p.setor));

  const getFilteredProducts = () =>
    selectedSector === 'ALL' ? activeProducts : activeProducts.filter((p) => p.setor === selectedSector);

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">+ REGISTRAR PRODUÇÃO</h1>
            <div class="page-date">📅 Hoje • ${formatDateBR(getLocalDateStr())}</div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="reg-back-btn">Voltar</button>
        </div>

        <div id="reg-step-container"></div>
      </div>
    `,
    mount: () => {
      const container = document.getElementById('reg-step-container');
      document.getElementById('reg-back-btn')?.addEventListener('click', () => {
        if (selectedProductId) {
          selectedProductId = null;
          renderStep();
        } else {
          navigate(params.sector === SECTORS.PRE_MOLDADOS ? 'premoldados' : params.sector === SECTORS.MARCENARIA ? 'marcenaria' : 'producao');
        }
      });

      function renderStep() {
        if (!selectedProductId) {
          const list = getFilteredProducts();
          container.innerHTML = `
            ${allowedSectors.length > 1 ? `
              <div class="chip-row">
                <button type="button" class="chip ${selectedSector === 'ALL' ? 'active' : ''}" data-sec="ALL">Todos</button>
                <button type="button" class="chip ${selectedSector === SECTORS.PRE_MOLDADOS ? 'active' : ''}" data-sec="${SECTORS.PRE_MOLDADOS}">🧱 Pré-Moldados</button>
                <button type="button" class="chip ${selectedSector === SECTORS.MARCENARIA ? 'active' : ''}" data-sec="${SECTORS.MARCENARIA}">🪵 Marcenaria</button>
              </div>
            ` : ''}

            ${(selectedSector === SECTORS.MARCENARIA || selectedSector === 'ALL') && allowedSectors.includes(SECTORS.MARCENARIA) ? `
              <button type="button" class="btn btn-soft-amber btn-block" id="reg-unreg-mar-btn" style="margin-bottom:12px;">
                📸 + PRODUTO NOVO DA MARCENARIA (TIRAR FOTO)
              </button>
            ` : ''}

            ${list.length === 0 ? `
              <div class="empty-state">
                Nenhum produto cadastrado neste setor ainda.<br/>
                Entre como Administrador em <strong>🏷️ PRODUTOS</strong> para cadastrar.
              </div>
            ` : `
              <div class="grid-cards grid-cards-3">
                ${list.map((p) => `
                  <button type="button" class="product-select-card" data-pick-prod="${p.id}">
                    <img src="${p.foto}" alt="${escapeHtml(p.nome)}" class="product-photo-md" />
                    <div class="product-select-name">${escapeHtml(p.nome)}</div>
                    <div class="product-select-meta">${escapeHtml(p.codigo || '')} • ${escapeHtml(p.unidade)}</div>
                  </button>
                `).join('')}
              </div>
            `}
          `;

          document.getElementById('reg-unreg-mar-btn')?.addEventListener('click', () => {
            openNewUnregisteredProductModal({
              sector: SECTORS.MARCENARIA,
              onMutate,
              onSaved: () => navigate('marcenaria')
            });
          });

          container.querySelectorAll('[data-sec]').forEach((btn) => {
            btn.addEventListener('click', () => {
              selectedSector = btn.dataset.sec;
              renderStep();
            });
          });
          container.querySelectorAll('[data-pick-prod]').forEach((btn) => {
            btn.addEventListener('click', () => {
              selectedProductId = btn.dataset.pickProd;
              renderStep();
            });
          });
          return;
        }

        const prod = activeProducts.find((p) => p.id === selectedProductId);
        if (!prod) {
          selectedProductId = null;
          renderStep();
          return;
        }

        container.innerHTML = `
          <div class="card" style="max-width:480px;margin:0 auto;">
            <img src="${prod.foto}" alt="${escapeHtml(prod.nome)}" class="product-photo-lg" />
            <h2 style="margin:12px 0 4px;font-size:1.3rem;font-weight:800;text-align:center;">${escapeHtml(prod.nome)}</h2>
            <div style="text-align:center;color:var(--text-muted);font-weight:700;margin-bottom:14px;">
              ${SECTOR_LABELS[prod.setor]} • Unidade: ${escapeHtml(prod.unidade)}
            </div>

            <form id="save-prod-form">
              <div class="field">
                <label for="qty-input">QUANTIDADE (${escapeHtml(prod.unidade)})</label>
                <input id="qty-input" type="number" min="1" step="any" inputmode="decimal" class="input input-qty" placeholder="0" required autofocus />
              </div>

              <div class="qty-presets">
                <button type="button" class="chip preset-add" data-add="1">+1</button>
                <button type="button" class="chip preset-add" data-add="5">+5</button>
                <button type="button" class="chip preset-add" data-add="10">+10</button>
                <button type="button" class="chip preset-add" data-add="50">+50</button>
                <button type="button" class="chip preset-add" data-add="100">+100</button>
              </div>

              <div class="field" style="margin-top:14px;">
                <label>Destino da Produção</label>
                <div class="segmented-control" id="reg-destino-seg">
                  <button type="button" class="segmented-btn active" data-dest="ESTOQUE">📦 Para Estoque</button>
                  <button type="button" class="segmented-btn" data-dest="PEDIDO">📋 Para Pedido</button>
                </div>
              </div>

              <div class="field" id="reg-box-pedido" style="display:none;">
                <label for="reg-numpedido">Número do Pedido</label>
                <input id="reg-numpedido" class="input" type="text" placeholder="Ex: 1045" style="font-size:1.15rem;font-weight:700;" />
              </div>

              <button type="submit" class="btn btn-success btn-block btn-lg" style="margin-top:16px;">SALVAR PRODUÇÃO</button>
            </form>

            <button type="button" class="btn btn-outline btn-block" id="btn-change-prod" style="margin-top:10px;">
              Trocar Produto
            </button>
          </div>
        `;

        const qtyInp = document.getElementById('qty-input');
        qtyInp?.focus();

        let selectedDest = 'ESTOQUE';
        const destBox = document.getElementById('reg-box-pedido');
        const numPedInp = document.getElementById('reg-numpedido');

        container.querySelectorAll('#reg-destino-seg .segmented-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            container.querySelectorAll('#reg-destino-seg .segmented-btn').forEach((b) => b.classList.remove('active'));
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

        container.querySelectorAll('.preset-add').forEach((btn) => {
          btn.addEventListener('click', () => {
            const cur = Number(qtyInp.value) || 0;
            qtyInp.value = cur + Number(btn.dataset.add);
          });
        });

        document.getElementById('btn-change-prod')?.addEventListener('click', () => {
          selectedProductId = null;
          renderStep();
        });

        document.getElementById('save-prod-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const qty = Number(qtyInp.value);
          if (!qty || qty <= 0) {
            showToast('Informe uma quantidade maior que zero', 'warning');
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

          const res = await onMutate('SAVE_PRODUCTION', {
            produtoId: prod.id,
            quantidade: qty,
            tipoDestino: selectedDest,
            numeroPedido,
            origem: 'manual'
          });
          if (res.ok) {
            showToast('✅ Produção registrada');
            navigate(prod.setor === SECTORS.PRE_MOLDADOS ? 'premoldados' : 'marcenaria');
          } else {
            showToast(res.error || 'Erro ao registrar produção', 'error');
          }
        });
      }

      renderStep();
    }
  };
}

export function renderFastProductionView({ db, user, params = {}, navigate, onMutate }) {
  const allowedSectors = getAllowedSectorsForUser(user);
  const products = db.produtos.filter((p) => {
    if (p.ativo === false || !allowedSectors.includes(p.setor)) return false;
    if (params.sector && allowedSectors.includes(params.sector)) return p.setor === params.sector;
    return true;
  });

  const sessionSaved = [];

  return {
    html: `
      <div class="main-content main-narrow">
        <div class="page-header">
          <div>
            <h1 class="page-title">⚡ PRODUÇÃO RÁPIDA</h1>
            <div class="page-date">Salva e continua na mesma tela</div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="fast-back">Sair</button>
        </div>

        <div class="card">
          <form id="fast-prod-form">
            <div class="field">
              <label for="fast-prod-select">Produto</label>
              <select id="fast-prod-select" class="select" required>
                <option value="">[ selecionar produto ]</option>
                ${products.map((p) => `
                  <option value="${p.id}">${escapeHtml(p.nome)} (${escapeHtml(p.unidade)})</option>
                `).join('')}
              </select>
            </div>

            <div id="fast-prod-preview" style="display:none;margin-bottom:12px;"></div>

            <div class="field">
              <label for="fast-qty">Quantidade</label>
              <input id="fast-qty" type="number" min="1" step="any" inputmode="decimal" class="input input-qty" placeholder="0" required />
            </div>

            <div class="field">
              <label>Destino da Produção</label>
              <div class="segmented-control" id="fast-destino-seg">
                <button type="button" class="segmented-btn active" data-dest="ESTOQUE">📦 Estoque</button>
                <button type="button" class="segmented-btn" data-dest="PEDIDO">📋 Pedido</button>
              </div>
            </div>

            <div class="field" id="fast-box-pedido" style="display:none;">
              <label for="fast-numpedido">Número do Pedido</label>
              <input id="fast-numpedido" class="input" type="text" placeholder="Ex: 1045" style="font-weight:700;" />
            </div>

            <button type="submit" class="btn btn-success btn-block btn-lg" style="margin-top:14px;">SALVAR</button>
          </form>
        </div>

        <div class="section-title">Lançados nesta sessão</div>
        <div id="fast-session-list" class="stack">
          <div class="empty-state">Pronto para registrar vários produtos seguidos.</div>
        </div>
      </div>
    `,
    mount: () => {
      const sel = document.getElementById('fast-prod-select');
      const qtyInp = document.getElementById('fast-qty');
      const preview = document.getElementById('fast-prod-preview');
      const listEl = document.getElementById('fast-session-list');
      let selectedDest = 'ESTOQUE';
      const destBox = document.getElementById('fast-box-pedido');
      const numPedInp = document.getElementById('fast-numpedido');

      document.querySelectorAll('#fast-destino-seg .segmented-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#fast-destino-seg .segmented-btn').forEach((b) => b.classList.remove('active'));
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

      document.getElementById('fast-back')?.addEventListener('click', () => {
        navigate(params.sector === SECTORS.PRE_MOLDADOS ? 'premoldados' : params.sector === SECTORS.MARCENARIA ? 'marcenaria' : 'inicio');
      });

      sel?.addEventListener('change', () => {
        const prod = products.find((p) => p.id === sel.value);
        if (prod) {
          preview.style.display = 'flex';
          preview.style.alignItems = 'center';
          preview.style.gap = '10px';
          preview.innerHTML = `
            <img src="${prod.foto}" alt="" style="width:60px;height:60px;object-fit:contain;border-radius:10px;border:1px solid var(--border);background:var(--surface-alt);" />
            <div>
              <div class="fw-800">${escapeHtml(prod.nome)}</div>
              <div class="text-muted" style="font-size:0.85rem;font-weight:700;">${SECTOR_LABELS[prod.setor]} • ${escapeHtml(prod.unidade)}</div>
            </div>
          `;
          qtyInp.focus();
        } else {
          preview.style.display = 'none';
        }
      });

      document.getElementById('fast-prod-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prod = products.find((p) => p.id === sel.value);
        const qty = Number(qtyInp.value);
        if (!prod || !qty || qty <= 0) {
          showToast('Selecione o produto e informe a quantidade', 'warning');
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

        const res = await onMutate('SAVE_PRODUCTION', {
          produtoId: prod.id,
          quantidade: qty,
          tipoDestino: selectedDest,
          numeroPedido,
          origem: 'rapida'
        });

        if (res.ok) {
          showToast(`✅ ${prod.nome} — ${qty} salvo!`);
          sessionSaved.unshift({
            nome: prod.nome,
            qty,
            unidade: prod.unidade,
            hora: res.record.hora,
            tipoDestino: selectedDest,
            numeroPedido
          });
          listEl.innerHTML = sessionSaved.map((item) => `
            <div class="card row-between" style="padding:12px 14px;">
              <div>
                <div class="fw-800">${escapeHtml(item.nome)}</div>
                <div class="text-muted" style="font-size:0.8rem;display:flex;gap:6px;align-items:center;margin-top:2px;">
                  <span>${item.hora}</span>
                  <span>•</span>
                  <span>${item.tipoDestino === 'PEDIDO' ? `📋 Pedido #${escapeHtml(item.numeroPedido)}` : '📦 Estoque'}</span>
                </div>
              </div>
              <span class="status-pill status-green">+${formatNumber(item.qty)} ${escapeHtml(item.unidade)}</span>
            </div>
          `).join('');

          // Reset inputs and remain on same screen!
          sel.value = '';
          qtyInp.value = '';
          preview.style.display = 'none';
          sel.focus();
        } else {
          showToast(res.error || 'Erro ao salvar', 'error');
        }
      });
    }
  };
}

export function renderRegisterBreakageView({ db, user, params = {}, navigate, onMutate }) {
  const hoje = getLocalDateStr();
  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));
  const allowedSectors = getAllowedSectorsForUser(user);

  const candidates = db.producoes
    .filter((r) => allowedSectors.includes(r.setor) && r.status !== 'ENTRADA_REALIZADA')
    .sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));

  const fallbackAll = candidates.length > 0 ? candidates : db.producoes
    .filter((r) => allowedSectors.includes(r.setor))
    .sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`))
    .slice(0, 20);

  let selectedId = params.producaoId || fallbackAll[0]?.id || '';

  return {
    html: `
      <div class="main-content main-narrow">
        <div class="page-header">
          <div>
            <h1 class="page-title">⚠️ REGISTRAR QUEBRA</h1>
            <div class="page-date">Cálculo automático de aproveitáveis</div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="brk-back">Voltar</button>
        </div>

        ${fallbackAll.length === 0 ? `
          <div class="empty-state">Nenhuma produção registrada para lançar quebra.</div>
        ` : `
          <div class="card">
            <form id="break-form">
              <div class="field">
                <label for="brk-rec">Lote / Produto Produzido</label>
                <select id="brk-rec" class="select" required>
                  ${fallbackAll.map((r) => {
                    const p = getRecordProduct(r, prodMap);
                    return `<option value="${r.id}" ${r.id === selectedId ? 'selected' : ''}>
                      ${escapeHtml(p?.nome || 'Produto')} — ${r.quantidade} ${p?.unidade || 'UN'} (${r.data === hoje ? 'Hoje' : formatDateBR(r.data)} ${r.hora})
                    </option>`;
                  }).join('')}
                </select>
              </div>

              <div id="brk-preview" style="margin-bottom:14px;"></div>

              <div class="field">
                <label for="brk-qty">Quantidade Quebrada (a adicionar)</label>
                <input id="brk-qty" type="number" min="1" step="any" inputmode="decimal" class="input input-qty" placeholder="0" required autofocus />
              </div>

              <div id="brk-calc-box" style="background:var(--surface-alt);border:1.5px solid var(--border);border-radius:12px;padding:12px;margin-bottom:14px;text-align:center;">
                <div style="font-size:0.82rem;font-weight:700;color:var(--text-muted);">APROVEITÁVEIS ESTIMADOS</div>
                <div id="brk-aprov-val" style="font-size:1.8rem;font-weight:800;color:var(--green);">--</div>
              </div>

              <div class="field">
                <label for="brk-motivo">Motivo (opcional)</label>
                <input id="brk-motivo" type="text" class="input" placeholder="Ex: Desenforma, trinca, transporte" />
              </div>

              <button type="submit" class="btn btn-warning btn-block btn-lg">SALVAR QUEBRA</button>
            </form>
          </div>
        `}
      </div>
    `,
    mount: () => {
      document.getElementById('brk-back')?.addEventListener('click', () => {
        navigate(params.sector === SECTORS.MARCENARIA ? 'marcenaria' : 'premoldados');
      });

      const recSel = document.getElementById('brk-rec');
      const qtyInp = document.getElementById('brk-qty');
      const prevEl = document.getElementById('brk-preview');
      const aprovEl = document.getElementById('brk-aprov-val');

      function updateCalc() {
        const rec = fallbackAll.find((r) => r.id === recSel?.value);
        if (!rec) return;
        const prod = getRecordProduct(rec, prodMap);
        const curQuebra = Number(rec.quantidadeQuebrada) || 0;
        const addQ = Math.max(0, Number(qtyInp?.value) || 0);
        const totalQ = curQuebra + addQ;
        const aprov = Math.max(0, rec.quantidade - totalQ);

        if (prevEl) {
          prevEl.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;">
              <img src="${prod?.foto || ''}" alt="" style="width:76px;height:76px;object-fit:contain;border-radius:10px;border:1px solid var(--border);background:var(--surface-alt);" />
              <div>
                <div class="fw-800">${escapeHtml(prod?.nome || '')}</div>
                <div style="font-size:0.9rem;font-weight:700;">Produzidas: ${rec.quantidade} • Quebras atuais: ${curQuebra}</div>
              </div>
            </div>
          `;
        }
        if (aprovEl) {
          if (totalQ > rec.quantidade) {
            aprovEl.style.color = 'var(--red)';
            aprovEl.textContent = 'Excede produção!';
          } else {
            aprovEl.style.color = 'var(--green)';
            aprovEl.textContent = `${aprov} ${prod?.unidade || 'UN'}`;
          }
        }
      }

      recSel?.addEventListener('change', updateCalc);
      qtyInp?.addEventListener('input', updateCalc);
      updateCalc();

      document.getElementById('break-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rec = fallbackAll.find((r) => r.id === recSel.value);
        const qAdd = Number(qtyInp.value);
        if (!rec || !qAdd || qAdd <= 0) {
          showToast('Informe a quantidade quebrada', 'warning');
          return;
        }
        const res = await onMutate('REGISTER_BREAKAGE', {
          producaoId: rec.id,
          quantidade: qAdd,
          motivo: document.getElementById('brk-motivo').value.trim() || 'Quebra operacional'
        });
        if (res.ok) {
          showToast(`✅ Quebra registrada! Aproveitáveis: ${res.record.quantidadeAproveitavel}`);
          navigate(rec.setor === SECTORS.MARCENARIA ? 'marcenaria' : 'premoldados');
        } else {
          showToast(res.error || 'Erro ao registrar quebra', 'error');
        }
      });
    }
  };
}

export function renderBreakageHistoryView({ db, user, navigate }) {
  let period = 'mes';
  let customStart = '';
  let customEnd = '';

  const prodMap = new Map(db.produtos.map((p) => [p.id, p]));
  const userMap = new Map(db.usuarios.map((u) => [u.id, u]));
  const allowedSectors = getAllowedSectorsForUser(user);

  return {
    html: `
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">⚠️ HISTÓRICO DE QUEBRAS</h1>
            <div class="page-date">Controle de perdas e aproveitamento</div>
          </div>
          ${canRegisterBreakage(user) ? `<button type="button" class="btn btn-soft-amber btn-sm" id="qbr-new-btn">+ Nova Quebra</button>` : ''}
        </div>

        <div class="chip-row" id="qbr-period-chips">
          <button type="button" class="chip" data-per="hoje">Hoje</button>
          <button type="button" class="chip" data-per="7dias">7 dias</button>
          <button type="button" class="chip active" data-per="mes">Este mês</button>
          <button type="button" class="chip" data-per="personalizado">Personalizado</button>
        </div>

        <div id="qbr-custom-range" style="display:none;margin-bottom:12px;" class="card">
          <div class="grid-2">
            <div class="field" style="margin-bottom:0;">
              <label>De</label>
              <input type="date" id="qbr-start" class="input" />
            </div>
            <div class="field" style="margin-bottom:0;">
              <label>Até</label>
              <input type="date" id="qbr-end" class="input" />
            </div>
          </div>
        </div>

        <div id="qbr-list" class="grid-cards"></div>
      </div>
    `,
    mount: () => {
      document.getElementById('qbr-new-btn')?.addEventListener('click', () => navigate('registrar-quebra'));

      const listEl = document.getElementById('qbr-list');
      const customBox = document.getElementById('qbr-custom-range');

      function renderList() {
        const allAllowed = db.quebras.filter((q) => {
          const p = prodMap.get(q.produtoId);
          return !p || allowedSectors.includes(p.setor);
        });
        const filtered = filterByPeriod(allAllowed, period, customStart, customEnd)
          .sort((a, b) => `${b.data} ${b.hora}`.localeCompare(`${a.data} ${a.hora}`));

        if (filtered.length === 0) {
          listEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Nenhuma quebra registrada no período selecionado.</div>`;
          return;
        }

        listEl.innerHTML = filtered.map((q) => {
          const prod = prodMap.get(q.produtoId);
          const resp = userMap.get(q.usuarioId)?.nome || 'Operador';
          return `
            <div class="board-card">
              <div style="display:flex;gap:12px;align-items:center;">
                <img src="${prod?.foto || ''}" alt="" style="width:84px;height:84px;object-fit:contain;border-radius:10px;border:1px solid var(--border);background:var(--surface-alt);flex-shrink:0;" />
                <div style="flex:1;min-width:0;">
                  <div class="fw-800" style="font-size:1.05rem;">${escapeHtml(prod?.nome || 'Produto')}</div>
                  <div class="text-muted" style="font-size:0.82rem;font-weight:700;">
                    📅 ${formatDateBR(q.data)} ${q.hora} • ${escapeHtml(resp)}
                  </div>
                  <div style="font-size:0.84rem;color:var(--amber);font-weight:700;margin-top:4px;">
                    ⚠️ ${escapeHtml(q.motivo || 'Quebra')}
                  </div>
                </div>
              </div>
              <div class="board-metrics">
                <div class="metric-item">
                  <span class="metric-num">${formatNumber(q.quantidadeProduzida)}</span>
                  <span class="metric-lbl">produzida</span>
                </div>
                <div class="metric-item">
                  <span class="metric-num" style="color:var(--red);">${formatNumber(q.quantidade)}</span>
                  <span class="metric-lbl">quebrada</span>
                </div>
                <div class="metric-item">
                  <span class="metric-num" style="color:var(--green);">${formatNumber(q.quantidadeAproveitavel)}</span>
                  <span class="metric-lbl">aproveitável</span>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      document.querySelectorAll('#qbr-period-chips .chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#qbr-period-chips .chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          period = btn.dataset.per;
          customBox.style.display = period === 'personalizado' ? 'block' : 'none';
          renderList();
        });
      });

      document.getElementById('qbr-start')?.addEventListener('change', (e) => {
        customStart = e.target.value;
        renderList();
      });
      document.getElementById('qbr-end')?.addEventListener('change', (e) => {
        customEnd = e.target.value;
        renderList();
      });

      renderList();
    }
  };
}
