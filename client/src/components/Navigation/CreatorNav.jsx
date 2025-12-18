// client/src/components/Navigation/CreatorNav.jsx
import React, { useState, useEffect } from 'react';
import { Nav, NavItem, NavLink, Button, Badge } from 'reactstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FaSignOutAlt, FaUserCircle, FaHome, FaBriefcase, FaBell } from 'react-icons/fa';
import { getNotifications } from '../../services/notificationService';

const CreatorNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const isActive = (path) => location.pathname === path;
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const data = await getNotifications();
                setUnreadCount(data.unreadCount || 0);
            } catch (e) {
                console.error("Nav notification error");
            }
        };
        fetchCount();
        
        // Optional: Poll every 60 seconds
        const interval = setInterval(fetchCount, 60000);
        return () => clearInterval(interval);
    }, [location.pathname]); // Re-fetch if page changes (e.g. they visited notifications page)

    const handleLogout = () => {
        if (window.confirm("Log out?")) {
            logout();
            navigate('/login');
        }
    };

    return (
        <Nav tabs className="mb-4 d-flex align-items-center">
            <NavItem>
                <NavLink tag={Link} to="/creator" className={isActive('/creator') ? 'active' : ''}>
                    <FaHome className="me-2" /> Dashboard
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink tag={Link} to="/creator/notifications" className={isActive('/creator/notifications') ? 'active fw-bold' : ''}>
                    <div className="position-relative">
                        <FaBell className="me-2" /> 
                        Notifications
                        {unreadCount > 0 && (
                            <Badge 
                                color="danger" 
                                pill 
                                className="position-absolute translate-middle"
                                style={{ top: '0', right: '-15px', fontSize: '0.65rem' }}
                            >
                                {unreadCount}
                            </Badge>
                        )}
                    </div>
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink tag={Link} to="/creator/profile" className={isActive('/creator/profile') ? 'active' : ''}>
                    <FaUserCircle className="me-2" /> My Profile
                </NavLink>
            </NavItem>
            
            <NavItem>
                <NavLink 
                    tag={Link} 
                    to="/creator/jobs" 
                    className={location.pathname.startsWith('/creator/jobs') ? 'active fw-bold' : ''}
                >
                    <FaBriefcase className="me-2" /> Jobs & Projects
                </NavLink>
            </NavItem>

            <NavItem className="ms-auto">
                <Button color="link" className="text-danger text-decoration-none" onClick={handleLogout}>
                    <FaSignOutAlt className="me-2" /> Logout
                </Button>
            </NavItem>
        </Nav>
    );
};

export default CreatorNav;