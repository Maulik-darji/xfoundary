import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const CATEGORIES = [
    'General', 'Admissions', 'Advice', 'Biotech', 'Blockchain',
    'Essay', 'Female Founders', 'Founder Stories', 'Interviews',
    'Startup Jobs', 'Startup School', 'Work at a Startup', 'XF Events'
];

const CreateBlog = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('General');
    const [coverImage, setCoverImage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [authorImage, setAuthorImage] = useState('');
    const [showImageModal, setShowImageModal] = useState(false);
    const [activeFormats, setActiveFormats] = useState({});

    const [isUploading, setIsUploading] = useState(false);

    const editorRef = useRef(null);
    const coverInputRef = useRef(null);
    const editorImageInputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'Create Blog Post | X Foundary';
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) { navigate('/login'); return; }
            setUser(currentUser);
            try {
                const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
                if (adminDoc.exists()) {
                    const data = adminDoc.data();
                    setUserRole('admin');
                    setAuthor(data.profile?.name || 'Admin');
                    setAuthorImage(data.profileImage || '');
                } else {
                    const memberDoc = await getDoc(doc(db, 'members', currentUser.uid));
                    if (memberDoc.exists()) {
                        const data = memberDoc.data();
                        setUserRole('member');
                        setAuthor(data.profile?.name || currentUser.email.split('@')[0]);
                        setAuthorImage(data.profileImage || '');
                    } else {
                        navigate('/home');
                    }
                }
            } catch (e) { navigate('/home'); }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [navigate]);

    // Track active formats for toolbar highlights
    const updateActiveFormats = () => {
        setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
        });
    };

    const execFormat = (command, value = null) => {
        editorRef.current.focus();
        document.execCommand(command, false, value);
        updateActiveFormats();
    };

    const handleInsertLink = () => {
        const url = window.prompt('Enter URL:');
        if (url) execFormat('createLink', url);
    };

    const handleInsertImage = () => {
        setShowImageModal(true);
    };

    const handleFileChange = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileRef = ref(storage, `blog/${user.uid}/${Date.now()}-${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            
            if (type === 'cover') {
                setCoverImage(url);
            } else {
                execFormat('insertImage', url);
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload image.");
        } finally {
            setIsUploading(false);
            e.target.value = null; // Reset input
        }
    };

    const handleHeading = () => {
        editorRef.current.focus();
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const block = range.startContainer.parentElement?.closest('h2, p, div');
        if (block && block.tagName === 'H2') {
            document.execCommand('formatBlock', false, 'p');
        } else {
            document.execCommand('formatBlock', false, 'h2');
        }
    };

    const getContent = () => editorRef.current?.innerHTML || '';

    const handleSubmit = async () => {
        const content = getContent();
        if (!title.trim() || !content.replace(/<[^>]*>/g, '').trim()) {
            alert('Please add a title and content before submitting.');
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'blog'), {
                title: title.trim(),
                content,
                author,
                category,
                image: coverImage || '',
                status: userRole === 'admin' ? 'approved' : 'pending',
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                userId: user.uid
            });
            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
                navigate(userRole === 'admin' ? '/admin' : '/member');
            }, 2000);
        } catch (e) {
            console.error(e);
            alert('Error creating post. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const btnStyle = (active) => ({
        background: active ? '#f0ebff' : 'none',
        border: active ? '1px solid rgba(99,0,221,0.2)' : '1px solid transparent',
        borderRadius: '6px',
        cursor: 'pointer',
        padding: '6px 9px',
        color: active ? '#6300dd' : '#555',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s'
    });

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f6f6ef' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #eee', borderTop: '3px solid #6300dd', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#111' }}>
            {/* Top Bar */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2.5rem', backgroundColor: '#fff', borderBottom: '1px solid #eee', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <Link to={userRole === 'admin' ? '/admin' : '/member'} style={{ color: '#666', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        Back to Portal
                    </Link>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#eee' }} />
                    <span style={{ fontWeight: '600', fontSize: '15px' }}>New Blog Post</span>
                    {userRole === 'member' && <span style={{ fontSize: '12px', color: '#ff9500', backgroundColor: 'rgba(255,149,0,0.1)', padding: '3px 8px', borderRadius: '20px', fontWeight: '600' }}>Requires Approval</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate(userRole === 'admin' ? '/admin' : '/member')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title}
                        style={{ backgroundColor: (isSubmitting || !title) ? '#e2e2e2' : '#6300dd', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: (isSubmitting || !title) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                    >
                        {isSubmitting ? 'Submitting...' : userRole === 'admin' ? 'Publish Now' : 'Submit for Review'}
                    </button>
                </div>
            </nav>

            <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 2rem 6rem' }}>
                {/* Cover Image Field */}
                <div style={{ marginBottom: '1.5rem' }}>
                    {coverImage ? (
                        <div style={{ position: 'relative' }}>
                            <img src={coverImage} alt="Cover" style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #eee' }} onError={() => setCoverImage('')} />
                            <button onClick={() => setCoverImage('')} style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Remove</button>
                        </div>
                    ) : (
                        <div
                            style={{ width: '100%', height: '100px', borderRadius: '12px', border: '2px dashed #ddd', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', color: '#999', backgroundColor: '#fff', transition: 'border-color 0.2s' }}
                            onClick={() => {
                                const choice = window.confirm('Click OK to upload from device, or Cancel to enter image URL');
                                if (choice) {
                                    coverInputRef.current.click();
                                } else {
                                    const url = window.prompt('Enter cover image URL:');
                                    if (url) setCoverImage(url);
                                }
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#6300dd'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#ddd'}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>Add cover image</span>
                        </div>
                    )}
                    <input type="file" ref={coverInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
                    <input type="file" ref={editorImageInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'editor')} />
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #eee', overflow: 'hidden' }}>
                    <div style={{ padding: '2.5rem 3rem' }}>
                        {/* Category */}
                        <div style={{ marginBottom: '1.75rem' }}>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                style={{ border: 'none', fontSize: '13px', color: '#6300dd', fontWeight: '700', backgroundColor: '#f5f0ff', padding: '6px 14px', borderRadius: '20px', outline: 'none', cursor: 'pointer' }}
                            >
                                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Title */}
                        <textarea
                            placeholder="Post Title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                            style={{ width: '100%', fontSize: '2.75rem', fontWeight: '800', border: 'none', outline: 'none', resize: 'none', fontFamily: 'Newsreader, serif', marginBottom: '1.25rem', minHeight: '70px', color: '#111', lineHeight: '1.2', backgroundColor: 'transparent' }}
                            rows={1}
                        />

                        {/* Author */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#6300dd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                                {author.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '600' }}>{author}</div>
                                <div style={{ fontSize: '12px', color: '#999' }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem', padding: '8px 10px', backgroundColor: '#f9f9f9', borderRadius: '10px', flexWrap: 'wrap' }}>
                            <button type="button" title="Bold (Ctrl+B)" style={btnStyle(activeFormats.bold)} onClick={() => execFormat('bold')}><b>B</b></button>
                            <button type="button" title="Italic (Ctrl+I)" style={btnStyle(activeFormats.italic)} onClick={() => execFormat('italic')}><i>I</i></button>
                            <button type="button" title="Underline (Ctrl+U)" style={btnStyle(activeFormats.underline)} onClick={() => execFormat('underline')}><u>U</u></button>
                            <div style={{ width: '1px', height: '24px', backgroundColor: '#ddd', margin: '4px 4px' }} />
                            <button type="button" title="Heading" style={btnStyle(false)} onClick={handleHeading}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
                            </button>
                            <button type="button" title="Quote" style={btnStyle(false)} onClick={() => execFormat('formatBlock', 'blockquote')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path></svg>
                            </button>
                            <button type="button" title="Bullet List" style={btnStyle(false)} onClick={() => execFormat('insertUnorderedList')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            </button>
                            <button type="button" title="Numbered List" style={btnStyle(false)} onClick={() => execFormat('insertOrderedList')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>
                            </button>
                            <div style={{ width: '1px', height: '24px', backgroundColor: '#ddd', margin: '4px 4px' }} />
                            <button type="button" title="Insert Link" style={btnStyle(false)} onClick={handleInsertLink}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                            </button>
                            <button type="button" title="Insert Image" style={btnStyle(false)} onClick={handleInsertImage}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </button>
                            <div style={{ width: '1px', height: '24px', backgroundColor: '#ddd', margin: '4px 4px' }} />
                            <button type="button" title="Undo" style={btnStyle(false)} onClick={() => execFormat('undo')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
                            </button>
                            <button type="button" title="Redo" style={btnStyle(false)} onClick={() => execFormat('redo')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>
                            </button>
                        </div>

                        {/* Rich Text Editor */}
                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            data-placeholder="Write your story..."
                            onKeyUp={updateActiveFormats}
                            onMouseUp={updateActiveFormats}
                            style={{
                                minHeight: '420px',
                                fontSize: '1.125rem',
                                lineHeight: '1.85',
                                outline: 'none',
                                color: '#333',
                                fontFamily: 'Inter, sans-serif',
                                wordBreak: 'break-word'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Placeholder CSS */}
            <style>{`
                [data-placeholder]:empty::before {
                    content: attr(data-placeholder);
                    color: #aaa;
                    pointer-events: none;
                }
                [contenteditable] h2 { font-size: 1.8rem; font-weight: 800; margin: 1.5rem 0 0.75rem; color: #111; }
                [contenteditable] blockquote { border-left: 4px solid #6300dd; padding: 0.5rem 0 0.5rem 1.5rem; margin: 1.5rem 0; color: #555; font-style: italic; }
                [contenteditable] a { color: #6300dd; }
                [contenteditable] img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
                [contenteditable] ul, [contenteditable] ol { padding-left: 1.5rem; margin: 0.75rem 0; }
                [contenteditable] li { margin: 0.4rem 0; }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>

            {/* Toast */}
            {showToast && (
                <div style={{ position: 'fixed', bottom: '40px', right: '40px', backgroundColor: '#111', color: '#fff', padding: '14px 24px', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 9999, animation: 'slideUp 0.3s ease-out' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span style={{ fontWeight: '600' }}>{userRole === 'admin' ? 'Published successfully!' : 'Submitted for review!'}</span>
                </div>
            )}
        </div>
    );
};

export default CreateBlog;
