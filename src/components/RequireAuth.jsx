import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Context } from '../main';

// Usage: <RequireAuth allowedRoles={["Admin","Doctor"]}><Component/></RequireAuth>
const RequireAuth = ({ allowedRoles = ['Admin'], children }) => {
  const { isAuthenticated, admin, isAuthChecking } = useContext(Context);
  const location = useLocation();

  if (isAuthChecking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <span className="loader" style={{ width: '3rem', height: '3rem' }}></span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = admin?.role || admin?.userRole || 'Admin';
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireAuth;
