import { useState } from 'react'
import type { SFIASkill, SkillLevel } from '../types/types'

interface Props {
  skill: SFIASkill
  onUpdate: (s: SFIASkill) => void
  onDelete: (id: string) => void
}

const LEVELS: SkillLevel[] = [1, 2, 3, 4, 5, 6, 7]

const levelLabels: Record<SkillLevel, string> = {
  1: 'Follow',
  2: 'Assist',
  3: 'Apply',
  4: 'Enable',
  5: 'Ensure/Advise',
  6: 'Initiate/Influence',
  7: 'Set Strategy',
}

const confColor = (v: number) =>
  v >= 0.8 ? '#22c55e' : v >= 0.6 ? '#f59e0b' : '#ef4444'

export default function SkillRow({ skill, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(skill)

  const save = () => {
    onUpdate(draft)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(skill)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="skill-row skill-row-editing">
        <span className="col-code">
          <span className="skill-code">{skill.code}</span>
        </span>
        <span className="col-skill">
          <input
            className="edit-input"
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
          />
        </span>
        <span className="col-level">
          <select
            className="edit-select"
            value={draft.level}
            onChange={e => setDraft({ ...draft, level: Number(e.target.value) as SkillLevel })}
          >
            {LEVELS.map(l => (
              <option key={l} value={l}>L{l} – {levelLabels[l]}</option>
            ))}
          </select>
        </span>
        <span className="col-conf">
          <input
            className="edit-input edit-input-sm"
            type="number"
            min={0} max={100} step={1}
            value={Math.round(draft.confidence * 100)}
            onChange={e => setDraft({ ...draft, confidence: Number(e.target.value) / 100 })}
          />
          <span className="conf-pct">%</span>
        </span>
        <span className="col-source">
          <span className={`source-badge source-${draft.source}`}>{draft.source}</span>
        </span>
        <span className="col-actions edit-btns">
          <button className="btn-icon btn-save" onClick={save} title="Save">✓</button>
          <button className="btn-icon btn-cancel" onClick={cancel} title="Cancel">✕</button>
        </span>
      </div>
    )
  }

  return (
    <div className="skill-row">
      <span className="col-code">
        <span className="skill-code">{skill.code}</span>
      </span>
      <span className="col-skill">
        <span className="skill-name">{skill.name}</span>
        <span className="skill-sub">{skill.subcategory}</span>
      </span>
      <span className="col-level">
        <span className="level-badge">L{skill.level}</span>
        <span className="level-label">{levelLabels[skill.level]}</span>
      </span>
      <span className="col-conf">
        <span className="conf-track">
          <span
            className="conf-fill"
            style={{ width: `${Math.round(skill.confidence * 100)}%`, background: confColor(skill.confidence) }}
          />
        </span>
        <span className="conf-pct" style={{ color: confColor(skill.confidence) }}>
          {Math.round(skill.confidence * 100)}%
        </span>
      </span>
      <span className="col-source">
        <span className={`source-badge source-${skill.source}`}>{skill.source}</span>
      </span>
      <span className="col-actions">
        <button className="btn-icon btn-edit" onClick={() => setEditing(true)} title="Edit">✎</button>
        <button className="btn-icon btn-delete" onClick={() => onDelete(skill.id)} title="Delete">⌫</button>
      </span>
    </div>
  )
}
