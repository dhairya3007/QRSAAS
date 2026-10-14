import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';
import syncService from '../../services/syncService';

const DishManagement = () => {
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dishTypes, setDishTypes] = useState([]);
  const [newDish, setNewDish] = useState({
    name: '',
    price: '',
    quantity: '',
    type: 'Veg',
    categoryId: '',
    image: '',
  });
  const [editDishId, setEditDishId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchData();

    // Instant real-time cross-tab sync
    const unsubscribe = syncService.subscribe(() => {
      if (!editDishId) {
        fetchData(true);
      }
    });

    // Gentle 10-second idle background refresh (only when tab is active)
    const interval = setInterval(() => {
      if (document.hidden) return;
      if (!editDishId) {
        fetchData(true);
      }
    }, 10000);

    const onFocusOrVisible = () => {
      if (!editDishId) {
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
  }, [editDishId]);

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setErrorMsg('');
      const [catsData, dishesData, typesData] = await Promise.all([
        restaurantService.getCategories(),
        restaurantService.getDishes(),
        restaurantService.getDishTypes().catch(() => []),
      ]);

      const cats = Array.isArray(catsData) ? catsData : [];
      const d = Array.isArray(dishesData) ? dishesData : [];
      const types = Array.isArray(typesData) ? typesData : [];
      setCategories(cats);
      setDishes(d);
      setDishTypes(types);

      if (cats.length > 0 && !newDish.categoryId) {
        setNewDish(prev => ({ ...prev, categoryId: cats[0].id }));
      }
    } catch (err) {
      if (!isSilent) setErrorMsg(err.message || 'Failed to load dishes and categories.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDish(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newDish.name && newDish.price && newDish.categoryId) {
      try {
        if (editDishId) {
          await restaurantService.updateDish(editDishId, newDish);
        } else {
          await restaurantService.addDish(newDish);
        }
        handleCancelEdit();
        await fetchData();
      } catch (err) {
        alert('Failed to save dish: ' + (err.message || 'Server error'));
      }
    }
  };

  const handleEdit = (dish) => {
    setEditDishId(dish.id);
    setNewDish({
      name: dish.name,
      price: dish.price,
      quantity: dish.quantity || '',
      type: dish.type || 'Veg',
      categoryId: dish.categoryId,
      image: dish.image || '',
    });
  };

  const handleCancelEdit = () => {
    setEditDishId(null);
    setNewDish({
      name: '',
      price: '',
      quantity: '',
      type: 'Veg',
      categoryId: categories[0]?.id || '',
      image: '',
    });
  };

  const handleToggleStatus = async (id) => {
    try {
      await restaurantService.toggleDishStatus(id);
      await fetchData();
    } catch (err) {
      alert('Failed to toggle status: ' + (err.message || 'Server error'));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this dish?')) {
      try {
        await restaurantService.deleteDish(id);
        if (editDishId === id) handleCancelEdit();
        await fetchData();
      } catch (err) {
        alert('Failed to delete dish: ' + (err.message || 'Server error'));
      }
    }
  };

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : 'Unknown';
  };

  return (
    <div className="container-fluid p-0">
      <h2 className="fw-bold mb-4">Dish Management</h2>

      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
      
      <div className="row">
        <div className="col-md-5 mb-4">
          <div className="card shadow-sm p-4 border-0 rounded-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="fw-bold mb-0">{editDishId ? 'Edit Dish' : 'Add New Dish'}</h4>
              {editDishId && (
                <button type="button" onClick={handleCancelEdit} className="btn btn-sm btn-outline-secondary">
                  Cancel Edit
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-bold">Dish Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newDish.name} 
                  onChange={(e) => setNewDish({ ...newDish, name: e.target.value })} 
                  required 
                />
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Price (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-control" 
                    value={newDish.price} 
                    onChange={(e) => setNewDish({ ...newDish, price: e.target.value })} 
                    required 
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Quantity (gm/ml)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newDish.quantity} 
                    onChange={(e) => setNewDish({ ...newDish, quantity: e.target.value })} 
                  />
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Type</label>
                  <select 
                    className="form-select" 
                    value={newDish.type} 
                    onChange={(e) => setNewDish({ ...newDish, type: e.target.value })}
                  >
                    {Array.from(new Set(['Veg', 'Non-Veg', 'Egg', 'Vegan', ...dishTypes.map(t => t.name)])).map(tName => (
                      <option key={tName} value={tName}>{tName}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Category</label>
                  <select 
                    className="form-select" 
                    value={newDish.categoryId} 
                    onChange={(e) => setNewDish({ ...newDish, categoryId: e.target.value })} 
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label fw-bold">Dish Image</label>
                <input 
                  type="file" 
                  className="form-control" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
                {newDish.image && (
                  <img 
                    src={newDish.image} 
                    alt="Preview" 
                    className="mt-3 rounded shadow-sm" 
                    style={{ height: '80px', objectFit: 'cover' }} 
                  />
                )}
              </div>
              <button 
                type="submit" 
                className="btn btn-primary w-100 fw-bold py-2" 
                style={{ backgroundColor: '#5e35b1', border: 'none', borderRadius: '8px' }}
                disabled={categories.length === 0}
              >
                {editDishId ? 'Update Dish' : (categories.length === 0 ? 'Add a category first' : 'Add Dish')}
              </button>
            </form>
          </div>
        </div>
        
        <div className="col-md-7">
          <div className="card shadow-sm p-4 border-0 rounded-4">
            <h4 className="fw-bold mb-3">All Dishes</h4>
            <div className="table-responsive border rounded" style={{ height: '380px', overflowY: 'auto' }}>
              <table className="table table-hover align-middle mb-0">
                <thead className="text-muted position-sticky top-0" style={{ zIndex: 10 }}>
                  <tr>
                    <th style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' }}>Dish</th>
                    <th style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' }}>Category</th>
                    <th style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' }}>Price</th>
                    <th style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                    <th style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dishes.map(dish => (
                    <tr key={dish.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          {dish.image && (
                            <img 
                              src={dish.image} 
                              alt={dish.name} 
                              style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} 
                            />
                          )}
                          <div>
                            <span className="fw-bold d-block">{dish.name}</span>
                            <span className={`badge ${dish.type === 'Veg' ? 'bg-success' : 'bg-danger'} me-1`} style={{ fontSize: '10px' }}>
                              {dish.type}
                            </span>
                            {dish.quantity && <small className="text-muted">{dish.quantity}</small>}
                          </div>
                        </div>
                      </td>
                      <td>{getCategoryName(dish.categoryId)}</td>
                      <td>₹{dish.price}</td>
                      <td>
                        <button 
                          onClick={() => handleToggleStatus(dish.id)}
                          className={`btn btn-sm ${dish.isActive !== false ? 'btn-outline-success' : 'btn-outline-secondary'}`}
                          title="Click to toggle availability"
                          style={{ fontSize: '11px', padding: '2px 8px' }}
                        >
                          {dish.isActive !== false ? 'Available' : 'Out of Stock'}
                        </button>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button onClick={() => handleEdit(dish)} className="btn btn-sm btn-outline-primary" title="Edit Dish">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(dish.id)} className="btn btn-sm btn-outline-danger" title="Delete Dish">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {dishes.length === 0 && !loading && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-5">No dishes added yet.</td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-5">Loading dishes...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DishManagement;
