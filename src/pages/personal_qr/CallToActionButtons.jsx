import React, { useState } from 'react';
import { 
  Link as LinkIcon, Plus, Trash2, Phone, Mail, Globe, MapPin, 
  Search, MessageCircle, PlayCircle, Image as ImageIcon, CreditCard, 
  ShoppingBag, Smartphone, Camera, Users, MessageSquare,
  ArrowUp, ArrowDown, Edit2, Download, Share2, ClipboardList, Eye, ToggleLeft, ToggleRight
} from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';
import { compressImageUnder50KB, checkMaxFileSize } from '../../utils/imageCompressor';

const CATEGORIES = ['Social Media', 'Non-Social', 'Media', 'Other'];

const COUNTRY_CODES = [
  { name: 'India', code: '+91' },
  { name: 'United States / Canada', code: '+1' },
  { name: 'United Kingdom', code: '+44' },
  { name: 'Australia', code: '+61' },
  { name: 'UAE', code: '+971' },
  { name: 'Singapore', code: '+65' },
  { name: 'Malaysia', code: '+60' },
  { name: 'China', code: '+86' },
  { name: 'Japan', code: '+81' },
  { name: 'Germany', code: '+49' },
  { name: 'France', code: '+33' },
  { name: 'Italy', code: '+39' },
  { name: 'Spain', code: '+34' },
  { name: 'Russia', code: '+7' },
  { name: 'Brazil', code: '+55' },
  { name: 'Mexico', code: '+52' },
  { name: 'South Africa', code: '+27' },
  { name: 'Pakistan', code: '+92' },
  { name: 'Bangladesh', code: '+880' },
  { name: 'Sri Lanka', code: '+94' }
];

const CTA_TYPES = {
  'Social Media': ['YouTube', 'LinkedIn', 'WhatsApp Group / Community', 'Instagram', 'Twitter / X', 'Facebook', 'Android', 'iOS', 'Justdial', 'IndiaMART', 'WeChat', 'Pinterest', 'Website', 'Telegram'],
  'Non-Social': ['UPI Pay', 'Custom', 'Email', 'Location', 'Website', 'Review', 'Payment', 'Digital Card'],
  'Media': ['Gallery', 'Video', 'Slider'],
  'Other': ['Download', 'Share', 'Inquiry Form', 'Call', 'WhatsApp', 'Text']
};

export const getIconForType = (type) => {
  if (!type) return <LinkIcon size={18} />;
  const t = type.toLowerCase();
  if (t.includes('whatsapp') || t.includes('phone') || t.includes('wechat') || t.includes('telegram') || t.includes('call')) return <Phone size={18} />;
  if (t.includes('youtube') || t.includes('video')) return <PlayCircle size={18} />;
  if (t.includes('linkedin')) return <Search size={18} />;
  if (t.includes('instagram')) return <Camera size={18} />;
  if (t.includes('facebook')) return <Users size={18} />;
  if (t.includes('twitter')) return <MessageSquare size={18} />;
  if (t.includes('android') || t.includes('ios')) return <Smartphone size={18} />;
  if (t.includes('email')) return <Mail size={18} />;
  if (t.includes('location')) return <MapPin size={18} />;
  if (t.includes('website') || t.includes('pinterest') || t.includes('digital card')) return <Globe size={18} />;
  if (t.includes('pay') || t.includes('upi')) return <CreditCard size={18} />;
  if (t.includes('gallery') || t.includes('slider')) return <ImageIcon size={18} />;
  if (t.includes('review') || t.includes('justdial') || t.includes('indiamart')) return <ShoppingBag size={18} />;
  if (t.includes('download')) return <Download size={18} />;
  if (t.includes('share')) return <Share2 size={18} />;
  if (t.includes('inquiry')) return <ClipboardList size={18} />;
  return <LinkIcon size={18} />;
};

const CallToActionButtons = ({ profile, saveLinks, editingItem, onClose }) => {
  const isEditing = !!editingItem;
  
  // Form State
  const [category, setCategory] = useState(editingItem?.category || CATEGORIES[0]);
  const [type, setType] = useState(editingItem?.type || CTA_TYPES[CATEGORIES[0]][0]);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState(editingItem?.customLabel || '');
  const [countryCode, setCountryCode] = useState(editingItem?.countryCode || '+91');
  const [value, setValue] = useState(editingItem?.value || '');
  const [mediaItems, setMediaItems] = useState(editingItem?.mediaItems || []);
  const [richText, setRichText] = useState(editingItem?.richText || '');
  const [file, setFile] = useState(editingItem?.file || null);

  const activeLinks = profile.links || [];

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setType(CTA_TYPES[cat][0]);
    resetFormFields();
  };

  const handleTypeChange = (t) => {
    setType(t);
    resetFormFields();
  };

  const resetFormFields = () => {
    setCustomLabel('');
    setValue('');
    setCountryCode('+91');
    setMediaItems([]);
    setRichText('');
    setFile(null);
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const f of files) {
      const isVideo = f.type.startsWith('video/');
      if (isVideo) {
        const { isValid, sizeKb } = checkMaxFileSize(f, 50);
        if (!isValid) {
          alert(`Video "${f.name}" is ${sizeKb}KB. Files must be strictly under 50KB. Please select a smaller video.`);
          continue;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaItems(prev => [...prev, { 
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7), 
            src: reader.result, 
            label: '',
            type: 'video'
          }]);
        };
        reader.readAsDataURL(f);
      } else {
        try {
          const compressedSrc = await compressImageUnder50KB(f);
          setMediaItems(prev => [...prev, { 
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7), 
            src: compressedSrc, 
            label: '',
            type: 'image'
          }]);
        } catch (err) {
          console.error('Failed to compress media image:', err);
        }
      }
    }
    // Clear input so same file can be selected again if removed
    e.target.value = '';
  };

  const handleFileUpload = async (e) => {
    const f = e.target.files[0];
    if (f) {
      if (f.type.startsWith('image/')) {
        try {
          const compressedSrc = await compressImageUnder50KB(f);
          setFile({ name: f.name, src: compressedSrc, size: Math.round(compressedSrc.length * 0.75) });
        } catch (err) {
          console.error('Failed to compress file image:', err);
        }
      } else {
        const { isValid, sizeKb } = checkMaxFileSize(f, 50);
        if (!isValid) {
          alert(`File "${f.name}" is ${sizeKb}KB. All files must be strictly under 50KB. Please choose a smaller file.`);
          e.target.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setFile({ name: f.name, src: reader.result, size: f.size });
        };
        reader.readAsDataURL(f);
      }
    }
    e.target.value = '';
  };

  const updateMediaLabel = (id, label) => {
    setMediaItems(prev => prev.map(m => m.id === id ? { ...m, label } : m));
  };

  const removeMedia = (id) => {
    setMediaItems(prev => prev.filter(m => m.id !== id));
  };

  const handleSaveForm = () => {
    // Only category !== 'Other' or type === 'Download' requires Custom Label
    const needsCustomLabel = category !== 'Other' || type === 'Download';
    if (needsCustomLabel && !customLabel.trim()) {
      return alert('Custom Label is required.');
    }
    
    if (['Social Media', 'Non-Social'].includes(category)) {
      if (!value.trim()) return alert('Value / Link is required.');
    }
    if (category === 'Media' && mediaItems.length === 0) {
      return alert('Upload at least one image or video.');
    }
    if (type === 'Download' && !file) {
      return alert('Please upload a file.');
    }
    if (['Call', 'WhatsApp'].includes(type) && !value.trim()) {
      return alert('Phone/WhatsApp number is required.');
    }
    if (type === 'Text' && !richText.trim()) {
      return alert('Text content is required.');
    }

    const defaultTitle = ['Share', 'Call', 'WhatsApp', 'Inquiry Form', 'Text'].includes(type)
      ? type
      : (customLabel || type);

    const newLinkObj = {
      id: isEditing ? editingItem.id : Date.now().toString(),
      category,
      type,
      customLabel: needsCustomLabel ? customLabel : defaultTitle,
      title: needsCustomLabel ? customLabel : defaultTitle,
      countryCode: ['Call', 'WhatsApp', 'Share'].includes(type) ? countryCode : null,
      value: value || '',
      url: value || '',
      icon: editingItem?.icon || type.toLowerCase(),
      mediaItems: category === 'Media' ? mediaItems : [],
      richText: type === 'Text' ? richText : '',
      file: type === 'Download' ? file : null,
      clicks: editingItem?.clicks || 0,
      displayOrder: editingItem?.displayOrder !== undefined ? editingItem.displayOrder : activeLinks.length,
      isEnabled: isEditing ? (editingItem.isEnabled !== false) : true,
      isActive: isEditing ? (editingItem.isActive !== false) : true
    };

    if (isEditing) {
      saveLinks(activeLinks.map(l => l.id === editingItem.id ? newLinkObj : l));
    } else {
      saveLinks([...activeLinks, newLinkObj]);
    }
    onClose();
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}></div>
      <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow-lg rounded-4">
            <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
              <h4 className="modal-title fw-bold d-flex align-items-center gap-2">
                <LinkIcon size={24} className="text-primary" /> {isEditing ? 'Edit CTA Item' : 'Add New CTA Item'}
              </h4>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <p className="text-muted small px-4 mt-1 mb-0">Create and manage dynamic Call-to-Action items for your personal QR page.</p>
            
            <div className="modal-body p-4 custom-scrollbar" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Category</label>
                  <select 
                    className="form-select border-0 shadow-sm"
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted">Item Type</label>
                  <div className="position-relative">
                    <div 
                      className="form-control border-0 shadow-sm d-flex justify-content-between align-items-center bg-white"
                      onClick={() => setIsTypeOpen(!isTypeOpen)}
                      style={{ cursor: 'pointer' }}
                    >
                      {type}
                      <span className="text-muted" style={{ fontSize: '12px' }}>▼</span>
                    </div>
                    {isTypeOpen && (
                      <div 
                        className="position-absolute w-100 bg-white shadow-sm rounded-3 mt-1 border" 
                        style={{ maxHeight: '200px', overflowY: 'auto', zIndex: 1056 }}
                      >
                        {CTA_TYPES[category].map(t => {
                          const existingTypes = activeLinks.filter(l => !isEditing || l.id !== editingItem.id).map(l => l.type);
                          const isUsed = existingTypes.includes(t);
                          return (
                            <div 
                              key={t} 
                              className={`p-2 border-bottom ${isUsed ? 'text-muted bg-light' : ''}`}
                              style={{ cursor: isUsed ? 'not-allowed' : 'pointer', transition: 'background 0.2s', opacity: isUsed ? 0.6 : 1 }}
                              onMouseEnter={(e) => { if (!isUsed) e.currentTarget.style.backgroundColor = '#f8f9fa' }}
                              onMouseLeave={(e) => { if (!isUsed) e.currentTarget.style.backgroundColor = 'transparent' }}
                              onClick={() => { 
                                if (isUsed) return;
                                handleTypeChange(t); 
                                setIsTypeOpen(false); 
                              }}
                            >
                              {t} {isUsed && <small className="float-end fst-italic">Added</small>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DYNAMIC FIELDS BASED ON TYPE */}
              
              {type === 'Inquiry Form' ? (
                <div className="alert alert-info border-0 shadow-sm">
                  <h6 className="fw-bold"><ClipboardList size={18} className="me-2" /> Inquiry Form Configuration</h6>
                  <p className="mb-2 small">This item uses fixed fields to collect inquiries from your users. End users will see:</p>
                  <ul className="small mb-0">
                    <li>Name (Required)</li>
                    <li>Mobile Number (Required)</li>
                    <li>Email (Optional)</li>
                    <li>Subject (Optional)</li>
                    <li>Message (Optional)</li>
                  </ul>
                </div>
              ) : (
                <div className="row g-3 mb-4">
                  
                  {/* Label Input: Only shown for Social Media, Non-Social, Media, and Download in Other */}
                  {(category !== 'Other' || type === 'Download') && (
                    <div className="col-md-12">
                      <label className="form-label small fw-bold text-muted">Custom Label (Displayed to User)</label>
                      <input 
                        type="text" 
                        className="form-control border-0 shadow-sm p-3" 
                        placeholder={type === 'Download' ? "e.g. Download Brochure" : category === 'Media' ? "e.g. Our Portfolio / Gallery" : "e.g. Follow us on Instagram, Visit Website"}
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                      />
                    </div>
                  )}
                  
                  {/* Value / Link Input */}
                  {['Social Media', 'Non-Social'].includes(category) && (
                    <div className="col-md-12">
                      <label className="form-label small fw-bold text-muted">Value / Link</label>
                      <input 
                        type="text" 
                        className="form-control border-0 shadow-sm p-3" 
                        placeholder={type.includes('Email') ? "company@example.com" : type.includes('Pay') ? "UPI ID" : "https://..."}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Phone / WhatsApp Numbers */}
                  {['Call', 'WhatsApp'].includes(type) && (
                    <div className="col-md-12">
                      <label className="form-label small fw-bold text-muted">
                        Phone / WhatsApp Number
                      </label>
                      <div className="input-group shadow-sm">
                        <input 
                          type="text"
                          list="countryCodes"
                          className="form-control border-0 bg-light" 
                          style={{ maxWidth: '140px' }}
                          placeholder="e.g. +91"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                        />
                        <datalist id="countryCodes">
                          {COUNTRY_CODES.map(c => (
                            <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                          ))}
                        </datalist>
                        <input 
                          type="text" 
                          className="form-control border-0 p-3" 
                          placeholder="9876543210"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Share Info Box */}
                  {type === 'Share' && (
                    <div className="col-md-12">
                      <div className="alert alert-info border-0 shadow-sm m-0">
                        <h6 className="fw-bold"><Share2 size={18} className="me-2" /> Share Button Behavior</h6>
                        <p className="mb-0 small">When visitors click this button on your public card, they will be able to share your profile URL directly to a WhatsApp contact of their choice.</p>
                      </div>
                    </div>
                  )}

                  {/* Download File */}
                  {type === 'Download' && (
                    <div className="col-md-12">
                      <label className="form-label small fw-bold text-muted">File Upload</label>
                      <input 
                        type="file" 
                        className="form-control border-0 shadow-sm p-3"
                        onChange={handleFileUpload}
                      />
                      {file && (
                        <div className="mt-2 p-2 bg-white border rounded d-flex justify-content-between align-items-center shadow-sm">
                          <span className="small text-truncate fw-bold"><Download size={14} className="me-2"/>{file.name}</span>
                          <button type="button" onClick={() => setFile(null)} className="btn btn-sm text-danger p-0"><Trash2 size={16}/></button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rich Text Editor */}
                  {type === 'Text' && (
                    <div className="col-md-12">
                      <label className="form-label small fw-bold text-muted">Content</label>
                      <RichTextEditor value={richText} onChange={setRichText} />
                    </div>
                  )}

                  {/* Media Uploads */}
                  {category === 'Media' && (
                    <div className="col-md-12">
                      <label className="form-label small fw-bold text-muted">Upload Media (Multiple Images or Videos)</label>
                      <input 
                        type="file" 
                        multiple
                        accept={type === 'Video' ? "video/*" : "image/*,video/*"}
                        className="form-control border-0 shadow-sm p-3"
                        onChange={handleMediaUpload}
                      />
                      
                      {mediaItems.length > 0 && (
                        <div className="mt-3 row g-3">
                          {mediaItems.map((item) => (
                            <div key={item.id} className="col-md-4">
                              <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100 position-relative">
                                {item.type === 'video' ? (
                                  <video src={item.src} className="w-100" style={{ height: '120px', objectFit: 'cover' }} />
                                ) : (
                                  <img src={item.src} alt="Upload" className="w-100" style={{ height: '120px', objectFit: 'cover' }} />
                                )}
                                <button 
                                  type="button"
                                  onClick={() => removeMedia(item.id)} 
                                  className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle shadow p-1"
                                  style={{ width: '28px', height: '28px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Trash2 size={14}/>
                                </button>
                                
                                <div className="p-2 bg-white">
                                  <label className="form-label mb-1" style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>Custom Label</label>
                                  <input 
                                    type="text" 
                                    className="form-control form-control-sm border-1 shadow-none" 
                                    placeholder="Add custom label..." 
                                    value={item.label || ''}
                                    onChange={(e) => updateMediaLabel(item.id, e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                </div>
              )}

              <button onClick={handleSaveForm} className="btn btn-primary w-100 rounded-pill py-3 fw-bold mt-2 shadow-sm">
                {isEditing ? 'Save Changes' : 'Create Item'}
              </button>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CallToActionButtons;
