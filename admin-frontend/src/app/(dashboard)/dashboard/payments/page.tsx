'use client';

import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000/api';

interface AdminWallet {
  totalBalance: number;
  totalEarned: number;
  totalCommission: number;
  totalTransactions: number;
  currency: string;
}

interface Transaction {
  _id: string;
  doctorId?: { fullName: string } | string;
  userId?:   { fullName: string } | string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
  commissionAmount?: number;
  commissionRate?: number;
  doctorEarning?: number;
  description?: string;
}

interface HeldAppointment {
  _id: string;
  userId:   { _id: string; fullName: string; email: string } | string;
  doctorId: { _id: string; fullName: string; email: string } | string;
  date: string;
  time: string;
  sessionDuration: number;
  consultationFee: number;
  heldAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

type ActiveTab = 'overview' | 'held' | 'transactions';

export default function PaymentsPage() {
  const [wallet, setWallet]             = useState<AdminWallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [heldPayments, setHeldPayments] = useState<HeldAppointment[]>([]);
  const [totalHeld, setTotalHeld]       = useState(0);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<ActiveTab>('overview');
  const [toast, setToast]               = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    Promise.all([
      fetch(`${BASE_URL}/payment/admin/wallet`).then(r => r.json()),
      fetch(`${BASE_URL}/payment/admin/transactions`).then(r => r.json()),
      fetch(`${BASE_URL}/payment/admin/held`).then(r => r.json()).catch(() => ({ appointments: [], totalHeld: 0 })),
    ]).then(([walletData, txData, heldData]) => {
      setWallet(walletData.data || walletData);
      setTransactions(txData.data || txData.transactions || txData || []);
      setHeldPayments(heldData.appointments || []);
      setTotalHeld(heldData.totalHeld || 0);
    }).catch(() => showToast('Failed to load payment data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const getName = (ref: any) => {
    if (!ref) return '—';
    if (typeof ref === 'string') return ref;
    return ref.fullName || '—';
  };

  const fmt = (n: number) => `PKR ${(n || 0).toLocaleString()}`;

  const txTypeColor: Record<string, { background: string; color: string }> = {
    subscription_payment:   { background: '#EEF1FF', color: '#6B7FED' },
    appointment_payment:    { background: '#dbeafe', color: '#1d4ed8' },
    appointment_release:    { background: '#d1fae5', color: '#059669' },
    appointment_commission: { background: '#fef3c7', color: '#d97706' },
  };

  return (
    <div className="page">
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-sub">Admin wallet, held amounts and transaction history</p>
        </div>
        <div className="currency-badge">🇵🇰 PKR</div>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /><p>Loading payment data...</p></div>
      ) : (
        <>
          {/* Wallet Cards */}
          <div className="wallet-grid">
            <div className="wallet-card">
              <div className="wallet-icon" style={{ background: '#EEF1FF', color: '#6B7FED' }}>💳</div>
              <div className="wallet-value" style={{ color: '#6B7FED' }}>{fmt(wallet?.totalBalance || 0)}</div>
              <div className="wallet-label">Total Balance</div>
              <div className="wallet-sub">Current admin wallet balance</div>
            </div>
            <div className="wallet-card highlight">
              <div className="wallet-icon" style={{ background: '#fef3c7', color: '#d97706' }}>⏳</div>
              <div className="wallet-value" style={{ color: '#d97706' }}>{fmt(totalHeld)}</div>
              <div className="wallet-label">Currently Held</div>
              <div className="wallet-sub">{heldPayments.length} appointments pending release</div>
            </div>
            <div className="wallet-card">
              <div className="wallet-icon" style={{ background: '#d1fae5', color: '#059669' }}>📈</div>
              <div className="wallet-value" style={{ color: '#059669' }}>{fmt(wallet?.totalEarned || 0)}</div>
              <div className="wallet-label">Total Earned</div>
              <div className="wallet-sub">Cumulative earnings</div>
            </div>
            <div className="wallet-card">
              <div className="wallet-icon" style={{ background: '#fce7f3', color: '#db2777' }}>💰</div>
              <div className="wallet-value" style={{ color: '#db2777' }}>{fmt(wallet?.totalCommission || 0)}</div>
              <div className="wallet-label">Total Commission</div>
              <div className="wallet-sub">From all appointments</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              📊 Overview
            </button>
            <button className={`tab ${activeTab === 'held' ? 'active' : ''}`} onClick={() => setActiveTab('held')}>
              ⏳ Held Amounts
              {heldPayments.length > 0 && <span className="tab-badge">{heldPayments.length}</span>}
            </button>
            <button className={`tab ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
              🔄 Transactions
              <span className="tab-count">{transactions.length}</span>
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-grid">
              <div className="flow-card">
                <h3 className="section-title">Payment Flow</h3>
                <div className="flow-steps">
                  <div className="flow-step">
                    <div className="flow-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>👤</div>
                    <div className="flow-info">
                      <div className="flow-label">Patient Pays</div>
                      <div className="flow-desc">Full consultation fee paid via Stripe card</div>
                    </div>
                  </div>
                  <div className="flow-arrow">↓</div>
                  <div className="flow-step">
                    <div className="flow-icon" style={{ background: '#fef3c7', color: '#d97706' }}>🏦</div>
                    <div className="flow-info">
                      <div className="flow-label">Admin Holds Amount</div>
                      <div className="flow-desc">Full fee held in admin wallet until session completes</div>
                    </div>
                  </div>
                  <div className="flow-arrow">↓</div>
                  <div className="flow-step">
                    <div className="flow-icon" style={{ background: '#d1fae5', color: '#059669' }}>✅</div>
                    <div className="flow-info">
                      <div className="flow-label">Session Completes → Released</div>
                      <div className="flow-desc">Doctor earning sent to doctor wallet, commission kept by admin</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="commission-card">
                <h3 className="section-title">Commission Rates by Plan</h3>
                <table className="commission-table">
                  <thead>
                    <tr>
                      <th>Fee Range (PKR)</th>
                      <th>Basic / Free</th>
                      <th>Professional</th>
                      <th>Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>500 – 800</td>
                      <td><span className="rate high">10%</span></td>
                      <td><span className="rate mid">8%</span></td>
                      <td><span className="rate low">7%</span></td>
                    </tr>
                    <tr>
                      <td>801 – 1200</td>
                      <td><span className="rate high">15%</span></td>
                      <td><span className="rate mid">13%</span></td>
                      <td><span className="rate low">12%</span></td>
                    </tr>
                    <tr>
                      <td>1201 – 2000</td>
                      <td><span className="rate high">20%</span></td>
                      <td><span className="rate mid">18%</span></td>
                      <td><span className="rate low">17%</span></td>
                    </tr>
                  </tbody>
                </table>
                <p className="commission-note">💡 Higher plans = lower commission = more earnings for doctors</p>
              </div>
            </div>
          )}

          {/* Held Amounts Tab */}
          {activeTab === 'held' && (
            <div className="table-wrap">
              {heldPayments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <p>No held payments</p>
                  <span>All payments have been released to doctors</span>
                </div>
              ) : (
                <>
                  <div className="held-banner">
                    <span>⏳ <strong>{heldPayments.length}</strong> appointments awaiting release</span>
                    <span className="held-total-txt">Total held: <strong>{fmt(totalHeld)}</strong></span>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Date & Time</th>
                        <th>Duration</th>
                        <th>Consultation Fee</th>
                        <th>Held Amount</th>
                        <th>Appt Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heldPayments.map(apt => (
                        <tr key={apt._id} className="table-row">
                          <td>
                            <div className="person-cell">
                              <div className="person-name">{getName(apt.userId)}</div>
                              <div className="person-email">{typeof apt.userId === 'object' ? (apt.userId as any).email : ''}</div>
                            </div>
                          </td>
                          <td>
                            <div className="person-cell">
                              <div className="person-name">Dr. {getName(apt.doctorId)}</div>
                              <div className="person-email">{typeof apt.doctorId === 'object' ? (apt.doctorId as any).email : ''}</div>
                            </div>
                          </td>
                          <td>
                            <div className="date-cell">
                              <span className="d-date">{apt.date}</span>
                              <span className="d-time">{apt.time}</span>
                            </div>
                          </td>
                          <td><span className="session">{apt.sessionDuration} min</span></td>
                          <td><span className="fee">PKR {apt.consultationFee?.toLocaleString()}</span></td>
                          <td><span className="held-chip">⏳ PKR {apt.heldAmount?.toLocaleString()}</span></td>
                          <td>
                            <span className="status-chip" style={
                              apt.status === 'confirmed' ? { background: '#dbeafe', color: '#1d4ed8' } :
                              apt.status === 'completed' ? { background: '#d1fae5', color: '#059669' } :
                              { background: '#fef3c7', color: '#d97706' }
                            }>
                              {apt.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="table-wrap">
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💸</div>
                  <p>No transactions yet</p>
                  <span>Transactions will appear here once payments are processed</span>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Doctor</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Commission</th>
                      <th>Doctor Earning</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx._id} className="table-row">
                        <td>
                          <span className="type-chip" style={txTypeColor[tx.type] || { background: '#f3f4f8', color: '#666' }}>
                            {tx.type?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td><span className="t-name">Dr. {getName(tx.doctorId)}</span></td>
                        <td><span className="t-desc">{tx.description || '—'}</span></td>
                        <td><span className="t-amount">PKR {(tx.amount || 0).toLocaleString()}</span></td>
                        <td>
                          <span className="t-commission">
                            {tx.commissionAmount ? `PKR ${tx.commissionAmount.toLocaleString()}` : '—'}
                            {tx.commissionRate ? ` (${Math.round(tx.commissionRate * 100)}%)` : ''}
                          </span>
                        </td>
                        <td>
                          <span className="t-earning">
                            {tx.doctorEarning ? `PKR ${tx.doctorEarning.toLocaleString()}` : '—'}
                          </span>
                        </td>
                        <td><span className="t-date">{new Date(tx.createdAt).toLocaleDateString()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
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
        .currency-badge { background: #fff; border: 1px solid #f0f0f5; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; color: #333; }

        .wallet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .wallet-card {
          background: #fff; border-radius: 16px; padding: 20px;
          border: 1px solid #f0f0f5; display: flex; flex-direction: column; gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .wallet-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .wallet-card.highlight { border-color: #fde68a; background: #fffbeb; }
        .wallet-icon  { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .wallet-value { font-size: 20px; font-weight: 800; }
        .wallet-label { font-size: 13px; font-weight: 600; color: #333; }
        .wallet-sub   { font-size: 11px; color: #aaa; }

        .tabs { display: flex; gap: 6px; }
        .tab {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 18px; border-radius: 10px;
          border: 1px solid #e5e5e5; background: #fff;
          font-size: 13px; font-weight: 500; color: #666;
          cursor: pointer; transition: all 0.15s;
        }
        .tab:hover  { border-color: #6B7FED; color: #6B7FED; }
        .tab.active { background: #6B7FED; color: #fff; border-color: #6B7FED; }
        .tab-badge { background: #d97706; color: #fff; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 20px; }
        .tab-count { background: rgba(0,0,0,0.08); font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 20px; }
        .tab.active .tab-count { background: rgba(255,255,255,0.25); }
        .tab.active .tab-badge { background: #fde68a; color: #92400e; }

        .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .flow-card, .commission-card { background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #f0f0f5; }
        .section-title { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 16px; }
        .flow-steps { display: flex; flex-direction: column; gap: 4px; }
        .flow-step  { display: flex; align-items: center; gap: 12px; padding: 10px; background: #f8f8fc; border-radius: 10px; }
        .flow-icon  { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .flow-label { font-size: 13px; font-weight: 600; color: #111; }
        .flow-desc  { font-size: 11px; color: #888; margin-top: 2px; }
        .flow-arrow { text-align: center; color: #ccc; font-size: 18px; padding: 2px 0; }

        .commission-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .commission-table th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; border-bottom: 1px solid #f0f0f5; }
        .commission-table td { padding: 10px 12px; font-size: 13px; color: #444; border-bottom: 1px solid #f8f8fc; }
        .commission-table tr:last-child td { border-bottom: none; }
        .rate      { font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 20px; }
        .rate.high { background: #fee2e2; color: #dc2626; }
        .rate.mid  { background: #fef3c7; color: #d97706; }
        .rate.low  { background: #d1fae5; color: #059669; }
        .commission-note { font-size: 12px; color: #888; }

        .held-banner {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; background: #fffbeb;
          border-bottom: 1px solid #fde68a; font-size: 13px; color: #92400e;
        }
        .held-total-txt { font-size: 14px; color: #d97706; }
        .held-chip  { font-size: 12px; font-weight: 700; background: #fef3c7; color: #d97706; padding: 4px 10px; border-radius: 20px; }
        .status-chip { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: capitalize; }

        .table-wrap { background: #fff; border-radius: 16px; border: 1px solid #E0E4FF; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table thead tr { background: #F0F4FF; }
        .table th { padding: 13px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E0E4FF; }
        .table-row { border-bottom: 1px solid #EEF1FF; transition: background 0.12s; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover { background: #F5F7FF; }
        .table td { padding: 13px 16px; vertical-align: middle; }

        .person-cell { display: flex; flex-direction: column; gap: 2px; }
        .person-name  { font-size: 13px; font-weight: 600; color: #111; }
        .person-email { font-size: 11px; color: #888; }
        .date-cell  { display: flex; flex-direction: column; gap: 2px; }
        .d-date  { font-size: 13px; font-weight: 600; color: #111; }
        .d-time  { font-size: 11px; color: #888; }
        .session { font-size: 12px; color: #666; }
        .fee     { font-size: 13px; font-weight: 600; color: #111; }

        .type-chip   { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; text-transform: capitalize; white-space: nowrap; }
        .t-name      { font-size: 13px; font-weight: 600; color: #111; }
        .t-desc      { font-size: 12px; color: #666; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
        .t-amount    { font-size: 13px; font-weight: 700; color: #111; }
        .t-commission{ font-size: 12px; color: #dc2626; font-weight: 600; }
        .t-earning   { font-size: 12px; color: #059669; font-weight: 600; }
        .t-date      { font-size: 12px; color: #888; }

        .loading-state, .empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 60px 20px; gap: 12px; color: #888;
        }
        .empty-icon { font-size: 40px; }
        .empty-state p    { font-size: 15px; font-weight: 600; color: #444; }
        .empty-state span { font-size: 13px; }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid #E0E4FF; border-top-color: #6B7FED;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
