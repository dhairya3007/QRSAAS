import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, QrCode, Download, Edit, Trash2, Plus, Copy, ExternalLink, ToggleRight, ToggleLeft } from 'lucide-react';
import { adminService } from '../../services/adminService';
import syncService from '../../services/syncService';
import { AVAILABLE_SERVICES } from './Services';

const CreateQR = () => {
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [newClient, setNewClient] = useState({ name: '', email: '', password: '', services: [], serviceDurations: {} });
  const [loading, setLoading] = useState(false);
  const [viewQR, setViewQR] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();

    // Instant real-time cross-tab sync
    const unsubscribe = syncService.subscribe(() => {
      if (!showModal) {
        fetchClients();
      }
    });

    // Gentle 10-second idle background refresh (only when tab is active)
    const interval = setInterval(() => {
      if (document.hidden) return;
      if (!showModal) {
        fetchClients();
      }
    }, 10000);

    const onFocusOrVisible = () => {
      if (!showModal) {
        fetchClients();
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
  }, [showModal]);

  const fetchClients = async () => {
    try {
      const data = await adminService.getClients();
      const list = Array.isArray(data) ? data : [];
      setClients(list.filter(c => c.services?.includes('restaurant_menu')));
    } catch (err) {
      console.error('Failed to load restaurant clients:', err);
    }
  };

  const handleSaveClient = async () => {
    if (newClient.services.length === 0) {
      alert('Please select at least one service.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await adminService.updateClient(newClient.id, newClient);
      } else {
        await adminService.createClient(newClient);
      }
      await fetchClients();
      setShowModal(false);
      setNewClient({ name: '', email: '', password: '', services: [], serviceDurations: {} });
    } catch (e) {
      alert('Failed to save client: ' + (e.message || 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      try {
        await adminService.deleteClient(id);
        await fetchClients();
      } catch (e) {
        alert('Failed to delete client: ' + (e.message || 'Server error'));
      }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await adminService.toggleSuspension(id, 'restaurant_menu');
      await fetchClients();
    } catch (e) {
      alert('Failed to toggle status: ' + (e.message || 'Server error'));
    }
  };

  const handleAdminAutoLogin = (client) => {
    // Save current admin session before impersonating
    const currentAdmin = localStorage.getItem('auth_user');
    if (currentAdmin && JSON.parse(currentAdmin).role === 'super_admin') {
      localStorage.setItem('original_admin_user', currentAdmin);
    }

    const user = {
      id: client.id,
      email: client.email,
      role: 'client',
      name: client.name,
      qrToken: client.qrToken,
      theme: client.theme,
      services: client.services || []
    };
    localStorage.setItem('auth_user', JSON.stringify(user));

    if (user.services?.includes('restaurant_menu')) {
      navigate('/restaurant_menu_dashboard');
    } else if (user.services?.includes('personal_qr')) {
      navigate('/personal_qr_dashboard');
    } else {
      navigate('/restaurant_menu_dashboard');
    }
  };

  const openModalForNew = () => {
    setIsEdit(false);
    setNewClient({ name: '', email: '', password: '', services: [], serviceDurations: {} });
    setShowModal(true);
  };

  const openModalForEdit = (client) => {
    setIsEdit(true);
    setNewClient({
      ...client,
      serviceDurations: client.serviceDurations || {},
      services: client.services || []
    });
    setShowModal(true);
  };

  const handleServiceToggle = (val) => {
    setNewClient(prev => {
      const currentServices = prev.services || [];
      const isSelected = currentServices.includes(val);
      const newServices = isSelected ? currentServices.filter(s => s !== val) : [...currentServices, val];
      return { ...prev, services: newServices };
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

  const handleDownloadQR = async () => {
    if (!viewQR) return;
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.location.origin + '/' + viewQR.qrToken)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${viewQR.name}-QRCode.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download QR code');
    }
  };

  return (
    <div>
      {/* Header Area */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark m-0">QR List For Restaurant Menu</h3>
      </div>

      {/* Table Area */}
      <div className="card shadow-sm border-0 rounded-4 p-4 mt-2">
        <div className="table-responsive" style={{ height: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-muted position-sticky top-0" style={{ zIndex: 2 }}>
              <tr>
                <th className="py-3 border-0 bg-light">S.No.</th>
                <th className="py-3 border-0 bg-light">CUSTOMER INFO</th>
                <th className="py-3 border-0 bg-light">CREDENTIALS</th>
                <th className="py-3 border-0 bg-light">QR & LINKS</th>
                <th className="py-3 border-0 bg-light">LOGIN</th>
                <th className="py-3 border-0 bg-light">STATUS</th>
                <th className="py-3 border-0 bg-light">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <tr key={client.id}>
                  <td className="py-3 border-0 text-muted">{index + 1}</td>

                  <td className="py-3 border-0">
                    <div className="fw-bold text-primary">{client.name}</div>
                    <div className="text-muted small">
                      <strong>Created:</strong> {client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} <br />
                      <strong>Expires:</strong> {client.serviceExpiries?.['restaurant_menu'] ? new Date(client.serviceExpiries['restaurant_menu']).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (client.expireAt ? new Date(client.expireAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A')}
                    </div>
                  </td>

                  <td className="py-3 border-0 text-dark">
                    <button
                      className={`btn btn-sm border-0 fw-bold px-3 py-2 rounded-pill ${client.email ? 'bg-light text-muted' : 'text-primary bg-primary bg-opacity-10'}`}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/setup/${client.qrToken}`);
                        alert('Setup link copied! Send this to the client.');
                      }}
                      disabled={!!client.email}
                      title={client.email ? "Setup is already completed" : "Copy Setup Link"}
                    >
                      Copy Setup Link
                    </button>
                  </td>

                  <td className="py-3 border-0">
                    {client.completedSetups?.includes('restaurant_menu') ? (
                      <div className="d-flex align-items-center gap-2">
                        <button
                          onClick={() => setViewQR(client)}
                          className="btn btn-sm btn-light border-0 d-flex align-items-center justify-content-center text-primary fw-bold"
                          title="View & Download QR"
                          style={{ width: '32px', height: '32px' }}
                        >
                          <QrCode size={16} />
                        </button>
                        <a href={`/${client.qrToken}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-light border-0 text-secondary fw-bold d-flex align-items-center justify-content-center" title="View Public Page" style={{ width: '32px', height: '32px' }}>
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted small fst-italic">Awaiting Setup...</span>
                    )}
                  </td>

                  <td className="py-3 border-0">
                    <button
                      onClick={() => handleAdminAutoLogin(client)}
                      className="btn text-white px-3 py-1 border-0 shadow-sm"
                      style={{
                        backgroundColor: client.email ? '#5e35b1' : '#a7a7a7',
                        fontSize: '12px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: client.email ? 'pointer' : 'not-allowed'
                      }}
                      disabled={!client.email}
                      title={client.email ? "Login as client" : "Awaiting client authentication"}
                    >
                      Login
                    </button>
                  </td>

                  <td className="py-3 border-0">
                    <button onClick={() => handleToggleStatus(client.id)} className="btn btn-link p-0 text-decoration-none shadow-none border-0" title={client.suspendedServices?.includes('restaurant_menu') ? "Activate Service" : "Suspend Service"}>
                      {!(client.suspendedServices?.includes('restaurant_menu')) ? <ToggleRight size={26} className="text-primary" /> : <ToggleLeft size={26} className="text-muted" />}
                    </button>
                  </td>

                  <td className="py-3 border-0">
                    <button className="btn btn-sm text-danger px-2" onClick={() => handleDeleteClient(client.id)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted border-0">No clients generated yet. Click + to start.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}></div>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                  <h4 className="modal-title fw-bold">{isEdit ? 'Update Client' : 'Create QR & Client'}</h4>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-bold">Customer Business Name</label>
                      <input type="text" className="form-control bg-light border-0" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label text-muted small fw-bold mb-3">Assign Services & Duration</label>
                    <div className="d-flex flex-column gap-3">
                      {AVAILABLE_SERVICES.map(srv => {
                        const isSelected = newClient.services?.includes(srv.id);
                        return (
                          <div key={srv.id} className={`p-3 rounded-3 border ${isSelected ? 'border-primary bg-primary bg-opacity-10' : 'border-light bg-light'}`} style={{ transition: 'all 0.2s' }}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <div className="form-check m-0 d-flex align-items-center gap-2">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`srv-${srv.id}`}
                                  checked={isSelected}
                                  onChange={() => handleServiceToggle(srv.id)}
                                  style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                />
                                <label className="form-check-label fw-bold text-dark" htmlFor={`srv-${srv.id}`} style={{ cursor: 'pointer' }}>
                                  {srv.name} <span className="text-primary small ms-1">(₹{srv.price}/mo)</span>
                                </label>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-3 pt-3 border-top d-flex align-items-center justify-content-between">
                                <span className="small fw-bold text-muted">Plan Duration (Months):</span>
                                <input
                                  type="number"
                                  min="1"
                                  className="form-control form-control-sm text-center fw-bold"
                                  style={{ width: '80px' }}
                                  value={newClient.serviceDurations?.[srv.id] || ''}
                                  onChange={(e) => setNewClient({
                                    ...newClient,
                                    serviceDurations: { ...newClient.serviceDurations, [srv.id]: e.target.value }
                                  })}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card bg-light border-0 p-3 mb-4 d-flex flex-row justify-content-between align-items-center">
                    <span className="fw-bold text-muted">Total Estimated Amount:</span>
                    <span className="fw-bold text-success fs-5">₹{calculateMonthlyPrice()}</span>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-bold">Client Email (Optional - setup later)</label>
                      <input type="email" className="form-control bg-light border-0" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted small fw-bold">Client Password (Optional - setup later)</label>
                      <input type="text" className="form-control bg-light border-0" value={newClient.password} onChange={(e) => setNewClient({ ...newClient, password: e.target.value })} />
                    </div>
                  </div>

                  <div className="text-center pb-2 mt-4">
                    <button onClick={handleSaveClient} disabled={loading} className="btn text-white px-5 py-2 fw-bold" style={{ backgroundColor: '#5e35b1', borderRadius: '8px', minWidth: '200px' }}>
                      {loading ? 'Saving...' : (isEdit ? 'Update Client' : 'Generate QR & Create Client')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View & Download QR Modal */}
      {viewQR && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                <h5 className="modal-title fw-bold text-center w-100">{viewQR.name}</h5>
                <button type="button" className="btn-close position-absolute" style={{ right: '20px' }} onClick={() => setViewQR(null)}></button>
              </div>
              <div className="modal-body p-4 text-center">
                <div className="bg-light p-3 rounded-4 mb-4 d-inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/' + viewQR.qrToken)}`}
                    alt="QR Code"
                    className="img-fluid rounded"
                    style={{ width: '200px', height: '200px' }}
                  />
                </div>
                <button
                  onClick={handleDownloadQR}
                  className="btn text-white w-100 fw-bold py-2 d-flex justify-content-center align-items-center gap-2"
                  style={{ backgroundColor: '#5e35b1', borderRadius: '8px' }}
                >
                  <Download size={18} /> Download QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateQR;
