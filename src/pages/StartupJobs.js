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
        <div style={{ borderBottom: '1px solid #eee', padding: '1rem 1.5rem', backgroundColor: '#fff' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#111', borderBottom: '2px solid #6300dd', paddingBottom: '4px' }}>Companies & jobs</div>
                    <Link to="/candidate/inbox" style={{ fontSize: '14px', fontWeight: '500', color: '#666', textDecoration: 'none' }}>Inbox</Link>
                    <div className="mobile-hide" style={{ fontSize: '14px', fontWeight: '500', color: '#666' }}>Education</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Link to="/candidate/profile" style={{ fontSize: '14px', fontWeight: '500', color: '#666', textDecoration: 'none' }}>My profile</Link>
                </div>
            </div>
        </div>

        <div className="jobs-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem' }}>
            {/* Sidebar Filters */}
            <aside className="jobs-sidebar">
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

                <div className="filter-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {[
                        { label: 'Commitment', options: ['All', 'Full-time', 'Part-time', 'Contract', 'Internship'] },
                        { label: 'Role', options: ['Any', 'Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Operations'] },
                        { label: 'Location', options: ['All', 'Remote', 'San Francisco', 'New York', 'London', 'India'] },
                    ].map(filter => (
                        <div key={filter.label}>
                            <label style={{ fontSize: '13px', fontWeight: '700', color: '#111', display: 'block', marginBottom: '8px' }}>{filter.label}</label>
                            <select style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', backgroundColor: '#fff' }}>
                                {filter.options.map(opt => <option key={opt}>{opt}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#111', backgroundColor: '#f0f0ed', padding: '6px 16px', borderRadius: '4px' }}>All</div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#666', padding: '6px 16px' }}>Saved</div>
                    </div>
                </div>

                <div style={{ fontSize: '15px', color: '#333', marginBottom: '1.5rem' }}>
                    Showing <strong>{filteredCompanies.length}</strong> matching startups
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {filteredCompanies.map(company => (
                        <div key={company.founderId} style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
                            {/* Company Header */}
                            <div className="company-card-header" style={{ padding: '1.5rem', borderBottom: '1px solid #f9f9f9', display: 'flex', gap: '1.5rem' }}>
                                <div style={{ width: '60px', height: '60px', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                                    <img src={company.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{company.name}</h2>
                                        <span style={{ color: '#999', fontSize: '13px' }}>(Founded in {company.batch})</span>
                                    </div>
                                    <p style={{ fontSize: '14px', color: '#333', margin: '0 0 10px 0' }}>{company.tagline.split('.')[0]}.</p>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '12px', color: '#666', backgroundColor: '#f5f5f2', padding: '2px 8px', borderRadius: '4px' }}>{company.location}</span>
                                        <span style={{ fontSize: '12px', color: '#666', backgroundColor: '#f5f5f2', padding: '2px 8px', borderRadius: '4px' }}>{company.industry}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Jobs List */}
                            <div style={{ backgroundColor: '#f9f9f6' }}>
                                {company.jobs.map(job => (
                                    <div 
                                        key={job.id} 
                                        onClick={() => navigate(`/job/${job.id}`)}
                                        className="job-item"
                                        style={{ 
                                            padding: '1.25rem 1.5rem', 
                                            borderBottom: '1px solid #f0f0ed', 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                            gap: '1rem'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f2'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div>
                                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111', margin: '0 0 4px 0' }}>{job.role}</h3>
                                            <div style={{ fontSize: '13px', color: '#666' }}>
                                                {job.location} • {job.type}
                                            </div>
                                        </div>
                                        <button className="mobile-hide" style={{ backgroundColor: '#111', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>View</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
        <style>{`
            .jobs-container {
                display: grid;
                grid-template-columns: 280px 1fr;
                gap: 2.5rem;
            }
            @media (max-width: 900px) {
                .jobs-container { grid-template-columns: 1fr; }
                .jobs-sidebar { display: none; }
                .company-card-header { flex-direction: column; gap: 1rem !important; }
                .job-item { flex-direction: column; align-items: flex-start !important; }
            }
        `}</style>
    </div>
    );
};

export default StartupJobs;
