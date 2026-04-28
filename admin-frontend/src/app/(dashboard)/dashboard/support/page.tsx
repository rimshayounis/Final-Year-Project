'use client';

import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000/api';

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
type FilterCategory = 'all' | 'accounts';

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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
  // ban status per userId: true = banned, false = active, undefined = not yet fetched
  const [category, setCategory]         = useState<FilterCategory>('all');
  const [bannedMap, setBannedMap]       = useState<Record<string, boolean>>({});
  const [banUpdating, setBanUpdating]   = useState(false);
  const [banToast, setBanToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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

  const showBanToast = (msg: string, type: 'success' | 'error') => {
    setBanToast({ msg, type });
    setTimeout(() => setBanToast(null), 3000);
  };

  // Fetch ban status for a ticket's user when selected (account-purpose tickets only)
  const fetchBanStatus = async (ticket: SupportTicket) => {
    if (ticket.purpose !== 'account' || !ticket.userId) return;
    if (bannedMap[ticket.userId] !== undefined) return; // already fetched
    const model = ticket.userRole === 'doctor' ? 'doctors' : 'users';
    try {
      const res  = await fetch(`${BASE_URL}/${model}/${ticket.userId}`);
      const data = await res.json();
      const doc  = data.doctor ?? data.user ?? data.data ?? data;
      setBannedMap(prev => ({ ...prev, [ticket.userId]: !!doc?.isBanned }));
    } catch {
      setBannedMap(prev => ({ ...prev, [ticket.userId]: false }));
    }
  };

  const unbanAccount = async (ticket: SupportTicket) => {
    if (!ticket.userId) return;
    setBanUpdating(true);
    try {
      const model = ticket.userRole === 'doctor' ? 'Doctor' : 'User';
      const res = await fetch(`${BASE_URL}/reports/unban/${ticket.userId}?model=${model}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setBannedMap(prev => ({ ...prev, [ticket.userId]: false }));
        showBanToast(`${model} account unbanned successfully`, 'success');
        // auto-update ticket status to resolved
        await updateStatus(ticket._id, 'resolved', 'Account has been unbanned.');
      } else {
        const d = await res.json().catch(() => ({}));
        showBanToast(d?.message || 'Failed to unban account', 'error');
      }
    } catch { showBanToast('Failed to unban account', 'error'); }
    finally { setBanUpdating(false); }
  };


  const filtered = tickets.filter(t => {
    const matchStatus   = filterStatus === 'all' || t.status === filterStatus;
    const matchCategory = category === 'all'
      || (category === 'accounts' && t.purpose === 'account');
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.purpose?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.userName?.toLowerCase().includes(q) ||
      t.userEmail?.toLowerCase().includes(q) ||
      t.userId?.toLowerCase().includes(q);
    return matchStatus && matchCategory && matchSearch;
  });

  const categoryTickets = category === 'accounts'
    ? tickets.filter(t => t.purpose === 'account')
    : tickets;

  const counts = {
    open:        categoryTickets.filter(t => t.status === 'open').length,
    in_progress: categoryTickets.filter(t => t.status === 'in_progress').length,
    resolved:    categoryTickets.filter(t => t.status === 'resolved').length,
    closed:      categoryTickets.filter(t => t.status === 'closed').length,
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

      {/* ── Category Tabs ── */}
      <div className="sp-category-tabs">
        {([
          { key: 'all',      label: 'All Queries',     count: tickets.length },
          { key: 'accounts', label: 'Account Requests', count: tickets.filter(t => t.purpose === 'account').length },
        ] as { key: FilterCategory; label: string; count: number }[]).map(tab => (
          <button
            key={tab.key}
            className={`sp-cat-tab ${category === tab.key ? 'active' : ''}`}
            onClick={() => { setCategory(tab.key); setSelected(null); }}
          >
            {tab.label}
            <span className="sp-cat-count">{tab.count}</span>
          </button>
        ))}
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
                <span className="sp-filter-count">{categoryTickets.length}</span>
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
                    onClick={() => { const next = selected?._id === t._id ? null : t; setSelected(next); setAdminNote(''); if (next) fetchBanStatus(next); }}
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

              {/* Ban toast */}
              {banToast && (
                <div className={`sp-ban-toast ${banToast.type}`}>
                  {banToast.type === 'success' ? '✓' : '✕'} {banToast.msg}
                </div>
              )}

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

              {/* Ban / Unban — only for account-purpose tickets */}
              {selected.purpose === 'account' && selected.userId && (
                <div className="sp-detail-section">
                  <div className="sp-section-label">
                    <IconStatus />
                    Account Action
                  </div>
                  <div className="sp-ban-status-row">
                    {bannedMap[selected.userId] === undefined ? (
                      <span className="sp-ban-checking">Checking account status…</span>
                    ) : bannedMap[selected.userId] ? (
                      <>
                        <div className="sp-ban-status-badge banned">🚫 Account is currently banned</div>
                        <button
                          className="sp-unban-btn"
                          disabled={banUpdating}
                          onClick={() => unbanAccount(selected)}
                        >
                          {banUpdating ? <span className="sp-btn-spinner" /> : '✓'}
                          {banUpdating ? 'Unbanning…' : 'Unban Account'}
                        </button>
                      </>
                    ) : (
                      <div className="sp-ban-status-badge active">✓ Account is currently active</div>
                    )}
                  </div>
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
          gap: 24px;
          position: relative;
        }

        /* ── Header ── */
        .sp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .sp-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sp-title-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          background: #6B7FED;
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
        }
        .sp-header h1 {
          font-size: 22px;
          font-weight: 800;
          color: #111;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .sp-header p {
          font-size: 13px;
          color: #888;
          margin-top: 4px;
        }

        /* Stat cards */
        .sp-stat-cards {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .sp-stat-card {
          background: #fff;
          border: 1px solid #f0f0f5;
          border-radius: 16px;
          padding: 18px 22px;
          min-width: 90px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .sp-stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
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
          font-size: 11px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sp-stat-val {
          font-size: 22px;
          font-weight: 800;
          color: #111;
          line-height: 1;
        }

        /* ── Category Tabs ── */
        .sp-category-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #f0f0f5;
          padding-bottom: 0;
        }
        .sp-cat-tab {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          font-size: 13px;
          font-weight: 600;
          color: #9ca3af;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .sp-cat-tab:hover { color: #6B7FED; }
        .sp-cat-tab.active { color: #6B7FED; border-bottom-color: #6B7FED; }
        .sp-cat-count {
          background: #f0f0f8;
          color: #888;
          border-radius: 20px;
          padding: 1px 8px;
          font-size: 11px;
          font-weight: 700;
        }
        .sp-cat-tab.active .sp-cat-count { background: #eef0fd; color: #6B7FED; }

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
          border: 1px solid #e5e5e5;
          background: #fff;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .sp-filter-btn:hover { background: #f8f8fc; border-color: #ddd; }
        .sp-filter-btn.active {
          background: #6B7FED;
          color: #fff;
          border-color: #6B7FED;
          box-shadow: 0 2px 8px rgba(107,127,237,0.25);
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
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          padding: 9px 14px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .sp-search:focus-within {
          border-color: #6B7FED;
          box-shadow: 0 0 0 3px rgba(107,127,237,0.12);
        }
        .sp-search input {
          border: none;
          outline: none;
          font-size: 13px;
          color: #111;
          width: 230px;
          background: transparent;
        }
        .sp-search input::placeholder { color: #aaa; }
        .sp-search-clear {
          background: none;
          border: none;
          cursor: pointer;
          color: #aaa;
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
        }
        .sp-search-clear:hover { color: #666; background: #EEF1FF; }

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
          border: 1px solid #E0E4FF;
          overflow: hidden;
        }
        .sp-loading {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sp-skeleton {
          height: 72px;
          background: linear-gradient(90deg, #EEF1FF 25%, #f0f0f5 50%, #EEF1FF 75%);
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
        .sp-empty-title { font-size: 15px; font-weight: 600; color: #666; }
        .sp-empty-sub   { font-size: 13px; color: #aaa; }

        .sp-list { display: flex; flex-direction: column; }
        .sp-ticket {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          border-bottom: 1px solid #EEF1FF;
          cursor: pointer;
          transition: background 0.12s;
          position: relative;
        }
        .sp-ticket:last-child { border-bottom: none; }
        .sp-ticket:hover { background: #f8f8fc; }
        .sp-ticket.selected { background: #EEF1FF; }
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
          color: #111;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .sp-ticket-email { font-size: 11px; color: #aaa; margin-top: 2px; }

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
          color: #aaa;
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
          color: #aaa;
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
          border: 1px solid #f0f0f5;
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
        .sp-detail::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 2px; }

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
          color: #111;
        }
        .sp-detail-date {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #aaa;
        }
        .sp-detail-close {
          background: #EEF1FF;
          border: none;
          border-radius: 8px;
          width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #666;
          flex-shrink: 0;
          transition: background 0.12s;
        }
        .sp-detail-close:hover { background: #e5e5e5; }

        /* User card in detail */
        .sp-user-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8f8fc;
          border: 1px solid #f0f0f5;
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
        .sp-detail-uname  { font-size: 14px; font-weight: 700; color: #111; }
        .sp-detail-uemail {
          font-size: 11px;
          color: #aaa;
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
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
        .sp-detail-message {
          font-size: 13px;
          color: #374151;
          line-height: 1.65;
          background: #f8f8fc;
          border-radius: 10px;
          padding: 12px 14px;
          border: 1px solid #f0f0f5;
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
          border: 1px solid #e5e5e5;
          background: #fff;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sp-status-btn:hover:not(:disabled) { background: #f8f8fc; border-color: #ddd; }
        .sp-status-btn.active { font-weight: 700; }
        .sp-status-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* Reply */
        .sp-reply-box {
          width: 100%;
          border: 1px solid #e5e5e5;
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
          border-color: #6B7FED;
          box-shadow: 0 0 0 3px rgba(2,132,199,0.1);
          background: #fff;
        }
        .sp-send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          background: linear-gradient(135deg, #6B7FED 0%, #6B7FED 100%);
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
          color: #ddd;
          text-align: center;
          padding-top: 4px;
        }

        /* Ban toast */
        .sp-ban-toast {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          animation: fadeIn 0.2s ease;
        }
        .sp-ban-toast.success {
          background: #f0fdf4;
          color: #065f46;
          border: 1px solid #bbf7d0;
        }
        .sp-ban-toast.error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        /* Ban status row */
        .sp-ban-status-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sp-ban-checking {
          font-size: 13px;
          color: #9ca3af;
          font-style: italic;
        }
        .sp-ban-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }
        .sp-ban-status-badge.banned {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .sp-ban-status-badge.active {
          background: #f0fdf4;
          color: #065f46;
          border: 1px solid #bbf7d0;
        }

        /* Unban / Ban buttons */
        .sp-unban-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s, box-shadow 0.15s;
          width: 100%;
        }
        .sp-unban-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          box-shadow: 0 3px 10px rgba(16,185,129,0.25);
        }
        .sp-unban-btn:hover:not(:disabled) { opacity: 0.9; box-shadow: 0 4px 14px rgba(16,185,129,0.35); }
        .sp-unban-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
      `}</style>
    </div>
  );
}
