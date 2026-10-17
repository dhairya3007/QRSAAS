import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import syncService from '../../services/syncService';
import {
  Phone, Share2, Mail, MapPin, Globe, ExternalLink,
  Download, MessageSquare, Image, FileText, Video
} from 'lucide-react';
import { Spinner } from 'reactstrap';
import { PERSONAL_QR_THEMES } from './themes/personalQrThemes';

const PublicCard = () => {
  const { token } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [shareCountryCode, setShareCountryCode] = useState('91');
  const [sharePhone, setSharePhone] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  // Carousel states
  const [sliderIndex, setSliderIndex] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);

  // Modals state
  const [activeMediaItem, setActiveMediaItem] = useState(null);
  const [activeTextItem, setActiveTextItem] = useState(null);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', message: '' });
  const [inquiryStatus, setInquiryStatus] = useState('');

  useEffect(() => {
    if (token) {
      publicService.incrementScanCount(token);
    }

    const loadProfile = async () => {
      try {
        const response = await publicService.getPublicPersonalCard(token);
        setData(prev => JSON.stringify(prev) === JSON.stringify(response) ? prev : response);
        if (response?.profile) {
          document.title = `${response.profile.firstName} ${response.profile.lastName} - Digital Profile`;
        }
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load card');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    // Real-time instant cross-tab sync
    const unsubscribe = syncService.subscribe(() => {
      if (!showShareModal && !showInquiryModal && !activeMediaItem && !activeTextItem) {
        loadProfile();
      }
    });

    // Background polling (3s) when page is active on screen
    const interval = setInterval(() => {
      if (document.hidden) return;
      if (!showShareModal && !showInquiryModal && !activeMediaItem && !activeTextItem) {
        loadProfile();
      }
    }, 3000);

    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible' && !showShareModal && !showInquiryModal && !activeMediaItem && !activeTextItem) {
        loadProfile();
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
  }, [token, showShareModal, showInquiryModal, activeMediaItem, activeTextItem]);


  // Auto-play slider
  useEffect(() => {
    let interval;
    const activeLinks = data?.profile?.links?.filter(l => l.isEnabled) || [];
    const sliderLink = activeLinks.find(l => l.type === 'Slider');
    
    if (sliderLink && sliderLink.mediaItems?.length > 1) {
      interval = setInterval(() => {
        setSliderIndex(prev => (prev + 1) % sliderLink.mediaItems.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [data]);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
        <Spinner color="primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light p-4 text-center">
        <div className="bg-white p-5 rounded-4 shadow-sm">
          <h2 className="text-danger fw-bold mb-3">Card Not Found</h2>
          <p className="text-muted">{error || 'This digital card is invalid or currently disabled.'}</p>
        </div>
      </div>
    );
  }

  const { client, profile } = data;

  const searchParams = new URLSearchParams(location.search);
  const previewTheme = searchParams.get('previewTheme');

  // Resolve theme config — falls back to 'minimal' if unknown
  const themeId = previewTheme || profile?.theme || 'minimal';
  const themeConfig = PERSONAL_QR_THEMES.find(t => t.id === themeId) || PERSONAL_QR_THEMES[0];
  const tc = themeConfig.preview; // shorthand


  const getIconForType = (type, category) => {
    if (category === 'Media') {
      if (type === 'Video') return <Video size={20} />;
      return <Image size={20} />;
    }
    switch (type) {
      case 'Call': return <Phone size={20} />;
      case 'WhatsApp': return <MessageSquare size={20} />;
      case 'Share': return <Share2 size={20} />;
      case 'Email': return <Mail size={20} />;
      case 'Location': return <MapPin size={20} />;
      case 'Website': return <Globe size={20} />;
      case 'Download': return <Download size={20} />;
      case 'Inquiry Form': return <FileText size={20} />;
      default: return <ExternalLink size={20} />;
    }
  };

  // Click Handler for CTA
  const handleCtaClick = (link) => {
    // Fire-and-forget increment
    publicService.incrementLinkClick(token, link.id).catch(console.error);

    if (link.type === 'Share') {
      setShowShareModal(true);
    } else if (link.type === 'WhatsApp') {
      const code = link.countryCode ? link.countryCode.replace('+', '') : '91';
      const num = (link.value || '').replace(/\D/g, '');
      if (num) {
        window.open(`https://wa.me/${code}${num}`, '_blank');
      } else {
        alert('WhatsApp number is not configured.');
      }
    } else if (link.type === 'Call') {
      const code = link.countryCode || '+91';
      const num = (link.value || '').trim();
      window.location.href = `tel:${code}${num}`;
    } else if (link.type === 'Download') {
      if (link.file && link.file.src) {
        const a = document.createElement('a');
        a.href = link.file.src;
        a.download = link.file.name || 'downloaded-file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (link.value) {
        const a = document.createElement('a');
        a.href = link.value;
        a.download = link.customLabel || 'downloaded-file';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert('No file available for download.');
      }
    } else if (link.type === 'Inquiry Form') {
      setShowInquiryModal(true);
    } else if (link.category === 'Media') {
      setActiveMediaItem(link);
      setMediaIndex(0);
    } else if (link.type === 'Text') {
      setActiveTextItem(link);
    } else if (link.type === 'Email') {
      window.location.href = `mailto:${link.value}`;
    } else {
      let url = link.value;
      if (url && !url.startsWith('http') && !url.startsWith('upi://')) url = 'https://' + url;
      if (url) window.open(url, '_blank');
    }
  };

  const handleShareSubmit = () => {
    if (!sharePhone) return alert('Enter a valid WhatsApp number');
    const text = encodeURIComponent(`Check out this digital profile: ${window.location.href}`);
    window.open(`https://wa.me/${shareCountryCode}${sharePhone}?text=${text}`, '_blank');
    setShowShareModal(false);
    setSharePhone('');
  };

  const submitInquiry = async (e) => {
    e.preventDefault();
    setInquiryStatus('submitting');
    try {
      await publicService.submitInquiry(token, inquiryForm);
      setInquiryStatus('success');
      setTimeout(() => {
        setShowInquiryModal(false);
        setInquiryStatus('');
        setInquiryForm({ name: '', email: '', message: '' });
      }, 2000);
    } catch (err) {
      alert('Failed to submit inquiry: ' + (err.message || 'Server error'));
      setInquiryStatus('');
    }
  };

  // Find slider to render at the top
  const activeLinks = profile.links?.filter(l => l.isEnabled) || [];
  const sliderLink = activeLinks.find(l => l.type === 'Slider');
  const otherLinks = activeLinks.filter(l => l.type !== 'Slider');

  return (
    <div className="min-vh-100 w-100 d-flex justify-content-center" style={{ background: '#1a1a2e' }}>
      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="min-vh-100 position-relative shadow-lg" style={{ width: '100%', maxWidth: '480px', overflowX: 'hidden', background: tc.pageBg, color: tc.textColor, transition: 'all 0.4s ease' }}>
      {/* Dynamic Header: Either a Slider or a Gradient */}
      {sliderLink && sliderLink.mediaItems?.length > 0 ? (
        <div id="profileSlider" className="carousel slide" style={{ height: '300px' }}>
          <div className="carousel-inner h-100" style={{ borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px', overflow: 'hidden' }}>
            {sliderLink.mediaItems.map((media, idx) => (
              <div key={idx} className={`carousel-item h-100 ${idx === sliderIndex ? 'active' : ''}`}>
                <img src={media.src || media.url} className="d-block w-100 h-100" style={{ objectFit: 'cover' }} alt={`Slide ${idx}`} />
                <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.5))' }}></div>
                {media.label && (
                  <div className="position-absolute bottom-0 start-0 w-100 p-3 text-center z-1" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                    <h5 className="text-white mb-0 fw-bold">{media.label}</h5>
                  </div>
                )}
              </div>
            ))}
          </div>
          {sliderLink.mediaItems.length > 1 && (
            <>
              <button 
                className="carousel-control-prev" 
                type="button" 
                onClick={() => setSliderIndex(prev => prev === 0 ? sliderLink.mediaItems.length - 1 : prev - 1)}
              >
                <span className="carousel-control-prev-icon" aria-hidden="true"></span>
              </button>
              <button 
                className="carousel-control-next" 
                type="button" 
                onClick={() => setSliderIndex(prev => (prev + 1) % sliderLink.mediaItems.length)}
              >
                <span className="carousel-control-next-icon" aria-hidden="true"></span>
              </button>
            </>
          )}
        </div>
      ) : themeConfig.layout === 'cover' ? (
        <div className="w-100 position-relative" style={{ height: '380px', transition: 'all 0.4s ease' }}>
          {profile.profilePic ? (
            <img src={profile.profilePic} className="w-100 h-100" style={{ objectFit: 'cover' }} alt="Cover" />
          ) : (
            <div className="w-100 h-100" style={{ background: tc.headerBg }}></div>
          )}
          <div className="position-absolute bottom-0 start-0 w-100" style={{ height: '150px', background: `linear-gradient(to top, ${tc.pageBg}, transparent)` }}></div>
        </div>
      ) : themeConfig.layout !== 'minimal' ? (
        <div className="w-100" style={{ height: '220px', background: tc.headerBg, borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px', transition: 'background 0.4s ease' }}></div>
      ) : (
        <div className="w-100" style={{ height: '80px', transition: 'background 0.4s ease' }}></div>
      )}
      <div className="container px-3" style={{ marginTop: sliderLink ? '20px' : (themeConfig.layout === 'cover' ? '-100px' : (themeConfig.layout === 'classic' || themeConfig.layout === 'center' ? '-80px' : (themeConfig.layout === 'minimal' ? '20px' : '-80px'))), maxWidth: '480px', position: 'relative', zIndex: 10 }}>
        {/* Profile Section (Dynamic Layouts) */}
        {themeConfig.layout === 'cover' ? (
          // Cover Layout (Profile pic is in the header, just text here)
          <div className="text-center mb-4">
            <h1 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px', color: tc.textColor, fontSize: 'clamp(1.5rem, 8vw, 2.2rem)', textShadow: '0 2px 10px rgba(0,0,0,0.1)', wordBreak: 'break-word' }}>{profile.firstName} {profile.lastName}</h1>
            {profile.designation && <p style={{ color: tc.accentColor, fontWeight: '700', fontSize: '1.2rem', marginBottom: '16px' }}>{profile.designation}</p>}
            {profile.bio && <p className="mb-0 px-3 opacity-85 fw-medium" style={{ color: tc.textColor }}>{profile.bio}</p>}
          </div>
        ) : themeConfig.layout === 'minimal' ? (
          // Minimal Layout
          <div className="text-center mb-4">
            <div className="rounded-circle overflow-hidden mx-auto shadow-sm" style={{ width: '130px', height: '130px', background: tc.headerBg, border: `4px solid ${tc.accentColor}40` }}>
              {profile.profilePic ? (
                <img src={profile.profilePic} alt="Profile" className="w-100 h-100" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="w-100 h-100 d-flex align-items-center justify-content-center fw-bold fs-1" style={{ color: '#fff' }}>
                  {profile.firstName?.charAt(0) || client.name?.charAt(0) || 'A'}
                </div>
              )}
            </div>
            <div className="mt-4" style={{ minWidth: 0 }}>
              <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px', color: tc.textColor, fontSize: 'clamp(1.4rem, 7vw, 2rem)', wordBreak: 'break-word' }}>{profile.firstName} {profile.lastName}</h2>
              {profile.designation && <p style={{ color: tc.accentColor, fontWeight: '600', fontSize: '1.1rem', marginBottom: '16px' }}>{profile.designation}</p>}
              {profile.bio && <p className="mb-0 px-3 opacity-75" style={{ color: tc.textColor }}>{profile.bio}</p>}
            </div>
          </div>
        ) : themeConfig.layout === 'left' ? (
          // Left-aligned Layout
          <div className="rounded-4 shadow-sm p-4 mb-4 position-relative" style={{ background: tc.cardBg, border: `1px solid ${tc.accentColor}22`, transition: 'all 0.4s ease' }}>
            <div className="d-flex align-items-center gap-3" style={{ marginTop: '-40px' }}>
              <div className="rounded-4 overflow-hidden shadow-sm" style={{ width: '100px', height: '100px', background: tc.headerBg, border: `4px solid ${tc.pageBg}`, flexShrink: 0 }}>
                {profile.profilePic ? (
                  <img src={profile.profilePic} alt="Profile" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="w-100 h-100 d-flex align-items-center justify-content-center fw-bold fs-1" style={{ color: '#fff' }}>
                    {profile.firstName?.charAt(0) || client.name?.charAt(0) || 'A'}
                  </div>
                )}
              </div>
              <div className="mt-3 flex-grow-1" style={{ minWidth: 0 }}>
                <h3 className="fw-bold mb-0" style={{ letterSpacing: '-0.5px', color: tc.textColor, fontSize: 'clamp(1.1rem, 5.5vw, 1.5rem)', wordBreak: 'break-word' }}>{profile.firstName} {profile.lastName}</h3>
                {profile.designation && <p style={{ color: tc.accentColor, fontWeight: '600', marginBottom: '0' }}>{profile.designation}</p>}
              </div>
            </div>
            {profile.bio && <p className="mt-4 mb-0 opacity-75" style={{ color: tc.textColor }}>{profile.bio}</p>}
          </div>
        ) : themeConfig.layout === 'glass' ? (
          // Glassmorphism Layout
          <div className="rounded-4 p-4 text-center mb-4 position-relative" style={{ 
            background: tc.cardBg, 
            backdropFilter: 'blur(16px)', 
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid rgba(255,255,255,0.1)`, 
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            transition: 'all 0.4s ease' 
          }}>
            <div
              className="rounded-circle overflow-hidden mx-auto shadow border-4"
              style={{ width: '120px', height: '120px', marginTop: '-60px', background: tc.headerBg, border: `4px solid transparent` }}
            >
              {profile.profilePic ? (
                <img src={profile.profilePic} alt="Profile" className="w-100 h-100" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="w-100 h-100 d-flex align-items-center justify-content-center fw-bold fs-1" style={{ color: '#fff' }}>
                  {profile.firstName?.charAt(0) || client.name?.charAt(0) || 'A'}
                </div>
              )}
            </div>
            <div className="mt-3" style={{ minWidth: 0 }}>
              <h3 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px', color: tc.textColor, fontSize: 'clamp(1.3rem, 6.5vw, 1.75rem)', wordBreak: 'break-word' }}>{profile.firstName} {profile.lastName}</h3>
              {profile.designation && <p style={{ color: tc.accentColor, fontWeight: '600', fontSize: '1.1rem', marginBottom: '16px' }}>{profile.designation}</p>}
              {profile.bio && <p className="mb-0 small px-2 opacity-80" style={{ color: tc.textColor }}>{profile.bio}</p>}
            </div>
          </div>
        ) : (
          // Center & Classic Layouts
          <div className="rounded-4 shadow-sm p-4 text-center mb-4 position-relative" style={{ background: tc.cardBg, border: `1px solid ${tc.accentColor}22`, transition: 'all 0.4s ease' }}>
            <div
              className="rounded-circle overflow-hidden mx-auto shadow-sm border-4"
              style={{ width: '120px', height: '120px', marginTop: themeConfig.layout === 'classic' ? '0' : '-60px', background: tc.headerBg, border: `4px solid ${tc.pageBg}` }}
            >
              {profile.profilePic ? (
                <img src={profile.profilePic} alt="Profile" className="w-100 h-100" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="w-100 h-100 d-flex align-items-center justify-content-center fw-bold fs-1" style={{ color: '#fff' }}>
                  {profile.firstName?.charAt(0) || client.name?.charAt(0) || 'A'}
                </div>
              )}
            </div>
            <div className="mt-3" style={{ minWidth: 0 }}>
              <h3 className="fw-bold mb-1" style={{ letterSpacing: '-0.5px', color: tc.textColor, fontSize: 'clamp(1.3rem, 6.5vw, 1.75rem)', wordBreak: 'break-word' }}>{profile.firstName} {profile.lastName}</h3>
              {profile.designation && <p style={{ color: tc.accentColor, fontWeight: '600', fontSize: '1.1rem', marginBottom: '16px' }}>{profile.designation}</p>}
              {profile.bio && <p className="mb-0 small px-2 opacity-75" style={{ color: tc.textColor }}>{profile.bio}</p>}
            </div>
          </div>
        )}

        {/* Education Tags */}
        {(profile.educationCollege || profile.educationMasters || profile.educationPhD) && (
          <div className="rounded-4 shadow-sm p-4 mb-4" style={{
            background: themeConfig.layout === 'glass' ? tc.cardBg : '#ffffff',
            backdropFilter: themeConfig.layout === 'glass' ? 'blur(16px)' : 'none',
            WebkitBackdropFilter: themeConfig.layout === 'glass' ? 'blur(16px)' : 'none',
            border: themeConfig.layout === 'glass' ? `1px solid rgba(255,255,255,0.1)` : 'none'
          }}>
            <h6 className="fw-bold mb-3" style={{ color: themeConfig.layout === 'glass' ? tc.textColor : '#212529' }}>Education & Background</h6>
            <div className="d-flex flex-wrap gap-2">
              {profile.educationCollege && <span className="badge border px-3 py-2" style={{ background: themeConfig.layout === 'glass' ? 'rgba(255,255,255,0.1)' : '#f8f9fa', color: themeConfig.layout === 'glass' ? tc.textColor : '#212529', borderColor: themeConfig.layout === 'glass' ? 'rgba(255,255,255,0.2)' : '#dee2e6' }}>{profile.educationCollege}</span>}
              {profile.educationMasters && <span className="badge border px-3 py-2" style={{ background: themeConfig.layout === 'glass' ? 'rgba(255,255,255,0.1)' : '#f8f9fa', color: themeConfig.layout === 'glass' ? tc.textColor : '#212529', borderColor: themeConfig.layout === 'glass' ? 'rgba(255,255,255,0.2)' : '#dee2e6' }}>{profile.educationMasters}</span>}
              {profile.educationPhD && <span className="badge border px-3 py-2" style={{ background: themeConfig.layout === 'glass' ? 'rgba(255,255,255,0.1)' : '#f8f9fa', color: themeConfig.layout === 'glass' ? tc.textColor : '#212529', borderColor: themeConfig.layout === 'glass' ? 'rgba(255,255,255,0.2)' : '#dee2e6' }}>{profile.educationPhD}</span>}
            </div>
          </div>
        )}

        {/* CTA Links (Icon Grid Layout) */}
        {otherLinks.length > 0 && (
          <div className="d-flex flex-wrap justify-content-center gap-4 pb-5 pt-3">
            {otherLinks.map(link => (
              <button
                key={link.id}
                onClick={() => handleCtaClick(link)}
                className="btn p-0 border-0 d-flex flex-column align-items-center"
                style={{
                  background: 'transparent',
                  transition: 'transform 0.2s, opacity 0.2s',
                  width: '72px',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.opacity = '1'; }}
                title={link.customLabel || link.type}
              >
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center shadow-sm mb-2"
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    backgroundColor: themeConfig.layout === 'glass' ? 'rgba(255,255,255,0.15)' : tc.cardBg, 
                    backdropFilter: themeConfig.layout === 'glass' ? 'blur(12px)' : 'none',
                    WebkitBackdropFilter: themeConfig.layout === 'glass' ? 'blur(12px)' : 'none',
                    color: themeConfig.layout === 'glass' ? '#ffffff' : tc.accentColor,
                    border: themeConfig.layout === 'glass' ? `1px solid rgba(255,255,255,0.4)` : `1px solid ${tc.accentColor}30`,
                    boxShadow: themeConfig.layout === 'glass' ? `0 8px 32px rgba(0,0,0,0.2)` : `0 4px 12px ${tc.accentColor}20`
                  }}
                >
                  {React.cloneElement(getIconForType(link.type, link.category), { size: 24 })}
                </div>
                <span className="text-truncate w-100 text-center fw-bold" style={{ 
                  color: themeConfig.layout === 'glass' ? '#ffffff' : tc.textColor, 
                  fontSize: '12px', 
                  opacity: 0.95,
                  textShadow: themeConfig.layout === 'glass' ? '0 2px 4px rgba(0,0,0,0.6)' : 'none'
                }}>
                  {link.customLabel || link.type}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-4">
          <small style={{ 
            color: themeConfig.layout === 'glass' ? '#ffffff' : tc.textColor, 
            opacity: themeConfig.layout === 'glass' ? 0.7 : 0.4,
            textShadow: themeConfig.layout === 'glass' ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
          }}>
            Created with Personal QR Builder
          </small>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <>
          <div className="modal-backdrop fade show" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}></div>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1055, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
            <div className="modal-dialog modal-dialog-centered mx-auto" style={{ maxWidth: '440px', width: 'calc(100% - 2rem)' }}>
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                  <h5 className="modal-title fw-bold">Share to WhatsApp</h5>
                  <button type="button" className="btn-close" onClick={() => setShowShareModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <button 
                    onClick={() => {
                      const text = encodeURIComponent(`Check out ${profile.firstName || 'this'}'s digital profile: ${window.location.href}`);
                      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                      setShowShareModal(false);
                    }}
                    className="btn w-100 fw-bold py-3 rounded-3 text-white mb-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <MessageSquare size={18} /> Share to WhatsApp Contact
                  </button>

                  <div className="text-center text-muted small my-3 fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                    — OR SEND TO A SPECIFIC NUMBER —
                  </div>

                  <label className="form-label small fw-bold text-muted">Enter WhatsApp Number</label>
                  <div className="input-group mb-3">
                    <select className="form-select bg-light" style={{ maxWidth: '100px' }} value={shareCountryCode} onChange={(e) => setShareCountryCode(e.target.value)}>
                      <option value="91">+91 (IN)</option>
                      <option value="1">+1 (US)</option>
                      <option value="44">+44 (UK)</option>
                    </select>
                    <input type="number" className="form-control p-3" placeholder="e.g. 9876543210" value={sharePhone} onChange={(e) => setSharePhone(e.target.value)} />
                  </div>
                  <button onClick={handleShareSubmit} className="btn btn-outline-success w-100 fw-bold py-2 rounded-3">
                    Send to This Number
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Inquiry Form Modal */}
      {showInquiryModal && (
        <>
          <div className="modal-backdrop fade show" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}></div>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1055, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
            <div className="modal-dialog modal-dialog-centered mx-auto" style={{ maxWidth: '440px', width: 'calc(100% - 2rem)' }}>
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                  <h5 className="modal-title fw-bold">Send an Inquiry</h5>
                  <button type="button" className="btn-close" onClick={() => setShowInquiryModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  {inquiryStatus === 'success' ? (
                    <div className="text-center py-4">
                      <div className="text-success mb-3"><MessageSquare size={48} /></div>
                      <h5 className="fw-bold text-success">Message Sent!</h5>
                      <p className="text-muted">Thank you. {profile.firstName} will get back to you soon.</p>
                    </div>
                  ) : (
                    <form onSubmit={submitInquiry}>
                      <div className="mb-3">
                        <label className="form-label small fw-bold text-muted">Your Name</label>
                        <input required type="text" className="form-control p-3 bg-light border-0" value={inquiryForm.name} onChange={e => setInquiryForm({...inquiryForm, name: e.target.value})} placeholder="John Doe" />
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-bold text-muted">Your Email or Phone</label>
                        <input required type="text" className="form-control p-3 bg-light border-0" value={inquiryForm.email} onChange={e => setInquiryForm({...inquiryForm, email: e.target.value})} placeholder="john@example.com" />
                      </div>
                      <div className="mb-4">
                        <label className="form-label small fw-bold text-muted">Message</label>
                        <textarea required className="form-control p-3 bg-light border-0" rows="3" value={inquiryForm.message} onChange={e => setInquiryForm({...inquiryForm, message: e.target.value})} placeholder="How can I help you?"></textarea>
                      </div>
                      <button type="submit" disabled={inquiryStatus === 'submitting'} className="btn btn-primary w-100 fw-bold py-3 rounded-3" style={{ backgroundColor: '#4f46e5', border: 'none' }}>
                        {inquiryStatus === 'submitting' ? <Spinner size="sm" /> : 'Send Message'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Media Viewer Modal (Gallery/Video) */}
      {activeMediaItem && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 1050 }}></div>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1060, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
            <div className="modal-dialog modal-fullscreen modal-dialog-centered m-0 mx-auto" style={{ maxWidth: '480px', height: '100%' }}>
              <div className="modal-content bg-transparent border-0">
                <div className="modal-header border-0 pb-0 position-absolute top-0 end-0 z-3 p-4">
                  <button type="button" className="btn-close btn-close-white fs-4" onClick={() => setActiveMediaItem(null)}></button>
                </div>
                <div className="modal-body d-flex justify-content-center align-items-center p-0">
                  {activeMediaItem.mediaItems?.length > 1 ? (
                    <div id="mediaViewerCarousel" className="carousel slide w-100 h-100">
                      <div className="carousel-inner h-100">
                        {activeMediaItem.mediaItems.map((media, idx) => (
                          <div key={idx} className={`carousel-item h-100 ${idx === mediaIndex ? 'active' : ''} position-relative`}>
                            <div className="w-100 h-100 d-flex justify-content-center align-items-center">
                              {media.type === 'video' ? (
                                <video src={media.src || media.url} controls className="img-fluid" style={{ maxHeight: '100vh', maxWidth: '100%' }} />
                              ) : (
                                <img src={media.src || media.url} className="img-fluid" style={{ maxHeight: '100vh', maxWidth: '100%', objectFit: 'contain' }} alt={`Media ${idx}`} />
                              )}
                            </div>
                            {media.label && (
                              <div className="position-absolute bottom-0 start-0 w-100 p-4 text-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                                <h4 className="text-white mb-0">{media.label}</h4>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button 
                        className="carousel-control-prev" 
                        type="button" 
                        onClick={() => setMediaIndex(prev => prev === 0 ? activeMediaItem.mediaItems.length - 1 : prev - 1)}
                      >
                        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                      </button>
                      <button 
                        className="carousel-control-next" 
                        type="button" 
                        onClick={() => setMediaIndex(prev => (prev + 1) % activeMediaItem.mediaItems.length)}
                      >
                        <span className="carousel-control-next-icon" aria-hidden="true"></span>
                      </button>
                    </div>
                  ) : activeMediaItem.mediaItems?.length === 1 ? (
                    <div className="w-100 h-100 d-flex justify-content-center align-items-center position-relative">
                      {activeMediaItem.mediaItems[0].type === 'video' ? (
                        <video src={activeMediaItem.mediaItems[0].src || activeMediaItem.mediaItems[0].url} controls className="img-fluid" style={{ maxHeight: '100vh', maxWidth: '100%' }} />
                      ) : (
                        <img src={activeMediaItem.mediaItems[0].src || activeMediaItem.mediaItems[0].url} className="img-fluid" style={{ maxHeight: '100vh', maxWidth: '100%', objectFit: 'contain' }} alt="Media" />
                      )}
                      {activeMediaItem.mediaItems[0].label && (
                        <div className="position-absolute bottom-0 start-0 w-100 p-4 text-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                          <h4 className="text-white mb-0">{activeMediaItem.mediaItems[0].label}</h4>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-white text-center">No media available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Text/Content Viewer Modal */}
      {activeTextItem && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}></div>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1055, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable mx-auto" style={{ maxWidth: '440px', width: 'calc(100% - 2rem)' }}>
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                  <h5 className="fw-bold mb-0 text-dark">{activeTextItem.customLabel || 'Information'}</h5>
                  <button type="button" className="btn-close" onClick={() => setActiveTextItem(null)}></button>
                </div>
                <div className="modal-body p-4 pt-3">
                  <div className="text-dark rich-text-content" dangerouslySetInnerHTML={{ __html: activeTextItem.richText || '<p>No content available.</p>' }}></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
    </div>
  );
};

export default PublicCard;
