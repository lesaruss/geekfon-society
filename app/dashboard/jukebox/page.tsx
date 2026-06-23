'use client';
import { useEffect, useState } from 'react';
import InternalNav from '@/components/InternalNav';
import BrandDrawer from '@/components/BrandDrawer';
import InternalFooter from '@/components/InternalFooter';

export default function GeekFonPage() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [selectedArtist, setSelectedArtist] = useState('All Artists');

  useEffect(() => {
    document.title = 'GeekFon Society - The Jukebox';
  }, []);

  const artists = [
    { name: 'Roxanne', color: '#F69820', songs: 4 },
    { name: 'Lex from Brixton', color: '#3B82F6', songs: 3 },
    { name: 'Shamanic Resin', color: '#22C55E', songs: 3 },
    { name: 'Riku Hayasaka', color: '#EC4899', songs: 3 },
  ];

  return (
    <>
      <InternalNav />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 58px)' }}>
        <BrandDrawer />
        <main style={{ flex: 1, padding: '0 32px 80px' }}>
          {/* Hero */}
          <div style={{ background: '#1a1a1a', padding: '32px 0', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--lr-orange)', marginBottom: '8px' }}>GeekFon Society</div>
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
                <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--lr-orange)' }}>140</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>28 plays available</div>
              </div>
            </div>
          </div>

          {/* Gate Banner */}
          <div style={{ background: '#f5f5f5', border: '1.5px dashed rgba(0,0,0,0.15)', borderRadius: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.45)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <div style={{ fontSize: '12px', color: 'rgba(26,26,26,0.65)', flex: 1 }}>
              <strong>Passport required to play.</strong> You can browse the full catalog. Upgrade to Passport to rent or buy.
            </div>
            <button style={{ padding: '7px 16px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Get Passport</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '2px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '0' }}>
            {['catalog', 'queue', 'library'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '14px 20px',
                  fontSize: '12px',
                  fontWeight: activeTab === tab ? 900 : 700,
                  color: activeTab === tab ? '#1a1a1a' : 'rgba(26,26,26,0.45)',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--lr-orange)' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  marginBottom: activeTab === tab ? '-1px' : '-1px',
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'queue' && <span style={{ background: 'rgba(246,152,32,0.15)', color: '#7d4a00', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', marginLeft: '4px', fontWeight: 900 }}>3</span>}
                {tab === 'library' && <span style={{ background: 'rgba(0,0,0,0.07)', color: 'rgba(26,26,26,0.55)', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', marginLeft: '4px', fontWeight: 900 }}>7</span>}
              </button>
            ))}
          </div>

          {/* Catalog Tab */}
          {activeTab === 'catalog' && (
            <div style={{ padding: '16px 0' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <input type="text" placeholder="Search songs or artists..." style={{ flex: 1, padding: '8px 14px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', color: '#1a1a1a', outline: 'none' }} />
                <select value={selectedArtist} onChange={(e) => setSelectedArtist(e.target.value)} style={{ padding: '8px 14px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', color: '#1a1a1a', background: '#fff', cursor: 'pointer', outline: 'none' }}>
                  <option>All Artists</option>
                  <option>Roxanne</option>
                  <option>Lex from Brixton</option>
                  <option>Shamanic Resin</option>
                  <option>Riku Hayasaka</option>
                </select>
              </div>
              {artists.map((artist) => (
                <div key={artist.name} style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '2px solid rgba(0,0,0,0.08)', marginBottom: '2px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: artist.color, flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{artist.name}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(26,26,26,0.4)', fontWeight: 600 }}>{artist.songs} songs</div>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: '20px', fontSize: '11px', color: 'rgba(26,26,26,0.3)', fontWeight: 600, textAlign: 'right' }}>{i}</div>
                      <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: artist.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a' }}>Song Title {i}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(26,26,26,0.5)', marginTop: '1px' }}>{artist.name}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(26,26,26,0.4)', fontWeight: 600, width: '36px', textAlign: 'right' }}>3:{20 + i}0</div>
                      <button style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '10px', fontWeight: 800, border: '1.5px solid rgba(0,0,0,0.12)', color: 'rgba(26,26,26,0.65)', cursor: 'pointer', background: '#fff', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Rent 5</button>
                      <button style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '10px', fontWeight: 800, border: 'none', color: '#fff', cursor: 'pointer', background: '#1a1a1a', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Buy</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Queue Tab */}
          {activeTab === 'queue' && (
            <div style={{ padding: '16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', fontSize: '12px', fontWeight: 700, color: 'rgba(26,26,26,0.55)' }}>
                <div>3 songs in queue - plays in order</div>
                <button style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '10px', fontWeight: 800, border: '1.5px solid rgba(0,0,0,0.12)', color: 'rgba(26,26,26,0.55)', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Clear Queue</button>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--lr-orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900, flexShrink: 0 }}>{i}</div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '7px', background: artists[i - 1].color, opacity: 0.8, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a' }}>Song {i}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(26,26,26,0.5)', marginTop: '2px' }}>{artists[i - 1].name}</div>
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#7d4a00', background: '#fff3e0', padding: '3px 8px', borderRadius: '10px' }}>5 LESARs</div>
                </div>
              ))}
            </div>
          )}

          {/* Library Tab */}
          {activeTab === 'library' && (
            <div style={{ padding: '16px 0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(26,26,26,0.55)', marginBottom: '12px' }}>7 owned tracks - play anytime</div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: artists[(i - 1) % 4].color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a' }}>Owned Song {i}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(26,26,26,0.5)', marginTop: '1px' }}>{artists[(i - 1) % 4].name}</div>
                  </div>
                  <button style={{ padding: '5px 12px', borderRadius: '5px', fontSize: '10px', fontWeight: 800, border: 'none', color: '#fff', cursor: 'pointer', background: '#1a1a1a', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Play</button>
                </div>
              ))}
              <div style={{ padding: '12px 0', fontSize: '11px', color: 'rgba(26,26,26,0.35)', fontWeight: 600, textAlign: 'center' }}>+ 3 more owned tracks</div>
            </div>
          )}
        </main>
      </div>
      <InternalFooter />
    </>
  );
}