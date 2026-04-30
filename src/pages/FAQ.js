import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const FAQ = () => {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('general');

  useEffect(() => {
    document.title = "Frequently Asked Questions";
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const sections = [
    { id: 'general', label: 'General' },
    { id: 'founders', label: 'Founders & Submissions' },
    { id: 'curation', label: 'Curation & Exposure' },
    { id: 'investors', label: 'Investors' },
    { id: 'about', label: 'About XF' }
  ];

  const sidebarLinkStyle = (id) => ({
    textDecoration: 'none',
    color: activeSection === id ? '#ff6026' : '#111',
    fontWeight: activeSection === id ? 'bold' : 'normal',
    fontSize: '14px',
    display: 'block',
    marginBottom: '1rem',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  });

  const sectionHeaderStyle = {
    fontFamily: 'Newsreader, serif',
    fontSize: '1.75rem',
    fontWeight: '500',
    fontStyle: 'italic',
    margin: '0 0 2rem 0',
    color: '#111'
  };

  const questionStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '0.75rem',
    fontFamily: 'Inter, sans-serif',
    color: '#111'
  };

  const answerStyle = {
    fontSize: '17px',
    lineHeight: '1.6',
    color: '#333',
    marginBottom: '2.5rem',
    fontFamily: 'Inter, sans-serif'
  };

  return (
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#111', paddingTop: '10rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '5rem', padding: '0 2rem 10rem 2rem' }}>
        
        {/* Left Sidebar */}
        <aside style={{ width: '200px', position: 'sticky', top: '150px', height: 'fit-content' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sections.map(s => (
                <li key={s.id}>
                    <a 
                      href={`#${s.id}`} 
                      onClick={() => setActiveSection(s.id)}
                      style={sidebarLinkStyle(s.id)}
                    >{s.label}</a>
                </li>
            ))}
          </ul>
        </aside>

        {/* Main Content */}
        <div style={{ flex: 1, maxWidth: '700px' }}>
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '4.5rem', fontWeight: '500', fontStyle: 'italic', marginBottom: '4rem', textAlign: 'left', letterSpacing: '-0.02em' }}>Frequently Asked Questions</h1>
            
            {/* General Section */}
            <section id="general">
                <h2 style={sectionHeaderStyle}>General</h2>
                
                <div className="faq-item">
                    <p style={questionStyle}>What is X Foundary (XF)?</p>
                    <p style={answerStyle}>XF is a curated platform that discovers and showcases high-potential startups that are often overlooked. We help these startups get visibility and connect them with investors.</p>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Are you an accelerator like Y Combinator?</p>
                    <div style={answerStyle}>
                        <p>No. We do not run batches, programs, or funding rounds. We focus on:</p>
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                            <li>Discovering great startups</li>
                            <li>Curating them</li>
                            <li>Connecting them with investors</li>
                        </ul>
                    </div>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Do you invest in startups?</p>
                    <div style={answerStyle}>
                        <p>No. XF does not invest directly. We help startups get discovered by:</p>
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                            <li>Angel investors</li>
                            <li>Venture capitalists</li>
                            <li>Early backers</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Founders Section */}
            <section id="founders" style={{ marginTop: '3rem' }}>
                <h2 style={sectionHeaderStyle}>Founders & Submissions</h2>
                
                <div className="faq-item">
                    <p style={questionStyle}>Who can submit their startup?</p>
                    <div style={answerStyle}>
                        <p>Anyone building something real. We especially focus on:</p>
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                            <li>Indian startups</li>
                            <li>Early-stage founders</li>
                            <li>Underrated or overlooked ideas</li>
                        </ul>
                    </div>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>How do you select startups?</p>
                    <div style={answerStyle}>
                        <p>We review each submission based on Problem clarity, Execution ability, Market potential, and Originality. We prioritize quality over quantity.</p>
                    </div>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Is listing on XF guaranteed?</p>
                    <p style={answerStyle}>No. We curate startups carefully, so not every submission gets listed.</p>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Is it free to get listed?</p>
                    <p style={answerStyle}>Yes, currently it is free to apply and get listed. We focus on getting the best founders discovered without any initial cost.</p>
                </div>
            </section>

            {/* Curation Section */}
            <section id="curation" style={{ marginTop: '3rem' }}>
                <h2 style={sectionHeaderStyle}>Curation & Exposure</h2>
                
                <div className="faq-item">
                    <p style={questionStyle}>How do startups get exposure?</p>
                    <div style={answerStyle}>
                        <p>Listed startups are featured on the platform, made visible to investors browsing XF, and highlighted based on their quality and traction.</p>
                    </div>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Do you guarantee funding?</p>
                    <div style={answerStyle}>
                        <p>No. We do not guarantee funding. We increase your chances by giving visibility and connecting you with the right people.</p>
                    </div>
                </div>
            </section>

            {/* Investors Section */}
            <section id="investors" style={{ marginTop: '3rem' }}>
                <h2 style={sectionHeaderStyle}>Investors</h2>
                
                <div className="faq-item">
                    <p style={questionStyle}>Who are the investors on XF?</p>
                    <p style={answerStyle}>XF aims to attract Angel investors, Venture capital firms, and early-stage backers who are looking for the next big thing before it hits the mainstream.</p>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Why should investors use XF?</p>
                    <div style={answerStyle}>
                        <p>Because XF helps them discover startups early, access hidden opportunities, and save time on filtering through low-quality deals.</p>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" style={{ marginTop: '3rem' }}>
                <h2 style={sectionHeaderStyle}>About XF</h2>
                
                <div className="faq-item">
                    <p style={questionStyle}>Who built XF?</p>
                    <p style={answerStyle}>XF is built by a student founder who understands how hard it is for early startups to get noticed.</p>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Why should I trust XF?</p>
                    <div style={answerStyle}>
                        <p>Because we focus on honest curation, no hype, only quality, and creating long-term value for both founders and investors.</p>
                    </div>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
