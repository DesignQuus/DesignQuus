export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = status.toLowerCase().replaceAll('_', '-');
  return <span className={`badge badge-${normalized}`}>{status}</span>;
}
