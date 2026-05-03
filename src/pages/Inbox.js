import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const Inbox = () => {
    const [activeTab, setActiveTab] = useState('inbox');
    const [selectedConvIndex, setSelectedConvIndex] = useState(0);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Fetch conversations where current user is a participant
                const q = query(
                    collection(db, 'conversations'),
                    where('participants', 'array-contains', currentUser.uid),
                    orderBy('lastMessageAt', 'desc')
                );
                
                const unsubConvs = onSnapshot(q, (snap) => {
                    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setConversations(list);
                    setLoading(false);
                }, (err) => {
                    console.error("Inbox error:", err);
                    setLoading(false);
                });
                
                return () => unsubConvs();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const current = conversations[selectedConvIndex];

    return (
        <div style={{ backgroundColor: '#f5f5ee', minHeight: '100vh', fontFamily: '"Inter", sans-serif', color: '#111' }}>
            {/* Top Sub-Nav */}
            <div style={{ borderBottom: '1px solid #eee', padding: '1rem 2rem', backgroundColor: '#fff' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                        <div onClick={() => navigate('/jobs')} style={{ cursor: 'pointer', fontSize: '15px', fontWeight: '500', color: '#666' }}>Companies & jobs</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#111', borderBottom: '2px solid #ff6600', paddingBottom: '4px' }}>Inbox</div>
                        <div style={{ fontSize: '15px', fontWeight: '500', color: '#666' }}>Education</div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div onClick={() => navigate('/candidate/profile')} style={{ cursor: 'pointer', fontSize: '15px', fontWeight: '500', color: '#666' }}>My profile</div>
                    </div>
                </div>
            </div>

            {/* Inbox Filter Tabs */}
            <div style={{ padding: '1rem 2rem', backgroundColor: '#f6f6ef' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '2rem' }}>
                    {['Inbox', 'Archived', 'All conversations'].map(tab => (
                        <div 
                            key={tab} 
                            onClick={() => setActiveTab(tab.toLowerCase())}
                            style={{ 
                                fontSize: '13px', 
                                fontWeight: activeTab === tab.toLowerCase() ? '700' : '500', 
                                color: activeTab === tab.toLowerCase() ? '#ff6600' : '#666',
                                cursor: 'pointer'
                            }}
                        >
                            {tab}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Inbox UI */}
            <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '300px 1fr 300px', height: 'calc(100vh - 120px)', backgroundColor: '#fff' }}>
                
                {/* Left Sidebar: Thread List */}
                <aside style={{ borderRight: '1px solid #eee', overflowY: 'auto' }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
                        <input 
                            type="text" 
                            placeholder="Search inbox" 
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                        />
                    </div>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '14px' }}>Loading...</div>
                    ) : conversations.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '14px' }}>No conversations yet.</div>
                    ) : (
                        conversations.map((conv, i) => (
                            <div 
                                key={conv.id} 
                                onClick={() => setSelectedConvIndex(i)}
                                style={{ 
                                    padding: '15px', 
                                    borderBottom: '1px solid #eee', 
                                    cursor: 'pointer', 
                                    backgroundColor: selectedConvIndex === i ? '#d9e2ec' : '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                            >
                                <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: '#eee', flexShrink: 0, backgroundImage: `url(${conv.companyLogo})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '700', fontSize: '14px' }}>{conv.companyName}</span>
                                        <span style={{ fontSize: '11px', color: '#666' }}>{conv.lastMessageAt ? new Date(conv.lastMessageAt.seconds * 1000).toLocaleDateString() : ''}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.lastMessage}</div>
                                </div>
                                {conv.unread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff6600' }}></div>}
                            </div>
                        ))
                    )}
                </aside>

                {/* Center: Conversation View */}
                <main style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid #eee' }}>
                    {!current ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#999', padding: '2rem', textAlign: 'center' }}>
                            <div style={{ backgroundColor: '#f9f9f9', padding: '24px', borderRadius: '50%', marginBottom: '1rem' }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            </div>
                            <h3 style={{ margin: '0 0 8px 0', color: '#666' }}>Your Inbox is Empty</h3>
                            <p style={{ margin: 0, fontSize: '14px' }}>When you message a startup or a founder, the conversation will appear here.</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eee', backgroundImage: `url(${current.companyLogo})`, backgroundSize: 'cover' }}></div>
                                    <div>
                                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{current.companyName}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>{current.batch}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>{current.lastMessageAt ? new Date(current.lastMessageAt.seconds * 1000).toLocaleString() : ''}</div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', backgroundColor: '#f5f5ee' }}>
                                {(current.messages || []).map((msg, i) => (
                                    <div key={i} style={{ 
                                        backgroundColor: '#fff', 
                                        padding: '1.25rem', 
                                        borderRadius: '12px', 
                                        border: '1px solid #eee', 
                                        marginBottom: '1.25rem', 
                                        maxWidth: '85%',
                                        marginLeft: msg.senderId === user?.uid ? 'auto' : '0',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: '700', fontSize: '13px', color: msg.senderId === user?.uid ? '#ff6600' : '#111' }}>{msg.senderName}</span>
                                            <span style={{ fontSize: '10px', color: '#999' }}>{msg.time}</span>
                                        </div>
                                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.5', color: '#333' }}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Compose Area */}
                            <div style={{ padding: '20px', borderTop: '1px solid #eee', backgroundColor: '#fff' }}>
                                <textarea 
                                    placeholder="Type message..." 
                                    style={{ width: '100%', height: '80px', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', resize: 'none', boxSizing: 'border-box', marginBottom: '10px', outline: 'none', transition: 'border-color 0.2s' }}
                                    onFocus={(e) => e.target.style.borderColor = '#ff6600'}
                                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', alignItems: 'center' }}>
                                    <button style={{ backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Send Message</button>
                                </div>
                            </div>
                        </>
                    )}
                </main>

                {/* Right Sidebar: Context */}
                <aside style={{ padding: '2rem', overflowY: 'auto', backgroundColor: '#f5f5ee' }}>
                    {current ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#eee', backgroundImage: `url(${current.companyLogo})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', border: '1px solid #eee' }}></div>
                                <span style={{ fontSize: '18px', fontWeight: '800' }}>{current.companyName}</span>
                            </div>
                            
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ff6600', margin: '0' }}>{current.companyName} (Founded in {current.batch})</h3>
                            <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.5', margin: '0' }}>{current.tagline}</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#666' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                    {current.people || '1-10 people'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                    {current.industry || 'B2B'}
                                </div>
                            </div>

                            <a href={current.website || '#'} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: '#ff6600', textDecoration: 'none', fontWeight: '600' }}>
                                {current.website?.replace(/^https?:\/\//, '') || 'Visit website'}
                            </a>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#999', fontSize: '14px', marginTop: '2rem' }}>
                            Select a conversation to see details.
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default Inbox;
