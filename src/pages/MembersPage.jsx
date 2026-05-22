import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const ConfirmModal = ({ show, onConfirm, onCancel, title, message, confirmText = 'Remove', cancelText = 'Cancel' }) => {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(9, 30, 66, 0.54)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#fff', width: '400px', borderRadius: '12px', padding: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'slideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#172B4D', marginBottom: '12px' }}>{title}</div>
        <p style={{ fontSize: '15px', color: '#5E6C84', lineHeight: 1.5, marginBottom: '24px' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{ padding: '10px 20px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', color: '#42526E' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '10px 20px', background: '#DE350B', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', color: '#fff', boxShadow: '0 4px 12px rgba(222, 53, 11, 0.3)' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

const MembersPage = ({ activeProject }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' or specific role
  const [hoveredCard, setHoveredCard] = useState(null);

  // State for the 3-dot menu
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [assigningToLeaderId, setAssigningToLeaderId] = useState(null);
  const menuRef = useRef(null);

  // Modal states
  const [showConfirm, setShowConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableWorkspaceMembers, setAvailableWorkspaceMembers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addModalDesignationFilter, setAddModalDesignationFilter] = useState('ALL');

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
    fetchData();
  }, [activeProject]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeProject?.id) {
        const res = await api.get(`/projects/${activeProject.id}`);
        setMembers(res.data.members || []);
      } else {
        // Fetch global workspace members if no project is active
        const wsId = user.workspaces[0].workspaceId;
        const res = await api.get(`/workspaces/${wsId}`);
        // Map workspace members to the same structure as project members for UI consistency
        setMembers(res.data.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
        setAssigningToLeaderId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleRoleChange = async (memberId, newRole, e) => {
    e.stopPropagation();
    setActiveMenuId(null);
    try {
      await api.put(`/auth/users/${memberId}/role`, { globalRole: newRole });
      setMembers(prev => prev.map(m =>
        m.user.id === memberId
          ? { ...m, user: { ...m.user, globalRole: newRole } }
          : m
      ));
      setSuccessMessage(`Role successfully changed to ${newRole.replace('_', ' ')}`);
    } catch (err) {
      setErrorMessage('Failed to change role. You must be an Admin.');
    }
  };

  const handleAssignLeader = async (memberId, leaderId, e) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setAssigningToLeaderId(null);
    try {
      await api.put(`/auth/users/${memberId}/team-leader`, { teamLeaderId: leaderId });
      setSuccessMessage('Team Leader successfully assigned!');
    } catch (err) {
      setErrorMessage('Failed to assign team leader. You must be an Admin.');
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
      if (activeProject?.id) {
        await api.delete(`/projects/${activeProject.id}/members/${memberToRemove.user.id}`);
        setMembers(prev => prev.filter(m => m.user.id !== memberToRemove.user.id));
        setSuccessMessage('Member successfully removed from project');
      } else {
        await api.delete(`/auth/users/${memberToRemove.user.id}`);
        setMembers(prev => prev.filter(m => m.user.id !== memberToRemove.user.id));
        setSuccessMessage('Member completely removed from company!');
      }
      setShowConfirm(false);
      setMemberToRemove(null);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to remove member.');
      setShowConfirm(false);
    }
  };

  const handleOpenAddModal = async () => {
    try {
      const wsId = user.workspaces[0].workspaceId;
      const res = await api.get(`/workspaces/${wsId}`);
      const projectMemberIds = members.map(m => m.user.id);

      let available = res.data.members.filter(m => !projectMemberIds.includes(m.userId));

      // Admin can see everyone
      // Team Leader can only see members with matching designation
      if (user?.globalRole === 'TEAM_LEADER' && user?.globalRole !== 'ADMIN') {
        available = available.filter(m =>
          m.user?.designation === user.designation &&
          m.user?.globalRole === 'MEMBER'
        );
      }

      setAvailableWorkspaceMembers(available);
      setShowAddModal(true);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch available members');
    }
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) return;
    setIsAdding(true);
    try {
      await api.post(`/projects/${activeProject.id}/members/bulk`, { userIds: selectedUserIds });
      await fetchData(); // Refresh list
      setShowAddModal(false);
      setSelectedUserIds([]);
      setSuccessMessage('Members added successfully!');
    } catch (err) {
      setErrorMessage('Failed to add members.');
    } finally {
      setIsAdding(false);
    }
  };

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

  const filteredMembers = members.filter(m => {
    const userObj = m.user;
    if (!userObj) return false;
    const matchesSearch = userObj.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userObj.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || userObj.globalRole === roleFilter || (roleFilter === 'MEMBER' && !userObj.globalRole);
    return matchesSearch && matchesRole;
  });

  const teamLeaders = members.filter(m => m.user.globalRole === 'TEAM_LEADER');

  const groupedByLeader = filteredMembers.reduce((acc, member) => {
    const leaderId = member.user.teamLeaderId;
    if (!leaderId) {
      acc.unassigned = acc.unassigned || [];
      acc.unassigned.push(member);
    } else {
      acc[leaderId] = acc[leaderId] || [];
      acc[leaderId].push(member);
    }
    return acc;
  }, { unassigned: [] });

  const styles = {
    page: { padding: '28px 32px', width: '100%', overflow: 'auto', height: '100%' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
    title: { fontSize: '22px', fontWeight: 600, color: '#172B4D', margin: 0 },
    subtitle: { fontSize: '13px', color: '#5E6C84', marginTop: '4px' },
    projectBadge: { fontWeight: 600, color: '#0052CC' },
    backBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '6px', color: '#172B4D', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' },
    searchWrap: { position: 'relative', marginBottom: '20px' },
    searchInput: { width: '100%', padding: '10px 14px 10px 40px', border: '2px solid #DFE1E6', borderRadius: '8px', fontSize: '14px', background: '#FAFBFC', color: '#172B4D', outline: 'none', transition: 'all 0.15s', boxSizing: 'border-box', marginBottom: 0 },
    searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8993A4', pointerEvents: 'none' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
    card: (isHovered) => ({ background: '#FFFFFF', border: isHovered ? '1px solid #0052CC' : '1px solid #DFE1E6', borderRadius: '12px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s ease', transform: isHovered ? 'translateY(-3px)' : 'none', boxShadow: isHovered ? '0 12px 28px rgba(9, 30, 66, 0.15), 0 0 0 1px rgba(0, 82, 204, 0.1)' : '0 1px 3px rgba(9, 30, 66, 0.08)', position: 'relative', overflow: 'visible' }),
    cardAccent: (isHovered) => ({ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: isHovered ? 'linear-gradient(90deg, #0052CC, #00B8D9)' : 'transparent', transition: 'background 0.2s', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }),
    avatar: (gradient) => ({ width: '56px', height: '56px', borderRadius: '16px', background: gradient, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '20px', letterSpacing: '1px', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)', marginBottom: '16px', flexShrink: 0 }),
    rolePill: (config) => ({ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: config.bg, color: config.color, letterSpacing: '0.02em' }),
    name: { fontSize: '16px', fontWeight: 600, color: '#172B4D', marginBottom: '4px', lineHeight: 1.3 },
    email: { fontSize: '13px', color: '#5E6C84', marginBottom: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    viewTasks: (isHovered) => ({ display: 'inline-flex', alignItems: 'center', gap: isHovered ? '8px' : '4px', fontSize: '13px', fontWeight: 600, color: '#0052CC', transition: 'all 0.15s', borderTop: '1px solid #EBECF0', paddingTop: '14px', width: '100%' }),
    statsRow: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
    statChip: (config, isActive) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, background: isActive ? '#0052CC' : config.bg, color: isActive ? '#fff' : config.color, cursor: 'pointer', transition: 'all 0.15s', border: isActive ? '1px solid #0052CC' : '1px solid transparent' }),
    menuButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', color: '#5E6C84', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
    dropdownMenu: {
      position: 'absolute', right: '0', top: '44px',
      background: 'rgba(255, 255, 255, 0.90)',
      backdropFilter: 'blur(20px) saturate(190%)',
      WebkitBackdropFilter: 'blur(20px) saturate(190%)',
      border: '1px solid rgba(226, 232, 240, 0.8)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05)',
      zIndex: 100, minWidth: '220px', padding: '6px',
      animation: 'menuPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transformOrigin: 'top right'
    },
    dropdownItem: (isDanger) => ({
      padding: '10px 14px', fontSize: '13px',
      color: isDanger ? '#ef4444' : '#334155',
      background: 'none', border: 'none', width: '100%',
      textAlign: 'left', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '10px',
      fontWeight: 600, borderRadius: '10px',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative'
    }),
    dropdownHeader: { padding: '8px 14px 4px', fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }
  };

  const roleCount = members.reduce((acc, m) => {
    const role = m.user.globalRole || 'MEMBER';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const renderMemberCard = (m) => {
    const roleConfig = getRoleConfig(m.user.globalRole);
    const gradient = getGradient(m.user.name);
    const isHovered = hoveredCard === m.user.id;
    const isMenuOpen = activeMenuId === m.user.id;

    return (
      <div
        key={m.user.id}
        style={styles.card(isHovered)}
        onMouseEnter={() => setHoveredCard(m.user.id)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={() => {
          navigate(`/member-report/${m.user.id}`);
        }}
      >
        <div style={styles.cardAccent(isHovered)} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {m.user.profilePic ? (
              <img 
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${m.user.profilePic}`} 
                alt={m.user.name} 
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '16px', 
                  objectFit: 'cover',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)', 
                  marginBottom: '16px', 
                  flexShrink: 0 
                }} 
              />
            ) : (
              <div style={styles.avatar(gradient)}>
                {getInitials(m.user.name)}
              </div>
            )}
            <span style={styles.rolePill(roleConfig)}>
              {roleConfig.icon} {roleConfig.label}
            </span>
          </div>

          {(user?.globalRole === 'ADMIN' || user?.globalRole === 'TEAM_LEADER') && m.user.globalRole !== 'ADMIN' && (
            <div style={{ position: 'relative' }}>
              <button
                style={styles.menuButton}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMenuOpen) { setActiveMenuId(null); setAssigningToLeaderId(null); }
                  else { setActiveMenuId(m.user.id); setAssigningToLeaderId(null); }
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(9, 30, 66, 0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {isMenuOpen && (
                <div ref={menuRef} style={styles.dropdownMenu}>
                  {user?.globalRole === 'TEAM_LEADER' && user?.globalRole !== 'ADMIN' ? (
                    <>
                      <div style={styles.dropdownHeader}>Team Management</div>
                      {m.user.teamLeaderId === user.id ? (
                        <button
                          style={styles.dropdownItem(true)}
                          onClick={(e) => handleAssignLeader(m.user.id, null, e)}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ef4444'; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="9" x2="12" y2="15" />
                            <line x1="12" y1="9" x2="18" y2="15" />
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                          </svg>
                          Remove from My Team
                        </button>
                      ) : (
                        <button
                          style={styles.dropdownItem(false)}
                          onClick={(e) => handleAssignLeader(m.user.id, user.id, e)}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; e.currentTarget.style.color = 'var(--accent)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#334155'; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                          </svg>
                          Add to My Team
                        </button>
                      )}
                      {activeProject && m.user.globalRole === 'MEMBER' && (m.user.designation === user.designation || m.user.teamLeaderId === user.id) && (
                        <>
                          <div style={{ borderTop: '1px solid rgba(226, 232, 240, 0.6)', margin: '6px 4px' }} />
                          <div style={styles.dropdownHeader}>Danger Zone</div>
                          <button
                            style={styles.dropdownItem(true)}
                            onClick={(e) => handleRemoveClick(m, e)}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ef4444'; }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Remove from Project
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {assigningToLeaderId === m.user.id ? (
                        <>
                          <div style={styles.dropdownHeader}>Select Team Leader:</div>
                          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {teamLeaders.length === 0 ? (
                              <div style={{ padding: '8px 16px', fontSize: '13px', color: '#8993A4' }}>No Team Leaders found</div>
                            ) : (
                              teamLeaders.map(tl => (
                                <button
                                  key={tl.user.id}
                                  style={styles.dropdownItem(false)}
                                  onClick={(e) => handleAssignLeader(m.user.id, tl.user.id, e)}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; e.currentTarget.style.color = 'var(--accent)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#334155'; }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ color: '#eab308' }}>
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                  </svg>
                                  {tl.user.name}
                                </button>
                              ))
                            )}
                          </div>
                          <div style={{ borderTop: '1px solid rgba(226, 232, 240, 0.6)', margin: '6px 4px' }} />
                          <button
                            style={{ ...styles.dropdownItem(true), fontWeight: 600 }}
                            onClick={(e) => { e.stopPropagation(); setAssigningToLeaderId(null); }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ef4444'; }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="19" y1="12" x2="5" y2="12" />
                              <polyline points="12 5 5 12 12 19" />
                            </svg>
                            Back
                          </button>
                        </>
                      ) : (
                        <>
                          {(m.user.globalRole === 'MEMBER' || m.user.globalRole === 'TEAM_LEADER' || m.user.globalRole === 'MANAGER') && (
                            <>
                              <div style={styles.dropdownHeader}>Management</div>
                              {m.user.globalRole !== 'TEAM_LEADER' && (
                                <button
                                  style={styles.dropdownItem(false)}
                                  onClick={(e) => { e.stopPropagation(); setAssigningToLeaderId(m.user.id); }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; e.currentTarget.style.color = 'var(--accent)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#334155'; }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                  </svg>
                                  Assign to Team Leader
                                </button>
                              )}

                              <div style={{ borderTop: '1px solid rgba(226, 232, 240, 0.6)', margin: '6px 4px' }} />
                              <div style={styles.dropdownHeader}>Change Role To</div>
                              {m.user.globalRole !== 'MEMBER' && (
                                <button 
                                  style={styles.dropdownItem(false)} 
                                  onClick={(e) => handleRoleChange(m.user.id, 'MEMBER', e)} 
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; e.currentTarget.style.color = 'var(--accent)'; }} 
                                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#334155'; }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                  </svg>
                                  Member (Demote)
                                </button>
                              )}
                              {m.user.globalRole !== 'TEAM_LEADER' && (
                                <button 
                                  style={styles.dropdownItem(false)} 
                                  onClick={(e) => handleRoleChange(m.user.id, 'TEAM_LEADER', e)} 
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; e.currentTarget.style.color = 'var(--accent)'; }} 
                                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#334155'; }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                  </svg>
                                  Team Leader
                                </button>
                              )}
                              {m.user.globalRole !== 'MANAGER' && (
                                <button 
                                  style={styles.dropdownItem(false)} 
                                  onClick={(e) => handleRoleChange(m.user.id, 'MANAGER', e)} 
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; e.currentTarget.style.color = 'var(--accent)'; }} 
                                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#334155'; }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                  </svg>
                                  Manager
                                </button>
                              )}
                              
                              <div style={{ borderTop: '1px solid rgba(226, 232, 240, 0.6)', margin: '6px 4px' }} />
                              {(activeProject || user?.globalRole === 'ADMIN') && (
                                <>
                                  <div style={styles.dropdownHeader}>Danger Zone</div>
                                  {activeProject ? (
                                    <button
                                      style={styles.dropdownItem(true)}
                                      onClick={(e) => handleRemoveClick(m, e)}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ef4444'; }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      </svg>
                                      Remove from Project
                                    </button>
                                  ) : (
                                    user?.globalRole === 'ADMIN' && m.user.id !== user.id && (
                                      <button
                                        style={styles.dropdownItem(true)}
                                        onClick={(e) => handleRemoveClick(m, e)}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ef4444'; }}
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                          <line x1="10" y1="11" x2="10" y2="17" />
                                          <line x1="14" y1="11" x2="14" y2="17" />
                                        </svg>
                                        Remove Globally (Delete)
                                      </button>
                                    )
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.name}>{m.user.name}</div>
        <div style={styles.email}>{m.user.email}</div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0052CC', marginBottom: '12px', background: '#E9F2FF', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
          Role: {m.user.designation || 'General'}
        </div>

        <div style={styles.viewTasks(isHovered)}>
          View Report Card
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{activeProject ? 'Project Hierarchy' : 'Hopefly'}</h1>
          <div style={styles.subtitle}>
            {activeProject ? (
              <>
                <span style={styles.projectBadge}>{activeProject.name}</span>
                <span style={{ margin: '0 6px', opacity: 0.4 }}>•</span>
                Team Leaders & Their Members
              </>
            ) : (
              <span style={{ color: '#0052CC', fontWeight: 600 }}>Global Company Pool</span>
            )}
            <span style={{ marginLeft: '8px' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {activeProject && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {(user?.globalRole === 'ADMIN' || user?.globalRole === 'TEAM_LEADER') && (
              <button
                style={{ ...styles.backBtn, background: '#0052CC', color: '#fff', borderColor: '#0052CC' }}
                onClick={handleOpenAddModal}
                onMouseEnter={e => { e.target.style.background = '#0747A6'; }}
                onMouseLeave={e => { e.target.style.background = '#0052CC'; }}
              >
                ➕ Add Member
              </button>
            )}
            <button
              style={styles.backBtn}
              onClick={() => navigate(`/board/${activeProject.id}`)}
              onMouseEnter={e => { e.target.style.background = '#DEEBFF'; e.target.style.borderColor = '#0052CC'; e.target.style.color = '#0052CC'; }}
              onMouseLeave={e => { e.target.style.background = '#FAFBFC'; e.target.style.borderColor = '#DFE1E6'; e.target.style.color = '#172B4D'; }}
            >
              ← Back to Board
            </button>
          </div>
        )}
      </div>

      <div style={styles.statsRow}>
        <div
          style={styles.statChip({ bg: '#DFE1E6', color: '#42526E' }, roleFilter === 'ALL')}
          onClick={() => setRoleFilter('ALL')}
        >
          <strong>{members.length}</strong> All
        </div>
        {Object.entries(roleCount).map(([role, count]) => {
          const config = getRoleConfig(role);
          return (
            <div
              key={role}
              style={styles.statChip(config, roleFilter === role)}
              onClick={() => setRoleFilter(roleFilter === role ? 'ALL' : role)}
            >
              {config.icon} <strong>{count}</strong> {config.label}{count > 1 ? 's' : ''}
            </div>
          );
        })}
      </div>

      <div style={styles.searchWrap}>
        <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input style={styles.searchInput} type="text" placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={e => { e.target.style.borderColor = '#0052CC'; e.target.style.boxShadow = '0 0 0 3px rgba(0,82,204,0.1)'; e.target.style.background = '#fff'; }} onBlur={e => { e.target.style.borderColor = '#DFE1E6'; e.target.style.boxShadow = 'none'; e.target.style.background = '#FAFBFC'; }} />
      </div>

      {filteredMembers.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', background: '#FAFBFC', borderRadius: '12px', border: '2px dashed #DFE1E6' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#172B4D', marginBottom: '4px' }}>No members found</h3>
          <p style={{ fontSize: '14px', color: '#5E6C84' }}>Try a different search term or filter.</p>
        </div>
      ) : activeProject ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* Render Team Leaders and their members */}
          {teamLeaders.map(leaderMember => {
            const squad = groupedByLeader[leaderMember.user.id] || [];
            return (
              <div key={leaderMember.user.id} style={{ background: 'rgba(9, 30, 66, 0.02)', padding: '24px', borderRadius: '16px', border: '1px solid #EBECF0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0052CC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team Leader Squad</div>
                  <div style={{ flex: 1, height: '1px', background: '#EBECF0' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', alignItems: 'start' }}>
                  {/* The Leader themselves */}
                  <div style={{ border: '2px solid #0052CC', borderRadius: '12px', overflow: 'visible', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-10px', left: '12px', background: '#0052CC', color: 'white', fontSize: '10px', fontWeight: 900, padding: '2px 8px', borderRadius: '4px', zIndex: 5 }}>LEADER</div>
                    {renderMemberCard(leaderMember)}
                  </div>

                  {/* Their Squad */}
                  {squad.map(member => renderMemberCard(member))}
                </div>
              </div>
            );
          })}

          {/* Render Unassigned Members */}
          {groupedByLeader.unassigned.filter(m => m.user.globalRole !== 'TEAM_LEADER').length > 0 && (
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#5E6C84', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unassigned to Squad</div>
                <div style={{ flex: 1, height: '1px', background: '#EBECF0' }} />
              </div>
              <div style={styles.grid}>
                {groupedByLeader.unassigned
                  .filter(m => m.user.globalRole !== 'TEAM_LEADER')
                  .map(member => renderMemberCard(member))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredMembers.map((m) => renderMemberCard(m))}
        </div>
      )}

      <ConfirmModal
        show={showConfirm}
        title="Remove Member from Project"
        message={`Are you sure you want to remove ${memberToRemove?.user?.name} from this project? This will permanently remove their access to this board.`}
        onConfirm={handleConfirmRemove}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(9, 30, 66, 0.54)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#fff', width: '500px', borderRadius: '16px', padding: '32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'slideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#172B4D', marginBottom: '8px' }}>Add People to Project</h2>
            <p style={{ fontSize: '14px', color: '#5E6C84', marginBottom: '16px' }}>Select members from the workspace to add to <strong style={{ color: '#0052CC' }}>{activeProject?.name}</strong>.</p>
            
            {/* Designation Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#5E6C84' }}>Filter by Team:</span>
              <select 
                className="input" 
                value={addModalDesignationFilter} 
                onChange={e => setAddModalDesignationFilter(e.target.value)} 
                style={{ width: '180px', background: '#fff', border: '1px solid #DFE1E6', padding: '6px 12px', height: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
              >
                <option value="ALL">All Designations</option>
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

            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '24px', padding: '4px' }} className="hide-scrollbar">
              {availableWorkspaceMembers.filter(m => {
                if (addModalDesignationFilter !== 'ALL' && m.user?.designation !== addModalDesignationFilter) {
                  return false;
                }
                return true;
              }).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#8993A4', fontSize: '14px', background: '#F4F5F7', borderRadius: '8px' }}>
                  No members available matching this designation.
                </div>
              ) : (
                availableWorkspaceMembers.filter(m => {
                  if (addModalDesignationFilter !== 'ALL' && m.user?.designation !== addModalDesignationFilter) {
                    return false;
                  }
                  return true;
                }).map(m => (
                  <label
                    key={m.userId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      borderRadius: '10px', cursor: 'pointer', transition: 'all 0.1s',
                      background: selectedUserIds.includes(m.userId) ? '#E9F2FF' : 'transparent',
                      border: `1px solid ${selectedUserIds.includes(m.userId) ? '#0052CC' : '#EBECF0'}`,
                      marginBottom: '8px'
                    }}
                    onMouseEnter={e => { if (!selectedUserIds.includes(m.userId)) e.currentTarget.style.background = '#F4F5F7'; }}
                    onMouseLeave={e => { if (!selectedUserIds.includes(m.userId)) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      checked={selectedUserIds.includes(m.userId)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUserIds([...selectedUserIds, m.userId]);
                        else setSelectedUserIds(selectedUserIds.filter(id => id !== m.userId));
                      }}
                    />
                    {m.user.profilePic ? (
                      <img 
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${m.user.profilePic}`} 
                        alt={m.user.name} 
                        style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: getGradient(m.user.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                        {getInitials(m.user.name)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#172B4D' }}>{m.user.name}</div>
                      <div style={{ fontSize: '11px', color: '#5E6C84' }}>{m.user.globalRole} • {m.user.designation || 'No Designation'}</div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => { setShowAddModal(false); setSelectedUserIds([]); setAddModalDesignationFilter('ALL'); }}
                style={{ padding: '10px 20px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#42526E' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedUserIds.length === 0 || isAdding}
                style={{
                  padding: '10px 24px', background: '#0052CC', border: 'none', borderRadius: '8px',
                  fontWeight: 600, cursor: 'pointer', color: '#fff',
                  opacity: (selectedUserIds.length === 0 || isAdding) ? 0.6 : 1,
                  boxShadow: '0 4px 12px rgba(0, 82, 204, 0.3)'
                }}
              >
                {isAdding ? 'Adding...' : `Add ${selectedUserIds.length || ''} Member${selectedUserIds.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Premium Toast Notifications */}
      {successMessage && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: 'rgba(9, 135, 87, 0.95)', color: '#fff',
          padding: '16px 24px', borderRadius: '12px', zIndex: 10000,
          boxShadow: '0 8px 24px rgba(9, 135, 87, 0.3)',
          display: 'flex', alignItems: 'center', gap: '12px',
          fontWeight: 600, fontSize: '14px', backdropFilter: 'blur(8px)',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <span style={{ fontSize: '18px' }}>✔️</span>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: 'rgba(222, 53, 11, 0.95)', color: '#fff',
          padding: '16px 24px', borderRadius: '12px', zIndex: 10000,
          boxShadow: '0 8px 24px rgba(222, 53, 11, 0.3)',
          display: 'flex', alignItems: 'center', gap: '12px',
          fontWeight: 600, fontSize: '14px', backdropFilter: 'blur(8px)',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default MembersPage;
