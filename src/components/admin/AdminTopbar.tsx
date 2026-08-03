export default function AdminTopbar({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="admin-topbar no-print">
      <h1>{title}</h1>
      {actions}
    </div>
  );
}
