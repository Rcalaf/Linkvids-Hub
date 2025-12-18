// client/src/pages/ErrorPage.jsx
import React from 'react';
import { Container } from 'reactstrap';

export default function ErrorPage() {
    return (
        <Container style={{ marginTop: '50px', textAlign: 'center' }}>
            <h2>404 - Page Not Found</h2>
            <p>The page you are looking for does not exist.</p>
        </Container>
    );
}