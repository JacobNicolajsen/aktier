const BASE = import.meta.env.BASE_URL + 'api';

function getToken() {
  return localStorage.getItem('aktier_token');
}

async function request(method, path, body) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token udløbet eller ugyldig — log ud
  if (res.status === 401) {
    localStorage.removeItem('aktier_token');
    window.location.reload();
    throw new Error('Session udløbet — log ind igen');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ukendt fejl');
  return data;
}

export const api = {
  // Fonde
  getFunds: () => request('GET', '/funds'),
  createFund: (body) => request('POST', '/funds', body),
  updateFund: (id, body) => request('PUT', `/funds/${id}`, body),
  deleteFund: (id) => request('DELETE', `/funds/${id}`),

  // Transaktioner
  getTransactions: (fund_id) =>
    request('GET', `/transactions${fund_id ? `?fund_id=${fund_id}` : ''}`),
  createTransaction: (body) => request('POST', '/transactions', body),
  updateTransaction: (id, body) => request('PUT', `/transactions/${id}`, body),
  deleteTransaction: (id) => request('DELETE', `/transactions/${id}`),

  // Beholdning
  getHoldings: () => request('GET', '/holdings'),

  // Gevinst/tab
  getGains: () => request('GET', '/gains'),

  // Månedlige snapshots
  getMonthly: () => request('GET', '/monthly'),
  takeSnapshot: (year, month) => request('POST', '/monthly/snapshot', { year, month }),

  // Kurser
  getPrices: () => request('GET', '/prices'),
  getPrice: (ticker) => request('GET', `/prices/${ticker}`),

  // Udbytte
  getDividends: (fund_id) =>
    request('GET', `/dividends${fund_id ? `?fund_id=${fund_id}` : ''}`),
  createDividend: (body) => request('POST', '/dividends', body),
  updateDividend: (id, body) => request('PUT', `/dividends/${id}`, body),
  deleteDividend: (id) => request('DELETE', `/dividends/${id}`),
  getDividendSummary: () => request('GET', '/dividends/summary/yearly'),

  // Backup
  createBackup: () => request('POST', '/backup'),

  // Password
  changePassword: (currentPassword, newPassword) =>
    request('POST', '/auth/change', { currentPassword, newPassword }),
};
