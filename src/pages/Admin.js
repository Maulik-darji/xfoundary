import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuth as auth, adminDb as db, adminStorage as storage } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, setPersistence, inMemoryPersistence, updateEmail, verifyBeforeUpdateEmail, updatePassword, sendPasswordResetEmail, sendEmailVerification, signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { adminFunctions as functions } from '../firebase';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, writeBatch, addDoc, deleteDoc, onSnapshot, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import Blog from './Blog';

// Standardized Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => onChange(!checked)}>
        {label && <span style={{ fontSize: '12px', fontWeight: '800', color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>}
        <div style={{ 
            width: '44px', height: '24px', backgroundColor: checked ? '#000' : '#e5e5ea', 
            borderRadius: '12px', position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '1px solid rgba(0,0,0,0.05)'
        }}>
            <div style={{ 
                width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '50%',
                position: 'absolute', top: '1px', left: checked ? '21px' : '1px', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }} />
        </div>
    </div>
);

// Fuzzy Search Helper
const getFuzzySuggestion = (query, list, keys = ['name', 'email', 'companyName', 'userName']) => {
    if (!query || query.length < 3) return null;
    const lowerQuery = query.toLowerCase();
    
    // Exact or partial match already exists
    const hasMatch = list.some(item => 
        keys.some(key => item[key]?.toLowerCase().includes(lowerQuery))
    );
    if (hasMatch) return null;

    let bestMatch = null;
    let minDistance = 3; // Threshold for suggestion

    list.forEach(item => {
        keys.forEach(key => {
            const val = item[key]?.toLowerCase();
            if (!val) return;
            
            // Basic Levenshtein approximation for speed
            const dist = val.startsWith(lowerQuery.substring(0, 3)) ? 1 : 10; 
            if (dist < minDistance) {
                bestMatch = item[key];
                minDistance = dist;
            }
        });
    });

    return bestMatch;
};

const MailEditor = ({ 
    initialSubject, 
    initialText, 
    onDraftChange, 
    onSend, 
    onCancel, 
    pendingImage, 
    setPendingImage, 
    isUploadingImage, 
    handleImageUpload,
    onSaveDraft
}) => {
    const [subject, setSubject] = useState(initialSubject || '');
    const [text, setText] = useState(initialText || '');
    const textareaRef = useRef(null);

    useEffect(() => {
        setSubject(initialSubject || '');
        setText(initialText || '');
    }, [initialSubject, initialText]);
    
    const handleSubjectChange = (e) => {
        setSubject(e.target.value);
        if (onDraftChange) onDraftChange(e.target.value, text);
    };
    
    const handleTextChange = (e) => {
        setText(e.target.value);
        if (onDraftChange) onDraftChange(subject, e.target.value);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', marginTop: 'auto', backgroundColor: '#f5f5f7', borderRadius: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                    value={subject}
                    onChange={handleSubjectChange}
                    placeholder="Subject (Optional)"
                    style={{ flex: 1, padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '600', outline: 'none' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#000'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
                />
                <button 
                    onClick={onCancel}
                    title="Discard Message"
                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,48,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            {pendingImage && (
                <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)', animation: 'scaleIn 0.3s' }}>
                    <img src={pendingImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                        onClick={() => setPendingImage(null)}
                        style={{ position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                    >✕</button>
                </div>
            )}
            <div style={{ position: 'relative', display: 'flex', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <textarea 
                    ref={textareaRef}
                    value={text}
                    onChange={handleTextChange}
                    placeholder="Type your message here... (HTML supported)"
                    style={{ flex: 1, minHeight: '120px', padding: '14px 120px 14px 14px', border: 'none', fontSize: '14px', fontFamily: 'Inter, sans-serif', resize: 'vertical', outline: 'none', overflow: 'hidden' }}
                    onFocus={e => e.currentTarget.parentElement.style.borderColor = '#000'}
                    onBlur={e => e.currentTarget.parentElement.style.borderColor = 'rgba(0,0,0,0.1)'}
                />
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                        type="file" 
                        id={`image-upload-${Math.random()}`}
                        hidden 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                    />
                    <button 
                        onClick={(e) => e.currentTarget.previousSibling.click()}
                        disabled={isUploadingImage}
                        title="Add Image"
                        style={{ 
                            width: '40px', height: '40px', borderRadius: '6px', 
                            backgroundColor: 'rgba(0,0,0,0.05)', 
                            color: '#000', border: 'none', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: isUploadingImage ? 0.5 : 1
                        }}
                        onMouseEnter={e => { if(!isUploadingImage) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)' }}
                        onMouseLeave={e => { if(!isUploadingImage) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)' }}
                    >
                        {isUploadingImage ? (
                            <div style={{ width: '18px', height: '18px', border: '2px solid #ccc', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        )}
                    </button>
                    <button 
                        onClick={() => onSaveDraft(subject, text)}
                        style={{ 
                            padding: '0 20px', height: '40px', borderRadius: '6px', 
                            backgroundColor: 'rgba(0,0,0,0.05)', 
                            color: '#666', border: 'none', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', cursor: 'pointer',
                            transition: 'all 0.2s', fontSize: '13px', fontWeight: '600'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                    >
                        Save as Draft
                    </button>
                    <button 
                        onClick={() => onSend(subject, text)}
                        disabled={!text.trim() && !pendingImage}
                        title="Send Message"
                        style={{ 
                            width: '40px', height: '40px', borderRadius: '6px', 
                            backgroundColor: (text.trim() || pendingImage) ? '#000' : '#ccc', 
                            color: '#fff', border: 'none', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', cursor: (text.trim() || pendingImage) ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                            boxShadow: (text.trim() || pendingImage) ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                        }}
                        onMouseEnter={e => { if(text.trim() || pendingImage) e.currentTarget.style.transform = 'scale(1.05)' }}
                        onMouseLeave={e => { if(text.trim() || pendingImage) e.currentTarget.style.transform = 'scale(1)' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

const CacheImage = ({ src, alt, style, onClick }) => {
    const [imgSrc, setImgSrc] = useState(() => {
        if (!src || typeof src !== 'string' || src.startsWith('data:')) return src;
        try {
            const cacheKey = `xf_cache_${src.split('?')[0]}`;
            return localStorage.getItem(cacheKey) || src;
        } catch (e) { return src; }
    });
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!src || typeof src !== 'string' || src.startsWith('data:')) {
            setImgSrc(src);
            return;
        }
        
        const cacheKey = `xf_cache_${src.split('?')[0]}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            setImgSrc(cached);
        } else {
            setImgSrc(src); // Reset to src while fetching
            fetch(src)
                .then(res => res.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = reader.result;
                        try {
                            // Only cache if reasonably small (< 100KB) to avoid quota issues
                            if (base64.length < 150000) {
                                localStorage.setItem(cacheKey, base64);
                            }
                        } catch (e) {
                            console.warn("Image cache full");
                        }
                        setImgSrc(base64);
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(() => setError(true));
        }
    }, [src]);

    if (error) return <div style={{ ...style, backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>!</div>;
    return <img src={imgSrc} alt={alt} style={style} onClick={onClick} onError={() => setError(true)} />;
};

const ResponsiveContainer = ({ children, width = '100%', height = '100%' }) => (
    <div style={{ width, height, minHeight: 180 }}>
        {children}
    </div>
);

const CartesianGrid = () => null;
const XAxis = () => null;
const YAxis = () => null;
const Tooltip = () => null;
const Bar = () => null;
const Line = () => null;
const Area = () => null;

const SimpleChart = ({ data = [], type = 'bar' }) => {
    const chartData = data.length ? data : [{ name: 'No data', value: 0 }];
    const values = chartData.map(item => Number(item.value) || 0);
    const maxValue = Math.max(...values, 1);
    const width = 900;
    const height = 300;
    const padding = { top: 24, right: 24, bottom: 54, left: 48 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const step = plotWidth / Math.max(chartData.length - 1, 1);
    const points = chartData.map((item, index) => {
        const x = padding.left + (chartData.length === 1 ? plotWidth / 2 : index * step);
        const y = padding.top + plotHeight - ((Number(item.value) || 0) / maxValue) * plotHeight;
        return { x, y, value: Number(item.value) || 0, name: item.name || '' };
    });
    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const areaPath = `${path} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" role="img" aria-label="Applications chart" preserveAspectRatio="none">
            {[0, 0.25, 0.5, 0.75, 1].map(mark => {
                const y = padding.top + plotHeight - mark * plotHeight;
                return <line key={mark} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />;
            })}
            {type === 'bar' ? points.map((point, index) => {
                const barWidth = Math.min(56, plotWidth / Math.max(chartData.length, 1) * 0.6);
                const barHeight = padding.top + plotHeight - point.y;
                return (
                    <rect
                        key={`${point.name}-${index}`}
                        x={point.x - barWidth / 2}
                        y={point.y}
                        width={barWidth}
                        height={barHeight}
                        rx="8"
                        fill="#000"
                    />
                );
            }) : (
                <>
                    {type === 'area' && <path d={areaPath} fill="rgba(0,0,0,0.08)" />}
                    <path d={path} fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((point, index) => (
                        <circle key={`${point.name}-${index}`} cx={point.x} cy={point.y} r="5" fill="#000" stroke="#fff" strokeWidth="3" />
                    ))}
                </>
            )}
            {points.map((point, index) => (
                <text key={`label-${point.name}-${index}`} x={point.x} y={height - 20} textAnchor="middle" fontSize="11" fontWeight="700" fill="#667777">
                    {String(point.name).slice(0, 12)}
                </text>
            ))}
        </svg>
    );
};

const BarChart = ({ data }) => <SimpleChart data={data} type="bar" />;
const LineChart = ({ data }) => <SimpleChart data={data} type="line" />;
const AreaChart = ({ data }) => <SimpleChart data={data} type="area" />;

const Admin = () => {

  const sidebarRef = React.useRef(null);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('xf_admin_active_tab') || 'Overview');
  const [submissionsChartType, setSubmissionsChartType] = useState('bar');
  const [categoryChartType, setCategoryChartType] = useState('horizontal');
  const [showLogs, setShowLogs] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, actionKey: null });
  const [preferences, setPreferences] = useState(JSON.parse(localStorage.getItem('xf_admin_prefs')) || { skipDeleteConfirm: false, skipRemoveConfirm: false });
  const [founderSearchQuery, setFounderSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [memberRequestSearchQuery, setMemberRequestSearchQuery] = useState('');
  const [withdrawnSearchQuery, setWithdrawnSearchQuery] = useState('');
  const [chartType, setChartType] = useState('Bar'); // 'Bar' or 'Line'
  const [expandingChart, setExpandingChart] = useState(null); // 'Category' or 'Weekly'
  const [adminSettings, setAdminSettings] = useState({
      rememberActions: localStorage.getItem('admin_rememberActions') === 'true',
      askEveryTime: localStorage.getItem('admin_askEveryTime') === 'true' || true,
      compactView: false,
  });

  useEffect(() => {
      localStorage.setItem('admin_rememberActions', adminSettings.rememberActions);
      localStorage.setItem('admin_askEveryTime', adminSettings.askEveryTime);
  }, [adminSettings]);



  const [showCoFounders, setShowCoFounders] = useState(false);
  const [selectedFounders, setSelectedFounders] = useState([]);

  const handleExportFounders = () => {
    const data = filteredFoundersList.map((u, i) => ({
        "#": i + 1,
        Name: u.profile?.name || u.name || 'Unnamed',
        Email: u.email,
        Company: u.application?.companyName || 'N/A',
        Category: u.application?.category || 'N/A',
        "Submitted At": u.application?.submittedAt || 'N/A'
    }));
    exportToCSV(data, 'XFoundary_Founders.csv');
  };

  const handleExportMembers = () => {
    const data = filteredMembers.map((u, i) => ({
        "#": i + 1,
        Name: u.profile?.name || u.name || 'Unnamed',
        Email: u.email,
        Status: 'Active'
    }));
    exportToCSV(data, 'XFoundary_Members.csv');
  };

  const handleExportMemberRequests = () => {
    const data = filteredMemberApps.map((a, i) => ({
        "#": i + 1,
        Name: a.name,
        Email: a.email,
        Reason: a.reason,
        Status: a.status
    }));
    exportToCSV(data, 'XFoundary_Member_Requests.csv');
  };

  const handleExportWithdrawn = () => {
    const data = filteredWithdrawn.map((app, i) => ({
        "#": i + 1,
        Type: app.displayType,
        "Name/Company": app.userName || app.companyName,
        Email: app.userEmail,
        Date: app.withdrawnAt || 'N/A'
    }));
    exportToCSV(data, 'XFoundary_Withdrawn.csv');
  };

  const handleBulkDeleteFounders = () => {

    if (selectedFounders.length === 0) return;
    
    const action = async () => {
        const batch = writeBatch(db);
        selectedFounders.forEach(id => {
            batch.delete(doc(db, 'users', id));
        });
        await batch.commit();
        
        // Also need to handle auth deletion via cloud functions if possible
        // For now, delete from Firestore
        setSelectedFounders([]);
        fetchData();
        setToastMessage(`Deleted ${selectedFounders.length} accounts.`);
        setShowToast(true);
    };

    setConfirmConfig({
        title: `Are you sure you want to delete ${selectedFounders.length} selected accounts? This cannot be undone.`,
        onConfirm: action
    });
    setShowConfirmModal(true);
  };

  const exportToCSV = (data, filename) => {

    if (!data || !data.length) return;
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));
    for (const row of data) {
        const values = headers.map(header => {
            let val = row[header];
            if (val === null || val === undefined) val = '';
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        });
        csvRows.push(values.join(','));
    }
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.click();
  };

  const renderSearchHeader = (title, query, setQuery, onExport, extraButtons = null) => (
    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>{title}</h3>
            {extraButtons}
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {onExport && (
                <button 
                    onClick={onExport} 
                    style={{ padding: '8px 16px', backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#248a3d', border: '1px solid rgba(52, 199, 89, 0.2)', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.2)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(52, 199, 89, 0.1)'}
                >
                    <svg style={{ marginRight: '6px' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export
                </button>
            )}
            <div style={{ position: 'relative', width: '250px' }}>
                <input 
                    type="text"
                    placeholder={`Search ${title.toLowerCase()}...`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setQuery(''); }}
                    style={{ width: '100%', padding: '10px 35px 10px 15px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '13px', fontWeight: '600', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#000'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
                />
                {query && (
                    <button 
                        onClick={() => setQuery('')}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >&times;</button>
                )}
            </div>
        </div>
    </div>
  );

  useEffect(() => {

      localStorage.setItem('xf_admin_prefs', JSON.stringify(preferences));
  }, [preferences]);




  const [backupSearch, setBackupSearch] = useState('');
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
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncCurrentEmail, setSyncCurrentEmail] = useState('');
  const [syncToken, setSyncToken] = useState(sessionStorage.getItem('xf_gmail_sync_token') || null);
  const [syncAccountEmail, setSyncAccountEmail] = useState(sessionStorage.getItem('xf_gmail_sync_email') || null);
  const syncCardRef = React.useRef(null);
  const dragInfo = React.useRef({ isDragging: false, startX: 0, startY: 0, cardX: 0, cardY: 0 });
  const [syncEta, setSyncEta] = useState('');
  const textareaRef = React.useRef(null);
  const [pendingImage, setPendingImage] = useState(null);
  const draftMemory = useRef({});
  const previousFounder = useRef(null);
  const [externalFounders, setExternalFounders] = useState([]);
  const [selectedExternalFounder, setSelectedExternalFounder] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showAppDetail, setShowAppDetail] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [showBlogDetail, setShowBlogDetail] = useState(false);
  const [founderMessages, setFounderMessages] = useState([]);
  const [selectedFounderIds, setSelectedFounderIds] = useState([]);
  const [founderSearch, setFounderSearch] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const [isWritingMail, setIsWritingMail] = useState(false);
  const [showMailMenu, setShowMailMenu] = useState(false);
  const messagesContainerRef = useRef(null);
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
  const [showGmailSecret, setShowGmailSecret] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSyncingIndividual, setIsSyncingIndividual] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState(user?.email || '');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState('Account');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState(null);
  const [selectedFounder, setSelectedFounder] = useState(null);
  const [showFounderEditor, setShowFounderEditor] = useState(false);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [selectedMemberRequests, setSelectedMemberRequests] = useState([]);
  
  // New States for Reports and Standardization
  const [reports, setReports] = useState([]);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [selectedReports, setSelectedReports] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(['Analytics', 'Admissions', 'Directory', 'Content', 'Tools', 'System']);
  const [selectedAdmins, setSelectedAdmins] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedBlogs, setSelectedBlogs] = useState([]);
  const [showCoFoundersOnly, setShowCoFoundersOnly] = useState(false);
  const [weeklyChartType, setWeeklyChartType] = useState('Area');
  const [chartFont, setChartFont] = useState('Inter');
  const [distFilterStatus, setDistFilterStatus] = useState('all');
  const [distFilterBatch, setDistFilterBatch] = useState('all');
  const [distGrouping, setDistGrouping] = useState('Category'); // 'Category' or 'Industry'

  const renderManagementHeader = (title, count, searchQuery, setSearchQuery, selectedItems, onBulkDelete, suggestion, additionalControls = null) => (
      <div style={{ padding: '2rem 2.5rem 2.5rem', marginBottom: 0, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ paddingLeft: '0.25rem' }}>
                  <h2 style={{ margin: 0, fontWeight: '900', fontSize: '2.2rem', letterSpacing: '-0.03em' }}>{title}</h2>
                  <div style={{ fontSize: '14px', color: '#667777', fontWeight: '600', marginTop: '4px' }}>
                      {count} {title.toLowerCase()} recorded
                  </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {additionalControls}
                  {selectedItems && selectedItems.length > 0 && (
                      <button 
                          onClick={onBulkDelete}
                          style={{ 
                              padding: '10px 20px', borderRadius: '10px', background: '#ff3b30', color: '#fff', 
                              border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                              boxShadow: '0 8px 20px rgba(255,59,48,0.25)', animation: 'fadeInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                      >
                          Delete Selected ({selectedItems.length})
                      </button>
                  )}
              </div>
          </div>
          
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px', marginLeft: '0.25rem' }}>
              <div style={{ position: 'relative' }}>
                  <svg style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={`Search ${title.toLowerCase()}...`}
                      style={{ 
                          width: '100%', padding: '14px 45px 14px 50px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', 
                          backgroundColor: 'rgba(255,255,255,0.8)', fontSize: '15px', fontWeight: '600', outline: 'none',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                      }}
                  />
              </div>
              
              {suggestion && (
                  <div 
                      onClick={() => setSearchQuery(suggestion)}
                      style={{ 
                          position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', 
                          border: '1px solid rgba(0,0,0,0.1)', borderRadius: '14px', padding: '12px 16px', 
                          marginTop: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', zIndex: 100,
                          boxShadow: '0 12px 30px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                  >
                      <span style={{ color: '#007aff' }}>Did you mean:</span>
                      <span style={{ color: '#000', textDecoration: 'underline' }}>{suggestion}</span>
                  </div>
              )}
          </div>
      </div>
  );

  // Auto-login logic using custom token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        signInWithCustomToken(auth, token)
            .then(() => {
                // Remove token from URL after successful login
                window.history.replaceState({}, document.title, window.location.pathname);
                setToastMessage("Account verified and auto-logged in successfully!");
                setShowToast(true);
                setTimeout(() => setShowToast(false), 5000);
            })
            .catch((error) => {
                console.error("Auto-login error:", error);
                setToastMessage("Auto-login link expired or invalid.");
                setShowToast(true);
                setTimeout(() => setShowToast(false), 5000);
            });
    }
  }, []);

  useEffect(() => {
    if (selectedExternalFounder) {
        localStorage.setItem('xf_admin_selected_founder_email', selectedExternalFounder.email);
        
        // Clear reply count when founder is selected
        if (selectedExternalFounder.replyCount > 0) {
            const docId = selectedExternalFounder.email.replace(/[.#$[\]]/g, '_');
            updateDoc(doc(db, 'externalFounders', docId), {
                replyCount: 0
            }).catch(console.error);
            
            // Update local state so it reflects immediately
            setExternalFounders(prev => prev.map(f => 
                f.id === selectedExternalFounder.id ? { ...f, replyCount: 0 } : f
            ));
        }
    }
  }, [selectedExternalFounder]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('xf_admin_selected_founder_email');
    if (savedEmail && externalFounders.length > 0 && !selectedExternalFounder) {
        const found = externalFounders.find(f => f.email === savedEmail);
        if (found) {
            setSelectedExternalFounder(found);
        }
    }
  }, [externalFounders]);

  useEffect(() => {
    if (user && !newAdminEmail) {
      setNewAdminEmail(user.email);
    }
  }, [user]);

  const handleUpdateEmail = async () => {
    // Basic validation
    if (newPassword && newPassword !== confirmPassword) {
        setToastMessage("Error: Passwords do not match.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
        return;
    }

    if (newPassword && newPassword.length < 6) {
        setToastMessage("Error: Password must be at least 6 characters.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
        return;
    }

    const isEmailChanged = newAdminEmail && newAdminEmail !== user.email;
    if (!isEmailChanged && !newPassword) return;
    
    // Check uniqueness if email is being changed
    if (isEmailChanged) {
        const isEmailTaken = users.some(u => u.email?.toLowerCase() === newAdminEmail.toLowerCase()) || 
                           members.some(m => m.email?.toLowerCase() === newAdminEmail.toLowerCase());
        
        if (isEmailTaken) {
            setToastMessage("Access Denied: This email is already linked to a Founder or Member account.");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
            return;
        }
    }

    setIsUpdatingEmail(true);
    try {
        let successMsg = "Changes saved!";

        // Update password if provided
        if (newPassword) {
            await updatePassword(auth.currentUser, newPassword);
            successMsg = "Password updated successfully!";
        }

        // Update email if provided
        if (isEmailChanged) {
            console.log("Initiating email update to:", newAdminEmail);
            
            try {
                // Use the NEW custom Cloud Function to send the verification link via our working mail collection
                console.log("Calling requestAdminEmailUpdate Cloud Function...");
                const requestUpdateFn = httpsCallable(functions, 'requestAdminEmailUpdate');
                await requestUpdateFn({ 
                    oldEmail: auth.currentUser.email, 
                    newEmail: newAdminEmail,
                    url: window.location.origin + '/admin'
                });
                console.log("Cloud Function call successful.");
            } catch (vErr) {
                console.error("Verification Error:", vErr);
                if (vErr.code === 'auth/requires-recent-login') {
                    setToastMessage("SECURITY: Please log out and sign in again before changing your email.");
                    setShowToast(true);
                    return;
                } else if (vErr.code === 'auth/operation-not-allowed') {
                    alert("ERROR: Email updates are disabled in your Firebase Console. Please go to Authentication > Settings > User Actions and enable 'Email address change'.");
                    return;
                }
                throw vErr;
            }
            
            // Initial Toast state
            setLogoutCountdown(5);
            const renderToastContent = (c) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '320px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '800', color: '#000', fontSize: '12px', letterSpacing: '0.05em', marginBottom: '2px' }}>VERIFICATION SENT</div>
                        <div style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>
                            Check {newAdminEmail} (and SPAM).<br/>
                            Logging out in <span style={{ color: '#6300dd', fontWeight: '900', fontSize: '15px' }}>{c}</span>s...
                        </div>
                    </div>
                    <a 
                        href={`https://mail.google.com/mail/u/${newAdminEmail}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Go to Gmail"
                        style={{ 
                            width: '42px', height: '42px', borderRadius: '12px', 
                            backgroundColor: '#6300dd', color: '#fff', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                            boxShadow: '0 8px 20px rgba(99, 0, 221, 0.25)',
                            textDecoration: 'none'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(-5deg)'; e.currentTarget.style.backgroundColor = '#000'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; e.currentTarget.style.backgroundColor = '#6300dd'; }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                    </a>
                </div>
            );

            setToastMessage(
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '350px' }}>
                    {renderToastContent(5)}
                    <div style={{ 
                        fontSize: '11px', 
                        color: '#ff3b30', 
                        fontWeight: '800', 
                        padding: '10px 14px', 
                        backgroundColor: 'rgba(255,59,48,0.08)', 
                        borderRadius: '10px', 
                        border: '1px solid rgba(255,59,48,0.15)',
                        lineHeight: '1.4'
                    }}>
                        ⚠️ IMPORTANT: Your login email will remain the OLD one until you click the verification link in your new inbox. Check Spam if not found.
                    </div>
                </div>
            );
            setShowToast(true);
            
            let currentCount = 5;
            const timer = setInterval(() => {
                currentCount--;
                setLogoutCountdown(currentCount);
                
                if (currentCount <= 0) {
                    clearInterval(timer);
                    auth.signOut();
                    window.location.href = '/admin';
                } else {
                    setToastMessage(
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '350px' }}>
                            {renderToastContent(currentCount)}
                            <div style={{ 
                                fontSize: '11px', 
                                color: '#ff3b30', 
                                fontWeight: '800', 
                                padding: '10px 14px', 
                                backgroundColor: 'rgba(255,59,48,0.08)', 
                                borderRadius: '10px', 
                                border: '1px solid rgba(255,59,48,0.15)',
                                lineHeight: '1.4'
                            }}>
                                ⚠️ IMPORTANT: Your login email will remain the OLD one until you click the verification link in your new inbox. Check Spam if not found.
                            </div>
                        </div>
                    );
                }
            }, 1000);
            
            setNewPassword('');
            setConfirmPassword('');
            return;
        }
        
        setToastMessage(successMsg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
        setNewPassword('');
        setConfirmPassword('');
    } catch (err) {
        console.error(err);
        if (err.code === 'auth/requires-recent-login') {
            setToastMessage("Security: Please log out and back in to change sensitive credentials.");
        } else {
            setToastMessage("Update failed: " + err.message);
        }
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
    } finally {
        setIsUpdatingEmail(false);
    }
  };

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

  const switchTime = useRef(0);
  const lastMessageCount = useRef(0);
  useEffect(() => {
    switchTime.current = Date.now();
    const newKey = selectedExternalFounder ? selectedExternalFounder.email : 'bulk';
    previousFounder.current = newKey;
    const draft = draftMemory.current[newKey] || { isWriting: false };
    setIsWritingMail(draft.isWriting);
  }, [selectedExternalFounder]);

  const handleDraftChange = React.useCallback((subject, text) => {
      const currentKey = selectedExternalFounder ? selectedExternalFounder.email : 'bulk';
      draftMemory.current[currentKey] = {
          subject,
          text,
          image: pendingImage,
          isWriting: isWritingMail
      };
  }, [selectedExternalFounder, pendingImage, isWritingMail]);

  useEffect(() => {
    if (messagesContainerRef.current && selectedExternalFounder && founderMessages.length > 0) {
      const timeSinceSwitch = Date.now() - switchTime.current;
      
      // STRICT FIX: Any update within 1.5s of switching is 'initial load' -> Instant Jump
      if (timeSinceSwitch < 1500) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      } else if (founderMessages.length > lastMessageCount.current) {
          // Real-time new message -> Smooth
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
      }
      lastMessageCount.current = founderMessages.length;
    }
  }, [founderMessages, selectedExternalFounder]);

  useEffect(() => {
    if (isWritingMail && messagesContainerRef.current) {
        setTimeout(() => {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }
  }, [isWritingMail]);

  const getEmailSuggestion = (text) => {
    const emails = text.split(/[,\n]/).map(e => e.trim());
    for (let email of emails) {
        if (!email.includes('@')) continue;
        const parts = email.split('@');
        const domain = parts[parts.length - 1];
        const commonDomainTypos = {
            'gamil.com': 'gmail.com',
            'hotmial.com': 'hotmail.com',
            'outlok.com': 'outlook.com',
            'yaho.com': 'yahoo.com',
            'gnail.com': 'gmail.com'
        };
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

  const getFuzzyBackupSuggestion = () => {
    if (!backupSearch || backupSearch.length < 2) return null;
    const q = backupSearch.toLowerCase();
    const emails = externalFounders.map(f => f.email);
    
    // If we have direct matches, no need for fuzzy suggestion
    if (emails.some(e => e.toLowerCase().includes(q))) return null;

    let bestMatch = null;
    let highestScore = 0;

    emails.forEach(email => {
        const target = email.toLowerCase();
        let matches = 0;
        let lastIdx = -1;
        
        // Check for sequential character matches (not necessarily contiguous)
        for (let i = 0; i < q.length; i++) {
            const idx = target.indexOf(q[i], lastIdx + 1);
            if (idx !== -1) {
                matches++;
                lastIdx = idx;
            }
        }

        const score = matches / q.length;
        if (score > 0.8 && score >= highestScore) {
            highestScore = score;
            bestMatch = email;
        }
    });

    return bestMatch;
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
          setFounderMessages([]); // Clear messages immediately when founder changes
          const unsub = fetchFounderMessages(selectedExternalFounder.email);
          return () => unsub && unsub();
      } else {
          setFounderMessages([]);
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

  const handleSendIndividualMail = async (subject, text) => {
      if (!selectedExternalFounder || !text) return;
      
      try {
          const docId = selectedExternalFounder.email.replace(/[.#$[\]]/g, '_');
          const msgData = {
              text: text,
              subject: subject || "Follow up from X Foundary",
              sender: 'admin',
              timestamp: new Date().toISOString()
          };
          
          if (pendingImage) msgData.imageUrl = pendingImage;
          
          await addDoc(collection(db, 'externalFounders', docId, 'messages'), msgData);
          await addDoc(collection(db, 'mail'), {
              to: selectedExternalFounder.email,
              message: {
                  subject: msgData.subject,
                  html: text.replace(/\n/g, '<br/>') + (pendingImage ? `<br/><img src="${pendingImage}" style="max-width:300px;"/>` : '')
              }
          });
          
          // Clear draft
          draftMemory.current[selectedExternalFounder.email] = { subject: '', text: '', image: null, isWriting: false };
          setPendingImage(null);
          setIsWritingMail(false);
          // Wait for a tiny bit to let scroll effect handle the new message properly
          setTimeout(() => {
              if (messagesContainerRef.current) {
                  messagesContainerRef.current.scrollTo({
                      top: messagesContainerRef.current.scrollHeight,
                      behavior: 'smooth'
                  });
              }
          }, 100);
          
          setToastMessage("Message sent!");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
      } catch (e) {
          alert("Failed to send message: " + e.message);
      }
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
    let file;
    if (e.target.files) file = e.target.files[0];
    else if (e.dataTransfer?.files) file = e.dataTransfer.files[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const storageRef = ref(storage, `external_messages/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setPendingImage(url);
      setToastMessage("Image attached.");
      setShowToast(true);
    } catch (e) {
      console.error(e);
      setToastMessage("Failed to upload image.");
      setShowToast(true);
    } finally {
      setIsUploadingImage(false);
    }
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

  const handleForgotPassword = async () => {
      const email = prompt("Enter your admin email to receive a password reset link:");
      if (!email) return;
      try {
          await sendPasswordResetEmail(auth, email);
          setToastMessage("Password reset link sent to " + email);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
      } catch (err) {
          setError(err.message);
      }
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
    const readCollection = async (name) => {
      try {
        return await getDocs(collection(db, name));
      } catch (e) {
        console.error(`Failed to load ${name}:`, e);
        return null;
      }
    };

    try {
      const [
        uSnap,
        mSnap,
        bSnap,
        maSnap,
        adminsSnap,
        extSnap,
        logsSnap,
        reportsSnap
      ] = await Promise.all([
        readCollection('users'),
        readCollection('members'),
        readCollection('blog'),
        readCollection('memberApplications'),
        readCollection('admins'),
        readCollection('externalFounders'),
        readCollection('applicationLogs'),
        readCollection('reports')
      ]);

      const uList = []; const aList = []; let p = 0; let apprv = 0; let wdrw = 0;
      uSnap?.forEach(d => {
          const data = d.data(); uList.push({ id: d.id, ...data });
          if (data.application) {
              const app = { id: d.id, ...data.application, userEmail: data.email, userName: data.profile?.name || 'Founder' };
              aList.push(app);
              if (app.status === 'pending' || !app.status) p++;
              if (app.status === 'approved') apprv++;
              if (app.status === 'withdrawn') wdrw++;
          }
      });
      const mList = []; mSnap?.forEach(d => mList.push({ id: d.id, ...d.data() }));
      const bList = []; let pb = 0;
      bSnap?.forEach(d => { const b = { id: d.id, ...d.data() }; bList.push(b); if (b.status === 'pending') pb++; });
      const maList = []; let pm = 0;
      maSnap?.forEach(d => { const a = { id: d.id, ...d.data() }; maList.push(a); if (a.status === 'pending') pm++; });

      const adminsList = [];
      adminsSnap?.forEach(d => adminsList.push({ id: d.id, ...d.data() }));

      const extList = [];
      extSnap?.forEach(d => extList.push({ id: d.id, ...d.data() }));
      extList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const logsList = [];
      logsSnap?.forEach(d => logsList.push({ id: d.id, ...d.data() }));
      logsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const reportsList = [];
      reportsSnap?.forEach(d => reportsList.push({ id: d.id, ...d.data() }));
      reportsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setReports(reportsList);

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
        totalAdmins: adminsList.length,
        totalMembers: mList.length,
        adminsList
      });

      // Load Gmail Config (Just IDs for now, auth handled by Firebase)
      try {
        const gmailDoc = await getDoc(doc(db, 'adminSettings', 'gmailConfig'));
        if (gmailDoc.exists()) {
            const data = gmailDoc.data();
            setGmailClientId(data.clientId || '');
            setGmailClientSecret(data.clientSecret || '');
        }
      } catch (e) {
        console.error('Failed to load Gmail config:', e);
      }
    } catch (e) { console.error(e); }
  };

  const handleSyncGmail = async () => {
    try {
      const currentEmail = selectedExternalFounder?.email;
      if (!currentEmail) {
        setToastMessage("Please select a founder to sync.");
        return;
      }
      setIsSyncingIndividual(true);
      await performGmailSync(currentEmail);
      setIsSyncingIndividual(false);
    } catch (error) {
      console.error("Sync Error:", error);
      setIsSyncingIndividual(false);
      setToastMessage("Sync failed.");
    }
  };

  const handleSyncAllGmail = async () => {
    if (!window.confirm("This will sync the last 50 emails for ALL 371+ founders. This may take a minute. Proceed?")) return;
    
    try {
      setIsSyncingAll(true);
      setSyncProgress(0);
      setSyncEta('Calculating...');

      const token = await getGmailToken();
      if (!token) {
          setIsSyncingAll(false);
          return;
      }

      let totalNew = 0;
      const totalFounders = externalFounders.length;
      const startTime = Date.now();

      for (let i = 0; i < totalFounders; i++) {
          const founder = externalFounders[i];
          setSyncCurrentEmail(founder.email);
          setSyncProgress(Math.round(((i + 1) / totalFounders) * 100));
          
          // Calculate ETA
          const elapsed = Date.now() - startTime;
          const avgTimePerFounder = elapsed / (i + 1);
          const remainingFounders = totalFounders - (i + 1);
          const etaMs = avgTimePerFounder * remainingFounders;
          
          if (i > 2) { // Give it 3 founders to get a stable average
            const mins = Math.floor(etaMs / 60000);
            const secs = Math.floor((etaMs % 60000) / 1000);
            setSyncEta(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
          }

          const count = await performGmailSync(founder.email, token);
          totalNew += (count || 0);
      }

      setIsSyncingAll(false);
      setToastMessage(`Full Sync complete! ${totalNew} messages added.`);
      setShowToast(true);
    } catch (e) {
      console.error(e);
      setIsSyncingAll(false);
      setToastMessage("Full sync failed.");
      setShowToast(true);
    }
  };

  const getGmailToken = async () => {
    // If we already have a token in state, try to use it
    if (syncToken) return syncToken;

    const firebaseConfig = {
      apiKey: "AIzaSyC4GH9LfkNWXI1ElmHLPhOhtNLDZ9ZziWc",
      authDomain: "xfoundaryapp.firebaseapp.com",
      projectId: "xfoundaryapp",
      storageBucket: "xfoundaryapp.firebasestorage.app",
      messagingSenderId: "321695640646",
      appId: "1:321695640646:web:3ff25d2e143bb1b364ee47"
    };
    let syncApp;
    try { syncApp = getApp('syncApp'); } catch (e) { syncApp = initializeApp(firebaseConfig, 'syncApp'); }
    const syncAuth = getAuth(syncApp);
    await setPersistence(syncAuth, inMemoryPersistence);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/gmail.modify');
    
    try {
        const result = await signInWithPopup(syncAuth, provider);
        const token = GoogleAuthProvider.credentialFromResult(result).accessToken;
        await syncAuth.signOut();
        
        if (token) {
            setSyncToken(token);
            setSyncAccountEmail(result.user.email);
            sessionStorage.setItem('xf_gmail_sync_token', token);
            sessionStorage.setItem('xf_gmail_sync_email', result.user.email);
        }
        return token;
    } catch (err) {
        console.error("Login Error:", err);
        return null;
    }
  };

  const getGmailMessageBody = (message) => {
    const findPart = (parts, mimeType) => {
      if (!parts) return null;
      for (let part of parts) {
        if (part.mimeType === mimeType && part.body && part.body.data) return part;
        if (part.parts) {
          const found = findPart(part.parts, mimeType);
          if (found) return found;
        }
      }
      return null;
    };

    let data = "";
    if (message.payload.parts) {
      // Try text/plain first, then text/html
      const plainPart = findPart(message.payload.parts, 'text/plain');
      if (plainPart) {
        data = plainPart.body.data;
      } else {
        const htmlPart = findPart(message.payload.parts, 'text/html');
        if (htmlPart) {
          data = htmlPart.body.data;
        }
      }
    } 
    
    // Fallback to top-level body if no parts matched or existed
    if (!data && message.payload.body && message.payload.body.data) {
      data = message.payload.body.data;
    }

    if (!data) return message.snippet || "";

    try {
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const binString = window.atob(base64);
      const bytes = new Uint8Array(binString.length);
      for (let i = 0; i < binString.length; i++) {
        bytes[i] = binString.charCodeAt(i);
      }
      const decoded = new TextDecoder().decode(bytes);
      
      // If we got HTML but no plain text, strip tags for the chat UI
      if (decoded.includes('<') && decoded.includes('>') && decoded.toLowerCase().includes('<body')) {
          const doc = new DOMParser().parseFromString(decoded, 'text/html');
          return doc.body.textContent || doc.body.innerText || decoded;
      }
      return decoded;
    } catch (e) {
      console.error("Gmail Decode Error:", e);
      return message.snippet || "";
    }
  };

  const performGmailSync = async (email, existingToken = null) => {
    try {
      const token = existingToken || await getGmailToken();
      if (!token) return 0;

      const searchQuery = `(from:"${email}" OR to:"${email}")`;
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=50`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });

      // If token expired, clear it and retry once
      if (response.status === 401) {
          setSyncToken(null);
          setSyncAccountEmail(null);
          sessionStorage.removeItem('xf_gmail_sync_token');
          sessionStorage.removeItem('xf_gmail_sync_email');
          if (!existingToken) return performGmailSync(email); 
          return 0;
      }
      const data = await response.json();
      const messages = data.messages || [];
      const docId = email.replace(/[.#$[\]]/g, '_');
      
      // Process messages in parallel for speed
      const results = await Promise.all(messages.map(async (msg) => {
          try {
              const msgRef = doc(db, 'externalFounders', docId, 'messages', msg.id);
              const msgSnap = await getDoc(msgRef);
              if (msgSnap.exists()) return 0;

              const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              const detail = await detailRes.json();
              const headers = detail.payload.headers;
              const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
              const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
              
              if (!from.toLowerCase().includes(email.toLowerCase()) && !to.toLowerCase().includes(email.toLowerCase())) return 0;

              const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
              const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || new Date().toISOString();
              let snippet = (detail.snippet || '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
              const fullBody = getGmailMessageBody(detail);

              const isFounderMsg = from.toLowerCase().includes(email.toLowerCase());
              await setDoc(msgRef, {
                  text: fullBody || snippet,
                  subject: subject,
                  sender: isFounderMsg ? 'founder' : 'admin',
                  timestamp: new Date(date).toISOString(),
                  gmailId: msg.id,
                  isSynced: true
              });
              
              if (isFounderMsg) {
                  const founderRef = doc(db, 'externalFounders', docId);
                  updateDoc(founderRef, {
                      replyCount: increment(1),
                      lastReplyAt: new Date().toISOString()
                  }).catch(console.error);
              }
              return 1;
          } catch (err) {
              console.error("Error syncing message:", msg.id, err);
              return 0;
          }
      }));

      const newCount = results.reduce((a, b) => a + b, 0);
      
      if (!existingToken && newCount > 0) {
          setToastMessage(`Sync complete! ${newCount} new messages added.`);
      } else if (!existingToken) {
          setToastMessage("Up to date.");
      }
      return newCount;
    } catch (e) {
      console.error(e);
      return 0;
    }
  };

  const handleDisconnectGmail = () => {
    setSyncToken(null);
    setSyncAccountEmail(null);
    sessionStorage.removeItem('xf_gmail_sync_token');
    sessionStorage.removeItem('xf_gmail_sync_email');
    setToastMessage("Gmail account disconnected.");
    setShowToast(true);
  };

  const handleClearMessages = async () => {
    if (!selectedExternalFounder) return;
    
    const action = async () => {
        try {
            const docId = selectedExternalFounder.email.replace(/[.#$[\]]/g, '_');
            const msgsRef = collection(db, 'externalFounders', docId, 'messages');
            const msgsSnap = await getDocs(msgsRef);
            const batch = writeBatch(db);
            msgsSnap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            setToastMessage("Messages cleared.");
            setShowToast(true);
        } catch (e) {
            console.error(e);
            setToastMessage("Failed to clear messages.");
        }
    };

    if (skipConfirm) {
        action();
    } else {
        setConfirmConfig({ 
            title: "Are you sure you want to clear all synced messages for this founder? (Does not delete from Gmail)", 
            onConfirm: action 
        });
        setShowConfirmModal(true);
    }
  };

  const handleSyncCardDragStart = (e) => {
    dragInfo.current.isDragging = true;
    dragInfo.current.startX = e.clientX - dragInfo.current.cardX;
    dragInfo.current.startY = e.clientY - dragInfo.current.cardY;
    if (syncCardRef.current) {
        syncCardRef.current.style.transition = 'none';
        syncCardRef.current.style.boxShadow = '0 30px 60px rgba(0,0,0,0.3)';
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
        if (!dragInfo.current.isDragging) return;
        
        let newX = e.clientX - dragInfo.current.startX;
        let newY = e.clientY - dragInfo.current.startY;
        
        if (syncCardRef.current) {
            const rect = syncCardRef.current.getBoundingClientRect();
            // We use the initial dimensions, ignoring the current transform for calculation bounds.
            const cardWidth = rect.width;
            const cardHeight = rect.height;
            
            const minX = Math.min(0, 64 + cardWidth - window.innerWidth);
            const maxX = 0;
            const minY = Math.min(0, 64 + cardHeight - window.innerHeight);
            const maxY = 0;
            
            newX = Math.max(minX, Math.min(newX, maxX));
            newY = Math.max(minY, Math.min(newY, maxY));
            
            dragInfo.current.cardX = newX;
            dragInfo.current.cardY = newY;
            
            syncCardRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        }
    };
    const handleMouseUp = () => {
        if (dragInfo.current.isDragging) {
            dragInfo.current.isDragging = false;
            if (syncCardRef.current) {
                const rect = syncCardRef.current.getBoundingClientRect();
                const cardWidth = rect.width;
                const cardHeight = rect.height;
                
                const minX = Math.min(0, 64 + cardWidth - window.innerWidth);
                const maxX = 0;
                const minY = Math.min(0, 64 + cardHeight - window.innerHeight);
                const maxY = 0;
                
                const snapX = dragInfo.current.cardX > (minX + maxX) / 2 ? maxX : minX;
                const snapY = dragInfo.current.cardY > (minY + maxY) / 2 ? maxY : minY;
                
                dragInfo.current.cardX = snapX;
                dragInfo.current.cardY = snapY;
                
                syncCardRef.current.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s';
                syncCardRef.current.style.transform = `translate(${snapX}px, ${snapY}px)`;
                syncCardRef.current.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
            }
        }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleDeleteMessage = async (gmailId) => {
    if (!gmailId || !selectedExternalFounder) return;
    
    const action = async () => {
        try {
            let token = await getGmailToken();
            if (!token) return;

            // 1. Trash in Gmail
            let response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}/trash`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Auto-refresh token if expired
            if (response.status === 401) {
                sessionStorage.removeItem('xf_gmail_sync_token');
                setSyncToken(null);
                token = await getGmailToken();
                if (!token) return;
                response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}/trash`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }

            if (response.ok) {
                // 2. Delete from Firestore
                const docId = selectedExternalFounder.email.replace(/[.#$[\]]/g, '_');
                await deleteDoc(doc(db, 'externalFounders', docId, 'messages', gmailId));
                
                setToastMessage("Email moved to Trash.");
                setShowToast(true);
            } else {
                const errData = await response.json().catch(() => ({}));
                console.error("Gmail Trash Error:", errData);
                throw new Error("Failed to trash in Gmail");
            }
        } catch (e) {
            console.error(e);
            setToastMessage("Failed to delete email.");
            setShowToast(true);
        }
    };

    if (skipConfirm) {
        action();
    } else {
        setConfirmConfig({ 
            title: "Move this email to your Gmail Trash?", 
            onConfirm: action 
        });
        setShowConfirmModal(true);
    }
  };

  const handleLocalDeleteMessage = async (docId) => {
    if (!docId || !selectedExternalFounder) return;

    const action = async () => {
        try {
            const founderDocId = selectedExternalFounder.email.replace(/[.#$[\]]/g, '_');
            await deleteDoc(doc(db, 'externalFounders', founderDocId, 'messages', docId));
            
            setToastMessage("Message deleted.");
            setShowToast(true);
        } catch (e) {
            console.error(e);
            setToastMessage("Failed to delete message.");
            setShowToast(true);
        }
    };

    if (skipConfirm) {
        action();
    } else {
        setConfirmConfig({ 
            title: "Delete this message from the dashboard?", 
            onConfirm: action 
        });
        setShowConfirmModal(true);
    }
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
        setSettingsSaved(true);
        setTimeout(() => {
            setShowToast(false);
            setSettingsSaved(false);
        }, 3000);
    } catch (e) {
        alert("Error saving settings: " + e.message);
    } finally {
        setIsSavingSettings(false);
    }
  };

  const handleRemoveMember = async (uid) => {
      const action = async () => {
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
      };

      if (preferences.skipRemoveConfirm) {
          action();
      } else {
          setConfirmModal({
              show: true,
              title: "Remove Member",
              message: "Are you sure you want to remove this user from the team?",
              actionKey: 'skipRemoveConfirm',
              onConfirm: action
          });
      }
  };

  const handleDeleteFounder = (uid, name) => {
    setConfirmConfig({
        title: `Are you absolutely sure you want to delete ${name}'s account? This will permanently remove them from Firebase Auth and all databases.`,
        onConfirm: async () => {
            try {
                setToastMessage(`Deleting ${name}...`);
                setShowToast(true);
                const deleteUser = httpsCallable(functions, 'deleteUserAccount');
                const result = await deleteUser({ uid });
                
                if (result.data.success) {
                    setToastMessage(`Successfully deleted ${name}`);
                    fetchData();
                } else {
                    throw new Error(result.data.error || "Unknown error occurred");
                }
            } catch (err) {
                console.error("Deletion error:", err);
                setToastMessage(`Error: ${err.message}`);
                setShowToast(true);
            }
        }
    });
    setShowConfirmModal(true);
  };



  const handleSendColdMail = async (subject, text) => {
      if (!subject || !text) {
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
              setIsWritingMail(false);
              for (let i = 0; i < recipients.length; i++) {
                  const email = recipients[i];
                  setSendingStatus({ current: email, count: i + 1, total: recipients.length });
                  
                  const docId = email.replace(/[.#$[\]]/g, '_');
                  const msgData = {
                      text: text,
                      subject: subject,
                      sender: 'admin',
                      timestamp: new Date().toISOString()
                  };
                  if (pendingImage) msgData.imageUrl = pendingImage;

                  
                  await addDoc(collection(db, 'externalFounders', docId, 'messages'), msgData);

                  await addDoc(collection(db, 'mail'), {
                      to: email,
                      message: {
                          subject: subject,
                          html: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111;">${text.replace(/\n/g, '<br/>')}</div>` + (pendingImage ? `<br/><img src="${pendingImage}" style="max-width:300px;"/>` : '')
                      }
                  });
                  
                  // Optional small delay to make the UI visible if it's too fast
                  if (recipients.length < 50) await new Promise(r => setTimeout(r, 100));
              }
              
              setSendingStatus(null);
              setToastMessage("All emails sent successfully.");
              setShowToast(true);
              setTimeout(() => setShowToast(false), 3000);
              draftMemory.current['bulk'] = { subject: '', text: '', image: null, isWriting: false };
              setPendingImage(null);
          } catch (e) { 
              setSendingStatus(null);
              alert("Error sending emails: " + e.message); 
          }
      }
  };

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Admin Portal...</div>;

  if (!isAdminAuth) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6ef', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '40px', left: '40px', backgroundColor: '#6300dd', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', borderRadius: '0', fontSize: '20px', boxShadow: '0 4px 12px rgba(99, 0, 221, 0.2)' }}>X</div>
        <div style={{ width: '400px', backgroundColor: '#fff', padding: '3rem', borderRadius: '12px', border: '1px solid #eee' }}>
            <div style={{ backgroundColor: '#6300dd', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', borderRadius: '0', margin: '0 auto 2rem', fontSize: '24px' }}>X</div>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin {authMode === 'login' ? 'Login' : 'Signup'}</h2>
            {error && (
                <div style={{ color: '#ff4d4f', fontSize: '13px', textAlign: 'center', marginBottom: '1.5rem', backgroundColor: 'rgba(255,77,79,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,77,79,0.1)' }}>
                    {error}
                    {error.includes('invalid-credential') && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', fontWeight: '500', borderTop: '1px solid rgba(255,77,79,0.1)', paddingTop: '8px' }}>
                            💡 Tip: If you recently changed your email, you must verify the link in your new inbox before using it. Try your old email if you haven't verified yet.
                        </div>
                    )}
                </div>
            )}
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
                <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '1.5rem' }}>
                    <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: '#6300dd', fontSize: '12px', fontWeight: '800', cursor: 'pointer', padding: '0' }}>Forgot Password?</button>
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {authMode === 'login' ? 'Sign In' : 'Create Admin Account'}
                </button>
            </form>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '1.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
                <span style={{ fontSize: '12px', color: '#999', fontWeight: 'bold' }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
            </div>

            <button 
                onClick={async () => {
                    try {
                        const provider = new GoogleAuthProvider();
                        const res = await signInWithPopup(auth, provider);
                        const adminDoc = await getDoc(doc(db, 'admins', res.user.uid));
                        if (!adminDoc.exists()) {
                            await auth.signOut();
                            setError("This Google account is not registered as an administrator.");
                        }
                    } catch (err) { setError(err.message); }
                }}
                style={{ width: '100%', padding: '12px', backgroundColor: '#fff', color: '#000', border: '1px solid #ddd', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
            </button>

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
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6ef', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '40px', left: '40px', backgroundColor: '#6300dd', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', borderRadius: '0', fontSize: '20px', boxShadow: '0 4px 12px rgba(99, 0, 221, 0.2)' }}>X</div>
        <form onSubmit={handlePinSubmit} style={{ width: '320px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem' }}>Welcome, {profile.name}</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '2rem' }}>Enter master PIN to unlock system.</p>
            <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="••••••" maxLength={6} style={{ width: '100%', padding: '12px', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', marginBottom: '1.5rem' }} />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Unlock Panel</button>
            <button onClick={() => auth.signOut()} style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>Sign Out</button>
        </form>
    </div>
  );

  const TAB_GROUPS = [
    { name: 'Analytics', tabs: ['Overview', 'Reports & Bugs', 'Recent Activity', 'Category Distribution', 'Weekly Submissions'] },
    { name: 'Admissions', tabs: ['Pending Apps', 'Applications', 'Withdrawn Apps', 'Member Requests'] },
    { name: 'Directory', tabs: ['Founders', 'Admins', 'Members'] },
    { name: 'Content', tabs: ['Blog Approvals', 'Manage Blog', 'XF Blog'] },
    { name: 'Tools', tabs: ['Cold Mail', 'Backup'] },
    { name: 'System', tabs: ['Settings'] }
  ];

  const TABS = TAB_GROUPS.flatMap(g => g.tabs);

  const filteredFoundersList = users.filter(u => {
      const q = founderSearchQuery.toLowerCase();
      return (u.profile?.name || u.name || '').toLowerCase().includes(q) ||
             (u.email || '').toLowerCase().includes(q) ||
             (u.application?.companyName || '').toLowerCase().includes(q);
  });

  const filteredMembers = members.filter(u => {
      const q = memberSearchQuery.toLowerCase();
      return (u.profile?.name || u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const filteredAdmins = (stats.adminsList || []).filter(u => {
      const q = adminSearchQuery.toLowerCase();
      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const filteredBlogs = blogs.filter(b => {
      const q = blogSearchQuery.toLowerCase();
      return (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q);
  });

  const filteredMemberApps = memberApps.filter(a => {
      const q = memberRequestSearchQuery.toLowerCase();
      return (a.name || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q) || (a.reason || '').toLowerCase().includes(q);
  });

  const filteredWithdrawn = [
      ...applications.filter(a => a.status === 'withdrawn').map(a => ({ ...a, displayType: 'Founder' })),
      ...memberApps.filter(a => a.status === 'withdrawn').map(a => ({ ...a, displayType: 'Member', userName: a.name, userEmail: a.email }))
  ].filter(app => {
      const q = withdrawnSearchQuery.toLowerCase();
      return (app.userName || app.companyName || '').toLowerCase().includes(q) || (app.userEmail || '').toLowerCase().includes(q);
  });

  return (

    <>
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
        ::-webkit-scrollbar {
            width: 4px;
            height: 4px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.1);
            border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(0,0,0,0.2);
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
        padding: '2rem 0 2rem 1.5rem', 
        height: '100vh', 
        position: 'fixed', 
        left: 0,
        top: 0, 
        display: 'flex', 
        flexDirection: 'column', 
        zIndex: 10 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '3rem', paddingRight: '1.5rem' }}>
          <div style={{ backgroundColor: '#6300dd', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', borderRadius: '0', fontSize: '20px' }}>X</div>
          <span style={{ fontWeight: '800', color: '#000', fontSize: '20px', letterSpacing: '-0.02em' }}>X Foundary</span>
        </div>
        <nav style={{ flex: 1, position: 'relative', overflowY: 'auto', paddingRight: '0' }}>
          {TAB_GROUPS.map((group) => {
            const isExpanded = expandedGroups.includes(group.name);
            return (
              <div key={group.name} style={{ marginBottom: '1.25rem', paddingRight: '1.5rem' }}>
                <div 
                  onClick={() => setExpandedGroups(prev => prev.includes(group.name) ? prev.filter(g => g !== group.name) : [...prev, group.name])}
                  style={{ 
                    padding: '0 8px', fontSize: '11px', fontWeight: '900', color: '#000', letterSpacing: '0.12em', 
                    marginBottom: '0.75rem', textTransform: 'uppercase', opacity: 0.8, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none'
                  }}
                >
                  <span>{group.name}</span>
                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>
                    {isExpanded ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    )}
                  </div>
                </div>
                
                {isExpanded && (
                  <div style={{ animation: 'fadeInDown 0.3s ease-out' }}>
                    {group.tabs.map((tab) => {
                      let badgeCount = 0;
                      if (tab === 'Pending Apps') badgeCount = stats.pending;
                      if (tab === 'Member Requests') badgeCount = stats.pendingMembers;
                      if (tab === 'Blog Approvals') badgeCount = stats.pendingBlogs;
                      if (tab === 'Withdrawn Apps') badgeCount = stats.withdrawnApps;
                      
                      const isActive = activeTab === tab;
                      return (
                          <div key={tab} onClick={() => setActiveTab(tab)} style={{ 
                              position: 'relative', 
                              zIndex: 1, 
                              padding: '10px 18px', 
                              marginBottom: '2px', 
                              cursor: 'pointer', 
                              color: isActive ? '#000' : '#556666',
                              backgroundColor: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                              borderRadius: '12px',
                              fontSize: '14px', 
                              fontWeight: isActive ? '800' : '600',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              height: '40px',
                              userSelect: 'none'
                          }}
                          onMouseEnter={e => !isActive && (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)')}
                          onMouseLeave={e => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <span>{tab}</span>
                            {badgeCount > 0 && (
                                <span style={{ 
                                    backgroundColor: '#ff3b30', 
                                    color: '#fff', 
                                    borderRadius: '50%', 
                                    minWidth: '18px', 
                                    height: '18px', 
                                    padding: '0 5px',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    fontSize: '10px', 
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 4px rgba(255, 59, 48, 0.3)'
                                }}>
                                  {badgeCount}
                                </span>
                            )}
                          </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
          <button onClick={() => fetchData()} style={{ position: 'relative', zIndex: 1, marginTop: '2rem', width: 'calc(100% - 1.5rem)', padding: '10px', backgroundColor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', color: '#000', backdropFilter: 'blur(10px)', fontWeight: '700', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}>Refresh Data</button>

        <div style={{ position: 'relative', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', marginTop: 'auto', paddingRight: '1.5rem' }}>
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
        padding: (activeTab === 'XF Blog' || activeTab === 'Cold Mail' || activeTab === 'Backup') ? '0.5rem' : '3rem', 
        zIndex: 1, 
        position: 'relative', 
        height: '100vh',
        overflowY: 'auto'
      }}>
        {activeTab === 'Overview' && (
            <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                 <div onClick={() => setActiveTab('Pending Apps')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '10px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.15) 0%, rgba(0, 122, 255, 0.05) 100%)', border: '1px solid rgba(0, 122, 255, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Applications written</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.pending}</div>
                </div>
                <div onClick={() => setActiveTab('Applications')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '10px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.15) 0%, rgba(52, 199, 89, 0.05) 100%)', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Applications</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.pending + stats.approved + applications.filter(a => a.status === 'hold' || a.status === 'rejected').length}</div>
                </div>
                <div onClick={() => setActiveTab('Founders')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '10px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.15) 0%, rgba(255, 149, 0, 0.05) 100%)', border: '1px solid rgba(255, 149, 0, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Founders</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.totalUsers}</div>
                </div>
                <div onClick={() => setActiveTab('Members')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '10px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(88, 86, 214, 0.15) 0%, rgba(88, 86, 214, 0.05) 100%)', border: '1px solid rgba(88, 86, 214, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Members</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.totalMembers}</div>
                </div>
                <div onClick={() => setActiveTab('Admins')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '10px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(142, 142, 147, 0.15) 0%, rgba(142, 142, 147, 0.05) 100%)', border: '1px solid rgba(142, 142, 147, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Admins</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.totalAdmins}</div>
                </div>
                <div onClick={() => setActiveTab('Member Requests')} className="glass-card" style={{ padding: '1.5rem', borderRadius: '10px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(255, 59, 48, 0.15) 0%, rgba(255, 59, 48, 0.05) 100%)', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                    <div style={{ color: '#000', fontSize: '11px', marginBottom: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pending Members</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#000' }}>{stats.pendingMembers}</div>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                {/* Category Distribution Chart */}
                <div className="glass-card" style={{ padding: '2rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem' }}>Category Distribution</h4>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '2px' }}>
                                <button onClick={() => setChartType('Bar')} style={{ padding: '4px 10px', border: 'none', borderRadius: '6px', background: chartType === 'Bar' ? '#fff' : 'transparent', fontSize: '10px', fontWeight: '800', cursor: 'pointer', boxShadow: chartType === 'Bar' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>BAR</button>
                                <button onClick={() => setChartType('Line')} style={{ padding: '4px 10px', border: 'none', borderRadius: '6px', background: chartType === 'Line' ? '#fff' : 'transparent', fontSize: '10px', fontWeight: '800', cursor: 'pointer', boxShadow: chartType === 'Line' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>LINE</button>
                            </div>
                            <button onClick={() => setExpandingChart('Category')} style={{ background: 'none', border: 'none', color: '#007aff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>View All</button>
                        </div>
                    </div>
                    <div style={{ height: '220px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'Bar' ? (
                                <BarChart data={Object.entries(applications.reduce((acc, app) => {
                                    const cat = app.category || 'Other';
                                    acc[cat] = (acc[cat] || 0) + 1;
                                    return acc;
                                }, {})).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8)}>
                                    <XAxis dataKey="name" hide />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="value" fill="#000" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            ) : (
                                <LineChart data={Object.entries(applications.reduce((acc, app) => {
                                    const cat = app.category || 'Other';
                                    acc[cat] = (acc[cat] || 0) + 1;
                                    return acc;
                                }, {})).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8)}>
                                    <XAxis dataKey="name" hide />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
                                    <Line type="monotone" dataKey="value" stroke="#000" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Application Growth Chart */}
                <div className="glass-card" style={{ padding: '2rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem' }}>Weekly Submissions</h4>
                        <button onClick={() => setExpandingChart('Weekly')} style={{ background: 'none', border: 'none', color: '#007aff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>View All</button>
                    </div>
                    <div style={{ height: '220px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={Object.entries(applications.reduce((acc, app) => {
                                const date = new Date(app.submittedAt || Date.now());
                                const week = `W${Math.ceil(date.getDate() / 7)}`;
                                acc[week] = (acc[week] || 0) + 1;
                                return acc;
                            }, {})).map(([name, value]) => ({ name, value }))}>
                                <defs>
                                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="value" stroke="#000" fillOpacity={1} fill="url(#colorSub)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                </div>
            </div>



                {/* Recent Activity Feed */}
                <div className="glass-card" style={{ padding: '2rem', borderRadius: '12px', gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem' }}>Recent Activity</h4>
                        <button onClick={() => setActiveTab('Recent Activity')} style={{ background: 'none', border: 'none', color: '#007aff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>View All</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {applications.slice(0, 4).map((app, i) => (
                            <div 
                                key={i} 
                                onClick={() => { setSelectedApplication(app); setShowAppDetail(true); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                            >
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

        {activeTab === 'Recent Activity' && (
            <div className="glass-card" style={{ borderRadius: '10px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button 
                            onClick={() => setActiveTab('Overview')} 
                            style={{ background: 'rgba(0,0,0,0.03)', border: 'none', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>Recent Activity</h3>
                    </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', width: '40px' }}>#</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>ACTIVITY</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>TIME</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applications.map((app, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer' }} onClick={() => { setSelectedApplication(app); setShowAppDetail(true); }}>
                                <td style={{ padding: '1.25rem', fontWeight: '700', color: '#888', fontSize: '13px' }}>{i + 1}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '32px', height: '32px', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>
                                            {app.companyName.charAt(0)}
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '600' }}>
                                            {app.userName} submitted application for <span style={{ color: '#007aff' }}>{app.companyName}</span>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem', fontSize: '13px', color: '#666' }}>
                                    {app.submittedAt ? new Date(app.submittedAt).toLocaleString() : 'Recently'}
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', backgroundColor: app.status === 'approved' ? 'rgba(52,199,89,0.1)' : 'rgba(0,0,0,0.05)', color: app.status === 'approved' ? '#34c759' : '#000' }}>
                                        {app.status?.toUpperCase() || 'PENDING'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'Category Distribution' && (
            <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '12px', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button 
                            onClick={() => setActiveTab('Overview')} 
                            style={{ background: 'rgba(0,0,0,0.03)', border: 'none', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.8rem', letterSpacing: '-0.02em' }}>{distGrouping} Distribution</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#667777', fontWeight: '600' }}>Breakdown of startups by {distGrouping.toLowerCase()}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', padding: '4px' }}>
                            {['Category', 'Industry'].map(g => (
                                <button 
                                    key={g}
                                    onClick={() => setDistGrouping(g)}
                                    style={{ padding: '6px 16px', border: 'none', borderRadius: '8px', background: distGrouping === g ? '#fff' : 'transparent', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: distGrouping === g ? '0 2px 6px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}
                                >{g.toUpperCase()}</button>
                            ))}
                        </div>
                        <select 
                            value={distFilterStatus}
                            onChange={e => setDistFilterStatus(e.target.value)}
                            style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <select 
                            value={distFilterBatch}
                            onChange={e => setDistFilterBatch(e.target.value)}
                            style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            <option value="all">All Batches</option>
                            {[...new Set(applications.map(a => a.batch || 'Upcoming'))].sort().map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {(() => {
                        const filtered = applications.filter(app => {
                            if (distFilterStatus !== 'all' && (app.status || 'pending') !== distFilterStatus) return false;
                            if (distFilterBatch !== 'all' && (app.batch || 'Upcoming') !== distFilterBatch) return false;
                            return true;
                        });

                        const distribution = filtered.reduce((acc, app) => {
                            let keys = [];
                            if (distGrouping === 'Category') {
                                keys = [app.category || 'Other'];
                            } else {
                                // Extract industries similar to Directory.js
                                if (Array.isArray(app.industries) && app.industries.length > 0) keys = app.industries;
                                else keys = [app.category, app.subCategory].filter(Boolean);
                                if (keys.length === 0) keys = ['Other'];
                            }
                            
                            keys.forEach(key => {
                                acc[key] = (acc[key] || 0) + 1;
                            });
                            return acc;
                        }, {});

                        const entries = Object.entries(distribution).sort((a,b) => b[1] - a[1]);
                        const total = entries.reduce((sum, [_, count]) => sum + count, 0);

                        if (entries.length === 0) {
                            return <div style={{ padding: '4rem', textAlign: 'center', color: '#999', fontWeight: '600' }}>No startups match the selected filters.</div>;
                        }

                        return entries.map(([name, count], idx) => (
                            <div key={name} style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: ['#007aff', '#34c759', '#ff9f0a', '#5856d6', '#ff3b30', '#af52de', '#ff2d55'][idx % 7] }}></div>
                                        {name}
                                    </span>
                                    <span style={{ color: '#666' }}>{count} {count === 1 ? 'startup' : 'startups'} ({Math.round(count/total * 100)}%)</span>
                                </div>
                                <div style={{ height: '12px', width: '100%', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '6px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: `${(count/total)*100}%`, 
                                        backgroundColor: ['#007aff', '#34c759', '#ff9f0a', '#5856d6', '#ff3b30', '#af52de', '#ff2d55'][idx % 7],
                                        borderRadius: '6px',
                                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }} />
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            </div>
        )}

        {activeTab === 'Weekly Submissions' && (
            <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '12px', animation: 'fadeInUp 0.4s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2rem' }}>
                    <button 
                        onClick={() => setActiveTab('Overview')} 
                        style={{ background: 'rgba(0,0,0,0.03)', border: 'none', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.8rem' }}>Weekly Submissions</h3>
                </div>
                <div style={{ height: '400px', display: 'flex', alignItems: 'flex-end', gap: '30px', padding: '40px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    {[...Array(14)].map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (13 - i));
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        const count = applications.filter(app => {
                            const appDate = new Date(app.submittedAt);
                            return appDate.toDateString() === date.toDateString();
                        }).length;
                        const max = Math.max(...[...Array(14)].map((_, j) => {
                            const d = new Date(); d.setDate(d.getDate() - (13 - j));
                            return applications.filter(a => new Date(a.submittedAt).toDateString() === d.toDateString()).length;
                        })) || 1;
                        
                        return (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', height: '100%' }}>
                                <div style={{ width: '100%', position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                    <div style={{ 
                                        width: '100%', 
                                        height: `${(count/max)*100}%`, 
                                        backgroundColor: i === 13 ? '#007aff' : '#000', 
                                        borderRadius: '8px 8px 2px 2px',
                                        minHeight: count > 0 ? '4px' : '0',
                                        transition: 'height 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        boxShadow: i === 13 ? '0 4px 12px rgba(0,122,255,0.2)' : 'none'
                                    }}>
                                        {count > 0 && <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', fontWeight: '900' }}>{count}</div>}
                                    </div>
                                </div>
                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#888', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{dayName}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}


        {(activeTab === 'Pending Apps' || activeTab === 'Applications') && (
            <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {activeTab}
                        <span style={{ fontSize: '13px', color: '#666', backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 10px', borderRadius: '10px', fontWeight: '700' }}>
                            {activeTab === 'Pending Apps' ? applications.filter(a => !a.status || a.status === 'pending').length : applications.filter(a => a.status === appFilter).length}
                        </span>
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '250px' }}>
                            <input 
                                type="text" 
                                placeholder="Search apps..." 
                                value={appSearchQuery}
                                onChange={(e) => setAppSearchQuery(e.target.value)}
                                style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '13px', fontWeight: '600', outline: 'none' }}
                            />
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        {activeTab === 'Applications' && (
                            <button 
                                onClick={() => setShowLogs(!showLogs)}
                                style={{ padding: '8px 16px', backgroundColor: showLogs ? '#000' : 'rgba(0,0,0,0.05)', color: showLogs ? '#fff' : '#000', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                {showLogs ? 'Hide Logs' : 'View Logs'}
                            </button>
                        )}
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
                                            fontSize: '11px', 
                                            fontWeight: '800', 
                                            cursor: 'pointer',
                                            backgroundColor: appFilter === f ? '#000' : 'transparent',
                                            color: appFilter === f ? '#fff' : '#666',
                                            transition: 'all 0.2s',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}
                                    >{f}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {activeTab === 'Applications' && showLogs && applicationLogs.length > 0 && (
                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem', animation: 'fadeInDown 0.3s ease-out' }}>
                        <h4 style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800' }}>Recent Application Logs</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                            {applicationLogs.map((log, i) => (
                                <div key={i} style={{ fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                                    <span style={{ fontWeight: '800', color: '#bbb', fontSize: '11px', width: '20px', flexShrink: 0 }}>{i + 1}.</span>
                                    <span style={{ 
                                        padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', flexShrink: 0,
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
                
                <div className="glass-card" style={{ borderRadius: '10px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                            <tr>
                                <th style={{ width: '50px', padding: '1.25rem' }}>
                                    <input 
                                        type="checkbox" 
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        checked={selectedApplications.length === applications.filter(app => activeTab === 'Pending Apps' ? (app.status === 'pending' || !app.status) : app.status === appFilter).length && applications.length > 0}
                                        onChange={(e) => {
                                            const filteredApps = applications.filter(app => activeTab === 'Pending Apps' ? (app.status === 'pending' || !app.status) : app.status === appFilter);
                                            if (e.target.checked) setSelectedApplications(filteredApps.map(a => a.id));
                                            else setSelectedApplications([]);
                                        }}
                                    />
                                </th>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', width: '40px' }}>#</th>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>COMPANY</th>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>FOUNDER</th>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>BATCH</th>
                                <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>ACTION</th>
                            </tr>
                        </thead>
                    <tbody>
                        {applications.filter(app => {
                            const matchesSearch = app.companyName.toLowerCase().includes(appSearchQuery.toLowerCase()) || 
                                                 app.userName.toLowerCase().includes(appSearchQuery.toLowerCase()) || 
                                                 app.userEmail.toLowerCase().includes(appSearchQuery.toLowerCase());
                            return matchesSearch && (activeTab === 'Pending Apps' ? (app.status === 'pending' || !app.status) : app.status === appFilter);
                        }).map((app, i) => (
                            <tr 
                                key={app.id} 
                                onClick={() => { setSelectedApplication(app); setShowAppDetail(true); }}
                                style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'background 0.2s', backgroundColor: selectedApplications.includes(app.id) ? 'rgba(0,122,255,0.02)' : 'transparent' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.01)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedApplications.includes(app.id) ? 'rgba(0,122,255,0.02)' : 'transparent'}
                            >
                                <td style={{ padding: '1.25rem' }} onClick={e => e.stopPropagation()}>
                                    <input 
                                        type="checkbox" 
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        checked={selectedApplications.includes(app.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedApplications([...selectedApplications, app.id]);
                                            else setSelectedApplications(selectedApplications.filter(id => id !== app.id));
                                        }}
                                    />
                                </td>
                                <td style={{ padding: '1.25rem', fontWeight: '700', color: '#bbb', fontSize: '13px' }}>{i + 1}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {app.companyLogo ? (
                                            <CacheImage src={app.companyLogo} style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.05)' }} alt="" />
                                        ) : (
                                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#888' }}>
                                                {app.companyName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#000' }}>{app.companyName}</div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>{app.category}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{app.userName}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>{app.userEmail}</div>
                                </td>
                                <td style={{ padding: '1.25rem', fontSize: '13px', color: '#444', fontWeight: '600' }}>{app.batch}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    {activeTab === 'Pending Apps' ? (
                                        <div style={{ display: 'flex', gap: '12px' }} onClick={e => e.stopPropagation()}>
                                            <button 
                                                onClick={() => handleAppStatus(app.id, 'approved')} 
                                                style={{ padding: '8px 16px', backgroundColor: 'rgba(0, 122, 255, 0.1)', color: '#007aff', border: '1px solid rgba(0, 122, 255, 0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >Approve</button>
                                            <button 
                                                onClick={() => handleAppStatus(app.id, 'hold')} 
                                                style={{ padding: '8px 16px', backgroundColor: 'rgba(255, 159, 10, 0.1)', color: '#ff9f0a', border: '1px solid rgba(255, 159, 10, 0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 159, 10, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 159, 10, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >Hold</button>
                                            <button 
                                                onClick={() => handleAppStatus(app.id, 'rejected')} 
                                                style={{ padding: '8px 16px', backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: '1px solid rgba(255, 59, 48, 0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                            >Reject</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
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
                                                style={{ padding: '6px 12px', backgroundColor: 'rgba(0,0,0,0.05)', color: '#000', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                                            >REVERT TO PENDING</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </>
        )}

        {activeTab === 'Founders' && (
            <div className="glass-card" style={{ borderRadius: '12px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                {renderManagementHeader(
                    "Founders", 
                    filteredFoundersList.length, 
                    founderSearchQuery, 
                    setFounderSearchQuery, 
                    selectedFounders, 
                    handleBulkDeleteFounders,
                    getFuzzySuggestion(founderSearchQuery, users, ['name', 'email']),
                    activeTab === 'Founders' ? (
                        <>
                            <button 
                                onClick={() => setShowCoFounders(!showCoFounders)}
                                style={{ padding: '10px 16px', backgroundColor: showCoFounders ? '#000' : 'rgba(0,0,0,0.05)', color: showCoFounders ? '#fff' : '#000', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                            >
                                {showCoFounders ? 'Hide Co-founders' : 'Show Co-founders'}
                            </button>
                            <ToggleSwitch checked={showCoFoundersOnly} onChange={setShowCoFoundersOnly} label="Co-founders Only" />
                        </>
                    ) : null
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', width: '40px' }}>
                                <input 
                                    type="checkbox" 
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    checked={selectedFounders.length > 0 && selectedFounders.length === filteredFoundersList.length}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedFounders(filteredFoundersList.map(u => u.id));
                                        else setSelectedFounders([]);
                                    }}
                                />
                            </th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', width: '60px' }}>#</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>NAME & EMAIL</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>STARTUP</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>SUBMITTED DATE</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>SOCIAL LINKS</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFoundersList.filter(f => !showCoFoundersOnly || (f.application?.coFounders?.length > 0)).slice(0, founderLimit).map((u, i) => (
                            <React.Fragment key={u.id}>
                                <tr 
                                    onClick={() => { setSelectedFounder(u); setShowFounderEditor(true); }}
                                    style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', backgroundColor: selectedFounders.includes(u.id) ? 'rgba(0,122,255,0.02)' : 'transparent', transition: 'background 0.2s', cursor: 'pointer' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.01)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedFounders.includes(u.id) ? 'rgba(0,122,255,0.02)' : 'transparent'}
                                >
                                    <td style={{ padding: '1.25rem' }} onClick={e => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            checked={selectedFounders.includes(u.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedFounders([...selectedFounders, u.id]);
                                                else setSelectedFounders(selectedFounders.filter(id => id !== u.id));
                                            }}
                                        />
                                    </td>
                                    <td style={{ padding: '1.25rem', fontWeight: '700', color: '#888', fontSize: '13px' }}>{i + 1}</td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {u.profile?.profileImage || u.photoURL ? (
                                                <CacheImage src={u.profile?.profileImage || u.photoURL} style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.05)' }} alt="" />
                                            ) : (
                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#888' }}>
                                                    {(u.profile?.name || u.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '14px', color: '#000' }}>{u.profile?.name || u.name || 'Unnamed'}</div>
                                                <div style={{ fontSize: '12px', color: '#667777' }}>{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{u.application?.companyName || 'N/A'}</div>
                                        <div style={{ fontSize: '12px', color: '#888' }}>{u.application?.category || 'No Category'}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem', fontSize: '13px', color: '#444' }}>
                                        {u.application?.submittedAt ? new Date(u.application.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not Submitted'}
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>
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
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                        <button 
                                            onClick={() => handleDeleteFounder(u.id, u.profile?.name || u.name || u.email)}
                                            style={{ padding: '8px 16px', backgroundColor: 'rgba(255,59,48,0.05)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.1)', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            Delete Account
                                        </button>
                                    </td>
                                </tr>
                                {showCoFounders && u.application?.coFounders?.length > 0 && (
                                    <tr style={{ backgroundColor: 'rgba(0,0,0,0.01)' }}>
                                        <td colSpan="7" style={{ padding: '0 1.25rem 1.25rem 5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '2px solid rgba(0,0,0,0.05)', paddingLeft: '20px', marginTop: '8px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#888', textTransform: 'uppercase', marginBottom: '4px' }}>Co-Founders</div>
                                                {u.application.coFounders.map((cf, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: '#fff', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.03)' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '700', fontSize: '13px' }}>{cf.name}</div>
                                                            <div style={{ fontSize: '12px', color: '#667777' }}>{cf.email}</div>
                                                        </div>
                                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#999' }}>{cf.role || 'Partner'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
                {filteredFoundersList.length > founderLimit && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <button onClick={() => setFounderLimit(prev => prev + 30)} style={{ padding: '10px 32px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                            Load More Founders
                        </button>
                    </div>
                )}
            </div>
        )}
        {(activeTab === 'Admins' || activeTab === 'Members') && (
            <div className="glass-card" style={{ borderRadius: '12px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                {renderManagementHeader(
                    activeTab,
                    activeTab === 'Admins' ? filteredAdmins.length : filteredMembers.length,
                    activeTab === 'Admins' ? adminSearchQuery : memberSearchQuery,
                    activeTab === 'Admins' ? setAdminSearchQuery : setMemberSearchQuery,
                    [],
                    null,
                    getFuzzySuggestion(
                        activeTab === 'Admins' ? adminSearchQuery : memberSearchQuery,
                        activeTab === 'Admins' ? filteredAdmins : filteredMembers,
                        ['name', 'email']
                    )
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem 2rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>Name & Email</th>
                            <th style={{ padding: '1.25rem 2rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(activeTab === 'Admins' ? filteredAdmins : filteredMembers).map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem 2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: '#888' }}>
                                            {(u.profile?.name || u.name || u.email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#000' }}>{u.profile?.name || u.name || 'Unnamed'}</div>
                                            <div style={{ fontSize: '12px', color: '#667777' }}>{u.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                                    <span style={{ padding: '6px 12px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '8px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                                        {activeTab === 'Admins' ? (u.role || 'Admin') : 'Member'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        {activeTab === 'Reports & Bugs' && (
            <div className="glass-card" style={{ borderRadius: '10px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                {renderManagementHeader(
                    "Reports & Bugs", 
                    reports.length, 
                    reportSearchQuery, 
                    setReportSearchQuery, 
                    selectedReports, 
                    async () => {
                        const batch = writeBatch(db);
                        selectedReports.forEach(id => batch.delete(doc(db, 'reports', id)));
                        await batch.commit();
                        setSelectedReports([]);
                        fetchData();
                        setToastMessage(`Deleted ${selectedReports.length} reports.`);
                        setShowToast(true);
                    },
                    getFuzzySuggestion(reportSearchQuery, reports, ['email', 'content', 'subject'])
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', width: '40px' }}>
                                <input 
                                    type="checkbox" 
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    checked={selectedReports.length > 0 && selectedReports.length === reports.length}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedReports(reports.map(r => r.id));
                                        else setSelectedReports([]);
                                    }}
                                />
                            </th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', width: '60px' }}>#</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>SENDER EMAIL</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>SUBJECT & CONTENT</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>DATE</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.filter(r => r.email?.toLowerCase().includes(reportSearchQuery.toLowerCase()) || r.content?.toLowerCase().includes(reportSearchQuery.toLowerCase())).map((r, i) => (
                            <tr key={r.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', backgroundColor: selectedReports.includes(r.id) ? 'rgba(0,122,255,0.02)' : 'transparent' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <input 
                                        type="checkbox" 
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        checked={selectedReports.includes(r.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedReports([...selectedReports, r.id]);
                                            else setSelectedReports(selectedReports.filter(id => id !== r.id));
                                        }}
                                    />
                                </td>
                                <td style={{ padding: '1.25rem', fontWeight: '700', color: '#888', fontSize: '13px' }}>{i + 1}</td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{r.email}</div>
                                </td>
                                <td style={{ padding: '1.25rem' }}>
                                    <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{r.subject || 'Bug Report'}</div>
                                    <div style={{ fontSize: '13px', color: '#667', lineHeight: '1.4' }}>{r.content}</div>
                                </td>
                                <td style={{ padding: '1.25rem', fontSize: '13px', color: '#888' }}>
                                    {new Date(r.timestamp).toLocaleString()}
                                </td>
                                <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                    <button 
                                        onClick={async () => {
                                            if (window.confirm("Delete this report?")) {
                                                await deleteDoc(doc(db, 'reports', r.id));
                                                fetchData();
                                            }
                                        }}
                                        style={{ padding: '6px 12px', backgroundColor: 'rgba(255,59,48,0.05)', color: '#ff3b30', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                    >Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'Blog Approvals' && (
            <div className="glass-card" style={{ borderRadius: '10px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                {renderManagementHeader(
                    "Blog Approvals", 
                    filteredBlogs.length, 
                    blogSearchQuery, 
                    setBlogSearchQuery, 
                    selectedBlogs, 
                    async () => {
                        const batch = writeBatch(db);
                        selectedBlogs.forEach(id => batch.delete(doc(db, 'blog', id)));
                        await batch.commit();
                        setSelectedBlogs([]);
                        fetchData();
                    },
                    getFuzzySuggestion(blogSearchQuery, blogs, ['title', 'author'])
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', width: '40px' }}>
                                <input 
                                    type="checkbox" 
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    checked={selectedBlogs.length > 0 && selectedBlogs.length === filteredBlogs.length}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedBlogs(filteredBlogs.map(b => b.id));
                                        else setSelectedBlogs([]);
                                    }}
                                />
                            </th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', width: '50px' }}>#</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>TITLE</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>AUTHOR</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>STATUS</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBlogs.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No blog submissions found matching your search.</td></tr>
                        ) : filteredBlogs.map((blog, idx) => (
                            <tr 
                                key={blog.id} 
                                onClick={() => { setSelectedBlog(blog); setShowBlogDetail(true); }}
                                style={{ 
                                    borderBottom: '1px solid rgba(0,0,0,0.03)', 
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    backgroundColor: selectedBlogs.includes(blog.id) ? 'rgba(0,122,255,0.02)' : 'transparent'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.01)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedBlogs.includes(blog.id) ? 'rgba(0,122,255,0.02)' : 'transparent'}
                            >
                                <td style={{ padding: '1.25rem' }} onClick={e => e.stopPropagation()}>
                                    <input 
                                        type="checkbox" 
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        checked={selectedBlogs.includes(blog.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedBlogs([...selectedBlogs, blog.id]);
                                            else setSelectedBlogs(selectedBlogs.filter(id => id !== blog.id));
                                        }}
                                    />
                                </td>
                                <td style={{ padding: '1.25rem', fontWeight: '700', color: '#888', fontSize: '13px' }}>{idx + 1}</td>
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
                                <td style={{ padding: '1.25rem' }} onClick={e => e.stopPropagation()}>
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
                <div className="glass-card" style={{ borderRadius: '10px', overflow: 'hidden' }}>
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
                            <div 
                                key={blog.id} 
                                onClick={() => { setSelectedBlog(blog); setShowBlogDetail(true); }}
                                style={{ 
                                    display: 'flex', alignItems: 'flex-start', gap: '1.5rem', padding: '1.5rem 2rem', 
                                    borderBottom: idx < blogs.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.01)';
                                    e.currentTarget.style.transform = 'scale(1.002)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#888', minWidth: '30px', marginTop: '4px' }}>{idx + 1}</div>
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

        {activeTab === 'XF Blog' && (
            <div style={{ minHeight: '100vh', backgroundColor: '#f5f5ee' }}>
                <Blog embedded={true} />
            </div>
        )}

        {activeTab === 'Member Requests' && (
            <div className="glass-card" style={{ borderRadius: '10px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                {renderSearchHeader("Member Requests", memberRequestSearchQuery, setMemberRequestSearchQuery)}

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ width: '50px', padding: '1.25rem' }}>
                                <input 
                                    type="checkbox" 
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    checked={selectedMemberRequests.length === filteredMemberApps.filter(a => a.status !== 'withdrawn').length && filteredMemberApps.length > 0}
                                    onChange={(e) => {
                                        const currentList = filteredMemberApps.filter(a => a.status !== 'withdrawn');
                                        if (e.target.checked) setSelectedMemberRequests(currentList.map(a => a.id));
                                        else setSelectedMemberRequests([]);
                                    }}
                                />
                            </th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', width: '50px' }}>#</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>CANDIDATE</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>REASON</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMemberApps.filter(a => a.status !== 'withdrawn').length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>No member requests found matching your search.</td></tr>
                        ) : filteredMemberApps.filter(a => a.status !== 'withdrawn').map((app, idx) => (
                            <tr key={app.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', backgroundColor: selectedMemberRequests.includes(app.id) ? 'rgba(0,122,255,0.02)' : 'transparent' }}>
                                <td style={{ padding: '1.25rem' }}>
                                    <input 
                                        type="checkbox" 
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        checked={selectedMemberRequests.includes(app.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedMemberRequests([...selectedMemberRequests, app.id]);
                                            else setSelectedMemberRequests(selectedMemberRequests.filter(id => id !== app.id));
                                        }}
                                    />
                                </td>
                                <td style={{ padding: '1.25rem', fontWeight: '700', color: '#888', fontSize: '13px' }}>{idx + 1}</td>
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
            <div className="glass-card" style={{ borderRadius: '10px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
                {renderSearchHeader("Withdrawn Apps", withdrawnSearchQuery, setWithdrawnSearchQuery, handleExportWithdrawn)}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase', width: '50px' }}>#</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>CANDIDATE / STARTUP</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>TYPE</th>
                            <th style={{ padding: '1.25rem', color: '#667777', fontSize: '12px', textTransform: 'uppercase' }}>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredWithdrawn.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>No withdrawn applications found matching your search.</td></tr>
                        ) : filteredWithdrawn.map((app, idx) => (
                            <tr key={app.id + idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '1.25rem', fontWeight: '700', color: '#888', fontSize: '13px' }}>{idx + 1}</td>
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
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'Backup' && (
            <div className="glass-card" style={{ flex: 1, padding: '2.5rem', borderRadius: '0', height: 'calc(100vh - 20px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '12px', padding: '2rem', border: '1px solid rgba(0,0,0,0.05)' }}>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '11px', fontWeight: '900', letterSpacing: '0.1em', opacity: 0.4, textTransform: 'uppercase' }}>BACKUP CONTENT ({externalFounders.length} EMAILS)</h4>
                                <div style={{ position: 'relative', width: '350px' }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Search backup emails..."
                                            value={backupSearch}
                                            onChange={(e) => setBackupSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setBackupSearch('');
                                                }
                                            }}
                                            style={{ 
                                                width: '100%', padding: '12px 45px 12px 16px', borderRadius: '14px', 
                                                backgroundColor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)',
                                                fontSize: '14px', fontWeight: '700', outline: 'none', transition: 'all 0.2s'
                                            }}
                                            onFocus={e => e.currentTarget.style.backgroundColor = '#fff'}
                                            onBlur={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'}
                                        />
                                        <svg style={{ position: 'absolute', right: '14px', color: '#000' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    </div>
                                    {/* Combined Suggestion Logic */}
                                    {(() => {
                                        const domainSuggestion = getEmailSuggestion(backupSearch);
                                        const fuzzyMatch = getFuzzyBackupSuggestion();
                                        const suggestion = domainSuggestion || (fuzzyMatch ? { original: backupSearch, suggestion: fuzzyMatch } : null);
                                        
                                        if (!suggestion) return null;
                                        
                                        return (
                                            <div 
                                                onClick={() => setBackupSearch(suggestion.suggestion)}
                                                style={{ 
                                                    position: 'absolute', top: '100%', left: 0, right: 0, 
                                                    backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.1)', 
                                                    borderRadius: '12px', padding: '10px 14px', marginTop: '8px', 
                                                    fontSize: '12px', fontWeight: '800', cursor: 'pointer', zIndex: 100,
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', animation: 'fadeInDown 0.2s ease-out',
                                                    display: 'flex', alignItems: 'center', gap: '8px'
                                                }}
                                            >
                                                <div style={{ color: '#007aff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                                    Did you mean
                                                </div>
                                                <span style={{ color: '#000', textDecoration: 'underline' }}>{suggestion.suggestion}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                                {externalFounders.filter(f => f.email.toLowerCase().includes(backupSearch.toLowerCase())).map((f, i) => (
                                    <div key={i} style={{ padding: '12px 16px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(0,0,0,0.02)' }}>
                                        <span style={{ opacity: 0.3, fontSize: '11px', fontWeight: '800', width: '20px' }}>{i + 1}.</span>
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#000' }}>{f.email}</span>
                                    </div>
                                ))}
                                {externalFounders.filter(f => f.email.toLowerCase().includes(backupSearch.toLowerCase())).length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '6rem 2rem', opacity: 0.6, fontWeight: 700 }}>
                                        <div style={{ fontSize: '64px', marginBottom: '1.5rem', filter: 'grayscale(1)' }}>🔍</div>
                                        <div style={{ fontSize: '1.1rem', color: '#000' }}>No matching emails found in backup</div>
                                        <div style={{ fontSize: '13px', color: '#666', marginTop: '8px', fontWeight: '500' }}>Try a different search term or check for typos</div>
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
                            position: 'absolute', right: '-2px', top: 0, bottom: 0, width: '6px', 
                            cursor: 'col-resize', 
                            backgroundColor: isResizing ? '#007aff' : 'transparent', 
                            transition: 'all 0.2s', zIndex: 100,
                            borderRight: isResizing ? 'none' : '2px solid rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={e => { if(!isResizing) { e.currentTarget.style.backgroundColor = 'rgba(0,122,255,0.1)'; e.currentTarget.style.width = '10px'; } }}
                        onMouseLeave={e => { if(!isResizing) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.width = '6px'; } }}
                    />
                    {isResizing && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, cursor: 'col-resize' }} />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>External Founders ({externalFounders.length})</h4>
                                <div style={{ fontSize: '10px', color: '#888', fontWeight: '700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34c759' }}></div>
                                    CLOUD REGISTRY ACTIVE
                                </div>
                            </div>
                            <a 
                                href={syncAccountEmail ? `https://mail.google.com/mail/?authuser=${syncAccountEmail}` : "https://mail.google.com"} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                    padding: '8px', 
                                    borderRadius: '10px', 
                                    backgroundColor: 'rgba(0,0,0,0.03)', 
                                    color: '#666', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    transition: 'all 0.2s',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = '#000'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)'; e.currentTarget.style.color = '#666'; }}
                                title="Open Gmail"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={handleSyncAllGmail}
                                disabled={isSyncingAll}
                                style={{ 
                                    width: '135px', height: '36px', borderRadius: '6px', border: '1px solid #000', 
                                    background: '#000', color: '#fff', fontSize: '11px', fontWeight: '600', 
                                    cursor: isSyncingAll ? 'not-allowed' : 'pointer', display: 'flex', 
                                    alignItems: 'center', justifyContent: 'center', gap: '8px', 
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', opacity: isSyncingAll ? 0.7 : 1, 
                                    boxShadow: isSyncingAll ? 'none' : '0 4px 12px rgba(0,0,0,0.1)',
                                    flexShrink: 0
                                }}
                                onMouseEnter={e => { if(!isSyncingAll) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; } }}
                                onMouseLeave={e => { if(!isSyncingAll) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; } }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isSyncingAll ? 'spin 1s linear infinite' : 'none', flexShrink: 0 }}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                <span style={{ whiteSpace: 'nowrap' }}>{isSyncingAll ? 'SYNCING...' : 'SYNC ALL'}</span>
                            </button>
                            <button 
                                onClick={handleSyncGmail}
                                disabled={isSyncingIndividual}
                                style={{ 
                                    width: '135px', height: '36px', borderRadius: '6px', border: '1px solid #ea4335', 
                                    background: isSyncingIndividual ? '#ea4335' : 'rgba(234, 67, 53, 0.05)', 
                                    color: isSyncingIndividual ? '#fff' : '#ea4335', fontSize: '11px', 
                                    fontWeight: '600', cursor: isSyncingIndividual ? 'not-allowed' : 'pointer', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    flexShrink: 0
                                }}
                                onMouseEnter={e => { if(!isSyncingIndividual) { e.currentTarget.style.background = 'rgba(234, 67, 53, 0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                                onMouseLeave={e => { if(!isSyncingIndividual) { e.currentTarget.style.background = 'rgba(234, 67, 53, 0.05)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isSyncingIndividual ? 'spin 1s linear infinite' : 'none', flexShrink: 0 }}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                <span style={{ whiteSpace: 'nowrap' }}>{isSyncingIndividual ? 'SYNCING...' : 'SYNC'}</span>
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
                                    {selectedFounderIds.length > 0 && (
                                        <button 
                                            onClick={handleRemoveSelectedFounders}
                                            style={{ background: '#ff3b30', border: 'none', color: '#fff', fontSize: '10px', fontWeight: '800', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', animation: 'fadeInRight 0.3s' }}
                                        >
                                            Delete ({selectedFounderIds.length})
                                        </button>
                                    )}
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
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '600',
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
                                onClick={() => setSelectedExternalFounder(u)}
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
                                        <div style={{ position: 'relative' }}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleRemoveExternalFounder(u.email); }}
                                                style={{ background: 'none', border: 'none', color: '#ff3b30', fontSize: '10px', fontWeight: '700', cursor: 'pointer', opacity: 0.6 }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                            >
                                                Remove
                                            </button>
                                            {u.replyCount > 0 && (
                                                <div style={{ 
                                                    position: 'absolute', top: '-18px', right: '20px', 
                                                    backgroundColor: '#ff3b30', color: '#fff', 
                                                    fontSize: '9px', fontWeight: '900', 
                                                    minWidth: '16px', height: '16px', borderRadius: '8px', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    padding: '0 4px', boxShadow: '0 2px 5px rgba(255,59,48,0.4)',
                                                    zIndex: 2,
                                                    border: '2px solid #fff',
                                                    pointerEvents: 'none'
                                                }}>
                                                    {u.replyCount}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {selectedExternalFounder ? (
                    /* Individual Chat Interface */
                    <div className="glass-card" style={{ flex: 1, padding: '1.25rem 2.5rem 1rem 2.5rem', borderRadius: '0', height: 'calc(100vh - 20px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '0.75rem' }}>
                            <button 
                                onClick={() => {
                                    setSelectedExternalFounder(null);
                                    localStorage.removeItem('xf_admin_selected_founder_email');
                                }} 
                                style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                            </button>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>{selectedExternalFounder.name}</h3>
                                <div style={{ fontSize: '13px', color: '#666' }}>{selectedExternalFounder.email}</div>
                            </div>
                            <button 
                                onClick={handleClearMessages}
                                style={{ background: 'transparent', border: '1px solid #ddd', color: '#666', fontSize: '10px', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}
                            >
                                CLEAR SYNC
                            </button>
                        </div>

                        {/* Messages Thread */}
                        <div 
                            ref={messagesContainerRef}
                            style={{ flex: 1, overflowY: 'auto', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '16px', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}
                        >
                            {founderMessages.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '1rem' }}>✉️</div>
                                    <div style={{ color: '#888', fontSize: '14px', fontWeight: '600' }}>No messages in this thread.</div>
                                    <div style={{ color: '#aaa', fontSize: '12px' }}>Start the conversation by sending a mail.</div>
                                </div>
                            )}
                            {founderMessages.map((m, idx) => (
                                <div key={idx} 
                                    className="message-bubble-container"
                                    style={{ 
                                        alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start',
                                        maxWidth: '80%', 
                                        padding: '16px', 
                                        borderRadius: '12px', 
                                        backgroundColor: m.sender === 'admin' ? 'rgba(99, 0, 221, 0.08)' : '#f5f5f7', 
                                        backdropFilter: m.sender === 'admin' ? 'blur(10px)' : 'none',
                                        color: '#000',
                                        border: m.sender === 'admin' ? '1px solid rgba(99, 0, 221, 0.15)' : '1px solid rgba(0,0,0,0.05)',
                                        boxShadow: m.sender === 'admin' ? '0 4px 12px rgba(99, 0, 221, 0.05)' : '0 2px 8px rgba(0,0,0,0.05)',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={e => {
                                        const btn = e.currentTarget.querySelector('.msg-menu-btn');
                                        if (btn) btn.style.opacity = '1';
                                    }}
                                    onMouseLeave={e => {
                                        const btn = e.currentTarget.querySelector('.msg-menu-btn');
                                        const menu = e.currentTarget.querySelector('.msg-dropdown-menu');
                                        if (btn) btn.style.opacity = '0';
                                        if (menu) menu.style.display = 'none';
                                    }}
                                >
                                    <div 
                                        className="msg-menu-btn"
                                        style={{ position: 'absolute', top: '-10px', left: '-10px', opacity: '0', transition: 'opacity 0.2s', zIndex: 10 }}
                                    >
                                        <div 
                                            style={{ position: 'relative' }}
                                            onMouseEnter={e => {
                                                const menu = e.currentTarget.querySelector('.msg-dropdown-menu');
                                                if (menu) menu.style.display = 'block';
                                            }}
                                            onMouseLeave={e => {
                                                const menu = e.currentTarget.querySelector('.msg-dropdown-menu');
                                                if (menu) menu.style.display = 'none';
                                            }}
                                        >
                                            <button 
                                                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', color: '#000' }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                            </button>
                                            <div 
                                                className="msg-dropdown-menu"
                                                style={{ display: 'none', position: 'absolute', top: '100%', left: '0', paddingTop: '10px', background: 'transparent', zIndex: 100 }}
                                            >
                                                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', overflow: 'hidden', minWidth: '160px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                    {m.gmailId ? (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteMessage(m.gmailId); }}
                                                            style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: '#ff3b30', fontSize: '12px', fontWeight: '800', cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,59,48,0.08)'}
                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            Delete from Gmail
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleLocalDeleteMessage(m.id); }}
                                                            style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: '#ff3b30', fontSize: '12px', fontWeight: '800', cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,59,48,0.08)'}
                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            Delete Message
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {m.subject && <div style={{ fontSize: '11px', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase', opacity: 0.7 }}>{m.subject}</div>}
                                    {m.imageUrl && (
                                        <CacheImage 
                                            src={m.imageUrl} 
                                            alt="attachment" 
                                            style={{ maxWidth: '240px', maxHeight: '240px', objectFit: 'cover', borderRadius: '12px', marginTop: '4px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)' }} 
                                            onClick={() => window.open(m.imageUrl, '_blank')}
                                        />
                                    )}
                                    <div style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.5', wordBreak: 'break-word' }}>
                                        {m.text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                                            if (part.match(/https?:\/\/[^\s]+/)) {
                                                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: m.sender === 'admin' ? '#6300dd' : '#007aff', textDecoration: 'underline', fontWeight: '700' }}>{part}</a>;
                                            }
                                            return part;
                                        })}
                                    </div>
                                    <div style={{ fontSize: '10px', color: m.sender === 'admin' ? 'rgba(99,0,221,0.6)' : '#999', marginTop: '6px', textAlign: 'right' }}>
                                        <span>{new Date(m.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!isWritingMail ? (
                            <div 
                                style={{ position: 'absolute', bottom: '20px', right: '24px', zIndex: 50 }}
                                onMouseEnter={() => setShowMailMenu(true)}
                                onMouseLeave={() => setShowMailMenu(false)}
                            >
                                {/* Options Menu — styled like landing page nav dropdown */}
                                <div style={{ 
                                    position: 'absolute', bottom: '66px', right: '0',
                                    opacity: showMailMenu ? '1' : '0', 
                                    transform: showMailMenu ? 'translateY(0)' : 'translateY(10px)', 
                                    pointerEvents: showMailMenu ? 'auto' : 'none',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    /* Landing page dropdown styles */
                                    background: 'rgba(255, 255, 255, 0.72)',
                                    minWidth: '220px',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                                    padding: '0.75rem 0',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                    backdropFilter: 'blur(32px) saturate(200%)',
                                    WebkitBackdropFilter: 'blur(32px) saturate(200%)',
                                }}>
                                    {/* Compose Email */}
                                    <button 
                                        onClick={() => { setIsWritingMail(true); setShowMailMenu(false); }}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            width: '100%', background: 'transparent', border: 'none',
                                            padding: '0.65rem 1.25rem',
                                            margin: '0.2rem 0',
                                            cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500', 
                                            color: '#444', whiteSpace: 'nowrap',
                                            borderRadius: '8px',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'left',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(99, 0, 221, 0.08)'; e.currentTarget.style.color = '#ff6600'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 0, 221, 0.05)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#444'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                        Compose Email
                                    </button>

                                    {/* Divider */}
                                    <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '0.25rem 0.75rem' }} />

                                    {/* Saved Draft */}
                                    <button 
                                        onClick={() => { setIsWritingMail(true); setShowMailMenu(false); }}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            width: '100%', background: 'transparent', border: 'none',
                                            padding: '0.65rem 1.25rem',
                                            margin: '0.2rem 0',
                                            cursor: 'pointer', fontSize: '0.95rem', fontWeight: '500', 
                                            color: '#444', whiteSpace: 'nowrap',
                                            borderRadius: '8px',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'left',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(99, 0, 221, 0.08)'; e.currentTarget.style.color = '#ff6600'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 0, 221, 0.05)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#444'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                        Saved Draft
                                        {draftMemory.current[selectedExternalFounder?.email]?.text && (
                                            <span style={{ 
                                                background: '#6300dd', color: '#fff', 
                                                borderRadius: '50%', width: '18px', height: '18px', 
                                                fontSize: '10px', fontWeight: '900', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                marginLeft: 'auto', flexShrink: 0
                                            }}>1</span>
                                        )}
                                    </button>
                                </div>

                                {/* Transparent bridge covers gap between menu and FAB so hover doesn't drop */}
                                <div style={{ 
                                    position: 'absolute', bottom: '56px', right: '0', 
                                    width: '200px', height: '16px', 
                                    background: 'transparent' 
                                }} />

                                {/* FAB Button */}
                                <button 
                                    onClick={() => setShowMailMenu(prev => !prev)}
                                    style={{ 
                                        width: '56px', height: '56px', borderRadius: '50%', 
                                        background: showMailMenu ? '#000' : 'rgba(255,255,255,0.9)', 
                                        backdropFilter: 'blur(16px)',
                                        color: showMailMenu ? '#fff' : '#000', 
                                        border: '1px solid rgba(0,0,0,0.08)', 
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.15)', 
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', 
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        transform: showMailMenu ? 'rotate(45deg)' : 'rotate(0deg)'
                                    }}
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                </button>
                            </div>
                        ) : (
                            <MailEditor 
                                key={`individual-${selectedExternalFounder.email}`}
                                initialSubject={draftMemory.current[selectedExternalFounder.email]?.subject}
                                initialText={draftMemory.current[selectedExternalFounder.email]?.text}
                                onDraftChange={handleDraftChange}
                                onSend={handleSendIndividualMail}
                                onCancel={() => {
                                    draftMemory.current[selectedExternalFounder.email] = { subject: '', text: '', image: null, isWriting: false };
                                    setPendingImage(null);
                                    setIsWritingMail(false);
                                    setToastMessage("Draft discarded");
                                    setShowToast(true);
                                    setTimeout(() => setShowToast(false), 2000);
                                }}
                                onSaveDraft={() => {
                                    setIsWritingMail(false);
                                    setToastMessage("Draft saved");
                                    setShowToast(true);
                                    setTimeout(() => setShowToast(false), 2000);
                                }}
                                pendingImage={pendingImage}
                                setPendingImage={setPendingImage}
                                isUploadingImage={isUploadingImage}
                                handleImageUpload={handleImageUpload}
                            />
                        )}
                    </div>
                ) : (
                    <div className="glass-card" style={{ flex: 1, padding: '2rem', borderRadius: '0', position: 'relative', height: 'calc(100vh - 20px)', overflowY: 'auto' }}>
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

                        {/* Bulk Action Editor instead of FAB */}
                        {!isWritingMail ? (
                            <button 
                                onClick={() => setIsWritingMail(true)}
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
                                title="Write Mail to All"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                        ) : (
                            <MailEditor 
                                key={`bulk-editor`}
                                initialSubject={draftMemory.current['bulk']?.subject}
                                initialText={draftMemory.current['bulk']?.text}
                                onDraftChange={handleDraftChange}
                                onSend={handleSendColdMail}
                                onCancel={() => {
                                    draftMemory.current['bulk'] = { subject: '', text: '', image: null, isWriting: false };
                                    setPendingImage(null);
                                    setIsWritingMail(false);
                                    setToastMessage("Draft discarded");
                                    setShowToast(true);
                                    setTimeout(() => setShowToast(false), 2000);
                                }}
                                onSaveDraft={() => {
                                    setIsWritingMail(false);
                                    setToastMessage("Draft saved");
                                    setShowToast(true);
                                    setTimeout(() => setShowToast(false), 2000);
                                }}
                                pendingImage={pendingImage}
                                setPendingImage={setPendingImage}
                                isUploadingImage={isUploadingImage}
                                handleImageUpload={handleImageUpload}
                            />
                        )}
                    </div>
                )}
            </div>
            </>
        )}

        {activeTab === 'Settings' && (
            <div style={{ animation: 'fadeInUp 0.4s ease-out', maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '3rem', padding: '1rem 0' }}>
                {/* Internal Settings Sidebar */}
                <div style={{ width: '240px', flexShrink: 0, position: 'sticky', top: '20px', height: 'fit-content' }}>
                    <h2 style={{ margin: '0 0 0.5rem 0', fontWeight: '900', fontSize: '2rem', letterSpacing: '-0.02em' }}>Settings</h2>
                    <p style={{ margin: '0 0 2rem 0', color: '#667777', fontSize: '14px', fontWeight: '500', lineHeight: '1.4' }}>Manage platform parameters and account security</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                            { id: 'Account', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>, label: 'Account Settings' },
                            { id: 'Integrations', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>, label: 'Gmail API' }
                        ].map(sub => (
                            <div 
                                key={sub.id}
                                onClick={() => setSettingsSubTab(sub.id)}
                                style={{ 
                                    padding: '12px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                                    backgroundColor: settingsSubTab === sub.id ? '#000' : 'transparent',
                                    color: settingsSubTab === sub.id ? '#fff' : '#667777',
                                    fontWeight: '700', transition: 'all 0.2s', fontSize: '14.5px',
                                    boxShadow: settingsSubTab === sub.id ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
                                }}
                                onMouseEnter={e => settingsSubTab !== sub.id && (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)')}
                                onMouseLeave={e => settingsSubTab !== sub.id && (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center' }}>{sub.icon}</div>
                                {sub.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Settings Content */}
                <div style={{ flex: 1 }}>
                    {settingsSubTab === 'Account' && (
                        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '16px', marginBottom: '2rem', animation: 'fadeInDown 0.4s ease-out' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(99, 0, 221, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6300dd' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>Account Credentials</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#667777', fontWeight: '600' }}>Update your administrative email and password</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '800', color: '#1a1a1a', letterSpacing: '0.02em' }}>ADMIN EMAIL ADDRESS</label>
                                    <input 
                                        type="email"
                                        value={newAdminEmail}
                                        onChange={e => setNewAdminEmail(e.target.value)}
                                        placeholder="admin@xfoundary.com"
                                        style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '600', outline: 'none', transition: 'all 0.2s', backgroundColor: 'rgba(0,0,0,0.02)' }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#6300dd'; e.currentTarget.style.backgroundColor = '#fff'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'; }}
                                    />
                                    <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#667777', fontWeight: '500' }}>Verification required for email changes.</p>
                                </div>

                                <div style={{ paddingTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '800', color: '#1a1a1a' }}>NEW PASSWORD (OPTIONAL)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                placeholder="Leave blank to keep current"
                                                style={{ width: '100%', padding: '12px 45px 12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '600', outline: 'none', transition: 'all 0.2s', backgroundColor: 'rgba(0,0,0,0.02)' }}
                                                onFocus={e => { e.currentTarget.style.borderColor = '#34c759'; e.currentTarget.style.backgroundColor = '#fff'; }}
                                                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'; }}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '4px', display: 'flex', outline: 'none', boxShadow: 'none' }}
                                            >
                                                {showNewPassword ? (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                                ) : (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '800', color: '#1a1a1a' }}>CONFIRM PASSWORD</label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type={showNewPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                placeholder="Re-enter password..."
                                                style={{ width: '100%', padding: '12px 45px 12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '600', outline: 'none', transition: 'all 0.2s', backgroundColor: 'rgba(0,0,0,0.02)' }}
                                                onFocus={e => { e.currentTarget.style.borderColor = '#34c759'; e.currentTarget.style.backgroundColor = '#fff'; }}
                                                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'; }}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '4px', display: 'flex', outline: 'none', boxShadow: 'none' }}
                                            >
                                                {showNewPassword ? (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                                ) : (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Dashboard Preferences Section */}
                                <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '16px', marginTop: '2rem', animation: 'fadeInDown 0.4s ease-out 0.1s' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
                                        <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(52, 199, 89, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34c759' }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>Dashboard Preferences</h3>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#667777', fontWeight: '600' }}>Customize your admin experience and confirmation workflows</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {[
                                            { key: 'skipDeleteConfirm', label: 'Skip confirmation for Founder Deletion', desc: 'Immediately delete accounts without asking for confirmation' },
                                            { key: 'skipRemoveConfirm', label: 'Skip confirmation for Member Removal', desc: 'Immediately remove team members from the platform' }
                                        ].map(pref => (
                                            <div key={pref.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '14px', backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.02)' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#000', marginBottom: '2px' }}>{pref.label}</div>
                                                    <div style={{ fontSize: '12px', color: '#667', fontWeight: '500' }}>{pref.desc}</div>
                                                </div>
                                                <div 
                                                    onClick={() => setPreferences(prev => ({ ...prev, [pref.key]: !prev[pref.key] }))}
                                                    style={{ 
                                                        width: '50px', height: '28px', 
                                                        backgroundColor: preferences[pref.key] ? '#34c759' : '#e5e5ea', 
                                                        borderRadius: '14px', 
                                                        position: 'relative', 
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '24px', height: '24px',
                                                        backgroundColor: '#fff',
                                                        borderRadius: '50%',
                                                        position: 'absolute',
                                                        top: '2px',
                                                        left: preferences[pref.key] ? '24px' : '2px',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                                                    }} />
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <div style={{ marginTop: '1rem', padding: '16px', borderRadius: '14px', backgroundColor: 'rgba(99, 0, 221, 0.05)', border: '1px solid rgba(99, 0, 221, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '13px', color: '#6300dd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hard Reset</div>
                                                <div style={{ fontSize: '12px', color: '#667', fontWeight: '500', marginTop: '2px' }}>Clear all remembered choices and restore default prompts</div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setPreferences({ skipDeleteConfirm: false, skipRemoveConfirm: false });
                                                    setSkipConfirm(false);
                                                    setToastMessage("All preferences have been reset to default.");
                                                    setShowToast(true);
                                                    setTimeout(() => setShowToast(false), 3000);
                                                }}
                                                style={{ padding: '8px 16px', borderRadius: '10px', background: '#000', color: '#fff', border: 'none', fontWeight: '800', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                            >Reset to Default</button>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '1rem' }}>
                                    <button 
                                        onClick={() => auth.signOut()}
                                        style={{ 
                                            padding: '14px 24px', borderRadius: '8px', border: '1px solid #eee', 
                                            background: '#fff', color: '#ff3b30', fontWeight: '600', fontSize: '14px', 
                                            cursor: 'pointer', transition: 'all 0.3s ease',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,59,48,0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                        SIGN OUT
                                    </button>
                                    <button 
                                        onClick={handleUpdateEmail}
                                        disabled={isUpdatingEmail || (newAdminEmail === user?.email && !newPassword)}
                                        style={{ 
                                            padding: '14px 40px', borderRadius: '8px', border: 'none', 
                                            background: (isUpdatingEmail || (newAdminEmail === user?.email && !newPassword)) ? '#8e8e93' : '#000', 
                                            color: '#fff', fontWeight: '600', fontSize: '14px', 
                                            cursor: (isUpdatingEmail || (newAdminEmail === user?.email && !newPassword)) ? 'not-allowed' : 'pointer', 
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            boxShadow: (isUpdatingEmail || (newAdminEmail === user?.email && !newPassword)) ? 'none' : '0 10px 25px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        {isUpdatingEmail ? (
                                            <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                        )}
                                        {isUpdatingEmail ? 'UPDATING...' : 'SAVE CHANGES'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {settingsSubTab === 'Integrations' && (
                        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '16px', marginBottom: '2rem', animation: 'fadeInDown 0.4s ease-out' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(234, 67, 53, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea4335' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.25rem' }}>Gmail API Integration</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#667777', fontWeight: '600' }}>Required for synchronizing external email history</p>
                                </div>
                            </div>

                            {syncAccountEmail && (
                                <div style={{ marginBottom: '2rem', padding: '1.25rem', backgroundColor: 'rgba(52,199,89,0.05)', borderRadius: '16px', border: '1px solid rgba(52,199,89,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#34c759' }}></div>
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: '800', color: '#34c759', letterSpacing: '0.05em' }}>AUTHORIZED GMAIL ACCOUNT</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#000' }}>{syncAccountEmail}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', padding: '8px 16px', background: 'rgba(0,0,0,0.05)', color: '#000', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>GO TO GMAIL</a>
                                        <button onClick={handleDisconnectGmail} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ff3b30', color: '#ff3b30', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>DISCONNECT</button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '800', color: '#1a1a1a' }}>GMAIL CLIENT ID</label>
                                    <input 
                                        value={gmailClientId}
                                        onChange={e => setGmailClientId(e.target.value)}
                                        style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.02)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '800', color: '#1a1a1a' }}>GMAIL CLIENT SECRET</label>
                                    <input 
                                        type="password"
                                        value={gmailClientSecret}
                                        onChange={e => setGmailClientSecret(e.target.value)}
                                        style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.02)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
                                <button 
                                    onClick={handleSaveSettings}
                                    disabled={isSavingSettings || settingsSaved}
                                    style={{ padding: '14px 32px', borderRadius: '16px', border: 'none', background: settingsSaved ? '#8e8e93' : '#000', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
                                >
                                    {isSavingSettings ? 'SAVING...' : settingsSaved ? 'SAVED' : 'SAVE CONFIGURATION'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
        </main>

        {/* Real-time Sending Progress Overlay */}
        {sendingStatus && (
            <div style={{ 
                position: 'fixed', bottom: '40px', right: '40px', 
                backgroundColor: '#000', padding: '20px 24px', borderRadius: '10px', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)', color: '#fff', zIndex: 6000, 
                minWidth: '320px', animation: 'slideUp 0.3s ease-out'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', backgroundColor: '#34c759', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                        <span style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.05em' }}>SENDING PROGRESS</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', opacity: 0.7 }}>{sendingStatus.count} / {sendingStatus.total}</span>
                </div>
                <div style={{ marginBottom: '14px', backgroundColor: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(sendingStatus.count / sendingStatus.total) * 100}%`, height: '100%', backgroundColor: '#fff', transition: 'width 0.3s ease-out' }}></div>
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

        {/* Toast Notification */}
        {showToast && (
          <div style={{ 
            position: 'fixed', bottom: '40px', right: '40px', 
            backgroundColor: '#fff', padding: '16px 24px', borderRadius: '12px', 
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)', display: 'flex', 
            alignItems: 'center', gap: '12px', zIndex: 9000, 
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)', 
            borderLeft: '6px solid #4caf50', minWidth: '280px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="16 12 12 8 8 12"></polyline><line x1="12" y1="16" x2="12" y2="8"></line></svg>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a', flex: 1 }}>{toastMessage}</span>
            <div onClick={() => setShowToast(false)} style={{ cursor: 'pointer', color: '#ccc', fontSize: '18px', display: 'flex', alignItems: 'center', padding: '4px', marginLeft: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </div>
          </div>
        )}
        {isSyncingAll && (
            <div 
                ref={syncCardRef}
                style={{ 
                    position: 'fixed', 
                    bottom: '2rem', 
                    right: '2rem', 
                    width: '350px', 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    padding: '1.5rem', 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)', 
                    border: '1px solid rgba(0,0,0,0.05)', 
                    zIndex: 9999, 
                    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: `translate(${dragInfo.current?.cardX || 0}px, ${dragInfo.current?.cardY || 0}px)`,
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s',
                    userSelect: 'none'
                }}>
                <button 
                    onClick={() => setIsSyncingAll(false)}
                    style={{ 
                        position: 'absolute', top: '12px', right: '12px', 
                        width: '28px', height: '28px', borderRadius: '50%', 
                        background: 'rgba(0,0,0,0.04)', border: 'none', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        cursor: 'pointer', transition: 'all 0.2s', zIndex: 1000
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,48,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#000' }}>Cloud Syncing</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#000' }}>{syncProgress}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#888', fontWeight: '700' }}>{syncEta ? `Est. time remaining: ${syncEta}` : 'Calculating...'}</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#f0f0f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ width: `${syncProgress}%`, height: '100%', backgroundColor: '#000', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34c759', animation: 'pulse 1.5s infinite' }}></div>
                    <span style={{ fontSize: '11px', color: '#666', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Fetching: {syncCurrentEmail}
                    </span>
                </div>
            </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, animation: 'fadeIn 0.2s ease-out' }}>
                <div className="glass-card" style={{ width: '400px', padding: '2.5rem', borderRadius: '14px', backgroundColor: '#fff', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', position: 'relative' }}>
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

        {/* Application Detail Page (Full Scale) */}
        {showAppDetail && selectedApplication && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f5f5f7', zIndex: 5000, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>

                    
                    {/* Header */}
                    <div style={{ padding: '1.5rem 4rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                            <button 
                                onClick={() => setShowAppDetail(false)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#007aff', fontWeight: '700', fontSize: '15px', cursor: 'pointer', padding: '8px 12px', borderRadius: '12px', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,122,255,0.05)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                Back to Dashboard
                            </button>
                            <div style={{ width: '1px', height: '24px', backgroundColor: '#eee' }}></div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <h2 style={{ margin: 0, fontWeight: '900', fontSize: '1.5rem', color: '#000', letterSpacing: '-0.02em' }}>{selectedApplication.companyName}</h2>
                                    <span style={{ 
                                        padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', 
                                        backgroundColor: selectedApplication.status === 'approved' ? 'rgba(52,199,89,0.1)' : selectedApplication.status === 'hold' ? 'rgba(255,159,10,0.1)' : 'rgba(0,0,0,0.05)',
                                        color: selectedApplication.status === 'approved' ? '#34c759' : selectedApplication.status === 'hold' ? '#ff9f0a' : '#000',
                                        textTransform: 'uppercase'
                                    }}>
                                        {selectedApplication.status || 'PENDING'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, opacity: 0.5, fontSize: '13px', fontWeight: '600' }}>Submitted by {selectedApplication.userName}</p>
                            <p style={{ margin: 0, opacity: 0.4, fontSize: '12px', fontWeight: '500' }}>{selectedApplication.userEmail}</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '4rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3rem' }}>
                        
                        {/* Iterate through application fields */}
                        {Object.entries(selectedApplication).map(([key, value]) => {
                            // Skip metadata and internal fields
                            if (['id', 'status', 'userId', 'submittedAt', 'updatedAt', 'userName', 'userEmail'].includes(key)) return null;
                            if (typeof value === 'object' && value !== null) return null; // Skip nested objects for now

                            // Format the label
                            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                            return (
                                <div key={key} style={{ animation: 'fadeInUp 0.4s ease-out' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '900', color: '#667777', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</h4>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#111', lineHeight: '1.6', backgroundColor: 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.02)' }}>
                                        {typeof value === 'string' && value.startsWith('http') && (value.match(/\.(jpeg|jpg|gif|png|webp)/i) || value.includes('firebasestorage')) ? (
                                            <CacheImage src={value} alt={label} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', marginTop: '4px' }} />
                                        ) : (
                                            value || 'N/A'
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Special case for longer text fields if they weren't caught in the grid */}
                        {selectedApplication.description && (
                            <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '900', color: '#667777', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Description</h4>
                                <div style={{ fontSize: '15px', fontWeight: '500', color: '#333', lineHeight: '1.8', backgroundColor: 'rgba(0,0,0,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)', whiteSpace: 'pre-wrap' }}>
                                    {selectedApplication.description}
                                </div>
                            </div>
                        )}
                    </div>
                    </div>

                    {/* Footer Actions */}
                    {(selectedApplication.status === 'pending' || !selectedApplication.status) && (
                        <div style={{ padding: '2.5rem 4rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'center', gap: '1.5rem', background: '#fff' }}>
                            <button 
                                onClick={() => { handleAppStatus(selectedApplication.id, 'approved'); setShowAppDetail(false); }}
                                style={{ padding: '16px 48px', borderRadius: '16px', background: '#007aff', color: '#fff', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 8px 25px rgba(0, 122, 255, 0.2)' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 122, 255, 0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 122, 255, 0.2)'; }}
                            >Approve Application</button>
                            <button 
                                onClick={() => { handleAppStatus(selectedApplication.id, 'hold'); setShowAppDetail(false); }}
                                style={{ padding: '16px 32px', borderRadius: '16px', background: 'rgba(255,159,10,0.1)', color: '#ff9f0a', border: '1px solid rgba(255,159,10,0.2)', fontWeight: '800', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,159,10,0.2)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,159,10,0.1)'}
                            >Hold</button>
                            <button 
                                onClick={() => { handleAppStatus(selectedApplication.id, 'rejected'); setShowAppDetail(false); }}
                                style={{ padding: '16px 32px', borderRadius: '16px', background: 'rgba(255,59,48,0.1)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.2)', fontWeight: '800', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,59,48,0.2)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,59,48,0.1)'}
                            >Reject</button>
                        </div>
                    )}
            </div>
            </div>
        )}

        {showBlogDetail && selectedBlog && (
            <div style={{ position: 'fixed', top: 0, left: '300px', right: 0, bottom: 0, backgroundColor: '#f5f5ee', zIndex: 6000, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease-out', overflowY: 'auto' }}>
                {/* Header/Nav */}
                <div style={{ position: 'sticky', top: 0, background: 'rgba(245, 245, 238, 0.95)', backdropFilter: 'blur(20px)', zIndex: 10, padding: '1.5rem 4rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '900', fontSize: '12px', color: '#000', letterSpacing: '0.1em', opacity: 0.5 }}>BLOG PREVIEW</div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <span style={{ 
                            padding: '6px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', 
                            backgroundColor: selectedBlog.status === 'approved' ? 'rgba(52,199,89,0.1)' : 'rgba(255,149,0,0.1)',
                            color: selectedBlog.status === 'approved' ? '#34c759' : '#ff9500',
                            textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                            {selectedBlog.status?.toUpperCase() || 'DRAFT'}
                        </span>
                    </div>
                </div>

                {/* Article Content */}
                <article style={{ maxWidth: '800px', margin: '0 auto', padding: '6rem 2rem 10rem 2rem', animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <header style={{ marginBottom: '4rem' }}>
                        <button 
                            onClick={() => setShowBlogDetail(false)} 
                            style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '14px', cursor: 'pointer', marginBottom: '2rem', padding: 0 }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            Back to All Posts
                        </button>

                        <h1 style={{ fontSize: '3rem', fontWeight: '800', color: '#111', margin: '0 0 1rem 0', lineHeight: '1.1', letterSpacing: '-0.02em' }}>{selectedBlog.title}</h1>
                        
                        <div style={{ display: 'flex', gap: '10px', fontSize: '15px', color: '#666', marginBottom: '2.5rem' }}>
                            <span>{new Date(selectedBlog.date || selectedBlog.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            <span>&bull;</span>
                            <span>by <strong style={{ color: '#007bff' }}>{selectedBlog.author}</strong></span>
                        </div>
                    </header>

                    {(selectedBlog.image || selectedBlog.coverImage) && (
                        <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '3rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                            <img src={selectedBlog.image || selectedBlog.coverImage} alt={selectedBlog.title} style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }} />
                        </div>
                    )}

                    <div 
                        className="blog-content-preview"
                        style={{ 
                            fontSize: '1.2rem', 
                            lineHeight: '1.6', 
                            color: '#333', 
                            marginBottom: '5rem', 
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}
                        dangerouslySetInnerHTML={{ __html: selectedBlog.content }}
                    />
                    
                    <div style={{ margin: '5rem 0', padding: '3rem', borderRadius: '16px', backgroundColor: 'rgba(0,0,0,0.03)', textAlign: 'center' }}>
                        <h3 style={{ fontWeight: '800', marginBottom: '1rem' }}>End of Preview</h3>
                        <p style={{ color: '#666', fontSize: '15px', fontWeight: '600' }}>This is how the blog post will appear to users on the main website.</p>
                    </div>
                </article>

                <style>{`
                    .blog-content-preview p, 
                    .blog-content-preview div { 
                        margin: 0; 
                        padding: 0;
                    }
                    .blog-content-preview h2 { font-size: 2.2rem; font-weight: 900; margin: 2rem 0 1rem; letter-spacing: -0.03em; color: #000; }
                    .blog-content-preview h3 { font-size: 1.8rem; font-weight: 800; margin: 1.5rem 0 1rem; color: #000; }
                    .blog-content-preview img { max-width: 100%; height: auto; borderRadius: 12px; margin: 2rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
                    .blog-content-preview blockquote { border-left: 4px solid #6300dd; padding-left: 2rem; margin: 2rem 0; font-style: italic; color: #444; font-size: 1.3rem; }
                    .blog-content-preview ul, .blog-content-preview ol { margin-bottom: 1.5rem; padding-left: 1.5rem; }
                    .blog-content-preview li { margin-bottom: 0.5rem; }
                `}</style>
            </div>
        )}

        {confirmModal.show && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.2s ease-out' }}>
                <div className="glass-card" style={{ width: '400px', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', animation: 'fadeInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                    <div style={{ width: '50px', height: '50px', backgroundColor: 'rgba(255,59,48,0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff3b30', marginBottom: '1.5rem' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </div>
                    <h3 style={{ margin: '0 0 1rem 0', fontWeight: '900', fontSize: '1.4rem' }}>{confirmModal.title}</h3>
                    <p style={{ margin: '0 0 2rem 0', color: '#666', lineHeight: '1.6', fontSize: '15px' }}>{confirmModal.message}</p>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '2rem' }}>
                        <input 
                            type="checkbox" 
                            id="rememberChoice"
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#444' }}>Remember my choice</span>
                    </label>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                            style={{ flex: 1, padding: '14px', backgroundColor: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                        >Cancel</button>
                        <button 
                            onClick={() => {
                                const remember = document.getElementById('rememberChoice').checked;
                                if (remember && confirmModal.actionKey) {
                                    setPreferences({ ...preferences, [confirmModal.actionKey]: true });
                                }
                                confirmModal.onConfirm();
                                setConfirmModal({ ...confirmModal, show: false });
                            }}
                            style={{ flex: 1.5, padding: '14px', backgroundColor: '#ff3b30', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(255,59,48,0.2)' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >Confirm Action</button>
                    </div>
                </div>
            </div>
        )}
        {expandingChart && (
            <div style={{ position: 'fixed', top: 0, left: '300px', right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.98)', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '5rem', animation: 'expandChart 0.4s cubic-bezier(0.16, 1, 0.3, 1)', fontFamily: chartFont }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: '900', fontSize: '3rem', letterSpacing: '-0.04em' }}>{expandingChart} Distribution</h2>
                        <p style={{ margin: '8px 0 0', fontSize: '16px', color: '#667777', fontWeight: '600' }}>In-depth metrics for the current startup batch</p>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {expandingChart === 'Weekly' ? (
                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: '12px', padding: '4px' }}>
                                {['Area', 'Line', 'Bar'].map(t => (
                                    <button key={t} onClick={() => setWeeklyChartType(t)} style={{ padding: '8px 20px', border: 'none', borderRadius: '10px', background: weeklyChartType === t ? '#fff' : 'transparent', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: weeklyChartType === t ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}>{t.toUpperCase()}</button>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: '12px', padding: '4px' }}>
                                    {['Category', 'Industry'].map(g => (
                                        <button key={g} onClick={() => setDistGrouping(g)} style={{ padding: '8px 20px', border: 'none', borderRadius: '10px', background: distGrouping === g ? '#fff' : 'transparent', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: distGrouping === g ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}>{g.toUpperCase()}</button>
                                    ))}
                                </div>
                                <select 
                                    value={distFilterStatus}
                                    onChange={e => setDistFilterStatus(e.target.value)}
                                    style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '13px', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                <select 
                                    value={distFilterBatch}
                                    onChange={e => setDistFilterBatch(e.target.value)}
                                    style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '13px', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="all">All Batches</option>
                                    {[...new Set(applications.map(a => a.batch || 'Upcoming'))].sort().map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </>
                        )}
                        <select 
                            value={chartFont} 
                            onChange={e => setChartFont(e.target.value)}
                            style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '13px', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="Inter">Inter (Sans)</option>
                            <option value="'Roboto Mono', monospace">Roboto Mono (Code)</option>
                            <option value="'Playfair Display', serif">Playfair (Serif)</option>
                        </select>
                        <button 
                            onClick={() => setExpandingChart(null)}
                            style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#000', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', transition: 'transform 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        {expandingChart === 'Category' ? (() => {
                            const filtered = applications.filter(app => {
                                if (distFilterStatus !== 'all' && (app.status || 'pending') !== distFilterStatus) return false;
                                if (distFilterBatch !== 'all' && (app.batch || 'Upcoming') !== distFilterBatch) return false;
                                return true;
                            });

                            const distribution = filtered.reduce((acc, app) => {
                                let keys = [];
                                if (distGrouping === 'Category') {
                                    keys = [app.category || 'Other'];
                                } else {
                                    if (Array.isArray(app.industries) && app.industries.length > 0) keys = app.industries;
                                    else keys = [app.category, app.subCategory].filter(Boolean);
                                    if (keys.length === 0) keys = ['Other'];
                                }
                                keys.forEach(key => { acc[key] = (acc[key] || 0) + 1; });
                                return acc;
                            }, {});

                            const data = Object.entries(distribution).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

                            return chartType === 'Bar' ? (
                                <BarChart data={data}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#667777' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#667777' }} />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="value" fill="#000" radius={[8, 8, 0, 0]} barSize={60} />
                                </BarChart>
                            ) : (
                                <LineChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#667777' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#667777' }} />
                                    <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }} />
                                    <Line type="monotone" dataKey="value" stroke="#000" strokeWidth={5} dot={{ r: 6, fill: '#000', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8 }} />
                                </LineChart>
                            );
                        })() : weeklyChartType === 'Bar' ? (
                            <BarChart data={Object.entries(applications.reduce((acc, app) => {
                                const date = new Date(app.submittedAt || Date.now());
                                const week = `W${Math.ceil(date.getDate() / 7)}`;
                                acc[week] = (acc[week] || 0) + 1;
                                return acc;
                            }, {})).map(([name, value]) => ({ name, value }))}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#667777' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#667777' }} />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" fill="#000" radius={[8, 8, 0, 0]} barSize={80} />
                            </BarChart>
                        ) : weeklyChartType === 'Line' ? (
                            <LineChart data={Object.entries(applications.reduce((acc, app) => {
                                const date = new Date(app.submittedAt || Date.now());
                                const week = `W${Math.ceil(date.getDate() / 7)}`;
                                acc[week] = (acc[week] || 0) + 1;
                                return acc;
                            }, {})).map(([name, value]) => ({ name, value }))}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#667777' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#667777' }} />
                                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                                <Line type="monotone" dataKey="value" stroke="#000" strokeWidth={5} dot={{ r: 6, fill: '#000', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8 }} />
                            </LineChart>
                        ) : (
                            <AreaChart data={Object.entries(applications.reduce((acc, app) => {
                                const date = new Date(app.submittedAt || Date.now());
                                const week = `W${Math.ceil(date.getDate() / 7)}`;
                                acc[week] = (acc[week] || 0) + 1;
                                return acc;
                            }, {})).map(([name, value]) => ({ name, value }))}>
                                <defs>
                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#000" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#667777' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#667777' }} />
                                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="value" stroke="#000" strokeWidth={5} fillOpacity={1} fill="url(#colorExp)" />
                            </AreaChart>
                        )
                        }
                    </ResponsiveContainer>
                </div>
            </div>
        )}

        <style>{`
            @keyframes expandChart {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
        `}</style>

        {/* Founder Profile Editor Modal */}
        {showFounderEditor && selectedFounder && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
                <div style={{ width: '600px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 30px 100px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    {/* Header */}
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.25rem' }}>Edit Founder Profile</h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#667', fontWeight: '600' }}>Manage profile details and public identity</p>
                        </div>
                        <button 
                            onClick={() => setShowFounderEditor(false)}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,59,48,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#667" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
                        <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
                            <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                {selectedFounder.profile?.profileImage || selectedFounder.photoURL ? (
                                    <img src={selectedFounder.profile?.profileImage || selectedFounder.photoURL} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} alt="" />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', borderRadius: '12px', backgroundColor: '#f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', color: '#ccc' }}>
                                        {(selectedFounder.profile?.name || selectedFounder.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <label style={{ position: 'absolute', bottom: '-8px', right: '-8px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                    <input type="file" hidden accept="image/*" onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        setIsUploadingImage(true);
                                        try {
                                            const storageRef = ref(storage, `profiles/${selectedFounder.id}/${Date.now()}_${file.name}`);
                                            await uploadBytes(storageRef, file);
                                            const url = await getDownloadURL(storageRef);
                                            setSelectedFounder(prev => ({
                                                ...prev,
                                                profile: { ...prev.profile, profileImage: url }
                                            }));
                                            setToastMessage("Profile image updated! Click Save to confirm.");
                                            setShowToast(true);
                                        } catch (err) { alert(err.message); }
                                        finally { setIsUploadingImage(false); }
                                    }} />
                                </label>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#667', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Display Name</label>
                                    <input 
                                        type="text"
                                        value={selectedFounder.profile?.name || selectedFounder.name || ''}
                                        onChange={e => setSelectedFounder({...selectedFounder, profile: {...selectedFounder.profile, name: e.target.value}})}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '700', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#667', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Email Address</label>
                                    <input 
                                        type="text"
                                        value={selectedFounder.email || ''}
                                        disabled
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', backgroundColor: 'rgba(0,0,0,0.02)', fontSize: '14px', fontWeight: '600', color: '#889' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#667', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Bio / Description</label>
                            <textarea 
                                value={selectedFounder.profile?.bio || selectedFounder.profile?.description || ''}
                                onChange={e => setSelectedFounder({...selectedFounder, profile: {...selectedFounder.profile, bio: e.target.value}})}
                                placeholder="Write a short bio..."
                                style={{ width: '100%', minHeight: '100px', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '600', lineHeight: '1.5', resize: 'vertical', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#667', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>LinkedIn URL</label>
                                <input 
                                    type="text"
                                    value={selectedFounder.profile?.linkedin || selectedFounder.linkedin || ''}
                                    onChange={e => setSelectedFounder({...selectedFounder, profile: {...selectedFounder.profile, linkedin: e.target.value}})}
                                    placeholder="linkedin.com/in/username"
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '700', outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#667', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Twitter / X URL</label>
                                <input 
                                    type="text"
                                    value={selectedFounder.profile?.twitter || selectedFounder.twitter || ''}
                                    onChange={e => setSelectedFounder({...selectedFounder, profile: {...selectedFounder.profile, twitter: e.target.value}})}
                                    placeholder="twitter.com/username"
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', fontWeight: '700', outline: 'none' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '24px 32px', borderTop: '1px solid rgba(0,0,0,0.05)', backgroundColor: 'rgba(0,0,0,0.01)', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                        <button 
                            onClick={() => setShowFounderEditor(false)}
                            style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
                        >Cancel</button>
                        <button 
                            onClick={async () => {
                                setIsUploadingImage(true);
                                try {
                                    const docRef = doc(db, 'users', selectedFounder.id);
                                    await updateDoc(docRef, {
                                        profile: selectedFounder.profile || {},
                                        name: selectedFounder.profile?.name || selectedFounder.name || 'Unnamed'
                                    });
                                    setToastMessage("Founder profile updated successfully!");
                                    setShowToast(true);
                                    setTimeout(() => setShowToast(false), 3000);
                                    fetchData();
                                    setShowFounderEditor(false);
                                } catch (err) { alert(err.message); }
                                finally { setIsUploadingImage(false); }
                            }}
                            disabled={isUploadingImage}
                            style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: '#000', color: '#fff', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', opacity: isUploadingImage ? 0.7 : 1 }}
                        >
                            {isUploadingImage ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
    </>


  );
};



export default Admin;
