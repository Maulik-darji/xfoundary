import React from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

const Login = () => {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">XF</div>
        <h1>Log in</h1>
        
        <form className="login-form">
          <div className="form-group">
            <label>Username or email</label>
            <input type="text" />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input type="password" />
          </div>
          
          <div className="forgot-links">
            Forgot your <a href="#">username</a> or <a href="#">password</a>?
          </div>
          
          <button type="submit" className="btn-login-submit">Log In</button>
        </form>
        
        <div className="login-footer">
          <p>Don't have an account? <Link to="/signup">Create an account.</Link></p>
          <p>Trouble signing in? <a href="#">Get a login link emailed to you.</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
