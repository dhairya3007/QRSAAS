import React, { useEffect, useState } from 'react';
import { Store, Layers, Utensils, QrCode, ExternalLink, Download, Palette, ToggleRight, ToggleLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';
import { authService } from '../../services/authService';
import syncService from '../../services/syncService';
import { RESTAURANT_THEMES } from './themes/restaurantThemes';
import { compressImageUnder50KB } from '../../utils/imageCompressor';

const RestaurantMenuDashboard = () => {
  const [stats, setStats] = useState({ categories: 0, dishes: 0, scanCount: 0 });
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dishTypes, setDishTypes] = useState([]);
  const [isActive, setIsActive] = useState(true);

  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalTab, setCategoryModalTab] = useState('categories'); // 'categories' | 'types'
  const [showDishModal, setShowDishModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const [business, setBusiness] = useState({ name: '', phone: '', address: '', logo: '' });
  const [newCategory, setNewCategory] = useState('');
  const [newDishType, setNewDishType] = useState('');
  const [newDish, setNewDish] = useState({ name: '', price: '', quantity: '', type: 'Veg', categoryId: '', image: '' });
  const [editDishId, setEditDishId] = useState(null);

  const user = authService.getCurrentUser();
  const [currentTheme, setCurrentTheme] = useState(user?.theme || 'modern');
  const [previewTheme, setPreviewTheme] = useState(user?.theme || 'modern');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Instant cross-tab & cross-window real-time synchronization
    const unsubscribe = syncService.subscribe((payload) => {
      if (!showBusinessModal && !showCategoryModal && !showDishModal && !showThemeModal && !showQrModal) {
        fetchData(true);
      }
    });

    // Gentle 10-second idle background refresh (only when tab is active)
    const interval = setInterval(() => {
      if (document.hidden) return;
      if (!showBusinessModal && !showCategoryModal && !showDishModal && !showThemeModal && !showQrModal) {
        fetchData(true);
      }
    }, 10000);

    const onFocusOrVisible = () => {
      if (!showBusinessModal && !showCategoryModal && !showDishModal && !showThemeModal && !showQrModal) {
        fetchData(true);
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
  }, [showBusinessModal, showCategoryModal, showDishModal, showThemeModal, showQrModal]);

  useEffect(() => {
    if (showThemeModal) setPreviewTheme(currentTheme);
  }, [showThemeModal]);

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [cats, d, bDetails, scans, types, statusRes] = await Promise.all([
        restaurantService.getCategories(),
        restaurantService.getDishes(),
        restaurantService.getBusinessDetails().catch(() => ({})),
        restaurantService.getScanCount().catch(() => 0),
        restaurantService.getDishTypes().catch(() => []),
        restaurantService.getStatus().catch(() => ({ isActive: true })),
      ]);

      const catsList = Array.isArray(cats) ? cats : [];
      const dishesList = Array.isArray(d) ? d : [];
      const typesList = Array.isArray(types) ? types : [];
      setCategories(catsList);
      setDishes(dishesList);
      setDishTypes(typesList);
      setStats({ categories: catsList.length, dishes: dishesList.length, scanCount: scans });
      if (statusRes && statusRes.isActive !== undefined) {
        setIsActive(statusRes.isActive);
      }
      
      if (bDetails && bDetails.name && !showBusinessModal) {
        setBusiness(bDetails);
      }
      if (bDetails && bDetails.theme) {
        setCurrentTheme(bDetails.theme);
        setPreviewTheme(bDetails.theme);
      }
      if (catsList.length > 0 && !newDish.categoryId) {
        setNewDish(prev => ({ ...prev, categoryId: catsList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load restaurant dashboard data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    try {
      await restaurantService.saveBusinessDetails(business);
      setShowBusinessModal(false);

      // Sync local session and update Sidebar header immediately
      const current = localStorage.getItem('auth_user');
      if (current && business.name) {
        const parsed = JSON.parse(current);
        parsed.name = business.name;
        localStorage.setItem('auth_user', JSON.stringify(parsed));
        window.dispatchEvent(new Event('auth_user_updated'));
      }

      await fetchData();
    } catch (err) {
      alert("Failed to save: " + (err.message || 'Server error'));
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImageUnder50KB(file);
        setBusiness(prev => ({ ...prev, logo: compressed }));
      } catch (err) {
        console.error('Failed to compress restaurant logo:', err);
      }
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (newCategory.trim()) {
      try {
        await restaurantService.addCategory(newCategory.trim());
        setNewCategory('');
        setShowCategoryModal(false);
        await fetchData();
      } catch (err) {
        alert("Failed to add category: " + (err.message || 'Server error'));
      }
    }
  };

  const handleToggleCategoryStatus = async (cat) => {
    if (cat.isActive !== false) {
      const activeUsingDishes = dishes.filter(d => d.categoryId === cat.id && d.isActive);
      if (activeUsingDishes.length > 0) {
        const dishNames = activeUsingDishes.slice(0, 3).map(d => d.name).join(', ');
        const extraCount = activeUsingDishes.length > 3 ? ` and ${activeUsingDishes.length - 3} more` : '';
        const confirmed = window.confirm(
          `Deactivating '${cat.name}' will also deactivate ${activeUsingDishes.length} dish(es) currently using it (${dishNames}${extraCount}) in your menu.\n\nDo you want to proceed?`
        );
        if (!confirmed) return;
      }
    }

    try {
      await restaurantService.toggleCategoryStatus(cat.id);
      await fetchData();
    } catch (err) {
      alert("Failed to update category status: " + (err.message || 'Server error'));
    }
  };

  const handleAddDishType = async (e) => {
    e.preventDefault();
    if (newDishType.trim()) {
      try {
        await restaurantService.addDishType(newDishType.trim());
        setNewDishType('');
        const updatedTypes = await restaurantService.getDishTypes();
        setDishTypes(Array.isArray(updatedTypes) ? updatedTypes : []);
      } catch (err) {
        alert("Failed to add dish type: " + (err.message || 'Server error'));
      }
    }
  };

  const handleToggleDishTypeStatus = async (type) => {
    if (type.isActive !== false) {
      const activeUsingDishes = dishes.filter(d => d.type === type.name && d.isActive);
      if (activeUsingDishes.length > 0) {
        const dishNames = activeUsingDishes.slice(0, 3).map(d => d.name).join(', ');
        const extraCount = activeUsingDishes.length > 3 ? ` and ${activeUsingDishes.length - 3} more` : '';
        const confirmed = window.confirm(
          `Deactivating '${type.name}' will also deactivate ${activeUsingDishes.length} dish(es) currently using it (${dishNames}${extraCount}) in your menu.\n\nDo you want to proceed?`
        );
        if (!confirmed) return;
      }
    }

    try {
      await restaurantService.toggleDishTypeStatus(type.id);
      const updatedTypes = await restaurantService.getDishTypes();
      setDishTypes(Array.isArray(updatedTypes) ? updatedTypes : []);
      await fetchData();
    } catch (err) {
      alert("Failed to update dish type status: " + (err.message || 'Server error'));
    }
  };

  const handleDishImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImageUnder50KB(file);
        setNewDish(prev => ({ ...prev, image: compressed }));
      } catch (err) {
        console.error('Failed to compress dish image:', err);
      }
    }
  };

  const handleAddDish = async (e) => {
    e.preventDefault();
    const finalCategoryId = newDish.categoryId || (categories.length > 0 ? categories[0].id : '');
    if (newDish.name && newDish.price && finalCategoryId) {
      const dishToSave = { ...newDish, categoryId: finalCategoryId };
      try {
        if (editDishId) {
          await restaurantService.updateDish(editDishId, dishToSave);
        } else {
          await restaurantService.addDish(dishToSave);
        }
        setNewDish({ name: '', price: '', quantity: '', type: 'Veg', categoryId: categories[0]?.id || '', image: '' });
        setEditDishId(null);
        setShowDishModal(false);
        await fetchData();
      } catch (err) {
        alert("Failed to save dish: " + (err.message || 'Server error'));
      }
    }
  };

  const handleEditDish = (dish) => {
    setNewDish({
      name: dish.name,
      price: dish.price,
      quantity: dish.quantity || '',
      type: dish.type || 'Veg',
      categoryId: dish.categoryId,
      image: dish.image || '',
    });
    setEditDishId(dish.id);
    setShowDishModal(true);
  };

  const handleToggleDishStatus = async (id) => {
    try {
      await restaurantService.toggleDishStatus(id);
      await fetchData();
    } catch (err) {
      alert("Failed to toggle status: " + (err.message || 'Server error'));
    }
  };

  const handleDeleteDish = async (id) => {
    if (window.confirm("Are you sure you want to delete this dish?")) {
      try {
        await restaurantService.deleteDish(id);
        await fetchData();
      } catch (err) {
        alert("Failed to delete dish: " + (err.message || 'Server error'));
      }
    }
  };

  const handleToggleStatus = async () => {
    try {
      const res = await restaurantService.toggleStatus();
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
      await restaurantService.updateTheme(themeId);
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
    try {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.location.origin + '/' + user?.qrToken)}`;
      const r = await fetch(url); const blob = await r.blob();
      const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = `RestaurantMenu-QRCode.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch { alert('Failed to download QR code'); }
  };

  const previewConfig = RESTAURANT_THEMES.find(t => t.id === previewTheme) || RESTAURANT_THEMES[0];
  const p = previewConfig.preview;

  // Data for phone preview (Use real data if available, otherwise fallback to demo)
  const previewCategories = categories.length > 0 ? categories : [{ name: 'Starters' }, { name: 'Mains' }, { name: 'Desserts' }];
  const previewDishes = dishes.length > 0 ? dishes.slice(0, 3) : [
    { name: 'Crispy Paneer', price: 249, type: 'Veg' },
    { name: 'Chicken Wings', price: 349, type: 'Non-Veg' },
    { name: 'Cheese Pasta', price: 299, type: 'Veg' },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark m-0">Restaurant Menu Dashboard</h3>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3" onClick={() => setShowBusinessModal(true)} style={{ cursor: 'pointer' }}>
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold d-flex align-items-center gap-2"><Store size={18} className="text-primary" /> Business Profile</span>
              <ExternalLink size={16} className="text-muted" />
            </div>
            <small className="text-muted mt-1 d-block">(Step-1)</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3" onClick={() => setShowCategoryModal(true)} style={{ cursor: 'pointer' }}>
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold d-flex align-items-center gap-2"><Layers size={18} className="text-primary" /> Manage Categories</span>
              <Plus size={16} className="text-muted" />
            </div>
            <small className="text-muted mt-1 d-block">(Step-2)</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3" onClick={() => setShowDishModal(true)} style={{ cursor: 'pointer' }}>
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold d-flex align-items-center gap-2"><Utensils size={18} className="text-primary" /> Add Dishes</span>
              <Plus size={16} className="text-muted" />
            </div>
            <small className="text-muted mt-1 d-block">(Step-3)</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3" onClick={() => setShowThemeModal(true)} style={{ cursor: 'pointer' }}>
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold d-flex align-items-center gap-2"><Palette size={18} className="text-primary" /> Update Theme</span>
              <div className="rounded-circle" style={{ width: 20, height: 20, background: RESTAURANT_THEMES.find(t => t.id === currentTheme)?.preview.headerBg || '#4f46e5', border: '2px solid #ddd' }}></div>
            </div>
            <small className="text-muted mt-1 d-block">{RESTAURANT_THEMES.find(t => t.id === currentTheme)?.name || currentTheme}</small>
          </div>
        </div>
        <div className="col-md-3">
          <a href={`/${user?.qrToken}`} target="_blank" rel="noreferrer" className="text-decoration-none">
            <div className="card shadow-sm border-0 h-100 p-3 rounded-3 text-dark">
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold d-flex align-items-center gap-2"><ExternalLink size={18} className="text-primary" /> View Public Menu</span>
                <ExternalLink size={16} className="text-muted" />
              </div>
            </div>
          </a>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3" onClick={() => setShowQrModal(true)} style={{ cursor: 'pointer' }}>
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold d-flex align-items-center gap-2"><QrCode size={18} className="text-primary" /> View / Download QR</span>
              <Download size={16} className="text-muted" />
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold">View / Scan Count</span>
              <span className="fw-bold text-dark fs-5">{stats.scanCount}</span>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 p-3 rounded-3" onClick={handleToggleStatus} style={{ cursor: 'pointer' }}>
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold">Activate / Deactivate</span>
              {isActive ? <ToggleRight size={28} className="text-primary" /> : <ToggleLeft size={28} className="text-muted" />}
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 rounded-4 p-4 mt-2">
        <div className="d-flex justify-content-end mb-3">
          <button onClick={() => { setEditDishId(null); setNewDish({ name: '', price: '', quantity: '', type: 'Veg', categoryId: categories[0]?.id || '', image: '' }); setShowDishModal(true); }} className="btn btn-primary fw-bold d-flex align-items-center gap-1" style={{ backgroundColor: '#5e35b1', border: 'none' }}>
            <Plus size={16} /> Add New Dish
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light text-muted">
              <tr><th></th><th>Dish Name</th><th>Price</th><th>Category</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {dishes.map(dish => (
                <tr key={dish.id}>
                  <td className="text-muted">::</td>
                  <td className="fw-bold">
                    {dish.name}
                    {dish.type && (
                      <span className={`ms-2 dish-type-badge type-${dish.type.toLowerCase().trim().replace(/[^a-z0-9]/g, '-')}`}>
                        {dish.type}
                      </span>
                    )}
                  </td>
                  <td>₹{dish.price}</td>
                  <td>{categories.find(c => c.id === dish.categoryId)?.name || 'Unknown'}</td>
                  <td><button onClick={() => handleToggleDishStatus(dish.id)} className="btn btn-link p-0 shadow-none border-0">{dish.isActive !== false ? <ToggleRight size={26} className="text-primary" /> : <ToggleLeft size={26} className="text-muted" />}</button></td>
                  <td>
                    <button onClick={() => handleEditDish(dish)} className="btn btn-sm text-muted me-2"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteDish(dish.id)} className="btn btn-sm text-danger"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {dishes.length === 0 && <tr><td colSpan="6" className="text-center py-4 text-muted">No dishes added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Business Modal */}
      {showBusinessModal && (
        <>
          <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}></div>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4"><h5 className="modal-title fw-bold">Business Details</h5><button type="button" className="btn-close" onClick={() => setShowBusinessModal(false)}></button></div>
                <div className="modal-body p-4 text-center">
                  <div className="mb-4 d-inline-block"><label htmlFor="logo-upload" style={{ cursor: 'pointer' }}><div className="rounded-circle d-flex align-items-center justify-content-center bg-light border" style={{ width: '80px', height: '80px', overflow: 'hidden' }}>{business.logo ? <img src={business.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="fw-bold fs-3 text-secondary">V</span>}</div></label><input id="logo-upload" type="file" accept="image/*" className="d-none" onChange={handleLogoUpload} /></div>
                  <form onSubmit={handleSaveBusiness} className="text-start">
                    <div className="row g-3 mb-3"><div className="col-md-6"><label className="form-label text-muted small">Company Name*</label><input type="text" className="form-control" value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} required /></div><div className="col-md-6"><label className="form-label text-muted small">Phone*</label><input type="text" className="form-control" value={business.phone} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} required /></div></div>
                    <div className="mb-3"><label className="form-label text-muted small">Address*</label><input type="text" className="form-control" value={business.address} onChange={(e) => setBusiness({ ...business, address: e.target.value })} required /></div>
                    <div className="d-flex justify-content-end gap-2 mt-4"><button type="button" className="btn btn-light border" onClick={() => setShowBusinessModal(false)}>Cancel</button><button type="submit" className="btn text-white px-4" style={{ backgroundColor: '#5e35b1' }}>Save</button></div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Category & Dish Types Modal */}
      {showCategoryModal && (
        <>
          <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}></div>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                  <h5 className="modal-title fw-bold">Manage Categories & Dish Types</h5>
                  <button type="button" className="btn-close" onClick={() => setShowCategoryModal(false)}></button>
                </div>
                
                {/* Tabs */}
                <div className="px-4 pt-3">
                  <div className="nav nav-pills nav-fill p-1 bg-light rounded-3" style={{ border: '1px solid #e2e8f0' }}>
                    <button 
                      type="button"
                      className={`nav-link py-2 fw-bold small ${categoryModalTab === 'categories' ? 'active shadow-sm text-white' : 'text-muted'}`}
                      style={{ 
                        backgroundColor: categoryModalTab === 'categories' ? '#5e35b1' : 'transparent',
                        borderRadius: '6px'
                      }}
                      onClick={() => setCategoryModalTab('categories')}
                    >
                      📁 Categories ({categories.length})
                    </button>
                    <button 
                      type="button"
                      className={`nav-link py-2 fw-bold small ${categoryModalTab === 'types' ? 'active shadow-sm text-white' : 'text-muted'}`}
                      style={{ 
                        backgroundColor: categoryModalTab === 'types' ? '#5e35b1' : 'transparent',
                        borderRadius: '6px'
                      }}
                      onClick={() => setCategoryModalTab('types')}
                    >
                      🍲 Dish Types ({dishTypes.length})
                    </button>
                  </div>
                </div>

                <div className="modal-body p-4">
                  {categoryModalTab === 'categories' ? (
                    <>
                      <form onSubmit={handleAddCategory} className="d-flex gap-2 mb-4">
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="New category (e.g. Beverages)" 
                          value={newCategory} 
                          onChange={(e) => setNewCategory(e.target.value)} 
                          required
                        />
                        <button type="submit" className="btn text-white fw-bold px-4" style={{ backgroundColor: '#5e35b1' }}>
                          Add
                        </button>
                      </form>
                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <ul className="list-group">
                          {categories.map(cat => (
                            <li key={cat.id} className="list-group-item d-flex justify-content-between align-items-center border-0 px-0 border-bottom">
                              <div className="d-flex align-items-center gap-2">
                                <span className={`fw-bold ${cat.isActive === false ? 'text-muted text-decoration-line-through' : 'text-dark'}`}>{cat.name}</span>
                                {cat.isActive === false && (
                                  <span className="badge bg-secondary-subtle text-secondary small">Inactive</span>
                                )}
                              </div>
                              <button 
                                type="button"
                                onClick={() => handleToggleCategoryStatus(cat)} 
                                className="btn btn-sm p-0 border-0 bg-transparent" 
                                title={cat.isActive === false ? "Click to Activate Category" : "Click to Deactivate Category"}
                              >
                                {cat.isActive === false ? (
                                  <ToggleLeft size={28} className="text-muted" />
                                ) : (
                                  <ToggleRight size={28} style={{ color: '#5e35b1' }} />
                                )}
                              </button>
                            </li>
                          ))}
                          {categories.length === 0 && <p className="text-muted small py-2 mb-0">No categories yet.</p>}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <>
                      <form onSubmit={handleAddDishType} className="d-flex gap-2 mb-4">
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="New dish type (e.g. Veg, Vegan, Beverage)" 
                          value={newDishType} 
                          onChange={(e) => setNewDishType(e.target.value)} 
                          required
                        />
                        <button type="submit" className="btn text-white fw-bold px-4" style={{ backgroundColor: '#5e35b1' }}>
                          Add Type
                        </button>
                      </form>
                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <ul className="list-group">
                          {dishTypes.map(type => (
                            <li key={type.id} className="list-group-item d-flex justify-content-between align-items-center border-0 px-0 border-bottom">
                              <div className="d-flex align-items-center gap-2">
                                <span className={`badge border px-2 py-1 ${type.isActive === false ? 'bg-light text-muted text-decoration-line-through' : 'bg-secondary-subtle text-dark'}`}>{type.name}</span>
                                {type.isActive === false && (
                                  <span className="badge bg-secondary-subtle text-secondary small">Inactive</span>
                                )}
                              </div>
                              <button 
                                type="button"
                                onClick={() => handleToggleDishTypeStatus(type)} 
                                className="btn btn-sm p-0 border-0 bg-transparent" 
                                title={type.isActive === false ? "Click to Activate Dish Type" : "Click to Deactivate Dish Type"}
                              >
                                {type.isActive === false ? (
                                  <ToggleLeft size={28} className="text-muted" />
                                ) : (
                                  <ToggleRight size={28} style={{ color: '#5e35b1' }} />
                                )}
                              </button>
                            </li>
                          ))}
                          {dishTypes.length === 0 && (
                            <div className="py-2 text-muted small">
                              No custom dish types yet. Standard types (Veg, Non-Veg, Egg, Vegan) are automatically available.
                            </div>
                          )}
                        </ul>
                      </div>
                    </>
                  )}
                  <div className="d-flex justify-content-end mt-4">
                    <button type="button" className="btn btn-light border" onClick={() => setShowCategoryModal(false)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dish Modal */}
      {showDishModal && (
        <>
          <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}></div>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4"><h5 className="modal-title fw-bold">{editDishId ? 'Update Dish' : 'Add New Dish'}</h5><button type="button" className="btn-close" onClick={() => setShowDishModal(false)}></button></div>
                <div className="modal-body p-4">
                  <form onSubmit={handleAddDish}>
                    <div className="mb-3"><label className="form-label text-muted small">Dish Name*</label><input type="text" className="form-control" value={newDish.name} onChange={(e) => setNewDish({ ...newDish, name: e.target.value })} required /></div>
                    <div className="row g-3 mb-3"><div className="col-md-6"><label className="form-label text-muted small">Price*</label><input type="number" className="form-control" value={newDish.price} onChange={(e) => setNewDish({ ...newDish, price: e.target.value })} required /></div><div className="col-md-6"><label className="form-label text-muted small">Quantity</label><input type="text" className="form-control" value={newDish.quantity} onChange={(e) => setNewDish({ ...newDish, quantity: e.target.value })} /></div></div>
                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label text-muted small mb-0">Type*</label>
                          <button 
                            type="button" 
                            className="btn btn-link p-0 text-decoration-none small text-primary" 
                            style={{ fontSize: '11px' }}
                            onClick={() => { setCategoryModalTab('types'); setShowCategoryModal(true); }}
                          >
                            + Manage Types
                          </button>
                        </div>
                        <select className="form-select" value={newDish.type} onChange={(e) => setNewDish({ ...newDish, type: e.target.value })}>
                          {Array.from(new Set(['Veg', 'Non-Veg', 'Egg', 'Vegan', ...dishTypes.map(t => t.name)])).map(tName => (
                            <option key={tName} value={tName}>{tName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label text-muted small mb-0">Category*</label>
                          <button 
                            type="button" 
                            className="btn btn-link p-0 text-decoration-none small text-primary" 
                            style={{ fontSize: '11px' }}
                            onClick={() => { setCategoryModalTab('categories'); setShowCategoryModal(true); }}
                          >
                            + Manage Categories
                          </button>
                        </div>
                        <select className="form-select" value={newDish.categoryId} onChange={(e) => setNewDish({ ...newDish, categoryId: e.target.value })} required>
                          <option value="">-- Select --</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="mb-4"><label className="form-label text-muted small">Image</label><input type="file" className="form-control" accept="image/*" onChange={handleDishImageUpload} />{newDish.image && <img src={newDish.image} alt="Preview" className="mt-3 rounded border" style={{ height: '80px', width: '80px', objectFit: 'cover' }} />}</div>
                    <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-light border" onClick={() => setShowDishModal(false)}>Cancel</button><button type="submit" className="btn text-white px-4" style={{ backgroundColor: '#5e35b1' }}>{editDishId ? 'Update' : 'Add Dish'}</button></div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
                            {RESTAURANT_THEMES.map(t => (
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
                          src={`/${user?.qrToken}?previewTheme=${previewTheme}`} 
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

      {/* QR Modal */}
      {showQrModal && (
        <>
          <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}></div>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4"><h5 className="modal-title fw-bold">Your Public QR Link</h5><button type="button" className="btn-close" onClick={() => setShowQrModal(false)}></button></div>
                <div className="modal-body p-4 text-center">
                  <div className="bg-light p-3 rounded-4 d-inline-block border mb-4"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/' + user?.qrToken)}`} alt="QR Code" style={{ width: '150px', height: '150px' }} /></div>
                  <p className="text-muted mb-2">Scan to view your public menu.</p>
                  <a href={`/${user?.qrToken}`} target="_blank" rel="noreferrer" className="form-control text-primary text-decoration-none fw-bold bg-light">{window.location.origin}/{user?.qrToken}</a>
                  <div className="d-flex justify-content-center gap-2 mt-4">
                    <button type="button" className="btn btn-primary px-4 border-0" style={{ backgroundColor: '#5e35b1' }} onClick={() => setShowQrModal(false)}>Done</button>
                    <button type="button" className="btn btn-outline-secondary px-4 fw-bold border" onClick={handleDownloadQR}>Download</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RestaurantMenuDashboard;
