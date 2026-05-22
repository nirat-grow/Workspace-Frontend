import React from 'react';
import { useParams } from 'react-router-dom';
import KanbanBoard from '../components/KanbanBoard';

const BoardPage = () => {
  const { memberId } = useParams();
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ marginBottom: '1rem' }}>Kanban Board</h1>
      <KanbanBoard filterUserId={memberId} />
    </div>
  );
};

export default BoardPage;
