import React from 'react';

const formatLoggedHours = (hoursVal) => {
  if (!hoursVal) return '0s';
  const totalSeconds = Math.floor(hoursVal * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
};

const TaskLogsModal = ({ task, onClose }) => {
  if (!task) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', width: '650px', maxWidth: '90%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⏱️</span> Task Logs: <span style={{ color: 'var(--text-light)', fontWeight: 600 }}>{task.name || task.title}</span>
          </h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: '16px', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>✕</button>
        </div>
        
        {(!task.timeLogs || task.timeLogs.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-light)', background: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>📭</div>
            No time logs found for this task.
          </div>
        ) : (
          <table className="responsive-table report-table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>Session Start</th>
                <th style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>Session End</th>
                <th style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)', textAlign: 'right' }}>Hours Logged</th>
                <th style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {task.timeLogs.map((log, idx) => {
                const end = new Date(log.loggedAt);
                const start = new Date(end.getTime() - log.hours * 60 * 60 * 1000);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 10px', color: 'var(--text-dark)', fontWeight: 500 }}>{start.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-light)' }}>{end.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--success)', fontWeight: 800, textAlign: 'right' }}>{formatLoggedHours(log.hours)}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-light)', fontSize: '0.8rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.note || '-'}>{log.note || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TaskLogsModal;
