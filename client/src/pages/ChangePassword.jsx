import { useState } from 'react';
import { api } from '../api';

export default function ChangePassword({ onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) {
      return setError('Nye passwords matcher ikke');
    }
    if (form.newPassword.length < 4) {
      return setError('Nyt password skal være mindst 4 tegn');
    }
    setLoading(true);
    try {
      await api.changePassword(form.currentPassword, form.newPassword);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Skift password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">
          {success ? (
            <p className="text-emerald-600 text-sm font-medium text-center py-4">✓ Password skiftet</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nuværende password</label>
                <input type="password" className="input" value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
              </div>
              <div>
                <label className="label">Nyt password</label>
                <input type="password" className="input" value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
              </div>
              <div>
                <label className="label">Bekræft nyt password</label>
                <input type="password" className="input" value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Gemmer...' : 'Skift password'}
                </button>
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuller</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
