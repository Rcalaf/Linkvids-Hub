// client/src/pages/Auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { Container, Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import axios from '../../api/axiosConfig';

export default function Login() {
    const { login, logout } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const successMsg = location.state?.message;

    useEffect(() => {
        logout();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/auth/login', formData);
            const { accessToken, redirectPath, user } = response.data;

            login(user, accessToken);

            // 2. Redirect based on Role
            navigate(redirectPath); 

        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#f5f7fb' }}>
            <div style={{ width: '100%', maxWidth: '450px' }} className="p-5 bg-white border rounded shadow-sm">
                <div className="text-center mb-4">
                    <h2 className="fw-bold">Welcome Back</h2>
                    <p className="text-muted">Log in to your LinkVids account</p>
                </div>

                {successMsg && <Alert color="success" className="text-center">{successMsg}</Alert>}
                {error && <Alert color="danger" className="text-center">{error}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                    <FormGroup className="mb-3">
                        <Label for="email">Email Address</Label>
                        <Input 
                            type="email" 
                            id="email"
                            placeholder="name@example.com"
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                            required 
                            autoFocus
                        />
                    </FormGroup>
                    <FormGroup className="mb-4">
                        <Label for="password">Password</Label>
                        <Input 
                            type="password" 
                            id="password"
                            placeholder="Enter your password"
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                            required 
                        />
                    </FormGroup>
                    
                    <Button color="primary" block size="lg" type="submit" disabled={loading}>
                        {loading ? 'Logging in...' : 'Log In'}
                    </Button>
                </Form>

                <div className="text-center mt-4 pt-3 border-top">
                    <p className="mb-0">Don't have an account?</p>
                    <Link to="/register" className="text-decoration-none fw-bold">
                        Create an Account
                    </Link>
                </div>
            </div>
        </Container>
    );
}