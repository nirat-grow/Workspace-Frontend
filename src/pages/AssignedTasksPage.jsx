import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const AssignedTasksPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals and action states
  
  // Custom task form states

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
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks/my-assigned');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitClick = (task) => {
    if (task && task.projectId) {
      navigate(`/board/${task.projectId}`);
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'URGENT': return { bg: '#fee2e2', color: '#ef4444' };
      case 'HIGH': return { bg: '#ffedd5', color: '#f97316' };
      case 'MEDIUM': return { bg: '#fef3c7', color: '#d97706' };
      case 'LOW': return { bg: '#d1fae5', color: '#059669' };
      default: return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'TODO': return { bg: '#f1f5f9', color: '#475569' };
      case 'PROGRESS': return { bg: '#dbeafe', color: '#2563eb' };
      case 'REVIEW': return { bg: '#f3e8ff', color: '#7c3aed' };
      case 'DONE': return { bg: '#d1fae5', color: '#059669' };
      default: return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Loading assigned tasks...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', paddingBottom: '4rem', animation: 'fadeIn 0.4s ease-out' }}>
      {/* Top Header Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
          Tasks from Admin
        </h1>
        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
          Claim administrative tasks directly to work on them or distribute them across your squad.
        </p>
      </div>

      {/* Premium Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Card 1: Total Tasks */}
        <div className="card" style={{ borderLeft: '3px solid var(--accent)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: '#ffffff' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: '700', letterSpacing: '0.5px' }}>
            Total Tasks
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--accent)', lineHeight: '1.2' }}>
            {tasks.length}
          </div>
        </div>

        {/* Card 2: Pending */}
        <div className="card" style={{ borderLeft: '3px solid #f59e0b', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: '#ffffff' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: '700', letterSpacing: '0.5px' }}>
            Pending Tasks
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f59e0b', lineHeight: '1.2' }}>
            {tasks.filter(t => t.status !== 'DONE').length}
          </div>
        </div>

        {/* Card 3: Completed */}
        <div className="card" style={{ borderLeft: '3px solid var(--status-done)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: '#ffffff' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', fontWeight: '700', letterSpacing: '0.5px' }}>
            Completed Tasks
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--status-done)', lineHeight: '1.2' }}>
            {tasks.filter(t => t.status === 'DONE').length}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px dashed var(--border)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎉</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>All caught up!</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: 0 }}>You don't have any pending tasks assigned from Admin right now.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tasks.map(task => {
            const prioStyle = getPriorityStyle(task.priority);
            const statusStyle = getStatusStyle(task.status);

            return (
              <div
                key={task.id}
                className="assigned-task-card"
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '1.25rem 1.5rem',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.03)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                }}
              >
                {/* Task Details Row */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)', fontFamily: 'monospace', background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                      {task.taskKey}
                    </span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: prioStyle.bg, color: prioStyle.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {task.priority}
                    </span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: statusStyle.bg, color: statusStyle.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {task.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 4px 0', lineHeight: 1.4 }}>
                    {task.title}
                  </h3>

                  {task.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '0 0 10px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                      {task.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 500 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                      {task.project?.name}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Premium Interactive Action buttons */}
                <div className="assigned-task-actions" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleSplitClick(task)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(99, 102, 241, 0.06)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 2px rgba(99, 102, 241, 0.04)',
                      outline: 'none'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.06)'; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l5-5-5-5M18 12H6"></path></svg>
                    Split Up
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

export default AssignedTasksPage;
