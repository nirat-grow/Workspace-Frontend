import React from 'react';

const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 'N/A';
  const diffMs = new Date(endTime) - new Date(startTime);
  const diffMins = Math.round(diffMs / (1000 * 60));
  if (diffMins < 60) {
    const displayMins = diffMins > 0 ? diffMins : 1;
    return `${displayMins} min${displayMins !== 1 ? 's' : ''}`;
  }
  const hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
  return `${hours} hr${hours !== 1 ? 's' : ''}`;
};

const TaskCard = ({ task }) => {
  let isOverdue = false;
  if (task.dueDate && task.status !== 'DONE') {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today in local time
    
    // Parse task due date and convert to local Date at midnight
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    
    isOverdue = due < today;
  }

  return (
    <div className="card task-card" style={{ padding: '0.875rem', cursor: 'grab', userSelect: 'none', transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(9, 30, 66, 0.13)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600, letterSpacing: '0.5px' }}>{task.taskKey}</span>
        <span style={{ 
          fontSize: '0.6rem', 
          padding: '2px 8px', 
          borderRadius: '3px',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: `var(--priority-${task.priority.toLowerCase()}-text)`,
          backgroundColor: `var(--priority-${task.priority.toLowerCase()}-bg)`,
          border: `1px solid rgba(0,0,0,0.05)`
        }}>
          {task.priority}
        </span>
      </div>
      
      <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-dark)', lineHeight: '1.4' }}>{task.title}</h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Assignee & Lead Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {task.assignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
              {task.assignee.profilePic ? (
                <img 
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api${task.assignee.profilePic}`} 
                  alt={task.assignee.name} 
                  title={task.assignee.name} 
                  style={{
                    flexShrink: 0,
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div title={task.assignee.name} style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #0052CC, #0747A6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
                  {task.assignee.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.assignee.name}
                </div>
                {(task.assignee.designation || task.assignee.teamLeader) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--text-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.assignee.designation && <span style={{ fontWeight: 500 }}>{task.assignee.designation}</span>}
                    {task.assignee.designation && task.assignee.teamLeader && <span>•</span>}
                    {task.assignee.teamLeader && <span>Lead: <span style={{ fontWeight: 700 }}>{task.assignee.teamLeader.name}</span></span>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px dashed var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-light)' }}>?</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic' }}>Unassigned</span>
            </div>
          )}
        </div>
      
      {/* Timer / Time-tracking badge */}
      {task.startTime && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          padding: '4px 8px', 
          borderRadius: '4px', 
          background: task.endTime ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: task.endTime ? '1px solid rgba(16, 185, 129, 0.15)' : '1px dashed rgba(245, 158, 11, 0.3)',
          marginTop: '0.75rem',
          fontSize: '0.7rem',
          color: task.endTime ? '#10b981' : '#d97706',
          fontWeight: 600,
          width: 'fit-content'
        }}>
          {task.endTime ? (
            <>⏱️ Worked: {formatDuration(task.startTime, task.endTime)}</>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-indicator-dot" style={{ width: '6px', height: '6px', background: '#d97706', borderRadius: '50%', display: 'inline-block' }}></span>
              ⏱️ Active Timer
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {task.dueDate && (
              <span style={{ 
                fontSize: '0.7rem', 
                color: isOverdue ? '#DE350B' : '#5E6C84', 
                fontWeight: isOverdue ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                📅 {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
              </span>
            )}
            {task.estHours && (
              <span style={{ fontSize: '0.7rem', color: '#5E6C84', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⏱️ {task.estHours}h
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '0.6rem', color: '#5E6C84' }}>
            {task.comments && task.comments.length > 0 && (
              <span title={`${task.comments.length} comments`} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                💬 {task.comments.length}
              </span>
            )}
            {task.attachments && task.attachments.length > 0 && (
              <span title={`${task.attachments.length} attachments`} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                📎 {task.attachments.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
