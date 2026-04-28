import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import { formatDKK, formatDate, formatNumber, formatPct } from '../utils/format';

const emptyForm = {
  fund_id: '',
  type: 'buy',
  date: new Date().toISOString().split('T')[0],
  shares: '',
  price_per_share: '',
  brokerage: '0',
  notes: '',
};

export default function Transactions() {
  const [activeTab, setActiveTab] = useState('transaktioner');
  const [transactions, setTransactions] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [filterFund, setFilterFund] = useState('');

  // Gevinst/Tab state
  const [gains, setGains] = useState(null);
  const [divSummary, setDivSummary] = useState([]);
  const [gainsLoading, setGainsLoading] = useState(false);
  const [gainsError, setGainsError] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');

  async function load() {
    try {
      const [txs, fs] = await Promise.all([api.getTransactions(), api.getFunds()]);
      setTransactions(txs);
      setFunds(fs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function loadGains() {
    setGainsLoading(true);
    setGainsError('');
    try {
      const [g, d] = await Promise.all([api.getGains(), api.getDividendSummary()]);
      setGains(g);
      setDivSummary(d);
    } catch (err) {
      setGainsError(err.message);
    } finally {
      setGainsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'gevinst' && !gains) loadGains();
  }, [activeTab]);

  function openAdd() {
    setEditTx(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(tx) {
    setEditTx(tx);
    setForm({
      fund_id: tx.fund_id,
      type: tx.type,
      date: tx.date,
      shares: tx.shares,
      price_per_share: tx.price_per_share,
      brokerage: tx.brokerage,
      notes: tx.notes ?? '',
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (editTx) {
        await api.updateTransaction(editTx.id, form);
      } else {
        await api.createTransaction(form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Slet denne transaktion?')) return;
    try {
      await api.deleteTransaction(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  const totalCost = form.shares && form.price_per_share
    ? (parseFloat(form.shares) * parseFloat(form.price_per_share) + parseFloat(form.brokerage || 0))
    : null;

  const filtered = filterFund
    ? transactions.filter((t) => t.fund_id === parseInt(filterFund))
    : transactions;

  if (loading) return <div className="text-gray-500 text-sm">Henter transaktioner...</div>;

  // Gevinst/Tab beregninger
  const gainsData = gains ? (() => {
    const { transactions: salg, summary, by_year } = gains;
    const divByYear = Object.fromEntries(divSummary.map((y) => [y.year, y]));
    const allYears = [...new Set([
      ...by_year.map((y) => y.year),
      ...divSummary.map((y) => y.year),
    ])].sort((a, b) => b.localeCompare(a));
    const totalNetDiv = divSummary.reduce((s, y) => s + y.total_net, 0);
    const totalCombined = summary.total_gain + totalNetDiv;
    const filteredSalg = selectedYear === 'all' ? salg : salg.filter((t) => t.date.startsWith(selectedYear));
    const filteredGain = filteredSalg.reduce((s, t) => s + t.gain, 0);
    return { salg, summary, by_year, divByYear, allYears, totalNetDiv, totalCombined, filteredSalg, filteredGain };
  })() : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transaktioner & Gevinst</h1>
        {activeTab === 'transaktioner' && (
          <button onClick={openAdd} className="btn-primary">+ Ny transaktion</button>
        )}
      </div>

      {/* Fane-skifter */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { id: 'transaktioner', label: 'Transaktioner' },
          { id: 'gevinst', label: 'Gevinst / Tab' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === TRANSAKTIONER === */}
      {activeTab === 'transaktioner' && (
        <>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <div className="mb-4 flex gap-3 items-center">
            <select
              className="input w-auto"
              value={filterFund}
              onChange={(e) => setFilterFund(e.target.value)}
            >
              <option value="">Alle fonde</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <span className="text-sm text-gray-400">{filtered.length} transaktioner</span>
          </div>

          <div className="card overflow-x-auto">
            {filtered.length === 0 ? (
              <p className="text-gray-400 text-sm">Ingen transaktioner endnu.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header text-left pb-3">Dato</th>
                    <th className="table-header text-left pb-3">Fond</th>
                    <th className="table-header text-center pb-3">Type</th>
                    <th className="table-header text-right pb-3">Antal</th>
                    <th className="table-header text-right pb-3">Kurs</th>
                    <th className="table-header text-right pb-3">Kurtage</th>
                    <th className="table-header text-right pb-3">Total</th>
                    <th className="table-header pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((tx) => {
                    const total = tx.shares * tx.price_per_share;
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="py-3">{formatDate(tx.date)}</td>
                        <td className="py-3">
                          <div className="font-medium">{tx.fund_name}</div>
                          <div className="text-xs text-gray-400">{tx.ticker}</div>
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              tx.type === 'buy'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {tx.type === 'buy' ? 'Køb' : 'Salg'}
                          </span>
                        </td>
                        <td className="py-3 text-right tabular-nums">{formatNumber(tx.shares)}</td>
                        <td className="py-3 text-right tabular-nums">{formatDKK(tx.price_per_share)}</td>
                        <td className="py-3 text-right tabular-nums text-gray-500">
                          {tx.brokerage > 0 ? formatDKK(tx.brokerage) : '–'}
                        </td>
                        <td className="py-3 text-right tabular-nums font-medium">{formatDKK(total)}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => openEdit(tx)}
                            className="text-xs text-sky-600 hover:text-sky-800 mr-3"
                          >
                            Rediger
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Slet
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* === GEVINST / TAB === */}
      {activeTab === 'gevinst' && (
        gainsLoading ? (
          <div className="text-gray-500 text-sm">Beregner gevinster...</div>
        ) : gainsError ? (
          <div className="text-red-600 text-sm">Fejl: {gainsError}</div>
        ) : gainsData && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="card">
                <p className="text-sm text-gray-500">Realiseret gevinst</p>
                <p className={`text-2xl font-bold mt-1 ${gainsData.summary.total_gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatDKK(gainsData.summary.total_gain)}
                </p>
                <p className="text-xs text-gray-400 mt-1">efter kurtage</p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-500">Netto udbytte</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">
                  {formatDKK(gainsData.totalNetDiv)}
                </p>
                <p className="text-xs text-gray-400 mt-1">efter skat</p>
              </div>
              <div className="card border-sky-200 bg-sky-50">
                <p className="text-sm text-sky-700 font-medium">Samlet afkast</p>
                <p className={`text-2xl font-bold mt-1 ${gainsData.totalCombined >= 0 ? 'text-sky-700' : 'text-red-600'}`}>
                  {formatDKK(gainsData.totalCombined)}
                </p>
                <p className="text-xs text-sky-500 mt-1">gevinst + netto udbytte</p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-500">Samlede provenu</p>
                <p className="text-2xl font-bold mt-1">{formatDKK(gainsData.summary.total_proceeds)}</p>
                <p className="text-xs text-gray-400 mt-1">fra salg</p>
              </div>
            </div>

            {gainsData.allYears.length > 0 && (
              <div className="card mb-6">
                <h2 className="text-base font-semibold mb-3">Årsvis oversigt (SKAT)</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-header text-left pb-3">År</th>
                      <th className="table-header text-right pb-3">Antal salg</th>
                      <th className="table-header text-right pb-3">Gevinst / Tab</th>
                      <th className="table-header text-right pb-3">Brutto udbytte</th>
                      <th className="table-header text-right pb-3">Udbytteskat</th>
                      <th className="table-header text-right pb-3">Netto udbytte</th>
                      <th className="table-header text-right pb-3">Samlet afkast</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {gainsData.allYears.map((year) => {
                      const gainRow = gainsData.by_year.find((y) => y.year === year);
                      const divRow  = gainsData.divByYear[year];
                      const totalGain  = gainRow?.total_gain ?? 0;
                      const totalGross = divRow?.total_gross ?? 0;
                      const totalTax   = divRow?.total_tax   ?? 0;
                      const totalNet   = divRow?.total_net   ?? 0;
                      const combined   = totalGain + totalNet;
                      return (
                        <tr key={year} className="hover:bg-gray-50">
                          <td className="py-3 font-medium">{year}</td>
                          <td className="py-3 text-right">{gainRow?.gains.length ?? 0}</td>
                          <td className="py-3 text-right tabular-nums">
                            <span className={totalGain >= 0 ? 'gain' : 'loss'}>{formatDKK(totalGain)}</span>
                          </td>
                          <td className="py-3 text-right tabular-nums">{totalGross > 0 ? formatDKK(totalGross) : '–'}</td>
                          <td className="py-3 text-right tabular-nums text-orange-600">
                            {totalTax > 0 ? `− ${formatDKK(totalTax)}` : '–'}
                          </td>
                          <td className="py-3 text-right tabular-nums text-emerald-600 font-medium">
                            {totalNet > 0 ? formatDKK(totalNet) : '–'}
                          </td>
                          <td className="py-3 text-right tabular-nums font-semibold">
                            <span className={combined >= 0 ? 'text-sky-700' : 'text-red-600'}>{formatDKK(combined)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Salgstransaktioner</h2>
                <div className="flex items-center gap-3">
                  {gainsData.filteredSalg.length > 0 && (
                    <span className={`text-sm font-medium ${gainsData.filteredGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {selectedYear !== 'all' ? `${selectedYear}: ` : ''}
                      {formatDKK(gainsData.filteredGain)}
                    </span>
                  )}
                  <select
                    className="input w-auto text-sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    <option value="all">Alle år</option>
                    {gainsData.allYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {gainsData.filteredSalg.length === 0 ? (
                <p className="text-gray-400 text-sm">Ingen salgstransaktioner.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-header text-left pb-3">Dato</th>
                      <th className="table-header text-left pb-3">Fond</th>
                      <th className="table-header text-right pb-3">Solgte aktier</th>
                      <th className="table-header text-right pb-3">Salgskurs</th>
                      <th className="table-header text-right pb-3">Gns. købskurs</th>
                      <th className="table-header text-right pb-3">Provenu</th>
                      <th className="table-header text-right pb-3">Kostpris</th>
                      <th className="table-header text-right pb-3">Gevinst / Tab</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {gainsData.filteredSalg.map((t) => (
                      <tr key={t.transaction_id} className="hover:bg-gray-50">
                        <td className="py-3">{formatDate(t.date)}</td>
                        <td className="py-3">
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-gray-400">{t.ticker}</div>
                        </td>
                        <td className="py-3 text-right tabular-nums">{formatNumber(t.shares_sold)}</td>
                        <td className="py-3 text-right tabular-nums">{formatDKK(t.sale_price)}</td>
                        <td className="py-3 text-right tabular-nums">{formatDKK(t.avg_cost_per_share)}</td>
                        <td className="py-3 text-right tabular-nums">{formatDKK(t.proceeds)}</td>
                        <td className="py-3 text-right tabular-nums">{formatDKK(t.cost_basis)}</td>
                        <td className="py-3 text-right tabular-nums">
                          <span className={t.gain >= 0 ? 'gain' : 'loss'}>{formatDKK(t.gain)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 card bg-amber-50 border-amber-200">
              <p className="text-sm text-amber-800 font-medium mb-1">SKAT – Gennemsnitsmetoden</p>
              <p className="text-sm text-amber-700">
                Gevinst/tab beregnes med gennemsnitsmetoden som krævet af SKAT.
                Gevinst/tab = (Salgskurs − Gns. købskurs) × Antal solgte aktier − Kurtage.
                Udbytte indberettes separat som aktieindkomst.
              </p>
            </div>
          </>
        )
      )}

      {showModal && (
        <Modal
          title={editTx ? 'Rediger transaktion' : 'Ny transaktion'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  disabled={!!editTx}
                >
                  <option value="buy">Køb</option>
                  <option value="sell">Salg</option>
                </select>
              </div>
              <div>
                <label className="label">Dato</label>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>

            {!editTx && (
              <div>
                <label className="label">Fond</label>
                <select
                  className="input"
                  value={form.fund_id}
                  onChange={(e) => setForm({ ...form, fund_id: e.target.value })}
                  required
                >
                  <option value="">Vælg fond...</option>
                  {funds.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.ticker})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Antal aktier</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  className="input"
                  value={form.shares}
                  onChange={(e) => setForm({ ...form, shares: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Kurs (DKK)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input"
                  value={form.price_per_share}
                  onChange={(e) => setForm({ ...form, price_per_share: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Kurtage (DKK)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.brokerage}
                onChange={(e) => setForm({ ...form, brokerage: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Noter (valgfrit)</label>
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="f.eks. månedsopsparing"
              />
            </div>

            {totalCost != null && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Handelsværdi:</span>
                  <span className="font-medium">
                    {formatDKK(parseFloat(form.shares) * parseFloat(form.price_per_share))}
                  </span>
                </div>
                {parseFloat(form.brokerage) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kurtage:</span>
                    <span>{formatDKK(parseFloat(form.brokerage))}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-gray-200 mt-2 pt-2">
                  <span>Total kostpris:</span>
                  <span>{formatDKK(totalCost)}</span>
                </div>
              </div>
            )}

            {formError && <p className="text-red-600 text-sm">{formError}</p>}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Gemmer...' : editTx ? 'Gem ændringer' : 'Tilføj transaktion'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                Annuller
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
