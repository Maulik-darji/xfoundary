import React from 'react';
import { Link } from 'react-router-dom';

const Library = () => {
  return (
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f5f5ee',
      padding: '2rem'
    }}>
      <div style={{ 
        textAlign: 'center', 
        maxWidth: '600px',
        animation: 'fadeIn 0.8s ease-out'
      }}>
        <div style={{ 
          display: 'inline-block',
          backgroundColor: 'rgba(255, 102, 0, 0.1)',
          color: '#ff6600',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '700',
          marginBottom: '2rem',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Knowledge Base
        </div>
        
        <h1 style={{ 
          fontSize: '4rem', 
          fontWeight: '900', 
          color: '#111', 
          margin: '0 0 1.5rem 0',
          lineHeight: '1.1',
          letterSpacing: '-2px'
        }}>
          Startup Library
        </h1>
        
        <p style={{ 
          fontSize: '1.25rem', 
          color: '#666', 
          lineHeight: '1.6',
          marginBottom: '3rem'
        }}>
          We're curating the world's best resources for founders. 
          A massive collection of essays, videos, and guides is coming soon.
        </p>

        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#999',
            fontSize: '15px'
          }}>
            <div style={{ width: '8px', height: '8px', backgroundColor: '#ff6600', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            Currently indexing 5,000+ resources
          </div>

          <Link to="/" style={{ 
            backgroundColor: '#111', 
            color: '#fff', 
            padding: '16px 32px', 
            borderRadius: '8px', 
            textDecoration: 'none', 
            fontWeight: '700',
            fontSize: '16px',
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Back to Home
          </Link>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default Library;
