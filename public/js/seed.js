import { SECTORS, ROLES, PROD_STATUS } from './logic.js';
import { getLocalDateStr, addDays } from './utils.js';

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

export function createInitialDatabase(refDate = new Date()) {
  const hoje = getLocalDateStr(refDate);
  const ontem = addDays(hoje, -1);
  const doisDias = addDays(hoje, -2);

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
      nome: 'Carlos Conferente',
      usuario: 'conferencia',
      senha: '123',
      perfil: ROLES.CONFERENCIA,
      setor: 'AMBOS',
      ativo: true
    },
    {
      id: 'usr_pre',
      nome: 'João (Pré-Moldados)',
      usuario: 'premoldados',
      senha: '123',
      perfil: ROLES.PRODUCAO,
      setor: SECTORS.PRE_MOLDADOS,
      ativo: true
    },
    {
      id: 'usr_mar',
      nome: 'Marcos (Marcenaria)',
      usuario: 'marcenaria',
      senha: '123',
      perfil: ROLES.PRODUCAO,
      setor: SECTORS.MARCENARIA,
      ativo: true
    }
  ];

  const produtos = [
    {
      id: 'prd_canaleta14',
      nome: 'Canaleta 14',
      setor: SECTORS.PRE_MOLDADOS,
      unidade: 'UN',
      codigo: 'PM001',
      descricao: 'Canaleta de concreto estrutural 14cm',
      foto: PRODUCT_PHOTOS.canaleta14,
      ativo: true
    },
    {
      id: 'prd_canaleta19',
      nome: 'Canaleta 19',
      setor: SECTORS.PRE_MOLDADOS,
      unidade: 'UN',
      codigo: 'PM002',
      descricao: 'Canaleta de concreto estrutural 19cm',
      foto: PRODUCT_PHOTOS.canaleta19,
      ativo: true
    },
    {
      id: 'prd_manilha30',
      nome: 'Manilha 30',
      setor: SECTORS.PRE_MOLDADOS,
      unidade: 'UN',
      codigo: 'PM003',
      descricao: 'Manilha de concreto DN 300mm',
      foto: PRODUCT_PHOTOS.manilha30,
      ativo: true
    },
    {
      id: 'prd_estaca2m',
      nome: 'Estaca 2M',
      setor: SECTORS.PRE_MOLDADOS,
      unidade: 'UN',
      codigo: 'PM004',
      descricao: 'Mourão / Estaca pré-moldada 2 metros',
      foto: PRODUCT_PHOTOS.estaca2m,
      ativo: true
    },
    {
      id: 'prd_bloco14',
      nome: 'Bloco 14',
      setor: SECTORS.PRE_MOLDADOS,
      unidade: 'UN',
      codigo: 'PM005',
      descricao: 'Bloco de concreto 14x19x39',
      foto: PRODUCT_PHOTOS.bloco14,
      ativo: true
    },
    {
      id: 'prd_porta080',
      nome: 'Porta 0,80 x 2,10',
      setor: SECTORS.MARCENARIA,
      unidade: 'UN',
      codigo: 'MC001',
      descricao: 'Porta de madeira maciça 0,80 x 2,10m',
      foto: PRODUCT_PHOTOS.porta,
      ativo: true
    },
    {
      id: 'prd_janela',
      nome: 'Janela de Madeira',
      setor: SECTORS.MARCENARIA,
      unidade: 'UN',
      codigo: 'MC002',
      descricao: 'Janela completa em madeira de lei',
      foto: PRODUCT_PHOTOS.janela,
      ativo: true
    },
    {
      id: 'prd_aduela',
      nome: 'Aduela',
      setor: SECTORS.MARCENARIA,
      unidade: 'JOGO',
      codigo: 'MC003',
      descricao: 'Jogo de aduela / marco para porta',
      foto: PRODUCT_PHOTOS.aduela,
      ativo: true
    },
    {
      id: 'prd_alisar',
      nome: 'Alisar',
      setor: SECTORS.MARCENARIA,
      unidade: 'JOGO',
      codigo: 'MC004',
      descricao: 'Jogo de alisar / guarnição',
      foto: PRODUCT_PHOTOS.alisar,
      ativo: true
    },
    {
      id: 'prd_mesa',
      nome: 'Mesa de Madeira',
      setor: SECTORS.MARCENARIA,
      unidade: 'UN',
      codigo: 'MC005',
      descricao: 'Mesa rústica em madeira tratada',
      foto: PRODUCT_PHOTOS.mesa,
      ativo: true
    },
    {
      id: 'prd_cadeira',
      nome: 'Cadeira de Madeira',
      setor: SECTORS.MARCENARIA,
      unidade: 'UN',
      codigo: 'MC006',
      descricao: 'Cadeira reforçada em madeira',
      foto: PRODUCT_PHOTOS.cadeira,
      ativo: true
    },
    {
      id: 'prd_banco',
      nome: 'Banco de Madeira',
      setor: SECTORS.MARCENARIA,
      unidade: 'UN',
      codigo: 'MC007',
      descricao: 'Banco de jardim/varanda em madeira',
      foto: PRODUCT_PHOTOS.banco,
      ativo: true
    }
  ];

  const producoes = [
    {
      id: 'reg_hoje_1',
      produtoId: 'prd_canaleta14',
      setor: SECTORS.PRE_MOLDADOS,
      quantidade: 120,
      quantidadeQuebrada: 8,
      quantidadeAproveitavel: 112,
      quantidadeConferida: 112,
      data: hoje,
      hora: '08:40',
      usuarioId: 'usr_pre',
      criadoPorId: 'usr_pre',
      status: PROD_STATUS.ENTRADA_REALIZADA,
      conferidoPorId: 'usr_conf',
      conferidoData: hoje,
      conferidoHora: '10:15',
      entradaData: hoje,
      entradaHora: '10:30',
      entradaUsuarioId: 'usr_conf',
      origem: 'manual'
    },
    {
      id: 'reg_hoje_2',
      produtoId: 'prd_manilha30',
      setor: SECTORS.PRE_MOLDADOS,
      quantidade: 25,
      quantidadeQuebrada: 0,
      quantidadeAproveitavel: 25,
      quantidadeConferida: null,
      data: hoje,
      hora: '09:50',
      usuarioId: 'usr_pre',
      criadoPorId: 'usr_pre',
      status: PROD_STATUS.PRODUZIDO,
      origem: 'manual'
    },
    {
      id: 'reg_hoje_3',
      produtoId: 'prd_estaca2m',
      setor: SECTORS.PRE_MOLDADOS,
      quantidade: 50,
      quantidadeQuebrada: 2,
      quantidadeAproveitavel: 48,
      quantidadeConferida: 48,
      data: hoje,
      hora: '11:10',
      usuarioId: 'usr_pre',
      criadoPorId: 'usr_pre',
      status: PROD_STATUS.ENTRADA_REALIZADA,
      conferidoPorId: 'usr_conf',
      conferidoData: hoje,
      conferidoHora: '13:20',
      entradaData: hoje,
      entradaHora: '13:25',
      entradaUsuarioId: 'usr_conf',
      origem: 'manual'
    },
    {
      id: 'reg_hoje_4',
      produtoId: 'prd_porta080',
      setor: SECTORS.MARCENARIA,
      quantidade: 8,
      quantidadeQuebrada: 0,
      quantidadeAproveitavel: 8,
      quantidadeConferida: 8,
      data: hoje,
      hora: '10:05',
      usuarioId: 'usr_mar',
      criadoPorId: 'usr_mar',
      status: PROD_STATUS.ENTRADA_REALIZADA,
      conferidoPorId: 'usr_conf',
      conferidoData: hoje,
      conferidoHora: '14:00',
      entradaData: hoje,
      entradaHora: '14:10',
      entradaUsuarioId: 'usr_conf',
      origem: 'manual'
    },
    {
      id: 'reg_hoje_5',
      produtoId: 'prd_mesa',
      setor: SECTORS.MARCENARIA,
      quantidade: 3,
      quantidadeQuebrada: 0,
      quantidadeAproveitavel: 3,
      quantidadeConferida: 3,
      data: hoje,
      hora: '14:20',
      usuarioId: 'usr_mar',
      criadoPorId: 'usr_mar',
      status: PROD_STATUS.CONFERIDO,
      conferidoPorId: 'usr_conf',
      conferidoData: hoje,
      conferidoHora: '15:10',
      origem: 'manual'
    },
    {
      id: 'reg_ontem_1',
      produtoId: 'prd_canaleta19',
      setor: SECTORS.PRE_MOLDADOS,
      quantidade: 180,
      quantidadeQuebrada: 6,
      quantidadeAproveitavel: 174,
      quantidadeConferida: 174,
      data: ontem,
      hora: '16:10',
      usuarioId: 'usr_pre',
      criadoPorId: 'usr_pre',
      status: PROD_STATUS.ENTRADA_REALIZADA,
      conferidoPorId: 'usr_conf',
      conferidoData: ontem,
      conferidoHora: '17:00',
      entradaData: ontem,
      entradaHora: '17:15',
      entradaUsuarioId: 'usr_conf',
      origem: 'manual'
    },
    {
      id: 'reg_ontem_2',
      produtoId: 'prd_aduela',
      setor: SECTORS.MARCENARIA,
      quantidade: 14,
      quantidadeQuebrada: 0,
      quantidadeAproveitavel: 14,
      quantidadeConferida: 14,
      data: ontem,
      hora: '15:30',
      usuarioId: 'usr_mar',
      criadoPorId: 'usr_mar',
      status: PROD_STATUS.ENTRADA_REALIZADA,
      conferidoPorId: 'usr_conf',
      conferidoData: ontem,
      conferidoHora: '16:50',
      entradaData: ontem,
      entradaHora: '17:10',
      entradaUsuarioId: 'usr_conf',
      origem: 'manual'
    },
    {
      id: 'reg_2dias_1',
      produtoId: 'prd_bloco14',
      setor: SECTORS.PRE_MOLDADOS,
      quantidade: 320,
      quantidadeQuebrada: 10,
      quantidadeAproveitavel: 310,
      quantidadeConferida: 310,
      data: doisDias,
      hora: '16:40',
      usuarioId: 'usr_pre',
      criadoPorId: 'usr_pre',
      status: PROD_STATUS.ENTRADA_REALIZADA,
      conferidoPorId: 'usr_conf',
      conferidoData: doisDias,
      conferidoHora: '17:20',
      entradaData: doisDias,
      entradaHora: '17:35',
      entradaUsuarioId: 'usr_conf',
      origem: 'manual'
    }
  ];

  const quebras = [
    {
      id: 'qbr_1',
      producaoId: 'reg_hoje_1',
      produtoId: 'prd_canaleta14',
      quantidadeProduzida: 120,
      quantidade: 8,
      quantidadeAproveitavel: 112,
      motivo: 'Desenforma / canto quebrado',
      usuarioId: 'usr_pre',
      data: hoje,
      hora: '09:15'
    },
    {
      id: 'qbr_2',
      producaoId: 'reg_hoje_3',
      produtoId: 'prd_estaca2m',
      quantidadeProduzida: 50,
      quantidade: 2,
      quantidadeAproveitavel: 48,
      motivo: 'Trinca no transporte interno',
      usuarioId: 'usr_pre',
      data: hoje,
      hora: '11:40'
    },
    {
      id: 'qbr_3',
      producaoId: 'reg_ontem_1',
      produtoId: 'prd_canaleta19',
      quantidadeProduzida: 180,
      quantidade: 6,
      quantidadeAproveitavel: 174,
      motivo: 'Desenforma',
      usuarioId: 'usr_pre',
      data: ontem,
      hora: '16:30'
    }
  ];

  const entradas = [
    {
      id: 'ent_1',
      produtoId: 'prd_canaleta14',
      producaoId: 'reg_hoje_1',
      quantidade: 112,
      usuarioId: 'usr_conf',
      data: hoje,
      hora: '10:30'
    },
    {
      id: 'ent_2',
      produtoId: 'prd_estaca2m',
      producaoId: 'reg_hoje_3',
      quantidade: 48,
      usuarioId: 'usr_conf',
      data: hoje,
      hora: '13:25'
    },
    {
      id: 'ent_3',
      produtoId: 'prd_porta080',
      producaoId: 'reg_hoje_4',
      quantidade: 8,
      usuarioId: 'usr_conf',
      data: hoje,
      hora: '14:10'
    },
    {
      id: 'ent_4',
      produtoId: 'prd_canaleta19',
      producaoId: 'reg_ontem_1',
      quantidade: 174,
      usuarioId: 'usr_conf',
      data: ontem,
      hora: '17:15'
    },
    {
      id: 'ent_5',
      produtoId: 'prd_aduela',
      producaoId: 'reg_ontem_2',
      quantidade: 14,
      usuarioId: 'usr_conf',
      data: ontem,
      hora: '17:10'
    },
    {
      id: 'ent_6',
      produtoId: 'prd_bloco14',
      producaoId: 'reg_2dias_1',
      quantidade: 310,
      usuarioId: 'usr_conf',
      data: doisDias,
      hora: '17:35'
    }
  ];

  const notificacoes = [
    {
      id: 'notif_1',
      tipo: 'AGUARDANDO_CONFERENCIA',
      titulo: '🔔 Produção aguardando conferência',
      mensagem: 'Manilha 30 — 25 UN (Pré-Moldados)',
      refId: 'reg_hoje_2',
      lida: false,
      criadaEm: new Date(refDate.getTime() - 3600000).toISOString()
    },
    {
      id: 'notif_2',
      tipo: 'ENTRADA_PENDENTE',
      titulo: '🔔 Produto com entrada pendente',
      mensagem: 'Mesa de Madeira — 3 UN conferidas, aguardando entrada no sistema',
      refId: 'reg_hoje_5',
      lida: false,
      criadaEm: new Date(refDate.getTime() - 1800000).toISOString()
    }
  ];

  return {
    version: 1,
    usuarios,
    produtos,
    setores: [
      { id: SECTORS.PRE_MOLDADOS, nome: 'Pré-Moldados' },
      { id: SECTORS.MARCENARIA, nome: 'Marcenaria' }
    ],
    producoes,
    quebras,
    conferencias: [],
    entradas,
    divergencias: [],
    historicoAlteracoes: [],
    notificacoes,
    processedOpIds: [],
    updatedAt: new Date().toISOString()
  };
}
