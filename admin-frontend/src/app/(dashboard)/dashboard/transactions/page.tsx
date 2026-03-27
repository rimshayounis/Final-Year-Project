'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/services/auth.service';

type TxType =
  | 'subscription_payment'
  | 'appointment_payment'
  | 'appointment_release'
  | 'appointment_commission'
  | 'withdrawal_requested'
  | 'withdrawal_completed'
  | 'withdrawal_rejected';

type TxStatus = 'succeeded' | 'pending' | 'failed' | 'rejected';

interface Transaction {
  _id: string;
  _source: 'payment' | 'wallet';
  type: TxType;
  doctorId: string;
  doctorName: string;
  userId: string | null;
  appointmentId: string | null;
  plan: string | null;
  description: string;
  amount: number;
  fee?: number;
  payout?: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
  stripePaymentIntentId: string | null;
  status: TxStatus;
  paymentMethod: string;
  createdAt: string;
}

interface Summary {
  total: number;
  totalAmount: number;
  byType: Record<string, number>;
  withdrawalCount: number;
  transactions: Transaction[];
}

type TypeFilter   = 'all' | TxType | 'withdrawal';
type StatusFilter = 'all' | TxStatus;

const TYPE_LABELS: Record<string, string> = {
  subscription_payment:   'Subscription',
  appointment_payment:    'Appointment Payment',
  appointment_release:    'Doctor Payout',
  appointment_commission: 'Commission',
  withdrawal_requested:   'Withdrawal Requested',
  withdrawal_completed:   'Withdrawal Completed',
  withdrawal_rejected:    'Withdrawal Rejected',
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  subscription_payment:   { bg: '#EDE9FE', color: '#6D28D9' },
  appointment_payment:    { bg: '#DBEAFE', color: '#1D4ED8' },
  appointment_release:    { bg: '#D1FAE5', color: '#065F46' },
  appointment_commission: { bg: '#FEF3C7', color: '#92400E' },
  withdrawal_requested:   { bg: '#FEE2E2', color: '#991B1B' },
  withdrawal_completed:   { bg: '#D1FAE5', color: '#065F46' },
  withdrawal_rejected:    { bg: '#F3F4F6', color: '#6B7280' },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  succeeded: { bg: '#D1FAE5', color: '#065F46' },
  pending:   { bg: '#FEF3C7', color: '#92400E' },
  failed:    { bg: '#FEE2E2', color: '#991B1B' },
  rejected:  { bg: '#F3F4F6', color: '#6B7280' },
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

const TYPE_FILTER_TABS: { key: TypeFilter; label: string }[] = [
  { key: 'all',                    label: 'All'          },
  { key: 'subscription_payment',   label: 'Subscriptions'},
  { key: 'appointment_payment',    label: 'Apt. Payments'},
  { key: 'appointment_release',    label: 'Dr. Payouts'  },
  { key: 'appointment_commission', label: 'Commissions'  },
  { key: 'withdrawal',             label: 'Withdrawals'  },
];

export default function TransactionsPage() {
  const [summary,    setSummary]    = useState<Summary | null>(null);
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

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const params: Record<string, string> = {};
      if (typeFilter   !== 'all') params.type   = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/transactions/admin/all', { params });
      setSummary(res.data?.data ?? null);
    } catch {
      showToast('Failed to load transactions');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = (summary?.transactions ?? []).filter(tx => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      tx.doctorName.toLowerCase().includes(q) ||
      tx.description.toLowerCase().includes(q) ||
      (tx.plan ?? '').toLowerCase().includes(q) ||
      (tx.stripePaymentIntentId ?? '').toLowerCase().includes(q)
    );
  });

  const totalFiltered = filtered.reduce((s, t) => s + t.amount, 0);

  const STATS = [
    { label: 'Total Transactions', value: summary?.total ?? 0,                                      sub: 'all time'         },
    { label: 'Total Volume',       value: `PKR ${fmt(summary?.totalAmount ?? 0)}`,                  sub: 'all types'        },
    { label: 'Subscriptions',      value: summary?.byType?.subscription_payment   ?? 0,             sub: 'plan purchases'   },
    { label: 'Commissions',        value: summary?.byType?.appointment_commission ?? 0,             sub: 'from appointments' },
    { label: 'Withdrawals',        value: summary?.withdrawalCount ?? 0,                            sub: 'doctor payouts'   },
  ];

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

      {/* Stats */}
      <div className="stats-grid">
        {STATS.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Type tabs */}
      <div className="toolbar">
        <div className="tabs">
          {TYPE_FILTER_TABS.map(t => (
            <button
              key={t.key}
              className={`tab ${typeFilter === t.key ? 'active' : ''}`}
              onClick={() => setTypeFilter(t.key)}
            >
              {t.label}
              {t.key !== 'all' && (
                <span className="tab-count">
                  {t.key === 'withdrawal'
                    ? (summary?.withdrawalCount ?? 0)
                    : (summary?.byType?.[t.key] ?? 0)}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Status filter */}
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

          <input
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search doctor, description…"
          />
        </div>
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
                        <span className="amount-text">PKR {fmt(tx.amount)}</span>
                        {tx.fee != null && (
                          <div className="sub-text">Fee: PKR {fmt(tx.fee)}</div>
                        )}
                      </td>
                      <td>
                        {tx.payout != null ? (
                          <div>
                            <span className="earning-text">PKR {fmt(tx.payout)}</span>
                            <div className="sub-text">net payout</div>
                          </div>
                        ) : tx.commissionAmount > 0 ? (
                          <div>
                            <span className="commission-text">PKR {fmt(tx.commissionAmount)}</span>
                            <div className="sub-text">{(tx.commissionRate * 100).toFixed(0)}%</div>
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

                <span className="dk">Amount</span>
                <span className="dv amount-text">PKR {fmt(detail.amount)}</span>

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

                <span className="dk">Payment Method</span>
                <span className="dv" style={{ textTransform: 'capitalize' }}>{detail.paymentMethod}</span>

                <span className="dk">Currency</span>
                <span className="dv">{detail.currency}</span>

                <span className="dk">Date</span>
                <span className="dv">{formatDate(detail.createdAt)}</span>

                {detail.stripePaymentIntentId && <>
                  <span className="dk">Stripe ID</span>
                  <span className="dv mono">{detail.stripePaymentIntentId}</span>
                </>}

                {detail.appointmentId && <>
                  <span className="dk">Appointment ID</span>
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

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .stat-card {
          background: #FFF; border-radius: 16px; padding: 20px;
          border: 1px solid #F0F0F5; display: flex; flex-direction: column; gap: 6px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .stat-label { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 22px; font-weight: 800; color: #111; }
        .stat-sub   { font-size: 11px; color: #AAA; }

        .toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .tab {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 10px;
          border: 1px solid #E5E5E5; background: #FFF;
          font-size: 13px; font-weight: 500; color: #666; cursor: pointer;
        }
        .tab:hover  { border-color: #6B7FED; color: #6B7FED; }
        .tab.active { background: #6B7FED; color: #FFF; border-color: #6B7FED; }
        .tab-count  { background: rgba(0,0,0,0.08); font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 20px; }
        .tab.active .tab-count { background: rgba(255,255,255,0.25); }

        .status-select {
          padding: 9px 12px; border-radius: 10px; border: 1px solid #E5E5E5;
          font-size: 13px; background: #FFF; color: #111; outline: none; cursor: pointer;
        }
        .status-select:focus { border-color: #6B7FED; }

        .search-input {
          padding: 9px 14px; border-radius: 10px; border: 1px solid #E5E5E5;
          font-size: 13px; width: 220px; background: #FFF; color: #111; outline: none;
        }
        .search-input:focus { border-color: #6B7FED; }

        .table-wrap { background: #FFF; border-radius: 16px; border: 1px solid #E0E4FF; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table thead tr { background: #F0F4FF; }
        .table th {
          padding: 12px 14px; text-align: left;
          font-size: 11px; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid #E0E4FF; white-space: nowrap;
        }
        .table td { padding: 12px 14px; vertical-align: middle; }
        .table-row { border-bottom: 1px solid #EEF1FF; transition: background 0.12s; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover td { background: #F5F7FF; }

        .chip { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
        .doctor-name  { font-size: 13px; font-weight: 600; color: #111; }
        .sub-text     { font-size: 11px; color: #888; margin-top: 2px; }
        .desc-text    { font-size: 12px; color: #444; max-width: 220px; }
        .amount-text  { font-size: 13px; font-weight: 700; color: #111; white-space: nowrap; }
        .commission-text { font-size: 12px; font-weight: 600; color: #D97706; white-space: nowrap; }
        .date-text    { font-size: 12px; color: #888; white-space: nowrap; }
        .detail-btn {
          padding: 5px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
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
