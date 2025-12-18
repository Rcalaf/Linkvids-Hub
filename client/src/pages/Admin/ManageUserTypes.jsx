// client/src/pages/Admin/ManageUserTypes.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Form, FormGroup, Label, Input } from 'reactstrap';
import { toast } from 'react-toastify';
import Widget from '../../components/Widget/Widget';
import Title from '../../components/Title';
import { getAllAttributes } from '../../services/attributeService';
import { getAllUserTypes, createUserType, updateUserType, deleteUserType } from '../../services/userTypeService';

const PARENT_TYPES = ['Collaborator', 'Agency'];

const initialConfigState = {
    slug: '',
    name: '',
    parentType: PARENT_TYPES[0],
    fields: [],
    isEditing: false,
};

export default function ManageUserTypes() {
    const [userTypes, setUserTypes] = useState([]);
    const [availableAttributes, setAvailableAttributes] = useState([]);
    const [formData, setFormData] = useState(initialConfigState);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [types, attributes] = await Promise.all([
                getAllUserTypes(),
                getAllAttributes()
            ]);
            setUserTypes(types);
            setAvailableAttributes(attributes);
        } catch (error) {
            toast.error("Failed to load configuration data.");
            console.error(error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    // --- Field Array Management ---

    const handleAddField = () => {
        setFormData(prev => ({
            ...prev,
            fields: [...prev.fields, { 
                attributeSlug: availableAttributes[0]?.slug || '', 
                label: '', 
                required: false, 
                section: '' 
            }]
        }));
    };

    const handleFieldChange = (index, fieldName, value) => {
        const newFields = formData.fields.map((field, i) => {
            if (i === index) {
                return { ...field, [fieldName]: value };
            }
            return field;
        });
        setFormData(prev => ({ ...prev, fields: newFields }));
    };

    const handleRemoveField = (index) => {
        setFormData(prev => ({
            ...prev,
            fields: prev.fields.filter((_, i) => i !== index)
        }));
    };

    // --- CRUD Operations ---

    const handleEditClick = (config) => {
        setFormData({ ...config, isEditing: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation check
        if (!formData.fields.length) {
            return toast.error("A user type must have at least one field.");
        }

        try {
            if (formData.isEditing) {
                await updateUserType(formData.slug, formData);
                toast.success(`User Type '${formData.name}' updated.`);
            } else {
                await createUserType(formData);
                toast.success(`New User Type '${formData.name}' created.`);
            }
            
            setFormData(initialConfigState);
            await fetchData(); 
        } catch (error) {
            const msg = error.response?.data?.message || "An unexpected error occurred.";
            toast.error(`Operation failed: ${msg}`);
            console.error(error);
        }
    };

    const handleDelete = async (slug, name) => {
        if (!window.confirm(`WARNING: Deleting '${name}' will remove its dynamic schema. Continue?`)) return;

        try {
            await deleteUserType(slug);
            toast.success(`User Type '${name}' deleted.`);
            await fetchData();
        } catch (error) {
            const msg = error.response?.data?.message || "An unexpected error occurred.";
            toast.error(`Deletion failed: ${msg}`);
            console.error(error);
        }
    };

    return (
        <Container fluid>
            <Title title="Admin: Dynamic User Type Configuration" />

            <Row className="mb-4">
                <Col md={12}>
                    <Widget title={formData.isEditing ? `Edit Type: ${formData.name}` : "Create New User Type"}>
                        <Form onSubmit={handleSubmit}>
                            <Row>
                                <Col md={4}>
                                    <FormGroup>
                                        <Label for="slug">Slug (Unique Key)</Label>
                                        <Input
                                            type="text" name="slug" id="slug"
                                            value={formData.slug} onChange={handleChange}
                                            disabled={formData.isEditing}
                                            placeholder="e.g., drone-pilot" required
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md={4}>
                                    <FormGroup>
                                        <Label for="name">Display Name</Label>
                                        <Input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required />
                                    </FormGroup>
                                </Col>
                                <Col md={4}>
                                    <FormGroup>
                                        <Label for="parentType">Parent Type (Discriminator)</Label>
                                        <Input type="select" name="parentType" id="parentType" value={formData.parentType} onChange={handleChange} required>
                                            {PARENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                        </Input>
                                    </FormGroup>
                                </Col>
                            </Row>

                            <hr />
                            <h5>Schema Fields</h5>
                            {formData.fields.map((field, index) => (
                                <Row key={index} className="align-items-end mb-2 border-bottom pb-2">
                                    <Col md={3}>
                                        <FormGroup>
                                            <Label>Attribute Source</Label>
                                            <Input 
                                                type="select" 
                                                value={field.attributeSlug} 
                                                onChange={(e) => handleFieldChange(index, 'attributeSlug', e.target.value)}
                                                required
                                            >
                                                {availableAttributes.map(attr => (
                                                    <option key={attr.slug} value={attr.slug}>
                                                        {attr.name} ({attr.fieldType})
                                                    </option>
                                                ))}
                                            </Input>
                                        </FormGroup>
                                    </Col>
                                    <Col md={3}>
                                        <FormGroup>
                                            <Label>Field Label</Label>
                                            <Input 
                                                type="text" 
                                                value={field.label} 
                                                onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                                                placeholder="e.g., Insta Handle"
                                                required
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={3}>
                                        <FormGroup>
                                            <Label>Form Section</Label>
                                            <Input 
                                                type="text" 
                                                value={field.section} 
                                                onChange={(e) => handleFieldChange(index, 'section', e.target.value)}
                                                placeholder="e.g., Contact Info"
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={1}>
                                        <FormGroup check>
                                            <Input 
                                                type="checkbox" 
                                                checked={field.required} 
                                                onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                                            />
                                            <Label check>Required</Label>
                                        </FormGroup>
                                    </Col>
                                    <Col md={2}>
                                        <Button color="danger" size="sm" onClick={() => handleRemoveField(index)}>Remove</Button>
                                    </Col>
                                </Row>
                            ))}
                            <div className="d-flex justify-content-between mt-3">
                                <Button color="info" type="button" onClick={handleAddField}>
                                    + Add New Field
                                </Button>
                                <div>
                                    {formData.isEditing && (
                                        <Button color="secondary" onClick={() => setFormData(initialConfigState)} className="me-2">
                                            Cancel Edit
                                        </Button>
                                    )}
                                    <Button color="primary" type="submit">
                                        {formData.isEditing ? 'Save Configuration' : 'Create User Type'}
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    </Widget>
                </Col>
            </Row>

            <Row>
                <Col md={12}>
                    <Widget title="Existing Dynamic User Types">
                        <Table striped responsive>
                            <thead>
                                <tr>
                                    <th>Slug</th>
                                    <th>Name</th>
                                    <th>Parent Type</th>
                                    <th>Fields Count</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userTypes.map(type => (
                                    <tr key={type.slug}>
                                        <td>{type.slug}</td>
                                        <td>{type.name}</td>
                                        <td>{type.parentType}</td>
                                        <td>{type.fields.length}</td>
                                        <td>
                                            <Button size="sm" color="info" className="me-2" onClick={() => handleEditClick(type)}>Edit Schema</Button>
                                            <Button size="sm" color="danger" onClick={() => handleDelete(type.slug, type.name)}>Delete</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Widget>
                </Col>
            </Row>
        </Container>
    );
}