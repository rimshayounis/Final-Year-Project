'use client';

import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000/api';

interface Report {
  _id: string;
  reporterModel: 'User' | 'Doctor';
  reporterId: { _id: string; fullName?: string; email?: string } | string;
  reportedModel: 'User' | 'Doctor';
  reportedId: { _id: string; fullName?: string; email?: string } | string;
  reason: string;
  status: 'pending' | 'reviewed';
  postId?: string;
  createdAt: string;
}

type FilterStatus = 'all' | 'pending' | 'reviewed';

export default function ReportsPage() {
  const [reports, setReports]   = useState<Report[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<FilterStatus>('all');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<Report | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReports = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/reports`);
      const data = await res.json();
      setReports(data.data || []);
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const markReviewed = async (id: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`${BASE_URL}/reports/${id}/review`, { method: 'PATCH' });
      if (res.ok) {
        setReports(prev => prev.map(r => r._id === id ? { ...r, status: 'reviewed' } : r));
        if (selected?._id === id) setSelected(prev => prev ? { ...prev, status: 'reviewed' } : null);
        showToast('Report marked as reviewed', 'success');
      }
    } catch {
      showToast('Failed to update report', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const deletePost = async (report: Report) => {
    const postId = (report as any).postId;

    if (!postId) {
      showToast('No post linked to this report — file a new report from the app', 'error');
      return;
    }

    setUpdating(report._id);
    try {
      const res = await fetch(`${BASE_URL}/posts/admin/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetch(`${BASE_URL}/reports/${report._id}/review`, { method: 'PATCH' });
        setReports(prev => prev.map(r =>
          r._id === report._id ? { ...r, status: 'reviewed' } : r
        ));
        if (selected?._id === report._id) {
          setSelected(prev => prev ? { ...prev, status: 'reviewed' } : null);
        }
        showToast('Post deleted and report reviewed', 'success');
      } else {
        showToast('Failed to delete post', 'error');
      }
    } catch {
      showToast('Failed to delete post', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const dismissReport = async (report: Report) => {
    setUpdating(report._id);
    try {
      const res = await fetch(`${BASE_URL}/reports/${report._id}/review`, { method: 'PATCH' });
      if (res.ok) {
        setReports(prev => prev.map(r => r._id === report._id ? { ...r, status: 'reviewed' } : r));
        if (selected?._id === report._id) setSelected(prev => prev ? { ...prev, status: 'reviewed' } : null);
        showToast('Report dismissed', 'success');
      }
    } catch {
      showToast('Failed to dismiss report', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const getName = (ref: any) => {
    if (!ref) return 'Unknown';
    if (typeof ref === 'string') return ref.slice(-6);
    return ref.fullName || ref.email || ref._id?.slice(-6) || 'Unknown';
  };

  const filtered = reports.filter(r => {
    const matchStatus = filter === 'all' || r.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.reason?.toLowerCase().includes(q) ||
      getName(r.reporterId).toLowerCase().includes(q) ||
      getName(r.reportedId).toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const pendingCount  = reports.filter(r => r.status === 'pending').length;
  const reviewedCount = reports.filter(r => r.status === 'reviewed').length;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    <div className="rp-page">

      {toast && (
        <div className={`rp-toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="rp-header">
        <div className="rp-header-left">
          <div className="rp-title-row">
            <span className="rp-icon-big">🚨</span>
            <div>
              <h1>Post Reports</h1>
              <p>Review and action reports filed by users and doctors</p>
            </div>
          </div>
        </div>
        <div className="rp-header-stats">
          <div className="rp-hstat pending">
            <div className="rp-hstat-val">{pendingCount}</div>
            <div className="rp-hstat-label">Pending</div>
          </div>
          <div className="rp-hstat reviewed">
            <div className="rp-hstat-val">{reviewedCount}</div>
            <div className="rp-hstat-label">Reviewed</div>
          </div>
          <div className="rp-hstat total">
            <div className="rp-hstat-val">{reports.length}</div>
            <div className="rp-hstat-label">Total</div>
          </div>
        </div>
      </div>

      <div className="rp-toolbar">
        <div className="rp-filters">
          {(['all', 'pending', 'reviewed'] as FilterStatus[]).map(f => (
            <button key={f} className={`rp-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All Reports' : f === 'pending' ? '⚠ Pending' : '✓ Reviewed'}
              <span className="rp-filter-count">
                {f === 'all' ? reports.length : f === 'pending' ? pendingCount : reviewedCount}
              </span>
            </button>
          ))}
        </div>
        <div className="rp-search">
          <span>🔍</span>
          <input
            placeholder="Search by reason, reporter, reported..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      <div className={`rp-content ${selected ? 'with-detail' : ''}`}>

        <div className="rp-table-wrap">
          {loading ? (
            <div className="rp-loading">
              {[1,2,3,4,5].map(i => <div key={i} className="rp-row-skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rp-empty">
              <span>📭</span>
              <p>{search || filter !== 'all' ? 'No reports match your filters' : 'No reports filed yet'}</p>
            </div>
          ) : (
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Reporter</th>
                  <th>Reported</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr
                    key={r._id}
                    className={`rp-row ${selected?._id === r._id ? 'selected' : ''}`}
                    onClick={() => setSelected(selected?._id === r._id ? null : r)}
                  >
                    <td>
                      <div className="rp-user-cell">
                        <div className="rp-avatar" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                          {getName(r.reporterId)[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="rp-name">{getName(r.reporterId)}</div>
                          <div className="rp-model-tag" style={{ color: '#6d28d9' }}>{r.reporterModel}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="rp-user-cell">
                        <div className="rp-avatar" style={{ background: '#fee2e2', color: '#dc2626' }}>
                          {getName(r.reportedId)[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="rp-name">{getName(r.reportedId)}</div>
                          <div className="rp-model-tag" style={{ color: '#dc2626' }}>{r.reportedModel}</div>
                        </div>
                      </div>
                    </td>
                    <td><div className="rp-reason">{r.reason}</div></td>
                    <td><div className="rp-date">{formatDate(r.createdAt)}</div></td>
                    <td>
                      <span className={`rp-status-chip ${r.status}`}>
                        {r.status === 'pending' ? '⚠ Pending' : '✓ Reviewed'}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="rp-action-row">
                        <button
                          className="rp-btn-delete"
                          disabled={updating === r._id}
                          onClick={() => deletePost(r)}
                        >
                          🗑 Delete Post
                        </button>
                        <button
                          className="rp-btn-dismiss"
                          disabled={updating === r._id}
                          onClick={() => dismissReport(r)}
                        >
                          ✕ Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="rp-detail">
            <div className="rp-detail-header">
              <h3>Report Detail</h3>
              <button className="rp-detail-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="rp-detail-status-bar">
              <span className={`rp-status-chip ${selected.status}`}>
                {selected.status === 'pending' ? '⚠ Pending Review' : '✓ Reviewed'}
              </span>
              <span className="rp-detail-date">{formatDate(selected.createdAt)}</span>
            </div>

            <div className="rp-detail-section">
              <div className="rp-detail-label">Filed By (Reporter)</div>
              <div className="rp-detail-user-card" style={{ borderColor: '#6d28d9', background: '#faf8ff' }}>
                <div className="rp-detail-avatar" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                  {getName(selected.reporterId)[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="rp-detail-uname">{getName(selected.reporterId)}</div>
                  <div className="rp-detail-utype" style={{ color: '#6d28d9' }}>{selected.reporterModel}</div>
                </div>
              </div>
            </div>

            <div className="rp-detail-section">
              <div className="rp-detail-label">Reported Party</div>
              <div className="rp-detail-user-card" style={{ borderColor: '#dc2626', background: '#fff8f8' }}>
                <div className="rp-detail-avatar" style={{ background: '#fee2e2', color: '#dc2626' }}>
                  {getName(selected.reportedId)[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="rp-detail-uname">{getName(selected.reportedId)}</div>
                  <div className="rp-detail-utype" style={{ color: '#dc2626' }}>{selected.reportedModel}</div>
                </div>
              </div>
            </div>

            <div className="rp-detail-section">
              <div className="rp-detail-label">Reason for Report</div>
              <div className="rp-detail-reason">{selected.reason}</div>
            </div>

            <div className="rp-detail-actions">
              <div className="rp-detail-label">Take Action</div>
              <button
                className="rp-detail-btn-delete"
                disabled={updating === selected._id}
                onClick={() => deletePost(selected)}
              >
                🗑 Delete Reported Post
              </button>
              <button
                className="rp-detail-btn-reviewed"
                disabled={updating === selected._id}
                onClick={() => markReviewed(selected._id)}
              >
                ✓ Mark as Reviewed
              </button>
              <button
                className="rp-detail-btn-dismiss"
                disabled={updating === selected._id}
                onClick={() => dismissReport(selected)}
              >
                ✕ Dismiss (False Report)
              </button>
            </div>

            {selected.status === 'reviewed' && (
              <div className="rp-detail-done">
                <span>✓</span>
                <p>This report has been reviewed and actioned.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .rp-page { display: flex; flex-direction: column; gap: 20px; font-family: 'Segoe UI', system-ui, sans-serif; position: relative; }

        .rp-toast {
          position: fixed; top: 24px; right: 24px; z-index: 9999;
          padding: 12px 20px; border-radius: 12px;
          font-size: 14px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          animation: slideIn 0.3s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .rp-toast.success { background: #d1fae5; color: #065f46; }
        .rp-toast.error   { background: #fee2e2; color: #991b1b; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        .rp-header { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 16px; padding: 24px 28px; border: 1px solid #f0f0f5; }
        .rp-title-row { display: flex; align-items: center; gap: 14px; }
        .rp-icon-big { font-size: 36px; }
        .rp-header-left h1 { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .rp-header-left p  { font-size: 13px; color: #888; margin-top: 3px; }
        .rp-header-stats { display: flex; gap: 12px; }
        .rp-hstat { text-align: center; padding: 12px 20px; border-radius: 12px; min-width: 70px; }
        .rp-hstat.pending  { background: #fee2e2; }
        .rp-hstat.reviewed { background: #d1fae5; }
        .rp-hstat.total    { background: #f3f4f8; }
        .rp-hstat-val   { font-size: 22px; font-weight: 800; color: #111; }
        .rp-hstat-label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; margin-top: 2px; }
        .rp-hstat.pending  .rp-hstat-val { color: #dc2626; }
        .rp-hstat.reviewed .rp-hstat-val { color: #059669; }

        .rp-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .rp-filters { display: flex; gap: 6px; }
        .rp-filter-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1px solid #e5e5e5; background: #fff; font-size: 13px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.15s; }
        .rp-filter-btn:hover { background: #f8f8fc; border-color: #d0d0e0; }
        .rp-filter-btn.active { background: #1e1b4b; color: #fff; border-color: #1e1b4b; }
        .rp-filter-count { font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 10px; }
        .rp-filter-btn:not(.active) .rp-filter-count { background: #f0f0f5; color: #555; }
        .rp-search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; padding: 8px 14px; }
        .rp-search:focus-within { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
        .rp-search input { border: none; outline: none; font-size: 14px; color: #333; width: 280px; }
        .rp-search button { background: none; border: none; cursor: pointer; color: #aaa; font-size: 12px; }

        .rp-content { display: grid; grid-template-columns: 1fr; gap: 16px; transition: grid-template-columns 0.2s; }
        .rp-content.with-detail { grid-template-columns: 1fr 320px; }

        .rp-table-wrap { background: #fff; border-radius: 16px; border: 1px solid #f0f0f5; overflow: hidden; }
        .rp-loading { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
        .rp-row-skeleton { height: 56px; background: linear-gradient(90deg, #f0f0f5 25%, #e8e8f0 50%, #f0f0f5 75%); background-size: 200% 100%; border-radius: 10px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .rp-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 20px; color: #aaa; }
        .rp-empty span { font-size: 40px; }
        .rp-empty p { font-size: 14px; color: #888; font-weight: 500; }

        .rp-table { width: 100%; border-collapse: collapse; }
        .rp-table thead tr { background: #f8f8fc; }
        .rp-table th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f0f0f5; }
        .rp-row { border-bottom: 1px solid #f8f8fc; cursor: pointer; transition: background 0.12s; }
        .rp-row:last-child { border-bottom: none; }
        .rp-row:hover { background: #fafafe; }
        .rp-row.selected { background: #f5f3ff; }
        .rp-table td { padding: 14px 16px; vertical-align: middle; }

        .rp-user-cell { display: flex; align-items: center; gap: 10px; }
        .rp-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .rp-name { font-size: 13px; font-weight: 600; color: #111; }
        .rp-model-tag { font-size: 10px; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
        .rp-reason { font-size: 13px; color: #444; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rp-date { font-size: 12px; color: #888; white-space: nowrap; }
        .rp-status-chip { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
        .rp-status-chip.pending  { background: #fee2e2; color: #dc2626; }
        .rp-status-chip.reviewed { background: #d1fae5; color: #059669; }

        .rp-action-row { display: flex; gap: 6px; }
        .rp-btn-delete {
          padding: 5px 10px; border-radius: 8px;
          background: #fee2e2; color: #dc2626;
          border: 1px solid #fecaca; font-size: 11px; font-weight: 600;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .rp-btn-delete:hover:not(:disabled) { background: #dc2626; color: #fff; }
        .rp-btn-dismiss {
          padding: 5px 10px; border-radius: 8px;
          background: #f3f4f8; color: #666;
          border: 1px solid #e5e5e5; font-size: 11px; font-weight: 600;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .rp-btn-dismiss:hover:not(:disabled) { background: #e5e5e5; }
        .rp-btn-delete:disabled, .rp-btn-dismiss:disabled { opacity: 0.5; cursor: not-allowed; }

        .rp-detail { background: #fff; border-radius: 16px; border: 1px solid #f0f0f5; padding: 22px; display: flex; flex-direction: column; gap: 16px; height: fit-content; position: sticky; top: 20px; }
        .rp-detail-header { display: flex; align-items: center; justify-content: space-between; }
        .rp-detail-header h3 { font-size: 15px; font-weight: 700; color: #111; }
        .rp-detail-close { background: #f3f4f8; border: none; border-radius: 8px; width: 28px; height: 28px; cursor: pointer; font-size: 12px; color: #666; display: flex; align-items: center; justify-content: center; }
        .rp-detail-status-bar { display: flex; align-items: center; justify-content: space-between; }
        .rp-detail-date { font-size: 12px; color: #aaa; }
        .rp-detail-section { display: flex; flex-direction: column; gap: 8px; }
        .rp-detail-label { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .rp-detail-user-card { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 10px; border: 1px solid; }
        .rp-detail-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
        .rp-detail-uname { font-size: 14px; font-weight: 700; color: #111; }
        .rp-detail-utype { font-size: 11px; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
        .rp-detail-reason { font-size: 14px; color: #444; line-height: 1.6; background: #f8f8fc; border-radius: 10px; padding: 12px 14px; border: 1px solid #f0f0f5; }

        .rp-detail-actions { display: flex; flex-direction: column; gap: 8px; }
        .rp-detail-btn-delete {
          width: 100%; padding: 11px; border-radius: 10px;
          background: #dc2626; color: #fff;
          border: none; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: opacity 0.15s;
        }
        .rp-detail-btn-delete:hover:not(:disabled) { opacity: 0.88; }
        .rp-detail-btn-reviewed {
          width: 100%; padding: 11px; border-radius: 10px;
          background: linear-gradient(135deg, #059669, #047857); color: #fff;
          border: none; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: opacity 0.15s;
        }
        .rp-detail-btn-reviewed:hover:not(:disabled) { opacity: 0.88; }
        .rp-detail-btn-dismiss {
          width: 100%; padding: 11px; border-radius: 10px;
          background: #f3f4f8; color: #555;
          border: 1px solid #e5e5e5; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
        }
        .rp-detail-btn-dismiss:hover:not(:disabled) { background: #e5e5e5; }
        .rp-detail-btn-delete:disabled,
        .rp-detail-btn-reviewed:disabled,
        .rp-detail-btn-dismiss:disabled { opacity: 0.5; cursor: not-allowed; }

        .rp-detail-done {
          display: flex; align-items: center; gap: 10px;
          background: #d1fae5; border-radius: 10px; padding: 14px; color: #059669;
        }
        .rp-detail-done span { font-size: 20px; }
        .rp-detail-done p { font-size: 13px; font-weight: 600; }
      `}</style>
    </div>
  );
}