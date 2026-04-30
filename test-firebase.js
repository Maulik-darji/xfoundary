const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyC4GH9LfkNWX1ElmHLPhOhtNLDZ9ZziWc",
  authDomain: "xfoundaryapp.firebaseapp.com",
  projectId: "xfoundaryapp",
  storageBucket: "xfoundaryapp.firebasestorage.app",
  messagingSenderId: "321695640646",
  appId: "1:321695640646:web:3ff25d2e143bb1b364ee47",
  measurementId: "G-FTR0QRCZ5D"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

signInWithEmailAndPassword(auth, 'test@test.com', 'password123')
  .then(() => console.log('Login succeeded (unexpected)'))
  .catch((err) => console.log('Error caught:', err.code, err.message));
