import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { Link } from 'react-router-dom';

const Newsletter = () => {
    const [user] = useAuthState(auth);

    return (
        <div style={{ 
            minHeight: '100vh', 
            backgroundColor: '#f6f6ef', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontFamily: '"Georgia", serif',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <h1 style={{ 
                fontSize: '48px', 
                fontWeight: '400', 
                fontStyle: 'italic', 
                color: '#111', 
                marginBottom: '1.5rem',
                letterSpacing: '-1px'
            }}>
                Subscribe to XF's Newsletter
            </h1>
            
            <p style={{ 
                fontFamily: '"Inter", sans-serif', 
                fontSize: '16px', 
                color: '#333', 
                maxWidth: '600px', 
                marginBottom: '3rem',
                lineHeight: '1.6'
            }}>
                Keep up with the latest news, launches, jobs, and events from the XF community.
            </p>

            <button style={{ 
                backgroundColor: '#000', 
                color: '#fff', 
                padding: '20px 60px', 
                borderRadius: '50px', 
                fontSize: '24px', 
                fontStyle: 'italic', 
                border: 'none', 
                cursor: 'pointer',
                marginBottom: '2rem',
                transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                Subscribe!
            </button>

            <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '14px', color: '#666', marginBottom: '2rem' }}>
                Your email address: <span style={{ fontWeight: '500' }}>{user?.email || 'guest@example.com'}</span> 
                <span style={{ color: '#0073b1', marginLeft: '6px', cursor: 'pointer', textDecoration: 'underline' }}>(edit)</span>
            </div>

            <a href="#" style={{ 
                fontFamily: '"Inter", sans-serif', 
                fontSize: '15px', 
                color: '#333', 
                textDecoration: 'underline' 
            }}>
                View Newsletter Archive
            </a>
        </div>
    );
};

export default Newsletter;
