import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';
import syncService from '../../services/syncService';

const CategoryManagement = () => {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [dishTypes, setDishTypes] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newDishType, setNewDishType] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchData();

    // Instant real-time cross-tab sync
    const unsubscribe = syncService.subscribe(() => {
      fetchData(true);
    });

    // Gentle 10-second idle background refresh (only when tab is active)
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchData(true);
    }, 10000);

    const onFocusOrVisible = () => {
      fetchData(true);
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

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setErrorMsg('');
      const [cats, types] = await Promise.all([
        restaurantService.getCategories(),
        restaurantService.getDishTypes().catch(() => []),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setDishTypes(Array.isArray(types) ? types : []);
    } catch (err) {
      if (!isSilent) setErrorMsg(err.message || 'Failed to load data.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (newCategory.trim()) {
      try {
        await restaurantService.addCategory(newCategory.trim());
        setNewCategory('');
        await fetchData();
      } catch (err) {
        alert('Failed to add category: ' + (err.message || 'Server error'));
      }
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await restaurantService.deleteCategory(id);
        await fetchData();
      } catch (err) {
        alert('Failed to delete category: ' + (err.message || 'Server error'));
      }
    }
  };

  const handleAddDishType = async (e) => {
    e.preventDefault();
    if (newDishType.trim()) {
      try {
        await restaurantService.addDishType(newDishType.trim());
        setNewDishType('');
        await fetchData();
      } catch (err) {
        alert('Failed to add dish type: ' + (err.message || 'Server error'));
      }
    }
  };

  const handleDeleteDishType = async (id) => {
    if (window.confirm('Are you sure you want to delete this dish type?')) {
      try {
        await restaurantService.deleteDishType(id);
        await fetchData();
      } catch (err) {
        alert('Failed to delete dish type: ' + (err.message || 'Server error'));
      }
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Categories & Dish Types</h2>
      </div>

      <div className="mb-4">
        <ul className="nav nav-pills gap-2">
          <li className="nav-item">
            <button
              className={`nav-link fw-bold px-4 py-2 ${activeTab === 'categories' ? 'active' : 'bg-white text-muted border'}`}
              style={activeTab === 'categories' ? { backgroundColor: '#5e35b1', color: '#fff', borderRadius: '8px' } : { borderRadius: '8px' }}
              onClick={() => setActiveTab('categories')}
            >
              Categories ({categories.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link fw-bold px-4 py-2 ${activeTab === 'types' ? 'active' : 'bg-white text-muted border'}`}
              style={activeTab === 'types' ? { backgroundColor: '#5e35b1', color: '#fff', borderRadius: '8px' } : { borderRadius: '8px' }}
              onClick={() => setActiveTab('types')}
            >
              Dish Types ({dishTypes.length})
            </button>
          </li>
        </ul>
      </div>
      
      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

      {activeTab === 'categories' ? (
        <div className="row">
          <div className="col-md-5 mb-4">
            <div className="card shadow-sm p-4 border-0 rounded-4">
              <h4 className="fw-bold mb-3">Add New Category</h4>
              <form onSubmit={handleAddCategory} className="d-flex gap-2">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Beverages" 
                  value={newCategory} 
                  onChange={(e) => setNewCategory(e.target.value)} 
                  required
                />
                <button type="submit" className="btn btn-primary fw-bold px-4" style={{ backgroundColor: '#5e35b1', border: 'none' }}>
                  Add
                </button>
              </form>
            </div>
          </div>
          
          <div className="col-md-7">
            <div className="card shadow-sm p-4 border-0 rounded-4">
              <h4 className="fw-bold mb-3">All Categories</h4>
              {loading ? (
                <div className="text-center py-4 text-muted">Loading categories...</div>
              ) : categories.length === 0 ? (
                <p className="text-muted">No categories added yet.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {categories.map((cat) => (
                    <li key={cat.id} className="list-group-item d-flex justify-content-between align-items-center px-0 border-bottom">
                      <span className="fw-bold">{cat.name}</span>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="btn btn-sm btn-outline-danger" title="Delete Category">
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-5 mb-4">
            <div className="card shadow-sm p-4 border-0 rounded-4">
              <h4 className="fw-bold mb-3">Add New Dish Type</h4>
              <form onSubmit={handleAddDishType} className="d-flex gap-2">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Vegan, Jain, Beverage" 
                  value={newDishType} 
                  onChange={(e) => setNewDishType(e.target.value)} 
                  required
                />
                <button type="submit" className="btn btn-primary fw-bold px-4" style={{ backgroundColor: '#5e35b1', border: 'none' }}>
                  Add
                </button>
              </form>
            </div>
          </div>
          
          <div className="col-md-7">
            <div className="card shadow-sm p-4 border-0 rounded-4">
              <h4 className="fw-bold mb-3">Custom Dish Types</h4>
              {loading ? (
                <div className="text-center py-4 text-muted">Loading dish types...</div>
              ) : dishTypes.length === 0 ? (
                <p className="text-muted">No custom dish types added yet. Standard types (Veg, Non-Veg, Egg, Vegan) are automatically available.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {dishTypes.map((type) => (
                    <li key={type.id} className="list-group-item d-flex justify-content-between align-items-center px-0 border-bottom">
                      <span className="badge bg-secondary-subtle text-dark border px-2 py-1 fs-6">{type.name}</span>
                      <button onClick={() => handleDeleteDishType(type.id)} className="btn btn-sm btn-outline-danger" title="Delete Dish Type">
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
