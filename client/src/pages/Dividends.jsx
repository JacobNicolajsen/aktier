import { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import { formatDKK, formatDate, formatNumber } from '../utils/format';

// Danske skattesatser for aktieindkomst 2026
const TAX_PRESETS = [
  { label: '27% – aktieindkomst (op til 67.500 kr)', value: 0.27 },
  { label: '42% – aktieindkomst (over 67.500 kr)', value: 0.42 },
  { label: 'Brugerdefineret', value: 'custom' },
];

const emptyForm = {
  fund_id: '',
  date: new Date().toISOString().split('T')[0],
  amount_per_share: '',
  shares: '',
  tax_rate: '0.27',
  notes: '',
};

function TaxBadge({ rate }) {
  return (
    <span className="inline-block bg-orange-100 text-orange-700 text-xs font-medium px-1.5 py-0.5 rounded">
      {(rate * 100).toFixed(0)}% skat
    </span>
  );
}

export default function Dividends() {
  const [dividends, setDividends] = useState([]);
  const [summary, setSummary] = useState([]);
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [customRate, setCustomRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [filterFund, setFilterFund] = useState('');

  async function load() {
    const [divs, sum, fs] = await Promise.all([
      api.getDividends(),
      api.getDividendSummary(),
      api.getFunds(),
    ]);
    setDividends(divs);
    setSummary(sum);
    setFunds(fs);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditItem(null);
    setForm(emptyForm);
    setCustomRate('');
    setFormError('');
    setShowModal(true);
  }

  function openEdit(item) {
    setEditItem(item);
    const knownRate = TAX_PRESETS.find((p) => p.value === item.tax_rate && p.value !== 'custom');
    setForm({
      fund_id: item.fund_id,
      date: item.date,
      amount_per_share: item.amount_per_share,
      shares: item.shares,
      tax_rate: knownRate ? String(item.tax_rate) : 'custom',
      notes: item.notes ?? '',
    });
    setCustomRate(knownRate ? '' : String(item.tax_rate * 100));
    setFormError('');
    setShowModal(true);
  }

  function getEffectiveTaxRate() {
    if (form.tax_rate === 'custom') {
      return customRate ? parseFloat(customRate) / 100 : 0;
    }
    return parseFloat(form.tax_rate);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const effectiveRate = getEffectiveTaxRate();
    const payload = { ...form, tax_rate: effectiveRate };

    setSubmitting(true);
    try {
      if (editItem) {
        await api.updateDividend(editItem.id, payload);
      } else {
        await api.createDividend(payload);
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
    if (!confirm('Slet dette udbytte?')) return;
    await api.deleteDividend(id);
    load();
  }

  // Preview-beregning i formularen
  const taxRate = getEffectiveTaxRate();
  const grossAmount =
    form.amount_per_share && form.shares
      ? parseFloat(form.amount_per_share) * parseFloat(form.shares)
      : null;
  const taxAmount = grossAmount != null ? grossAmount * taxRate : null;
  const netAmount = grossAmount != null ? grossAmount - taxAmount : null;

  const filtered = filterFund
    ? dividends.filter((d) => d.fund_id === parseInt(filterFund))
    : dividends;

  const filteredGross = filtered.reduce((s, d) => s + d.total_amount, 0);
  const filteredTax   = filtered.reduce((s, d) => s + d.tax_amount, 0);
  const filteredNet   = filtered.reduce((s, d) => s + d.net_amount, 0);

  if (loading) return <div className="text-gray-500 text-sm">Henter udbytter...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Udbytte</h1>
        <button onClick={openAdd} className="btn-primary">+ Registrer udbytte</button>
      </div>

      {/* Årsvis SKAT-oversigt */}
      {summary.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-base font-semibold mb-3">Årsvis oversigt (SKAT)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header text-left pb-3">År</th>
                <th className="table-header text-left pb-3">Fond</th>
                <th className="table-header text-right pb-3">Antal udbet.</th>
                <th className="table-header text-right pb-3">Brutto udbytte</th>
                <th className="table-header text-right pb-3">Skat</th>
                <th className="table-header text-right pb-3">Netto udbytte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summary.map((yr) =>
                yr.funds.map((f, i) => (
                  <tr key={`${yr.year}-${f.ticker}`} className="hover:bg-gray-50">
                    {i === 0 && (
                      <td className="py-3 font-semibold align-top" rowSpan={yr.funds.length}>
                        {yr.year}
                      </td>
                    )}
                    <td className="py-3">
                      <div>{f.fund_name}</div>
                      <div className="text-xs text-gray-400">{f.ticker}</div>
                    </td>
                    <td className="py-3 text-right">{f.count}</td>
                    <td className="py-3 text-right tabular-nums">{formatDKK(f.total_gross)}</td>
                    <td className="py-3 text-right tabular-nums text-orange-600">
                      − {formatDKK(f.total_tax)}
                    </td>
                    <td className="py-3 text-right tabular-nums font-medium text-emerald-600">
                      {formatDKK(f.total_net)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              {summary.map((yr) => (
                <tr key={yr.year} className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="py-2 font-bold text-sm">{yr.year} total</td>
                  <td colSpan={2}></td>
                  <td className="py-2 text-right font-semibold tabular-nums">{formatDKK(yr.total_gross)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-orange-600">
                    − {formatDKK(yr.total_tax)}
                  </td>
                  <td className="py-2 text-right font-bold tabular-nums text-emerald-700">
                    {formatDKK(yr.total_net)}
                  </td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}

      {/* Transaktionsliste */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <select
              className="input w-auto text-sm"
              value={filterFund}
              onChange={(e) => setFilterFund(e.target.value)}
            >
              <option value="">Alle fonde</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <span className="text-sm text-gray-400">{filtered.length} poster</span>
          </div>
          {filtered.length > 0 && (
            <div className="flex gap-4 text-sm">
              <span className="text-gray-500">Brutto: <span className="font-medium text-gray-800">{formatDKK(filteredGross)}</span></span>
              <span className="text-orange-600">Skat: <span className="font-medium">− {formatDKK(filteredTax)}</span></span>
              <span className="text-emerald-600">Netto: <span className="font-bold">{formatDKK(filteredNet)}</span></span>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm">Ingen udbytter registreret endnu.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header text-left pb-3">Dato</th>
                <th className="table-header text-left pb-3">Fond</th>
                <th className="table-header text-right pb-3">Aktier</th>
                <th className="table-header text-right pb-3">Udbytte/aktie</th>
                <th className="table-header text-right pb-3">Brutto</th>
                <th className="table-header text-right pb-3">Skat</th>
                <th className="table-header text-right pb-3">Netto</th>
                <th className="table-header text-left pb-3">Note</th>
                <th className="table-header pb-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="py-3">{formatDate(d.date)}</td>
                  <td className="py-3">
                    <div className="font-medium">{d.fund_name}</div>
                    <div className="text-xs text-gray-400">{d.ticker}</div>
                  </td>
                  <td className="py-3 text-right tabular-nums">{formatNumber(d.shares)}</td>
                  <td className="py-3 text-right tabular-nums">{formatDKK(d.amount_per_share)}</td>
                  <td className="py-3 text-right tabular-nums">{formatDKK(d.total_amount)}</td>
                  <td className="py-3 text-right tabular-nums">
                    <div className="text-orange-600">− {formatDKK(d.tax_amount)}</div>
                    <TaxBadge rate={d.tax_rate} />
                  </td>
                  <td className="py-3 text-right tabular-nums font-medium text-emerald-600">
                    {formatDKK(d.net_amount)}
                  </td>
                  <td className="py-3 text-gray-500 text-xs">{d.notes || '–'}</td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(d)} className="text-xs text-sky-600 hover:text-sky-800 mr-3">
                      Rediger
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="text-xs text-red-500 hover:text-red-700">
                      Slet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 card bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800 font-medium mb-1">SKAT – Udbytte fra investeringsforeninger 2026</p>
        <p className="text-sm text-amber-700">
          Udbytte beskattes typisk som <strong>aktieindkomst</strong>: 27% op til 67.500 kr, 42% over.
          Er det en rentebaseret fond, beskattes det som kapitalindkomst (marginalskattesats).
          Tjek din specifikke fonds SKATs-klassifikation.
        </p>
      </div>

      {showModal && (
        <Modal
          title={editItem ? 'Rediger udbytte' : 'Registrer udbytte'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editItem && (
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

            <div>
              <label className="label">Udbetalingsdato</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Udbytte pr. aktie (DKK)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  className="input"
                  value={form.amount_per_share}
                  onChange={(e) => setForm({ ...form, amount_per_share: e.target.value })}
                  required
                />
              </div>
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
            </div>

            <div>
              <label className="label">Skattesats</label>
              <select
                className="input"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
              >
                {TAX_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {form.tax_rate === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="input w-28"
                    placeholder="f.eks. 35"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    required
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              )}
            </div>

            {/* Preview */}
            {grossAmount != null && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Brutto udbytte:</span>
                  <span className="font-medium">{formatDKK(grossAmount)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Skat ({(taxRate * 100).toFixed(0)}%):</span>
                  <span>− {formatDKK(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-700 border-t border-gray-200 pt-2 mt-2">
                  <span>Netto udbytte:</span>
                  <span>{formatDKK(netAmount)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="label">Note (valgfrit)</label>
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="f.eks. halvårligt udbytte"
              />
            </div>

            {formError && <p className="text-red-600 text-sm">{formError}</p>}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Gemmer...' : editItem ? 'Gem ændringer' : 'Registrer'}
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
