export function formatAmount(amount, currency) {
  if (amount === null || amount === undefined) return '—';
  try {
    return (amount / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    });
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency || ''}`;
  }
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatRelative(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function shortenId(id, keep = 6) {
  if (!id) return '—';
  if (id.length <= keep + 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-keep)}`;
}

export const AI_ACTION_LABELS = {
  SEND_RECOVERY_LINK: 'Send recovery link',
  NO_ACTION_RECOMMENDED: 'No action recommended',
  ESCALATE_TO_HUMAN: 'Escalate to human',
};

export function formatSnakeCase(value) {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
