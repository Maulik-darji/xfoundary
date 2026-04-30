import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const LaunchXF = () => {
    useEffect(() => {
        document.title = "Launch XF | X Foundary";
    }, []);

    return (
        <div style={{ 
            minHeight: '80vh', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: '#f5f5ee', 
            fontFamily: '"Inter", sans-serif',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <h1 style={{ 
                fontFamily: '"Georgia", serif', 
                fontStyle: 'italic', 
                fontSize: '4.5rem', 
                fontWeight: 400, 
                color: '#1a1a1a', 
                marginBottom: '1rem',
                letterSpacing: '-0.02em'
            }}>
                Coming Soon
            </h1>
            <p style={{ 
                fontSize: '1.25rem', 
                color: '#555', 
                maxWidth: '600px', 
                marginBottom: '2rem',
                lineHeight: 1.6 
            }}>
                We are working hard to bring you Launch XF. Stay tuned for updates!
            </p>
            <Link to="/" style={{
                backgroundColor: '#1a1a1a',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'background-color 0.2s'
            }} onMouseEnter={(e) => e.target.style.backgroundColor = '#333'}
               onMouseLeave={(e) => e.target.style.backgroundColor = '#1a1a1a'}>
                Back to Home
            </Link>
        </div>
    );
};

export default LaunchXF;
