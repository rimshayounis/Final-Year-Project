'use client';

import { useEffect, useState } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

interface SupportTicket {
  _id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole: 'user' | 'doctor';
  purpose: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  adminNote?: string | null;
  createdAt: string;
  updatedAt?: string;
}

type FilterStatus = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  open:        { label: 'Open',        color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  in_progress: { label: 'In Progress', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  resolved:    { label: 'Resolved',    color: '#065f46', bg: '#f0fdf4', border: '#bbf7d0' },
  closed:      { label: 'Closed',      color: '#4b5563', bg: '#f9fafb', border: '#e5e7eb' },
};

const PURPOSE_LABELS: Record<string, string> = {
  technical:   'Technical Issue',
  billing:     'Billing & Payments',
  account:     'Account Problem',
  appointment: 'Appointment Issue',
  content:     'Content / Post',
  doctor:      'Doctor Concern',
  other:       'Other',
};

// ── SVG Icons ──────────────────────────────────────────────────────────────
const IconSupport = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
const IconDoctor = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12h6M12 9v6"/><circle cx="12" cy="12" r="9"/>
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/>
  </svg>
);
const IconEmpty = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);
const IconNote = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconStatus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);

// Status dot
const StatusDot = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    open: '#f59e0b', in_progress: '#3b82f6', resolved: '#10b981', closed: '#9ca3af',
  };
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: colors[status] ?? '#ccc', flexShrink: 0,
    }} />
  );
};

export default function SupportPage() {
  const [tickets, setTickets]           = useState<SupportTicket[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState<SupportTicket | null>(null);
  const [adminNote, setAdminNote]       = useState('');
  const [sending, setSending]           = useState(false);
  const [updatingStatus, setUpdStatus]  = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res  = await fetch(`${BASE_URL}/support-requests`);
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : (data.data || []));
      } catch (e) {
        console.error('Failed to fetch support tickets:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const updateStatus = async (id: string, status: SupportTicket['status'], note?: string) => {
    setUpdStatus(id);
    try {
      await fetch(`${BASE_URL}/support-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote: note }),
      });
      setTickets(prev => prev.map(t => t._id === id ? { ...t, status, adminNote: note ?? t.adminNote } : t));
      if (selected?._id === id) setSelected(prev => prev ? { ...prev, status, adminNote: note ?? prev.adminNote } : null);
    } finally {
      setUpdStatus(null);
    }
  };

  const sendNote = async () => {
    if (!adminNote.trim() || !selected) return;
    setSending(true);
    try {
      await fetch(`${BASE_URL}/support-requests/${selected._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selected.status === 'open' ? 'in_progress' : selected.status, adminNote }),
      });
      const updated = { ...selected, adminNote, status: (selected.status === 'open' ? 'in_progress' : selected.status) as SupportTicket['status'] };
      setTickets(prev => prev.map(t => t._id === selected._id ? updated : t));
      setSelected(updated);
      setAdminNote('');
    } finally {
      setSending(false);
    }
  };

  const filtered = tickets.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.purpose?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.userName?.toLowerCase().includes(q) ||
      t.userEmail?.toLowerCase().includes(q) ||
      t.userId?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => t.status === 'resolved').length,
    closed:      tickets.filter(t => t.status === 'closed').length,
  };

  const timeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="sp-page">

      {/* ── Page Header ── */}
      <div className="sp-header">
        <div className="sp-title-row">
          <div className="sp-title-icon">
            <IconSupport />
          </div>
          <div>
            <h1>Support Requests</h1>
            <p>Review and respond to patient and doctor support queries</p>
          </div>
        </div>

        <div className="sp-stat-cards">
          {([
            { key: 'open',        label: 'Open',        dot: '#f59e0b' },
            { key: 'in_progress', label: 'In Progress', dot: '#3b82f6' },
            { key: 'resolved',    label: 'Resolved',    dot: '#10b981' },
            { key: 'closed',      label: 'Closed',      dot: '#9ca3af' },
          ] as const).map(s => (
            <div key={s.key} className="sp-stat-card">
              <div className="sp-stat-top">
                <span className="sp-stat-dot" style={{ background: s.dot }} />
                <span className="sp-stat-label">{s.label}</span>
              </div>
              <div className="sp-stat-val">{counts[s.key]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="sp-toolbar">
        <div className="sp-filters">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as FilterStatus[]).map(f => (
            <button
              key={f}
              className={`sp-filter-btn ${filterStatus === f ? 'active' : ''}`}
              onClick={() => setFilterStatus(f)}
            >
              {f !== 'all' && <StatusDot status={f} />}
              {f === 'all' ? 'All Tickets' : STATUS_META[f].label}
              {f !== 'all' && (
                <span className="sp-filter-count">{counts[f as keyof typeof counts]}</span>
              )}
              {f === 'all' && (
                <span className="sp-filter-count">{tickets.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="sp-search">
          <IconSearch />
          <input
            placeholder="Search by name, email, or issue…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="sp-search-clear" onClick={() => setSearch('')}>
              <IconClose />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className={`sp-content ${selected ? 'with-detail' : ''}`}>

        {/* Ticket list */}
        <div className="sp-list-wrap">
          {loading ? (
            <div className="sp-loading">
              {[1,2,3,4,5].map(i => <div key={i} className="sp-skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="sp-empty">
              <IconEmpty />
              <p className="sp-empty-title">No tickets found</p>
              <p className="sp-empty-sub">
                {search ? 'Try adjusting your search query.' : 'All support requests will appear here.'}
              </p>
            </div>
          ) : (
            <div className="sp-list">
              {filtered.map(t => {
                const sm = STATUS_META[t.status];
                const isDoc = t.userRole === 'doctor';
                return (
                  <div
                    key={t._id}
                    className={`sp-ticket ${selected?._id === t._id ? 'selected' : ''} ${t.status === 'open' ? 'urgent' : ''}`}
                    onClick={() => { setSelected(selected?._id === t._id ? null : t); setAdminNote(''); }}
                  >
                    {/* Avatar */}
                    <div className={`sp-avatar ${isDoc ? 'doc' : 'usr'}`}>
                      {isDoc ? <IconDoctor /> : <IconUser />}
                    </div>

                    {/* User info */}
                    <div className="sp-ticket-user">
                      <div className="sp-ticket-name">
                        {t.userName || (isDoc ? 'Doctor' : 'Patient')}
                        <span className={`sp-role-badge ${isDoc ? 'doc' : 'usr'}`}>
                          {isDoc ? 'Doctor' : 'Patient'}
                        </span>
                      </div>
                      <div className="sp-ticket-email">
                        {t.userEmail || `ID: ${t.userId?.slice(-8)}`}
                      </div>
                    </div>

                    {/* Subject + preview */}
                    <div className="sp-ticket-mid">
                      <div className="sp-ticket-subject">
                        {PURPOSE_LABELS[t.purpose] ?? t.purpose}
                      </div>
                      <div className="sp-ticket-preview">
                        {t.description?.slice(0, 90)}{t.description?.length > 90 ? '…' : ''}
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="sp-ticket-right">
                      <span
                        className="sp-status-badge"
                        style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}
                      >
                        <StatusDot status={t.status} />
                        {sm.label}
                      </span>
                      <div className="sp-ticket-time">
                        <IconClock />
                        {timeAgo(t.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (() => {
          const sm = STATUS_META[selected.status];
          const isDoc = selected.userRole === 'doctor';
          return (
            <div className="sp-detail">

              {/* Detail header */}
              <div className="sp-detail-head">
                <div className="sp-detail-head-left">
                  <span className="sp-detail-purpose-tag">
                    {PURPOSE_LABELS[selected.purpose] ?? selected.purpose}
                  </span>
                  <div className="sp-detail-date">
                    <IconCalendar />
                    {formatDate(selected.createdAt)}
                  </div>
                </div>
                <button className="sp-detail-close" onClick={() => setSelected(null)} title="Close">
                  <IconClose />
                </button>
              </div>

              {/* User card */}
              <div className="sp-user-card">
                <div className={`sp-detail-avatar ${isDoc ? 'doc' : 'usr'}`}>
                  {isDoc ? <IconDoctor /> : <IconUser />}
                </div>
                <div className="sp-user-card-info">
                  <div className="sp-detail-uname">
                    {selected.userName || (isDoc ? 'Doctor' : 'Patient')}
                  </div>
                  <div className="sp-detail-uemail">
                    {selected.userEmail || `ID: ${selected.userId}`}
                  </div>
                  <span className={`sp-role-badge ${isDoc ? 'doc' : 'usr'}`}>
                    {isDoc ? 'Doctor' : 'Patient'}
                  </span>
                </div>
                <span
                  className="sp-status-badge"
                  style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}
                >
                  <StatusDot status={selected.status} />
                  {sm.label}
                </span>
              </div>

              {/* Description */}
              <div className="sp-detail-section">
                <div className="sp-section-label">
                  <IconNote />
                  Issue Description
                </div>
                <div className="sp-detail-message">{selected.description}</div>
              </div>

              {/* Admin note (existing) */}
              {selected.adminNote && (
                <div className="sp-detail-section">
                  <div className="sp-section-label">
                    <IconNote />
                    Admin Response
                  </div>
                  <div className="sp-admin-note-display">{selected.adminNote}</div>
                </div>
              )}

              {/* Status update */}
              <div className="sp-detail-section">
                <div className="sp-section-label">
                  <IconStatus />
                  Update Status
                </div>
                <div className="sp-status-grid">
                  {(['open', 'in_progress', 'resolved', 'closed'] as SupportTicket['status'][]).map(s => {
                    const m = STATUS_META[s];
                    const active = selected.status === s;
                    return (
                      <button
                        key={s}
                        className={`sp-status-btn ${active ? 'active' : ''}`}
                        style={active ? { background: m.bg, color: m.color, borderColor: m.color } : {}}
                        disabled={updatingStatus === selected._id}
                        onClick={() => updateStatus(selected._id, s)}
                      >
                        <StatusDot status={s} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Admin note input */}
              {selected.status !== 'closed' && (
                <div className="sp-detail-section">
                  <div className="sp-section-label">
                    <IconNote />
                    {selected.adminNote ? 'Update Response' : 'Add Response'}
                  </div>
                  <textarea
                    className="sp-reply-box"
                    placeholder="Write a response or internal note for this request…"
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                    rows={4}
                  />
                  <button
                    className="sp-send-btn"
                    disabled={!adminNote.trim() || sending}
                    onClick={sendNote}
                  >
                    {sending ? (
                      <span className="sp-btn-spinner" />
                    ) : (
                      <IconSend />
                    )}
                    {sending ? 'Saving…' : 'Send Response'}
                  </button>
                </div>
              )}

              <div className="sp-detail-footer">
                Ticket opened {timeAgo(selected.createdAt)}
                {selected.updatedAt && selected.updatedAt !== selected.createdAt &&
                  ` · Updated ${timeAgo(selected.updatedAt)}`}
              </div>
            </div>
          );
        })()}
      </div>

      <style>{`
        /* ── Base ── */
        .sp-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          color: #0f172a;
        }

        /* ── Header ── */
        .sp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          border-radius: 16px;
          padding: 22px 28px;
          border: 1px solid #e8edf5;
          flex-wrap: wrap;
          gap: 16px;
          box-shadow: 0 1px 4px rgba(15,23,42,0.04);
        }
        .sp-title-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .sp-title-icon {
          width: 46px; height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(2,132,199,0.25);
        }
        .sp-header h1 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.4px;
        }
        .sp-header p {
          font-size: 13px;
          color: #64748b;
          margin-top: 3px;
        }

        /* Stat cards */
        .sp-stat-cards {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sp-stat-card {
          background: #f8fafc;
          border: 1px solid #e8edf5;
          border-radius: 12px;
          padding: 12px 18px;
          min-width: 80px;
        }
        .sp-stat-top {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }
        .sp-stat-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .sp-stat-label {
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sp-stat-val {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
        }

        /* ── Toolbar ── */
        .sp-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .sp-filters {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .sp-filter-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: 9px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .sp-filter-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .sp-filter-btn.active {
          background: #0284c7;
          color: #fff;
          border-color: #0284c7;
          box-shadow: 0 2px 8px rgba(2,132,199,0.22);
        }
        .sp-filter-count {
          font-size: 10px;
          font-weight: 700;
          background: rgba(0,0,0,0.08);
          padding: 1px 6px;
          border-radius: 8px;
        }
        .sp-filter-btn.active .sp-filter-count { background: rgba(255,255,255,0.22); }

        .sp-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 9px 14px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .sp-search:focus-within {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2,132,199,0.1);
        }
        .sp-search input {
          border: none;
          outline: none;
          font-size: 13px;
          color: #0f172a;
          width: 230px;
          background: transparent;
        }
        .sp-search input::placeholder { color: #94a3b8; }
        .sp-search-clear {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
        }
        .sp-search-clear:hover { color: #475569; background: #f1f5f9; }

        /* ── Content grid ── */
        .sp-content {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: start;
        }
        .sp-content.with-detail {
          grid-template-columns: 1fr 360px;
        }

        /* ── Ticket list ── */
        .sp-list-wrap {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e8edf5;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(15,23,42,0.04);
        }
        .sp-loading {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sp-skeleton {
          height: 72px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          border-radius: 10px;
          animation: shimmer 1.6s infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sp-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 64px 20px;
        }
        .sp-empty-title { font-size: 15px; font-weight: 600; color: #475569; }
        .sp-empty-sub   { font-size: 13px; color: #94a3b8; }

        .sp-list { display: flex; flex-direction: column; }
        .sp-ticket {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background 0.12s;
          position: relative;
        }
        .sp-ticket:last-child { border-bottom: none; }
        .sp-ticket:hover { background: #f8fafc; }
        .sp-ticket.selected { background: #f0f9ff; }
        .sp-ticket.urgent { border-left: 3px solid #f59e0b; }

        /* Avatar */
        .sp-avatar {
          width: 40px; height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sp-avatar.doc { background: #EEF1FF; color: #6B7FED; }
        .sp-avatar.usr { background: #dbeafe; color: #1d4ed8; }

        /* User info */
        .sp-ticket-user { min-width: 150px; }
        .sp-ticket-name {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .sp-ticket-email { font-size: 11px; color: #94a3b8; margin-top: 2px; }

        /* Role badge */
        .sp-role-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .sp-role-badge.doc { background: #EEF1FF; color: #6B7FED; }
        .sp-role-badge.usr { background: #dbeafe; color: #1d4ed8; }

        /* Mid */
        .sp-ticket-mid { flex: 1; min-width: 0; }
        .sp-ticket-subject {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sp-ticket-preview {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Right */
        .sp-ticket-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          flex-shrink: 0;
        }
        .sp-ticket-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #94a3b8;
        }

        /* Status badge */
        .sp-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 20px;
          border: 1px solid;
          white-space: nowrap;
        }

        /* ── Detail Panel ── */
        .sp-detail {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e8edf5;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: sticky;
          top: 20px;
          max-height: 88vh;
          overflow-y: auto;
          box-shadow: 0 1px 4px rgba(15,23,42,0.04);
        }
        .sp-detail::-webkit-scrollbar { width: 4px; }
        .sp-detail::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

        /* Detail head */
        .sp-detail-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .sp-detail-head-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sp-detail-purpose-tag {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        .sp-detail-date {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #94a3b8;
        }
        .sp-detail-close {
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #475569;
          flex-shrink: 0;
          transition: background 0.12s;
        }
        .sp-detail-close:hover { background: #e2e8f0; }

        /* User card in detail */
        .sp-user-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
          border: 1px solid #e8edf5;
          border-radius: 12px;
          padding: 14px;
        }
        .sp-detail-avatar {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sp-detail-avatar.doc { background: #EEF1FF; color: #6B7FED; }
        .sp-detail-avatar.usr { background: #dbeafe; color: #1d4ed8; }
        .sp-user-card-info { flex: 1; min-width: 0; }
        .sp-detail-uname  { font-size: 14px; font-weight: 700; color: #0f172a; }
        .sp-detail-uemail {
          font-size: 11px;
          color: #94a3b8;
          margin: 2px 0 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Sections */
        .sp-detail-section { display: flex; flex-direction: column; gap: 9px; }
        .sp-section-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
        .sp-detail-message {
          font-size: 13px;
          color: #374151;
          line-height: 1.65;
          background: #f8fafc;
          border-radius: 10px;
          padding: 12px 14px;
          border: 1px solid #e8edf5;
        }
        .sp-admin-note-display {
          font-size: 13px;
          color: #065f46;
          line-height: 1.65;
          background: #f0fdf4;
          border-radius: 10px;
          padding: 12px 14px;
          border: 1px solid #bbf7d0;
        }

        /* Status grid */
        .sp-status-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }
        .sp-status-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sp-status-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
        .sp-status-btn.active { font-weight: 700; }
        .sp-status-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* Reply */
        .sp-reply-box {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13px;
          font-family: inherit;
          color: #1e293b;
          resize: vertical;
          outline: none;
          line-height: 1.55;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
          background: #F8F9FF;
        }
        .sp-reply-box:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2,132,199,0.1);
          background: #fff;
        }
        .sp-send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s, box-shadow 0.15s;
          width: 100%;
          box-shadow: 0 3px 10px rgba(2,132,199,0.2);
        }
        .sp-send-btn:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 4px 14px rgba(2,132,199,0.32);
        }
        .sp-send-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

        .sp-btn-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .sp-detail-footer {
          font-size: 11px;
          color: #cbd5e1;
          text-align: center;
          padding-top: 4px;
        }
      `}</style>
    </div>
  );
}
