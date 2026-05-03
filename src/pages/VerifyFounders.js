import React from 'react';
import { Link } from 'react-router-dom';

const VerifyFounders = () => {
    return (
        <div style={{ backgroundColor: '#f5f5ee', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ 
                backgroundColor: '#6300dd', 
                width: '70px', 
                height: '70px', 
                borderRadius: '0px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#fff',
                fontSize: '28px',
                fontWeight: '900',
                marginBottom: '2rem',
                transform: 'scale(1.1, 1.15)'
            }}>
                X
            </div>

            <h1 className="responsive-h1" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Coming Soon</h1>
            
            <p className="responsive-p" style={{ textAlign: 'center', maxWidth: '500px', marginBottom: '3rem' }}>
                We're building a robust verification system to ensure the integrity and authenticity of all founders on the X Foundary platform.
            </p>

            <Link to="/" style={{ 
                backgroundColor: '#111', 
                color: '#fff', 
                padding: '14px 40px', 
                borderRadius: '100px', 
                fontSize: '16px', 
                fontWeight: '700', 
                textDecoration: 'none'
            }}>
                Back to Home
            </Link>
        </div>
    );
};

export default VerifyFounders;
