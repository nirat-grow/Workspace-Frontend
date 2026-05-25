import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const TeamMembersPage = ({ activeProject }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { leaderId } = useParams();
  const [teamData, setTeamData] = useState({ leader: null, team: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    if (leaderId) {
      setLoading(true);
      api.get(`/auth/team/${leaderId}`)
        .then(res => {
          setTeamData(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [leaderId]);

  const getRoleConfig = (role) => {
    switch (role) {
      case 'ADMIN': return { bg: '#E9F2FF', color: '#0052CC', label: 'Admin', icon: '🛡️' };
      case 'TEAM_LEADER': return { bg: '#E3FCEF', color: '#006644', label: 'Team Lead', icon: '⭐' };
      case 'MANAGER': return { bg: '#FFFAE6', color: '#FF8B00', label: 'Manager', icon: '📋' };
      default: return { bg: '#F4F5F7', color: '#42526E', label: 'Member', icon: '👤' };
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const avatarGradients = [
    'linear-gradient(135deg, #0052CC, #4C9AFF)',
    'linear-gradient(135deg, #00875A, #57D9A3)',
    'linear-gradient(135deg, #FF5630, #FF8F73)',
    'linear-gradient(135deg, #6554C0, #B8ACF6)',
    'linear-gradient(135deg, #00B8D9, #79E2F2)',
    'linear-gradient(135deg, #FF991F, #FFC400)',
    'linear-gradient(135deg, #403294, #8777D9)',
    'linear-gradient(135deg, #E91E63, #F48FB1)',
  ];

  const getGradient = (name) => {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarGradients[Math.abs(hash) % avatarGradients.length];
  };

  const filteredMembers = teamData.team.filter(m =>
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!activeProject) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#172B4D', marginBottom: '8px' }}>No Project Selected</h2>
        <p style={{ color: '#5E6C84', fontSize: '14px' }}>Select a project from the sidebar to view team details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #DFE1E6', borderTopColor: '#0052CC', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#5E6C84' }}>Loading team details...</p>
      </div>
    );
  }

  const styles = {
    page: { padding: '28px 32px', width: '100%', overflow: 'auto', height: '100%', background: '#f8f9fa' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' },
    title: { fontSize: '24px', fontWeight: 700, color: '#172B4D', margin: 0 },
    subtitle: { fontSize: '14px', color: '#5E6C84', marginTop: '6px' },
    backBtn: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: '8px', color: '#172B4D', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    leaderSection: { background: 'linear-gradient(135deg, #0052CC, #0747A6)', borderRadius: '16px', padding: '32px', marginBottom: '40px', color: '#FFFFFF', boxShadow: '0 10px 25px rgba(0, 82, 204, 0.2)', position: 'relative', overflow: 'hidden' },
    leaderContent: { position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '24px' },
    leaderAvatar: { width: '80px', height: '80px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700 },
    leaderInfo: { flex: 1 },
    leaderName: { fontSize: '22px', fontWeight: 700, margin: '0 0 4px 0' },
    leaderEmail: { fontSize: '15px', color: 'rgba(255,255,255,0.8)', margin: 0 },
    viewLeaderTasks: { background: '#FFFFFF', color: '#0052CC', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', marginTop: '12px' },
    sectionTitle: { fontSize: '18px', fontWeight: 600, color: '#172B4D', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
    searchWrap: { position: 'relative', marginBottom: '24px', maxWidth: '400px' },
    searchInput: { width: '100%', padding: '12px 16px 12px 42px', border: '2px solid #DFE1E6', borderRadius: '10px', fontSize: '14px', background: '#FFFFFF', color: '#172B4D', outline: 'none', transition: 'all 0.2s' },
    searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8993A4' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
    card: (isHovered) => ({ background: '#FFFFFF', border: isHovered ? '1px solid #0052CC' : '1px solid #DFE1E6', borderRadius: '14px', padding: '24px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: isHovered ? 'translateY(-5px)' : 'none', boxShadow: isHovered ? '0 15px 35px rgba(9, 30, 66, 0.12)' : '0 2px 4px rgba(9, 30, 66, 0.05)', position: 'relative', overflow: 'hidden' }),
    cardAccent: (isHovered) => ({ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: isHovered ? 'linear-gradient(90deg, #0052CC, #00B8D9)' : 'transparent', transition: 'background 0.3s' }),
    memberAvatar: (gradient) => ({ width: '60px', height: '60px', borderRadius: '18px', background: gradient, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '22px', marginBottom: '18px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }),
    memberName: { fontSize: '17px', fontWeight: 600, color: '#172B4D', marginBottom: '4px' },
    memberEmail: { fontSize: '14px', color: '#5E6C84', marginBottom: '18px' },
    viewTasks: (isHovered) => ({ display: 'inline-flex', alignItems: 'center', gap: isHovered ? '10px' : '6px', fontSize: '14px', fontWeight: 700, color: '#0052CC', transition: 'all 0.2s', borderTop: '1px solid #EBECF0', paddingTop: '16px', width: '100%' }),
  };

  const handleMemberClick = (memberId) => {
    navigate(`/board/${activeProject.id}/member/${memberId}`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Team Overview</h1>
          <div style={styles.subtitle}>
            Viewing team structure for <span style={{fontWeight: 700, color: '#0052CC'}}>{activeProject.name}</span>
          </div>
        </div>
        <button
          style={styles.backBtn}
          onClick={() => navigate('/members')}
          onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; e.currentTarget.style.borderColor = '#C1C7D0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#DFE1E6'; }}
        >
          ← Back to Members
        </button>
      </div>

      {teamData.leader && (
        <div style={styles.leaderSection}>
          <div style={{position: 'absolute', right: '-50px', top: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%'}} />
          <div style={{position: 'absolute', left: '20%', bottom: '-30px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', transform: 'rotate(45deg)'}} />
          
          <div style={styles.leaderContent}>
            {teamData.leader.profilePic ? (
              <img 
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api${teamData.leader.profilePic}`} 
                alt={teamData.leader.name} 
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '20px',
                  objectFit: 'cover',
                  border: '2px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)'
                }}
              />
            ) : (
              <div style={styles.leaderAvatar}>
                {getInitials(teamData.leader.name)}
              </div>
            )}
            <div style={styles.leaderInfo}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span style={{background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em'}}>Team Leader</span>
              </div>
              <h2 style={styles.leaderName}>{teamData.leader.name}</h2>
              <p style={styles.leaderEmail}>{teamData.leader.email}</p>
              <button 
                style={styles.viewLeaderTasks}
                onClick={() => handleMemberClick(teamData.leader.id)}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                View My Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.sectionTitle}>
         👥 Team Members <span style={{background: '#DFE1E6', color: '#42526E', padding: '2px 8px', borderRadius: '10px', fontSize: '12px'}}>{teamData.team.length}</span>
      </div>

      <div style={styles.searchWrap}>
        <svg style={styles.searchIcon} width="18" height="18" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input 
          style={styles.searchInput} 
          type="text" 
          placeholder="Search team members..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          onFocus={e => { e.target.style.borderColor = '#0052CC'; e.target.style.boxShadow = '0 0 0 3px rgba(0,82,204,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = '#DFE1E6'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {filteredMembers.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: '#FFFFFF', borderRadius: '16px', border: '2px dashed #DFE1E6' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>Empty</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#172B4D', marginBottom: '8px' }}>No team members assigned</h3>
          <p style={{ fontSize: '14px', color: '#5E6C84' }}>This leader doesn't have any members in their team yet.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredMembers.map((m) => {
            const roleConfig = getRoleConfig(m.globalRole);
            const gradient = getGradient(m.name);
            const isHovered = hoveredCard === m.id;

            return (
              <div
                key={m.id}
                style={styles.card(isHovered)}
                onMouseEnter={() => setHoveredCard(m.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleMemberClick(m.id)}
              >
                <div style={styles.cardAccent(isHovered)} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {m.profilePic ? (
                    <img 
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api${m.profilePic}`} 
                      alt={m.name} 
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '18px',
                        objectFit: 'cover',
                        marginBottom: '18px',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
                      }}
                    />
                  ) : (
                    <div style={styles.memberAvatar(gradient)}>
                      {getInitials(m.name)}
                    </div>
                  )}
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    background: roleConfig.bg, 
                    color: roleConfig.color 
                  }}>
                    {roleConfig.icon} {roleConfig.label}
                  </span>
                </div>

                <div style={styles.memberName}>{m.name}</div>
                <div style={styles.memberEmail}>{m.email}</div>

                <div style={styles.viewTasks(isHovered)}>
                  View Performance Dashboard
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamMembersPage;
