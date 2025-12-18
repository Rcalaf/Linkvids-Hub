import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Badge, FormGroup, Input } from 'reactstrap';
import { Link } from 'react-router-dom';
import { FaUserShield, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Title from '../../../components/Title';
import Widget from '../../../components/Widget/Widget';
import { getAllAdmins, deleteAdminUser, toggleAdminStatus } from '../../../services/adminService';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';

export default function AdminList() {
    const { auth } = useAuth();
    const { can } = usePermissions();

    const currentUserId = auth.user?.id || auth.user._id; 
    const [admins, setAdmins] = useState([]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const data = await getAllAdmins();
            setAdmins(data);
        } catch (e) { console.error(e); }
    };

    const handleToggleStatus = async (id) => {
        try {
            const result = await toggleAdminStatus(id);
            setAdmins(prev => prev.map(a => a._id === id ? { ...a, isActive: result.isActive } : a));
            toast.success(result.message);
        } catch (e) { toast.error("Failed to update status"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this admin?")) return;
        try {
            await deleteAdminUser(id);
            setAdmins(prev => prev.filter(a => a._id !== id));
            toast.success("Admin deleted");
        } catch (e) { toast.error("Failed to delete"); }
    };

    // Helper to render permission badges
    const renderPerms = (perms) => {
        if (!perms) return <Badge color="secondary">Default</Badge>;
        return (
            <div className="d-flex gap-1 flex-wrap">
                {Object.entries(perms).map(([key, val]) => (
                    val !== 'none' && (
                        <Badge key={key} color={val === 'edit' ? 'primary' : 'info'} pill>
                            {key}: {val}
                        </Badge>
                    )
                ))}
            </div>
        );
    };

    return (
        <Container fluid>
            <Title title="Admin Team" />
            <div className="d-flex justify-content-between align-items-center mb-4">
                {can('admins', 'edit') && (
                <Link to="/admin/users/create">
                    <Button color="primary"><FaPlus className="me-2" /> New Admin</Button>
                </Link>
                )}
            </div>

            <Widget>
                <Table hover className="align-middle">
                    <thead className="bg-light">
                        <tr>
                            <th className="border-top-0">Admin User</th>
                            <th className="border-top-0">Access Permissions</th>
                            <th className="border-top-0 text-center">Status</th>
                            <th className="border-top-0 text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {admins.map(admin => {
                            const isMe = admin._id === currentUserId;
                          
                            return (
                            <tr key={admin._id} className={!admin.isActive ? 'opacity-50' : ''}>
                                <td>
                                    <div className="d-flex align-items-center">
                                        <div className="bg-light rounded-circle p-2 me-3">
                                            <FaUserShield size={20} className={admin.isActive ? "text-primary" : "text-muted"} />
                                        </div>
                                        <div>
                                            <div className="fw-bold">{admin.name} {isMe && "(You)"}</div>
                                            <small className="text-muted">{admin.email}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>{renderPerms(admin.permissions)}</td>
                                <td className="text-center">
                                    <FormGroup switch className="d-flex justify-content-center">
                                        {can('admins', 'edit') && (
                                        <Input 
                                            type="switch" 
                                            checked={admin.isActive}
                                            disabled={admin._id === currentUserId}
                                            onChange={() => handleToggleStatus(admin._id)}
                                        />
                                        )}
                                    </FormGroup>
                                </td>
                                <td className="text-end">
                                    {can('admins', 'edit') && (
                                        <Link to={`/admin/users/edit/${admin._id}`}>
                                            <Button color="light" size="sm" className="me-2 border"><FaEdit /></Button>
                                        </Link>
                                    )}
                                    {!isMe && can('admins', 'edit') && (
                                        <Button color="light" size="sm" className="text-danger border" onClick={() => handleDelete(admin._id)}>
                                            <FaTrash />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </Table>
            </Widget>
        </Container>
    );
}