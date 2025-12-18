// client/src/components/Navigation/AdminNav.jsx
import React, { useState, useEffect } from 'react';
import { Nav, NavItem, NavLink, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Button, Badge } from 'reactstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';  
import { getAllUserTypes } from '../../services/userTypeService'; 
import { getNotifications } from '../../services/notificationService';
import { FaSignOutAlt, FaBell, FaUserShield, FaUserCircle, FaNewspaper, FaBriefcase, FaUsers, FaCog } from 'react-icons/fa'; 

const AdminNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { auth, logout } = useAuth();
    const { can } = usePermissions();

    const [configDropdownOpen, setConfigDropdownOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    
    const [userTypes, setUserTypes] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const userName = auth.user?.name || "Admin";
    const userEmail = auth.user?.email || "";

    // Polling Notifications system -  Considering if eeded...
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
        const interval = setInterval(fetchCount, 3000); // Poll every 30s
        return () => clearInterval(interval);
    }, [location.pathname]);

    useEffect(() => {
        // Fetch user types once on mount to populate the menu
        const fetchTypes = async () => {
            try {
                const types = await getAllUserTypes();
                setUserTypes(types);
            } catch (error) {
                console.error("Failed to load user types for menu");
            }
        };
        fetchTypes();
    }, []);

    // Utilities to check active state
    const isActive = (path) => location.pathname === path;
    const isConfigActive = location.pathname.startsWith('/admin/config');
    const isUserManagementActive = location.pathname.startsWith('/admin/collaborators'); 

    const toggleConfig = () => setConfigDropdownOpen(prevState => !prevState);
    const toggleUser = () => setUserDropdownOpen(prevState => !prevState);

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to log out?")) {
            logout(); // Clear storage
            navigate('/login'); // Redirect to login
        }
    };

    return (
        <Nav tabs className="mb-4">
            {/* Dashboard */}
            <NavItem>
                <NavLink 
                    tag={Link} 
                    to="/admin" 
                    className={isActive('/admin') ? 'active' : ''}
                >
                    Dashboard
                </NavLink>
            </NavItem>
            
            {can('admins', 'view') && (
                <Dropdown nav isOpen={configDropdownOpen} toggle={toggleConfig}>
                    <DropdownToggle nav caret className={isConfigActive ? 'active' : ''}>
                        <FaCog className="me-2" /> Admin
                    </DropdownToggle>
                    <DropdownMenu>
                        <DropdownItem header>Users</DropdownItem>
                        <DropdownItem tag={Link} to="/admin/users"><FaUserShield className="me-2" />Team</DropdownItem>
                        <DropdownItem header>Schema Definitions</DropdownItem>
                        <DropdownItem tag={Link} to="/admin/config/attributes">Attribute Library</DropdownItem>
                        <DropdownItem tag={Link} to="/admin/config/user-types">User Type Schemas</DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            )}
            {can('collaborators', 'view') && (
            <Dropdown nav isOpen={userDropdownOpen} toggle={toggleUser}>
                <DropdownToggle nav caret className={isUserManagementActive ? 'active' : ''}>
                    <FaUsers className="me-2" /> Collaborators
                </DropdownToggle>
                <DropdownMenu>
                    {/* Standard Actions */}
                    <DropdownItem header>Actions</DropdownItem>
                    <DropdownItem tag={Link} to="/admin/collaborators" className={location.search === '' && isActive('/admin/collaborators') ? 'active' : ''}>
                        All Collaborators
                    </DropdownItem>
                     {can('collaborators', 'edit') && (
                        <DropdownItem tag={Link} to="/admin/collaborators/create" className={isActive('/admin/collaborators/create') ? 'active' : ''}>
                            + Create New Collaborator
                        </DropdownItem>
                    )}
                    <DropdownItem divider />
                    
            
                    <DropdownItem header>Filter by Type</DropdownItem>
                    {userTypes.map(type => (
                        <DropdownItem 
                            key={type.slug} 
                            tag={Link} 
                            // Pass the slug as a query parameter
                            to={`/admin/collaborators?type=${type.slug}`}
                            // Highlight if the current URL matches this type
                            className={location.search.includes(`type=${type.slug}`) ? 'active' : ''}
                        >
                            {type.name}
                        </DropdownItem>
                    ))}
                </DropdownMenu>
            </Dropdown>
            )}
            {can('jobs', 'view') && (
            <NavItem>
                <NavLink tag={Link} to="/admin/jobs" className={isActive('/admin/jobs') || location.pathname.startsWith('/admin/jobs') ? 'active' : ''}>
                    <FaBriefcase className="me-2" /> Jobs
                </NavLink>
            </NavItem>
            )}
            {can('news', 'view') && (
                <NavItem>
                    <NavLink tag={Link} to="/admin/news" className={location.pathname.startsWith('/admin/news') ? 'active fw-bold' : ''}>
                        <FaNewspaper className="me-2" /> News
                    </NavLink>
                </NavItem>
            )}
            <NavItem>
                <NavLink tag={Link} to="/admin/notifications" className={isActive('/admin/notifications') ? 'active fw-bold' : ''}>
                     <div className="position-relative">
                        <FaBell className="me-2" /> 
                        Alerts
                        {unreadCount > 0 && (
                            <Badge 
                                color="danger" 
                                pill 
                                className="position-absolute translate-middle"
                                style={{ top: '0', right: '-10px', fontSize: '0.65rem' }}
                            >
                                {unreadCount}
                            </Badge>
                        )}
                    </div>
                </NavLink>
            </NavItem>

           <NavItem className="ms-auto d-flex align-items-center gap-3 pb-2">
                <div className="d-none d-md-flex align-items-center text-secondary border-end pe-3">
                    <FaUserCircle size={20} className="me-2 text-primary" />
                    <div className="d-flex flex-column" style={{ lineHeight: '1.2' }}>
                        <span className="fw-bold small">{userName}</span>
                        <span className="small text-muted" style={{ fontSize: '0.75rem' }}>{userEmail}</span>
                    </div>
                </div>

                <Button 
                    color="link" 
                    className="text-danger text-decoration-none" 
                    onClick={handleLogout}
                >
                    <FaSignOutAlt className="me-2" /> Logout
                </Button>
            </NavItem>
        </Nav>
    );
};

export default AdminNav;