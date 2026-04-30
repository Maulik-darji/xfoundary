import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const StartupDetail = () => {
    const { id } = useParams();
    const [startup, setStartup] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStartup = async () => {
            try {
                const docRef = doc(db, 'users', id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const app = data.application || {};
                    
                    setStartup({
                        id: docSnap.id,
                        name: app.companyName || 'Unnamed Startup',
                        location: app.basedIn || 'Unknown Location',
                        city: app.basedIn?.split(',')[0] || 'Unknown',
                        desc: app.companyDescription?.slice(0, 100) + '...' || 'No short description.',
                        fullDesc: app.companyDescription || 'No detailed description provided by the founder.',
                        batch: app.batch || 'Upcoming',
                        industries: app.category ? [app.category.toUpperCase()] : ['OTHER'],
                        logo: `https://logo.clearbit.com/${app.companyUrl?.replace(/^https?:\/\//, '')}` || 'https://via.placeholder.com/110?text=X',
                        url: app.companyUrl?.startsWith('http') ? app.companyUrl : `https://${app.companyUrl}`,
                        founded: app.howLongWork?.match(/\d{4}/)?.[0] || 'N/A',
                        teamSize: app.foundersKnown?.match(/\d+/)?.[0] || '1',
                        status: app.legalEntityRadio === 'yes' ? 'Public' : 'Private',
                        partner: 'X Foundary',
                        founders: [
                            {
                                name: data.displayName || 'Founder',
                                role: 'Founder/CEO',
                                bio: app.whyIdea || 'Founder bio not provided.',
                                photo: data.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${docSnap.id}`
                            }
                        ]
                    });
                    document.title = `${app.companyName || 'Startup'} | X Foundary`;
                }
            } catch (error) {
                console.error("Error fetching startup detail:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStartup();
    }, [id]);

    if (loading) return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '18px', color: '#111', fontWeight: 600 }}>Loading company data...</div>
        </div>
    );

    if (!startup) return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '24px', color: '#1a1a1a', fontWeight: 700 }}>Startup not found</div>
            <Link to="/directory" style={{ color: '#000', textDecoration: 'none', fontWeight: 600 }}>Return to Directory</Link>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5ee', fontFamily: '"Inter", sans-serif', paddingBottom: '6rem' }}>
            <style>{`
                .detail-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                .breadcrumb {
                    font-size: 13px;
                    color: #666;
                    margin-bottom: 2.5rem;
                }
                .breadcrumb a { color: #000; text-decoration: none; }
                
                .header-section {
                    display: flex;
                    gap: 2rem;
                    margin-bottom: 3rem;
                }
                .logo-box {
                    width: 120px;
                    height: 120px;
                    border-radius: 20px;
                    overflow: hidden;
                    border: 1px solid #e5e5e0;
                    background: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                }
                .header-content h1 {
                    font-size: 36px;
                    font-weight: 800;
                    margin: 0 0 8px 0;
                    color: #1a1a1a;
                    letter-spacing: -0.02em;
                }
                .header-content p {
                    font-size: 18px;
                    color: #555;
                    margin: 0 0 1.5rem 0;
                }
                
                .tag {
                    display: inline-flex;
                    align-items: center;
                    padding: 5px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-right: 10px;
                    background: #f0f0ed;
                    color: #555;
                    letter-spacing: 0.02em;
                }
                .tag-batch { background: #000; color: #fff; }
                .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-right: 8px; }

                .tabs {
                    display: flex;
                    border-bottom: 1px solid #e5e5e0;
                    margin-bottom: 3rem;
                    gap: 3.5rem;
                }
                .tab {
                    padding: 14px 4px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #666;
                    cursor: pointer;
                    border-bottom: 3px solid transparent;
                    transition: all 0.2s;
                }
                .tab.active {
                    color: #1a1a1a;
                    border-bottom-color: #000;
                }
                
                .sidebar-card {
                    background: #fff;
                    border: 1px solid #e5e5e0;
                    border-radius: 20px;
                    padding: 2rem;
                    width: 340px;
                    position: sticky;
                    top: 120px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.02);
                }
                .stat-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 1.25rem;
                    font-size: 15px;
                }
                .stat-label { color: #666; font-weight: 500; }
                .stat-value { color: #1a1a1a; font-weight: 700; text-align: right; }
                
                .social-icons {
                    display: flex;
                    gap: 12px;
                    margin-top: 2.5rem;
                    justify-content: center;
                }
                .social-icon {
                    width: 36px;
                    height: 36px;
                    border: 1px solid #e5e5e0;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #000;
                    cursor: pointer;
                    background: #fff;
                    transition: all 0.2s;
                }
                .social-icon:hover { background: #000; color: #fff; border-color: #000; }
                
                .founder-card {
                    background: #fff;
                    border: 1px solid #e5e5e0;
                    border-radius: 16px;
                    padding: 1.75rem;
                    display: flex;
                    gap: 2rem;
                    margin-top: 1.5rem;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
                }
                .founder-photo {
                    width: 90px;
                    height: 90px;
                    border-radius: 12px;
                    object-fit: cover;
                    border: 1px solid #f0f0ed;
                }
            `}</style>

            <div className="detail-container">
                <nav className="breadcrumb">
                    <Link to="/">Home</Link> › <Link to="/directory">Companies</Link> › {startup.name}
                </nav>

                <div style={{ display: 'flex', gap: '5rem' }}>
                    <div style={{ flex: 1 }}>
                        <div className="header-section">
                            <div className="logo-box">
                                <img src={startup.logo} alt={startup.name} style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} onError={(e) => e.target.src = 'https://via.placeholder.com/120?text=X'} />
                            </div>
                            <div className="header-content">
                                <h1>{startup.name}</h1>
                                <p>{startup.desc}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    <span className="tag tag-batch">
                                        <div style={{ width: '12px', height: '12px', background: '#fff', color: '#000', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '6px', borderRadius: '2px', fontWeight: 900 }}>X</div>
                                        {startup.batch}
                                    </span>
                                    <span className="tag" style={{ display: 'flex', alignItems: 'center' }}>
                                        <div className="status-dot" /> {startup.status}
                                    </span>
                                    {startup.industries.map(ind => <span key={ind} className="tag">{ind}</span>)}
                                    <span className="tag">{startup.city}</span>
                                </div>
                            </div>
                        </div>

                        <div className="tabs">
                            <div className="tab active">Company</div>
                            <div className="tab">Jobs <span style={{ background: '#f0f0ed', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: '6px', fontWeight: 700 }}>0</span></div>
                            <div className="tab">News</div>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: '#000', fontWeight: 600 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                <a href={startup.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{startup.url.replace(/^https?:\/\//, '')}</a>
                            </div>
                        </div>

                        <div style={{ fontSize: '17px', lineHeight: '1.8', color: '#444', whiteSpace: 'pre-wrap', marginBottom: '4rem' }}>
                            {startup.fullDesc}
                        </div>

                        <div style={{ marginTop: '4rem' }}>
                            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '2rem', letterSpacing: '-0.01em' }}>Active Founders</h2>
                            {startup.founders.map(founder => (
                                <div key={founder.name} className="founder-card">
                                    <img src={founder.photo} alt={founder.name} className="founder-photo" />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a' }}>{founder.name}</span>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0077b5"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                        </div>
                                        <div style={{ color: '#000', fontSize: '15px', marginBottom: '14px', fontWeight: '600' }}>{founder.role}</div>
                                        <div style={{ fontSize: '15px', color: '#555', lineHeight: '1.6' }}>{founder.bio}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <aside>
                        <div className="sidebar-card">
                            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                                <img src={startup.logo} alt="" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '1.25rem' }} onError={(e) => e.target.src = 'https://via.placeholder.com/80?text=X'} />
                                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#1a1a1a', letterSpacing: '-0.02em' }}>{startup.name}</h2>
                            </div>
                            
                            <div className="stat-row">
                                <span className="stat-label">Founded:</span>
                                <span className="stat-value">{startup.founded}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Batch:</span>
                                <span className="stat-value">{startup.batch}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Team Size:</span>
                                <span className="stat-value">{startup.teamSize}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Status:</span>
                                <span className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="status-dot" /> {startup.status}
                                </span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Location:</span>
                                <span className="stat-value">{startup.city}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Primary Partner:</span>
                                <span className="stat-value" style={{ color: '#000' }}>{startup.partner}</span>
                            </div>
                            
                            <div className="social-icons">
                                <div className="social-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                </div>
                                <div className="social-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></div>
                                <div className="social-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></div>
                                <div className="social-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></div>
                                <div className="social-icon" style={{ background: '#004c8c', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>cb</div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default StartupDetail;
