import { SEV_ICON } from "./Toasts";

export default function Alerts({ alerts, alertFilter, setAlertFilter, setAlerts, fmtDate }) {
  const filteredAlerts = alerts.filter(a => alertFilter === "all" || (a.severity?.toLowerCase() === alertFilter.toLowerCase()));
  return (
    <div className="tab-content">
      <div className="card">
        <div className="alerts-toolbar">
          {["all", "low", "medium", "high", "critical"].map(f => (
            <button key={f} className={`filter-btn ${alertFilter === f ? "active" : ""}`} onClick={() => setAlertFilter(f)}>
              {f === "all" ? "Всі" : f}
            </button>
          ))}
          <button className="clear-btn" onClick={() => setAlerts([])}>Очистити</button>
        </div>
        <div className="alert-list">
          {filteredAlerts.length === 0
            ? <div className="alert-empty">Подій немає</div>
            : filteredAlerts.map((a, i) => (
              <div key={i} className={`alert-item sev-${a.severity}`}>
                <div className="alert-icon">{SEV_ICON[a.severity]}</div>
                <div className="alert-body">
                  <div className="alert-top">
                    <span className="alert-type">{a.type}</span>
                    <span className={`sev-tag sev-${a.severity}`}>{a.severity}</span>
                  </div>
                  <div className="alert-desc">{a.description}</div>
                  <div className="alert-meta"><span>{fmtDate(a.timestamp)}</span></div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
