"use client";

import { useEffect, useState, useCallback } from "react";

const BASE_URL = "http://localhost:3000/api";

interface Report {
  _id: string;
  reporterModel: "User" | "Doctor";
  reporterId: { _id: string; fullName?: string; email?: string } | string;
  reportedModel: "User" | "Doctor";
  reportedId: { _id: string; fullName?: string; email?: string } | string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  postId?: string;
  createdAt: string;
}

interface PostData {
  _id: string;
  title?: string;
  description?: string;
  category?: string;
  backgroundColor?: string;
  mediaUrls?: string[];
  userId?: { fullName?: string } | string;
  createdAt?: string;
}

type FilterStatus = "all" | "pending" | "reviewed" | "dismissed";
type CategoryFilter = "all" | "posts" | "accounts";

export default function ReportsPage() {
  const [deletedPosts, setDeletedPosts] = useState<Set<string>>(new Set());
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [profileImages, setProfileImages] = useState<
    Record<string, string | null>
  >({});
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // ban status per reportedId: true = banned, false = not banned, undefined = loading
  const [bannedMap, setBannedMap] = useState<Record<string, boolean>>({});
  // fetched post for selected post report
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [postLoading, setPostLoading] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`${BASE_URL}/reports`);
      const data = await res.json();
      setReports(data.data || []);
      const postReports = (data.data || []).filter((r: Report) => r.postId && r.status === 'reviewed');
if (postReports.length > 0) {
  const results = await Promise.allSettled(
    postReports.map((r: Report) =>
      fetch(`${BASE_URL}/posts/${r.postId}`).then(res => ({ postId: r.postId!, ok: res.ok }))
    )
  );
  const deleted = new Set<string>();
  results.forEach(r => {
    if (r.status === 'fulfilled' && !r.value.ok) deleted.add(r.value.postId);
  });
  setDeletedPosts(deleted);
}
    } catch (e) {
      console.error("Failed to fetch reports:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Fetch profile images
  useEffect(() => {
    if (reports.length === 0) return;
    const seen = new Set<string>();
    const entries: { id: string; model: string }[] = [];
    reports.forEach((r) => {
      const rid =
        typeof r.reporterId === "string" ? r.reporterId : r.reporterId?._id;
      const rdid =
        typeof r.reportedId === "string" ? r.reportedId : r.reportedId?._id;
      if (rid && !seen.has(rid)) {
        seen.add(rid);
        entries.push({ id: rid, model: r.reporterModel });
      }
      if (rdid && !seen.has(rdid)) {
        seen.add(rdid);
        entries.push({ id: rdid, model: r.reportedModel });
      }
    });
    Promise.allSettled(
      entries.map(({ id, model }) =>
        fetch(
          `${BASE_URL}/profiles/${model === "Doctor" ? "doctor" : "user"}/${id}`,
        )
          .then((r) => r.json())
          .then((d) => ({ id, img: d.data?.profileImage || null }))
          .catch(() => ({ id, img: null })),
      ),
    ).then((results) => {
      const map: Record<string, string | null> = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") map[r.value.id] = r.value.img;
      });
      setProfileImages(map);
    });
  }, [reports]);

  // Fetch ban status for all account reports
  useEffect(() => {
    const accountReports = reports.filter((r) => !r.postId);
    if (accountReports.length === 0) return;
    const toFetch = accountReports.filter((r) => {
      const rid =
        typeof r.reportedId === "string" ? r.reportedId : r.reportedId?._id;
      return rid && bannedMap[rid] === undefined;
    });
    if (toFetch.length === 0) return;

    Promise.allSettled(
      toFetch.map((r) => {
        const rid =
          typeof r.reportedId === "string" ? r.reportedId : r.reportedId?._id;
        const model = r.reportedModel === "Doctor" ? "doctors" : "users";
        return fetch(`${BASE_URL}/${model}/${rid}`)
          .then((res) => res.json())
          .then((d) => {
            const doc = d.doctor ?? d.user ?? d.data ?? d;
            return { id: rid!, banned: !!doc?.isBanned };
          })
          .catch(() => ({ id: rid!, banned: false }));
      }),
    ).then((results) => {
      const map: Record<string, boolean> = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") map[r.value.id] = r.value.banned;
      });
      setBannedMap((prev) => ({ ...prev, ...map }));
    });
  }, [reports]);

  // Fetch post when a post report is selected
  const fetchPostForReport = useCallback(async (postId: string) => {
    setPostLoading(true);
    setSelectedPost(null);
    try {
      const res = await fetch(`${BASE_URL}/posts/${postId}`);
      const data = await res.json();
      setSelectedPost(data.data ?? data.post ?? data ?? null);
    } catch {
      setSelectedPost(null);
    } finally {
      setPostLoading(false);
    }
  }, []);

  const handleSelectReport = (r: Report) => {
    if (selected?._id === r._id) {
      setSelected(null);
      setSelectedPost(null);
      return;
    }
    setSelected(r);
    if (r.postId) fetchPostForReport(r.postId);
    else setSelectedPost(null);
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const markReviewed = async (id: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`${BASE_URL}/reports/${id}/review`, {
        method: "PATCH",
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r._id === id ? { ...r, status: "reviewed" } : r)),
        );
        if (selected?._id === id)
          setSelected((prev) =>
            prev ? { ...prev, status: "reviewed" } : null,
          );
        showToast("Report marked as reviewed", "success");
      }
    } catch {
      showToast("Failed to update report", "error");
    } finally {
      setUpdating(null);
    }
  };

  const deletePost = async (report: Report) => {
    if (!report.postId) {
      showToast("No post linked to this report", "error");
      return;
    }
    setUpdating(report._id);
    try {
      const res = await fetch(`${BASE_URL}/posts/admin/${report.postId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeletedPosts((prev) => new Set(prev).add(report.postId!)); // ← add this line
        await fetch(`${BASE_URL}/reports/${report._id}/review`, {
          method: "PATCH",
        });
        setReports((prev) =>
          prev.map((r) =>
            r._id === report._id ? { ...r, status: "reviewed" } : r,
          ),
        );
        if (selected?._id === report._id) {
          setSelected((prev) =>
            prev ? { ...prev, status: "reviewed" } : null,
          );
          setSelectedPost(null);
        }
        showToast("Post deleted and report reviewed", "success");
      } else {
        showToast("Failed to delete post", "error");
      }
    } catch {
      showToast("Failed to delete post", "error");
    } finally {
      setUpdating(null);
    }
  };

  const banAccount = async (report: Report) => {
    const reportedId = getReportedId(report);
    if (!reportedId) {
      showToast("Cannot resolve reported user", "error");
      return;
    }
    setUpdating(report._id);
    try {
      const res = await fetch(`${BASE_URL}/reports/${report._id}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedId,
          reportedModel: report.reportedModel,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBannedMap((prev) => ({ ...prev, [reportedId]: true }));
        setReports((prev) =>
          prev.map((r) =>
            r._id === report._id ? { ...r, status: "reviewed" } : r,
          ),
        );
        if (selected?._id === report._id)
          setSelected((prev) =>
            prev ? { ...prev, status: "reviewed" } : null,
          );
        showToast(`${report.reportedModel} account banned`, "success");
      } else {
        const msg =
          data?.message ||
          data?.error ||
          `Failed to ban account (${res.status})`;
        showToast(typeof msg === "string" ? msg : JSON.stringify(msg), "error");
      }
    } catch (e: any) {
      showToast(e?.message || "Failed to ban account", "error");
    } finally {
      setUpdating(null);
    }
  };

  const unbanAccount = async (report: Report) => {
    const reportedId = getReportedId(report);
    if (!reportedId) {
      showToast("Cannot resolve reported user", "error");
      return;
    }
    setUpdating(report._id);
    try {
      const res = await fetch(
        `${BASE_URL}/reports/unban/${reportedId}?model=${report.reportedModel}`,
        { method: "PATCH" },
      );
      if (res.ok) {
        setBannedMap((prev) => ({ ...prev, [reportedId]: false }));
        showToast(`${report.reportedModel} account unbanned`, "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data?.message || "Failed to unban account", "error");
      }
    } catch {
      showToast("Failed to unban account", "error");
    } finally {
      setUpdating(null);
    }
  };

  const dismissReport = async (report: Report) => {
    setUpdating(report._id);
    try {
      const res = await fetch(`${BASE_URL}/reports/${report._id}/dismiss`, {
        method: "PATCH",
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r._id === report._id ? { ...r, status: "dismissed" } : r,
          ),
        );
        if (selected?._id === report._id)
          setSelected((prev) =>
            prev ? { ...prev, status: "dismissed" } : null,
          );
        showToast("Report dismissed", "success");
      }
    } catch {
      showToast("Failed to dismiss report", "error");
    } finally {
      setUpdating(null);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isPostReport = (r: Report) => !!r.postId;
  const isAccountReport = (r: Report) => !r.postId;

  const getReportedId = (r: Report) =>
    typeof r.reportedId === "string" ? r.reportedId : r.reportedId?._id;

  const isBanned = (r: Report) => {
    const rid = getReportedId(r);
    return rid ? bannedMap[rid] === true : false;
  };

  const getName = (ref: any) => {
    if (!ref) return "Unknown";
    if (typeof ref === "string") return ref.slice(-6);
    return ref.fullName || ref.email || ref._id?.slice(-6) || "Unknown";
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  // ── Counts ────────────────────────────────────────────────────────────────

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const reviewedCount = reports.filter((r) => r.status === "reviewed").length;
  const postCount = reports.filter((r) => isPostReport(r)).length;
  const accountCount = reports.filter((r) => isAccountReport(r)).length;

  const filtered = reports.filter((r) => {
    const matchStatus = filter === "all" || r.status === filter;
    const matchCategory =
      category === "all" ||
      (category === "posts" ? isPostReport(r) : isAccountReport(r));
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.reason?.toLowerCase().includes(q) ||
      getName(r.reporterId).toLowerCase().includes(q) ||
      getName(r.reportedId).toLowerCase().includes(q);
    return matchStatus && matchCategory && matchSearch;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  const renderAvatar = (
    ref: any,
    model: "User" | "Doctor",
    size: "sm" | "md",
  ) => {
    const id = typeof ref === "string" ? ref : ref?._id;
    const img = id ? profileImages[id] : null;
    const dim = size === "sm" ? 34 : 38;
    const cls = size === "sm" ? "rp-avatar" : "rp-detail-avatar";
    const imgCls = size === "sm" ? "rp-avatar-img" : "rp-detail-avatar-img";
    const bg =
      model === "Doctor"
        ? { background: "#EEF1FF", color: "#6B7FED" }
        : { background: "#fee2e2", color: "#dc2626" };
    return img ? (
      <img
        src={`http://localhost:3000${img}`}
        className={imgCls}
        alt=""
        style={{ width: dim, height: dim }}
      />
    ) : (
      <div className={cls} style={bg}>
        {getName(ref)[0]?.toUpperCase() || "?"}
      </div>
    );
  };

  return (
    <div className="rp-page">
      {toast && (
        <div className={`rp-toast ${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="rp-header">
        <div className="rp-title-row">
          <span className="rp-icon-big">🚨</span>
          <div>
            <h1>Reports</h1>
            <p>Review and action reports filed by users and doctors</p>
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

      {/* Category Tabs */}
      <div className="rp-category-tabs">
        {(
          [
            {
              key: "all",
              label: "All Reports",
              icon: "📋",
              count: reports.length,
            },
            {
              key: "posts",
              label: "Post Reports",
              icon: "📄",
              count: postCount,
            },
            {
              key: "accounts",
              label: "Account Reports",
              icon: "👤",
              count: accountCount,
            },
          ] as {
            key: CategoryFilter;
            label: string;
            icon: string;
            count: number;
          }[]
        ).map((t) => (
          <button
            key={t.key}
            className={`rp-cat-tab ${category === t.key ? "active" : ""}`}
            onClick={() => {
              setCategory(t.key);
              setSelected(null);
              setSelectedPost(null);
            }}
          >
            <span className="rp-cat-icon">{t.icon}</span>
            <span className="rp-cat-label">{t.label}</span>
            <span className="rp-cat-count">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rp-toolbar">
        <div className="rp-filters">
          {(["all", "pending", "reviewed"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              className={`rp-filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? "All"
                : f === "pending"
                  ? "⚠ Pending"
                  : "✓ Reviewed"}
              <span className="rp-filter-count">
                {f === "all"
                  ? filtered.length
                  : filtered.filter((r) => r.status === f).length}
              </span>
            </button>
          ))}
        </div>
        <div className="rp-search">
          <span>🔍</span>
          <input
            placeholder="Search by reason, reporter, reported..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")}>✕</button>}
        </div>
      </div>

      {/* Main content */}
      <div className={`rp-content ${selected ? "with-detail" : ""}`}>
        <div className="rp-table-wrap">
          {loading ? (
            <div className="rp-loading">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rp-row-skeleton" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rp-empty">
              <span>
                {category === "posts"
                  ? "📄"
                  : category === "accounts"
                    ? "👤"
                    : "📭"}
              </span>
              <p>
                {search || filter !== "all"
                  ? "No reports match your filters"
                  : `No ${category === "all" ? "" : category + " "}reports yet`}
              </p>
            </div>
          ) : (
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reporter</th>
                  <th>Reported</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const banned = isBanned(r);
                  return (
                    <tr
                      key={r._id}
                      className={`rp-row ${selected?._id === r._id ? "selected" : ""}`}
                      onClick={() => handleSelectReport(r)}
                    >
                      <td>
                        <span
                          className={`rp-type-badge ${isPostReport(r) ? "post" : "account"}`}
                        >
                          {isPostReport(r) ? "📄 Post" : "👤 Account"}
                        </span>
                      </td>
                      <td>
                        <div className="rp-user-cell">
                          {renderAvatar(r.reporterId, r.reporterModel, "sm")}
                          <div>
                            <div className="rp-name">
                              {getName(r.reporterId)}
                            </div>
                            <div
                              className="rp-model-tag"
                              style={{ color: "#6B7FED" }}
                            >
                              {r.reporterModel}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rp-user-cell">
                          {renderAvatar(r.reportedId, r.reportedModel, "sm")}
                          <div>
                            <div className="rp-name">
                              {getName(r.reportedId)}
                            </div>
                            <div
                              className="rp-model-tag"
                              style={{ color: "#dc2626" }}
                            >
                              {r.reportedModel}
                            </div>
                            {isAccountReport(r) && (
                              <div
                                className={`rp-ban-pill ${banned ? "banned" : "active"}`}
                              >
                                {banned ? "🚫 Banned" : "✓ Active"}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rp-reason">{r.reason}</div>
                      </td>
                      <td>
                        <div className="rp-date">{formatDate(r.createdAt)}</div>
                      </td>
                      <td>
                        <span className={`rp-status-chip ${r.status}`}>
                          {r.status === "pending"
                            ? "⚠ Pending"
                            : r.status === "dismissed"
                              ? "✕ Dismissed"
                              : "✓ Reviewed"}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="rp-action-row">
                          {isPostReport(r) ? (
                            <button
                              className="rp-btn-delete"
                              disabled={
                                updating === r._id ||
                                deletedPosts.has(r.postId ?? "")
                              }
                              onClick={() => deletePost(r)}
                            >
                              🗑 Delete
                            </button>
                          ) : banned ? (
                            <button
                              className="rp-btn-unban"
                              disabled={updating === r._id}
                              onClick={() => unbanAccount(r)}
                            >
                              ✓ Unban
                            </button>
                          ) : (
                            <button
                              className="rp-btn-ban"
                              disabled={updating === r._id}
                              onClick={() => banAccount(r)}
                            >
                              🚫 Ban
                            </button>
                          )}
                          <button
                            className="rp-btn-dismiss"
                            disabled={updating === r._id}
                            onClick={() => dismissReport(r)}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="rp-detail">
            <div className="rp-detail-header">
              <h3>Report Detail</h3>
              <button
                className="rp-detail-close"
                onClick={() => {
                  setSelected(null);
                  setSelectedPost(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="rp-detail-status-bar">
              <span className={`rp-status-chip ${selected.status}`}>
                {selected.status === "pending" ? "⚠ Pending" : "✓ Reviewed"}
              </span>
              <span className="rp-detail-date">
                {formatDate(selected.createdAt)}
              </span>
            </div>

            {/* Reporter */}
            <div className="rp-detail-section">
              <div className="rp-detail-label">Filed By</div>
              <div
                className="rp-detail-user-card"
                style={{ borderColor: "#6B7FED", background: "#F0F4FF" }}
              >
                {renderAvatar(
                  selected.reporterId,
                  selected.reporterModel,
                  "md",
                )}
                <div>
                  <div className="rp-detail-uname">
                    {getName(selected.reporterId)}
                  </div>
                  <div className="rp-detail-utype" style={{ color: "#6B7FED" }}>
                    {selected.reporterModel}
                  </div>
                </div>
              </div>
            </div>

            {/* Reported Party */}
            <div className="rp-detail-section">
              <div className="rp-detail-label">Reported Party</div>
              <div
                className="rp-detail-user-card"
                style={{ borderColor: "#dc2626", background: "#fff8f8" }}
              >
                {renderAvatar(
                  selected.reportedId,
                  selected.reportedModel,
                  "md",
                )}
                <div style={{ flex: 1 }}>
                  <div className="rp-detail-uname">
                    {getName(selected.reportedId)}
                  </div>
                  <div className="rp-detail-utype" style={{ color: "#dc2626" }}>
                    {selected.reportedModel}
                  </div>
                  {isAccountReport(selected) && (
                    <div
                      className={`rp-ban-pill ${isBanned(selected) ? "banned" : "active"}`}
                      style={{ marginTop: 4 }}
                    >
                      {isBanned(selected)
                        ? "🚫 Currently Banned"
                        : "✓ Currently Active"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="rp-detail-section">
              <div className="rp-detail-label">Reason</div>
              <div className="rp-detail-reason">{selected.reason}</div>
            </div>

            {/* Post Preview (post reports only) */}
            {isPostReport(selected) && (
              <div className="rp-detail-section">
                <div className="rp-detail-label">Reported Post</div>
                {postLoading ? (
                  <div className="rp-post-loading">Loading post...</div>
                ) : selectedPost ? (
                  <div
                    className="rp-post-preview"
                    style={
                      selectedPost.backgroundColor
                        ? { background: selectedPost.backgroundColor }
                        : {}
                    }
                  >
                    {selectedPost.category && (
                      <span className="rp-post-category">
                        {selectedPost.category}
                      </span>
                    )}
                    {selectedPost.title && (
                      <div className="rp-post-title">{selectedPost.title}</div>
                    )}
                    <div className="rp-post-desc">
                      {selectedPost.description}
                    </div>
                    {selectedPost.mediaUrls &&
                      selectedPost.mediaUrls.length > 0 && (
                        <div className="rp-post-media">
                          {selectedPost.mediaUrls.slice(0, 2).map((url, i) => (
                            <img
                              key={i}
                              src={`http://localhost:3000${url}`}
                              className="rp-post-img"
                              alt=""
                            />
                          ))}
                          {selectedPost.mediaUrls.length > 2 && (
                            <div className="rp-post-more-media">
                              +{selectedPost.mediaUrls.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="rp-post-deleted">
                    Post may have been deleted already
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="rp-detail-actions">
              <div className="rp-detail-label">Take Action</div>

              {isPostReport(selected) ? (
                <button
                  className="rp-detail-btn-delete"
                  disabled={
                    updating === selected._id ||
                    deletedPosts.has(selected.postId ?? "")
                  }
                  onClick={() => deletePost(selected)}
                >
                  🗑 Delete Reported Post
                </button>
              ) : isBanned(selected) ? (
                <button
                  className="rp-detail-btn-unban"
                  disabled={updating === selected._id}
                  onClick={() => unbanAccount(selected)}
                >
                  ✓ Unban This Account
                </button>
              ) : (
                <button
                  className="rp-detail-btn-ban"
                  disabled={updating === selected._id}
                  onClick={() => banAccount(selected)}
                >
                  🚫 Ban This Account
                </button>
              )}

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

            {selected.status === "reviewed" && (
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

        .rp-toast { position: fixed; top: 24px; right: 24px; z-index: 9999; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; animation: slideIn 0.3s ease; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .rp-toast.success { background: #d1fae5; color: #065f46; }
        .rp-toast.error   { background: #fee2e2; color: #991b1b; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        .rp-header { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 16px; padding: 24px 28px; border: 1px solid #f0f0f5; }
        .rp-title-row { display: flex; align-items: center; gap: 14px; }
        .rp-icon-big { font-size: 36px; }
        .rp-header h1 { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
        .rp-header p  { font-size: 13px; color: #888; margin-top: 3px; }
        .rp-header-stats { display: flex; gap: 12px; }
        .rp-hstat { text-align: center; padding: 12px 20px; border-radius: 12px; min-width: 70px; }
        .rp-hstat.pending  { background: #fee2e2; }
        .rp-hstat.reviewed { background: #d1fae5; }
        .rp-hstat.total    { background: #f3f4f8; }
        .rp-hstat-val   { font-size: 22px; font-weight: 800; color: #111; }
        .rp-hstat-label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; margin-top: 2px; }
        .rp-hstat.pending  .rp-hstat-val { color: #dc2626; }
        .rp-hstat.reviewed .rp-hstat-val { color: #059669; }

        /* Category Tabs */
        .rp-category-tabs { display: flex; gap: 10px; }
        .rp-cat-tab { display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 14px; border: 1.5px solid #e5e5e5; background: #fff; font-size: 14px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.15s; flex: 1; justify-content: center; }
        .rp-cat-tab:hover { background: #f5f7ff; border-color: #c5cdff; }
        .rp-cat-tab.active { background: #6B7FED; color: #fff; border-color: #6B7FED; box-shadow: 0 4px 12px rgba(107,127,237,0.3); }
        .rp-cat-icon { font-size: 16px; }
        .rp-cat-label { font-size: 13px; }
        .rp-cat-count { font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.25); padding: 2px 8px; border-radius: 10px; }
        .rp-cat-tab:not(.active) .rp-cat-count { background: #f0f0f8; color: #555; }

        .rp-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .rp-filters { display: flex; gap: 6px; }
        .rp-filter-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1px solid #e5e5e5; background: #fff; font-size: 13px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.15s; }
        .rp-filter-btn:hover { background: #f8f8fc; }
        .rp-filter-btn.active { background: #1e293b; color: #fff; border-color: #1e293b; }
        .rp-filter-count { font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 10px; }
        .rp-filter-btn:not(.active) .rp-filter-count { background: #f0f0f5; color: #555; }
        .rp-search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; padding: 8px 14px; }
        .rp-search:focus-within { border-color: #6B7FED; box-shadow: 0 0 0 3px rgba(107,127,237,0.12); }
        .rp-search input { border: none; outline: none; font-size: 14px; color: #333; width: 260px; }
        .rp-search button { background: none; border: none; cursor: pointer; color: #aaa; font-size: 12px; }

        .rp-content { display: grid; grid-template-columns: 1fr; gap: 16px; transition: grid-template-columns 0.2s; }
        .rp-content.with-detail { grid-template-columns: 1fr 340px; }

        .rp-table-wrap { background: #fff; border-radius: 16px; border: 1px solid #E0E4FF; overflow: hidden; }
        .rp-loading { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
        .rp-row-skeleton { height: 56px; background: linear-gradient(90deg, #f0f0f5 25%, #e8e8f0 50%, #f0f0f5 75%); background-size: 200% 100%; border-radius: 10px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .rp-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 20px; color: #aaa; }
        .rp-empty span { font-size: 40px; }
        .rp-empty p { font-size: 14px; color: #888; font-weight: 500; }

        .rp-table { width: 100%; border-collapse: collapse; }
        .rp-table thead tr { background: #F0F4FF; }
        .rp-table th { padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E0E4FF; }
        .rp-row { border-bottom: 1px solid #EEF1FF; cursor: pointer; transition: background 0.12s; }
        .rp-row:last-child { border-bottom: none; }
        .rp-row:hover { background: #F5F7FF; }
        .rp-row.selected { background: #EEF1FF; }
        .rp-table td { padding: 12px 14px; vertical-align: middle; }

        .rp-type-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
        .rp-type-badge.post    { background: #fffbeb; color: #b45309; }
        .rp-type-badge.account { background: #f0f4ff; color: #4f46e5; }

        .rp-user-cell { display: flex; align-items: center; gap: 8px; }
        .rp-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .rp-avatar-img { border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .rp-name { font-size: 13px; font-weight: 600; color: #111; }
        .rp-model-tag { font-size: 10px; font-weight: 600; text-transform: uppercase; margin-top: 1px; }
        .rp-ban-pill { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; margin-top: 2px; }
        .rp-ban-pill.banned { background: #fee2e2; color: #dc2626; }
        .rp-ban-pill.active { background: #d1fae5; color: #059669; }
        .rp-reason { font-size: 13px; color: #444; max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rp-date { font-size: 12px; color: #888; white-space: nowrap; }
        .rp-status-chip { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
        .rp-status-chip.pending  { background: #fee2e2; color: #dc2626; }
        .rp-status-chip.reviewed { background: #d1fae5; color: #059669; }

        .rp-action-row { display: flex; gap: 5px; }
        .rp-btn-delete, .rp-btn-ban, .rp-btn-unban, .rp-btn-dismiss {
          padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 600;
          cursor: pointer; transition: all 0.15s; white-space: nowrap; border: 1px solid;
        }
        .rp-btn-delete  { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
        .rp-btn-delete:hover:not(:disabled)  { background: #dc2626; color: #fff; }
        .rp-btn-ban     { background: #fff0f0; color: #dc2626; border-color: #fecaca; }
        .rp-btn-ban:hover:not(:disabled)     { background: #dc2626; color: #fff; }
        .rp-btn-unban   { background: #f0fdf4; color: #059669; border-color: #bbf7d0; }
        .rp-btn-unban:hover:not(:disabled)   { background: #059669; color: #fff; }
        .rp-btn-dismiss { background: #f3f4f8; color: #666; border-color: #e5e5e5; }
        .rp-btn-dismiss:hover:not(:disabled) { background: #e5e5e5; }
        .rp-btn-delete:disabled, .rp-btn-ban:disabled, .rp-btn-unban:disabled, .rp-btn-dismiss:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Detail Panel */
        .rp-detail { background: #fff; border-radius: 16px; border: 1px solid #f0f0f5; padding: 22px; display: flex; flex-direction: column; gap: 16px; height: fit-content; position: sticky; top: 20px; max-height: calc(100vh - 120px); overflow-y: auto; }
        .rp-detail-header { display: flex; align-items: center; justify-content: space-between; }
        .rp-detail-header h3 { font-size: 15px; font-weight: 700; color: #111; }
        .rp-detail-close { background: #f3f4f8; border: none; border-radius: 8px; width: 28px; height: 28px; cursor: pointer; font-size: 12px; color: #666; display: flex; align-items: center; justify-content: center; }
        .rp-detail-status-bar { display: flex; align-items: center; justify-content: space-between; }
        .rp-detail-date { font-size: 12px; color: #aaa; }
        .rp-detail-section { display: flex; flex-direction: column; gap: 8px; }
        .rp-detail-label { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .rp-detail-user-card { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 10px; border: 1px solid; }
        .rp-detail-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
        .rp-detail-avatar-img { border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .rp-detail-uname { font-size: 14px; font-weight: 700; color: #111; }
        .rp-detail-utype { font-size: 11px; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
        .rp-detail-reason { font-size: 14px; color: #444; line-height: 1.6; background: #f8f8fc; border-radius: 10px; padding: 12px 14px; border: 1px solid #f0f0f5; }

        /* Post Preview */
        .rp-post-loading { font-size: 13px; color: #888; padding: 12px; text-align: center; }
        .rp-post-deleted { font-size: 13px; color: #aaa; padding: 12px; background: #f8f8fc; border-radius: 10px; text-align: center; border: 1px dashed #e0e0ef; }
        .rp-post-preview { border-radius: 12px; padding: 14px; border: 1px solid #e0e4f0; background: #f8faff; display: flex; flex-direction: column; gap: 8px; }
        .rp-post-category { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #6B7FED; background: #eef1ff; padding: 3px 8px; border-radius: 6px; align-self: flex-start; }
        .rp-post-title { font-size: 14px; font-weight: 700; color: #111; }
        .rp-post-desc { font-size: 13px; color: #444; line-height: 1.6; max-height: 80px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; }
        .rp-post-media { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
        .rp-post-img { width: 80px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #e0e4f0; }
        .rp-post-more-media { font-size: 11px; color: #888; align-self: center; }

        .rp-detail-actions { display: flex; flex-direction: column; gap: 8px; }
        .rp-detail-btn-delete, .rp-detail-btn-ban, .rp-detail-btn-unban,
        .rp-detail-btn-reviewed, .rp-detail-btn-dismiss {
          width: 100%; padding: 11px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; border: none;
        }
        .rp-detail-btn-delete   { background: #dc2626; color: #fff; }
        .rp-detail-btn-ban      { background: #dc2626; color: #fff; }
        .rp-detail-btn-unban    { background: #059669; color: #fff; }
        .rp-detail-btn-reviewed { background: linear-gradient(135deg, #059669, #047857); color: #fff; }
        .rp-detail-btn-dismiss  { background: #f3f4f8; color: #555; border: 1px solid #e5e5e5; }
        .rp-detail-btn-delete:hover:not(:disabled),
        .rp-detail-btn-ban:hover:not(:disabled),
        .rp-detail-btn-unban:hover:not(:disabled),
        .rp-detail-btn-reviewed:hover:not(:disabled) { opacity: 0.88; }
        .rp-detail-btn-dismiss:hover:not(:disabled) { background: #e5e5e5; }
        .rp-detail-btn-delete:disabled, .rp-detail-btn-ban:disabled, .rp-detail-btn-unban:disabled,
        .rp-detail-btn-reviewed:disabled, .rp-detail-btn-dismiss:disabled { opacity: 0.5; cursor: not-allowed; }

        .rp-detail-done { display: flex; align-items: center; gap: 10px; background: #d1fae5; border-radius: 10px; padding: 14px; color: #059669; }
        .rp-detail-done span { font-size: 20px; }
        .rp-detail-done p { font-size: 13px; font-weight: 600; }
      `}</style>
    </div>
  );
}
