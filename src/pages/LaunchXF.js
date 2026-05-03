import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const LaunchXF = () => {
    useEffect(() => {
        document.title = "Launch XF | X Foundary";
    }, []);

    return (
        <div style={{ backgroundColor: '#f5f5ee', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <h1 className="responsive-h1" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Coming Soon</h1>
            <p className="responsive-p" style={{ textAlign: 'center', maxWidth: '600px', marginBottom: '3rem' }}>
                We are working hard to bring you Launch XF. Stay tuned for updates!
            </p>
            <Link to="/" style={{
                backgroundColor: '#111',
                color: '#fff',
                padding: '14px 32px',
                borderRadius: '100px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'opacity 0.2s'
            }} onMouseEnter={(e) => e.target.style.opacity = '0.8'}
               onMouseLeave={(e) => e.target.style.opacity = '1'}>
                Back to Home
            </Link>
        </div>
    );
};

export default LaunchXF;
