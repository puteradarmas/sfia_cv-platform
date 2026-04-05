/**
 * EmptyState — Placeholder for sections with no data yet.
 */

interface Props {
  icon: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {action && (
        <button className="btn-action btn-validate" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
