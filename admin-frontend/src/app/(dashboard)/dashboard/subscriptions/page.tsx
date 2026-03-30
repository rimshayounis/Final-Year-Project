'use client';

import { useEffect, useState } from 'react';
import { MentorLevelBadge, fetchMentorLevels, type MentorLevel } from '@/components/MentorLevelBadge';

const BASE_URL = 'http://localhost:3000/api';

interface Doctor {
  _id: string;
  fullName: string;
  email: string;
  subscriptionPlan: string;
}

interface Subscription {
  _id: string;
  doctorId: string;
  plan: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  pricePKR: number;
  paymentMethod?: string;
  stripePaymentIntentId?: string | null;
  cancelledAt?: string;
  cancelReason?: string;
}

const planColors: Record<string, { bg: string; color: string }> = {
  free_trial:   { bg: '#f3f4f8', color: '#666' },
  basic:        { bg: '#dbeafe', color: '#1d4ed8' },
  professional: { bg: '#EEF1FF', color: '#6B7FED' },
  premium:      { bg: '#fef3c7', color: '#d97706' },
};

const statusColors: Record<string, { bg: string; color: string }> = {
  active:    { bg: '#d1fae5', color: '#059669' },
  expired:   { bg: '#fee2e2', color: '#dc2626' },
  cancelled: { bg: '#f3f4f8', color: '#666' },
};

const PLAN_PRICES: Record<string, number> = {
  free_trial: 0, basic: 1500, professional: 3500, premium: 6000,
};

export default function SubscriptionsPage() {
  const [doctors, setDoctors]   = useState<Doctor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [subHistory, setSubHistory] = useState<Subscription[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [mentorLevels, setMentorLevels] = useState<Record<string, MentorLevel>>({});
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch(`${BASE_URL}/doctors`)
      .then(r => r.json())
      .then(data => {
        const list: Doctor[] = data.doctors || [];
        setDoctors(list);
        fetchMentorLevels(list.map(d => d._id), BASE_URL).then(setMentorLevels);
      })
      .catch(() => showToast('Failed to load doctors', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const openDoctor = async (doctor: Doctor) => {
    setSelected(doctor);
    setSubHistory([]);
    setSubLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/subscriptions/${doctor._id}/history`);
      const data = await res.json();
      setSubHistory(data.data || data.subscriptions || []);
    } catch {
      showToast('Failed to load subscription history', 'error');
    } finally {
      setSubLoading(false);
    }
  };

  const filtered = doctors.filter(d => {
    const matchSearch = !search.trim() ||
      d.fullName.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === 'all' || d.subscriptionPlan === planFilter;
    return matchSearch && matchPlan;
  });

  const counts: Record<string, number> = {
    all:          doctors.length,
    free_trial:   doctors.filter(d => d.subscriptionPlan === 'free_trial').length,
    basic:        doctors.filter(d => d.subscriptionPlan === 'basic').length,
    professional: doctors.filter(d => d.subscriptionPlan === 'professional').length,
    premium:      doctors.filter(d => d.subscriptionPlan === 'premium').length,
  };

  const totalRevenue = doctors.reduce((sum, d) => sum + (PLAN_PRICES[d.subscriptionPlan] || 0), 0);

  return (
    <div className="page">
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-sub">Monitor doctor subscription plans and revenue</p>
        </div>
        <div className="revenue-badge">
          <span className="rev-val">PKR {totalRevenue.toLocaleString()}</span>
          <span className="rev-label">Monthly Revenue</span>
        </div>
      </div>

      {/* Plan Summary Cards */}
      <div className="plan-summary">
        {(['free_trial','basic','professional','premium']).map(plan => (
          <div
            key={plan}
            className={`plan-card ${planFilter === plan ? 'active' : ''}`}
            onClick={() => setPlanFilter(planFilter === plan ? 'all' : plan)}
          >
            <div className="plan-chip" style={planColors[plan]}>{plan.replace('_', ' ')}</div>
            <div className="plan-card-info">
              <div className="plan-count">{counts[plan]}</div>
              <div className="plan-label">doctors</div>
              <div className="plan-price">PKR {PLAN_PRICES[plan].toLocaleString()}/mo</div>
            </div>
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
          <div className="loading-state"><div className="spinner" /><p>Loading subscriptions...</p></div>
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
                <th>Email</th>
                <th>Current Plan</th>
                <th>Monthly Fee</th>
                <th>History</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doctor => (
                <tr key={doctor._id} className="table-row">
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="doctor-name">{doctor.fullName}</span>
                      <MentorLevelBadge level={mentorLevels[doctor._id]} size="sm" />
                    </div>
                  </td>
                  <td><span className="doctor-email">{doctor.email}</span></td>
                  <td>
                    <span className="plan-badge" style={planColors[doctor.subscriptionPlan] || planColors.free_trial}>
                      {doctor.subscriptionPlan?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className="fee">
                      PKR {(PLAN_PRICES[doctor.subscriptionPlan] || 0).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <button className="btn-history" onClick={() => openDoctor(doctor)}>
                      View History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Subscription History Modal */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 className="modal-title">{selected.fullName}</h2>
                  <MentorLevelBadge level={mentorLevels[selected._id]} size="md" />
                </div>
                <p className="modal-sub">Subscription History</p>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              {subLoading ? (
                <div className="modal-loading"><div className="spinner" /><p>Loading...</p></div>
              ) : subHistory.length === 0 ? (
                <div className="empty-state small">
                  <div className="empty-icon">📋</div>
                  <p>No subscription history</p>
                </div>
              ) : (
                <div className="sub-list">
                  {subHistory.map(sub => (
                    <div key={sub._id} className="sub-item">
                      <div className="sub-top">
                        <span className="plan-badge" style={planColors[sub.plan] || planColors.free_trial}>
                          {sub.plan?.replace('_', ' ')}
                        </span>
                        <span className="status-badge" style={statusColors[sub.status] || statusColors.active}>
                          {sub.status}
                        </span>
                      </div>
                      <div className="sub-dates">
                        <span>📅 {new Date(sub.startDate).toLocaleDateString()} → {new Date(sub.endDate).toLocaleDateString()}</span>
                        <span className="sub-price">PKR {sub.pricePKR?.toLocaleString()}</span>
                      </div>
                      {sub.stripePaymentIntentId && (
                        <div className="sub-intent">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                          <span className="sub-intent-label">Payment Intent</span>
                          <code className="sub-intent-id">{sub.stripePaymentIntentId}</code>
                        </div>
                      )}
                      {sub.cancelReason && (
                        <div className="sub-cancel-reason">Cancel reason: {sub.cancelReason}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

        .page-header { display: flex; align-items: center; justify-content: space-between; }
        .page-title  { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .page-sub    { font-size: 13px; color: #888; margin-top: 4px; }
        .revenue-badge {
          background: #fff; border: 1px solid #E0E4FF; border-radius: 14px;
          padding: 14px 22px; text-align: center;
        }
        .rev-val   { display: block; font-size: 22px; font-weight: 800; color: #059669; }
        .rev-label { display: block; font-size: 11px; color: #888; margin-top: 2px; }

        .plan-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .plan-card {
          background: #fff; border-radius: 12px; padding: 12px 16px;
          border: 2px solid #E0E4FF; cursor: pointer;
          transition: all 0.15s;
          display: flex; align-items: center; gap: 12px;
        }
        .plan-card:hover  { border-color: #6B7FED; }
        .plan-card.active { border-color: #6B7FED; background: #F0F4FF; }
        .plan-chip  { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; text-transform: capitalize; white-space: nowrap; flex-shrink: 0; }
        .plan-card-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .plan-count { font-size: 20px; font-weight: 800; color: #111; line-height: 1; }
        .plan-label { font-size: 10px; color: #888; }
        .plan-price { font-size: 10px; color: #6B7FED; font-weight: 600; margin-top: 2px; }

        .search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #e5e5e5;
          border-radius: 12px; padding: 10px 16px; max-width: 400px;
        }
        .search-wrap input { border: none; outline: none; font-size: 14px; color: #333; background: none; flex: 1; }
        .search-wrap input::placeholder { color: #aaa; }
        .clear-btn { background: none; border: none; cursor: pointer; color: #aaa; font-size: 12px; }

        .table-wrap { background: #fff; border-radius: 16px; border: 1px solid #E0E4FF; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table thead tr { background: #F0F4FF; }
        .table th {
          padding: 13px 20px; text-align: left;
          font-size: 11px; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid #E0E4FF;
        }
        .table-row { border-bottom: 1px solid #EEF1FF; transition: background 0.12s; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover { background: #F5F7FF; }
        .table td { padding: 14px 20px; vertical-align: middle; }

        .doctor-name  { font-size: 14px; font-weight: 600; color: #111; }
        .doctor-email { font-size: 12px; color: #888; }
        .plan-badge   { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: capitalize; }
        .status-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: capitalize; }
        .fee { font-size: 13px; font-weight: 600; color: #059669; }
        .btn-history {
          padding: 6px 14px; border-radius: 8px;
          background: #EEF1FF; color: #6B7FED;
          border: 1px solid #E0E4FF; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-history:hover { background: #6B7FED; color: #fff; }

        .loading-state, .empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 60px 20px; gap: 12px; color: #888;
        }
        .empty-state.small { padding: 30px 20px; }
        .empty-icon { font-size: 40px; }
        .empty-state p { font-size: 15px; font-weight: 600; color: #444; }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid #E0E4FF; border-top-color: #6B7FED;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }
        .modal {
          background: #fff; border-radius: 20px;
          width: 100%; max-width: 520px; max-height: 80vh;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid #E0E4FF;
          background: linear-gradient(135deg, #6B7FED 0%, #7B8CDE 100%);
        }
        .modal-title { font-size: 16px; font-weight: 700; color: #fff; }
        .modal-sub   { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 3px; }
        .modal-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,0.2); border: none; cursor: pointer; font-size: 13px; color: #fff;
        }
        .modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
        .modal-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: #888; }

        .sub-list { display: flex; flex-direction: column; gap: 10px; }
        .sub-item { background: #F0F4FF; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
        .sub-top  { display: flex; align-items: center; gap: 8px; }
        .sub-dates { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #666; }
        .sub-price { font-size: 13px; font-weight: 700; color: #059669; }
        .sub-cancel-reason { font-size: 12px; color: #dc2626; background: #fee2e2; border-radius: 8px; padding: 6px 10px; }
        .sub-intent { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #E0E4FF; border-radius: 8px; padding: 7px 10px; }
        .sub-intent-label { font-size: 11px; font-weight: 600; color: #888; white-space: nowrap; }
        .sub-intent-id { font-size: 11px; font-family: monospace; color: #4051b5; word-break: break-all; }
      `}</style>
    </div>
  );
}
