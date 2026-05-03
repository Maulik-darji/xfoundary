import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const AuthorAvatar = ({ authorId, authorName, existingImg, size = '32px' }) => {
    const [img, setImg] = useState(existingImg || null);
    const [tried, setTried] = useState(false);

    useEffect(() => {
        // If we already have an image or we've tried and failed, don't fetch again
        if (img || !authorId || tried) return;

        const fetchImg = async () => {
            try {
                // Try to find the user in any of the potential collections
                const collections = ['members', 'admins', 'users'];
                for (const col of collections) {
                    const docSnap = await getDoc(doc(db, col, authorId));
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const profileImg = data.profileImage || 
                                         data.photoURL || 
                                         (data.profile && (data.profile.profileImage || data.profile.photoURL));
                        if (profileImg) {
                            setImg(profileImg);
                            return; // Found it!
                        }
                    }
                }
            } catch (e) {
                console.error("Error fetching author image for " + authorId, e);
            } finally {
                setTried(true);
            }
        };
        fetchImg();
    }, [authorId, img, tried]);

    // Update img if existingImg prop changes (e.g. when parent state updates)
    useEffect(() => {
        if (existingImg) setImg(existingImg);
    }, [existingImg]);

    if (img) return <img src={img} alt={authorName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee' }} />;
    return (
        <div style={{ 
            width: size, 
            height: size, 
            borderRadius: '50%', 
            backgroundColor: '#6300dd', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: 'bold', 
            fontSize: size === '32px' ? '14px' : '24px' 
        }}>
            {authorName?.charAt(0)}
        </div>
    );
};

const Blog = ({ embedded }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('All Posts');

  const [selectedBlog, setSelectedBlog] = useState(null);
  const [authorImageOverride, setAuthorImageOverride] = useState(null);
  const [authorTitleOverride, setAuthorTitleOverride] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const blogId = searchParams.get('post');

  useEffect(() => {
    if (blogId && blogs.length > 0) {
        const found = blogs.find(b => b.id === blogId);
        if (found) setSelectedBlog(found);
    } else if (!blogId && selectedBlog) {
        setSelectedBlog(null);
    }
  }, [blogId, blogs]);

  const handleOpenBlog = (blog) => {
    if (blog) setSearchParams({ post: blog.id });
    else setSearchParams({});
    setSelectedBlog(blog);
  };

  // Fetch blogs only once on mount
  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
      const fetchLatestAuthorImage = async () => {
          if (selectedBlog && !selectedBlog.authorImage && !selectedBlog.authorPhoto && selectedBlog.userId) {
              try {
                  // Try admins first
                  let authorDoc = await getDoc(doc(db, 'admins', selectedBlog.userId));
                  if (!authorDoc.exists()) {
                      // Try members
                      authorDoc = await getDoc(doc(db, 'members', selectedBlog.userId));
                  }
                  if (!authorDoc.exists()) {
                      // Try users
                      authorDoc = await getDoc(doc(db, 'users', selectedBlog.userId));
                  }

                  if (authorDoc.exists()) {
                      const data = authorDoc.data();
                      const img = data.profileImage || data.photoURL || (data.profile && data.profile.profileImage);
                      if (img) setAuthorImageOverride(img);
                      
                      const title = data.role || (data.profile && (data.profile.role || data.profile.title)) || data.title;
                      if (title) setAuthorTitleOverride(title);
                  }
              } catch (e) {
                  console.error("Error fetching author image:", e);
              }
          } else {
              setAuthorImageOverride(null);
              setAuthorTitleOverride(null);
          }
      };
      fetchLatestAuthorImage();
  }, [selectedBlog]);

  // Handle scroll to top and title ONLY when a blog is selected/deselected
  useEffect(() => {
    if (selectedBlog) {
        document.title = selectedBlog.title;
        window.scrollTo(0, 0);
    } else {
        document.title = "XF Blog";
    }
  }, [selectedBlog?.id]); // Use ID as dependency to avoid reference loops

  const fetchBlogs = async () => {
    try {
        const q = query(collection(db, 'blog'), where('status', '==', 'approved'));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        // Sort client-side — handles both 'date' and 'createdAt' field names
        list.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0);
            const dateB = new Date(b.date || b.createdAt || 0);
            return dateB - dateA;
        });
        setBlogs(list);
    } catch (error) {
        console.error("Error fetching blogs:", error);
    } finally {
        setLoading(false);
    }
  };

  const categories = [
    'Admissions', 'Advice', 'Biotech', 'Blockchain', 'Essay', 
    'Female Founders', 'Founder Stories', 'Interviews', 
    'Startup School', 'Work at a Startup', 'XF Events'
  ];

  // Find the pinned post
  const pinnedPost = blogs.find(b => b.pinned) || blogs[0];
  
  
  const [didYouMean, setDidYouMean] = useState(null);

  const handleClearSearch = () => {
    setSearchTerm('');
    setDidYouMean(null);
  };

  const currentFilter = searchTerm;

  const filteredBlogs = blogs.filter(blog => {
      const term = currentFilter.toLowerCase();
      const matchesCategory = !selectedCategory || blog.category === selectedCategory;
      const matchesSearch = blog.title.toLowerCase().includes(term) || 
                           blog.content.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
  });

  const getSuggestion = () => {
      const term = currentFilter;
      if (term.length < 3 || filteredBlogs.length > 0) return null;
      
      const similarity = (s1, s2) => {
          const longer = s1.length > s2.length ? s1 : s2;
          const shorter = s1.length > s2.length ? s2 : s1;
          if (longer.length === 0) return 1.0;
          const editDistance = (str1, str2) => {
              const costs = [];
              for (let i = 0; i <= str1.length; i++) {
                  let lastValue = i;
                  for (let j = 0; j <= str2.length; j++) {
                      if (i === 0) costs[j] = j;
                      else if (j > 0) {
                          let newValue = costs[j - 1];
                          if (str1.charAt(i - 1) !== str2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                          costs[j - 1] = lastValue;
                          lastValue = newValue;
                      }
                  }
                  if (i > 0) costs[str2.length] = lastValue;
              }
              return costs[str2.length];
          };
          return (longer.length - editDistance(longer.toLowerCase(), shorter.toLowerCase())) / parseFloat(longer.length);
      };

      const bestMatch = blogs.find(blog => similarity(term, blog.title) > 0.4);
      return bestMatch || null;
  };

  const suggestion = getSuggestion();


  // Filter posts for the grid
  const filteredPosts = blogs.filter(post => {
      if (!selectedCategory && !currentFilter && post.id === pinnedPost?.id) return false;
      
      const term = currentFilter.toLowerCase();
      const matchesSearch = !currentFilter || 
        post.title.toLowerCase().includes(term) || 
        post.content.toLowerCase().includes(term);

      if (selectedCategory) {
          return (post.category === selectedCategory || (post.tags && post.tags.includes(selectedCategory))) && matchesSearch;
      }
      return matchesSearch;
  });

  const tabStyle = (tab) => ({
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: activeTab === tab ? '#111' : '#666',
    borderBottom: activeTab === tab ? '2px solid #ff6026' : 'none',
    fontFamily: 'Inter, sans-serif'
  });

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5ee' }}>Loading Blog...</div>;

  return (
    <div style={{ backgroundColor: embedded ? 'transparent' : '#f5f5ee', minHeight: '100%', paddingBottom: embedded ? '2rem' : '10rem' }}>
      <div className="blog-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: embedded ? '2rem 0' : '2rem 1.5rem 0 1.5rem' }}>
        
        {selectedBlog ? (
          /* SINGLE BLOG VIEW */
          <div className="blog-single-view" style={{ padding: '4rem 0 10rem 0' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <button 
                    onClick={() => handleOpenBlog(null)} 
                    style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '14px', cursor: 'pointer', marginBottom: '2rem', padding: 0 }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    Back to All Posts
                </button>

                <h1 className="responsive-h1" style={{ margin: '0 0 1.5rem 0', textAlign: 'left' }}>{selectedBlog.title}</h1>
                
                <div style={{ display: 'flex', gap: '10px', fontSize: '15px', color: '#666', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                    <span>{new Date(selectedBlog.date || selectedBlog.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <span>&bull;</span>
                    <span>by <strong style={{ color: '#6300dd' }}>{selectedBlog.author}</strong></span>
                </div>

                {selectedBlog.image && (
                    <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '3rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                        <img src={selectedBlog.image} alt={selectedBlog.title} style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }} />
                    </div>
                )}

                <div 
                    className="blog-content-body responsive-p"
                    style={{ 
                        lineHeight: '1.7', 
                        color: '#333', 
                        marginBottom: '5rem', 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}
                    dangerouslySetInnerHTML={{ __html: selectedBlog.content }}
                />

                <style>{`
                    .blog-content-body p, 
                    .blog-content-body div { 
                        margin-bottom: 1.5rem; 
                    }
                    .blog-content-body h2 {
                        margin-top: 2rem;
                        margin-bottom: 1.25rem;
                        font-size: 1.75rem;
                    }
                    @media (max-width: 768px) {
                        .blog-content-body h2 { font-size: 1.5rem; }
                        .blog-single-view { padding: 2rem 0 !important; }
                    }
                `}</style>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '4rem', marginBottom: '6rem' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2rem' }}>Author</h4>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <AuthorAvatar authorId={selectedBlog.userId} authorName={selectedBlog.author} existingImg={selectedBlog.authorImage || selectedBlog.authorPhoto || authorImageOverride} size="60px" />
                        <div>
                            <h5 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700' }}>{selectedBlog.author}</h5>
                            <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: '1.5' }}>{selectedBlog.authorTitle || authorTitleOverride || 'X Foundary Contributor'}</p>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          /* BLOG LIST VIEW */
          <>
            <div className="blog-list-header" style={{ paddingTop: '8rem' }}>
                <h1 className="responsive-h1" style={{ textAlign: 'center', marginBottom: '4rem' }}>X Foundary Blog</h1>
            </div>
            
            {/* Blog Nav & Search */}
            <div className="blog-nav-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'relative', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '2rem', position: 'relative', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {['All Posts', 'Startup Jobs', 'Startup School'].map(tab => (
                        <span 
                            key={tab} 
                            onClick={() => { setActiveTab(tab); setSelectedCategory(null); }} 
                            style={{
                                padding: '1rem 0',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '700',
                                color: activeTab === tab ? '#111' : '#888',
                                transition: 'color 0.2s ease',
                                whiteSpace: 'nowrap',
                                borderBottom: activeTab === tab ? '3px solid #ff6026' : '3px solid transparent'
                            }}
                        >
                            {tab}
                        </span>
                    ))}
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '10px', width: '100%', maxWidth: '320px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <svg style={{ position: 'absolute', left: '12px', color: '#999' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input 
                          type="text" 
                          placeholder="Search Blog" 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ padding: '12px 40px 12px 42px', border: 'none', borderRadius: '8px', fontSize: '15px', width: '100%', outline: 'none', background: 'transparent' }} 
                        />
                        {searchTerm && (
                            <button onClick={handleClearSearch} style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Featured Post */}
            {!selectedCategory && !currentFilter && pinnedPost && (
                <div className="blog-featured-row" style={{ display: 'flex', gap: '4rem', marginBottom: '8rem', alignItems: 'center' }}>
                    <div style={{ flex: 1.2 }}>
                        <h2 
                            onClick={() => handleOpenBlog(pinnedPost)}
                            className="responsive-h2"
                            style={{ fontWeight: '900', marginBottom: '1.5rem', cursor: 'pointer', textAlign: 'left' }}
                        >
                            {pinnedPost.title}
                        </h2>
                        <p className="responsive-p" style={{ color: '#333', marginBottom: '2rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {pinnedPost.content?.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')}
                        </p>
                        <button 
                            onClick={() => handleOpenBlog(pinnedPost)}
                            style={{ color: '#6300dd', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '15px' }}
                        >
                            Read More <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="12 8 16 12 12 16"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        </button>
                    </div>
                    <div style={{ flex: 1, width: '100%' }}>
                        <div 
                            onClick={() => handleOpenBlog(pinnedPost)}
                            style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                        >
                            <img src={pinnedPost.image} alt="Featured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Posts Grid */}
            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ff6026', textTransform: 'uppercase', marginBottom: '2rem', letterSpacing: '0.05em' }}>
                {currentFilter ? `SEARCH RESULTS FOR "${currentFilter.toUpperCase()}"` : 'RECENT POSTS'}
            </h2>
            
            <div className="blog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '8rem' }}>
                {filteredPosts.map(post => (
                    <div 
                        key={post.id} 
                        onClick={() => handleOpenBlog(post)} 
                        style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #eee', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                            <img src={post.image} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '1rem', lineHeight: '1.3' }}>{post.title}</h3>
                            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <AuthorAvatar authorId={post.userId || post.authorId} authorName={post.author} existingImg={post.authorImage || post.authorPhoto} size="32px" />
                                <span style={{ fontSize: '13px', color: '#666' }}>{post.author}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Categories & More */}
            <div className="blog-footer-layout" style={{ display: 'flex', gap: '4rem', borderTop: '1px solid #eee', paddingTop: '4rem' }}>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111', textTransform: 'uppercase', marginBottom: '2.5rem', letterSpacing: '0.05em' }}>Categories</h2>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {categories.map(cat => (
                            <span 
                                key={cat} 
                                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)} 
                                style={{ backgroundColor: selectedCategory === cat ? '#6300dd' : '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: selectedCategory === cat ? '#fff' : '#444', cursor: 'pointer', border: '1px solid #eee' }}
                            >
                                {cat}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 900px) {
                    .blog-featured-row { flex-direction: column; gap: 2rem !important; }
                    .blog-grid { grid-template-columns: 1fr !important; }
                    .blog-footer-layout { flex-direction: column; }
                    .blog-container { padding-top: 2rem !important; }
                }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
};

export default Blog;
