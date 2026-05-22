import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import logoImg from '../logo.png';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('Frontend');
  const [telegramId, setTelegramId] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  // Forgot Password states
  const [forgotState, setForgotState] = useState(null); // null | 'request' | 'reset'
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inviteToken = params.get('token');
    if (inviteToken) {
      setToken(inviteToken);
      setIsLogin(false);
      api.get(`/invites/${inviteToken}`).then(res => {
        setEmail(res.data.email);
      }).catch(() => {
        setError('Invalid or expired invite token');
      });
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        login(res.data.token, res.data.user);
        navigate('/');
      } else {
        const res = await api.post('/auth/register', { token, name, password, designation, telegramId });
        login(res.data.token, res.data.user);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
      setForgotState('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request OTP');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await api.post('/auth/reset-password', { email, otp, newPassword });
      setMessage(res.data.message);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setForgotState(null);
        setMessage('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const hasInviteToken = !!new URLSearchParams(location.search).get('token');

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img src={logoImg} alt="Hopefly" />
        </div>

        {forgotState ? (
          forgotState === 'request' ? (
            <>
              <div className="auth-tabs" style={{ justifyContent: 'center' }}>
                <button type="button" className="auth-tab active" style={{ cursor: 'default' }}>Forgot Password</button>
              </div>

              {error && <div className="auth-error">{error}</div>}
              {message && <div style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', border: '1px solid rgba(76, 175, 80, 0.3)', textAlign: 'center' }}>{message}</div>}

              <form className="auth-form" onSubmit={handleRequestOTP}>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center', lineHeight: '1.4' }}>
                  Enter your registered email address below, and we will send you a One-Time Password (OTP) to reset your password.
                </p>
                <div className="auth-field">
                  <label>Email Address</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="e.g. yourname@gmail.com" />
                </div>
                <button type="submit" className="btn btn-primary auth-submit">Send OTP</button>

                <div className="auth-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                  <span onClick={() => { setForgotState(null); setError(''); setMessage(''); }} style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                    ← Back to Sign In
                  </span>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="auth-tabs" style={{ justifyContent: 'center' }}>
                <button type="button" className="auth-tab active" style={{ cursor: 'default' }}>Verify & Reset</button>
              </div>

              {error && <div className="auth-error">{error}</div>}
              {message && <div style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', border: '1px solid rgba(76, 175, 80, 0.3)', textAlign: 'center' }}>{message}</div>}

              <form className="auth-form" onSubmit={handleResetPassword}>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center', lineHeight: '1.4' }}>
                  We've sent a 6-digit One-Time Password (OTP) to <strong>{email}</strong>. Enter it below with your new password.
                </p>

                <div className="auth-field">
                  <label>6-Digit OTP Code</label>
                  <input className="input" type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} required placeholder="e.g. 123456" style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }} />
                </div>

                <div className="auth-field">
                  <label>New Password</label>
                  <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="••••••••" />
                </div>

                <div className="auth-field">
                  <label>Confirm New Password</label>
                  <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
                </div>

                <button type="submit" className="btn btn-primary auth-submit">Reset Password</button>

                <div className="auth-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span onClick={() => { setForgotState('request'); setError(''); setMessage(''); }} style={{ color: 'var(--text-light)', cursor: 'pointer', fontSize: '0.9rem' }}>
                    Resend OTP
                  </span>
                  <span onClick={() => { setForgotState(null); setError(''); setMessage(''); }} style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                    Back to Sign In
                  </span>
                </div>
              </form>
            </>
          )
        ) : (
          <>
            <div className="auth-tabs">
              <button type="button" className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Login</button>
              <button type="button" className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Register</button>
            </div>

            {error && <div className="auth-error">{error}</div>}
            {message && <div style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', border: '1px solid rgba(76, 175, 80, 0.3)', textAlign: 'center' }}>{message}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="auth-field">
                    <label>Invite Token</label>
                    <input className="input" value={token} onChange={e => setToken(e.target.value)} required={!isLogin} disabled={hasInviteToken} />
                  </div>
                  <div className="auth-field">
                    <label>Full Name</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)} required={!isLogin} />
                  </div>
                  <div className="auth-field">
                    <label>Designation (Role)</label>
                    <select className="input" value={designation} onChange={e => setDesignation(e.target.value)} required={!isLogin}>
                      <option value="Frontend">Frontend Developer</option>
                      <option value="Backend">Backend Developer</option>
                      <option value="FullStack">Full Stack Developer</option>
                      <option value="Flutter">Flutter Developer</option>
                      <option value="React">React Developer</option>
                      <option value="Node.js">Node.js Developer</option>
                      <option value="Python">Python Developer</option>
                      <option value="Unity">Unity Developer</option>
                      <option value="DevOps">DevOps Engineer</option>
                      <option value="UI/UX">UI/UX Designer</option>
                      <option value="QA">QA Engineer</option>
                      <option value="ProjectManager">Project Manager</option>
                      <option value="DataScience">Data Scientist</option>
                      <option value="SystemAdmin">System Administrator</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="auth-field">
                    <label>Telegram Chat ID <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(Optional)</span></label>
                    <input className="input" placeholder="e.g. 987654321 (Get via @GetIDBot)" value={telegramId} onChange={e => setTelegramId(e.target.value)} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '8px', lineHeight: '1.4', background: 'rgba(99, 102, 241, 0.05)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                      💡 <b>Tip:</b> For task notifications, send a <b>/start</b> message to <b>@my_metadesk_bot</b> on Telegram.
                    </p>
                  </div>
                </>
              )}
              <div className="auth-field">
                <label>Email</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!isLogin && hasInviteToken} />
              </div>
              <div className="auth-field">
                <label>Password</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary auth-submit">{isLogin ? 'Sign In' : 'Complete Registration'}</button>
            </form>

            {isLogin && (
              <div className="auth-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '1.5rem' }}>
                <span onClick={() => { setForgotState('request'); setError(''); setMessage(''); }} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>
                  Forgot Password?
                </span>
                <a href="/setup">Create Admin</a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
