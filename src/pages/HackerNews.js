import React from 'react';

const HackerNews = () => {
    const news = [
        { id: 1, title: "Spain's parliament will act against massive IP blockages by LaLiga", domain: "democrata.es", points: 153, user: "alyuu", time: "1 hour ago", comments: 36 },
        { id: 2, title: "Belgium stops decommissioning nuclear power plants", domain: "doa-international.com", points: 528, user: "mowelher", time: "5 hours ago", comments: 417 },
        { id: 3, title: "The Whistleblower Who Uncovered the NSA's 'Big Brother Machine'", domain: "mitpress.mit.edu", points: 47, user: "the-mtr", time: "41 minutes ago", comments: 3 },
        { id: 4, title: "Shai-Hulud Themed Malware Found in the PyTorch Lightning AI Training Library", domain: "semgrep.dev", points: 36, user: "j12y", time: "1 hour ago", comments: 12 },
        { id: 5, title: "How an Oil Refinery Works", domain: "construction-physics.com", points: 152, user: "chmaynard", time: "3 hours ago", comments: 33 },
        { id: 6, title: "Claude Code refuses requests or charges extra if your commits mention 'OpenClaw'", domain: "twitter.com/theo", points: 311, user: "almean", time: "2 hours ago", comments: 218 },
        { id: 7, title: "Durable queues, streams, pub/sub, and a cron scheduler – inside your SQLite file", domain: "honker.dev", points: 43, user: "fernavid", time: "2 hours ago", comments: 4 },
        { id: 8, title: "You can beat the binary search", domain: "lemire.me", points: 115, user: "vok", time: "4 hours ago", comments: 36 },
        { id: 9, title: "I aggregated 28 US Government auction sites into one search", domain: "bidprowl.com", points: 160, user: "acarsam", time: "4 hours ago", comments: 47 },
        { id: 10, title: "SatoshiGuesser – Roll for Bitcoin", domain: "github.com/pathos0925", points: 23, user: "ilarum", time: "52 minutes ago", comments: 20 },
    ];

    return (
        <div style={{ backgroundColor: '#f6f6ef', minHeight: '100vh', padding: '0', fontFamily: 'Verdana, Geneva, sans-serif' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f6f6ef' }}>
                {/* HN Header */}
                <header className="hn-header" style={{ backgroundColor: '#ff6600', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ border: '1px solid white', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>Y</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '13px', fontWeight: 'bold', flexWrap: 'wrap' }}>
                        <span style={{ color: '#000' }}>Hacker News</span>
                        <nav style={{ fontWeight: 'normal', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {['new', 'past', 'comments', 'ask', 'show', 'jobs', 'submit'].map(item => (
                                <span key={item} style={{ cursor: 'pointer' }}>| {item}</span>
                            ))}
                        </nav>
                    </div>
                </header>

                {/* News List */}
                <main style={{ padding: '10px 0 20px 0' }}>
                    <table cellPadding="0" cellSpacing="0" style={{ border: '0', width: '100%' }}>
                        <tbody>
                            {news.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    <tr style={{ height: '22px' }}>
                                        <td align="right" valign="top" style={{ paddingRight: '5px', color: '#828282', fontSize: '13px', width: '25px' }}>
                                            {index + 1}.
                                        </td>
                                        <td valign="top">
                                            <div className="mobile-hide" style={{ cursor: 'pointer', display: 'inline-block', width: '10px', height: '10px', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '8px solid #828282', marginBottom: '2px', marginRight: '3px' }} />
                                            <span style={{ fontSize: '13px', color: '#000' }}>{item.title}</span>
                                            <span style={{ fontSize: '10px', color: '#828282', marginLeft: '5px' }}>({item.domain})</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan="1"></td>
                                        <td style={{ fontSize: '9px', color: '#828282', paddingBottom: '8px', paddingLeft: '2px' }}>
                                            {item.points} points by {item.user} {item.time} | hide | {item.comments} comments
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))}
                            <tr>
                                <td colSpan="1"></td>
                                <td style={{ padding: '10px 5px', fontSize: '13px', fontWeight: 'bold', color: '#000', cursor: 'pointer' }}>
                                    More
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </main>

                <footer style={{ borderTop: '2px solid #ff6600', padding: '20px', textAlign: 'center', fontSize: '12px', color: '#828282' }}>
                    <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center', gap: '10px', color: '#000', flexWrap: 'wrap' }}>
                        {['Guidelines', 'FAQ', 'Lists', 'API', 'Security', 'Legal', 'Apply to YC', 'Contact'].map(item => (
                            <span key={item} style={{ cursor: 'pointer' }}>{item}</span>
                        ))}
                    </div>
                </footer>
            </div>
            <style>{`
                @media (max-width: 600px) {
                    .hn-header { padding: 8px !important; }
                    main { padding: 10px 5px !important; }
                }
            `}</style>
        </div>
    );
};

export default HackerNews;
