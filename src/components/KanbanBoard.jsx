import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

const COLUMNS = [
  { id: 'TODO', title: 'TODO', color: 'var(--status-todo)' },
  { id: 'PROGRESS', title: 'IN PROGRESS', color: 'var(--status-progress)' },
  { id: 'REVIEW', title: 'REVIEW', color: 'var(--status-review)' },
  { id: 'STUCK', title: 'STUCK', color: '#ef4444' },
  { id: 'HOLD', title: 'ON HOLD', color: '#f59e0b' },
  { id: 'DONE', title: 'DONE', color: 'var(--status-done)' }
];

const TIME_FILTERS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'custom', label: 'Custom Range' },
];

const getFilterIcon = (id, color = 'currentColor') => {
  const props = { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (id) {
    case 'all':
      return (
        <svg {...props}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      );
    case 'today':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      );
    case 'yesterday':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      );
    case 'week':
      return (
        <svg {...props}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      );
    case 'custom':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"></path>
        </svg>
      );
    default:
      return null;
  }
};

// Helper: get start/end of a day
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

const getDateRange = (filterId, customDate, customEndDate) => {
  const now = new Date();
  const getYYYYMMDD = (d) => d.toISOString().split('T')[0];
  
  switch (filterId) {
    case 'today':
      return { type: 'exact', date: getYYYYMMDD(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { type: 'exact', date: getYYYYMMDD(y) };
    }
    case 'week': {
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dates.push(getYYYYMMDD(d));
      }
      return { type: 'list', dates };
    }
    case 'custom': {
      if (!customDate || !customEndDate) return null;
      return { type: 'range', start: customDate, end: customEndDate };
    }
    default:
      return null;
  }
};

const formatDateLabel = (filterId, customDate, customEndDate) => {
  const now = new Date();
  switch (filterId) {
    case 'today': return `Today — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return `Yesterday — ${y.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    case 'week': return 'Last 7 Days';
    case 'custom': {
      if (!customDate || !customEndDate) return 'Custom Range';
      const d1 = new Date(customDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const d2 = new Date(customEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${d1} - ${d2}`;
    }
    default: return 'All Tasks';
  }
};

const KanbanColumn = ({ 
  col, tasks, handleDragStart, handleDragOver, handleDrop, setSelectedTask,
  handleColumnDragStart, handleColumnDrop 
}) => {
  const scrollRef = useRef(null);
  const [scrollDir, setScrollDir] = useState('down');
  const [showIndicator, setShowIndicator] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const canScroll = scrollHeight > clientHeight;
    setShowIndicator(canScroll);
    
    if (canScroll) {
      // If reached bottom (within 10px buffer), point UP
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setScrollDir('up');
      } else {
        setScrollDir('down');
      }
    }
  };

  useEffect(() => {
    // Check on mount and when tasks change
    const timeout = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', checkScroll);
    };
  }, [tasks.length]);

  return (
    <div 
      key={col.id} 
      className="kanban-column"
      onDragOver={handleDragOver}
      onDrop={(e) => {
        const colId = e.dataTransfer.getData('colId');
        if (colId) handleColumnDrop(e, col.id);
        else handleDrop(e, col.id);
      }}
      style={{ flex: 1, minWidth: '300px', background: 'rgba(0,0,0,0.02)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column' }}
    >
      <div 
        draggable
        onDragStart={(e) => handleColumnDragStart(e, col.id)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderTop: `4px solid ${col.color}`, paddingTop: '0.5rem', cursor: 'grab' }}
      >
        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-light)' }}>{col.title}</h3>
        <span style={{ background: 'var(--border)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
          {tasks.length}
        </span>
      </div>
      
      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="hide-scrollbar"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem', 
          flex: 1, 
          overflowY: 'auto',
          position: 'relative',
          paddingBottom: '20px'
        }}
      >
        {tasks.map(task => (
          <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onClick={() => setSelectedTask(task)}>
            <TaskCard task={task} />
          </div>
        ))}
        
        {showIndicator && (
          <div style={{ 
            position: 'sticky', 
            bottom: '10px', 
            left: 0, 
            right: 0, 
            height: '0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <div className="scroll-indicator" style={{ 
              color: '#0052CC', 
              fontSize: '24px', 
              opacity: 1,
              background: '#FFFFFF',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(9, 30, 66, 0.25)',
              fontWeight: 'bold',
              border: '1px solid #DFE1E6',
              marginTop: '-40px' // Offset to float above the bottom
            }}>
              {scrollDir === 'down' ? '↓' : '↑'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanBoard = ({ filterUserId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Time filter state
  const [timeFilter, setTimeFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // New task form state
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [initialStatus, setInitialStatus] = useState('TODO');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Default to Today
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]); // Default to Today
  
  // Member addition state
  const [showMembers, setShowMembers] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [selectedForProject, setSelectedForProject] = useState([]);
  const [createTaskDesignationFilter, setCreateTaskDesignationFilter] = useState('ALL');
  const [addMemberDesignationFilter, setAddMemberDesignationFilter] = useState('ALL');

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
  
  // Stuck Modal State
  const [stuckModal, setStuckModal] = useState({ show: false, taskId: null, reason: '' });
  const [holdModal, setHoldModal] = useState({ show: false, taskId: null, reason: '' });

  // Column Ordering State
  const [orderedColumns, setOrderedColumns] = useState(() => {
    const saved = localStorage.getItem('kanban_column_order');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        return ids.map(id => COLUMNS.find(c => c.id === id)).filter(Boolean);
      } catch (e) { return COLUMNS; }
    }
    return COLUMNS;
  });
  
  useEffect(() => {
    if (projectId) {
      api.get(`/tasks?projectId=${projectId}`).then(res => setTasks(res.data)).catch(console.error);
      api.get(`/projects/${projectId}`).then(res => setProject(res.data)).catch(console.error);
      
      // Reset filter to All Tasks when switching projects
      setTimeFilter('all');
      setCustomDate('');
      setCustomEndDate('');
    }
  }, [projectId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowTimeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-assign task to self for MEMBER role when opening create form
  useEffect(() => {
    if (showAdd && user?.globalRole === 'MEMBER') {
      setAssigneeId(user.id);
    } else if (!showAdd) {
      setAssigneeId('');
    }
  }, [showAdd, user]);

  useSocket(projectId, {
    onTaskCreated: (task) => setTasks(prev => [task, ...prev]),
    onTaskUpdated: (updatedTask) => setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t)),
    onTaskDeleted: ({ taskId }) => setTasks(prev => prev.filter(t => t.id !== taskId)),
    onTaskStatusChanged: ({ taskId, newStatus }) => setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)),
    onCommentAdded: ({ taskId, comment }) => {
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          const comments = t.comments ? [...t.comments, { id: comment.id }] : [{ id: comment.id }];
          return { ...t, comments };
        }
        return t;
      }));
    }
  });

  const handleDragStart = (e, taskId) => {
    e.stopPropagation();
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    
    if (task && task.status !== status) {
      if (status === 'STUCK') {
        setStuckModal({ show: true, taskId, reason: '' });
        return;
      }
      if (status === 'HOLD') {
        setHoldModal({ show: true, taskId, reason: '' });
        return;
      }

      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          const updates = { status };
          if (status === 'PROGRESS') {
            if (!t.startTime || t.status !== 'PROGRESS') updates.startTime = new Date().toISOString();
            updates.endTime = null;
          } else if (status === 'DONE') {
            if (t.startTime && !t.endTime) updates.endTime = new Date().toISOString();
          } else {
            updates.startTime = null;
            updates.endTime = null;
          }
          return { ...t, ...updates };
        }
        return t;
      }));
      
      try {
        await api.put(`/tasks/${taskId}/status`, { status });
      } catch (err) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status, startTime: task.startTime, endTime: task.endTime } : t));
        alert('Failed to update status. Check permissions.');
      }
    }
  };

  const handleStuckConfirm = async (reason) => {
    const { taskId } = stuckModal;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'STUCK' } : t));
    try {
      await api.put(`/tasks/${taskId}/status`, { status: 'STUCK', stuckReason: reason });
      setStuckModal({ show: false, taskId: null, reason: '' });
    } catch (err) {
      const task = tasks.find(t => t.id === taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status } : t));
      alert('Failed to update status.');
      setStuckModal({ show: false, taskId: null, reason: '' });
    }
  };

  const handleHoldConfirm = async (reason) => {
    const { taskId } = holdModal;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'HOLD' } : t));
    try {
      await api.put(`/tasks/${taskId}/status`, { status: 'HOLD', holdReason: reason });
      setHoldModal({ show: false, taskId: null, reason: '' });
    } catch (err) {
      const task = tasks.find(t => t.id === taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status } : t));
      alert('Failed to update status.');
      setHoldModal({ show: false, taskId: null, reason: '' });
    }
  };

  const handleColumnDragStart = (e, colId) => {
    e.dataTransfer.setData('colId', colId);
  };

  const handleColumnDrop = (e, targetColId) => {
    e.preventDefault();
    const sourceColId = e.dataTransfer.getData('colId');
    if (!sourceColId || sourceColId === targetColId) return;

    const sourceIndex = orderedColumns.findIndex(c => c.id === sourceColId);
    const targetIndex = orderedColumns.findIndex(c => c.id === targetColId);

    const newColumns = [...orderedColumns];
    const [removed] = newColumns.splice(sourceIndex, 1);
    newColumns.splice(targetIndex, 0, removed);

    setOrderedColumns(newColumns);
    localStorage.setItem('kanban_column_order', JSON.stringify(newColumns.map(c => c.id)));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const combineTime = (dateStr) => {
        if (!dateStr) return null;
        const now = new Date();
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
      };
      await api.post('/tasks', { 
        title, 
        description, 
        priority, 
        projectId, 
        assigneeId: assigneeId || null,
        dueDate: combineTime(dueDate),
        startTime: combineTime(startDate),
        status: initialStatus
      });
      setTitle('');
      setDescription('');
      setAssigneeId('');
      setInitialStatus('TODO');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date().toISOString().split('T')[0]);
      setShowAdd(false);
    } catch (err) {
      alert('Failed to create task. Check permissions.');
    }
  };

  const handleTimeFilterSelect = (filterId) => {
    if (filterId === 'custom') {
      setTimeFilter('custom');
      // Do not close dropdown, let them pick dates inside it
      return;
    }
    setTimeFilter(filterId);
    setCustomDate('');
    setCustomEndDate('');
    setShowTimeDropdown(false);
  };

  if (!projectId) return <div>Please select a project from the sidebar to view its board.</div>;

  // Apply user filter (from URL)
  let filteredTasks = filterUserId ? tasks.filter(t => t.assigneeId === filterUserId) : tasks;

  // Strict role-based filter to prevent socket leakage of unauthorized tasks
  if (user?.globalRole === 'MEMBER') {
    filteredTasks = filteredTasks.filter(t => t.assigneeId === user.id);
  } else if (user?.globalRole === 'TEAM_LEADER') {
    const allowedAssigneeIds = new Set([user.id]);
    if (project && project.members) {
      project.members.forEach(m => {
        if (m.user?.teamLeaderId === user.id || (m.user?.teamLeaderId == null && m.user?.designation === user.designation)) {
          allowedAssigneeIds.add(m.userId);
        }
      });
    }
    filteredTasks = filteredTasks.filter(t => allowedAssigneeIds.has(t.assigneeId));
  }

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredTasks = filteredTasks.filter(t => 
      (t.title && t.title.toLowerCase().includes(query)) || 
      (t.taskKey && t.taskKey.toLowerCase().includes(query))
    );
  }

  // Apply time filter
  const dateRange = getDateRange(timeFilter, customDate, customEndDate);
  if (dateRange) {
    filteredTasks = filteredTasks.filter(t => {
      const startStr = t.createdAt ? t.createdAt.split('T')[0] : null;
      const dueStr = t.dueDate ? t.dueDate.split('T')[0] : null;

      if (!startStr && !dueStr) return false;

      const matchesDate = (targetDateStr) => {
        if (startStr && dueStr) {
          return startStr <= targetDateStr && targetDateStr <= dueStr;
        }
        if (startStr) {
          return startStr === targetDateStr;
        }
        if (dueStr) {
          return dueStr === targetDateStr;
        }
        return false;
      };

      if (dateRange.type === 'exact') {
        return matchesDate(dateRange.date);
      } else if (dateRange.type === 'list') {
        return dateRange.dates.some(d => matchesDate(d));
      } else if (dateRange.type === 'range') {
        const rStart = dateRange.start;
        const rEnd = dateRange.end;
        if (startStr && dueStr) {
          return startStr <= rEnd && dueStr >= rStart;
        } else if (startStr) {
          return startStr >= rStart && startStr <= rEnd;
        } else if (dueStr) {
          return dueStr >= rStart && dueStr <= rEnd;
        }
        return false;
      }
      return true;
    });
  }

  const filterMember = filterUserId ? project?.members?.find(m => m.user.id === filterUserId) : null;
  const myPermission = project?.members?.find(m => m.userId === user?.id);
  const canCreate = user?.globalRole === 'ADMIN' || user?.globalRole === 'TEAM_LEADER' || (user?.globalRole === 'MEMBER' && !!myPermission) || myPermission?.canCreateTask;
  const canAddMember = user?.globalRole === 'ADMIN' || user?.globalRole === 'TEAM_LEADER';

  const toggleMembers = async () => {
    if (!showMembers && project) {
      try {
        const wsId = user.workspaces[0].workspaceId;
        const res = await api.get(`/workspaces/${wsId}`);
        const projectMemberIds = project.members.map(m => m.userId);
        let available = res.data.members.filter(m => !projectMemberIds.includes(m.userId));
        
        // For Admin: Show all workspace members who are not yet in the project
        // (Previously it was restricted to only Team Leaders)
        if (user?.globalRole === 'ADMIN') {
          // No additional filter needed, 'available' already contains non-project members
        }
        
        // Filter by matching Designation if Team Leader (show only Members from their squad)
        if (user?.globalRole === 'TEAM_LEADER') {
          available = available.filter(m => 
            m.user?.designation === user.designation && 
            m.user?.globalRole === 'MEMBER'
          );
        }
        
        setWorkspaceMembers(available);
      } catch (err) {
        console.error(err);
      }
    }
    setShowMembers(!showMembers);
  };

  const handleAddProjectMembers = async () => {
    if (selectedForProject.length === 0) return;
    try {
      await api.post(`/projects/${projectId}/members/bulk`, { userIds: selectedForProject });
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data);
      setSelectedForProject([]);
      setShowMembers(false);
      setSuccessMessage('Members added successfully!');
    } catch (err) {
      setErrorMessage('Failed to add members.');
    }
  };

  // Current filter label
  const currentFilterConfig = TIME_FILTERS.find(f => f.id === timeFilter);
  const dateLabel = formatDateLabel(timeFilter, customDate, customEndDate);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Member filter banner */}
      {filterUserId && filterMember && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          background: 'linear-gradient(135deg, #E9F2FF, #DEEBFF)', border: '1px solid rgba(0,82,204,0.15)',
          borderLeft: '4px solid #0052CC', borderRadius: '8px', padding: '12px 18px', marginBottom: '12px',
          fontSize: '14px', color: '#172B4D', boxShadow: '0 2px 8px rgba(0,82,204,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0052CC', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>
              {filterMember.user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <span>
              Showing tasks for <strong>{filterMember.user.name}</strong>
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#5E6C84' }}>
                ({filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''})
              </span>
            </span>
          </div>
          <button className="primary" onClick={() => navigate(`/board/${projectId}`)} style={{ padding: '6px 14px', fontSize: '13px' }}>
            ✕ Show All Tasks
          </button>
        </div>
      )}

      {/* Top toolbar: Action buttons + Time filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        {/* Left: Action buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {canCreate && !filterUserId && (
            <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>+ Add Task</button>
          )}
          {canAddMember && !filterUserId && (
            <button className="btn" style={{ background: 'var(--border)', color: 'var(--text-main)' }} onClick={toggleMembers}>Add Member</button>
          )}
          {/* Search Input */}
          <div style={{ position: 'relative', marginLeft: '4px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: isSearchFocused ? 'var(--accent)' : 'var(--text-light)', display: 'flex', transition: 'color 0.2s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{
                padding: '7px 14px 7px 32px',
                border: isSearchFocused ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: 'var(--text-dark)',
                outline: 'none',
                minWidth: '240px',
                background: isSearchFocused ? '#ffffff' : '#f8fafc',
                boxShadow: isSearchFocused ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'inset 0 1px 2px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={e => {
                if (!isSearchFocused) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }
              }}
              onMouseLeave={e => {
                if (!isSearchFocused) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }
              }}
            />
          </div>
        </div>

        {/* Right: Time Filter Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setShowTimeDropdown(!showTimeDropdown)}
            style={{
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '6px 12px', 
              background: timeFilter !== 'all' ? 'rgba(99, 102, 241, 0.06)' : '#ffffff',
              border: `1px solid ${timeFilter !== 'all' ? 'rgba(99, 102, 241, 0.2)' : 'var(--border)'}`,
              borderRadius: '6px', 
              fontSize: '0.85rem', 
              fontWeight: 600,
              color: timeFilter !== 'all' ? 'var(--accent)' : 'var(--text-dark)',
              cursor: 'pointer', 
              transition: 'all 0.15s', 
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              outline: 'none'
            }}
            onMouseEnter={e => {
              if (timeFilter === 'all') {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              } else {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
              }
            }}
            onMouseLeave={e => {
              if (timeFilter === 'all') {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = 'var(--border)';
              } else {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.06)';
              }
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {getFilterIcon(timeFilter, timeFilter !== 'all' ? 'var(--accent)' : 'var(--text-light)')}
            </span>
            <span>{dateLabel}</span>
            <svg 
              width="10" 
              height="10" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ 
                transform: showTimeDropdown ? 'rotate(180deg)' : 'none', 
                transition: 'transform 0.15s',
                opacity: 0.7
              }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* Dropdown menu */}
          {showTimeDropdown && (
            <div style={{
              position: 'absolute', 
              right: 0, 
              top: '100%', 
              marginTop: '6px', 
              width: '200px',
              background: '#FFFFFF', 
              border: '1px solid var(--border)', 
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)', 
              zIndex: 100, 
              overflow: 'hidden',
              animation: 'menuPop 0.15s ease-out',
              padding: '4px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {TIME_FILTERS.map((filter) => {
                  const isActive = timeFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => handleTimeFilterSelect(filter.id)}
                      style={{
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        width: '100%',
                        padding: '6px 10px', 
                        border: 'none', 
                        borderRadius: '6px',
                        background: isActive ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--text-dark)',
                        fontSize: '0.85rem', 
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer', 
                        textAlign: 'left', 
                        transition: 'all 0.1s',
                        outline: 'none'
                      }}
                      onMouseEnter={e => { 
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)';
                        }
                      }}
                      onMouseLeave={e => { 
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.7 }}>
                        {getFilterIcon(filter.id, isActive ? 'var(--accent)' : 'var(--text-light)')}
                      </span>
                      <span>{filter.label}</span>
                      {isActive && (
                        <svg 
                          style={{ marginLeft: 'auto' }} 
                          width="12" 
                          height="12" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="var(--accent)" 
                          strokeWidth="3" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Show custom date range inputs if custom is selected */}
              {timeFilter === 'custom' && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '10px', fontSize: '0.8rem', background: '#FAFBFC', marginTop: '4px', borderRadius: '0 0 4px 4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: 600 }}>Start Date</label>
                    <input 
                      type="date" 
                      value={customDate} 
                      onChange={e => setCustomDate(e.target.value)} 
                      style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none', color: 'var(--text-dark)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: 600 }}>End Date</label>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={e => setCustomEndDate(e.target.value)} 
                      style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', outline: 'none', color: 'var(--text-dark)' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>



      {showMembers && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
              {user?.globalRole === 'TEAM_LEADER' ? 'Add Core Team Members' : 'Add People to Project'}
            </h4>
            
            {/* Designation Filter for Adding Members */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-light)' }}>Filter by Team:</span>
              <select 
                className="input" 
                value={addMemberDesignationFilter} 
                onChange={e => setAddMemberDesignationFilter(e.target.value)} 
                style={{ width: '150px', background: 'var(--main-bg)', border: '1px solid var(--border)', padding: '4px 8px', height: '32px', borderRadius: '6px' }}
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
          </div>

          {workspaceMembers.filter(m => {
            if (addMemberDesignationFilter !== 'ALL' && m.user?.designation !== addMemberDesignationFilter) {
              return false;
            }
            return true;
          }).length === 0 ? (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '6px', textAlign: 'center' }}>
              No members found matching this designation.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              {workspaceMembers.filter(m => {
                if (addMemberDesignationFilter !== 'ALL' && m.user?.designation !== addMemberDesignationFilter) {
                  return false;
                }
                return true;
              }).sort((a, b) => {
                if (a.user.globalRole === 'TEAM_LEADER' && b.user.globalRole !== 'TEAM_LEADER') return -1;
                if (a.user.globalRole !== 'TEAM_LEADER' && b.user.globalRole === 'TEAM_LEADER') return 1;
                return a.user.name.localeCompare(b.user.name);
              }).map(m => (
                <label key={m.user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedForProject.includes(m.user.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedForProject([...selectedForProject, m.user.id]);
                      else setSelectedForProject(selectedForProject.filter(id => id !== m.user.id));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>{m.user.globalRole === 'TEAM_LEADER' ? `⭐ ${m.user.name}` : m.user.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginLeft: '6px' }}>({m.user.designation || 'General'})</span>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleAddProjectMembers} disabled={selectedForProject.length === 0}>Done</button>
            <button className="btn" onClick={() => { setShowMembers(false); setAddMemberDesignationFilter('ALL'); }}>Cancel</button>
          </div>
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreateTask} className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="input" placeholder="Task Title" value={title} onChange={e => setTitle(e.target.value)} required style={{ flex: 2, minWidth: '150px' }} />
          <textarea 
            className="input" 
            placeholder="Description (optional)" 
            value={description} 
            onChange={e => {
              setDescription(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }} 
            style={{ flex: 3, minWidth: '200px', minHeight: '40px', maxHeight: '150px', overflowY: 'auto', resize: 'vertical', fontFamily: 'inherit', padding: '0.5rem 0.75rem', lineHeight: '1.5', boxSizing: 'border-box' }} 
            rows={1}
          />
          <select className="input" value={priority} onChange={e => setPriority(e.target.value)} style={{ width: '120px' }}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          
          <select 
            className="input" 
            value={assigneeId} 
            onChange={e => setAssigneeId(e.target.value)} 
            style={{ width: '150px' }}
          >
            <option value="">Unassigned</option>
            {project?.members?.filter(m => {
              if (user?.globalRole === 'ADMIN' || user?.globalRole === 'MEMBER') {
                // Admin and Member: Show all members in the project for assignment
                return true;
              }
              if (user?.globalRole === 'TEAM_LEADER') {
                if (m.user.id === user.id) return true; // Can assign to themselves
                // Team Leader: Show only regular Members in their specific squad
                return m.user.globalRole === 'MEMBER' && (m.user.teamLeaderId === user.id || (m.user.teamLeaderId == null && m.user.designation === user.designation));
              }
              return true;
            }).sort((a, b) => {
              if (a.user.globalRole === 'TEAM_LEADER' && b.user.globalRole !== 'TEAM_LEADER') return -1;
              if (a.user.globalRole !== 'TEAM_LEADER' && b.user.globalRole === 'TEAM_LEADER') return 1;
              return a.user.name.localeCompare(b.user.name);
            }).map(m => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.globalRole === 'TEAM_LEADER' ? `⭐ ${m.user.name}` : m.user.name}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Start Date</span>
            <input 
              className="input" 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              style={{ width: '150px' }} 
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Due Date</span>
            <input 
              className="input" 
              type="date" 
              value={dueDate} 
              onChange={e => setDueDate(e.target.value)} 
              style={{ width: '150px' }} 
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Initial Action</span>
            <select 
              className="input" 
              value={initialStatus} 
              onChange={e => setInitialStatus(e.target.value)} 
              style={{ width: '130px', background: initialStatus === 'PROGRESS' ? '#e0e7ff' : 'white' }}
            >
              <option value="TODO">Default (Todo)</option>
              <option value="PROGRESS">Start Now 🚀</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap', marginTop: 'auto' }}>Create</button>
        </form>
      )}

      {/* Kanban columns */}
      <div className="kanban-scroll" style={{ display: 'flex', gap: '1.5rem', flex: 1, overflowX: 'auto', paddingBottom: '1.5rem' }}>
        {orderedColumns.map(col => (
          <KanbanColumn 
            key={col.id}
            col={col}
            tasks={filteredTasks.filter(t => t.status === col.id)}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            setSelectedTask={setSelectedTask}
            handleColumnDragStart={handleColumnDragStart}
            handleColumnDrop={handleColumnDrop}
          />
        ))}
      </div>

      {selectedTask && (
        <TaskModal 
          taskId={selectedTask.id} 
          onClose={() => setSelectedTask(null)} 
          projectId={projectId} 
        />
      )}

      <StuckReasonModal 
        show={stuckModal.show}
        value={stuckModal.reason}
        onChange={(val) => setStuckModal(prev => ({ ...prev, reason: val }))}
        onCancel={() => setStuckModal({ show: false, taskId: null, reason: '' })}
        onConfirm={handleStuckConfirm}
      />

      <HoldReasonModal 
        show={holdModal.show}
        value={holdModal.reason}
        onChange={(val) => setHoldModal(prev => ({ ...prev, reason: val }))}
        onCancel={() => setHoldModal({ show: false, taskId: null, reason: '' })}
        onConfirm={handleHoldConfirm}
      />

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

const StuckReasonModal = ({ show, onConfirm, onCancel, value, onChange }) => {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(9, 30, 66, 0.54)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000
    }}>
      <div style={{
        background: '#fff', width: '450px', borderRadius: '16px', padding: '32px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fff1f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#172B4D', margin: 0 }}>Mark Task as Stuck</h2>
        </div>
        <p style={{ fontSize: '14px', color: '#5E6C84', marginBottom: '20px', lineHeight: 1.5 }}>Please provide a reason for the blocker so the team can help resolve it.</p>
        
        <textarea 
          autoFocus
          className="input"
          placeholder="e.g., Waiting for client feedback on design..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ height: '120px', resize: 'none', marginBottom: '24px', border: '2px solid #DFE1E6', borderRadius: '10px', color: '#000' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={onCancel}
            style={{ padding: '10px 24px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#42526E' }}
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            style={{ padding: '10px 24px', background: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#fff', opacity: !value.trim() ? 0.6 : 1 }}
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
      background: 'rgba(9, 30, 66, 0.54)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000
    }}>
      <div style={{
        background: '#fff', width: '450px', borderRadius: '16px', padding: '32px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⏸️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#172B4D', margin: 0 }}>Put Task on Hold</h2>
        </div>
        <p style={{ fontSize: '14px', color: '#5E6C84', marginBottom: '20px', lineHeight: 1.5 }}>Please mention why this task is being paused (e.g., Working on Urgent task).</p>
        
        <textarea 
          autoFocus
          className="input"
          placeholder="Reason for hold..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ height: '120px', resize: 'none', marginBottom: '24px', border: '2px solid #DFE1E6', borderRadius: '10px', color: '#000' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={onCancel}
            style={{ padding: '10px 24px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#42526E' }}
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            style={{ padding: '10px 24px', background: '#f59e0b', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#fff', opacity: !value.trim() ? 0.6 : 1 }}
          >
            Confirm Hold
          </button>
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;
