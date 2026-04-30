import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Reminders = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Application Deadline Reminders";
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && !loading) {
        navigate('/login');
      }
      setUser(currentUser);
      
      if (currentUser) {
        try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSubscribed(docSnap.data().subscribedToReminders || false);
            }
        } catch (error) {
            console.error("Error fetching reminder status:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, loading]);

  const toggleSubscription = async () => {
    if (!user) return;
    setUpdating(true);
    try {
        const newStatus = !subscribed;
        await setDoc(doc(db, 'users', user.uid), {
            subscribedToReminders: newStatus
        }, { merge: true });
        setSubscribed(newStatus);
    } catch (error) {
        console.error("Error updating subscription:", error);
        alert("Error updating subscription. Please try again.");
    } finally {
        setUpdating(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '80vh', fontFamily: 'Inter, sans-serif', color: '#111' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '10rem 2rem' }}>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '2.5rem' }}>Application Deadline Reminders</h1>
        
        <p style={{ fontSize: '1.1rem', marginBottom: '2.5rem', color: '#333' }}>
            {subscribed ? 'You are subscribed to deadline notifications.' : 'You are not yet subscribed to deadline notifications.'}
        </p>

        <button 
            onClick={toggleSubscription}
            disabled={updating}
            style={{ 
                backgroundColor: subscribed ? '#ff6026' : '#6300dd', 
                color: 'white', 
                border: 'none', 
                padding: '14px 28px', 
                borderRadius: '8px', 
                fontSize: '16px', 
                fontWeight: 'bold', 
                cursor: updating ? 'not-allowed' : 'pointer',
                opacity: updating ? 0.7 : 1,
                marginBottom: '3rem',
                transition: 'all 0.2s'
            }}
        >
            {updating ? 'Updating...' : (subscribed ? 'Turn off notification' : 'Turn on notification')}
        </button>

        <div style={{ color: '#444', lineHeight: '1.6', fontSize: '15px' }}>
            <p>You are signed in with the email <br/><strong>{user?.email}</strong>.</p>
            <p>If you would like to update your email, please visit the <Link to="/settings" style={{ color: '#000', textDecoration: 'underline' }}>account page</Link>.</p>
        </div>
      </div>
    </div>
  );
};

export default Reminders;
