import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

export default function Funds() {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ticker: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  async function load() {
    try {
      const data = await api.getFunds();
      setFunds(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.createFund(form);
      setShowModal(false);
      setForm({ ticker: '', name: '' });
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Slet "${name}"? Dette kan kun gøres hvis der ingen transaktioner er.`)) return;
    try {
      await api.deleteFund(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="text-gray-500 text-sm">Henter fonde...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fonde</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Tilføj fond
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="card">
        {funds.length === 0 ? (
          <p className="text-gray-400 text-sm">
            Ingen fonde endnu. Tilføj din første investeringsforening.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header text-left pb-3">Ticker</th>
                <th className="table-header text-left pb-3">Navn</th>
                <th className="table-header text-left pb-3">Oprettet</th>
                <th className="table-header pb-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {funds.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="py-3 font-mono font-medium text-sky-700">{f.ticker}</td>
                  <td className="py-3">{f.name}</td>
                  <td className="py-3 text-gray-400">
                    {new Date(f.created_at).toLocaleDateString('da-DK')}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleDelete(f.id, f.name)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Slet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 card bg-sky-50 border-sky-200">
        <p className="text-sm text-sky-800 font-medium mb-1">Om tickers</p>
        <p className="text-sm text-sky-700">
          Danske investeringsforeninger handles på Nasdaq Copenhagen. Brug ticker-formatet med{' '}
          <code className="bg-sky-100 px-1 rounded">.CO</code> suffix, f.eks.{' '}
          <code className="bg-sky-100 px-1 rounded">SYDINV.CO</code> eller{' '}
          <code className="bg-sky-100 px-1 rounded">DKIGI.CO</code>.
        </p>
      </div>

      {showModal && (
        <Modal title="Tilføj ny fond" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Ticker (f.eks. SYDINV.CO)</label>
              <input
                className="input"
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                placeholder="TICKER.CO"
                required
              />
            </div>
            <div>
              <label className="label">Navn på fond</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="f.eks. Sydbank Invest Danmark"
                required
              />
            </div>
            {formError && <p className="text-red-600 text-sm">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Gemmer...' : 'Tilføj fond'}
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
