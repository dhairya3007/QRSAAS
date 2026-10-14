import React, { useEffect, useState } from 'react';
import { User, Link as LinkIcon, QrCode, ExternalLink, Download, ToggleRight, ToggleLeft, Plus, Palette, Edit2, Trash2 } from 'lucide-react';
import { personalQrService } from '../../services/personalQrService';
import { authService } from '../../services/authService';
import syncService from '../../services/syncService';
import { PERSONAL_QR_THEMES } from './themes/personalQrThemes';

import ProfileDetails from './ProfileDetails';
import CallToActionButtons from './CallToActionButtons';
import QRPreview from './QRPreview';

const PersonalQRDashboard = () => {
  const [isActive, setIsActive] = useState(true);
  const [scanCount, setScanCount] = useState(0);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  const user = authService.getCurrentUser();
  const [currentTheme, setCurrentTheme] = useState('minimal');
  const [previewTheme, setPreviewTheme] = useState('minimal');

  const [profile, setProfile] = useState({
    firstName: '', lastName: '', designation: '', bio: '', profilePic: '', links: [],
    education10th: '', education12th: '', educationCollege: '', educationMasters: '', educationPhD: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();

    // Instant real-time cross-tab sync
    const unsubscribe = syncService.subscribe(() => {
      if (!showProfileModal && !showLinksModal && !showThemeModal && !showQrModal) {
        fetchData();
      }
    });

    // Gentle 10-second idle background refresh (only when tab is active)
    const interval = setInterval(() => {
      if (document.hidden) return;
      if (!showProfileModal && !showLinksModal && !showThemeModal && !showQrModal) {
        fetchData();
      }
    }, 10000);

    const onFocusOrVisible = () => {
      if (!showProfileModal && !showLinksModal && !showThemeModal && !showQrModal) {
        fetchData();
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [showProfileModal, showLinksModal, showThemeModal, showQrModal]);

  useEffect(() => {
    if (showThemeModal) setPreviewTheme(currentTheme);
  }, [showThemeModal]);

  const fetchData = async () => {
    try {
      const [profileData, scans, statusRes] = await Promise.all([
        personalQrService.getProfile().catch(() => null),
        personalQrService.getScanCount().catch(() => 0),
        personalQrService.getStatus().catch(() => ({ isActive: true })),
      ]);
      setScanCount(scans);
      if (statusRes && statusRes.isActive !== undefined) {
        setIsActive(statusRes.isActive);
      }
      if (profileData) {
        if (profileData.theme && profileData.theme !== currentTheme) {
          setCurrentTheme(profileData.theme);
          setPreviewTheme(profileData.theme);
        }
        setProfile(profileData);
      }
    } catch (err) {
      console.warn("Failed to load personal card details:", err);
    }
  };

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      const { links, ...profileWithoutLinks } = profile;
      await personalQrService.updateProfile(profileWithoutLinks);
      setShowProfileModal(false);
      await fetchData();
    } catch (err) {
      alert("Failed to save profile: " + (err.message || 'Server error'));
    } finally {
      setSaving(false);
    }
  };

  const handlePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const r = new FileReader();
      r.onloadend = () => setProfile({ ...profile, profilePic: r.result });
      r.readAsDataURL(file);
    }
  };

  const saveLinks = async (updatedLinks) => {
    const updated = { ...profile, links: updatedLinks };
    setProfile(updated);
    try {
      await personalQrService.updateProfile(updated);
      await fetchData();
    } catch (err) {
      alert("Failed to save changes: " + (err.message || 'Server error'));
      await fetchData();
    }
  };

  const deleteLink = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    const remaining = (profile.links || []).filter(l => l.id !== id);
    await saveLinks(remaining);
  };

  const toggleLinkStatus = async (id) => {
    const updated = (profile.links || []).map(l =>
      l.id === id ? { ...l, isEnabled: l.isEnabled === false ? true : false, isActive: l.isEnabled === false ? true : false } : l
    );
    await saveLinks(updated);
  };

  const handleToggleStatus = async () => {
    try {
      const res = await personalQrService.toggleStatus();
      if (res && res.isActive !== undefined) {
        setIsActive(res.isActive);
      } else {
        setIsActive(!isActive);
      }
    } catch (err) {
      alert("Failed to toggle status: " + (err.message || 'Server error'));
    }
  };

  const handleUpdateTheme = async (themeId) => {
    try {
      setCurrentTheme(themeId);
      await personalQrService.updateTheme(themeId);
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        currentUser.theme = themeId;
        localStorage.setItem('auth_user', JSON.stringify(currentUser));
      }
      setShowThemeModal(false);
    } catch (err) {
      alert("Failed to update theme: " + (err.message || 'Server error'));
    }
  };

  const handleDownloadQR = async () => {
    const token = profile.qrToken || user?.personalQrToken || user?.qrToken;
    try {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.location.origin + '/' + token)}`;
      const r = await fetch(url);
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = `PersonalCard-QRCode.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert('Failed to download QR code');
    }
  };

  const previewConfig = PERSONAL_QR_THEMES.find(t => t.id === previewTheme) || PERSONAL_QR_THEMES[0];
  const p = previewConfig.preview;

  // Determine which links to show in preview
  const activeLinks = (profile?.links || []).filter(l => l.isEnabled && l.type !== 'Slider');
  const previewLinks = activeLinks.length > 0 ? activeLinks.slice(0, 4) : [
    { type: 'Call', label: 'Call Now' },
    { type: 'WhatsApp', label: 'WhatsApp' },
    { type: 'Website', label: 'Website' },
    { type: 'Email', label: 'Email' }
  ];

  // Helper to get simple icon letters for preview
  const getPreviewIconText = (type) => {
    switch(type) {
      case 'Call': return '📞';
      case 'WhatsApp': return '💬';
      case 'Website': return '🔗';
      case 'Email': return '📧';
      case 'Location': return '📍';
      case 'Share': return '📤';
      case 'Instagram': return '📸';
      case 'LinkedIn': return '💼';
      default: return '🔗';
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark m-0">Personal Digital Card Dashboard</h3>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3" onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer' }}>
            <div className="d-flex justify-content-between align-items-center"><span className="fw-bold d-flex align-items-center gap-2"><User size={18} className="text-primary" /> Profile</span><ExternalLink size={16} className="text-muted" /></div>
            <small className="text-muted mt-1 d-block">(Step-1)</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3" onClick={() => { setEditingLink(null); setShowLinksModal(true); }} style={{ cursor: 'pointer' }}>
            <div className="d-flex justify-content-between align-items-center"><span className="fw-bold d-flex align-items-center gap-2"><LinkIcon size={18} className="text-primary" /> Manage Links</span><Plus size={16} className="text-muted" /></div>
            <small className="text-muted mt-1 d-block">(Step-2)</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3" onClick={() => setShowThemeModal(true)} style={{ cursor: 'pointer' }}>
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold d-flex align-items-center gap-2"><Palette size={18} className="text-primary" /> Update Theme</span>
              <div className="rounded-circle" style={{ width: 20, height: 20, background: PERSONAL_QR_THEMES.find(t => t.id === currentTheme)?.preview.headerBg || '#4f46e5', border: '2px solid #ddd' }}></div>
            </div>
            <small className="text-muted mt-1 d-block">{PERSONAL_QR_THEMES.find(t => t.id === currentTheme)?.name || currentTheme}</small>
          </div>
        </div>
        <div className="col-md-3">
          <a href={`/${profile.qrToken}`} target="_blank" rel="noreferrer" className="text-decoration-none">
            <div className="card shadow-sm border-0 h-100 p-3 rounded-3 text-dark">
              <div className="d-flex justify-content-between align-items-center"><span className="fw-bold d-flex align-items-center gap-2"><ExternalLink size={18} className="text-primary" /> View Public Card</span><ExternalLink size={16} className="text-muted" /></div>
            </div>
          </a>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3" onClick={() => setShowQrModal(true)} style={{ cursor: 'pointer' }}>
            <div className="d-flex justify-content-between align-items-center"><span className="fw-bold d-flex align-items-center gap-2"><QrCode size={18} className="text-primary" /> View / Download QR</span><Download size={16} className="text-muted" /></div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3">
            <div className="d-flex justify-content-between align-items-center"><span className="fw-bold">View / Scan Count</span><span className="fw-bold text-dark fs-5">{scanCount}</span></div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3" onClick={handleToggleStatus} style={{ cursor: 'pointer' }}>
            <div className="d-flex justify-content-between align-items-center"><span className="fw-bold">Activate / Deactivate</span>{isActive ? <ToggleRight size={28} className="text-primary" /> : <ToggleLeft size={28} className="text-muted" />}</div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 rounded-4 p-4 mt-2">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="fw-bold m-0">Call to Action Items</h5>
          <button onClick={() => { setEditingLink(null); setShowLinksModal(true); }} className="btn btn-primary fw-bold d-flex align-items-center gap-1" style={{ backgroundColor: '#5e35b1', border: 'none' }}><Plus size={16} /> Add New Item</button>
        </div>
        <div className="table-responsive border rounded" style={{ height: '350px', overflowY: 'auto' }}>
          <table className="table table-hover align-middle mb-0">
            <thead className="text-muted position-sticky top-0" style={{ zIndex: 10 }}>
              <tr>
                <th style={{ width: '50px', backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' }}></th>
                <th style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' }}>Items</th>
                <th style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' }}>Tap / Scan Count</th>
                <th style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                <th className="text-end" style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profile.links.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-4 text-muted">No items added yet.</td></tr>
              ) : profile.links.map((link) => (
                <tr key={link.id} style={{ opacity: link.isEnabled === false ? 0.6 : 1 }}>
                  <td className="text-muted"><span style={{ fontSize: '20px', letterSpacing: '2px', fontWeight: 'bold' }}>::</span></td>
                  <td><div className="fw-bold text-dark">{link.customLabel || link.type}</div><small className="text-muted">{link.type}</small></td>
                  <td>{link.clicks || link.clickCount || 0}</td>
                  <td><div onClick={() => toggleLinkStatus(link.id)} style={{ cursor: 'pointer' }}>{link.isEnabled !== false ? <ToggleRight size={24} style={{ color: '#5e35b1' }} /> : <ToggleLeft size={24} className="text-muted" />}</div></td>
                  <td className="text-end">
                    <button onClick={() => { setEditingLink(link); setShowLinksModal(true); }} className="btn btn-sm btn-light me-2 rounded-circle"><Edit2 size={16} className="text-muted" /></button>
                    <button onClick={() => deleteLink(link.id)} className="btn btn-sm btn-light rounded-circle"><Trash2 size={16} className="text-danger" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showProfileModal && <ProfileDetails profile={profile} setProfile={setProfile} saving={saving} handleSaveProfile={handleSaveProfile} handlePicUpload={handlePicUpload} onClose={() => setShowProfileModal(false)} />}
      {showLinksModal && <CallToActionButtons profile={profile} saveLinks={saveLinks} editingItem={editingLink} onClose={() => setShowLinksModal(false)} />}

      {/* ===== THEME MODAL ===== */}
      {showThemeModal && (
        <>
          <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}></div>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '850px' }}>
              <div className="modal-content border-0 overflow-hidden" style={{ borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                
                <div className="row g-0">
                  {/* Left Column: Controls */}
                  <div className="col-md-5 d-flex flex-column p-4 p-md-5" style={{ backgroundColor: '#ffffff' }}>
                    <div className="mb-auto">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Palette size={24} className="text-primary" />
                        <h4 className="fw-bold mb-0 text-dark">Theme Engine</h4>
                      </div>
                      <p className="text-muted small mb-4">Choose a design that perfectly matches your brand identity.</p>

                      <div className="mb-4">
                        <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Select Template</label>
                        <div className="position-relative">
                          <select
                            className="form-select fw-bold w-100 shadow-sm"
                            value={previewTheme}
                            onChange={(e) => setPreviewTheme(e.target.value)}
                            style={{ 
                              fontSize: '15px', 
                              padding: '14px 16px', 
                              borderRadius: '12px', 
                              border: `2px solid ${p.accentColor || '#cbd5e1'}`, 
                              backgroundColor: '#f8fafc', 
                              cursor: 'pointer', 
                              appearance: 'none',
                              color: '#1e293b',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            {PERSONAL_QR_THEMES.map(t => (
                              <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                            ))}
                          </select>
                          <div className="position-absolute" style={{ right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.accentColor || '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Color Palette</label>
                        <div className="d-flex gap-2 p-3 rounded-3" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div className="rounded-circle shadow-sm border" style={{ width: '32px', height: '32px', backgroundColor: p.pageBg }} title="Page Background"></div>
                          <div className="rounded-circle shadow-sm border" style={{ width: '32px', height: '32px', backgroundColor: p.headerBg || p.cardBg }} title="Header Background"></div>
                          <div className="rounded-circle shadow-sm border" style={{ width: '32px', height: '32px', backgroundColor: p.cardBg }} title="Card Background"></div>
                          <div className="rounded-circle shadow-sm border" style={{ width: '32px', height: '32px', backgroundColor: p.accentColor }} title="Accent Color"></div>
                          <div className="rounded-circle shadow-sm border" style={{ width: '32px', height: '32px', backgroundColor: p.textColor }} title="Text Color"></div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="form-label fw-bold text-dark mb-1" style={{ fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>About this theme</label>
                        <p className="text-muted small lh-sm">{previewConfig.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-top d-flex gap-2">
                      <button type="button" className="btn btn-light flex-grow-1 fw-bold text-secondary" style={{ borderRadius: '10px' }} onClick={() => { setShowThemeModal(false); setPreviewTheme(currentTheme); }}>Cancel</button>
                      <button
                        type="button"
                        className="btn fw-bold text-white flex-grow-1"
                        style={{ 
                          background: p.accentColor === '#000000' || p.accentColor === '#1a1a1a' ? '#333' : p.accentColor, 
                          borderRadius: '10px',
                          boxShadow: `0 4px 12px ${p.accentColor}40`
                        }}
                        onClick={() => handleUpdateTheme(previewTheme)}
                        disabled={currentTheme === previewTheme}
                      >
                        {currentTheme === previewTheme ? '✓ Active' : 'Apply Theme'}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Phone Preview */}
                  <div className="col-md-7 d-flex align-items-center justify-content-center p-4 p-md-5" style={{ backgroundColor: '#f1f5f9', position: 'relative' }}>
                    
                    {/* Decorative Background Blob */}
                    <div style={{ position: 'absolute', width: '300px', height: '300px', background: p.accentColor, filter: 'blur(80px)', opacity: 0.15, borderRadius: '50%', zIndex: 0 }}></div>

                    {/* Phone Frame */}
                    <div
                      style={{
                        width: '280px',
                        height: '560px',
                        borderRadius: '44px',
                        border: '8px solid #0f172a',
                        boxShadow: '0 0 0 2px #334155, 0 25px 50px -12px rgba(0,0,0,0.5)',
                        background: '#000',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {/* Screen (inner bounds to hide iframe corners correctly) */}
                      <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '36px', background: '#fff', position: 'relative' }}>
                        
                        {/* Notch */}
                        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '120px', zIndex: 10, background: '#0f172a', height: '28px', borderBottomLeftRadius: '18px', borderBottomRightRadius: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1e293b' }}></div>
                          <div style={{ width: '40px', height: '6px', borderRadius: '4px', background: '#1e293b' }}></div>
                        </div>
  
                        {/* Live Iframe Preview */}
                        <iframe 
                          src={`/${profile.qrToken}?previewTheme=${previewTheme}`} 
                          title="Live Preview" 
                          style={{ width: '100%', height: '100%', border: 'none' }}
                        />
                      </div>
                      
                      {/* Hardware Buttons */}
                      <div style={{ position: 'absolute', right: '-12px', top: '120px', width: '4px', height: '60px', background: '#334155', borderTopRightRadius: '4px', borderBottomRightRadius: '4px' }}></div>
                      <div style={{ position: 'absolute', left: '-12px', top: '100px', width: '4px', height: '40px', background: '#334155', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px' }}></div>
                      <div style={{ position: 'absolute', left: '-12px', top: '150px', width: '4px', height: '40px', background: '#334155', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showQrModal && <QRPreview profileToken={profile.qrToken} handleDownloadQR={handleDownloadQR} onClose={() => setShowQrModal(false)} />}
    </div>
  );
};

export default PersonalQRDashboard;
