'use client';

import { useState, useEffect, useRef } from 'react';
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
  { href: '/dashboard/points-rewards', label: 'Points & Rewards', icon: '⭐' },
];

const moderationItems = [
  { href: '/dashboard/reports',  label: 'Post Reports',    icon: '🚨', badge: 'reports'  },
  { href: '/dashboard/feedback', label: 'Doctor Feedback', icon: '⭐', badge: 'feedback' },
  { href: '/dashboard/support',  label: 'Support Queries', icon: '💬', badge: 'support'  },
];

interface AdminNotif {
  id: string;
  title: string;
  message: string;
  type: 'doctor' | 'appointment' | 'payment' | 'report' | 'feedback' | 'support' | 'patient' | 'subscription' | 'post';
  time: string;
  read: boolean;
  href: string;
}

interface BadgeCounts {
  reports: number;
  feedback: number;
  support: number;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]           = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges]       = useState<BadgeCounts>({ reports: 0, feedback: 0, support: 0 });

  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults]     = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications]   = useState<AdminNotif[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifRef   = useRef<HTMLDivElement>(null);
  const notifIdRef = useRef(0);
  const lastDataRef = useRef<any>(null);

  useEffect(() => {
    try {
      localStorage.removeItem('admin_notif_baseline');
      lastDataRef.current = null;
    } catch {}
  }, []);

  const makeId  = () => String(++notifIdRef.current);
  const timeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)   return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifPanel(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowResults(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pollNotifications = async () => {
    try {
      const BASE = 'http://localhost:3000/api';

      const [
        usersRes,
        doctorsRes,
        walletRes,
        reportsRes,
        feedbackRes,
        pendingPostsRes,
      ] = await Promise.allSettled([
        fetch(`${BASE}/users`).then(r => r.json()),
        fetch(`${BASE}/doctors`).then(r => r.json()),
        fetch(`${BASE}/payment/admin/wallet`).then(r => r.json()),
        fetch(`${BASE}/reports`).then(r => r.json()),
        fetch(`${BASE}/feedback`).then(r => r.json()),
        fetch(`${BASE}/posts/pending?limit=100`).then(r => r.json()),
      ]);

      const usersRaw        = usersRes.status        === 'fulfilled' ? usersRes.value        : [];
      const doctorsRaw      = doctorsRes.status      === 'fulfilled' ? doctorsRes.value      : [];
      const wallet          = walletRes.status       === 'fulfilled' ? (walletRes.value.data || walletRes.value) : {};
      const reportsRaw      = reportsRes.status      === 'fulfilled' ? reportsRes.value      : [];
      const feedbackRaw     = feedbackRes.status     === 'fulfilled' ? feedbackRes.value     : [];
      const pendingPostsRaw = pendingPostsRes.status === 'fulfilled' ? pendingPostsRes.value : {};

      const allUsers: any[]   = Array.isArray(usersRaw)    ? usersRaw    : (usersRaw.users    || usersRaw.data    || []);
      const allDoctors: any[] = Array.isArray(doctorsRaw)  ? doctorsRaw  : (doctorsRaw.doctors || doctorsRaw.data  || []);
      const reports: any[]    = Array.isArray(reportsRaw)  ? reportsRaw  : (reportsRaw.data   || []);
      const feedbacks: any[]  = Array.isArray(feedbackRaw) ? feedbackRaw : (feedbackRaw.data  || []);
      const pendingPosts      = pendingPostsRaw.pagination?.total || pendingPostsRaw.data?.length || 0;
      const pendingReports    = reports.filter((r: any) => r.status === 'pending').length;

      setBadges(prev => ({ ...prev, reports: pendingReports }));

      const now = new Date();
      const aptResults = await Promise.allSettled(
        allDoctors.slice(0, 10).map((d: any) =>
          fetch(`${BASE}/booked-appointments/doctor/${d._id}`)
            .then(r => r.json())
            .then(r => r.data || r.appointments || [])
            .catch(() => [])
        )
      );
      const allApts: any[] = [];
      aptResults.forEach(r => { if (r.status === 'fulfilled') allApts.push(...r.value); });

      const paidDoctors = allDoctors.filter((d: any) =>
        d.subscriptionPlan && d.subscriptionPlan !== 'free_trial'
      ).length;

      const currData = {
        totalPatients:   allUsers.length,
        totalDoctors:    allDoctors.length,
        pendingDoctors:  allDoctors.filter((d: any) => !d.doctorProfile?.isVerified).length,
        totalCommission: wallet.totalCommission || 0,
        totalApts:       allApts.length,
        completedApts:   allApts.filter((a: any) => a.status === 'completed').length,
        pendingReports,
        totalFeedbacks:  feedbacks.length,
        pendingPosts,
        paidDoctors,
      };

      if (!lastDataRef.current) {
        lastDataRef.current = currData;
        localStorage.setItem('admin_notif_baseline', JSON.stringify(currData));
        return;
      }

      const prev = lastDataRef.current;
      const newNotifs: AdminNotif[] = [];

      // 1. New patient registered
      if (prev.totalPatients !== undefined && currData.totalPatients > prev.totalPatients) {
        const diff = currData.totalPatients - prev.totalPatients;
        newNotifs.push({
          id: makeId(), type: 'patient', read: false, time: timeAgo(now),
          href: '/dashboard/users/patients',
          title: '🧑 New Patient Joined',
          message: `${diff} new patient${diff > 1 ? 's' : ''} registered on the platform`,
        });
      }

      // 2. New doctor registered
      if (prev.totalDoctors !== undefined && currData.totalDoctors > prev.totalDoctors) {
        const diff = currData.totalDoctors - prev.totalDoctors;
        newNotifs.push({
          id: makeId(), type: 'doctor', read: false, time: timeAgo(now),
          href: '/dashboard/users/doctors',
          title: '👨‍⚕️ New Doctor Registered',
          message: `${diff} new doctor${diff > 1 ? 's' : ''} waiting for approval`,
        });
      }

      // 3. Pending verifications increased
      if (prev.pendingDoctors !== undefined && currData.pendingDoctors > prev.pendingDoctors) {
        const diff = currData.pendingDoctors - prev.pendingDoctors;
        newNotifs.push({
          id: makeId(), type: 'doctor', read: false, time: timeAgo(now),
          href: '/dashboard/users/doctors',
          title: '⏳ Doctor Awaiting Verification',
          message: `${diff} doctor${diff > 1 ? 's' : ''} submitted profile and waiting for approval`,
        });
      }

      // 4. Commission earned
      if (prev.totalCommission !== undefined && currData.totalCommission > prev.totalCommission) {
        const diff = currData.totalCommission - prev.totalCommission;
        newNotifs.push({
          id: makeId(), type: 'payment', read: false, time: timeAgo(now),
          href: '/dashboard/payments',
          title: '💰 Commission Received',
          message: `PKR ${diff.toLocaleString()} new commission earned`,
        });
      }

      // 5. New appointment booked
      if (prev.totalApts !== undefined && currData.totalApts > prev.totalApts) {
        const diff = currData.totalApts - prev.totalApts;
        newNotifs.push({
          id: makeId(), type: 'appointment', read: false, time: timeAgo(now),
          href: '/dashboard/appointments',
          title: '📅 New Appointment Booked',
          message: `${diff} new appointment${diff > 1 ? 's' : ''} booked`,
        });
      }

      // 6. Appointment completed
      if (prev.completedApts !== undefined && currData.completedApts > prev.completedApts) {
        const diff = currData.completedApts - prev.completedApts;
        newNotifs.push({
          id: makeId(), type: 'appointment', read: false, time: timeAgo(now),
          href: '/dashboard/appointments',
          title: '✅ Appointment Completed',
          message: `${diff} appointment${diff > 1 ? 's' : ''} successfully completed`,
        });
      }

      // 7. New report filed
      if (prev.pendingReports !== undefined && currData.pendingReports > prev.pendingReports) {
        const diff = currData.pendingReports - prev.pendingReports;
        newNotifs.push({
          id: makeId(), type: 'report', read: false, time: timeAgo(now),
          href: '/dashboard/reports',
          title: '🚨 New Report Filed',
          message: `${diff} new post report${diff > 1 ? 's' : ''} require review`,
        });
      }

      // 8. New feedback submitted
      if (prev.totalFeedbacks !== undefined && currData.totalFeedbacks > prev.totalFeedbacks) {
        const diff = currData.totalFeedbacks - prev.totalFeedbacks;
        newNotifs.push({
          id: makeId(), type: 'feedback', read: false, time: timeAgo(now),
          href: '/dashboard/feedback',
          title: '⭐ New Doctor Feedback',
          message: `${diff} new review${diff > 1 ? 's' : ''} submitted by patients`,
        });
      }

      // 9. New post pending approval
      if (prev.pendingPosts !== undefined && currData.pendingPosts > prev.pendingPosts) {
        const diff = currData.pendingPosts - prev.pendingPosts;
        newNotifs.push({
          id: makeId(), type: 'post', read: false, time: timeAgo(now),
          href: '/dashboard/posts',
          title: '📝 New Post Pending',
          message: `${diff} new post${diff > 1 ? 's' : ''} waiting for doctor approval`,
        });
      }

      // 10. Doctor purchased subscription
      if (prev.paidDoctors !== undefined && currData.paidDoctors > prev.paidDoctors) {
        const diff = currData.paidDoctors - prev.paidDoctors;
        newNotifs.push({
          id: makeId(), type: 'subscription', read: false, time: timeAgo(now),
          href: '/dashboard/subscriptions',
          title: '🎯 Subscription Purchased',
          message: `${diff} doctor${diff > 1 ? 's' : ''} upgraded their subscription plan`,
        });
      }

      lastDataRef.current = currData;
      localStorage.setItem('admin_notif_baseline', JSON.stringify(currData));

      if (newNotifs.length > 0) {
        setNotifications(prev => [...newNotifs, ...prev].slice(0, 50));
      }
    } catch (e) {
      console.error('[Notifications] Poll error:', e);
    }
  };

  useEffect(() => {
    pollNotifications();
    const interval = setInterval(pollNotifications, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowResults(false); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [usersRes, doctorsRes, postsRes] = await Promise.allSettled([
          fetch('http://localhost:3000/api/users').then(r => r.json()),
          fetch('http://localhost:3000/api/doctors').then(r => r.json()),
          fetch('http://localhost:3000/api/posts/feed?limit=100').then(r => r.json()),
        ]);
        const q = searchQuery.toLowerCase();
        const results: any[] = [];

        if (usersRes.status === 'fulfilled') {
          const usersRaw = usersRes.value;
          const usersList = Array.isArray(usersRaw) ? usersRaw : (usersRaw.users || usersRaw.data || []);
          usersList
            .filter((u: any) => u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
            .slice(0, 3)
            .forEach((u: any) => results.push({ type: 'patient', label: u.fullName, sub: u.email, href: '/dashboard/users/patients', icon: '🧑' }));
        }
        if (doctorsRes.status === 'fulfilled') {
          const doctorsRaw = doctorsRes.value;
          const doctorsList = Array.isArray(doctorsRaw) ? doctorsRaw : (doctorsRaw.doctors || doctorsRaw.data || []);
          doctorsList
            .filter((d: any) => d.fullName?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.doctorProfile?.specialization?.toLowerCase().includes(q))
            .slice(0, 3)
            .forEach((d: any) => results.push({ type: 'doctor', label: `Dr. ${d.fullName}`, sub: d.doctorProfile?.specialization || d.email, href: '/dashboard/users/doctors', icon: '👨‍⚕️' }));
        }
        if (postsRes.status === 'fulfilled') {
          (postsRes.value.data || [])
            .filter((p: any) => p.title?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q))
            .slice(0, 3)
            .forEach((p: any) => results.push({ type: 'post', label: p.title, sub: p.category, href: '/dashboard/posts', icon: '📝' }));
        }
        setSearchResults(results);
        setShowResults(true);
      } catch {}
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const initials    = user?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'AD';
  const isActive    = (href: string) => href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead    = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const clearAll    = () => setNotifications([]);

  const notifColors: Record<string, { bg: string; color: string }> = {
    doctor:       { bg: '#ede9fe', color: '#6d28d9' },
    appointment:  { bg: '#dbeafe', color: '#1d4ed8' },
    payment:      { bg: '#d1fae5', color: '#059669' },
    report:       { bg: '#fee2e2', color: '#dc2626' },
    feedback:     { bg: '#fef3c7', color: '#d97706' },
    support:      { bg: '#e0f2fe', color: '#0284c7' },
    patient:      { bg: '#f0fdf4', color: '#16a34a' },
    subscription: { bg: '#fef9c3', color: '#ca8a04' },
    post:         { bg: '#f5f3ff', color: '#7c3aed' },
  };

  const getPageTitle = () => {
    if (pathname.includes('settings')) return 'Settings';
    if (pathname.includes('reports'))  return 'Post Reports';
    if (pathname.includes('feedback')) return 'Doctor Feedback';
    if (pathname.includes('support'))  return 'Support Queries';
    return [...navItems, ...moderationItems].find(n => isActive(n.href))?.label || 'Dashboard';
  };

  return (
    <div className="layout">
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
            <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {!collapsed && isActive(item.href) && <span className="nav-dot" />}
            </Link>
          ))}

          {!collapsed && <div className="nav-divider">Moderation</div>}
          {collapsed && <div className="nav-divider-collapsed" />}

          {moderationItems.map(item => {
            const count = badges[item.badge as keyof BadgeCounts] || 0;
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
                {count > 0 && <span className="nav-badge">{collapsed ? '' : count}</span>}
                {collapsed && count > 0 && <span className="nav-badge-dot" />}
                {!collapsed && isActive(item.href) && count === 0 && <span className="nav-dot" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <Link href="/dashboard/settings" className={`nav-item ${isActive('/dashboard/settings') ? 'active' : ''}`}>
            <span className="nav-icon">⚙️</span>
            {!collapsed && <span className="nav-label">Settings</span>}
            {!collapsed && isActive('/dashboard/settings') && <span className="nav-dot" />}
          </Link>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="page-title">{getPageTitle()}</div>
          </div>
          <div className="topbar-right">

            <div className="search-container" ref={searchRef}>
              <div className="search-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search patients, doctors, posts..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                />
                {searchLoading && <div className="search-spinner" />}
                {searchQuery && <button className="search-clear" onClick={() => { setSearchQuery(''); setShowResults(false); }}>✕</button>}
              </div>
              {showResults && (
                <div className="search-dropdown">
                  {searchResults.length === 0 ? (
                    <div className="search-empty">No results for "{searchQuery}"</div>
                  ) : (
                    <>
                      <div className="search-count">{searchResults.length} result{searchResults.length > 1 ? 's' : ''} found</div>
                      {searchResults.map((r, i) => (
                        <Link key={i} href={r.href} className="search-result-item" onClick={() => { setShowResults(false); setSearchQuery(''); }}>
                          <span className="search-result-icon">{r.icon}</span>
                          <div className="search-result-info">
                            <div className="search-result-label">{r.label}</div>
                            <div className="search-result-sub">{r.sub}</div>
                          </div>
                          <span className="search-result-type">{r.type}</span>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="notif-wrap" ref={notifRef}>
              <button className="notif-bell" onClick={() => setShowNotifPanel(v => !v)}>
                🔔
                {unreadCount > 0 && <span className="notif-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>

              {showNotifPanel && (
                <div className="notif-panel">
                  <div className="notif-panel-header">
                    <h3>Notifications</h3>
                    <div className="notif-header-actions">
                      {unreadCount > 0 && <button className="notif-action-btn" onClick={markAllRead}>Mark all read</button>}
                      {notifications.length > 0 && <button className="notif-action-btn red" onClick={clearAll}>Clear all</button>}
                    </div>
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <span>🔔</span>
                        <p>No notifications yet</p>
                        <span className="notif-empty-sub">New activity will appear here</span>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <Link key={n.id} href={n.href} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => { markRead(n.id); setShowNotifPanel(false); }}>
                          <div className="notif-dot-wrap">
                            <div className="notif-type-dot" style={{ background: notifColors[n.type]?.color }} />
                            {!n.read && <div className="notif-unread-ring" />}
                          </div>
                          <div className="notif-item-content">
                            <div className="notif-item-title">{n.title}</div>
                            <div className="notif-item-msg">{n.message}</div>
                            <div className="notif-item-time">{n.time}</div>
                          </div>
                          <div className="notif-type-chip" style={{ background: notifColors[n.type]?.bg, color: notifColors[n.type]?.color }}>
                            {n.type}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                  <div className="notif-panel-footer">
                    <span>{unreadCount} unread · {notifications.length} total</span>
                    <span className="notif-refresh">Refreshes every 3s</span>
                  </div>
                </div>
              )}
            </div>

            <div className="user-chip">
              <div className="chip-avatar">{initials}</div>
              <span>{user?.username || 'Admin'}</span>
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .layout { display: flex; min-height: 100vh; font-family: 'Segoe UI', system-ui, sans-serif; background: #f3f4f8; }
        .sidebar { width: 240px; flex-shrink: 0; background: #1e1b4b; display: flex; flex-direction: column; padding: 24px 0; transition: width 0.25s ease; position: sticky; top: 0; height: 100vh; overflow-y: auto; overflow-x: hidden; }
        .sidebar.collapsed { width: 72px; }
        .sidebar-top { display: flex; align-items: center; justify-content: space-between; padding: 0 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-mark { width: 34px; height: 34px; flex-shrink: 0; background: linear-gradient(135deg, #4f46e5, #6366f1); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; }
        .brand-name { font-size: 15px; color: rgba(255,255,255,0.8); white-space: nowrap; }
        .brand-name strong { color: #fff; }
        .collapse-btn { background: rgba(255,255,255,0.08); border: none; color: rgba(255,255,255,0.5); cursor: pointer; width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: background 0.2s; flex-shrink: 0; }
        .collapse-btn:hover { background: rgba(255,255,255,0.15); }
        .admin-badge { display: flex; align-items: center; gap: 10px; padding: 16px 18px; margin: 12px 12px 8px; background: rgba(255,255,255,0.06); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
        .admin-avatar { width: 36px; height: 36px; flex-shrink: 0; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; }
        .admin-name { font-size: 13px; font-weight: 600; color: #fff; }
        .admin-role { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; }
        .nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 3px; }
        .nav-divider { padding: 14px 12px 6px; font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.8px; }
        .nav-divider-collapsed { height: 1px; background: rgba(255,255,255,0.08); margin: 10px 12px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; text-decoration: none; color: rgba(255,255,255,0.55); font-size: 14px; font-weight: 500; transition: background 0.15s, color 0.15s; position: relative; }
        .nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .nav-item.active { background: linear-gradient(135deg, rgba(99,102,241,0.35), rgba(79,70,229,0.2)); color: #c7d2fe; border: 1px solid rgba(99,102,241,0.3); }
        .nav-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }
        .nav-label { flex: 1; }
        .nav-dot { width: 6px; height: 6px; background: #6366f1; border-radius: 50%; }
        .nav-badge { min-width: 20px; height: 20px; padding: 0 6px; background: #ef4444; color: #fff; border-radius: 10px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .nav-badge-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; border: 2px solid #1e1b4b; }
        .sidebar-bottom { padding: 16px 10px 0; border-top: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 3px; }
        .logout-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: none; background: none; color: rgba(255,255,255,0.55); font-size: 14px; font-weight: 500; cursor: pointer; width: 100%; transition: background 0.15s, color 0.15s; }
        .logout-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .topbar { height: 64px; background: #fff; border-bottom: 1px solid #e8e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; position: sticky; top: 0; z-index: 10; }
        .page-title { font-size: 18px; font-weight: 700; color: #111; letter-spacing: -0.3px; }
        .topbar-right { display: flex; align-items: center; gap: 14px; }
        .user-chip { display: flex; align-items: center; gap: 8px; background: #f3f4f8; border: 1px solid #e5e5e5; border-radius: 10px; padding: 6px 12px; font-size: 13px; font-weight: 500; color: #333; }
        .chip-avatar { width: 28px; height: 28px; background: linear-gradient(135deg, #4f46e5, #6366f1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; }
        .content { flex: 1; padding: 28px; }
        .search-container { position: relative; }
        .search-box { display: flex; align-items: center; gap: 8px; background: #f3f4f8; border: 1px solid #e5e5e5; border-radius: 10px; padding: 8px 14px; color: #aaa; transition: border-color 0.15s; }
        .search-box:focus-within { border-color: #4f46e5; background: #fff; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
        .search-box input { border: none; background: none; outline: none; font-size: 14px; color: #333; width: 240px; }
        .search-box input::placeholder { color: #aaa; }
        .search-spinner { width: 14px; height: 14px; border: 2px solid #e5e5e5; border-top-color: #4f46e5; border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .search-clear { background: none; border: none; cursor: pointer; color: #aaa; font-size: 12px; flex-shrink: 0; }
        .search-dropdown { position: absolute; top: calc(100% + 8px); left: 0; width: 340px; background: #fff; border-radius: 14px; border: 1px solid #f0f0f5; box-shadow: 0 16px 40px rgba(0,0,0,0.12); overflow: hidden; z-index: 100; animation: dropIn 0.15s ease; }
        @keyframes dropIn { from { transform: translateY(-6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .search-count { font-size: 11px; color: #aaa; padding: 10px 16px 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .search-empty { font-size: 13px; color: #aaa; padding: 20px 16px; text-align: center; }
        .search-result-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; text-decoration: none; transition: background 0.12s; border-bottom: 1px solid #f8f8fc; }
        .search-result-item:last-child { border-bottom: none; }
        .search-result-item:hover { background: #f8f8fc; }
        .search-result-icon { font-size: 18px; flex-shrink: 0; }
        .search-result-info { flex: 1; min-width: 0; }
        .search-result-label { font-size: 13px; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .search-result-sub { font-size: 11px; color: #888; margin-top: 1px; }
        .search-result-type { font-size: 10px; font-weight: 700; color: #4f46e5; background: #ede9fe; padding: 2px 8px; border-radius: 20px; flex-shrink: 0; text-transform: capitalize; }
        .notif-wrap { position: relative; }
        .notif-bell { position: relative; background: #f3f4f8; border: 1px solid #e5e5e5; border-radius: 10px; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all 0.15s; }
        .notif-bell:hover { background: #ede9fe; border-color: #ddd6fe; }
        .notif-count { position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; border-radius: 50%; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; padding: 0 4px; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; animation: popIn 0.3s ease; }
        @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
        .notif-panel { position: absolute; top: calc(100% + 10px); right: 0; width: 380px; background: #fff; border-radius: 16px; border: 1px solid #f0f0f5; box-shadow: 0 20px 60px rgba(0,0,0,0.15); z-index: 500; overflow: hidden; animation: dropDown 0.2s ease; }
        @keyframes dropDown { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .notif-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #f0f0f5; }
        .notif-panel-header h3 { font-size: 15px; font-weight: 700; color: #111; }
        .notif-header-actions { display: flex; gap: 6px; }
        .notif-action-btn { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 8px; border: none; cursor: pointer; background: #f3f4f8; color: #555; transition: all 0.15s; }
        .notif-action-btn:hover { background: #e5e5e5; }
        .notif-action-btn.red { background: #fee2e2; color: #dc2626; }
        .notif-action-btn.red:hover { background: #dc2626; color: #fff; }
        .notif-list { max-height: 380px; overflow-y: auto; }
        .notif-list::-webkit-scrollbar { width: 4px; }
        .notif-list::-webkit-scrollbar-track { background: transparent; }
        .notif-list::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 2px; }
        .notif-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 20px; color: #aaa; }
        .notif-empty span { font-size: 32px; }
        .notif-empty p { font-size: 14px; font-weight: 600; color: #555; }
        .notif-empty-sub { font-size: 12px !important; color: #aaa !important; }
        .notif-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #f8f8fc; text-decoration: none; transition: background 0.12s; cursor: pointer; }
        .notif-item:last-child { border-bottom: none; }
        .notif-item:hover { background: #f8f8fc; }
        .notif-item.unread { background: #fafafe; }
        .notif-dot-wrap { position: relative; padding-top: 3px; flex-shrink: 0; }
        .notif-type-dot { width: 9px; height: 9px; border-radius: 50%; }
        .notif-unread-ring { position: absolute; top: -2px; left: -2px; width: 13px; height: 13px; border-radius: 50%; border: 2px solid #4f46e5; opacity: 0.4; animation: ringPulse 2s ease-in-out infinite; }
        @keyframes ringPulse { 0%,100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.4); opacity: 0; } }
        .notif-item-content { flex: 1; min-width: 0; }
        .notif-item-title { font-size: 13px; font-weight: 700; color: #111; margin-bottom: 2px; }
        .notif-item-msg { font-size: 12px; color: #555; line-height: 1.4; }
        .notif-item-time { font-size: 11px; color: #aaa; margin-top: 4px; }
        .notif-type-chip { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; text-transform: capitalize; flex-shrink: 0; align-self: flex-start; margin-top: 2px; }
        .notif-panel-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-top: 1px solid #f0f0f5; font-size: 11px; color: #aaa; }
        .notif-refresh { font-size: 10px; color: #ccc; }
      `}</style>
    </div>
  );
}