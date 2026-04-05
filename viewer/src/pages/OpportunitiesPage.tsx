/**
 * OpportunitiesPage — Upload & Manage Opportunities
 *
 * Two input modes:
 *  1. Paste opportunity text directly
 *  2. Upload a PDF file containing the opportunity description
 *
 * Submitted opportunities are sent to the backend for SFIA skill extraction.
 * The page also lists previously uploaded opportunities.
 *
 * NOTE: The /opportunities endpoint may not exist yet on the backend.
 * This page handles that gracefully and shows a "coming soon" state
 * while still providing the full UI for when the endpoint is ready.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createOpportunity, listOpportunities } from '../services/api'
import type { OpportunityOut } from '../services/api'
import EmptyState from '../components/shared/EmptyState'

type InputMode = 'text' | 'file'

export default function OpportunitiesPage() {
  // ── Input state ──────────────────────────────────────────────
  const [mode, setMode] = useState<InputMode>('text')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── List state ───────────────────────────────────────────────
  const [opportunities, setOpportunities] = useState<OpportunityOut[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [endpointReady, setEndpointReady] = useState(true)

  // Load existing opportunities
  const loadOpportunities = useCallback(() => {
    setListLoading(true)
    listOpportunities(0, 50)
      .then(data => {
        setOpportunities(data)
        setEndpointReady(true)
      })
      .catch(() => {
        // Endpoint might not exist yet — that's OK
        setOpportunities([])
        setEndpointReady(false)
      })
      .finally(() => setListLoading(false))
  }, [])

  useEffect(() => { loadOpportunities() }, [loadOpportunities])

  // ── Submit handler ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim()) {
      setSubmitError('Please provide a title for the opportunity.')
      return
    }

    if (mode === 'text' && !description.trim()) {
      setSubmitError('Please enter the opportunity description.')
      return
    }

    if (mode === 'file' && !file) {
      setSubmitError('Please select a PDF file.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      await createOpportunity({
        title: title.trim(),
        description: mode === 'text' ? description.trim() : undefined,
        file: mode === 'file' ? file! : undefined,
      })
      setSubmitSuccess(true)
      setTitle('')
      setDescription('')
      setFile(null)
      loadOpportunities()
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Submission failed',
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ── File handlers ────────────────────────────────────────────
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFile(f)
      setMode('file')
    }
  }

  return (
    <div className="opportunities-page">
      {/* ── Input Section ───────────────────────────── */}
      <section className="opp-input-section">
        <div className="section-bar">
          <h2 className="section-heading">New Opportunity</h2>
        </div>

        {/* Title field */}
        <div className="opp-field">
          <label className="field-label">Opportunity Title</label>
          <input
            className="opp-title-input"
            placeholder="e.g. Senior Data Engineer — Ministry of Finance"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Mode switcher */}
        <div className="opp-mode-switcher">
          <button
            className={`mode-btn ${mode === 'text' ? 'mode-active' : ''}`}
            onClick={() => setMode('text')}
          >
            <span className="mode-icon">≡</span>
            Paste Text
          </button>
          <button
            className={`mode-btn ${mode === 'file' ? 'mode-active' : ''}`}
            onClick={() => setMode('file')}
          >
            <span className="mode-icon">⬆</span>
            Upload PDF
          </button>
        </div>

        {/* Text input mode */}
        {mode === 'text' && (
          <div className="opp-field">
            <label className="field-label">Opportunity Description</label>
            <textarea
              className="opp-textarea"
              placeholder="Paste the full opportunity description here. Include required skills, responsibilities, and qualifications…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={12}
            />
            <div className="opp-char-count">
              {description.length.toLocaleString()} characters
            </div>
          </div>
        )}

        {/* File input mode */}
        {mode === 'file' && (
          <div
            className={`opp-file-zone ${dragOver ? 'dropzone-active' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              onChange={onFileChange}
              hidden
            />
            {file ? (
              <>
                <span className="file-icon">📄</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  className="file-remove"
                  onClick={e => {
                    e.stopPropagation()
                    setFile(null)
                  }}
                >
                  ✕ Remove
                </button>
              </>
            ) : (
              <>
                <span className="upload-icon">⬆</span>
                <span className="upload-label">Drop PDF here or click to browse</span>
                <span className="upload-hint">PDF files only — Max 20 MB</span>
              </>
            )}
          </div>
        )}

        {/* Error / Success */}
        {submitError && (
          <div className="upload-error">
            <span className="error-icon">⚠</span>
            {submitError}
          </div>
        )}

        {submitSuccess && (
          <div className="upload-success">
            <span className="success-icon">✓</span>
            Opportunity submitted successfully!
          </div>
        )}

        {/* Submit button */}
        <div className="opp-submit-bar">
          <button
            className="btn-action btn-validate btn-lg"
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
          >
            {submitting ? 'Submitting…' : '◈ Submit Opportunity'}
          </button>
        </div>
      </section>

      {/* ── Existing Opportunities ──────────────────── */}
      <section className="opp-list-section">
        <div className="section-bar">
          <h2 className="section-heading">Existing Opportunities</h2>
          <span className="section-count">{opportunities.length}</span>
        </div>

        {!endpointReady && !listLoading && (
          <div className="opp-coming-soon">
            <div className="coming-soon-icon">◈</div>
            <h3 className="coming-soon-title">Endpoint Not Available Yet</h3>
            <p className="coming-soon-desc">
              The <code>/opportunities</code> API endpoint is not yet implemented
              on the backend. The UI is ready — once the endpoint is live,
              opportunities will appear here automatically.
            </p>
          </div>
        )}

        {listLoading && <div className="opp-loading">Loading opportunities…</div>}

        {endpointReady && !listLoading && opportunities.length === 0 && (
          <EmptyState
            icon="◈"
            title="No opportunities yet"
            description="Upload your first opportunity using the form above."
          />
        )}

        <div className="opp-cards">
          {opportunities.map(opp => (
            <div key={opp.id} className="opp-card">
              <div className="opp-card-header">
                <h3 className="opp-card-title">{opp.title}</h3>
                <span className="opp-card-date">
                  {new Date(opp.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {opp.description && (
                <p className="opp-card-desc">
                  {opp.description.length > 200
                    ? opp.description.slice(0, 200) + '…'
                    : opp.description}
                </p>
              )}
              {opp.source_filename && (
                <div className="opp-card-file">
                  <span className="file-icon-sm">📄</span>
                  {opp.source_filename}
                </div>
              )}
              {opp.required_skills && opp.required_skills.length > 0 && (
                <div className="opp-card-skills">
                  {opp.required_skills.map((s, i) => (
                    <span key={i} className="opp-skill-tag">
                      {s.sfia_code} · L{s.required_level}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
