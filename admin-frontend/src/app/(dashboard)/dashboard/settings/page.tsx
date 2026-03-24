'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/auth.service'; // ← adjust path if needed

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

type ActiveTab = 'profile' | 'password' | 'about';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [user, setUser]           = useState<any>(null);
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading]     = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [fullName, setFullName]   = useState('');
  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');

  const [oldPassword, setOldPassword]         = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld]                 = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  const getPwChecks = (pwd: string) => ({
    upper:   /[A-Z]/.test(pwd),
    lower:   /[a-z]/.test(pwd),
    digit:   /[0-9]/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    length:  pwd.length >= 8,
  });
  const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

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
      await api.patch('/auth/admin/profile', { fullName, username });
      const updatedUser = { ...user, fullName, username };
      localStorage.setItem('admin_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      showToast('Profile updated successfully', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('All fields are required', 'error'); return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error'); return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      showToast('Password must contain at least one uppercase letter', 'error'); return;
    }
    if (!/[a-z]/.test(newPassword)) {
      showToast('Password must contain at least one lowercase letter', 'error'); return;
    }
    if (!/[0-9]/.test(newPassword)) {
      showToast('Password must contain at least one digit', 'error'); return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      showToast('Password must contain at least one special character', 'error'); return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error'); return;
    }
    setLoading(true);
    try {
      await api.patch('/auth/admin/change-password', { oldPassword, newPassword });
      showToast('Password changed successfully', 'success');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Current password is incorrect', 'error');
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

  const pwChecks = getPwChecks(newPassword);
  const pwScore  = Object.values(pwChecks).filter(Boolean).length;

  return (
    <div className="page">
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {showLogoutConfirm && (
        <div className="overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">👋</div>
            <h3>Log Out?</h3>
            <p>You will be signed out of your admin account and redirected to the login page.</p>
            <div className="confirm-actions">
              <button className="btn-cancel-confirm" onClick={() => setShowLogoutConfirm(false)}>Stay</button>
              <button className="btn-confirm-logout" onClick={handleLogout}>Yes, Log Out</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your admin account and preferences</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          <div className="admin-card">
            <div className="admin-avatar-lg">{initials}</div>
            <div className="admin-name-lg">{user?.fullName || 'Admin'}</div>
            <div className="admin-email-sm">{user?.email || ''}</div>
            <div className="admin-role-badge">⚡ Super Admin</div>
          </div>

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

          <div className="logout-section">
            <button className="btn-logout" onClick={() => setShowLogoutConfirm(true)}>
              <span>⏻</span>
              <span>Log Out</span>
            </button>
            <p className="logout-hint">You'll be redirected to the login page</p>
          </div>
        </div>

        <div className="settings-content">

          {activeTab === 'profile' && (
            <div className="settings-card">
              <div className="card-header">
                <h2>Profile Information</h2>
                <p>Update your admin account display name and username</p>
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={email} disabled className="input-disabled" />
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
                <button className="btn-reset" onClick={() => { setFullName(user?.fullName || ''); setUsername(user?.username || ''); }}>
                  Reset
                </button>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="settings-card">
              <div className="card-header">
                <h2>Change Password</h2>
                <p>Keep your admin account secure with a strong password</p>
              </div>
              <div className="form-group">
                <label>Current Password</label>
                <div className="pw-wrap">
                  <input type={showOld ? 'text' : 'password'} value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Enter current password" />
                  <button type="button" className="pw-toggle" onClick={() => setShowOld(!showOld)}><EyeIcon open={showOld} /></button>
                </div>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <div className="pw-wrap">
                  <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" />
                  <button type="button" className="pw-toggle" onClick={() => setShowNew(!showNew)}><EyeIcon open={showNew} /></button>
                </div>
                {newPassword.length > 0 && (
                  <div className="pw-strength">
                    <div className="pw-strength-header">
                      <span className="pw-label" style={{ color: STRENGTH_COLORS[pwScore] }}>{STRENGTH_LABELS[pwScore]}</span>
                      <span className="pw-score">{pwScore}/5</span>
                    </div>
                    <div className="pw-bars">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="pw-bar">
                          <div className="pw-fill" style={{ width: i <= pwScore ? '100%' : '0%', background: STRENGTH_COLORS[pwScore] }} />
                        </div>
                      ))}
                    </div>
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
                  <button type="button" className="pw-toggle" onClick={() => setShowConfirm(!showConfirm)}><EyeIcon open={showConfirm} /></button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <span className="field-error">Passwords do not match</span>
                )}
              </div>
              <div className="pw-rules">
                {([
                  { key: 'length',  label: '8+ characters'        },
                  { key: 'upper',   label: 'Uppercase letter'      },
                  { key: 'lower',   label: 'Lowercase letter'      },
                  { key: 'digit',   label: 'Number (0–9)'          },
                  { key: 'special', label: 'Special character (!@#...)' },
                ] as { key: keyof typeof pwChecks; label: string }[]).map(({ key, label }) => (
                  <div key={key} className={`rule ${pwChecks[key] ? 'met' : ''}`}>
                    {pwChecks[key] ? '✓' : '○'} {label}
                  </div>
                ))}
              </div>
              <div className="form-actions">
                <button
                  className="btn-save"
                  onClick={handlePasswordChange}
                  disabled={loading || !oldPassword || !confirmPassword || pwScore < 5 || newPassword !== confirmPassword}
                >
                  {loading ? '...' : '🔒 Change Password'}
                </button>
                <button className="btn-reset" onClick={() => { setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }}>
                  Clear
                </button>
              </div>
            </div>
          )}

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
                  <a href="http://localhost:3001/api/docs" target="_blank" rel="noopener noreferrer" className="quick-link">📖 Admin API Docs</a>
                  <a href="http://localhost:3000/api" target="_blank" rel="noopener noreferrer" className="quick-link">🔗 Main Backend API</a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .page { display: flex; flex-direction: column; gap: 24px; position: relative; }
        .toast { position: fixed; top: 24px; right: 24px; z-index: 9999; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; animation: slideIn 0.3s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .toast.success { background: #d1fae5; color: #065f46; }
        .toast.error   { background: #fee2e2; color: #991b1b; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .confirm-modal { background: #fff; border-radius: 20px; padding: 36px; width: 100%; max-width: 380px; text-align: center; animation: slideUp 0.25s ease; box-shadow: 0 24px 60px rgba(0,0,0,0.18); }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .confirm-icon { font-size: 48px; margin-bottom: 16px; }
        .confirm-modal h3 { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 10px; }
        .confirm-modal p  { font-size: 14px; color: #666; line-height: 1.6; }
        .confirm-actions  { display: flex; gap: 10px; margin-top: 24px; justify-content: center; }
        .btn-cancel-confirm { padding: 10px 24px; border-radius: 10px; background: #f3f4f8; color: #555; border: 1px solid #e5e5e5; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .btn-cancel-confirm:hover { background: #e5e5e5; }
        .btn-confirm-logout { padding: 10px 24px; border-radius: 10px; background: #ef4444; color: #fff; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .btn-confirm-logout:hover { background: #dc2626; }
        .page-header { display: flex; align-items: center; justify-content: space-between; }
        .page-title  { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .page-sub    { font-size: 13px; color: #888; margin-top: 4px; }
        .settings-layout { display: grid; grid-template-columns: 260px 1fr; gap: 24px; align-items: start; }
        .settings-sidebar { display: flex; flex-direction: column; gap: 14px; }
        .admin-card { background: #fff; border-radius: 16px; padding: 22px 20px; border: 1px solid #E0E4FF; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
        .admin-avatar-lg { width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(135deg, #6B7FED, #7B8CDE); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 4px; }
        .admin-name-lg   { font-size: 15px; font-weight: 700; color: #111; }
        .admin-email-sm  { font-size: 12px; color: #888; }
        .admin-role-badge { font-size: 11px; font-weight: 700; background: #EEF1FF; color: #6B7FED; padding: 3px 12px; border-radius: 20px; margin-top: 4px; }
        .settings-nav { display: flex; flex-direction: column; gap: 4px; }
        .settings-tab { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 12px; background: #fff; border: 1px solid #E0E4FF; font-size: 13px; font-weight: 500; color: #555; cursor: pointer; transition: all 0.15s; text-align: left; width: 100%; }
        .settings-tab:hover  { background: #f8f8fc; color: #333; border-color: #e5e5e5; }
        .settings-tab.active { background: #EEF1FF; color: #6B7FED; border-color: #E0E4FF; font-weight: 600; }
        .tab-icon  { font-size: 15px; }
        .tab-arrow { margin-left: auto; font-size: 16px; font-weight: 300; }
        .logout-section { background: #fff; border-radius: 14px; padding: 16px; border: 1px solid #fee2e2; display: flex; flex-direction: column; gap: 8px; align-items: center; }
        .btn-logout { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; border-radius: 10px; background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .btn-logout:hover { background: #dc2626; color: #fff; border-color: #dc2626; }
        .logout-hint { font-size: 11px; color: #aaa; text-align: center; }
        .settings-card { background: #fff; border-radius: 16px; padding: 28px; border: 1px solid #E0E4FF; display: flex; flex-direction: column; gap: 20px; }
        .card-header h2 { font-size: 17px; font-weight: 700; color: #111; margin-bottom: 4px; }
        .card-header p  { font-size: 13px; color: #888; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 13px; font-weight: 600; color: #333; }
        .form-group input { padding: 11px 14px; border-radius: 10px; border: 1px solid #e5e5e5; font-size: 14px; color: #111; outline: none; background: #fff; transition: border-color 0.15s; width: 100%; }
        .form-group input:focus { border-color: #6B7FED; box-shadow: 0 0 0 3px rgba(107,127,237,0.12); }
        .input-disabled { background: #f8f8fc !important; color: #aaa !important; cursor: not-allowed; }
        .field-hint  { font-size: 11px; color: #aaa; }
        .field-error { font-size: 11px; color: #dc2626; font-weight: 500; }
        .pw-wrap { position: relative; }
        .pw-wrap input { padding-right: 44px; }
        .pw-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9ca3af; display: flex; align-items: center; padding: 2px; border-radius: 4px; transition: color 0.15s; }
        .pw-toggle:hover { color: #6B7FED; }
        .pw-strength { margin-top: 8px; }
        .pw-strength-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .pw-label { font-size: 11px; font-weight: 700; }
        .pw-score { font-size: 11px; color: #aaa; }
        .pw-bars { display: flex; gap: 4px; }
        .pw-bar  { flex: 1; height: 4px; background: #E0E4FF; border-radius: 2px; overflow: hidden; }
        .pw-fill { height: 100%; border-radius: 2px; transition: all 0.3s; }
        .pw-rules { background: #f8f8fc; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
        .rule     { font-size: 12px; color: #bbb; transition: color 0.2s; }
        .rule.met { color: #059669; font-weight: 600; }
        .form-actions { display: flex; gap: 10px; }
        .btn-save { padding: 11px 24px; border-radius: 10px; background: #6B7FED; color: #fff; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .btn-save:hover:not(:disabled) { background: #4338ca; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-reset { padding: 11px 20px; border-radius: 10px; background: #f3f4f8; color: #555; border: 1px solid #e5e5e5; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .btn-reset:hover { background: #e5e5e5; }
        .about-banner { display: flex; align-items: center; gap: 16px; background: linear-gradient(135deg, #1A1E52, #6B7FED); border-radius: 14px; padding: 20px 22px; }
        .about-logo { width: 50px; height: 50px; border-radius: 14px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .about-name    { font-size: 18px; font-weight: 800; color: #fff; }
        .about-tagline { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 3px; }
        .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .about-item { background: #f8f8fc; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 3px; }
        .about-label { font-size: 11px; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .about-val   { font-size: 13px; font-weight: 600; color: #333; }
        .about-desc { font-size: 13px; color: #666; line-height: 1.7; background: #f8f8fc; border-radius: 12px; padding: 16px; }
        .quick-links h3 { font-size: 13px; font-weight: 700; color: #333; margin-bottom: 10px; }
        .links-grid { display: flex; gap: 10px; flex-wrap: wrap; }
        .quick-link { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; background: #f3f4f8; color: #6B7FED; border: 1px solid #e5e5e5; font-size: 13px; font-weight: 600; text-decoration: none; transition: all 0.15s; }
        .quick-link:hover { background: #EEF1FF; border-color: #E0E4FF; }
      `}</style>
    </div>
  );
}