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

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  open:        { label: 'Open',        color: '#dc2626', bg: '#fee2e2', icon: '🔴' },
  in_progress: { label: 'In Progress', color: '#d97706', bg: '#fef3c7', icon: '🟡' },
  resolved:    { label: 'Resolved',    color: '#059669', bg: '#d1fae5', icon: '🟢' },
  closed:      { label: 'Closed',      color: '#6b7280', bg: '#f3f4f6', icon: '⚫' },
};

const PURPOSE_LABELS: Record<string, string> = {
  technical:   'Technical',
  billing:     'Billing',
  account:     'Account',
  appointment: 'Appointment',
  content:     'Content',
  doctor:      'Doctor',
  other:       'Other',
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
      setTickets(prev => prev.map(t => t._id === id ? { ...t, status, adminNote: note || t.adminNote } : t));
      if (selected?._id === id) setSelected(prev => prev ? { ...prev, status, adminNote: note || prev.adminNote } : null);
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
        body: JSON.stringify({ status: 'in_progress', adminNote }),
      });
      const updated = { ...selected, adminNote, status: 'in_progress' as const };
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

  return (
    <div className="sp-page">
      <div className="sp-header">
        <div className="sp-title-row">
          <span style={{ fontSize: 36 }}>💬</span>
          <div>
            <h1>Support Queries</h1>
            <p>Manage and respond to user and doctor support requests</p>
          </div>
        </div>
        <div className="sp-header-stats">
          {Object.entries(counts).map(([status, count]) => (
            <div key={status} className="sp-hstat" style={{ background: STATUS_META[status].bg }}>
              <div className="sp-hstat-val" style={{ color: STATUS_META[status].color }}>{count}</div>
              <div className="sp-hstat-label">{STATUS_META[status].label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sp-toolbar">
        <div className="sp-toolbar-left">
          <div className="sp-filters">
            {(['all', 'open', 'in_progress', 'resolved', 'closed'] as FilterStatus[]).map(f => (
              <button key={f} className={`sp-filter-btn ${filterStatus === f ? 'active' : ''}`} onClick={() => setFilterStatus(f)}>
                {f === 'all' ? 'All' : STATUS_META[f].icon + ' ' + STATUS_META[f].label}
                {f !== 'all' && <span className="sp-filter-count">{counts[f as keyof typeof counts]}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="sp-search">
          <span>🔍</span>
          <input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      <div className={`sp-content ${selected ? 'with-detail' : ''}`}>
        <div className="sp-list-wrap">
          {loading ? (
            <div className="sp-loading">
              {[1,2,3,4].map(i => <div key={i} className="sp-skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="sp-empty"><span>📭</span><p>No tickets found</p></div>
          ) : (
            <div className="sp-list">
              {filtered.map(t => (
                <div
                  key={t._id}
                  className={`sp-ticket ${selected?._id === t._id ? 'selected' : ''} ${t.status === 'open' ? 'urgent' : ''}`}
                  onClick={() => { setSelected(selected?._id === t._id ? null : t); setAdminNote(''); }}
                >
                  <div className="sp-ticket-left">
                    <div className="sp-ticket-avatar" style={{ background: t.userRole === 'doctor' ? '#ede9fe' : '#dbeafe', color: t.userRole === 'doctor' ? '#6d28d9' : '#1d4ed8' }}>
                      {t.userRole === 'doctor' ? '👨‍⚕️' : '👤'}
                    </div>
                    <div className="sp-ticket-info">
                      <div className="sp-ticket-name">{t.userName || (t.userRole === 'doctor' ? 'Doctor' : 'Patient')}</div>
                      <div className="sp-ticket-email">{t.userEmail || `ID: ${t.userId?.slice(-8)}`}</div>
                    </div>
                  </div>
                  <div className="sp-ticket-mid">
                    <div className="sp-ticket-subject">{PURPOSE_LABELS[t.purpose] || t.purpose}</div>
                    <div className="sp-ticket-preview">{t.description?.slice(0, 80)}{t.description?.length > 80 ? '...' : ''}</div>
                  </div>
                  <div className="sp-ticket-right">
                    <span className="sp-user-type" style={{ background: t.userRole === 'doctor' ? '#ede9fe' : '#dbeafe', color: t.userRole === 'doctor' ? '#6d28d9' : '#1d4ed8' }}>
                      {t.userRole}
                    </span>
                    <span className="sp-status-chip" style={{ background: STATUS_META[t.status].bg, color: STATUS_META[t.status].color }}>
                      {STATUS_META[t.status].icon} {STATUS_META[t.status].label}
                    </span>
                    <div className="sp-ticket-time">{timeAgo(t.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="sp-detail">
            <div className="sp-detail-header">
              <div>
                <h3>{PURPOSE_LABELS[selected.purpose] || selected.purpose}</h3>
                <div className="sp-detail-meta">
                  <span className="sp-status-chip" style={{ background: STATUS_META[selected.status].bg, color: STATUS_META[selected.status].color }}>
                    {STATUS_META[selected.status].icon} {STATUS_META[selected.status].label}
                  </span>
                </div>
              </div>
              <button className="sp-detail-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="sp-detail-user">
              <div className="sp-detail-avatar" style={{ background: selected.userRole === 'doctor' ? '#ede9fe' : '#dbeafe', color: selected.userRole === 'doctor' ? '#6d28d9' : '#1d4ed8' }}>
                {selected.userRole === 'doctor' ? '👨‍⚕️' : '👤'}
              </div>
              <div>
                <div className="sp-detail-uname">{selected.userName || (selected.userRole === 'doctor' ? 'Doctor' : 'Patient')}</div>
                <div className="sp-detail-uemail">{selected.userEmail || `ID: ${selected.userId}`}</div>
                <span className="sp-user-type" style={{ background: selected.userRole === 'doctor' ? '#ede9fe' : '#dbeafe', color: selected.userRole === 'doctor' ? '#6d28d9' : '#1d4ed8' }}>
                  {selected.userRole}
                </span>
              </div>
            </div>

            <div className="sp-detail-section">
              <div className="sp-detail-label">Description</div>
              <div className="sp-detail-message">{selected.description}</div>
            </div>

            {selected.adminNote && (
              <div className="sp-detail-section">
                <div className="sp-detail-label">Admin Note</div>
                <div className="sp-detail-reply">{selected.adminNote}</div>
              </div>
            )}

            <div className="sp-detail-section">
              <div className="sp-detail-label">Update Status</div>
              <div className="sp-status-actions">
                {(['open', 'in_progress', 'resolved', 'closed'] as SupportTicket['status'][]).map(s => (
                  <button
                    key={s}
                    className={`sp-status-btn ${selected.status === s ? 'active' : ''}`}
                    style={selected.status === s ? { background: STATUS_META[s].bg, color: STATUS_META[s].color, borderColor: STATUS_META[s].color } : {}}
                    disabled={updatingStatus === selected._id}
                    onClick={() => updateStatus(selected._id, s)}
                  >
                    {STATUS_META[s].icon} {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>

            {selected.status !== 'closed' && (
              <div className="sp-detail-section">
                <div className="sp-detail-label">Add Admin Note</div>
                <textarea
                  className="sp-reply-box"
                  placeholder="Add a note about this ticket..."
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={4}
                />
                <button className="sp-send-btn" disabled={!adminNote.trim() || sending} onClick={sendNote}>
                  {sending ? 'Saving...' : '💾 Save Note'}
                </button>
              </div>
            )}

            <div className="sp-detail-time">Opened {timeAgo(selected.createdAt)}</div>
          </div>
        )}
      </div>

      <style>{`
        .sp-page { display: flex; flex-direction: column; gap: 20px; font-family: 'Segoe UI', system-ui, sans-serif; }
        .sp-header { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 16px; padding: 24px 28px; border: 1px solid #f0f0f5; flex-wrap: wrap; gap: 16px; }
        .sp-title-row { display: flex; align-items: center; gap: 14px; }
        .sp-header h1 { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .sp-header p  { font-size: 13px; color: #888; margin-top: 3px; }
        .sp-header-stats { display: flex; gap: 10px; }
        .sp-hstat { padding: 10px 16px; border-radius: 12px; text-align: center; min-width: 70px; }
        .sp-hstat-val   { font-size: 20px; font-weight: 800; }
        .sp-hstat-label { font-size: 10px; font-weight: 600; color: #888; text-transform: uppercase; margin-top: 2px; }
        .sp-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .sp-toolbar-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .sp-filters { display: flex; gap: 6px; flex-wrap: wrap; }
        .sp-filter-btn { display: flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: 9px; border: 1px solid #e5e5e5; background: #fff; font-size: 12px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .sp-filter-btn:hover { background: #f8f8fc; }
        .sp-filter-btn.active { background: #1e1b4b; color: #fff; border-color: #1e1b4b; }
        .sp-filter-count { font-size: 10px; font-weight: 700; background: rgba(255,255,255,0.2); padding: 1px 5px; border-radius: 8px; }
        .sp-filter-btn:not(.active) .sp-filter-count { background: #f0f0f5; color: #555; }
        .sp-search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; padding: 8px 14px; }
        .sp-search:focus-within { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
        .sp-search input { border: none; outline: none; font-size: 14px; color: #333; width: 220px; }
        .sp-search button { background: none; border: none; cursor: pointer; color: #aaa; font-size: 12px; }
        .sp-content { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .sp-content.with-detail { grid-template-columns: 1fr 340px; }
        .sp-list-wrap { background: #fff; border-radius: 16px; border: 1px solid #f0f0f5; overflow: hidden; }
        .sp-loading { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
        .sp-skeleton { height: 76px; background: linear-gradient(90deg, #f0f0f5 25%, #e8e8f0 50%, #f0f0f5 75%); background-size: 200% 100%; border-radius: 10px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .sp-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 20px; color: #aaa; }
        .sp-empty span { font-size: 40px; }
        .sp-empty p { font-size: 14px; color: #888; }
        .sp-list { display: flex; flex-direction: column; }
        .sp-ticket { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #f8f8fc; cursor: pointer; transition: background 0.12s; }
        .sp-ticket:last-child { border-bottom: none; }
        .sp-ticket:hover { background: #fafafe; }
        .sp-ticket.selected { background: #f5f3ff; }
        .sp-ticket.urgent { border-left: 3px solid #dc2626; }
        .sp-ticket-left { display: flex; align-items: center; gap: 10px; min-width: 160px; }
        .sp-ticket-avatar { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .sp-ticket-name  { font-size: 13px; font-weight: 700; color: #111; }
        .sp-ticket-email { font-size: 11px; color: #888; margin-top: 1px; }
        .sp-ticket-mid { flex: 1; min-width: 0; }
        .sp-ticket-subject { font-size: 13px; font-weight: 700; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sp-ticket-preview { font-size: 12px; color: #888; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sp-ticket-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0; }
        .sp-ticket-time { font-size: 11px; color: #aaa; }
        .sp-user-type   { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; text-transform: capitalize; }
        .sp-status-chip { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
        .sp-detail { background: #fff; border-radius: 16px; border: 1px solid #f0f0f5; padding: 22px; display: flex; flex-direction: column; gap: 16px; height: fit-content; position: sticky; top: 20px; max-height: 88vh; overflow-y: auto; }
        .sp-detail::-webkit-scrollbar { width: 4px; }
        .sp-detail::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 2px; }
        .sp-detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .sp-detail-header h3 { font-size: 15px; font-weight: 700; color: #111; line-height: 1.4; }
        .sp-detail-meta { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
        .sp-detail-close { background: #f3f4f8; border: none; border-radius: 8px; width: 28px; height: 28px; cursor: pointer; font-size: 12px; color: #666; flex-shrink: 0; }
        .sp-detail-user { display: flex; align-items: center; gap: 12px; background: #f8f8fc; border-radius: 12px; padding: 14px; }
        .sp-detail-avatar { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .sp-detail-uname  { font-size: 14px; font-weight: 700; color: #111; }
        .sp-detail-uemail { font-size: 12px; color: #888; margin: 2px 0 4px; }
        .sp-detail-section { display: flex; flex-direction: column; gap: 8px; }
        .sp-detail-label { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .sp-detail-message { font-size: 13px; color: #444; line-height: 1.6; background: #f8f8fc; border-radius: 10px; padding: 12px 14px; border: 1px solid #f0f0f5; }
        .sp-detail-reply { font-size: 13px; color: #059669; line-height: 1.6; background: #f0fdf4; border-radius: 10px; padding: 12px 14px; border: 1px solid #d1fae5; }
        .sp-status-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .sp-status-btn { padding: 8px 10px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; font-size: 12px; font-weight: 600; color: #555; cursor: pointer; transition: all 0.15s; }
        .sp-status-btn:hover:not(:disabled) { background: #f8f8fc; }
        .sp-status-btn.active { font-weight: 700; }
        .sp-status-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .sp-reply-box { width: 100%; border: 1px solid #e5e5e5; border-radius: 10px; padding: 12px; font-size: 13px; font-family: inherit; color: #333; resize: vertical; outline: none; line-height: 1.5; transition: border-color 0.15s; box-sizing: border-box; }
        .sp-reply-box:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
        .sp-send-btn { background: linear-gradient(135deg, #1e1b4b, #3730a3); color: #fff; border: none; border-radius: 10px; padding: 11px; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; width: 100%; }
        .sp-send-btn:hover:not(:disabled) { opacity: 0.9; }
        .sp-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sp-detail-time { font-size: 11px; color: #ccc; text-align: center; }
      `}</style>
    </div>
  );
}