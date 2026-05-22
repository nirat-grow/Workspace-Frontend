import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import logoImg from '../logo.png';

const FirstAdminPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/first-admin', { name, email, password, adminSecret, telegramId });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Setup failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img src={logoImg} alt="Hopefly" />
        </div>
        <p className="auth-subtitle">Welcome! Create the first administrator account.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="auth-field">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div className="auth-field">
            <label>Telegram Chat ID <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(Optional)</span></label>
            <input className="input" placeholder="e.g. 987654321 (Get via @GetIDBot)" value={telegramId} onChange={e => setTelegramId(e.target.value)} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '8px', lineHeight: '1.4', background: 'rgba(99, 102, 241, 0.05)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
              💡 <b>Tip:</b> For task notifications, send a <b>/start</b> message to <b>@my_metadesk_bot</b> on Telegram.
            </p>
          </div>
          <div className="auth-field">
            <label>Admin Secret Code <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(Required)</span></label>
            <input className="input" type="password" placeholder="Enter the secret code to create admin" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary auth-submit">Create Admin</button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default FirstAdminPage;
