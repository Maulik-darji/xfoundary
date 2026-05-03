import React from 'react';
import { Link } from 'react-router-dom';

const VerifyFounders = () => {
    return (
        <div style={{ 
            minHeight: '100vh', 
            backgroundColor: '#f5f5ee', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontFamily: '"Inter", sans-serif',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <div style={{ 
                backgroundColor: '#6300dd', 
                width: '80px', 
                height: '80px', 
                borderRadius: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#fff',
                fontSize: '32px',
                fontWeight: '900',
                marginBottom: '2rem',
                boxShadow: '0 10px 30px rgba(99, 0, 221, 0.2)'
            }}>
                X
            </div>

            <h1 style={{ 
                fontSize: '3.5rem', 
                fontWeight: '900', 
                color: '#111', 
                marginBottom: '1rem',
                letterSpacing: '-2px'
            }}>
                Coming Soon
            </h1>
            
            <p style={{ 
                fontSize: '18px', 
                color: '#666', 
                maxWidth: '500px', 
                lineHeight: '1.6',
                marginBottom: '3rem'
            }}>
                We're building a robust verification system to ensure the integrity and authenticity of all founders on the X Foundary platform.
            </p>

            <Link to="/" style={{ 
                backgroundColor: '#111', 
                color: '#fff', 
                padding: '14px 32px', 
                borderRadius: '8px', 
                fontSize: '16px', 
                fontWeight: '700', 
                textDecoration: 'none',
                transition: 'transform 0.2s'
            }}>
                Back to Home
            </Link>
        </div>
    );
};

export default VerifyFounders;
