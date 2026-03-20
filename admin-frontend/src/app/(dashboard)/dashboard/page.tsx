'use client';

import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000/api';

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
  pendingReports: number;
  reviewedReports: number;
  totalFeedbacks: number;
  avgDoctorRating: number;
  lowRatedDoctors: number;
  openSupportTickets: number;
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('');
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [user, setUser]         = useState<any>(null);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
    const u = localStorage.getItem('admin_user');
    if (u) setUser(JSON.parse(u));
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, doctorsRes, pendingPostsRes, walletRes, reportsRes, feedbackRes] = await Promise.allSettled([
          fetch(`${BASE_URL}/users`).then(r => r.json()),
          fetch(`${BASE_URL}/doctors`).then(r => r.json()),
          fetch(`${BASE_URL}/posts/pending?limit=100`).then(r => r.json()),
          fetch(`${BASE_URL}/payment/admin/wallet`).then(r => r.json()),
          fetch(`${BASE_URL}/reports`).then(r => r.json()),
          fetch(`${BASE_URL}/feedback`).then(r => r.json()),
        ]);

        const usersRaw     = usersRes.status        === 'fulfilled' ? usersRes.value        : [];
        const doctorsRaw   = doctorsRes.status      === 'fulfilled' ? doctorsRes.value      : [];
        const pendingPosts = pendingPostsRes.status === 'fulfilled' ? pendingPostsRes.value : {};
        const wallet       = walletRes.status       === 'fulfilled' ? walletRes.value       : {};
        const reportsRaw   = reportsRes.status      === 'fulfilled' ? reportsRes.value      : [];
        const feedbacksRaw = feedbackRes.status     === 'fulfilled' ? feedbackRes.value     : [];

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
    { label: 'Total Patients',        value: stats.totalPatients,        icon: '👥', color: '#4f46e5', bg: '#ede9fe', action: false },
    { label: 'Pending Verifications', value: stats.pendingVerifications, icon: '⏳', color: '#d97706', bg: '#fef3c7', action: stats.pendingVerifications > 0 },
    { label: 'Verified Doctors',      value: stats.verifiedDoctors,      icon: '✅', color: '#059669', bg: '#d1fae5', action: false },
    { label: 'Commission Earned',     value: `PKR ${stats.totalCommission.toLocaleString()}`, icon: '💰', color: '#db2777', bg: '#fce7f3', action: false },
  ] : [];

  const moderationCards = stats ? [
    { label: 'Pending Reports', value: stats.pendingReports, sub: `${stats.reviewedReports} reviewed`, icon: '🚨', color: '#dc2626', bg: '#fee2e2', href: '/dashboard/reports', urgent: stats.pendingReports > 0, urgentLabel: stats.pendingReports > 0 ? `${stats.pendingReports} need action` : 'All clear' },
    { label: 'Avg Doctor Rating', value: stats.avgDoctorRating > 0 ? `${stats.avgDoctorRating} / 5` : '—', sub: `${stats.totalFeedbacks} total reviews`, icon: '⭐', color: '#d97706', bg: '#fef3c7', href: '/dashboard/feedback', urgent: stats.lowRatedDoctors > 0, urgentLabel: stats.lowRatedDoctors > 0 ? `${stats.lowRatedDoctors} low-rated doctors` : 'Ratings healthy' },
    { label: 'Support Queries', value: stats.openSupportTickets, sub: 'Open tickets', icon: '💬', color: '#0284c7', bg: '#e0f2fe', href: '/dashboard/support', urgent: stats.openSupportTickets > 0, urgentLabel: stats.openSupportTickets > 0 ? `${stats.openSupportTickets} awaiting reply` : 'No open tickets' },
    { label: 'Post Moderation', value: stats.pendingPosts, sub: 'Pending approval', icon: '📝', color: '#7c3aed', bg: '#ede9fe', href: '/dashboard/posts', urgent: stats.pendingPosts > 0, urgentLabel: stats.pendingPosts > 0 ? `${stats.pendingPosts} posts queued` : 'Queue empty' },
  ] : [];

  const adminName = user?.fullName?.split(' ')[0] || 'Admin';

  return (
    <div className="page">
      <div className="banner">
        <div className="banner-text">
          <div className="banner-greeting">{greeting}, {adminName} 👋</div>
          <h1>YOUR HEALTH IS<br />OUR PRIORITY</h1>
          <p>Monitor your platform, verify professionals, and keep the community healthy.</p>
        </div>
        <div className="banner-visual">
          <div className="pulse-ring r1" />
          <div className="pulse-ring r2" />
          <div className="banner-icon">🏥</div>
        </div>
      </div>

      <div className="bottom-grid">
        <div className="stats-section">
          <div className="section-header">
            <h2>Overview</h2>
            <span className="live-badge">● Live</span>
          </div>
          {loading ? (
            <div className="stats-loading">
              {[1,2,3,4].map(i => <div key={i} className="stat-skeleton" />)}
            </div>
          ) : (
            <div className="stats-grid">
              {statCards.map((s, i) => (
                <div className="stat-card" key={i}>
                  <div className="stat-top">
                    <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                    <div className="stat-trend" style={{ background: s.action ? '#fee2e2' : '#d1fae5', color: s.action ? '#dc2626' : '#059669' }}>
                      {s.action ? '⚠ Action needed' : '↑ Active'}
                    </div>
                  </div>
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-bar">
                    <div className="stat-fill" style={{ background: s.color, width: `${40 + i * 15}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {stats && !loading && (
            <div className="extra-stats">
              <div className="extra-stat"><span className="extra-icon">📅</span><div><div className="extra-val">{stats.totalAppointments}</div><div className="extra-label">Total Appointments</div></div></div>
              <div className="extra-stat"><span className="extra-icon">✅</span><div><div className="extra-val">{stats.completedAppointments}</div><div className="extra-label">Completed</div></div></div>
              <div className="extra-stat"><span className="extra-icon">📝</span><div><div className="extra-val">{stats.pendingPosts}</div><div className="extra-label">Pending Posts</div></div></div>
              <div className="extra-stat"><span className="extra-icon">💵</span><div><div className="extra-val">PKR {stats.totalEarned.toLocaleString()}</div><div className="extra-label">Total Earned</div></div></div>
            </div>
          )}
        </div>

        <div className="feed-section">
          <div className="section-header">
            <h2>Platform Summary</h2>
            <span className="live-badge">● Live</span>
          </div>
          <div className="feed-list">
            {loading ? (
              [1,2,3,4].map(i => <div key={i} className="feed-skeleton" />)
            ) : !stats ? null : (
              <>
                <div className="feed-item">
                  <div className="feed-dot" style={{ background: '#4f46e5' }} />
                  <div className="feed-content"><div className="feed-msg">{stats.totalPatients} patients registered</div><div className="feed-time">Total on platform</div></div>
                  <div className="feed-tag" style={{ background: '#ede9fe', color: '#4f46e5' }}>patients</div>
                </div>
                <div className="feed-item">
                  <div className="feed-dot" style={{ background: stats.pendingVerifications > 0 ? '#d97706' : '#059669' }} />
                  <div className="feed-content">
                    <div className="feed-msg">{stats.pendingVerifications > 0 ? `${stats.pendingVerifications} doctors pending approval` : 'All doctors verified'}</div>
                    <div className="feed-time">{stats.verifiedDoctors} verified doctors</div>
                  </div>
                  <div className="feed-tag" style={{ background: stats.pendingVerifications > 0 ? '#fef3c7' : '#d1fae5', color: stats.pendingVerifications > 0 ? '#d97706' : '#059669' }}>
                    {stats.pendingVerifications > 0 ? 'action needed' : 'verified'}
                  </div>
                </div>
                <div className="feed-item">
                  <div className="feed-dot" style={{ background: '#1d4ed8' }} />
                  <div className="feed-content"><div className="feed-msg">{stats.totalAppointments} total appointments</div><div className="feed-time">{stats.completedAppointments} completed</div></div>
                  <div className="feed-tag" style={{ background: '#dbeafe', color: '#1d4ed8' }}>appointments</div>
                </div>
                {stats.pendingPosts > 0 && (
                  <div className="feed-item">
                    <div className="feed-dot" style={{ background: '#d97706' }} />
                    <div className="feed-content"><div className="feed-msg">{stats.pendingPosts} posts pending review</div><div className="feed-time">Needs moderation</div></div>
                    <div className="feed-tag" style={{ background: '#fef3c7', color: '#d97706' }}>posts</div>
                  </div>
                )}
                <div className="feed-item">
                  <div className="feed-dot" style={{ background: stats.pendingReports > 0 ? '#dc2626' : '#059669' }} />
                  <div className="feed-content">
                    <div className="feed-msg">{stats.pendingReports > 0 ? `${stats.pendingReports} post reports pending` : 'No pending reports'}</div>
                    <div className="feed-time">{stats.reviewedReports} already reviewed</div>
                  </div>
                  <div className="feed-tag" style={{ background: stats.pendingReports > 0 ? '#fee2e2' : '#d1fae5', color: stats.pendingReports > 0 ? '#dc2626' : '#059669' }}>reports</div>
                </div>
                {stats.totalFeedbacks > 0 && (
                  <div className="feed-item">
                    <div className="feed-dot" style={{ background: '#d97706' }} />
                    <div className="feed-content"><div className="feed-msg">Avg doctor rating: {stats.avgDoctorRating} / 5</div><div className="feed-time">{stats.totalFeedbacks} reviews · {stats.lowRatedDoctors} low-rated</div></div>
                    <div className="feed-tag" style={{ background: '#fef3c7', color: '#d97706' }}>feedback</div>
                  </div>
                )}
                <div className="feed-item">
                  <div className="feed-dot" style={{ background: '#059669' }} />
                  <div className="feed-content"><div className="feed-msg">PKR {stats.totalCommission.toLocaleString()} commission earned</div><div className="feed-time">PKR {stats.totalEarned.toLocaleString()} total earned</div></div>
                  <div className="feed-tag" style={{ background: '#d1fae5', color: '#059669' }}>payments</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {stats && !loading && (
        <div className="mod-section">
          <div className="section-header">
            <h2>Moderation & Insights</h2>
            {(stats.pendingReports + stats.openSupportTickets + stats.pendingPosts) > 0
              ? <span className="alert-badge">⚠ Needs Attention</span>
              : <span className="live-badge">● All Clear</span>
            }
          </div>
          <div className="mod-grid">
            {moderationCards.map((c, i) => (
              <a href={c.href} key={i} className="mod-card" style={{ textDecoration: 'none' }}>
                <div className="mod-card-top">
                  <div className="mod-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
                  <div className={`mod-status ${c.urgent ? 'urgent' : 'ok'}`}>{c.urgent ? '⚠' : '✓'} {c.urgentLabel}</div>
                </div>
                <div className="mod-value" style={{ color: c.color }}>{c.value}</div>
                <div className="mod-label">{c.label}</div>
                <div className="mod-sub">{c.sub}</div>
                <div className="mod-arrow" style={{ color: c.color }}>View all →</div>
              </a>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .page { display: flex; flex-direction: column; gap: 24px; }
        .banner { background: linear-gradient(135deg, #1e1b4b 0%, #3730a3 40%, #4f46e5 70%, #6366f1 100%); border-radius: 20px; padding: 40px 48px; display: flex; align-items: center; justify-content: space-between; position: relative; overflow: hidden; min-height: 200px; }
        .banner-text { position: relative; z-index: 2; }
        .banner-greeting { font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 10px; font-weight: 500; }
        .banner-text h1 { font-size: 32px; font-weight: 800; color: #fff; line-height: 1.15; letter-spacing: -1px; margin-bottom: 12px; }
        .banner-text p  { font-size: 14px; color: rgba(255,255,255,0.65); max-width: 380px; line-height: 1.6; }
        .banner-visual  { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; }
        .pulse-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); animation: pulse 2.5s ease-in-out infinite; }
        .r1 { width: 140px; height: 140px; animation-delay: 0s; }
        .r2 { width: 200px; height: 200px; animation-delay: 0.8s; }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.06); opacity: 0.2; } }
        .banner-icon { font-size: 64px; position: relative; z-index: 2; }
        .bottom-grid { display: grid; grid-template-columns: 1fr 360px; gap: 24px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .section-header h2 { font-size: 16px; font-weight: 700; color: #111; }
        .live-badge  { font-size: 12px; font-weight: 600; color: #059669; background: #d1fae5; padding: 3px 10px; border-radius: 20px; }
        .alert-badge { font-size: 12px; font-weight: 600; color: #d97706; background: #fef3c7; padding: 3px 10px; border-radius: 20px; }
        .stats-loading { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .stat-skeleton { height: 140px; background: linear-gradient(90deg, #f0f0f5 25%, #e8e8f0 50%, #f0f0f5 75%); background-size: 200% 100%; border-radius: 16px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .stat-card  { background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #f0f0f5; transition: transform 0.15s, box-shadow 0.15s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .stat-top   { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
        .stat-icon  { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .stat-trend { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
        .stat-value { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
        .stat-label { font-size: 13px; color: #888; margin-bottom: 12px; }
        .stat-bar   { height: 4px; background: #f0f0f5; border-radius: 2px; overflow: hidden; }
        .stat-fill  { height: 100%; border-radius: 2px; }
        .extra-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .extra-stat  { background: #fff; border-radius: 12px; padding: 14px 12px; border: 1px solid #f0f0f5; display: flex; align-items: center; gap: 10px; }
        .extra-icon  { font-size: 20px; }
        .extra-val   { font-size: 15px; font-weight: 800; color: #111; }
        .extra-label { font-size: 11px; color: #888; margin-top: 2px; }
        .feed-section { background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #f0f0f5; display: flex; flex-direction: column; }
        .feed-list    { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .feed-skeleton { height: 52px; background: linear-gradient(90deg, #f0f0f5 25%, #e8e8f0 50%, #f0f0f5 75%); background-size: 200% 100%; border-radius: 10px; animation: shimmer 1.5s infinite; margin-bottom: 4px; }
        .feed-item    { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; transition: background 0.15s; }
        .feed-item:hover { background: #f8f8fc; }
        .feed-dot     { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .feed-content { flex: 1; min-width: 0; }
        .feed-msg     { font-size: 13px; color: #333; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .feed-time    { font-size: 11px; color: #aaa; margin-top: 2px; }
        .feed-tag     { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; text-transform: uppercase; flex-shrink: 0; }
        .mod-section { display: flex; flex-direction: column; }
        .mod-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .mod-card { background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #f0f0f5; transition: transform 0.15s, box-shadow 0.15s; cursor: pointer; display: flex; flex-direction: column; gap: 6px; }
        .mod-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .mod-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; }
        .mod-icon  { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .mod-status { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; }
        .mod-status.urgent { background: #fee2e2; color: #dc2626; }
        .mod-status.ok     { background: #d1fae5; color: #059669; }
        .mod-value { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
        .mod-label { font-size: 13px; font-weight: 600; color: #333; }
        .mod-sub   { font-size: 11px; color: #aaa; }
        .mod-arrow { font-size: 11px; font-weight: 600; margin-top: 6px; }
        @media (max-width: 1200px) {
          .bottom-grid { grid-template-columns: 1fr; }
          .mod-grid { grid-template-columns: repeat(2, 1fr); }
          .extra-stats { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}