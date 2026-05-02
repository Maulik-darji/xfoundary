import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithCustomToken
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase';
import './Login.css';

const getErrorMessage = (error) => {
  const code = error.code || error.message;
  if (code.includes('invalid-credential') || code.includes('wrong-password')) return "Incorrect username or password. Please try again.";
  if (code.includes('user-not-found')) return "We couldn't find an account with that email.";
  if (code.includes('invalid-email')) return "Please enter a valid email address.";
  if (code.includes('too-many-requests')) return "Too many failed attempts. Please try again later.";
  if (code.includes('permission-denied')) return "Permission denied. Please check your database rules.";
  if (code.includes('not-found')) return "Account does not exist. Please create an account first.";
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
  const [userOtp, setUserOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);
  const [modalMessage, setModalMessage] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const context = queryParams.get('context');

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
    if (isSendingLink || resendTimer > 0) return;
    
    setError('');
    setIsSendingLink(true);
    const emailToUse = loginLinkEmail.trim();
    
    try {
      // 1. Call the backend to generate OTP, save it, and send the COMBINED email
      const sendOtpFn = httpsCallable(functions, 'requestLoginCode');
      await sendOtpFn({ email: emailToUse });
      
      window.localStorage.setItem('emailForSignIn', emailToUse);
      setLoginLinkSent(true);
      setResendTimer(60); // Start 60s cooldown
      
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (userOtp.length !== 6) return;
    
    setError('');
    setIsVerifyingOtp(true);

    try {
      // If state is lost on refresh, try to get email from localStorage
      const emailToUse = (loginLinkEmail || window.localStorage.getItem('emailForSignIn') || '').trim();
      
      if (!emailToUse) {
        throw new Error("Email session expired. Please request a new link.");
      }

      const verifyOtpFn = httpsCallable(functions, 'verifyLoginCode');
      const result = await verifyOtpFn({ email: emailToUse, otp: userOtp });
      
      const { token } = result.data;
      if (token) {
        await signInWithCustomToken(auth, token);
        window.localStorage.removeItem('emailForSignIn');
        navigate('/home');
      } else {
        throw new Error("Invalid response from server.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsVerifyingOtp(false);
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
            navigate('/home');
          })
          .catch((err) => {
            setError("Failed to sign in with link: " + err.message);
            setIsPageLoading(false);
          });
        return; // Don't stop loading, we are redirecting
      }
    }

    setIsPageLoading(false);
  }, [navigate, auth]);

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

      setIsLoggingIn(true);
      await signInWithEmailAndPassword(auth, loginEmail, password);
      navigate('/home');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isPageLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        backgroundColor: '#f9f9f9',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid #eee', 
          borderTop: '3px solid #6300dd', 
          borderRadius: '50%', 
          animation: 'spin 0.8s linear infinite' 
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }



  return (
    <div className="login-page">
      {view === 'login' ? (
        <div className="login-card">
          <Link to="/" className="login-logo">X</Link>
          <h1>{context === 'apply' ? 'Log in to access the X Application' : 'Log in'}</h1>
          
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
            
            <button 
              type="submit" 
              className="btn-login-submit" 
              disabled={isLoggingIn}
              style={{
                opacity: isLoggingIn ? 0.7 : 1,
                cursor: isLoggingIn ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoggingIn ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          
          <div className="login-footer">
            <p>Don't have an account? <Link to={`/signup${context === 'apply' ? '?context=apply' : ''}`}>Create an account.</Link></p>
            <p>Trouble signing in? <a href="#" onClick={(e) => { e.preventDefault(); setView('email-login'); }}>Get a login link emailed to you.</a></p>
          </div>
        </div>
      ) : (
        <div className="login-card" style={{ textAlign: 'center', padding: '2.5rem 2.25rem', maxWidth: '400px', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#6300dd', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', borderRadius: '4px', color: 'white', fontWeight: '800', fontSize: '1rem' }}>
            X
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '700', marginBottom: '2rem', color: '#111', fontFamily: "'Inter', sans-serif" }}>Log in with email</h1>
          
          {!loginLinkSent ? (
            <>
              <p className="login-with-email-desc" style={{ color: '#888', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'center' }}>
                Please provide your email address:
              </p>
              
              {error && <div className="error-message" style={{ marginBottom: '1.5rem' }}>{error}</div>}

              <form className="login-form" onSubmit={handleSendLoginLink} style={{ textAlign: 'left' }}>
                <div className="form-group" style={{ marginBottom: '2.5rem' }}>
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
                      padding: '0.75rem 0',
                      fontSize: '1rem',
                      width: '100%',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderBottomColor = '#6300dd'}
                    onBlur={(e) => e.target.style.borderBottomColor = '#ddd'}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-login-submit" 
                  disabled={isSendingLink}
                  style={{ 
                    width: 'auto', 
                    padding: '0.8rem 1.8rem', 
                    borderRadius: '4px', 
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    backgroundColor: isSendingLink ? '#ccc' : '#6300dd',
                    cursor: isSendingLink ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSendingLink ? "Sending..." : "Send login link"}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                backgroundColor: '#eafaf1', 
                border: '1px solid #27ae60', 
                color: '#27ae60', 
                padding: '1rem', 
                borderRadius: '8px', 
                fontSize: '0.9rem',
                textAlign: 'center',
                marginBottom: '2rem',
                fontWeight: '500'
              }}>
                Check your email for the magic link or code.
              </div>
              
              <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                Enter the code from your email:
              </p>
              <div className="form-group" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <input 
                  type="text" 
                  value={userOtp}
                  onChange={(e) => setUserOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="0 0 0 0 0 0" 
                  style={{ 
                    textAlign: 'center', 
                    letterSpacing: '12px', 
                    fontSize: '1.4rem', 
                    color: '#111', 
                    border: 'none', 
                    borderBottom: '1px solid #ddd', 
                    borderRadius: 0, 
                    width: '100%', 
                    outline: 'none',
                    paddingBottom: '0.5rem'
                  }}
                  onFocus={(e) => e.target.style.borderBottomColor = '#6300dd'}
                  onBlur={(e) => e.target.style.borderBottomColor = '#ddd'}
                />
              </div>
              <button 
                type="button" 
                onClick={handleVerifyOtp}
                className="btn-login-submit" 
                style={{ 
                  width: '100%', 
                  backgroundColor: userOtp.length === 6 ? '#6300dd' : '#b199e6', 
                  borderRadius: '6px',
                  padding: '1rem',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: userOtp.length === 6 ? 'pointer' : 'default',
                  opacity: isVerifyingOtp ? 0.7 : 1,
                  transition: 'all 0.2s',
                  marginBottom: '1.5rem'
                }}
                disabled={userOtp.length !== 6 || isVerifyingOtp}
              >
                {isVerifyingOtp ? "Verifying..." : "Verify Code"}
              </button>

              <div style={{ textAlign: 'center' }}>
                {resendTimer > 0 ? (
                  <p style={{ color: '#888', fontSize: '0.85rem' }}>
                    Resend code in <span style={{ fontWeight: '700' }}>{resendTimer}s</span>
                  </p>
                ) : (
                  <button 
                    onClick={handleSendLoginLink}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#6300dd', 
                      fontWeight: '600', 
                      fontSize: '0.85rem', 
                      cursor: 'pointer',
                      padding: '5px'
                    }}
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}
          
          <p className="switch-login-type" style={{ marginTop: '3rem', textAlign: 'center', fontSize: '0.9rem', color: '#555' }}>
            <span style={{ fontWeight: '700', color: '#6300dd', cursor: 'pointer' }} onClick={() => { setView('login'); setLoginLinkSent(false); setError(''); }}>Sign in</span> with username and password instead.
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
