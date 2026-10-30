
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import syncService from '../../services/syncService';
import { Plus, Edit, ExternalLink, QrCode, Download, Trash2, ToggleRight, ToggleLeft } from 'lucide-react';

const getRenewalStatus = (expiryDateStr) => {
  if (!expiryDateStr) return { formattedDate: 'N/A', daysLeft: null, isExpiringSoon: false, isExpired: false };
  const expDate = new Date(expiryDateStr);
  if (isNaN(expDate.getTime())) return { formattedDate: 'N/A', daysLeft: null, isExpiringSoon: false, isExpired: false };

  const formattedDate = expDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isExpired = daysLeft <= 0;
  const isExpiringSoon = daysLeft <= 4;

  return { formattedDate, daysLeft, isExpiringSoon, isExpired };
};

const CreateQRPersonal = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editClient, setEditClient] = useState(null);
  const [viewQR, setViewQR] = useState(null);
  const navigate = useNavigate();

  const fetchClients = async () => {
    try {
      const data = await adminService.getClients();
      const list = Array.isArray(data) ? data : [];
      const filteredData = list.filter(c => c.services && c.services.includes('personal_qr'));
      setClients(filteredData);
    } catch (err) {
      console.error('Failed to load personal QR clients:', err);
    }
  };

  useEffect(() => {
    fetchClients();

    // Instant real-time cross-tab sync
    const unsubscribe = syncService.subscribe(() => {
      if (!editClient) {
        fetchClients();
      }
    });

    // Gentle 10-second idle background refresh (only when tab is active)
    const interval = setInterval(() => {
      if (document.hidden) return;
      if (!editClient) {
        fetchClients();
      }
    }, 10000);

    const onFocusOrVisible = () => {
      if (!editClient) {
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
  }, [editClient]);

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    if (editClient && editClient.id) {
      try {
        await adminService.updateClient(editClient.id, editClient);
        setEditClient(null);
        await fetchClients();
      } catch (err) {
        alert('Failed to update client: ' + (err.message || 'Server error'));
      }
    }
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm("Are you sure you want to remove the Personal QR service from this client?")) {
      try {
        await adminService.removeService(id, 'personal_qr');
        await fetchClients();
      } catch (err) {
        alert('Failed to remove service: ' + (err.message || 'Server error'));
      }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await adminService.toggleSuspension(id, 'personal_qr');
      await fetchClients();
    } catch (err) {
      alert('Failed to toggle status: ' + (err.message || 'Server error'));
    }
  };

  const handleDownloadQR = async () => {
    if (!viewQR) return;
    try {
      const token = viewQR.personalQrToken || viewQR.qrToken;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.location.origin + '/' + token)}`;
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
    navigate('/personal_qr_dashboard');
  };

  return (
    <div>
      {/* Header Area */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark m-0">QR List For Personal</h3>
      </div>

      {/* Table Area */}
      <div className="card shadow-sm border-0 rounded-4 p-4 mt-2">
        <div className="table-responsive" style={{ height: 'calc(100vh - 210px)', overflowY: 'auto' }}>
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-muted position-sticky top-0" style={{ zIndex: 2 }}>
              <tr>
                <th className="py-3 border-0 bg-light">S.No.</th>
                <th className="py-3 border-0 bg-light">CUSTOMER NAME</th>
                <th className="py-3 border-0 bg-light">RENEWAL DATE</th>
                <th className="py-3 border-0 bg-light">SETUP LINK</th>
                <th className="py-3 border-0 bg-light">QR & LINKS</th>
                <th className="py-3 border-0 bg-light">LOGIN</th>
                <th className="py-3 border-0 bg-light">STATUS</th>
                <th className="py-3 border-0 bg-light">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-3 border-0 text-muted">{idx + 1}</td>
                  <td className="py-3 border-0">
                    <div className="fw-bold text-primary">{item.name}</div>
                    <div className="text-muted small">
                      <strong>Created:</strong> {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </div>
                  </td>

                  {(() => {
                    const expiry = item.serviceExpiries?.['personal_qr'] || item.expireAt;
                    const { formattedDate, daysLeft, isExpiringSoon, isExpired } = getRenewalStatus(expiry);
                    return (
                      <td className="py-3 border-0">
                        <div className={isExpiringSoon ? "fw-bold text-danger" : "fw-medium text-dark"}>
                          {formattedDate}
                        </div>
                        {daysLeft !== null && (
                          <span className={`badge ${isExpiringSoon ? 'bg-danger text-white' : 'bg-light text-secondary border'} small mt-1`}>
                            {isExpired ? 'Expired' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                          </span>
                        )}
                      </td>
                    );
                  })()}
                  <td className="py-3 border-0 text-dark">
                    <button
                      className={`btn btn-sm border-0 fw-bold px-3 py-2 rounded-pill ${item.email ? 'bg-light text-muted' : 'text-primary bg-primary bg-opacity-10'}`}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/setup/${item.qrToken}`);
                        alert('Setup link copied! Send this to the client.');
                      }}
                      disabled={!!item.email}
                      title={item.email ? "Setup is already completed" : "Copy Setup Link"}
                    >
                      Copy Setup Link
                    </button>
                  </td>
                  <td className="py-3 border-0">
                    {item.completedSetups?.includes('personal_qr') ? (
                      <div className="d-flex align-items-center gap-2">
                        <button
                          onClick={() => setViewQR(item)}
                          className="btn btn-sm btn-light border-0 d-flex align-items-center justify-content-center text-primary fw-bold"
                          title="View QR"
                          style={{ width: '32px', height: '32px' }}
                        >
                          <QrCode size={16} />
                        </button>
                        <a href={`/${item.personalQrToken || item.qrToken}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-light border-0 text-secondary fw-bold d-flex align-items-center justify-content-center" title="View Public Page" style={{ width: '32px', height: '32px' }}>
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted small fst-italic">Awaiting Setup...</span>
                    )}
                  </td>
                  <td className="py-3 border-0">
                    <button
                      onClick={() => handleAdminAutoLogin(item)}
                      className="btn text-white px-3 py-1 border-0 shadow-sm"
                      style={{
                        backgroundColor: item.email ? '#5e35b1' : '#a7a7a7',
                        fontSize: '12px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: item.email ? 'pointer' : 'not-allowed'
                      }}
                      disabled={!item.email}
                      title={item.email ? "Login as client" : "Awaiting client authentication"}
                    >
                      Login
                    </button>
                  </td>
                  <td className="py-3 border-0">
                    <button onClick={() => handleToggleStatus(item.id)} className="btn btn-link p-0 text-decoration-none shadow-none border-0" title={item.suspendedServices?.includes('personal_qr') ? "Activate Service" : "Suspend Service"}>
                      {!(item.suspendedServices?.includes('personal_qr')) ? <ToggleRight size={26} className="text-primary" /> : <ToggleLeft size={26} className="text-muted" />}
                    </button>
                  </td>
                  <td className="py-3 border-0">
                    <button className="btn btn-sm text-danger px-2" onClick={() => handleDeleteClient(item.id)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted border-0">No clients found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Client Modal */}
      {editClient && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-bottom-0 pb-0 pt-4 px-4">
                <h5 className="modal-title fw-bold">Update Client</h5>
                <button type="button" className="btn-close" onClick={() => setEditClient(null)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleUpdateClient}>
                  <div className="mb-3">
                    <label className="form-label text-muted fw-bold" style={{ fontSize: '13px' }}>Customer Name</label>
                    <input
                      type="text"
                      className="form-control p-2"
                      value={editClient.name}
                      onChange={(e) => setEditClient({ ...editClient, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted fw-bold" style={{ fontSize: '13px' }}>Email</label>
                    <input
                      type="email"
                      className="form-control p-2"
                      value={editClient.email || ''}
                      onChange={(e) => setEditClient({ ...editClient, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted fw-bold" style={{ fontSize: '13px' }}>Password</label>
                    <input
                      type="text"
                      className="form-control p-2"
                      value={editClient.password || ''}
                      onChange={(e) => setEditClient({ ...editClient, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-4">
                    <button type="button" className="btn btn-light bg-white border" onClick={() => setEditClient(null)}>Cancel</button>
                    <button type="submit" className="btn text-white px-4" style={{ backgroundColor: '#5e35b1' }}>Update Client</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
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
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/' + (viewQR.personalQrToken || viewQR.qrToken))}`}
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

export default CreateQRPersonal;
