'use client';

import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000/api';

interface Post {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  likes: number;
  comments: number;
  shares: number;
  mediaUrls: string[];
  userId: { _id: string; fullName: string } | string;
  approvedBy?: { _id: string; fullName: string } | string;
  rejectionReason?: string;
  createdAt: string;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

const statusColors: Record<string, { bg: string; color: string }> = {
  pending:  { bg: '#fef3c7', color: '#d97706' },
  approved: { bg: '#d1fae5', color: '#059669' },
  rejected: { bg: '#fee2e2', color: '#dc2626' },
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filtered, setFiltered] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Post | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch(`${BASE_URL}/posts/feed?limit=100`)
      .then(r => r.json())
      .then(data => {
        setPosts(data.data || []);
        setFiltered(data.data || []);
      })
      .catch(() => showToast('Failed to load posts', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Also fetch pending posts
  useEffect(() => {
    Promise.all([
      fetch(`${BASE_URL}/posts/feed?limit=100`).then(r => r.json()),
      fetch(`${BASE_URL}/posts/pending?limit=100`).then(r => r.json()),
    ]).then(([approved, pending]) => {
      const all = [
        ...(approved.data || []),
        ...(pending.data?.posts || pending.data || []),
      ];
      // deduplicate by _id
      const unique = Array.from(new Map(all.map(p => [p._id, p])).values());
      setPosts(unique);
      setFiltered(unique);
    }).catch(() => showToast('Failed to load posts', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = posts;
    if (activeTab !== 'all') result = result.filter(p => p.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        getName(p.userId).toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeTab, posts]);

  const getName = (ref: any) => {
    if (!ref) return '—';
    if (typeof ref === 'string') return ref;
    return ref.fullName || '—';
  };

  const counts: Record<FilterTab, number> = {
    all:      posts.length,
    pending:  posts.filter(p => p.status === 'pending').length,
    approved: posts.filter(p => p.status === 'approved').length,
    rejected: posts.filter(p => p.status === 'rejected').length,
  };

  const deletePost = async (postId: string, userId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/posts/${postId}/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p._id !== postId));
        setSelected(null);
        showToast('Post removed successfully', 'success');
      } else {
        showToast('Failed to remove post', 'error');
      }
    } catch {
      showToast('Failed to remove post', 'error');
    }
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
          <h1 className="page-title">Posts</h1>
          <p className="page-sub">Moderate and manage all posts on TruHealLink</p>
        </div>
        <div className="header-stats">
          {(['all','pending','approved','rejected'] as FilterTab[]).map((tab, i) => (
            <div key={tab} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <div className="hstat-divider" />}
              <div className="hstat" onClick={() => setActiveTab(tab)}>
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
          {(['all','pending','approved','rejected'] as FilterTab[]).map(tab => (
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
            placeholder="Search by title, category or author..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="clear-btn" onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="loading-state"><div className="spinner" /><p>Loading posts...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No posts found</p>
          <span>Try adjusting your filters</span>
        </div>
      ) : (
        <div className="posts-grid">
          {filtered.map(post => (
            <div key={post._id} className="post-card">
              <div className="post-card-top">
                <span className="post-category">{post.category}</span>
                <span className="post-status" style={statusColors[post.status]}>
                  {post.status}
                </span>
              </div>
              <h3 className="post-title">{post.title}</h3>
              <p className="post-desc">{post.description?.slice(0, 100)}{post.description?.length > 100 ? '...' : ''}</p>
              {post.mediaUrls?.length > 0 && (
                <div className="post-media">
                  <img
                    src={`http://localhost:3000${post.mediaUrls[0]}`}
                    alt="post media"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="post-meta-row">
                <span className="post-author">👤 {getName(post.userId)}</span>
                <div className="post-stats">
                  <span>❤️ {post.likes}</span>
                  <span>💬 {post.comments}</span>
                  <span>↗️ {post.shares}</span>
                </div>
              </div>
              <div className="post-footer">
                <span className="post-date">{new Date(post.createdAt).toLocaleDateString()}</span>
                <button className="btn-view-post" onClick={() => setSelected(post)}>View</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Detail Modal */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{selected.title}</h2>
                <div className="modal-meta">
                  <span className="post-category">{selected.category}</span>
                  <span className="post-status" style={statusColors[selected.status]}>{selected.status}</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-author">
                <span>👤</span>
                <div>
                  <div className="author-name">{getName(selected.userId)}</div>
                  <div className="author-date">{new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>

              <p className="modal-desc">{selected.description}</p>

              {selected.mediaUrls?.length > 0 && (
                <div className="modal-images">
                  {selected.mediaUrls.map((url, i) => (
                    <img
                      key={i}
                      src={`http://localhost:3000${url}`}
                      alt={`media ${i+1}`}
                      className="modal-img"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ))}
                </div>
              )}

              <div className="modal-stats">
                <div className="mstat"><span>❤️</span><strong>{selected.likes}</strong><span>Likes</span></div>
                <div className="mstat"><span>💬</span><strong>{selected.comments}</strong><span>Comments</span></div>
                <div className="mstat"><span>↗️</span><strong>{selected.shares}</strong><span>Shares</span></div>
              </div>

              {selected.rejectionReason && (
                <div className="rejection-reason">
                  <strong>Rejection Reason:</strong> {selected.rejectionReason}
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="btn-delete-post"
                  onClick={() => {
                    const userId = typeof selected.userId === 'string' ? selected.userId : selected.userId?._id;
                    if (userId) deletePost(selected._id, userId);
                  }}
                >
                  🗑 Remove Post
                </button>
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
        .hstat { padding: 12px 20px; text-align: center; cursor: pointer; }
        .hstat:hover { background: #f8f8fc; }
        .hstat-val   { display: block; font-size: 20px; font-weight: 800; }
        .hstat-label { display: block; font-size: 10px; color: #888; font-weight: 500; margin-top: 1px; text-transform: capitalize; }
        .hstat-divider { width: 1px; background: #f0f0f5; align-self: stretch; }

        .filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .tab-group { display: flex; gap: 6px; }
        .tab {
          display: flex; align-items: center; gap: 5px;
          padding: 9px 16px; border-radius: 10px;
          border: 1px solid #e5e5e5; background: #fff;
          font-size: 13px; font-weight: 500; color: #666;
          cursor: pointer; transition: all 0.15s;
        }
        .tab:hover  { border-color: #4f46e5; color: #4f46e5; }
        .tab.active { background: #4f46e5; color: #fff; border-color: #4f46e5; }
        .tab-count { background: rgba(0,0,0,0.08); font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 20px; }
        .tab.active .tab-count { background: rgba(255,255,255,0.25); }

        .search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #e5e5e5;
          border-radius: 12px; padding: 10px 16px; min-width: 280px;
        }
        .search-wrap input { border: none; outline: none; font-size: 14px; color: #333; background: none; flex: 1; }
        .search-wrap input::placeholder { color: #aaa; }
        .clear-btn { background: none; border: none; cursor: pointer; color: #aaa; font-size: 12px; }

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

        /* Posts Grid */
        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .post-card {
          background: #fff; border-radius: 16px; padding: 18px;
          border: 1px solid #f0f0f5; display: flex; flex-direction: column; gap: 10px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .post-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.07); }
        .post-card-top { display: flex; align-items: center; justify-content: space-between; }
        .post-category { font-size: 11px; font-weight: 600; color: #4f46e5; background: #ede9fe; padding: 3px 10px; border-radius: 20px; }
        .post-status   { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: capitalize; }
        .post-title    { font-size: 15px; font-weight: 700; color: #111; line-height: 1.3; }
        .post-desc     { font-size: 13px; color: #666; line-height: 1.5; }
        .post-media    { border-radius: 10px; overflow: hidden; height: 140px; }
        .post-media img { width: 100%; height: 100%; object-fit: cover; }
        .post-meta-row { display: flex; align-items: center; justify-content: space-between; }
        .post-author   { font-size: 12px; color: #888; }
        .post-stats    { display: flex; gap: 10px; font-size: 12px; color: #888; }
        .post-footer   { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid #f0f0f5; }
        .post-date     { font-size: 11px; color: #aaa; }
        .btn-view-post {
          padding: 5px 14px; border-radius: 8px;
          background: #ede9fe; color: #4f46e5;
          border: 1px solid #ddd6fe; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-view-post:hover { background: #4f46e5; color: #fff; }

        /* Modal */
        .overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }
        .modal {
          background: #fff; border-radius: 20px;
          width: 100%; max-width: 560px; max-height: 85vh;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid #f0f0f5; gap: 12px;
        }
        .modal-title { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 6px; }
        .modal-meta  { display: flex; align-items: center; gap: 8px; }
        .modal-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: #f3f4f8; border: none; cursor: pointer;
          font-size: 13px; color: #666; flex-shrink: 0;
        }
        .modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-author { display: flex; align-items: center; gap: 10px; }
        .author-name  { font-size: 14px; font-weight: 600; color: #111; }
        .author-date  { font-size: 12px; color: #888; }
        .modal-desc   { font-size: 14px; color: #444; line-height: 1.6; }
        .modal-images { display: flex; flex-direction: column; gap: 8px; }
        .modal-img    { width: 100%; border-radius: 12px; max-height: 200px; object-fit: cover; }
        .modal-stats  { display: flex; gap: 16px; background: #f8f8fc; border-radius: 12px; padding: 14px; }
        .mstat        { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; }
        .mstat span   { font-size: 18px; }
        .mstat strong { font-size: 18px; font-weight: 800; color: #111; }
        .mstat span:last-child { font-size: 11px; color: #888; font-weight: normal; }
        .rejection-reason {
          background: #fee2e2; border-radius: 10px; padding: 12px 14px;
          font-size: 13px; color: #991b1b;
        }
        .modal-actions { display: flex; gap: 10px; }
        .btn-delete-post {
          padding: 10px 20px; border-radius: 10px;
          background: #fee2e2; color: #dc2626;
          border: 1px solid #fecaca; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-delete-post:hover { background: #dc2626; color: #fff; }
      `}</style>
    </div>
  );
}
