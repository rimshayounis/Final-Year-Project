'use client';

import { useEffect, useRef, useState } from 'react';

const BASE_URL       = 'http://localhost:3000/api';
const ADMIN_BASE_URL = 'http://localhost:3001';

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
  subscriptionRevenue: number;
  pointsPayoutTotal: number;
  pointsPayoutPoints: number;
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
  const [stats, setStats]             = useState<DashboardStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [heldAppts, setHeldAppts]     = useState<HeldAppointment[]>([]);
  const [showHeld, setShowHeld]       = useState(false);
  const [filterOpen, setFilterOpen]   = useState(false);
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo]     = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  const fetchStats = async (from = '', to = '') => {
    setLoading(true);
    // Date range helpers
    const fromTs = from ? new Date(from).getTime()                  : 0;
    const toTs   = to   ? new Date(to + 'T23:59:59').getTime()      : Infinity;
    const inTs   = (v: any) => { const t = new Date(v).getTime(); return !isNaN(t) && t >= fromTs && t <= toTs; };
    // appointment.date is a YYYY-MM-DD string — compare directly
    const inDateStr = (s: string) => !!s && s >= from && s <= to;
    const filterItems = (arr: any[], ...fields: string[]) => {
      if (!from || !to) return arr;
      return arr.filter(item => fields.some(f => item[f] && (typeof item[f] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item[f]) ? inDateStr(item[f]) : inTs(item[f]))));
    };

    try {
      const [usersRes, doctorsRes, pendingPostsRes, walletRes, reportsRes, feedbackRes, heldRes, txRes, withdrawalsRes, pointsPayoutRes] = await Promise.allSettled([
        fetch(`${BASE_URL}/users`).then(r => r.json()),
        fetch(`${BASE_URL}/doctors`).then(r => r.json()),
        fetch(`${BASE_URL}/posts/pending?limit=100`).then(r => r.json()),
        fetch(`${BASE_URL}/payment/admin/wallet`).then(r => r.json()),
        fetch(`${BASE_URL}/reports`).then(r => r.json()),
        fetch(`${BASE_URL}/feedback`).then(r => r.json()),
        fetch(`${BASE_URL}/payment/admin/held`).then(r => r.json()),
        fetch(`${BASE_URL}/payment/admin/transactions`).then(r => r.json()),
        fetch(`${ADMIN_BASE_URL}/wallet/admin/withdrawals`).then(r => r.json()),
        fetch(`${ADMIN_BASE_URL}/transactions/admin/points-payout`).then(r => r.json()),
      ]);

      const usersRaw     = usersRes.status        === 'fulfilled' ? usersRes.value        : [];
      const doctorsRaw   = doctorsRes.status      === 'fulfilled' ? doctorsRes.value      : [];
      const pendingPosts = pendingPostsRes.status === 'fulfilled' ? pendingPostsRes.value : {};
      const wallet       = walletRes.status       === 'fulfilled' ? walletRes.value       : {};
      const reportsRaw   = reportsRes.status      === 'fulfilled' ? reportsRes.value      : [];
      const feedbacksRaw = feedbackRes.status     === 'fulfilled' ? feedbackRes.value     : [];
      const heldRaw      = heldRes.status         === 'fulfilled' ? heldRes.value         : {};
      const txRaw           = txRes.status            === 'fulfilled' ? txRes.value            : [];
      const withdrawalsRaw  = withdrawalsRes.status  === 'fulfilled' ? withdrawalsRes.value  : {};
      const pointsPayoutRaw = pointsPayoutRes.status === 'fulfilled' ? pointsPayoutRes.value : {};

      const heldData        = heldRaw.data ?? heldRaw;
      const allHeldAppts: HeldAppointment[] = heldData.appointments ?? [];
      const heldApptList    = filterItems(allHeldAppts, 'date', 'createdAt') as HeldAppointment[];
      setHeldAppts(heldApptList);

      const rawUsers:    any[] = Array.isArray(usersRaw)     ? usersRaw     : (usersRaw.users     || usersRaw.data   || []);
      const rawDoctors:  any[] = Array.isArray(doctorsRaw)   ? doctorsRaw   : (doctorsRaw.doctors  || doctorsRaw.data || []);
      const rawReports:  any[] = Array.isArray(reportsRaw)   ? reportsRaw   : (reportsRaw.data     || []);
      const rawFeedbacks:any[] = Array.isArray(feedbacksRaw) ? feedbacksRaw : (feedbacksRaw.data   || []);
      const allTx:       any[] = Array.isArray(txRaw)        ? txRaw        : (txRaw.data || txRaw.transactions || []);

      const allUsers   = filterItems(rawUsers,    'createdAt');
      const allDoctors = filterItems(rawDoctors,  'createdAt');
      const reports    = filterItems(rawReports,  'createdAt');
      const feedbacks  = filterItems(rawFeedbacks,'createdAt');
      const filteredTx = filterItems(allTx,       'createdAt');

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

      // Financials — only count types that represent actual platform income
      const txSource = from ? filteredTx : allTx;
      let totalEarned = 0, totalCommission = 0, subscriptionRevenue = 0;
      txSource.filter((t: any) => t.status === 'succeeded').forEach((t: any) => {
        if (t.type === 'subscription_payment') {
          totalEarned += t.amount || 0;
          subscriptionRevenue += t.amount || 0;
        } else if (t.type === 'appointment_commission') {
          totalEarned     += t.amount           || 0;
          totalCommission += t.commissionAmount || 0;
        }
      });

      // Add 2% withdrawal fees from all succeeded withdrawals
      const allWithdrawals: any[] = Array.isArray(withdrawalsRaw?.data) ? withdrawalsRaw.data : [];
      const succeededWithdrawals  = from
        ? allWithdrawals.filter((w: any) => w.status === 'succeeded' && w.createdAt && inTs(w.createdAt))
        : allWithdrawals.filter((w: any) => w.status === 'succeeded');

      const withdrawalFees = +(succeededWithdrawals.reduce(
        (sum: number, w: any) => sum + (w.fee ?? +(w.amount * 0.02).toFixed(2)), 0
      )).toFixed(2);
      totalEarned     = +(totalEarned     + withdrawalFees).toFixed(2);
      totalCommission = +(totalCommission + withdrawalFees).toFixed(2);

      // Deduct points-to-cash payouts (platform pays doctors from its revenue)
      const pointsPayoutTotal: number  = pointsPayoutRaw?.data?.total       ?? 0;
      const pointsPayoutPoints: number = pointsPayoutRaw?.data?.totalPoints ?? 0;
      totalEarned = +Math.max(0, totalEarned - pointsPayoutTotal).toFixed(2);

      // Appointments — date field is YYYY-MM-DD string, use allDoctors (already filtered by createdAt)
      // but appointments themselves are filtered by their own `date` field
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
            const apts = from ? r.value.filter((a: any) => a.date && inDateStr(a.date)) : r.value;
            totalApts     += apts.length;
            completedApts += apts.filter((a: any) => a.status === 'completed').length;
          }
        });
      }

      setStats({
        totalPatients:         allUsers.length,
        totalDoctors:          allDoctors.length,
        pendingVerifications:  pendingVerif,
        verifiedDoctors:       verifiedDocs,
        pendingPosts:          pendingPostsCount,
        totalAppointments:     totalApts,
        completedAppointments: completedApts,
        totalCommission,
        totalEarned,
        subscriptionRevenue,
        pointsPayoutTotal,
        pointsPayoutPoints,
        heldBalance:           heldApptList.reduce((s, a) => s + (a.heldAmount || 0), 0),
        heldCount:             heldApptList.length,
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyFilter = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setFilterOpen(false);
    fetchStats(dateFrom, dateTo);
  };

  const clearFilter = () => {
    setDateFrom('');
    setDateTo('');
    setAppliedFrom('');
    setAppliedTo('');
    setFilterOpen(false);
    fetchStats();
  };

  const financeCards = stats ? [
    {
      label: 'Total Earned',
      value: `PKR ${stats.totalEarned.toLocaleString()}`,
      Icon: Icons.TrendingUp,
      sub: appliedFrom ? `${appliedFrom} – ${appliedTo}` : 'Net platform revenue',
      href: '/dashboard/transactions',
    },
    {
      label: 'Commission Earned',
      value: `PKR ${stats.totalCommission.toLocaleString()}`,
      Icon: Icons.Wallet,
      sub: appliedFrom ? `${appliedFrom} – ${appliedTo}` : 'Appointments + withdrawal fees',
      href: '/dashboard/appointments',
    },
    {
      label: 'Subscription Revenue',
      value: `PKR ${(stats.subscriptionRevenue ?? 0).toLocaleString()}`,
      Icon: Icons.Star,
      sub: appliedFrom ? `${appliedFrom} – ${appliedTo}` : 'From paid plans',
      href: '/dashboard/subscriptions',
    },
    {
      label: 'Rewards Paid Out',
      value: `PKR ${(stats.pointsPayoutTotal ?? 0).toLocaleString()}`,
      Icon: Icons.TrendingUp,
      sub: appliedFrom ? `${appliedFrom} – ${appliedTo}` : `${(stats.pointsPayoutPoints ?? 0).toLocaleString()} pts converted`,
      href: '/dashboard/transactions',
    },
  ] : [];

  const statCards = stats ? [
    {
      label: 'Total Patients',
      value: stats.totalPatients,
      Icon: Icons.Users,
      href: '/dashboard/users/patients',
      sub: 'Registered on platform',
      alert: false,
    },
    {
      label: 'Total Doctors',
      value: stats.totalDoctors,
      Icon: Icons.Stethoscope,
      href: '/dashboard/users/doctors',
      sub: `${stats.verifiedDoctors} verified`,
      alert: false,
    },
    {
      label: 'Verified Doctors',
      value: stats.verifiedDoctors,
      Icon: Icons.ShieldCheck,
      href: '/dashboard/users/doctors',
      sub: `${stats.totalDoctors} total registered`,
      alert: false,
    },
    {
      label: 'Pending Verifications',
      value: stats.pendingVerifications,
      Icon: Icons.Clock,
      href: '/dashboard/users/doctors',
      sub: stats.pendingVerifications > 0 ? 'Action needed' : 'All verified',
      alert: stats.pendingVerifications > 0,
    },
  ] : [];

  const extraStats = stats ? [
    { label: 'Total Appointments', value: stats.totalAppointments,     Icon: Icons.Calendar,    href: null },
    { label: 'Completed Sessions', value: stats.completedAppointments, Icon: Icons.CheckCircle, href: null },
    { label: 'Posts Pending',      value: stats.pendingPosts,          Icon: Icons.FileText,    href: '/dashboard/posts' },
    { label: 'Held Balance',       value: `PKR ${stats.heldBalance.toLocaleString()}`, Icon: Icons.Lock, href: null },
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

      {/* ── Page Header with Filter ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          {appliedFrom && <div className="page-filter-label">Showing: {appliedFrom} – {appliedTo}</div>}
        </div>
        <div className="filter-wrap" ref={filterRef}>
          <button
            className={`filter-btn ${appliedFrom ? 'filter-btn-active' : ''}`}
            onClick={() => setFilterOpen(v => !v)}
            title="Filter by date"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <span className="filter-btn-label">Filter</span>
            {appliedFrom && <span className="filter-dot" />}
          </button>
          {filterOpen && (
            <div className="filter-dropdown">
              <div className="filter-title">Filter by Date</div>
              <div className="filter-field">
                <label className="filter-label">From</label>
                <input className="filter-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="filter-field">
                <label className="filter-label">To</label>
                <input className="filter-input" type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)} />
              </div>
              <div className="filter-actions">
                {appliedFrom && <button className="filter-clear" onClick={clearFilter}>Clear</button>}
                <button className="filter-apply" onClick={applyFilter} disabled={!dateFrom || !dateTo}>Apply</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Finance Row (first) ── */}
      {loading ? (
        <div className="finance-row"><div className="stat-skeleton" /><div className="stat-skeleton" /></div>
      ) : (
        <div className="finance-row">
          {financeCards.map((f, i) => (
            <a key={i} href={f.href} className="finance-card" style={{ textDecoration: 'none' }}>
              <div className="finance-icon"><f.Icon /></div>
              <div className="finance-body">
                <div className="finance-label">{f.label}</div>
                <div className="finance-value">{f.value}</div>
                <div className="finance-sub">{f.sub}</div>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="bottom-grid">
        {/* ── Left column ── */}
        <div className="stats-section">
          <div className="section-header">
            <h2>Overview</h2>
            <span className="live-badge"><span className="live-dot" />Live</span>
          </div>

          {loading ? (
            <div className="stats-loading">
              {[1,2,3,4].map(i => <div key={i} className="stat-skeleton" />)}
            </div>
          ) : (
            <div className="stats-grid">
              {statCards.map((s, i) => (
                <a href={s.href} key={i} className="stat-card" style={{ textDecoration: 'none' }}>
                  <div className="stat-header-row">
                    <div className={`stat-icon-wrap ${s.alert ? 'icon-alert' : ''}`}>
                      <s.Icon />
                    </div>
                    <span className="stat-label">{s.label}</span>
                  </div>
                  <div className={`stat-value ${s.alert ? 'val-alert' : ''}`}>{s.value}</div>
                  <div className="stat-sub">{s.sub}</div>
                  <div className="stat-footer">
                    <svg className="stat-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
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
                        <div className="extra-icon-wrap"><e.Icon /></div>
                        <div>
                          <div className="extra-val">{e.value}</div>
                          <div className="extra-label">{e.label}</div>
                        </div>
                      </a>
                    : <div key={i} className="extra-stat">
                        <div className="extra-icon-wrap"><e.Icon /></div>
                        <div>
                          <div className="extra-val">{e.value}</div>
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
                  <div className="feed-icon-wrap"><Icons.Users /></div>
                  <div className="feed-content">
                    <div className="feed-msg">{stats.totalPatients} patients registered</div>
                    <div className="feed-time">Total on platform</div>
                  </div>
                  <span className="feed-tag">Patients</span>
                </div>

                <div className="feed-item">
                  <div className={`feed-icon-wrap ${stats.pendingVerifications > 0 ? 'feed-icon-warn' : 'feed-icon-ok'}`}>
                    <Icons.Stethoscope />
                  </div>
                  <div className="feed-content">
                    <div className="feed-msg">{stats.pendingVerifications > 0 ? `${stats.pendingVerifications} doctors pending approval` : 'All doctors verified'}</div>
                    <div className="feed-time">{stats.verifiedDoctors} verified · {stats.totalDoctors} total</div>
                  </div>
                  <span className={`feed-tag ${stats.pendingVerifications > 0 ? 'feed-tag-warn' : 'feed-tag-ok'}`}>
                    {stats.pendingVerifications > 0 ? 'Pending' : 'Verified'}
                  </span>
                </div>

                <div className="feed-item">
                  <div className="feed-icon-wrap"><Icons.Calendar /></div>
                  <div className="feed-content">
                    <div className="feed-msg">{stats.totalAppointments} total appointments</div>
                    <div className="feed-time">{stats.completedAppointments} completed</div>
                  </div>
                  <span className="feed-tag">Sessions</span>
                </div>

                {stats.pendingPosts > 0 && (
                  <div className="feed-item">
                    <div className="feed-icon-wrap feed-icon-warn"><Icons.FilePlus /></div>
                    <div className="feed-content">
                      <div className="feed-msg">{stats.pendingPosts} posts pending review</div>
                      <div className="feed-time">Needs moderation</div>
                    </div>
                    <span className="feed-tag feed-tag-warn">Pending</span>
                  </div>
                )}

                <div className="feed-item">
                  <div className={`feed-icon-wrap ${stats.pendingReports > 0 ? 'feed-icon-alert' : ''}`}>
                    <Icons.Flag />
                  </div>
                  <div className="feed-content">
                    <div className="feed-msg">{stats.pendingReports > 0 ? `${stats.pendingReports} post reports pending` : 'No pending reports'}</div>
                    <div className="feed-time">{stats.reviewedReports} already reviewed</div>
                  </div>
                  <span className={`feed-tag ${stats.pendingReports > 0 ? 'feed-tag-alert' : ''}`}>Reports</span>
                </div>

                {stats.totalFeedbacks > 0 && (
                  <div className="feed-item">
                    <div className="feed-icon-wrap"><Icons.Star /></div>
                    <div className="feed-content">
                      <div className="feed-msg">Avg doctor rating: {stats.avgDoctorRating} / 5</div>
                      <div className="feed-time">{stats.totalFeedbacks} reviews · {stats.lowRatedDoctors} low-rated</div>
                    </div>
                    <span className="feed-tag">Ratings</span>
                  </div>
                )}

                <div className="feed-item">
                  <div className="feed-icon-wrap"><Icons.TrendingUp /></div>
                  <div className="feed-content">
                    <div className="feed-msg">PKR {stats.totalEarned.toLocaleString()} net revenue</div>
                    <div className="feed-time">PKR {stats.totalCommission.toLocaleString()} from commissions</div>
                  </div>
                  <span className="feed-tag">Revenue</span>
                </div>

                <div className="feed-item">
                  <div className="feed-icon-wrap"><Icons.Wallet /></div>
                  <div className="feed-content">
                    <div className="feed-msg">PKR {(stats.subscriptionRevenue ?? 0).toLocaleString()} from subscriptions</div>
                    <div className="feed-time">Paid subscription plans</div>
                  </div>
                  <span className="feed-tag">Subscriptions</span>
                </div>

                {(stats.pointsPayoutTotal ?? 0) > 0 && (
                  <div className="feed-item">
                    <div className="feed-icon-wrap feed-icon-warn"><Icons.TrendingUp /></div>
                    <div className="feed-content">
                      <div className="feed-msg">PKR {(stats.pointsPayoutTotal ?? 0).toLocaleString()} paid out via rewards</div>
                      <div className="feed-time">Points converted to cash by doctors</div>
                    </div>
                    <span className="feed-tag feed-tag-warn">Outgoing</span>
                  </div>
                )}

                {stats.heldBalance > 0 && (
                  <div className="feed-item">
                    <div className="feed-icon-wrap feed-icon-warn"><Icons.Lock /></div>
                    <div className="feed-content">
                      <div className="feed-msg">PKR {stats.heldBalance.toLocaleString()} held for appointments</div>
                      <div className="feed-time">{stats.heldCount} payment{stats.heldCount !== 1 ? 's' : ''} awaiting release</div>
                    </div>
                    <span className="feed-tag feed-tag-warn">Held</span>
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
              ? <span className="alert-badge">Needs Attention</span>
              : <span className="live-badge"><span className="live-dot" />All Clear</span>
            }
          </div>
          <div className="mod-grid">
            {moderationCards.map((c, i) => (
              <a href={c.href} key={i} className="mod-card" style={{ textDecoration: 'none' }}>
                <div className="mod-top-row">
                  <div className="mod-icon-wrap">
                    <c.Icon />
                  </div>
                  <span className={`mod-status-chip ${c.urgent ? 'urgent' : 'ok'}`}>
                    {c.urgentLabel}
                  </span>
                </div>
                <div className="mod-value">{c.value}</div>
                <div className="mod-label">{c.label}</div>
                <div className="mod-sub">{c.sub}</div>
                <div className="mod-footer">
                  <span className="mod-link">View all</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        .page { display: flex; flex-direction: column; gap: 20px; }
        .page-header { display: flex; align-items: center; justify-content: space-between; }
        .page-title { font-size: 18px; font-weight: 800; color: #111; letter-spacing: -0.3px; }
        .page-filter-label { font-size: 11px; color: #6B7FED; font-weight: 600; margin-top: 2px; }
        .bottom-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .section-header h2 { font-size: 14px; font-weight: 700; color: #111; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }

        /* Badges */
        .live-badge  { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #059669; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 3px 10px; border-radius: 20px; }
        .live-dot    { width: 5px; height: 5px; border-radius: 50%; background: #059669; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .alert-badge { font-size: 11px; font-weight: 600; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; padding: 3px 10px; border-radius: 20px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* ── Finance Row ── */
        .finance-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .finance-card {
          background: #fff; border-radius: 14px; padding: 16px 18px;
          border: 1px solid #e5e7eb;
          display: flex; align-items: center; gap: 12px;
          cursor: pointer; text-decoration: none;
          transition: box-shadow 0.18s, border-color 0.18s;
        }
        .finance-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.07); border-color: #C8D0FF; }
        .finance-icon { width: 38px; height: 38px; border-radius: 10px; background: #f3f4f6; color: #6B7FED; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .finance-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .finance-label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .finance-value { font-size: 17px; font-weight: 800; color: #111; letter-spacing: -0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .finance-sub   { font-size: 11px; color: #aaa; margin-top: 1px; }

        /* ── Stat Cards ── */
        .stats-loading { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .stat-skeleton { height: 130px; background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; border-radius: 14px; animation: shimmer 1.5s infinite; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }

        .stat-card {
          background: #fff; border-radius: 14px; padding: 18px;
          border: 1px solid #e5e7eb;
          display: flex; flex-direction: column; gap: 0;
          cursor: pointer;
          transition: box-shadow 0.18s, border-color 0.18s;
        }
        .stat-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.07); border-color: #C8D0FF; }

        .stat-header-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .stat-icon-wrap { width: 36px; height: 36px; border-radius: 9px; background: #f3f4f6; color: #6B7FED; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-icon-wrap.icon-alert { background: #fff7ed; color: #b45309; }
        .stat-label { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.4px; line-height: 1.3; }
        .stat-value { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.5px; margin-bottom: 3px; line-height: 1; }
        .stat-value.val-alert { color: #b45309; }
        .stat-sub { font-size: 11px; color: #aaa; margin-bottom: 12px; }
        .stat-footer { display: flex; justify-content: flex-end; }
        .stat-arrow { color: #ccc; transition: color 0.15s, transform 0.15s; }
        .stat-card:hover .stat-arrow { color: #6B7FED; transform: translateX(2px); }

        /* ── Extra Stats ── */
        .extra-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .extra-stat {
          background: #fff; border-radius: 12px; padding: 13px 12px;
          border: 1px solid #e5e7eb;
          display: flex; align-items: center; gap: 10px;
          transition: box-shadow 0.15s; cursor: default;
        }
        a.extra-stat { cursor: pointer; }
        a.extra-stat:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.07); border-color: #C8D0FF; }
        .extra-icon-wrap { width: 32px; height: 32px; border-radius: 8px; background: #f3f4f6; color: #6B7FED; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .extra-val   { font-size: 14px; font-weight: 800; color: #111; }
        .extra-label { font-size: 10px; color: #888; margin-top: 2px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }

        /* ── Feed / Platform Summary ── */
        .feed-section { background: #fff; border-radius: 14px; padding: 20px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; }
        .feed-list    { display: flex; flex-direction: column; gap: 0; height: 420px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #e0e4ff transparent; }
        .feed-skeleton { height: 48px; background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; border-radius: 8px; animation: shimmer 1.5s infinite; margin-bottom: 4px; }
        .feed-item    { display: flex; align-items: center; gap: 12px; padding: 11px 4px; border-bottom: 1px solid #f3f4f6; }
        .feed-item:last-child { border-bottom: none; }
        .feed-icon-wrap { width: 32px; height: 32px; border-radius: 8px; background: #f3f4f6; color: #6B7FED; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .feed-icon-warn  { background: #fffbeb; color: #d97706; }
        .feed-icon-alert { background: #fff1f2; color: #e11d48; }
        .feed-icon-ok    { background: #f0fdf4; color: #16a34a; }
        .feed-content { flex: 1; min-width: 0; }
        .feed-msg     { font-size: 12.5px; color: #222; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .feed-time    { font-size: 11px; color: #aaa; margin-top: 2px; }
        .feed-tag      { font-size: 10px; font-weight: 600; padding: 2px 9px; border-radius: 20px; background: #f3f4f6; color: #555; text-transform: uppercase; letter-spacing: 0.3px; flex-shrink: 0; border: 1px solid #e5e7eb; }
        .feed-tag-warn  { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .feed-tag-alert { background: #fff1f2; color: #e11d48; border-color: #fecdd3; }
        .feed-tag-ok    { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }

        /* ── Moderation Cards ── */
        .mod-section { display: flex; flex-direction: column; }
        .mod-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .mod-card {
          background: #fff; border-radius: 14px; padding: 18px;
          border: 1px solid #e5e7eb;
          display: flex; flex-direction: column; gap: 4px;
          cursor: pointer;
          transition: box-shadow 0.18s, border-color 0.18s;
        }
        .mod-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.07); border-color: #C8D0FF; }
        .mod-top-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
        .mod-icon-wrap { width: 38px; height: 38px; border-radius: 10px; background: #f3f4f6; color: #6B7FED; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mod-status-chip { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
        .mod-status-chip.urgent { background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; }
        .mod-status-chip.ok     { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .mod-value { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .mod-label { font-size: 13px; font-weight: 600; color: #333; }
        .mod-sub   { font-size: 11px; color: #aaa; }
        .mod-footer { display: flex; align-items: center; gap: 4px; margin-top: 10px; color: #aaa; }
        .mod-link { font-size: 11px; font-weight: 600; color: #6B7FED; }
        .mod-card:hover .mod-footer { color: #6B7FED; }

        /* ── Held Payments Panel ── */
        .held-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; margin-top: 12px; }
        .held-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; cursor: pointer; transition: background 0.15s; gap: 12px; }
        .held-panel-header:hover { background: #fafafa; }
        .held-panel-left { display: flex; align-items: center; gap: 12px; }
        .held-icon-wrap { width: 36px; height: 36px; background: #f3f4f6; color: #6B7FED; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .held-panel-title { font-size: 13px; font-weight: 700; color: #111; }
        .held-panel-sub   { font-size: 11px; color: #888; margin-top: 2px; }
        .held-panel-right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
        .held-amount { font-size: 15px; font-weight: 800; color: #111; }
        .held-chevron { color: #aaa; transition: transform 0.2s; }
        .held-chevron.open { transform: rotate(180deg); }
        .held-list { border-top: 1px solid #f3f4f6; padding: 0 18px 14px; }
        .held-empty { font-size: 13px; color: #aaa; text-align: center; padding: 20px 0; }
        .held-table-head { display: grid; grid-template-columns: 1.5fr 1.5fr 1.5fr 1fr 0.7fr; gap: 8px; padding: 10px 0 6px; font-size: 10px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1px solid #f3f4f6; }
        .held-row { display: grid; grid-template-columns: 1.5fr 1.5fr 1.5fr 1fr 0.7fr; gap: 8px; align-items: center; padding: 9px 0; border-bottom: 1px solid #f9fafb; }
        .held-row:last-of-type { border-bottom: none; }
        .held-cell { font-size: 12px; color: #444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .held-amt  { font-weight: 700; color: #111; }
        .held-chip { display: inline-block; font-size: 10px; font-weight: 600; background: #f3f4f6; color: #555; border-radius: 5px; padding: 2px 7px; }
        .held-total-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0 0; border-top: 1px solid #f3f4f6; margin-top: 4px; font-size: 13px; font-weight: 700; color: #111; }
        .held-total-amt { font-size: 14px; font-weight: 800; color: #111; }

        /* ── Date Filter ── */
        .filter-wrap { position: relative; }
        .filter-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; height: 34px; border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; color: #555; cursor: pointer; transition: all 0.15s; position: relative; flex-shrink: 0; font-size: 12px; font-weight: 600; }
        .filter-btn-label { line-height: 1; }
        .filter-btn:hover { background: #EEF1FF; color: #6B7FED; border-color: #C8D0FF; }
        .filter-btn-active { background: #EEF1FF !important; color: #6B7FED !important; border-color: #C8D0FF !important; }
        .filter-dot { position: absolute; top: 5px; right: 5px; width: 6px; height: 6px; border-radius: 50%; background: #6B7FED; border: 1.5px solid #fff; }
        .filter-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 220px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.10); padding: 16px; z-index: 100; }
        .filter-title { font-size: 12px; font-weight: 700; color: #111; margin-bottom: 12px; }
        .filter-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
        .filter-label { font-size: 10px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.3px; }
        .filter-input { border: 1px solid #e5e7eb; border-radius: 8px; padding: 7px 10px; font-size: 12px; color: #111; outline: none; width: 100%; box-sizing: border-box; background: #fafafa; }
        .filter-input:focus { border-color: #6B7FED; background: #fff; }
        .filter-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
        .filter-clear { font-size: 12px; font-weight: 600; color: #666; background: none; border: 1px solid #e5e7eb; border-radius: 7px; padding: 6px 12px; cursor: pointer; transition: all 0.15s; }
        .filter-clear:hover { border-color: #aaa; color: #333; }
        .filter-apply { font-size: 12px; font-weight: 600; color: #fff; background: #6B7FED; border: none; border-radius: 7px; padding: 6px 14px; cursor: pointer; transition: background 0.15s; }
        .filter-apply:hover:not(:disabled) { background: #5a6fd6; }
        .filter-apply:disabled { opacity: 0.4; cursor: not-allowed; }

        @media (max-width: 1200px) {
          .bottom-grid { grid-template-columns: 1fr; }
          .mod-grid { grid-template-columns: repeat(2, 1fr); }
          .extra-stats { grid-template-columns: repeat(2, 1fr); }
          .finance-row { grid-template-columns: 1fr 1fr; }
          .held-table-head, .held-row { grid-template-columns: 1fr 1fr 1fr; }
          .held-table-head span:nth-child(4), .held-table-head span:nth-child(5),
          .held-row span:nth-child(4), .held-row span:nth-child(5) { display: none; }
        }
      `}</style>
    </div>
  );
}
