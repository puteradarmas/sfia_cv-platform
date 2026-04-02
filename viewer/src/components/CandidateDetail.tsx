import { useState } from 'react'
import type { Candidate, SFIASkill, SkillLevel } from '../types/types'
import { sfiaSkillDefinitions } from '../data/mockData'
import SkillRow from './SkillRow'
import AddSkillModal from './AddSkillModal'

interface Props {
  candidate: Candidate | null
  onUpdate: (c: Candidate) => void
}

export default function CandidateDetail({ candidate, onUpdate }: Props) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [cvExpanded, setCvExpanded] = useState(false)

  if (!candidate) {
    return (
      <div className="detail-empty">
        <div className="empty-icon">⟨ ⟩</div>
        <p>Select a candidate to review their SFIA skill mapping</p>
      </div>
    )
  }

  const handleValidate = () => onUpdate({ ...candidate, status: 'validated' })
  const handleReject = () => onUpdate({ ...candidate, status: 'rejected' })
  const handleReset = () => onUpdate({ ...candidate, status: 'pending' })

  const handleSkillUpdate = (updated: SFIASkill) => {
    onUpdate({
      ...candidate,
      skills: candidate.skills.map(s => s.id === updated.id ? updated : s)
    })
  }

  const handleSkillDelete = (id: string) => {
    onUpdate({ ...candidate, skills: candidate.skills.filter(s => s.id !== id) })
  }

  const handleSkillAdd = (skill: SFIASkill) => {
    onUpdate({ ...candidate, skills: [...candidate.skills, skill] })
    setShowAddModal(false)
  }

  const grouped = candidate.skills.reduce<Record<string, SFIASkill[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {})

  const avgConf = candidate.skills.length
    ? Math.round((candidate.skills.reduce((s, sk) => s + sk.confidence, 0) / candidate.skills.length) * 100)
    : 0

  return (
    <section className="detail-panel">
      {/* Candidate header */}
      <div className="detail-header">
        <div className="detail-identity">
          <div className="detail-avatar">{candidate.name.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
          <div className="detail-info">
            <h2 className="detail-name">{candidate.name}</h2>
            <div className="detail-meta">
              <span>{candidate.role}</span>
              <span className="meta-dot">·</span>
              <span>{candidate.email}</span>
            </div>
          </div>
        </div>
        <div className="detail-actions">
          {candidate.status !== 'validated' && (
            <button className="btn-action btn-validate" onClick={handleValidate}>
              ✓ Validate
            </button>
          )}
          {candidate.status !== 'rejected' && (
            <button className="btn-action btn-reject" onClick={handleReject}>
              ✕ Reject
            </button>
          )}
          {candidate.status !== 'pending' && (
            <button className="btn-action btn-reset" onClick={handleReset}>
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="detail-stats">
        <div className="dstat">
          <span className="dstat-value">{candidate.skills.length}</span>
          <span className="dstat-label">Skills Mapped</span>
        </div>
        <div className="dstat">
          <span className="dstat-value">{avgConf}%</span>
          <span className="dstat-label">Avg Confidence</span>
        </div>
        <div className="dstat">
          <span className="dstat-value">{candidate.skills.filter(s => s.source === 'manual').length}</span>
          <span className="dstat-label">Manual Additions</span>
        </div>
        <div className="dstat">
          <span className="dstat-value">{Math.max(...candidate.skills.map(s => s.level), 0)}</span>
          <span className="dstat-label">Highest Level</span>
        </div>
      </div>

      {/* CV Text */}
      <div className="cv-section">
        <div className="section-header" onClick={() => setCvExpanded(!cvExpanded)}>
          <span className="section-title">CV TEXT</span>
          <span className="section-toggle">{cvExpanded ? '▲' : '▼'}</span>
        </div>
        {cvExpanded && (
          <div className="cv-text">{candidate.cvText}</div>
        )}
      </div>

      {/* Skills */}
      <div className="skills-section">
        <div className="section-header">
          <span className="section-title">SFIA SKILL MAPPING</span>
          <button className="btn-add-skill" onClick={() => setShowAddModal(true)}>
            + Add Skill
          </button>
        </div>

        <div className="skills-table-header">
          <span className="col-code">CODE</span>
          <span className="col-skill">SKILL</span>
          <span className="col-level">LEVEL</span>
          <span className="col-conf">CONFIDENCE</span>
          <span className="col-source">SOURCE</span>
          <span className="col-actions">ACTIONS</span>
        </div>

        {Object.entries(grouped).map(([category, skills]) => (
          <div key={category} className="skill-group">
            <div className="skill-group-label">{category}</div>
            {skills.map(skill => (
              <SkillRow
                key={skill.id}
                skill={skill}
                onUpdate={handleSkillUpdate}
                onDelete={handleSkillDelete}
              />
            ))}
          </div>
        ))}

        {candidate.skills.length === 0 && (
          <div className="skills-empty">No skills mapped yet. Add skills manually or re-parse CV.</div>
        )}
      </div>

      {showAddModal && (
        <AddSkillModal
          existingCodes={candidate.skills.map(s => s.code)}
          onAdd={handleSkillAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </section>
  )
}
