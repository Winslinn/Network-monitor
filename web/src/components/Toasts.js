export const SEV_ICON = { low: "ℹ️", medium: "⚠️", high: "🔴", critical: "🚨" };

export default function Toasts({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-alert-${t.severity || ""}`}>
          <span>{SEV_ICON[t.severity] || "⚡"}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
