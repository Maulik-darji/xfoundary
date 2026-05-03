import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const JobView = () => {
    const { id } = useParams();
    const [job, setJob] = useState(null);
    const [company, setCompany] = useState(null);
    const [otherJobs, setOtherJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        const fetchData = async () => {
            try {
                const jobDoc = await getDoc(doc(db, 'jobs', id));
                if (jobDoc.exists()) {
                    const jobData = jobDoc.data();
                    setJob({ id: jobDoc.id, ...jobData });

                    // Fetch Company Data
                    const companyDoc = await getDoc(doc(db, 'users', jobData.founderId));
                    if (companyDoc.exists()) {
                        setCompany({ id: companyDoc.id, ...companyDoc.data() });
                    }

                    // Fetch Other Jobs
                    const otherJobsQuery = query(
                        collection(db, 'jobs'), 
                        where('founderId', '==', jobData.founderId)
                    );
                    const otherJobsSnap = await getDocs(otherJobsQuery);
                    setOtherJobs(otherJobsSnap.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(j => j.id !== id)
                    );
                }
            } catch (err) {
                console.error("Error fetching job detail:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return () => unsubscribe();
    }, [id]);

    const handleApply = () => {
        if (!user) {
            navigate('/login?redirect=/job/' + id);
        } else {
            // Future: Show actual application form/modal
            alert('Application submitted! (Demo)');
        }
    };

    if (loading) return <div style={{ padding: '10rem', textAlign: 'center', backgroundColor: '#f5f5ee', minHeight: '100vh' }}>Loading job details...</div>;
    if (!job) return <div style={{ padding: '10rem', textAlign: 'center' }}>Job not found.</div>;

    const companyName = company?.application?.companyName || job.companyName;
    const batch = company?.application?.batch || job.batch || 'S26';

    return (
        <div style={{ backgroundColor: '#f5f5ee', minHeight: '100vh', fontFamily: '"Inter", sans-serif', paddingBottom: '10rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem' }}>
                
                {/* Breadcrumbs */}
                <nav style={{ fontSize: '14px', color: '#0073b1', marginBottom: '2rem', fontWeight: '500' }}>
                    <Link to="/jobs" style={{ color: '#0073b1', textDecoration: 'none' }}>Companies</Link>
                    <span style={{ margin: '0 8px', color: '#999' }}>/</span>
                    <Link to={`/companies/${job.founderId}`} style={{ color: '#0073b1', textDecoration: 'none' }}>{companyName} (Founded in {batch})</Link>
                    <span style={{ margin: '0 8px', color: '#999' }}>/</span>
                    <span style={{ color: '#333' }}>Jobs</span>
                </nav>

                {/* Job Header Card */}
                <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '2.5rem', marginBottom: '3rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                        <div style={{ width: '80px', height: '80px', backgroundColor: '#f5f5f2', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {job.companyLogo ? (
                                <img src={job.companyLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', backgroundColor: '#ff6600', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900' }}>X</div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', margin: '0 0 8px 0', lineHeight: '1.2' }}>
                                {job.role} at {companyName} <span style={{ color: '#999', fontWeight: '500' }}>(Founded in {batch})</span>
                            </h1>
                            <p style={{ fontSize: '16px', color: '#666', margin: '0 0 20px 0' }}>{company?.application?.companyDescription?.split('.')[0] + '.' || 'Construction & industrial logistics platform.'}</p>
                            
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <span style={{ backgroundColor: '#f0f0ed', color: '#555', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    {job.location}
                                </span>
                                <span style={{ backgroundColor: '#f0f0ed', color: '#555', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    {job.type}
                                </span>
                                <span style={{ backgroundColor: '#f0f0ed', color: '#555', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                                    Public
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleApply} style={{ backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '6px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 102, 0, 0.2)' }}>Apply</button>
                            <button style={{ backgroundColor: '#fff', color: '#666', border: '1px solid #ddd', padding: '12px 20px', borderRadius: '6px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                {/* Job Details Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    
                    <section>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111', marginBottom: '1.25rem' }}>About {companyName}</h2>
                        <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#333' }}>
                            {company?.application?.companyDescription || 'No company description available.'}
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111', marginBottom: '1.25rem' }}>About the role</h2>
                        <div style={{ fontSize: '16px', lineHeight: '1.7', color: '#333', whiteSpace: 'pre-wrap' }}>
                            {job.roleDescription || job.description || 'No detailed description provided.'}
                        </div>
                    </section>

                    {job.whatYouWillDo && (
                        <section>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111', marginBottom: '1rem' }}>What you will do:</h3>
                            <div style={{ fontSize: '16px', lineHeight: '1.7', color: '#333', whiteSpace: 'pre-wrap' }}>
                                {job.whatYouWillDo}
                            </div>
                        </section>
                    )}

                    {job.whatYouNeed && (
                        <section>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111', marginBottom: '1rem' }}>What you need to have:</h3>
                            <div style={{ fontSize: '16px', lineHeight: '1.7', color: '#333', whiteSpace: 'pre-wrap' }}>
                                {job.whatYouNeed}
                            </div>
                        </section>
                    )}

                    {job.whatIsInIt && (
                        <section>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111', marginBottom: '1rem' }}>What is in it for you?</h3>
                            <div style={{ fontSize: '16px', lineHeight: '1.7', color: '#333', whiteSpace: 'pre-wrap' }}>
                                {job.whatIsInIt}
                            </div>
                        </section>
                    )}

                    <section>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111', marginBottom: '1.25rem' }}>Who are we?</h2>
                        <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#333' }}>
                            We are {companyName} and our mission is to be the way the world {company?.application?.category || 'works'}.
                            {company?.application?.companyDescription}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
                            <a href="#" style={{ color: '#0073b1', fontSize: '14px', fontWeight: '600' }}>Twitter</a>
                            <a href="#" style={{ color: '#0073b1', fontSize: '14px', fontWeight: '600' }}>LinkedIn</a>
                            <a href="#" style={{ color: '#0073b1', fontSize: '14px', fontWeight: '600' }}>Facebook</a>
                        </div>
                    </section>

                    {job.technology && (
                        <section>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111', marginBottom: '1.25rem' }}>Technology</h2>
                            <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#333' }}>
                                {job.technology}
                            </p>
                        </section>
                    )}

                    {/* Footer: Other Jobs */}
                    {otherJobs.length > 0 && (
                        <section style={{ marginTop: '5rem', borderTop: '1px solid #eee', paddingTop: '4rem' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111', marginBottom: '2rem' }}>Other jobs at {companyName}</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {otherJobs.map(j => (
                                    <div key={j.id} onClick={() => navigate(`/job/${j.id}`)} style={{ padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        <div>
                                            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px 0' }}>{j.role}</h3>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#666', fontWeight: '600' }}>
                                                <span>{j.location}</span>
                                                <span>•</span>
                                                <span>{j.type}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <button style={{ backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: '700', fontSize: '14px' }}>View job</button>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* YC-Style Mega Footer */}
            <footer style={{ backgroundColor: '#f5f5ee', borderTop: '1px solid #eee', padding: '5rem 2rem', marginTop: '5rem' }}>
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

export default JobView;
