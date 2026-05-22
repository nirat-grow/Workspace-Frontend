import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const InvitePage = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [message, setMessage] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const workspaceId = user?.workspaces?.[0]?.workspaceId;

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const fetchInviteHistory = async () => {
    if (!workspaceId) return;
    try {
      const res = await api.get(`/invites?workspaceId=${workspaceId}`);
      setInvites(res.data || []);
    } catch (err) {
      console.error('Error fetching invite history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchInviteHistory();
    }
  }, [workspaceId]);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!workspaceId) {
      showToast('No active workspace found.', 'error');
      return;
    }

    setIsInviting(true);
    try {
      await api.post('/invites', {
        email,
        role,
        workspaceId,
        message
      });
      showToast('Invitation successfully sent!', 'success');
      setEmail('');
      setMessage('');
      setRole('MEMBER');
      fetchInviteHistory();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to send invitation.', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = (token) => {
    const inviteLink = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    showToast('Invite link copied to clipboard!', 'success');
  };

  const getStatusBadge = (invite) => {
    if (invite.used) {
      return (
        <span style={{
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#10b981',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          Used
        </span>
      );
    }
    
    const isExpired = new Date() > new Date(invite.expiresAt);
    if (isExpired) {
      return (
        <span style={{
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          Expired
        </span>
      );
    }

    return (
      <span style={{
        background: 'rgba(245, 158, 11, 0.1)',
        color: '#f59e0b',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        border: '1px solid rgba(245, 158, 11, 0.2)'
      }}>
        Pending
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', paddingBottom: '4rem', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
          ✉️ Invite Team Members
        </h1>
        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
          Send email invitations to bring your colleagues into your workspace and assign their initial system roles.
        </p>
      </div>

      {/* Main Grid Content */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Left Side: Invitation Form */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
          height: 'fit-content'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-dark)', letterSpacing: '-0.01em' }}>
            New Invitation Details
          </h3>
          
          <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontSize: '0.875rem',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                System Role
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <option value="MEMBER">Member (Standard Access)</option>
                <option value="TEAM_LEADER">Team Leader (Manages Squads)</option>
                <option value="MANAGER">Manager (Audits Projects)</option>
                <option value="ADMIN">Admin (Full System Controls)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Personal Message (Optional)
              </label>
              <textarea
                placeholder="Join our projects in Hopefly!"
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontSize: '0.875rem',
                  height: '80px',
                  resize: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            <button
              type="submit"
              disabled={isInviting}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: isInviting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                if (!isInviting) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.25)';
                }
              }}
              onMouseLeave={e => {
                if (!isInviting) {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.15)';
                }
              }}
            >
              {isInviting ? (
                <>
                  <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Sending Invite...
                </>
              ) : (
                'Send Invitation'
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Invite History */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '380px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-dark)', letterSpacing: '-0.01em' }}>
            Invite History
          </h3>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Loading history...</span>
            </div>
          ) : invites.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '24px', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📨</span>
              <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-dark)', fontWeight: '700' }}>No Invitations Sent</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: 1.4 }}>
                Invited workspace members will appear here with their registration status and tokens.
              </p>
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1, maxHeight: '420px', paddingRight: '4px' }} className="sidebar-scroll">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {invites.map(invite => {
                  const isExpired = !invite.used && new Date() > new Date(invite.expiresAt);
                  return (
                    <div
                      key={invite.id}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'rgba(248, 250, 252, 0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {invite.email}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px', textTransform: 'capitalize' }}>
                            Role: <b>{invite.role?.toLowerCase()?.replace('_', ' ')}</b>
                          </div>
                        </div>
                        {getStatusBadge(invite)}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                          Sent: {new Date(invite.createdAt).toLocaleDateString()}
                        </span>
                        
                        {!invite.used && !isExpired && (
                          <button
                            onClick={() => handleCopyLink(invite.token)}
                            style={{
                              background: 'rgba(99, 102, 241, 0.06)',
                              color: 'var(--accent)',
                              border: '1px solid rgba(99, 102, 241, 0.1)',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'var(--accent)';
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.06)';
                              e.currentTarget.style.color = 'var(--accent)';
                            }}
                          >
                            🔗 Copy Link
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modern Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toast.type === 'success' ? '#006644' : '#DE350B',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(9, 30, 66, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 99999,
          animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          fontSize: '14px'
        }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default InvitePage;
