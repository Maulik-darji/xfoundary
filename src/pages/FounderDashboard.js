import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { onAuthStateChanged, updateProfile, updateEmail } from 'firebase/auth';
import { 
    doc, getDoc, updateDoc, onSnapshot, 
    collection, query, where, getDocs, addDoc, deleteDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, getBlob, deleteObject } from 'firebase/storage';
import Cropper from 'react-easy-crop';

const FounderDashboard = () => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [appData, setAppData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeTab, setActiveTab] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam) return tabParam;
        return localStorage.getItem('founderActiveTab') || 'company';
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [window.location.search]);

    useEffect(() => {
        localStorage.setItem('founderActiveTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (saving) {
                e.preventDefault();
                e.returnValue = 'Changes you made may not be saved.';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [saving]);
    const [jobs, setJobs] = useState([]);
    const [showJobModal, setShowJobModal] = useState(false);
    const [currentJob, setCurrentJob] = useState({ 
        role: '', 
        type: 'Full-time', 
        location: '', 
        description: '', 
        roleDescription: '',
        whatYouWillDo: '',
        whatYouNeed: '',
        whatIsInIt: '',
        technology: '',
        link: '' 
    });
    const [editingJobId, setEditingJobId] = useState(null);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const logoInputRef = useRef(null);

    // Image Upload & Crop State
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [sourceTarget, setSourceTarget] = useState('logo'); // 'logo' or 'profile'
    const [justSaved, setJustSaved] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showPhotoViewerModal, setShowPhotoViewerModal] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [flip, setFlip] = useState({ horizontal: false, vertical: false });
    const [activeEditorTab, setActiveEditorTab] = useState('crop'); // 'crop', 'filter', 'adjust'
    
    // Location Selector State
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [loc, setLoc] = useState({ country: '', state: '', city: '', otherCountry: '', otherState: '', otherCity: '' });
    const [applicants, setApplicants] = useState({});

    useEffect(() => {
        fetch('https://countriesnow.space/api/v0.1/countries/positions')
            .then(res => res.json())
            .then(data => {
                if (!data.error) setCountries(data.data.map(c => c.name).sort());
            })
            .catch(err => console.error("Error fetching countries:", err));
    }, []);

    const handleCountryChange = async (countryName) => {
        setLoc(prev => ({ ...prev, country: countryName, state: '', city: '', otherCountry: '', otherState: '', otherCity: '' }));
        setStates([]);
        setCities([]);
        if (countryName && countryName !== 'Other') {
            try {
                const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ country: countryName })
                });
                const data = await res.json();
                if (!data.error) setStates(data.data.states.map(s => s.name).sort());
            } catch (e) { console.error(e); }
        }
    };

    const handleStateChange = async (stateName) => {
        setLoc(prev => ({ ...prev, state: stateName, city: '', otherState: '', otherCity: '' }));
        setCities([]);
        if (stateName && stateName !== 'Other' && loc.country !== 'Other') {
            try {
                const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ country: loc.country, state: stateName })
                });
                const data = await res.json();
                if (!data.error) setCities(data.data.sort());
            } catch (e) { console.error(e); }
        }
    };

    const industryHierarchy = {
        'B2B': ['Analytics', 'Engineering, Product and Design', 'Finance and Accounting', 'Human Resources', 'Infrastructure', 'Legal', 'Marketing', 'Office Management', 'Operations', 'Productivity', 'Recruiting and Talent', 'Retail', 'Sales', 'Security', 'Supply Chain and Logistics'],
        'Consumer': ['Apparel and Cosmetics', 'Consumer Electronics', 'Content', 'Food and Beverage', 'Gaming', 'Home and Personal', 'Job and Career Services', 'Social', 'Transportation Services', 'Travel, Leisure and Tourism', 'Virtual and Augmented Reality'],
        'Fintech': ['Asset Management', 'Banking and Exchange', 'Consumer Finance', 'Credit and Lending', 'Insurance', 'Payments'],
        'Healthcare': ['Consumer Health and Wellness', 'Diagnostics', 'Drug Discovery and Delivery', 'Healthcare IT', 'Healthcare Services', 'Industrial Bio', 'Medical Devices', 'Therapeutics'],
        'Industrials': ['Agriculture', 'Automotive', 'Aviation and Space', 'Climate', 'Defense', 'Drones', 'Energy', 'Manufacturing and Robotics'],
        'Real Estate and Construction': ['Construction', 'Housing and Real Estate'],
        'Government': [],
        'Education': []
    };
    const parentCategories = Object.keys(industryHierarchy);

    const locationSuggestions = [
        "Ahmedabad, India", "Bengaluru, India", "Mumbai, India", "Delhi NCR, India", "Hyderabad, India", "Pune, India", "Chennai, India", "Kolkata, India", "Jaipur, India", "Surat, India",
        "San Francisco, USA", "New York, USA", "London, UK", "Singapore", "Berlin, Germany", "Tokyo, Japan", "Remote"
    ];

    useEffect(() => {
        let unsubDoc = null;
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    // Admin check
                    const adminCheck = await getDoc(doc(db, 'admins', currentUser.uid));
                    if (adminCheck.exists()) {
                        alert("Access Denied: Admin accounts cannot access the Founder Dashboard.");
                        await auth.signOut();
                        navigate('/login');
                        return;
                    }

                    const userRef = doc(db, 'users', currentUser.uid);
                    unsubDoc = onSnapshot(userRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            if (data.application && data.application.status === 'approved') {
                                setAppData(data.application);
                                setUserData(data);
                                setLoading(false);
                            } else {
                                navigate('/home');
                            }
                        } else {
                            navigate('/login');
                        }
                    });

                    // Fetch Jobs
                    const jobsQuery = query(collection(db, 'jobs'), where('founderId', '==', currentUser.uid));
                    const jobsSnap = await getDocs(jobsQuery);
                    const fetchedJobs = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setJobs(fetchedJobs);

                    // Fetch Applicants count for each job
                    const applicantsMap = {};
                    for (const job of fetchedJobs) {
                        const appQuery = query(collection(db, 'job_applications'), where('jobId', '==', job.id));
                        const appSnap = await getDocs(appQuery);
                        applicantsMap[job.id] = appSnap.size;
                    }
                    setApplicants(applicantsMap);
                } catch (err) {
                    console.error(err);
                    setLoading(false);
                }
            } else {
                navigate('/login');
            }
        });
        return () => {
            unsubscribeAuth();
            if (unsubDoc) unsubDoc();
        };
    }, [navigate]);

    const handleJobSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Build location string: "City, State, Country"
            const finalCity = loc.city === 'Other' ? loc.otherCity : (loc.city || '');
            const finalState = loc.state === 'Other' ? loc.otherState : (loc.state || '');
            const finalCountry = loc.country === 'Other' ? loc.otherCountry : (loc.country || '');
            
            const locationParts = [finalCity, finalState, finalCountry].filter(Boolean);
            const locationString = locationParts.join(', ');

            const jobData = {
                ...currentJob,
                location: locationString || currentJob.location,
                founderId: user.uid,
                companyName: appData.companyName || '',
                companyLogo: appData.companyLogo || '', 
                batch: appData.batch || 'S26',
                createdAt: currentJob.createdAt || new Date().toISOString(),
                status: 'active'
            };

            if (editingJobId) {
                await updateDoc(doc(db, 'jobs', editingJobId), jobData);
                setJobs(jobs.map(j => j.id === editingJobId ? { id: editingJobId, ...jobData } : j));
            } else {
                const docRef = await addDoc(collection(db, 'jobs'), jobData);
                setJobs([...jobs, { id: docRef.id, ...jobData }]);
            }

            setShowJobModal(false);
            setEditingJobId(null);
            setCurrentJob({ role: '', type: 'Full-time', location: '' });
            setLoc({ country: '', state: '', city: '', otherCountry: '', otherState: '', otherCity: '' });
            setMessage({ text: 'Job posted successfully!', type: 'success', id: Date.now() });
        } catch (err) {
            console.error(err);
            setMessage({ text: 'Error saving job.', type: 'error', id: Date.now() });
        } finally {
            setSaving(false);
        }
    };

    const handleSyncBranding = async (job) => {
        try {
            const updatedData = {
                companyName: appData.companyName || '',
                companyLogo: appData.companyLogo || '',
                batch: appData.batch || 'S26'
            };
            await updateDoc(doc(db, 'jobs', job.id), updatedData);
            setJobs(jobs.map(j => j.id === job.id ? { ...j, ...updatedData } : j));
            setMessage({ text: 'Branding synced!', type: 'success', id: Date.now() });
        } catch (err) {
            console.error(err);
        }
    };

    const deleteJob = async (id) => {
        if (!window.confirm('Delete this job posting?')) return;
        try {
            await deleteDoc(doc(db, 'jobs', id));
            setJobs(jobs.filter(j => j.id !== id));
        } catch (err) { console.error(err); }
    };

    const handleCompanySave = async (e) => {
        e.preventDefault();
        if (!user || !appData) return;
        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            const userRef = doc(db, 'users', user.uid);
            // Build industries array: [parent] or [parent, subCategory]
            const parent = appData.category || '';
            const sub = appData.subCategory || '';
            const industries = sub ? [parent, sub] : [parent];
            await updateDoc(userRef, {
                'application.companyName': appData.companyName || '',
                'application.companyDescription': appData.companyDescription || '',
                'application.basedIn': appData.basedIn || '',
                'application.category': parent,
                'application.subCategory': sub,
                'application.industries': industries,
                'application.companyUrl': appData.companyUrl || '',
                'application.socials': appData.socials || {}
            });
            setMessage({ text: 'SAVED', type: 'success' });
            setJustSaved(true);
            setTimeout(() => {
                setMessage({ text: '', type: '' });
                setJustSaved(false);
            }, 3000);
        } catch (error) {
            console.error("Error saving data:", error);
            setMessage({ text: 'Failed to update company info. Please try again.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        if (!user || !userData) return;
        setSaving(true);
        setMessage({ text: 'Saving changes...', type: 'info' });
        try {
            const updates = {};
            const userDocUpdates = {};

            // Only update displayName if changed
            const newName = userData.profile?.name || '';
            if (newName && newName !== user.displayName) {
                await updateProfile(user, { displayName: newName });
            }

            // Only update Email if changed
            if (userData.email && userData.email.toLowerCase() !== user.email?.toLowerCase()) {
                try {
                    await updateEmail(user, userData.email);
                } catch (emailErr) {
                    if (emailErr.code === 'auth/requires-recent-login') {
                        throw new Error("Changing email requires a recent login. Please log out and back in to proceed.");
                    }
                    throw emailErr;
                }
            }

            // Update Firestore
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'profile.name': newName,
                'username': userData.username || '',
                'email': userData.email || user.email,
                'socials': userData.socials || {}
            });

            setMessage({ text: 'SAVED', type: 'success', id: Date.now() });
            setJustSaved(true);
            setTimeout(() => {
                setMessage({ text: '', type: '', id: 0 });
                setJustSaved(false);
            }, 3000);
        } catch (error) {
            console.error("Error saving profile:", error);
            const errMsg = error instanceof Error ? error.message : String(error);
            setMessage({ text: 'Failed to update: ' + errMsg, type: 'error', id: Date.now() });
        } finally {
            setSaving(false);
        }
    };

    const handleDrivePicker = () => {
        alert("Google Drive integration is coming soon! Please use 'Browse from Device' for now.");
    };

    const handleFileChange = (e, target) => {
        const file = e.target.files[0];
        if (!file) return;

        setSourceTarget(target);
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = () => {
            setPreviewUrl(reader.result);
            setShowCropModal(true);
            setShowSourceModal(false);
        };
        reader.readAsDataURL(file);
    };

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const confirmImageUpload = async (useCrop = false) => {
        if (!selectedFile && !previewUrl) return;

        setSaving(true);
        setShowPreviewModal(false);
        setShowCropModal(false);
        setUploadProgress(0);
        const currentMsgId = Date.now();
        setMessage({ text: 'Preparing image...', type: 'info', id: currentMsgId });

        try {
            let fileToUpload = selectedFile;

            if (useCrop && croppedAreaPixels) {
                let imgSource = previewUrl;
                
                if (previewUrl.includes('firebasestorage.googleapis.com')) {
                    setMessage({ text: 'Verifying session...', type: 'info', id: currentMsgId });
                    try {
                        const storageRef = ref(storage, `profile_images/original_${user.uid}`);
                        
                        const fetchWithTimeout = async (promise, ms) => {
                            const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout")), ms));
                            return await Promise.race([promise, timeout]);
                        };

                        const fetchBlob = async (useAuth = false) => {
                            const options = {};
                            if (useAuth) {
                                const token = await user.getIdToken();
                                options.headers = { 'Authorization': `Bearer ${token}` };
                            }
                            const response = await fetch(previewUrl, options);
                            if (!response.ok) throw new Error("Fetch failed");
                            return await response.blob();
                        };

                        let blob;
                        try {
                            // Try multiple methods in parallel with a strict 10s global timeout
                            blob = await fetchWithTimeout(
                                Promise.any([
                                    getBlob(storageRef),
                                    fetchBlob(false),
                                    getBlob(ref(storage, `profile_images/${user.uid}`))
                                ]), 
                                10000
                            );
                        } catch (e) {
                            try {
                                // Final attempt with Auth token
                                blob = await fetchWithTimeout(fetchBlob(true), 5000);
                            } catch (authErr) {
                                throw new Error("Security blocked re-edit. Please re-upload the original file.");
                            }
                        }

                        imgSource = URL.createObjectURL(blob);
                    } catch (err) {
                        console.error("All secure retrieval methods failed:", err);
                        throw new Error("Security blocked re-edit. Please 'Browse from Device' and re-upload the file.");
                    }
                }

                setMessage({ text: 'Applying orientation...', type: 'info', id: currentMsgId });
                const image = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error("Image editor failed to initialize."));
                    img.src = imgSource;
                    setTimeout(() => reject(new Error("Image load timed out.")), 15000);
                });

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const rotRad = (rotation * Math.PI) / 180;
                
                const { width: bWidth, height: bHeight } = {
                    width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
                    height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
                };

                canvas.width = bWidth;
                canvas.height = bHeight;
                ctx.translate(bWidth / 2, bHeight / 2);
                ctx.rotate(rotRad);
                ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
                ctx.drawImage(image, -image.width / 2, -image.height / 2);

                const croppedCanvas = document.createElement('canvas');
                croppedCanvas.width = croppedAreaPixels.width;
                croppedCanvas.height = croppedAreaPixels.height;
                const croppedCtx = croppedCanvas.getContext('2d');

                croppedCtx.drawImage(
                    canvas,
                    croppedAreaPixels.x,
                    croppedAreaPixels.y,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height,
                    0,
                    0,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height
                );

                setMessage({ text: 'Finalizing...', type: 'info', id: currentMsgId });
                fileToUpload = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error("Canvas processing timed out.")), 10000);
                    croppedCanvas.toBlob((blob) => {
                        clearTimeout(timeout);
                        if (blob) resolve(blob);
                        else reject(new Error("Failed to process cropped area."));
                    }, 'image/png');
                });
                
                // Clean up object URL
                if (imgSource.startsWith('blob:')) URL.revokeObjectURL(imgSource);
            }

            if (!fileToUpload) {
                if (selectedFile) fileToUpload = selectedFile;
                else throw new Error("No image data found to upload.");
            }

            setMessage({ text: 'Uploading...', type: 'info', id: currentMsgId });
            const progressMap = { main: 0 };
            
            const uploadWithProgress = (storageRef, file, key, currentProgressMap) => {
                return new Promise((resolve, reject) => {
                    const uploadTask = uploadBytesResumable(storageRef, file);
                    uploadTask.on('state_changed', 
                        (snap) => {
                            const p = (snap.bytesTransferred / snap.totalBytes) * 100;
                            currentProgressMap[key] = p;
                            const avg = Object.values(currentProgressMap).reduce((a, b) => a + b, 0) / Object.keys(currentProgressMap).length;
                            setUploadProgress(Math.round(avg));
                        },
                        (err) => reject(err),
                        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                    );
                });
            };

            if (sourceTarget === 'logo') {
                const currentMsgId = Date.now();
                const storageRef = ref(storage, `company_logos/${user.uid}/logo.png`);
                const croppedPromise = uploadWithProgress(storageRef, fileToUpload, 'main', progressMap);

                let originalLogoURL = appData.originalCompanyLogo || appData.companyLogo || '';
                if (selectedFile) {
                    const originalRef = ref(storage, `company_logos/${user.uid}/original.png`);
                    originalLogoURL = await uploadWithProgress(originalRef, selectedFile, 'orig', progressMap);
                }

                const rawDownloadURL = await croppedPromise;
                const downloadURL = rawDownloadURL + (rawDownloadURL.includes('?') ? '&' : '?') + 't=' + Date.now();

                await updateDoc(doc(db, 'users', user.uid), { 
                    'application.companyLogo': downloadURL,
                    'application.originalCompanyLogo': originalLogoURL
                });
                
                setMessage({ text: 'Logo updated successfully!', type: 'success', id: Date.now() });
            } else {
                if (selectedFile) progressMap.orig = 0;
                const currentMsgId = Date.now();
                
                // New structured paths: profile_images/USER_ID/filename
                const storageRef = ref(storage, `profile_images/${user.uid}/cropped.png`);
                const croppedPromise = uploadWithProgress(storageRef, fileToUpload, 'main', progressMap);

                let originalURL = userData.originalPhotoURL || userData.photoURL || '';
                if (selectedFile) {
                    const originalRef = ref(storage, `profile_images/${user.uid}/original.png`);
                    originalURL = await uploadWithProgress(originalRef, selectedFile, 'orig', progressMap);
                }

                const rawDownloadURL = await croppedPromise;
                // Add timestamp to bypass browser cache
                const downloadURL = rawDownloadURL + (rawDownloadURL.includes('?') ? '&' : '?') + 't=' + Date.now();
                
                setMessage({ text: 'Updating profile...', type: 'info', id: currentMsgId });
                await updateProfile(user, { photoURL: downloadURL });
                await updateDoc(doc(db, 'users', user.uid), { 
                    photoURL: downloadURL,
                    originalPhotoURL: originalURL 
                });
                
                setMessage({ text: 'Photo updated successfully!', type: 'success', id: Date.now() });
            }

            setUploadProgress(0);
            setTimeout(() => setMessage({ text: '', type: '', id: 0 }), 5000);
            setPreviewUrl(null);
            setSelectedFile(null);
        } catch (error) {
            console.error("Critical Upload Error:", error);
            const errMsg = error instanceof Error ? error.message : String(error);
            setMessage({ text: 'Upload failed: ' + errMsg, type: 'error', id: Date.now() });
            setUploadProgress(0);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveLogo = async () => {
        if (!window.confirm("Are you sure you want to remove the company logo?")) return;
        
        setSaving(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { 
                'application.companyLogo': '' 
            });
            setAppData({ ...appData, companyLogo: '' });
            setMessage({ text: 'Company logo removed!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        } catch (error) {
            console.error("Error removing logo:", error);
            setMessage({ text: 'Failed to remove logo.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveProfileImage = async () => {
        if (!window.confirm("Are you sure you want to remove your profile photo?")) return;
        
        setSaving(true);
        try {
            await updateProfile(user, { photoURL: '' });
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { 
                photoURL: '' 
            });
            setUserData({ ...userData, photoURL: '' });
            setMessage({ text: 'Profile photo removed!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        } catch (error) {
            console.error("Error removing photo:", error);
            setMessage({ text: 'Failed to remove photo.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading || !appData) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5ee' }}>
            <div className="logo-container">
                <span style={{ fontSize: '24px' }}>X</span>
            </div>
            <div style={{ fontSize: '18px', color: '#6300dd', fontWeight: 600 }}>Loading Dashboard...</div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5ee', display: 'flex' }}>
            <style>{`
                .simple-sidebar {
                    width: 240px;
                    background-color: #f5f5ee;
                    border-right: 1px solid #e5e5e0;
                    padding: 2.5rem 1.25rem;
                    height: 100vh;
                    position: fixed;
                    left: 0;
                    top: 0;
                    display: flex;
                    flex-direction: column;
                    z-index: 50;
                    padding-top: 100px;
                }
                .applicants-sidebar {
                    width: 300px;
                    background-color: #fff;
                    border-right: 1px solid #e5e5e0;
                    padding: 2.5rem 1.5rem;
                    height: 100vh;
                    position: fixed;
                    left: 240px;
                    top: 0;
                    z-index: 40;
                    padding-top: 100px;
                    overflow-y: auto;
                }
                .portal-main {
                    flex: 1;
                    margin-left: 540px;
                    padding: 5rem 4rem;
                    padding-top: 120px;
                    min-height: 100vh;
                }
                @keyframes toastIn {
                    0%  { opacity: 0; transform: translateY(20px) scale(0.95); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .portal-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    background-color: #fff;
                    font-size: 14px;
                    color: #333;
                    outline: none;
                    transition: all 0.2s ease;
                    font-family: 'Inter', sans-serif;
                }
                .portal-input:focus {
                    border-color: #6300dd;
                    box-shadow: 0 0 0 4px rgba(99, 0, 221, 0.05);
                }
                .label-text {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #111;
                    margin-bottom: 8px;
                    font-family: 'Inter', sans-serif;
                    text-transform: none;
                    letter-spacing: normal;
                }
                .nav-btn {
                    width: 100%;
                    text-align: left;
                    padding: 12px 16px;
                    border-radius: 8px;
                    border: none;
                    background: transparent;
                    font-size: 14px;
                    font-weight: 500;
                    color: #666;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 4px;
                }
                .nav-btn.active {
                    background: rgba(99, 0, 221, 0.05);
                    color: #6300dd;
                    font-weight: 700;
                }
                .nav-btn:hover:not(.active) {
                    background: rgba(0,0,0,0.03);
                }
            `}</style>


            <aside className="simple-sidebar">
                <div style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#111' }}>Founder Portal</h2>
                    <p style={{ fontSize: '11px', color: '#888', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manage your startup</p>
                </div>

                <nav style={{ flex: 1 }}>
                    <button 
                        className={`nav-btn ${activeTab === 'company' ? 'active' : ''}`}
                        onClick={() => setActiveTab('company')}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        Company Profile
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Account Settings
                    </button>
                    <button 
                        className={`nav-btn ${activeTab === 'jobs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('jobs')}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                        Startup Jobs
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #e5e5e0' }}>
                    <button className="nav-btn" onClick={() => navigate('/directory')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        View Directory
                    </button>
                </div>
            </aside>

            <div className="applicants-sidebar">
                <h2 style={{ fontSize: '12px', fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Job Activity</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {jobs.length > 0 ? jobs.map(job => (
                        <div key={job.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                {job.companyLogo && <img src={job.companyLogo} style={{ width: '24px', height: '24px', borderRadius: '4px' }} alt="" />}
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>{job.role}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: '#666' }}>{applicants[job.id] || 0} Applicants</span>
                                <div>
                                    <button 
                                        onClick={() => handleSyncBranding(job)}
                                        style={{ border: 'none', background: 'none', color: '#ff6600', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: '4px 8px' }}
                                    >
                                        Sync Branding
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setEditingJobId(job.id);
                                            setCurrentJob({ role: job.role, type: job.type, location: job.location, description: job.description, link: job.link });
                                            setShowJobModal(true);
                                        }}
                                        style={{ border: 'none', background: 'none', color: '#0073b1', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: '4px 8px' }}
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <p style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>No active jobs to track.</p>
                    )}
                </div>
            </div>

            <main className="portal-main">
                <div className="content-section">
                    {activeTab === 'company' ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem' }}>
                                <div 
                                    style={{ 
                                        width: '100px', 
                                        height: '100px', 
                                        borderRadius: '16px', 
                                        border: '1px solid #ddd', 
                                        background: '#fff', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ width: '100%', height: '100%' }} onClick={() => { 
                                        if (appData.companyLogo) {
                                            const sourceUrl = appData.originalCompanyLogo || appData.companyLogo;
                                            const bustSource = sourceUrl + (sourceUrl.includes('?') ? '&' : '?') + 'cache=' + Date.now();
                                            setPreviewUrl(bustSource);
                                            setSourceTarget('logo');
                                            setShowCropModal(true);
                                        } else {
                                            setSourceTarget('logo'); 
                                            setShowSourceModal(true);
                                        }
                                    }}>
                                        {appData.companyLogo ? (
                                            <img src={appData.companyLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <div style={{ fontSize: '11px', color: '#999', textAlign: 'center', padding: '10px' }}>Click to upload logo</div>
                                        )}
                                    </div>
                                    
                                    {appData.companyLogo && (
                                        <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '4px' }}>
                                            <button 
                                                type="button"
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    const sourceUrl = appData.originalCompanyLogo || appData.companyLogo;
                                                    const bustSource = sourceUrl + (sourceUrl.includes('?') ? '&' : '?') + 'cache=' + Date.now();
                                                    setPreviewUrl(bustSource);
                                                    setSourceTarget('logo');
                                                    setShowCropModal(true);
                                                }}
                                                style={{
                                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '50%',
                                                    width: '24px',
                                                    height: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    color: '#0073b1',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}
                                                title="Re-crop logo"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleRemoveLogo(); }}
                                                style={{
                                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '50%',
                                                    width: '24px',
                                                    height: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    color: '#ff4d4f',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}
                                                title="Remove logo"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}

                                </div>
                                <div>
                                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#111' }}>Company Profile</h1>
                                    <p style={{ color: '#666', marginTop: '6px', fontSize: '15px', marginBottom: '12px' }}>Information displayed in the public startup directory</p>
                                    <button 
                                        type="button"
                                        onClick={() => { setSourceTarget('logo'); setShowSourceModal(true); }}
                                        style={{ 
                                            background: '#f3f4f6', 
                                            border: '1px solid #ddd', 
                                            padding: '6px 12px', 
                                            borderRadius: '6px', 
                                            fontSize: '12px', 
                                            fontWeight: '600', 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                        Change Photo
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleCompanySave}>
                                <div className="form-group">
                                    <label className="label-text">Company Name</label>
                                    <input 
                                        className="portal-input"
                                        value={appData.companyName || ''}
                                        onChange={(e) => setAppData({...appData, companyName: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label-text">Category / Industry</label>
                                    <select
                                        className="portal-input"
                                        value={(() => {
                                            const cat = appData.category || '';
                                            return parentCategories.find(p => p === cat || industryHierarchy[p]?.includes(cat)) || '';
                                        })()}
                                        onChange={(e) => {
                                            const parent = e.target.value;
                                            setAppData({...appData, category: parent, subCategory: ''});
                                        }}
                                        required
                                        style={{ marginBottom: '10px' }}
                                    >
                                        <option value="">Select a category...</option>
                                        {parentCategories.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>

                                    {(() => {
                                        const parent = parentCategories.find(p => p === appData.category || industryHierarchy[p]?.includes(appData.category)) || appData.category;
                                        const subs = industryHierarchy[parent] || [];
                                        if (!parent || subs.length === 0) return null;
                                        const currentSub = subs.includes(appData.category) ? appData.category : (appData.subCategory || '');
                                        return (
                                            <select
                                                className="portal-input"
                                                value={currentSub}
                                                onChange={(e) => setAppData({...appData, subCategory: e.target.value, category: parent})}
                                            >
                                                <option value="">All of {parent} (no sub-category)</option>
                                                {subs.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        );
                                    })()}
                                </div>

                                <div className="form-group">
                                    <label className="label-text">Location (City, Country)</label>
                                    <input 
                                        className="portal-input"
                                        list="location-list"
                                        value={appData.basedIn || ''}
                                        onChange={(e) => setAppData({...appData, basedIn: e.target.value})}
                                        placeholder="e.g. Ahmedabad, India"
                                        required
                                    />
                                    <datalist id="location-list">
                                        {locationSuggestions.map(loc => <option key={loc} value={loc} />)}
                                    </datalist>
                                </div>

                                <div className="form-group">
                                    <label className="label-text">Website URL</label>
                                    <input 
                                        className="portal-input"
                                        value={appData.companyUrl || ''}
                                        onChange={(e) => setAppData({...appData, companyUrl: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label-text">Company Twitter/X URL</label>
                                    <input 
                                        className="portal-input"
                                        value={appData.socials?.twitter || ''}
                                        onChange={(e) => setAppData({...appData, socials: {...(appData.socials || {}), twitter: e.target.value}})}
                                        placeholder="https://x.com/yourcompany"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="label-text">One-line Description</label>
                                    <textarea 
                                        className="portal-input"
                                        style={{ minHeight: '100px', resize: 'vertical' }}
                                        value={appData.companyDescription || ''}
                                        onChange={(e) => setAppData({...appData, companyDescription: e.target.value})}
                                        required
                                    />
                                </div>

                                <div style={{ marginTop: '2.5rem' }}>
                                    <button type="submit" disabled={saving || justSaved} className="action-btn">
                                        {saving ? 'Updating...' : justSaved ? 'SAVED' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : activeTab === 'profile' ? (
                        <>
                            <h1 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '8px', color: '#000', letterSpacing: '-0.5px' }}>Account Settings</h1>
                            <p style={{ fontSize: '15px', color: '#666', marginBottom: '3.5rem' }}>Personal information and contact details</p>

                            <div style={{ display: 'flex', gap: '3rem', alignItems: 'flex-start', marginBottom: '4rem' }}>
                                <div style={{ width: '120px', textAlign: 'center' }}>
                                    <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 1.5rem' }}>
                                        <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: '50%', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                            {userData.photoURL ? (
                                                <img src={userData.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ fontSize: '32px', fontWeight: '800', color: '#ccc' }}>
                                                    {userData.profile?.name?.charAt(0).toUpperCase() || 'F'}
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => { setSourceTarget('profile'); setShowSourceModal(true); }}
                                            style={{ position: 'absolute', bottom: '0', right: '0', backgroundColor: '#6300dd', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(99, 0, 221, 0.3)' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                        </button>
                                    </div>
                                </div>

                                <div style={{ flex: 1, maxWidth: '600px' }}>
                                    <form onSubmit={handleProfileSave}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                            <div className="form-group">
                                                <label className="label-text">Display Name</label>
                                                <input 
                                                    className="portal-input"
                                                    value={userData.profile?.name || ''}
                                                    onChange={(e) => setUserData({...userData, profile: {...(userData.profile || {}), name: e.target.value}})}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="label-text">Username</label>
                                                <input 
                                                    className="portal-input"
                                                    value={userData.username || ''}
                                                    onChange={(e) => setUserData({...userData, username: e.target.value})}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="label-text">Email Address</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                                                <span style={{ fontSize: '14px', color: '#666', flex: 1 }}>{userData.email || user?.email}</span>
                                                <span style={{ fontSize: '12px', color: '#999', fontWeight: '600' }}>Primary</span>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="label-text">LinkedIn URL</label>
                                            <input 
                                                className="portal-input"
                                                value={userData.socials?.linkedin || ''}
                                                onChange={(e) => setUserData({...userData, socials: {...(userData.socials || {}), linkedin: e.target.value}})}
                                                placeholder="https://linkedin.com/in/username"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="label-text">Twitter / X URL</label>
                                            <input 
                                                className="portal-input"
                                                value={userData.socials?.twitter || ''}
                                                onChange={(e) => setUserData({...userData, socials: {...(userData.socials || {}), twitter: e.target.value}})}
                                                placeholder="https://x.com/username"
                                            />
                                        </div>

                                        <div style={{ marginTop: '2.5rem' }}>
                                            <button type="submit" disabled={saving || justSaved} className="action-btn">
                                                {saving ? 'Updating...' : justSaved ? 'SAVED' : 'Update Profile'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                                <div>
                                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#111' }}>Startup Jobs</h1>
                                    <p style={{ color: '#666', marginTop: '6px', fontSize: '15px' }}>Job openings at {appData.companyName}</p>
                                </div>
                                <button className="action-btn" onClick={() => { 
                                    setEditingJobId(null); 
                                    setCurrentJob({ role: '', type: 'Full-time', location: '', description: '', roleDescription: '', whatYouWillDo: '', whatYouNeed: '', whatIsInIt: '', technology: '', link: '' }); 
                                    setShowJobModal(true); 
                                }}>
                                    + Post Job
                                </button>
                            </div>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {jobs.length > 0 ? jobs.map(job => (
                                    <div key={job.id} style={{ padding: '1rem 1.25rem', border: '1px solid #e5e5e0', borderRadius: '4px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>{job.role}</h3>
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '13px', color: '#666' }}>
                                                <span>{job.type}</span>
                                                <span>&bull;</span>
                                                <span>{job.location}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => { setEditingJobId(job.id); setCurrentJob(job); setShowJobModal(true); }} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Edit</button>
                                            <button onClick={() => deleteJob(job.id)} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed #ddd', borderRadius: '4px', color: '#999', fontSize: '14px' }}>
                                        No active job postings.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Job Modal - Full Page Overlay */}
            {showJobModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: '#fff', zIndex: 1000, overflowY: 'auto' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                            <h2 style={{ margin: 0, fontWeight: '900', fontSize: '32px', letterSpacing: '-1px' }}>{editingJobId ? 'Edit Job Posting' : 'Create a New Job'}</h2>
                            <button onClick={() => setShowJobModal(false)} style={{ background: '#f5f5f2', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', color: '#666' }}>Close</button>
                        </div>
                        <form onSubmit={handleJobSave}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #eee' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {appData.companyLogo ? <img src={appData.companyLogo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontWeight: 'bold' }}>X</span>}
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{appData.companyName}</div>
                                    <div style={{ fontSize: '11px', color: '#666' }}>This branding will be attached to your post</div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label-text">Position Role</label>
                                <input className="portal-input" value={currentJob.role} onChange={e => setCurrentJob({...currentJob, role: e.target.value})} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div className="form-group">
                                    <label className="label-text">Job Type</label>
                                    <select className="portal-input" value={currentJob.type} onChange={e => setCurrentJob({...currentJob, type: e.target.value})}>
                                        <option>Full-time</option>
                                        <option>Part-time</option>
                                        <option>Contract</option>
                                        <option>Internship</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label-text">Country</label>
                                    <select 
                                        className="portal-input" 
                                        value={loc.country} 
                                        onChange={(e) => handleCountryChange(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Country...</option>
                                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                                        <option value="Other">Other...</option>
                                    </select>
                                    {loc.country === 'Other' && (
                                        <input 
                                            className="portal-input" 
                                            style={{ marginTop: '8px' }} 
                                            placeholder="Enter Country Name"
                                            value={loc.otherCountry}
                                            onChange={e => setLoc({...loc, otherCountry: e.target.value})}
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div className="form-group">
                                    <label className="label-text">State / Province</label>
                                    <select 
                                        className="portal-input" 
                                        value={loc.state} 
                                        onChange={(e) => handleStateChange(e.target.value)}
                                        disabled={!loc.country || loc.country === 'Other'}
                                    >
                                        <option value="">Select State...</option>
                                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                                        <option value="Other">Other...</option>
                                    </select>
                                    {loc.state === 'Other' && (
                                        <input 
                                            className="portal-input" 
                                            style={{ marginTop: '8px' }} 
                                            placeholder="Enter State Name"
                                            value={loc.otherState}
                                            onChange={e => setLoc({...loc, otherState: e.target.value})}
                                            required
                                        />
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="label-text">City</label>
                                    <select 
                                        className="portal-input" 
                                        value={loc.city} 
                                        onChange={(e) => setLoc({...loc, city: e.target.value})}
                                        disabled={!loc.state || loc.state === 'Other'}
                                    >
                                        <option value="">Select City...</option>
                                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                                        <option value="Other">Other...</option>
                                    </select>
                                    {loc.city === 'Other' && (
                                        <input 
                                            className="portal-input" 
                                            style={{ marginTop: '8px' }} 
                                            placeholder="Enter City Name"
                                            value={loc.otherCity}
                                            onChange={e => setLoc({...loc, otherCity: e.target.value})}
                                            required
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label-text">One-line Description</label>
                                <input className="portal-input" value={currentJob.description} onChange={e => setCurrentJob({...currentJob, description: e.target.value})} placeholder="Short hook for the job card" required />
                            </div>
                            <div className="form-group">
                                <label className="label-text">About the role</label>
                                <textarea className="portal-input" style={{ minHeight: '120px' }} value={currentJob.roleDescription} onChange={e => setCurrentJob({...currentJob, roleDescription: e.target.value})} placeholder="Detailed description of the position" required />
                            </div>
                            <div className="form-group">
                                <label className="label-text">What you will do</label>
                                <textarea className="portal-input" style={{ minHeight: '120px' }} value={currentJob.whatYouWillDo} onChange={e => setCurrentJob({...currentJob, whatYouWillDo: e.target.value})} placeholder="List of responsibilities..." />
                            </div>
                            <div className="form-group">
                                <label className="label-text">What you need to have</label>
                                <textarea className="portal-input" style={{ minHeight: '120px' }} value={currentJob.whatYouNeed} onChange={e => setCurrentJob({...currentJob, whatYouNeed: e.target.value})} placeholder="Requirements, skills, experience..." />
                            </div>
                            <div className="form-group">
                                <label className="label-text">What is in it for you?</label>
                                <textarea className="portal-input" style={{ minHeight: '100px' }} value={currentJob.whatIsInIt} onChange={e => setCurrentJob({...currentJob, whatIsInIt: e.target.value})} placeholder="Benefits, perks, culture..." />
                            </div>
                            <div className="form-group">
                                <label className="label-text">Technology Stack</label>
                                <input className="portal-input" value={currentJob.technology} onChange={e => setCurrentJob({...currentJob, technology: e.target.value})} placeholder="React, Node, Postgres, etc." />
                            </div>
                            <div className="form-group">
                                <label className="label-text">External Application Link (Optional)</label>
                                <input className="portal-input" value={currentJob.link} onChange={e => setCurrentJob({...currentJob, link: e.target.value})} placeholder="https://..." />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                                <button type="submit" disabled={saving} className="action-btn" style={{ flex: 1 }}>{saving ? 'Saving...' : 'Publish'}</button>
                                <button type="button" className="action-btn" style={{ background: '#f5f5f2', color: '#111', borderColor: '#ddd' }} onClick={() => setShowJobModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Logo Preview Modal */}
            {showPreviewModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, backdropFilter: 'blur(8px)' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '420px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: '#111', fontSize: '1.1rem', fontWeight: '800' }}>Company Logo Preview</h3>
                            <button onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '20px' }}>×</button>
                        </div>
                        <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                            <div style={{ width: '160px', height: '160px', borderRadius: '16px', overflow: 'hidden', margin: '0 auto 1.5rem', border: '1px solid #eee', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={previewUrl} alt="preview" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
                            </div>
                            <p style={{ margin: '0 0 4px 0', color: '#111', fontSize: '14px', fontWeight: '600' }}>{selectedFile?.name}</p>
                            <p style={{ margin: 0, color: '#666', fontSize: '12px' }}>{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB • {selectedFile?.type}</p>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f9f9f9' }}>
                            <button onClick={() => confirmImageUpload(false)} style={{ width: '100%', padding: '12px', backgroundColor: '#111', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Upload Logo</button>
                            <button onClick={() => { setShowPreviewModal(false); setShowCropModal(true); }} style={{ width: '100%', padding: '12px', backgroundColor: '#fff', color: '#111', border: '1px solid #ddd', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Crop Image First</button>
                            <button onClick={() => setShowPreviewModal(false)} style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: '#666', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Viewer Modal (LinkedIn style) */}
            {showPhotoViewerModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', zIndex: 10001 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ color: '#fff', margin: 0, fontWeight: '600', fontSize: '18px' }}>Profile photo</h3>
                        <button onClick={() => setShowPhotoViewerModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ width: '400px', height: '400px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
                            <img src={userData.photoURL} alt="Full view" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        
                        <div style={{ position: 'absolute', bottom: '2rem', left: '2rem' }}>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '20px', color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                Anyone
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 3rem', backgroundColor: '#000' }}>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <div 
                                onClick={() => { 
                                    setPreviewUrl(userData.originalPhotoURL || userData.photoURL);
                                    setSourceTarget('profile');
                                    setShowCropModal(true);
                                    setShowPhotoViewerModal(false);
                                }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                <span style={{ fontSize: '12px' }}>Edit</span>
                            </div>
                            <div 
                                onClick={() => { setShowSourceModal(true); setSourceTarget('profile'); setShowPhotoViewerModal(false); }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                <span style={{ fontSize: '12px' }}>Update</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#555', cursor: 'not-allowed' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                <span style={{ fontSize: '12px' }}>Frames</span>
                            </div>
                        </div>
                        <div 
                            onClick={() => { handleRemoveProfileImage(); setShowPhotoViewerModal(false); }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            <span style={{ fontSize: '12px' }}>Delete</span>
                        </div>
                    </div>
                </div>
            )}

            {/* LinkedIn Style Crop Modal */}
            {showCropModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002 }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '900px', height: '700px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #eee' }}>
                            <h3 style={{ margin: 0, fontWeight: '600', color: '#111' }}>Edit image</h3>
                            <button onClick={() => setShowCropModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#666', cursor: 'pointer' }}>&times;</button>
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex' }}>
                            {/* Left Side: Editor */}
                            <div style={{ flex: 1.5, backgroundColor: '#333', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                    <Cropper
                                        image={previewUrl}
                                        crop={crop}
                                        zoom={zoom}
                                        rotation={rotation}
                                        aspect={sourceTarget === 'logo' ? 1 : 1}
                                        cropShape={sourceTarget === 'profile' ? 'round' : 'rect'}
                                        onCropChange={setCrop}
                                        onZoomChange={setZoom}
                                        onRotationChange={setRotation}
                                        onCropComplete={onCropComplete}
                                        showGrid={false}
                                        style={{
                                            containerStyle: { backgroundColor: '#333' },
                                            cropAreaStyle: { border: '2px solid #fff' }
                                        }}
                                    />
                                    <div style={{ position: 'absolute', top: '1rem', left: '1rem', width: '32px', height: '32px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 'bold', zIndex: 10 }}>cr</div>
                                </div>
                            </div>

                            {/* Right Side: Controls */}
                            <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '2rem' }}>
                                    {['Crop'].map(tab => (
                                        <div 
                                            key={tab}
                                            onClick={() => setActiveEditorTab(tab.toLowerCase())}
                                            style={{ 
                                                padding: '0.5rem 1rem', 
                                                fontSize: '14px', 
                                                fontWeight: '600', 
                                                color: activeEditorTab === tab.toLowerCase() ? '#111' : '#666', 
                                                cursor: 'pointer',
                                                borderBottom: activeEditorTab === tab.toLowerCase() ? '2px solid #0073b1' : 'none'
                                            }}
                                        >
                                            {tab}
                                        </div>
                                    ))}
                                </div>

                                {activeEditorTab === 'crop' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                        <div style={{ display: 'flex', gap: '1.5rem', color: '#111' }}>
                                            <div onClick={() => setRotation(r => r - 90)} style={{ cursor: 'pointer' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38"/></svg></div>
                                            <div onClick={() => setRotation(r => r + 90)} style={{ cursor: 'pointer' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg></div>
                                            <div onClick={() => setFlip(f => ({ ...f, horizontal: !f.horizontal }))} style={{ cursor: 'pointer' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg></div>
                                            <div onClick={() => setFlip(f => ({ ...f, vertical: !f.vertical }))} style={{ cursor: 'pointer' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '1rem' }}>Zoom</label>
                                            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: '100%', accentColor: '#0073b1' }} />
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <label style={{ fontSize: '14px', color: '#666', margin: 0 }}>Straighten</label>
                                                <button 
                                                    onClick={() => setRotation(0)}
                                                    style={{ background: 'none', border: 'none', color: '#0073b1', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                            <input type="range" min={-45} max={45} step={1} value={rotation % 90} onChange={(e) => setRotation(Number(e.target.value))} style={{ width: '100%', accentColor: '#0073b1' }} />
                                        </div>
                                    </div>
                                )}
                                

                                <div style={{ flex: 1 }}></div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 0' }}>
                                    <button 
                                        onClick={() => confirmImageUpload(true)}
                                        style={{ padding: '0.6rem 1.5rem', backgroundColor: '#0073b1', color: '#fff', border: 'none', borderRadius: '24px', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Save changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Source Modal */}
            {showSourceModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(8px)' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2.5rem', width: '440px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0, fontWeight: '800', color: '#111', fontSize: '1.25rem' }}>Upload {sourceTarget === 'logo' ? 'Company Logo' : 'Profile Image'}</h3>
                            <button onClick={() => setShowSourceModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#999', cursor: 'pointer' }}>&times;</button>
                        </div>
                        
                        <div 
                            onClick={() => { 
                                setShowSourceModal(false); 
                                if (sourceTarget === 'logo') logoInputRef.current.click();
                                else fileInputRef.current.click();
                            }}
                            style={{ 
                                padding: '2rem', 
                                border: '2px dashed #eee', 
                                borderRadius: '12px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '12px', 
                                backgroundColor: '#f9f9f9',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '1.5rem'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#111'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#eee'}
                        >
                            <div style={{ width: '48px', height: '48px', backgroundColor: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '15px', fontWeight: '700', color: '#111' }}>Browse from Device</div>
                                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>JPEG, PNG up to 5MB</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button 
                                onClick={async () => {
                                    const url = window.prompt('Enter image URL:');
                                    if (url) {
                                        if (sourceTarget === 'logo') {
                                            setPreviewUrl(url);
                                            setShowPreviewModal(true);
                                        } else {
                                            setSaving(true);
                                            try {
                                                const userRef = doc(db, 'users', user.uid);
                                                await updateDoc(userRef, { photoURL: url });
                                                await updateProfile(user, { photoURL: url });
                                                setUserData({ ...userData, photoURL: url });
                                                setMessage({ text: 'Profile image updated!', type: 'success' });
                                            } catch (err) {
                                                console.error(err);
                                                setMessage({ text: 'Failed to update profile image.', type: 'error' });
                                            } finally {
                                                setSaving(false);
                                            }
                                        }
                                        setShowSourceModal(false);
                                    }
                                }}
                                style={{ padding: '14px', backgroundColor: '#fff', color: '#111', border: '1px solid #eee', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                Paste Link
                            </button>
                            <button 
                                onClick={handleDrivePicker}
                                style={{ padding: '14px', backgroundColor: '#fff', color: '#111', border: '1px solid #eee', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                    <path d="M7.74 2L12.25 10.14L16.74 2H7.74Z" fill="#0066DA"/>
                                    <path d="M6.83 3.58L2.01 12L6.5 20L11.33 11.58L6.83 3.58Z" fill="#00AA4E"/>
                                    <path d="M13.16 11.58L17.65 20H21.99L17.5 11.58H13.16Z" fill="#FFBA00"/>
                                </svg>
                                Google Drive
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {message.text && (
                <div key={message.id} className={`toast-popup ${message.type}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                        {message.type === 'success' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        )}
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>{message.text}</span>
                    </div>
                    {saving && uploadProgress > 0 && (
                        <div style={{ width: '100%', marginTop: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px', opacity: 0.8 }}>
                                <span>Uploading...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: '#111', transition: 'width 0.2s linear' }} />
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Hidden File Inputs */}
            <input 
                type="file" 
                ref={logoInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={(e) => handleFileChange(e, 'logo')} 
            />
            <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={(e) => handleFileChange(e, 'profile')} 
            />
        </div>
    );
};

export default FounderDashboard;
