export function formatDKK(value) {
  if (value == null) return '–';
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value, decimals = 4) {
  if (value == null) return '–';
  return new Intl.NumberFormat('da-DK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPct(value) {
  if (value == null) return '–';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '–';
  return new Intl.DateTimeFormat('da-DK').format(new Date(dateStr));
}

export function monthName(month) {
  return new Intl.DateTimeFormat('da-DK', { month: 'long' }).format(
    new Date(2000, month - 1, 1)
  );
}
