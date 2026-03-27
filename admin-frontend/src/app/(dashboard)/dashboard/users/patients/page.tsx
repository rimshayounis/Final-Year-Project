'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

  const router = useRouter();

  // Profile images map { patientId -> imageUrl | null }
  const [profileImages, setProfileImages]   = useState<Record<string, string | null>>({});
  const [apptCounts, setApptCounts]         = useState<Record<string, number>>({});
  const [postCounts, setPostCounts]         = useState<Record<string, number>>({});

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

  // Fetch profile images for all patients in parallel
  useEffect(() => {
    if (patients.length === 0) return;
    Promise.allSettled(
      patients.map(p =>
        fetch(`${BASE_URL}/profiles/user/${p._id}`)
          .then(r => r.json())
          .then(data => ({ id: p._id, img: data.data?.profileImage || null }))
          .catch(() => ({ id: p._id, img: null }))
      )
    ).then(results => {
      const map: Record<string, string | null> = {};
      results.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.img; });
      setProfileImages(map);
    });
  }, [patients]);

  // Fetch appointment counts + post counts in parallel after patients load
  useEffect(() => {
    if (patients.length === 0) return;
    Promise.allSettled(
      patients.map(p =>
        fetch(`${BASE_URL}/booked-appointments/user/${p._id}`)
          .then(r => r.json())
          .then(d => {
            const list: any[] = d.data || d.appointments || (Array.isArray(d) ? d : []);
            return { id: p._id, count: list.filter((a: any) => a.status === 'completed').length };
          })
          .catch(() => ({ id: p._id, count: 0 }))
      )
    ).then(results => {
      const map: Record<string, number> = {};
      results.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.count; });
      setApptCounts(map);
    });

    Promise.allSettled(
      patients.map(p =>
        fetch(`${BASE_URL}/posts/user/${p._id}`)
          .then(r => r.json())
          .then(d => {
            const list: any[] = d.data?.posts || d.data || (Array.isArray(d) ? d : []);
            return { id: p._id, count: list.length };
          })
          .catch(() => ({ id: p._id, count: 0 }))
      )
    ).then(results => {
      const map: Record<string, number> = {};
      results.forEach(r => { if (r.status === 'fulfilled') map[r.value.id] = r.value.count; });
      setPostCounts(map);
    });

  }, [patients]);

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
    const colors = ['#6B7FED', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed'];
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

      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <h1 className="page-title">Patients</h1>
          <div className="tab-group">
            {(['all', 'male', 'female'] as const).map(g => (
              <button
                key={g}
                className={`tab ${genderFilter === g ? 'active' : ''}`}
                onClick={() => setGenderFilter(g)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
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
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="clear-btn" onClick={() => setSearch('')}>✕</button>}
          </div>
          <span className="count-chip">{filtered.length} patients</span>
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
                <th>Appts</th>
                <th>Posts</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(patient => (
                <tr key={patient._id} className="table-row">
                  <td>
                    <div className="patient-cell">
                      <div className="avatar-wrap">
                        {profileImages[patient._id] ? (
                          <img src={`http://localhost:3000${profileImages[patient._id]}`} alt={patient.fullName} className="avatar-img" />
                        ) : (
                          <div className="avatar" style={{ background: avatarColor(patient.fullName) }}>
                            {initials(patient.fullName)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="patient-name">{patient.fullName}</div>
                        <div className="patient-email">{patient.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="text-muted">{patient.age ?? '—'}</span></td>
                  <td><span className={`gender-badge ${patient.gender?.toLowerCase()}`}>{patient.gender || '—'}</span></td>
                  <td>
                    <span className="count-num">
                      {apptCounts[patient._id] ?? <span className="count-loading" />}
                    </span>
                  </td>
                  <td>
                    {postCounts[patient._id] !== undefined ? (
                      postCounts[patient._id] > 0 ? (
                        <button
                          className="post-count-btn"
                          onClick={() => router.push(`/dashboard/posts?userId=${patient._id}&userName=${encodeURIComponent(patient.fullName)}`)}
                        >
                          {postCounts[patient._id]}
                        </button>
                      ) : (
                        <span className="count-zero">0</span>
                      )
                    ) : <span className="count-loading" />}
                  </td>
                  <td><span className="text-muted small">{new Date(patient.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-view" onClick={() => openPatient(patient, 'profile')} title="View Profile">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Profile
                      </button>
                      <button className="btn-delete" onClick={() => setDeleteTarget(patient)} title="Remove">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profile
              </button>
              <button
                className={`modal-tab ${modalView === 'posts' ? 'active' : ''}`}
                onClick={() => switchModalView('posts')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Posts
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
        .page { display: flex; flex-direction: column; gap: 16px; position: relative; }

        /* Toast */
        .toast { position: fixed; top: 24px; right: 24px; z-index: 9999; padding: 11px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; animation: slideIn 0.3s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .toast.success { background: #d1fae5; color: #065f46; }
        .toast.error   { background: #fee2e2; color: #991b1b; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Top bar */
        .top-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .top-bar-left  { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .top-bar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .page-title { font-size: 18px; font-weight: 800; color: #111; letter-spacing: -0.3px; white-space: nowrap; }

        .tab-group { display: flex; gap: 4px; }
        .tab { display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; font-size: 12px; font-weight: 500; color: #666; cursor: pointer; transition: all 0.15s; }
        .tab:hover  { border-color: #6B7FED; color: #6B7FED; }
        .tab.active { background: #6B7FED; color: #fff; border-color: #6B7FED; }

        .search-wrap { display: flex; align-items: center; gap: 7px; background: #fff; border: 1px solid #e5e7eb; border-radius: 9px; padding: 7px 12px; width: 240px; }
        .search-wrap input { border: none; outline: none; font-size: 13px; color: #333; background: none; flex: 1; min-width: 0; }
        .search-wrap input::placeholder { color: #aaa; }
        .clear-btn { background: none; border: none; cursor: pointer; color: #aaa; font-size: 11px; }
        .count-chip { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: #f3f4f6; border: 1px solid #e5e7eb; color: #555; white-space: nowrap; }

        /* Table */
        .table-wrap { background: #fff; border-radius: 14px; border: 1px solid #e5e7eb; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table thead tr { background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .table th { padding: 11px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap; }
        .table-row { border-bottom: 1px solid #f3f4f6; transition: background 0.12s; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover { background: #fafafa; }
        .table td { padding: 11px 14px; vertical-align: middle; }

        .patient-cell { display: flex; align-items: center; gap: 10px; }
        .avatar-wrap  { flex-shrink: 0; }
        .avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; }
        .avatar-img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; display: block; }
        .patient-name  { font-size: 13px; font-weight: 700; color: #111; text-transform: capitalize; }
        .patient-email { font-size: 11px; color: #888; margin-top: 1px; }
        .text-muted { font-size: 12px; color: #666; }
        .small      { font-size: 11px; }

        .count-num  { font-size: 13px; font-weight: 700; color: #111; }
        .count-zero { font-size: 12px; color: #bbb; }
        .post-count-btn { font-size: 13px; font-weight: 700; color: #6B7FED; background: #EEF1FF; border: 1px solid #C8D0FF; border-radius: 6px; padding: 2px 10px; cursor: pointer; transition: all 0.15s; }
        .post-count-btn:hover { background: #6B7FED; color: #fff; border-color: #6B7FED; }
        .count-loading { display: inline-block; width: 20px; height: 8px; border-radius: 4px; background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.gender-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; text-transform: capitalize; }
        .gender-badge.male   { background: #dbeafe; color: #1d4ed8; }
        .gender-badge.female { background: #fce7f3; color: #be185d; }

        .action-btns { display: flex; gap: 6px; align-items: center; }
        .btn-view { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid; transition: all 0.15s; background: #f3f4f8; color: #444; border-color: #e5e7eb; }
        .btn-view:hover  { background: #EEF1FF; color: #6B7FED; border-color: #C8D0FF; }
        .btn-delete { width: 30px; height: 30px; border-radius: 8px; background: #fff1f2; color: #dc2626; border: 1px solid #fecaca; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
        .btn-delete:hover { background: #dc2626; color: #fff; border-color: #dc2626; }

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
          border: 3px solid #E0E4FF;
          border-top-color: #6B7FED;
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
          background: linear-gradient(135deg, #6B7FED 0%, #7B8CDE 100%);
        }
        .modal-patient-info { display: flex; align-items: center; gap: 14px; }
        .modal-avatar {
          width: 52px; height: 52px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700; color: #fff;
          overflow: hidden; flex-shrink: 0;
        }
        .modal-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .modal-name  { font-size: 17px; font-weight: 700; color: #fff; text-transform: capitalize; }
        .modal-email { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 2px; }

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
          border-bottom: 1px solid #E0E4FF;
        }
        .modal-tab {
          padding: 8px 18px; border-radius: 10px;
          font-size: 13px; font-weight: 600;
          border: none; cursor: pointer;
          background: none; color: #888;
          transition: all 0.15s;
        }
        .modal-tab:hover  { background: #f3f4f8; color: #333; }
        .modal-tab.active { background: #EEF1FF; color: #6B7FED; }
        .modal-tab { display: inline-flex; align-items: center; gap: 6px; }

        /* Responsive */
        @media (max-width: 768px) {
          .top-bar { flex-direction: column; align-items: flex-start; }
          .top-bar-right { width: 100%; justify-content: space-between; }
          .search-wrap { width: 100%; flex: 1; }
          .table th:nth-child(2), .table td:nth-child(2),
          .table th:nth-child(3), .table td:nth-child(3) { display: none; }
        }
        @media (max-width: 500px) {
          .table th:nth-child(4), .table td:nth-child(4) { display: none; }
        }

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
          border: 1px solid #E0E4FF;
        }
        .contact-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: #6B7FED; color: #fff;
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
          border: 1px solid #E0E4FF;
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
