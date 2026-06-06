import { Button, Stack, Badge } from "react-bootstrap";
import { Trash2, Bell } from "lucide-react";
import { SEV_ICON } from "./Toasts";
import { TYPE_LABELS } from "../App";

const SEV_CONFIG = {
  critical: { color: "var(--nw-danger)",  bg: "rgba(244,63,94,.07)",  border: "rgba(244,63,94,.3)",  label: "Критично" },
  high:     { color: "var(--nw-danger)",  bg: "rgba(244,63,94,.05)",  border: "rgba(244,63,94,.25)", label: "Високий" },
  medium:   { color: "var(--nw-warning)", bg: "rgba(245,158,11,.05)", border: "rgba(245,158,11,.25)", label: "Середній" },
  low:      { color: "var(--nw-info)",    bg: "rgba(56,189,248,.04)", border: "rgba(56,189,248,.2)",  label: "Низький" },
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
      borderRadius: 14,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
        padding: "1.25rem 1.5rem",
        borderBottom: "1px solid var(--nw-border)",
      }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(FILTER_LABELS).map(([key, label]) => {
            const cfg = SEV_CONFIG[key];
            const isActive = alertFilter === key;
            return (
              <button
                key={key}
                onClick={() => setAlertFilter(key)}
                style={{
                  padding: "4px 14px", borderRadius: 99, cursor: "pointer",
                  fontSize: ".72rem", fontWeight: 700, letterSpacing: ".04em",
                  textTransform: "uppercase", transition: "all .15s",
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
                  <span style={{ marginLeft: 5, opacity: .6 }}>
                    {alerts.filter(a => a.severity?.toLowerCase() === key).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleClear}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 14px", borderRadius: 8, cursor: "pointer",
            fontSize: ".78rem", fontWeight: 600,
            background: "transparent",
            border: "1px solid rgba(244,63,94,.3)",
            color: "var(--nw-danger)", transition: "all .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(244,63,94,.07)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <Trash2 size={13} />
          Очистити
        </button>
      </div>

      {/* List */}
      <div style={{ padding: "1rem 1.25rem" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--nw-muted)" }}>
            <Bell size={36} style={{ opacity: .25, marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
            <div style={{ fontSize: ".85rem", fontWeight: 500 }}>Журнал подій порожній</div>
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
                  <div className="nw-event-icon" style={{ background: `${cfg.bg}`, color: cfg.color }}>
                    <span role="img" aria-label={sev}>{SEV_ICON[sev] || "⚡"}</span>
                  </div>

                  {/* Body */}
                  <div className="nw-event-body">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--nw-text)" }}>
                        {TYPE_LABELS[a.type] || a.type}
                      </span>
                      <span style={{
                        fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: ".05em", color: cfg.color,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        borderRadius: 99, padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0,
                      }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 6px", fontSize: ".8rem", color: "var(--nw-muted)" }}>
                      {a.description}
                    </p>
                    <div className="font-monospace" style={{ fontSize: ".68rem", color: "var(--nw-muted)", opacity: .6 }}>
                      {fmtDate(a.timestamp * 1000)}
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
