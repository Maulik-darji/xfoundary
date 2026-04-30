import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const CATEGORIES = [
    'General', 'Admissions', 'Advice', 'Biotech', 'Blockchain',
    'Essay', 'Female Founders', 'Founder Stories', 'Interviews',
    'Startup Jobs', 'Startup School', 'Work at a Startup', 'XF Events'
];

// REPLACE THESE WITH YOUR ACTUAL GOOGLE CLOUD CREDENTIALS
const GOOGLE_API_KEY = "YOUR_API_KEY";
const GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";

const CreateBlog = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [category, setCategory] = useState('General');
    const [coverImage, setCoverImage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editId, setEditId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [authorImage, setAuthorImage] = useState('');
    const [imageModalConfig, setImageModalConfig] = useState({ show: false, type: 'cover' });
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [activeFormats, setActiveFormats] = useState({});

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

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
                    setAuthorImage(data.profileImage || currentUser.photoURL || '');
                } else {
                    const memberDoc = await getDoc(doc(db, 'members', currentUser.uid));
                    if (memberDoc.exists()) {
                        const data = memberDoc.data();
                        setUserRole('member');
                        setAuthor(data.profile?.name || currentUser.email.split('@')[0]);
                        setAuthorImage(data.profileImage || currentUser.photoURL || '');
                    } else {
                        navigate('/home');
                    }
                }
            } catch (e) { navigate('/home'); }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [navigate]);

    const { search } = useLocation();
    useEffect(() => {
        const id = new URLSearchParams(search).get('edit');
        if (id) {
            setEditId(id);
            setIsEditing(true);
            fetchPost(id);
        }
    }, [search]);

    const [initialContentSet, setInitialContentSet] = useState(false);

    const fetchPost = async (id) => {
        try {
            const snap = await getDoc(doc(db, 'blog', id));
            if (snap.exists()) {
                const data = snap.data();
                setTitle(data.title || '');
                setCategory(data.category || 'General');
                setCoverImage(data.image || '');
                // We'll set the content in a separate effect once editorRef is ready
                setPostData(data);
            }
        } catch (e) { console.error("Error fetching post:", e); }
    };

    const [postData, setPostData] = useState(null);

    useEffect(() => {
        if (postData && editorRef.current && !initialContentSet) {
            editorRef.current.innerHTML = postData.content || '';
            setInitialContentSet(true);
            // Trigger auto-resize for title
            const titleEl = document.querySelector('textarea');
            if (titleEl) {
                titleEl.style.height = 'auto';
                titleEl.style.height = titleEl.scrollHeight + 'px';
            }
        }
    }, [postData, initialContentSet]);

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    };

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
        setImageModalConfig({ show: true, type: 'editor' });
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e, type) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileChange({ target: { files: [file] } }, type);
            setImageModalConfig({ show: false, type: 'cover' });
        }
    };

    const handleDrivePicker = () => {
        if (GOOGLE_API_KEY === "YOUR_API_KEY") {
            alert("To enable Google Drive, please add your Google Cloud API Key and Client ID at the top of CreateBlog.js");
            return;
        }

        const loadPicker = () => {
            window.gapi.load('picker', {
                callback: () => {
                    const picker = new window.google.picker.PickerBuilder()
                        .addView(window.google.picker.ViewId.DOCS_IMAGES)
                        .setOAuthToken(window.gapi.auth.getToken()?.access_token)
                        .setDeveloperKey(GOOGLE_API_KEY)
                        .setCallback((data) => {
                            if (data.action === window.google.picker.Action.PICKED) {
                                const doc = data.docs[0];
                                const url = doc.url; // Note: You might need to handle direct download URLs
                                if (imageModalConfig.type === 'cover') setCoverImage(url);
                                else execFormat('insertImage', url);
                                setImageModalConfig({ ...imageModalConfig, show: false });
                            }
                        })
                        .build();
                    picker.setVisible(true);
                }
            });
        };

        if (!window.gapi.auth?.getToken()) {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                callback: (res) => {
                    if (res.access_token) loadPicker();
                },
            });
            client.requestAccessToken();
        } else {
            loadPicker();
        }
    };

    const handleFileChange = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setImageModalConfig(prev => ({ ...prev, show: false }));

        if (type === 'editor') {
            const tempUrl = URL.createObjectURL(file);
            const imageId = `img-${Date.now()}`;
            
            const imgHtml = `
                <p contenteditable="true"><br></p>
                <div id="wrapper-${imageId}" class="editor-image-wrapper" contenteditable="false" style="position: relative; width: 85%; margin: 1.5rem auto; group">
                    <img id="${imageId}" src="${tempUrl}" style="width: 100%; border-radius: 12px; opacity: 0.5; transition: all 0.3s; border: 2px dashed #6300dd;" />
                    <div style="position: absolute; top: 12px; right: 12px; display: flex; gap: 8px;">
                        <div id="loader-${imageId}" style="width: 24px; height: 24px; border: 3px solid #fff; border-top-color: #6300dd; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <button class="editor-delete-btn" onclick="this.closest('.editor-image-wrapper').remove()" style="width: 28px; height: 28px; background: rgba(0,0,0,0.6); color: #fff; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; transition: background 0.2s;">&times;</button>
                    </div>
                </div>
                <p contenteditable="true"><br></p>
            `;
            
            editorRef.current.focus();
            document.execCommand('insertHTML', false, imgHtml);
            
            try {
                const fileRef = ref(storage, `blog/${user.uid}/${Date.now()}-${file.name}`);
                const uploadTask = uploadBytesResumable(fileRef, file);
                
                uploadTask.on('state_changed', 
                    (snapshot) => {}, 
                    (error) => { throw error; }, 
                    async () => {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        const img = document.getElementById(imageId);
                        const loader = document.getElementById(`loader-${imageId}`);
                        if (img) {
                            img.src = url;
                            img.style.opacity = '1';
                            img.style.border = 'none';
                        }
                        if (loader) loader.remove();
                    }
                );
            } catch (error) {
                console.error("Upload error:", error);
                const wrapper = document.getElementById(`wrapper-${imageId}`);
                if (wrapper) wrapper.remove();
                alert("Failed to upload image.");
            } finally {
                URL.revokeObjectURL(tempUrl);
                e.target.value = null;
            }
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        try {
            const fileRef = ref(storage, `blog/${user.uid}/${Date.now()}-${file.name}`);
            const uploadTask = uploadBytesResumable(fileRef, file);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(Math.round(progress));
                }, 
                (error) => {
                    console.error("Upload error:", error);
                    alert("Failed to upload cover image.");
                    setIsUploading(false);
                }, 
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setCoverImage(url);
                    setIsUploading(false);
                    setUploadProgress(0);
                }
            );
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload cover image.");
            setIsUploading(false);
        } finally {
            e.target.value = null;
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
            const blogData = {
                title: title.trim(),
                content,
                author,
                authorImage: authorImage || '',
                category,
                image: coverImage || '',
                status: userRole === 'admin' ? 'approved' : 'pending',
                date: new Date().toISOString(),
                userId: user.uid
            };

            if (isEditing && editId) {
                const { updateDoc } = await import('firebase/firestore');
                await updateDoc(doc(db, 'blog', editId), blogData);
            } else {
                await addDoc(collection(db, 'blog'), {
                    ...blogData,
                    createdAt: new Date().toISOString()
                });
            }

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
                    {isUploading ? (
                        <div style={{ width: '100%', height: '280px', backgroundColor: '#fff', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', border: '1px solid #eee', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                            <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #6300dd', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#6300dd', fontFamily: 'Inter, sans-serif' }}>{uploadProgress}%</div>
                            <div style={{ fontSize: '13px', color: '#999', fontWeight: '600' }}>Uploading to Cloud Storage...</div>
                        </div>
                    ) : coverImage ? (
                        <div style={{ position: 'relative' }}>
                            <img src={coverImage} alt="Cover" style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #eee' }} onError={() => setCoverImage('')} />
                            <button onClick={() => setCoverImage('')} style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Remove</button>
                        </div>
                    ) : (
                        <div
                            style={{ 
                                width: '100%', 
                                height: '140px', 
                                borderRadius: '12px', 
                                border: isDragging ? '2px solid #6300dd' : '2px dashed #ddd', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '8px', 
                                cursor: 'pointer', 
                                color: isDragging ? '#6300dd' : '#999', 
                                backgroundColor: isDragging ? 'rgba(99, 0, 221, 0.05)' : '#fff', 
                                transition: 'all 0.2s' 
                            }}
                            onClick={() => setImageModalConfig({ show: true, type: 'cover' })}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, 'cover')}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#6300dd'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = isDragging ? '#6300dd' : '#ddd'}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>{isDragging ? 'Drop image here' : 'Add cover image'}</span>
                            <span style={{ fontSize: '11px', opacity: 0.6 }}>Drag and drop or click to upload</span>
                        </div>
                    )}
                    <input type="file" ref={coverInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
                    <input type="file" ref={editorImageInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'editor')} />
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #eee', overflow: 'hidden' }}>
                    <div style={{ padding: '2.5rem 3rem' }}>
                        {/* Category */}
                        {/* Category Selector */}
                        <div style={{ marginBottom: '1.75rem', position: 'relative' }}>
                            <div 
                                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6300dd', fontWeight: '700', backgroundColor: '#f5f0ff', padding: '8px 18px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(99, 0, 221, 0.1)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ede4ff'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f5f0ff'}
                            >
                                {category}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showCategoryMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginTop: '1px' }}>
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                            {showCategoryMenu && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowCategoryMenu(false)} />
                                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 10px 40px rgba(0,0,0,0.12)', border: '1px solid #eee', padding: '8px', zIndex: 100, minWidth: '220px', animation: 'fadeInUp 0.2s ease-out' }}>
                                        {CATEGORIES.map(c => (
                                            <div 
                                                key={c} 
                                                onClick={() => { setCategory(c); setShowCategoryMenu(false); }}
                                                style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '14px', color: category === c ? '#6300dd' : '#444', backgroundColor: category === c ? '#f5f0ff' : 'transparent', fontWeight: category === c ? '700' : '500', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                onMouseEnter={(e) => { if (category !== c) e.currentTarget.style.backgroundColor = '#f9f9f9'; }}
                                                onMouseLeave={(e) => { if (category !== c) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                            >
                                                {c}
                                                {category === c && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Title */}
                        <textarea
                            placeholder="Post Title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onInput={e => { 
                                e.target.style.height = 'auto'; 
                                e.target.style.height = e.target.scrollHeight + 'px'; 
                            }}
                            style={{ 
                                width: '100%', 
                                fontSize: '2.75rem', 
                                fontWeight: '800', 
                                border: 'none', 
                                outline: 'none', 
                                resize: 'none', 
                                fontFamily: 'Newsreader, serif', 
                                marginBottom: '1.25rem', 
                                minHeight: '70px', 
                                color: '#111', 
                                lineHeight: '1.2', 
                                backgroundColor: 'transparent',
                                overflow: 'hidden'
                            }}
                            rows={1}
                        />

                        {/* Author */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                            {authorImage ? (
                                <img src={authorImage} alt={author} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee' }} />
                            ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#6300dd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                                    {author.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>{author}</div>
                                <div style={{ fontSize: '12px', color: '#999', fontWeight: '500' }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
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
                            onInput={updateActiveFormats}
                            onPaste={handlePaste}
                            style={{
                                minHeight: '420px',
                                fontSize: '1.125rem',
                                lineHeight: '1.7',
                                color: '#222',
                                outline: 'none',
                                border: 'none',
                                padding: '0',
                                width: '100%',
                                fontFamily: 'Inter, sans-serif'
                            }}
                        >
                            <p><br /></p>
                        </div>
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
                [contenteditable] img { max-width: 100%; border-radius: 12px; margin: 1rem 0; display: block; }
                .editor-image-wrapper:hover button { background: rgba(255, 59, 48, 0.9) !important; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>

            {/* Image Selection Modal */}
            {imageModalConfig.show && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(12px)' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '24px', padding: '2.5rem', width: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(15px)', animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0, fontWeight: '800', color: '#111', fontSize: '1.4rem' }}>Add Image</h3>
                            <button onClick={() => setImageModalConfig({ ...imageModalConfig, show: false })} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#999', cursor: 'pointer' }}>&times;</button>
                        </div>
                        
                        {/* Drag & Drop Area */}
                        <div 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, imageModalConfig.type)}
                            onClick={() => (imageModalConfig.type === 'cover' ? coverInputRef : editorImageInputRef).current.click()}
                            style={{ 
                                height: '160px', 
                                border: isDragging ? '2px solid #6300dd' : '2px dashed #ddd', 
                                borderRadius: '16px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '12px', 
                                backgroundColor: isDragging ? 'rgba(99, 0, 221, 0.05)' : '#f9f9f9',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '1.5rem'
                            }}
                        >
                            <div style={{ width: '48px', height: '48px', backgroundColor: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6300dd" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>{isDragging ? 'Drop to upload' : 'Browse from Device'}</div>
                                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>Drag & drop or click to select</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button 
                                onClick={() => {
                                    const url = window.prompt('Enter image URL:');
                                    if (url) {
                                        if (imageModalConfig.type === 'cover') setCoverImage(url);
                                        else execFormat('insertImage', url);
                                        setImageModalConfig({ ...imageModalConfig, show: false });
                                    }
                                }}
                                style={{ padding: '14px', backgroundColor: '#fff', color: '#111', border: '1px solid #eee', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                Paste Link
                            </button>
                            <button 
                                onClick={handleDrivePicker}
                                style={{ padding: '14px', backgroundColor: '#fff', color: '#111', border: '1px solid #eee', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
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
