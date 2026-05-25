import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BoardPage from './BoardPage';
import ReportsPage from './ReportsPage';
import ActivityPage from './ActivityPage';
import MembersPage from './MembersPage';
import AssignedTasksPage from './AssignedTasksPage';
import MyTeamPage from './MyTeamPage';
import TeamMembersPage from './TeamMembersPage';
import MemberReportPage from './MemberReportPage';
import SquadDetailsPage from './SquadDetailsPage';
import GlobalReportPage from './GlobalReportPage';
import InvitePage from './InvitePage';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    if (saved !== null) return saved === 'true';
    return window.innerWidth > 768; // Default: true on desktop, false on mobile
  });
  const [activeProject, setActiveProject] = useState(() => {
    const saved = localStorage.getItem('activeProject');
    if (saved === 'none') return null;
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    fetchWorkspace();
  }, []);

  useEffect(() => {
    if (activeProject) {
      localStorage.setItem('activeProject', JSON.stringify(activeProject));
    } else {
      localStorage.setItem('activeProject', 'none');
    }
  }, [activeProject]);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', sidebarOpen);
  }, [sidebarOpen]);

  const fetchWorkspace = async () => {
    try {
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      <Sidebar 
        activeProject={activeProject} 
        setActiveProject={setActiveProject} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen}
      />

      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Floating Premium Toggle Button (Hamburger) */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`sidebar-toggle-btn ${sidebarOpen ? 'open' : 'closed'}`}
        style={{
          position: 'absolute',
          top: '24px',
          left: sidebarOpen ? '280px' : '88px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
          border: 'none',
          boxShadow: '0 6px 16px rgba(79, 70, 229, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease, box-shadow 0.2s ease',
          zIndex: 9999,
          outline: 'none',
          willChange: 'left, transform'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 10px 24px rgba(79, 70, 229, 0.4), inset 0 2px 6px rgba(255, 255, 255, 0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
        }}
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#FFFFFF" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          style={{ 
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            transform: sidebarOpen ? 'rotate(90deg)' : 'rotate(0deg)' 
          }}
        >
          <line 
            x1="4" y1="6" x2="20" y2="6" 
            style={{ 
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
              transformOrigin: '12px 12px', 
              transform: sidebarOpen ? 'translateY(6px) rotate(45deg)' : 'none' 
            }} 
          />
          <line 
            x1="4" y1="12" x2="20" y2="12" 
            style={{ 
              transition: 'opacity 0.2s ease', 
              opacity: sidebarOpen ? 0 : 1 
            }} 
          />
          <line 
            x1="4" y1="18" x2={sidebarOpen ? "20" : "14"} y2="18" 
            style={{ 
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
              transformOrigin: '12px 12px', 
              transform: sidebarOpen ? 'translateY(-6px) rotate(-45deg)' : 'none' 
            }} 
          />
        </svg>
      </button>

      <div className="main-content" style={{ 
        padding: '2rem 2rem 2rem 4.5rem'
      }}>
        <Routes>
          <Route path="/" element={<Navigate to={activeProject ? `/board/${activeProject.id}` : (user?.globalRole === 'MEMBER' ? '/member-report' : '/reports')} />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/board/:projectId" element={<BoardPage />} />
          <Route path="/board/:projectId/member/:memberId" element={<BoardPage />} />
          <Route path="/reports" element={<ReportsPage activeProject={activeProject} />} />
          <Route path="/global-report" element={<GlobalReportPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/members" element={<MembersPage activeProject={activeProject} />} />
          <Route path="/team/:leaderId" element={<TeamMembersPage activeProject={activeProject} />} />
          <Route path="/my-team" element={<MyTeamPage activeProject={activeProject} />} />
          <Route path="/squad-details/:leaderId" element={<SquadDetailsPage activeProject={activeProject} />} />
          <Route path="/assigned-tasks" element={<AssignedTasksPage />} />
          <Route path="/member-report/:targetUserId?" element={<MemberReportPage activeProject={activeProject} />} />
          <Route path="/invite" element={<InvitePage />} />
        </Routes>
      </div>
    </div>
  );
};

export default DashboardPage;

