// client/src/pages/Auth/Unauthorized.jsx
import React from 'react';
import { Container, Button } from 'reactstrap';
import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
    const navigate = useNavigate();
    return (
        <Container className="text-center mt-5">
            <h1 className="display-1 fw-bold text-danger">403</h1>
            <h2>Access Denied</h2>
            <p className="lead">You do not have permission to view this page.</p>
            <Button color="primary" onClick={() => navigate(-1)}>Go Back</Button>
        </Container>
    );
}