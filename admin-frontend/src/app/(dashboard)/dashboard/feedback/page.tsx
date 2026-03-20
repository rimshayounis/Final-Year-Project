'use client';

import { useEffect, useState } from 'react';

const BASE_URL = 'http://localhost:3000/api';

interface Feedback {
  _id: string;
  appointmentId: string;
  userId: { _id: string; fullName?: string; email?: string } | string;
  doctorId: { _id: string; fullName?: string; email?: string; doctorProfile?: { specialization?: string } } | string;
  rating: number;
  description: string;
  createdAt: string;
}

interface DoctorSummary {
  doctorId: string;
  name: string;
  specialization: string;
  avgRating: number;
  totalReviews: number;
  feedbacks: Feedback[];
}

type SortBy = 'rating_asc' | 'rating_desc' | 'reviews';
type FilterRating = 'all' | 'low' | 'high';

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading]     = useState(true);
  const [sortBy, setSortBy]       = useState<SortBy>('rating_desc');
  const [filterRating, setFilter] = useState<FilterRating>('all');
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<DoctorSummary | null>(null);
  const [viewMode, setViewMode]   = useState<'doctors' | 'all'>('doctors');

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res  = await fetch(`${BASE_URL}/feedback`);
        const data = await res.json();
        setFeedbacks(Array.isArray(data) ? data : (data.data || data.feedbacks || []));
      } catch (e) {
        console.error('Failed to fetch feedback:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, []);

  const getName = (ref: any) => {
    if (!ref) return 'Unknown';
    if (typeof ref === 'string') return `ID: ${ref.slice(-6)}`;
    return ref.fullName || ref.email || `ID: ${ref._id?.slice(-6)}`;
  };
  const getSpec = (ref: any) => {
    if (!ref || typeof ref === 'string') return '';
    return ref.doctorProfile?.specialization || '';
  };
  const getId = (ref: any) => {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    return ref._id || '';
  };

  const doctorMap: Record<string, DoctorSummary> = {};
  feedbacks.forEach(f => {
    const id = getId(f.doctorId);
    if (!id) return;
    if (!doctorMap[id]) {
      doctorMap[id] = { doctorId: id, name: getName(f.doctorId), specialization: getSpec(f.doctorId), avgRating: 0, totalReviews: 0, feedbacks: [] };
    }
    doctorMap[id].feedbacks.push(f);
    doctorMap[id].totalReviews++;
  });
  Object.values(doctorMap).forEach(d => {
    d.avgRating = Math.round((d.feedbacks.reduce((s, f) => s + f.rating, 0) / d.totalReviews) * 10) / 10;
  });

  let doctorList = Object.values(doctorMap);
  if (filterRating === 'low')  doctorList = doctorList.filter(d => d.avgRating < 3);
  if (filterRating === 'high') doctorList = doctorList.filter(d => d.avgRating >= 4);
  if (search) {
    const q = search.toLowerCase();
    doctorList = doctorList.filter(d => d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q));
  }
  if (sortBy === 'rating_asc')  doctorList.sort((a, b) => a.avgRating - b.avgRating);
  if (sortBy === 'rating_desc') doctorList.sort((a, b) => b.avgRating - a.avgRating);
  if (sortBy === 'reviews')     doctorList.sort((a, b) => b.totalReviews - a.totalReviews);

  const totalFeedbacks    = feedbacks.length;
  const avgPlatformRating = totalFeedbacks ? Math.round((feedbacks.reduce((s, f) => s + f.rating, 0) / totalFeedbacks) * 10) / 10 : 0;
  const lowRatedCount     = Object.values(doctorMap).filter(d => d.avgRating < 3).length;
  const highRatedCount    = Object.values(doctorMap).filter(d => d.avgRating >= 4).length;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="fb-stars">
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ color: s <= rating ? '#f59e0b' : '#e5e7eb', fontSize: '14px' }}>★</span>
      ))}
    </div>
  );

  const RatingBadge = ({ rating }: { rating: number }) => {
    const color = rating >= 4 ? '#059669' : rating >= 3 ? '#d97706' : '#dc2626';
    const bg    = rating >= 4 ? '#d1fae5' : rating >= 3 ? '#fef3c7' : '#fee2e2';
    return <span className="fb-rating-badge" style={{ color, background: bg }}>★ {rating.toFixed(1)}</span>;
  };

  return (
    <div className="fb-page">
      <div className="fb-header">
        <div className="fb-title-row">
          <span style={{ fontSize: 36 }}>⭐</span>
          <div>
            <h1>Doctor Feedback</h1>
            <p>Monitor patient ratings and reviews for all doctors</p>
          </div>
        </div>
        <div className="fb-header-stats">
          <div className="fb-hstat" style={{ background: '#fef3c7' }}>
            <div className="fb-hstat-val" style={{ color: '#d97706' }}>{avgPlatformRating || '—'}</div>
            <div className="fb-hstat-label">Avg Rating</div>
          </div>
          <div className="fb-hstat" style={{ background: '#ede9fe' }}>
            <div className="fb-hstat-val" style={{ color: '#6d28d9' }}>{totalFeedbacks}</div>
            <div className="fb-hstat-label">Total Reviews</div>
          </div>
          <div className="fb-hstat" style={{ background: '#fee2e2' }}>
            <div className="fb-hstat-val" style={{ color: '#dc2626' }}>{lowRatedCount}</div>
            <div className="fb-hstat-label">Low Rated</div>
          </div>
          <div className="fb-hstat" style={{ background: '#d1fae5' }}>
            <div className="fb-hstat-val" style={{ color: '#059669' }}>{highRatedCount}</div>
            <div className="fb-hstat-label">Top Rated</div>
          </div>
        </div>
      </div>

      <div className="fb-toolbar">
        <div className="fb-toolbar-left">
          <div className="fb-view-toggle">
            <button className={viewMode === 'doctors' ? 'active' : ''} onClick={() => setViewMode('doctors')}>By Doctor</button>
            <button className={viewMode === 'all'     ? 'active' : ''} onClick={() => setViewMode('all')}>All Reviews</button>
          </div>
          {viewMode === 'doctors' && (
            <div className="fb-filters">
              {(['all', 'low', 'high'] as FilterRating[]).map(f => (
                <button key={f} className={`fb-filter-btn ${filterRating === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : f === 'low' ? '⚠ Low (< 3)' : '✓ High (≥ 4)'}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="fb-toolbar-right">
          {viewMode === 'doctors' && (
            <select className="fb-sort" value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}>
              <option value="rating_desc">Highest Rated</option>
              <option value="rating_asc">Lowest Rated</option>
              <option value="reviews">Most Reviews</option>
            </select>
          )}
          <div className="fb-search">
            <span>🔍</span>
            <input placeholder="Search doctors..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')}>✕</button>}
          </div>
        </div>
      </div>

      <div className={`fb-content ${selected ? 'with-detail' : ''}`}>
        <div className="fb-main">
          {loading ? (
            <div className="fb-grid">
              {[1,2,3,4,5,6].map(i => <div key={i} className="fb-card-skeleton" />)}
            </div>
          ) : viewMode === 'doctors' ? (
            doctorList.length === 0 ? (
              <div className="fb-empty"><span>⭐</span><p>No feedback found</p></div>
            ) : (
              <div className="fb-grid">
                {doctorList.map(d => (
                  <div
                    key={d.doctorId}
                    className={`fb-doctor-card ${selected?.doctorId === d.doctorId ? 'selected' : ''} ${d.avgRating < 3 ? 'low-rated' : ''}`}
                    onClick={() => setSelected(selected?.doctorId === d.doctorId ? null : d)}
                  >
                    <div className="fb-card-top">
                      <div className="fb-doc-avatar">{d.name[0]?.toUpperCase() || 'D'}</div>
                      <RatingBadge rating={d.avgRating} />
                    </div>
                    <div className="fb-doc-name">Dr. {d.name}</div>
                    {d.specialization && <div className="fb-doc-spec">{d.specialization}</div>}
                    <StarRating rating={Math.round(d.avgRating)} />
                    <div className="fb-card-footer">
                      <span className="fb-review-count">{d.totalReviews} review{d.totalReviews !== 1 ? 's' : ''}</span>
                      {d.avgRating < 3 && <span className="fb-alert-tag">⚠ Needs attention</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="fb-reviews-list">
              {feedbacks.length === 0 ? (
                <div className="fb-empty"><span>⭐</span><p>No reviews yet</p></div>
              ) : (
                feedbacks.map(f => (
                  <div key={f._id} className="fb-review-row">
                    <div className="fb-review-left">
                      <div className="fb-review-doc">
                        <div className="fb-review-avatar">{getName(f.doctorId)[0]?.toUpperCase() || 'D'}</div>
                        <div>
                          <div className="fb-review-dname">Dr. {getName(f.doctorId)}</div>
                          <div className="fb-review-pname">by {getName(f.userId)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="fb-review-mid">
                      <StarRating rating={f.rating} />
                      {f.description && <div className="fb-review-desc">"{f.description}"</div>}
                    </div>
                    <div className="fb-review-right">
                      <RatingBadge rating={f.rating} />
                      <div className="fb-review-date">{formatDate(f.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {selected && viewMode === 'doctors' && (
          <div className="fb-detail">
            <div className="fb-detail-header">
              <h3>Dr. {selected.name}</h3>
              <button className="fb-detail-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            {selected.specialization && <div className="fb-detail-spec">{selected.specialization}</div>}
            <div className="fb-detail-rating-row">
              <div className="fb-detail-big-rating">
                <span style={{ fontSize: 32, fontWeight: 800, color: selected.avgRating >= 4 ? '#059669' : selected.avgRating >= 3 ? '#d97706' : '#dc2626' }}>
                  {selected.avgRating.toFixed(1)}
                </span>
                <span style={{ fontSize: 14, color: '#888' }}> / 5</span>
              </div>
              <StarRating rating={Math.round(selected.avgRating)} />
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{selected.totalReviews} reviews</div>
            </div>
            <div className="fb-dist">
              {[5,4,3,2,1].map(star => {
                const count = selected.feedbacks.filter(f => f.rating === star).length;
                const pct   = selected.totalReviews ? Math.round((count / selected.totalReviews) * 100) : 0;
                return (
                  <div key={star} className="fb-dist-row">
                    <span className="fb-dist-star">{star}★</span>
                    <div className="fb-dist-bar-wrap">
                      <div className="fb-dist-bar" style={{ width: `${pct}%`, background: star >= 4 ? '#059669' : star === 3 ? '#d97706' : '#dc2626' }} />
                    </div>
                    <span className="fb-dist-pct">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="fb-detail-reviews">
              <div className="fb-detail-reviews-title">Recent Reviews</div>
              {selected.feedbacks.slice(0, 5).map(f => (
                <div key={f._id} className="fb-detail-review-item">
                  <div className="fb-detail-review-top">
                    <div className="fb-detail-reviewer">{getName(f.userId)}</div>
                    <RatingBadge rating={f.rating} />
                  </div>
                  {f.description && <div className="fb-detail-review-text">"{f.description}"</div>}
                  <div className="fb-detail-review-date">{formatDate(f.createdAt)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .fb-page { display: flex; flex-direction: column; gap: 20px; font-family: 'Segoe UI', system-ui, sans-serif; }
        .fb-header { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 16px; padding: 24px 28px; border: 1px solid #f0f0f5; flex-wrap: wrap; gap: 16px; }
        .fb-title-row { display: flex; align-items: center; gap: 14px; }
        .fb-header h1 { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .fb-header p  { font-size: 13px; color: #888; margin-top: 3px; }
        .fb-header-stats { display: flex; gap: 10px; }
        .fb-hstat { padding: 12px 18px; border-radius: 12px; text-align: center; min-width: 80px; }
        .fb-hstat-val   { font-size: 22px; font-weight: 800; }
        .fb-hstat-label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; margin-top: 2px; }
        .fb-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .fb-toolbar-left, .fb-toolbar-right { display: flex; align-items: center; gap: 10px; }
        .fb-view-toggle { display: flex; background: #f3f4f8; border-radius: 10px; padding: 3px; }
        .fb-view-toggle button { padding: 7px 14px; border-radius: 8px; border: none; background: none; font-size: 13px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.15s; }
        .fb-view-toggle button.active { background: #fff; color: #111; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .fb-filters { display: flex; gap: 6px; }
        .fb-filter-btn { padding: 7px 12px; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; font-size: 12px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.15s; }
        .fb-filter-btn:hover { background: #f8f8fc; }
        .fb-filter-btn.active { background: #1e1b4b; color: #fff; border-color: #1e1b4b; }
        .fb-sort { padding: 8px 12px; border-radius: 10px; border: 1px solid #e5e5e5; background: #fff; font-size: 13px; color: #333; outline: none; cursor: pointer; }
        .fb-search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; padding: 8px 14px; }
        .fb-search:focus-within { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.08); }
        .fb-search input { border: none; outline: none; font-size: 14px; color: #333; width: 200px; }
        .fb-search button { background: none; border: none; cursor: pointer; color: #aaa; font-size: 12px; }
        .fb-content { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .fb-content.with-detail { grid-template-columns: 1fr 300px; }
        .fb-main { min-width: 0; }
        .fb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
        .fb-card-skeleton { height: 160px; background: linear-gradient(90deg, #f0f0f5 25%, #e8e8f0 50%, #f0f0f5 75%); background-size: 200% 100%; border-radius: 14px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .fb-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 20px; color: #aaa; background: #fff; border-radius: 16px; border: 1px solid #f0f0f5; }
        .fb-empty span { font-size: 40px; }
        .fb-empty p { font-size: 14px; color: #888; }
        .fb-doctor-card { background: #fff; border-radius: 14px; padding: 18px; border: 1px solid #f0f0f5; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; gap: 6px; }
        .fb-doctor-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
        .fb-doctor-card.selected { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
        .fb-doctor-card.low-rated { border-color: #fca5a5; background: #fff8f8; }
        .fb-card-top { display: flex; align-items: flex-start; justify-content: space-between; }
        .fb-doc-avatar { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; }
        .fb-rating-badge { font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 8px; }
        .fb-doc-name { font-size: 14px; font-weight: 700; color: #111; margin-top: 4px; }
        .fb-doc-spec { font-size: 11px; color: #888; }
        .fb-stars { display: flex; gap: 1px; }
        .fb-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
        .fb-review-count { font-size: 11px; color: #888; }
        .fb-alert-tag { font-size: 10px; font-weight: 700; background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 6px; }
        .fb-reviews-list { background: #fff; border-radius: 16px; border: 1px solid #f0f0f5; overflow: hidden; }
        .fb-review-row { display: flex; align-items: center; gap: 20px; padding: 16px 20px; border-bottom: 1px solid #f8f8fc; transition: background 0.12s; }
        .fb-review-row:last-child { border-bottom: none; }
        .fb-review-row:hover { background: #fafafe; }
        .fb-review-left { min-width: 180px; }
        .fb-review-doc { display: flex; align-items: center; gap: 10px; }
        .fb-review-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .fb-review-dname { font-size: 13px; font-weight: 700; color: #111; }
        .fb-review-pname { font-size: 11px; color: #888; margin-top: 1px; }
        .fb-review-mid { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .fb-review-desc { font-size: 13px; color: #555; font-style: italic; }
        .fb-review-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .fb-review-date { font-size: 11px; color: #aaa; }
        .fb-detail { background: #fff; border-radius: 16px; border: 1px solid #f0f0f5; padding: 20px; display: flex; flex-direction: column; gap: 14px; height: fit-content; position: sticky; top: 20px; max-height: 85vh; overflow-y: auto; }
        .fb-detail::-webkit-scrollbar { width: 4px; }
        .fb-detail::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 2px; }
        .fb-detail-header { display: flex; align-items: center; justify-content: space-between; }
        .fb-detail-header h3 { font-size: 15px; font-weight: 700; color: #111; }
        .fb-detail-close { background: #f3f4f8; border: none; border-radius: 8px; width: 28px; height: 28px; cursor: pointer; font-size: 12px; color: #666; }
        .fb-detail-spec { font-size: 12px; color: #888; background: #f3f4f8; padding: 4px 10px; border-radius: 6px; width: fit-content; }
        .fb-detail-rating-row { display: flex; flex-direction: column; align-items: center; background: #f8f8fc; border-radius: 12px; padding: 16px; gap: 6px; }
        .fb-dist { display: flex; flex-direction: column; gap: 6px; }
        .fb-dist-row { display: flex; align-items: center; gap: 8px; }
        .fb-dist-star { font-size: 11px; font-weight: 600; color: #666; width: 20px; }
        .fb-dist-bar-wrap { flex: 1; height: 6px; background: #f0f0f5; border-radius: 3px; overflow: hidden; }
        .fb-dist-bar { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
        .fb-dist-pct { font-size: 11px; color: #888; width: 20px; text-align: right; }
        .fb-detail-reviews { display: flex; flex-direction: column; gap: 10px; }
        .fb-detail-reviews-title { font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .fb-detail-review-item { background: #f8f8fc; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
        .fb-detail-review-top { display: flex; align-items: center; justify-content: space-between; }
        .fb-detail-reviewer { font-size: 12px; font-weight: 700; color: #333; }
        .fb-detail-review-text { font-size: 12px; color: #555; font-style: italic; line-height: 1.5; }
        .fb-detail-review-date { font-size: 11px; color: #aaa; }
      `}</style>
    </div>
  );
}