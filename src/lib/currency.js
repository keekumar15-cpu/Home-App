const CURRENCIES = {
  INR: { symbol: '\u20B9', locale: 'en-IN', decimals: 2 },
  IDR: { symbol: 'Rp', locale: 'id-ID', decimals: 0 },
  USD: { symbol: '$', locale: 'en-US', decimals: 2 },
  SGD: { symbol: 'S$', locale: 'en-SG', decimals: 2 },
  EUR: { symbol: '\u20AC', locale: 'de-DE', decimals: 2 },
};

const CURRENCY_CODES = Object.keys(CURRENCIES);

// Formats an amount with the correct symbol, thousands grouping, and decimal
// convention for its currency (IDR conventionally shows no decimal places).
function formatMoney(amount, currency) {
  const code = CURRENCIES[currency] ? currency : 'INR';
  const cfg = CURRENCIES[code];
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString(cfg.locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  });
  return `${cfg.symbol}${formatted}`;
}

// Groups an array of items by currency, summing whatever numeric fields
// getFields() returns for each item. Used so totals never add amounts from
// different currencies together — each currency gets its own subtotal.
function groupByCurrency(items, getCurrency, getFields) {
  const groups = {};
  for (const item of items) {
    const cur = CURRENCIES[getCurrency(item)] ? getCurrency(item) : 'INR';
    const fields = getFields(item);
    if (!groups[cur]) groups[cur] = {};
    for (const [k, v] of Object.entries(fields)) {
      groups[cur][k] = (groups[cur][k] || 0) + v;
    }
  }
  return groups;
}

module.exports = { CURRENCIES, CURRENCY_CODES, formatMoney, groupByCurrency };
