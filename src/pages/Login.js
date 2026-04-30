import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Login.css';

const getErrorMessage = (error) => {
  const code = error.code || error.message;
  if (code.includes('user-not-found')) return "We couldn't find an account with that email.";
  if (code.includes('wrong-password')) return "Incorrect password. Please try again.";
  if (code.includes('invalid-email')) return "Please enter a valid email address.";
  if (code.includes('too-many-requests')) return "Too many failed attempts. Please try again later.";
  return "Something went wrong. Please check your credentials.";
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('login'); // 'login' or 'email-login'
  const [showForgotUsername, setShowForgotUsername] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [loginLinkSent, setLoginLinkSent] = useState(false);
  const [loginLinkEmail, setLoginLinkEmail] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '' });
  const navigate = useNavigate();

  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 4000);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setModalMessage('');
    try {
      let resetEmail = forgotEmail;

      // If the user entered a username instead of an email, look it up in Firestore
      if (!forgotEmail.includes('@')) {
        const usernameRef = doc(db, 'usernames', forgotEmail.toLowerCase());
        const usernameDoc = await getDoc(usernameRef);
        
        if (usernameDoc.exists()) {
          resetEmail = usernameDoc.data().email;
        } else {
          setModalMessage('Account does not exist. Please check your username or create an account.');
          return;
        }
      } else {
        // If they entered an email, verify it exists in our database first
        const q = query(collection(db, 'usernames'), where('email', '==', forgotEmail));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setModalMessage('Account does not exist. Please check your email or create an account.');
          return;
        }
      }

      await sendPasswordResetEmail(auth, resetEmail);
      setShowForgotPassword(false);
      showToast(`Password reset emailed to the email associated with this account.`);
      setForgotEmail('');
    } catch (err) {
      setModalMessage("Error: " + err.message);
    }
  };

  const handleForgotUsername = async (e) => {
    e.preventDefault();
    setModalMessage('');
    try {
      // 1. Find the username(s) associated with this email
      const q = query(collection(db, 'usernames'), where('email', '==', forgotEmail));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setModalMessage("Account does not exist. Please check your email or create an account.");
        return;
      }

      const usernames = querySnapshot.docs.map(doc => doc.data().username).join(', ');

      // 2. Trigger the email by writing to the 'mail' collection 
      // (This requires the "Trigger Email" extension to be installed in Firebase Console)
      await addDoc(collection(db, 'mail'), {
        to: forgotEmail,
        message: {
          subject: 'X Foundary Username Reminder',
          html: `
            <p>Hello,</p>
            <p>You recently requested that we send you a reminder for your X Foundary username. The username(s) we have on file for this email address are:</p>
            <ul>
              <li><strong>${usernames}</strong></li>
            </ul>
            <p>Note: If you received this email in error, you may safely disregard it.</p>
          `
        }
      });

      setShowForgotUsername(false);
      showToast(`Username emailed to ${forgotEmail}.`);
      setForgotEmail('');
    } catch (err) {
      setModalMessage("Error: " + err.message);
    }
  };
  
  const handleSendLoginLink = async (e) => {
    e.preventDefault();
    setError('');
    const emailToUse = loginLinkEmail;
    
    try {
      // 1. Check if account exists
      const q = query(collection(db, 'usernames'), where('email', '==', emailToUse));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError("Account does not exist. Please create an account first.");
        return;
      }

      // 2. Send the actual sign-in link
      const actionCodeSettings = {
        url: window.location.origin + '/login', // Redirect back here
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, emailToUse, actionCodeSettings);
      
      // Save email locally for verification later
      window.localStorage.setItem('emailForSignIn', emailToUse);
      setLoginLinkSent(true);
      
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Check if we are returning from an email link or password reset link
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    
    // 1. Handle Password Reset redirect
    if (mode === 'resetPassword') {
      navigate(`/reset-password${window.location.search}`);
      return;
    }

    // 2. Handle Email Link Sign-in
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('Please provide your email for confirmation');
      }
      
      if (emailForSignIn) {
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            navigate('/');
          })
          .catch((err) => {
            setError("Failed to sign in with link: " + err.message);
          });
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      let loginEmail = email;

      if (!email.includes('@')) {
        const usernameRef = doc(db, 'usernames', email.toLowerCase());
        const usernameDoc = await getDoc(usernameRef);
        
        if (usernameDoc.exists()) {
          loginEmail = usernameDoc.data().email;
        } else {
          setError('Username not found. Please try again or use your email.');
          return;
        }
      }

      await signInWithEmailAndPassword(auth, loginEmail, password);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="login-page">
      {view === 'login' ? (
        <div className="login-card">
          <Link to="/" className="login-logo">XF</Link>
          <h1>Log in</h1>
          
          {error && (
            <div className="error-message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username or email</label>
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username or email"
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
                  placeholder="Password"
                  required 
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>
            
            <div className="forgot-links">
              Forgot your <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotUsername(true); }}>username</a> or <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotPassword(true); }}>password</a>?
            </div>
            
            <button type="submit" className="btn-login-submit">Log In</button>
          </form>
          
          <div className="login-footer">
            <p>Don't have an account? <Link to="/signup">Create an account.</Link></p>
            <p>Trouble signing in? <a href="#" onClick={(e) => { e.preventDefault(); setView('email-login'); }}>Get a login link emailed to you.</a></p>
          </div>
        </div>
      ) : (
        <div className="login-card" style={{ textAlign: 'center', padding: '3.5rem 2.5rem' }}>
          <div style={{ backgroundColor: '#6300dd', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', borderRadius: '2px', color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
            XF
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '2.5rem', color: '#111' }}>Log in with email</h1>
          
          {!loginLinkSent ? (
            <>
              <p className="login-with-email-desc" style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                Please provide your email address:
              </p>
              
              {error && <div className="error-message" style={{ marginBottom: '1.5rem' }}>{error}</div>}

              <form className="login-form" onSubmit={handleSendLoginLink} style={{ textAlign: 'left' }}>
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <input 
                    type="email" 
                    value={loginLinkEmail}
                    onChange={(e) => setLoginLinkEmail(e.target.value)}
                    placeholder="me@example.com"
                    required 
                    style={{ 
                      border: 'none', 
                      borderBottom: '1px solid #ddd', 
                      borderRadius: '0', 
                      padding: '0.5rem 0',
                      fontSize: '1rem',
                      width: '100%',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderBottomColor = '#6300dd'}
                    onBlur={(e) => e.target.style.borderBottomColor = '#ddd'}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-login-submit" 
                  style={{ 
                    width: 'auto', 
                    padding: '0.75rem 1.75rem', 
                    borderRadius: '4px', 
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    backgroundColor: '#6300dd'
                  }}
                >
                  Send login link
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'left' }}>
              <div style={{ 
                backgroundColor: '#e6faf1', 
                border: '1px solid #00c853', 
                color: '#00c853', 
                padding: '0.85rem', 
                borderRadius: '6px', 
                fontSize: '0.9rem',
                textAlign: 'center',
                marginBottom: '1.5rem'
              }}>
                If an account exists, we've sent a link.
              </div>
              
              <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                Or enter the code from your email:
              </p>
              <div className="form-group" style={{ textAlign: 'center' }}>
                <input 
                  type="text" 
                  placeholder="000000" 
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem', color: '#ccc', border: 'none', borderBottom: '1px solid #ddd', borderRadius: 0, width: '100%', outline: 'none' }}
                  disabled
                />
              </div>
              <button type="button" className="btn-login-submit" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#6300dd', marginTop: '1rem' }}>
                Verify Code
              </button>
            </div>
          )}
          
          <p className="switch-login-type" style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#555' }}>
            <a href="#" style={{ color: '#6300dd', textDecoration: 'none', fontWeight: '700' }} onClick={(e) => { e.preventDefault(); setView('login'); setLoginLinkSent(false); setError(''); }}>Sign in</a> with username and password instead.
          </p>
        </div>
      )}

      {/* Forgot Username Modal */}
      {showForgotUsername && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Forgot username?</h2>
            <p className="modal-desc">Enter your email, and we'll send your username via email.</p>
            <form onSubmit={handleForgotUsername}>
              <div className="modal-form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={forgotEmail} 
                  onChange={(e) => setForgotEmail(e.target.value)} 
                  required 
                />
              </div>
              <p className="modal-tip">Tip: If you have a Hacker News account, you can use your credentials to log in.</p>
              {modalMessage && <p className="modal-message">{modalMessage}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowForgotUsername(false); setModalMessage(''); }}>Cancel</button>
                <button type="submit" className="btn-modal-submit">Email</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Forgot password?</h2>
            <p className="modal-desc">Enter your username or email, and we'll send you a password reset link.</p>
            <form onSubmit={handleForgotPassword}>
              <div className="modal-form-group">
                <label>Username or email address</label>
                <input 
                  type="text" 
                  value={forgotEmail} 
                  onChange={(e) => setForgotEmail(e.target.value)} 
                  required 
                />
              </div>
              {modalMessage && <p className="modal-message">{modalMessage}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowForgotPassword(false); setModalMessage(''); }}>Cancel</button>
                <button type="submit" className="btn-modal-submit btn-send-link">Send Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className="toast-container">
          <div className="toast-message">
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
