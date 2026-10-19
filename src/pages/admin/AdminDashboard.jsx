import React, { useEffect, useState, useRef } from 'react';
import { Users, CreditCard, Plus, Copy, CheckCircle, Edit, DollarSign } from 'lucide-react';
import { adminService } from '../../services/adminService';
import syncService from '../../services/syncService';
import { AVAILABLE_SERVICES } from './Services';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    revenue: 0
  });
  const [clients, setClients] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', password: '', serviceDurations: {}, services: [] });
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    fetchData(false, true);

    // Instant real-time cross-tab sync
    const unsubscribe = syncService.subscribe(() => {
      if (!showCreateModal) {
        fetchData(true, true);
      }
    });

    // Gentle 15-second idle background refresh (only when tab is active)
    const interval = setInterval(() => {
      if (document.hidden) return;
      if (!showCreateModal) {
        fetchData(true);
      }
    }, 15000);

    const onFocusOrVisible = () => {
      if (document.hidden) return;
      if (!showCreateModal) {
        // Only refresh if more than 10 seconds since last fetch
        if (Date.now() - lastFetchRef.current > 10000) {
          fetchData(true);
        }
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
  }, [showCreateModal]);

  const fetchData = async (isSilent = false, force = false) => {
    if (isFetchingRef.current) return;
    if (!force && isSilent && Date.now() - lastFetchRef.current < 10000) return;

    isFetchingRef.current = true;
    try {
      if (!isSilent) setLoading(true);
      setErrorMsg('');
      const [clientsData, statsData] = await Promise.all([
        adminService.getClients(),
        adminService.getAdminStats().catch(() => null)
      ]);

      const clientList = Array.isArray(clientsData) ? clientsData : [];
      // Keep newest clients at the top so newly added clients appear above
      clientList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setClients(clientList);

      if (statsData) {
        setStats(statsData);
      } else {
        const total = clientList.length;
        const active = clientList.filter(c => c.isActive !== false).length;
        setStats({ total, active, revenue: 0 });
      }
      lastFetchRef.current = Date.now();
    } catch (err) {
      console.error('Failed to load admin data:', err);
      if (!isSilent) setErrorMsg(err.message || 'Error loading clients from backend.');
    } finally {
      isFetchingRef.current = false;
      if (!isSilent) setLoading(false);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newClient.services.length === 0) {
      alert('Please select at least one service.');
      return;
    }

    try {
      if (isEdit) {
        await adminService.updateClient(newClient.id, newClient);
      } else {
        await adminService.createClient(newClient);
      }

      setShowCreateModal(false);
      setNewClient({ name: '', email: '', password: '', serviceDurations: {}, services: [] });
      setIsEdit(false);
      await fetchData();
    } catch (err) {
      alert('Failed to save client: ' + (err.message || 'Server error'));
    }
  };

  const openEditModal = (client) => {
    setIsEdit(true);
    const initialDurations = { ...(client.serviceDurations || {}) };
    (client.services || []).forEach(s => {
      if (!initialDurations[s]) initialDurations[s] = 1;
    });
    setNewClient({ 
      ...client, 
      serviceDurations: initialDurations,
      services: client.services || [] 
    });
    setShowCreateModal(true);
  };

  const handleServiceToggle = (val) => {
    setNewClient(prev => {
      const currentServices = prev.services || [];
      const isSelected = currentServices.includes(val);
      const newServices = isSelected ? currentServices.filter(s => s !== val) : [...currentServices, val];
      const newDurations = { ...(prev.serviceDurations || {}) };
      if (!isSelected && !newDurations[val]) {
        newDurations[val] = 1;
      }
      return { ...prev, services: newServices, serviceDurations: newDurations };
    });
  };

  const calculateMonthlyPrice = () => {
    if (!newClient.services) return 0;
    return newClient.services.reduce((total, serviceId) => {
      const s = AVAILABLE_SERVICES.find(srv => srv.id === serviceId);
      const months = parseInt(newClient.serviceDurations?.[serviceId]) || 0;
      return total + (s ? s.price * months : 0);
    }, 0);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0 text-dark">Super Admin Dashboard</h3>
        <button 
          onClick={() => {
            setIsEdit(false);
            setNewClient({ name: '', email: '', password: '', serviceDurations: {}, services: [] });
            setShowCreateModal(true);
          }} 
          className="btn text-white fw-bold px-4 py-2 d-flex align-items-center gap-1" style={{ backgroundColor: '#5e35b1', border: 'none', borderRadius: '8px' }}>
          <Plus size={18} /> Create QR / Client
        </button>
      </div>

      <div className="row g-4 mt-2">
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100 p-4 rounded-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-muted fw-bold mb-1">Total Restaurants</p>
                <h2 className="fw-bold text-dark mb-0">{stats.total}</h2>
              </div>
              <div className="p-3 bg-primary bg-opacity-10 rounded-circle text-primary">
                <Users size={32} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100 p-4 rounded-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-muted fw-bold mb-1">Active Subscriptions</p>
                <h2 className="fw-bold text-dark mb-0">{stats.active}</h2>
              </div>
              <div className="p-3 bg-success bg-opacity-10 rounded-circle text-success">
                <CreditCard size={32} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="p-4 bg-white border-bottom d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark">All Clients Overview</h5>
        </div>
        <div className="table-responsive bg-white" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table className="table align-middle mb-0 text-nowrap">
            <thead className="table-light position-sticky top-0" style={{ zIndex: 2 }}>
              <tr>
                <th className="py-3 px-4 text-muted bg-light" style={{ fontSize: '13px', fontWeight: '600' }}>S.NO.</th>
                <th className="py-3 px-4 text-muted bg-light" style={{ fontSize: '13px', fontWeight: '600' }}>CUSTOMER NAME</th>
                <th className="py-3 px-4 text-muted bg-light" style={{ fontSize: '13px', fontWeight: '600' }}>PURCHASED SERVICES</th>
                <th className="py-3 px-4 text-muted bg-light" style={{ fontSize: '13px', fontWeight: '600' }}>SETUP STATUS</th>
                <th className="py-3 px-4 text-muted bg-light" style={{ fontSize: '13px', fontWeight: '600' }}>SETUP LINK</th>
                <th className="py-3 px-4 text-muted text-center bg-light" style={{ fontSize: '13px', fontWeight: '600' }}>ACTION</th>
              </tr>
            </thead>
            <tbody className="border-top-0">
              {clients.map((client, index) => (
                <tr key={client.id} className="hover-bg-light" style={{ transition: 'background-color 0.2s ease' }}>
                  <td className="py-4 px-4 text-muted fw-medium">{index + 1}</td>
                  <td className="py-4 px-4">
                    <div className="d-flex align-items-center">
                      <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex justify-content-center align-items-center fw-bold me-3 shadow-sm" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="fw-bold text-dark fs-6">{client.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="d-flex flex-column gap-2">
                    {client.services && client.services.length > 0 ? (
                      client.services.map(s => {
                        const srv = AVAILABLE_SERVICES.find(x => x.id === s);
                        return (
                          <div key={s} className="d-flex align-items-center bg-primary bg-opacity-10 px-2 py-1 rounded shadow-sm" style={{ fontSize: '13px', width: 'fit-content' }}>
                            <span className="text-primary fw-bold">{srv ? srv.shortName : s}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-muted fst-italic" style={{ fontSize: '13px' }}>No Services</span>
                    )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="d-flex flex-column gap-2">
                    {client.services && client.services.length > 0 ? (
                      client.services.map(s => {
                        const srv = AVAILABLE_SERVICES.find(x => x.id === s);
                        const shortName = srv ? srv.shortName : s;
                        const isDone = client.completedSetups && client.completedSetups.includes(s);
                        return (
                          <div key={s} className="d-flex align-items-center bg-light px-2 py-1 rounded" style={{ fontSize: '13px', width: 'fit-content' }}>
                            {isDone ? (
                              <><CheckCircle size={14} className="text-success me-2" /><span className="text-success fw-bold">{shortName} Done</span></>
                            ) : (
                              <><span className="text-warning me-2 fw-bold" style={{ fontSize: '14px' }}>⏳</span><span className="text-warning fw-bold">{shortName} Pending</span></>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-muted fst-italic" style={{ fontSize: '13px' }}>No Services</span>
                    )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      className={`btn btn-sm border d-flex align-items-center justify-content-center p-2 rounded-circle shadow-sm mx-auto ${client.email ? 'bg-light text-muted' : 'btn-light text-dark'}`}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/setup/${client.qrToken}`);
                        alert('General Setup link copied! Send this to the client.');
                      }}
                      disabled={!!client.email}
                      title={client.email ? "Setup already completed" : "Copy Setup Link"}
                      style={{ 
                        width: '36px', height: '36px',
                        transition: 'all 0.2s ease',
                        cursor: client.email ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => { if(!client.email) { e.currentTarget.style.backgroundColor = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; } }}
                      onMouseLeave={(e) => { if(!client.email) { e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.borderColor = '#dee2e6'; } }}
                    >
                      <Copy size={16} />
                    </button>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button 
                      className="btn btn-sm btn-light text-primary border rounded-circle p-2 shadow-sm" 
                      onClick={() => openEditModal(client)} 
                      title="Edit Client"
                      style={{ transition: 'all 0.2s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eef2ff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
                    >
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted bg-light">No clients found. Click "Create QR / Client" to begin.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Client Modal */}
      {showCreateModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                <h5 className="modal-title fw-bold">{isEdit ? 'Update Client & Services' : 'Create New Client'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleCreateClient}>
                  <div className="mb-3 position-relative">
                    <label className="form-label text-muted fw-bold" style={{ fontSize: '13px' }}>Select Services</label>
                    <div 
                      className="form-control p-2 d-flex justify-content-between align-items-center" 
                      onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                      style={{ cursor: 'pointer', minHeight: '40px' }}
                    >
                      <span className={!newClient.services || newClient.services.length === 0 ? "text-muted" : "fw-bold text-primary"}>
                        {!newClient.services || newClient.services.length === 0 
                          ? "Select services..." 
                          : newClient.services.map(s => {
                              const serv = AVAILABLE_SERVICES.find(x => x.id === s);
                              return serv ? serv.shortName : s;
                            }).join(', ')}
                      </span>
                      <span className="text-muted" style={{ fontSize: '12px' }}>▼</span>
                    </div>
                    
                    {showServiceDropdown && (
                      <div className="position-absolute w-100 bg-white border rounded shadow mt-1" style={{ zIndex: 1055 }}>
                        {AVAILABLE_SERVICES.map((srv, idx) => (
                          <label key={srv.id} className={`d-flex align-items-center gap-2 p-3 ${idx !== AVAILABLE_SERVICES.length - 1 ? 'border-bottom' : ''} m-0`} style={{ cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              className="form-check-input mt-0"
                              checked={newClient.services.includes(srv.id)}
                              onChange={() => handleServiceToggle(srv.id)}
                            />
                            <span className="fw-bold text-dark">{srv.name}</span>
                            <span className="badge bg-light text-success ms-auto">₹{srv.price.toLocaleString()}/mo</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted fw-bold" style={{ fontSize: '13px' }}>Customer Name</label>
                    <input
                      type="text"
                      className="form-control p-2"
                      placeholder="e.g. John Doe / Pizza House"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted fw-bold" style={{ fontSize: '13px' }}>Email (Optional for now)</label>
                    <input
                      type="email"
                      className="form-control p-2"
                      placeholder="e.g. contact@example.com"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted fw-bold" style={{ fontSize: '13px' }}>Password (Optional)</label>
                    <input
                      type="text"
                      className="form-control p-2"
                      placeholder="e.g. password123"
                      value={newClient.password}
                      onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                    />
                  </div>
                  {newClient.services.length > 0 && (
                    <div className="mb-3">
                      <label className="form-label text-muted fw-bold mb-2" style={{ fontSize: '13px' }}>Durations (Months)</label>
                      <div className="d-flex flex-wrap gap-2">
                        {newClient.services.map(sId => {
                          const srv = AVAILABLE_SERVICES.find(x => x.id === sId);
                          return (
                            <div key={sId} className="d-flex align-items-center bg-light border rounded px-2 py-1 flex-grow-1">
                              <span className="fw-bold text-secondary small me-auto text-truncate">{srv ? srv.shortName : sId}</span>
                              <input 
                                type="number" 
                                min="1"
                                className="form-control form-control-sm text-center border-0 bg-white ms-2 shadow-sm" 
                                style={{ width: '50px' }}
                                value={newClient.serviceDurations?.[sId] || ''}
                                onChange={(e) => setNewClient({
                                  ...newClient, 
                                  serviceDurations: { ...newClient.serviceDurations, [sId]: parseInt(e.target.value) || '' }
                                })}
                                required
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 text-end pt-2 border-top">
                        <span className="fw-bold text-dark">Total Price: </span>
                        <span className="fw-bold text-success fs-5">₹{calculateMonthlyPrice().toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  <div className="d-flex justify-content-end gap-2 mt-4">
                    <button type="button" className="btn btn-light bg-white border" onClick={() => setShowCreateModal(false)}>Cancel</button>
                    <button type="submit" className="btn text-white px-4" style={{ backgroundColor: '#5e35b1' }}>{isEdit ? 'Update Client' : 'Create Client'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
