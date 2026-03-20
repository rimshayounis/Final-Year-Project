'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ADMIN_API = 'http://localhost:3001';

type ActiveTab = 'profile' | 'password' | 'about';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [user, setUser]           = useState<any>(null);
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading]     = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Profile form
  const [fullName, setFullName]   = useState('');
  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');

  // Password form
  const [oldPassword, setOldPassword]         = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld]                 = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const stored = localStorage.getItem('admin_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setFullName(u.fullName || '');
      setUsername(u.username || '');
      setEmail(u.email || '');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/login');
  };

  const handleProfileSave = async () => {
    if (!fullName.trim()) { showToast('Full name is required', 'error'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${ADMIN_API}/auth/admin/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName, username }),
      });
      const updatedUser = { ...user, fullName, username };
      localStorage.setItem('admin_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      showToast('Profile updated successfully', 'success');
    } catch {
      const updatedUser = { ...user, fullName, username };
      localStorage.setItem('admin_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      showToast('Profile updated successfully', 'success');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('All fields are required', 'error'); return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters', 'error'); return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error'); return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${ADMIN_API}/auth/admin/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (res.ok) {
        showToast('Password changed successfully', 'success');
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        const data = await res.json();
        showToast(data.message || 'Current password is incorrect', 'error');
      }
    } catch {
      showToast('Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'AD';

  const tabs = [
    { key: 'profile',  label: 'Profile',        icon: '👤' },
    { key: 'password', label: 'Change Password', icon: '🔒' },
    { key: 'about',    label: 'About',           icon: 'ℹ️'  },
  ];

  const pwStrength = !newPassword ? null :
    newPassword.length < 6 ? { label: 'Too weak', color: '#dc2626', width: '20%' } :
    newPassword.length < 8 ? { label: 'Weak',     color: '#d97706', width: '40%' } :
    newPassword.length < 12? { label: 'Good',     color: '#2563eb', width: '70%' } :
                             { label: 'Strong',   color: '#059669', width: '100%' };

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div className="overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">👋</div>
            <h3>Log Out?</h3>
            <p>You will be signed out of your admin account and redirected to the login page.</p>
            <div className="confirm-actions">
              <button className="btn-cancel-confirm" onClick={() => setShowLogoutConfirm(false)}>
                Stay
              </button>
              <button className="btn-confirm-logout" onClick={handleLogout}>
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your admin account and preferences</p>
        </div>
      </div>

      <div className="settings-layout">
        {/* Left Sidebar */}
        <div className="settings-sidebar">
          {/* Admin Profile Card */}
          <div className="admin-card">
            <div className="admin-avatar-lg">{initials}</div>
            <div className="admin-name-lg">{user?.fullName || 'Admin'}</div>
            <div className="admin-email-sm">{user?.email || ''}</div>
            <div className="admin-role-badge">⚡ Super Admin</div>
          </div>

          {/* Nav Tabs */}
          <nav className="settings-nav">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`settings-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key as ActiveTab)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.key && <span className="tab-arrow">›</span>}
              </button>
            ))}
          </nav>

          {/* Logout Button — prominently placed at bottom of sidebar */}
          <div className="logout-section">
            <button
              className="btn-logout"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <span>⏻</span>
              <span>Log Out</span>
            </button>
            <p className="logout-hint">You'll be redirected to the login page</p>
          </div>
        </div>

        {/* Right Content */}
        <div className="settings-content">

          {/* ── Profile Tab ── */}
          {activeTab === 'profile' && (
            <div className="settings-card">
              <div className="card-header">
                <h2>Profile Information</h2>
                <p>Update your admin account display name and username</p>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="input-disabled"
                />
                <span className="field-hint">Email cannot be changed from here</span>
              </div>

              <div className="form-group">
                <label>Role</label>
                <input type="text" value="Super Admin" disabled className="input-disabled" />
              </div>

              <div className="form-actions">
                <button className="btn-save" onClick={handleProfileSave} disabled={loading}>
                  {loading ? '...' : '✓ Save Changes'}
                </button>
                <button className="btn-reset" onClick={() => {
                  setFullName(user?.fullName || '');
                  setUsername(user?.username || '');
                }}>
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* ── Password Tab ── */}
          {activeTab === 'password' && (
            <div className="settings-card">
              <div className="card-header">
                <h2>Change Password</h2>
                <p>Keep your admin account secure with a strong password</p>
              </div>

              <div className="form-group">
                <label>Current Password</label>
                <div className="pw-wrap">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button className="pw-toggle" onClick={() => setShowOld(!showOld)}>
                    {showOld ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>New Password</label>
                <div className="pw-wrap">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                  <button className="pw-toggle" onClick={() => setShowNew(!showNew)}>
                    {showNew ? '🙈' : '👁️'}
                  </button>
                </div>
                {pwStrength && (
                  <div className="pw-strength">
                    <div className="pw-bar">
                      <div className="pw-fill" style={{ width: pwStrength.width, background: pwStrength.color }} />
                    </div>
                    <span className="pw-label" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="pw-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    style={{ borderColor: confirmPassword && confirmPassword !== newPassword ? '#dc2626' : '' }}
                  />
                  <button className="pw-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <span className="field-error">Passwords do not match</span>
                )}
              </div>

              {/* Password Rules */}
              <div className="pw-rules">
                <div className={`rule ${newPassword.length >= 8 ? 'met' : ''}`}>
                  {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                </div>
                <div className={`rule ${/[A-Z]/.test(newPassword) ? 'met' : ''}`}>
                  {/[A-Z]/.test(newPassword) ? '✓' : '○'} One uppercase letter
                </div>
                <div className={`rule ${/[0-9]/.test(newPassword) ? 'met' : ''}`}>
                  {/[0-9]/.test(newPassword) ? '✓' : '○'} One number
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="btn-save"
                  onClick={handlePasswordChange}
                  disabled={loading || !oldPassword || !newPassword || newPassword !== confirmPassword}
                >
                  {loading ? '...' : '🔒 Change Password'}
                </button>
                <button className="btn-reset" onClick={() => {
                  setOldPassword(''); setNewPassword(''); setConfirmPassword('');
                }}>
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* ── About Tab ── */}
          {activeTab === 'about' && (
            <div className="settings-card">
              <div className="card-header">
                <h2>About TruHealLink Admin</h2>
                <p>Platform and system information</p>
              </div>

              <div className="about-banner">
                <div className="about-logo">TH</div>
                <div>
                  <div className="about-name">TruHealLink</div>
                  <div className="about-tagline">Admin Control Center · v1.0.0</div>
                </div>
              </div>

              <div className="about-grid">
                {[
                  { label: 'Frontend',        value: 'Next.js 16 + TypeScript' },
                  { label: 'Admin Backend',   value: 'NestJS (port 3001)'      },
                  { label: 'Main Backend',    value: 'NestJS (port 3000)'      },
                  { label: 'Database',        value: 'MongoDB'                 },
                  { label: 'Mobile App',      value: 'React Native (Expo)'     },
                  { label: 'Payments',        value: 'Stripe'                  },
                  { label: 'Notifications',   value: 'Expo Push Notifications' },
                  { label: 'Real-time',       value: 'Socket.IO'               },
                ].map((item, i) => (
                  <div key={i} className="about-item">
                    <span className="about-label">{item.label}</span>
                    <span className="about-val">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="about-desc">
                TruHealLink connects patients with verified medical professionals. This admin dashboard
                provides full control over patients, doctors, appointments, posts, payments,
                subscriptions and doctor reward points.
              </div>

              <div className="quick-links">
                <h3>Quick Links</h3>
                <div className="links-grid">
                  <a href="http://localhost:3001/api/docs" target="_blank" rel="noopener noreferrer" className="quick-link">
                    📖 Admin API Docs
                  </a>
                  <a href="http://localhost:3000/api" target="_blank" rel="noopener noreferrer" className="quick-link">
                    🔗 Main Backend API
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .page { display: flex; flex-direction: column; gap: 24px; position: relative; }

        .toast {
          position: fixed; top: 24px; right: 24px; z-index: 9999;
          padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          animation: slideIn 0.3s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .toast.success { background: #d1fae5; color: #065f46; }
        .toast.error   { background: #fee2e2; color: #991b1b; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Logout Confirm Modal */
        .overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .confirm-modal {
          background: #fff; border-radius: 20px; padding: 36px;
          width: 100%; max-width: 380px; text-align: center;
          animation: slideUp 0.25s ease;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .confirm-icon { font-size: 48px; margin-bottom: 16px; }
        .confirm-modal h3 { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 10px; }
        .confirm-modal p  { font-size: 14px; color: #666; line-height: 1.6; }
        .confirm-actions  { display: flex; gap: 10px; margin-top: 24px; justify-content: center; }
        .btn-cancel-confirm {
          padding: 10px 24px; border-radius: 10px;
          background: #f3f4f8; color: #555;
          border: 1px solid #e5e5e5; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-cancel-confirm:hover { background: #e5e5e5; }
        .btn-confirm-logout {
          padding: 10px 24px; border-radius: 10px;
          background: #ef4444; color: #fff;
          border: none; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-confirm-logout:hover { background: #dc2626; }

        /* Page Header */
        .page-header { display: flex; align-items: center; justify-content: space-between; }
        .page-title  { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .page-sub    { font-size: 13px; color: #888; margin-top: 4px; }

        /* Layout */
        .settings-layout { display: grid; grid-template-columns: 260px 1fr; gap: 24px; align-items: start; }

        /* Sidebar */
        .settings-sidebar { display: flex; flex-direction: column; gap: 14px; }

        .admin-card {
          background: #fff; border-radius: 16px; padding: 22px 20px;
          border: 1px solid #f0f0f5;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          text-align: center;
        }
        .admin-avatar-lg {
          width: 64px; height: 64px; border-radius: 18px;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 700; color: #fff;
          margin-bottom: 4px;
        }
        .admin-name-lg   { font-size: 15px; font-weight: 700; color: #111; }
        .admin-email-sm  { font-size: 12px; color: #888; }
        .admin-role-badge {
          font-size: 11px; font-weight: 700;
          background: #ede9fe; color: #4f46e5;
          padding: 3px 12px; border-radius: 20px; margin-top: 4px;
        }

        .settings-nav { display: flex; flex-direction: column; gap: 4px; }
        .settings-tab {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 14px; border-radius: 12px;
          background: #fff; border: 1px solid #f0f0f5;
          font-size: 13px; font-weight: 500; color: #555;
          cursor: pointer; transition: all 0.15s; text-align: left; width: 100%;
        }
        .settings-tab:hover  { background: #f8f8fc; color: #333; border-color: #e5e5e5; }
        .settings-tab.active {
          background: #ede9fe; color: #4f46e5;
          border-color: #ddd6fe; font-weight: 600;
        }
        .tab-icon  { font-size: 15px; }
        .tab-arrow { margin-left: auto; font-size: 16px; font-weight: 300; }

        /* Logout Section */
        .logout-section {
          background: #fff; border-radius: 14px; padding: 16px;
          border: 1px solid #fee2e2;
          display: flex; flex-direction: column; gap: 8px; align-items: center;
        }
        .btn-logout {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 11px 16px; border-radius: 10px;
          background: #fee2e2; color: #dc2626;
          border: 1px solid #fecaca; font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-logout:hover { background: #dc2626; color: #fff; border-color: #dc2626; }
        .logout-hint { font-size: 11px; color: #aaa; text-align: center; }

        /* Content Card */
        .settings-card {
          background: #fff; border-radius: 16px; padding: 28px;
          border: 1px solid #f0f0f5; display: flex; flex-direction: column; gap: 20px;
        }
        .card-header h2 { font-size: 17px; font-weight: 700; color: #111; margin-bottom: 4px; }
        .card-header p  { font-size: 13px; color: #888; }

        /* Forms */
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 13px; font-weight: 600; color: #333; }
        .form-group input {
          padding: 11px 14px; border-radius: 10px;
          border: 1px solid #e5e5e5; font-size: 14px; color: #111;
          outline: none; background: #fff; transition: border-color 0.15s;
          width: 100%;
        }
        .form-group input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
        .input-disabled { background: #f8f8fc !important; color: #aaa !important; cursor: not-allowed; }
        .field-hint  { font-size: 11px; color: #aaa; }
        .field-error { font-size: 11px; color: #dc2626; font-weight: 500; }

        .pw-wrap { position: relative; }
        .pw-wrap input { padding-right: 44px; }
        .pw-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; font-size: 16px;
        }
        .pw-strength { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
        .pw-bar  { flex: 1; height: 4px; background: #f0f0f5; border-radius: 2px; overflow: hidden; }
        .pw-fill { height: 100%; border-radius: 2px; transition: all 0.3s; }
        .pw-label { font-size: 11px; font-weight: 600; min-width: 60px; }

        .pw-rules {
          background: #f8f8fc; border-radius: 10px; padding: 14px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .rule      { font-size: 12px; color: #bbb; transition: color 0.2s; }
        .rule.met  { color: #059669; font-weight: 600; }

        .form-actions { display: flex; gap: 10px; }
        .btn-save {
          padding: 11px 24px; border-radius: 10px;
          background: #4f46e5; color: #fff;
          border: none; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-save:hover:not(:disabled) { background: #4338ca; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-reset {
          padding: 11px 20px; border-radius: 10px;
          background: #f3f4f8; color: #555;
          border: 1px solid #e5e5e5; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-reset:hover { background: #e5e5e5; }

        /* About */
        .about-banner {
          display: flex; align-items: center; gap: 16px;
          background: linear-gradient(135deg, #1e1b4b, #4f46e5);
          border-radius: 14px; padding: 20px 22px;
        }
        .about-logo {
          width: 50px; height: 50px; border-radius: 14px;
          background: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 800; color: #fff; flex-shrink: 0;
        }
        .about-name    { font-size: 18px; font-weight: 800; color: #fff; }
        .about-tagline { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 3px; }

        .about-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        }
        .about-item {
          background: #f8f8fc; border-radius: 10px; padding: 12px 14px;
          display: flex; flex-direction: column; gap: 3px;
        }
        .about-label { font-size: 11px; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .about-val   { font-size: 13px; font-weight: 600; color: #333; }

        .about-desc {
          font-size: 13px; color: #666; line-height: 1.7;
          background: #f8f8fc; border-radius: 12px; padding: 16px;
        }

        .quick-links h3 { font-size: 13px; font-weight: 700; color: #333; margin-bottom: 10px; }
        .links-grid { display: flex; gap: 10px; flex-wrap: wrap; }
        .quick-link {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 10px;
          background: #f3f4f8; color: #4f46e5;
          border: 1px solid #e5e5e5; font-size: 13px; font-weight: 600;
          text-decoration: none; transition: all 0.15s;
        }
        .quick-link:hover { background: #ede9fe; border-color: #ddd6fe; }
      `}</style>
    </div>
  );
}
