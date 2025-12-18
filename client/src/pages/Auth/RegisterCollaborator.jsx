import React, { useState, useEffect } from 'react';
import { Container, Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axiosConfig';
import { getAllUserTypes } from '../../services/userTypeService';

export default function RegisterCollaborator() {
    const [userTypes, setUserTypes] = useState([]);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', password: '', collaboratorType: ''
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch only Collaborator types (UGC, Actor, etc.)
        getAllUserTypes().then(types => {
            const collabTypes = types.filter(t => t.parentType === 'Collaborator');
            setUserTypes(collabTypes);
            if (collabTypes.length > 0) setFormData(prev => ({ ...prev, collaboratorType: collabTypes[0].slug }));
        });
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/auth/register/collaborator', formData);
            navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <Container style={{ maxWidth: '500px', marginTop: '50px' }}>
            <h3>Creator Registration</h3>
            {error && <Alert color="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
                <FormGroup>
                    <Label>I am a...</Label>
                    <Input type="select" name="collaboratorType" value={formData.collaboratorType} onChange={handleChange}>
                        {userTypes.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                    </Input>
                </FormGroup>
                <FormGroup>
                    <Label>First Name</Label>
                    <Input name="firstName" required onChange={handleChange} />
                </FormGroup>
                <FormGroup>
                    <Label>Last Name</Label>
                    <Input name="lastName" required onChange={handleChange} />
                </FormGroup>
                <FormGroup>
                    <Label>Email</Label>
                    <Input type="email" name="email" required onChange={handleChange} />
                </FormGroup>
                <FormGroup>
                    <Label>Password</Label>
                    <Input type="password" name="password" required onChange={handleChange} />
                </FormGroup>
                <Button color="primary" block type="submit">Register</Button>
            </Form>
        </Container>
    );
}