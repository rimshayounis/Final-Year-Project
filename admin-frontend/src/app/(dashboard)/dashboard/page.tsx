'use client';

import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000/api';

// ── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
  Users: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Clock: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  Wallet: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3"/>
      <path d="M2 10h20"/>
      <circle cx="17" cy="15" r="1" fill="currentColor"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  TrendingUp: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Flag: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  ),
  Star: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  MessageCircle: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  FilePlus: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Stethoscope: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
      <circle cx="20" cy="10" r="2"/>
    </svg>
  ),
};

interface HeldAppointment {
  _id: string;
  date: string;
  time: string;
  heldAmount: number;
  paymentStatus: string;
  doctorId?: { fullName?: string };
  userId?: { fullName?: string; email?: string };
}

interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  pendingVerifications: number;
  verifiedDoctors: number;
  pendingPosts: number;
  totalAppointments: number;
  completedAppointments: number;
  totalCommission: number;
  totalEarned: number;
  heldBalance: number;
  heldCount: number;
  pendingReports: number;
  reviewedReports: number;
  totalFeedbacks: number;
  avgDoctorRating: number;
  lowRatedDoctors: number;
  openSupportTickets: number;
}

export default function DashboardPage() {
  const [stats, setStats]         = useState<DashboardStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [heldAppts, setHeldAppts] = useState<HeldAppointment[]>([]);
  const [showHeld, setShowHeld]   = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, doctorsRes, pendingPostsRes, walletRes, reportsRes, feedbackRes, heldRes] = await Promise.allSettled([
          fetch(`${BASE_URL}/users`).then(r => r.json()),
          fetch(`${BASE_URL}/doctors`).then(r => r.json()),
          fetch(`${BASE_URL}/posts/pending?limit=100`).then(r => r.json()),
          fetch(`${BASE_URL}/payment/admin/wallet`).then(r => r.json()),
          fetch(`${BASE_URL}/reports`).then(r => r.json()),
          fetch(`${BASE_URL}/feedback`).then(r => r.json()),
          fetch(`${BASE_URL}/payment/admin/held`).then(r => r.json()),
        ]);

        const usersRaw     = usersRes.status        === 'fulfilled' ? usersRes.value        : [];
        const doctorsRaw   = doctorsRes.status      === 'fulfilled' ? doctorsRes.value      : [];
        const pendingPosts = pendingPostsRes.status === 'fulfilled' ? pendingPostsRes.value : {};
        const wallet       = walletRes.status       === 'fulfilled' ? walletRes.value       : {};
        const reportsRaw   = reportsRes.status      === 'fulfilled' ? reportsRes.value      : [];
        const feedbacksRaw = feedbackRes.status     === 'fulfilled' ? feedbackRes.value     : [];
        const heldRaw      = heldRes.status         === 'fulfilled' ? heldRes.value         : {};

        const heldData       = heldRaw.data ?? heldRaw;
        const heldApptList: HeldAppointment[] = heldData.appointments ?? [];
        setHeldAppts(heldApptList);

        const allUsers: any[]   = Array.isArray(usersRaw)     ? usersRaw     : (usersRaw.users     || usersRaw.data   || []);
        const allDoctors: any[] = Array.isArray(doctorsRaw)   ? doctorsRaw   : (doctorsRaw.doctors  || doctorsRaw.data || []);
        const reports: any[]    = Array.isArray(reportsRaw)   ? reportsRaw   : (reportsRaw.data     || []);
        const feedbacks: any[]  = Array.isArray(feedbacksRaw) ? feedbacksRaw : (feedbacksRaw.data   || []);

        const pendingVerif      = allDoctors.filter(d => !d.doctorProfile?.isVerified).length;
        const verifiedDocs      = allDoctors.filter(d =>  d.doctorProfile?.isVerified).length;
        const pendingPostsCount = pendingPosts.pagination?.total || pendingPosts.data?.length || 0;

        const pendingReports  = reports.filter((r: any) => r.status === 'pending').length;
        const reviewedReports = reports.filter((r: any) => r.status === 'reviewed').length;

        const totalFeedbacks  = feedbacks.length;
        const avgDoctorRating = totalFeedbacks
          ? Math.round((feedbacks.reduce((s: number, f: any) => s + (f.rating || 0), 0) / totalFeedbacks) * 10) / 10
          : 0;
        const ratingMap: Record<string, number[]> = {};
        feedbacks.forEach((f: any) => {
          const id = f.doctorId?.toString();
          if (id) { ratingMap[id] = ratingMap[id] || []; ratingMap[id].push(f.rating); }
        });
        const lowRatedDoctors = Object.values(ratingMap).filter(
          ratings => ratings.reduce((a, b) => a + b, 0) / ratings.length < 3
        ).length;

        let totalApts = 0, completedApts = 0;
        if (allDoctors.length > 0) {
          const aptResults = await Promise.allSettled(
            allDoctors.map(d =>
              fetch(`${BASE_URL}/booked-appointments/doctor/${d._id}`)
                .then(r => r.json())
                .then(r => r.data || r.appointments || [])
                .catch(() => [])
            )
          );
          aptResults.forEach(r => {
            if (r.status === 'fulfilled') {
              totalApts     += r.value.length;
              completedApts += r.value.filter((a: any) => a.status === 'completed').length;
            }
          });
        }

        const walletData = wallet.data || wallet;
        setStats({
          totalPatients:         allUsers.length,
          totalDoctors:          allDoctors.length,
          pendingVerifications:  pendingVerif,
          verifiedDoctors:       verifiedDocs,
          pendingPosts:          pendingPostsCount,
          totalAppointments:     totalApts,
          completedAppointments: completedApts,
          totalCommission:       walletData.totalCommission || 0,
          totalEarned:           walletData.totalEarned     || 0,
          heldBalance:           walletData.heldBalance     || heldData.totalHeld || 0,
          heldCount:             heldData.count             || heldApptList.length,
          pendingReports,
          reviewedReports,
          totalFeedbacks,
          avgDoctorRating,
          lowRatedDoctors,
          openSupportTickets: 0,
        });
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = stats ? [
    {
      label: 'Total Patients',
      value: stats.totalPatients,
      Icon: Icons.Users,
      color: '#6B7FED',
      bg: '#EEF1FF',
      href: '/dashboard/users',
      status: 'active',
      statusLabel: 'Registered',
      sub: 'Active on platform',
    },
    {
      label: 'Pending Verifications',
      value: stats.pendingVerifications,
      Icon: Icons.Clock,
      color: '#d97706',
      bg: '#fef3c7',
      href: '/dashboard/users/doctors',
      status: stats.pendingVerifications > 0 ? 'action' : 'ok',
      statusLabel: stats.pendingVerifications > 0 ? 'Action needed' : 'All verified',
      sub: `${stats.totalDoctors} total doctors`,
    },
    {
      label: 'Verified Doctors',
      value: stats.verifiedDoctors,
      Icon: Icons.ShieldCheck,
      color: '#059669',
      bg: '#d1fae5',
      href: '/dashboard/users/doctors',
      status: 'ok',
      statusLabel: 'Verified',
      sub: `${stats.totalDoctors} total registered`,
    },
    {
      label: 'Commission Earned',
      value: `PKR ${stats.totalCommission.toLocaleString()}`,
      Icon: Icons.Wallet,
      color: '#7B8CDE',
      bg: '#F0F4FF',
      href: '/dashboard/subscriptions',
      status: 'active',
      statusLabel: 'From appointments',
      sub: `PKR ${stats.totalEarned.toLocaleString()} total earned`,
    },
  ] : [];

  const extraStats = stats ? [
    { label: 'Total Appointments', value: stats.totalAppointments,     Icon: Icons.Calendar,    color: '#6B7FED', bg: '#EEF1FF',   href: null },
    { label: 'Completed Sessions', value: stats.completedAppointments, Icon: Icons.CheckCircle, color: '#059669', bg: '#d1fae5',   href: null },
    { label: 'Posts Pending',      value: stats.pendingPosts,          Icon: Icons.FileText,    color: '#d97706', bg: '#fef3c7',   href: '/dashboard/posts' },
    { label: 'Total Earned',       value: `PKR ${stats.totalEarned.toLocaleString()}`, Icon: Icons.TrendingUp, color: '#059669', bg: '#d1fae5', href: null },
  ] : [];

  const moderationCards = stats ? [
    {
      label: 'Post Reports',
      value: stats.pendingReports,
      sub: `${stats.reviewedReports} reviewed`,
      Icon: Icons.Flag,
      color: '#dc2626',
      bg: '#fee2e2',
      href: '/dashboard/reports',
      urgent: stats.pendingReports > 0,
      urgentLabel: stats.pendingReports > 0 ? `${stats.pendingReports} need action` : 'All clear',
    },
    {
      label: 'Doctor Ratings',
      value: stats.avgDoctorRating > 0 ? `${stats.avgDoctorRating}/5` : '—',
      sub: `${stats.totalFeedbacks} reviews · ${stats.lowRatedDoctors} low-rated`,
      Icon: Icons.Star,
      color: '#d97706',
      bg: '#fef3c7',
      href: '/dashboard/feedback',
      urgent: stats.lowRatedDoctors > 0,
      urgentLabel: stats.lowRatedDoctors > 0 ? `${stats.lowRatedDoctors} low-rated doctors` : 'Ratings healthy',
    },
    {
      label: 'Support Queries',
      value: stats.openSupportTickets,
      sub: 'Open tickets',
      Icon: Icons.MessageCircle,
      color: '#0284c7',
      bg: '#e0f2fe',
      href: '/dashboard/support',
      urgent: stats.openSupportTickets > 0,
      urgentLabel: stats.openSupportTickets > 0 ? `${stats.openSupportTickets} awaiting reply` : 'No open tickets',
    },
    {
      label: 'Post Moderation',
      value: stats.pendingPosts,
      sub: 'Pending approval',
      Icon: Icons.FilePlus,
      color: '#7c3aed',
      bg: '#ede9fe',
      href: '/dashboard/posts',
      urgent: stats.pendingPosts > 0,
      urgentLabel: stats.pendingPosts > 0 ? `${stats.pendingPosts} posts queued` : 'Queue empty',
    },
  ] : [];

  return (
    <div className="page">
      <div className="bottom-grid">
        {/* ── Left column ── */}
        <div className="stats-section">
          <div className="section-header">
            <h2>Overview</h2>
            <span className="live-badge">
              <span className="live-dot" />
              Live
            </span>
          </div>

          {loading ? (
            <div className="stats-loading">
              {[1,2,3,4].map(i => <div key={i} className="stat-skeleton" />)}
            </div>
          ) : (
            <div className="stats-grid">
              {statCards.map((s, i) => (
                <a href={s.href} key={i} className="stat-card" style={{ textDecoration: 'none' }}>
                  {/* Icon + Label row */}
                  <div className="stat-header-row">
                    <div className="stat-icon-wrap" style={{ background: s.bg, color: s.color }}>
                      <s.Icon />
                    </div>
                    <span className="stat-label">{s.label}</span>
                  </div>
                  {/* Big number */}
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  {/* Sub-label */}
                  <div className="stat-sub">{s.sub}</div>
                  {/* Status chip */}
                  <div className="stat-footer">
                    <span className={`stat-chip ${s.status}`}>
                      {s.status === 'action' ? '⚠' : s.status === 'ok' ? '✓' : '↑'} {s.statusLabel}
                    </span>
                    <span className="stat-link-arrow" style={{ color: s.color }}>→</span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {stats && !loading && (
            <>
              {/* Extra stats row */}
              <div className="extra-stats">
                {extraStats.map((e, i) => (
                  e.href
                    ? <a key={i} href={e.href} className="extra-stat" style={{ textDecoration: 'none' }}>
                        <div className="extra-icon-wrap" style={{ background: e.bg, color: e.color }}><e.Icon /></div>
                        <div>
                          <div className="extra-val" style={{ color: e.color }}>{e.value}</div>
                          <div className="extra-label">{e.label}</div>
                        </div>
                      </a>
                    : <div key={i} className="extra-stat">
                        <div className="extra-icon-wrap" style={{ background: e.bg, color: e.color }}><e.Icon /></div>
                        <div>
                          <div className="extra-val" style={{ color: e.color }}>{e.value}</div>
                          <div className="extra-label">{e.label}</div>
                        </div>
                      </div>
                ))}
              </div>

              {/* Held Payments Panel — only shown when there are held payments */}
              {stats.heldCount > 0 && <div className="held-panel">
                <div className="held-panel-header" onClick={() => setShowHeld(v => !v)}>
                  <div className="held-panel-left">
                    <div className="held-icon-wrap">
                      <Icons.Lock />
                    </div>
                    <div>
                      <div className="held-panel-title">Held Appointment Payments</div>
                      <div className="held-panel-sub">{stats.heldCount} appointment{stats.heldCount !== 1 ? 's' : ''} awaiting release</div>
                    </div>
                  </div>
                  <div className="held-panel-right">
                    <div className="held-amount">PKR {stats.heldBalance.toLocaleString()}</div>
                    <svg className={`held-chevron ${showHeld ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {showHeld && (
                  <div className="held-list">
                    {heldAppts.length === 0 ? (
                      <div className="held-empty">No held payments at this time</div>
                    ) : (
                      <>
                        <div className="held-table-head">
                          <span>Patient</span>
                          <span>Doctor</span>
                          <span>Date & Time</span>
                          <span>Amount</span>
                          <span>Status</span>
                        </div>
                        {heldAppts.map(a => (
                          <div key={a._id} className="held-row">
                            <span className="held-cell">{(a.userId as any)?.fullName || '—'}</span>
                            <span className="held-cell">Dr. {(a.doctorId as any)?.fullName || '—'}</span>
                            <span className="held-cell">{a.date} · {a.time}</span>
                            <span className="held-cell held-amt">PKR {(a.heldAmount || 0).toLocaleString()}</span>
                            <span className="held-chip">Held</span>
                          </div>
                        ))}
                        <div className="held-total-row">
                          <span>Total held</span>
                          <span className="held-total-amt">PKR {stats.heldBalance.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>}
            </>
          )}
        </div>

        {/* ── Right column: Platform Summary feed ── */}
        <div className="feed-section">
          <div className="section-header">
            <h2>Platform Summary</h2>
            <span className="live-badge"><span className="live-dot" />Live</span>
          </div>
          <div className="feed-list">
            {loading ? (
              [1,2,3,4].map(i => <div key={i} className="feed-skeleton" />)
            ) : !stats ? null : (
              <>
                <div className="feed-item">
                  <div className="feed-icon-wrap" style={{ background: '#EEF1FF', color: '#6B7FED' }}><Icons.Users /></div>
                  <div className="feed-content">
                    <div className="feed-msg">{stats.totalPatients} patients registered</div>
                    <div className="feed-time">Total on platform</div>
                  </div>
                  <div className="feed-tag" style={{ background: '#EEF1FF', color: '#6B7FED' }}>patients</div>
                </div>

                <div className="feed-item">
                  <div className="feed-icon-wrap" style={{ background: stats.pendingVerifications > 0 ? '#fef3c7' : '#d1fae5', color: stats.pendingVerifications > 0 ? '#d97706' : '#059669' }}>
                    <Icons.Stethoscope />
                  </div>
                  <div className="feed-content">
                    <div className="feed-msg">{stats.pendingVerifications > 0 ? `${stats.pendingVerifications} doctors pending approval` : 'All doctors verified'}</div>
                    <div className="feed-time">{stats.verifiedDoctors} verified doctors</div>
                  </div>
                  <div className="feed-tag" style={{ background: stats.pendingVerifications > 0 ? '#fef3c7' : '#d1fae5', color: stats.pendingVerifications > 0 ? '#d97706' : '#059669' }}>
                    {stats.pendingVerifications > 0 ? 'action' : 'verified'}
                  </div>
                </div>

                <div className="feed-item">
                  <div className="feed-icon-wrap" style={{ background: '#dbeafe', color: '#1d4ed8' }}><Icons.Calendar /></div>
                  <div className="feed-content">
                    <div className="feed-msg">{stats.totalAppointments} total appointments</div>
                    <div className="feed-time">{stats.completedAppointments} completed</div>
                  </div>
                  <div className="feed-tag" style={{ background: '#dbeafe', color: '#1d4ed8' }}>appointments</div>
                </div>

                {stats.pendingPosts > 0 && (
                  <div className="feed-item">
                    <div className="feed-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}><Icons.FilePlus /></div>
                    <div className="feed-content">
                      <div className="feed-msg">{stats.pendingPosts} posts pending review</div>
                      <div className="feed-time">Needs moderation</div>
                    </div>
                    <div className="feed-tag" style={{ background: '#fef3c7', color: '#d97706' }}>posts</div>
                  </div>
                )}

                <div className="feed-item">
                  <div className="feed-icon-wrap" style={{ background: stats.pendingReports > 0 ? '#fee2e2' : '#d1fae5', color: stats.pendingReports > 0 ? '#dc2626' : '#059669' }}>
                    <Icons.Flag />
                  </div>
                  <div className="feed-content">
                    <div className="feed-msg">{stats.pendingReports > 0 ? `${stats.pendingReports} post reports pending` : 'No pending reports'}</div>
                    <div className="feed-time">{stats.reviewedReports} already reviewed</div>
                  </div>
                  <div className="feed-tag" style={{ background: stats.pendingReports > 0 ? '#fee2e2' : '#d1fae5', color: stats.pendingReports > 0 ? '#dc2626' : '#059669' }}>reports</div>
                </div>

                {stats.totalFeedbacks > 0 && (
                  <div className="feed-item">
                    <div className="feed-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}><Icons.Star /></div>
                    <div className="feed-content">
                      <div className="feed-msg">Avg doctor rating: {stats.avgDoctorRating} / 5</div>
                      <div className="feed-time">{stats.totalFeedbacks} reviews · {stats.lowRatedDoctors} low-rated</div>
                    </div>
                    <div className="feed-tag" style={{ background: '#fef3c7', color: '#d97706' }}>feedback</div>
                  </div>
                )}

                <div className="feed-item">
                  <div className="feed-icon-wrap" style={{ background: '#d1fae5', color: '#059669' }}><Icons.TrendingUp /></div>
                  <div className="feed-content">
                    <div className="feed-msg">PKR {stats.totalEarned.toLocaleString()} total earned</div>
                    <div className="feed-time">PKR {stats.totalCommission.toLocaleString()} from commissions</div>
                  </div>
                  <div className="feed-tag" style={{ background: '#d1fae5', color: '#059669' }}>earned</div>
                </div>

                {stats.heldBalance > 0 && (
                  <div className="feed-item">
                    <div className="feed-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}><Icons.Lock /></div>
                    <div className="feed-content">
                      <div className="feed-msg">PKR {stats.heldBalance.toLocaleString()} held for appointments</div>
                      <div className="feed-time">{stats.heldCount} payment{stats.heldCount !== 1 ? 's' : ''} awaiting release to doctors</div>
                    </div>
                    <div className="feed-tag" style={{ background: '#fef3c7', color: '#b45309' }}>held</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Moderation & Insights ── */}
      {stats && !loading && (
        <div className="mod-section">
          <div className="section-header">
            <h2>Moderation &amp; Insights</h2>
            {(stats.pendingReports + stats.openSupportTickets + stats.pendingPosts) > 0
              ? <span className="alert-badge">⚠ Needs Attention</span>
              : <span className="live-badge"><span className="live-dot" />All Clear</span>
            }
          </div>
          <div className="mod-grid">
            {moderationCards.map((c, i) => (
              <a href={c.href} key={i} className="mod-card" style={{ textDecoration: 'none' }}>
                <div className="mod-top-row">
                  <div className="mod-icon-wrap" style={{ background: c.bg, color: c.color }}>
                    <c.Icon />
                  </div>
                  <span className={`mod-status-chip ${c.urgent ? 'urgent' : 'ok'}`}>
                    {c.urgent ? '⚠' : '✓'} {c.urgentLabel}
                  </span>
                </div>
                <div className="mod-value" style={{ color: c.color }}>{c.value}</div>
                <div className="mod-label">{c.label}</div>
                <div className="mod-sub">{c.sub}</div>
                <div className="mod-footer">
                  <span className="mod-link" style={{ color: c.color }}>View all</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <style>{`
        /* ── Layout ── */
        .page { display: flex; flex-direction: column; gap: 24px; }
        .bottom-grid { display: grid; grid-template-columns: 1fr 360px; gap: 24px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .section-header h2 { font-size: 16px; font-weight: 700; color: #1A1D2E; margin: 0; }

        /* Badges */
        .live-badge  { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #059669; background: #d1fae5; padding: 4px 12px; border-radius: 20px; }
        .live-dot    { width: 6px; height: 6px; border-radius: 50%; background: #059669; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .alert-badge { font-size: 12px; font-weight: 600; color: #d97706; background: #fef3c7; padding: 4px 12px; border-radius: 20px; }

        /* ── Stat Cards ── */
        .stats-loading { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .stat-skeleton { height: 148px; background: linear-gradient(90deg, #EEF1FF 25%, #E0E4FF 50%, #EEF1FF 75%); background-size: 200% 100%; border-radius: 16px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

        .stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #E0E4FF;
          display: flex;
          flex-direction: column;
          gap: 0;
          cursor: pointer;
          transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: currentColor;
          opacity: 0;
          transition: opacity 0.18s;
        }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(107,127,237,0.12); border-color: #C8D0FF; }
        .stat-card:hover::before { opacity: 1; }

        /* Icon + label in one row */
        .stat-header-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .stat-icon-wrap {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .stat-label {
          font-size: 12px;
          font-weight: 700;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          line-height: 1.3;
        }

        /* Big focal number */
        .stat-value { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; line-height: 1; }

        .stat-sub { font-size: 11px; color: #aaa; margin-bottom: 14px; }

        .stat-footer { display: flex; align-items: center; justify-content: space-between; }
        .stat-chip { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
        .stat-chip.active  { background: #EEF1FF; color: #6B7FED; }
        .stat-chip.ok      { background: #d1fae5; color: #059669; }
        .stat-chip.action  { background: #fee2e2; color: #dc2626; }
        .stat-link-arrow { font-size: 14px; font-weight: 600; opacity: 0; transition: opacity 0.18s; }
        .stat-card:hover .stat-link-arrow { opacity: 1; }

        /* ── Extra Stats ── */
        .extra-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .extra-stat {
          background: #fff;
          border-radius: 12px;
          padding: 14px 12px;
          border: 1px solid #E0E4FF;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: transform 0.15s, box-shadow 0.15s;
          cursor: default;
        }
        a.extra-stat { cursor: pointer; }
        a.extra-stat:hover, .extra-stat:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(107,127,237,0.10); }
        .extra-icon-wrap { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .extra-val   { font-size: 14px; font-weight: 800; }
        .extra-label { font-size: 10px; color: #888; margin-top: 2px; font-weight: 600; }

        /* ── Feed / Platform Summary ── */
        .feed-section { background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #E0E4FF; display: flex; flex-direction: column; }
        .feed-list    { display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .feed-skeleton { height: 52px; background: linear-gradient(90deg, #EEF1FF 25%, #E0E4FF 50%, #EEF1FF 75%); background-size: 200% 100%; border-radius: 10px; animation: shimmer 1.5s infinite; margin-bottom: 4px; }
        .feed-item    { display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 10px; transition: background 0.15s; }
        .feed-item:hover { background: #F5F7FF; }
        .feed-icon-wrap { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .feed-content { flex: 1; min-width: 0; }
        .feed-msg     { font-size: 13px; color: #1A1D2E; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .feed-time    { font-size: 11px; color: #aaa; margin-top: 2px; }
        .feed-tag     { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; text-transform: uppercase; flex-shrink: 0; }

        /* ── Moderation Cards ── */
        .mod-section { display: flex; flex-direction: column; }
        .mod-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .mod-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #E0E4FF;
          display: flex;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
          position: relative;
          overflow: hidden;
        }
        .mod-card::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          background: currentColor;
          opacity: 0;
          transition: opacity 0.18s;
        }
        .mod-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(107,127,237,0.12); border-color: #C8D0FF; }
        .mod-card:hover::after { opacity: 1; }

        .mod-top-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
        .mod-icon-wrap { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mod-status-chip { font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 20px; }
        .mod-status-chip.urgent { background: #fee2e2; color: #dc2626; }
        .mod-status-chip.ok     { background: #d1fae5; color: #059669; }

        .mod-value { font-size: 30px; font-weight: 800; letter-spacing: -0.5px; }
        .mod-label { font-size: 13px; font-weight: 700; color: #1A1D2E; }
        .mod-sub   { font-size: 11px; color: #aaa; }
        .mod-footer { display: flex; align-items: center; gap: 4px; margin-top: 8px; }
        .mod-link { font-size: 11px; font-weight: 700; }

        /* ── Held Payments Panel ── */
        .held-panel { background: #fff; border: 1.5px solid #fde68a; border-radius: 14px; overflow: hidden; margin-top: 12px; }
        .held-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; cursor: pointer; transition: background 0.15s; gap: 12px; }
        .held-panel-header:hover { background: #fffbeb; }
        .held-panel-left { display: flex; align-items: center; gap: 12px; }
        .held-icon-wrap { width: 38px; height: 38px; background: #fef3c7; color: #b45309; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .held-panel-title { font-size: 13px; font-weight: 700; color: #111; }
        .held-panel-sub   { font-size: 11px; color: #888; margin-top: 2px; }
        .held-panel-right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
        .held-amount { font-size: 16px; font-weight: 800; color: #b45309; }
        .held-chevron { color: #aaa; transition: transform 0.2s; }
        .held-chevron.open { transform: rotate(180deg); }
        .held-list { border-top: 1px solid #fde68a; padding: 0 20px 16px; }
        .held-empty { font-size: 13px; color: #aaa; text-align: center; padding: 20px 0; }
        .held-table-head { display: grid; grid-template-columns: 1.5fr 1.5fr 1.5fr 1fr 0.7fr; gap: 8px; padding: 10px 0 6px; font-size: 10px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1px solid #f5f5f5; }
        .held-row { display: grid; grid-template-columns: 1.5fr 1.5fr 1.5fr 1fr 0.7fr; gap: 8px; align-items: center; padding: 10px 0; border-bottom: 1px solid #fafafa; }
        .held-row:last-of-type { border-bottom: none; }
        .held-cell { font-size: 12px; color: #444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .held-amt  { font-weight: 700; color: #b45309; }
        .held-chip { display: inline-block; font-size: 10px; font-weight: 700; background: #fef3c7; color: #b45309; border-radius: 6px; padding: 3px 8px; white-space: nowrap; }
        .held-total-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0 0; border-top: 1.5px solid #fde68a; margin-top: 4px; font-size: 13px; font-weight: 700; color: #111; }
        .held-total-amt { font-size: 15px; font-weight: 800; color: #b45309; }

        @media (max-width: 1200px) {
          .bottom-grid { grid-template-columns: 1fr; }
          .mod-grid { grid-template-columns: repeat(2, 1fr); }
          .extra-stats { grid-template-columns: repeat(2, 1fr); }
          .held-table-head, .held-row { grid-template-columns: 1fr 1fr 1fr; }
          .held-table-head span:nth-child(4), .held-table-head span:nth-child(5),
          .held-row span:nth-child(4), .held-row span:nth-child(5) { display: none; }
        }
      `}</style>
    </div>
  );
}
