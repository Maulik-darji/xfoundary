import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Login.css';

const getErrorMessage = (error) => {
  if (!error || !error.code) return 'An unexpected error occurred. Please try again.';
  
  if (error.code.includes('email-already-in-use')) return 'An account already exists with this email.';
  if (error.code.includes('invalid-email')) return 'Please enter a valid email address.';
  if (error.code.includes('weak-password')) return 'Your password is too weak. Please use at least 6 characters.';
  if (error.code.includes('api-key-not-valid')) return 'System configuration error: The Firebase API key is invalid. Please check your firebase.js config.';
  
  return 'An unexpected error occurred. Please try again.';
};

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    // Username validation
    if (username.length > 20) {
      setError('Username must be 20 characters or less.');
      return;
    }
    if (/\s/.test(username)) {
      setError('Username cannot contain spaces.');
      return;
    }

    try {
      // 1. Check if username is already taken
      const usernameRef = doc(db, 'usernames', username.toLowerCase());
      const usernameDoc = await getDoc(usernameRef);
      
      if (usernameDoc.exists()) {
        setError('This username is already taken. Please choose another one.');
        return;
      }

      // 2. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: username });
      
      // 3. Save the mapping to Firestore
      await setDoc(usernameRef, {
        email: email,
        uid: userCredential.user.uid,
        username: username,
        createdAt: new Date()
      });

      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '520px' }}>
        <Link to="/" className="login-logo">XF</Link>
        <h1>Sign up</h1>
        
        {error && (
          <div className="error-message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSignUp}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>First Name</label>
              <input type="text" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Last Name</label>
              <input type="text" />
            </div>
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label>Your LinkedIn Profile URL <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.85em' }}>(Optional)</span></label>
            <input type="text" placeholder="https://www.linkedin.com/in/username/" />
          </div>
          
          <button type="submit" className="btn-login-submit" style={{ marginTop: '1rem' }}>Sign Up</button>
        </form>
        
        <div className="login-footer" style={{ marginTop: '2rem' }}>
          <p>Already have an account? <Link to="/login">Log in.</Link></p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
