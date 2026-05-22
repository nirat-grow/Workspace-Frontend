import React, { useState } from 'react';
import api from '../api/axios';

const InviteForm = ({ workspaceId }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!workspaceId) return alert('No workspace selected');
    try {
      const res = await api.post('/invites', { email, role, workspaceId, message });
      setLink(`${window.location.origin}/register?token=${res.data.token}`);
      setEmail('');
      setMessage('');
      alert('Email sent successfully!');
    } catch (err) {
      alert('Failed to create invite');
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <span style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: 'bold' }}>Invite User</span>
      <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} />
        <select className="input" value={role} onChange={e => setRole(e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}>
          <option value="MEMBER">Member</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </select>
        <textarea 
          className="input" 
          placeholder="Personal message" 
          value={message} 
          onChange={e => setMessage(e.target.value)} 
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', height: '60px', resize: 'none' }}
        />
        <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem' }}>Send Invite via Gmail</button>
      </form>
      {link && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', wordBreak: 'break-all', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '5px' }}>
          {link}
        </div>
      )}
    </div>
  );
};

export default InviteForm;
