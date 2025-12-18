// client/src/pages/Admin/ConfigManager.jsx
import React from 'react';
import { Container, Button } from 'reactstrap';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Title from '../../components/Title'; 
import ConfigHubCards from '../../components/Admin/ConfigHubCards'; // Import the Hub Cards component

export default function ConfigManager() {
    const location = useLocation();
    
    // Check if we are exactly on the HUB path (/admin/config)
    const isBaseHubPath = location.pathname === '/admin/config';
    
    return (
        <Container fluid>
            <Title title="Configuration Management Hubb" />
            
            {isBaseHubPath ? (
                // 1. If path is exactly /admin/config, show the cards (The Hub)
                <>
                    <p className="lead text-muted">
                        Choose a management area to define your data structure.
                    </p>
                    <ConfigHubCards />
                </>
            ) : (
                <>
                    {/* 2. If path is nested (e.g., /admin/config/attributes), show the back button and the content */}
                    <div className="mb-4">
                         <Button tag={Link} to="/admin/config" color="secondary">
                            ← Back to Configuration Hub
                        </Button>
                    </div>
                    
                    {/* The Outlet renders ManageAttributes or ManageUserTypes. 
                      Note: These children components should manage their own internal Widget/styling.
                    */}
                    <Outlet /> 
                </>
            )}
        </Container>
    );
}