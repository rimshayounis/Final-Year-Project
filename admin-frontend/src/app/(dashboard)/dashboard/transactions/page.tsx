'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/services/auth.service';

type TxType =
  | 'subscription_payment'
  | 'appointment_payment'
  | 'appointment_release'
  | 'appointment_commission'
  | 'withdrawal_requested'
  | 'withdrawal_completed'
  | 'withdrawal_rejected'
  | 'likes_1k' | 'likes_5k' | 'likes_10k'
  | 'likes_1k_reversed' | 'likes_5k_reversed' | 'likes_10k_reversed'
  | 'post_deleted' | 'booking_monthly' | 'trust_badge' | 'wallet_recalculated' | 'points_converted'
  | 'withdrawal_fee';

type TxStatus = 'succeeded' | 'pending' | 'failed' | 'rejected' | 'earned' | 'deducted';

interface Transaction {
  _id: string;
  _source: 'payment' | 'wallet' | 'points';
  type: string;
  doctorId: string;
  doctorName: string;
  userId: string | null;
  appointmentId: string | null;
  plan: string | null;
  description: string;
  amount: number;
  points?: number;
  pkrAmount?: number;
  fee?: number;
  payout?: number;
  trustBadge?: string;
  trustScore?: number;
  totalPoints?: number;
  lifetimePointsEarned?: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
  stripePaymentIntentId: string | null;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

interface Summary {
  total: number;
  totalAmount: number;
  byType: Record<string, number>;
  withdrawalCount: number;
  pointsCount: number;
  grandTotal: number;
  totalCurrentPoints: number;
  totalLifetimeEarned: number;
  transactions: Transaction[];
}

type TypeFilter   = 'all' | TxType | 'withdrawal' | 'points';
type StatusFilter = 'all' | TxStatus;

const TYPE_LABELS: Record<string, string> = {
  subscription_payment:   'Subscription',
  appointment_payment:    'Appointment Payment',
  appointment_release:    'Doctor Payout',
  appointment_commission: 'Commission',
  withdrawal_requested:   'Withdrawal Requested',
  withdrawal_completed:   'Withdrawal Completed',
  withdrawal_rejected:    'Withdrawal Rejected',
  likes_1k:               'Likes 1K',
  likes_5k:               'Likes 5K',
  likes_10k:              'Likes 10K',
  likes_1k_reversed:      'Likes 1K Reversed',
  likes_5k_reversed:      'Likes 5K Reversed',
  likes_10k_reversed:     'Likes 10K Reversed',
  post_deleted:           'Post Deleted',
  booking_monthly:        'Monthly Booking',
  trust_badge:            'Trust Badge',
  points_converted:       'Points → Cash',
  withdrawal_fee:         'Withdrawal Fee',
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  subscription_payment:   { bg: '#EDE9FE', color: '#6D28D9' },
  appointment_payment:    { bg: '#DBEAFE', color: '#1D4ED8' },
  appointment_release:    { bg: '#D1FAE5', color: '#065F46' },
  appointment_commission: { bg: '#FEF3C7', color: '#92400E' },
  withdrawal_requested:   { bg: '#FEE2E2', color: '#991B1B' },
  withdrawal_completed:   { bg: '#D1FAE5', color: '#065F46' },
  withdrawal_rejected:    { bg: '#F3F4F6', color: '#6B7280' },
  likes_1k:               { bg: '#FEF3C7', color: '#92400E' },
  likes_5k:               { bg: '#FDE68A', color: '#78350F' },
  likes_10k:              { bg: '#FCD34D', color: '#451A03' },
  likes_1k_reversed:      { bg: '#F3F4F6', color: '#6B7280' },
  likes_5k_reversed:      { bg: '#F3F4F6', color: '#6B7280' },
  likes_10k_reversed:     { bg: '#F3F4F6', color: '#6B7280' },
  post_deleted:           { bg: '#FEE2E2', color: '#991B1B' },
  booking_monthly:        { bg: '#DBEAFE', color: '#1D4ED8' },
  trust_badge:            { bg: '#F5D0FE', color: '#7E22CE' },
  points_converted:       { bg: '#D1FAE5', color: '#065F46' },
  withdrawal_fee:         { bg: '#FEF3C7', color: '#92400E' },
};

const TRUST_BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  none:     { bg: '#F3F4F6', color: '#6B7280' },
  bronze:   { bg: '#FDE68A', color: '#78350F' },
  silver:   { bg: '#E5E7EB', color: '#374151' },
  gold:     { bg: '#FEF3C7', color: '#92400E' },
  platinum: { bg: '#EDE9FE', color: '#6D28D9' },
};

// Same colors as the mobile app (ProfileScreen.tsx Ionicons shield-checkmark)
const BADGE_ICON_COLOR: Record<string, string> = {
  platinum: '#7B1FA2',
  gold:     '#F9A825',
  silver:   '#78909C',
  bronze:   '#8D6E63',
  none:     '#CCC',
};

function ShieldBadge({ badge, score }: { badge: string; score?: number | null }) {
  const color = BADGE_ICON_COLOR[badge] ?? '#CCC';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
      <svg width="15" height="15" viewBox="0 0 512 512" style={{ flexShrink: 0 }}>
        {/* shield fill */}
        <path
          fill={color}
          d="M256 32L48 152v112c0 131.4 90.4 254.3 208 288 117.6-33.7 208-156.6 208-288V152L256 32z"
        />
        {/* checkmark */}
        <polyline
          points="160,256 220,316 352,184"
          fill="none"
          stroke="white"
          strokeWidth="44"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {score != null && (
        <span style={{ fontSize: 11, color: '#888' }}>Score: {score}</span>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  succeeded: { bg: '#D1FAE5', color: '#065F46' },
  pending:   { bg: '#FEF3C7', color: '#92400E' },
  failed:    { bg: '#FEE2E2', color: '#991B1B' },
  rejected:  { bg: '#F3F4F6', color: '#6B7280' },
  earned:    { bg: '#D1FAE5', color: '#065F46' },
  deducted:  { bg: '#FEE2E2', color: '#991B1B' },
  converted: { bg: '#DBEAFE', color: '#1D4ED8' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const POINTS_GAINED_TYPES = new Set(['likes_1k', 'likes_5k', 'likes_10k', 'booking_monthly']);

const TYPE_FILTER_TABS: { key: TypeFilter; label: string }[] = [
  { key: 'all',                    label: 'All'             },
  { key: 'subscription_payment',   label: 'Subscriptions'   },
  { key: 'appointment_payment',    label: 'Apt. Payments'   },
  { key: 'appointment_release',    label: 'Dr. Payouts'     },
  { key: 'appointment_commission', label: 'Commissions'     },
  { key: 'withdrawal',             label: 'Withdrawals'     },
  { key: 'points',                 label: 'Points & Rewards'},
];

export default function TransactionsPage() {
  const [summary,    setSummary]    = useState<Summary | null>(null);
  // Persist counts so tab badges don't reset when switching tabs
  const [globalByType,          setGlobalByType]          = useState<Record<string, number>>({});
  const [globalWithdrawalCount, setGlobalWithdrawalCount] = useState(0);
  const [globalPointsCount,     setGlobalPointsCount]     = useState(0);
  const [globalGrandTotal,      setGlobalGrandTotal]      = useState(0);
  const [globalCurrentPoints,  setGlobalCurrentPoints]  = useState(0);
  const [globalLifetimeEarned, setGlobalLifetimeEarned] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search,     setSearch]     = useState('');
  const [detail,     setDetail]     = useState<Transaction | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [pointsSubFilter, setPointsSubFilter] = useState<'all' | 'gained' | 'converted' | 'trust_badge'>('all');

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const params: Record<string, string> = {};
      if (typeFilter   !== 'all') params.type   = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/transactions/admin/all', { params });
      const data = res.data?.data ?? null;
      setSummary(data);
      // Always update global counts (backend returns full byType regardless of filter)
      if (data?.byType)                   setGlobalByType(data.byType);
      if (data?.withdrawalCount != null)  setGlobalWithdrawalCount(data.withdrawalCount);
      if (data?.pointsCount     != null)  setGlobalPointsCount(data.pointsCount);
      if (data?.grandTotal        != null)  setGlobalGrandTotal(data.grandTotal);
      if (data?.totalCurrentPoints  != null) setGlobalCurrentPoints(data.totalCurrentPoints);
      if (data?.totalLifetimeEarned != null) setGlobalLifetimeEarned(data.totalLifetimeEarned);
    } catch {
      showToast('Failed to load transactions');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const txs = summary?.transactions ?? [];
    return txs.filter(tx => {
      // Sub-filter when on Points & Rewards tab
      if (typeFilter === 'points' && pointsSubFilter !== 'all') {
        if (pointsSubFilter === 'trust_badge') {
          // Must be a trust_badge type transaction
          if (tx.type !== 'trust_badge') return false;
          // Exclude reversal events — they contain "reversed" or "dropped below" in description
          const desc = (tx.description ?? '').toLowerCase();
          if (desc.includes('reversed') || desc.includes('dropped below')) return false;
        } else if (pointsSubFilter === 'converted') {
          if (tx.type !== 'points_converted') return false;
        } else if (pointsSubFilter === 'gained') {
          if (!POINTS_GAINED_TYPES.has(tx.type)) return false;
        }
      }
      // Search filter
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        tx.doctorName.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q) ||
        (tx.plan ?? '').toLowerCase().includes(q) ||
        (tx.stripePaymentIntentId ?? '').toLowerCase().includes(q)
      );
    });
  }, [summary, typeFilter, pointsSubFilter, search]);

  const totalFiltered = filtered.reduce((s, t) => s + t.amount, 0);
  const totalCashConverted = filtered
    .filter(tx => tx.type === 'points_converted')
    .reduce((s, tx) => s + (tx.pkrAmount ?? 0), 0);
  const isConvertedView = typeFilter === 'points' && pointsSubFilter === 'converted';

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">All financial transactions on the platform</p>
        </div>
        <button
          className={`refresh-btn${refreshing ? ' spinning' : ''}`}
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <span className={refreshing ? 'spin-icon' : ''}>↻</span>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="summary-row">
        <div className="vol-card">
          <span className="vol-label">{isConvertedView ? 'Cash from Conversions' : 'Total Volume'}</span>
          <span className="vol-value">PKR {fmt(isConvertedView ? totalCashConverted : (summary?.totalAmount ?? 0))}</span>
          <span className="vol-sub">{isConvertedView ? 'points converted to PKR' : 'all financial transactions'}</span>
        </div>
        <div className="pts-card">
          <span className="pts-card-label">Reward Points</span>
          <div className="pts-card-body">
            <div className="pts-stat">
              <span className="pts-stat-value">{globalCurrentPoints.toLocaleString()}<span className="pts-unit"> pts</span></span>
              <span className="pts-stat-sub">Current Balance</span>
            </div>
            <div className="pts-divider" />
            <div className="pts-stat">
              <span className="pts-stat-value lifetime">{globalLifetimeEarned.toLocaleString()}<span className="pts-unit"> pts</span></span>
              <span className="pts-stat-sub">Lifetime Earned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar — all controls in one line */}
      <div className="toolbar">
        {TYPE_FILTER_TABS.map(t => (
          <button
            key={t.key}
            className={`tab ${typeFilter === t.key ? 'active' : ''}`}
            onClick={() => { setTypeFilter(t.key); setPointsSubFilter('all'); }}
          >
            {t.label}
            <span className="tab-count">
              {t.key === 'all'        ? globalGrandTotal
                : t.key === 'withdrawal' ? globalWithdrawalCount
                : t.key === 'points'     ? globalPointsCount
                : (globalByType[t.key] ?? 0)}
            </span>
          </button>
        ))}

        {/* Points sub-filter — only visible when Points & Rewards tab is active */}
        {typeFilter === 'points' && (
          <select
            className="status-select"
            value={pointsSubFilter}
            onChange={e => setPointsSubFilter(e.target.value as typeof pointsSubFilter)}
          >
            <option value="all">All Points</option>
            <option value="gained">Points Gained</option>
            <option value="converted">Points → Cash</option>
            <option value="trust_badge">Trust Badge</option>
          </select>
        )}

        {/* Status filter — hidden on points tab */}
        {typeFilter !== 'points' && (
          <select
            className="status-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All Status</option>
            <option value="succeeded">Succeeded</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        )}

        <input
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search doctor, description…"
        />
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading transactions…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <p>{search ? 'No results found.' : 'No transactions yet.'}</p>
            <span>{search ? 'Try a different search term.' : 'Transactions will appear here once they occur.'}</span>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  {['Type', 'Doctor', 'Description', 'Amount', 'Commission', 'Status', 'Date', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => {
                  const typeStyle   = TYPE_COLORS[tx.type]   ?? { bg: '#F3F4F6', color: '#374151' };
                  const statusStyle = STATUS_COLORS[tx.status] ?? { bg: '#F3F4F6', color: '#374151' };
                  return (
                    <tr key={tx._id} className="table-row">
                      <td>
                        <span className="chip" style={typeStyle}>
                          {TYPE_LABELS[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td>
                        <div className="doctor-name">{tx.doctorName || '—'}</div>
                        {tx.plan && <div className="sub-text">{tx.plan}</div>}
                      </td>
                      <td>
                        <div className="desc-text">{tx.description}</div>
                      </td>
                      <td>
                        {tx._source === 'points' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span className={tx.amount >= 0 ? 'earning-text' : 'commission-text'}>
                              {tx.amount >= 0 ? '+' : ''}{tx.amount} pts
                            </span>
                            {tx.trustBadge && tx.trustBadge !== 'none' && (
                              <ShieldBadge badge={tx.trustBadge} score={tx.trustScore} />
                            )}
                          </div>
                        ) : (
                          <>
                            <span className="amount-text">PKR {fmt(tx.amount)}</span>
                            {tx.payout != null && (
                              <div className="sub-text">Net: PKR {fmt(tx.payout)}</div>
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        {tx.commissionAmount > 0 ? (
                          <div>
                            <span className="commission-text">PKR {fmt(tx.commissionAmount)}</span>
                            <div className="sub-text">{(tx.commissionRate * 100).toFixed(0)}%</div>
                          </div>
                        ) : tx.fee != null ? (
                          <div>
                            <span className="commission-text">PKR {fmt(tx.fee)}</span>
                            <div className="sub-text">fee</div>
                          </div>
                        ) : (
                          <span className="sub-text">—</span>
                        )}
                      </td>
                      <td>
                        <span className="chip" style={statusStyle}>
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className="date-text">{formatDate(tx.createdAt)}</span>
                      </td>
                      <td>
                        <button className="detail-btn" onClick={() => setDetail(tx)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="table-footer">
              <span>Showing <strong>{filtered.length}</strong> of <strong>{summary?.total ?? 0}</strong> transactions</span>
              <span className="footer-total">Total: PKR {fmt(totalFiltered)}</span>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Transaction Detail</h2>
              <button className="modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Type + Status row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <span className="chip" style={TYPE_COLORS[detail.type] ?? {}}>
                  {TYPE_LABELS[detail.type] ?? detail.type}
                </span>
                <span className="chip" style={STATUS_COLORS[detail.status] ?? {}}>
                  {detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
                </span>
              </div>

              <div className="detail-grid">
                <span className="dk">Doctor</span>
                <span className="dv">{detail.doctorName || '—'}</span>

                <span className="dk">{detail._source === 'points' ? 'Points' : 'Amount'}</span>
                <span className="dv amount-text">
                  {detail._source === 'points'
                    ? `${detail.amount >= 0 ? '+' : ''}${detail.amount} pts`
                    : `PKR ${fmt(detail.amount)}`}
                </span>

                {detail.type === 'points_converted' && detail.pkrAmount != null && <>
                  <span className="dk">PKR Received</span>
                  <span className="dv earning-text">PKR {fmt(detail.pkrAmount)}</span>
                </>}

                {detail._source === 'points' && detail.trustBadge && detail.trustBadge !== 'none' && <>
                  <span className="dk">Trust Badge</span>
                  <span className="dv" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldBadge badge={detail.trustBadge} score={detail.trustScore} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: BADGE_ICON_COLOR[detail.trustBadge] }}>
                      {detail.trustBadge.charAt(0).toUpperCase() + detail.trustBadge.slice(1)}
                    </span>
                  </span>
                </>}

                {detail._source === 'points' && detail.totalPoints != null && <>
                  <span className="dk">Current Points</span>
                  <span className="dv">{detail.totalPoints} pts</span>
                </>}

                {detail._source === 'points' && detail.lifetimePointsEarned != null && <>
                  <span className="dk">Lifetime Earned</span>
                  <span className="dv">{detail.lifetimePointsEarned} pts</span>
                </>}

                {detail.commissionAmount > 0 && <>
                  <span className="dk">Commission</span>
                  <span className="dv commission-text">
                    PKR {fmt(detail.commissionAmount)} ({(detail.commissionRate * 100).toFixed(0)}%)
                  </span>
                </>}

                {detail.plan && <>
                  <span className="dk">Plan</span>
                  <span className="dv">{detail.plan}</span>
                </>}

                <span className="dk">Description</span>
                <span className="dv">{detail.description}</span>

                <span className="dk">Date</span>
                <span className="dv">{formatDate(detail.createdAt)}</span>

                {detail.stripePaymentIntentId && <>
                  <span className="dk">Stripe ID</span>
                  <span className="dv mono">{detail.stripePaymentIntentId}</span>
                </>}

                {detail.appointmentId && <>
                  <span className="dk">{detail._source === 'points' ? 'Post ID' : 'Appointment ID'}</span>
                  <span className="dv mono">{detail.appointmentId}</span>
                </>}
              </div>
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
        .toast.success { background: #D1FAE5; color: #065F46; }
        .toast.error   { background: #FEE2E2; color: #991B1B; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        .page-header  { display: flex; align-items: center; justify-content: space-between; }
        .page-title   { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .page-sub     { font-size: 13px; color: #888; margin-top: 4px; }
        .refresh-btn  {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 10px;
          border: 1px solid #E5E5E5; background: #FFF;
          font-size: 13px; font-weight: 500; color: #555; cursor: pointer;
        }
        .refresh-btn:hover:not(:disabled) { border-color: #6B7FED; color: #6B7FED; }
        .refresh-btn:disabled { opacity: .6; cursor: not-allowed; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-icon { display: inline-block; animation: spin 0.8s linear infinite; }

        .summary-row { display: flex; gap: 16px; }
        .vol-card {
          display: flex; align-items: baseline; gap: 12px; flex: 1;
          background: #FFF; border-radius: 14px; padding: 16px 20px;
          border: 1px solid #E0E4FF;
        }
        .vol-label { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
        .vol-value { font-size: 22px; font-weight: 800; color: #111; white-space: nowrap; }
        .vol-sub   { font-size: 11px; color: #AAA; }

        .pts-card {
          flex: 1; background: #FFF; border-radius: 14px; padding: 14px 20px;
          border: 1px solid #EDE9FE; display: flex; flex-direction: column; gap: 10px;
        }
        .pts-card-label {
          font-size: 12px; font-weight: 600; color: #7C3AED;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .pts-card-body  { display: flex; align-items: center; gap: 0; }
        .pts-stat       { display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .pts-stat-value { font-size: 22px; font-weight: 800; color: #7C3AED; line-height: 1; }
        .pts-stat-value.lifetime { color: #111; }
        .pts-unit       { font-size: 13px; font-weight: 600; }
        .pts-stat-sub   { font-size: 11px; color: #AAA; margin-top: 2px; }
        .pts-divider    { width: 1px; height: 40px; background: #EDE9FE; margin: 0 20px; flex-shrink: 0; }

        .toolbar { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
        .toolbar::-webkit-scrollbar { display: none; }
        .tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .tab {
          display: flex; align-items: center; gap: 4px; flex-shrink: 0;
          padding: 6px 10px; border-radius: 8px;
          border: 1px solid #E5E5E5; background: #FFF;
          font-size: 12px; font-weight: 500; color: #666; cursor: pointer; white-space: nowrap;
        }
        .tab:hover  { border-color: #6B7FED; color: #6B7FED; }
        .tab.active { background: #6B7FED; color: #FFF; border-color: #6B7FED; }
        .tab-count  { background: rgba(0,0,0,0.08); font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 20px; }
        .tab.active .tab-count { background: rgba(255,255,255,0.25); }

        .status-select {
          padding: 6px 10px; border-radius: 8px; border: 1px solid #E5E5E5;
          font-size: 12px; background: #FFF; color: #111; outline: none; cursor: pointer;
          flex-shrink: 0;
        }
        .status-select:focus { border-color: #6B7FED; }

        .search-input {
          padding: 6px 12px; border-radius: 8px; border: 1px solid #E5E5E5;
          font-size: 12px; min-width: 0; flex: 1 1 160px; max-width: 220px;
          background: #FFF; color: #111; outline: none;
        }
        .search-input:focus { border-color: #6B7FED; }

        .table-wrap { background: #FFF; border-radius: 16px; border: 1px solid #E0E4FF; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table thead tr { background: #F0F4FF; }
        .table th {
          padding: 8px 10px; text-align: left;
          font-size: 11px; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid #E0E4FF; white-space: nowrap;
        }
        .table td { padding: 6px 10px; vertical-align: middle; }
        .table-row { border-bottom: 1px solid #EEF1FF; transition: background 0.12s; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover td { background: #F5F7FF; }

        .chip { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
        .doctor-name  { font-size: 12px; font-weight: 600; color: #111; white-space: nowrap; max-width: 130px; overflow: hidden; text-overflow: ellipsis; }
        .sub-text     { font-size: 10px; color: #AAA; margin-top: 0; }
        .desc-text    { font-size: 12px; color: #555; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .amount-text  { font-size: 12px; font-weight: 700; color: #111; white-space: nowrap; }
        .earning-text { font-size: 12px; font-weight: 600; color: #059669; white-space: nowrap; }
        .commission-text { font-size: 12px; font-weight: 600; color: #D97706; white-space: nowrap; }
        .date-text    { font-size: 11px; color: #888; white-space: nowrap; }
        .detail-btn {
          padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
          border: 1px solid #E0E4FF; background: #FFF; color: #6B7FED; cursor: pointer;
        }
        .detail-btn:hover { background: #EEF1FF; }

        .table-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 11px 16px; border-top: 1px solid #EEF1FF;
          font-size: 12px; color: #888;
        }
        .footer-total { font-weight: 700; color: #111; }

        .loading-state, .empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 64px 20px; gap: 12px; color: #888;
        }
        .empty-icon { font-size: 40px; }
        .empty-state p    { font-size: 15px; font-weight: 600; color: #444; margin: 0; }
        .empty-state span { font-size: 13px; }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid #E0E4FF; border-top-color: #6B7FED;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
        }
        .modal {
          background: #FFF; border-radius: 18px; width: 480px; max-width: 95vw;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid #F0F0F5;
        }
        .modal-title  { font-size: 16px; font-weight: 800; color: #111; margin: 0; }
        .modal-close  {
          background: none; border: none; font-size: 16px; color: #888;
          cursor: pointer; padding: 4px 8px; border-radius: 6px;
        }
        .modal-close:hover { background: #F3F4F6; }
        .modal-body { padding: 20px 24px; }

        .detail-grid { display: grid; grid-template-columns: 140px 1fr; gap: 10px 16px; align-items: start; }
        .dk { font-size: 12px; color: #888; font-weight: 500; padding-top: 1px; }
        .dv { font-size: 13px; font-weight: 600; color: #111; }
        .mono { font-family: monospace; font-size: 11px; word-break: break-all; }
      `}</style>
    </div>
  );
}
