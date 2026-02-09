import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Form, FormGroup, Label, Input, Alert } from 'reactstrap';
import { toast } from 'react-toastify';
import Widget from '../../components/Widget/Widget'; 
import { FaEdit, FaTrash, FaPlus, FaCheck, FaTimes } from 'react-icons/fa';

import { 
    getAllAttributes, 
    createAttribute, 
    updateAttribute, 
    deleteAttribute, 
} from '../../services/attributeService'; 

// 🚨 1. Import Permissions Hook
import { usePermissions } from '../../hooks/usePermissions';

const FIELD_TYPES = ['text', 'number', 'date', 'boolean', 'array', 'select', 'url', 'mixed', 'image_array'];

const initialFormState = {
    slug: '',
    name: '',
    fieldType: FIELD_TYPES[0],
    defaultOptions: '', 
    description: '',
    isEditing: false,
};

export default function ManageAttributes() {
    // 🚨 2. Initialize Permissions
    const { can } = usePermissions();
    const canEdit = can('config', 'edit'); // Check if user has Edit access to Config

    const [attributes, setAttributes] = useState([]);
    const [formData, setFormData] = useState(initialFormState);
    const [isJsonMode, setIsJsonMode] = useState(false);

    useEffect(() => {
        fetchAttributes();
    }, []);

    const fetchAttributes = async () => {
        try {
            const data = await getAllAttributes();
            setAttributes(data);
        } catch (error) {
            toast.error("Failed to load attributes.");
            console.error(error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'fieldType' && !['select', 'array'].includes(value)) {
            setFormData(prev => ({ ...prev, [name]: value, defaultOptions: '' }));
            setIsJsonMode(false);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleEditClick = (attribute) => {
        // 🚨 Double check permission before allowing edit action
        if (!canEdit) return; 

        let formattedOptions = '';
        let complexDataFound = false;

        if (Array.isArray(attribute.defaultOptions) && attribute.defaultOptions.length > 0) {
            if (typeof attribute.defaultOptions[0] === 'object') {
                formattedOptions = JSON.stringify(attribute.defaultOptions, null, 4);
                complexDataFound = true;
            } else {
                formattedOptions = attribute.defaultOptions.join(', ');
                complexDataFound = false;
            }
        }

        setIsJsonMode(complexDataFound);

        setFormData({
            ...attribute,
            defaultOptions: formattedOptions, 
            isEditing: true,
        });

        const element = document.getElementById('form-anchor');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 🚨 Security Check
        if (!canEdit) {
            return toast.error("You do not have permission to modify attributes.");
        }

        let processedOptions = [];
        
        if (formData.defaultOptions) {
            if (isJsonMode) {
                try {
                    processedOptions = JSON.parse(formData.defaultOptions);
                    if (!Array.isArray(processedOptions)) throw new Error("Must be an array");
                } catch (err) {
                    return toast.error("Invalid JSON format in Options. Please check syntax.");
                }
            } else {
                processedOptions = formData.defaultOptions.split(',').map(s => s.trim()).filter(s => s);
            }
        }

        const payload = {
            ...formData,
            defaultOptions: processedOptions
        };

        if (payload.fieldType === 'image_array' && payload.defaultOptions.length > 0) {
             return toast.error("Image Array types cannot have default options.");
        }

        try {
            if (formData.isEditing) {
                await updateAttribute(formData.slug, payload);
                toast.success(`Attribute '${formData.name}' updated.`);
            } else {
                await createAttribute(payload);
                toast.success(`New attribute '${formData.name}' created.`);
            }
            
            setFormData(initialFormState);
            setIsJsonMode(false); 
            await fetchAttributes(); 
        } catch (error) {
            const msg = error.response?.data?.message || "An unexpected error occurred.";
            toast.error(`Operation failed: ${msg}`);
            console.error(error);
        }
    };

    const handleDelete = async (slug, name) => {
        // 🚨 Security Check
        if (!canEdit) return;

        if (!window.confirm(`Are you sure you want to delete the attribute: ${name}?`)) return;

        try {
            await deleteAttribute(slug);
            toast.success(`Attribute '${name}' deleted.`);
            await fetchAttributes();
        } catch (error) {
            const msg = error.response?.data?.message || "An unexpected error occurred.";
            toast.error(`Deletion failed: ${msg}`);
            console.error(error);
        }
    };
    
    const isOptionsField = formData.fieldType === 'select' || formData.fieldType === 'array';

    return (
        <Container fluid>
            
            {/* 🚨 3. Conditional Rendering: Only show Form if user has Edit Permissions */}
            {canEdit ? (
                <Row className="mb-4">
                    <Col md={12}>
                        <Widget id="form-anchor" title={formData.isEditing ? `Edit Attribute: ${formData.name}` : "Create New Attribute"}>
                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col md={4}>
                                        <FormGroup>
                                            <Label for="slug">Slug (Unique Key)</Label>
                                            <Input
                                                type="text" name="slug" id="slug"
                                                value={formData.slug} onChange={handleChange}
                                                disabled={formData.isEditing}
                                                placeholder="e.g., profile_photos" required
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
                                            <Label for="fieldType">Field Type</Label>
                                            <Input type="select" name="fieldType" id="fieldType" value={formData.fieldType} onChange={handleChange} required>
                                                {FIELD_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                            </Input>
                                        </FormGroup>
                                    </Col>
                                </Row>
                                <FormGroup>
                                    <Label for="description">Description (Hint/Placeholder)</Label>
                                    <Input type="textarea" name="description" id="description" value={formData.description} onChange={handleChange} />
                                </FormGroup>
                                
                                {isOptionsField && (
                                    <FormGroup>
                                        <div className="d-flex justify-content-between">
                                            <Label for="defaultOptions">
                                                Options {isJsonMode ? '(JSON Format)' : '(Comma Separated)'}
                                            </Label>
                                            <Button size="sm" color="link" onClick={() => setIsJsonMode(!isJsonMode)}>
                                                Switch to {isJsonMode ? 'Simple Text' : 'JSON (Advanced)'}
                                            </Button>
                                        </div>
                                        
                                        <Input 
                                            type="textarea" 
                                            rows={isJsonMode ? 10 : 2}
                                            name="defaultOptions" 
                                            id="defaultOptions" 
                                            value={formData.defaultOptions} 
                                            onChange={handleChange} 
                                            placeholder={isJsonMode 
                                                ? '[ { "value": "A", "label": "Option A", "group": "G1" } ]' 
                                                : 'Option A, Option B, Option C'
                                            }
                                            style={{ fontFamily: isJsonMode ? 'monospace' : 'inherit', fontSize: isJsonMode ? '0.9em' : 'inherit' }}
                                        />
                                        {isJsonMode && <small className="text-muted">Edit the JSON structure carefully to preserve Value, Label, and Description.</small>}
                                    </FormGroup>
                                )}

                                <div className="d-flex justify-content-end">
                                    {formData.isEditing && (
                                        <Button color="secondary" onClick={() => { setFormData(initialFormState); setIsJsonMode(false); }} className="me-2">
                                            Cancel Edit
                                        </Button>
                                    )}
                                    <Button color="primary" type="submit">
                                        {formData.isEditing ? 'Save Changes' : 'Create Attribute'}
                                    </Button>
                                </div>
                            </Form>
                        </Widget>
                    </Col>
                </Row>
            ) : (
                // Optional: Show a message that they are in View Only mode
                <Row className="mb-4">
                    <Col>
                        <Alert color="info">You are viewing Attributes in Read-Only mode.</Alert>
                    </Col>
                </Row>
            )}

            <Row className={canEdit ? "mt-5" : ""}>
                <Col md={12}>
                    <Widget title={`Existing Global Attributes (${attributes.length})`}>
                        <Table striped responsive>
                            <thead>
                                <tr>
                                    <th>Slug</th>
                                    <th>Display Name</th>
                                    <th>Type</th>
                                    <th>Options</th>
                                    {/* 🚨 4. Only show Actions header if allowed */}
                                    {canEdit && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {attributes.map(attr => (
                                    <tr key={attr.slug}>
                                        <td><strong>{attr.slug}</strong></td>
                                        <td>{attr.name}</td>
                                        <td>{attr.fieldType}</td>
                                        <td style={{ maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {Array.isArray(attr.defaultOptions) 
                                                ? attr.defaultOptions.map(o => (typeof o === 'object' ? o.label : o)).join(', ')
                                                : 'N/A'
                                            }
                                        </td>
                                        {/* 🚨 5. Only show Actions buttons if allowed */}
                                        {canEdit && (
                                              <td className="text-end">
                                                <Button size="sm" color="light" className="me-2 border" onClick={() => handleEditClick(attr)} title="Edit">
                                                    <FaEdit className="text-secondary"/>
                                                </Button>
                                                <Button size="sm" color="light" className="border" onClick={() => handleDelete(attr.slug, attr.name)} title="Delete">
                                                    <FaTrash className="text-danger"/>
                                                </Button>
                                            </td>
                                            
                                        )}
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