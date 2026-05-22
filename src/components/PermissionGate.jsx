import React from 'react';
import { useAuth } from '../context/AuthContext';

const PermissionGate = ({ permissionKey, projectMemberPermissions, children, fallback = null }) => {
  const { user } = useAuth();
  
  if (!user) return fallback;
  if (user.globalRole === 'ADMIN') return children;
  
  if (projectMemberPermissions && projectMemberPermissions[permissionKey] === true) {
    return children;
  }
  
  return fallback;
};

export default PermissionGate;
