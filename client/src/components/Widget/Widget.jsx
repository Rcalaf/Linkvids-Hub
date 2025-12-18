// client/src/components/Widget/Widget.jsx
import React from 'react';

const widgetStyle = {
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginBottom: '20px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
};

export default function Widget({ children, title, id }) {
    return (
        <div id="form-anchor" style={widgetStyle}>
            {title && 
                <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                    {title}
                </h4>
            }
            {children}
        </div>
    );
}