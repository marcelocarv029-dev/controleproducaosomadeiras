import { SECTORS, ROLES } from './logic.js';

function svgUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const PRODUCT_PHOTOS = {
  canaleta14: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#E8EEF5"/><rect x="36" y="56" width="248" height="114" rx="8" fill="#94A3B8" stroke="#475569" stroke-width="4"/><polygon points="36,56 76,34 284,34 244,56" fill="#CBD5E1" stroke="#475569" stroke-width="3"/><polygon points="244,56 284,34 284,148 244,170" fill="#64748B" stroke="#475569" stroke-width="3"/><rect x="70" y="64" width="144" height="58" rx="4" fill="#475569"/><polygon points="70,64 98,46 242,46 214,64" fill="#334155"/><text x="160" y="202" font-family="Arial,sans-serif" font-weight="bold" font-size="20" text-anchor="middle" fill="#1E293B">CANALETA 14</text></svg>`),
  canaleta19: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#E8EEF5"/><rect x="26" y="48" width="268" height="124" rx="8" fill="#64748B" stroke="#334155" stroke-width="4"/><polygon points="26,48 68,26 294,26 254,48" fill="#94A3B8" stroke="#334155" stroke-width="3"/><rect x="64" y="58" width="160" height="66" rx="4" fill="#334155"/><rect x="132" y="138" width="56" height="16" rx="3" fill="#CBD5E1"/><text x="160" y="202" font-family="Arial,sans-serif" font-weight="bold" font-size="20" text-anchor="middle" fill="#1E293B">CANALETA 19</text></svg>`),
  manilha30: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#E8EEF5"/><ellipse cx="105" cy="110" rx="48" ry="64" fill="#94A3B8" stroke="#475569" stroke-width="4"/><rect x="105" y="46" width="120" height="128" fill="#94A3B8"/><line x1="105" y1="46" x2="225" y2="46" stroke="#475569" stroke-width="4"/><line x1="105" y1="174" x2="225" y2="174" stroke="#475569" stroke-width="4"/><ellipse cx="225" cy="110" rx="44" ry="64" fill="#CBD5E1" stroke="#475569" stroke-width="4"/><ellipse cx="225" cy="110" rx="28" ry="44" fill="#334155"/><text x="160" y="204" font-family="Arial,sans-serif" font-weight="bold" font-size="20" text-anchor="middle" fill="#1E293B">MANILHA 30</text></svg>`),
  estaca2m: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#E8EEF5"/><g transform="rotate(-18 160 105)"><rect x="30" y="88" width="240" height="26" rx="4" fill="#94A3B8" stroke="#475569" stroke-width="4"/><polygon points="270,88 298,101 270,114" fill="#64748B" stroke="#475569" stroke-width="3"/><circle cx="72" cy="101" r="4" fill="#334155"/><circle cx="122" cy="101" r="4" fill="#334155"/><circle cx="172" cy="101" r="4" fill="#334155"/></g><text x="160" y="202" font-family="Arial,sans-serif" font-weight="bold" font-size="20" text-anchor="middle" fill="#1E293B">ESTACA 2M</text></svg>`),
  bloco14: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#E8EEF5"/><rect x="52" y="64" width="204" height="106" rx="6" fill="#94A3B8" stroke="#475569" stroke-width="4"/><polygon points="52,64 84,42 288,42 256,64" fill="#CBD5E1" stroke="#475569" stroke-width="3"/><rect x="86" y="48" width="54" height="12" rx="3" fill="#475569"/><rect x="172" y="48" width="54" height="12" rx="3" fill="#475569"/><text x="160" y="202" font-family="Arial,sans-serif" font-weight="bold" font-size="20" text-anchor="middle" fill="#1E293B">BLOCO 14</text></svg>`),
  porta: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#FEF3C7"/><rect x="108" y="22" width="104" height="156" rx="4" fill="#B45309" stroke="#78350F" stroke-width="5"/><rect x="122" y="36" width="76" height="58" rx="3" fill="#D97706" stroke="#78350F" stroke-width="3"/><rect x="122" y="106" width="76" height="56" rx="3" fill="#D97706" stroke="#78350F" stroke-width="3"/><circle cx="196" cy="100" r="6" fill="#FDE68A" stroke="#78350F" stroke-width="2"/><text x="160" y="204" font-family="Arial,sans-serif" font-weight="bold" font-size="18" text-anchor="middle" fill="#78350F">PORTA 0,80 x 2,10</text></svg>`),
  janela: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#FEF3C7"/><rect x="66" y="32" width="188" height="140" rx="6" fill="#92400E" stroke="#451A03" stroke-width="5"/><rect x="82" y="48" width="72" height="108" fill="#BAE6FD" stroke="#78350F" stroke-width="4"/><rect x="166" y="48" width="72" height="108" fill="#BAE6FD" stroke="#78350F" stroke-width="4"/><line x1="82" y1="102" x2="154" y2="102" stroke="#78350F" stroke-width="4"/><line x1="166" y1="102" x2="238" y2="102" stroke="#78350F" stroke-width="4"/><text x="160" y="202" font-family="Arial,sans-serif" font-weight="bold" font-size="19" text-anchor="middle" fill="#78350F">JANELA MADEIRA</text></svg>`),
  aduela: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#FEF3C7"/><path d="M84,174 L84,32 L236,32 L236,174 L212,174 L212,56 L108,56 L108,174 Z" fill="#B45309" stroke="#78350F" stroke-width="4"/><text x="160" y="202" font-family="Arial,sans-serif" font-weight="bold" font-size="20" text-anchor="middle" fill="#78350F">ADUELA</text></svg>`),
  alisar: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#FEF3C7"/><rect x="52" y="54" width="216" height="24" rx="4" fill="#D97706" stroke="#78350F" stroke-width="4"/><rect x="52" y="92" width="216" height="24" rx="4" fill="#B45309" stroke="#78350F" stroke-width="4"/><rect x="52" y="130" width="216" height="24" rx="4" fill="#D97706" stroke="#78350F" stroke-width="4"/><text x="160" y="202" font-family="Arial,sans-serif" font-weight="bold" font-size="20" text-anchor="middle" fill="#78350F">ALISAR / GUARNICAO</text></svg>`),
  mesa: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#FEF3C7"/><rect x="44" y="64" width="232" height="24" rx="4" fill="#B45309" stroke="#78350F" stroke-width="4"/><rect x="64" y="88" width="22" height="88" fill="#92400E" stroke="#78350F" stroke-width="3"/><rect x="234" y="88" width="22" height="88" fill="#92400E" stroke="#78350F" stroke-width="3"/><rect x="86" y="88" width="148" height="14" fill="#78350F"/><text x="160" y="204" font-family="Arial,sans-serif" font-weight="bold" font-size="20" text-anchor="middle" fill="#78350F">MESA DE MADEIRA</text></svg>`),
  cadeira: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#FEF3C7"/><rect x="114" y="34" width="16" height="140" fill="#92400E" stroke="#78350F" stroke-width="3"/><rect x="190" y="34" width="16" height="80" fill="#92400E" stroke="#78350F" stroke-width="3"/><rect x="114" y="42" width="92" height="28" rx="3" fill="#B45309" stroke="#78350F" stroke-width="3"/><rect x="110" y="106" width="102" height="18" rx="3" fill="#D97706" stroke="#78350F" stroke-width="3"/><rect x="192" y="124" width="16" height="50" fill="#92400E" stroke="#78350F" stroke-width="3"/><text x="160" y="204" font-family="Arial,sans-serif" font-weight="bold" font-size="20" text-anchor="middle" fill="#78350F">CADEIRA MADEIRA</text></svg>`),
  banco: svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#FEF3C7"/><rect x="48" y="84" width="224" height="26" rx="5" fill="#B45309" stroke="#78350F" stroke-width="4"/><rect x="70" y="110" width="24" height="62" fill="#92400E" stroke="#78350F" stroke-width="3"/><rect x="226" y="110" width="24" height="62" fill="#92400E" stroke="#78350F" stroke-width="3"/><rect x="94" y="132" width="132" height="12" fill="#78350F"/><text x="160" y="204" font-family="Arial,sans-serif" font-weight="bold" font-size="20" text-anchor="middle" fill="#78350F">BANCO DE MADEIRA</text></svg>`)
};

export function createInitialDatabase() {
  const usuarios = [
    {
      id: 'usr_admin',
      nome: 'Administrador Geral',
      usuario: 'admin',
      senha: '123',
      perfil: ROLES.ADMIN,
      setor: 'AMBOS',
      ativo: true
    },
    {
      id: 'usr_patrao',
      nome: 'Diretoria / Patrão',
      usuario: 'patrao',
      senha: '123',
      perfil: ROLES.PATRAO,
      setor: 'AMBOS',
      ativo: true
    },
    {
      id: 'usr_conf',
      nome: 'Conferente',
      usuario: 'conferencia',
      senha: '123',
      perfil: ROLES.CONFERENCIA,
      setor: 'AMBOS',
      ativo: true
    },
    {
      id: 'usr_pre',
      nome: 'Produção Pré-Moldados',
      usuario: 'premoldados',
      senha: '123',
      perfil: ROLES.PRODUCAO,
      setor: SECTORS.PRE_MOLDADOS,
      ativo: true
    },
    {
      id: 'usr_mar',
      nome: 'Produção Marcenaria',
      usuario: 'marcenaria',
      senha: '123',
      perfil: ROLES.PRODUCAO,
      setor: SECTORS.MARCENARIA,
      ativo: true
    }
  ];

  return {
    version: 2,
    usuarios,
    produtos: [],
    setores: [
      { id: SECTORS.PRE_MOLDADOS, nome: 'Pré-Moldados' },
      { id: SECTORS.MARCENARIA, nome: 'Marcenaria' }
    ],
    producoes: [],
    quebras: [],
    conferencias: [],
    entradas: [],
    divergencias: [],
    historicoAlteracoes: [],
    notificacoes: [],
    processedOpIds: [],
    updatedAt: new Date().toISOString()
  };
}
