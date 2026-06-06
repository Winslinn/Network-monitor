import { ToastContainer, Toast } from "react-bootstrap";

export const SEV_ICON = {
  low:      "ℹ️",
  medium:   "⚠️",
  high:     "🔴",
  critical: "🚨",
};

const SEV_COLOR = {
  critical: "var(--nw-danger)",
  high:     "var(--nw-danger)",
  medium:   "var(--nw-warning)",
  low:      "var(--nw-info)",
};

export default function Toasts({ toasts }) {
  return (
    <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
      {toasts.map(t => (
        <Toast
          key={t.id}
          style={{
            background: "var(--nw-surface)",
            border: `1px solid ${SEV_COLOR[t.severity] || "var(--nw-border)"}40`,
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,.4)",
            overflow: "hidden",
          }}
        >
          {/* Severity accent line */}
          <div style={{
            height: 3,
            background: SEV_COLOR[t.severity] || "var(--nw-border)",
          }} />

          <Toast.Header
            closeVariant="white"
            style={{
              background: "transparent",
              borderBottom: "1px solid var(--nw-border)",
              color: "var(--nw-text)",
            }}
          >
            <span style={{ marginRight: 8 }}>{SEV_ICON[t.severity] || "⚡"}</span>
            <strong style={{
              marginRight: "auto",
              fontSize: ".72rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: ".05em",
            }}>
              Сповіщення
            </strong>
            <small style={{ color: "var(--nw-muted)", fontSize: ".68rem" }}>щойно</small>
          </Toast.Header>

          <Toast.Body style={{
            color: "var(--nw-muted)", fontSize: ".8rem",
            fontFamily: "JetBrains Mono, monospace",
            padding: ".65rem .9rem",
          }}>
            {t.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}
