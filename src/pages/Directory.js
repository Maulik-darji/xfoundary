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

const Directory = ({ embedded }) => {
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

    const indiaStates = [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
    ];

    const [activeFilters, setActiveFilters] = useState({
        topCompanies: false,
        hasAppVideo: false,
        hasDemoVideo: false,
        hasAppAnswers: false,
        hasBonusQuestions: false,
        batches: ['All'],
        industries: ['All'],
        regions: ['All']
    });

    const [expandedRegions, setExpandedRegions] = useState([]);
    const [collapsedSections, setCollapsedSections] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const toggleSection = (section) => {
        setCollapsedSections(prev => 
            prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
        );
    };

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
                            industries: (() => {
                                // Prefer the saved industries array (set by FounderDashboard)
                                if (Array.isArray(app.industries) && app.industries.length > 0) return app.industries;
                                // Fallback: build from category + subCategory
                                const parts = [app.category, app.subCategory].filter(Boolean);
                                return parts.length > 0 ? parts : ['Other'];
                            })(),
                            logo: app.companyLogo || `https://logo.clearbit.com/${app.companyUrl?.replace(/^https?:\/\//, '')}` || 'https://via.placeholder.com/110?text=X',
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
            hasAppVideo: startups.filter(s => s.hasAppVideo).length,
            hasDemoVideo: startups.filter(s => s.hasDemoVideo).length,
            hasAppAnswers: startups.filter(s => s.hasAppAnswers).length,
            hasBonusQuestions: startups.filter(s => s.hasBonusQuestions).length,
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
            if (s.location) {
                const loc = s.location.toLowerCase();
                indiaStates.forEach(state => {
                    if (loc.includes(state.toLowerCase())) {
                        c.regions[state] = (c.regions[state] || 0) + 1;
                    }
                });
            }
        });
        return c;
    }, [startups]);

    // Rule:
    //  - Parent + specific children selected → only match those specific children
    //  - Parent alone selected → match all children of that parent
    //  - Sub-category alone → match it directly
    const resolveIndustryFilter = (selected) => {
        const expanded = new Set();
        const selectedSet = new Set(selected);
        selected.forEach(sel => {
            if (industryHierarchy[sel]) {
                const children = industryHierarchy[sel];
                const selectedChildren = children.filter(c => selectedSet.has(c));
                if (selectedChildren.length > 0) {
                    selectedChildren.forEach(c => expanded.add(c));
                } else {
                    children.forEach(c => expanded.add(c));
                }
            } else {
                expanded.add(sel);
            }
        });
        return expanded;
    };

    useEffect(() => {
        let result = startups;
        if (searchQuery) {
            result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.desc.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        if (activeFilters.topCompanies) result = result.filter(s => s.top);
        if (activeFilters.hasAppVideo) result = result.filter(s => s.hasAppVideo);
        if (activeFilters.hasDemoVideo) result = result.filter(s => s.hasDemoVideo);
        if (activeFilters.hasAppAnswers) result = result.filter(s => s.hasAppAnswers);
        if (activeFilters.hasBonusQuestions) result = result.filter(s => s.hasBonusQuestions);
        if (!activeFilters.industries.includes('All')) {
            const resolved = resolveIndustryFilter(activeFilters.industries);
            result = result.filter(s => s.industries.some(i => resolved.has(i)));
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
        <div style={{ minHeight: embedded ? 'auto' : '100vh', backgroundColor: embedded ? 'transparent' : '#f5f5ee', fontFamily: '"Inter", sans-serif', paddingBottom: embedded ? '2rem' : '4rem' }}>
            <style>{`
                .directory-page { max-width: 1300px; margin: 0 auto; padding: ${embedded ? '2rem 0' : '5rem 2rem 2rem'}; }

                .sidebar { width: 300px; background: #fff; border: 1px solid #e5e5e0; border-radius: 16px; padding: 1.5rem; height: fit-content; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
                .filter-section { margin-bottom: 2rem; border-bottom: 1px solid #f0f0ed; padding-bottom: 1.5rem; }
                .filter-title { font-size: 14px; font-weight: 700; margin-bottom: 1.25rem; color: #1a1a1a; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
                .filter-item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; font-size: 14px; color: #444; cursor: pointer; user-select: none; }
                .count-pill { margin-left: auto; font-size: 11px; color: #999; background: #f4f4f2; padding: 2px 8px; border-radius: 6px; flex-shrink: 0; }
                .search-box-container { background: #fff; border: 1px solid #e5e5e0; border-radius: 16px; padding: 1.5rem; margin-bottom: 2rem; }
                .search-input { width: 100%; padding: 16px 24px; border: 1px solid #e5e5e0; border-radius: 12px; font-size: 16px; outline: none; margin-bottom: 1.25rem; }
                .startup-card { background: #fff; border: 1px solid #e5e5e0; border-radius: 16px; padding: 2rem; margin-bottom: -1px; display: flex; gap: 2rem; transition: all 0.3s; text-decoration: none; color: inherit; }
                .startup-card:hover { background: #fafafa; border-color: #d1d1ca; }
                .checkbox-custom { width: 22px; height: 22px; border: 2px solid #d1d1ca; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
                .checkbox-custom.active { background: #2563eb; border-color: #2563eb; }
                .filter-title-icon { background: #f0f0ed; border-radius: 4px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
            `}</style>


            <div className="directory-page">
                {!embedded && (
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <h1 style={{ 
                            fontFamily: '"Georgia", serif', 
                            fontStyle: 'italic', 
                            fontSize: '4.5rem', 
                            fontWeight: 400, 
                            color: '#1a1a1a', 
                            marginBottom: '1rem',
                            letterSpacing: '-0.02em'
                        }}>Startup Directory</h1>
                    </div>
                )}

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
                                <span style={{ color: activeFilters.topCompanies ? '#1a1a1a' : 'inherit', fontWeight: activeFilters.topCompanies ? 500 : 400 }}>💎 Top Companies</span> 
                                <span className="count-pill">{counts.top}</span>
                            </div>
                        </div>

                        <div className="filter-section">
                            <div className="filter-title" onClick={() => toggleSection('industry')}>
                                Industry
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
                                            {activeFilters.industries.includes('All') && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                        </div>
                                        <span style={{ fontWeight: activeFilters.industries.includes('All') ? 500 : 400 }}>All industries</span> 
                                        <span className="count-pill">{startups.length}</span>
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

                        <div className="filter-section">
                            <div className="filter-title" onClick={() => toggleSection('hq-region')}>
                                HQ Region
                                <div className="filter-title-icon">
                                    {collapsedSections.includes('hq-region') ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
                                    ) : (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="4"><path d="M5 12h14"/></svg>
                                    )}
                                </div>
                            </div>
                            {!collapsedSections.includes('hq-region') && (
                                <>
                                    <div className="filter-item" onClick={() => handleFilterToggle('regions', 'All')}>
                                        <div className={`checkbox-custom ${activeFilters.regions.includes('All') ? 'active' : ''}`}>
                                            {activeFilters.regions.includes('All') && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                        </div>
                                        <span style={{ fontWeight: activeFilters.regions.includes('All') ? 500 : 400 }}>Anywhere</span> <span className="count-pill">{counts.regions['Anywhere']}</span>
                                    </div>
                                    <div>
                                        <div
                                            className="filter-item"
                                            style={{ gap: '8px' }}
                                            onClick={() => setExpandedRegions(prev => prev.includes('India') ? prev.filter(r => r !== 'India') : [...prev, 'India'])}
                                        >
                                            <div
                                                className={`checkbox-custom ${activeFilters.regions.includes('India') ? 'active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); handleFilterToggle('regions', 'India'); }}
                                            >
                                                {activeFilters.regions.includes('India') && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', transform: expandedRegions.includes('India') ? 'rotate(90deg)' : 'none', transition: '0.2s', width: '12px', justifyContent: 'center', paddingTop: '4px', flexShrink: 0 }}>
                                                <svg width="8" height="10" viewBox="0 0 24 24" fill="#bbb" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                                            </div>
                                            <span style={{ flex: 1 }}>India</span>
                                            <span className="count-pill">{counts.regions['India']}</span>
                                        </div>
                                        {expandedRegions.includes('India') && (
                                            <div style={{ marginLeft: '40px' }}>
                                                {indiaStates.map(state => (
                                                    <div key={state} className="filter-item" onClick={() => handleFilterToggle('regions', state)}>
                                                        <div className={`checkbox-custom ${activeFilters.regions.includes(state) ? 'active' : ''}`}>
                                                            {activeFilters.regions.includes(state) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                                        </div>
                                                        <span style={{ fontSize: '13px', color: '#666' }}>{state}</span>
                                                        <span className="count-pill">{counts.regions[state] || 0}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Company Size */}
                        <div className="filter-section">
                            <div className="filter-title" onClick={() => toggleSection('company-size')}>
                                Company Size
                                <div className="filter-title-icon">
                                    {collapsedSections.includes('company-size') ? (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
                                    ) : (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="4"><path d="M5 12h14"/></svg>
                                    )}
                                </div>
                            </div>
                            {!collapsedSections.includes('company-size') && (
                                <div style={{ padding: '0 4px' }}>
                                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px', fontWeight: 500 }}>
                                        {companySize[0]} – {companySize[1] >= 1000 ? '1,000+' : companySize[1]}
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={1000}
                                        value={companySize[1]}
                                        onChange={e => setCompanySize([companySize[0], parseInt(e.target.value)])}
                                        style={{ width: '100%', accentColor: '#2563eb' }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Extra flags */}
                        <div className="filter-section" style={{ borderBottom: 'none', marginBottom: 0 }}>
                            {[
                                { key: 'hasAppVideo',       label: 'Public Application Video', count: counts.hasAppVideo },
                                { key: 'hasDemoVideo',      label: 'Public Demo Day Video',     count: counts.hasDemoVideo },
                                { key: 'hasAppAnswers',     label: 'Has Application Answers',   count: counts.hasAppAnswers },
                                { key: 'hasBonusQuestions', label: 'Has Bonus Questions',       count: counts.hasBonusQuestions },
                            ].map(({ key, label, count }) => (
                                <div key={key} className="filter-item" onClick={() => handleFilterToggle(key)}>
                                    <div className={`checkbox-custom ${activeFilters[key] ? 'active' : ''}`}>
                                        {activeFilters[key] && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </div>
                                    <span style={{ fontWeight: activeFilters[key] ? 500 : 400 }}>{label}</span>
                                    <span className="count-pill">{count}</span>
                                </div>
                            ))}
                        </div>
                    </aside>

                    <div style={{ flex: 1 }}>
                        <div className="search-box-container" style={{ position: 'relative' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    placeholder="Search startups..."
                                    className="search-input"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { setSearchQuery(''); setShowSuggestions(false); } }}
                                    style={{ paddingRight: searchQuery ? '36px' : undefined }}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                                        style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '16px', lineHeight: 1, padding: '2px', display: 'flex', alignItems: 'center' }}
                                        title="Clear search"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                )}
                            </div>
                            {/* Suggestions dropdown */}
                            {showSuggestions && searchQuery.length > 0 && (() => {
                                const suggestions = startups.filter(s =>
                                    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    s.desc?.toLowerCase().includes(searchQuery.toLowerCase())
                                ).slice(0, 6);
                                return suggestions.length > 0 ? (
                                    <div style={{
                                        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                                        backgroundColor: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 200, overflow: 'hidden'
                                    }}>
                                        {suggestions.map(s => (
                                            <div
                                                key={s.id}
                                                onMouseDown={() => { setSearchQuery(s.name); setShowSuggestions(false); }}
                                                style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f0f0ed' }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f6'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                                            >
                                                <img src={s.logo} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'contain', border: '1px solid #f0f0ed' }} onError={e => e.target.style.display='none'} />
                                                <span style={{ fontWeight: 500 }}>{s.name}</span>
                                                <span style={{ color: '#999', fontSize: '12px', marginLeft: 'auto' }}>{s.location}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{
                                        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                                        backgroundColor: '#fff', border: '1px solid #e5e5e0', borderRadius: '12px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 200,
                                        padding: '12px 16px', fontSize: '13px', color: '#999'
                                    }}>
                                        No startups found for "{searchQuery}"
                                    </div>
                                );
                            })()}
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
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0f0ed', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '0.05em' }}>
                                                <span style={{ backgroundColor: '#6300dd', color: '#fff', padding: '1px 5px', borderRadius: '2px', lineHeight: 1, fontWeight: 900, fontSize: '10px' }}>X</span> {startup.batch?.toUpperCase() || 'UPCOMING'}
                                            </div>
                                            {(() => {
                                                // Build display tags: infer parent if only sub-category stored
                                                const tags = new Set();
                                                startup.industries.forEach(ind => {
                                                    if (industryHierarchy[ind]) {
                                                        // It's a parent — show it
                                                        tags.add(ind);
                                                    } else {
                                                        // It's a sub-category — also show parent
                                                        const parent = Object.keys(industryHierarchy).find(k => industryHierarchy[k].includes(ind));
                                                        if (parent) tags.add(parent);
                                                        tags.add(ind);
                                                    }
                                                });
                                                return [...tags].map(tag => (
                                                    <span key={tag} style={{ backgroundColor: '#e8e8e1', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: '#333', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                        {tag}
                                                    </span>
                                                ));
                                            })()}
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
