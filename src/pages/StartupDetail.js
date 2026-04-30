import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const industryHierarchy = {
    'B2B': ['Analytics', 'Engineering, Product and Design', 'Finance and Accounting', 'Human Resources', 'Infrastructure', 'Legal', 'Marketing', 'Office Management', 'Operations', 'Productivity', 'Recruiting and Talent', 'Retail', 'Sales', 'Security', 'Supply Chain and Logistics'],
    'Consumer': ['Apparel and Cosmetics', 'Consumer Electronics', 'Content', 'Food and Beverage', 'Gaming', 'Home and Personal', 'Job and Career Services', 'Social', 'Transportation Services', 'Travel, Leisure and Tourism', 'Virtual and Augmented Reality'],
    'Fintech': ['Asset Management', 'Banking and Exchange', 'Consumer Finance', 'Credit and Lending', 'Insurance', 'Payments'],
    'Healthcare': ['Consumer Health and Wellness', 'Diagnostics', 'Drug Discovery and Delivery', 'Healthcare IT', 'Healthcare Services', 'Industrial Bio', 'Medical Devices', 'Therapeutics'],
    'Industrials': ['Agriculture', 'Automotive', 'Aviation and Space', 'Climate', 'Defense', 'Drones', 'Energy', 'Manufacturing and Robotics'],
    'Real Estate and Construction': ['Construction', 'Housing and Real Estate']
};

const StartupDetail = () => {
    const { id } = useParams();
    const [startup, setStartup] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDetailTab, setActiveDetailTab] = useState('company');

    useEffect(() => {
        const fetchStartup = async () => {
            try {
                const docRef = doc(db, 'users', id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const app = data.application || {};
                    
                    const getLinkedInUsername = (url) => {
                        if (!url) return null;
                        const match = url.match(/linkedin\.com\/in\/([^/]+)/);
                        return match ? match[1].trim() : null;
                    };

                    const linkedinUrl = data.socials?.linkedin || app.socials?.linkedin || '';
                    const linkedinUser = getLinkedInUsername(linkedinUrl);
                    
                    setStartup({
                        id: docSnap.id,
                        name: app.companyName || 'Unnamed Startup',
                        location: app.basedIn || 'Unknown Location',
                        desc: app.companyDescription?.slice(0, 100) + '...' || 'No short description.',
                        fullDesc: app.companyDescription || 'No detailed description provided by the founder.',
                        batch: app.batch || 'Upcoming',
                        industries: (() => {
                            const tags = new Set();
                            const inds = Array.isArray(app.industries) ? app.industries : (app.category ? [app.category] : []);
                            inds.forEach(ind => {
                                if (industryHierarchy[ind]) {
                                    tags.add(ind.toUpperCase());
                                } else {
                                    const parent = Object.keys(industryHierarchy).find(k => industryHierarchy[k].includes(ind));
                                    if (parent) tags.add(parent.toUpperCase());
                                    tags.add(ind.toUpperCase());
                                }
                            });
                            return tags.size > 0 ? [...tags] : ['OTHER'];
                        })(),
                        logo: app.companyLogo || `https://logo.clearbit.com/${app.companyUrl?.replace(/^https?:\/\//, '')}` || 'https://via.placeholder.com/110?text=X',
                        url: app.companyUrl?.startsWith('http') ? app.companyUrl : `https://${app.companyUrl}`,
                        founded: app.howLongWork?.match(/\d{4}/)?.[0] || 'N/A',
                        teamSize: app.foundersKnown?.match(/\d+/)?.[0] || '1',
                        status: app.legalEntityRadio === 'yes' ? 'Public' : 'Private',
                        partner: 'X Foundary',
                        socials: {
                            twitter: app.socials?.twitter || '',
                            linkedin: app.socials?.linkedin || '',
                            github: app.socials?.github || '',
                            facebook: app.socials?.facebook || ''
                        },
                        founders: [
                            {
                                name: data.profile?.name || data.displayName || 'Founder',
                                role: 'Founder/CEO',
                                bio: app.whyIdea || 'Founder bio not provided.',
                                photo: linkedinUser 
                                    ? `https://unavatar.io/linkedin/${linkedinUser}` 
                                    : (data.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${docSnap.id}`),
                                twitter: data.socials?.twitter || '',
                                linkedin: linkedinUrl
                            }
                        ]
                    });
                    document.title = `${app.companyName || 'Startup'} | X Foundary`;

                    // Fetch Jobs
                    const jQ = query(collection(db, 'jobs'), where('founderId', '==', docSnap.id));
                    const jSnap = await getDocs(jQ);
                    setJobs(jSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
                                    <span className="tag tag-batch" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0f0ed', color: '#1a1a1a' }}>
                                        <span style={{ backgroundColor: '#6300dd', color: '#fff', padding: '1px 4px', borderRadius: '2px', lineHeight: 1, fontWeight: 900, fontSize: '9px' }}>X</span>
                                        {startup.batch}
                                    </span>
                                    {startup.industries.map(ind => <span key={ind} className="tag">{ind}</span>)}
                                    <span className="tag">{startup.location}</span>
                                </div>
                            </div>
                        </div>

                        <div className="tabs">
                            <div className={`tab ${activeDetailTab === 'company' ? 'active' : ''}`} onClick={() => setActiveDetailTab('company')}>Company</div>
                            <div className={`tab ${activeDetailTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveDetailTab('jobs')}>Jobs [{jobs.length}]</div>
                        </div>

                        {activeDetailTab === 'company' ? (
                            <div style={{ fontSize: '17px', lineHeight: '1.8', color: '#444', whiteSpace: 'pre-wrap', marginBottom: '4rem' }}>
                                {startup.fullDesc}
                            </div>
                        ) : activeDetailTab === 'jobs' ? (
                            <div style={{ marginBottom: '4rem' }}>
                                {jobs.length > 0 ? (
                                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                                        {jobs.map(job => (
                                            <div key={job.id} style={{ padding: '2rem', background: '#fff', border: '1px solid #e5e5e0', borderRadius: '16px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                    <div>
                                                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{job.role}</h3>
                                                        <div style={{ display: 'flex', gap: '15px', marginTop: '6px', fontSize: '14px', color: '#666', fontWeight: '600' }}>
                                                            <span>{job.type}</span>
                                                            <span>&bull;</span>
                                                            <span>{job.location}</span>
                                                        </div>
                                                    </div>
                                                    {job.link && (
                                                        <a href={job.link.startsWith('http') ? job.link : `mailto:${job.link}`} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#000', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>Apply</a>
                                                    )}
                                                </div>
                                                <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.6', margin: 0 }}>{job.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '4rem', textAlign: 'center', border: '2px dashed #e5e5e0', borderRadius: '24px', color: '#888' }}>
                                        No active job openings at this time.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ padding: '4rem', textAlign: 'center', color: '#888' }}>News coming soon.</div>
                        )}

                        <div style={{ marginTop: '4rem' }}>
                            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '2rem', letterSpacing: '-0.01em' }}>Active Founders</h2>
                            {startup.founders.map(founder => (
                                <div key={founder.name} className="founder-card">
                                    <img src={founder.photo} alt={founder.name} className="founder-photo" />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a' }}>{founder.name}</span>
                                            {founder.twitter && (
                                                <a href={founder.twitter} target="_blank" rel="noopener noreferrer" style={{ color: '#1DA1F2' }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                                                </a>
                                            )}
                                            {founder.linkedin && (
                                                <a href={founder.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5' }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                                </a>
                                            )}
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
                                <span className="stat-value">{startup.location}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Website:</span>
                                <a href={startup.url} target="_blank" rel="noopener noreferrer" className="stat-value" style={{ color: '#6300dd', textDecoration: 'none' }}>{startup.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Primary Partner:</span>
                                <span className="stat-value" style={{ color: '#000' }}>{startup.partner}</span>
                            </div>
                            
                            <div className="social-icons">
                                {startup.url && (
                                    <a href={startup.url} target="_blank" rel="noopener noreferrer" className="social-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                    </a>
                                )}
                                {startup.socials?.linkedin && (
                                    <a href={startup.socials.linkedin} target="_blank" rel="noopener noreferrer" className="social-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                    </a>
                                )}
                                {startup.socials?.twitter && (
                                    <a href={startup.socials.twitter} target="_blank" rel="noopener noreferrer" className="social-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    </a>
                                )}
                                {startup.socials?.facebook && (
                                    <a href={startup.socials.facebook} target="_blank" rel="noopener noreferrer" className="social-icon">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default StartupDetail;
