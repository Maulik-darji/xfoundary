import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CoFounderMatching = () => {
    const navigate = useNavigate();

    return (
        <div style={{ backgroundColor: '#fff', fontFamily: '"Inter", sans-serif', color: '#111' }}>
            {/* Hero Section */}
            <section style={{ backgroundColor: '#f6f6ef', padding: '6rem 1.5rem' }}>
                <div className="cofounder-hero" style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '4rem' }}>
                    <div style={{ flex: 1.2 }}>
                        <h1 className="responsive-h1" style={{ textAlign: 'left', lineHeight: '1.2' }}>
                            <span style={{ color: '#6300dd', fontStyle: 'normal' }}>X Foundary</span> Co-Founder Matching
                        </h1>
                        <p className="responsive-p" style={{ fontSize: '1.25rem', color: '#333', marginBottom: '2.5rem', fontWeight: '500' }}>
                            Where savvy founders go to meet potential co-founders
                        </p>
                        <button 
                            onClick={() => navigate('/co-founder-matching-soon')}
                            style={{ backgroundColor: '#6300dd', color: '#fff', padding: '16px 40px', borderRadius: '100px', fontSize: '1.1rem', fontWeight: '700', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                            Go to co-founder matching
                        </button>
                    </div>
                    <div className="mobile-hide" style={{ flex: 0.8, position: 'relative', height: '350px' }}>
                        {[
                            { top: '0', left: '20%', src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
                            { top: '10%', left: '60%', src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' },
                            { top: '50%', left: '10%', src: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop' },
                            { top: '60%', left: '50%', src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop' }
                        ].map((img, i) => (
                            <img key={i} src={img.src} alt="" style={{ position: 'absolute', top: img.top, left: img.left, width: '140px', height: '140px', borderRadius: '50%', border: '4px solid #f6f6ef', objectFit: 'cover' }} />
                        ))}
                    </div>
                </div>
            </section>

            {/* USP Section */}
            <section style={{ padding: '6rem 1.5rem', borderBottom: '1px solid #eee' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '1.5rem', lineHeight: '1.3' }}>
                        We know even the best founders don't always have people in their network who are ready to start a company
                    </h2>
                    <p style={{ fontSize: '18px', color: '#666', marginBottom: '4rem' }}>That's why we built co-founder matching.</p>
                    
                    <div className="usp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3rem' }}>
                        {[
                            { title: 'Good for all stages', desc: "Whether you're getting to know people for the future, or ready to go now." },
                            { title: 'Come with or without an idea', desc: "Don't have the right idea yet? This is a great place to find it." },
                            { title: 'Explore on your own terms', desc: "No commitment, no equity, no strings attached." }
                        ].map(item => (
                            <div key={item.title} style={{ borderLeft: '4px solid #6300dd', paddingLeft: '1.5rem' }}>
                                <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '10px' }}>{item.title}</h3>
                                <p style={{ fontSize: '15px', color: '#444', lineHeight: '1.6' }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section style={{ backgroundColor: '#f6f6ef', padding: '6rem 1.5rem' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '3rem' }}>How does it work?</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {[
                            { step: 1, text: "Create a profile and tell us about yourself" },
                            { step: 2, text: "Our matching engine shows you profiles that fit your preferences" },
                            { step: 3, text: "If a profile piques your interest, invite them to connect" },
                            { step: 4, text: "If they accept your invite, that's a match! Find a time to start the conversation." }
                        ].map(s => (
                            <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#6300dd', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>{s.step}</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '500', color: '#111', paddingTop: '6px' }}>{s.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
                <button 
                    onClick={() => navigate('/co-founder-matching-soon')}
                    style={{ backgroundColor: '#6300dd', color: '#fff', padding: '18px 60px', borderRadius: '100px', fontSize: '1.1rem', fontWeight: '700', border: 'none', cursor: 'pointer' }}
                >
                    Sign up now
                </button>
            </section>

            <style>{`
                @media (max-width: 900px) {
                    .cofounder-hero { flex-direction: column; text-align: center; gap: 2rem !important; }
                    .cofounder-hero h1 { text-align: center !important; }
                    .usp-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
                }
            `}</style>

            {/* Custom Black Mega Footer */}
            <footer style={{ backgroundColor: '#000', color: '#fff', padding: '5rem 2rem' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '80px 1.2fr 1.2fr 1.5fr 1.2fr', gap: '2rem' }}>
                    {/* Brand Logo */}
                    <div>
                        <div style={{ backgroundColor: '#6300dd', width: '50px', height: '50px', borderRadius: '4px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900' }}>X</div>
                    </div>

                    {/* Column 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#fff' }}>Programs</h4>
                        {['YC Program', 'Startup School', 'Work at a Startup', 'Co-Founder Matching'].map(item => (
                            <a key={item} href="#" style={{ fontSize: '13px', color: '#aaa', textDecoration: 'none' }}>{item}</a>
                        ))}
                    </div>

                    {/* Column 2 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#fff' }}>Resources</h4>
                        {['Startup Directory', 'Startup Library', 'Investors', 'Demo Day', 'Safe', 'Hacker News'].map(item => (
                            <a key={item} href="#" style={{ fontSize: '13px', color: '#aaa', textDecoration: 'none' }}>{item}</a>
                        ))}
                    </div>

                    {/* Column 3 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#fff' }}>Company</h4>
                        {['YC Blog', 'Contact', 'Press', 'People', 'Careers', 'Privacy Policy'].map(item => (
                            <a key={item} href="#" style={{ fontSize: '13px', color: '#aaa', textDecoration: 'none' }}>{item}</a>
                        ))}
                    </div>
                </div>
                <div style={{ maxWidth: '1100px', margin: '3rem auto 0 auto', paddingTop: '2rem', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '12px' }}>
                    <span>© 2026 X Foundary</span>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <span>Twitter</span>
                        <span>LinkedIn</span>
                        <span>Facebook</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default CoFounderMatching;
