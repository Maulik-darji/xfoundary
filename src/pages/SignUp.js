import React from 'react';
import { Link } from 'react-router-dom';
import './Login.css'; // Reusing styles

const SignUp = () => {
  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '520px' }}>
        <div className="login-logo">XF</div>
        <h1>Sign up</h1>
        
        <form className="login-form">
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
            <input type="email" />
          </div>
          
          <div className="form-group">
            <label>Username</label>
            <input type="text" />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input type="password" />
          </div>
          
          <div className="form-group">
            <label>Your LinkedIn Profile URL</label>
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
