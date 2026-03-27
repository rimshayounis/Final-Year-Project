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
  const [modalPatientImg, setModalPatientImg] = useState<string | null>(null);
  const [modalDoctorImg,  setModalDoctorImg]  = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch profile images when a modal is opened
  useEffect(() => {
    if (!selected) { setModalPatientImg(null); setModalDoctorImg(null); return; }
    const patientId = typeof selected.userId  === 'string' ? selected.userId  : selected.userId?._id;
    const doctorId  = typeof selected.doctorId === 'string' ? selected.doctorId : selected.doctorId?._id;
    if (patientId) {
      fetch(`${BASE_URL}/profiles/user/${patientId}`)
        .then(r => r.json())
        .then(d => setModalPatientImg(d.data?.profileImage || null))
        .catch(() => setModalPatientImg(null));
    }
    if (doctorId) {
      fetch(`${BASE_URL}/profiles/doctor/${doctorId}`)
        .then(r => r.json())
        .then(d => setModalDoctorImg(d.data?.profileImage || null))
        .catch(() => setModalDoctorImg(null));
    }
  }, [selected]);

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
                <span className="hstat-val" style={{ color: tab === 'all' ? '#6B7FED' : statusColors[tab]?.color || '#111' }}>
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

            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <div>
                  <div className="modal-title">Appointment Details</div>
                  <div className="modal-date-line">{selected.date} · {selected.time} · {selected.sessionDuration} min</div>
                </div>
              </div>
              <div className="modal-header-right">
                <span className="modal-status-badge" style={statusColors[selected.status]}>{selected.status}</span>
                <button className="modal-close" onClick={() => setSelected(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <div className="modal-body">

              {/* Participants */}
              <div className="participants-row">
                <div className="participant-card">
                  {modalPatientImg
                    ? <img src={`http://localhost:3000${modalPatientImg}`} alt="" className="participant-avatar-img" />
                    : <div className="participant-avatar patient-av">{getName(selected.userId).charAt(0).toUpperCase()}</div>
                  }
                  <div>
                    <div className="participant-label">Patient</div>
                    <div className="participant-name">{getName(selected.userId)}</div>
                    <div className="participant-email">{getEmail(selected.userId)}</div>
                  </div>
                </div>
                <div className="participant-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c0c8f0" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <div className="participant-card">
                  {modalDoctorImg
                    ? <img src={`http://localhost:3000${modalDoctorImg}`} alt="" className="participant-avatar-img" />
                    : <div className="participant-avatar doctor-av">{getName(selected.doctorId).charAt(0).toUpperCase()}</div>
                  }
                  <div>
                    <div className="participant-label">Doctor</div>
                    <div className="participant-name">Dr. {getName(selected.doctorId)}</div>
                    <div className="participant-email">{getEmail(selected.doctorId)}</div>
                  </div>
                </div>
              </div>

              {/* Health Concern */}
              {selected.healthConcern && (
                <div className="concern-block">
                  <div className="block-label">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Health Concern
                  </div>
                  <p className="concern-text">{selected.healthConcern}</p>
                </div>
              )}

              {/* Payment Breakdown */}
              <div className="payment-block">
                <div className="block-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  Payment Breakdown
                </div>
                <div className="payment-grid">
                  <div className="pay-item">
                    <span className="pay-label">Consultation Fee</span>
                    <span className="pay-val">PKR {selected.consultationFee?.toLocaleString() ?? '—'}</span>
                  </div>
                  <div className="pay-item">
                    <span className="pay-label">Held Amount</span>
                    <span className="pay-val">PKR {selected.heldAmount?.toLocaleString() ?? '—'}</span>
                  </div>
                  <div className="pay-item">
                    <span className="pay-label">Doctor Earning</span>
                    <span className="pay-val earn">PKR {selected.doctorEarning?.toLocaleString() ?? '—'}</span>
                  </div>
                  <div className="pay-item">
                    <span className="pay-label">Platform Commission</span>
                    <span className="pay-val comm">PKR {selected.commissionAmount?.toLocaleString() ?? '—'}</span>
                  </div>
                </div>
                <div className="payment-status-row">
                  <span className="pay-label">Payment Status</span>
                  <span className="status-badge" style={paymentColors[selected.paymentStatus] || paymentColors.not_required}>
                    {selected.paymentStatus?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Cancel Reason */}
              {selected.cancelReason && (
                <div className="cancel-block">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div><span className="cancel-label">Cancellation Reason</span><p className="cancel-text">{selected.cancelReason}</p></div>
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
        .hstat-divider { width: 1px; background: #E0E4FF; align-self: stretch; }

        .filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .tab-group { display: flex; gap: 5px; flex-wrap: wrap; }
        .tab {
          display: flex; align-items: center; gap: 5px;
          padding: 8px 14px; border-radius: 10px;
          border: 1px solid #e5e5e5; background: #fff;
          font-size: 12px; font-weight: 500; color: #666;
          cursor: pointer; transition: all 0.15s;
        }
        .tab:hover  { border-color: #6B7FED; color: #6B7FED; }
        .tab.active { background: #6B7FED; color: #fff; border-color: #6B7FED; }
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

        .table-wrap { background: #fff; border-radius: 16px; border: 1px solid #E0E4FF; overflow: hidden; }
        .table { width: 100%; border-collapse: collapse; }
        .table thead tr { background: #F0F4FF; }
        .table th {
          padding: 13px 18px; text-align: left;
          font-size: 11px; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid #E0E4FF;
        }
        .table-row { border-bottom: 1px solid #EEF1FF; transition: background 0.12s; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover { background: #F5F7FF; }
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
          background: #EEF1FF; color: #6B7FED;
          border: 1px solid #E0E4FF; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-details:hover { background: #6B7FED; color: #fff; }

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

        .overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }
        .modal {
          background: #fff; border-radius: 20px;
          width: 100%; max-width: 560px; max-height: 88vh;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        /* Modal Header */
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 22px;
          background: linear-gradient(135deg, #6B7FED 0%, #7B8CDE 100%);
          gap: 12px;
        }
        .modal-header-left { display: flex; align-items: center; gap: 12px; }
        .modal-title { font-size: 15px; font-weight: 700; color: #fff; }
        .modal-date-line { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 2px; }
        .modal-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .modal-status-badge {
          font-size: 11px; font-weight: 700; padding: 4px 11px;
          border-radius: 20px; text-transform: capitalize; white-space: nowrap;
        }
        .modal-close {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(255,255,255,0.2); border: none; cursor: pointer;
          color: #fff; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .modal-close:hover { background: rgba(255,255,255,0.35); }

        /* Modal Body */
        .modal-body { flex: 1; overflow-y: auto; padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; }

        /* Participants */
        .participants-row {
          display: flex; align-items: center; gap: 10px;
          background: #F5F7FF; border-radius: 14px; padding: 16px;
          border: 1px solid #E0E4FF;
        }
        .participant-card { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .participant-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          font-size: 16px; font-weight: 800; color: #fff;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .patient-av { background: linear-gradient(135deg, #6B7FED, #9b8ef5); }
        .doctor-av  { background: linear-gradient(135deg, #10b981, #059669); }
        .participant-avatar-img { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid #E0E4FF; }
        .participant-label { font-size: 10px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; }
        .participant-name  { font-size: 13px; font-weight: 700; color: #111; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .participant-email { font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .participant-arrow { color: #c0c8f0; flex-shrink: 0; }

        /* Concern */
        .concern-block {
          background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 12px; padding: 14px 16px;
        }
        .block-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 700; color: #888;
          text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
        }
        .concern-text { font-size: 13px; color: #444; line-height: 1.55; margin: 0; }

        /* Payment */
        .payment-block {
          background: #F5F7FF; border: 1px solid #E0E4FF;
          border-radius: 12px; padding: 14px 16px;
        }
        .payment-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;
        }
        .pay-item {
          background: #fff; border-radius: 10px; padding: 10px 14px;
          border: 1px solid #E0E4FF; display: flex; flex-direction: column; gap: 3px;
        }
        .pay-label { font-size: 10px; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 0.4px; }
        .pay-val   { font-size: 14px; font-weight: 800; color: #111; }
        .pay-val.earn { color: #059669; }
        .pay-val.comm { color: #dc2626; }
        .payment-status-row {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 10px; border-top: 1px solid #E0E4FF;
        }

        /* Cancel */
        .cancel-block {
          display: flex; align-items: flex-start; gap: 10px;
          background: #fff5f5; border: 1px solid #fecaca;
          border-radius: 12px; padding: 14px 16px;
        }
        .cancel-label { font-size: 11px; font-weight: 700; color: #dc2626; display: block; margin-bottom: 4px; }
        .cancel-text  { font-size: 13px; color: #444; line-height: 1.5; margin: 0; }
      `}</style>
    </div>
  );
}
