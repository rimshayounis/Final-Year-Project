'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const ICONS: Record<string, React.ReactNode> = {
  dashboard:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  patients:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  doctors:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="9.5" y1="13.5" x2="14.5" y2="13.5"/></svg>,
  appointments: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  posts:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  withdrawals:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
  transactions: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  subscriptions:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  rewards:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  reports:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  feedback:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  support:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  settings:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

const navItems = [
  { href: '/dashboard',                   label: 'Dashboard',      icon: 'dashboard'    },
  { href: '/dashboard/users/patients',    label: 'Patients',       icon: 'patients'     },
  { href: '/dashboard/users/doctors',     label: 'Professionals',  icon: 'doctors'      },
  { href: '/dashboard/appointments',      label: 'Appointments',   icon: 'appointments' },
  { href: '/dashboard/posts',             label: 'Posts',          icon: 'posts'        },
  { href: '/dashboard/wallet-withdrawals',label: 'Withdrawals',    icon: 'withdrawals'  },
  { href: '/dashboard/transactions',      label: 'Transactions',   icon: 'transactions' },
  { href: '/dashboard/subscriptions',     label: 'Subscriptions',  icon: 'subscriptions'},
  { href: '/dashboard/points-rewards',    label: 'Points & Rewards',icon: 'rewards'     },
];

const moderationItems = [
  { href: '/dashboard/reports',  label: 'Post Reports',    icon: 'reports',  badge: 'reports'  },
  { href: '/dashboard/feedback', label: 'Doctor Feedback', icon: 'feedback', badge: 'feedback' },
  { href: '/dashboard/support',  label: 'Support Queries', icon: 'support',  badge: 'support'  },
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
  const [user, setUser]               = useState<any>(null);
  const [collapsed, setCollapsed]     = useState(false);
  const [badges, setBadges]           = useState<BadgeCounts>({ reports: 0, feedback: 0, support: 0 });
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults]     = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications]   = useState<AdminNotif[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showUserMenu, setShowUserMenu]     = useState(false);
  const notifRef   = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
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
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
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
          href: '/dashboard/appointments',
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
    const img = localStorage.getItem('admin_profile_image');
    if (img) setProfileImage(img);

    const onProfileUpdate = () => {
      const updated = localStorage.getItem('admin_profile_image');
      setProfileImage(updated);
    };
    window.addEventListener('admin-profile-updated', onProfileUpdate);
    return () => window.removeEventListener('admin-profile-updated', onProfileUpdate);
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
        <div className={`sidebar-top ${collapsed ? 'sidebar-top-collapsed' : ''}`}>
          {!collapsed && (
            <div className="brand">
              <span className="brand-name">TruHeal<strong>Link</strong></span>
            </div>
          )}
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>

        {!collapsed && (
          <div className="admin-badge">
            <div className="admin-avatar">
              {profileImage
                ? <img src={profileImage} alt="profile" className="admin-avatar-img" />
                : <span>{initials}</span>
              }
            </div>
            <div>
              <div className="admin-name">{user?.fullName || 'Admin'}</div>
              <div className="admin-role">Super Admin</div>
            </div>
          </div>
        )}

        <nav className="nav">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`} title={collapsed ? item.label : ''}>
              <span className="nav-icon">{ICONS[item.icon]}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {!collapsed && isActive(item.href) && <span className="nav-dot" />}
            </Link>
          ))}

          {!collapsed && <div className="nav-divider">Moderation</div>}
          {collapsed  && <div className="nav-divider-collapsed" />}

          {moderationItems.map(item => {
            const count = badges[item.badge as keyof BadgeCounts] || 0;
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`} title={collapsed ? item.label : ''}>
                <span className="nav-icon">{ICONS[item.icon]}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
                {count > 0 && !collapsed && <span className="nav-badge">{count}</span>}
                {collapsed && count > 0 && <span className="nav-badge-dot" />}
                {!collapsed && isActive(item.href) && count === 0 && <span className="nav-dot" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <Link href="/dashboard/settings" className={`nav-item ${isActive('/dashboard/settings') ? 'active' : ''}`} title={collapsed ? 'Settings' : ''}>
            <span className="nav-icon">{ICONS.settings}</span>
            {!collapsed && <span className="nav-label">Settings</span>}
            {!collapsed && isActive('/dashboard/settings') && <span className="nav-dot" />}
          </Link>
          <button className="logout-btn" onClick={handleLogout} title={collapsed ? 'Logout' : ''}>
            <span className="nav-icon">{ICONS.logout}</span>
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
                <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                {searchQuery && (
                  <button className="search-clear" onClick={() => { setSearchQuery(''); setShowResults(false); }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
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

            <div className="user-menu-wrap" ref={userMenuRef}>
              <button className="user-chip" onClick={() => setShowUserMenu(v => !v)}>
                <div className="chip-avatar">
                  {profileImage
                    ? <img src={profileImage} alt="profile" className="chip-avatar-img" />
                    : initials
                  }
                </div>
                <span>{user?.username || 'Admin'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2, opacity: 0.5 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <div className="udrop-avatar">
                      {profileImage
                        ? <img src={profileImage} alt="profile" className="chip-avatar-img" />
                        : initials
                      }
                    </div>
                    <div>
                      <div className="udrop-name">{user?.fullName || 'Admin'}</div>
                      <div className="udrop-email">{user?.email || ''}</div>
                    </div>
                  </div>
                  <div className="user-dropdown-divider" />
                  <Link href="/dashboard/settings" className="udrop-item" onClick={() => setShowUserMenu(false)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    Settings
                  </Link>
                  <div className="user-dropdown-divider" />
                  <button className="udrop-item udrop-logout" onClick={() => { setShowUserMenu(false); handleLogout(); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Layout Shell ── */
        .layout { display: flex; min-height: 100vh; font-family: 'Segoe UI', system-ui, sans-serif; background: #F0F4FF; }

        /* ── Sidebar ── */
        .sidebar { width: 240px; flex-shrink: 0; background: #1A1E52; display: flex; flex-direction: column; padding: 24px 0; transition: width 0.25s ease; position: sticky; top: 0; height: 100vh; overflow-y: auto; overflow-x: hidden; }
        .sidebar.collapsed { width: 68px; }
        .sidebar-top { display: flex; align-items: center; justify-content: space-between; padding: 0 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.15); }
        .sidebar-top-collapsed { justify-content: center; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-mark { width: 34px; height: 34px; flex-shrink: 0; background: rgba(255,255,255,0.2); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
        .brand-name { font-size: 17px; font-weight: 700; color: #fff; white-space: nowrap; letter-spacing: -0.3px; }
        .brand-name strong { color: #A8B8FF; }
        .collapse-btn { background: rgba(255,255,255,0.15); border: none; color: rgba(255,255,255,0.7); cursor: pointer; width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: background 0.2s; flex-shrink: 0; }
        .collapse-btn:hover { background: rgba(255,255,255,0.28); color: #fff; }

        /* Admin badge */
        .admin-badge { display: flex; align-items: center; gap: 10px; padding: 14px 16px; margin: 12px 12px 8px; background: rgba(255,255,255,0.15); border-radius: 12px; border: 1px solid rgba(255,255,255,0.22); }
        .admin-avatar { width: 36px; height: 36px; flex-shrink: 0; background: rgba(255,255,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; overflow: hidden; }
        .admin-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block; }
        .chip-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block; }
        .admin-name { font-size: 13px; font-weight: 600; color: #fff; text-transform: capitalize; }
        .admin-role { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 2px; letter-spacing: 0.3px; }

        /* Nav */
        .nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
        .nav-divider { padding: 14px 12px 6px; font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 1px; }
        .nav-divider-collapsed { height: 1px; background: rgba(255,255,255,0.15); margin: 10px 12px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; text-decoration: none; color: rgba(255,255,255,0.65); font-size: 13.5px; font-weight: 500; transition: background 0.15s, color 0.15s; position: relative; border: 1px solid transparent; }
        .sidebar.collapsed .nav-item { justify-content: center; padding: 10px; }
        .nav-item + .nav-item { border-top: 1px solid rgba(255,255,255,0.07); }
        .nav-item:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .nav-item.active { background: rgba(255,255,255,0.22); color: #fff; border-color: rgba(255,255,255,0.3); font-weight: 600; }
        .nav-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 18px; }
        .nav-label { flex: 1; }
        .nav-dot { width: 6px; height: 6px; background: #fff; border-radius: 50%; opacity: 0.8; }
        .nav-badge { min-width: 20px; height: 20px; padding: 0 6px; background: #dc2626; color: #fff; border-radius: 10px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .nav-badge-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background: #dc2626; border-radius: 50%; border: 2px solid #1A1E52; }
        .sidebar-bottom { padding: 16px 10px 0; border-top: 1px solid rgba(255,255,255,0.15); display: flex; flex-direction: column; gap: 2px; }
        .logout-btn { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; border: none; background: none; color: rgba(255,255,255,0.65); font-size: 13.5px; font-weight: 500; cursor: pointer; width: 100%; transition: background 0.15s, color 0.15s; }
        .logout-btn:hover { background: rgba(220,38,38,0.25); color: #fca5a5; }

        /* ── Main area ── */
        .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .topbar { height: 64px; background: #fff; border-bottom: 1px solid #E0E4FF; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 8px rgba(107,127,237,0.06); }
        .page-title { font-size: 18px; font-weight: 700; color: #1A1D2E; letter-spacing: -0.3px; }
        .topbar-right { display: flex; align-items: center; gap: 14px; }

        .user-menu-wrap { position: relative; }
        .user-chip { display: flex; align-items: center; gap: 8px; background: #F0F4FF; border: 1px solid #E0E4FF; border-radius: 10px; padding: 6px 12px; font-size: 13px; font-weight: 500; color: #1A1D2E; cursor: pointer; transition: all 0.15s; text-transform: capitalize; }
        .user-chip:hover { background: #EEF1FF; border-color: #6B7FED; }
        .chip-avatar { width: 28px; height: 28px; background: linear-gradient(135deg, #6B7FED, #7B8CDE); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; overflow: hidden; flex-shrink: 0; }
        .chip-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block; }
        .user-dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 240px; background: #fff; border-radius: 14px; border: 1.5px solid #E0E4FF; box-shadow: 0 16px 48px rgba(107,127,237,0.16); z-index: 500; overflow: hidden; animation: dropDown 0.18s ease; }
        .user-dropdown-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #F8F9FF; }
        .udrop-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #6B7FED, #7B8CDE); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; overflow: hidden; flex-shrink: 0; }
        .udrop-name  { font-size: 13px; font-weight: 700; color: #111; text-transform: capitalize; }
        .udrop-email { font-size: 11px; color: #888; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .user-dropdown-divider { height: 1px; background: #EEF1FF; margin: 4px 0; }
        .udrop-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; font-size: 13px; font-weight: 500; color: #333; text-decoration: none; background: none; border: none; cursor: pointer; width: 100%; transition: background 0.12s, color 0.12s; }
        .udrop-item:hover { background: #F0F4FF; color: #6B7FED; }
        .udrop-logout { color: #dc2626; }
        .udrop-logout:hover { background: #fff5f5; color: #dc2626; }
        .content { flex: 1; padding: 28px; }

        /* ── Search ── */
        .search-container { position: relative; }
        .search-box { display: flex; align-items: center; gap: 10px; background: #F5F7FF; border: 1.5px solid #E0E4FF; border-radius: 12px; padding: 9px 14px; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s; min-width: 280px; }
        .search-box:focus-within { border-color: #6B7FED; background: #fff; box-shadow: 0 0 0 3px rgba(107,127,237,0.12); }
        .search-icon { color: #aaa; flex-shrink: 0; transition: color 0.2s; }
        .search-box:focus-within .search-icon { color: #6B7FED; }
        .search-box input { border: none; background: none; outline: none; font-size: 13.5px; color: #1A1D2E; flex: 1; min-width: 0; }
        .search-box input::placeholder { color: #BBC; }
        .search-spinner { width: 14px; height: 14px; border: 2px solid #E0E4FF; border-top-color: #6B7FED; border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .search-clear { background: #eee; border: none; cursor: pointer; color: #888; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s, color 0.15s; padding: 0; }
        .search-clear:hover { background: #6B7FED; color: #fff; }
        .search-dropdown { position: absolute; top: calc(100% + 8px); left: 0; width: 340px; background: #fff; border-radius: 14px; border: 1.5px solid #E0E4FF; box-shadow: 0 16px 40px rgba(107,127,237,0.14); overflow: hidden; z-index: 100; animation: dropIn 0.15s ease; }
        @keyframes dropIn { from { transform: translateY(-6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .search-count { font-size: 11px; color: #aaa; padding: 10px 16px 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .search-empty { font-size: 13px; color: #aaa; padding: 20px 16px; text-align: center; }
        .search-result-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; text-decoration: none; transition: background 0.12s; border-bottom: 1px solid #f0f4ff; }
        .search-result-item:last-child { border-bottom: none; }
        .search-result-item:hover { background: #F0F4FF; }
        .search-result-icon { font-size: 18px; flex-shrink: 0; }
        .search-result-info { flex: 1; min-width: 0; }
        .search-result-label { font-size: 13px; font-weight: 600; color: #1A1D2E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .search-result-sub { font-size: 11px; color: #888; margin-top: 1px; }
        .search-result-type { font-size: 10px; font-weight: 700; color: #6B7FED; background: #EEF1FF; padding: 2px 8px; border-radius: 20px; flex-shrink: 0; text-transform: capitalize; }

        /* ── Notifications ── */
        .notif-wrap { position: relative; }
        .notif-bell { position: relative; background: #F0F4FF; border: 1.5px solid #E0E4FF; border-radius: 10px; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all 0.15s; }
        .notif-bell:hover { background: #EEF1FF; border-color: #6B7FED; }
        .notif-count { position: absolute; top: -5px; right: -5px; background: #dc2626; color: #fff; border-radius: 50%; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; padding: 0 4px; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; animation: popIn 0.3s ease; }
        @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
        .notif-panel { position: absolute; top: calc(100% + 10px); right: 0; width: 380px; background: #fff; border-radius: 16px; border: 1.5px solid #E0E4FF; box-shadow: 0 20px 60px rgba(107,127,237,0.18); z-index: 500; overflow: hidden; animation: dropDown 0.2s ease; }
        @keyframes dropDown { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .notif-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #EEF1FF; background: #F8F9FF; }
        .notif-panel-header h3 { font-size: 15px; font-weight: 700; color: #1A1D2E; }
        .notif-header-actions { display: flex; gap: 6px; }
        .notif-action-btn { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 8px; border: none; cursor: pointer; background: #EEF1FF; color: #6B7FED; transition: all 0.15s; }
        .notif-action-btn:hover { background: #6B7FED; color: #fff; }
        .notif-action-btn.red { background: #fee2e2; color: #dc2626; }
        .notif-action-btn.red:hover { background: #dc2626; color: #fff; }
        .notif-list { max-height: 380px; overflow-y: auto; }
        .notif-list::-webkit-scrollbar { width: 4px; }
        .notif-list::-webkit-scrollbar-track { background: transparent; }
        .notif-list::-webkit-scrollbar-thumb { background: #E0E4FF; border-radius: 2px; }
        .notif-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 20px; color: #aaa; }
        .notif-empty span { font-size: 32px; }
        .notif-empty p { font-size: 14px; font-weight: 600; color: #555; }
        .notif-empty-sub { font-size: 12px !important; color: #aaa !important; }
        .notif-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #F0F4FF; text-decoration: none; transition: background 0.12s; cursor: pointer; }
        .notif-item:last-child { border-bottom: none; }
        .notif-item:hover { background: #F8F9FF; }
        .notif-item.unread { background: #F5F7FF; }
        .notif-dot-wrap { position: relative; padding-top: 3px; flex-shrink: 0; }
        .notif-type-dot { width: 9px; height: 9px; border-radius: 50%; }
        .notif-unread-ring { position: absolute; top: -2px; left: -2px; width: 13px; height: 13px; border-radius: 50%; border: 2px solid #6B7FED; opacity: 0.4; animation: ringPulse 2s ease-in-out infinite; }
        @keyframes ringPulse { 0%,100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.4); opacity: 0; } }
        .notif-item-content { flex: 1; min-width: 0; }
        .notif-item-title { font-size: 13px; font-weight: 700; color: #1A1D2E; margin-bottom: 2px; }
        .notif-item-msg { font-size: 12px; color: #555; line-height: 1.4; }
        .notif-item-time { font-size: 11px; color: #aaa; margin-top: 4px; }
        .notif-type-chip { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; text-transform: capitalize; flex-shrink: 0; align-self: flex-start; margin-top: 2px; }
        .notif-panel-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-top: 1px solid #EEF1FF; font-size: 11px; color: #aaa; background: #F8F9FF; }
        .notif-refresh { font-size: 10px; color: #ccc; }
      `}</style>
    </div>
  );
}