import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatCard from '../components/StatCard';
import { formatDKK, formatPct, formatNumber } from '../utils/format';

export default function Dashboard() {
  const [holdings, setHoldings] = useState([]);
  const [gains, setGains] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getHoldings(), api.getGains()])
      .then(([h, g]) => {
        setHoldings(h);
        setGains(g);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 text-sm">Henter data...</div>;
  if (error) return <div className="text-red-600 text-sm">Fejl: {error}</div>;

  const totalValue = holdings.reduce((s, h) => s + (h.current_value ?? 0), 0);
  const totalCost = holdings.reduce((s, h) => s + h.total_cost, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const realizedGain = gains?.summary?.total_gain ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Porteføljeværdi" value={formatDKK(totalValue)} />
        <StatCard
          label="Urealiseret gevinst"
          value={formatDKK(totalGain)}
          sub={formatPct(totalGainPct)}
          positive={totalGain >= 0}
        />
        <StatCard
          label="Realiseret gevinst"
          value={formatDKK(realizedGain)}
          positive={realizedGain >= 0}
        />
        <StatCard label="Antal fonde" value={holdings.length} />
      </div>

      {/* Beholdningsoversigt */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Aktuel beholdning</h2>
          <Link to="/beholdning" className="text-sm text-sky-600 hover:underline">
            Se alle →
          </Link>
        </div>

        {holdings.length === 0 ? (
          <p className="text-gray-400 text-sm">
            Ingen beholdning endnu.{' '}
            <Link to="/transaktioner" className="text-sky-600 hover:underline">
              Tilføj din første transaktion
            </Link>
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header text-left pb-3">Fond</th>
                <th className="table-header text-right pb-3">Aktier</th>
                <th className="table-header text-right pb-3">Gns. kurs</th>
                <th className="table-header text-right pb-3">Aktuel kurs</th>
                <th className="table-header text-right pb-3">Værdi</th>
                <th className="table-header text-right pb-3">Gevinst</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {holdings.map((h) => (
                <tr key={h.fund_id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <div className="font-medium">{h.name}</div>
                    <div className="text-xs text-gray-400">{h.ticker}</div>
                  </td>
                  <td className="py-3 text-right tabular-nums">{formatNumber(h.shares)}</td>
                  <td className="py-3 text-right tabular-nums">{formatDKK(h.avg_cost_per_share)}</td>
                  <td className="py-3 text-right tabular-nums">
                    {h.current_price ? formatDKK(h.current_price) : '–'}
                  </td>
                  <td className="py-3 text-right tabular-nums font-medium">
                    {formatDKK(h.current_value)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {h.unrealized_gain != null ? (
                      <span className={h.unrealized_gain >= 0 ? 'gain' : 'loss'}>
                        {formatDKK(h.unrealized_gain)}{' '}
                        <span className="text-xs">({formatPct(h.unrealized_gain_pct)})</span>
                      </span>
                    ) : (
                      '–'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={4} className="py-3 font-semibold text-sm">Total</td>
                <td className="py-3 text-right font-bold tabular-nums">{formatDKK(totalValue)}</td>
                <td className="py-3 text-right tabular-nums">
                  <span className={totalGain >= 0 ? 'gain' : 'loss'}>
                    {formatDKK(totalGain)}{' '}
                    <span className="text-xs">({formatPct(totalGainPct)})</span>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
