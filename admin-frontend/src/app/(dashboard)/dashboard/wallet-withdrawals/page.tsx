'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/services/auth.service';

interface Withdrawal {
  txId: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  doctorPhoto: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  amount: number;
  fee: number;
  payout: number;
  status: 'pending' | 'succeeded' | 'rejected';
  createdAt: string;
}

type FilterTab = 'all' | 'pending' | 'succeeded' | 'rejected';

const MAIN_API = process.env.NEXT_PUBLIC_MAIN_API_URL || 'http://localhost:3000';

function resolvePhoto(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${MAIN_API}${url}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#6B7FED', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];
function avatarBg(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function Avatar({ name, photo, size = 36 }: { name: string; photo: string | null; size?: number }) {
  const src = resolvePhoto(photo);
  if (src) {
    return (
      <img src={src} alt={name} style={{
        width: size, height: size, borderRadius: '50%',
        objectFit: 'cover', flexShrink: 0, border: '2px solid #E0E4FF',
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: avatarBg(name), color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, letterSpacing: 0.3,
    }}>
      {getInitials(name)}
    </div>
  );
}

export default function WalletWithdrawalsPage() {
  const [withdrawals, setWithdrawals]   = useState<Withdrawal[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [tab, setTab]                   = useState<FilterTab>('all');
  const [search, setSearch]             = useState('');
  const [actionId, setActionId]         = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    txId: string; doctorId: string; action: 'succeeded' | 'rejected';
    doctorName: string; doctorPhoto: string | null; amount: number;
    bankName: string | null; accountName: string | null; accountNumber: string | null;
  } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchWithdrawals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await api.get('/wallet/admin/withdrawals');
      setWithdrawals(res.data?.data ?? []);
    } catch {
      showToast('Failed to load withdrawals', 'error');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

  const handleAction = async (txId: string, doctorId: string, status: 'succeeded' | 'rejected') => {
    setActionId(txId);
    try {
      await api.patch(`/wallet/${doctorId}/withdrawal/${txId}/status`, { status });
      showToast(status === 'succeeded' ? 'Withdrawal approved successfully.' : 'Withdrawal rejected — balance restored.');
      setConfirmModal(null);
      await fetchWithdrawals(true);
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionId(null);
    }
  };

  const pending       = withdrawals.filter(w => w.status === 'pending');
  const succeeded     = withdrawals.filter(w => w.status === 'succeeded');
  const rejected      = withdrawals.filter(w => w.status === 'rejected');
  const pendingAmount = pending.reduce((s, w) => s + w.payout, 0);

  const filtered = withdrawals
    .filter(w => tab === 'all' || w.status === tab)
    .filter(w =>
      !search ||
      w.doctorName.toLowerCase().includes(search.toLowerCase()) ||
      w.doctorEmail.toLowerCase().includes(search.toLowerCase()) ||
      (w.bankName ?? '').toLowerCase().includes(search.toLowerCase()),
    );

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',       label: 'All Requests', count: withdrawals.length },
    { key: 'pending',   label: 'Pending',       count: pending.length     },
    { key: 'succeeded', label: 'Succeeded',     count: succeeded.length   },
    { key: 'rejected',  label: 'Rejected',      count: rejected.length    },
  ];

  const STATS = [
    { label: 'Total Requests',     value: withdrawals.length,    sub: 'all time'        },
    { label: 'Awaiting Action',    value: pending.length,        sub: 'need review'     },
    { label: 'Amount to Disburse', value: `PKR ${pendingAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, sub: 'net after 2% fee' },
    { label: 'Completed',          value: succeeded.length,      sub: 'processed'       },
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
          <h1 className="page-title">Wallet Withdrawals</h1>
          <p className="page-sub">Review and process doctor withdrawal requests</p>
        </div>
        <button className={`refresh-btn${refreshing ? ' spinning' : ''}`} onClick={() => fetchWithdrawals(true)} disabled={refreshing}>
          <span className={refreshing ? 'spin-icon' : ''}>↻</span>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="wallet-grid">
        {STATS.map(s => (
          <div key={s.label} className="wallet-card">
            <div className="wallet-label">{s.label}</div>
            <div className="wallet-value">{s.value}</div>
            <div className="wallet-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="toolbar">
        <div className="tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="tab-count">{t.count}</span>
            </button>
          ))}
        </div>
        <input
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search doctor or bank…"
        />
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading withdrawal requests…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏦</div>
            <p>{search ? 'No results found.' : 'No withdrawal requests yet.'}</p>
            <span>{search ? 'Try a different search term or filter.' : 'Requests will appear here once doctors submit them.'}</span>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  {['Doctor', 'Bank Details', 'Requested', 'Fee (2%)', 'Net Payout', 'Date', 'Status', 'Actions'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((w, i) => (
                  <tr key={w.txId ?? `${w.doctorId}-${i}`} className="table-row">

                    {/* Doctor */}
                    <td>
                      <div className="person-cell">
                        <Avatar name={w.doctorName} photo={w.doctorPhoto} />
                        <div>
                          <div className="person-name">{w.doctorName}</div>
                          <div className="person-email">{w.doctorEmail}</div>
                        </div>
                      </div>
                    </td>

                    {/* Bank */}
                    <td>
                      {w.bankName ? (
                        <div>
                          <div className="person-name">{w.bankName}</div>
                          <div className="acct-num">{w.accountNumber}</div>
                          <div className="person-email">{w.accountName}</div>
                        </div>
                      ) : (
                        <span className="status-chip" style={{ background: '#fee2e2', color: '#dc2626' }}>No bank linked</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td><span className="t-amount">PKR {w.amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span></td>

                    {/* Fee */}
                    <td><span className="t-commission">− PKR {w.fee.toFixed(2)}</span></td>

                    {/* Payout */}
                    <td><span className="t-earning">PKR {w.payout.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span></td>

                    {/* Date */}
                    <td><span className="t-date">{formatDate(w.createdAt)}</span></td>

                    {/* Status */}
                    <td>
                      <span className="status-chip" style={
                        w.status === 'pending'   ? { background: '#fef3c7', color: '#92400e' } :
                        w.status === 'succeeded' ? { background: '#d1fae5', color: '#065f46' } :
                                                   { background: '#fee2e2', color: '#991b1b' }
                      }>
                        {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      {w.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="action-btn approve"
                            disabled={!!actionId}
                            onClick={() => setConfirmModal({ txId: w.txId, doctorId: w.doctorId, action: 'succeeded', doctorName: w.doctorName, doctorPhoto: w.doctorPhoto, amount: w.amount, bankName: w.bankName, accountName: w.accountName, accountNumber: w.accountNumber })}
                          >
                            Approve
                          </button>
                          <button
                            className="action-btn reject"
                            disabled={!!actionId}
                            onClick={() => setConfirmModal({ txId: w.txId, doctorId: w.doctorId, action: 'rejected', doctorName: w.doctorName, doctorPhoto: w.doctorPhoto, amount: w.amount, bankName: w.bankName, accountName: w.accountName, accountNumber: w.accountNumber })}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="t-date">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="table-footer">
              <span>Showing <strong>{filtered.length}</strong> of <strong>{withdrawals.length}</strong> requests</span>
              {pending.length > 0 && (
                <span style={{ color: '#d97706', fontWeight: 600 }}>⏳ {pending.length} pending review</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">
              {confirmModal.action === 'succeeded' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
            </h2>
            <p className="modal-sub">
              {confirmModal.action === 'succeeded'
                ? "Transfer the net payout to the doctor's bank account."
                : "The requested amount will be returned to the doctor's wallet."}
            </p>

            {/* Doctor row */}
            <div className="modal-section">
              <div className="person-cell">
                <Avatar name={confirmModal.doctorName} photo={confirmModal.doctorPhoto} size={34} />
                <div style={{ flex: 1 }}>
                  <div className="person-name">{confirmModal.doctorName}</div>
                  <div className="person-email">Withdrawal Request</div>
                </div>
                <span className="status-chip" style={{ background: '#fef3c7', color: '#92400e' }}>Pending</span>
              </div>
            </div>

            {/* Bank details */}
            {confirmModal.bankName && (
              <div className="modal-section">
                <div className="modal-section-label">Destination Account</div>
                <div className="detail-grid">
                  <span className="detail-key">Bank</span>
                  <span className="detail-val">{confirmModal.bankName}</span>
                  <span className="detail-key">Account No.</span>
                  <span className="detail-val acct-num">{confirmModal.accountNumber}</span>
                  <span className="detail-key">Account Name</span>
                  <span className="detail-val">{confirmModal.accountName}</span>
                </div>
              </div>
            )}

            {/* Fee breakdown */}
            <div className="modal-section">
              <div className="breakdown-row">
                <span>Requested Amount</span>
                <span>PKR {confirmModal.amount.toFixed(2)}</span>
              </div>
              <div className="breakdown-row">
                <span>Processing Fee (2%)</span>
                <span className="t-commission">− PKR {(confirmModal.amount * 0.02).toFixed(2)}</span>
              </div>
              <div className="breakdown-divider" />
              <div className="breakdown-row total">
                <span>Net Payout to Doctor</span>
                <span className="t-earning">PKR {(confirmModal.amount * 0.98).toFixed(2)}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button
                className={`modal-btn confirm ${confirmModal.action}`}
                onClick={() => handleAction(confirmModal.txId, confirmModal.doctorId, confirmModal.action)}
                disabled={actionId === confirmModal.txId}
              >
                {actionId === confirmModal.txId
                  ? 'Processing…'
                  : confirmModal.action === 'succeeded' ? 'Confirm & Approve' : 'Confirm & Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page { display: flex; flex-direction: column; gap: 24px; position: relative; }

        /* Toast */
        .toast {
          position: fixed; top: 24px; right: 24px; z-index: 9999;
          padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          animation: slideIn 0.3s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .toast.success { background: #d1fae5; color: #065f46; }
        .toast.error   { background: #fee2e2; color: #991b1b; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Header */
        .page-header  { display: flex; align-items: center; justify-content: space-between; }
        .page-title   { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .page-sub     { font-size: 13px; color: #888; margin-top: 4px; }
        .refresh-btn  {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 10px;
          border: 1px solid #e5e5e5; background: #fff;
          font-size: 13px; font-weight: 500; color: #555;
          cursor: pointer; transition: all 0.15s;
        }
        .refresh-btn:hover:not(:disabled) { border-color: #6B7FED; color: #6B7FED; }
        .refresh-btn:disabled { opacity: .6; cursor: not-allowed; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-icon { display: inline-block; animation: spin 0.8s linear infinite; }

        /* Stats */
        .wallet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .wallet-card {
          background: #fff; border-radius: 16px; padding: 20px;
          border: 1px solid #f0f0f5; display: flex; flex-direction: column; gap: 6px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .wallet-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .wallet-label { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .wallet-value { font-size: 22px; font-weight: 800; color: #111; }
        .wallet-sub   { font-size: 11px; color: #aaa; }

        /* Toolbar */
        .toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }

        /* Tabs */
        .tabs { display: flex; gap: 6px; }
        .tab {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 10px;
          border: 1px solid #e5e5e5; background: #fff;
          font-size: 13px; font-weight: 500; color: #666;
          cursor: pointer; transition: all 0.15s;
        }
        .tab:hover  { border-color: #6B7FED; color: #6B7FED; }
        .tab.active { background: #6B7FED; color: #fff; border-color: #6B7FED; }
        .tab-count  { background: rgba(0,0,0,0.08); font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 20px; }
        .tab.active .tab-count { background: rgba(255,255,255,0.25); }

        /* Search */
        .search-input {
          padding: 9px 14px; border-radius: 10px; border: 1px solid #e5e5e5;
          font-size: 13px; width: 240px; background: #fff; color: #111; outline: none;
          transition: border-color 0.15s;
        }
        .search-input:focus { border-color: #6B7FED; }

        /* Table */
        .table-wrap { background: #fff; border-radius: 16px; border: 1px solid #E0E4FF; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table thead tr { background: #F0F4FF; }
        .table th {
          padding: 12px 16px; text-align: left;
          font-size: 11px; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid #E0E4FF; white-space: nowrap;
        }
        .table td { padding: 13px 16px; vertical-align: middle; }
        .table-row { border-bottom: 1px solid #EEF1FF; transition: background 0.12s; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover td { background: #F5F7FF; }

        /* Cells */
        .person-cell  { display: flex; align-items: center; gap: 10px; }
        .person-name  { font-size: 13px; font-weight: 600; color: #111; }
        .person-email { font-size: 11px; color: #888; margin-top: 1px; }
        .acct-num     { font-size: 12px; color: #444; font-family: monospace; letter-spacing: 0.5px; margin-top: 2px; }
        .t-amount     { font-size: 13px; font-weight: 700; color: #111; white-space: nowrap; }
        .t-commission { font-size: 12px; font-weight: 600; color: #dc2626; white-space: nowrap; }
        .t-earning    { font-size: 13px; font-weight: 700; color: #059669; white-space: nowrap; }
        .t-date       { font-size: 12px; color: #888; white-space: nowrap; }
        .status-chip  { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }

        /* Action buttons */
        .action-btn {
          padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: opacity 0.15s; border: none;
        }
        .action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .action-btn.approve { background: #6B7FED; color: #fff; }
        .action-btn.approve:hover:not(:disabled) { opacity: 0.85; }
        .action-btn.reject  { background: #fff; color: #dc2626; border: 1px solid #fca5a5; }
        .action-btn.reject:hover:not(:disabled)  { background: #fee2e2; }

        /* Footer */
        .table-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 11px 16px; border-top: 1px solid #EEF1FF;
          font-size: 12px; color: #888;
        }

        /* Loading / Empty */
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
          animation: fadeIn .2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal {
          background: #fff; border-radius: 18px; padding: 28px; width: 460px; max-width: 95vw;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: slideUp .2s ease;
        }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-title  { font-size: 17px; font-weight: 800; color: #111; margin: 0 0 4px; }
        .modal-sub    { font-size: 13px; color: #888; margin: 0 0 18px; }
        .modal-section {
          background: #f8f8fc; border-radius: 12px; padding: 13px 14px;
          margin-bottom: 12px; border: 1px solid #f0f0f5;
        }
        .modal-section-label { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .detail-grid { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; align-items: center; }
        .detail-key  { font-size: 12px; color: #888; }
        .detail-val  { font-size: 12px; font-weight: 600; color: #111; text-align: right; }
        .breakdown-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #555; margin-bottom: 8px; }
        .breakdown-row.total { font-weight: 700; color: #111; margin-bottom: 0; }
        .breakdown-divider { height: 1px; background: #e5e5e5; margin: 8px 0; }
        .modal-actions { display: flex; gap: 10px; margin-top: 20px; }
        .modal-btn {
          flex: 1; padding: 11px 0; border-radius: 10px; font-size: 13px;
          font-weight: 700; cursor: pointer; transition: opacity 0.15s; border: none;
        }
        .modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .modal-btn.cancel  { background: #fff; color: #555; border: 1px solid #e5e5e5; flex: 0.8; }
        .modal-btn.cancel:hover  { border-color: #aaa; }
        .modal-btn.succeeded { background: #6B7FED; color: #fff; flex: 1.2; }
        .modal-btn.succeeded:hover:not(:disabled) { opacity: 0.88; }
        .modal-btn.rejected  { background: #dc2626; color: #fff; flex: 1.2; }
        .modal-btn.rejected:hover:not(:disabled)  { opacity: 0.88; }
      `}</style>
    </div>
  );
}
