import { Button, Stack, Badge } from "react-bootstrap";
import { Trash2, Bell } from "lucide-react";
import { SEV_ICON } from "./Toasts";
import { TYPE_LABELS } from "../App";

const SEV_CONFIG = {
  critical: { color: "var(--nw-danger)",  bg: "rgba(244,63,94,.07)",  border: "var(--nw-danger)",  label: "Критично" },
  high:     { color: "var(--nw-danger)",  bg: "rgba(244,63,94,0)",  border: "var(--nw-danger)", label: "Високий" },
  medium:   { color: "var(--nw-warning)", bg: "rgba(245,158,11,0)", border: "var(--nw-warning)", label: "Середній" },
  low:      { color: "var(--nw-info)",    bg: "rgba(56,189,248,0)", border: "var(--nw-border)",  label: "Низький" },
};

const FILTER_LABELS = { all: "Всі", low: "Низький", medium: "Середній", high: "Високий", critical: "Критично" };

export default function Alerts({ alerts, alertFilter, setAlertFilter, setAlerts, fmtDate }) {
  const filtered = alerts.filter(a => alertFilter === "all" || a.severity?.toLowerCase() === alertFilter);

  const handleClear = () => {
    if (!window.confirm("Очистити весь журнал подій? Це незворотня дія.")) return;
    setAlerts([]);
  };

  return (
    <div style={{
      background: "var(--nw-surface)",
      border: "1px solid var(--nw-border)",
      borderRadius: "var(--nw-radius)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
        padding: "0.85rem 1rem",
        borderBottom: "1px solid var(--nw-border)",
        background: "var(--nw-inset)",
      }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {Object.entries(FILTER_LABELS).map(([key, label]) => {
            const cfg = SEV_CONFIG[key];
            const isActive = alertFilter === key;
            return (
              <button
                key={key}
                onClick={() => setAlertFilter(key)}
                style={{
                  padding: "2px 10px", borderRadius: "var(--nw-radius)", cursor: "pointer",
                  fontSize: ".65rem", fontWeight: 800, letterSpacing: ".05em",
                  textTransform: "uppercase",
                  border: isActive
                    ? `1px solid ${cfg ? cfg.color : "var(--nw-accent)"}`
                    : "1px solid var(--nw-border)",
                  background: isActive
                    ? (cfg ? cfg.bg : "var(--nw-accent-bg)")
                    : "transparent",
                  color: isActive
                    ? (cfg ? cfg.color : "var(--nw-accent)")
                    : "var(--nw-muted)",
                }}
              >
                {label}
                {key !== "all" && (
                  <span style={{ marginLeft: 5, opacity: .5 }}>
                    {alerts.filter(a => a.severity?.toLowerCase() === key).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleClear}
          className="btn btn-outline-danger"
          style={{ padding: "3px 10px" }}
        >
          <Trash2 size={12} style={{ marginRight: 6 }} />
          Очистити
        </button>
      </div>

      {/* List */}
      <div style={{ padding: "1rem" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--nw-muted)", textTransform: "uppercase", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em" }}>
            Подій не зафіксовано
          </div>
        ) : (
          <Stack gap={2}>
            {filtered.map((a) => {
              const sev = a.severity?.toLowerCase();
              const cfg = SEV_CONFIG[sev] || { color: "var(--nw-muted)", bg: "var(--nw-inset)", border: "var(--nw-border)", label: sev };
              return (
                <div
                  key={a._id || a._received}
                  className="nw-event"
                  style={{
                    borderColor: cfg.border,
                    background: cfg.bg,
                  }}
                >
                  {/* Icon stripe */}
                  <div className="nw-event-icon" style={{ background: sev === "critical" ? "var(--nw-danger)" : "transparent", color: sev === "critical" ? "#000" : cfg.color, borderRight: sev === "critical" ? "none" : `1px solid ${cfg.border}` }}>
                    <span role="img" aria-label={sev}>{SEV_ICON[sev] || "⚡"}</span>
                  </div>

                  {/* Body */}
                  <div className="nw-event-body">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: ".8rem", fontWeight: 800, color: "var(--nw-text)" }}>
                          {TYPE_LABELS[a.type] || a.type}
                        </span>
                        {a.count > 1 && (
                          <Badge bg="danger" style={{ fontSize: ".6rem", borderRadius: 4, padding: "2px 5px" }}>
                            x{a.count}
                          </Badge>
                        )}
                      </div>
                      <span style={{
                        fontSize: ".6rem", fontWeight: 800, textTransform: "uppercase",
                        letterSpacing: ".05em", color: cfg.color,
                        background: "transparent", border: `1px solid ${cfg.border}`,
                        borderRadius: "var(--nw-radius)", padding: "1px 6px", whiteSpace: "nowrap", flexShrink: 0,
                      }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p style={{ margin: "2px 0 4px", fontSize: ".75rem", color: "var(--nw-muted)", fontWeight: 600 }}>
                      {a.description}
                    </p>
                    <div className="font-monospace" style={{ fontSize: ".65rem", color: "var(--nw-muted)", opacity: .6, display: "flex", gap: 12 }}>
                      <span>{fmtDate(a.last_seen || a.timestamp)}</span>
                      {a.flow_id && (
                        <span 
                          title="Натисніть, щоб скопіювати HASH"
                          onClick={() => {
                            navigator.clipboard.writeText(a.flow_id);
                          }}
                          style={{ 
                            cursor: "pointer", userSelect: "none", 
                            color: "var(--nw-muted)" 
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = "var(--nw-accent)"}
                          onMouseLeave={e => e.currentTarget.style.color = "var(--nw-muted)"}
                        >
                          ID: {a.flow_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </Stack>
        )}
      </div>
    </div>
  );
}
