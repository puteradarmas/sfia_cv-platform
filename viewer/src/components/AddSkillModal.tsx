import { useState } from 'react'
import type { SFIASkill, SkillLevel } from '../types/types'
import { sfiaSkillDefinitions } from '../data/mockData'

interface Props {
  existingCodes: string[]
  onAdd: (skill: SFIASkill) => void
  onClose: () => void
}

const LEVELS: SkillLevel[] = [1, 2, 3, 4, 5, 6, 7]
const levelLabels: Record<SkillLevel, string> = {
  1: 'Follow', 2: 'Assist', 3: 'Apply', 4: 'Enable',
  5: 'Ensure/Advise', 6: 'Initiate/Influence', 7: 'Set Strategy',
}

export default function AddSkillModal({ existingCodes, onAdd, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [selectedCode, setSelectedCode] = useState('')
  const [level, setLevel] = useState<SkillLevel>(3)
  const [confidence, setConfidence] = useState(100)

  const filtered = sfiaSkillDefinitions.filter(d =>
    !existingCodes.includes(d.code) &&
    (d.name.toLowerCase().includes(search.toLowerCase()) ||
     d.code.toLowerCase().includes(search.toLowerCase()) ||
     d.category.toLowerCase().includes(search.toLowerCase()))
  )

  const chosen = sfiaSkillDefinitions.find(d => d.code === selectedCode)

  const handleAdd = () => {
    if (!chosen) return
    const skill: SFIASkill = {
      id: `manual-${Date.now()}`,
      code: chosen.code,
      name: chosen.name,
      category: chosen.category,
      subcategory: chosen.subcategory,
      level,
      confidence: confidence / 100,
      source: 'manual',
    }
    onAdd(skill)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add SFIA Skill</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Search */}
          <div className="modal-section">
            <label className="field-label">Search Skills</label>
            <input
              className="modal-search"
              placeholder="e.g. Data Analytics, DTAN, Security..."
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedCode('') }}
              autoFocus
            />
          </div>

          {/* Skill list */}
          <div className="skill-picker">
            {filtered.length === 0 && (
              <div className="picker-empty">No matching skills found</div>
            )}
            {filtered.map(d => (
              <div
                key={d.code}
                className={`picker-row ${selectedCode === d.code ? 'picker-selected' : ''}`}
                onClick={() => setSelectedCode(d.code)}
              >
                <span className="picker-code">{d.code}</span>
                <div className="picker-info">
                  <span className="picker-name">{d.name}</span>
                  <span className="picker-cat">{d.category} · {d.subcategory}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Config */}
          {chosen && (
            <div className="modal-config">
              <div className="config-row">
                <label className="field-label">SFIA Level</label>
                <div className="level-picker">
                  {LEVELS.map(l => (
                    <button
                      key={l}
                      className={`level-btn ${level === l ? 'level-active' : ''}`}
                      onClick={() => setLevel(l)}
                    >
                      <span className="lbtn-num">L{l}</span>
                      <span className="lbtn-label">{levelLabels[l]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="config-row">
                <label className="field-label">Confidence Override ({confidence}%)</label>
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={confidence}
                  onChange={e => setConfidence(Number(e.target.value))}
                  className="conf-slider"
                />
              </div>

              <div className="selected-preview">
                <span className="preview-code">{chosen.code}</span>
                <span className="preview-name">{chosen.name}</span>
                <span className="preview-cat">{chosen.category}</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-action btn-reset" onClick={onClose}>Cancel</button>
          <button
            className="btn-action btn-validate"
            onClick={handleAdd}
            disabled={!chosen}
          >
            + Add Skill
          </button>
        </div>
      </div>
    </div>
  )
}
