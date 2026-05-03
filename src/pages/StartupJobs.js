import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';

const StartupJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setJobs(list);
            } catch (err) {
                console.error("Error fetching jobs:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    // Group jobs by company
    const companies = jobs.reduce((acc, job) => {
        const companyId = job.founderId || job.companyName;
        if (!acc[companyId]) {
            acc[companyId] = {
                name: job.companyName,
                logo: job.companyLogo,
                batch: job.batch || 'S26',
                tagline: job.companyDescription || 'No description available.',
                location: job.location,
                industry: job.industry || 'Tech',
                founderId: job.founderId,
                jobs: []
            };
        }
        acc[companyId].jobs.push(job);
        return acc;
    }, {});

    const filteredCompanies = Object.values(companies).filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.jobs.some(j => j.role.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '18px', color: '#111', fontWeight: 600 }}>Loading job board...</div>
        </div>
    );

    return (
        <div style={{ backgroundColor: '#f5f5ee', minHeight: '100vh', fontFamily: '"Inter", sans-serif' }}>
            {/* Top Sub-Nav */}
            <div style={{ borderBottom: '1px solid #eee', padding: '1rem 2rem', backgroundColor: '#fff' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#111', borderBottom: '2px solid #ff6600', paddingBottom: '4px' }}>Companies & jobs</div>
                        <Link to="/candidate/inbox" style={{ fontSize: '15px', fontWeight: '500', color: '#666', textDecoration: 'none' }}>Inbox</Link>
                        <div style={{ fontSize: '15px', fontWeight: '500', color: '#666' }}>Education</div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <Link to="/candidate/profile" style={{ fontSize: '15px', fontWeight: '500', color: '#666', textDecoration: 'none' }}>My profile</Link>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', padding: '2rem' }}>
                {/* Sidebar Filters */}
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: '700', color: '#111', display: 'block', marginBottom: '8px' }}>Search</label>
                        <input 
                            type="text" 
                            placeholder="Search by job title, tech stack..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                    </div>

                    {[
                        { label: 'Commitment', options: ['All', 'Full-time', 'Part-time', 'Contract', 'Internship'] },
                        { label: 'Role', options: ['Any', 'Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Operations'] },
                        { label: 'Company size', options: ['Any', '1-10', '11-50', '51-200', '201-500', '500+'] },
                        { label: 'Industry', options: ['All', 'B2B', 'Consumer', 'Fintech', 'Healthcare', 'Industrials'] },
                        { label: 'Experience', options: ['All', 'Junior', 'Mid-level', 'Senior', 'Lead'] },
                        { label: 'Location', options: ['All', 'Remote', 'San Francisco', 'New York', 'London', 'India'] },
                    ].map(filter => (
                        <div key={filter.label}>
                            <label style={{ fontSize: '13px', fontWeight: '700', color: '#111', display: 'block', marginBottom: '8px' }}>{filter.label}</label>
                            <select style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', backgroundColor: '#fff' }}>
                                {filter.options.map(opt => <option key={opt}>{opt}</option>)}
                            </select>
                        </div>
                    ))}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem' }}>
                        {['Has salary range', 'Has equity range', 'Has interview process'].map(check => (
                            <label key={check} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#444', cursor: 'pointer' }}>
                                <input type="checkbox" /> {check}
                            </label>
                        ))}
                    </div>
                </aside>

                {/* Main Content */}
                <main>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#111', backgroundColor: '#f0f0ed', padding: '6px 16px', borderRadius: '4px' }}>All</div>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#666', padding: '6px 16px' }}>Saved</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '14px', color: '#666' }}>Sort by</span>
                            <select style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '6px 12px', fontSize: '14px' }}>
                                <option>Newest jobs</option>
                                <option>Company size</option>
                                <option>Batch</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ fontSize: '15px', color: '#333', marginBottom: '1.5rem' }}>
                        Showing <strong>{filteredCompanies.length}</strong> matching startups
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {filteredCompanies.map(company => (
                            <div key={company.founderId} style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                                {/* Company Header */}
                                <div style={{ padding: '1.5rem', borderBottom: '1px solid #f9f9f9', display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ width: '60px', height: '60px', border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                                        <img src={company.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{company.name}</h2>
                                            <span style={{ color: '#999', fontSize: '14px' }}>({company.batch})</span>
                                        </div>
                                        <p style={{ fontSize: '14px', color: '#333', margin: '0 0 10px 0' }}>{company.tagline.split('.')[0]}.</p>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '12px', color: '#666', backgroundColor: '#f5f5f2', padding: '2px 8px', borderRadius: '4px' }}>{company.location}</span>
                                            <span style={{ fontSize: '12px', color: '#666', backgroundColor: '#f5f5f2', padding: '2px 8px', borderRadius: '4px' }}>{company.industry}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#999"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    </div>
                                </div>
                                {/* Jobs List */}
                                <div style={{ backgroundColor: '#f5f5ee' }}>
                                    {company.jobs.map(job => (
                                        <div 
                                            key={job.id} 
                                            onClick={() => navigate(`/job/${job.id}`)}
                                            style={{ 
                                                padding: '1.25rem 1.5rem', 
                                                borderBottom: '1px solid #f0f0ed', 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                cursor: 'pointer',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f2'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <div>
                                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111', margin: '0 0 4px 0' }}>{job.role}</h3>
                                                <div style={{ fontSize: '13px', color: '#666' }}>
                                                    {job.location} • {job.type} • $80K - $120K
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <button style={{ backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '4px', fontWeight: '700', fontSize: '13px' }}>View job</button>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default StartupJobs;
