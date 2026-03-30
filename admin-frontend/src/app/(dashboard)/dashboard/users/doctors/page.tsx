'use client';

import { useEffect, useState } from 'react';
import { MentorLevelBadge, MentorLevelCard, fetchMentorLevels, type MentorLevel } from '@/components/MentorLevelBadge';

const BASE_URL = 'http://localhost:3000/api';

interface DoctorProfile {
  professionalType: 'doctor' | 'psychologist';
  licenseNumber: string;
  specialization: string;
  certificates: string[];
  isVerified: boolean;
  isRejected: boolean;
  rejectionReason: string | null;
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

type FilterTab = 'all' | 'pending' | 'verified' | 'rejected';

export default function ProfessionalsPage() {
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

  // Profile images map { doctorId -> imageUrl | null }
  const [profileImages, setProfileImages] = useState<Record<string, string | null>>({});

  // Mentor levels map { doctorId -> MentorLevel }
  const [mentorLevels, setMentorLevels] = useState<Record<string, MentorLevel>>({});
  const [selectedMentor, setSelectedMentor] = useState<MentorLevel | null | undefined>(undefined);

  // Verify loading
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<Doctor | null>(null);
  const REJECT_REASONS = ['Invalid license', 'Invalid document', 'Incomplete document', 'Other'];
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

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

  // Fetch profile images + mentor levels for all doctors in parallel
  useEffect(() => {
    if (doctors.length === 0) return;
    const ids = doctors.map(d => d._id);
    Promise.allSettled(
      ids.map(id =>
        fetch(`${BASE_URL}/profiles/doctor/${id}`)
          .then(r => r.json())
          .then(data => ({ id, img: data.data?.profileImage || null }))
          .catch(() => ({ id, img: null }))
      )
    ).then(results => {
      const map: Record<string, string | null> = {};
      results.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.img; });
      setProfileImages(map);
    });
    fetchMentorLevels(ids, BASE_URL).then(setMentorLevels);
  }, [doctors]);

  // Filter + search
  useEffect(() => {
    let result = doctors;
    if (activeTab === 'pending')  result = result.filter(d => !d.doctorProfile?.isVerified && !d.doctorProfile?.isRejected);
    if (activeTab === 'verified') result = result.filter(d => d.doctorProfile?.isVerified);
    if (activeTab === 'rejected') result = result.filter(d => d.doctorProfile?.isRejected);
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
    setSelectedMentor(mentorLevels[doctor._id] ?? undefined);
    try {
      const [profileRes, mentorRes] = await Promise.allSettled([
        fetch(`${BASE_URL}/profiles/doctor/${doctor._id}`).then(r => r.json()),
        fetch(`${BASE_URL}/points-reward/${doctor._id}/mentor-level`).then(r => r.json()),
      ]);
      setProfile(profileRes.status === 'fulfilled' ? (profileRes.value.data || {}) : {});
      if (mentorRes.status === 'fulfilled') setSelectedMentor(mentorRes.value.data ?? null);
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
        showToast(`${doctorName} verified successfully`, 'success');
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
        showToast(`${deleteTarget.fullName} removed from platform`, 'success');
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

  const rejectDoctor = async (doctorId: string, reason: string, doctorName: string) => {
    setRejecting(true);
    try {
      const res = await fetch(`${BASE_URL}/doctors/${doctorId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setDoctors(prev =>
          prev.map(d =>
            d._id === doctorId
              ? { ...d, doctorProfile: { ...d.doctorProfile, isVerified: false, isRejected: true, rejectionReason: reason } }
              : d
          )
        );
        if (selected?._id === doctorId) {
          setSelected(prev => prev ? { ...prev, doctorProfile: { ...prev.doctorProfile, isVerified: false, isRejected: true, rejectionReason: reason } } : null);
        }
        showToast(`${doctorName} application rejected`, 'error');
        setRejectTarget(null);
        setSelectedReason('');
        setOtherReason('');
      } else {
        showToast('Failed to reject doctor', 'error');
      }
    } catch {
      showToast('Failed to reject doctor', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const counts = {
    all:      doctors.length,
    pending:  doctors.filter(d => !d.doctorProfile?.isVerified && !d.doctorProfile?.isRejected).length,
    verified: doctors.filter(d =>  d.doctorProfile?.isVerified).length,
    rejected: doctors.filter(d =>  d.doctorProfile?.isRejected).length,
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
    professional: { bg: '#EEF1FF', color: '#6B7FED' },
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

      {/* Top Bar — title + tabs + search + stats all in one row */}
      <div className="top-bar">
        <div className="top-bar-left">
          <h1 className="page-title">Professionals</h1>
          <div className="tab-group">
            {(['all', 'pending', 'verified', 'rejected'] as FilterTab[]).map(tab => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'pending'  && <span className="tab-dot pending"  />}
                {tab === 'verified' && <span className="tab-dot verified" />}
                {tab === 'rejected' && <span className="tab-dot rejected" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="tab-count">{counts[tab]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="top-bar-right">
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search name, email, specialization..."
              value={search}
            onChange={e => setSearch(e.target.value)}
          />
            {search && <button className="clear-btn" onClick={() => setSearch('')}>✕</button>}
          </div>
          <div className="hstat-group">
            <span className="hstat-chip" style={{ color: '#6B7FED' }}>{counts.all} Total</span>
            <span className="hstat-chip" style={{ color: '#d97706' }}>{counts.pending} Pending</span>
            <span className="hstat-chip" style={{ color: '#059669' }}>{counts.verified} Verified</span>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading professionals...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🩺</div>
          <p>No professionals found</p>
          <span>Try adjusting your search or filter</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="doctors-table">
            <thead>
              <tr>
                <th>Professional</th>
                <th>Specialization</th>
                <th>License</th>
                <th>Plan</th>
                <th>Certs</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doctor => (
                <tr key={doctor._id} className="table-row">
                  {/* Doctor */}
                  <td>
                    <div className="row-doctor">
                      <div className="row-avatar-wrap">
                        {profileImages[doctor._id] ? (
                          <img
                            src={`http://localhost:3000${profileImages[doctor._id]}`}
                            alt={doctor.fullName}
                            className="row-avatar-img"
                          />
                        ) : (
                          <div className="row-avatar" style={{ background: avatarColor(doctor.fullName) }}>
                            {initials(doctor.fullName)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="row-name">{doctor.fullName}</div>
                        <div className="row-email">{doctor.email}</div>
                        <span className={`role-chip ${doctor.doctorProfile?.professionalType === 'psychologist' ? 'role-psychologist' : 'role-doctor'}`}>
                          {doctor.doctorProfile?.professionalType === 'psychologist' ? 'Psychologist' : 'Doctor'}
                        </span>
                        <MentorLevelBadge level={mentorLevels[doctor._id]} size="sm" />
                      </div>
                    </div>
                  </td>

                  {/* Specialization */}
                  <td><span className="row-spec">{doctor.doctorProfile?.specialization || '—'}</span></td>

                  {/* License */}
                  <td><span className="row-license">{doctor.doctorProfile?.licenseNumber || '—'}</span></td>

                  {/* Plan */}
                  <td>
                    <span className="row-plan" style={planColors[doctor.subscriptionPlan] || planColors.free_trial}>
                      {doctor.subscriptionPlan?.replace(/_/g, ' ') || 'free trial'}
                    </span>
                  </td>

                  {/* Certificates */}
                  <td><span className="row-certs">{doctor.doctorProfile?.certificates?.length || 0}</span></td>

                  {/* Joined */}
                  <td>
                    <span className="row-date">
                      {new Date(doctor.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    {doctor.doctorProfile?.isVerified ? (
                      <span className="badge verified">Verified</span>
                    ) : doctor.doctorProfile?.isRejected ? (
                      <span className="badge rejected">Rejected</span>
                    ) : (
                      <span className="badge pending">Pending</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="row-actions">
                      <button className="btn-view-profile" onClick={() => openDoctor(doctor)} title="View Profile">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                      </button>
                      {doctor.doctorProfile?.isVerified ? (
                        <span className="row-approved">✓ Approved</span>
                      ) : doctor.doctorProfile?.isRejected ? (
                        <span className="row-rejected-label">✕ Rejected</span>
                      ) : (
                        <>
                          <button
                            className="btn-approve"
                            onClick={() => verifyDoctor(doctor._id, doctor.fullName)}
                            disabled={verifyingId === doctor._id}
                          >
                            {verifyingId === doctor._id ? '…' : '✓'}
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => { setRejectTarget(doctor); setSelectedReason(''); setOtherReason(''); }}
                            title="Reject"
                          >✕</button>
                        </>
                      )}
                      <button className="btn-remove" onClick={() => setDeleteTarget(doctor)} title="Delete">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Doctor Profile Modal */}
      {selected && (
        <div className="overlay" onClick={() => { setSelected(null); setSelectedMentor(undefined); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-doc-info">
                {profile?.profileImage ? (
                  <img
                    className="modal-avatar-img"
                    src={`http://localhost:3000${profile.profileImage}`}
                    alt={selected.fullName}
                  />
                ) : (
                  <div className="modal-avatar" style={{ background: avatarColor(selected.fullName) }}>
                    {initials(selected.fullName)}
                  </div>
                )}
                <div>
                  <div className="modal-name-row">
                    <h2 className="modal-name">{selected.fullName}</h2>
                    {selected.doctorProfile?.isVerified
                      ? <span className="badge verified small">✓ Verified</span>
                      : selected.doctorProfile?.isRejected
                      ? <span className="badge rejected small">✕ Rejected</span>
                      : <span className="badge pending small">⏳ Pending</span>
                    }
                  </div>
                  <p className="modal-spec">{selected.doctorProfile?.specialization}</p>
                  <p className="modal-email">{selected.email}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => { setSelected(null); setSelectedMentor(undefined); }}>✕</button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {modalLoading ? (
                <div className="modal-loading"><div className="spinner" /><p>Loading...</p></div>
              ) : (
                <>
                  {/* Mentor Level */}
                  <MentorLevelCard level={selectedMentor} />

                  {/* Professional Info */}
                  <div className="info-section">
                    <h3 className="info-title">Professional Information</h3>
                    <div className="detail-grid">
                      <div className="detail-cell">
                        <span className="detail-label">Role</span>
                        <span className={`role-chip ${selected.doctorProfile?.professionalType === 'psychologist' ? 'role-psychologist' : 'role-doctor'}`}>
                          {selected.doctorProfile?.professionalType === 'psychologist' ? 'Psychologist' : 'Doctor'}
                        </span>
                      </div>
                      <div className="detail-cell">
                        <span className="detail-label">License Number</span>
                        <span className="detail-value">{selected.doctorProfile?.licenseNumber || '—'}</span>
                      </div>
                      <div className="detail-cell">
                        <span className="detail-label">Specialization</span>
                        <span className="detail-value">{selected.doctorProfile?.specialization || '—'}</span>
                      </div>
                      <div className="detail-cell">
                        <span className="detail-label">Subscription Plan</span>
                        <span className="detail-value">
                          <span className="plan-chip" style={planColors[selected.subscriptionPlan] || planColors.free_trial}>
                            {selected.subscriptionPlan?.replace(/_/g, ' ') || 'free trial'}
                          </span>
                        </span>
                      </div>
                      <div className="detail-cell">
                        <span className="detail-label">Joined</span>
                        <span className="detail-value">
                          {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      {profile?.bio && (
                        <div className="detail-cell full-span">
                          <span className="detail-label">Bio</span>
                          <span className="detail-value bio-text">{profile.bio}</span>
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

                  {/* Rejection reason display */}
                  {selected.doctorProfile?.isRejected && selected.doctorProfile?.rejectionReason && (
                    <div className="rejection-reason-box">
                      <span className="rejection-reason-label">Rejection Reason</span>
                      <span className="rejection-reason-text">{selected.doctorProfile.rejectionReason}</span>
                    </div>
                  )}

                  {/* Modal Actions */}
                  <div className="modal-actions">
                    {selected.doctorProfile?.isVerified ? (
                      <button className="btn-approved-modal" disabled>✓ Already Verified</button>
                    ) : selected.doctorProfile?.isRejected ? (
                      <button className="btn-approve-modal"
                        onClick={() => verifyDoctor(selected._id, selected.fullName)}
                        disabled={verifyingId === selected._id}
                      >
                        {verifyingId === selected._id ? 'Approving...' : '✓ Approve Instead'}
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn-approve-modal"
                          onClick={() => verifyDoctor(selected._id, selected.fullName)}
                          disabled={verifyingId === selected._id}
                        >
                          {verifyingId === selected._id ? 'Approving...' : '✓ Approve'}
                        </button>
                        <button
                          className="btn-reject-modal"
                          onClick={() => { setRejectTarget(selected); setSelectedReason(''); setOtherReason(''); }}
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}
                    <button
                      className="btn-remove-modal"
                      onClick={() => { setSelected(null); setDeleteTarget(selected); }}
                    >
                      🗑 Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="overlay" onClick={() => setRejectTarget(null)}>
          <div className="reject-modal" onClick={e => e.stopPropagation()}>
            <div className="reject-modal-header">
              <div className="reject-modal-icon">⚠️</div>
              <div>
                <h3>Reject Application</h3>
                <p>{rejectTarget.fullName}</p>
              </div>
              <button className="modal-close" onClick={() => setRejectTarget(null)}>✕</button>
            </div>
            <p className="reject-modal-sub">Select a reason for rejection:</p>
            <div className="reject-reasons">
              {REJECT_REASONS.map(reason => (
                <button
                  key={reason}
                  className={`reject-reason-item ${selectedReason === reason ? 'selected' : ''}`}
                  onClick={() => setSelectedReason(reason)}
                >
                  <span className="reason-radio">{selectedReason === reason ? '●' : '○'}</span>
                  {reason}
                </button>
              ))}
            </div>
            {selectedReason === 'Other' && (
              <textarea
                className="reject-other-input"
                placeholder="Describe the reason..."
                value={otherReason}
                onChange={e => setOtherReason(e.target.value)}
                rows={3}
              />
            )}
            <div className="confirm-actions">
              <button
                className="btn-cancel"
                onClick={() => setRejectTarget(null)}
                disabled={rejecting}
              >
                Cancel
              </button>
              <button
                className="btn-confirm-reject"
                disabled={rejecting || !selectedReason || (selectedReason === 'Other' && !otherReason.trim())}
                onClick={() => {
                  const reason = selectedReason === 'Other' ? otherReason.trim() : selectedReason;
                  rejectDoctor(rejectTarget._id, reason, rejectTarget.fullName);
                }}
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="overlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h3>Remove Professional?</h3>
            <p>
              Are you sure you want to remove <strong>{deleteTarget.fullName}</strong> from TruHealLink?
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

        /* Top bar */
        .top-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .top-bar-left  { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .top-bar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .page-title { font-size: 18px; font-weight: 800; color: #111; letter-spacing: -0.3px; white-space: nowrap; }

        .tab-group { display: flex; gap: 4px; }
        .tab {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 8px;
          border: 1px solid #e5e7eb; background: #fff;
          font-size: 12px; font-weight: 500; color: #666;
          cursor: pointer; transition: all 0.15s;
        }
        .tab:hover  { border-color: #6B7FED; color: #6B7FED; }
        .tab.active { background: #6B7FED; color: #fff; border-color: #6B7FED; }
        .tab-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .tab-dot.pending  { background: #d97706; }
        .tab-dot.verified { background: #059669; }
        .tab-dot.rejected { background: #dc2626; }
        .tab.active .tab-dot.pending  { background: #fde68a; }
        .tab.active .tab-dot.verified { background: #6ee7b7; }
        .tab.active .tab-dot.rejected { background: #fca5a5; }
        .tab-count { background: rgba(0,0,0,0.08); font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 20px; }
        .tab.active .tab-count { background: rgba(255,255,255,0.25); }

        .search-wrap {
          display: flex; align-items: center; gap: 7px;
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 9px; padding: 7px 12px; width: 240px;
        }
        .search-wrap input { border: none; outline: none; font-size: 13px; color: #333; background: none; flex: 1; min-width: 0; }
        .search-wrap input::placeholder { color: #aaa; }
        .clear-btn { background: none; border: none; cursor: pointer; color: #aaa; font-size: 11px; }

        .hstat-group { display: flex; align-items: center; gap: 6px; }
        .hstat-chip { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: #f3f4f6; border: 1px solid #e5e7eb; white-space: nowrap; }

        /* Table */
        .table-wrap { background: #fff; border-radius: 14px; border: 1px solid #e5e7eb; overflow: hidden; }
        .doctors-table { width: 100%; border-collapse: collapse; }
        .doctors-table thead tr { background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .doctors-table th { padding: 11px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap; }
        .table-row { border-bottom: 1px solid #f3f4f6; transition: background 0.12s; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover { background: #fafafa; }
        .doctors-table td { padding: 12px 14px; vertical-align: middle; }

        /* Role chip */
        .role-chip { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; margin-top: 3px; }
        .role-doctor { background: #dbeafe; color: #1d4ed8; }
        .role-psychologist { background: #ede9fe; color: #7c3aed; }

        /* Row doctor cell */
        .row-doctor { display: flex; align-items: center; gap: 10px; }
        .row-avatar-wrap { flex-shrink: 0; }
        .row-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff;
        }
        .row-avatar-img { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; display: block; }
        .row-name  { font-size: 13px; font-weight: 700; color: #111; text-transform: capitalize; }
        .row-email { font-size: 11px; color: #888; margin-top: 1px; }
        .row-spec  { font-size: 12px; color: #555; }
        .row-license { font-size: 12px; color: #555; font-family: monospace; }
        .row-plan  { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; text-transform: capitalize; white-space: nowrap; }
        .row-certs { font-size: 12px; color: #555; font-weight: 600; }
        .row-date  { font-size: 12px; color: #888; white-space: nowrap; }

        .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
        .badge.verified { background: #d1fae5; color: #065f46; }
        .badge.pending  { background: #fef3c7; color: #92400e; }
        .badge.rejected { background: #fee2e2; color: #991b1b; }
        .badge.small    { font-size: 10px; padding: 3px 8px; }

        /* Row actions */
        .row-actions { display: flex; align-items: center; gap: 6px; }
        .btn-view-profile {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 11px; border-radius: 8px;
          background: #f3f4f8; color: #444;
          border: 1px solid #e5e7eb; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .btn-view-profile:hover { background: #EEF1FF; color: #6B7FED; border-color: #C8D0FF; }
        .btn-approve {
          width: 30px; height: 30px; border-radius: 8px;
          background: #059669; color: #fff;
          border: none; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center;
        }
        .btn-approve:hover:not(:disabled) { background: #047857; }
        .btn-approve:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-reject {
          width: 30px; height: 30px; border-radius: 8px;
          background: #fff1f2; color: #dc2626;
          border: 1px solid #fecaca; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center;
        }
        .btn-reject:hover { background: #fee2e2; }
        .btn-remove {
          width: 30px; height: 30px; border-radius: 8px;
          background: #fff1f2; color: #dc2626;
          border: 1px solid #fecaca;
          cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center;
        }
        .btn-remove:hover { background: #dc2626; color: #fff; border-color: #dc2626; }
        .row-approved      { font-size: 11px; font-weight: 700; color: #059669; white-space: nowrap; }
        .row-rejected-label { font-size: 11px; font-weight: 700; color: #dc2626; white-space: nowrap; }

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
          border: 3px solid #E0E4FF; border-top-color: #6B7FED;
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
          padding: 24px 24px 16px; border-bottom: 1px solid #E0E4FF;
          background: linear-gradient(135deg, #6B7FED 0%, #7B8CDE 100%);
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
        .modal-name  { font-size: 18px; font-weight: 700; color: #fff; }
        .modal-spec  { font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 500; margin-bottom: 2px; }
        .modal-email { font-size: 12px; color: rgba(255,255,255,0.7); }
        .modal-close {
          width: 32px; height: 32px; border-radius: 8px;
          background: rgba(255,255,255,0.2); border: none; cursor: pointer;
          font-size: 14px; color: #fff; transition: background 0.15s;
          flex-shrink: 0;
        }
        .modal-close:hover { background: rgba(255,255,255,0.3); }

        .modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }
        .modal-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: #888; }

        /* Info sections */
        .info-section  { background: #F0F4FF; border-radius: 14px; padding: 16px 18px; }
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
          border: 1px solid #E0E4FF; text-decoration: none;
          transition: all 0.15s;
        }
        .cert-card:hover { border-color: #6B7FED; background: #F0F4FF; }
        .cert-icon  { font-size: 22px; }
        .cert-info  { display: flex; flex-direction: column; gap: 1px; }
        .cert-name  { font-size: 13px; font-weight: 600; color: #333; }
        .cert-view  { font-size: 11px; color: #6B7FED; }
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
        .btn-reject-modal {
          padding: 12px 20px; border-radius: 12px;
          background: #fff1f2; color: #dc2626;
          border: 1px solid #fecaca; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-reject-modal:hover { background: #fee2e2; }
        .btn-remove-modal {
          padding: 12px 20px; border-radius: 12px;
          background: #fee2e2; color: #dc2626;
          border: 1px solid #fecaca; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-remove-modal:hover { background: #dc2626; color: #fff; }

        /* Rejection reason display in modal */
        .rejection-reason-box {
          display: flex; flex-direction: column; gap: 4px;
          background: #fff1f2; border: 1px solid #fecaca;
          border-radius: 12px; padding: 14px 16px;
        }
        .rejection-reason-label { font-size: 10px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px; }
        .rejection-reason-text  { font-size: 14px; color: #991b1b; font-weight: 500; }

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

        /* Reject Modal */
        .reject-modal {
          background: #fff; border-radius: 20px; padding: 28px;
          width: 100%; max-width: 420px;
          animation: slideUp 0.25s ease;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
          display: flex; flex-direction: column; gap: 16px;
        }
        .reject-modal-header {
          display: flex; align-items: center; gap: 12px;
        }
        .reject-modal-icon { font-size: 28px; flex-shrink: 0; }
        .reject-modal-header h3 { font-size: 17px; font-weight: 700; color: #111; margin: 0; }
        .reject-modal-header p  { font-size: 13px; color: #888; margin: 0; }
        .reject-modal-header .modal-close { margin-left: auto; }
        .reject-modal-sub { font-size: 13px; color: #555; font-weight: 500; margin: 0; }
        .reject-reasons { display: flex; flex-direction: column; gap: 8px; }
        .reject-reason-item {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          border: 1.5px solid #e5e5e5; background: #F8F9FF;
          font-size: 14px; color: #333; font-weight: 500;
          cursor: pointer; transition: all 0.15s; text-align: left;
        }
        .reject-reason-item:hover { border-color: #dc2626; background: #fff1f2; color: #dc2626; }
        .reject-reason-item.selected { border-color: #dc2626; background: #fff1f2; color: #dc2626; font-weight: 700; }
        .reason-radio { font-size: 16px; flex-shrink: 0; }
        .reject-other-input {
          width: 100%; padding: 12px 14px;
          border: 1.5px solid #e5e5e5; border-radius: 12px;
          font-size: 14px; font-family: inherit; color: #333;
          resize: none; outline: none; transition: border-color 0.2s;
        }
        .reject-other-input:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
        .btn-confirm-reject {
          padding: 10px 24px; border-radius: 10px;
          background: #dc2626; color: #fff;
          border: none; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-confirm-reject:hover:not(:disabled) { background: #b91c1c; }
        .btn-confirm-reject:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
