/**
 * UploadPage — CV Upload + Parse Results + Skill Validation
 *
 * Flow:
 *  1. User drops/selects a PDF or image CV
 *  2. File is sent to POST /parse
 *  3. Parsed result (candidate + skills) is displayed
 *  4. User reviews each skill: Confirm / Correct / Reject
 *  5. Once all skills reviewed, user can approve the full profile
 *
 * Also shows recently uploaded (pending) candidates for re-review.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  parseCV,
  listCandidates,
  getProfile,
  patchSkillRecord,
  approveProfile,
} from '../services/api'
import type {
  ParseResponse,
  CandidateOut,
  ProfileOut,
  SkillRecordOut,
} from '../services/api'
import StatusBadge from '../components/shared/StatusBadge'
import EmptyState from '../components/shared/EmptyState'

// ── Skill level labels (SFIA v9) ─────────────────────────────────
const LEVEL_LABELS: Record<number, string> = {
  1: 'Follow',
  2: 'Assist',
  3: 'Apply',
  4: 'Enable',
  5: 'Ensure / Advise',
  6: 'Initiate / Influence',
  7: 'Set Strategy',
}

const CONF_COLOR = (v: number) =>
  v >= 0.8 ? 'var(--green)' : v >= 0.6 ? 'var(--amber)' : 'var(--red)'

export default function UploadPage() {
  // ── Upload state ─────────────────────────────────────────────
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Review state ─────────────────────────────────────────────
  const [profile, setProfile] = useState<ProfileOut | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // ── Recent candidates ────────────────────────────────────────
  const [recentCandidates, setRecentCandidates] = useState<CandidateOut[]>([])
  const [recentLoading, setRecentLoading] = useState(true)

  // Load recent on mount
  useEffect(() => {
    listCandidates(undefined, 0, 20)
      .then(setRecentCandidates)
      .catch(() => {})
      .finally(() => setRecentLoading(false))
  }, [])

  // ── Upload handler ───────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    setUploadError(null)
    setParseResult(null)
    setProfile(null)

    try {
      const result = await parseCV(file)
      setParseResult(result)

      // Immediately load the full profile for review
      setProfileLoading(true)
      const profileData = await getProfile(result.profile_id)
      setProfile(profileData)

      // Refresh recent list
      listCandidates(undefined, 0, 20)
        .then(setRecentCandidates)
        .catch(() => {})
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setProfileLoading(false)
    }
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  // ── Load profile from a recent candidate ─────────────────────
  const loadProfile = async (candidate: CandidateOut) => {
    const latestProfile = candidate.profiles?.[0]
    if (!latestProfile) return

    setProfileLoading(true)
    setParseResult({
      candidate_id: candidate.id,
      profile_id: latestProfile.id,
      full_name: candidate.full_name,
      email: candidate.email,
      skills_count: latestProfile.skill_records?.length ?? 0,
      status: latestProfile.status,
    })
    try {
      const profileData = await getProfile(latestProfile.id)
      setProfile(profileData)
    } catch {
      // Profile might not load — that's OK
    } finally {
      setProfileLoading(false)
    }
  }

  // ── Skill validation handlers ────────────────────────────────
  const handleSkillAction = async (
    skill: SkillRecordOut,
    action: 'CONFIRMED' | 'CORRECTED' | 'REJECTED',
    correctedLevel?: number,
  ) => {
    if (!profile) return

    try {
      const updated = await patchSkillRecord(profile.id, skill.id, {
        validated_level: correctedLevel ?? skill.estimated_level,
        validation_status: action,
        actor: 'reviewer',
      })

      // Update local state
      setProfile(prev =>
        prev
          ? {
              ...prev,
              skill_records: prev.skill_records.map(s =>
                s.id === updated.id ? updated : s,
              ),
            }
          : null,
      )
    } catch (err) {
      console.error('Skill validation failed:', err)
    }
  }

  const handleApproveProfile = async () => {
    if (!profile) return
    try {
      await approveProfile(profile.id)
      setProfile(prev => (prev ? { ...prev, status: 'VALIDATED' } : null))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval failed')
    }
  }

  const pendingSkills = profile?.skill_records.filter(
    s => s.validation_status === 'PENDING',
  )
  const allReviewed = profile && pendingSkills?.length === 0

  return (
    <div className="upload-page">
      {/* ── Upload Zone ─────────────────────────────── */}
      <section className="upload-zone-section">
        <div
          className={`upload-dropzone ${dragOver ? 'dropzone-active' : ''} ${uploading ? 'dropzone-uploading' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tiff"
            onChange={onFileChange}
            hidden
          />
          {uploading ? (
            <>
              <div className="upload-spinner" />
              <span className="upload-label">Parsing CV…</span>
              <span className="upload-hint">Extracting skills with NLP pipeline</span>
            </>
          ) : (
            <>
              <span className="upload-icon">⬆</span>
              <span className="upload-label">Drop CV file here or click to browse</span>
              <span className="upload-hint">Accepts PDF, JPEG, PNG, TIFF — Max 20 MB</span>
            </>
          )}
        </div>

        {uploadError && (
          <div className="upload-error">
            <span className="error-icon">⚠</span>
            {uploadError}
          </div>
        )}

        {parseResult && !profile && !profileLoading && (
          <div className="upload-success">
            <span className="success-icon">✓</span>
            Parsed <strong>{parseResult.full_name ?? 'Unknown'}</strong> —{' '}
            {parseResult.skills_count} skills detected
          </div>
        )}
      </section>

      <div className="upload-columns">
        {/* ── Skill Review Panel ────────────────────── */}
        <section className="review-panel">
          <div className="section-bar">
            <h2 className="section-heading">Skill Review</h2>
            {profile && (
              <StatusBadge status={profile.status} size="md" />
            )}
          </div>

          {profileLoading && (
            <div className="review-loading">
              <div className="upload-spinner" />
              <span>Loading profile…</span>
            </div>
          )}

          {!profile && !profileLoading && (
            <EmptyState
              icon="⟨ ⟩"
              title="No profile loaded"
              description="Upload a CV or select a recent candidate to begin review."
            />
          )}

          {profile && (
            <>
              {/* Candidate summary */}
              <div className="review-summary">
                <div className="review-name">
                  {parseResult?.full_name ?? `Candidate #${profile.candidate_id}`}
                </div>
                <div className="review-meta">
                  {parseResult?.email && (
                    <span className="meta-email">{parseResult.email}</span>
                  )}
                  <span className="meta-dot">·</span>
                  <span>{profile.skill_records.length} skills</span>
                  <span className="meta-dot">·</span>
                  <span>{pendingSkills?.length ?? 0} pending</span>
                </div>
              </div>

              {/* Skills table */}
              <div className="review-skills">
                <div className="review-table-header">
                  <span className="rtcol-code">CODE</span>
                  <span className="rtcol-skill">SKILL</span>
                  <span className="rtcol-level">EST. LEVEL</span>
                  <span className="rtcol-conf">CONFIDENCE</span>
                  <span className="rtcol-status">STATUS</span>
                  <span className="rtcol-actions">ACTIONS</span>
                </div>

                {profile.skill_records.map((skill) => (
                  <SkillReviewRow
                    key={skill.id}
                    skill={skill}
                    onConfirm={() => handleSkillAction(skill, 'CONFIRMED')}
                    onReject={() => handleSkillAction(skill, 'REJECTED')}
                    onCorrect={(level) => handleSkillAction(skill, 'CORRECTED', level)}
                  />
                ))}
              </div>

              {/* Approve button */}
              {allReviewed && profile.status !== 'VALIDATED' && (
                <div className="review-approve-bar">
                  <button
                    className="btn-action btn-validate btn-lg"
                    onClick={handleApproveProfile}
                  >
                    ✓ Approve Full Profile
                  </button>
                </div>
              )}

              {profile.status === 'VALIDATED' && (
                <div className="review-approved-msg">
                  ✓ Profile approved
                  {profile.validated_by && ` by ${profile.validated_by}`}
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Recent Uploads Sidebar ────────────────── */}
        <aside className="recent-sidebar">
          <div className="section-bar">
            <h2 className="section-heading">Recent Uploads</h2>
            <span className="section-count">{recentCandidates.length}</span>
          </div>

          {recentLoading && <div className="recent-loading">Loading…</div>}

          <div className="recent-list">
            {recentCandidates.map((c) => {
              const latestProfile = c.profiles?.[0]
              const isActive = parseResult?.candidate_id === c.id

              return (
                <div
                  key={c.id}
                  className={`recent-row ${isActive ? 'recent-active' : ''}`}
                  onClick={() => loadProfile(c)}
                >
                  <div className="recent-avatar">
                    {(c.full_name ?? '?')
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="recent-info">
                    <span className="recent-name">{c.full_name ?? 'Unknown'}</span>
                    <span className="recent-meta">
                      {c.source_filename ?? 'No file'} ·{' '}
                      {new Date(c.uploaded_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  {latestProfile && (
                    <StatusBadge status={latestProfile.status} />
                  )}
                </div>
              )
            })}

            {!recentLoading && recentCandidates.length === 0 && (
              <div className="recent-empty">No uploads yet</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}


// ── Sub-component: single skill row in review ────────────────────

function SkillReviewRow({
  skill,
  onConfirm,
  onReject,
  onCorrect,
}: {
  skill: SkillRecordOut
  onConfirm: () => void
  onReject: () => void
  onCorrect: (level: number) => void
}) {
  const [correcting, setCorrecting] = useState(false)
  const [correctedLevel, setCorrectedLevel] = useState(skill.estimated_level)
  const isPending = skill.validation_status === 'PENDING'

  return (
    <div className={`review-row ${!isPending ? 'review-row-done' : ''}`}>
      <span className="rtcol-code">
        <span className="skill-code">{skill.sfia_code}</span>
      </span>
      <span className="rtcol-skill">
        <span className="skill-name">{skill.sfia_skill_name}</span>
        {skill.sfia_category && (
          <span className="skill-sub">{skill.sfia_category}</span>
        )}
      </span>
      <span className="rtcol-level">
        <span className="level-badge">L{skill.estimated_level}</span>
        <span className="level-label">
          {LEVEL_LABELS[skill.estimated_level] ?? ''}
        </span>
      </span>
      <span className="rtcol-conf">
        <span className="conf-track">
          <span
            className="conf-fill"
            style={{
              width: `${Math.round(skill.confidence_score * 100)}%`,
              background: CONF_COLOR(skill.confidence_score),
            }}
          />
        </span>
        <span
          className="conf-pct"
          style={{ color: CONF_COLOR(skill.confidence_score) }}
        >
          {Math.round(skill.confidence_score * 100)}%
        </span>
      </span>
      <span className="rtcol-status">
        <StatusBadge status={skill.validation_status} />
      </span>
      <span className="rtcol-actions">
        {isPending && !correcting && (
          <>
            <button
              className="btn-icon btn-save"
              onClick={onConfirm}
              title="Confirm"
            >
              ✓
            </button>
            <button
              className="btn-icon btn-edit"
              onClick={() => setCorrecting(true)}
              title="Correct Level"
            >
              ✎
            </button>
            <button
              className="btn-icon btn-delete"
              onClick={onReject}
              title="Reject"
            >
              ✕
            </button>
          </>
        )}

        {isPending && correcting && (
          <div className="correct-inline">
            <select
              className="edit-select"
              value={correctedLevel}
              onChange={(e) => setCorrectedLevel(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                <option key={l} value={l}>
                  L{l} – {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
            <button
              className="btn-icon btn-save"
              onClick={() => {
                onCorrect(correctedLevel)
                setCorrecting(false)
              }}
              title="Save correction"
            >
              ✓
            </button>
            <button
              className="btn-icon btn-cancel"
              onClick={() => setCorrecting(false)}
              title="Cancel"
            >
              ✕
            </button>
          </div>
        )}

        {!isPending && (
          <span className="review-done-label">
            {skill.validated_level && skill.validated_level !== skill.estimated_level
              ? `→ L${skill.validated_level}`
              : '—'}
          </span>
        )}
      </span>
    </div>
  )
}
