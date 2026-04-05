import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';
import ChangePassword from '../pages/ChangePassword';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/beholdning', label: 'Beholdning', icon: '💼' },
  { to: '/transaktioner', label: 'Transaktioner', icon: '🔄' },
  { to: '/maanedlig', label: 'Månedlig værdi', icon: '📅' },
  { to: '/gevinst-tab', label: 'Gevinst / Tab', icon: '📈' },
  { to: '/udbytte', label: 'Udbytte', icon: '💰' },
  { to: '/fonde', label: 'Fonde', icon: '🏦' },
];

export default function Layout({ children, onLogout }) {
  const [backupMsg, setBackupMsg] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  async function handleBackup() {
    try {
      const res = await api.createBackup();
      setBackupMsg(res.message);
      setTimeout(() => setBackupMsg(''), 3000);
    } catch (err) {
      setBackupMsg('Fejl: ' + err.message);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-14' : 'w-56'} bg-gray-900 text-white flex flex-col fixed h-full z-10 transition-all duration-200`}>
        <div className={`flex items-center border-b border-gray-700 ${collapsed ? 'justify-center px-0 py-4' : 'px-5 py-6'}`}>
          {!collapsed && (
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">Aktie Portefølje</h1>
              <p className="text-xs text-gray-400 mt-0.5">Investeringsforeninger</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors flex-shrink-0"
            title={collapsed ? 'Udvid sidebar' : 'Skjul sidebar'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span>{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        <div className={`px-2 py-4 border-t border-gray-700 space-y-1`}>
          <button
            onClick={handleBackup}
            className={`w-full text-xs text-gray-400 hover:text-white py-2 px-3 rounded hover:bg-gray-800 transition-colors ${collapsed ? 'flex justify-center' : 'text-left'}`}
            title={collapsed ? 'Manuel backup' : undefined}
          >
            💾{!collapsed && ' Manuel backup'}
          </button>
          {backupMsg && !collapsed && (
            <p className="text-xs text-emerald-400 px-1">{backupMsg}</p>
          )}
          <button
            onClick={() => setShowChangePassword(true)}
            className={`w-full text-xs text-gray-400 hover:text-white py-2 px-3 rounded hover:bg-gray-800 transition-colors ${collapsed ? 'flex justify-center' : 'text-left'}`}
            title={collapsed ? 'Skift password' : undefined}
          >
            🔑{!collapsed && ' Skift password'}
          </button>
          <button
            onClick={onLogout}
            className={`w-full text-xs text-gray-400 hover:text-red-400 py-2 px-3 rounded hover:bg-gray-800 transition-colors ${collapsed ? 'flex justify-center' : 'text-left'}`}
            title={collapsed ? 'Log ud' : undefined}
          >
            🚪{!collapsed && ' Log ud'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`${collapsed ? 'ml-14' : 'ml-56'} flex-1 p-8 min-h-screen transition-all duration-200`}>
        {children}
      </main>

      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}
