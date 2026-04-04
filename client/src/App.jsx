import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Holdings from './pages/Holdings';
import Transactions from './pages/Transactions';
import MonthlyValue from './pages/MonthlyValue';
import GainLoss from './pages/GainLoss';
import Funds from './pages/Funds';
import Dividends from './pages/Dividends';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('aktier_token'));

  function handleLogin() {
    setLoggedIn(true);
  }

  function handleLogout() {
    localStorage.removeItem('aktier_token');
    setLoggedIn(false);
  }

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/beholdning" element={<Holdings />} />
        <Route path="/transaktioner" element={<Transactions />} />
        <Route path="/maanedlig" element={<MonthlyValue />} />
        <Route path="/gevinst-tab" element={<GainLoss />} />
        <Route path="/udbytte" element={<Dividends />} />
        <Route path="/fonde" element={<Funds />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
