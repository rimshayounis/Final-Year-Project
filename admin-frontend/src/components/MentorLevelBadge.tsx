'use client';

export interface MentorLevel {
  level: number;
  title: string;
  score: number;
  nextScore: number | null;
}

const MENTOR_STYLE: Record<number, { bg: string; color: string; border: string }> = {
  1: { bg: '#f3f4f8', color: '#888',    border: '#e0e0e0' },
  2: { bg: '#d1fae5', color: '#059669', border: '#a7f3d0' },
  3: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  4: { bg: '#ede9fe', color: '#6B7FED', border: '#ddd6fe' },
  5: { bg: '#FFF8E1', color: '#d97706', border: '#fde68a' },
};

/**
 * Compact inline badge — use next to doctor name in tables.
 * e.g. <MentorLevelBadge level={mentorLevels[doctor._id]} size="sm" />
 */
export function MentorLevelBadge({
  level,
  size = 'sm',
}: {
  level: MentorLevel | null | undefined;
  size?: 'sm' | 'md';
}) {
  if (!level) return null;
  const style = MENTOR_STYLE[level.level] ?? MENTOR_STYLE[1];
  const isSmall = size === 'sm';

  return (
    <span
      title={`Mentor Level ${level.level} · ${level.title} · Score: ${level.score}${level.nextScore ? ` / ${level.nextScore}` : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        borderRadius: 20,
        padding: isSmall ? '2px 7px' : '4px 10px',
        fontSize: isSmall ? 10 : 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        letterSpacing: 0.2,
        flexShrink: 0,
        alignSelf: 'flex-start',
        width: 'fit-content',
      }}
    >
      🎖️ Lv.{level.level} {level.title}
    </span>
  );
}

/** Full card row — use inside modals/detail panels. */
export function MentorLevelCard({ level }: { level: MentorLevel | null | undefined }) {
  if (!level) return (
    <div style={{
      background: '#f8f8fc', borderRadius: 12, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mentor Level</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#ccc' }}>—</div>
      <div style={{ fontSize: 11, color: '#aaa' }}>Loading…</div>
    </div>
  );

  const style = MENTOR_STYLE[level.level] ?? MENTOR_STYLE[1];
  const pct = level.nextScore ? Math.min(100, Math.round((level.score / level.nextScore) * 100)) : 100;

  return (
    <div style={{
      background: style.bg, borderRadius: 12, padding: '14px 16px',
      border: `1px solid ${style.border}`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 11, color: style.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mentor Level</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: style.color }}>
        🎖️ Lv.{level.level} {level.title}
      </div>
      <div style={{ fontSize: 11, color: style.color, opacity: 0.8 }}>
        {level.nextScore ? `${level.score} / ${level.nextScore} pts to next level` : `${level.score} pts · Max Level`}
      </div>
      {/* Progress bar */}
      <div style={{ height: 5, background: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: style.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

/** Batch-fetch mentor levels for a list of doctor IDs. Returns a map doctorId → MentorLevel */
export async function fetchMentorLevels(
  doctorIds: string[],
  baseUrl: string,
): Promise<Record<string, MentorLevel>> {
  const results = await Promise.allSettled(
    doctorIds.map(id =>
      fetch(`${baseUrl}/points-reward/${id}/mentor-level`)
        .then(r => r.json())
        .then(r => ({ id, data: r.data as MentorLevel }))
        .catch(() => ({ id, data: null }))
    )
  );
  const map: Record<string, MentorLevel> = {};
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value.data) map[r.value.id] = r.value.data;
  });
  return map;
}
