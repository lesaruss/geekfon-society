'use client';
import { useState } from 'react';

export default function JukeboxPage() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [selectedArtist, setSelectedArtist] = useState('All Artists');

  const artists = [
    { name: 'Roxanne', color: '#F69820', songs: 4 },
    { name: 'Lex from Brixton', color: '#3B82F6', songs: 3 },
    { name: 'Shamanic Resin', color: '#22C55E', songs: 3 },
    { name: 'Riku Hayasaka', color: '#EC4899', songs: 3 },
  ];

  return (
    <>
      {/* Hero */}
      <div style={{ background: '#1a1a1a', padding: '32px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#F69820', marginBottom: '8px' }}>GeekFon Society</div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>The Jukebox</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Browse every GFS song. Rent a moment or own it forever.</div>
        <div style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.06)', marginTop: '20px', marginLeft: '-32px', marginRight: '-32px', paddingLeft: '32px', paddingRight: '32px' }}>
          <div style={{ flex: 1, padding: '14px 20px', background: '#1a1a1a' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>Songs</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>24</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Across 8 artists</div>
          </div>
          <div style={{ flex: 1, padding: '14px 20px', background: '#1a1a1a' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>Your Queue</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>3</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Ready to play</div>
          </div>
          <div style={{ flex: 1, padding: '14px 20px', background: '#1a1a1a' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>Your Library</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>7</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Owned tracks</div>
          </div>
          <div style={{ flex: 1, padding: '14px 20px', background: '#1a1a1a' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>LESAR Balance</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#F69820' }}>140</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>28 plays available</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 32px' }}>
        {['catalog', 'queue', 'library'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '14px 20px', fontSize: '12px', fontWeight: activeTab === tab ? 900 : 700, color: activeTab === tab ? '#1a1a1a' : 'rgba(26,26,26,0.45)', border: 'none', borderBottom: activeTab === tab ? '2px solid #F69820' : '2px solid transparent', background: 'none', cursor: 'pointer', marginBottom: '-1px', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content - simplified for geekfon-society */}
      <div style={{ padding: '32px' }}>
        {activeTab === 'catalog' && (
          <div>
            <input type="text" placeholder="Search songs or artists..." style={{ width: '100%', maxWidth: '300px', padding: '8px 14px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '6px', fontSize: '12px', marginBottom: '20px' }} />
            {artists.map((artist) => (
              <div key={artist.name} style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#fff', marginBottom: '10px' }}>{artist.name}</div>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ width: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{i}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Song {i}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{artist.name}</div>
                    </div>
                    <button style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '10px', fontWeight: 800, border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff', background: 'transparent', cursor: 'pointer' }}>Rent 5</button>
                    <button style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '10px', fontWeight: 800, border: 'none', color: '#000', background: '#fff', cursor: 'pointer' }}>Buy</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {activeTab === 'queue' && <div style={{ padding: '20px 0', color: 'rgba(255,255,255,0.7)' }}>3 songs queued - ready to play</div>}
        {activeTab === 'library' && <div style={{ padding: '20px 0', color: 'rgba(255,255,255,0.7)' }}>7 owned tracks in your library</div>}
      </div>
    </>
  );
}
