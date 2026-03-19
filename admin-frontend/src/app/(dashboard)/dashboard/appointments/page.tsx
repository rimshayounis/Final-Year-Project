'use client';

import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000/api';

interface Appointment {
  _id: string;
  userId: { _id: string; fullName: string; email: string } | string;
  doctorId: { _id: string; fullName: string; email: string } | string;
  date: string;
  time: string;
  sessionDuration: number;
  consultationFee: number;
  healthConcern: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: string;
  heldAmount: number;
  doctorEarning: number;
  commissionAmount: number;
  createdAt: string;
  cancelReason?: string;
}

type FilterTab = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

const statusColors: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#fef3c7', color: '#d97706' },
  confirmed: { bg: '#dbeafe', color: '#1d4ed8' },
  completed: { bg: '#d1fae5', color: '#059669' },
  cancelled: { bg: '#fee2e2', color: '#dc2626' },
};

const paymentColors: Record<string, { bg: string; color: string }> = {
  not_required:  { bg: '#f3f4f8', color: '#666' },
  pending_payment: { bg: '#fef3c7', color: '#d97706' },
  payment_held:  { bg: '#dbeafe', color: '#1d4ed8' },
  released:      { bg: '#d1fae5', color: '#059669' },
  refunded:      { bg: '#fee2e2', color: '#dc2626' },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filtered, setFiltered] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch(`${BASE_URL}/doctors`)
      .then(r => r.json())
      .then(async data => {
        const doctors = data.doctors || [];
        if (doctors.length === 0) { setLoading(false); return; }
        const results = await Promise.allSettled(
          doctors.map((d: any) =>
            fetch(`${BASE_URL}/booked-appointments/doctor/${d._id}`)
              .then(r => r.json())
              .then(res => res.appointments || res.data || [])
              .catch(() => [])
          )
        );
        const all: Appointment[] = [];
        results.forEach(result => {
          if (result.status === 'fulfilled') all.push(...result.value);
        });
        const unique = Array.from(new Map(all.map((a: Appointment) => [a._id, a])).values());
        unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAppointments(unique);
        setFiltered(unique);
      })
      .catch(() => showToast('Failed to load appointments', 'error'))
      .finally(() => setLoading(false));
  }, []);


  useEffect(() => {
    let result = appointments;
    if (activeTab !== 'all') result = result.filter(a => a.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        getName(a.userId).toLowerCase().includes(q) ||
        getName(a.doctorId).toLowerCase().includes(q) ||
        a.healthConcern?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeTab, appointments]);

  const getName = (ref: any) => {
    if (!ref) return '—';
    if (typeof ref === 'string') return ref;
    return ref.fullName || '—';
  };

  const getEmail = (ref: any) => {
    if (!ref || typeof ref === 'string') return '';
    return ref.email || '';
  };

  const counts: Record<FilterTab, number> = {
    all:       appointments.length,
    pending:   appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

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
          <h1 className="page-title">Appointments</h1>
          <p className="page-sub">Monitor all booked appointments on TruHealLink</p>
        </div>
        <div className="header-stats">
          {(['all','pending','confirmed','completed','cancelled'] as FilterTab[]).map((tab, i) => (
            <div key={tab}>
              {i > 0 && <div className="hstat-divider" />}
              <div className="hstat" onClick={() => setActiveTab(tab)} style={{ cursor: 'pointer' }}>
                <span className="hstat-val" style={{ color: tab === 'all' ? '#4f46e5' : statusColors[tab]?.color || '#111' }}>
                  {counts[tab]}
                </span>
                <span className="hstat-label">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="tab-group">
          {(['all','pending','confirmed','completed','cancelled'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="tab-count">{counts[tab]}</span>
            </button>
          ))}
        </div>
        <div className="search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search patient, doctor or concern..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="clear-btn" onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div className="loading-state"><div className="spinner" /><p>Loading appointments...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <p>No appointments found</p>
            <span>Try adjusting your filters</span>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date & Time</th>
                <th>Fee (PKR)</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(apt => (
                <tr key={apt._id} className="table-row">
                  <td>
                    <div className="person-cell">
                      <div className="person-name">{getName(apt.userId)}</div>
                      <div className="person-email">{getEmail(apt.userId)}</div>
                    </div>
                  </td>
                  <td>
                    <div className="person-cell">
                      <div className="person-name">Dr. {getName(apt.doctorId)}</div>
                      <div className="person-email">{getEmail(apt.doctorId)}</div>
                    </div>
                  </td>
                  <td>
                    <div className="date-cell">
                      <span className="date">{apt.date}</span>
                      <span className="time">{apt.time} · {apt.sessionDuration}min</span>
                    </div>
                  </td>
                  <td><span className="fee">PKR {apt.consultationFee?.toLocaleString()}</span></td>
                  <td>
                    <span className="status-badge" style={statusColors[apt.status] || statusColors.pending}>
                      {apt.status}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge" style={paymentColors[apt.paymentStatus] || paymentColors.not_required}>
                      {apt.paymentStatus?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <button className="btn-details" onClick={() => setSelected(apt)}>Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Appointment Details</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-section">
                  <h3 className="detail-title">Participants</h3>
                  <div className="detail-row"><span>Patient</span><strong>{getName(selected.userId)}</strong></div>
                  <div className="detail-row"><span>Doctor</span><strong>Dr. {getName(selected.doctorId)}</strong></div>
                </div>
                <div className="detail-section">
                  <h3 className="detail-title">Schedule</h3>
                  <div className="detail-row"><span>Date</span><strong>{selected.date}</strong></div>
                  <div className="detail-row"><span>Time</span><strong>{selected.time}</strong></div>
                  <div className="detail-row"><span>Duration</span><strong>{selected.sessionDuration} minutes</strong></div>
                </div>
                <div className="detail-section">
                  <h3 className="detail-title">Health Concern</h3>
                  <p className="concern-text">{selected.healthConcern}</p>
                </div>
                <div className="detail-section">
                  <h3 className="detail-title">Payment Breakdown</h3>
                  <div className="detail-row"><span>Consultation Fee</span><strong>PKR {selected.consultationFee?.toLocaleString()}</strong></div>
                  <div className="detail-row"><span>Held Amount</span><strong>PKR {selected.heldAmount?.toLocaleString()}</strong></div>
                  <div className="detail-row"><span>Doctor Earning</span><strong>PKR {selected.doctorEarning?.toLocaleString()}</strong></div>
                  <div className="detail-row commission"><span>Commission</span><strong>PKR {selected.commissionAmount?.toLocaleString()}</strong></div>
                </div>
                <div className="detail-section">
                  <h3 className="detail-title">Status</h3>
                  <div className="detail-row">
                    <span>Appointment</span>
                    <span className="status-badge" style={statusColors[selected.status]}>{selected.status}</span>
                  </div>
                  <div className="detail-row">
                    <span>Payment</span>
                    <span className="status-badge" style={paymentColors[selected.paymentStatus] || paymentColors.not_required}>
                      {selected.paymentStatus?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {selected.cancelReason && (
                    <div className="detail-row"><span>Cancel Reason</span><strong>{selected.cancelReason}</strong></div>
                  )}
                </div>
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
        .toast.success { background: #d1fae5; color: #065f46; }
        .toast.error   { background: #fee2e2; color: #991b1b; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        .page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .page-sub   { font-size: 13px; color: #888; margin-top: 4px; }

        .header-stats {
          display: flex; align-items: center;
          background: #fff; border: 1px solid #f0f0f5; border-radius: 14px; overflow: hidden;
        }
        .hstat { padding: 12px 18px; text-align: center; }
        .hstat:hover { background: #f8f8fc; }
        .hstat-val   { display: block; font-size: 20px; font-weight: 800; }
        .hstat-label { display: block; font-size: 10px; color: #888; font-weight: 500; margin-top: 1px; text-transform: capitalize; }
        .hstat-divider { width: 1px; background: #f0f0f5; align-self: stretch; }

        .filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .tab-group { display: flex; gap: 5px; flex-wrap: wrap; }
        .tab {
          display: flex; align-items: center; gap: 5px;
          padding: 8px 14px; border-radius: 10px;
          border: 1px solid #e5e5e5; background: #fff;
          font-size: 12px; font-weight: 500; color: #666;
          cursor: pointer; transition: all 0.15s;
        }
        .tab:hover  { border-color: #4f46e5; color: #4f46e5; }
        .tab.active { background: #4f46e5; color: #fff; border-color: #4f46e5; }
        .tab-count {
          background: rgba(0,0,0,0.08); font-size: 10px; font-weight: 700;
          padding: 1px 6px; border-radius: 20px;
        }
        .tab.active .tab-count { background: rgba(255,255,255,0.25); }

        .search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #e5e5e5;
          border-radius: 12px; padding: 10px 16px; min-width: 280px;
        }
        .search-wrap input { border: none; outline: none; font-size: 14px; color: #333; background: none; flex: 1; }
        .search-wrap input::placeholder { color: #aaa; }
        .clear-btn { background: none; border: none; cursor: pointer; color: #aaa; font-size: 12px; }

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

        .person-cell { display: flex; flex-direction: column; gap: 2px; }
        .person-name  { font-size: 13px; font-weight: 600; color: #111; }
        .person-email { font-size: 11px; color: #888; }
        .date-cell { display: flex; flex-direction: column; gap: 2px; }
        .date { font-size: 13px; font-weight: 600; color: #111; }
        .time { font-size: 11px; color: #888; }
        .fee  { font-size: 13px; font-weight: 600; color: #059669; }

        .status-badge {
          font-size: 11px; font-weight: 700; padding: 3px 10px;
          border-radius: 20px; text-transform: capitalize; white-space: nowrap;
        }

        .btn-details {
          padding: 6px 14px; border-radius: 8px;
          background: #ede9fe; color: #4f46e5;
          border: 1px solid #ddd6fe; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-details:hover { background: #4f46e5; color: #fff; }

        .loading-state, .empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 60px 20px; gap: 12px; color: #888;
        }
        .empty-icon { font-size: 40px; }
        .empty-state p    { font-size: 15px; font-weight: 600; color: #444; }
        .empty-state span { font-size: 13px; }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid #f0f0f5; border-top-color: #4f46e5;
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
          width: 100%; max-width: 580px; max-height: 85vh;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid #f0f0f5;
        }
        .modal-header h2 { font-size: 16px; font-weight: 700; color: #111; }
        .modal-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: #f3f4f8; border: none; cursor: pointer;
          font-size: 13px; color: #666;
        }
        .modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; }

        .detail-grid { display: flex; flex-direction: column; gap: 16px; }
        .detail-section { background: #f8f8fc; border-radius: 12px; padding: 14px 16px; }
        .detail-title {
          font-size: 11px; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;
        }
        .detail-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 0; border-bottom: 1px solid #f0f0f5; font-size: 13px;
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-row span { color: #888; }
        .detail-row strong { color: #111; font-weight: 600; }
        .detail-row.commission strong { color: #dc2626; }
        .concern-text { font-size: 13px; color: #444; line-height: 1.5; }
      `}</style>
    </div>
  );
}
