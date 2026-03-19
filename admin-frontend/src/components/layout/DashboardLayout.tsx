'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/dashboard/users/patients', label: 'Patients', icon: '🧑' },
  { href: '/dashboard/users/doctors', label: 'Doctors', icon: '👨‍⚕️' },
  { href: '/dashboard/appointments', label: 'Appointments', icon: '📅' },
  { href: '/dashboard/posts', label: 'Posts', icon: '📝' },
  { href: '/dashboard/payments', label: 'Payments', icon: '💰' },
  { href: '/dashboard/subscriptions', label: 'Subscriptions', icon: '🎯' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.push('/login'); return; }
    const u = localStorage.getItem('admin_user');
    if (u) setUser(JSON.parse(u));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/login');
  };

  const initials = user?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'AD';

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">TH</div>
            {!collapsed && <span className="brand-name">TruHeal<strong>Link</strong></span>}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {!collapsed && (
          <div className="admin-badge">
            <div className="admin-avatar">{initials}</div>
            <div>
              <div className="admin-name">{user?.fullName || 'Admin'}</div>
              <div className="admin-role">Super Admin</div>
            </div>
          </div>
        )}

        <nav className="nav">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {!collapsed && isActive(item.href) && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}>
            <span>⏻</span>
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="page-title">
              {navItems.find(n => isActive(n.href))?.label || 'Dashboard'}
            </div>
          </div>
          <div className="topbar-right">
            <div className="search-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Search..." />
            </div>
            <button className="notif-btn">
              🔔
              <span className="notif-badge">3</span>
            </button>
            <div className="user-chip">
              <div className="chip-avatar">{initials}</div>
              <span>{user?.username || 'Admin'}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="content">
          {children}
        </main>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .layout {
          display: flex; min-height: 100vh;
          font-family: 'Segoe UI', system-ui, sans-serif;
          background: #f3f4f8;
        }

        /* ── SIDEBAR ── */
        .sidebar {
          width: 240px; flex-shrink: 0;
          background: #1e1b4b;
          display: flex; flex-direction: column;
          padding: 24px 0;
          transition: width 0.25s ease;
          position: sticky; top: 0; height: 100vh;
          overflow-y: auto; overflow-x: hidden;
        }
        .sidebar.collapsed { width: 72px; }

        .sidebar-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 18px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-mark {
          width: 34px; height: 34px; flex-shrink: 0;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: #fff;
        }
        .brand-name { font-size: 15px; color: rgba(255,255,255,0.8); white-space: nowrap; }
        .brand-name strong { color: #fff; }

        .collapse-btn {
          background: rgba(255,255,255,0.08); border: none;
          color: rgba(255,255,255,0.5); cursor: pointer;
          width: 26px; height: 26px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; transition: background 0.2s;
          flex-shrink: 0;
        }
        .collapse-btn:hover { background: rgba(255,255,255,0.15); }

        .admin-badge {
          display: flex; align-items: center; gap: 10px;
          padding: 16px 18px;
          margin: 12px 12px 8px;
          background: rgba(255,255,255,0.06);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .admin-avatar {
          width: 36px; height: 36px; flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff;
        }
        .admin-name { font-size: 13px; font-weight: 600; color: #fff; }
        .admin-role { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; }

        .nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 3px; }

        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px;
          text-decoration: none; color: rgba(255,255,255,0.55);
          font-size: 14px; font-weight: 500;
          transition: background 0.15s, color 0.15s;
          position: relative;
        }
        .nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .nav-item.active {
          background: linear-gradient(135deg, rgba(99,102,241,0.35), rgba(79,70,229,0.2));
          color: #c7d2fe;
          border: 1px solid rgba(99,102,241,0.3);
        }
        .nav-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }
        .nav-label { flex: 1; }
        .nav-dot { width: 6px; height: 6px; background: #6366f1; border-radius: 50%; }

        .sidebar-bottom {
          padding: 16px 10px 0;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .logout-btn {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 10px 12px; border-radius: 10px;
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.4); font-size: 14px;
          transition: background 0.15s, color 0.15s;
        }
        .logout-btn:hover { background: rgba(239,68,68,0.15); color: #f87171; }

        /* ── MAIN ── */
        .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

        .topbar {
          height: 64px; background: #fff;
          border-bottom: 1px solid #e8e8f0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 28px;
          position: sticky; top: 0; z-index: 10;
        }
        .page-title { font-size: 18px; font-weight: 700; color: #111; letter-spacing: -0.3px; }

        .topbar-right { display: flex; align-items: center; gap: 14px; }

        .search-box {
          display: flex; align-items: center; gap: 8px;
          background: #f3f4f8; border: 1px solid #e5e5e5;
          border-radius: 10px; padding: 8px 14px;
          color: #aaa;
        }
        .search-box input {
          border: none; background: none; outline: none;
          font-size: 14px; color: #333; width: 200px;
        }
        .search-box input::placeholder { color: #aaa; }

        .notif-btn {
          position: relative; background: #f3f4f8;
          border: 1px solid #e5e5e5; border-radius: 10px;
          width: 40px; height: 40px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .notif-badge {
          position: absolute; top: -4px; right: -4px;
          width: 18px; height: 18px;
          background: #ef4444; color: #fff;
          border-radius: 50%; font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #fff;
        }

        .user-chip {
          display: flex; align-items: center; gap: 8px;
          background: #f3f4f8; border: 1px solid #e5e5e5;
          border-radius: 10px; padding: 6px 12px;
          font-size: 13px; font-weight: 500; color: #333;
        }
        .chip-avatar {
          width: 28px; height: 28px;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: #fff;
        }

        .content { flex: 1; padding: 28px; }
      `}</style>
    </div>
  );
}
