// client/src/pages/Auth/RegisterAgency.jsx
import React, { useState } from 'react';
import { Container, Form, FormGroup, Label, Input, Button, Alert, Row, Col } from 'reactstrap';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../api/axiosConfig'; // Adjust path if needed
import Title from '../../components/Title'; // Optional styling component

export default function RegisterAgency() {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        companyName: '',
        firstName: '', // Contact Person First Name
        lastName: '',  // Contact Person Last Name
        email: '',
        password: '',
        confirmPassword: ''
    });
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ 
            ...formData, 
            [e.target.name]: e.target.value 
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 1. Basic Client-side Validation
        if (formData.password !== formData.confirmPassword) {
            return setError("Passwords do not match.");
        }

        setLoading(true);

        try {
            // 2. Send Registration Request
            // The backend controller will handle hashing and creating the Agency document
            await axios.post('/auth/register/agency', {
                companyName: formData.companyName,
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password
            });

            // 3. Redirect on Success
            navigate('/login', { 
                state: { 
                    message: 'Agency registration successful! Please log in to continue.' 
                } 
            });

        } catch (err) {
            // Handle Server Errors (e.g., Email already exists)
            const msg = err.response?.data?.message || 'Registration failed. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', padding: '2rem 0' }}>
            <div style={{ width: '100%', maxWidth: '600px' }}>
                <div className="text-center mb-4">
                    <h2>Agency Registration</h2>
                    <p className="text-muted">Create an account to manage talent and campaigns.</p>
                </div>

                {error && <Alert color="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit} className="p-4 border rounded bg-white shadow-sm">
                    
                    {/* Company Details */}
                    <h5 className="text-primary mb-3">Company Details</h5>
                    <FormGroup>
                        <Label for="companyName">Company / Brand Name</Label>
                        <Input 
                            type="text" 
                            name="companyName" 
                            id="companyName" 
                            placeholder="e.g., Creative Solutions Ltd."
                            value={formData.companyName} 
                            onChange={handleChange} 
                            required 
                        />
                    </FormGroup>

                    {/* Contact Person */}
                    <h5 className="text-primary mt-4 mb-3">Primary Contact</h5>
                    <Row>
                        <Col md={6}>
                            <FormGroup>
                                <Label for="firstName">First Name</Label>
                                <Input 
                                    type="text" 
                                    name="firstName" 
                                    id="firstName" 
                                    value={formData.firstName} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <Label for="lastName">Last Name</Label>
                                <Input 
                                    type="text" 
                                    name="lastName" 
                                    id="lastName" 
                                    value={formData.lastName} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </FormGroup>
                        </Col>
                    </Row>

                    <FormGroup>
                        <Label for="email">Work Email</Label>
                        <Input 
                            type="email" 
                            name="email" 
                            id="email" 
                            placeholder="name@company.com"
                            value={formData.email} 
                            onChange={handleChange} 
                            required 
                        />
                    </FormGroup>

                    {/* Security */}
                    <h5 className="text-primary mt-4 mb-3">Security</h5>
                    <Row>
                        <Col md={6}>
                            <FormGroup>
                                <Label for="password">Password</Label>
                                <Input 
                                    type="password" 
                                    name="password" 
                                    id="password" 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                    required 
                                    minLength={6}
                                />
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <Label for="confirmPassword">Confirm Password</Label>
                                <Input 
                                    type="password" 
                                    name="confirmPassword" 
                                    id="confirmPassword" 
                                    value={formData.confirmPassword} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </FormGroup>
                        </Col>
                    </Row>

                    <Button color="success" size="lg" block className="mt-4" type="submit" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Register Agency'}
                    </Button>

                    <div className="text-center mt-3">
                        <small>
                            Already have an account? <Link to="/login">Log In</Link>
                        </small>
                    </div>
                </Form>
            </div>
        </Container>
    );
}