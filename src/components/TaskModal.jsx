import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

const TaskModal = ({ taskId, onClose, projectId }) => {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [stuckReason, setStuckReason] = useState('');
  const [holdReason, setHoldReason] = useState('');
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [projectMembers, setProjectMembers] = useState([]);
  const [showStuckModal, setShowStuckModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [modalReason, setModalReason] = useState('');
  const [holdModalReason, setHoldModalReason] = useState('');
  const [designationFilter, setDesignationFilter] = useState('ALL');

  useEffect(() => {
    fetchTask();
    fetchProjectMembers();
  }, [taskId]);

  useSocket(projectId, {
    onCommentAdded: ({ taskId: incomingTaskId, comment: newComment }) => {
      if (incomingTaskId === taskId) {
        setTask(prev => {
          if (!prev) return null;
          if (prev.comments.some(c => c.id === newComment.id)) return prev;
          return {
            ...prev,
            comments: [newComment, ...prev.comments]
          };
        });
      }
    },
    onTaskUpdated: (updatedTask) => {
      if (updatedTask.id === taskId) {
        setTask(prev => {
          if (!prev) return null;
          return {
            ...prev,
            ...updatedTask,
            comments: prev.comments,
            timeLogs: prev.timeLogs,
            attachments: updatedTask.attachments || prev.attachments
          };
        });
      }
    },
    onTaskStatusChanged: ({ taskId: incomingTaskId, newStatus }) => {
      if (incomingTaskId === taskId) {
        setTask(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: newStatus
          };
        });
      }
    }
  });

  const fetchTask = async () => {
    try {
      const res = await api.get(`/tasks/${taskId}`);
      setTask(res.data);
      setEditTitle(res.data.title);
      setEditDesc(res.data.description || '');
      setEditStartDate(res.data.createdAt ? res.data.createdAt.split('T')[0] : '');
      setEditDueDate(res.data.dueDate ? res.data.dueDate.split('T')[0] : '');
      setStuckReason(res.data.stuckReason || '');
      setHoldReason(res.data.holdReason || '');
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjectMembers = async () => {
    try {
      const res = await api.get(`/projects/${projectId}`);
      setProjectMembers(res.data.members || []);
    } catch (err) {
      console.error('Failed to fetch project members', err);
    }
  };

  const handleUpdate = async () => {
    try {
      const combineTime = (dateStr) => {
        if (!dateStr) return null;
        const now = new Date();
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
      };
      await api.put(`/tasks/${taskId}`, { 
        title: editTitle, 
        description: editDesc, 
        dueDate: combineTime(editDueDate),
        startTime: combineTime(editStartDate)
      });
      setIsEditing(false);
      fetchTask();
    } catch (err) {
      alert('Failed to update task. Check permissions.');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'STUCK' && !stuckReason) {
      setShowStuckModal(true);
      return;
    }
    if (newStatus === 'HOLD' && !holdReason) {
      setShowHoldModal(true);
      return;
    }
    try {
      await api.put(`/tasks/${task.id}/status`, { status: newStatus, stuckReason: newStatus === 'STUCK' ? stuckReason : null });
      fetchTask();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleStuckConfirm = async (reason) => {
    try {
      await api.put(`/tasks/${taskId}/status`, { status: 'STUCK', stuckReason: reason });
      setStuckReason(reason);
      setShowStuckModal(false);
      setModalReason('');
      fetchTask();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleHoldConfirm = async (reason) => {
    try {
      await api.put(`/tasks/${taskId}/status`, { status: 'HOLD', holdReason: reason });
      setHoldReason(reason);
      setShowHoldModal(false);
      setHoldModalReason('');
      fetchTask();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleAssigneeChange = async (assigneeId) => {
    try {
      await api.put(`/tasks/${taskId}/assign`, { assigneeId: assigneeId || null });
      fetchTask();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to re-assign task.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment) return;
    try {
      await api.post(`/tasks/${taskId}/comments`, { text: comment });
      setComment('');
      fetchTask();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogTime = async (e) => {
    e.preventDefault();
    if (!hours) return;
    try {
      await api.post(`/tasks/${taskId}/timelog`, { hours, note });
      setHours('');
      setNote('');
      fetchTask();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      await api.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchTask();
    } catch (err) {
      alert('Failed to upload files: ' + (err.response?.data?.error || err.message));
    }
    e.target.value = null;
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
      fetchTask();
    } catch (err) {
      alert('Failed to delete attachment. Check permissions.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      onClose();
    } catch (err) {
      alert('Failed to delete task. Check permissions.');
    }
  };

  if (!task) return null;

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'URGENT': return { bg: '#fee2e2', color: '#ef4444' };
      case 'HIGH': return { bg: '#ffedd5', color: '#f97316' };
      case 'MEDIUM': return { bg: '#fef3c7', color: '#d97706' };
      case 'LOW': return { bg: '#d1fae5', color: '#059669' };
      default: return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  const prioStyle = getPriorityStyle(task.priority);

  return (
    <div className="task-modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.3)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease-out', padding: '16px', boxSizing: 'border-box'
    }}>
      <div className="task-modal-content" style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '2.5rem',
        boxSizing: 'border-box'
      }}>
        {/* Modern Close button */}
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            background: 'none', border: 'none', color: 'var(--text-light)',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', width: '32px', height: '32px',
            borderRadius: '50%', transition: 'background-color 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
          {/* Left Column */}
          <div style={{ flex: 1.8, minWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', fontFamily: 'monospace', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '4px' }}>
                {task.taskKey}
              </span>
            </div>
            
            {isEditing ? (
              <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: '4px' }}>Task Title</label>
                  <input 
                    className="input" 
                    value={editTitle} 
                    onChange={e => setEditTitle(e.target.value)} 
                    style={{ fontSize: '1.1rem', fontWeight: 'bold', outline: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', width: '100%', boxSizing: 'border-box', color: '#000' }} 
                  />
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: '4px' }}>Start Date</label>
                    <input 
                      type="date" 
                      className="input" 
                      value={editStartDate} 
                      onChange={e => setEditStartDate(e.target.value)} 
                      style={{ width: '180px', outline: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: '#000' }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: '4px' }}>Due Date</label>
                    <input 
                      type="date" 
                      className="input" 
                      value={editDueDate} 
                      onChange={e => setEditDueDate(e.target.value)} 
                      style={{ width: '180px', outline: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: '#000' }} 
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', display: 'block', marginBottom: '4px' }}>Description</label>
                  <textarea 
                    className="input" 
                    value={editDesc} 
                    onChange={e => setEditDesc(e.target.value)} 
                    style={{ height: '100px', resize: 'vertical', outline: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', width: '100%', boxSizing: 'border-box', color: '#000' }} 
                    placeholder="Provide details about the task..." 
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button className="btn btn-primary" onClick={handleUpdate} style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>Save Changes</button>
                  <button className="btn" onClick={() => setIsEditing(false)} style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid var(--border)', background: '#ffffff', color: 'var(--text-dark)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>{task.title}</h2>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {task.createdAt && (
                      <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)', padding: '3px 8px', borderRadius: '4px', color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>Start:</span>
                        {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                      </span>
                    )}
                    {task.dueDate && (
                      <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', color: 'var(--text-dark)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>Due:</span>
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-dark)', fontSize: '0.95rem', lineHeight: 1.6, fontWeight: 500 }}>
                  {task.description || <span style={{ fontStyle: 'italic', opacity: 0.6, color: 'var(--text-light)', fontWeight: 400 }}>No description provided.</span>}
                </div>
                
                {task.status === 'STUCK' && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff1f2', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px' }}>
                    <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Blocker Reason</div>
                    <div style={{ color: '#b91c1c', fontSize: '0.8rem', fontWeight: 500 }}>{task.stuckReason || 'No reason provided.'}</div>
                  </div>
                )}

                <button 
                  className="btn" 
                  style={{ marginTop: '1rem', border: '1px solid var(--border)', background: '#ffffff', color: 'var(--text-dark)', fontSize: '0.75rem', fontWeight: 600, padding: '6px 12px', borderRadius: '6px' }} 
                  onClick={() => setIsEditing(true)}
                >
                  Edit Details
                </button>
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />

            {/* Comments */}
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 1rem 0' }}>Comments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
              {task.comments.map(c => (
                <div key={c.id} style={{ background: '#f8fafc', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-dark)' }}>{c.author.name}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-light)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: 1.4 }}>{c.text}</div>
                </div>
              ))}
              {task.comments.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic', margin: 0 }}>No comments yet. Start the conversation!</p>
              )}
            </div>
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
              <input 
                className="input" 
                placeholder="Add a comment..." 
                value={comment} 
                onChange={e => setComment(e.target.value)} 
                style={{ flex: 1, outline: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem', color: '#000' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>Send</button>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />

            {/* Attachments */}
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 1rem 0' }}>Attachments</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
              {task.attachments?.map(a => (
                <div 
                  key={a.id} 
                  style={{ 
                    background: '#ffffff', 
                    padding: '6px 10px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <a 
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api${a.url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.75rem', textDecoration: 'none', color: 'var(--accent)', overflow: 'hidden', textOriginal: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: 600 }}
                  >
                    📎 {a.filename}
                  </a>
                  <button 
                    onClick={() => handleDeleteAttachment(a.id)}
                    style={{ 
                      background: 'none', border: 'none', color: 'var(--text-light)', 
                      cursor: 'pointer', fontSize: '1.1rem', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', padding: 0
                    }}
                    title="Remove File"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '10px' }}>
              <label 
                style={{ 
                  cursor: 'pointer', background: '#ffffff', border: '1px solid var(--border)', 
                  padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, 
                  color: 'var(--text-dark)', display: 'inline-flex', alignItems: 'center', gap: '4px' 
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Upload Files
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Assignee */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Assignee</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <select 
                    value={designationFilter} 
                    onChange={e => setDesignationFilter(e.target.value)} 
                    style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 600, fontSize: '0.75rem', padding: '6px 10px', height: '32px', outline: 'none', color: '#000' }}
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

                  <select 
                    value={task.assigneeId || ''} 
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 600, fontSize: '0.75rem', padding: '6px 10px', height: '32px', outline: 'none', color: '#000' }}
                  >
                    <option value="">Unassigned</option>
                    {projectMembers
                      .filter(m => {
                        if (designationFilter !== 'ALL' && m.user?.designation !== designationFilter) {
                          return false;
                        }
                        if (user?.globalRole === 'ADMIN' || user?.globalRole === 'MEMBER') {
                          return true;
                        }
                        if (user?.globalRole === 'TEAM_LEADER') {
                          if (m.user.id === user.id) return true; // Can assign to themselves
                          return m.user.globalRole === 'MEMBER' && (m.user.teamLeaderId === user.id || (m.user.teamLeaderId == null && m.user.designation === user.designation));
                        }
                        return false; 
                      })
                      .sort((a, b) => {
                        if (a.user.globalRole === 'TEAM_LEADER' && b.user.globalRole !== 'TEAM_LEADER') return -1;
                        if (a.user.globalRole !== 'TEAM_LEADER' && b.user.globalRole === 'TEAM_LEADER') return 1;
                        return a.user.name.localeCompare(b.user.name);
                      })
                      .map(m => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.globalRole === 'TEAM_LEADER' ? `⭐ ${m.user.name}` : m.user.name} {m.user.id === task.assigneeId ? '(Assigned)' : ''}
                        </option>
                      ))
                    }
                  </select>
                </div>
            </div>

            {/* Status */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Status</div>
              <select 
                value={task.status} 
                onChange={(e) => handleStatusChange(e.target.value)} 
                style={{ 
                  background: '#ffffff', 
                  border: task.status === 'STUCK' ? '1px solid #ef4444' : '1px solid var(--border)', 
                  borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', padding: '6px 10px', height: '32px', outline: 'none', width: '100%', color: task.status === 'STUCK' ? '#ef4444' : '#000'
                }}
              >
                <option value="TODO">TODO</option>
                <option value="PROGRESS">IN PROGRESS</option>
                <option value="REVIEW">REVIEW</option>
                <option value="STUCK">STUCK</option>
                <option value="DONE">DONE</option>
              </select>
              
              {task.status !== 'STUCK' && (
                <div style={{ marginTop: '6px' }}>
                   <button 
                    className="btn" 
                    style={{ width: '100%', fontSize: '0.7rem', padding: '4px', background: '#fff1f2', color: '#ef4444', border: '1px dashed rgba(239,68,68,0.3)', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => {
                      setModalReason('');
                      setShowStuckModal(true);
                    }}
                   >
                     + Mark as Stuck with Reason
                   </button>
                </div>
              )}

              {task.status === 'STUCK' && (
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <textarea 
                    placeholder="Update stuck reason..." 
                    value={stuckReason} 
                    onChange={e => setStuckReason(e.target.value)}
                    style={{ fontSize: '0.75rem', height: '50px', borderColor: '#ef4444', borderRadius: '4px', padding: '6px', width: '100%', boxSizing: 'border-box', outline: 'none', color: '#000' }}
                  />
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '6px', background: '#ef4444', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}
                    onClick={() => handleStatusChange('STUCK')}
                  >
                    Update Reason
                  </button>
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Priority</div>
              <div style={{ 
                padding: '6px 10px', 
                background: prioStyle.bg, 
                color: prioStyle.color, 
                borderRadius: '6px', 
                fontWeight: 800, 
                textAlign: 'center',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {task.priority}
              </div>
            </div>

            {/* Task Timer card */}
            <div style={{ 
              background: '#f8fafc', 
              padding: '1rem', 
              borderRadius: '8px', 
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⏱️ Task Timer</span>
                {task.startTime && !task.endTime && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>
                    <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'spin 1.5s linear infinite' }}></span>
                    Running
                  </span>
                )}
              </div>

              {/* Total Time Logged Display */}
              <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Total Logged:</span>
                <span style={{ color: 'var(--accent)', fontWeight: 800 }}>
                  {(() => {
                    const totalHours = task.timeLogs?.reduce((acc, log) => acc + (parseFloat(log.hours) || 0), 0) || 0;
                    const hrs = Math.floor(totalHours);
                    const mins = Math.round((totalHours - hrs) * 60);
                    return `${hrs}h ${mins}m`;
                  })()}
                </span>
              </div>

              {!task.startTime ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-light)', lineHeight: 1.3 }}>
                    {task.timeLogs && task.timeLogs.length > 0 
                      ? "Work stopped. Click to continue working on this task." 
                      : "Not started yet. Click to start working on this task."}
                  </p>
                  <button 
                    className="btn btn-primary" 
                    style={{ background: 'var(--accent)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', width: '100%', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}
                    onClick={() => handleStatusChange('PROGRESS')}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    {task.timeLogs && task.timeLogs.length > 0 ? "Continue" : "Start Working"}
                  </button>
                </div>
              ) : !task.endTime ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    Started: <strong style={{ color: 'var(--text-dark)' }}>{new Date(task.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', background: 'rgba(16,185,129,0.06)', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.15)', fontSize: '0.75rem' }}>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>Current Session:</span>
                    <strong style={{ color: '#10b981' }}><LiveTimer startTime={task.startTime} /></strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button 
                      className="btn" 
                      style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}
                      onClick={() => handleStatusChange('TODO')}
                    >
                      ⏸️ Stop
                    </button>
                    <button 
                      className="btn" 
                      style={{ flex: 1, background: '#f59e0b', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}
                      onClick={() => handleStatusChange('REVIEW')}
                    >
                      ⏹️ Review
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1, background: '#10b981', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}
                      onClick={() => handleStatusChange('DONE')}
                    >
                      ⏹️ Finish
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-light)' }}>
                    <div>Start: <strong style={{ color: 'var(--text-dark)' }}>{new Date(task.startTime).toLocaleDateString()}</strong></div>
                    <div>End: <strong style={{ color: 'var(--text-dark)' }}>{new Date(task.endTime).toLocaleDateString()}</strong></div>
                    <div style={{ marginTop: '4px', padding: '6px', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>Last Session:</span>
                      <span>{
                        (() => {
                          const totalMs = new Date(task.endTime) - new Date(task.startTime);
                          const totalMins = Math.floor(totalMs / (1000 * 60));
                          const hrs = Math.floor(totalMins / 60);
                          const mins = totalMins % 60;
                          return `${hrs}h ${mins}m`;
                        })()
                      }</span>
                    </div>
                  </div>
                </div>
              )}
            </div>



            {user?.globalRole !== 'MEMBER' && (
              <button 
                onClick={handleDelete}
                style={{ 
                  background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '6px', 
                  color: '#ef4444', fontWeight: 600, fontSize: '0.75rem', padding: '8px', 
                  cursor: 'pointer', transition: 'all 0.15s' 
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff5f5'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#fee2e2'; }}
              >
                Delete Task
              </button>
            )}
          </div>
        </div>
      </div>
      <StuckReasonModal 
        show={showStuckModal}
        value={modalReason}
        onChange={setModalReason}
        onCancel={() => setShowStuckModal(false)}
        onConfirm={handleStuckConfirm}
      />
      <HoldReasonModal 
        show={showHoldModal}
        value={holdModalReason}
        onChange={setHoldModalReason}
        onCancel={() => setShowHoldModal(false)}
        onConfirm={handleHoldConfirm}
      />
    </div>
  );
};

const StuckReasonModal = ({ show, onConfirm, onCancel, value, onChange }) => {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.3)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff', width: '420px', borderRadius: '12px', padding: '1.75rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff1f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚠️</div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>Mark Task as Stuck</h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '16px', lineHeight: 1.4, margin: '0 0 16px 0' }}>Please provide a reason for the blocker so the team can help resolve it.</p>
        
        <textarea 
          autoFocus
          placeholder="e.g., Waiting for client feedback on design..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ height: '100px', resize: 'none', marginBottom: '20px', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', width: '100%', boxSizing: 'border-box', outline: 'none', color: '#000', fontSize: '0.85rem' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button 
            onClick={onCancel}
            style={{ padding: '8px 14px', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-dark)', fontSize: '0.85rem' }}
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            style={{ padding: '8px 14px', background: '#ef4444', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', color: '#fff', opacity: !value.trim() ? 0.6 : 1, fontSize: '0.85rem' }}
          >
            Confirm Status
          </button>
        </div>
      </div>
    </div>
  );
};

const HoldReasonModal = ({ show, onConfirm, onCancel, value, onChange }) => {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.3)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#fff', width: '420px', borderRadius: '12px', padding: '1.75rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⏸️</div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>Put Task on Hold</h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '16px', lineHeight: 1.4, margin: '0 0 16px 0' }}>Please mention why this task is being paused (e.g., Working on Urgent task).</p>
        
        <textarea 
          autoFocus
          placeholder="Reason for hold..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ height: '100px', resize: 'none', marginBottom: '20px', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', width: '100%', boxSizing: 'border-box', outline: 'none', color: '#000', fontSize: '0.85rem' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button 
            onClick={onCancel}
            style={{ padding: '8px 14px', background: '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-dark)', fontSize: '0.85rem' }}
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            style={{ padding: '8px 14px', background: '#f59e0b', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', color: '#fff', opacity: !value.trim() ? 0.6 : 1, fontSize: '0.85rem' }}
          >
            Confirm Hold
          </button>
        </div>
      </div>
    </div>
  );
};

const LiveTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const start = new Date(startTime);
      const diff = now - start;
      const totalMins = Math.floor(diff / (1000 * 60));
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setElapsed(`${hrs}h ${mins}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span>{elapsed}</span>;
};

export default TaskModal;
