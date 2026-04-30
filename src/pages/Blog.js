import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const Blog = ({ embedded }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('All Posts');

  const [selectedBlog, setSelectedBlog] = useState(null);
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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [didYouMean, setDidYouMean] = useState(null);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setDidYouMean(null);

    if (term.length > 3) {
      const matches = blogs.filter(b => 
        b.title.toLowerCase().includes(term) || 
        b.content.toLowerCase().includes(term)
      );
      
      if (matches.length === 0) {
        // Simple fuzzy match for "Did you mean?"
        const closest = blogs.find(b => {
          const title = b.title.toLowerCase();
          // Check if at least 60% of the search term matches the title words
          const words = term.split(' ');
          return words.some(word => word.length > 2 && title.includes(word.substring(0, 3)));
        });
        if (closest) setDidYouMean(closest);
      }
    }
  };

  // Filter posts for the grid
  const filteredPosts = blogs.filter(post => {
      if (!selectedCategory && !searchTerm && post.id === pinnedPost?.id) return false;
      
      const matchesSearch = !searchTerm || 
        post.title.toLowerCase().includes(searchTerm) || 
        post.content.toLowerCase().includes(searchTerm);

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
      <style>{`
        body, html { 
          overflow-y: auto !important; 
          height: auto !important; 
        }
      `}</style>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: embedded ? '2rem 0' : '2rem 2rem 0 2rem' }}>
        
        {selectedBlog ? (
          /* SINGLE BLOG VIEW */
          <div style={{ padding: '6rem 0 10rem 0' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <button 
                    onClick={() => handleOpenBlog(null)} 
                    style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '14px', cursor: 'pointer', marginBottom: '2rem', padding: 0 }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    Back to All Posts
                </button>

                <h1 style={{ fontSize: '3rem', fontWeight: '800', color: '#111', margin: '0 0 1rem 0', lineHeight: '1.1', letterSpacing: '-0.02em' }}>{selectedBlog.title}</h1>
                
                <div style={{ display: 'flex', gap: '10px', fontSize: '15px', color: '#666', marginBottom: '2.5rem' }}>
                    <span>{new Date(selectedBlog.date || selectedBlog.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <span>&bull;</span>
                    <span>by <strong style={{ color: '#007bff' }}>{selectedBlog.author}</strong></span>
                </div>

                {selectedBlog.image && (
                    <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '3rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                        <img src={selectedBlog.image} alt={selectedBlog.title} style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }} />
                    </div>
                )}

                <div 
                    className="blog-content-body"
                    style={{ fontSize: '1.2rem', lineHeight: '1.8', color: '#333', marginBottom: '5rem' }}
                    dangerouslySetInnerHTML={{ __html: selectedBlog.content }}
                />

                <div style={{ borderTop: '1px solid #eee', paddingTop: '4rem', marginBottom: '6rem' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2rem' }}>Author</h4>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                        {selectedBlog.authorImage ? (
                            <img src={selectedBlog.authorImage} alt={selectedBlog.author} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee' }} />
                        ) : (
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#6300dd', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px' }}>{selectedBlog.author?.charAt(0)}</div>
                        )}
                        <div>
                            <h5 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700' }}>{selectedBlog.author}</h5>
                            <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: '1.5' }}>X Foundary Contributor</p>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          /* BLOG LIST VIEW */
          <>
            <div style={{ padding: '8rem 0 0 0' }} />
            
            {/* Blog Nav & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem', borderBottom: '1px solid #ddd' }}>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['All Posts', 'Startup Jobs', 'Startup School'].map(tab => (
                        <span key={tab} onClick={() => { setActiveTab(tab); setSelectedCategory(null); }} style={tabStyle(tab)}>{tab}</span>
                    ))}
                </div>
                <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      placeholder="Search Blog" 
                      value={searchTerm}
                      onChange={handleSearch}
                      style={{ padding: '8px 12px 8px 35px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px', width: '240px', outline: 'none' }} 
                    />
                    <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
            </div>

            {/* Spell Suggestion */}
            {didYouMean && searchTerm && filteredPosts.length === 0 && (
              <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'rgba(255,96,38,0.05)', borderRadius: '8px', border: '1px solid rgba(255,96,38,0.1)' }}>
                <span style={{ fontSize: '14px', color: '#666' }}>No results for "{searchTerm}". Did you mean: </span>
                <button 
                  onClick={() => handleOpenBlog(didYouMean)}
                  style={{ background: 'none', border: 'none', color: '#ff6026', fontWeight: '600', cursor: 'pointer', padding: 0, fontSize: '14px', textDecoration: 'underline' }}
                >
                  {didYouMean.title}
                </button>
              </div>
            )}

            {/* Featured Post */}
            {!selectedCategory && !searchTerm && pinnedPost && (
                <div style={{ display: 'flex', gap: '4rem', marginBottom: '6rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '500', marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif', color: '#111', lineHeight: '1.2' }}>{pinnedPost.title}</h1>
                        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#333', marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {pinnedPost.content?.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')}
                        </p>
                        <button 
                            onClick={() => handleOpenBlog(pinnedPost)}
                            style={{ color: '#007bff', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                            Read More <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 8 16 12 12 16"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        </button>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ width: '100%', aspectRatio: '16/10', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                            <img src={pinnedPost.image} alt="Featured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Posts Grid */}
            <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ff6026', textTransform: 'uppercase', marginBottom: '2rem', letterSpacing: '0.05em' }}>
                {searchTerm ? 'Search Results' : 'RECENT POSTS'} {selectedCategory && `(${selectedCategory.toUpperCase()})`}
            </h2>
            
            {filteredPosts.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '8rem' }}>
                    {filteredPosts.map(post => (
                        <div 
                            key={post.id} 
                            className="blog-list-item"
                            onClick={() => handleOpenBlog(post)} 
                            style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                        >
                            <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                                <img src={post.image} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', fontFamily: 'Inter, sans-serif', lineHeight: '1.3' }}>{post.title}</h3>
                                <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: '1.6', marginBottom: '1.5rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {post.content?.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')}
                                </p>
                                
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    <span style={{ backgroundColor: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: '#666' }}>{post.category || 'General'}</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {post.authorImage ? (
                                        <img src={post.authorImage} alt={post.author} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6300dd', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>{post.author?.charAt(0)}</div>
                                    )}
                                    <div>
                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>{post.author}</p>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>{new Date(post.date || post.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                  <p style={{ fontSize: '1.2rem', fontWeight: '500' }}>No posts match your search.</p>
                  <button onClick={() => setSearchTerm('')} style={{ color: '#ff6026', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}>Clear Search</button>
                </div>
            )}

            {/* Categories Sidebar Layout */}
            {!searchTerm && (
              <div style={{ display: 'flex', gap: '5rem' }}>
                  <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ff6026', textTransform: 'uppercase', marginBottom: '2.5rem', letterSpacing: '0.05em' }}>All Posts</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                          {blogs.slice(0, 8).map((post, idx) => (
                              <div key={post.id} className="blog-list-item" style={{ cursor: 'pointer', padding: '1.5rem', borderRadius: '12px', margin: '-1.5rem', transition: 'all 0.2s ease' }} onClick={() => handleOpenBlog(post)}>
                                  <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', fontFamily: 'Inter, sans-serif' }}>{post.title}</h3>
                                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '1rem' }}>
                                      by <span style={{ color: '#007bff' }}>{post.author}</span> &nbsp; {new Date(post.date || post.createdAt).toLocaleDateString()}
                                  </p>
                                  <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#333', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                      {post.content?.replace(/<[^>]*>?/gm, '')}
                                  </p>
                                  <span style={{ color: '#007bff', fontWeight: '500', fontSize: '14px' }}>Read More</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  <aside style={{ width: '250px' }}>
                      <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>Categories</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
                          {categories.map(cat => (
                              <span key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)} style={{ backgroundColor: selectedCategory === cat ? '#6300dd' : '#e9e9e2', padding: '8px 16px', borderRadius: '4px', fontSize: '14px', fontWeight: '500', color: selectedCategory === cat ? '#fff' : '#111', cursor: 'pointer', transition: 'all 0.2s ease', border: '1px solid rgba(0,0,0,0.05)' }}>{cat}</span>
                          ))}
                      </div>
                  </aside>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Blog;
