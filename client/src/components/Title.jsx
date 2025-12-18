// client/src/components/Title.jsx

import React from 'react';

/**
 * Simple component for rendering main page titles.
 */
export default function Title({ title }) {
    return (
        <h2 style={{ 
            marginBottom: '30px', 
            paddingBottom: '10px',
            borderBottom: '2px solid #007bff', // Simple visual separator
            color: '#333' 
        }}>
            {title}
        </h2>
    );
}