import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, CardBody, Form, FormGroup, Label, Input, Button, Table, Alert } from 'reactstrap';
import { FaArrowLeft, FaSave, FaCopy, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Title from '../../../components/Title';
import { createAdminUser, updateAdminUser, getAdminById } from '../../../services/adminService'; // Assume getAdminById exists

export default function AdminForm() {
    const { id } = useParams(); // If ID exists, we are in EDIT mode
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        isActive: true,
        permissions: { jobs: 'view', collaborators: 'view', admins: 'none', news: 'view',  }
    });
    
    const [tempPassword, setTempPassword] = useState(null); // For Success View
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEditMode) loadAdmin();
    }, [id]);

    const loadAdmin = async () => {
        try {
            // Note: Ensure your getAdminById backend returns 'permissions' and 'isActive'
            const data = await getAdminById(id);
            setFormData({
                name: data.name,
                email: data.email,
                isActive: data.isActive,
                permissions: data.permissions || { jobs: 'view', collaborators: 'view', admins: 'none', news: 'view', }
            });
        } catch (e) {
            toast.error("Failed to load admin details");
            navigate('/admin/users');
        }
    };

    const handlePermChange = (module, level) => {
        setFormData(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [module]: level }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode) {
                await updateAdminUser(id, formData);
                toast.success("Admin updated successfully");
                navigate('/admin/users');
            } else {
                const result = await createAdminUser(formData);
                setTempPassword(result.temporaryPassword); // Show success screen
                toast.success("Admin created!");
            }
        } catch (e) {
            toast.error("Operation failed. Email might be in use.");
        } finally {
            setLoading(false);
        }
    };

    // 🚨 SUCCESS VIEW (Only for Create) 🚨
    if (tempPassword) {
        return (
            <Container className="py-5">
                <Card className="border-0 shadow-sm mx-auto" style={{ maxWidth: '600px' }}>
                    <CardBody className="text-center p-5">
                        <FaCheckCircle className="text-success display-1 mb-4" />
                        <h2>Admin Created Successfully</h2>
                        <p className="text-muted mb-4">Please copy the temporary password below. It will not be shown again.</p>
                        
                        <div className="bg-light p-4 rounded border mb-4">
                            <h5 className="text-primary fw-bold mb-0 d-flex justify-content-center align-items-center gap-3">
                                {tempPassword}
                                <Button color="link" onClick={() => {navigator.clipboard.writeText(tempPassword); toast.success("Copied!");}}>
                                    <FaCopy />
                                </Button>
                            </h5>
                        </div>
                        
                        <Link to="/admin/users">
                            <Button color="success">Done & Return to List</Button>
                        </Link>
                    </CardBody>
                </Card>
            </Container>
        );
    }

    // 🚨 FORM VIEW 🚨
    return (
        <Container fluid>
            <div className="mb-4">
                <Link to="/admin/users">
                    <Button color="secondary" outline size="sm"><FaArrowLeft className="me-2" /> Back to List</Button>
                </Link>
            </div>
            
            <Title title={isEditMode ? "Edit Administrator" : "Create New Administrator"} />

            <Row>
                <Col lg={8}>
                    <Card className="shadow-sm border-0 mb-4">
                        <CardBody className="p-4">
                            <Form onSubmit={handleSubmit}>
                                <h6 className="fw-bold mb-3">Basic Information</h6>
                                <Row>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label>Full Name</Label>
                                            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                        </FormGroup>
                                    </Col>
                                    <Col md={6}>
                                        <FormGroup>
                                            <Label>Email</Label>
                                            <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={isEditMode} />
                                        </FormGroup>
                                    </Col>
                                </Row>

                                <hr className="my-4" />

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="fw-bold mb-0">Access Permissions</h6>
                                    <div className="form-check form-switch">
                                        <Input 
                                            className="form-check-input" 
                                            type="checkbox" 
                                            checked={formData.isActive}
                                            onChange={e => setFormData({...formData, isActive: e.target.checked})}
                                        />
                                        <Label className="form-check-label ms-2">Account Active</Label>
                                    </div>
                                </div>

                                <Table bordered responsive>
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Module</th>
                                            <th className="text-center">No Access</th>
                                            <th className="text-center">View Only</th>
                                            <th className="text-center">Full Control (Edit)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {['jobs', 'collaborators', 'news', 'admins'].map(module => (
                                            <tr key={module}>
                                                <td className="fw-bold text-capitalize">{module} Management</td>
                                                {['none', 'view', 'edit'].map(level => (
                                                    <td key={level} className="text-center">
                                                        <Input 
                                                            type="radio" 
                                                            name={`perm-${module}`}
                                                            checked={formData.permissions[module] === level}
                                                            onChange={() => handlePermChange(module, level)}
                                                            // Safety: Prevent removing admin access from yourself if implementing self-edit logic
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                                
                                {formData.permissions.admins === 'edit' && (
                                    <Alert color="warning" className="d-flex align-items-center mt-3">
                                        <FaExclamationTriangle className="me-3 fs-4" />
                                        <div>
                                            <strong>Warning:</strong> Granting "Full Control" to Admin Management allows this user to create, delete, or modify other administrators.
                                        </div>
                                    </Alert>
                                )}

                                <div className="d-flex justify-content-end mt-4">
                                    <Link to="/admin/users" className="btn btn-outline-secondary me-2">Cancel</Link>
                                    <Button color="primary" type="submit" disabled={loading}>
                                        <FaSave className="me-2" /> {isEditMode ? "Save Changes" : "Create Admin"}
                                    </Button>
                                </div>
                            </Form>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}