import { useState, useEffect } from 'react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState(false); // første gang — sæt password

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setIsSetup(!d.configured));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (isSetup && password !== confirmPassword) {
      return setError('Passwords matcher ikke');
    }
    if (isSetup && password.length < 4) {
      return setError('Password skal være mindst 4 tegn');
    }

    setLoading(true);
    try {
      const endpoint = isSetup ? '/api/auth/setup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (isSetup) {
        // Efter setup — log ind automatisk
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.error);
        localStorage.setItem('aktier_token', loginData.token);
        onLogin();
      } else {
        localStorage.setItem('aktier_token', data.token);
        onLogin();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Aktie Portefølje</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {isSetup ? 'Opret dit password for at komme i gang' : 'Log ind for at fortsætte'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          {isSetup && (
            <div className="mb-5 p-3 bg-sky-50 border border-sky-200 rounded-lg">
              <p className="text-sm text-sky-700 font-medium">Første gang</p>
              <p className="text-xs text-sky-600 mt-0.5">Vælg et password til din portefølje.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{isSetup ? 'Vælg password' : 'Password'}</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
              />
            </div>

            {isSetup && (
              <div>
                <label className="label">Bekræft password</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? 'Vent...' : isSetup ? 'Opret password' : 'Log ind'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
