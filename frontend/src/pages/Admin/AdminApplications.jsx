import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react';
import { Check, X, Eye, FileText, User, Trash2, AlertCircle } from 'lucide-react';
import apiClient from '../../services/apiClient';

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/cleaner-applications');
      if (res.success) {
        setApplications(res.applications || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (app, status, reason = '') => {
    const id = app._id;
    const endpoint = app.isExistingCleaner 
      ? `/admin/cleaner-kyc/${id}` 
      : `/admin/cleaner-applications/${id}`;

    try {
      setProcessing(true);
      const res = await apiClient.put(endpoint, { 
        status, 
        rejectionNote: reason || rejectionReason 
      });
      
      if (res.success) {
        setApplications(prev => prev.map(item => 
          item._id === id ? { ...item, status, rejectionNote: reason || rejectionReason } : item
        ));
        setIsRejecting(false);
        setRejectionReason('');
        setShowModal(false);
      }
    } catch (err) {
      setActionError(err.message || 'Update failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setProcessing(true);
      const res = await apiClient.delete(`/admin/cleaner-applications/${id}`);
      if (res.success) {
        setApplications(prev => prev.filter(app => app._id !== id));
        setShowModal(false);
        setConfirmDeleteId(null);
      }
    } catch (err) {
      setActionError(err.message || 'Delete failed. Please try again.');
      setConfirmDeleteId(null);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      {actionError && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {actionError}
          <button onClick={() => setActionError('')} style={{ background: 'none', border: 'none', color: '#ff5555', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{ width: 420, padding: '40px 48px', borderRadius: 32, border: '1px solid rgba(255,50,50,0.2)', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,50,50,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Trash2 size={24} color="var(--error)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Delete Application?</h2>
            <p className="text-secondary" style={{ fontSize: 14, marginBottom: 28 }}>This will permanently delete this application and cannot be undone.</p>
            <div className="flex gap-12">
              <button className="btn btn-glass w-full" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn w-full" style={{ background: 'var(--error)', color: '#fff', borderRadius: 14 }} disabled={processing} onClick={() => handleDelete(confirmDeleteId)}>
                {processing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Recruitments</h1>
          <p className="text-secondary" style={{ fontSize: 14 }}>Review and approve new cleaner applications</p>
        </div>
        <div className="flex gap-12">
          <div className="glass" style={{ padding: '8px 16px', borderRadius: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', display: 'block' }}>PENDING</span>
            <span style={{ fontSize: 18, fontWeight: 900 }}>{applications.filter(a => a.status === 'pending').length}</span>
          </div>
        </div>
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Contact</th>
              <th>City</th>
              <th>Applied Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-48 text-secondary">No applications found.</td></tr>
            ) : applications.map((app) => (
              <tr key={app._id}>
                <td>
                  <div className="flex items-center gap-12">
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--glass-bg)', overflow: 'hidden', border: '1px solid var(--divider)' }}>
                      {app.kyc?.livePhoto ? <img src={app.kyc.livePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={14} style={{ margin: 8, color: 'var(--text-tertiary)' }} />}
                    </div>
                    <span style={{ fontWeight: 600 }}>{app.name}</span>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{app.phone}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{app.email || 'No email provided'}</div>
                </td>
                <td className="text-secondary">{app.city}</td>
                <td className="text-secondary">{new Date(app.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className={`chip ${app.status === 'pending' ? 'chip-warning' : app.status === 'approved' ? 'chip-success' : 'chip-ghost'}`}>
                    {app.status.toUpperCase()}
                  </span>
                  {app.rejectionNote && <div style={{ fontSize: 10, color: '#DC2626', marginTop: 4, fontWeight: 500 }}>{app.rejectionNote}</div>}
                </td>
                <td>
                  <div className="flex justify-end gap-8">
                    <button className="btn-icon btn-glass" onClick={() => { setSelectedApp(app); setIsRejecting(false); setShowModal(true); }}>
                      <Eye size={16} />
                    </button>
                    {app.status === 'pending' && (
                      <>
                        <button className="btn-icon btn-glass" style={{ color: 'var(--accent-lime)' }} onClick={() => handleStatusUpdate(app, 'approved')}>
                          <Check size={16} />
                        </button>
                        <button className="btn-icon btn-glass text-error" onClick={() => { setSelectedApp(app); setIsRejecting(true); setShowModal(true); }}>
                          <X size={16} />
                        </button>
                      </>
                    )}
                    <button className="btn-icon btn-glass text-error" onClick={() => setConfirmDeleteId(app._id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedApp && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowModal(false)}>
          <div className="modal-content glass-solid" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, padding: 40, position: 'relative' }}>
            <button 
              className="btn-icon btn-glass" 
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: 24, right: 24 }}
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-24" style={{ marginBottom: 40 }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: 'var(--glass-bg)', overflow: 'hidden', border: '1px solid var(--divider)' }}>
                {selectedApp.kyc?.livePhoto ? <img src={selectedApp.kyc.livePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={40} style={{ margin: 20, color: 'var(--text-tertiary)' }} />}
              </div>
              <div>
                <div className="flex items-center gap-12">
                  <h2 style={{ fontSize: 28, fontWeight: 900 }}>{selectedApp.name}</h2>
                  <span className={`chip ${selectedApp.status === 'pending' ? 'chip-warning' : selectedApp.status === 'approved' ? 'chip-success' : 'chip-ghost'}`} style={{ fontSize: 10 }}>
                    {selectedApp.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-secondary" style={{ marginTop: 4 }}>Applied on {new Date(selectedApp.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, marginBottom: 40 }}>
              <div className="space-y-32">
                <section>
                  <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 16 }}>CONTACT & PERSONAL</h4>
                  <div className="space-y-12">
                    <div className="flex justify-between items-center"><span className="text-secondary text-sm">Phone Number</span> <span className="font-bold">{selectedApp.phone}</span></div>
                    <div className="flex justify-between items-center">
                      <span className="text-secondary text-sm">Age</span> 
                      <span className="font-bold">{selectedApp.age ? `${selectedApp.age} years` : 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-secondary text-sm">Father's Name</span> 
                      <span className="font-bold">{selectedApp.fatherName || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between items-center"><span className="text-secondary text-sm">City</span> <span className="font-bold">{selectedApp.city}</span></div>
                  </div>
                </section>

                <section>
                  <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 16 }}>ADDRESS DETAILS</h4>
                  <div className="glass p-16 rounded-2xl border-divider" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-sm font-semibold">{selectedApp.currentAddress || 'Current address not specified'}</p>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>PERMANENT ADDRESS</span>
                      <p className="text-xs text-secondary">{selectedApp.permanentAddress || 'Same as current or not provided'}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 16 }}>LOCAL REFERENCE</h4>
                  <div className="flex gap-16">
                    <div className="flex-1 glass p-12 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <span className="text-tertiary block text-xs mb-4">NAME</span>
                      <strong style={{ color: selectedApp.localReference?.name ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {selectedApp.localReference?.name || 'N/A'}
                      </strong>
                    </div>
                    <div className="flex-1 glass p-12 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <span className="text-tertiary block text-xs mb-4">PHONE</span>
                      <strong style={{ color: selectedApp.localReference?.phone ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {selectedApp.localReference?.phone || 'N/A'}
                      </strong>
                    </div>
                  </div>
                </section>
              </div>

              <div>
                <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 16 }}>KYC VERIFICATION</h4>
                <div className="space-y-16">
                  <div className="doc-preview-card">
                    <div className="flex justify-between items-center mb-8">
                      <span className="text-xs font-bold text-tertiary">AADHAAR CARD</span>
                      {selectedApp.kyc?.aadhaarPhoto && <span className="chip chip-success" style={{ fontSize: 9, padding: '2px 6px' }}>UPLOADED</span>}
                    </div>
                    <div className="preview-box">
                      {selectedApp.kyc?.aadhaarPhoto ? (
                        <img src={selectedApp.kyc.aadhaarPhoto} alt="Aadhaar" onClick={() => window.open(selectedApp.kyc.aadhaarPhoto)} />
                      ) : (
                        <div className="placeholder flex flex-col items-center gap-8">
                          <FileText size={24} />
                          <span style={{ fontSize: 10 }}>No document</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="doc-preview-card">
                    <div className="flex justify-between items-center mb-8">
                      <span className="text-xs font-bold text-tertiary">PAN CARD</span>
                      {selectedApp.kyc?.panPhoto && <span className="chip chip-success" style={{ fontSize: 9, padding: '2px 6px' }}>UPLOADED</span>}
                    </div>
                    <div className="preview-box">
                      {selectedApp.kyc?.panPhoto ? (
                        <img src={selectedApp.kyc.panPhoto} alt="PAN" onClick={() => window.open(selectedApp.kyc.panPhoto)} />
                      ) : (
                        <div className="placeholder flex flex-col items-center gap-8">
                          <FileText size={24} />
                          <span style={{ fontSize: 10 }}>No document</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedApp.status === 'rejected' && selectedApp.rejectionNote && (
              <div className="glass p-16 rounded-2xl border-error flex gap-12 items-start mb-32" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                <AlertCircle size={20} className="text-error" />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#DC2626' }}>REJECTION REASON</p>
                  <p style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>{selectedApp.rejectionNote}</p>
                </div>
              </div>
            )}

            {isRejecting ? (
              <div className="glass p-24 rounded-2xl" style={{ animation: 'slideUp 0.3s ease' }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 16 }}>State reason for rejection</h4>
                <textarea 
                  className="input-field" 
                  placeholder="e.g. Invalid Aadhaar, Image not clear, Age not as per requirement..."
                  style={{ minHeight: 100, marginBottom: 16 }}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
                <div className="flex justify-end gap-12">
                  <button className="btn btn-ghost" onClick={() => setIsRejecting(false)}>Cancel</button>
                  <button className="btn btn-primary bg-error" disabled={!rejectionReason || processing} onClick={() => handleStatusUpdate(selectedApp, 'rejected')}>
                    {processing ? 'Processing...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            ) : selectedApp.status === 'pending' ? (
              <div className="flex justify-end gap-16 pt-32 border-t border-divider">
                <button className="btn btn-outline text-error" onClick={() => setIsRejecting(true)}>Reject Candidate</button>
                <button className="btn btn-primary" disabled={processing} onClick={() => handleStatusUpdate(selectedApp, 'approved')}>
                  {processing ? 'Processing...' : selectedApp.isExistingCleaner ? 'Approve KYC' : 'Approve & Create Account'}
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center pt-32 border-t border-divider">
                <div className="text-secondary text-sm flex items-center gap-8">
                  <Check size={16} /> Application has been processed
                </div>
                <button className="btn btn-ghost text-error flex items-center gap-8" onClick={() => { setConfirmDeleteId(selectedApp._id); setShowModal(false); }}>
                  <Trash2 size={16} /> Delete Application
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .doc-preview-card { background: var(--bg-glass); padding: 12px; border-radius: 20px; border: 1px solid var(--divider); }
        .preview-box { aspect-ratio: 16/10; border-radius: 12px; overflow: hidden; margin-top: 8px; background: #000; display: flex; align-items: center; justify-content: center; }
        .preview-box img { width: 100%; height: 100%; object-fit: contain; cursor: pointer; transition: 0.2s; }
        .preview-box img:hover { transform: scale(1.05); }
        .placeholder { color: var(--text-tertiary); }
        .chip-warning { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
        .text-error { color: #EF4444; }
        .bg-error { background: #EF4444 !important; border-color: #EF4444 !important; }
        .border-error { border-color: rgba(239, 68, 68, 0.2) !important; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        /* Override glass hover for modal elements */
        .modal-content .glass:hover { background: rgba(255,255,255,0.02) !important; }
      `}</style>
    </div>
  );
}


