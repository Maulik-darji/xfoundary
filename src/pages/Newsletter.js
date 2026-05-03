import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { Link } from 'react-router-dom';

const Newsletter = () => {
    const [user] = useAuthState(auth);

    return (
        <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <h1 className="responsive-h1" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Subscribe to XF's Newsletter</h1>
            <p className="responsive-p" style={{ textAlign: 'center', maxWidth: '600px', marginBottom: '3rem' }}>
                Keep up with the latest news, launches, jobs, and events from the XF community.
            </p>

            <button style={{ 
                backgroundColor: '#111', 
                color: '#fff', 
                padding: '16px 48px', 
                borderRadius: '100px', 
                fontSize: '1.5rem', 
                fontStyle: 'italic', 
                border: 'none', 
                cursor: 'pointer',
                marginBottom: '2rem',
                transition: 'opacity 0.2s',
                fontFamily: 'Newsreader, serif'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
                Subscribe!
            </button>

            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#666', marginBottom: '2rem' }}>
                Your email address: <span style={{ fontWeight: '500' }}>{user?.email || 'guest@example.com'}</span> 
                <span style={{ color: '#6300dd', marginLeft: '6px', cursor: 'pointer', textDecoration: 'underline' }}>(edit)</span>
            </div>

            <Link to="/blog" style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontSize: '15px', 
                color: '#333', 
                textDecoration: 'underline' 
            }}>
                View Newsletter Archive
            </Link>
        </div>
    );
};

export default Newsletter;
