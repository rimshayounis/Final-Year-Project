'use client';

import { useEffect, useState } from 'react';

const stats = [
  { label: 'Total Users', value: '800+', icon: '👥', color: '#4f46e5', bg: '#ede9fe' },
  { label: 'Pending Verifications', value: '145', icon: '⏳', color: '#d97706', bg: '#fef3c7' },
  { label: 'Verified Professionals', value: '500+', icon: '✅', color: '#059669', bg: '#d1fae5' },
  { label: 'Commission Earned', value: '$4,25,000', icon: '💰', color: '#db2777', bg: '#fce7f3' },
];

const feed = [
  { msg: 'Dr. A. Kumar verified successfully', time: '2m ago', type: 'success' },
  { msg: 'New professional signup: Dr. R. Mehta', time: '8m ago', type: 'info' },
  { msg: 'Post rejected due to misinformation', time: '15m ago', type: 'warning' },
  { msg: 'Wallet payout processed', time: '1h ago', type: 'success' },
  { msg: 'New booking completed', time: '2h ago', type: 'info' },
  { msg: 'User account suspended', time: '3h ago', type: 'error' },
];

const typeColor: any = {
  success: { bg: '#d1fae5', dot: '#059669' },
  info:    { bg: '#dbeafe', dot: '#2563eb' },
  warning: { bg: '#fef3c7', dot: '#d97706' },
  error:   { bg: '#fee2e2', dot: '#dc2626' },
};

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  return (
    <div className="page">
      {/* Hero Banner */}
      <div className="banner">
        <div className="banner-text">
          <div className="banner-greeting">{greeting}, Admin 👋</div>
          <h1>YOUR HEALTH IS<br />OUR PRIORITY</h1>
          <p>Monitor your platform, verify professionals, and keep the community healthy.</p>
        </div>
        <div className="banner-visual">
          <div className="pulse-ring r1" />
          <div className="pulse-ring r2" />
          <div className="banner-icon">🏥</div>
        </div>
      </div>

      {/* Stats + Activity */}
      <div className="bottom-grid">
        {/* Stats */}
        <div className="stats-section">
          <div className="section-header">
            <h2>Overview</h2>
            <span className="badge">Live</span>
          </div>
          <div className="stats-grid">
            {stats.map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-top">
                  <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                    {s.icon}
                  </div>
                  <div className="stat-trend">↑ 12%</div>
                </div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-bar">
                  <div className="stat-fill" style={{ background: s.color, width: `${60 + i * 10}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="feed-section">
          <div className="section-header">
            <h2>Activity Feed</h2>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="feed-list">
            {feed.map((item, i) => (
              <div className="feed-item" key={i}>
                <div className="feed-dot" style={{ background: typeColor[item.type].dot }} />
                <div className="feed-content">
                  <div className="feed-msg">{item.msg}</div>
                  <div className="feed-time">{item.time}</div>
                </div>
                <div className="feed-tag" style={{ background: typeColor[item.type].bg, color: typeColor[item.type].dot }}>
                  {item.type}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .page { display: flex; flex-direction: column; gap: 24px; }

        /* Banner */
        .banner {
          background: linear-gradient(135deg, #1e1b4b 0%, #3730a3 40%, #4f46e5 70%, #6366f1 100%);
          border-radius: 20px;
          padding: 40px 48px;
          display: flex; align-items: center; justify-content: space-between;
          position: relative; overflow: hidden; min-height: 200px;
        }
        .banner-text { position: relative; z-index: 2; }
        .banner-greeting { font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 10px; font-weight: 500; }
        .banner-text h1 {
          font-size: 32px; font-weight: 800; color: #fff;
          line-height: 1.15; letter-spacing: -1px; margin-bottom: 12px;
        }
        .banner-text p { font-size: 14px; color: rgba(255,255,255,0.65); max-width: 380px; line-height: 1.6; }

        .banner-visual { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; }
        .pulse-ring {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.15);
          animation: pulse 2.5s ease-in-out infinite;
        }
        .r1 { width: 140px; height: 140px; animation-delay: 0s; }
        .r2 { width: 200px; height: 200px; animation-delay: 0.8s; }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.06); opacity: 0.2; } }
        .banner-icon { font-size: 64px; position: relative; z-index: 2; }

        /* Bottom grid */
        .bottom-grid { display: grid; grid-template-columns: 1fr 360px; gap: 24px; }

        /* Section header */
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .section-header h2 { font-size: 16px; font-weight: 700; color: #111; }
        .badge {
          font-size: 11px; font-weight: 600; color: #059669;
          background: #d1fae5; padding: 3px 10px; border-radius: 20px;
        }
        .view-all-btn {
          font-size: 13px; font-weight: 600; color: #4f46e5;
          background: none; border: none; cursor: pointer; padding: 6px 14px;
          border-radius: 8px; transition: background 0.15s;
        }
        .view-all-btn:hover { background: #ede9fe; }

        /* Stats */
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .stat-card {
          background: #fff; border-radius: 16px;
          padding: 20px;
          border: 1px solid #f0f0f5;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .stat-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
        .stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .stat-trend { font-size: 11px; font-weight: 600; color: #059669; background: #d1fae5; padding: 3px 8px; border-radius: 20px; }
        .stat-value { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
        .stat-label { font-size: 13px; color: #888; margin-bottom: 12px; }
        .stat-bar { height: 4px; background: #f0f0f5; border-radius: 2px; overflow: hidden; }
        .stat-fill { height: 100%; border-radius: 2px; transition: width 1s ease; }

        /* Feed */
        .feed-section {
          background: #fff; border-radius: 16px; padding: 20px;
          border: 1px solid #f0f0f5; display: flex; flex-direction: column;
        }
        .feed-list { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .feed-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px; border-radius: 10px;
          transition: background 0.15s; cursor: default;
        }
        .feed-item:hover { background: #f8f8fc; }
        .feed-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .feed-content { flex: 1; min-width: 0; }
        .feed-msg { font-size: 13px; color: #333; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .feed-time { font-size: 11px; color: #aaa; margin-top: 2px; }
        .feed-tag { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; text-transform: uppercase; flex-shrink: 0; }
      `}</style>
    </div>
  );
}
