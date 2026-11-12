/**
 * Utilitários compartilhados (puros, sem dependência de DOM)
 */

export function generateId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalTimeStr(date = new Date()) {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

export function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatShortDateBR(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

export function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return getLocalDateStr(dt);
}

export function getMonthBounds(date = new Date(), offsetMonths = 0) {
  const start = new Date(date.getFullYear(), date.getMonth() + offsetMonths, 1);
  const end = new Date(date.getFullYear(), date.getMonth() + offsetMonths + 1, 0);
  return {
    start: getLocalDateStr(start),
    end: getLocalDateStr(end)
  };
}

export function formatNumber(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('pt-BR');
}

export function normalizeText(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.,\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PT_UNITS = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4,
  cinco: 5, seis: 6, meia: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14,
  quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19
};

const PT_TENS = {
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
  sessenta: 60, setenta: 70, oitenta: 80, noventa: 90
};

const PT_HUNDREDS = {
  cem: 100, cento: 100, duzentos: 200, duzentas: 200,
  trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400,
  quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600,
  setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800,
  novecentos: 900, novecentas: 900
};

/**
 * Converte palavras numéricas em português para dígitos antes da extração de quantidade.
 * Ex: "cento e vinte canaletas 14" -> "120 canaletas 14"
 */
export function replacePortugueseNumbers(normalizedText) {
  const tokens = normalizedText.split(' ');
  const out = [];
  let i = 0;

  while (i < tokens.length) {
    let acc = 0;
    let consumed = 0;
    let hasWordNum = false;

    // Look ahead for compound Portuguese number words like "cento e vinte e cinco" or "mil e duzentos"
    let j = i;
    while (j < tokens.length) {
      const t = tokens[j];
      if (t === 'e' && hasWordNum) {
        j++;
        continue;
      }
      if (t === 'mil') {
        acc = (acc || 1) * 1000;
        hasWordNum = true;
        consumed = j - i + 1;
        j++;
      } else if (PT_HUNDREDS[t] !== undefined) {
        acc += PT_HUNDREDS[t];
        hasWordNum = true;
        consumed = j - i + 1;
        j++;
      } else if (PT_TENS[t] !== undefined) {
        acc += PT_TENS[t];
        hasWordNum = true;
        consumed = j - i + 1;
        j++;
      } else if (PT_UNITS[t] !== undefined) {
        acc += PT_UNITS[t];
        hasWordNum = true;
        consumed = j - i + 1;
        j++;
      } else {
        break;
      }
    }

    if (hasWordNum && consumed > 0) {
      out.push(String(acc));
      i += consumed;
    } else {
      out.push(tokens[i]);
      i++;
    }
  }

  return out.join(' ');
}
