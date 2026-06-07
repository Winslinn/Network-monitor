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
            border: `1px solid ${SEV_COLOR[t.severity] || "var(--nw-border)"}`,
            borderRadius: "var(--nw-radius)",
            boxShadow: "none",
            overflow: "hidden",
          }}
        >
          <Toast.Header
            closeVariant="white"
            style={{
              background: "var(--nw-inset)",
              borderBottom: "1px solid var(--nw-border)",
              color: "var(--nw-text)",
              padding: "0.5rem 0.75rem",
            }}
          >
            <span style={{ marginRight: 8, fontSize: "0.8rem" }}>{SEV_ICON[t.severity] || "⚡"}</span>
            <strong style={{
              marginRight: "auto",
              fontSize: ".65rem", fontWeight: 800,
              textTransform: "uppercase", letterSpacing: ".1em",
            }}>
              Event Log
            </strong>
            <small style={{ color: "var(--nw-muted)", fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase" }}>NOW</small>
          </Toast.Header>

          <Toast.Body style={{
            color: "var(--nw-text)", fontSize: ".72rem",
            fontFamily: "JetBrains Mono, monospace",
            padding: ".6rem .75rem",
          }}>
            {t.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}
