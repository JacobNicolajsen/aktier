import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDKK, formatPct, formatNumber } from '../utils/format';

export default function Holdings() {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await api.getHoldings();
      setHoldings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="text-gray-500 text-sm">Henter beholdning...</div>;
  if (error) return <div className="text-red-600 text-sm">Fejl: {error}</div>;

  const totalValue = holdings.reduce((s, h) => s + (h.current_value ?? 0), 0);
  const totalCost = holdings.reduce((s, h) => s + h.total_cost, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Beholdning</h1>
        <button onClick={refresh} disabled={refreshing} className="btn-secondary text-sm">
          {refreshing ? 'Opdaterer...' : '↻ Opdater kurser'}
        </button>
      </div>

      {holdings.length === 0 ? (
        <div className="card text-gray-400 text-sm">Ingen aktiv beholdning.</div>
      ) : (
        <>
          <div className="card mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header text-left pb-3">Fond</th>
                  <th className="table-header text-right pb-3">Antal aktier</th>
                  <th className="table-header text-right pb-3">Gns. købskurs</th>
                  <th className="table-header text-right pb-3">Samlet kostpris</th>
                  <th className="table-header text-right pb-3">Aktuel kurs</th>
                  <th className="table-header text-right pb-3">Aktuel værdi</th>
                  <th className="table-header text-right pb-3">Urealiseret gevinst</th>
                  <th className="table-header text-right pb-3">Andel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {holdings.map((h) => {
                  const pctOfPortfolio =
                    totalValue > 0 && h.current_value
                      ? (h.current_value / totalValue) * 100
                      : null;

                  return (
                    <tr key={h.fund_id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <div className="font-medium">{h.name}</div>
                        <div className="text-xs text-gray-400">{h.ticker}</div>
                      </td>
                      <td className="py-3 text-right tabular-nums">{formatNumber(h.shares)}</td>
                      <td className="py-3 text-right tabular-nums">
                        {formatDKK(h.avg_cost_per_share)}
                      </td>
                      <td className="py-3 text-right tabular-nums">{formatDKK(h.total_cost)}</td>
                      <td className="py-3 text-right tabular-nums">
                        {h.current_price ? formatDKK(h.current_price) : '–'}
                      </td>
                      <td className="py-3 text-right tabular-nums font-medium">
                        {formatDKK(h.current_value)}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {h.unrealized_gain != null ? (
                          <div>
                            <span className={h.unrealized_gain >= 0 ? 'gain' : 'loss'}>
                              {formatDKK(h.unrealized_gain)}
                            </span>
                            <div className={`text-xs ${h.unrealized_gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {formatPct(h.unrealized_gain_pct)}
                            </div>
                          </div>
                        ) : '–'}
                      </td>
                      <td className="py-3 text-right tabular-nums text-gray-500">
                        {pctOfPortfolio != null ? `${pctOfPortfolio.toFixed(1)}%` : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="py-3 font-semibold" colSpan={3}>Total</td>
                  <td className="py-3 text-right font-semibold tabular-nums">{formatDKK(totalCost)}</td>
                  <td></td>
                  <td className="py-3 text-right font-bold tabular-nums">{formatDKK(totalValue)}</td>
                  <td className="py-3 text-right tabular-nums">
                    <span className={totalGain >= 0 ? 'gain' : 'loss'}>
                      {formatDKK(totalGain)}
                    </span>
                    <div className={`text-xs ${totalGain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatPct(totalGainPct)}
                    </div>
                  </td>
                  <td className="py-3 text-right text-gray-500">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            Kurser opdateres automatisk. Klik "Opdater kurser" for at hente seneste priser.
          </p>
        </>
      )}
    </div>
  );
}
