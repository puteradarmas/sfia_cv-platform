/**
 * StatusBadge — Displays a coloured status indicator.
 * Used across Upload, Personnel, and Opportunity pages.
 */

interface Props {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: 'PENDING',    cls: 'badge-amber'  },
  pending:    { label: 'PENDING',    cls: 'badge-amber'  },
  IN_REVIEW:  { label: 'IN REVIEW', cls: 'badge-blue'   },
  VALIDATED:  { label: 'VALIDATED',  cls: 'badge-green'  },
  validated:  { label: 'VALIDATED',  cls: 'badge-green'  },
  CONFIRMED:  { label: 'CONFIRMED', cls: 'badge-green'  },
  CORRECTED:  { label: 'CORRECTED', cls: 'badge-amber'  },
  REJECTED:   { label: 'REJECTED',  cls: 'badge-red'    },
  rejected:   { label: 'REJECTED',  cls: 'badge-red'    },
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const cfg = STATUS_MAP[status] ?? { label: status.toUpperCase(), cls: 'badge-amber' }
  return (
    <span className={`badge ${cfg.cls} ${size === 'md' ? 'badge-md' : ''}`}>
      {cfg.label}
    </span>
  )
}
