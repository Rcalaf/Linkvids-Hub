// client/src/components/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container } from 'reactstrap';
import AdminNav from './Navigation/AdminNav'; // Import the dedicated navigation component

export default function Layout() {
    // Determine if the current path is within the /admin area
    const isAdminPath = window.location.pathname.startsWith('/admin');

    console.log('test')
    
    // In a real application, you would check authentication here and redirect unauthenticated users
    // if (isAdminPath && !isAuthenticated) return <Navigate to="/login" replace />;

    return (
        <Container fluid className="p-4">
            <header style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
                <h1 style={{ color: '#007bff' }}>LinkVids Management HUB</h1>
            </header>
            
            {/* Conditional Admin Navigation */}
            {isAdminPath && <AdminNav />}

            {/* Renders the specific child route component */}
            <main style={{ minHeight: '80vh' }}>
                <Outlet />
            </main>
            
            <footer style={{ marginTop: '50px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                <p className="text-muted text-center">© 2025 LinkVids Management. Admin Tools.</p>
            </footer>
        </Container>
    );
}