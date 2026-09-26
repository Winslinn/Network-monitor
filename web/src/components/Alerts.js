import { Stack, Badge } from "react-bootstrap";
import { Trash2 } from "lucide-react";
import { SEV_ICON } from "./Toasts";

const SEV_CONFIG = {
  critical: { color: "var(--nw-danger)", bg: "rgba(244,63,94,.07)", border: "var(--nw-danger)", label: "Критично" },
  high: { color: "var(--nw-danger)", bg: "rgba(244,63,94,0)", border: "var(--nw-danger)", label: "Високий" },
  medium: { color: "var(--nw-warning)", bg: "rgba(245,158,11,0)", border: "var(--nw-warning)", label: "Середній" },
  low: { color: "var(--nw-info)", bg: "rgba(56,189,248,0)", border: "var(--nw-border)", label: "Низький" },
};

const FILTER_LABELS = { all: "Всі", low: "Низький", medium: "Середній", high: "Високий", critical: "Критично" };

export default function Alerts({ alerts, alertFilter, setAlertFilter, setAlerts, fmtDate, availableDetectors }) {
  const filtered = alerts.filter(a => alertFilter === "all" || a.severity?.toLowerCase() === alertFilter);

  const handleClear = () => {
    if (!window.confirm("Очистити весь журнал подій? Це незворотня дія.")) return;
    setAlerts([]);
  };

  return (
    <div className="nw-panel">
      {/* Header */}
      <div className="nw-panel-header">
        {/* Filters */}
        <div className="alert-filters">
          {Object.entries(FILTER_LABELS).map(([key, label]) => {
            const isActive = alertFilter === key;
            return (
              <button
                key={key}
                onClick={() => setAlertFilter(key)}
                className={`alert-filter ${isActive ? "active" : ""} alert-filter-${key}`}
              >
                {label}
                {key !== "all" && (
                  <span className="alert-filter-count">
                    {alerts.filter(a => a.severity?.toLowerCase() === key).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleClear}
          className="btn btn-outline-danger compact-button"
        >
          <Trash2 size={12} className="button-icon" />
          Очистити
        </button>
      </div>

      {/* List */}
      <div className="nw-panel-body">
        {filtered.length === 0 ? (
          <div className="empty-state">
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
                  className={`nw-event sev-${sev || "unknown"}`}
                >
                  {/* Icon stripe */}
                  <div className="nw-event-icon">
                    <span role="img" aria-label={sev}>{SEV_ICON[sev] || "⚡"}</span>
                  </div>

                  {/* Body */}
                  <div className="nw-event-body">
                    <div className="alert-row-header">
                      <div className="alert-title-group">
                        <span className="alert-title">
                          {availableDetectors[a.type] || a.type}
                        </span>
                        {a.count > 1 && (
                          <Badge bg="danger" className="alert-count">
                            x{a.count}
                          </Badge>
                        )}
                      </div>
                      <span className={`alert-severity severity-${sev || "unknown"}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="alert-description">
                      {a.description}
                    </p>
                    <div className="font-monospace alert-meta">
                      <span>{fmtDate(a.last_seen || a.timestamp)}</span>
                      {a.flow_id && (
                        <span
                          title="Натисніть, щоб скопіювати HASH"
                          onClick={() => {
                            navigator.clipboard.writeText(a.flow_id);
                          }}
                          className="copyable-id"
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
