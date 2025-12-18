// client/src/components/CollaboratorLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container } from 'reactstrap';
import CreatorNav from '../Navigation/CreatorNav';
import { useAuth } from '../../hooks/useAuth';

export default function CollaboratorLayout() {
    const { auth } = useAuth();

    const typeLabel = auth.user?.collaboratorType || 'Collaborator';
    return (
        <Container fluid className="p-4">
            <header style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
                <h3 className="text-primary">
                    LinkVids Creator Portal <span className="text-secondary" style={{ fontSize: '0.8em' }}>— {typeLabel}</span>
                </h3>
            </header>
            
            <CreatorNav />

            <main style={{ minHeight: '80vh' }}>
                <Outlet />
            </main>
            
            <footer className="mt-5 pt-3 border-top text-center text-muted">
                <small>© 2025 LinkVids. All rights reserved.</small>
            </footer>
        </Container>
    );
}