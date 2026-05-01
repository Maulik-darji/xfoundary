import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuth as auth, adminDb as db, adminStorage as storage } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, writeBatch, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Blog from './Blog';

const Admin = () => {
  const sidebarRef = React.useRef(null);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('xf_admin_active_tab') || 'Overview');
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [memberApps, setMemberApps] = useState([]);
  const [applicationLogs, setApplicationLogs] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalApps: 0, pending: 0, approved: 0, pendingBlogs: 0, pendingMembers: 0, withdrawnApps: 0, totalAdmins: 0, totalMembers: 0, adminsList: [] });
  const [loading, setLoading] = useState(true);
  
  const [user, setUser] = useState(null);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(sessionStorage.getItem('xf_admin_authorized') === 'true');
  const [authMode, setAuthMode] = useState('login'); 
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [pinInput, setPinInput] = useState('');
  const [profile, setProfile] = useState({ name: 'Admin', pin: '000000' });
  const [appFilter, setAppFilter] = useState('approved');
  const [founderLimit, setFounderLimit] = useState(30);
  const [coldEmailsText, setColdEmailsText] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [externalFounders, setExternalFounders] = useState([]);
  const [selectedExternalFounder, setSelectedExternalFounder] = useState(null);
  const [founderMessages, setFounderMessages] = useState([]);
  const [selectedFounderIds, setSelectedFounderIds] = useState([]);
  const [founderSearch, setFounderSearch] = useState('');
  const [individualMailSubject, setIndividualMailSubject] = useState('');
  const [individualMailText, setIndividualMailText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', onConfirm: null });
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState('all'); 
  const [sendingStatus, setSendingStatus] = useState(null); // { current, count, total }
  const [visibleExternalCount, setVisibleExternalCount] = useState(30);
  const [sidebarWidth, setSidebarWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const [gmailClientId, setGmailClientId] = useState('');
  const [gmailClientSecret, setGmailClientSecret] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (selectedExternalFounder) {
        localStorage.setItem('xf_admin_selected_founder_email', selectedExternalFounder.email);
    }
  }, [selectedExternalFounder]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('xf_admin_selected_founder_email');
    if (savedEmail && externalFounders.length > 0 && !selectedExternalFounder) {
        const found = externalFounders.find(f => f.email === savedEmail);
        if (found) {
            setSelectedExternalFounder(found);
            fetchFounderMessages(savedEmail);
        }
    }
  }, [externalFounders]);

  const toggleFounderSelection = (id) => {
      setSelectedFounderIds(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const toggleSelectAll = () => {
      const filteredIds = externalFounders
          .filter(f => f.email.toLowerCase().includes(founderSearch.toLowerCase()) || (f.name && f.name.toLowerCase().includes(founderSearch.toLowerCase())))
          .map(f => f.id);
          
      if (selectedFounderIds.length === filteredIds.length) {
          setSelectedFounderIds([]);
      } else {
          setSelectedFounderIds(filteredIds);
      }
  };

  const handleRemoveSelectedFounders = async () => {
      const action = async () => {
          try {
              const batch = writeBatch(db);
              selectedFounderIds.forEach(id => {
                  batch.delete(doc(db, 'externalFounders', id));
              });
              await batch.commit();
              setSelectedFounderIds([]);
              setSelectedExternalFounder(null);
              localStorage.removeItem('xf_admin_selected_founder_email');
              fetchData();
              setToastMessage(`Removed ${selectedFounderIds.length} founders from registry.`);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
          } catch (e) { alert(e.message); }
      };

      if (skipConfirm) {
          action();
      } else {
          setConfirmConfig({ 
              title: `Are you sure you want to remove the ${selectedFounderIds.length} selected founders?`, 
              onConfirm: action 
          });
          setShowConfirmModal(true);
      }
  };

  const commonDomainTypos = {
    'gamil.com': 'gmail.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
    'yaho.com': 'yahoo.com',
    'gnail.com': 'gmail.com'
  };

  const getEmailSuggestion = (text) => {
    const emails = text.split(/[,\n]/).map(e => e.trim());
    for (let email of emails) {
        if (!email.includes('@')) continue;
        const parts = email.split('@');
        const domain = parts[parts.length - 1];
        if (commonDomainTypos[domain.toLowerCase()]) {
            return { original: domain, suggestion: commonDomainTypos[domain.toLowerCase()], fullEmail: email };
        }
    }
    return null;
  };

  const applyEmailSuggestion = (suggestionObj) => {
    const corrected = coldEmailsText.replace(suggestionObj.original, suggestionObj.suggestion);
    setColdEmailsText(corrected);
  };

  const getFuzzySearchSuggestion = () => {
      if (!founderSearch || founderSearch.length < 2) return null;
      const q = founderSearch.toLowerCase();
      
      const currentResults = externalFounders.filter(f => 
          f.email.toLowerCase().includes(q) || 
          (f.name && f.name.toLowerCase().includes(q))
      );
      if (currentResults.length > 0) return null;

      const matches = externalFounders.map(f => {
          const email = f.email.toLowerCase();
          const name = (f.name || '').toLowerCase();
          let score = 0;
          for (let char of q) {
              if (email.includes(char)) score++;
              if (name.includes(char)) score++;
          }
          return { founder: f, score: score / (q.length * 1.5) };
      });
      matches.sort((a, b) => b.score - a.score);
      if (matches[0] && matches[0].score > 0.5) return matches[0].founder;
      return null;
  };

  const handleAddExternalFounders = async () => {
      const parsed = coldEmailsText.split(/[,\n]/).map(e => e.trim()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      if (parsed.length === 0) {
          alert("No valid emails found to add.");
          return;
      }
      
      try {
          const batch = writeBatch(db);
          parsed.forEach(email => {
              const docId = email.replace(/[.#$[\]]/g, '_');
              batch.set(doc(db, 'externalFounders', docId), { 
                  email, 
                  name: email.split('@')[0],
                  createdAt: new Date().toISOString() 
              });
          });
          await batch.commit();
          setColdEmailsText('');
          fetchData();
          setToastMessage(`Added ${parsed.length} external founders to the list.`);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
      } catch (e) { alert(e.message); }
  };

  const fetchFounderMessages = (email) => {
      try {
          const docId = email.replace(/[.#$[\]]/g, '_');
          return onSnapshot(collection(db, 'externalFounders', docId, 'messages'), (snap) => {
              const mList = [];
              snap.forEach(d => mList.push({ id: d.id, ...d.data() }));
              mList.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
              setFounderMessages(mList);
          });
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
      if (selectedExternalFounder) {
          const unsub = fetchFounderMessages(selectedExternalFounder.email);
          return () => unsub && unsub();
      }
  }, [selectedExternalFounder]);

  useEffect(() => {
      setVisibleExternalCount(30);
  }, [founderSearch, sidebarFilter]);

  const filteredFounders = React.useMemo(() => {
      const counts = {};
      externalFounders.forEach(f => {
          const email = f.email.toLowerCase();
          counts[email] = (counts[email] || 0) + 1;
      });

      return externalFounders.filter(f => {
          // 1. Search Filter
          const matchesSearch = f.email.toLowerCase().includes(founderSearch.toLowerCase()) || 
                              (f.name && f.name.toLowerCase().includes(founderSearch.toLowerCase()));
          if (!matchesSearch) return false;

          // 2. Sidebar Tab Filter
          if (sidebarFilter === 'all') return true;
          if (sidebarFilter === 'duplicates') return counts[f.email.toLowerCase()] > 1;
          if (sidebarFilter === 'gmail') return f.email.toLowerCase().includes('gmail.com') || f.email.toLowerCase().includes('googlemail.com');
          if (sidebarFilter === 'yahoo') return f.email.toLowerCase().includes('yahoo.') || f.email.toLowerCase().includes('ymail.com');
          if (sidebarFilter === 'other') {
              const email = f.email.toLowerCase();
              return !email.includes('gmail.com') && !email.includes('googlemail.com') && !email.includes('yahoo.') && !email.includes('ymail.com');
          }
          if (sidebarFilter === 'invalid') {
              const email = f.email.toLowerCase();
              const isBasicValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
              const hasIncompleteDomain = email.includes('@') && (email.split('@')[1].split('.').length < 2 || email.split('@')[1].split('.').some(part => part.length < 2));
              return !isBasicValid || hasIncompleteDomain;
          }
          return true;
      });
  }, [externalFounders, founderSearch, sidebarFilter]);

  const handleSendIndividualMail = async () => {
      if (!selectedExternalFounder || !individualMailText) return;
      
      try {
          const docId = selectedExternalFounder.email.replace(/[.#$[\]]/g, '_');
          const msgData = {
              text: individualMailText,
              subject: individualMailSubject || "Follow up from X Foundary",
              sender: 'admin',
              timestamp: new Date().toISOString()
          };
          
          await addDoc(collection(db, 'externalFounders', docId, 'messages'), msgData);
          await addDoc(collection(db, 'mail'), {
              to: selectedExternalFounder.email,
              message: {
                  subject: msgData.subject,
                  html: individualMailText.replace(/\n/g, '<br/>')
              }
          });
          
          setIndividualMailText('');
          setIndividualMailSubject('');
          fetchFounderMessages(selectedExternalFounder.email);
          setToastMessage("Message sent!");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
      } catch (e) { alert(e.message); }
  };



  const startResizing = (e) => {
      setIsResizing(true);
      e.preventDefault();
  };

  useEffect(() => {
      const handleMouseMove = (e) => {
          if (!isResizing || !sidebarRef.current) return;
          const newWidth = e.clientX - 300; // Subtract Admin sidebar width
          if (newWidth > 300 && newWidth < 900) {
              // Direct DOM manipulation for smoothness
              sidebarRef.current.style.width = `${newWidth}px`;
          }
      };
      
      const stopResizing = (e) => {
          if (!isResizing) return;
          setIsResizing(false);
          if (sidebarRef.current) {
              const finalWidth = parseInt(sidebarRef.current.style.width);
              setSidebarWidth(finalWidth);
          }
      };
      
      if (isResizing) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', stopResizing);
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
      } else {
          document.body.style.cursor = 'default';
          document.body.style.userSelect = 'auto';
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', stopResizing);
      };
  }, [isResizing]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedExternalFounder) return;
    
    setIsUploadingImage(true);
    try {
        const docId = selectedExternalFounder.email.replace(/[.#$[\]]/g, '_');
        const storageRef = ref(storage, `externalFounders/${docId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        const msgData = {
            text: `[Image Attachment]`,
            imageUrl: url,
            subject: individualMailSubject || "Image attachment from X Foundary",
            sender: 'admin',
            timestamp: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'externalFounders', docId, 'messages'), msgData);
        await addDoc(collection(db, 'mail'), {
            to: selectedExternalFounder.email,
            message: {
                subject: msgData.subject,
                html: `Sent an image: <br/><img src="${url}" style="max-width: 400px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"/>`
            }
        });
        
        fetchFounderMessages(selectedExternalFounder.email);
        setIndividualMailSubject('');
        setToastMessage("Image sent!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    } catch (e) { alert(e.message); }
    finally { setIsUploadingImage(false); }
  };

  const handleRemoveExternalFounder = async (email) => {
      const action = async () => {
          try {
              const docId = email.replace(/[.#$[\]]/g, '_');
              await deleteDoc(doc(db, 'externalFounders', docId));
              if (selectedExternalFounder?.email === email) {
                  setSelectedExternalFounder(null);
                  localStorage.removeItem('xf_admin_selected_founder_email');
              }
              fetchData();
              setToastMessage("Founder removed from registry.");
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
          } catch (e) { alert(e.message); }
      };

      if (skipConfirm) {
          action();
      } else {
          setConfirmConfig({ 
              title: `Remove ${email} from registry?`, 
              onConfirm: action 
          });
          setShowConfirmModal(true);
      }
  };

  const handleExportToCSV = () => {
      if (externalFounders.length === 0) {
          alert("No data to export.");
          return;
      }
      
      const headers = ['Name', 'Email', 'Date Added'];
      const rows = externalFounders.map(f => [
          f.name || 'External Founder',
          f.email,
          f.createdAt ? new Date(f.createdAt).toLocaleDateString() : 'N/A'
      ]);
      
      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `XF_Founders_Export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setToastMessage("Registry exported to CSV successfully.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
  };

  const handleBackupRegistry = async () => {
      try {
          if (externalFounders.length === 0) {
              alert("No founders to backup.");
              return;
          }
          await setDoc(doc(db, 'adminSettings', 'backups'), {
              externalFoundersBackup: externalFounders,
              backupDate: new Date().toISOString(),
              count: externalFounders.length
          });
          setToastMessage(`Registry backed up successfully (${externalFounders.length} entries).`);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
      } catch (e) { alert("Backup failed: " + e.message); }
  };

  const handleRestoreRegistry = async () => {
      const action = async () => {
          try {
              const backupDoc = await getDoc(doc(db, 'adminSettings', 'backups'));
              if (!backupDoc.exists()) {
                  alert("No backup found in the cloud.");
                  return;
              }
              const { externalFoundersBackup } = backupDoc.data();
              if (!externalFoundersBackup || externalFoundersBackup.length === 0) {
                  alert("Backup is empty.");
                  return;
              }

              const batch = writeBatch(db);
              // Note: This adds/overwrites. It doesn't clear existing unless we add logic for that.
              externalFoundersBackup.forEach(f => {
                  const docId = f.email.replace(/[.#$[\]]/g, '_');
                  batch.set(doc(db, 'externalFounders', docId), {
                      ...f,
                      restoredAt: new Date().toISOString()
                  });
              });
              await batch.commit();
              fetchData();
              setToastMessage(`Restored ${externalFoundersBackup.length} founders from backup.`);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
          } catch (e) { alert("Restore failed: " + e.message); }
      };

      setConfirmConfig({ 
          title: "Restore from backup? This will overwrite or merge with your current list.", 
          onConfirm: action 
      });
      setShowConfirmModal(true);
  };

  const handleRemoveAllExternalFounders = async () => {
      const action = async () => {
          try {
              const batch = writeBatch(db);
              externalFounders.forEach(f => {
                  batch.delete(doc(db, 'externalFounders', f.id));
              });
              await batch.commit();
              setSelectedExternalFounder(null);
              localStorage.removeItem('xf_admin_selected_founder_email');
              fetchData();
              setToastMessage("Entire registry cleared successfully.");
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
          } catch (e) { alert(e.message); }
      };

      if (skipConfirm) {
          action();
      } else {
          setConfirmConfig({ 
              title: "ARE YOU SURE? This will delete the ENTIRE external founder registry.", 
              onConfirm: action 
          });
          setShowConfirmModal(true);
      }
  };

  const navigate = useNavigate();
  const MASTER_SECRET_CODE = "XF-ADMIN-ACCESS-2024";

  useEffect(() => {
    document.title = "XF Admin Dashboard";
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        if (adminDoc.exists()) {
            setUser(currentUser);
            setIsAdminAuth(true);
            setProfile(adminDoc.data().profile || { name: 'Admin', pin: '000000' });
            if (isAuthorized) fetchData();
        } else {
            setUser(null);
            setIsAdminAuth(false);
        }
      } else {
        setUser(null);
        setIsAdminAuth(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, isAuthorized]);

  useEffect(() => {
    localStorage.setItem('xf_admin_active_tab', activeTab);
  }, [activeTab]);

  const handleAdminAuth = async (e) => {
    e.preventDefault();
    setError('');
    const email = e.target.email.value;
    const password = e.target.password.value;
    
    try {
        if (authMode === 'signup') {
            const secret = e.target.secret.value;
            const name = e.target.name.value;
            if (secret !== MASTER_SECRET_CODE) {
                setError("Invalid Master Secret Code.");
                return;
            }
            const res = await createUserWithEmailAndPassword(auth, email, password);
            const initialProfile = { name, pin: '000000' };
            await setDoc(doc(db, 'admins', res.user.uid), {
                email, profile: initialProfile, role: 'admin', createdAt: new Date().toISOString()
            });
            alert("Admin account created! Please log in.");
            setAuthMode('login');
        } else {
            const res = await signInWithEmailAndPassword(auth, email, password);
            const adminDoc = await getDoc(doc(db, 'admins', res.user.uid));
            if (!adminDoc.exists()) {
                await auth.signOut();
                setError("This account is not registered as an administrator.");
            }
        }
    } catch (err) { setError(err.message); }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === (profile.pin || '000000')) {
        setIsAuthorized(true);
        sessionStorage.setItem('xf_admin_authorized', 'true');
        fetchData();
    } else alert("Incorrect PIN");
  };

  const fetchData = async () => {
    try {
      const uSnap = await getDocs(collection(db, 'users'));
      const uList = []; const aList = []; let p = 0; let apprv = 0; let wdrw = 0;
      uSnap.forEach(d => {
          const data = d.data(); uList.push({ id: d.id, ...data });
          if (data.application) {
              const app = { id: d.id, ...data.application, userEmail: data.email, userName: data.profile?.name || 'Founder' };
              aList.push(app);
              if (app.status === 'pending' || !app.status) p++;
              if (app.status === 'approved') apprv++;
              if (app.status === 'withdrawn') wdrw++;
          }
      });
      const mSnap = await getDocs(collection(db, 'members'));
      const mList = []; mSnap.forEach(d => mList.push({ id: d.id, ...d.data() }));
      const bSnap = await getDocs(collection(db, 'blog'));
      const bList = []; let pb = 0;
      bSnap.forEach(d => { const b = { id: d.id, ...d.data() }; bList.push(b); if (b.status === 'pending') pb++; });
      const maSnap = await getDocs(collection(db, 'memberApplications'));
      const maList = []; let pm = 0;
      maSnap.forEach(d => { const a = { id: d.id, ...d.data() }; maList.push(a); if (a.status === 'pending') pm++; });

      const adminsSnap = await getDocs(collection(db, 'admins'));
      const adminsList = [];
      adminsSnap.forEach(d => adminsList.push({ id: d.id, ...d.data() }));

      const extSnap = await getDocs(collection(db, 'externalFounders'));
      const extList = [];
      extSnap.forEach(d => extList.push({ id: d.id, ...d.data() }));
      extList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const logsSnap = await getDocs(collection(db, 'applicationLogs'));
      const logsList = [];
      logsSnap.forEach(d => logsList.push({ id: d.id, ...d.data() }));
      logsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setExternalFounders(extList);

      setUsers(uList); setMembers(mList); setApplications(aList); setBlogs(bList); setMemberApps(maList); setApplicationLogs(logsList);
      setStats({ 
        totalUsers: uList.length, 
        totalApps: aList.length, 
        pending: p, 
        approved: apprv,
        pendingBlogs: pb, 
        pendingMembers: pm,
        withdrawnApps: wdrw,
        totalAdmins: adminsSnap.size,
        totalMembers: mList.length,
        adminsList
      });

      // Load Gmail Config
      const gmailDoc = await getDoc(doc(db, 'adminSettings', 'gmailConfig'));
      if (gmailDoc.exists()) {
          const data = gmailDoc.data();
          setGmailClientId(data.clientId || '');
          setGmailClientSecret(data.clientSecret || '');
      }
    } catch (e) { console.error(e); }
  };

  const handleAppStatus = async (uid, newStatus) => {
    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data() || {};
        
        await updateDoc(userRef, { 'application.status': newStatus });

        const companyName = userData.application?.companyName || 'your startup';
        await addDoc(collection(db, 'applicationLogs'), {
            userId: uid,
            action: newStatus,
            actionBy: profile.name || 'Admin',
            actionByUid: user?.uid || 'admin',
            reason: 'Action taken by Admin',
            timestamp: new Date().toISOString(),
            founderName: userData.profile?.name || userData.email || 'Founder',
            companyName: companyName
        });

        // Dispatch Email immediately
        const email = userData.email;
        if (email && newStatus !== 'pending') {
            const name = userData.profile?.name || email.split('@')[0] || 'Founder';
            const companyName = userData.application?.companyName || 'your startup';
            const batch = userData.application?.batch || 'Summer 2026';
            let mailData = null;

            if (newStatus === 'approved') {
                mailData = {
                    subject: `Congratulations! Your application for ${companyName} has been accepted`,
                    html: `<div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 12px; color: #111; line-height: 1.6;"><div style="text-align: center; margin-bottom: 30px;"><div style="background-color: #000; width: 42px; height: 42px; line-height: 42px; display: inline-block; border-radius: 4px; color: white; font-weight: 800; font-size: 16px; text-align: center;">XF</div><h2 style="margin-top: 20px; color: #111;">Welcome to X Foundary!</h2></div><p>Hello ${name},</p><p>We have great news! We've reviewed your application and are incredibly excited to invite <strong>${companyName}</strong> to join the <strong>X Foundary ${batch}</strong> batch.</p><p>We were very impressed with your vision and look forward to helping you grow.</p><div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #dcfce7;"><p style="margin: 0; font-size: 14px; color: #166534;"><strong>What's next?</strong><br/>Log in to your dashboard to see the next steps and join the founder community.</p></div><div style="text-align: center; margin-top: 30px;"><a href="https://xfoundaryapp.web.app/home" style="background-color: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Dashboard</a></div><p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">Welcome to the family!<br/>— The X Foundary Team</p></div>`
                };
            } else if (newStatus === 'hold') {
                mailData = {
                    subject: `Update on your ${companyName} application - X Foundary`,
                    html: `<div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 12px; color: #111; line-height: 1.6;"><div style="text-align: center; margin-bottom: 30px;"><div style="background-color: #000; width: 42px; height: 42px; line-height: 42px; display: inline-block; border-radius: 4px; color: white; font-weight: 800; font-size: 16px; text-align: center;">XF</div><h2 style="margin-top: 20px; color: #111;">Application Update</h2></div><p>Hello ${name},</p><p>Thank you for your patience as we review applications for the <strong>${batch}</strong> batch.</p><p>We wanted to let you know that your application for <strong>${companyName}</strong> looks very promising! Our team would like a bit more time to carefully review your materials.</p><div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #92400e;"><p style="margin: 0; font-size: 14px; color: #92400e;"><strong>What this means:</strong><br/>We haven't made a final decision yet. We are doing a deeper dive into your vision and will revert back to you soon with an update.</p></div><p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">Thank you for being part of X Foundary.<br/>— The X Foundary Team</p></div>`
                };
            } else if (newStatus === 'rejected') {
                mailData = {
                    subject: `Your X Foundary Application`,
                    html: `<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #111; line-height: 1.6;"><p>Hi ${name},</p><p>Thanks for applying to X Foundary. We're sorry to say that your startup was not selected for an interview. We carefully reviewed thousands of applications, and with so many strong submissions, we had to make difficult decisions. Unfortunately, this meant turning away many promising companies.</p><p>Unfortunately we can't give you individual feedback about your application. <a href="https://xfoundaryapp.web.app/faq" style="color: #000; text-decoration: underline;">This page explains why.</a></p><p>We hope you apply again in the future as you continue to make progress. In fact, we encourage it. Applying multiple times does not count against you and a surprisingly large number of companies are funded after applying more than once. Over 50% of the startups we accept are repeat applicants.</p><p>Best of luck,</p><p style="margin-top: 30px; font-weight: bold;">—XF</p></div>`
                };
            }

            if (mailData) {
                await addDoc(collection(db, 'mail'), {
                    to: email,
                    message: mailData
                });
            }
        }

        setToastMessage(`Application ${newStatus}! Email sent to founder.`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        fetchData();
    } catch (e) { alert(e.message); }
  };

  const handleMemberApproval = async (uid, newStatus) => {
    try {
        if (newStatus === 'approved') {
            const appDoc = await getDoc(doc(db, 'memberApplications', uid));
            const appData = appDoc.exists() ? appDoc.data() : {};
            
            const userDoc = await getDoc(doc(db, 'users', uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            
            const batch = writeBatch(db);
            batch.set(doc(db, 'members', uid), { 
                ...userData, 
                ...appData,
                role: 'member', 
                approvedAt: new Date().toISOString() 
            });
            
            if (userDoc.exists()) {
                batch.delete(doc(db, 'users', uid));
            }
            
            batch.update(doc(db, 'memberApplications', uid), { status: 'approved' });
            await batch.commit();
        } else {
            await updateDoc(doc(db, 'memberApplications', uid), { status: 'rejected' });
        }
        alert("Action completed"); fetchData();
    } catch (e) { alert(e.message); }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
        await setDoc(doc(db, 'adminSettings', 'gmailConfig'), {
            clientId: gmailClientId,
            clientSecret: gmailClientSecret,
            updatedAt: new Date().toISOString(),
            updatedBy: profile.name || 'Admin'
        });
        setToastMessage("Settings saved successfully.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
        alert("Error saving settings: " + e.message);
    } finally {
        setIsSavingSettings(false);
    }
  };

  const handleRemoveMember = async (uid) => {
      if (window.confirm("Are you sure you want to remove this user from the team?")) {
          try {
              const batch = writeBatch(db);
              batch.delete(doc(db, 'members', uid));
              batch.update(doc(db, 'memberApplications', uid), { status: 'removed' });
              await batch.commit();
              setToastMessage("Member removed successfully.");
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
              fetchData();
          } catch (e) { alert(e.message); }
      }
  };

  const handleSendColdMail = async () => {
      if (!draftSubject || !draftMessage) {
          alert("Please fill in both subject and message.");
          return;
      }

      let recipients = [];
      if (sendToAll) {
          const manualRecipients = coldEmailsText.split(/[,\n]/).map(e => e.trim()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
          const registryRecipients = externalFounders.map(f => f.email);
          const combined = new Set([...manualRecipients, ...registryRecipients]);
          recipients = Array.from(combined);
      } else {
          recipients = coldEmailsText.split(/[,\n]/).map(e => e.trim()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      }

      if (recipients.length === 0) {
          alert("No valid recipients found.");
          return;
      }

      if (window.confirm(`Are you sure you want to send this email to ${recipients.length} recipients?`)) {
          try {
              setShowDraftModal(false); // Close modal immediately to show progress
              for (let i = 0; i < recipients.length; i++) {
                  const email = recipients[i];
                  setSendingStatus({ current: email, count: i + 1, total: recipients.length });
                  
                  const docId = email.replace(/[.#$[\]]/g, '_');
                  const msgData = {
                      text: draftMessage,
                      subject: draftSubject,
                      sender: 'admin',
                      timestamp: new Date().toISOString()
                  };
                  
                  await addDoc(collection(db, 'externalFounders', docId, 'messages'), msgData);

                  await addDoc(collection(db, 'mail'), {
                      to: email,
                      message: {
                          subject: draftSubject,
                          html: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111;">${draftMessage.replace(/\n/g, '<br/>')}</div>`
                      }
                  });
                  
                  // Optional small delay to make the UI visible if it's too fast
                  if (recipients.length < 50) await new Promise(r => setTimeout(r, 100));
              }
              
              setSendingStatus(null);
              setDraftSubject('');
              setDraftMessage('');
              setToastMessage(`Email successfully queued for ${recipients.length} recipients.`);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
          } catch (e) { 
              setSendingStatus(null);
              alert("Error sending emails: " + e.message); 
          }
      }
  };

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Admin Portal...</div>;

  if (!isAdminAuth) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6ef' }}>
        <div style={{ width: '400px', backgroundColor: '#fff', padding: '3rem', borderRadius: '12px', border: '1px solid #eee' }}>
            <div style={{ backgroundColor: '#6300dd', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', borderRadius: '8px', margin: '0 auto 2rem', fontSize: '24px' }}>X</div>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin {authMode === 'login' ? 'Login' : 'Signup'}</h2>
            {error && <p style={{ color: '#ff4d4f', fontSize: '13px', textAlign: 'center', marginBottom: '1.5rem' }}>{error}</p>}
            <form onSubmit={handleAdminAuth}>
                {authMode === 'signup' && (
                    <>
                        <input name="name" placeholder="Full Name" required style={{ width: '100%', padding: '12px', marginBottom: '1rem' }} />
                        <input name="secret" placeholder="Master Secret Code" required style={{ width: '100%', padding: '12px', marginBottom: '1rem' }} />
                    </>
                )}
                <input name="email" type="email" placeholder="Admin Email" required style={{ width: '100%', padding: '12px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #ddd' }} />
                <div style={{ position: 'relative', marginBottom: '2rem' }}>
                    <input name="password" type={showPassword ? "text" : "password"} placeholder="Password" required style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888' }}>
                        {showPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        )}
                    </button>
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {authMode === 'login' ? 'Sign In' : 'Create Admin Account'}
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px' }}>
                {authMode === 'login' ? "Need an account?" : "Already have an account?"} 
                <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer', marginLeft: '5px' }}>
                    {authMode === 'login' ? 'Register' : 'Log In'}
                </button>
            </p>
        </div>
    </div>
  );

  if (!isAuthorized) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6ef' }}>
        <form onSubmit={handlePinSubmit} style={{ width: '320px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem' }}>Welcome, {profile.name}</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '2rem' }}>Enter master PIN to unlock system.</p>
            <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="••••••" maxLength={6} style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', marginBottom: '1.5rem' }} />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Unlock Panel</button>
            <button onClick={() => auth.signOut()} style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>Sign Out</button>
        </form>
    </div>
  );

  const TABS = ['Overview', 'Pending Apps', 'Applications', 'Founders', 'Admins', 'Members', 'Blog Approvals', 'Manage Blog', 'XF Blog', 'Member Requests', 'Withdrawn Apps', 'Cold Mail', 'Backup', 'Settings'];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'Inter, sans-serif', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(99, 0, 221, 0.08) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0, animation: 'move 20s infinite alternate' }}></div>
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(99, 0, 221, 0.05) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0, animation: 'move 25s infinite alternate-reverse' }}></div>

      <style>{`
        @keyframes move { from { transform: translate(0, 0); } to { transform: translate(10%, 10%); } }
        @keyframes glassShine {
            0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            100% { transform: translateX(200%) translateY(200%) rotate(45deg); }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .liquid-glass-active {
            position: absolute;
            left: 8px;
            right: 8px;
            height: 40px;
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(15px) saturate(200%);
            -webkit-backdrop-filter: blur(15px) saturate(200%);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.4);
            box-shadow: 
                0 8px 32px rgba(99, 0, 221, 0.1),
                inset 0 0 0 1px rgba(255,255,255,0.5);
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 0;
            overflow: hidden;
            pointer-events: none;
        }
        .liquid-glass-active::after {
            content: '';
            position: absolute;
            top: -50%; left: -50%; width: 200%; height: 200%;
            background: linear-gradient(
                45deg,
                transparent 0%,
                rgba(255, 255, 255, 0.1) 45%,
                rgba(255, 255, 255, 0.6) 50%,
                rgba(255, 255, 255, 0.1) 55%,
                transparent 100%
            );
            animation: glassShine 3s infinite linear;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.7) !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.5) !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.03) !important;
            transition: all 0.3s ease !important;
        }
        .glass-card.is-resizing {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            transition: none !important;
            background: rgba(255, 255, 255, 0.95) !important;
        }
        .glass-card:hover {
            background: rgba(255, 255, 255, 0.85) !important;
            box-shadow: 0 12px 40px rgba(99, 0, 221, 0.06) !important;
        }
        .profile-glass {
            background: rgba(255, 255, 255, 0.5) !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.4) !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.05) !important;
            border-radius: 18px !important;
            padding: 12px !important;
            transition: all 0.3s ease !important;
        }
        .profile-glass:hover {
            background: rgba(255, 255, 255, 0.7) !important;
        }
      `}</style>

      <aside style={{ 
        width: '300px', 
        backgroundColor: 'rgba(223, 234, 234, 0.8)', 
        backdropFilter: 'blur(30px)', 
        color: '#000', 
        borderRight: '1px solid rgba(201, 218, 218, 0.5)', 
        padding: '2rem 1.5rem', 
        height: '100vh', 
        position: 'fixed', 
        left: 0,
        top: 0, 
        display: 'flex', 
        flexDirection: 'column', 
        zIndex: 10 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '3rem' }}>
          <div style={{ backgroundColor: '#000', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', borderRadius: '10px', fontSize: '20px' }}>X</div>
          <span style={{ fontWeight: '800', color: '#000', fontSize: '20px', letterSpacing: '-0.02em' }}>X Foundary</span>
        </div>
        <nav style={{ flex: 1, position: 'relative', overflowY: 'auto', paddingRight: '5px' }}>
          <div className="liquid-glass-active" style={{ 
              transform: `translateY(${TABS.indexOf(activeTab) * 50}px)`,
              height: '46px'
          }}></div>
          {TABS.map((tab) => {
              let badgeCount = 0;
              if (tab === 'Pending Apps') badgeCount = stats.pending;
              if (tab === 'Member Requests') badgeCount = stats.pendingMembers;
              if (tab === 'Blog Approvals') badgeCount = stats.pendingBlogs;
              if (tab === 'Withdrawn Apps') badgeCount = stats.withdrawnApps;
              
              return (
                  <div key={tab} onClick={() => setActiveTab(tab)} style={{ 
                      position: 'relative', 
                      zIndex: 1, 
                      padding: '12px 18px', 
                      marginBottom: '4px', 
                      cursor: 'pointer', 
                      color: activeTab === tab ? '#000' : '#556666',
                      fontSize: '16px', 
                      fontWeight: '700',
                      transition: 'color 0.4s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '46px'
                  }}>
                    <span>{tab}</span>
                    {badgeCount > 0 && (
                        <span style={{ 
                            backgroundColor: '#ff3b30', 
                            color: '#fff', 
                            borderRadius: '50%', 
                            minWidth: '20px', 
                            height: '20px', 
                            padding: '0 6px',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontSize: '11px', 
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(255, 59, 48, 0.3)'
                        }}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                    )}
                  </div>
              );
          })}
          <button onClick={() => fetchData()} style={{ position: 'relative', zIndex: 1, marginTop: '2rem', width: '100%', padding: '10px', backgroundColor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', color: '#000', backdropFilter: 'blur(10px)', fontWeight: '700', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}>Refresh Data</button>
        </nav>

        <div style={{ position: 'relative', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', marginTop: 'auto' }}>
            {showProfilePopup && (
                <div style={{ position: 'absolute', bottom: '100%', left: '0', width: '220px', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '15px', boxShadow: '0 15px 45px rgba(0,0,0,0.1)', marginBottom: '12px', padding: '10px', zIndex: 1000, animation: 'fadeInUp 0.2s ease-out' }}>
                    <div onClick={() => { setActiveTab('Settings'); setShowProfilePopup(false); }} style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s', color: '#333' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Settings
                    </div>
                    <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.05)', margin: '6px 0' }}></div>
                    <div onClick={() => auth.signOut()} style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', color: '#ff4d4f', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,0,0,0.03)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Log out
                    </div>
                </div>
            )}
            
            <div onClick={() => setShowProfilePopup(!showProfilePopup)} className="profile-glass" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <div style={{ width: '36px', height: '36px', backgroundColor: '#000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {profile.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name}</div>
                    <div style={{ fontSize: '11px', color: '#667777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                </div>
            </div>
        </div>
      </aside>

      <main style={{ 
        flex: 1, 
        marginLeft: '300px',
        padding: (activeTab === 'Blog' || activeTab === 'Cold Mail' || activeTab === 'Backup') ? '0.5rem' : '2.5rem', 
        zIndex: 1, 
        position: 'relative', 
        minHeight: '100vh'
      }}>
        {activeTab === 'Overview' && (
            <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                 <div onClick={() => setActiveTab('Pending Apps')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, rgba(0, 122, 255, 0.05) 100%)', border: '1px solid rgba(0, 122, 255, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Applications written</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.pending}</div>
                </div>
                <div onClick={() => setActiveTab('Applications')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.15) 0%, rgba(52, 199, 89, 0.05) 100%)', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Applications</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.pending + stats.approved + applications.filter(a => a.status === 'hold' || a.status === 'rejected').length}</div>
                </div>
                <div onClick={() => setActiveTab('Founders')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.15) 0%, rgba(255, 149, 0, 0.05) 100%)', border: '1px solid rgba(255, 149, 0, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Founders</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.totalUsers}</div>
                </div>
                <div onClick={() => setActiveTab('Members')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(88, 86, 214, 0.15) 0%, rgba(88, 86, 214, 0.05) 100%)', border: '1px solid rgba(88, 86, 214, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Members</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.totalMembers}</div>
                </div>
                <div onClick={() => setActiveTab('Admins')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(142, 142, 147, 0.15) 0%, rgba(142, 142, 147, 0.05) 100%)', border: '1px solid rgba(142, 142, 147, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Admins</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.totalAdmins}</div>
                </div>
                <div onClick={() => setActiveTab('Member Requests')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(255, 59, 48, 0.15) 0%, rgba(255, 59, 48, 0.05) 100%)', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pending Members</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.pendingMembers}</div>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                {/* Category Distribution Chart */}
                <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px' }}>
                    <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', fontSize: '1.1rem' }}>Category Distribution</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(applications.reduce((acc, app) => {
                            const cat = app.category || 'Other';
                            acc[cat] = (acc[cat] || 0) + 1;
                            return acc;
                        }, {})).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([cat, count], idx) => (
                            <div key={cat} style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                                    <span>{cat}</span>
                                    <span>{count} ({Math.round(count/applications.length * 100)}%)</span>
                                </div>
                                <div style={{ height: '8px', width: '100%', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: `${(count/applications.length)*100}%`, 
                                        backgroundColor: ['#007aff', '#34c759', '#ff9f0a', '#5856d6', '#ff3b30'][idx % 5],
                                        borderRadius: '4px',
                                        transition: 'width 1s ease-out'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Application Growth Chart */}
                <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px' }}>
                    <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', fontSize: '1.1rem' }}>Weekly Submissions</h4>
                    <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '15px', padding: '10px 0' }}>
                        {[...Array(7)].map((_, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() - (6 - i));
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                            const count = applications.filter(app => {
                                const appDate = new Date(app.submittedAt);
                                return appDate.toDateString() === date.toDateString();
                            }).length;
                            const max = Math.max(...[...Array(7)].map((_, j) => {
                                const d = new Date(); d.setDate(d.getDate() - (6 - j));
                                return applications.filter(a => new Date(a.submittedAt).toDateString() === d.toDateString()).length;
                            })) || 1;
                            
                            return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '100%', position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                        <div style={{ 
                                            width: '100%', 
                                            height: `${(count/max)*100}%`, 
                                            backgroundColor: '#000', 
                                            borderRadius: '6px 6px 2px 2px',
                                            minHeight: count > 0 ? '4px' : '0',
                                            transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                        }}>
                                            {count > 0 && <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: '800' }}>{count}</div>}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#888' }}>{dayName}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="glass-card" style={{ padding: '2rem', borderRadius: '24px', gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem' }}>Recent Activity</h4>
                        <button style={{ background: 'none', border: 'none', color: '#007aff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>View All</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {applications.slice(0, 4).map((app, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '14px' }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: '#fff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                    {app.companyName.charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700' }}>{app.userName} submitted application for <span style={{ color: '#007aff' }}>{app.companyName}</span></div>
                                    <div style={{ fontSize: '12px', color: '#888' }}>{app.submittedAt ? new Date(app.submittedAt).toLocaleString() : 'Recently'}</div>
                                </div>
                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', backgroundColor: app.status === 'approved' ? 'rgba(52,199,89,0.1)' : 'rgba(0,0,0,0.05)', color: app.status === 'approved' ? '#34c759' : '#000' }}>
                                    {app.status?.toUpperCase() || 'PENDING'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )}

        {(activeTab === 'Pending Apps' || activeTab === 'Applications') && (
            <div style={{ display: 'contents' }}>
                {activeTab === 'Applications' && applicationLogs.length > 0 && (
                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px', marginBottom: '1.5rem', animation: 'fadeInUp 0.4s ease-out' }}>
                        <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800' }}>Recent Application Logs</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                            {applicationLogs.slice(0, 10).map((log, i) => (
                                <div key={i} style={{ fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
                                    <span style={{ 
                                        padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', flexShrink: 0,
                                        backgroundColor: log.action === 'approved' ? 'rgba(52,199,89,0.1)' : log.action === 'hold' ? 'rgba(0,122,255,0.1)' : 'rgba(255,59,48,0.1)',
                                        color: log.action === 'approved' ? '#34c759' : log.action === 'hold' ? '#007aff' : '#ff3b30'
                                    }}>
                                        {log.action.toUpperCase()}
                                    </span>
                                    <div>
                                        <span style={{ fontWeight: '700' }}>{log.actionBy}</span> {log.action === 'approved' ? 'approved' : log.action === 'hold' ? 'held' : log.action === 'rejected' ? 'rejected' : 'reverted'} <span style={{ fontWeight: '700' }}>{log.companyName}</span> ({log.founderName})
                                        {log.reason && <span style={{ color: '#666', fontStyle: 'italic', marginLeft: '6px' }}>"{log.reason}"</span>}
                                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{new Date(log.timestamp).toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>{activeTab}</h3>
                        {activeTab === 'Applications' && (
                            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(0,0,0,0.03)', padding: '4px', borderRadius: '10px' }}>
                                {['approved', 'hold', 'rejected'].map(f => (
                                    <button 
                                        key={f}
                                        onClick={() => setAppFilter(f)}
                                        style={{ 
                                            padding: '6px 14px', 
                                            borderRadius: '8px', 
                                            border: 'none', 
                                            fontSize: '12px', 
                                            fontWeight: '700', 
                                            cursor: 'pointer',
                                            backgroundColor: appFilter === f ? '#000' : 'transparent',
                                            color: appFilter === f ? '#fff' : '#666',
                                            transition: 'all 0.2s',
                                            textTransform: 'capitalize'
                                        }}
                                    >{f}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                            <tr>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>COMPANY</th>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>FOUNDER</th>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>BATCH</th>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>ACTION</th>
                            </tr>
                        </thead>
                    <tbody>
                        {applications.filter(app => activeTab === 'Pending Apps' ? (app.status === 'pending' || !app.status) : app.status === appFilter).map(app => (
                            <tr key={app.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700' }}>{app.companyName}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>{app.category}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '600' }}>{app.userName}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>{app.userEmail}</div>
                                </td>
                                <td style={{ padding: '1.25rem', fontSize: '13px' }}>{app.batch}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    {activeTab === 'Pending Apps' ? (
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button 
                                                onClick={() => handleAppStatus(app.id, 'approved')} 
                                                style={{ 
                                                    padding: '8px 18px', 
                                                    backgroundColor: 'rgba(0, 122, 255, 0.1)', 
                                                    color: '#007aff', 
                                                    border: '1px solid rgba(0, 122, 255, 0.2)', 
                                                    borderRadius: '8px', 
                                                    fontSize: '13px', 
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontFamily: 'Inter, sans-serif'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >Approve</button>
                                            <button 
                                                onClick={() => handleAppStatus(app.id, 'hold')} 
                                                style={{ 
                                                    padding: '8px 18px', 
                                                    backgroundColor: 'rgba(255, 159, 10, 0.1)', 
                                                    color: '#ff9f0a', 
                                                    border: '1px solid rgba(255, 159, 10, 0.2)', 
                                                    borderRadius: '8px', 
                                                    fontSize: '13px', 
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontFamily: 'Inter, sans-serif'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 159, 10, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 159, 10, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >Hold</button>
                                            <button 
                                                onClick={() => handleAppStatus(app.id, 'rejected')} 
                                                style={{ 
                                                    padding: '8px 18px', 
                                                    backgroundColor: 'rgba(255, 59, 48, 0.1)', 
                                                    color: '#ff3b30', 
                                                    border: '1px solid rgba(255, 59, 48, 0.2)', 
                                                    borderRadius: '8px', 
                                                    fontSize: '13px', 
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontFamily: 'Inter, sans-serif'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >Reject</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {app.status === 'hold' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleAppStatus(app.id, 'approved')} 
                                                        style={{ padding: '6px 12px', backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#34c759', border: '1px solid rgba(52, 199, 89, 0.2)', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.2)'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.1)'}
                                                    >Approve</button>
                                                    <button 
                                                        onClick={() => handleAppStatus(app.id, 'rejected')} 
                                                        style={{ padding: '6px 12px', backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: '1px solid rgba(255, 59, 48, 0.2)', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.2)'}
                                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.1)'}
                                                    >Reject</button>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => handleAppStatus(app.id, 'pending')} 
                                                style={{ padding: '6px 12px', backgroundColor: '#faad14', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                            >Revert to Pending</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        )}

        {(activeTab === 'Founders' || activeTab === 'Admins' || activeTab === 'Members') && (
            <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>{activeTab === 'Founders' ? 'Founders Management' : activeTab}</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            {activeTab === 'Founders' && <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', width: '40px' }}>#</th>}
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>{activeTab === 'Founders' ? 'NAME & EMAIL' : 'NAME'}</th>
                            {activeTab === 'Founders' && <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>STARTUP</th>}
                            {activeTab === 'Founders' && <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>SUBMITTED DATE</th>}
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>{activeTab === 'Founders' ? 'SOCIAL LINKS' : 'STATUS'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(activeTab === 'Founders' ? users.slice(0, founderLimit) : activeTab === 'Admins' ? stats.adminsList : members).map((u, i) => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                {activeTab === 'Founders' && <td style={{ padding: '1.25rem', fontWeight: '700', color: '#888', fontSize: '13px' }}>{i + 1}</td>}
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {u.profile?.profileImage || u.photoURL ? (
                                            <img src={u.profile?.profileImage || u.photoURL} style={{ width: '38px', height: '38px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.05)' }} alt="" />
                                        ) : (
                                            <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#888' }}>
                                                {(u.profile?.name || u.name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#000' }}>{u.profile?.name || u.name || 'Unnamed'}</div>
                                            <div style={{ fontSize: '12px', color: '#667777' }}>{u.email}</div>
                                        </div>
                                    </div>
                                </td>
                                {activeTab === 'Founders' && (
                                    <>
                                        <td style={{ padding: '1.25rem' }}>
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{u.application?.companyName || 'N/A'}</div>
                                            <div style={{ fontSize: '12px', color: '#888' }}>{u.application?.category || 'No Category'}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem', fontSize: '13px', color: '#444' }}>
                                            {u.application?.submittedAt ? new Date(u.application.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not Submitted'}
                                        </td>
                                    </>
                                )}
                                <td style={{ padding: '1.25rem' }}>
                                    {activeTab === 'Founders' ? (
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            {(u.linkedin || u.application?.founderLinkedin) && (
                                                <a href={u.linkedin?.startsWith('http') ? u.linkedin : (u.application?.founderLinkedin?.startsWith('http') ? u.application.founderLinkedin : `https://linkedin.com/in/${u.linkedin || u.application?.founderLinkedin}`)} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5', display: 'flex', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'} title="LinkedIn">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                                </a>
                                            )}
                                            {(u.twitter || u.application?.founderTwitter) && (
                                                <a href={u.twitter?.startsWith('http') ? u.twitter : `https://twitter.com/${(u.twitter || u.application?.founderTwitter).replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#000', display: 'flex', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'} title="Twitter / X">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                                </a>
                                            )}
                                            {(u.instagram || u.application?.founderInstagram) && (
                                                <a href={u.instagram?.startsWith('http') ? u.instagram : `https://instagram.com/${(u.instagram || u.application?.founderInstagram).replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#E1306C', display: 'flex', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'} title="Instagram">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                                </a>
                                            )}
                                        </div>

                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ padding: '6px 10px', backgroundColor: 'rgba(0,0,0,0.05)', color: '#000', borderRadius: '6px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em' }}>ACTIVE</span>
                                            {activeTab === 'Members' && (
                                                <button 
                                                    onClick={() => handleRemoveMember(u.id)}
                                                    style={{ padding: '6px 12px', backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.2)'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.1)'}
                                                >Remove</button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {activeTab === 'Founders' && users.length > founderLimit && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <button onClick={() => setFounderLimit(prev => prev + 30)} style={{ padding: '10px 24px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                            Load More Founders
                        </button>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'Blog Approvals' && (
            <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>Blog Approvals</h3>
                    <span style={{ fontSize: '13px', color: '#667777' }}>{blogs.filter(b => b.status === 'pending').length} pending</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>TITLE</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>AUTHOR</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>STATUS</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {blogs.length === 0 && (
                            <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No blog submissions found.</td></tr>
                        )}
                        {blogs.map(blog => (
                            <tr key={blog.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700' }}>{blog.title || 'Untitled'}</div>
                                    <div style={{ fontSize: '12px', color: '#667777', marginTop: '4px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {blog.content?.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '600' }}>{blog.author}</div>
                                    <div style={{ fontSize: '12px', color: '#667777' }}>{new Date(blog.date || blog.createdAt).toLocaleDateString()}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                                        backgroundColor: blog.status === 'approved' ? 'rgba(52,199,89,0.1)' : blog.status === 'rejected' ? 'rgba(255,59,48,0.1)' : 'rgba(255,149,0,0.1)',
                                        color: blog.status === 'approved' ? '#34c759' : blog.status === 'rejected' ? '#ff3b30' : '#ff9500'
                                    }}>
                                        {blog.status === 'approved' ? 'Published' : blog.status === 'rejected' ? 'Rejected' : 'Pending'}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    {blog.status === 'pending' ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={async () => { await updateDoc(doc(db, 'blog', blog.id), { status: 'approved' }); fetchData(); }}
                                                style={{ padding: '6px 14px', backgroundColor: 'rgba(52,199,89,0.1)', color: '#34c759', border: '1px solid rgba(52,199,89,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                            >Approve</button>
                                            <button
                                                onClick={async () => { await updateDoc(doc(db, 'blog', blog.id), { status: 'rejected' }); fetchData(); }}
                                                style={{ padding: '6px 14px', backgroundColor: 'rgba(255,59,48,0.1)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                            >Reject</button>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '13px', color: '#999' }}>Reviewed</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'Manage Blog' && (
            <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem' }}>Manage Blog</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#667777' }}>{blogs.length} total posts &bull; {blogs.filter(b => b.status === 'approved').length} published</p>
                    </div>
                    <button
                        onClick={() => navigate('/create-blog')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        New Post
                    </button>
                </div>

                {/* Blog List */}
                <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                    {blogs.length === 0 && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>No blog posts yet. Create the first one!</div>
                    )}
                    {blogs.map((blog, idx) => {
                        const statusConfig = {
                            approved: { label: 'Published', color: '#34c759', bg: 'rgba(52,199,89,0.1)', border: 'rgba(52,199,89,0.2)' },
                            pending:  { label: 'Pending',   color: '#ff9500', bg: 'rgba(255,149,0,0.1)', border: 'rgba(255,149,0,0.2)' },
                            rejected: { label: 'Rejected',  color: '#ff3b30', bg: 'rgba(255,59,48,0.1)',  border: 'rgba(255,59,48,0.2)' },
                        };
                        const s = statusConfig[blog.status] || statusConfig.pending;
                        return (
                            <div key={blog.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', padding: '1.5rem 2rem', borderBottom: idx < blogs.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{blog.title || 'Untitled'}</h3>
                                        <span style={{ flexShrink: 0, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>
                                    </div>
                                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#667777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {blog.content?.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')}
                                    </p>
                                    <div style={{ fontSize: '12px', color: '#999' }}>
                                        By <strong>{blog.author}</strong> &bull; {blog.category || 'General'} &bull; {new Date(blog.date || blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                                    {blog.status !== 'approved' && (
                                        <button
                                            onClick={async () => { await updateDoc(doc(db, 'blog', blog.id), { status: 'approved' }); fetchData(); }}
                                            style={{ padding: '7px 14px', backgroundColor: 'rgba(52,199,89,0.1)', color: '#34c759', border: '1px solid rgba(52,199,89,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                        >Publish</button>
                                    )}
                                    {blog.status === 'approved' && (
                                        <button
                                            onClick={async () => { await updateDoc(doc(db, 'blog', blog.id), { status: 'pending' }); fetchData(); }}
                                            style={{ padding: '7px 14px', backgroundColor: 'rgba(255,149,0,0.1)', color: '#ff9500', border: '1px solid rgba(255,149,0,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                        >Unpublish</button>
                                    )}
                                    <button
                                        onClick={async () => {
                                            if (window.confirm(`Delete "${blog.title || 'this post'}"? This cannot be undone.`)) {
                                                await deleteDoc(doc(db, 'blog', blog.id));
                                                fetchData();
                                            }
                                        }}
                                        style={{ padding: '7px 14px', backgroundColor: 'rgba(255,59,48,0.1)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                    >Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {activeTab === 'Blog' && (
            <div style={{ minHeight: '100vh', backgroundColor: '#f6f6ef' }}>
                <Blog />
            </div>
        )}

        {activeTab === 'Member Requests' && (
            <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>Membership Requests</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>CANDIDATE</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>REASON</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {memberApps.filter(a => a.status !== 'withdrawn').map(app => (
                            <tr key={app.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700' }}>{app.name}</div>
                                    <div style={{ fontSize: '12px', color: '#667777' }}>{app.email}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>{app.reason}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    {app.status === 'pending' ? (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                onClick={() => handleMemberApproval(app.id, 'approved')} 
                                                style={{ padding: '8px 16px', backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#34c759', border: '1px solid rgba(52, 199, 89, 0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.2)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.1)'}
                                            >Approve</button>
                                            <button 
                                                onClick={() => handleMemberApproval(app.id, 'rejected')} 
                                                style={{ padding: '8px 16px', backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: '1px solid rgba(255, 59, 48, 0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.2)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.1)'}
                                            >Reject</button>
                                        </div>
                                    ) : <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: app.status === 'approved' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)', color: app.status === 'approved' ? '#34c759' : '#ff3b30', fontSize: '11px', fontWeight: '800' }}>{app.status?.toUpperCase()}</span>}
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'Withdrawn Apps' && (
            <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>Withdrawn Applications</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>CANDIDATE / STARTUP</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>TYPE</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ...applications.filter(a => a.status === 'withdrawn').map(a => ({ ...a, displayType: 'Founder' })),
                            ...memberApps.filter(a => a.status === 'withdrawn').map(a => ({ ...a, displayType: 'Member', userName: a.name, userEmail: a.email }))
                        ].map((app, idx) => (
                            <tr key={app.id + idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700' }}>{app.userName || app.companyName}</div>
                                    <div style={{ fontSize: '12px', color: '#667777' }}>{app.userEmail}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{app.displayType}</span>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: 'rgba(255, 149, 0, 0.1)', color: '#ff9500', fontSize: '11px', fontWeight: '800' }}>WITHDRAWN</span>
                                </td>
                            </tr>
                        ))}
                        {applications.filter(a => a.status === 'withdrawn').length === 0 && memberApps.filter(a => a.status === 'withdrawn').length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No withdrawn applications found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
        {activeTab === 'Backup' && (
            <div className="glass-card" style={{ flex: 1, padding: '2.5rem', borderRadius: '32px', height: 'calc(100vh - 20px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.8rem', letterSpacing: '-0.02em' }}>Cloud Backups</h3>
                        <p style={{ margin: '4px 0 0 0', opacity: 0.5, fontSize: '14px', fontWeight: 600 }}>Manage your startup registry archives</p>
                    </div>
                    <button 
                        onClick={fetchData}
                        style={{ background: '#000', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                        REFRESH BACKUPS
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <div style={{ padding: '8px', backgroundColor: '#000', borderRadius: '10px', color: '#fff', display: 'flex' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    </div>
                                    <span style={{ fontWeight: '900', fontSize: '1.2rem' }}>External Founders Registry Backup</span>
                                </div>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '800', opacity: 0.4 }}>PRIMARY CLOUD STORAGE</span>
                                    <div style={{ width: '4px', height: '4px', backgroundColor: '#ccc', borderRadius: '50%' }}></div>
                                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#34c759' }}>PROTECTED</span>
                                </div>
                            </div>
                            <button 
                                onClick={handleRestoreRegistry}
                                style={{ background: '#000', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                RESTORE THIS BACKUP
                            </button>
                        </div>

                        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '11px', fontWeight: '900', letterSpacing: '0.1em', opacity: 0.4 }}>BACKUP CONTENT ({externalFounders.length} EMAILS)</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                                {externalFounders.map((f, i) => (
                                    <div key={i} style={{ padding: '12px 16px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(0,0,0,0.02)' }}>
                                        <span style={{ opacity: 0.3, fontSize: '11px', fontWeight: '800', width: '20px' }}>{i + 1}.</span>
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#000' }}>{f.email}</span>
                                    </div>
                                ))}
                                {externalFounders.length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', opacity: 0.5, fontWeight: 700 }}>
                                        <div style={{ fontSize: '40px', marginBottom: '1rem' }}>☁️</div>
                                        <div>No emails found in the current cloud registry.</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {activeTab === 'Cold Mail' && (
            <>
                <div style={{ display: 'flex', gap: '0.5rem', animation: 'fadeInUp 0.4s ease-out', minHeight: 'calc(100vh - 20px)' }}>
                {/* External Founders Sidebar (Left Side) */}
                <div 
                    ref={sidebarRef}
                    className={`glass-card ${isResizing ? 'is-resizing' : ''}`} 
                    style={{ 
                        width: `${sidebarWidth}px`, 
                        padding: '1.5rem', 
                        borderRadius: '0', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        height: 'calc(100vh - 20px)', 
                        overflow: 'hidden', 
                        position: 'relative'
                    }}
                >
                    {/* Resize Handle */}
                    <div 
                        onMouseDown={startResizing}
                        style={{ 
                            position: 'absolute', right: 0, top: 0, bottom: 0, width: '10px', 
                            cursor: 'col-resize', backgroundColor: isResizing ? 'rgba(0,122,255,0.4)' : 'transparent', 
                            transition: 'background-color 0.2s', zIndex: 100 
                        }}
                        onMouseEnter={e => { if(!isResizing) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)' }}
                        onMouseLeave={e => { if(!isResizing) e.currentTarget.style.backgroundColor = 'transparent' }}
                    />
                    {isResizing && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, cursor: 'col-resize' }} />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <div>
                            <h4 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>External Founders ({externalFounders.length})</h4>
                            <div style={{ fontSize: '10px', color: '#888', fontWeight: '700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34c759' }}></div>
                                CLOUD REGISTRY ACTIVE
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button 
                                onClick={() => {
                                    setConfirmConfig({
                                        title: "Sync with your Gmail Sent folder? This will import your external communication history into these threads. (Requires Gmail API Setup)",
                                        onConfirm: () => {
                                            setToastMessage("Architectural Setup Required: Gmail API Client ID must be configured in Settings to enable sync.");
                                            setShowToast(true);
                                            setTimeout(() => setShowToast(false), 4000);
                                        }
                                    });
                                    setShowConfirmModal(true);
                                }}
                                style={{ padding: '7px 12px', borderRadius: '10px', border: '1px solid #ea4335', background: 'rgba(234, 67, 53, 0.05)', color: '#ea4335', fontSize: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234, 67, 53, 0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(234, 67, 53, 0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                SYNC GMAIL
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            {/* Backup/Restore Controls */}
                            <div style={{ display: 'flex', gap: '4px', marginRight: '4px' }}>
                                <button 
                                    onClick={handleBackupRegistry}
                                    style={{ background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', color: '#555' }}
                                    title="Backup Registry to Cloud"
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                </button>
                                <button 
                                    onClick={handleRestoreRegistry}
                                    style={{ background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', color: '#555' }}
                                    title="Restore Registry from Backup"
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                </button>
                                <button 
                                    onClick={handleExportToCSV}
                                    style={{ background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', color: '#555' }}
                                    title="Export Registry to CSV (Excel)"
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><polyline points="9 15 12 18 15 15"></polyline></svg>
                                </button>
                            </div>

                            {externalFounders.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {selectedFounderIds.length > 0 && (
                                        <button 
                                            onClick={handleRemoveSelectedFounders}
                                            style={{ background: '#ff3b30', border: 'none', color: '#fff', fontSize: '10px', fontWeight: '800', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', animation: 'fadeInRight 0.3s' }}
                                        >
                                            Delete ({selectedFounderIds.length})
                                        </button>
                                    )}
                                    <div 
                                        onClick={toggleSelectAll}
                                        style={{ 
                                            width: '20px', height: '20px', borderRadius: '6px', border: '2px solid #000', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                            backgroundColor: selectedFounderIds.length > 0 && selectedFounderIds.length === externalFounders.filter(f => f.email.toLowerCase().includes(founderSearch.toLowerCase()) || (f.name && f.name.toLowerCase().includes(founderSearch.toLowerCase()))).length ? '#000' : 'transparent', 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        title="Select All"
                                    >
                                        {selectedFounderIds.length > 0 && selectedFounderIds.length === externalFounders.filter(f => f.email.toLowerCase().includes(founderSearch.toLowerCase()) || (f.name && f.name.toLowerCase().includes(founderSearch.toLowerCase()))).length && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                    </div>
                                </div>
                            )}
                        </div>

                    {/* Filter Menu Bar */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                        {[
                            { id: 'all', label: 'All', count: externalFounders.length, icon: (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg>
                            )},
                            { id: 'duplicates', label: 'Duplicate', count: externalFounders.filter(f => externalFounders.filter(x => x.email.toLowerCase() === f.email.toLowerCase()).length > 1).length, icon: (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            )},
                            { id: 'gmail', label: 'Gmail', count: externalFounders.filter(f => f.email.toLowerCase().includes('gmail.com') || f.email.toLowerCase().includes('googlemail.com')).length, icon: (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            )},
                            { id: 'yahoo', label: 'Yahoo', count: externalFounders.filter(f => f.email.toLowerCase().includes('yahoo.') || f.email.toLowerCase().includes('ymail.com')).length, icon: (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21V12M12 12l8-8M12 12L4 4"></path></svg>
                            )},
                            { id: 'other', label: 'Other', count: externalFounders.filter(f => !f.email.toLowerCase().includes('gmail.com') && !f.email.toLowerCase().includes('googlemail.com') && !f.email.toLowerCase().includes('yahoo.') && !f.email.toLowerCase().includes('ymail.com')).length, icon: (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            )},
                            { id: 'invalid', label: 'Invalid', count: externalFounders.filter(f => {
                                const email = f.email.toLowerCase();
                                const isBasicValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                                const hasIncompleteDomain = email.includes('@') && (email.split('@')[1].split('.').length < 2 || email.split('@')[1].split('.').some(part => part.length < 2));
                                return !isBasicValid || hasIncompleteDomain;
                            }).length, icon: (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            )}
                        ].map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setSidebarFilter(filter.id)}
                                style={{
                                    whiteSpace: 'nowrap',
                                    padding: '7px 14px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    letterSpacing: '0.02em',
                                    border: '1px solid',
                                    borderColor: sidebarFilter === filter.id ? '#000' : 'rgba(0,0,0,0.06)',
                                    backgroundColor: sidebarFilter === filter.id ? '#000' : 'rgba(255,255,255,0.7)',
                                    color: sidebarFilter === filter.id ? '#fff' : '#555',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    flexShrink: 0,
                                    boxShadow: sidebarFilter === filter.id ? '0 4px 12px rgba(0,0,0,0.12)' : 'none'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', opacity: sidebarFilter === filter.id ? 1 : 0.7 }}>{filter.icon}</span>
                                <span>{filter.label.toUpperCase()}</span>
                                <span style={{ 
                                    padding: '2px 6px', 
                                    backgroundColor: sidebarFilter === filter.id ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)', 
                                    borderRadius: '5px',
                                    fontSize: '9px',
                                    fontWeight: '900',
                                    opacity: 0.9,
                                    minWidth: '20px',
                                    textAlign: 'center'
                                }}>{filter.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <input 
                            value={founderSearch}
                            onChange={e => setFounderSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') setFounderSearch(''); }}
                            placeholder="Search by name or email..."
                            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', backgroundColor: 'rgba(0,0,0,0.02)', fontSize: '13px', outline: 'none', transition: 'all 0.2s' }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.backgroundColor = '#fff'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'; }}
                        />
                        <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>

                    {getFuzzySearchSuggestion() && (
                        <div style={{ padding: '8px 12px', backgroundColor: 'rgba(0,122,255,0.05)', borderRadius: '10px', marginBottom: '1rem', border: '1px solid rgba(0,122,255,0.1)', animation: 'fadeInDown 0.3s' }}>
                            <div style={{ fontSize: '11px', color: '#007aff', fontWeight: '700', marginBottom: '4px' }}>Did you mean?</div>
                            <div 
                                onClick={() => { setFounderSearch(getFuzzySearchSuggestion().email); }}
                                style={{ fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <span>{getFuzzySearchSuggestion().email}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </div>
                        </div>
                    )}
                      <div 
                        style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}
                        onScroll={(e) => {
                            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                            // Trigger pre-load when 10 items are left (approx 800px) so user doesn't wait
                            if (scrollHeight - scrollTop <= clientHeight + 800) {
                                setVisibleExternalCount(prev => prev + 30);
                            }
                        }}
                    >
                        {filteredFounders.slice(0, visibleExternalCount).map((u, i) => (
                            <div 
                                key={u.id} 
                                onClick={() => { setSelectedExternalFounder(u); fetchFounderMessages(u.email); }}
                                style={{ 
                                    display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 12px', 
                                    border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer',
                                    borderRadius: '0',
                                    backgroundColor: selectedExternalFounder?.id === u.id ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.015)',
                                    transition: 'all 0.2s',
                                    marginBottom: '8px',
                                    position: 'relative'
                                }}
                                onMouseEnter={e => { if(selectedExternalFounder?.id !== u.id) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)' }}
                                onMouseLeave={e => { if(selectedExternalFounder?.id !== u.id) e.currentTarget.style.backgroundColor = 'transparent' }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); toggleFounderSelection(u.id); }}
                                        style={{ 
                                            width: '18px', height: '18px', borderRadius: '5px', border: '2px solid #000', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                            backgroundColor: selectedFounderIds.includes(u.id) ? '#000' : 'transparent', 
                                            cursor: 'pointer', flexShrink: 0, marginTop: '2px',
                                            transition: 'all 0.1s'
                                        }}
                                    >
                                        {selectedFounderIds.includes(u.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                    </div>
                                    {u.replyCount > 0 && (
                                        <div style={{ 
                                            position: 'absolute', top: '-8px', left: '-8px', 
                                            backgroundColor: '#ff3b30', color: '#fff', 
                                            fontSize: '9px', fontWeight: '900', 
                                            minWidth: '16px', height: '16px', borderRadius: '8px', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: '0 4px', boxShadow: '0 2px 5px rgba(255,59,48,0.4)',
                                            zIndex: 2,
                                            border: '2px solid #fff'
                                        }}>
                                            {u.replyCount}
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#888', width: '22px', flexShrink: 0, marginTop: '4px' }}>
                                    {i + 1}.
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {u.name || 'External Founder'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6300dd', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {u.email}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                        <div style={{ fontSize: '11px', color: '#ff9500', fontWeight: '600', backgroundColor: 'rgba(255,149,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                            External
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRemoveExternalFounder(u.email); }}
                                            style={{ background: 'none', border: 'none', color: '#ff3b30', fontSize: '10px', fontWeight: '700', cursor: 'pointer', opacity: 0.6 }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                            onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {selectedExternalFounder ? (
                    /* Individual Chat Interface */
                    <div className="glass-card" style={{ flex: 1, padding: '2.5rem', borderRadius: '0', height: 'calc(100vh - 20px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '2rem' }}>
                            <button 
                                onClick={() => {
                                    setSelectedExternalFounder(null);
                                    localStorage.removeItem('xf_admin_selected_founder_email');
                                }} 
                                style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                            </button>
                            <div>
                                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>{selectedExternalFounder.name}</h3>
                                <div style={{ fontSize: '13px', color: '#666' }}>{selectedExternalFounder.email}</div>
                            </div>
                        </div>

                        {/* Messages Thread */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {founderMessages.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '1rem' }}>✉️</div>
                                    <div style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>No messages in this thread.</div>
                                    <div style={{ color: '#aaa', fontSize: '12px' }}>Start the conversation by sending a mail.</div>
                                </div>
                            )}
                            {founderMessages.map((m, idx) => (
                                <div key={idx} style={{ 
                                    alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%',
                                    padding: '12px 16px',
                                    borderRadius: m.sender === 'admin' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    backgroundColor: m.sender === 'admin' ? '#000' : '#fff',
                                    color: m.sender === 'admin' ? '#fff' : '#000',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    position: 'relative'
                                }}>
                                    {m.subject && <div style={{ fontSize: '11px', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase', opacity: 0.7 }}>{m.subject}</div>}
                                    {m.imageUrl && (
                                        <img 
                                            src={m.imageUrl} 
                                            alt="attachment" 
                                            style={{ maxWidth: '100%', borderRadius: '12px', marginTop: '4px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }} 
                                            onClick={() => window.open(m.imageUrl, '_blank')}
                                        />
                                    )}
                                    <div style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.5' }}>{m.text}</div>
                                    <div style={{ fontSize: '10px', color: m.sender === 'admin' ? 'rgba(255,255,255,0.6)' : '#999', marginTop: '6px', textAlign: 'right' }}>
                                        {new Date(m.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
                            <input 
                                value={individualMailSubject}
                                onChange={e => setIndividualMailSubject(e.target.value)}
                                placeholder="Subject (Optional)"
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '600', outline: 'none' }}
                                onFocus={e => e.currentTarget.style.borderColor = '#000'}
                                onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
                            />
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                <textarea 
                                    value={individualMailText}
                                    onChange={e => setIndividualMailText(e.target.value)}
                                    placeholder="Type your message here..."
                                    style={{ flex: 1, minHeight: '100px', padding: '14px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontFamily: 'Inter, sans-serif', resize: 'none', outline: 'none' }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#000'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
                                />
                                <input 
                                    type="file" 
                                    id="image-upload-input" 
                                    hidden 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                />
                                <button 
                                    onClick={() => document.getElementById('image-upload-input').click()}
                                    disabled={isUploadingImage}
                                    style={{ 
                                        width: '56px', height: '56px', borderRadius: '28px', 
                                        backgroundColor: 'rgba(0,0,0,0.05)', 
                                        color: '#000', border: 'none', display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        opacity: isUploadingImage ? 0.5 : 1
                                    }}
                                >
                                    {isUploadingImage ? (
                                        <div style={{ width: '20px', height: '20px', border: '2px solid #ccc', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    ) : (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                    )}
                                </button>
                                <button 
                                    onClick={handleSendIndividualMail}
                                    disabled={!individualMailText.trim()}
                                    style={{ 
                                        width: '56px', height: '56px', borderRadius: '28px', 
                                        backgroundColor: individualMailText.trim() ? '#000' : '#ccc', 
                                        color: '#fff', border: 'none', display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', cursor: individualMailText.trim() ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseEnter={e => { if(individualMailText.trim()) e.currentTarget.style.transform = 'scale(1.05)' }}
                                    onMouseLeave={e => { if(individualMailText.trim()) e.currentTarget.style.transform = 'scale(1)' }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card" style={{ flex: 1, padding: '2rem', borderRadius: '0', position: 'relative', height: 'calc(100vh - 20px)', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', fontSize: '1.5rem' }}>Cold Mail</h3>
                        
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', backgroundColor: 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: '12px', width: 'fit-content' }}>
                                <label style={{ fontSize: '14px', fontWeight: '700', cursor: 'pointer' }} onClick={() => setSendToAll(!sendToAll)}>Send to all External Founders</label>
                                <div 
                                    onClick={() => setSendToAll(!sendToAll)}
                                    style={{ 
                                        width: '44px', height: '24px', 
                                        backgroundColor: sendToAll ? '#34c759' : '#e5e5ea', 
                                        borderRadius: '12px', 
                                        position: 'relative', 
                                        cursor: 'pointer',
                                        transition: 'background-color 0.3s'
                                    }}
                                >
                                    <div style={{
                                        width: '20px', height: '20px',
                                        backgroundColor: '#fff',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        top: '2px',
                                        left: sendToAll ? '22px' : '2px',
                                        transition: 'left 0.3s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }} />
                                </div>
                            </div>
                            
                            <div style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                                {getEmailSuggestion(coldEmailsText) && (
                                    <div style={{ backgroundColor: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.2)', padding: '10px 14px', borderRadius: '10px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', animation: 'fadeInDown 0.3s' }}>
                                        <div style={{ fontSize: '12px', color: '#cc7700', fontWeight: '600' }}>
                                            Did you mean <span style={{ color: '#000' }}>{getEmailSuggestion(coldEmailsText).suggestion}</span> instead of {getEmailSuggestion(coldEmailsText).original}?
                                        </div>
                                        <button 
                                            onClick={() => applyEmailSuggestion(getEmailSuggestion(coldEmailsText))} 
                                            style={{ background: '#ff9500', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: 'transform 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        >Apply Correction</button>
                                    </div>
                                )}
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>Paste Emails (comma or newline separated)</label>
                                <textarea 
                                    value={coldEmailsText}
                                    onChange={(e) => setColdEmailsText(e.target.value)}
                                    placeholder="example1@mail.com, example2@mail.com\nexample3@mail.com"
                                    style={{ width: '100%', minHeight: '350px', padding: '12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.8)', fontSize: '14px', fontFamily: 'Inter, sans-serif', resize: 'vertical' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                    <button 
                                        onClick={handleAddExternalFounders}
                                        disabled={!coldEmailsText.trim()}
                                        style={{ 
                                            padding: '10px 20px', 
                                            backgroundColor: coldEmailsText.trim() ? '#000' : '#ccc', 
                                            color: '#fff', 
                                            border: 'none', 
                                            borderRadius: '10px', 
                                            fontSize: '13px', 
                                            fontWeight: '700', 
                                            cursor: coldEmailsText.trim() ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => { if(coldEmailsText.trim()) e.currentTarget.style.transform = 'scale(1.02)' }}
                                        onMouseLeave={e => { if(coldEmailsText.trim()) e.currentTarget.style.transform = 'scale(1)' }}
                                    >
                                        Add to Founders Registry
                                    </button>
                                </div>
                                
                                {coldEmailsText && (
                                    <div style={{ marginTop: '1.5rem' }}>
                                        <h4 style={{ fontSize: '13px', color: '#666', marginBottom: '12px', fontWeight: '700' }}>Parsed Valid Emails ({coldEmailsText.split(/[,\n]/).map(e => e.trim()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).length}):</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                                            {coldEmailsText.split(/[,\n]/).map(e => e.trim()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).map((email, idx) => (
                                                <span key={idx} style={{ padding: '6px 12px', backgroundColor: 'rgba(0,122,255,0.1)', color: '#007aff', borderRadius: '16px', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(0,122,255,0.2)' }}>
                                                    {email}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* FAB */}
                        <button 
                            onClick={() => setShowDraftModal(true)}
                            style={{ 
                                position: 'absolute', 
                                bottom: '2rem', 
                                right: '2rem', 
                                width: '60px', 
                                height: '60px', 
                                borderRadius: '30px', 
                                backgroundColor: '#000', 
                                color: '#fff', 
                                border: 'none', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                cursor: 'pointer', 
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                transition: 'transform 0.2s',
                                zIndex: 100
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            title="Draft Mail"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </div>
                )}
            </div>

                {/* Draft Modal */}
                {showDraftModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeInUp 0.2s ease-out' }}>
                        <div className="glass-card" style={{ width: '600px', maxWidth: '90%', padding: '2.5rem', borderRadius: '24px', backgroundColor: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', position: 'relative' }}>
                            <button onClick={() => setShowDraftModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', color: '#666', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '800' }}>Draft Email</h3>
                            
                            <input 
                                value={draftSubject}
                                onChange={e => setDraftSubject(e.target.value)}
                                placeholder="Subject" 
                                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', marginBottom: '1rem', fontSize: '15px', fontWeight: '600', outline: 'none', transition: 'border-color 0.2s' }}
                                onFocus={e => e.currentTarget.style.borderColor = '#000'}
                                onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
                            />
                            
                            <textarea 
                                value={draftMessage}
                                onChange={e => setDraftMessage(e.target.value)}
                                placeholder="Write your message here... (HTML supported)" 
                                style={{ width: '100%', height: '250px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', marginBottom: '1.5rem', fontSize: '14px', resize: 'vertical', fontFamily: 'Inter, sans-serif', outline: 'none', transition: 'border-color 0.2s' }}
                                onFocus={e => e.currentTarget.style.borderColor = '#000'}
                                onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
                            />
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button onClick={() => setShowDraftModal(false)} style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>Cancel</button>
                                <button onClick={handleSendColdMail} style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: '#000', color: '#fff', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                    Send Mail
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )}
        {/* Toast Notification */}
        {showToast && (
          <div style={{ 
            position: 'fixed', 
            bottom: '40px', 
            right: '40px', 
            backgroundColor: '#fff', 
            padding: '16px 24px', 
            borderRadius: '12px', 
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 5000,
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            borderLeft: '6px solid #4caf50',
            minWidth: '280px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="16 12 12 8 8 12"></polyline><line x1="12" y1="16" x2="12" y2="8"></line></svg>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a', flex: 1 }}>{toastMessage}</span>
            <div 
                onClick={() => setShowToast(false)} 
                style={{ 
                    cursor: 'pointer', 
                    color: '#ccc', 
                    fontSize: '18px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '4px',
                    marginLeft: '8px'
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </div>
          </div>
        )}

        {/* Real-time Sending Progress */}
        {sendingStatus && (
            <div style={{ 
                position: 'fixed', 
                bottom: '40px', 
                right: '40px', 
                backgroundColor: '#000', 
                padding: '20px 24px', 
                borderRadius: '20px', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                color: '#fff',
                zIndex: 6000,
                minWidth: '320px',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', backgroundColor: '#34c759', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                        <span style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.05em' }}>SENDING PROGRESS</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', opacity: 0.7 }}>{sendingStatus.count} / {sendingStatus.total}</span>
                </div>
                
                <div style={{ marginBottom: '14px', backgroundColor: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${(sendingStatus.count / sendingStatus.total) * 100}%`, 
                        height: '100%', 
                        backgroundColor: '#fff', 
                        transition: 'width 0.3s ease-out' 
                    }}></div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '12px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"></path><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '10px', fontWeight: '800', opacity: 0.5, marginBottom: '2px' }}>CURRENT RECIPIENT</div>
                        <div style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sendingStatus.current}</div>
                    </div>
                </div>
            </div>
        )}
        {activeTab === 'Settings' && (
            <div style={{ animation: 'fadeInUp 0.4s ease-out', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2.5rem' }}>
                    <h2 style={{ margin: 0, fontWeight: '900', fontSize: '2rem', letterSpacing: '-0.02em' }}>Settings</h2>
                    <p style={{ margin: '8px 0 0 0', color: '#667777', fontSize: '15px', fontWeight: '500' }}>Configure platform parameters and external integrations</p>
                </div>

                <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '32px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
                        <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(234, 67, 53, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea4335' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>Gmail API Integration</h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#667777', fontWeight: '600' }}>Required for synchronizing external email history</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '800', color: '#1a1a1a', letterSpacing: '0.02em' }}>GMAIL CLIENT ID</label>
                            <input 
                                value={gmailClientId}
                                onChange={e => setGmailClientId(e.target.value)}
                                placeholder="Enter your Google Cloud Project Client ID..."
                                style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '600', outline: 'none', transition: 'all 0.2s', backgroundColor: 'rgba(0,0,0,0.02)' }}
                                onFocus={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.backgroundColor = '#fff'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'; }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '800', color: '#1a1a1a', letterSpacing: '0.02em' }}>GMAIL CLIENT SECRET</label>
                            <input 
                                type="password"
                                value={gmailClientSecret}
                                onChange={e => setGmailClientSecret(e.target.value)}
                                placeholder="••••••••••••••••••••••••"
                                style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '600', outline: 'none', transition: 'all 0.2s', backgroundColor: 'rgba(0,0,0,0.02)' }}
                                onFocus={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.backgroundColor = '#fff'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'; }}
                            />
                        </div>

                        <div style={{ marginTop: '1rem', padding: '1.25rem', backgroundColor: 'rgba(0,122,255,0.05)', borderRadius: '16px', border: '1px solid rgba(0,122,255,0.1)' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#007aff' }}>Developer Note</h4>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#007aff', opacity: 0.8, lineHeight: '1.5' }}>Ensure that the redirect URI in your Google Cloud Console is set to your production domain and that the Gmail API is enabled for your project.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
                        <button 
                            onClick={handleSaveSettings}
                            disabled={isSavingSettings}
                            style={{ 
                                padding: '14px 32px', borderRadius: '16px', border: 'none', background: '#000', color: '#fff', 
                                fontWeight: '800', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', 
                                display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' 
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {isSavingSettings ? (
                                <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                            )}
                            {isSavingSettings ? 'SAVING...' : 'SAVE CONFIGURATION'}
                        </button>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '32px', opacity: 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                        <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </div>
                        <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem' }}>General Configuration</h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Advanced system parameters are currently managed via the master CLI. UI controls for feature flags and maintenance mode coming in v2.4.</p>
                </div>
            </div>
        )}
      </main>
        {/* Confirmation Modal */}
        {showConfirmModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, animation: 'fadeIn 0.2s ease-out' }}>
                <div className="glass-card" style={{ width: '400px', padding: '2.5rem', borderRadius: '28px', backgroundColor: '#fff', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', position: 'relative' }}>
                    <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⚠️</div>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontWeight: '900', fontSize: '1.5rem', color: '#000' }}>Wait! Are you sure?</h3>
                    <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', marginBottom: '2rem', padding: '0 10px' }}>{confirmConfig.title}</p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '2rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => setSkipConfirm(!skipConfirm)}>
                        <div style={{ 
                            width: '20px', height: '20px', borderRadius: '6px', border: '2px solid #000', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            backgroundColor: skipConfirm ? '#000' : 'transparent', 
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: skipConfirm ? 'scale(1.1)' : 'scale(1)'
                        }}>
                            {skipConfirm && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#333' }}>Remember my choice</span>
                    </div>

                    <div style={{ display: 'flex', gap: '14px' }}>
                        <button 
                            onClick={() => setShowConfirmModal(false)} 
                            style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.1)', background: '#f5f5f7', color: '#000', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#e5e5ea'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f5f5f7'}
                        >Cancel</button>
                        <button 
                            onClick={() => { confirmConfig.onConfirm(); setShowConfirmModal(false); }} 
                            style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: '#ff3b30', color: '#fff', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(255, 59, 48, 0.2)' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >Confirm</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Admin;
