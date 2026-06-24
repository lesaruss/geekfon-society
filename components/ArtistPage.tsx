'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ArtistPageProps {
  name: string;
  slug: string;
  heroUrl?: string;
  billboard?: any[];
  music?: any[];
  pulse?: any[];
  media?: any[];
  schedule?: any[];
  description?: string;
  badges?: string[];
}

const ArtistPage: React.FC<ArtistPageProps> = ({
  name,
  slug,
  heroUrl,
  billboard,
  music,
  pulse,
  media,
  schedule,
  description,
  badges
}) => {
  const [tab, setTab] = useState('pulse');
  const [showAllPulse, setShowAllPulse] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const CSS = `
    .artist-hero {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d1b3d 100%);
      padding: 60px 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: center;
      margin-bottom: 40px;
    }

    .artist-hero-image {
      width: 100%;
      max-width: 400px;
      border-radius: 16px;
      overflow: hidden;
      border: 3px solid #ff1493;
    }

    .artist-hero-image img {
      width: 100%;
      height: auto;
      display: block;
    }

    .artist-hero-content {
      color: white;
    }

    .artist-hero-content h1 {
      font-size: 56px;
      font-weight: 900;
      margin: 0 0 20px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .artist-hero-content p {
      font-size: 18px;
      line-height: 1.6;
      margin: 0 0 30px 0;
      color: #ccc;
    }

    .artist-badges {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .badge-pink {
      background: #ff1493;
      color: white;
    }

    .badge-dark {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 2px solid #eee;
      padding: 0 40px;
      background: white;
    }

    .tab {
      padding: 16px 24px;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #999;
      border: none;
      background: none;
      cursor: pointer;
      position: relative;
      outline: none;
    }

    .tab.active {
      color: #ff1493;
      border-bottom: 3px solid #ff1493;
      margin-bottom: -2px;
    }

    .tab:hover {
      color: #333;
    }

    .content {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 40px;
      padding: 40px;
      background: white;
      min-height: 600px;
    }

    .feed {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .feed-post {
      display: grid;
      grid-template-columns: 80px 1fr;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid #eee;
    }

    .feed-avatar {
      width: 80px;
      height: 80px;
      border-radius: 4px;
      border: 2px solid #ff1493;
      object-fit: cover;
    }

    .feed-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .feed-header {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .feed-name {
      font-weight: 700;
      font-size: 14px;
      color: #1a1a1a;
    }

    .feed-time {
      font-size: 12px;
      color: #999;
    }

    .feed-badge {
      display: inline-block;
      padding: 4px 8px;
      background: #ff1493;
      color: white;
      font-size: 10px;
      font-weight: 700;
      border-radius: 3px;
      text-transform: uppercase;
    }

    .feed-text {
      font-size: 14px;
      color: #333;
      margin: 0;
      line-height: 1.5;
    }

    .load-more-container {
      display: flex;
      justify-content: center;
      margin-top: 32px;
    }

    .load-more-btn {
      padding: 12px 32px;
      background: #1a1a1a;
      color: white;
      border: none;
      border-radius: 4px;
      font-weight: 700;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      cursor: pointer;
    }

    .load-more-btn:hover {
      background: #333;
    }

    .billboard {
      position: sticky;
      top: 120px;
      width: 300px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .billboard-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #999;
    }

    .billboard-item {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 3/4;
    }

    .billboard-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: #999;
    }

    @media (max-width: 768px) {
      .artist-hero {
        grid-template-columns: 1fr;
        padding: 40px 20px;
        gap: 30px;
      }

      .content {
        grid-template-columns: 1fr;
        padding: 20px;
      }

      .billboard {
        position: static;
        width: 100%;
      }
    }
  `;

  const displayedPulse = showAllPulse ? pulse : (pulse || []).slice(0, 3);

  return (
    <div suppressHydrationWarning>
      <style>{CSS}</style>

      {/* Hero Section */}
      <div className="artist-hero">
        {heroUrl && (
          <div className="artist-hero-image">
            <img src={heroUrl} alt={name} />
          </div>
        )}
        <div className="artist-hero-content">
          <h1>{name}</h1>
          {description && <p>{description}</p>}
          {badges && badges.length > 0 && (
            <div className="artist-badges">
              {badges.map((badge, i) => (
                <span key={i} className={`badge ${badge === 'ORIGINAL' ? 'badge-pink' : 'badge-dark'}`}>
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['pulse', 'music', 'media', 'schedule', 'overview'].map(t => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="content">
        <div>
          {tab === 'pulse' && (
            <>
              {!pulse || pulse.length === 0 ? (
                <div className="empty-state">
                  <p>Posts coming soon. Season 1 starts Jun 1.</p>
                </div>
              ) : (
                <>
                  <div className="feed">
                    {displayedPulse.map((post, i) => (
                      <div key={i} className="feed-post">
                        {heroUrl && (
                          <img src={heroUrl} alt={name} className="feed-avatar" />
                        )}
                        <div className="feed-body">
                          <div className="feed-header">
                            <span className="feed-name">{name}</span>
                            {post.date && <span className="feed-time">{post.date}</span>}
                            {post.type === 'music_drop' && (
                              <span className="feed-badge">Music Drop</span>
                            )}
                          </div>
                          {post.caption && <p className="feed-text">{post.caption}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!showAllPulse && pulse.length > 3 && (
                    <div className="load-more-container">
                      <button className="load-more-btn" onClick={() => setShowAllPulse(true)}>
                        Load more
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'music' && (
            <div className="empty-state">
              <p>Music content coming soon.</p>
            </div>
          )}

          {tab === 'media' && (
            <div className="empty-state">
              <p>Media gallery coming soon.</p>
            </div>
          )}

          {tab === 'schedule' && (
            <div className="empty-state">
              <p>Schedule coming soon.</p>
            </div>
          )}

          {tab === 'overview' && (
            <div className="empty-state">
              <p>{description || 'Overview coming soon.'}</p>
            </div>
          )}
        </div>

        {/* Billboard */}
        {tab !== 'pulse' && billboard && billboard.length > 0 && (
          <div className="billboard">
            <div className="billboard-title">Billboard</div>
            {billboard.map((item, i) => (
              <div key={i} className="billboard-item">
                <img src={item} alt="" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistPage;
