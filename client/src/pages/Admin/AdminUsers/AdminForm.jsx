import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    Container, Row, Col, Card, CardBody, Form, FormGroup, Label, Input, Button, Table, Alert, Badge, InputGroup, InputGroupText 
} from 'reactstrap';
import { 
    FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaLock, FaCopy, FaKey, FaRandom, FaEye, FaEyeSlash 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Title from '../../../components/Title';
import { createAdminUser, updateAdminUser, getAdminById } from '../../../services/adminService';

// 🚨 1. Correct Import based on your "Old" working code
import { useAuth } from '../../../hooks/useAuth'; 

export default function AdminForm() {
    const { id } = useParams(); 
    const navigate = useNavigate();
    const isEditMode = !!id;

    // 🚨 2. Correct User Extraction
    // We use .auth because your "Old" code indicated the user object lives there
    const authContext = useAuth();
    const currentUser = authContext.auth ? authContext.auth.user : authContext.user; 

    // 🚨 3. Calculate "Is Self"
    const isSelf = isEditMode && currentUser && (currentUser._id?.toString() === id?.toString() || currentUser.id?.toString() === id?.toString());

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '', // Password field
        isActive: true,
        permissions: { jobs: 'view', collaborators: 'view', config: 'none', news: 'view', users: 'view' }
    });
    
    const [tempPassword, setTempPassword] = useState(null); 
    const [loading, setLoading] = useState(false);
    
    // Password UI State
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (isEditMode) loadAdmin();
    }, [id]);

    const loadAdmin = async () => {
        try {
            const data = await getAdminById(id);
            setFormData({
                name: data.name,
                email: data.email,
                password: '', 
                isActive: data.isActive,
                permissions: data.permissions || { jobs: 'view', collaborators: 'view', config: 'none', news: 'view', users: 'view' }
            });
        } catch (e) {
            toast.error("Failed to load admin details");
            navigate('/admin/users');
        }
    };

    // --- PASSWORD GENERATOR ---
    const generateRandomPassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let pass = "";
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, password: pass }));
        setShowPassword(true); 
        toast.info("Random password generated. Don't forget to copy it!");
    };

    const handlePermChange = (module, level) => {
        // 🚨 4. UI Protection: Prevent state update if editing self
        if (isSelf) return; 

        setFormData(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [module]: level }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };

            // Logic 1: Remove empty password if editing (so we don't overwrite with blank)
            if (isEditMode && !payload.password) {
                delete payload.password;
            }

            // 🚨 5. DATA PROTECTION: If editing self, forcefully remove permissions/active status from payload
            // This ensures that even if the UI fails, we don't send these fields to the backend.
            if (isSelf) {
                delete payload.permissions;
                delete payload.isActive;
            }

            if (isEditMode) {
                await updateAdminUser(id, payload);
                toast.success("Admin profile updated successfully");
                
                if (payload.password && isSelf) {
                    toast.warning("You changed your own password. You may need to login again next time.");
                }
                navigate('/admin/users');
            } else {
                const result = await createAdminUser(payload);
                const finalPass = result.temporaryPassword || formData.password; 
                setTempPassword(finalPass);
                toast.success("Admin created!");
            }
        } catch (e) {
            console.error(e);
            toast.error("Operation failed. Check if email is unique.");
        } finally {
            setLoading(false);
        }
    };

    // --- SUCCESS VIEW ---
    if (tempPassword) {
        return (
            <Container className="py-5">
                <Card className="border-0 shadow-sm mx-auto" style={{ maxWidth: '600px' }}>
                    <CardBody className="text-center p-5">
                        <FaCheckCircle className="text-success display-1 mb-4" />
                        <h2>Admin Created Successfully</h2>
                        <p className="text-muted mb-4">Please copy the password below. It will not be shown again.</p>
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

    // --- FORM VIEW ---
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
                            
                            {/* Safety Alert for Self-Edit */}
                            {isSelf && (
                                <Alert color="info" className="d-flex align-items-center mb-4">
                                    <FaLock className="me-3 fs-5" />
                                    <div>
                                        <strong>Editing your own profile:</strong> You can update your details and password, 
                                        but you cannot modify your own Permissions or Active Status.
                                    </div>
                                </Alert>
                            )}

                            <Form onSubmit={handleSubmit}>
                                {/* --- 1. BASIC INFO --- */}
                                <h6 className="fw-bold mb-3 text-uppercase small text-muted">Basic Information</h6>
                                <Row className="mb-4">
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

                                {/* --- 2. PASSWORD SECTION --- */}
                                <hr className="my-4" />
                                <h6 className="fw-bold mb-3 text-uppercase small text-muted">
                                    <FaKey className="me-2" /> Security & Password
                                </h6>
                                <div className="bg-light p-3 rounded border mb-4">
                                    <FormGroup className="mb-0">
                                        <Label>
                                            {isEditMode ? "Set New Password" : "Initial Password"} 
                                            {isEditMode && <span className="text-muted fw-normal ms-2">(Leave blank to keep current)</span>}
                                        </Label>
                                        <InputGroup>
                                            <InputGroupText className="bg-white"><FaKey /></InputGroupText>
                                            <Input 
                                                type={showPassword ? "text" : "password"} 
                                                placeholder={isEditMode ? "Enter new password to change..." : "Enter password..."}
                                                value={formData.password}
                                                onChange={e => setFormData({...formData, password: e.target.value})}
                                                autoComplete="new-password"
                                            />
                                            <Button color="light" className="border" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Hide" : "Show"}>
                                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                                            </Button>
                                            <Button color="warning" outline onClick={generateRandomPassword} title="Generate Random Password">
                                                <FaRandom /> Generate
                                            </Button>
                                        </InputGroup>
                                        {formData.password && (
                                            <div className="mt-2 text-end">
                                                <Button size="sm" color="link" className="p-0 text-decoration-none" onClick={() => {navigator.clipboard.writeText(formData.password); toast.success("Password copied!");}}>
                                                    <FaCopy className="me-1" /> Copy Password
                                                </Button>
                                            </div>
                                        )}
                                    </FormGroup>
                                </div>

                                {/* --- 3. PERMISSIONS SECTION --- */}
                                <hr className="my-4" />
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="fw-bold mb-0 text-uppercase small text-muted">Access Permissions</h6>
                                    <div className="form-check form-switch">
                                        <Input 
                                            className="form-check-input" 
                                            type="checkbox" 
                                            checked={formData.isActive}
                                            // 🚨 6. Disable Active Toggle if Self
                                            disabled={isSelf} 
                                            onChange={e => setFormData({...formData, isActive: e.target.checked})}
                                        />
                                        <Label className="form-check-label ms-2">
                                            Account Active
                                            {isSelf && <Badge color="secondary" className="ms-2">Locked</Badge>}
                                        </Label>
                                    </div>
                                </div>

                                <Table bordered responsive className={isSelf ? "opacity-75" : ""}>
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Module</th>
                                            <th className="text-center">No Access</th>
                                            <th className="text-center">View Only</th>
                                            <th className="text-center">Full Control (Edit)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {['jobs', 'collaborators', 'news', 'users', 'config'].map(module => (
                                            <tr key={module}>
                                                <td className="fw-bold text-capitalize">{module} Management</td>
                                                {['none', 'view', 'edit'].map(level => (
                                                    <td key={level} className="text-center">
                                                        <Input 
                                                            type="radio" 
                                                            name={`perm-${module}`}
                                                            checked={formData.permissions[module] === level}
                                                            // 🚨 7. Disable Radio Buttons if Self
                                                            disabled={isSelf}
                                                            onChange={() => handlePermChange(module, level)}
                                                            style={{ cursor: isSelf ? 'not-allowed' : 'pointer' }}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>

                                {/* Footer Actions */}
                                <div className="d-flex justify-content-end mt-4 pt-3 border-top gap-2">
                                    <Link to="/admin/users">
                                        <Button color="secondary" outline>Cancel</Button>
                                    </Link>
                                    <Button color="primary" type="submit" disabled={loading}>
                                        {loading ? "Saving..." : (isEditMode ? "Save Changes" : "Create Admin")} 
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