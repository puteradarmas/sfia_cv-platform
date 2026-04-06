/**
 * PersonnelPage — Browse & Edit Personnel Records
 *
 * Lists all candidates from the database with search/filter.
 * Selecting a candidate opens a detail panel for editing:
 *  - Personal info (name, email, phone)
 *  - Skill profile review
 *
 * Uses the existing CandidateDetail/SkillRow components where useful,
 * but wired to the real API instead of mock data.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listCandidates,
  getProfile,
  updateCandidate,
  patchSkillRecord,
} from '../services/api'
import type {
  CandidateOut,
  ProfileOut,
  SkillRecordOut,
} from '../services/api'
import StatusBadge from '../components/shared/StatusBadge'
import EmptyState from '../components/shared/EmptyState'

const LEVEL_LABELS: Record<number, string> = {
  1: 'Follow', 2: 'Assist', 3: 'Apply', 4: 'Enable',
  5: 'Ensure / Advise', 6: 'Initiate / Influence', 7: 'Set Strategy',
}

export default function PersonnelPage() {
  // ── List state ───────────────────────────────────────────────
  const [candidates, setCandidates] = useState<CandidateOut[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // ── Detail state ─────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [profile, setProfile] = useState<ProfileOut | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // ── Edit state ───────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)

  // Load candidates
  const loadCandidates = useCallback(() => {
    setLoading(true)
    listCandidates(statusFilter || undefined, 0, 100)
      .then(setCandidates)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { loadCandidates() }, [loadCandidates])

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return candidates
    const q = search.toLowerCase()
    return candidates.filter(
      c =>
        (c.full_name ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q),
    )
  }, [candidates, search])

  // Selected candidate
  const selectedCandidate = useMemo(
    () => candidates.find(c => c.id === selectedId) ?? null,
    [candidates, selectedId],
  )

  // Load profile when selection changes
  useEffect(() => {
    if (!selectedCandidate) {
      setProfile(null)
      setEditing(false)
      return
    }

    const latestProfile = selectedCandidate.profiles?.[0]
    if (!latestProfile) {
      setProfile(null)
      return
    }

    setProfileLoading(true)
    getProfile(latestProfile.id)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false))

    // Pre-fill edit form
    setEditForm({
      full_name: selectedCandidate.full_name ?? '',
      email: selectedCandidate.email ?? '',
      phone: selectedCandidate.phone ?? '',
    })
    setEditing(false)
  }, [selectedCandidate])

  // ── Save personal info ───────────────────────────────────────
  const handleSave = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      await updateCandidate(selectedId, editForm)
      loadCandidates()
      setEditing(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Skill-level correction ──────────────────────────────────
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
      console.error('Skill update failed:', err)
    }
  }

  return (
    <div className="personnel-page">
      {/* ── Left: Candidate list ────────────────────── */}
      <aside className="personnel-list">
        <div className="personnel-toolbar">
          <input
            className="personnel-search"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="personnel-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="VALIDATED">Validated</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="personnel-count">
          {filtered.length} personnel record{filtered.length !== 1 ? 's' : ''}
        </div>

        <div className="personnel-rows">
          {loading && <div className="personnel-loading">Loading…</div>}

          {!loading && filtered.length === 0 && (
            <div className="personnel-empty">No records found</div>
          )}

          {filtered.map(c => {
            const latestProfile = c.profiles?.[0]
            const isActive = selectedId === c.id

            return (
              <div
                key={c.id}
                className={`personnel-row ${isActive ? 'personnel-row-active' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <div className="personnel-avatar">
                  {(c.full_name ?? '?')
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="personnel-row-body">
                  <div className="personnel-row-top">
                    <span className="personnel-name">
                      {c.full_name ?? 'Unknown'}
                    </span>
                    {latestProfile && (
                      <StatusBadge status={latestProfile.status} />
                    )}
                  </div>
                  <div className="personnel-row-meta">
                    <span>{c.email ?? '—'}</span>
                    <span className="meta-dot">·</span>
                    <span>
                      {new Date(c.uploaded_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      {/* ── Right: Detail / Edit panel ──────────────── */}
      <section className="personnel-detail">
        {!selectedCandidate && (
          <EmptyState
            icon="⊞"
            title="Select a person"
            description="Choose someone from the list to view and edit their profile."
          />
        )}

        {selectedCandidate && (
          <>
            {/* Personal info card */}
            <div className="personnel-card">
              <div className="card-header">
                <h3 className="card-title">Personal Information</h3>
                {!editing ? (
                  <button
                    className="btn-action btn-reset"
                    onClick={() => setEditing(true)}
                  >
                    ✎ Edit
                  </button>
                ) : (
                  <div className="card-edit-actions">
                    <button
                      className="btn-action btn-validate"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : '✓ Save'}
                    </button>
                    <button
                      className="btn-action btn-reject"
                      onClick={() => {
                        setEditing(false)
                        setEditForm({
                          full_name: selectedCandidate.full_name ?? '',
                          email: selectedCandidate.email ?? '',
                          phone: selectedCandidate.phone ?? '',
                        })
                      }}
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="card-fields">
                <div className="card-field">
                  <label className="field-label">Full Name</label>
                  {editing ? (
                    <input
                      className="edit-input"
                      value={editForm.full_name}
                      onChange={e =>
                        setEditForm(f => ({ ...f, full_name: e.target.value }))
                      }
                    />
                  ) : (
                    <span className="field-value">
                      {selectedCandidate.full_name ?? '—'}
                    </span>
                  )}
                </div>

                <div className="card-field">
                  <label className="field-label">Email</label>
                  {editing ? (
                    <input
                      className="edit-input"
                      type="email"
                      value={editForm.email}
                      onChange={e =>
                        setEditForm(f => ({ ...f, email: e.target.value }))
                      }
                    />
                  ) : (
                    <span className="field-value">
                      {selectedCandidate.email ?? '—'}
                    </span>
                  )}
                </div>

                <div className="card-field">
                  <label className="field-label">Phone</label>
                  {editing ? (
                    <input
                      className="edit-input"
                      value={editForm.phone}
                      onChange={e =>
                        setEditForm(f => ({ ...f, phone: e.target.value }))
                      }
                    />
                  ) : (
                    <span className="field-value">
                      {selectedCandidate.phone ?? '—'}
                    </span>
                  )}
                </div>

                <div className="card-field">
                  <label className="field-label">Source File</label>
                  <span className="field-value field-mono">
                    {selectedCandidate.source_filename ?? '—'}
                  </span>
                </div>

                <div className="card-field">
                  <label className="field-label">Uploaded</label>
                  <span className="field-value">
                    {new Date(selectedCandidate.uploaded_at).toLocaleString(
                      'en-GB',
                      {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills profile */}
            <div className="personnel-card personnel-card-skills">
              <div className="card-header">
                <h3 className="card-title">SFIA Skills Profile</h3>
                {profile && <StatusBadge status={profile.status} size="md" />}
              </div>

              {profileLoading && (
                <div className="card-loading">Loading skills…</div>
              )}

              {!profileLoading && !profile && (
                <div className="card-empty">No skill profile found.</div>
              )}

              {profile && profile.skill_records.length === 0 && (
                <div className="card-empty">No skills mapped.</div>
              )}

              {profile &&
                profile.skill_records.map(skill => (
                  <PersonnelSkillRow
                    key={skill.id}
                    skill={skill}
                    onConfirm={() => handleSkillAction(skill, 'CONFIRMED')}
                    onReject={() => handleSkillAction(skill, 'REJECTED')}
                    onCorrect={level =>
                      handleSkillAction(skill, 'CORRECTED', level)
                    }
                  />
                ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}


// ── Sub-component: skill row in personnel detail ─────────────────

function PersonnelSkillRow({
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
  const [level, setLevel] = useState(skill.estimated_level)
  const isPending = skill.validation_status === 'PENDING'

  const confColor =
    skill.confidence_score >= 0.8
      ? 'var(--green)'
      : skill.confidence_score >= 0.6
        ? 'var(--amber)'
        : 'var(--red)'

  return (
    <div className="pskill-row">
      <div className="pskill-main">
        <span className="skill-code">{skill.sfia_code}</span>
        <div className="pskill-info">
          <span className="skill-name">{skill.sfia_skill_name}</span>
          {skill.sfia_category && (
            <span className="skill-sub">{skill.sfia_category}</span>
          )}
        </div>
        <span className="level-badge">L{skill.estimated_level}</span>
        <span className="level-label">
          {LEVEL_LABELS[skill.estimated_level] ?? ''}
        </span>
        <span className="conf-track" style={{ width: 48 }}>
          <span
            className="conf-fill"
            style={{
              width: `${Math.round(skill.confidence_score * 100)}%`,
              background: confColor,
            }}
          />
        </span>
        <span className="conf-pct" style={{ color: confColor }}>
          {Math.round(skill.confidence_score * 100)}%
        </span>
        <StatusBadge status={skill.validation_status} />
      </div>

      {isPending && !correcting && (
        <div className="pskill-actions">
          <button className="btn-icon btn-save" onClick={onConfirm} title="Confirm">✓</button>
          <button className="btn-icon btn-edit" onClick={() => setCorrecting(true)} title="Correct">✎</button>
          <button className="btn-icon btn-delete" onClick={onReject} title="Reject">✕</button>
        </div>
      )}

      {isPending && correcting && (
        <div className="pskill-actions">
          <select
            className="edit-select"
            value={level}
            onChange={e => setLevel(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7].map(l => (
              <option key={l} value={l}>L{l} – {LEVEL_LABELS[l]}</option>
            ))}
          </select>
          <button className="btn-icon btn-save" onClick={() => { onCorrect(level); setCorrecting(false) }}>✓</button>
          <button className="btn-icon btn-cancel" onClick={() => setCorrecting(false)}>✕</button>
        </div>
      )}
    </div>
  )
}
