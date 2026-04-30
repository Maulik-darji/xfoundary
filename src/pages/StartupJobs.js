import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';

const StartupJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const navigate = useNavigate();

    const categories = ['All', 'Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Operations'];

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const q = query(
                collection(db, 'jobs'), 
                orderBy('createdAt', 'desc'), 
                limit(30)
            );
            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setJobs(list);
            setLastVisible(snap.docs[snap.docs.length - 1]);
            setHasMore(snap.docs.length === 30);
        } catch (err) {
            console.error("Error fetching jobs:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMore = async () => {
        if (!lastVisible) return;
        try {
            const q = query(
                collection(db, 'jobs'), 
                orderBy('createdAt', 'desc'), 
                startAfter(lastVisible), 
                limit(30)
            );
            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setJobs([...jobs, ...list]);
            setLastVisible(snap.docs[snap.docs.length - 1]);
            setHasMore(snap.docs.length === 30);
        } catch (err) {
            console.error("Error fetching more jobs:", err);
        }
    };

    if (loading) return <div style={{ padding: '10rem', textAlign: 'center' }}>Loading jobs...</div>;

    return (
        <div style={{ backgroundColor: '#fdfdfc', minHeight: '100vh', paddingBottom: '10rem' }}>
            {/* Hero Section */}
            <div style={{ padding: '8rem 2rem 4rem 2rem', textAlign: 'center', backgroundColor: '#fdfdfc' }}>
                <h1 style={{ fontSize: '3.5rem', fontWeight: '900', color: '#111', margin: '0 0 1.5rem 0', letterSpacing: '-2px' }}>
                    Find the best startup jobs,<br />curated by X Foundary
                </h1>
                <ul style={{ 
                    listStyle: 'none', 
                    padding: 0, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '12px',
                    color: '#444',
                    fontSize: '18px',
                    marginBottom: '2.5rem'
                }}>
                    <li>• Apply to thousands of startup jobs with a single profile.</li>
                    <li>• Let XF founders contact you or browse companies privately.</li>
                    <li>• Find the next big thing — only XF companies.</li>
                </ul>
                <button style={{ 
                    backgroundColor: '#6300dd', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '16px 36px', 
                    borderRadius: '8px', 
                    fontSize: '18px', 
                    fontWeight: '700', 
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99, 0, 221, 0.3)'
                }}>
                    Find a job ›
                </button>
                <p style={{ marginTop: '1.5rem', color: '#666', fontSize: '14px' }}>
                    Already work at an XF startup? <a href="#" style={{ color: '#111', textDecoration: 'underline' }}>Browse privately</a>
                </p>
            </div>

            {/* Filters & Content */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #eee', marginBottom: '2.5rem', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Recent jobs added</h2>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        {categories.map(cat => (
                            <span 
                                key={cat} 
                                onClick={() => setActiveCategory(cat)}
                                style={{ 
                                    fontSize: '14px', 
                                    fontWeight: activeCategory === cat ? '700' : '500', 
                                    color: activeCategory === cat ? '#ff6600' : '#0073b1',
                                    cursor: 'pointer'
                                }}
                            >
                                {cat}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Job Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {jobs.map(job => (
                        <div 
                            key={job.id} 
                            onClick={() => navigate(`/job/${job.id}`)}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                padding: '1.5rem', 
                                backgroundColor: '#fff', 
                                border: '1px solid #eee', 
                                borderRadius: '8px',
                                transition: 'transform 0.2s',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ width: '60px', height: '60px', backgroundColor: '#fdfdfc', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden', marginRight: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {job.companyLogo ? (
                                    <img src={job.companyLogo} alt={job.companyName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
                                ) : (
                                    <div style={{ width: '40px', height: '400px', backgroundColor: '#ff6600', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '20px', fontWeight: '900' }}>X</div>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: '800', fontSize: '16px' }}>{job.companyName}</span>
                                    <span style={{ color: '#666', fontSize: '14px' }}>({job.batch || 'S26'})</span>
                                    <span style={{ color: '#999', fontSize: '14px' }}>• {job.industry || 'Tech'}</span>
                                </div>
                                <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#0073b1', fontWeight: '700' }}>{job.role}</h3>
                                <div style={{ fontSize: '14px', color: '#555', display: 'flex', gap: '12px' }}>
                                    <span>{job.type}</span>
                                    <span>•</span>
                                    <span>{job.location}</span>
                                </div>
                            </div>
                            <button style={{ 
                                backgroundColor: '#ff6600', 
                                color: '#fff', 
                                border: 'none', 
                                padding: '8px 24px', 
                                borderRadius: '4px', 
                                fontWeight: '700', 
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}>
                                Apply
                            </button>
                        </div>
                    ))}
                </div>

                {hasMore && (
                    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                        <button 
                            onClick={fetchMore}
                            style={{ 
                                backgroundColor: '#ff6600', 
                                color: '#fff', 
                                border: 'none', 
                                padding: '14px 40px', 
                                borderRadius: '8px', 
                                fontSize: '16px', 
                                fontWeight: '700', 
                                cursor: 'pointer'
                            }}
                        >
                            See more jobs ›
                        </button>
                    </div>
                )}
            </div>

            {/* Pre-Footer Section */}
            <div style={{ maxWidth: '1200px', margin: '8rem auto 0 auto', padding: '4rem 2rem', borderTop: '1px solid #eee', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2rem' }}>
                <div>
                    <h4 style={{ fontWeight: '800', marginBottom: '1.5rem' }}>Work at a Startup</h4>
                    <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', color: '#444', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <li>Jobs</li>
                        <li>Internships</li>
                        <li>Events</li>
                        <li>How it works</li>
                        <li>Sign In</li>
                    </ul>
                </div>
                <div>
                    <h4 style={{ fontWeight: '800', marginBottom: '1.5rem' }}>Jobs by Role</h4>
                    <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', color: '#444', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <li>Software Engineer Jobs</li>
                        <li>Design & UI/UX Jobs</li>
                        <li>Product Manager Jobs</li>
                        <li>Recruiting & HR Jobs</li>
                        <li>Sales Jobs</li>
                    </ul>
                </div>
                <div>
                    <h4 style={{ fontWeight: '800', marginBottom: '1.5rem' }}>Jobs by Location</h4>
                    <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', color: '#444', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <li>Jobs in San Francisco</li>
                        <li>Jobs in New York</li>
                        <li>Jobs in London</li>
                        <li>Jobs in Bengaluru</li>
                        <li>Jobs in India</li>
                    </ul>
                </div>
                <div>
                    <h4 style={{ fontWeight: '800', marginBottom: '1.5rem' }}>Jobs by Role & Location</h4>
                    <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', color: '#444', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <li>Software Engineer Jobs in San Francisco</li>
                        <li>Product Manager Jobs in New York</li>
                        <li>Sales Jobs in London</li>
                    </ul>
                </div>
                <div>
                    <h4 style={{ fontWeight: '800', marginBottom: '1.5rem' }}>Remote Jobs</h4>
                    <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', color: '#444', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <li>Remote Software Engineer Jobs</li>
                        <li>Remote Design Jobs</li>
                        <li>Remote Product Jobs</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default StartupJobs;
