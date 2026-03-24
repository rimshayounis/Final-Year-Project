'use client';

import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000/api';

interface Doctor {
  _id: string;
  fullName: string;
  email: string;
  subscriptionPlan: string;
}

interface PointsSummary {
  totalPoints: number;
  cashValue: number;
  trustBadge: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  trustScore: number;
  monthlyBookings: { yearMonth: string; completedCount: number; rewarded: boolean }[];
  recentTransactions: { type: string; points: number; description: string; createdAt: string }[];
}

interface DoctorPoints {
  doctor: Doctor;
  summary: PointsSummary | null;
}

const badgeColors: Record<string, { bg: string; color: string; icon: string }> = {
  none:     { bg: '#f3f4f8', color: '#888',    icon: '—'  },
  bronze:   { bg: '#fef3c7', color: '#d97706', icon: '🥉' },
  silver:   { bg: '#f0f0f5', color: '#6b7280', icon: '🥈' },
  gold:     { bg: '#fef9c3', color: '#ca8a04', icon: '🥇' },
  platinum: { bg: '#ede9fe', color: '#6d28d9', icon: '💎' },
};

const planColors: Record<string, { bg: string; color: string }> = {
  free_trial:   { bg: '#f3f4f8', color: '#666' },
  basic:        { bg: '#dbeafe', color: '#1d4ed8' },
  professional: { bg: '#ede9fe', color: '#6d28d9' },
  premium:      { bg: '#fef3c7', color: '#d97706' },
};

export default function PointsRewardsPage() {
  const [data, setData]         = useState<DoctorPoints[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<DoctorPoints | null>(null);
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`${BASE_URL}/doctors`).then(r => r.json());
      const doctors: Doctor[] = res.doctors || res || [];
      const results = await Promise.allSettled(
        doctors.map(d =>
          fetch(`${BASE_URL}/points-reward/${d._id}`)
            .then(r => r.json())
            .then(r => r.data || null)
            .catch(() => null)
        )
      );
      const combined: DoctorPoints[] = doctors.map((doctor, i) => ({
        doctor,
        summary: results[i].status === 'fulfilled' ? results[i].value : null,
      }));
      setData(combined);
    } catch {
      showToast('Failed to load points data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const recalculate = async (doctorId: string, doctorName: string) => {
    try {
      const res = await fetch(`${BASE_URL}/points-reward/${doctorId}/recalculate`, { method: 'POST' });
      if (res.ok) {
        showToast(`Wallet recalculated for Dr. ${doctorName}`, 'success');
        // Refresh that doctor's data
        const updated = await fetch(`${BASE_URL}/points-reward/${doctorId}`).then(r => r.json());
        setData(prev => prev.map(d =>
          d.doctor._id === doctorId ? { ...d, summary: updated.data } : d
        ));
        if (selected?.doctor._id === doctorId) {
          setSelected(prev => prev ? { ...prev, summary: updated.data } : null);
        }
      }
    } catch {
      showToast('Failed to recalculate wallet', 'error');
    }
  };

  const filtered = data.filter(d =>
    !search.trim() ||
    d.doctor.fullName.toLowerCase().includes(search.toLowerCase()) ||
    d.doctor.email.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalPoints    = data.reduce((s, d) => s + (d.summary?.totalPoints || 0), 0);
  const totalCashValue = data.reduce((s, d) => s + (d.summary?.cashValue || 0), 0);
  const badgeCounts    = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  data.forEach(d => {
    const b = d.summary?.trustBadge;
    if (b && b !== 'none') badgeCounts[b as keyof typeof badgeCounts]++;
  });

  const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

  return (
    <div className="page">
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Points &amp; Rewards</h1>
          <p className="page-sub">Monitor doctor points, trust badges and reward wallets · synced from live appointment data</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="refresh-btn"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Refresh — re-syncs this month's appointment count from live data"
          >
            <svg style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <div className="header-stats">
            <div className="hstat">
              <span className="hstat-val" style={{ color: '#6B7FED' }}>{totalPoints.toLocaleString()}</span>
              <span className="hstat-label">Total Points</span>
            </div>
            <div className="hstat-divider" />
            <div className="hstat">
              <span className="hstat-val" style={{ color: '#059669' }}>PKR {totalCashValue.toLocaleString()}</span>
              <span className="hstat-label">Cash Value</span>
            </div>
            <div className="hstat-divider" />
            <div className="hstat">
              <span className="hstat-val" style={{ color: '#d97706' }}>
                {Object.values(badgeCounts).reduce((a, b) => a + b, 0)}
              </span>
              <span className="hstat-label">Badges Earned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Badge Summary */}
      <div className="badge-summary">
        {Object.entries(badgeColors).filter(([k]) => k !== 'none').map(([badge, style]) => (
          <div key={badge} className="badge-card">
            <span className="badge-icon">{style.icon}</span>
            <span className="badge-count">{badgeCounts[badge as keyof typeof badgeCounts]}</span>
            <span className="badge-name" style={{ color: style.color }}>
              {badge.charAt(0).toUpperCase() + badge.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="search-wrap">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search by doctor name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="clear-btn" onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div className="loading-state"><div className="spinner" /><p>Loading points data...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <p>No doctors found</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Plan</th>
                <th>Points</th>
                <th>Cash Value</th>
                <th>Trust Badge</th>
                <th>This Month Bookings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ doctor, summary }) => {
                const thisMonth = summary?.monthlyBookings?.find(m => m.yearMonth === getCurrentMonth());
                const badge = summary?.trustBadge || 'none';
                return (
                  <tr key={doctor._id} className="table-row">
                    <td>
                      <div className="person-cell">
                        <div className="person-name">Dr. {doctor.fullName}</div>
                        <div className="person-email">{doctor.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className="plan-chip" style={planColors[doctor.subscriptionPlan] || planColors.free_trial}>
                        {doctor.subscriptionPlan?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="points-cell">
                        <span className="points-val">{(summary?.totalPoints || 0).toLocaleString()}</span>
                        <span className="points-label">pts</span>
                      </div>
                    </td>
                    <td>
                      <span className="cash-val">PKR {(summary?.cashValue || 0).toLocaleString()}</span>
                    </td>
                    <td>
                      <span className="badge-chip" style={{ background: badgeColors[badge].bg, color: badgeColors[badge].color }}>
                        {badgeColors[badge].icon} {badge.charAt(0).toUpperCase() + badge.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="booking-cell">
                        <div className="booking-bar-wrap">
                          <div
                            className="booking-bar-fill"
                            style={{ width: `${Math.min(100, ((thisMonth?.completedCount || 0) / 30) * 100)}%` }}
                          />
                        </div>
                        <span className="booking-count">
                          {thisMonth?.completedCount || 0}/30
                          {thisMonth?.rewarded && <span className="rewarded-badge">✓ +200pts</span>}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-view" onClick={() => setSelected({ doctor, summary })}>
                          Details
                        </button>
                        <button className="btn-recalc" onClick={() => recalculate(doctor._id, doctor.fullName)}>
                          Recalc
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Dr. {selected.doctor.fullName}</h2>
                <p className="modal-sub">{selected.doctor.email}</p>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Points Overview */}
              <div className="modal-cards">
                <div className="modal-card">
                  <div className="mc-icon" style={{ background: '#ede9fe', color: '#6B7FED' }}>⭐</div>
                  <div className="mc-val">{(selected.summary?.totalPoints || 0).toLocaleString()}</div>
                  <div className="mc-label">Total Points</div>
                </div>
                <div className="modal-card">
                  <div className="mc-icon" style={{ background: '#d1fae5', color: '#059669' }}>💵</div>
                  <div className="mc-val">PKR {(selected.summary?.cashValue || 0).toLocaleString()}</div>
                  <div className="mc-label">Cash Value</div>
                </div>
                <div className="modal-card">
                  <div className="mc-icon" style={{ background: badgeColors[selected.summary?.trustBadge || 'none'].bg, color: badgeColors[selected.summary?.trustBadge || 'none'].color }}>
                    {badgeColors[selected.summary?.trustBadge || 'none'].icon}
                  </div>
                  <div className="mc-val">{selected.summary?.trustBadge || 'none'}</div>
                  <div className="mc-label">Trust Badge</div>
                </div>
                <div className="modal-card">
                  <div className="mc-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>🏆</div>
                  <div className="mc-val">{selected.summary?.trustScore || 0}</div>
                  <div className="mc-label">Trust Score</div>
                </div>
              </div>

              {/* Monthly Bookings */}
              {selected.summary?.monthlyBookings && selected.summary.monthlyBookings.length > 0 && (
                <div className="info-section">
                  <h3 className="info-title">Monthly Booking Progress</h3>
                  <div className="monthly-list">
                    {selected.summary.monthlyBookings.slice().reverse().slice(0, 6).map((mb, i) => (
                      <div key={i} className="monthly-item">
                        <span className="monthly-month">{mb.yearMonth}</span>
                        <div className="monthly-bar-wrap">
                          <div className="monthly-bar-fill" style={{ width: `${Math.min(100, (mb.completedCount / 30) * 100)}%` }} />
                        </div>
                        <span className="monthly-count">{mb.completedCount}/30</span>
                        {mb.rewarded && <span className="rewarded-tag">✓ Rewarded</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {selected.summary?.recentTransactions && selected.summary.recentTransactions.length > 0 && (
                <div className="info-section">
                  <h3 className="info-title">Recent Transactions</h3>
                  <div className="tx-list">
                    {selected.summary.recentTransactions.slice(0, 8).map((tx, i) => (
                      <div key={i} className="tx-item">
                        <div className="tx-left">
                          <div className="tx-type">{tx.type?.replace(/_/g, ' ')}</div>
                          <div className="tx-desc">{tx.description}</div>
                        </div>
                        <div className={`tx-points ${tx.points >= 0 ? 'positive' : 'negative'}`}>
                          {tx.points > 0 ? '+' : ''}{tx.points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recalculate Button */}
              <button
                className="btn-recalc-modal"
                onClick={() => recalculate(selected.doctor._id, selected.doctor.fullName)}
              >
                🔄 Recalculate Wallet
              </button>
            </div>
          </div>
        </div>
      )}

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

        .page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .page-title  { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .page-sub    { font-size: 13px; color: #888; margin-top: 4px; }

        .header-stats {
          display: flex; align-items: center;
          background: #fff; border: 1px solid #f0f0f5; border-radius: 14px; overflow: hidden;
        }
        .hstat { padding: 14px 22px; text-align: center; }
        .hstat-val   { display: block; font-size: 20px; font-weight: 800; }
        .hstat-label { display: block; font-size: 11px; color: #888; font-weight: 500; margin-top: 2px; }
        .hstat-divider { width: 1px; background: #f0f0f5; align-self: stretch; }

        /* Badge Summary */
        .badge-summary { display: flex; gap: 12px; flex-wrap: wrap; }
        .badge-card {
          background: #fff; border-radius: 12px; padding: 14px 20px;
          border: 1px solid #f0f0f5; display: flex; align-items: center; gap: 10px;
          transition: transform 0.15s;
        }
        .badge-card:hover { transform: translateY(-2px); }
        .badge-icon  { font-size: 22px; }
        .badge-count { font-size: 22px; font-weight: 800; color: #111; }
        .badge-name  { font-size: 12px; font-weight: 600; text-transform: capitalize; }

        /* Search */
        .search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #e5e5e5;
          border-radius: 12px; padding: 10px 16px; max-width: 400px;
        }
        .search-wrap input { border: none; outline: none; font-size: 14px; color: #333; background: none; flex: 1; }
        .search-wrap input::placeholder { color: #aaa; }
        .clear-btn { background: none; border: none; cursor: pointer; color: #aaa; font-size: 12px; }

        /* Table */
        .table-wrap { background: #fff; border-radius: 16px; border: 1px solid #f0f0f5; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table thead tr { background: #f8f8fc; }
        .table th {
          padding: 13px 18px; text-align: left;
          font-size: 11px; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid #f0f0f5;
        }
        .table-row { border-bottom: 1px solid #f8f8fc; transition: background 0.12s; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover { background: #fafafa; }
        .table td { padding: 13px 18px; vertical-align: middle; }

        .person-cell  { display: flex; flex-direction: column; gap: 2px; }
        .person-name  { font-size: 13px; font-weight: 600; color: #111; }
        .person-email { font-size: 11px; color: #888; }

        .plan-chip { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: capitalize; }
        .badge-chip { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: capitalize; }

        .points-cell  { display: flex; align-items: baseline; gap: 3px; }
        .points-val   { font-size: 15px; font-weight: 800; color: #6B7FED; }
        .points-label { font-size: 11px; color: #888; }
        .cash-val     { font-size: 13px; font-weight: 600; color: #059669; }

        .booking-cell { display: flex; flex-direction: column; gap: 4px; }
        .booking-bar-wrap { height: 6px; background: #f0f0f5; border-radius: 3px; overflow: hidden; width: 120px; }
        .booking-bar-fill { height: 100%; background: linear-gradient(90deg, #6B7FED, #7B8CDE); border-radius: 3px; transition: width 0.5s ease; }
        .booking-count { font-size: 11px; color: #666; display: flex; align-items: center; gap: 6px; }
        .rewarded-badge { background: #d1fae5; color: #059669; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 20px; }

        .action-btns { display: flex; gap: 6px; }
        .btn-view {
          padding: 6px 12px; border-radius: 8px;
          background: #ede9fe; color: #6B7FED;
          border: 1px solid #ddd6fe; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-view:hover { background: #6B7FED; color: #fff; }
        .btn-recalc {
          padding: 6px 12px; border-radius: 8px;
          background: #f3f4f8; color: #555;
          border: 1px solid #e5e5e5; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-recalc:hover { background: #e5e5e5; }

        .loading-state, .empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 60px 20px; gap: 12px; color: #888;
        }
        .empty-icon { font-size: 40px; }
        .empty-state p { font-size: 15px; font-weight: 600; color: #444; }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid #f0f0f5; border-top-color: #6B7FED;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Modal */
        .overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }
        .modal {
          background: #fff; border-radius: 20px;
          width: 100%; max-width: 580px; max-height: 85vh;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid #f0f0f5;
        }
        .modal-title { font-size: 17px; font-weight: 700; color: #111; }
        .modal-sub   { font-size: 12px; color: #888; margin-top: 3px; }
        .modal-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: #f3f4f8; border: none; cursor: pointer; font-size: 13px; color: #666;
        }
        .modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }

        .modal-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .modal-card {
          background: #f8f8fc; border-radius: 12px; padding: 14px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .mc-icon  { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .mc-val   { font-size: 18px; font-weight: 800; color: #111; }
        .mc-label { font-size: 11px; color: #888; }

        .info-section { background: #f8f8fc; border-radius: 14px; padding: 16px; }
        .info-title {
          font-size: 11px; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;
        }

        .monthly-list { display: flex; flex-direction: column; gap: 8px; }
        .monthly-item { display: flex; align-items: center; gap: 10px; }
        .monthly-month { font-size: 12px; color: #666; width: 60px; flex-shrink: 0; }
        .monthly-bar-wrap { flex: 1; height: 6px; background: #e5e5e5; border-radius: 3px; overflow: hidden; }
        .monthly-bar-fill { height: 100%; background: linear-gradient(90deg, #6B7FED, #7B8CDE); border-radius: 3px; }
        .monthly-count { font-size: 12px; color: #555; width: 40px; text-align: right; flex-shrink: 0; }
        .rewarded-tag { background: #d1fae5; color: #059669; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px; flex-shrink: 0; }

        .tx-list { display: flex; flex-direction: column; gap: 6px; }
        .tx-item {
          display: flex; align-items: center; justify-content: space-between;
          background: #fff; border-radius: 10px; padding: 10px 12px;
          border: 1px solid #f0f0f5;
        }
        .tx-left { display: flex; flex-direction: column; gap: 2px; }
        .tx-type { font-size: 12px; font-weight: 600; color: #333; text-transform: capitalize; }
        .tx-desc { font-size: 11px; color: #888; }
        .tx-points { font-size: 13px; font-weight: 800; flex-shrink: 0; }
        .tx-points.positive { color: #059669; }
        .tx-points.negative { color: #dc2626; }

        .btn-recalc-modal {
          width: 100%; padding: 12px; border-radius: 12px;
          background: #f3f4f8; color: #555;
          border: 1px solid #e5e5e5; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-recalc-modal:hover { background: #6B7FED; color: #fff; border-color: #6B7FED; }

        .refresh-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 10px;
          background: #EEF1FF; color: #6B7FED;
          border: 1px solid #E0E4FF; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .refresh-btn:hover:not(:disabled) { background: #6B7FED; color: #fff; border-color: #6B7FED; }
        .refresh-btn:disabled { opacity: 0.6; cursor: default; }
      `}</style>
    </div>
  );
}
