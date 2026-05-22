import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const ConfirmModal = ({ show, onConfirm, onCancel, title, message, confirmText = 'Remove', cancelText = 'Cancel' }) => {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.3)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease-out',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff', width: '380px', borderRadius: '12px', padding: '1.75rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border)',
        animation: 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>{title}</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.5, marginBottom: '20px', margin: '0 0 20px 0' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>        
          <button 
            onClick={onCancel}
            style={{ padding: '8px 14px', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-dark)', fontSize: '0.85rem' }}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            style={{ padding: '8px 14px', background: '#ef4444', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', color: '#fff', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.15)', fontSize: '0.85rem' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const SquadDetailsPage = ({ activeProject }) => {
  const { leaderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  // State for 3-dot squad management menu
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // States for custom Confirmation Modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  // Premium Toast States
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (activeProject?.id && leaderId) {
      fetchSquadData();
    }
  }, [activeProject, leaderId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchSquadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/project-team?projectId=${activeProject.id}&leaderId=${leaderId}`);
      const leader = res.data.leader || res.data.members.find(m => m.id === leaderId);
      if (!leader) {
        navigate('/my-team');
        return;
      }
      const squad = res.data.members.filter(m => m.role === 'MEMBER' && m.designation === leader.designation);
      setData({ leader, squad, project: res.data.project });
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleRemoveClick = (member, e) => {
    e.stopPropagation();
    setMemberToRemove(member);
    setShowConfirm(true);
    setActiveMenuId(null);
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    try {
      await api.delete(`/projects/${activeProject.id}/members/${memberToRemove.id}`);
      setShowConfirm(false);
      setMemberToRemove(null);
      setSuccessMessage('Member successfully removed from squad');
      await fetchSquadData();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to remove member.');
      setShowConfirm(false);
    }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Loading squad details...</p>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', paddingBottom: '4rem', animation: 'fadeIn 0.4s ease-out' }}>
      
      {user.globalRole === 'ADMIN' && (
        <button 
          onClick={() => navigate('/my-team')} 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-dark)',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '1.5rem',
            border: '1px solid var(--border)',
            background: '#ffffff',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Teams
        </button>
      )}

      {/* Modern, minimalist Leader/Squad banner card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.75rem 2rem',
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        flexWrap: 'wrap'
      }}>
        {data.leader.hasNoLeader ? (
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '12px',
            background: 'rgba(249, 115, 22, 0.08)',
            border: '1px solid rgba(249, 115, 22, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem'
          }}>
            👥
          </div>
        ) : data.leader.profilePic ? (
          <img 
            src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${data.leader.profilePic}`} 
            alt={data.leader.name} 
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '12px',
              objectFit: 'cover',
              border: '1px solid var(--border)'
            }}
          />
        ) : (
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.08)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            border: '1px solid rgba(99, 102, 241, 0.15)'
          }}>
            {getInitials(data.leader.name)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: '250px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0, letterSpacing: '-0.02em' }}>{data.leader.name}</h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: data.leader.hasNoLeader ? 'rgba(249, 115, 22, 0.08)' : 'rgba(99, 102, 241, 0.08)',
              color: data.leader.hasNoLeader ? '#f97316' : 'var(--accent)'
            }}>{data.leader.hasNoLeader ? `${data.leader.designation} Squad (No Lead)` : `${data.leader.designation} Lead`}</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '0 0 12px 0' }}>
            {data.leader.hasNoLeader ? 'No Team Leader has been assigned to this project squad yet.' : data.leader.email}
          </p>
          {!data.leader.hasNoLeader && user.globalRole !== 'MEMBER' && (
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/reports?leaderId=${data.leader.id}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              View Squad Performance
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '6px', minWidth: '150px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Active Project</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-dark)' }}>{activeProject.name}</div>
          {user.globalRole === 'ADMIN' && !data.leader.hasNoLeader && (
            <button 
              onClick={() => navigate(`/member-report/${data.leader.id}`)}
              style={{
                padding: '6px 12px',
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-dark)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              View Leader Report
            </button>
          )}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '1.25rem' }}>
          Squad Members ({data.squad.length})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {data.squad.map(member => {
            const isMenuOpen = activeMenuId === member.id;
            const canManageSquad = user.globalRole === 'ADMIN' || (user.globalRole === 'TEAM_LEADER' && data.leader.id === user.id);
            return (
              <div 
                key={member.id} 
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
                onMouseEnter={e => { 
                  if (user.globalRole !== 'MEMBER') {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'; 
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.03)';
                  }
                }}
                onMouseLeave={e => { 
                  if (user.globalRole !== 'MEMBER') {
                    e.currentTarget.style.borderColor = 'var(--border)'; 
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                  }
                }}
                onClick={() => user.globalRole !== 'MEMBER' && navigate(`/member-report/${member.id}`)}
              >
                {/* 3-Dot Dropdown Menu for Squad Member Management */}
                {canManageSquad && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px' }} onClick={e => e.stopPropagation()}>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-light)',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.15s',
                        zIndex: 10
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMenuOpen) setActiveMenuId(null);
                        else setActiveMenuId(member.id);
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2.5" />
                        <circle cx="12" cy="12" r="2.5" />
                        <circle cx="12" cy="19" r="2.5" />
                      </svg>
                    </button>

                    {isMenuOpen && (
                      <div ref={menuRef} style={{
                        position: 'absolute',
                        top: '32px',
                        right: 0,
                        background: 'rgba(255, 255, 255, 0.90)',
                        backdropFilter: 'blur(20px) saturate(190%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(190%)',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        borderRadius: '14px',
                        boxShadow: '0 16px 36px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.05)',
                        width: '180px',
                        padding: '6px',
                        zIndex: 20,
                        animation: 'menuPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transformOrigin: 'top right'
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', padding: '6px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Management</div>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            padding: '10px 12px',
                            fontSize: '13px',
                            color: '#ef4444',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontWeight: 600,
                            borderRadius: '10px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onClick={(e) => handleRemoveClick(member, e)}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ef4444'; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          Remove from Project
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {member.profilePic ? (
                    <img 
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${member.profilePic}`} 
                      alt={member.name} 
                      style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(99, 102, 241, 0.06)',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      border: '1px solid rgba(99, 102, 241, 0.1)'
                    }}>
                      {getInitials(member.name)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.9rem' }}>{member.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Core Member</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{member.email}</div>
                {user.globalRole !== 'MEMBER' && (
                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>View Report</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
          {data.squad.length === 0 && (
            <p style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.85rem' }}>No members assigned to this squad.</p>
          )}
        </div>
      </div>
      <ConfirmModal
        show={showConfirm}
        onConfirm={handleConfirmRemove}
        onCancel={() => { setShowConfirm(false); setMemberToRemove(null); }}
        title="Remove from Project"
        message={`Are you sure you want to remove ${memberToRemove?.name} from this project?`}
        confirmText="Remove"
      />

      {/* Premium Toast Notifications */}
      {successMessage && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: '#10b981', color: '#fff',
          padding: '12px 18px', borderRadius: '8px', zIndex: 10000,
          boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontWeight: 600, fontSize: '0.85rem', backdropFilter: 'blur(8px)',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: '#ef4444', color: '#fff',
          padding: '12px 18px', borderRadius: '8px', zIndex: 10000,
          boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.2)',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontWeight: 600, fontSize: '0.85rem', backdropFilter: 'blur(8px)',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default SquadDetailsPage;
