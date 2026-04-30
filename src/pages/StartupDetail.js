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
                    
                    const linkedinUrl = data.socials?.linkedin || app.socials?.linkedin || '';
                    
                    setStartup({
                        id: docSnap.id,
                        name: app.companyName || 'Unnamed Startup',
                        location: app.basedIn || 'Unknown Location',
                        tagline: app.companyDescription?.split('.')[0] + '.' || 'No tagline available.',
                        fullDesc: app.companyDescription || 'No detailed description provided.',
                        batch: app.batch || 'Upcoming',
                        industries: (() => {
                            const tags = new Set();
                            const inds = Array.isArray(app.industries) ? app.industries : (app.category ? [app.category] : []);
                            inds.forEach(ind => {
                                if (industryHierarchy[ind]) {
                                    tags.add(ind);
                                } else {
                                    const parent = Object.keys(industryHierarchy).find(k => industryHierarchy[k].includes(ind));
                                    if (parent) tags.add(parent);
                                    tags.add(ind);
                                }
                            });
                            return tags.size > 0 ? [...tags] : ['Tech'];
                        })(),
                        logo: app.companyLogo || (app.companyUrl ? `https://logo.clearbit.com/${app.companyUrl.replace(/^https?:\/\//, '')}` : 'https://via.placeholder.com/120?text=X'),
                        url: app.companyUrl?.startsWith('http') ? app.companyUrl : `https://${app.companyUrl}`,
                        founded: app.howLongWork?.match(/\d{4}/)?.[0] || '2024',
                        teamSize: app.foundersKnown?.match(/\d+/)?.[0] || '2',
                        status: app.legalEntityRadio === 'Yes' ? 'Public' : 'Private',
                        partner: 'X Foundary',
                        socials: {
                            twitter: app.socials?.twitter || '',
                            linkedin: linkedinUrl,
                            github: app.socials?.github || '',
                            facebook: app.socials?.facebook || '',
                            crunchbase: app.socials?.crunchbase || ''
                        },
                        founders: [
                            {
                                name: data.profile?.name || data.displayName || 'Founder',
                                role: data.profile?.title || 'Founder/CEO',
                                bio: app.whyIdea || 'Founder bio not provided.',
                                photo: data.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${docSnap.id}`,
                                twitter: data.socials?.twitter || '',
                                linkedin: linkedinUrl
                            }
                        ],
                        news: [
                            { title: `${app.companyName} secures partnership with global tech leader`, source: 'The Verge', date: 'May 09, 2024' },
                            { title: `New product launch: ${app.companyName} introduces AI-driven workspace`, source: 'TechCrunch', date: 'May 03, 2024' },
                            { title: `Founder Spotlight: How ${data.profile?.name || 'XF Founder'} is reimagining ${app.category || 'the industry'}`, source: 'Forbes', date: 'Mar 16, 2024' }
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
        <div style={{ minHeight: '100vh', backgroundColor: '#fdfdfc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '18px', color: '#111', fontWeight: 600 }}>Loading company data...</div>
        </div>
    );

    if (!startup) return null;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#fdfdfc', fontFamily: '"Inter", sans-serif', paddingBottom: '10rem' }}>
            {/* Header / Hero Section */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem 2rem 2rem' }}>
                <nav style={{ fontSize: '14px', color: '#0073b1', marginBottom: '3rem', fontWeight: '500' }}>
                    <Link to="/" style={{ color: '#0073b1', textDecoration: 'none' }}>Home</Link>
                    <span style={{ margin: '0 8px', color: '#999' }}>›</span>
                    <Link to="/directory" style={{ color: '#0073b1', textDecoration: 'none' }}>Companies</Link>
                    <span style={{ margin: '0 8px', color: '#999' }}>›</span>
                    <span style={{ color: '#333' }}>{startup.name}</span>
                </nav>

                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                    <div style={{ 
                        width: '110px', 
                        height: '110px', 
                        borderRadius: '24px', 
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
                        overflow: 'hidden',
                        flexShrink: 0
                    }}>
                        <img src={startup.logo} alt={startup.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }} onError={(e) => e.target.src = 'https://via.placeholder.com/110?text=X'} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '40px', fontWeight: '900', margin: '0 0 10px 0', letterSpacing: '-1.5px', color: '#111' }}>{startup.name}</h1>
                        <p style={{ fontSize: '24px', fontWeight: '500', color: '#333', margin: '0 0 20px 0', letterSpacing: '-0.5px' }}>{startup.tagline}</p>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{ backgroundColor: '#f0f0ed', color: '#555', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ backgroundColor: '#ff6600', color: '#fff', padding: '0 4px', borderRadius: '2px', fontSize: '9px', fontWeight: '900' }}>X</span>
                                {startup.batch.toUpperCase()}
                            </span>
                            <span style={{ backgroundColor: '#f0f0ed', color: '#555', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                                {startup.status.toUpperCase()}
                            </span>
                            {startup.industries.map(ind => (
                                <span key={ind} style={{ backgroundColor: '#f0f0ed', color: '#555', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800' }}>
                                    {ind.toUpperCase()}
                                </span>
                            ))}
                            <span style={{ backgroundColor: '#f0f0ed', color: '#555', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800' }}>
                                {startup.location.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div style={{ borderBottom: '1px solid #eee', marginBottom: '3rem', position: 'sticky', top: 0, backgroundColor: 'rgba(253, 253, 252, 0.98)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '3rem' }}>
                        <div 
                            onClick={() => setActiveDetailTab('company')}
                            style={{ 
                                padding: '16px 0', 
                                fontSize: '15px', 
                                fontWeight: '700', 
                                color: activeDetailTab === 'company' ? '#111' : '#666', 
                                borderBottom: activeDetailTab === 'company' ? '3px solid #111' : '3px solid transparent',
                                cursor: 'pointer'
                            }}
                        >
                            Company
                        </div>
                        <div 
                            onClick={() => setActiveDetailTab('jobs')}
                            style={{ 
                                padding: '16px 0', 
                                fontSize: '15px', 
                                fontWeight: '700', 
                                color: activeDetailTab === 'jobs' ? '#111' : '#666', 
                                borderBottom: activeDetailTab === 'jobs' ? '3px solid #111' : '3px solid transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            Jobs <span style={{ color: '#999', fontWeight: '500' }}>{jobs.length}</span>
                        </div>
                        <div 
                            onClick={() => setActiveDetailTab('news')}
                            style={{ 
                                padding: '16px 0', 
                                fontSize: '15px', 
                                fontWeight: '700', 
                                color: activeDetailTab === 'news' ? '#111' : '#666', 
                                borderBottom: activeDetailTab === 'news' ? '3px solid #111' : '3px solid transparent',
                                cursor: 'pointer'
                            }}
                        >
                            News
                        </div>
                    </div>
                    <a href={startup.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', color: '#0073b1', textDecoration: 'none', fontWeight: '500' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        {startup.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'flex', gap: '4rem' }}>
                <div style={{ flex: 1 }}>
                    {activeDetailTab === 'company' ? (
                        <>
                            <div style={{ fontSize: '17px', lineHeight: '1.7', color: '#333', whiteSpace: 'pre-wrap', marginBottom: '4rem', letterSpacing: '-0.1px' }}>
                                {startup.fullDesc}
                            </div>

                            {/* Active Founders Section */}
                            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111', marginBottom: '1.5rem', letterSpacing: '-0.5px' }}>Active Founders</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {startup.founders.map(founder => (
                                    <div key={founder.name} style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '1.5rem', display: 'flex', gap: '1.5rem' }}>
                                        <img src={founder.photo} alt={founder.name} style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{founder.name}</h3>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <a href={founder.twitter || "#"} target="_blank" rel="noopener noreferrer" style={{ color: '#000', display: 'flex', alignItems: 'center' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                                    </a>
                                                    <a href={founder.linkedin || "#"} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5', display: 'flex', alignItems: 'center' }}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                                    </a>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '10px' }}>{founder.role}</div>
                                            <p style={{ fontSize: '15px', color: '#444', lineHeight: '1.6', margin: 0 }}>{founder.bio}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Photos Section */}
                            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111', marginTop: '4rem', marginBottom: '1.5rem', letterSpacing: '-0.5px' }}>XF Photos</h2>
                            <div style={{ width: '100%', height: '250px', borderRadius: '16px', border: '1px solid #eee', backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '14px' }}>
                                No photos available.
                            </div>

                            {/* News Section */}
                            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111', marginTop: '4rem', marginBottom: '1.5rem', letterSpacing: '-0.5px' }}>Latest News</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #eee' }}>
                                {startup.news.map((item, i) => (
                                    <div key={i} style={{ padding: '1.25rem 0', borderBottom: '1px solid #eee' }}>
                                        <a href="#" style={{ fontSize: '16px', fontWeight: '700', color: '#0073b1', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                                            {item.title} - {item.source}
                                        </a>
                                        <div style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>{item.date}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : activeDetailTab === 'jobs' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {jobs.length > 0 ? jobs.map(job => (
                                <div key={job.id} style={{ padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0' }}>{job.role}</h3>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#666', fontWeight: '600' }}>
                                            <span>{job.type}</span>
                                            <span>•</span>
                                            <span>{job.location}</span>
                                        </div>
                                    </div>
                                    <button style={{ backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Apply</button>
                                </div>
                            )) : (
                                <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee', color: '#999' }}>
                                    No active job openings.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee', color: '#999' }}>
                            No news available.
                        </div>
                    )}
                </div>

                {/* Sidebar Stats Card */}
                <aside style={{ width: '320px' }}>
                    <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '2rem', position: 'sticky', top: '100px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ 
                                width: '70px', 
                                height: '70px', 
                                backgroundColor: '#6300dd', 
                                borderRadius: '12px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                margin: '0 auto 1.25rem auto',
                                color: '#fff',
                                fontSize: '24px',
                                fontWeight: '900'
                            }}>
                                XF
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111', marginBottom: '0.5rem' }}>{startup.name}</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { label: 'Founded', value: startup.founded },
                                { label: 'Batch', value: startup.batch },
                                { label: 'Team Size', value: startup.teamSize },
                                { label: 'Status', value: startup.status, isStatus: true },
                                { label: 'Location', value: startup.location },
                                { label: 'Primary Partner', value: startup.partner }
                            ].map(stat => (
                                <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: '#666', fontWeight: '500' }}>{stat.label}:</span>
                                    <span style={{ color: '#111', fontWeight: '700', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {stat.isStatus && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />}
                                        {stat.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '2rem', justifyContent: 'center', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                            <a href={startup.url} target="_blank" rel="noopener noreferrer" style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </a>
                            <div style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                            </div>
                            <div style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* YC-Style Mega Footer */}
            <footer style={{ backgroundColor: '#fdfdfc', borderTop: '1px solid #eee', padding: '5rem 2rem', marginTop: '5rem' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '80px 1.2fr 1.2fr 1.5fr 1.2fr', gap: '2rem' }}>
                    {/* Brand Logo */}
                    <div>
                        <div style={{ backgroundColor: '#ff6600', width: '50px', height: '50px', borderRadius: '4px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900' }}>X</div>
                    </div>

                    {/* Column 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#111' }}>Work at a Startup</h4>
                        {['Jobs', 'Internships', 'Events', 'How it works', 'Sign in'].map(item => (
                            <a key={item} href="#" style={{ fontSize: '13px', color: '#555', textDecoration: 'none' }}>{item}</a>
                        ))}
                        <h4 style={{ margin: '12px 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#111' }}>X Foundary</h4>
                        {['About XF', 'Press', 'Privacy & Terms', 'Contact'].map(item => (
                            <a key={item} href="#" style={{ fontSize: '13px', color: '#555', textDecoration: 'none' }}>{item}</a>
                        ))}
                    </div>

                    {/* Column 2 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#111' }}>Jobs by Role</h4>
                        {['Software Engineer Jobs', 'Design & UI/UX Jobs', 'Product Manager Jobs', 'Sales Jobs', 'Marketing Jobs', 'Support Jobs', 'Operations Jobs'].map(item => (
                            <a key={item} href="#" style={{ fontSize: '13px', color: '#555', textDecoration: 'none' }}>{item}</a>
                        ))}
                    </div>

                    {/* Column 3 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#111' }}>Jobs by Location</h4>
                        {['Software Engineer Jobs in San Francisco', 'Product Manager Jobs in San Francisco', 'Software Engineer Jobs in New York', 'Product Manager Jobs in New York', 'Software Engineer Jobs in Los Angeles', 'Product Manager Jobs in Los Angeles'].map(item => (
                            <a key={item} href="#" style={{ fontSize: '13px', color: '#555', textDecoration: 'none' }}>{item}</a>
                        ))}
                    </div>

                    {/* Column 4 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#111' }}>Remote Jobs</h4>
                        {['Remote Software Engineer Jobs', 'Remote Design & UI/UX Jobs', 'Remote Product Manager Jobs', 'Remote Sales Jobs', 'Remote Marketing Jobs', 'Remote Support Jobs', 'Remote Operations Jobs'].map(item => (
                            <a key={item} href="#" style={{ fontSize: '13px', color: '#555', textDecoration: 'none' }}>{item}</a>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default StartupDetail;
