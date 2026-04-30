import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Inbox = () => {
    const [activeTab, setActiveTab] = useState('inbox');
    const [selectedConv, setSelectedConv] = useState(0);
    const navigate = useNavigate();

    const conversations = [
        {
            id: 0,
            company: 'Castari',
            batch: 'F25',
            time: '3 months',
            unread: false,
            tagline: 'Vercel for AI Agents — One click deploy for the Claude Agent SDK',
            people: '3 people',
            industry: 'B2B > Infrastructure',
            messages: [
                {
                    sender: 'Maulik Darji',
                    role: 'Candidate',
                    text: 'Hi team,\n\nI came across Castari and would love to explore working with you. I\'m a CS student who enjoys building developer-facing tools and learning by working close to real systems rather than abstract tasks.\n\nI\'m looking to join a small team where engineers have ownership, move fast, and improve things by shipping and iterating. Even without a specific role listed, I\'d love to see if there\'s a way I could contribute.\n\nThanks,\nMaulik',
                    time: '3 months'
                }
            ]
        },
        { id: 1, company: 'The Hog', batch: 'W24', time: '3 months', unread: true, tagline: 'AI for livestock management', people: '5 people', industry: 'AgTech', messages: [] },
        { id: 2, company: 'DiligenceSquared', batch: 'S24', time: '3 months', unread: true, tagline: 'Automated due diligence', people: '4 people', industry: 'Fintech', messages: [] },
        { id: 3, company: 'Clicks', batch: 'F24', time: '3 months', unread: true, tagline: 'Social layer for the web', people: '2 people', industry: 'Consumer', messages: [] },
        { id: 4, company: 'Cignara', batch: 'W23', time: '3 months', unread: true, tagline: 'Next-gen firewall', people: '12 people', industry: 'Security', messages: [] }
    ];

    const current = conversations[selectedConv];

    return (
        <div style={{ backgroundColor: '#fdfdfc', minHeight: '100vh', fontFamily: '"Inter", sans-serif', color: '#111' }}>
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
                    {conversations.map((conv, i) => (
                        <div 
                            key={conv.id} 
                            onClick={() => setSelectedConv(i)}
                            style={{ 
                                padding: '15px', 
                                borderBottom: '1px solid #eee', 
                                cursor: 'pointer', 
                                backgroundColor: selectedConv === i ? '#d9e2ec' : '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}
                        >
                            <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: '#eee', flexShrink: 0 }}></div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '700', fontSize: '14px' }}>{conv.company}</span>
                                    <span style={{ fontSize: '11px', color: '#666' }}>{conv.time}</span>
                                </div>
                            </div>
                            {conv.unread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff6600' }}></div>}
                        </div>
                    ))}
                </aside>

                {/* Center: Conversation View */}
                <main style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eee' }}></div>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '15px' }}>Maulik Darji</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>{current.company}</div>
                            </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{current.time}</div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                        {current.messages.map((msg, i) => (
                            <div key={i} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '4px', border: '1px solid #eee', marginBottom: '1.5rem', maxWidth: '600px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span style={{ fontWeight: '700', fontSize: '14px' }}>{msg.sender}</span>
                                    <span style={{ fontSize: '11px', color: '#666' }}>{msg.time}</span>
                                </div>
                                <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Compose Area */}
                    <div style={{ padding: '20px', borderTop: '1px solid #eee', backgroundColor: '#f9f9f9' }}>
                        <textarea 
                            placeholder="Type message" 
                            style={{ width: '100%', height: '100px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', resize: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Not interested...
                            </span>
                            <button style={{ backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '4px', fontWeight: '700', fontSize: '14px' }}>Send</button>
                        </div>
                    </div>
                </main>

                {/* Right Sidebar: Context */}
                <aside style={{ borderLeft: '1px solid #eee', padding: '2rem', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#eee' }}></div>
                            <span style={{ fontSize: '18px', fontWeight: '800' }}>{current.company}</span>
                        </div>
                        
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ff6600', margin: '0' }}>{current.company} ({current.batch})</h3>
                        <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.5', margin: '0' }}>{current.tagline}</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#666' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                {current.people}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                {current.industry}
                            </div>
                        </div>

                        <a href="#" style={{ fontSize: '13px', color: '#ff6600', textDecoration: 'none', fontWeight: '500' }}>{current.company.toLowerCase()}.com</a>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default Inbox;
