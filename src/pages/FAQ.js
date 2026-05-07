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
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', color: '#111' }}>
      <div className="page-container">
        
        {/* Left Sidebar */}
        <aside className="mobile-hide" style={{ width: '200px', position: 'sticky', top: '150px', height: 'fit-content' }}>
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
        <div className="main-content">
            <h1 className="responsive-h1">Frequently Asked Questions</h1>
            
            {/* General Section */}
            <section id="general">
                <h2 className="responsive-h2">General</h2>
                
                <div className="faq-item">
                    <p style={questionStyle}>What is X?</p>
                    <p className="responsive-p">XF is a curated platform that discovers and showcases high-potential startups that are often overlooked. We help these startups get visibility and connect them with investors.</p>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Are you an accelerator like X Foundary?</p>
                    <div className="responsive-p">
                        <p>No. We do not run batches, cohorts, or funding rounds. We focus on:</p>
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                            <li>Discovering great startups</li>
                            <li>Curating them</li>
                            <li>Connecting them with investors</li>
                        </ul>
                    </div>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Do you invest in startups?</p>
                    <div className="responsive-p">
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
                <h2 className="responsive-h2">Founders & Submissions</h2>
                
                <div className="faq-item">
                    <p style={questionStyle}>Who can submit their startup?</p>
                    <div className="responsive-p">
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
                    <div className="responsive-p">
                        <p>We review each submission based on Problem clarity, Execution ability, Market potential, and Originality. We prioritize quality over quantity.</p>
                    </div>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Is listing on XF guaranteed?</p>
                    <p className="responsive-p">No. We curate startups carefully, so not every submission gets listed.</p>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Is it free to get listed?</p>
                    <p className="responsive-p">Yes, currently it is free to apply and get listed. We focus on getting the best founders discovered without any initial cost.</p>
                </div>
            </section>

            {/* Curation Section */}
            <section id="curation" style={{ marginTop: '3rem' }}>
                <h2 className="responsive-h2">Curation & Exposure</h2>
                
                <div className="faq-item">
                    <p style={questionStyle}>How do startups get exposure?</p>
                    <div className="responsive-p">
                        <p>Listed startups are featured on the platform, made visible to investors browsing XF, and highlighted based on their quality and traction.</p>
                    </div>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Do you guarantee funding?</p>
                    <div className="responsive-p">
                        <p>No. We do not guarantee funding. We increase your chances by giving visibility and connecting you with the right people.</p>
                    </div>
                </div>
            </section>

            {/* Investors Section */}
            <section id="investors" style={{ marginTop: '3rem' }}>
                <h2 className="responsive-h2">Investors</h2>
                
                <div className="faq-item">
                    <p style={questionStyle}>Who are the investors on XF?</p>
                    <p className="responsive-p">XF aims to attract Angel investors, Venture capital firms, and early-stage backers who are looking for the next big thing before it hits the mainstream.</p>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Why should investors use XF?</p>
                    <div className="responsive-p">
                        <p>Because XF helps them discover startups early, access hidden opportunities, and save time on filtering through low-quality deals.</p>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" style={{ marginTop: '3rem' }}>
                <h2 className="responsive-h2">About XF</h2>
                
                <div className="faq-item">
                    <p style={questionStyle}>Who built XF?</p>
                    <p className="responsive-p">XF is built by a student founder who understands how hard it is for early startups to get noticed.</p>
                </div>

                <div className="faq-item">
                    <p style={questionStyle}>Why should I trust XF?</p>
                    <div className="responsive-p">
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
