import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
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
                        news: data.news || []
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
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem' }}>
                {/* Breadcrumbs */}
                <nav style={{ fontSize: '14px', color: '#0073b1', marginBottom: '2rem', fontWeight: '500' }}>
                    <Link to="/jobs" style={{ color: '#0073b1', textDecoration: 'none' }}>Companies</Link>
                    <span style={{ margin: '0 8px', color: '#999' }}>/</span>
                    <span style={{ color: '#333' }}>{startup.name} ({startup.batch})</span>
                </nav>

                {/* Main Profile Box */}
                <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden', padding: '2rem' }}>
                    {/* Header Section */}
                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', position: 'relative' }}>
                        <div style={{ width: '80px', height: '80px', border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={startup.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 6px 0' }}>{startup.name} <span style={{ color: '#999', fontWeight: '400', fontSize: '18px' }}>({startup.batch})</span></h1>
                                    <p style={{ fontSize: '18px', color: '#333', margin: '0 0 15px 0', fontWeight: '500' }}>{startup.tagline}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <a href={startup.url} target="_blank" rel="noopener noreferrer" style={{ color: '#999' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></a>
                                    <a href={startup.socials.twitter} target="_blank" rel="noopener noreferrer" style={{ color: '#999' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
                                    <a href={startup.socials.facebook} target="_blank" rel="noopener noreferrer" style={{ color: '#999' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04c-5.5 0-10 4.5-10 10 0 4.97 3.64 9.08 8.44 9.88v-6.99h-2.54v-2.89h2.54v-2.2c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.19 2.23.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.77l-.44 2.89h-2.33v6.99c4.8-.8 8.44-4.91 8.44-9.88 0-5.5-4.5-10-10-10z"/></svg></a>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{ backgroundColor: '#f5f5f2', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', color: '#666', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    {startup.location}
                                </span>
                                <span style={{ backgroundColor: '#f5f5f2', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', color: '#666', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    {startup.teamSize} people
                                </span>
                                {startup.industries.map(ind => (
                                    <span key={ind} style={{ backgroundColor: '#f5f5f2', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', color: '#666', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                        {ind}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #eee', padding: '2rem 0' }}>
                        {/* Founders Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '2rem', marginBottom: '3rem' }}>
                            <div style={{ color: '#999', fontSize: '15px', fontWeight: '600' }}>Founders</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {startup.founders.map(founder => (
                                    <div key={founder.name} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                        <img src={founder.photo} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                                <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0 }}>{founder.name}</h3>
                                                <a href={founder.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
                                            </div>
                                            <p style={{ fontSize: '15px', color: '#444', lineHeight: '1.6', margin: 0 }}>{founder.bio}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* About Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '2rem', marginBottom: '3rem', borderTop: '1px solid #f9f9f9', paddingTop: '2rem' }}>
                            <div style={{ color: '#999', fontSize: '15px', fontWeight: '600' }}>About</div>
                            <div style={{ fontSize: '16px', lineHeight: '1.7', color: '#333', whiteSpace: 'pre-wrap' }}>
                                {startup.fullDesc}
                            </div>
                        </div>

                        {/* Tech Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '2rem', borderTop: '1px solid #f9f9f9', paddingTop: '2rem' }}>
                            <div style={{ color: '#999', fontSize: '15px', fontWeight: '600' }}>Tech</div>
                            <div style={{ fontSize: '16px', lineHeight: '1.7', color: '#333' }}>
                                {startup.news.length > 0 ? "The latest stack and news updates are integrated here." : "Stack information not provided."}
                                {startup.fullDesc.includes('stack') && <p>{startup.fullDesc.split('stack')[1].split('.')[0]}</p>}
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
                                    <button style={{ backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', fontSize: '14px' }}>Apply</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#666', fontSize: '16px' }}>No specific jobs listed. You can still apply and we'll let the founders know.</span>
                            <button onClick={() => navigate('/apply')} style={{ backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Apply</button>
                        </div>
                    )}
                </div>
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
