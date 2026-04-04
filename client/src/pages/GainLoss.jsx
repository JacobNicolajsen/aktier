import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDKK, formatDate, formatNumber } from '../utils/format';

export default function GainLoss() {
  const [data, setData] = useState(null);
  const [divSummary, setDivSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');

  useEffect(() => {
    Promise.all([api.getGains(), api.getDividendSummary()])
      .then(([gains, divs]) => {
        setData(gains);
        setDivSummary(divs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 text-sm">Beregner gevinster...</div>;
  if (error) return <div className="text-red-600 text-sm">Fejl: {error}</div>;

  const { transactions, summary, by_year } = data;

  // Slå udbytte-data op per år som et map
  const divByYear = Object.fromEntries(divSummary.map((y) => [y.year, y]));

  // Saml alle år fra både salg og udbytter
  const allYears = [...new Set([
    ...by_year.map((y) => y.year),
    ...divSummary.map((y) => y.year),
  ])].sort((a, b) => b.localeCompare(a));

  const totalNetDiv = divSummary.reduce((s, y) => s + y.total_net, 0);
  const totalCombined = summary.total_gain + totalNetDiv;

  const filtered = selectedYear === 'all'
    ? transactions
    : transactions.filter((t) => t.date.startsWith(selectedYear));

  const filteredGain = filtered.reduce((s, t) => s + t.gain, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gevinst / Tab</h1>

      {/* Totalkort */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">Realiseret gevinst</p>
          <p className={`text-2xl font-bold mt-1 ${summary.total_gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatDKK(summary.total_gain)}
          </p>
          <p className="text-xs text-gray-400 mt-1">efter kurtage</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Netto udbytte</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">
            {formatDKK(totalNetDiv)}
          </p>
          <p className="text-xs text-gray-400 mt-1">efter skat</p>
        </div>
        <div className="card border-sky-200 bg-sky-50">
          <p className="text-sm text-sky-700 font-medium">Samlet afkast</p>
          <p className={`text-2xl font-bold mt-1 ${totalCombined >= 0 ? 'text-sky-700' : 'text-red-600'}`}>
            {formatDKK(totalCombined)}
          </p>
          <p className="text-xs text-sky-500 mt-1">gevinst + netto udbytte</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Samlede provenu</p>
          <p className="text-2xl font-bold mt-1">{formatDKK(summary.total_proceeds)}</p>
          <p className="text-xs text-gray-400 mt-1">fra salg</p>
        </div>
      </div>

      {/* Årsvis SKAT-oversigt */}
      {allYears.length > 0 && (
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
              {allYears.map((year) => {
                const gainRow = by_year.find((y) => y.year === year);
                const divRow  = divByYear[year];
                const totalGain    = gainRow?.total_gain    ?? 0;
                const totalGross   = divRow?.total_gross    ?? 0;
                const totalTax     = divRow?.total_tax      ?? 0;
                const totalNet     = divRow?.total_net      ?? 0;
                const combined     = totalGain + totalNet;
                return (
                  <tr key={year} className="hover:bg-gray-50">
                    <td className="py-3 font-medium">{year}</td>
                    <td className="py-3 text-right">{gainRow?.gains.length ?? 0}</td>
                    <td className="py-3 text-right tabular-nums">
                      <span className={totalGain >= 0 ? 'gain' : 'loss'}>
                        {formatDKK(totalGain)}
                      </span>
                    </td>
                    <td className="py-3 text-right tabular-nums">{totalGross > 0 ? formatDKK(totalGross) : '–'}</td>
                    <td className="py-3 text-right tabular-nums text-orange-600">
                      {totalTax > 0 ? `− ${formatDKK(totalTax)}` : '–'}
                    </td>
                    <td className="py-3 text-right tabular-nums text-emerald-600 font-medium">
                      {totalNet > 0 ? formatDKK(totalNet) : '–'}
                    </td>
                    <td className="py-3 text-right tabular-nums font-semibold">
                      <span className={combined >= 0 ? 'text-sky-700' : 'text-red-600'}>
                        {formatDKK(combined)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detaljerede salgstransaktioner */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Salgstransaktioner</h2>
          <div className="flex items-center gap-3">
            {filtered.length > 0 && (
              <span className={`text-sm font-medium ${filteredGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {selectedYear !== 'all' ? `${selectedYear}: ` : ''}
                {formatDKK(filteredGain)}
              </span>
            )}
            <select
              className="input w-auto text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">Alle år</option>
              {allYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
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
              {filtered.map((t) => (
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
                    <span className={t.gain >= 0 ? 'gain' : 'loss'}>
                      {formatDKK(t.gain)}
                    </span>
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
    </div>
  );
}
