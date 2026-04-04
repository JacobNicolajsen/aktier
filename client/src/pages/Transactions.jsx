import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import { formatDKK, formatDate, formatNumber } from '../utils/format';

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transaktioner</h1>
        <button onClick={openAdd} className="btn-primary">+ Ny transaktion</button>
      </div>

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
