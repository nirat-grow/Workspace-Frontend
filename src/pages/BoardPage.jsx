import React from 'react';
import { useParams } from 'react-router-dom';
import KanbanBoard from '../components/KanbanBoard';

const BoardPage = () => {
  const { projectId, memberId } = useParams();
  
  if (!projectId) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-light)', textAlign: 'center' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.5 }}>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h2 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Not Added to Any Project</h2>
        <p>You have not been added to any projects yet.<br/>Please contact your Admin or Team Leader to assign you to a project.</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ marginBottom: '1rem' }}>Kanban Board</h1>
      <KanbanBoard filterUserId={memberId} />
    </div>
  );
};

export default BoardPage;
