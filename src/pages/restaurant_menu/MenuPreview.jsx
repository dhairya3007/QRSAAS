import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import syncService from '../../services/syncService';
import { RESTAURANT_THEMES } from './themes/restaurantThemes';

const MenuPreview = () => {
  const { token } = useParams();
  const location = useLocation();
  const [data, setData] = useState({ client: null, categories: [], dishes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTabId, setActiveTabId] = useState(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    let isInitial = true;

    const fetchMenu = async () => {
      try {
        const result = await publicService.getPublicMenu(token);
        setData(prev => JSON.stringify(prev) === JSON.stringify(result) ? prev : result);
        if (result?.client?.name) {
          document.title = `${result.client.name} - Digital Menu`;
        }
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load menu');
      } finally {
        if (isInitial) {
          setLoading(false);
          isInitial = false;
        }
      }
    };

    if (token) {
      // Increment scan count once per visit — guard prevents re-firing on polling/sync
      const searchParams = new URLSearchParams(window.location.search);
      const isPreview = Boolean(searchParams.get('previewTheme') || searchParams.get('preview'));
      if (!hasScannedRef.current && !isPreview) {
        hasScannedRef.current = true;
        publicService.incrementScanCount(token);
      }
      fetchMenu();

      // Real-time instant cross-tab sync
      const unsubscribe = syncService.subscribe(() => {
        fetchMenu();
      });

      // Background polling (3s) when page is active on screen
      const interval = setInterval(() => {
        if (document.hidden) return;
        fetchMenu();
      }, 3000);

      // Instant refresh on tab focus / visibility change
      const onFocusOrVisible = () => {
        if (document.visibilityState === 'visible') {
          fetchMenu();
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
    }
  }, [token]);

  if (loading) return <div className="p-5 text-center">Loading menu...</div>;
  if (error) return <div className="p-5 text-center text-danger"><h2>{error}</h2><p>Please check your QR link.</p></div>;

  const { client, categories, dishes } = data;
  const searchParams = new URLSearchParams(location.search);
  const previewTheme = searchParams.get('previewTheme');
  const themeId = previewTheme || client?.theme || 'modern';

  // Apply theme CSS class to body
  document.body.className = `theme-${themeId}`;

  // Look up the layout type from the theme config
  const themeConfig = RESTAURANT_THEMES.find(t => t.id === themeId) || RESTAURANT_THEMES[0];
  const useTabs = themeConfig.layout === 'tabs';

  return (
    <div className="min-vh-100 d-flex justify-content-center" style={{ backgroundColor: '#f0f2f5' }}>
      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="pb-5 shadow-lg position-relative" style={{ maxWidth: '480px', width: '100%', background: 'var(--bg-color)', color: 'var(--text-color)', minHeight: '100vh', overflowX: 'hidden' }}>

        {/* Header */}
        <div className="menu-header shadow-sm text-center">
          <h1 className="fw-bold mb-0" style={{ fontSize: '2rem' }}>{client.name || 'Our Menu'}</h1>
        </div>

        <div className="container-fluid mt-4 px-3 pb-5">
          {categories.length === 0 && dishes.length === 0 ? (
            <div className="text-center mt-5 p-4 glass-card">
              <h3>Menu is empty.</h3>
            </div>
          ) : (
            <>
              {/* Category tabs — rendered for themes with layout: 'tabs' */}
              {useTabs && (
                <div className="d-flex flex-wrap justify-content-center gap-2 mb-4 px-1">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTabId(cat.id)}
                      className="btn rounded-pill px-4 py-2 fw-bold"
                      style={{
                        backgroundColor: (activeTabId || categories[0].id) === cat.id ? 'var(--primary-color)' : 'transparent',
                        color: (activeTabId || categories[0].id) === cat.id ? '#fff' : 'var(--text-color)',
                        border: '2px solid var(--primary-color)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {categories
                .filter(cat => useTabs ? cat.id === (activeTabId || categories[0].id) : true)
                .map(category => {
                  const categoryDishes = dishes.filter(d => d.categoryId === category.id);
                  if (categoryDishes.length === 0) return null;

                  return (
                    <div key={category.id} className="mb-5">
                      {/* Category title only shown for non-tab layouts */}
                      {!useTabs && (
                        <div className="text-center">
                          <h2 className="menu-category-title fw-bold fs-3">{category.name}</h2>
                        </div>
                      )}

                      <div className="d-flex flex-column gap-4">
                        {categoryDishes.map(dish => (
                          <div key={dish.id} className="w-100">
                            <div className="glass-card dish-card p-4 w-100">
                              {dish.image && (
                                <img src={dish.image} alt={dish.name} className="dish-image" />
                              )}
                              <div className="d-flex flex-column h-100 justify-content-center">
                                <h4 className="fw-bold mb-0 d-flex align-items-center flex-wrap gap-2" style={{ fontSize: '1.2rem' }}>
                                  <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{dish.name}</span>
                                  {dish.type && (
                                    <span className={`dish-type-badge type-${dish.type.toLowerCase().trim().replace(/[^a-z0-9]/g, '-')}`}>
                                      {dish.type}
                                    </span>
                                  )}
                                </h4>
                                <div className="d-flex justify-content-between align-items-end mt-3">
                                  <p className="mb-0 opacity-75 text-truncate pe-3">{dish.quantity || ''}</p>
                                  <span className="fw-bold text-primary flex-shrink-0" style={{ fontSize: '1.3rem' }}>₹{dish.price}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuPreview;
