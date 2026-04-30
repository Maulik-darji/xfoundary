import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC4GH9LfkNWXI1ElmHLPhOhtNLDZ9ZziWc",
  authDomain: "xfoundaryapp.firebaseapp.com",
  projectId: "xfoundaryapp",
  storageBucket: "xfoundaryapp.firebasestorage.app",
  messagingSenderId: "321695640646",
  appId: "1:321695640646:web:3ff25d2e143bb1b364ee47",
  measurementId: "G-FTR0QRCZ5D"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

const adminApp = initializeApp(firebaseConfig, 'adminApp');
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
