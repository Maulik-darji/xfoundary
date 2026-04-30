import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Login.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    const verifyCode = async () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');

      // Fail-safe: if this is actually a sign-in link, go to login page
      if (mode === 'signIn') {
        navigate(`/login${window.location.search}`);
        return;
      }

      if (!oobCode) {
        setError("Invalid or expired password reset link.");
        setLoading(false);
        return;
      }

      try {
        const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(verifiedEmail);
        setLoading(false);
      } catch (err) {
        setError("Invalid or expired password reset link.");
        setLoading(false);
      }
    };

    verifyCode();
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setMessage("Password has been reset successfully! Redirecting to login...");
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError("Failed to reset password. Please try again.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f2ee', fontFamily: 'Inter, Verdana, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Brand Top Bar */}
      <div style={{ backgroundColor: '#6300dd', padding: '15px 20px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <b style={{ color: 'white', fontSize: '15px', lineHeight: '20px', letterSpacing: '0.5px' }}>X Foundary</b>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '35px 40px', width: '100%', maxWidth: '420px', border: '1px solid #eaeaea', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '20px', color: '#111', margin: '0 0 20px 0' }}>
            Reset your password
          </h2>
          
          {!error && !message && (
            <p style={{ color: '#555', marginBottom: '25px', fontSize: '14px' }}>
              for <strong style={{ color: '#111' }}>{email}</strong>
            </p>
          )}
          
          {error && <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '12px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px', borderRadius: '4px' }}>{error}</div>}
          {message && <div style={{ backgroundColor: '#eaf4ee', border: '1px solid #3c763d', padding: '12px', color: '#3c763d', fontSize: '13px', marginBottom: '20px', borderRadius: '4px' }}>{message}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#555', marginBottom: '8px', fontWeight: '500' }}>New password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    fontSize: '14px', 
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6300dd'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
                    background: 'none', border: 'none', cursor: 'pointer', color: showPassword ? '#6300dd' : '#999',
                    display: 'flex', alignItems: 'center', transition: 'color 0.2s'
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
              <button 
                type="submit" 
                style={{ 
                  backgroundColor: '#6300dd', 
                  color: 'white', 
                  border: 'none', 
                  padding: '10px 20px', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#4a00a8'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6300dd'}
              >
                Change Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
