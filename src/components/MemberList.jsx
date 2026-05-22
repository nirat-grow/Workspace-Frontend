import React from 'react';

const MemberList = ({ members }) => {
  if (!members || members.length === 0) return <div style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>No members</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {members.map(member => (
        <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>
            {member.user.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem' }}>{member.user.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{member.role || member.user.globalRole}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MemberList;
