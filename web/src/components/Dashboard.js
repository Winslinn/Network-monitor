import { fmtDate } from "../App";
import { SEV_ICON } from "./Toasts";

const barClass = (val) => {
  if (val > 90) return "bar-fill bar-crit";
  if (val > 70) return "bar-fill bar-warn";
  return "bar-fill";
};

export default function Dashboard({routerInfo}) {
    return (
        <div className="tab-content">
            <div className="card">
                <div className="router-name">{routerInfo.hostname}</div>
                <div className="info-grid">
                <div className="info-item">
                    <div className="info-label">LAN IP</div>
                    <div className="info-value">{routerInfo.ip}</div>
                </div>
                <div className="info-item">
                    <div className="info-label">MAC адреса</div>
                    <div className="info-value">{routerInfo.mac}</div>
                </div>
                </div>
                <div className="speed-row">
                <div className="speed-card">
                    <div className="speed-label">↓ DOWNLOAD</div>
                    <div className="speed-value speed-dl">{routerInfo.downloadSpeed}</div>
                </div>
                <div className="speed-card">
                    <div className="speed-label">↑ UPLOAD</div>
                    <div className="speed-value speed-ul">{routerInfo.uploadSpeed}</div>
                </div>
                </div>
                <div className="usage-wrap">
                <div className="usage-row">
                    <div className="usage-header"><span>CPU</span><span className="usage-pct">{routerInfo.cpuUsage}%</span></div>
                    <div className="bar-bg"><div className={barClass(routerInfo.cpuUsage)} style={{ width: `${routerInfo.cpuUsage}%` }} /></div>
                </div>
                <div className="usage-row">
                    <div className="usage-header"><span>RAM</span><span className="usage-pct">{routerInfo.ramUsage}%</span></div>
                    <div className="bar-bg"><div className="bar-fill bar-ram" style={{ width: `${routerInfo.ramUsage}%` }} /></div>
                </div>
                </div>
            </div>  
        </div>
    );
}