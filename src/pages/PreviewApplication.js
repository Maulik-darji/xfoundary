import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const PreviewApplication = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState({});
  const [profileData, setProfileData] = useState({});
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const navigate = useNavigate();

  const checkProfileCompleteness = (profile) => {
    if (!profile) return false;
    const required = [
        profile.name,
        profile.email,
        profile.phone,
        profile.city,
        profile.title,
        profile.equity,
        profile.technical,
        profile.linkedin
    ];
    const hasRequired = required.every(field => field && field.toString().trim().length > 0);
    const hasEdu = profile.education && profile.education.length > 0;
    const hasWork = profile.workHistory && profile.workHistory.length > 0;
    return hasRequired && hasEdu && hasWork;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && !loading) {
        navigate('/login');
      }
      setUser(currentUser);
      
      if (currentUser) {
        try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setAppData(data.application || {});
                setProfileData(data.profile || {});
                setIsProfileComplete(checkProfileCompleteness(data.profile));
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate, loading]);

  const sections = [
    {
      title: "Founders",
      questions: [
        { 
            q: profileData.name || user?.displayName || user?.email?.split('@')[0] || "Founder", 
            type: "profile", 
            status: isProfileComplete ? "Profile complete" : "Profile incomplete" 
        },
        { q: "Who writes code, or does other technical work on your product? Was any of it done by a non-founder? Please explain.", a: appData.technicalWork },
        { q: "Are you looking for a cofounder?", a: appData.lookingForCofounder }
      ]
    },
    {
      title: "Founder Video",
      questions: [
        { q: "Founder Video Link", a: appData.founderVideoUrl, type: "status", status: appData.founderVideoUrl ? "Video uploaded" : "No video uploaded" }
      ]
    },
    {
      title: "Company",
      questions: [
        { q: "Company name", a: appData.companyName },
        { q: "Describe what your company does in 50 characters or less.", a: appData.companyDescription },
        { q: "Company URL, if any", a: appData.companyUrl },
        { q: "Demo Video", a: appData.demoUrl, type: "status", status: appData.demoUrl ? "Video uploaded" : "No video uploaded" },
        { q: "Please provide a link to the product, if any.", a: appData.productUrl },
        { q: "What is your company going to make? Please describe your product and what it does or will do.", a: appData.whatMaking },
        { q: "Where do you live now, and where would the company be based after YC?", a: appData.liveNowLocation },
        { q: "Explain your decision regarding location.", a: appData.locationDecision }
      ]
    },
    {
      title: "Progress",
      questions: [
        { q: "How far along are you?", a: appData.howFar },
        { q: "How long have each of you been working on this? How much of that has been full-time? Please explain.", a: appData.howLongWork },
        { q: "What tech stack are you using, or planning to use, to build this product? Include AI models and AI coding tools you use.", a: appData.techStack },
        { q: "Optional: attach a coding agent session you're particularly proud of.", a: "Check attached file" },
        { q: "Are people using your product?", a: appData.usersRadio },
        { q: "Do you have revenue?", a: appData.revenueRadio },
        { q: "If you are applying with the same idea as a previous batch, did anything change? If you applied with a different idea, why did you pivot and what did you learn from the last idea?", a: appData.pivotExplanation },
        { q: "If you have already participated or committed to participate in an incubator, \"accelerator\" or \"pre-accelerator\" program, please tell us about it.", a: appData.incubatorExplanation }
      ]
    },
    {
      title: "Idea",
      questions: [
        { q: "Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?", a: appData.whyIdea },
        { q: "Who are your competitors? What do you understand about your business that they don't?", a: appData.competitors },
        { q: "How do or will you make money? How much could you make?", a: appData.monetization },
        { q: "Which category best applies to your company?", a: appData.category },
        { q: "If you had any other ideas you considered applying with, please list them.", a: appData.otherIdeas }
      ]
    },
    {
        title: "Equity",
        questions: [
            { q: "Have you formed ANY legal entity yet?", a: appData.legalEntityRadio },
            { q: "Have you taken any investment yet?", a: appData.investmentRadio },
            { q: "Are you currently fundraising?", a: appData.fundraisingRadio }
        ]
    }
  ];

  if (loading) return null;

  return (
    <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
           <Link to="/home" style={{ backgroundColor: '#6300dd', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }}>X</Link>
           <div style={{ display: 'flex', gap: '1.5rem', fontSize: '13px' }}>
             <span style={{ fontWeight: 'bold' }}>{profileData.name || user?.displayName || user?.email?.split('@')[0]}</span>
             <Link to="/settings" style={{ color: '#666' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
             </Link>
             <span style={{ color: '#ccc' }}>|</span>
             <Link to="/" onClick={() => auth.signOut()} style={{ textDecoration: 'none', color: '#000', fontWeight: 'bold' }}>Log out</Link>
           </div>
        </div>

        <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', textDecoration: 'none', fontSize: '13px', marginBottom: '1rem' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Back
        </Link>

        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '3rem', fontWeight: 500, color: '#111', margin: '0 0 0.5rem 0' }}>{appData.companyName || "Untitled"}</h1>
        <p style={{ color: '#888', margin: '0 0 3rem 0', fontSize: '14px' }}>Founded in {appData.batch || "Summer 2026"}</p>

        {sections.map((section, idx) => (
          <div key={idx} style={{ marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>{section.title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {section.questions.map((item, qIdx) => (
                <div key={qIdx}>
                  {item.type === "profile" ? (
                    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: 'bold' }}>{item.q}</span>
                        <span style={{ 
                            backgroundColor: isProfileComplete ? '#00bf8e' : '#ff4d4f', 
                            color: 'white', 
                            fontSize: '11px', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px' 
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              {isProfileComplete ? (
                                  <polyline points="20 6 9 17 4 12"></polyline>
                              ) : (
                                  <><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></>
                              )}
                          </svg>
                          {item.status}
                        </span>
                      </div>
                      <Link to="/founder-profile" style={{ color: '#000' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </Link>
                    </div>
                  ) : item.type === "status" ? (
                    <div>
                      <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '0.5rem', color: '#111' }}>{item.q}</p>
                      {item.a ? (
                        <p style={{ color: '#6300dd', fontSize: '14px', margin: 0, textDecoration: 'underline' }}>{item.a}</p>
                      ) : (
                        <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>{item.status}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '0.5rem', color: '#111', lineHeight: '1.4' }}>{item.q}</p>
                      {item.a ? (
                        <p style={{ margin: 0, fontSize: '14px', color: '#444', whiteSpace: 'pre-wrap' }}>{item.a}</p>
                      ) : (
                        <p style={{ margin: 0, fontSize: '14px', color: '#ff4d4f' }}>Unanswered</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', padding: '2rem 0', fontSize: '12px', color: '#666', borderTop: '1px solid #ddd', marginTop: '4rem' }}>
          {['About', 'People', 'Blog', 'Resources', 'Legal', 'Notice at Collection', 'Contact'].map(link => (
            <a key={link} href="#" style={{ color: '#666' }}>{link}</a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PreviewApplication;
