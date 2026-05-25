import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocketContext } from '../context/SocketContext';
import api from '../api/axios';
import logoImg from '../logo.png';

const Sidebar = ({ activeProject, setActiveProject, isOpen, setIsOpen }) => {
  const { user, logout, updateUser } = useAuth();
  const socket = useSocketContext();
  const navigate = useNavigate();
  const activeProjectRef = useRef(activeProject);
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      setIsOpen?.(false);
    }
  };

  useEffect(() => {
    if (activeProject) {
      setProjectsExpanded(true);
    }
  }, [activeProject]);

  // Profile settings states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileDesignation, setProfileDesignation] = useState(user?.designation || 'Frontend');
  const [profileTelegramId, setProfileTelegramId] = useState(user?.telegramId || '');
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileDesignation(user.designation || 'Frontend');
      setProfileTelegramId(user.telegramId || '');
      setProfilePicFile(null);
      setProfilePicPreview(null);
    }
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', profileName);
      formData.append('designation', profileDesignation);
      formData.append('telegramId', profileTelegramId);
      if (profilePicFile) {
        formData.append('profilePic', profilePicFile);
      }

      const res = await api.put('/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      updateUser(res.data.user);
      setShowProfileModal(false);
      setToast({ show: true, message: 'Profile updated successfully!', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: err.response?.data?.error || 'Failed to update profile', type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 4000);
    }
  };

  // New states for modern invite animation
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // We need a workspace to create projects. Let's assume workspace ID 1 exists or we use user's first workspace
  // To keep it simple, we'll try to create a workspace if we are admin, or fetch it.
  // Actually let's just make it possible to fetch projects directly if we add a GET /api/projects route.
  // But wait, the backend spec says GET /api/workspaces/:id returns projects.

  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  useEffect(() => {
    activeProjectRef.current = activeProject;
  }, [activeProject]);

  const refreshProjects = useCallback(async (wsId, { autoSelect = false } = {}) => {
    if (!wsId) return;
    try {
      const res = await api.get(`/workspaces/${wsId}`);
      if (res.data.projects) {
        setProjects(res.data.projects);

        const current = activeProjectRef.current;
        if (current) {
          const stillMember = res.data.projects.find((p) => p.id === current.id);
          if (stillMember) {
            setActiveProject(stillMember);
          } else if (res.data.projects.length > 0) {
            setActiveProject(res.data.projects[0]);
          } else {
            setActiveProject(null);
          }
        } else if (autoSelect && res.data.projects.length > 0) {
          const saved = localStorage.getItem('activeProject');
          if (saved === 'none') {
            // Do not auto-select a project if explicitly cleared (e.g. Hopefly Meta global pool view)
          } else {
            let parsed = null;
            try {
              if (saved) parsed = JSON.parse(saved);
            } catch (e) { }

            if (parsed) {
              const exists = res.data.projects.find((p) => p.id === parsed.id);
              if (exists) {
                setActiveProject(exists);
              } else {
                setActiveProject(res.data.projects[0]);
              }
            } else {
              setActiveProject(res.data.projects[0]);
            }
          }
        }
      }
      if (res.data.members) setWorkspaceMembers(res.data.members);
    } catch (err) {
      console.error(err);
    }
  }, [setActiveProject]);

  useEffect(() => {
    if (user?.workspaces?.length > 0) {
      const wsId = user.workspaces[0].workspaceId;
      setWorkspaceId(wsId);
      refreshProjects(wsId, { autoSelect: true });
    }
  }, [user, refreshProjects]);

  useEffect(() => {
    if (!socket || !workspaceId) return;

    const onProjectsUpdated = () => {
      refreshProjects(workspaceId);
      setProjectsExpanded(true);
    };

    socket.on('projects:updated', onProjectsUpdated);
    return () => socket.off('projects:updated', onProjectsUpdated);
  }, [socket, workspaceId, refreshProjects]);

  useEffect(() => {
    if (!workspaceId) return;

    const onFocus = () => refreshProjects(workspaceId);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [workspaceId, refreshProjects]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!workspaceId) {
      alert("Please create a workspace first (API needed)");
      return;
    }
    try {
      const res = await api.post('/projects', {
        name: newProjectName,
        key: newProjectName.substring(0, 3).toUpperCase(),
        workspaceId
      });
      setProjects([...projects, res.data]);
      setNewProjectName('');
      setShowCreate(false);
    } catch (err) {
      console.error(err);
    }
  };



  const toggleCreate = () => {
    if (!showCreate && workspaceId) {
      // Refresh members list before showing the form
      api.get(`/workspaces/${workspaceId}`)
        .then(res => {
          if (res.data.members) setWorkspaceMembers(res.data.members);
        })
        .catch(console.error);
    }
    setShowCreate(!showCreate);
  };
  const currentPath = window.location.pathname;

  return (
    <div className={`sidebar-container ${isOpen ? 'open' : 'closed'}`} style={{
      width: isOpen ? '260px' : '68px',
      flexShrink: 0,
      background: '#1a1f2e',
      color: 'var(--sidebar-text)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      transition: 'width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
      willChange: 'width'
    }}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ padding: isOpen ? '1.5rem' : '1rem 0.5rem', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="sidebar-scroll">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem', height: '36px', position: 'relative' }}>
            <img 
              src={logoImg} 
              alt="Hopefly Logo" 
              style={{ 
                height: '32px', 
                objectFit: 'contain', 
                opacity: isOpen ? 1 : 0, 
                transition: 'opacity 0.2s ease', 
                position: isOpen ? 'static' : 'absolute',
                pointerEvents: isOpen ? 'auto' : 'none' 
              }} 
            />
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: 'white',
              fontSize: '18px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              opacity: isOpen ? 0 : 1,
              transition: 'opacity 0.2s ease',
              position: isOpen ? 'absolute' : 'static',
              pointerEvents: isOpen ? 'none' : 'auto'
            }}>
              H
            </div>
          </div>

          {/* Premium Profile Section at the Top */}
          <div 
            onClick={!isOpen ? () => setShowProfileModal(true) : undefined}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: isOpen ? '12px' : '8px',
              marginBottom: '2rem',
              cursor: !isOpen ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.25s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
            onMouseEnter={e => {
              if (!isOpen) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={e => {
              if (!isOpen) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.transform = 'none';
              }
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isOpen ? '12px' : '0px', 
              width: '100%', 
              justifyContent: 'center',
              transition: 'gap 0.25s cubic-bezier(0.25, 1, 0.5, 1)'
            }}>
              {user?.profilePic ? (
                <img
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api${user.profilePic}`}
                  alt={user.name}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    boxShadow: '0 4px 10px rgba(0, 82, 204, 0.3)',
                    flexShrink: 0
                  }}
                />
              ) : (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0052CC 0%, #00B8D9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  boxShadow: '0 4px 10px rgba(0, 82, 204, 0.3)',
                  flexShrink: 0
                }}>
                  {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                </div>
              )}
              <div style={{ 
                flex: 1, 
                minWidth: 0, 
                opacity: isOpen ? 1 : 0, 
                maxWidth: isOpen ? '200px' : '0px',
                transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)', 
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}>
                <div style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name}
                </div>
                <div style={{ color: 'var(--text-light)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>
                  {user?.globalRole?.toLowerCase()?.replace('_', ' ')} {user?.designation ? `• ${user.designation}` : ''}
                </div>
              </div>
            </div>

            <div style={{
              width: '100%',
              maxHeight: isOpen ? '40px' : '0px',
              opacity: isOpen ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease, margin-top 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
              marginTop: isOpen ? '0.8rem' : '0px'
            }}>
              <button
                onClick={() => { setShowProfileModal(true); handleNavClick(); }}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.07)',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Edit Profile
              </button>
            </div>
          </div>

          {user?.globalRole === 'ADMIN' && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ 
                maxHeight: isOpen ? '30px' : '0px', 
                opacity: isOpen ? 1 : 0, 
                overflow: 'hidden', 
                transition: 'max-height 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: isOpen ? '0.5rem' : '0px', 
                padding: '4px 0' 
              }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '700', letterSpacing: '0.5px' }}>Company</span>
              </div>
              <Link
                to="/members"
                onClick={() => { setActiveProject(null); handleNavClick(); }}
                style={{
                  color: !activeProject ? 'white' : 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  gap: isOpen ? '8px' : '0px',
                  padding: isOpen ? '6px 10px 6px 16px' : '10px 0',
                  borderRadius: '6px',
                  background: !activeProject ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                  fontWeight: !activeProject ? '600' : '400',
                  transition: 'all 0.15s',
                  fontSize: '0.875rem'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'white';
                  if (activeProject) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = !activeProject ? 'white' : 'rgba(255, 255, 255, 0.6)';
                  if (activeProject) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span style={{ 
                  opacity: isOpen ? 1 : 0, 
                  maxWidth: isOpen ? '150px' : '0px',
                  transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>Hopefly</span>
              </Link>
              <Link 
                to="/global-report" 
                onClick={handleNavClick}
                style={{
                  color: currentPath === '/global-report' ? 'white' : 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  gap: isOpen ? '8px' : '0px',
                  padding: isOpen ? '6px 10px 6px 16px' : '10px 0',
                  borderRadius: '6px',
                  background: currentPath === '/global-report' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                  fontWeight: currentPath === '/global-report' ? '600' : '400',
                  transition: 'all 0.15s',
                  fontSize: '0.875rem',
                  marginTop: '2px'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'white'; if (currentPath !== '/global-report') e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = currentPath === '/global-report' ? 'white' : 'rgba(255, 255, 255, 0.6)'; if (currentPath !== '/global-report') e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span style={{ 
                  opacity: isOpen ? 1 : 0, 
                  maxWidth: isOpen ? '150px' : '0px',
                  transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>Global Report</span>
              </Link>
            </div>
          )}

          {user?.globalRole === 'TEAM_LEADER' && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ 
                maxHeight: isOpen ? '30px' : '0px', 
                opacity: isOpen ? 1 : 0, 
                overflow: 'hidden', 
                transition: 'max-height 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: isOpen ? '0.5rem' : '0px', 
                padding: '4px 0' 
              }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '700', letterSpacing: '0.5px' }}>Core Team</span>
              </div>
              <Link 
                to="/my-team?view=core" 
                onClick={handleNavClick}
                style={{ 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  textDecoration: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  gap: isOpen ? '8px' : '0px',
                  padding: isOpen ? '6px 10px 6px 16px' : '10px 0',
                  borderRadius: '6px', 
                  background: 'transparent',
                  fontWeight: '400',
                  transition: 'all 0.15s',
                  fontSize: '0.875rem'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, color: '#10b981' }}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span style={{ 
                  opacity: isOpen ? 1 : 0, 
                  maxWidth: isOpen ? '150px' : '0px',
                  transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>Core Team</span>
              </Link>
              <Link 
                to="/global-report" 
                onClick={handleNavClick}
                style={{
                  color: currentPath === '/global-report' ? 'white' : 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  gap: isOpen ? '8px' : '0px',
                  padding: isOpen ? '6px 10px 6px 16px' : '10px 0',
                  borderRadius: '6px',
                  background: currentPath === '/global-report' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                  fontWeight: currentPath === '/global-report' ? '600' : '400',
                  transition: 'all 0.15s',
                  fontSize: '0.875rem',
                  marginTop: '2px'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'white'; if (currentPath !== '/global-report') e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = currentPath === '/global-report' ? 'white' : 'rgba(255, 255, 255, 0.6)'; if (currentPath !== '/global-report') e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, color: '#3b82f6', flexShrink: 0 }}>
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span style={{ 
                  opacity: isOpen ? 1 : 0, 
                  maxWidth: isOpen ? '150px' : '0px',
                  transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>Team Global Report</span>
              </Link>
            </div>
          )}


          <div style={{ marginBottom: '2rem' }}>
            <div 
              style={{ 
                maxHeight: isOpen ? '30px' : '0px',
                opacity: isOpen ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: isOpen ? '0.5rem' : '0px',
                userSelect: 'none',
                padding: '4px 0'
              }}
            >
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}
              >
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.4)', fontWeight: '700', letterSpacing: '0.5px' }}>
                  Projects
                </span>
              </div>
              {user?.globalRole === 'ADMIN' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCreate();
                  }} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'rgba(255, 255, 255, 0.4)', 
                    cursor: 'pointer',
                    padding: '2px 6px',
                    fontSize: '1rem',
                    fontWeight: '300',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
                >
                  +
                </button>
              )}
            </div>

            {true && (
              <div style={{ animation: 'slideDown 0.15s ease-out' }}>
                <div style={{
                  maxHeight: (isOpen && showCreate) ? '150px' : '0px',
                  opacity: (isOpen && showCreate) ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.25s ease, opacity 0.2s ease',
                  marginBottom: (isOpen && showCreate) ? '0.75rem' : '0px'
                }}>
                  <form onSubmit={handleCreateProject} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
                    <input 
                      className="input" 
                      value={newProjectName} 
                      onChange={e => setNewProjectName(e.target.value)} 
                      placeholder="Project Name" 
                      required 
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        color: 'white', 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        width: '100%',
                        boxSizing: 'border-box',
                        marginBottom: '0.5rem',
                        outline: 'none'
                      }} 
                    />
                    <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.7rem', padding: '4px' }}>Create</button>
                  </form>
                </div>

                {/* Project Search Bar */}
                {isOpen && projects.length > 3 && (
                  <div style={{
                    marginBottom: '8px',
                    position: 'relative'
                  }}>
                    <svg 
                      width="12" height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="rgba(255,255,255,0.35)" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '5px 10px 5px 28px',
                        color: 'white',
                        fontSize: '0.78rem',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                    />
                  </div>
                )}

                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).map(p => {
                    const isActive = activeProject?.id === p.id;
                    return (
                      <li 
                        key={p.id} 
                        style={{ 
                          padding: isOpen ? '6px 10px 6px 16px' : '10px 0', 
                          cursor: 'pointer', 
                          background: isActive ? 'rgba(255, 255, 255, 0.06)' : 'transparent', 
                          borderRadius: '6px',
                          color: isActive ? 'white' : 'rgba(255, 255, 255, 0.6)',
                          fontWeight: isActive ? '600' : '400',
                          transition: 'all 0.15s',
                          marginBottom: '2px',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: isOpen ? 'flex-start' : 'center',
                          gap: isOpen ? '8px' : '0px'
                        }} 
                        onClick={() => { setActiveProject(p); navigate(`/board/${p.id}`); handleNavClick(); }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = 'white';
                          if (!isActive) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = isActive ? 'white' : 'rgba(255, 255, 255, 0.6)';
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, color: isActive ? 'var(--accent)' : 'inherit', flexShrink: 0 }}>
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span style={{ 
                          opacity: isOpen ? 1 : 0, 
                          maxWidth: isOpen ? '150px' : '0px',
                          transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}>
                          {p.name}
                        </span>
                      </li>
                    );
                  })}
                  {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && projectSearch && isOpen && (
                    <li style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center' }}>
                      No projects match "{projectSearch}"
                    </li>
                  )}
                  {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && !projectSearch && isOpen && (
                    <li style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center' }}>
                      No projects found
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Link 
              to={`/board/${activeProject?.id || ''}`} 
              className={`sidebar-nav-link ${currentPath.startsWith('/board') && activeProject ? 'active' : ''}`}
              onClick={handleNavClick}
              style={{
                justifyContent: isOpen ? 'flex-start' : 'center',
                padding: isOpen ? '6px 10px 6px 16px' : '10px 0',
                gap: isOpen ? '8px' : '0px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
              <span style={{ 
                opacity: isOpen ? 1 : 0, 
                maxWidth: isOpen ? '150px' : '0px',
                transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}>Kanban Board</span>
            </Link>
            {['ADMIN', 'TEAM_LEADER', 'MANAGER'].includes(user?.globalRole) && (
              <Link 
                to="/reports" 
                className={`sidebar-nav-link ${currentPath === '/reports' ? 'active' : ''}`}
                onClick={handleNavClick}
                style={{
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  padding: isOpen ? '6px 10px 6px 16px' : '10px 0',
                  gap: isOpen ? '8px' : '0px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span style={{ 
                  opacity: isOpen ? 1 : 0, 
                  maxWidth: isOpen ? '150px' : '0px',
                  transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>Reports</span>
              </Link>
            )}

            {user?.globalRole !== 'ADMIN' && (
              <Link 
                to="/member-report" 
                className={`sidebar-nav-link ${currentPath === '/member-report' ? 'active' : ''}`}
                onClick={handleNavClick}
                style={{
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  padding: isOpen ? '6px 10px 6px 16px' : '10px 0',
                  gap: isOpen ? '8px' : '0px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span style={{ 
                  opacity: isOpen ? 1 : 0, 
                  maxWidth: isOpen ? '150px' : '0px',
                  transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>My Report</span>
              </Link>
            )}
            <Link 
              to="/activity" 
              className={`sidebar-nav-link ${currentPath === '/activity' ? 'active' : ''}`}
              onClick={handleNavClick}
              style={{
                justifyContent: isOpen ? 'flex-start' : 'center',
                padding: isOpen ? '6px 10px 6px 16px' : '10px 0',
                gap: isOpen ? '8px' : '0px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
                <path d="M12 2a10 10 0 0 0-7.75 3.75" strokeDasharray="3 3" />
              </svg>
              <span style={{ 
                opacity: isOpen ? 1 : 0, 
                maxWidth: isOpen ? '150px' : '0px',
                transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}>Activity Log</span>
            </Link>
            {['TEAM_LEADER', 'MANAGER'].includes(user?.globalRole) && (
              <Link 
                to="/assigned-tasks" 
                className={`sidebar-nav-link ${currentPath === '/assigned-tasks' ? 'active' : ''}`}
                onClick={handleNavClick}
                style={{
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  padding: isOpen ? '6px 10px 6px 16px' : '10px 0',
                  gap: isOpen ? '8px' : '0px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
                <span style={{ 
                  opacity: isOpen ? 1 : 0, 
                  maxWidth: isOpen ? '150px' : '0px',
                  transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>Tasks from Admin</span>
              </Link>
            )}
            <Link 
              to="/my-team" 
              className={`sidebar-nav-link ${currentPath.startsWith('/my-team') ? 'active' : ''}`}
              onClick={handleNavClick}
              style={{
                justifyContent: isOpen ? 'flex-start' : 'center',
                padding: isOpen ? '6px 10px 6px 16px' : '10px 0',
                gap: isOpen ? '8px' : '0px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span style={{ 
                opacity: isOpen ? 1 : 0, 
                maxWidth: isOpen ? '150px' : '0px',
                transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}>Team Management</span>
            </Link>
            {user?.globalRole === 'ADMIN' && (
              <Link 
                to="/invite" 
                className={`sidebar-nav-link ${currentPath === '/invite' ? 'active' : ''}`}
                onClick={handleNavClick}
                style={{
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  padding: isOpen ? '6px 10px 6px 16px' : '10px 0',
                  gap: isOpen ? '8px' : '0px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85, flexShrink: 0 }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="16" y1="11" x2="22" y2="11" />
                </svg>
                <span style={{ 
                  opacity: isOpen ? 1 : 0, 
                  maxWidth: isOpen ? '150px' : '0px',
                  transition: 'opacity 0.2s ease, max-width 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>Invite User</span>
              </Link>
            )}
          </div>
        </div>

        <div style={{ marginTop: 'auto', padding: isOpen ? '1rem 1.5rem' : '1rem 0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', transition: 'padding 0.25s ease' }}>
          <button
            onClick={() => { localStorage.removeItem('activeProject'); logout(); handleNavClick(); }}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#f87171',
              border: '1px solid rgba(248, 113, 113, 0.2)',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isOpen ? 'flex-start' : 'center',
              gap: isOpen ? '10px' : '0px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(248, 113, 113, 0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {isOpen && <span>Sign Out</span>}
          </button>
        </div>
      </div>      {/* Premium Profile Settings Modal */}
      {showProfileModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '16px',
          boxSizing: 'border-box',
          animation: 'fadeIn 0.25s ease'
        }}>
          <div 
            className="sidebar-scroll"
            style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '420px',
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              boxSizing: 'border-box',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-dark)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              👤 Profile & Telegram Settings
            </h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-light)', fontSize: '0.85rem', lineHeight: 1.4 }}>
              Configure your profile info and receive personal Telegram task notifications.
            </p>

            <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Profile Pic Upload Section */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => document.getElementById('profilePicInput').click()}
                  className="avatar-container"
                >
                  {profilePicPreview ? (
                    <img
                      src={profilePicPreview}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : user?.profilePic ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api${user.profilePic}`}
                      alt="Current"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'rgba(99, 102, 241, 0.08)',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '24px'
                    }}>
                      {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U'}
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '10px',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    fontWeight: 700
                  }} className="avatar-overlay">
                    📸
                    <span>Change</span>
                  </div>
                </div>
                <input
                  type="file"
                  id="profilePicInput"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '8px', fontWeight: 600 }}>Click to upload new profile image</span>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
                <input
                  className="input"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  required
                  style={{ background: '#ffffff', color: '#000000', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', width: '100%', boxSizing: 'border-box', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Designation (Role)</label>
                <select
                  className="input"
                  value={profileDesignation}
                  onChange={e => setProfileDesignation(e.target.value)}
                  style={{ background: '#ffffff', color: '#000000', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', width: '100%', boxSizing: 'border-box', cursor: 'pointer', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                >
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

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Telegram Chat ID</label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Optional</span>
                </div>
                <input
                  className="input"
                  placeholder="e.g. 987654321"
                  value={profileTelegramId}
                  onChange={e => setProfileTelegramId(e.target.value)}
                  style={{ background: '#ffffff', color: '#000000', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', width: '100%', boxSizing: 'border-box', outline: 'none', fontSize: '0.85rem' }}
                />
                <span style={{ display: 'block', marginTop: '10px', fontSize: '0.75rem', color: '#d97706', lineHeight: '1.4', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)', padding: '8px 12px', borderRadius: '6px' }}>
                  💡 <b>Tip:</b> For task notifications, send a <b>/start</b> message to <b>@my_metadesk_bot</b> on Telegram.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  style={{ flex: 1, background: '#ffffff', color: 'var(--text-dark)', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, background: 'var(--accent)', border: 'none', fontWeight: 700, padding: '10px', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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
          zIndex: 9999,
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
        .avatar-container:hover .avatar-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
