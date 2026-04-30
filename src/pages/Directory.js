import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';

const SortDropdown = ({ selected, setSelected }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div 
            style={{ position: 'relative' }}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <div 
                className="sort-dropdown"
                style={{ 
                    borderColor: isOpen ? '#6300dd' : '#e5e5e0',
                    width: '200px',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500',
                    userSelect: 'none',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
            >
                {selected}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                    <path d="m6 9 6 6 6-6"/>
                </svg>
            </div>
            {isOpen && (
                <div style={{ 
                    position: 'absolute', 
                    top: 'calc(100% + 5px)', 
                    right: 0, 
                    width: '240px', 
                    background: 'rgba(255, 255, 252, 0.98)', 
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0,0,0,0.05)', 
                    borderRadius: '20px', 
                    padding: '12px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)', 
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    {['Default', 'Launch Date', 'Recently Added'].map(option => (
                        <div 
                            key={option}
                            onClick={() => { setSelected(option); setIsOpen(false); }}
                            style={{ 
                                padding: '12px 16px', 
                                cursor: 'pointer',
                                fontSize: '15px',
                                borderRadius: '12px',
                                backgroundColor: selected === option ? 'rgba(99, 0, 221, 0.08)' : 'transparent',
                                color: selected === option ? '#6300dd' : '#444',
                                fontWeight: selected === option ? 700 : 400,
                                transition: 'all 0.2s',
                                border: selected === option ? '1px solid rgba(99, 0, 221, 0.1)' : '1px solid transparent'
                            }}
                            onMouseEnter={e => { if (selected !== option) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)'; }}
                            onMouseLeave={e => { if (selected !== option) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const FilterChip = ({ label, onRemove, icon }) => (
    <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '6px 14px', 
        backgroundColor: '#fff', 
        border: '1px solid #e5e5e0', 
        borderRadius: '20px', 
        fontSize: '13px', 
        fontWeight: '600', 
        color: '#1a1a1a',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        cursor: 'default'
    }}>
        {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
        {label}
        <div 
            onClick={onRemove}
            style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                color: '#999',
                transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ff4d4f'}
            onMouseLeave={e => e.currentTarget.style.color = '#999'}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </div>
    </div>
);

const Directory = () => {
    const navigate = useNavigate();
    const [startups, setStartups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filteredStartups, setFilteredStartups] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('Default');
    const [expandedIndustries, setExpandedIndustries] = useState(['B2B']); 
    const [companySize, setCompanySize] = useState([1, 1000]); 
    
    const industryHierarchy = {
        'B2B': ['Analytics', 'Engineering, Product and Design', 'Finance and Accounting', 'Human Resources', 'Infrastructure', 'Legal', 'Marketing', 'Office Management', 'Operations', 'Productivity', 'Recruiting and Talent', 'Retail', 'Sales', 'Security', 'Supply Chain and Logistics'],
        'Consumer': ['Apparel and Cosmetics', 'Consumer Electronics', 'Content', 'Food and Beverage', 'Gaming', 'Home and Personal', 'Job and Career Services', 'Social', 'Transportation Services', 'Travel, Leisure and Tourism', 'Virtual and Augmented Reality'],
        'Fintech': ['Asset Management', 'Banking and Exchange', 'Consumer Finance', 'Credit and Lending', 'Insurance', 'Payments'],
        'Healthcare': ['Consumer Health and Wellness', 'Diagnostics', 'Drug Discovery and Delivery', 'Healthcare IT', 'Healthcare Services', 'Industrial Bio', 'Medical Devices', 'Therapeutics'],
        'Industrials': ['Agriculture', 'Automotive', 'Aviation and Space', 'Climate', 'Defense', 'Drones', 'Energy', 'Manufacturing and Robotics'],
        'Real Estate and Construction': ['Construction', 'Housing and Real Estate']
    };

    const [activeFilters, setActiveFilters] = useState({
        topCompanies: false,
        isHiring: false,
        nonprofit: false,
        batches: ['All'],
        industries: ['All'],
        regions: ['All']
    });

    useEffect(() => {
        document.title = "Startup Directory | X Foundary";
        const fetchStartups = async () => {
            try {
                const q = query(collection(db, 'users'));
                const querySnapshot = await getDocs(q);
                const fetched = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.application) {
                        const app = data.application;
                        fetched.push({
                            id: doc.id,
                            name: app.companyName || 'Unnamed Startup',
                            location: app.basedIn || 'Unknown Location',
                            desc: app.companyDescription || 'No description provided.',
                            batch: app.batch || 'Upcoming',
                            industries: app.category ? [app.category] : ['Other'],
                            logo: `https://logo.clearbit.com/${app.companyUrl?.replace(/^https?:\/\//, '')}` || 'https://via.placeholder.com/110?text=X',
                            top: data.application.status === 'approved', 
                            hiring: data.isHiring || false,
                            nonprofit: data.isNonprofit || false,
                            teamSize: parseInt(app.teamSize) || 1
                        });
                    }
                });
                setStartups(fetched);
                setFilteredStartups(fetched);
            } catch (error) {
                console.error("Error fetching startups:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStartups();
    }, []);

    const counts = useMemo(() => {
        const c = {
            top: startups.filter(s => s.top).length,
            hiring: startups.filter(s => s.hiring).length,
            nonprofit: startups.filter(s => s.nonprofit).length,
            industries: {},
            regions: {
                'Anywhere': startups.length,
                'India': startups.filter(s => s.location?.toLowerCase().includes('india')).length,
            }
        };
        startups.forEach(s => {
            s.industries.forEach(i => {
                c.industries[i] = (c.industries[i] || 0) + 1;
                Object.entries(industryHierarchy).forEach(([main, subs]) => {
                    if (subs.includes(i)) c.industries[main] = (c.industries[main] || 0) + 1;
                });
            });
        });
        return c;
    }, [startups]);

    useEffect(() => {
        let result = startups;
        if (searchQuery) {
            result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.desc.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        if (activeFilters.topCompanies) result = result.filter(s => s.top);
        if (activeFilters.isHiring) result = result.filter(s => s.hiring);
        if (!activeFilters.industries.includes('All')) {
            result = result.filter(s => s.industries.some(i => activeFilters.industries.includes(i)));
        }
        if (!activeFilters.regions.includes('All')) {
            result = result.filter(s => activeFilters.regions.some(r => s.location?.toLowerCase().includes(r.toLowerCase())));
        }
        result = result.filter(s => s.teamSize >= companySize[0] && s.teamSize <= companySize[1]);
        setFilteredStartups(result);
    }, [searchQuery, activeFilters, startups, companySize]);

    const handleFilterToggle = (category, value) => {
        setActiveFilters(prev => {
            const current = prev[category];
            if (Array.isArray(current)) {
                if (value === 'All') return { ...prev, [category]: ['All'] };
                const filtered = current.filter(v => v !== 'All');
                if (filtered.includes(value)) {
                    const next = filtered.filter(v => v !== value);
                    return { ...prev, [category]: next.length ? next : ['All'] };
                }
                return { ...prev, [category]: [...filtered, value] };
            }
            return { ...prev, [category]: !current };
        });
    };

    const toggleIndustryExpansion = (industry) => {
        setExpandedIndustries(prev => 
            prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
        );
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5ee', fontFamily: '"Inter", sans-serif', paddingBottom: '4rem' }}>
            <style>{`
                .directory-page { max-width: 1300px; margin: 0 auto; padding: 2rem; }
                .hero-section {
                    text-align: center;
                    padding: 6rem 1rem 4rem;
                    background-color: #f5f5ee;
                }
                .hero-title {
                    font-size: 5rem;
                    font-family: "Georgia", serif;
                    font-style: italic;
                    font-weight: 400;
                    color: #1a1a1a;
                    margin-bottom: 1.5rem;
                    line-height: 1.1;
                }
                .hero-subtitle {
                    font-size: 20px;
                    color: #555;
                    margin-bottom: 3rem;
                    font-weight: 500;
                }
                .apply-btn {
                    background-color: #6300dd;
                    color: white;
                    padding: 18px 36px;
                    font-size: 16px;
                    font-weight: 700;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                    text-decoration: none;
                    display: inline-block;
                }
                .apply-btn:hover { background-color: #5200b8; transform: translateY(-2px); box-shadow: 0 10px 30px rgba(99, 0, 221, 0.2); }
                
                .quote-section {
                    max-width: 900px;
                    margin: 4rem auto;
                    text-align: left;
                    border-left: 2px solid #ddd;
                    padding-left: 2.5rem;
                }
                .quote-author { font-size: 15px; color: #666; margin-bottom: 10px; font-weight: 500; }
                .quote-text { font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.4; }

                .sidebar { width: 300px; background: #fff; border: 1px solid #e5e5e0; border-radius: 16px; padding: 1.5rem; height: fit-content; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
                .filter-section { margin-bottom: 2rem; border-bottom: 1px solid #f0f0ed; padding-bottom: 1.5rem; }
                .filter-title { font-size: 14px; font-weight: 700; margin-bottom: 1.25rem; color: #1a1a1a; }
                .filter-item { display: flex; alignItems: center; gap: 12px; margin-bottom: 12px; font-size: 14px; color: #444; cursor: pointer; user-select: none; }
                .count-pill { margin-left: auto; font-size: 11px; color: #999; background: #f4f4f2; padding: 2px 8px; border-radius: 6px; }
                .search-box-container { background: #fff; border: 1px solid #e5e5e0; border-radius: 16px; padding: 1.5rem; margin-bottom: 2rem; }
                .search-input { width: 100%; padding: 16px 24px; border: 1px solid #e5e5e0; border-radius: 12px; font-size: 16px; outline: none; margin-bottom: 1.25rem; }
                .startup-card { background: #fff; border: 1px solid #e5e5e0; border-radius: 16px; padding: 2rem; margin-bottom: -1px; display: flex; gap: 2rem; transition: all 0.3s; text-decoration: none; color: inherit; }
                .startup-card:hover { background: #fafafa; border-color: #d1d1ca; }
                .checkbox-custom { width: 18px; height: 18px; border: 2px solid #ddd; border-radius: 5px; display: flex; alignItems: center; justify-content: center; }
                .checkbox-custom.active { background: #6300dd; border-color: #6300dd; }
            `}</style>

            <div className="hero-section">
                <h1 className="hero-title">XF Helps founders<br/><i>feature their startup<br/>globally</i></h1>
                <p className="hero-subtitle">Four times a year we invest in a large number of startups.</p>
                <Link to="/apply" className="apply-btn">Apply for Summer 2026 by May 4</Link>
            </div>

            <div className="quote-section">
                <div className="quote-author">Brian, Joe, and Nate did YC in W09.</div>
                <div className="quote-text">Airbnb went public in 2020 at an over $100B valuation.</div>
            </div>
            
            <div className="quote-section" style={{ marginTop: '2rem' }}>
                <div className="quote-author">Sam was part of YC's inaugural batch in S05 and founded OpenAI as YC Research in 2015.</div>
                <div className="quote-text">Sam built OpenAI into a $500B company.</div>
            </div>

            <div className="directory-page">
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginBottom: '2.5rem' }}>
                    <span style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: '600' }}>Sort by</span>
                    <SortDropdown selected={sortOption} setSelected={setSortOption} />
                </div>

                <div style={{ display: 'flex', gap: '2rem' }}>
                    <aside className="sidebar">
                        <div className="filter-section">
                            <div className="filter-item" onClick={() => handleFilterToggle('topCompanies')}>
                                <div className={`checkbox-custom ${activeFilters.topCompanies ? 'active' : ''}`}>
                                    {activeFilters.topCompanies && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span style={{ color: activeFilters.topCompanies ? '#6300dd' : 'inherit', fontWeight: activeFilters.topCompanies ? 700 : 400 }}>💎 Top Companies</span> 
                                <span className="count-pill">{counts.top}</span>
                            </div>
                        </div>

                        <div className="filter-section">
                            <div className="filter-title">Industry</div>
                            <div className="filter-item" onClick={() => handleFilterToggle('industries', 'All')}>
                                <div style={{ width: '16px' }}></div>
                                <div className={`checkbox-custom ${activeFilters.industries.includes('All') ? 'active' : ''}`}>
                                    {activeFilters.industries.includes('All') && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span style={{ fontWeight: 600 }}>All industries</span> 
                                <span className="count-pill">{startups.length}</span>
                            </div>
                            
                            {Object.keys(industryHierarchy).map(mainInd => (
                                <div key={mainInd}>
                                    <div className="filter-item" style={{ gap: '8px' }}>
                                        <div style={{ cursor: 'pointer', transform: expandedIndustries.includes(mainInd) ? 'rotate(90deg)' : 'none', transition: '0.2s' }} onClick={() => toggleIndustryExpansion(mainInd)}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                                        </div>
                                        <div className={`checkbox-custom ${activeFilters.industries.includes(mainInd) ? 'active' : ''}`} onClick={() => handleFilterToggle('industries', mainInd)}>
                                            {activeFilters.industries.includes(mainInd) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                        </div>
                                        <span onClick={() => handleFilterToggle('industries', mainInd)}>{mainInd}</span>
                                        <span className="count-pill">{counts.industries[mainInd] || 0}</span>
                                    </div>
                                    {expandedIndustries.includes(mainInd) && (
                                        <div style={{ marginLeft: '40px' }}>
                                            {industryHierarchy[mainInd].map(subInd => (
                                                <div key={subInd} className="filter-item" onClick={() => handleFilterToggle('industries', subInd)}>
                                                    <div className={`checkbox-custom ${activeFilters.industries.includes(subInd) ? 'active' : ''}`}>
                                                        {activeFilters.industries.includes(subInd) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                                    </div>
                                                    <span style={{ fontSize: '13px', color: '#666' }}>{subInd}</span>
                                                    <span className="count-pill">{counts.industries[subInd] || 0}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="filter-section">
                            <div className="filter-title">HQ Region</div>
                            <div className="filter-item" onClick={() => handleFilterToggle('regions', 'All')}>
                                <div className={`checkbox-custom ${activeFilters.regions.includes('All') ? 'active' : ''}`}>
                                    {activeFilters.regions.includes('All') && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                Anywhere <span className="count-pill">{counts.regions['Anywhere']}</span>
                            </div>
                            <div className="filter-item" onClick={() => handleFilterToggle('regions', 'India')}>
                                <div className={`checkbox-custom ${activeFilters.regions.includes('India') ? 'active' : ''}`}>
                                    {activeFilters.regions.includes('India') && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                India <span className="count-pill">{counts.regions['India']}</span>
                            </div>
                        </div>
                    </aside>

                    <div style={{ flex: 1 }}>
                        <div className="search-box-container">
                            <input type="text" placeholder="Search startups..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            <div className="chips-row">
                                {activeFilters.topCompanies && <FilterChip label="Top Companies" icon={<span style={{ color: '#6300dd' }}>💎</span>} onRemove={() => handleFilterToggle('topCompanies')} />}
                                {activeFilters.regions.includes('India') && <FilterChip label="India" onRemove={() => handleFilterToggle('regions', 'India')} />}
                            </div>
                        </div>

                        <div style={{ borderRadius: '16px', overflow: 'hidden' }}>
                            {filteredStartups.map(startup => (
                                <Link to={`/companies/${startup.id}`} key={startup.id} className="startup-card">
                                    <div style={{ width: '110px', height: '110px', flexShrink: 0, borderRadius: '16px', border: '1px solid #f0f0ed', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', overflow: 'hidden' }}>
                                        <img src={startup.logo} alt={startup.name} style={{ maxWidth: '75%', maxHeight: '75%', objectFit: 'contain' }} onError={(e) => e.target.src = 'https://via.placeholder.com/110?text=X'} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{startup.name}</h3>
                                            <span style={{ color: '#888', fontSize: '15px' }}>{startup.location}</span>
                                        </div>
                                        <p style={{ color: '#555', fontSize: '15px', margin: '0 0 1.5rem 0', lineHeight: '1.6' }}>{startup.desc}</p>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <div className="tag-brand">{startup.batch}</div>
                                            {startup.industries.map(ind => <span key={ind} className="tag-gray">{ind}</span>)}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Directory;
