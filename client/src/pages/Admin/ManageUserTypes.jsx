import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Table, Button, Form, FormGroup, Label, Input, Alert, Badge 
} from 'reactstrap';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaPlus, FaCheck, FaTimes } from 'react-icons/fa';

import Widget from '../../components/Widget/Widget';
import Title from '../../components/Title';

// Services
import { 
    getAllUserTypes, 
    createUserType, 
    updateUserType, 
    deleteUserType 
} from '../../services/userTypeService'; 

// 🚨 1. Import Permissions Hook
import { usePermissions } from '../../hooks/usePermissions';

const initialFormState = {
    name: '',
    slug: '',
    description: '',
    isAgency: false, // Checkbox for agency type
    isEditing: false,
    _id: null
};

export default function ManageUserTypes() {
    // 🚨 2. Initialize Permissions
    const { can } = usePermissions();
    const canEdit = can('config', 'edit'); // Reusing 'config' permission for User Types as well

    const [userTypes, setUserTypes] = useState([]);
    const [formData, setFormData] = useState(initialFormState);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getAllUserTypes();
            setUserTypes(data);
        } catch (error) {
            toast.error("Failed to load user types");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Auto-generate slug from name if creating new
    const handleNameChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({
            ...prev,
            name: val,
            slug: !prev.isEditing ? val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : prev.slug
        }));
    };

    const handleEditClick = (type) => {
        // 🚨 Security Check
        if (!canEdit) return;

        setFormData({
            ...type,
            isEditing: true
        });
        
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setFormData(initialFormState);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 🚨 Security Check
        if (!canEdit) {
            return toast.error("You do not have permission to modify User Types.");
        }

        try {
            if (formData.isEditing) {
                await updateUserType(formData._id, formData);
                toast.success("User Type updated successfully");
            } else {
                await createUserType(formData);
                toast.success("User Type created successfully");
            }
            setFormData(initialFormState);
            loadData();
        } catch (error) {
            const msg = error.response?.data?.message || "Operation failed";
            toast.error(msg);
        }
    };

    const handleDelete = async (id, name) => {
        // 🚨 Security Check
        if (!canEdit) return;

        if (!window.confirm(`Delete User Type "${name}"? This may affect users assigned to this role.`)) return;
        
        try {
            await deleteUserType(id);
            toast.success("User Type deleted");
            loadData();
        } catch (error) {
            toast.error("Failed to delete user type");
        }
    };

    return (
        <Container fluid>
            <Title title="Manage User Types & Roles" />

            {/* 🚨 3. Conditional Rendering: Form */}
            {canEdit ? (
                <Row className="mb-4">
                    <Col md={12}>
                        <Widget title={formData.isEditing ? `Edit Role: ${formData.name}` : "Create New Role"}>
                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col md={4}>
                                        <FormGroup>
                                            <Label>Role Name</Label>
                                            <Input 
                                                required 
                                                name="name" 
                                                value={formData.name} 
                                                onChange={handleNameChange} 
                                                placeholder="e.g. Video Editor"
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={4}>
                                        <FormGroup>
                                            <Label>Slug (ID)</Label>
                                            <Input 
                                                required 
                                                name="slug" 
                                                value={formData.slug} 
                                                onChange={handleChange} 
                                                disabled={formData.isEditing} // Slugs usually shouldn't change after creation
                                                placeholder="e.g. video-editor"
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={4}>
                                        <FormGroup>
                                            <Label>Role Category</Label>
                                            <div className="pt-2">
                                                <FormGroup check inline>
                                                    <Input 
                                                        type="checkbox" 
                                                        name="isAgency" 
                                                        checked={formData.isAgency} 
                                                        onChange={handleChange} 
                                                    />
                                                    <Label check>Is Agency?</Label>
                                                </FormGroup>
                                            </div>
                                            <small className="text-muted d-block mt-1">
                                                Check this if this role represents a company/agency rather than an individual.
                                            </small>
                                        </FormGroup>
                                    </Col>
                                </Row>
                                <FormGroup>
                                    <Label>Description</Label>
                                    <Input 
                                        type="textarea" 
                                        name="description" 
                                        value={formData.description} 
                                        onChange={handleChange} 
                                        placeholder="Describe the responsibilities of this role..."
                                    />
                                </FormGroup>

                                <div className="d-flex justify-content-end gap-2">
                                    {formData.isEditing && (
                                        <Button color="secondary" outline onClick={handleCancel}>
                                            Cancel
                                        </Button>
                                    )}
                                    <Button color="primary" type="submit">
                                        {formData.isEditing ? <><FaCheck className="me-2"/> Save Changes</> : <><FaPlus className="me-2"/> Create Role</>}
                                    </Button>
                                </div>
                            </Form>
                        </Widget>
                    </Col>
                </Row>
            ) : (
                <Row className="mb-4">
                    <Col>
                        <Alert color="info">
                            You are viewing User Roles in <strong>Read-Only</strong> mode.
                        </Alert>
                    </Col>
                </Row>
            )}

            <Row>
                <Col md={12}>
                    <Widget title={`Existing Roles (${userTypes.length})`}>
                        {loading ? <p>Loading...</p> : (
                            <Table hover responsive className="align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Role Name</th>
                                        <th>Slug</th>
                                        <th>Category</th>
                                        <th>Description</th>
                                        {/* 🚨 4. Conditional Header */}
                                        {canEdit && <th className="text-end">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {userTypes.map(type => (
                                        <tr key={type._id}>
                                            <td className="fw-bold">{type.name}</td>
                                            <td><Badge color="light" className="text-dark border">{type.slug}</Badge></td>
                                            <td>
                                                {type.isAgency ? 
                                                    <Badge color="warning" className="text-dark">Agency</Badge> : 
                                                    <Badge color="info">Collaborator</Badge>
                                                }
                                            </td>
                                            <td className="text-muted small">
                                                {type.description || '-'}
                                            </td>
                                            
                                            {/* 🚨 5. Conditional Actions */}
                                            {canEdit && (
                                                <td className="text-end">
                                                    <Button size="sm" color="light" className="me-2 border" onClick={() => handleEditClick(type)} title="Edit">
                                                        <FaEdit className="text-secondary"/>
                                                    </Button>
                                                    <Button size="sm" color="light" className="border" onClick={() => handleDelete(type._id, type.name)} title="Delete">
                                                        <FaTrash className="text-danger"/>
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {userTypes.length === 0 && (
                                        <tr>
                                            <td colSpan={canEdit ? 5 : 4} className="text-center p-4 text-muted">
                                                No user roles defined yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        )}
                    </Widget>
                </Col>
            </Row>
        </Container>
    );
}