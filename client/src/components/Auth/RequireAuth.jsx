// client/src/components/Auth/RequireAuth.jsx
import React from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const RequireAuth = ({ allowedRoles }) => {
    const { auth, loading } = useAuth();
    const location = useLocation();

    if (loading) return <p>Loading permissions...</p>;
    
    const user = auth.user;
    const token = auth.token;

    // 1. No Token/User? -> Login
    if (!token || !user) {
        console.log('no user')
        // return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles.includes(user.userType)) {
        return <Outlet />;
    }

    console.log(user.userType)
    
    // Case A: User is a Collaborator
    if (user.userType === 'Collaborator') {
        // If I am ALREADY in the /creator section but access was denied above, 
        // it means my role configuration is broken or I shouldn't be here.
        // STOP the redirect loop and show Unauthorized.
        if (location.pathname.startsWith('/creator')) {
             return <Navigate to="/unauthorized" replace />;
        }
        // Otherwise, redirect me to my home.
        return <Navigate to="/creator" replace />;
    }

    // Case B: User is an Admin
    if (user.userType === 'LinkVidsAdmin') {
        if (location.pathname.startsWith('/admin')) {
             return <Navigate to="/unauthorized" replace />;
        }
        return <Navigate to="/admin" replace />;
    }

    // Case C: User is an Agency
    if (user.userType === 'Agency') {
        if (location.pathname.startsWith('/agency')) {
             return <Navigate to="/unauthorized" replace />;
        }
        return <Navigate to="/agency/dashboard" replace />;
    }

    // 4. Default: Unauthorized
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
};

export default RequireAuth;