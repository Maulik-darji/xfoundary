import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { hardcodedStartups } from '../data/hardcodedStartups';
import { hardcodedFounders } from '../data/hardcodedFounders';

const industryHierarchy = {
    'B2B': ['Analytics', 'Engineering, Product and Design', 'Finance and Accounting', 'Human Resources', 'Infrastructure', 'Legal', 'Marketing', 'Office Management', 'Operations', 'Productivity', 'Recruiting and Talent', 'Retail', 'Sales', 'Security', 'Supply Chain and Logistics'],
    'Consumer': ['Apparel and Cosmetics', 'Consumer Electronics', 'Content', 'Food and Beverage', 'Gaming', 'Home and Personal', 'Job and Career Services', 'Social', 'Transportation Services', 'Travel, Leisure and Tourism', 'Virtual and Augmented Reality', 'Social Media', 'Quick Commerce', 'Spiritual Tech', 'Social Commerce'],
    'Fintech': ['Asset Management', 'Banking and Exchange', 'Consumer Finance', 'Credit and Lending', 'Insurance', 'Payments', 'Savings', 'Banking'],
    'Healthcare': ['Consumer Health and Wellness', 'Diagnostics', 'Drug Discovery and Delivery', 'Healthcare IT', 'Healthcare Services', 'Industrial Bio', 'Medical Devices', 'Therapeutics'],
    'Industrials': ['Agriculture', 'Automotive', 'Aviation and Space', 'Climate', 'Defense', 'Drones', 'Energy', 'Manufacturing and Robotics', 'Aerospace', 'EV', 'Energy Storage'],
    'Real Estate and Construction': ['Construction', 'Housing and Real Estate'],
    'AI': ['Generative AI', 'Deep Tech', 'Foundational Models', 'Retail Tech', 'Conversational AI'],
    'SaaS': ['Developer Tools', 'CRM', 'Billing', 'Software Testing', 'Productivity']
};

const StartupDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [startup, setStartup] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDetailTab, setActiveDetailTab] = useState('company');

    useEffect(() => {
        const fetchStartup = async () => {
            try {
                if (id?.startsWith('hc-')) {
                    const hc = hardcodedStartups.find(s => s.id === id);
                    if (hc) {
                        const hf = hardcodedFounders.filter(f => f.company === hc.name);
                        setStartup({
                            ...hc,
                            tagline: hc.desc.split('.')[0] + '.',
                            fullDesc: hc.desc,
                            status: 'Public',
                            partner: 'X Foundary',
                            founded: hc.founded || '2023',
                            teamSize: hc.teamSize || '10',
                            socials: hc.socials || { twitter: '', linkedin: '', github: '', facebook: '', crunchbase: '' },
                            founders: hf.length > 0 ? hf.map(f => ({
                                name: f.name,
                                role: f.role,
                                bio: `${f.name} is a founder of ${hc.name}.`,
                                photo: f.image,
                                linkedin: `https://linkedin.com/search/results/all/?keywords=${encodeURIComponent(f.name + ' ' + hc.name)}`
                            })) : [
                                { name: hc.founders.split(',')[0], role: 'Founder', bio: `${hc.founders} are the builders behind ${hc.name}.`, photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(hc.founders)}&background=random` }
                            ],
                            url: `https://${hc.name.toLowerCase().replace(/\s+/g, '')}.com`
                        });
                        document.title = `${hc.name} | X Foundary`;
                        setLoading(false);
                        return;
                    }
                }

                // 1. Try 'applications' collection by ID
                const appRef = doc(db, 'applications', id);
                let appSnap = await getDoc(appRef);
                let appDataFromSnap = null;
                
                if (appSnap.exists()) {
                    appDataFromSnap = appSnap.data();
                } else {
                    // 1b. If not found by ID, try querying by founderId
                    const appQuery = query(collection(db, 'applications'), where('founderId', '==', id));
                    const appQuerySnap = await getDocs(appQuery);
                    if (!appQuerySnap.empty) {
                        appSnap = appQuerySnap.docs[0];
                        appDataFromSnap = appSnap.data();
                    }
                }
                
                if (appDataFromSnap) {
                    const app = appDataFromSnap;
                    
                    // Fetch founder details
                    let founderInfo = { name: 'Founder', photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`, bio: app.whyIdea || '' };
                    if (app.founderId) {
                        const userSnap = await getDoc(doc(db, 'users', app.founderId));
                        if (userSnap.exists()) {
                            const u = userSnap.data();
                            founderInfo = {
                                name: u.profile?.name || u.displayName || app.founderName || 'Founder',
                                photo: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.founderId}`,
                                bio: app.whyIdea || u.profile?.bio || '',
                                linkedin: u.socials?.linkedin || app.founderLinkedIn || ''
                            };
                        }
                    }

                    setStartup({
                        id: appSnap.id,
                        name: app.companyName || 'Unnamed Startup',
                        location: app.basedIn || 'Unknown Location',
                        tagline: app.companyDescription?.split('.')[0] + '.' || 'No tagline available.',
                        fullDesc: app.companyDescription || 'No detailed description provided.',
                        batch: app.batch || 'Upcoming',
                        industries: Array.isArray(app.industries) ? app.industries : ['Tech'],
                        logo: app.companyLogo || (app.companyUrl ? `https://logo.clearbit.com/${app.companyUrl.replace(/^https?:\/\//, '')}` : 'https://via.placeholder.com/120?text=X'),
                        logoWordmark: app.companyLogoWordmark || '',
                        url: app.companyUrl?.startsWith('http') ? app.companyUrl : `https://${app.companyUrl}`,
                        founded: '2024',
                        teamSize: '2',
                        status: app.status === 'approved' ? 'Public' : 'Private',
                        partner: 'X Foundary',
                        socials: { linkedin: founderInfo.linkedin || '' },
                        founders: [founderInfo],
                        news: []
                    });
                    document.title = `${app.companyName || 'Startup'} | X Foundary`;

                    // Fetch Jobs (if any)
                    const jQ = query(collection(db, 'jobs'), where('founderId', '==', app.founderId));
                    const jSnap = await getDocs(jQ);
                    setJobs(jSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoading(false);
                    return;
                }

                // 2. Fallback to legacy 'users' collection
                const userRef = doc(db, 'users', id);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    const app = data.application || {};
                    
                    const linkedinUrl = data.socials?.linkedin || app.socials?.linkedin || '';
                    
                    setStartup({
                        id: userSnap.id,
                        name: app.companyName || 'Unnamed Startup',
                        location: app.basedIn || 'Unknown Location',
                        tagline: app.companyDescription?.split('.')[0] + '.' || 'No tagline available.',
                        fullDesc: app.companyDescription || 'No detailed description provided.',
                        batch: app.batch || 'Upcoming',
                        industries: Array.isArray(app.industries) ? app.industries : ['Tech'],
                        logo: app.companyLogo || (app.companyUrl ? `https://logo.clearbit.com/${app.companyUrl.replace(/^https?:\/\//, '')}` : 'https://via.placeholder.com/120?text=X'),
                        logoWordmark: app.companyLogoWordmark || data.application?.companyLogoWordmark || '',
                        url: app.companyUrl?.startsWith('http') ? app.companyUrl : `https://${app.companyUrl}`,
                        founded: '2024',
                        teamSize: '2',
                        status: app.status === 'approved' ? 'Public' : 'Private',
                        partner: 'X Foundary',
                        socials: { linkedin: linkedinUrl },
                        founders: [
                            {
                                name: data.profile?.name || data.displayName || 'Founder',
                                role: data.profile?.title || 'Founder/CEO',
                                bio: app.whyIdea || 'Founder bio not provided.',
                                photo: data.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userSnap.id}`,
                                linkedin: linkedinUrl
                            }
                        ],
                        news: data.news || []
                    });
                    document.title = `${app.companyName || 'Startup'} | X Foundary`;

                    // Fetch Jobs
                    const jQ = query(collection(db, 'jobs'), where('founderId', '==', userSnap.id));
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
            <div style={{ fontSize: '2rem', color: '#111', fontFamily: "'Newsreader', Georgia, serif", fontStyle: 'italic', letterSpacing: '-0.02em', fontWeight: '400' }}>Loading company data...</div>
        </div>
    );

    if (!startup) return null;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5ee', fontFamily: '"Inter", sans-serif', paddingBottom: '10rem' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 2rem' }}>
                {/* Breadcrumbs */}
                <nav style={{ fontSize: '14px', color: '#666', marginBottom: '2rem', fontWeight: '500' }}>
                    <Link to="/directory" style={{ color: '#666', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#000'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>Companies</Link>
                    <span style={{ margin: '0 8px', color: '#ccc' }}>/</span>
                    <span style={{ color: '#000', fontWeight: '700' }}>{startup.name} (Founded in {startup.batch})</span>
                </nav>

                {/* Two-Column XF Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '3rem', alignItems: 'start' }}>
                    
                    {/* Left Column */}
                    <div>
                        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            <div style={{ width: '100px', height: '100px', flexShrink: 0, borderRadius: '16px', border: '1px solid #eee', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={startup.logo} alt="" style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} onError={(e) => e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${startup.name}&backgroundColor=6300dd&textColor=ffffff`} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0', color: '#111' }}>{startup.name}</h1>
                                <p style={{ fontSize: '18px', color: '#333', margin: '0 0 16px 0', fontWeight: '400', lineHeight: '1.4' }}>{startup.tagline}</p>
                                
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    <span style={{ backgroundColor: 'rgba(99, 0, 221, 0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#6300dd', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(99, 0, 221, 0.1)' }}>
                                        <span style={{ backgroundColor: '#6300dd', color: '#fff', padding: '2px 5px', borderRadius: '2px', fontSize: '10px', lineHeight: 1 }}>X</span>
                                        {startup.batch.toUpperCase()}
                                    </span>
                                    <span style={{ backgroundColor: '#f0f9f0', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#1b8032', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e0f2e0' }}>
                                        <div style={{ width: '8px', height: '8px', backgroundColor: '#00a651', borderRadius: '50%' }}></div>
                                        {startup.status.toUpperCase()}
                                    </span>
                                    {startup.industries.map(ind => (
                                        <span key={ind} style={{ backgroundColor: '#f5f5f2', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#666', fontWeight: '800', textTransform: 'uppercase' }}>
                                            {ind}
                                        </span>
                                    ))}
                                    <span style={{ backgroundColor: '#f5f5f2', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#666', fontWeight: '800', textTransform: 'uppercase' }}>
                                        {startup.location}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #eee', marginBottom: '2.5rem' }}>
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div style={{ paddingBottom: '16px', fontWeight: '800', fontSize: '15px', color: '#111', borderBottom: '2px solid #111', cursor: 'pointer' }}>
                                    Company
                                </div>
                                <div style={{ paddingBottom: '16px', fontWeight: '500', fontSize: '15px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    Jobs <span style={{ backgroundColor: '#f0f0f0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '800' }}>{jobs.length}</span>
                                </div>
                                <div style={{ paddingBottom: '16px', fontWeight: '500', fontSize: '15px', color: '#666', cursor: 'pointer' }}>
                                    News
                                </div>
                            </div>
                            {startup.url && (
                                <a href={startup.url} target="_blank" rel="noopener noreferrer" style={{ paddingBottom: '16px', color: '#6300dd', textDecoration: 'none', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                    {startup.url.replace(/^https?:\/\//, '')}
                                </a>
                            )}
                        </div>

                        {/* Full Description & Content */}
                        <div style={{ fontSize: '15px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>
                            {startup.fullDesc}

                            {startup.founders && startup.founders.length > 0 && (
                                <div style={{ marginTop: '3rem' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '1.5rem', color: '#111' }}>Founders</h3>
                                    {startup.founders.map(founder => (
                                        <div key={founder.name} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
                                            <img src={founder.photo} alt={founder.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <h4 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#111' }}>{founder.name}</h4>
                                                    {founder.linkedin && (
                                                        <a href={founder.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0073b1' }}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                                        </a>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '15px', color: '#444', lineHeight: '1.6' }}>{founder.bio}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column (Sidebar Card) */}
                    <div>
                        <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '16px', marginBottom: '2.5rem' }}>
                                {startup.logoWordmark ? (
                                    <img src={startup.logoWordmark} alt={startup.name} style={{ maxHeight: '56px', objectFit: 'contain' }} />
                                ) : (
                                    <>
                                        <img src={startup.logo} alt="" style={{ width: '60px', height: '60px', objectFit: 'contain' }} onError={(e) => e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${startup.name}&backgroundColor=6300dd&textColor=ffffff`} />
                                        <h2 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#000' }}>{startup.name}</h2>
                                    </>
                                )}
                            </div>

                            <table style={{ width: '100%', fontSize: '14px', marginBottom: '2rem', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ color: '#444', padding: '10px 0' }}>Founded in:</td>
                                        <td style={{ textAlign: 'right', fontWeight: '500', padding: '10px 0', color: '#111' }}>{startup.batch}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#444', padding: '10px 0' }}>Team Size:</td>
                                        <td style={{ textAlign: 'right', fontWeight: '500', padding: '10px 0', color: '#111' }}>{startup.teamSize}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#444', padding: '10px 0' }}>Status:</td>
                                        <td style={{ textAlign: 'right', fontWeight: '500', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', color: '#111' }}>
                                            <div style={{ width: '8px', height: '8px', backgroundColor: '#00a651', borderRadius: '50%' }}></div>
                                            {startup.status}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#444', padding: '10px 0' }}>Location:</td>
                                        <td style={{ textAlign: 'right', fontWeight: '500', padding: '10px 0', color: '#111' }}>{startup.location}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                                {startup.url && (
                                    <a href={startup.url} target="_blank" rel="noopener noreferrer" style={{ width: '32px', height: '32px', border: '1px solid #eee', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', textDecoration: 'none' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                    </a>
                                )}
                                {startup.socials.linkedin && (
                                    <a href={startup.socials.linkedin} target="_blank" rel="noopener noreferrer" style={{ width: '32px', height: '32px', border: '1px solid #eee', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0077b5', textDecoration: 'none' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                    </a>
                                )}
                                {startup.socials.twitter && (
                                    <a href={startup.socials.twitter} target="_blank" rel="noopener noreferrer" style={{ width: '32px', height: '32px', border: '1px solid #eee', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', textDecoration: 'none' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    </a>
                                )}
                                {startup.socials.facebook && (
                                    <a href={startup.socials.facebook} target="_blank" rel="noopener noreferrer" style={{ width: '32px', height: '32px', border: '1px solid #eee', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877f2', textDecoration: 'none' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04c-5.5 0-10 4.5-10 10 0 4.97 3.64 9.08 8.44 9.88v-6.99h-2.54v-2.89h2.54v-2.2c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.19 2.23.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.77l-.44 2.89h-2.33v6.99c4.8-.8 8.44-4.91 8.44-9.88 0-5.5-4.5-10-10-10z"/></svg>
                                    </a>
                                )}
                                {startup.socials.crunchbase && (
                                    <a href={startup.socials.crunchbase} target="_blank" rel="noopener noreferrer" style={{ width: '32px', height: '32px', border: '1px solid #eee', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0073b1', textDecoration: 'none', fontWeight: '800', fontSize: '10px' }}>
                                        cb
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Jobs Section */}
                <div style={{ marginTop: '5rem' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111', marginBottom: '2rem' }}>Jobs at {startup.name}</h2>
                    {jobs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {jobs.map(job => (
                                <div key={job.id} onClick={() => navigate(`/job/${job.id}`)} style={{ padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0' }}>{job.role}</h3>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#666', fontWeight: '600' }}>
                                            <span>{job.location}</span>
                                            <span>•</span>
                                            <span>{job.type}</span>
                                        </div>
                                    </div>
                                    <button style={{ backgroundColor: '#6300dd', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Apply</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <span style={{ color: '#666', fontSize: '16px', fontWeight: '500' }}>No active job listings at the moment. Check back later!</span>
                        </div>
                    )}
                </div>
            </div>

            {/* XF-Style Mega Footer */}
            <footer style={{ backgroundColor: '#f5f5ee', borderTop: '1px solid #eee', padding: '5rem 2rem', marginTop: '5rem' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '80px 1.2fr 1.2fr 1.5fr 1.2fr', gap: '2rem' }}>
                    {/* Brand Logo */}
                    <div>
                        <div style={{ backgroundColor: '#6300dd', width: '50px', height: '50px', borderRadius: '4px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900' }}>X</div>
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
