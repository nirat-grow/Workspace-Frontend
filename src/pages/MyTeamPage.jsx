import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const MyTeamPage = ({ activeProject }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isCoreView = searchParams.get('view') === 'core';
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const [coreTeam, setCoreTeam] = useState([]);
  const [noLeaderFound, setNoLeaderFound] = useState(false);

  useEffect(() => {
    if (isCoreView) {
      fetchCoreTeam();
    } else if (activeProject?.id) {
      fetchProjectData();
    }
  }, [activeProject, isCoreView]);

  const fetchCoreTeam = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/my-team');
      setCoreTeam(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/project-team?projectId=${activeProject.id}`);
      setProjectData(res.data);
      
      // Auto-navigate to specific squad for TL and Member roles
      if (user.globalRole === 'TEAM_LEADER') {
        navigate(`/squad-details/${user.id}`);
        return; 
      } else if (user.globalRole === 'MEMBER') {
        const leader = res.data.members.find(m => m.role === 'TEAM_LEADER' && m.designation === user.designation);
        if (leader) {
          navigate(`/squad-details/${leader.id}`);
          return;
        } else {
          setNoLeaderFound(true);
          setLoading(false);
          return;
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  if (isCoreView) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', paddingBottom: '4rem', animation: 'fadeIn 0.4s ease-out' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
            Global Squad (Core Team)
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
            Showing all members with matching designation: <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{user?.designation}</span>
          </p>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Loading squad...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {coreTeam.map(m => (
              <div 
                key={m.id} 
                style={{ 
                  background: '#ffffff', 
                  border: '1px solid var(--border)', 
                  borderRadius: '10px', 
                  padding: '1.25rem', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
                onClick={() => navigate(`/member-report/${m.id}`)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.03)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                  {m.profilePic ? (
                    <img 
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api${m.profilePic}`} 
                      alt={m.name} 
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
                      {getInitials(m.name)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.9rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{m.email}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', background: 'rgba(99, 102, 241, 0.08)', padding: '3px 8px', borderRadius: '4px', display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Role: {m.designation}
                </div>
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View Report Card 
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </div>
              </div>
            ))}
            {coreTeam.length === 0 && <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>No core team members found yet.</p>}
          </div>
        )}
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👥</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>Select a Project</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Please select a project from the sidebar to manage the team hierarchy.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Loading hierarchy...</p>
      </div>
    );
  }

  if (noLeaderFound) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', paddingBottom: '4rem', animation: 'fadeIn 0.4s ease-out' }}>
        <div style={{ padding: '64px 32px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>👥</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '12px' }}>Waiting for a Team Leader</h2>
          <p style={{ color: 'var(--text-light)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 24px', lineHeight: '1.6' }}>
            It looks like there is no <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{user.designation} Team Leader</span> added to this project yet. Please wait for an Admin to assign one so you can view your squad!
          </p>
        </div>
      </div>
    );
  }

  const leaders = projectData?.members?.filter(m => m.role === 'TEAM_LEADER') || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', paddingBottom: '4rem', animation: 'fadeIn 0.4s ease-out' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
          Team Management
        </h1>
        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
          Hierarchical view for squad lists in <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{activeProject.name}</span>
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '40px' 
      }}>
        {leaders.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px dashed var(--border)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', margin: 0 }}>No Team Leaders added to this project.</p>
          </div>
        )}

        {leaders.map(leader => {
          const hasNoLeader = leader.hasNoLeader;
          return (
            <div 
              key={leader.id} 
              style={{
                background: '#ffffff',
                border: hasNoLeader ? '1px dashed #f97316' : '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.2, 1, 0.3, 1)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative'
              }} 
              onClick={() => navigate(`/squad-details/${leader.id}`)}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = hasNoLeader ? '#f97316' : 'rgba(99, 102, 241, 0.3)';
                e.currentTarget.style.boxShadow = hasNoLeader ? '0 10px 20px rgba(249, 115, 22, 0.06)' : '0 10px 20px rgba(0, 0, 0, 0.03)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = hasNoLeader ? '#f97316' : 'var(--border)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.02)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {hasNoLeader ? (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    background: 'rgba(249, 115, 22, 0.08)',
                    color: '#f97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    border: '1px solid rgba(249, 115, 22, 0.15)'
                  }}>
                    👥
                  </div>
                ) : leader.profilePic ? (
                  <img 
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api${leader.profilePic}`} 
                    alt={leader.name} 
                    style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border)' }} 
                  />
                ) : (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    border: '1px solid rgba(99, 102, 241, 0.15)'
                  }}>
                    {getInitials(leader.name)}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '2px', letterSpacing: '-0.01em' }}>{leader.name}</div>
                  <div style={{ 
                    background: hasNoLeader ? 'rgba(249, 115, 22, 0.08)' : 'rgba(99, 102, 241, 0.08)', 
                    color: hasNoLeader ? '#f97316' : 'var(--accent)', 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    fontSize: '0.65rem', 
                    fontWeight: 700, 
                    width: 'fit-content',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{hasNoLeader ? `${leader.designation} Squad` : `${leader.designation} Lead`}</div>
                </div>
              </div>
              
              <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{leader.email}</span>
                {leader.memberCount !== undefined && (
                  <span style={{ background: hasNoLeader ? 'rgba(249, 115, 22, 0.08)' : 'rgba(0,0,0,0.04)', color: hasNoLeader ? '#f97316' : 'var(--text-dark)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                    {leader.memberCount} member{leader.memberCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
 
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '0.8rem', 
                fontWeight: 700, 
                color: hasNoLeader ? '#f97316' : 'var(--accent)',
                marginTop: 'auto',
                paddingTop: '4px'
              }}>
                View Squad Details
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyTeamPage;
