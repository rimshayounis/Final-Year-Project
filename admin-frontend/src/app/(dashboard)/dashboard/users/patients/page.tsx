'use client';

import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000/api';

interface HealthProfile {
  sleepDuration?: number;
  stressLevel?: string;
  dietPreference?: string;
  additionalNotes?: string;
}

interface EmergencyContact {
  fullName: string;
  phoneNumber: string;
  relationship: string;
}

interface Patient {
  _id: string;
  fullName: string;
  email: string;
  age: number;
  gender: string;
  userType: string;
  healthProfile?: HealthProfile;
  emergencyContacts?: EmergencyContact[];
  createdAt: string;
}

interface UserProfile {
  bio?: string;
  profileImage?: string;
}

interface Post {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  likes: number;
  comments: number;
  mediaUrls: string[];
  createdAt: string;
}

type ModalView = 'profile' | 'posts';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filtered, setFiltered] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');

  // Modal state
  const [selected, setSelected] = useState<Patient | null>(null);
  const [modalView, setModalView] = useState<ModalView>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch all patients
  useEffect(() => {
     fetch(`${BASE_URL}/users`)
    .then(r => r.json())
    .then(data => {
    const allUsers: Patient[] = Array.isArray(data) ? data : (data.users || data.data || []);
    const patients = allUsers.filter(u => u.userType?.toLowerCase() === 'user' || u.userType?.toLowerCase() === 'patient');
    setPatients(patients);
    setFiltered(patients);
  })
      .catch(() => showToast('Failed to load patients', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Search + filter
  useEffect(() => {
    let result = patients;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.fullName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      );
    }
    if (genderFilter !== 'all') {
      result = result.filter(p => p.gender?.toLowerCase() === genderFilter);
    }
    setFiltered(result);
  }, [search, genderFilter, patients]);

  // Open patient modal
  const openPatient = async (patient: Patient, view: ModalView = 'profile') => {
    setSelected(patient);
    setModalView(view);
    setModalLoading(true);
    setProfile(null);
    setPosts([]);

    try {
      if (view === 'profile') {
        const res = await fetch(`${BASE_URL}/profiles/user/${patient._id}`);
        const data = await res.json();
        setProfile(data.data || {});
      } else {
        const res = await fetch(`${BASE_URL}/posts/user/${patient._id}`);
        const data = await res.json();
        setPosts(data.data?.posts || data.data || []);
      }
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const switchModalView = async (view: ModalView) => {
    if (!selected) return;
    setModalView(view);
    setModalLoading(true);
    try {
      if (view === 'profile' && !profile) {
        const res = await fetch(`${BASE_URL}/profiles/user/${selected._id}`);
        const data = await res.json();
        setProfile(data.data || {});
      } else if (view === 'posts' && posts.length === 0) {
        const res = await fetch(`${BASE_URL}/posts/user/${selected._id}`);
        const data = await res.json();
        setPosts(data.data?.posts || data.data || []);
      }
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete patient
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BASE_URL}/users/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) {
        setPatients(prev => prev.filter(p => p._id !== deleteTarget._id));
        showToast(`${deleteTarget.fullName} removed from platform`, 'success');
        setDeleteTarget(null);
        if (selected?._id === deleteTarget._id) setSelected(null);
      } else {
        showToast('Failed to delete patient', 'error');
      }
    } catch {
      showToast('Failed to delete patient', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const initials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  const avatarColor = (name: string) => {
    const colors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed'];
    const idx = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
  };

  const statusColor: Record<string, { bg: string; color: string }> = {
    approved: { bg: '#d1fae5', color: '#059669' },
    pending:  { bg: '#fef3c7', color: '#d97706' },
    rejected: { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-sub">Manage all registered patients on TruHealLink</p>
        </div>
        <div className="header-badge">
          <span className="badge-count">{filtered.length}</span>
          <span className="badge-label">Total Patients</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="clear-btn" onClick={() => setSearch('')}>✕</button>}
        </div>
        <div className="filter-tabs">
          {['all', 'male', 'female'].map(g => (
            <button
              key={g}
              className={`filter-tab ${genderFilter === g ? 'active' : ''}`}
              onClick={() => setGenderFilter(g)}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading patients...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No patients found</p>
            <span>Try adjusting your search or filters</span>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(patient => (
                <tr key={patient._id} className="table-row">
                  <td>
                    <div className="patient-cell">
                      <div
                        className="avatar"
                        style={{ background: avatarColor(patient.fullName) }}
                      >
                        {initials(patient.fullName)}
                      </div>
                      <span className="patient-name">{patient.fullName}</span>
                    </div>
                  </td>
                  <td><span className="text-muted">{patient.age}</span></td>
                  <td>
                    <span className={`gender-badge ${patient.gender?.toLowerCase()}`}>
                      {patient.gender}
                    </span>
                  </td>
                  <td><span className="text-muted small">{patient.email}</span></td>
                  <td>
                    <span className="text-muted small">
                      {new Date(patient.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-view" onClick={() => openPatient(patient, 'profile')}>
                        Profile
                      </button>
                      <button className="btn-posts" onClick={() => openPatient(patient, 'posts')}>
                        Posts
                      </button>
                      <button className="btn-delete" onClick={() => setDeleteTarget(patient)}>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Patient Detail Modal */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-patient-info">
                <div
                  className="modal-avatar"
                  style={{ background: avatarColor(selected.fullName) }}
                >
                  {profile?.profileImage ? (
                    <img src={`${BASE_URL}${profile.profileImage}`} alt={selected.fullName} />
                  ) : (
                    initials(selected.fullName)
                  )}
                </div>
                <div>
                  <h2 className="modal-name">{selected.fullName}</h2>
                  <p className="modal-email">{selected.email}</p>
                </div>
              </div>
              <div className="modal-header-actions">
                <button className="btn-remove-modal" onClick={() => { setSelected(null); setDeleteTarget(selected); }}>
                  🗑 Remove Patient
                </button>
                <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="modal-tabs">
              <button
                className={`modal-tab ${modalView === 'profile' ? 'active' : ''}`}
                onClick={() => switchModalView('profile')}
              >
                👤 Profile
              </button>
              <button
                className={`modal-tab ${modalView === 'posts' ? 'active' : ''}`}
                onClick={() => switchModalView('posts')}
              >
                📝 Posts
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {modalLoading ? (
                <div className="modal-loading">
                  <div className="spinner" />
                  <p>Loading...</p>
                </div>
              ) : modalView === 'profile' ? (
                <div className="profile-view">
                  {/* Basic Info */}
                  <div className="info-section">
                    <h3 className="info-title">Basic Information</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Age</span>
                        <span className="info-value">{selected.age}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Gender</span>
                        <span className="info-value">{selected.gender}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Member Since</span>
                        <span className="info-value">
                          {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Bio</span>
                        <span className="info-value">{profile?.bio || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Health Profile */}
                  {selected.healthProfile && (
                    <div className="info-section">
                      <h3 className="info-title">Health Profile</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Sleep Duration</span>
                          <span className="info-value">{selected.healthProfile.sleepDuration ? `${selected.healthProfile.sleepDuration} hrs` : '—'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Stress Level</span>
                          <span className="info-value">{selected.healthProfile.stressLevel || '—'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Diet Preference</span>
                          <span className="info-value">{selected.healthProfile.dietPreference || '—'}</span>
                        </div>
                        {selected.healthProfile.additionalNotes && (
                          <div className="info-item full">
                            <span className="info-label">Notes</span>
                            <span className="info-value">{selected.healthProfile.additionalNotes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Emergency Contacts */}
                  {selected.emergencyContacts && selected.emergencyContacts.length > 0 && (
                    <div className="info-section">
                      <h3 className="info-title">Emergency Contacts</h3>
                      <div className="contacts-list">
                        {selected.emergencyContacts.map((c, i) => (
                          <div className="contact-card" key={i}>
                            <div className="contact-avatar">{c.fullName[0]}</div>
                            <div>
                              <div className="contact-name">{c.fullName}</div>
                              <div className="contact-meta">{c.relationship} · {c.phoneNumber}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="posts-view">
                  {posts.length === 0 ? (
                    <div className="empty-state small">
                      <div className="empty-icon">📭</div>
                      <p>No posts yet</p>
                      <span>This patient hasn't posted anything</span>
                    </div>
                  ) : (
                    <div className="posts-list">
                      {posts.map(post => (
                        <div className="post-card" key={post._id}>
                          <div className="post-top">
                            <div>
                              <div className="post-title">{post.title}</div>
                              <div className="post-category">{post.category}</div>
                            </div>
                            <span
                              className="post-status"
                              style={statusColor[post.status] || statusColor.pending}
                            >
                              {post.status}
                            </span>
                          </div>
                          <p className="post-desc">{post.description}</p>
                          <div className="post-meta">
                            <span>❤️ {post.likes}</span>
                            <span>💬 {post.comments}</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="overlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h3>Remove Patient?</h3>
            <p>
              Are you sure you want to remove <strong>{deleteTarget.fullName}</strong> from TruHealLink?
              This action cannot be undone.
            </p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
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
        .page-header {
          display: flex; align-items: flex-start; justify-content: space-between;
        }
        .page-title { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .page-sub   { font-size: 13px; color: #888; margin-top: 4px; }
        .header-badge {
          background: #fff; border: 1px solid #f0f0f5;
          border-radius: 14px; padding: 12px 20px;
          text-align: center;
        }
        .badge-count { display: block; font-size: 24px; font-weight: 800; color: #4f46e5; }
        .badge-label { font-size: 11px; color: #888; font-weight: 500; }

        /* Filters */
        .filters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #e5e5e5;
          border-radius: 12px; padding: 10px 16px;
          flex: 1; min-width: 260px; max-width: 400px;
        }
        .search-wrap input {
          border: none; outline: none; font-size: 14px;
          color: #333; background: none; flex: 1;
        }
        .search-wrap input::placeholder { color: #aaa; }
        .clear-btn {
          background: none; border: none; cursor: pointer;
          color: #aaa; font-size: 12px; padding: 2px 4px;
        }
        .filter-tabs { display: flex; gap: 6px; }
        .filter-tab {
          padding: 9px 18px; border-radius: 10px;
          border: 1px solid #e5e5e5; background: #fff;
          font-size: 13px; font-weight: 500; color: #666;
          cursor: pointer; transition: all 0.15s;
        }
        .filter-tab:hover  { border-color: #4f46e5; color: #4f46e5; }
        .filter-tab.active { background: #4f46e5; color: #fff; border-color: #4f46e5; }

        /* Table */
        .table-wrap {
          background: #fff; border-radius: 16px;
          border: 1px solid #f0f0f5; overflow: hidden;
        }
        .table { width: 100%; border-collapse: collapse; }
        .table thead tr { background: #f8f8fc; }
        .table th {
          padding: 14px 20px; text-align: left;
          font-size: 12px; font-weight: 700;
          color: #888; text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid #f0f0f5;
        }
        .table-row { border-bottom: 1px solid #f8f8fc; transition: background 0.12s; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover { background: #fafafa; }
        .table td { padding: 14px 20px; vertical-align: middle; }

        .patient-cell { display: flex; align-items: center; gap: 10px; }
        .avatar {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .patient-name { font-size: 14px; font-weight: 600; color: #111; }
        .text-muted  { font-size: 13px; color: #666; }
        .small       { font-size: 12px; }

        .gender-badge {
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; text-transform: capitalize;
        }
        .gender-badge.male   { background: #dbeafe; color: #1d4ed8; }
        .gender-badge.female { background: #fce7f3; color: #be185d; }

        .action-btns { display: flex; gap: 6px; align-items: center; }
        .btn-view, .btn-posts, .btn-delete {
          padding: 6px 12px; border-radius: 8px;
          font-size: 12px; font-weight: 600; cursor: pointer;
          border: 1px solid; transition: all 0.15s;
        }
        .btn-view   { background: #ede9fe; color: #4f46e5; border-color: #ddd6fe; }
        .btn-view:hover { background: #4f46e5; color: #fff; }
        .btn-posts  { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
        .btn-posts:hover { background: #1d4ed8; color: #fff; }
        .btn-delete { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
        .btn-delete:hover { background: #dc2626; color: #fff; }

        /* Loading / Empty */
        .loading-state, .empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 60px 20px; gap: 12px; color: #888;
        }
        .empty-icon { font-size: 40px; }
        .empty-state p   { font-size: 15px; font-weight: 600; color: #444; }
        .empty-state span { font-size: 13px; }
        .empty-state.small { padding: 40px 20px; }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid #f0f0f5;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
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
          width: 100%; max-width: 620px;
          max-height: 85vh; display: flex; flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.25s ease;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 24px 16px;
          border-bottom: 1px solid #f0f0f5;
        }
        .modal-patient-info { display: flex; align-items: center; gap: 14px; }
        .modal-avatar {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700; color: #fff;
          overflow: hidden; flex-shrink: 0;
        }
        .modal-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .modal-name  { font-size: 17px; font-weight: 700; color: #111; }
        .modal-email { font-size: 13px; color: #888; margin-top: 2px; }

        .modal-header-actions { display: flex; align-items: center; gap: 10px; }
        .btn-remove-modal {
          padding: 8px 14px; border-radius: 10px;
          background: #fee2e2; color: #dc2626;
          border: 1px solid #fecaca;
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all 0.15s;
        }
        .btn-remove-modal:hover { background: #dc2626; color: #fff; }
        .modal-close {
          width: 32px; height: 32px; border-radius: 8px;
          background: #f3f4f8; border: none; cursor: pointer;
          font-size: 14px; color: #666; transition: background 0.15s;
        }
        .modal-close:hover { background: #e5e5e5; }

        .modal-tabs {
          display: flex; gap: 4px; padding: 12px 24px;
          border-bottom: 1px solid #f0f0f5;
        }
        .modal-tab {
          padding: 8px 18px; border-radius: 10px;
          font-size: 13px; font-weight: 600;
          border: none; cursor: pointer;
          background: none; color: #888;
          transition: all 0.15s;
        }
        .modal-tab:hover  { background: #f3f4f8; color: #333; }
        .modal-tab.active { background: #ede9fe; color: #4f46e5; }

        .modal-body  { flex: 1; overflow-y: auto; padding: 20px 24px; }
        .modal-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: #888; }

        /* Profile View */
        .profile-view  { display: flex; flex-direction: column; gap: 20px; }
        .info-section  { background: #f8f8fc; border-radius: 14px; padding: 16px 18px; }
        .info-title    { font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
        .info-grid     { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .info-item     { display: flex; flex-direction: column; gap: 3px; }
        .info-item.full { grid-column: 1 / -1; }
        .info-label    { font-size: 11px; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .info-value    { font-size: 14px; color: #222; font-weight: 500; }

        .contacts-list { display: flex; flex-direction: column; gap: 8px; }
        .contact-card  {
          display: flex; align-items: center; gap: 10px;
          background: #fff; border-radius: 10px; padding: 10px 12px;
          border: 1px solid #f0f0f5;
        }
        .contact-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: #4f46e5; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; flex-shrink: 0;
        }
        .contact-name { font-size: 13px; font-weight: 600; color: #222; }
        .contact-meta { font-size: 12px; color: #888; margin-top: 1px; }

        /* Posts View */
        .posts-view  {}
        .posts-list  { display: flex; flex-direction: column; gap: 12px; }
        .post-card   {
          background: #f8f8fc; border-radius: 14px; padding: 16px;
          border: 1px solid #f0f0f5;
        }
        .post-top    { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
        .post-title  { font-size: 14px; font-weight: 700; color: #111; }
        .post-category { font-size: 11px; color: #888; margin-top: 2px; }
        .post-status {
          font-size: 10px; font-weight: 700; padding: 3px 10px;
          border-radius: 20px; text-transform: capitalize; flex-shrink: 0;
        }
        .post-desc   { font-size: 13px; color: #555; line-height: 1.5; margin-bottom: 10px; }
        .post-meta   { display: flex; gap: 14px; font-size: 12px; color: #888; }

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
