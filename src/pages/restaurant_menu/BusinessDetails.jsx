import React, { useState, useEffect, useRef } from 'react';
import { restaurantService } from '../../services/restaurantService';
import syncService from '../../services/syncService';

const BusinessDetails = () => {
  const [business, setBusiness] = useState({ name: '', phone: '', address: '', logo: '' });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    fetchBusinessDetails();

    // Instant real-time cross-tab sync
    const unsubscribe = syncService.subscribe(() => {
      if (!isDirtyRef.current) {
        fetchBusinessDetails(true);
      }
    });

    // Gentle 10-second idle background refresh (only when tab is active)
    const interval = setInterval(() => {
      if (document.hidden) return;
      if (!isDirtyRef.current) {
        fetchBusinessDetails(true);
      }
    }, 10000);

    const onFocusOrVisible = () => {
      if (!isDirtyRef.current) {
        fetchBusinessDetails(true);
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
  }, []);

  const fetchBusinessDetails = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setErrorMsg('');
      const data = await restaurantService.getBusinessDetails();
      if (data && data.name) {
        setBusiness({
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
          logo: data.logo || '',
        });
        setIsDirty(false);
        isDirtyRef.current = false;
      }
    } catch (err) {
      console.warn('Could not load business details from backend:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleChange = (e) => {
    setBusiness({ ...business, [e.target.name]: e.target.value });
    setSaved(false);
    setIsDirty(true);
    isDirtyRef.current = true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setErrorMsg('');
      await restaurantService.saveBusinessDetails(business);
      setSaved(true);

      // Sync local session and update Sidebar header immediately
      const current = localStorage.getItem('auth_user');
      if (current && business.name) {
        const parsed = JSON.parse(current);
        parsed.name = business.name;
        localStorage.setItem('auth_user', JSON.stringify(parsed));
        window.dispatchEvent(new Event('auth_user_updated'));
      }

      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save business details.');
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusiness({ ...business, logo: reader.result });
        setSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid p-0 text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading business details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      <h2 className="fw-bold mb-4">Business Details</h2>
      
      <div className="card shadow-sm border-0 rounded-4 p-4">
        {saved && <div className="alert alert-success">Business details saved successfully!</div>}
        {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Business Name</label>
              <input 
                type="text" 
                className="form-control" 
                name="name" 
                value={business.name || ''} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Contact Phone</label>
              <input 
                type="text" 
                className="form-control" 
                name="phone" 
                value={business.phone || ''} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="col-12 mb-3">
              <label className="form-label fw-bold">Address</label>
              <textarea 
                className="form-control" 
                name="address" 
                value={business.address || ''} 
                onChange={handleChange} 
                rows="3" 
                required 
              ></textarea>
            </div>
            
            <div className="col-12 mb-4">
              <label className="form-label fw-bold">Logo Upload</label>
              <input 
                type="file" 
                className="form-control" 
                accept="image/*" 
                onChange={handleLogoUpload} 
              />
              {business.logo && (
                <div className="mt-3">
                  <p className="text-muted mb-2">Logo Preview:</p>
                  <img src={business.logo} alt="Logo" style={{ height: '100px', borderRadius: '8px', objectFit: 'contain', background: '#fff', padding: '10px', border: '1px solid #e2e8f0' }} />
                </div>
              )}
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary px-4 py-2 fw-bold" style={{ backgroundColor: '#5e35b1', border: 'none', borderRadius: '8px' }}>
            Save Details
          </button>
        </form>
      </div>
    </div>
  );
};

export default BusinessDetails;
