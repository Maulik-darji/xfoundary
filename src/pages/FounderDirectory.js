import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { hardcodedFounders } from '../data/hardcodedFounders';

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

const SortDropdown = ({ selected, setSelected }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <div
                onClick={() => setIsOpen(prev => !prev)}
                style={{ 
                    border: `1px solid ${isOpen ? '#6300dd' : '#e5e5e0'}`,
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
                    transition: 'border-color 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
            >
                {selected}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                    <path d="m6 9 6 6 6-6"/>
                </svg>
            </div>
            {isOpen && (
                <div style={{ 
                    position: 'absolute', 
                    top: 'calc(100% + 8px)', 
                    right: 0, 
                    width: '240px', 
                    background: 'rgba(255, 255, 252, 0.98)', 
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0,0,0,0.08)', 
                    borderRadius: '16px', 
                    padding: '8px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.12)', 
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                }}>
                    {['Default', 'Recently Added'].map(option => (
                        <div 
                            key={option}
                            onMouseDown={(e) => { e.preventDefault(); setSelected(option); setIsOpen(false); }}
                            style={{ 
                                padding: '10px 16px', 
                                cursor: 'pointer', 
                                fontSize: '14px', 
                                borderRadius: '10px',
                                backgroundColor: selected === option ? 'rgba(99, 0, 221, 0.08)' : 'transparent',
                                color: selected === option ? '#6300dd' : '#444',
                                fontWeight: selected === option ? 700 : 400,
                                transition: 'background-color 0.15s',
                                border: selected === option ? '1px solid rgba(99, 0, 221, 0.12)' : '1px solid transparent'
                            }}
                            onMouseEnter={e => { if (selected !== option) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'; }}
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

const FounderDirectory = ({ embedded }) => {
    const [founders, setFounders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filteredFounders, setFilteredFounders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('Default');
    const [collapsedSections, setCollapsedSections] = useState([]);
    const [expandedIndustries, setExpandedIndustries] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    const toggleSection = (section) => {
        setCollapsedSections(prev => 
            prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
        );
    };

    const toggleIndustryExpansion = (industry) => {
        setExpandedIndustries(prev => 
            prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
        );
    };

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

    const roles = ['Founder', 'CEO', 'CTO', 'Co-Founder', 'COO'];

    const [activeFilters, setActiveFilters] = useState({
        topFounders: false,
        batches: ['All'],
        industries: ['All'],
        roles: []
    });

    const handleFilterToggle = (category, value) => {
        if (category === 'topFounders') {
            setActiveFilters(prev => ({ ...prev, topFounders: !prev.topFounders }));
            return;
        }
        
        setActiveFilters(prev => {
            const current = prev[category];
            if (value === 'All') {
                return { ...prev, [category]: ['All'] };
            }
            const withoutAll = current.filter(v => v !== 'All');
            const newValues = withoutAll.includes(value) 
                ? withoutAll.filter(v => v !== value)
                : [...withoutAll, value];
                
            return { ...prev, [category]: newValues.length === 0 ? (category === 'roles' ? [] : ['All']) : newValues };
        });
    };

    useEffect(() => {
        document.title = "Founder Directory | X Foundary";
        
        // Initialize with hardcoded founders immediately for instant display
        const initialFounders = hardcodedFounders.map(f => ({ ...f, isHardcoded: true }));
        setFounders(initialFounders);
        setFilteredFounders(initialFounders);

        const fetchFounders = async () => {
            try {
                const q = query(collection(db, 'users'));
                const querySnapshot = await getDocs(q);
                const fetched = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.application) {
                        const app = data.application;
                        const name = data.profile?.name || data.name || data.displayName || 'Anonymous Founder';
                        const companyName = app.companyName || 'Unnamed Startup';
                        const role = data.profile?.role || data.role || 'Founder';
                        const image = data.profileImage || data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
                        
                        const inds = [];
                        if (app.category) inds.push(app.category);
                        if (app.subCategory) inds.push(app.subCategory);
                        if (app.industry) inds.push(app.industry);
                        
                        fetched.push({
                            id: doc.id,
                            name: name,
                            company: companyName,
                            role: role,
                            batch: app.batch || 'Upcoming',
                            industries: inds.length > 0 ? [...new Set(inds)] : ['Other'],
                            image: image,
                            top: data.application?.status === 'approved'
                        });
                    }
                });

                // Combine with hardcoded founders
                const combined = [...fetched, ...initialFounders];
                setFounders(combined);
                setFilteredFounders(combined);
            } catch (error) {
                console.error("Error fetching founders:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFounders();
    }, []);

    const counts = useMemo(() => {
        const c = {
            top: founders.filter(s => s.top).length,
            industries: {},
            batches: {},
            roles: {}
        };
        founders.forEach(s => {
            // Industries
            s.industries.forEach(i => {
                c.industries[i] = (c.industries[i] || 0) + 1;
                Object.entries(industryHierarchy).forEach(([main, subs]) => {
                    if (subs.includes(i)) c.industries[main] = (c.industries[main] || 0) + 1;
                });
            });
            // Batches
            c.batches[s.batch] = (c.batches[s.batch] || 0) + 1;
            
            // Roles (simple fuzzy match)
            roles.forEach(r => {
                if (s.role.toLowerCase().includes(r.toLowerCase())) {
                    c.roles[r] = (c.roles[r] || 0) + 1;
                }
            });
        });
        return c;
    }, [founders]);

    useEffect(() => {
        const queryLower = searchQuery.toLowerCase();
        let filtered = founders.filter(founder => {
            const matchesSearch = founder.name.toLowerCase().includes(queryLower) || 
                                  founder.company.toLowerCase().includes(queryLower);
            
            const matchesTop = !activeFilters.topFounders || founder.top;
            const matchesInd = activeFilters.industries.includes('All') || founder.industries.some(i => activeFilters.industries.includes(i) || Object.entries(industryHierarchy).some(([main, subs]) => activeFilters.industries.includes(main) && subs.includes(i)));
            const matchesBatch = activeFilters.batches.includes('All') || activeFilters.batches.includes(founder.batch);
            const matchesRole = activeFilters.roles.length === 0 || activeFilters.roles.some(r => founder.role.toLowerCase().includes(r.toLowerCase()));

            return matchesSearch && matchesTop && matchesInd && matchesBatch && matchesRole;
        });

        // Apply sorting
        if (sortOption === 'Recently Added') {
            // Firestore users (non-hardcoded) first, then hardcoded in their defined order
            filtered = [...filtered].sort((a, b) => {
                if (a.isHardcoded && !b.isHardcoded) return 1;
                if (!a.isHardcoded && b.isHardcoded) return -1;
                return 0; // Maintain relative order
            });
        } else if (sortOption === 'Default') {
            // Alphabetical sort for Default
            filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        }

        setFilteredFounders(filtered);
    }, [searchQuery, activeFilters, founders, sortOption]);

    const batchList = useMemo(() => {
        const batches = [...new Set(founders.map(f => f.batch))].filter(b => b && b !== 'Upcoming');
        return batches.sort((a, b) => {
            const yearA = parseInt(a.slice(1)) || 0;
            const yearB = parseInt(b.slice(1)) || 0;
            if (yearA !== yearB) return yearB - yearA;
            return b.localeCompare(a);
        });
    }, [founders]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f6f6ef' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #eee', borderTop: '3px solid #ff6026', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ backgroundColor: '#f5f5ee', minHeight: '100vh', color: '#111' }}>
            <style>{`
                .founder-directory-page { max-width: 1300px; margin: 0 auto; padding: ${embedded ? '2rem 0' : '5rem 2rem 2rem'}; }
                .main-layout { display: flex; gap: 2rem; }
                .sidebar { width: 300px; background: #fff; border: 1px solid #e5e5e0; border-radius: 16px; padding: 1.5rem; height: fit-content; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
                .filter-section { margin-bottom: 2rem; border-bottom: 1px solid #f0f0ed; padding-bottom: 1.5rem; }
                .filter-title { font-size: 14px; font-weight: 700; margin-bottom: 1.25rem; color: #1a1a1a; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
                .filter-item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; font-size: 14px; color: #444; cursor: pointer; user-select: none; }
                .count-pill { margin-left: auto; font-size: 11px; color: #999; background: #f4f4f2; padding: 2px 8px; border-radius: 6px; flex-shrink: 0; }
                .checkbox-custom { width: 22px; height: 22px; border: 2px solid #d1d1ca; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
                .checkbox-custom.active { background: #6300dd; border-color: #6300dd; }
                .filter-title-icon { background: #f0f0ed; border-radius: 4px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
                .search-box-container { background: #fff; border: 1px solid #e5e5e0; border-radius: 16px; padding: 1.5rem; margin-bottom: 2rem; position: relative; }
                .search-input { width: 100%; padding: 16px 24px; border: 1px solid #e5e5e0; border-radius: 12px; font-size: 16px; outline: none; margin-bottom: 0; }
                .founder-card { background: #fff; border: 1px solid #e5e5e0; border-radius: 16px; padding: 1.5rem; margin-bottom: -1px; display: flex; gap: 1.5rem; transition: all 0.3s; text-decoration: none; color: inherit; }
                .founder-card:hover { background: #fafafa; border-color: #d1d1ca; }

                @media (max-width: 900px) {
                    .main-layout { flex-direction: column; }
                    .sidebar { width: 100%; }
                    .founder-card { flex-direction: column; align-items: center; text-align: center; gap: 1rem; }
                    .founder-directory-page { padding: 2rem 1.5rem; }
                }
            `}</style>

            <div className="founder-directory-page">
                {embedded ? (
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#1a1a1a', margin: 0 }}>Founder Directory</h2>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h1 className="responsive-h1" style={{ marginBottom: '1rem' }}>Founder Directory</h1>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginBottom: '2.5rem' }}>
                    <span style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: '600' }}>Sort by</span>
                    <SortDropdown selected={sortOption} setSelected={setSortOption} />
                </div>

                <div className="main-layout" style={{ display: 'flex', gap: '2rem' }}>
                    {/* Sidebar Filters */}
                    <aside className="sidebar">
                        <div className="filter-section">
                            <div className="filter-item" onClick={() => handleFilterToggle('topFounders')}>
                                <div className={`checkbox-custom ${activeFilters.topFounders ? 'active' : ''}`}>
                                    {activeFilters.topFounders && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span style={{ color: activeFilters.topFounders ? '#1a1a1a' : 'inherit', fontWeight: activeFilters.topFounders ? 500 : 400 }}>💎 Top Company Founder</span> 
                                <span className="count-pill">{counts.top}</span>
                            </div>
                        </div>

                        {/* Batch Filter */}
                        <div className="filter-section">
                            <div className="filter-title" onClick={() => toggleSection('batch')}>
                                Founded in
                                <div className="filter-title-icon">
                                    {collapsedSections.includes('batch') ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
                                    ) : (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="4"><path d="M5 12h14"/></svg>
                                    )}
                                </div>
                            </div>
                            {!collapsedSections.includes('batch') && (
                                <>
                                    <div className="filter-item" onClick={() => handleFilterToggle('batches', 'All')}>
                                        <div className={`checkbox-custom ${activeFilters.batches.includes('All') ? 'active' : ''}`}>
                                            {activeFilters.batches.includes('All') && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                        </div>
                                        <span style={{ fontWeight: activeFilters.batches.includes('All') ? 600 : 400 }}>All years</span> 
                                        <span className="count-pill">{founders.length}</span>
                                    </div>
                                    {batchList.map(batch => (
                                        <div key={batch} className="filter-item" onClick={() => handleFilterToggle('batches', batch)}>
                                            <div className={`checkbox-custom ${activeFilters.batches.includes(batch) ? 'active' : ''}`}>
                                                {activeFilters.batches.includes(batch) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                            </div>
                                            <span>{batch}</span>
                                            <span className="count-pill">{counts.batches[batch] || 0}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Industry Filter */}
                        <div className="filter-section">
                            <div className="filter-title" onClick={() => toggleSection('industry')}>
                                XF Company Industry
                                <div className="filter-title-icon">
                                    {collapsedSections.includes('industry') ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
                                    ) : (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="4"><path d="M5 12h14"/></svg>
                                    )}
                                </div>
                            </div>
                            {!collapsedSections.includes('industry') && (
                                <>
                                    <div className="filter-item" onClick={() => handleFilterToggle('industries', 'All')}>
                                        <div className={`checkbox-custom ${activeFilters.industries.includes('All') ? 'active' : ''}`}>
                                            {activeFilters.industries.includes('All') && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                        </div>
                                        <span style={{ fontWeight: 600 }}>All industries</span> 
                                        <span className="count-pill">{founders.length}</span>
                                    </div>
                                    {Object.keys(industryHierarchy).map(mainInd => (
                                        <div key={mainInd}>
                                            <div
                                                className="filter-item"
                                                style={{ gap: '8px' }}
                                                onClick={() => toggleIndustryExpansion(mainInd)}
                                            >
                                                <div
                                                    className={`checkbox-custom ${activeFilters.industries.includes(mainInd) ? 'active' : ''}`}
                                                    onClick={(e) => { e.stopPropagation(); handleFilterToggle('industries', mainInd); }}
                                                >
                                                    {activeFilters.industries.includes(mainInd) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', transform: expandedIndustries.includes(mainInd) ? 'rotate(90deg)' : 'none', transition: '0.2s', width: '12px', justifyContent: 'center', paddingTop: '4px', flexShrink: 0 }}>
                                                    <svg width="8" height="10" viewBox="0 0 24 24" fill="#bbb" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                                                </div>
                                                <span style={{ color: '#444', flex: 1 }}>{mainInd}</span>
                                                <span className="count-pill">{counts.industries[mainInd] || 0}</span>
                                            </div>
                                            {expandedIndustries.includes(mainInd) && (
                                                <div style={{ marginLeft: '38px' }}>
                                                    {industryHierarchy[mainInd].map(subInd => (
                                                        <div key={subInd} className="filter-item" onClick={() => handleFilterToggle('industries', subInd)}>
                                                            <div className={`checkbox-custom ${activeFilters.industries.includes(subInd) ? 'active' : ''}`}>
                                                                {activeFilters.industries.includes(subInd) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                                            </div>
                                                            <span style={{ fontSize: '13px', color: '#666' }}>{subInd}</span>
                                                            <span className="count-pill">{counts.industries[subInd] || 0}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Role Filter */}
                        <div className="filter-section">
                            <div className="filter-title" onClick={() => toggleSection('role')}>
                                XF Company Role
                                <div className="filter-title-icon">
                                    {collapsedSections.includes('role') ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
                                    ) : (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="4"><path d="M5 12h14"/></svg>
                                    )}
                                </div>
                            </div>
                            {!collapsedSections.includes('role') && (
                                <>
                                    {roles.map(role => (
                                        <div key={role} className="filter-item" onClick={() => handleFilterToggle('roles', role)}>
                                            <div className={`checkbox-custom ${activeFilters.roles.includes(role) ? 'active' : ''}`}>
                                                {activeFilters.roles.includes(role) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                            </div>
                                            <span>{role}</span>
                                            <span className="count-pill">{counts.roles[role] || 0}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div style={{ flex: 1 }}>
                        <div className="search-box-container">
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                    type="text" 
                                    placeholder="Search founders..." 
                                    className="search-input"
                                    value={searchQuery} 
                                    onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                                        style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '16px' }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                )}
                            </div>
                            
                            {showSuggestions && searchQuery.length > 0 && (() => {
                                const suggestions = founders.filter(f =>
                                    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    f.company.toLowerCase().includes(searchQuery.toLowerCase())
                                ).slice(0, 6);
                                return suggestions.length > 0 ? (
                                    <div style={{
                                        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                                        backgroundColor: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 200, overflow: 'hidden'
                                    }}>
                                        {suggestions.map(f => (
                                            <div
                                                key={f.id}
                                                onMouseDown={() => { setSearchQuery(f.name); setShowSuggestions(false); }}
                                                style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f0f0ed' }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f6'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                                            >
                                                <img src={f.image} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                                <span style={{ fontWeight: 500 }}>{f.name}</span>
                                                <span style={{ color: '#999', fontSize: '12px', marginLeft: 'auto' }}>{f.company}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null;
                            })()}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', color: '#666', fontSize: '13px' }}>
                            <span>Showing {filteredFounders.length} of {founders.length}+ founders</span>
                        </div>

                        <div style={{ borderRadius: '16px', overflow: 'hidden' }}>
                            {filteredFounders.map((founder) => (
                                <div key={founder.id} className="founder-card">
                                    <img 
                                        src={founder.image} 
                                        alt={founder.name} 
                                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee' }} 
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(founder.name)}&background=random`;
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: '700', color: '#111' }}>{founder.name}</h3>
                                        <p style={{ margin: '0 0 1rem 0', fontSize: '15px', color: '#555' }}>{founder.role} at {founder.company}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0f0ed', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '0.05em' }}>
                                                <span style={{ backgroundColor: '#6300dd', color: '#fff', padding: '1px 5px', borderRadius: '2px', lineHeight: 1, fontWeight: 900, fontSize: '10px' }}>X</span> {founder.batch?.toUpperCase() || 'UPCOMING'}
                                            </div>
                                            <span style={{ fontSize: '15px', fontWeight: '600', color: '#111' }}>{founder.company}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredFounders.length === 0 && (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#666', background: '#fff', borderRadius: '16px', border: '1px solid #e5e5e0' }}>
                                    No founders match your search criteria.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FounderDirectory;
