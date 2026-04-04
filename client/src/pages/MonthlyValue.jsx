import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '../api';
import { formatDKK, monthName } from '../utils/format';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{formatDKK(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const COLORS = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export default function MonthlyValue() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taking, setTaking] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const data = await api.getMonthly();
      setSnapshots(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSnapshot() {
    setTaking(true);
    try {
      const res = await api.takeSnapshot();
      setMsg(res.message);
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Fejl: ' + err.message);
    } finally {
      setTaking(false);
    }
  }

  if (loading) return <div className="text-gray-500 text-sm">Henter månedlig data...</div>;
  if (error) return <div className="text-red-600 text-sm">Fejl: {error}</div>;

  // Byg graf-data — total pr. måned + pr. fond
  const fundNames = new Set();
  const chartData = snapshots
    .slice()
    .reverse()
    .map((s) => {
      const entry = {
        label: `${monthName(s.month)} ${s.year}`,
        total: s.total_value,
      };
      for (const f of s.funds) {
        fundNames.add(f.fund_name);
        entry[f.fund_name] = f.value;
      }
      return entry;
    });

  const fundList = [...fundNames];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Månedlig værdi</h1>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
          <button onClick={handleSnapshot} disabled={taking} className="btn-secondary">
            {taking ? 'Tager snapshot...' : '📸 Tag snapshot nu'}
          </button>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="card text-gray-400 text-sm">
          Ingen månedlige snapshots endnu. Snapshots tages automatisk den 1. i måneden,
          eller du kan tage et manuelt.
        </div>
      ) : (
        <>
          {/* Graf */}
          {chartData.length > 1 && (
            <div className="card mb-6">
              <h2 className="text-base font-semibold mb-4">Porteføljeudvikling</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat('da-DK', { notation: 'compact' }).format(v)
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="#0ea5e9"
                    fill="url(#totalGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabel */}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header text-left pb-3">Periode</th>
                  {fundList.map((f) => (
                    <th key={f} className="table-header text-right pb-3">{f}</th>
                  ))}
                  <th className="table-header text-right pb-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {snapshots.map((s) => {
                  const prevIdx = snapshots.indexOf(s) + 1;
                  const prev = snapshots[prevIdx];
                  const change = prev ? s.total_value - prev.total_value : null;

                  return (
                    <tr key={s.key} className="hover:bg-gray-50">
                      <td className="py-3 font-medium capitalize">
                        {monthName(s.month)} {s.year}
                      </td>
                      {fundList.map((f) => {
                        const fund = s.funds.find((sf) => sf.fund_name === f);
                        return (
                          <td key={f} className="py-3 text-right tabular-nums">
                            {fund ? formatDKK(fund.value) : '–'}
                          </td>
                        );
                      })}
                      <td className="py-3 text-right tabular-nums">
                        <div className="font-semibold">{formatDKK(s.total_value)}</div>
                        {change != null && (
                          <div className={`text-xs ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {change >= 0 ? '+' : ''}{formatDKK(change)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
