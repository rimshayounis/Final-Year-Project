'use client';

import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000/api';

interface DoctorProfile {
  licenseNumber: string;
  specialization: string;
  certificates: string[];
  isVerified: boolean;
  registeredAt: string;
}

interface Doctor {
  _id: string;
  fullName: string;
  email: string;
  doctorProfile: DoctorProfile;
  subscriptionPlan: string;
  createdAt: string;
}

interface UserProfile {
  bio?: string;
  profileImage?: string;
}

type FilterTab = 'all' | 'pending' | 'verified';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filtered, setFiltered] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Modal
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Verify loading
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all doctors
  useEffect(() => {
    fetch(`${BASE_URL}/doctors`)
  .then(r => r.json())
  .then(data => {
    const list: Doctor[] = Array.isArray(data) ? data : (data.doctors || data.data || []);
    setDoctors(list);
    setFiltered(list);
  })
      
      .catch(() => showToast('Failed to load doctors', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Filter + search
  useEffect(() => {
    let result = doctors;
    if (activeTab === 'pending')  result = result.filter(d => !d.doctorProfile?.isVerified);
    if (activeTab === 'verified') result = result.filter(d => d.doctorProfile?.isVerified);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d =>
        d.fullName.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.doctorProfile?.specialization?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeTab, doctors]);

  // Open modal
  const openDoctor = async (doctor: Doctor) => {
    setSelected(doctor);
    setProfile(null);
    setModalLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/profiles/doctor/${doctor._id}`);
      const data = await res.json();
      setProfile(data.data || {});
    } catch {
      setProfile({});
    } finally {
      setModalLoading(false);
    }
  };

  // Verify doctor
  const verifyDoctor = async (doctorId: string, doctorName: string) => {
    setVerifyingId(doctorId);
    try {
      const res = await fetch(`${BASE_URL}/doctors/${doctorId}/verify`, { method: 'PUT' });
      if (res.ok) {
        setDoctors(prev =>
          prev.map(d =>
            d._id === doctorId
              ? { ...d, doctorProfile: { ...d.doctorProfile, isVerified: true } }
              : d
          )
        );
        if (selected?._id === doctorId) {
          setSelected(prev => prev ? { ...prev, doctorProfile: { ...prev.doctorProfile, isVerified: true } } : null);
        }
        showToast(`Dr. ${doctorName} verified successfully`, 'success');
      } else {
        showToast('Failed to verify doctor', 'error');
      }
    } catch {
      showToast('Failed to verify doctor', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  // Delete doctor
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BASE_URL}/doctors/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) {
        setDoctors(prev => prev.filter(d => d._id !== deleteTarget._id));
        showToast(`Dr. ${deleteTarget.fullName} removed from platform`, 'success');
        setDeleteTarget(null);
        if (selected?._id === deleteTarget._id) setSelected(null);
      } else {
        showToast('Failed to delete doctor', 'error');
      }
    } catch {
      showToast('Failed to delete doctor', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const counts = {
    all:      doctors.length,
    pending:  doctors.filter(d => !d.doctorProfile?.isVerified).length,
    verified: doctors.filter(d =>  d.doctorProfile?.isVerified).length,
  };

  const initials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  const avatarColor = (name: string) => {
    const colors = ['#0891b2', '#059669', '#7c3aed', '#d97706', '#db2777', '#4f46e5'];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const planColors: Record<string, { bg: string; color: string }> = {
    free_trial:   { bg: '#f3f4f8', color: '#666' },
    basic:        { bg: '#dbeafe', color: '#1d4ed8' },
    professional: { bg: '#ede9fe', color: '#6d28d9' },
    premium:      { bg: '#fef3c7', color: '#d97706' },
  };

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctors</h1>
          <p className="page-sub">Review and approve doctor registration requests</p>
        </div>
        <div className="header-stats">
          <div className="hstat">
            <span className="hstat-val" style={{ color: '#4f46e5' }}>{counts.all}</span>
            <span className="hstat-label">Total</span>
          </div>
          <div className="hstat-divider" />
          <div className="hstat">
            <span className="hstat-val" style={{ color: '#d97706' }}>{counts.pending}</span>
            <span className="hstat-label">Pending</span>
          </div>
          <div className="hstat-divider" />
          <div className="hstat">
            <span className="hstat-val" style={{ color: '#059669' }}>{counts.verified}</span>
            <span className="hstat-label">Verified</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="tab-group">
          {(['all', 'pending', 'verified'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'pending' && <span className="tab-dot pending" />}
              {tab === 'verified' && <span className="tab-dot verified" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="tab-count">{counts[tab]}</span>
            </button>
          ))}
        </div>
        <div className="search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name, email or specialization..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="clear-btn" onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading doctors...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🩺</div>
          <p>No doctors found</p>
          <span>Try adjusting your search or filter</span>
        </div>
      ) : (
        <div className="cards-grid">
          {filtered.map(doctor => (
            <div key={doctor._id} className="doctor-card">
              {/* Card Top */}
              <div className="card-top">
                <div className="card-avatar-wrap">
                  <div className="card-avatar" style={{ background: avatarColor(doctor.fullName) }}>
                    {initials(doctor.fullName)}
                  </div>
                  <div className={`verify-ring ${doctor.doctorProfile?.isVerified ? 'verified' : 'pending'}`} />
                </div>
                <div className="card-status-badge">
                  {doctor.doctorProfile?.isVerified ? (
                    <span className="badge verified">✓ Verified</span>
                  ) : (
                    <span className="badge pending">⏳ Pending</span>
                  )}
                </div>
              </div>

              {/* Card Info */}
              <div className="card-info">
                <h3 className="card-name">Dr. {doctor.fullName}</h3>
                <p className="card-spec">{doctor.doctorProfile?.specialization}</p>
                <p className="card-email">{doctor.email}</p>
              </div>

              {/* Card Meta */}
              <div className="card-meta">
                <div className="meta-item">
                  <span className="meta-label">License</span>
                  <span className="meta-val">{doctor.doctorProfile?.licenseNumber}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Plan</span>
                  <span
                    className="meta-plan"
                    style={planColors[doctor.subscriptionPlan] || planColors.free_trial}
                  >
                    {doctor.subscriptionPlan?.replace('_', ' ')}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Certificates</span>
                  <span className="meta-val">{doctor.doctorProfile?.certificates?.length || 0} uploaded</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Joined</span>
                  <span className="meta-val">
                    {new Date(doctor.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="card-actions">
                <button className="btn-view-profile" onClick={() => openDoctor(doctor)}>
                  View Profile
                </button>
                {!doctor.doctorProfile?.isVerified ? (
                  <button
                    className="btn-approve"
                    onClick={() => verifyDoctor(doctor._id, doctor.fullName)}
                    disabled={verifyingId === doctor._id}
                  >
                    {verifyingId === doctor._id ? 'Approving...' : '✓ Approve'}
                  </button>
                ) : (
                  <button className="btn-approved" disabled>
                    ✓ Approved
                  </button>
                )}
                <button className="btn-remove" onClick={() => setDeleteTarget(doctor)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Doctor Profile Modal */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-doc-info">
                <div className="modal-avatar" style={{ background: avatarColor(selected.fullName) }}>
                  {profile?.profileImage ? (
                    <img src={`http://localhost:3000${profile.profileImage}`} alt={selected.fullName} />
                  ) : initials(selected.fullName)}
                </div>
                <div>
                  <div className="modal-name-row">
                    <h2 className="modal-name">Dr. {selected.fullName}</h2>
                    {selected.doctorProfile?.isVerified
                      ? <span className="badge verified small">✓ Verified</span>
                      : <span className="badge pending small">⏳ Pending</span>
                    }
                  </div>
                  <p className="modal-spec">{selected.doctorProfile?.specialization}</p>
                  <p className="modal-email">{selected.email}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {modalLoading ? (
                <div className="modal-loading"><div className="spinner" /><p>Loading...</p></div>
              ) : (
                <>
                  {/* Professional Info */}
                  <div className="info-section">
                    <h3 className="info-title">Professional Information</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">License Number</span>
                        <span className="info-value">{selected.doctorProfile?.licenseNumber}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Specialization</span>
                        <span className="info-value">{selected.doctorProfile?.specialization}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Subscription Plan</span>
                        <span
                          className="info-value plan-chip"
                          style={planColors[selected.subscriptionPlan] || planColors.free_trial}
                        >
                          {selected.subscriptionPlan?.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Joined</span>
                        <span className="info-value">
                          {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      {profile?.bio && (
                        <div className="info-item full">
                          <span className="info-label">Bio</span>
                          <span className="info-value">{profile.bio}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Certificates */}
                  <div className="info-section">
                    <h3 className="info-title">
                      Certificates
                      <span className="cert-count">{selected.doctorProfile?.certificates?.length || 0} files</span>
                    </h3>
                    {selected.doctorProfile?.certificates?.length > 0 ? (
                      <div className="certs-grid">
                        {selected.doctorProfile.certificates.map((cert, i) => (
                          <a
                            key={i}
                            href={`http://localhost:3000/uploads/${cert.replace(/\\/g, '/').replace(/^uploads\//, '').replace(/^\.\/uploads\//, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cert-card"
                          >
                            <div className="cert-icon">📄</div>
                            <div className="cert-info">
                              <span className="cert-name">Certificate {i + 1}</span>
                              <span className="cert-view">View →</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="no-certs">No certificates uploaded</p>
                    )}
                  </div>

                  {/* Modal Actions */}
                  <div className="modal-actions">
                    {!selected.doctorProfile?.isVerified ? (
                      <button
                        className="btn-approve-modal"
                        onClick={() => verifyDoctor(selected._id, selected.fullName)}
                        disabled={verifyingId === selected._id}
                      >
                        {verifyingId === selected._id ? 'Approving...' : '✓ Approve Doctor'}
                      </button>
                    ) : (
                      <button className="btn-approved-modal" disabled>✓ Already Verified</button>
                    )}
                    <button
                      className="btn-remove-modal"
                      onClick={() => { setSelected(null); setDeleteTarget(selected); }}
                    >
                      🗑 Remove Doctor
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="overlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h3>Remove Doctor?</h3>
            <p>
              Are you sure you want to remove <strong>Dr. {deleteTarget.fullName}</strong> from TruHealLink?
              This action cannot be undone.
            </p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="btn-confirm-delete" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page { display: flex; flex-direction: column; gap: 24px; position: relative; }

        /* Toast */
        .toast {
          position: fixed; top: 24px; right: 24px; z-index: 9999;
          padding: 12px 20px; border-radius: 12px;
          font-size: 14px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          animation: slideIn 0.3s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .toast.success { background: #d1fae5; color: #065f46; }
        .toast.error   { background: #fee2e2; color: #991b1b; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Header */
        .page-header { display: flex; align-items: center; justify-content: space-between; }
        .page-title  { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .page-sub    { font-size: 13px; color: #888; margin-top: 4px; }

        .header-stats {
          display: flex; align-items: center; gap: 0;
          background: #fff; border: 1px solid #f0f0f5;
          border-radius: 14px; overflow: hidden;
        }
        .hstat { padding: 14px 24px; text-align: center; }
        .hstat-val   { display: block; font-size: 22px; font-weight: 800; }
        .hstat-label { display: block; font-size: 11px; color: #888; font-weight: 500; margin-top: 2px; }
        .hstat-divider { width: 1px; background: #f0f0f5; align-self: stretch; }

        /* Filters */
        .filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .tab-group { display: flex; gap: 6px; }
        .tab {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 10px;
          border: 1px solid #e5e5e5; background: #fff;
          font-size: 13px; font-weight: 500; color: #666;
          cursor: pointer; transition: all 0.15s;
        }
        .tab:hover  { border-color: #4f46e5; color: #4f46e5; }
        .tab.active { background: #4f46e5; color: #fff; border-color: #4f46e5; }
        .tab-dot { width: 7px; height: 7px; border-radius: 50%; }
        .tab-dot.pending  { background: #d97706; }
        .tab-dot.verified { background: #059669; }
        .tab.active .tab-dot.pending  { background: #fde68a; }
        .tab.active .tab-dot.verified { background: #6ee7b7; }
        .tab-count {
          background: rgba(0,0,0,0.08); color: inherit;
          font-size: 11px; font-weight: 700;
          padding: 1px 7px; border-radius: 20px;
        }
        .tab.active .tab-count { background: rgba(255,255,255,0.25); }

        .search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #e5e5e5;
          border-radius: 12px; padding: 10px 16px;
          min-width: 300px;
        }
        .search-wrap input { border: none; outline: none; font-size: 14px; color: #333; background: none; flex: 1; }
        .search-wrap input::placeholder { color: #aaa; }
        .clear-btn { background: none; border: none; cursor: pointer; color: #aaa; font-size: 12px; }

        /* Cards */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 18px;
        }
        .doctor-card {
          background: #fff; border-radius: 18px;
          border: 1px solid #f0f0f5; padding: 20px;
          display: flex; flex-direction: column; gap: 16px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .doctor-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.07); }

        .card-top { display: flex; align-items: flex-start; justify-content: space-between; }
        .card-avatar-wrap { position: relative; }
        .card-avatar {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; font-weight: 700; color: #fff;
        }
        .verify-ring {
          position: absolute; bottom: -3px; right: -3px;
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid #fff;
        }
        .verify-ring.verified { background: #059669; }
        .verify-ring.pending  { background: #d97706; }

        .badge {
          font-size: 11px; font-weight: 700; padding: 4px 10px;
          border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;
        }
        .badge.verified { background: #d1fae5; color: #065f46; }
        .badge.pending  { background: #fef3c7; color: #92400e; }
        .badge.small    { font-size: 10px; padding: 3px 8px; }

        .card-info { }
        .card-name  { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 3px; }
        .card-spec  { font-size: 13px; color: #4f46e5; font-weight: 500; margin-bottom: 3px; }
        .card-email { font-size: 12px; color: #888; }

        .card-meta  { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .meta-item  { display: flex; flex-direction: column; gap: 2px; }
        .meta-label { font-size: 10px; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .meta-val   { font-size: 12px; color: #333; font-weight: 500; }
        .meta-plan  { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; width: fit-content; text-transform: capitalize; }

        .card-actions { display: flex; gap: 6px; align-items: center; margin-top: 2px; }
        .btn-view-profile {
          flex: 1; padding: 8px 12px; border-radius: 10px;
          background: #f3f4f8; color: #333;
          border: 1px solid #e5e5e5; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-view-profile:hover { background: #ede9fe; color: #4f46e5; border-color: #ddd6fe; }
        .btn-approve {
          flex: 1; padding: 8px 12px; border-radius: 10px;
          background: #059669; color: #fff;
          border: none; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-approve:hover:not(:disabled) { background: #047857; }
        .btn-approve:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-approved {
          flex: 1; padding: 8px 12px; border-radius: 10px;
          background: #d1fae5; color: #059669;
          border: 1px solid #a7f3d0; font-size: 12px; font-weight: 700;
          cursor: not-allowed;
        }
        .btn-remove {
          width: 34px; height: 34px; border-radius: 10px;
          background: #fee2e2; color: #dc2626;
          border: 1px solid #fecaca; font-size: 14px;
          cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center;
        }
        .btn-remove:hover { background: #dc2626; }

        /* Loading / Empty */
        .loading-state, .empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 80px 20px; gap: 12px; color: #888;
        }
        .empty-icon { font-size: 48px; }
        .empty-state p    { font-size: 16px; font-weight: 600; color: #444; }
        .empty-state span { font-size: 13px; }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid #f0f0f5; border-top-color: #4f46e5;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Overlay */
        .overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Modal */
        .modal {
          background: #fff; border-radius: 20px;
          width: 100%; max-width: 580px;
          max-height: 85vh; display: flex; flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.25s ease;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 24px 16px; border-bottom: 1px solid #f0f0f5;
        }
        .modal-doc-info { display: flex; align-items: center; gap: 14px; }
        .modal-avatar {
          width: 56px; height: 56px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 700; color: #fff;
          overflow: hidden; flex-shrink: 0;
        }
        .modal-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .modal-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
        .modal-name  { font-size: 18px; font-weight: 700; color: #111; }
        .modal-spec  { font-size: 13px; color: #4f46e5; font-weight: 500; margin-bottom: 2px; }
        .modal-email { font-size: 12px; color: #888; }
        .modal-close {
          width: 32px; height: 32px; border-radius: 8px;
          background: #f3f4f8; border: none; cursor: pointer;
          font-size: 14px; color: #666; transition: background 0.15s;
          flex-shrink: 0;
        }
        .modal-close:hover { background: #e5e5e5; }

        .modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }
        .modal-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: #888; }

        /* Info sections */
        .info-section  { background: #f8f8fc; border-radius: 14px; padding: 16px 18px; }
        .info-title    {
          font-size: 12px; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.5px;
          margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
        }
        .cert-count { font-size: 11px; background: #e5e5e5; color: #555; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
        .info-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .info-item  { display: flex; flex-direction: column; gap: 3px; }
        .info-item.full { grid-column: 1 / -1; }
        .info-label { font-size: 11px; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .info-value { font-size: 14px; color: #222; font-weight: 500; }
        .plan-chip  { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; width: fit-content; text-transform: capitalize; }

        /* Certificates */
        .certs-grid { display: flex; flex-direction: column; gap: 8px; }
        .cert-card  {
          display: flex; align-items: center; gap: 12px;
          background: #fff; border-radius: 10px; padding: 10px 14px;
          border: 1px solid #f0f0f5; text-decoration: none;
          transition: all 0.15s;
        }
        .cert-card:hover { border-color: #4f46e5; background: #fafafe; }
        .cert-icon  { font-size: 22px; }
        .cert-info  { display: flex; flex-direction: column; gap: 1px; }
        .cert-name  { font-size: 13px; font-weight: 600; color: #333; }
        .cert-view  { font-size: 11px; color: #4f46e5; }
        .no-certs   { font-size: 13px; color: #aaa; padding: 8px 0; }

        /* Modal Actions */
        .modal-actions { display: flex; gap: 10px; }
        .btn-approve-modal {
          flex: 1; padding: 12px; border-radius: 12px;
          background: #059669; color: #fff;
          border: none; font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-approve-modal:hover:not(:disabled) { background: #047857; }
        .btn-approve-modal:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-approved-modal {
          flex: 1; padding: 12px; border-radius: 12px;
          background: #d1fae5; color: #059669;
          border: 1px solid #a7f3d0; font-size: 14px; font-weight: 700;
          cursor: not-allowed;
        }
        .btn-remove-modal {
          padding: 12px 20px; border-radius: 12px;
          background: #fee2e2; color: #dc2626;
          border: 1px solid #fecaca; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-remove-modal:hover { background: #dc2626; color: #fff; }

        /* Confirm Modal */
        .confirm-modal {
          background: #fff; border-radius: 20px; padding: 36px;
          width: 100%; max-width: 400px; text-align: center;
          animation: slideUp 0.25s ease;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
        }
        .confirm-icon { font-size: 48px; margin-bottom: 16px; }
        .confirm-modal h3 { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 10px; }
        .confirm-modal p  { font-size: 14px; color: #666; line-height: 1.6; }
        .confirm-actions  { display: flex; gap: 10px; margin-top: 24px; justify-content: center; }
        .btn-cancel {
          padding: 10px 24px; border-radius: 10px;
          background: #f3f4f8; color: #555;
          border: 1px solid #e5e5e5; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-cancel:hover { background: #e5e5e5; }
        .btn-confirm-delete {
          padding: 10px 24px; border-radius: 10px;
          background: #dc2626; color: #fff;
          border: none; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-confirm-delete:hover:not(:disabled) { background: #b91c1c; }
        .btn-confirm-delete:disabled, .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
