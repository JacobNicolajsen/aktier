export default function StatCard({ label, value, sub, positive }) {
  const colorClass =
    positive === true ? 'text-emerald-600' : positive === false ? 'text-red-600' : 'text-gray-900';

  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
