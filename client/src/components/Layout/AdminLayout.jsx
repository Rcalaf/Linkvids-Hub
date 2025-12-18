import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container } from 'reactstrap';
import AdminNav from '../Navigation/AdminNav'; 

export default function AdminLayout() {
    return (
        <Container fluid className="p-4">
            <header style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
                <h1 style={{ color: '#007bff' }}>LinkVids Management HUB</h1>
            </header>
            
            {/* Navigation is always shown in this layout */}
            <AdminNav />

            <main style={{ minHeight: '80vh' }}>
                <Outlet />
            </main>
            
            <footer style={{ marginTop: '50px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                <p className="text-muted text-center">© 2025 LinkVids Management. Admin Tools.</p>
            </footer>
        </Container>
    );
}