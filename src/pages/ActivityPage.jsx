import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const ActivityPage = () => {
  const [activities, setActivities] = useState([]);
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/activity${level ? `?level=${level}` : ''}`);
        setActivities(res.data);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchActivities();
  }, [level]);

  const getLevelBadgeStyle = (level) => {
    switch (level?.toLowerCase()) {
      case 'task':
        return {
          bg: 'rgba(99, 102, 241, 0.08)',
          color: 'var(--accent)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          icon: (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          )
        };
      case 'project':
        return {
          bg: 'rgba(16, 185, 129, 0.08)',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          icon: (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          )
        };
      default:
        return {
          bg: 'rgba(249, 115, 22, 0.08)',
          color: '#f97316',
          border: '1px solid rgba(249, 115, 22, 0.15)',
          icon: (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          )
        };
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem', paddingBottom: '4rem', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* Header section with modern filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
            Activity Log
          </h1>
          <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
            A real-time audit trail of all workspace, project, and task updates.
          </p>
        </div>
        <select 
          value={level} 
          onChange={e => setLevel(e.target.value)}
          style={{ 
            background: '#ffffff', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            padding: '8px 16px', 
            fontWeight: 600, 
            fontSize: '0.85rem', 
            color: 'var(--text-dark)', 
            cursor: 'pointer', 
            outline: 'none',
            height: '38px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <option value="">All Levels</option>
          <option value="workspace">Workspace Logs</option>
          <option value="project">Project Logs</option>
          <option value="task">Task Logs</option>
        </select>
      </div>

      {/* Main timeline listing */}
      <div style={{ 
        background: '#ffffff', 
        border: '1px solid var(--border)', 
        borderRadius: '12px', 
        padding: '2rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Loading timeline logs...</p>
          </div>
        ) : activities.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>📭</span>
            <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>No activity events recorded yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {activities.map((act, index) => {
              const styles = getLevelBadgeStyle(act.level);
              return (
                <div 
                  key={act.id} 
                  style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    alignItems: 'flex-start', 
                    paddingBottom: '1.25rem', 
                    borderBottom: index !== activities.length - 1 ? '1px solid var(--border)' : 'none' 
                  }}
                >
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '8px', 
                    background: styles.bg, 
                    color: styles.color, 
                    border: styles.border,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0 
                  }}>
                    {styles.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                      {act.text}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontFamily: 'monospace' }}>
                        {new Date(act.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>•</span>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 700, 
                        background: styles.bg, 
                        color: styles.color, 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {act.level}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;
