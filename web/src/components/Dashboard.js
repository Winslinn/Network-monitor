import { Row, Col, Stack } from "react-bootstrap";
import { Cpu, HardDrive, Download, Upload, Network } from "lucide-react";

function StatTile({ icon, label, value, accent }) {
  const accentClass = {
    "var(--nw-accent)": "accent-primary",
    "var(--nw-info)": "accent-info",
    "var(--nw-purple)": "accent-purple",
  }[accent] || "accent-muted";

  return (
    <div className="stat-tile">
      <div className="stat-label">
        <span className={`stat-icon ${accentClass}`}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="stat-value">
        {value || "—"}
      </div>
    </div>
  );
}

function UsageBar({ icon, label, value, variant }) {
  const val = Array.isArray(value) 
    ? (value.length > 0 ? Math.round(value.reduce((a, b) => a + b, 0) / value.length) : 0)
    : (value || 0);

  return (
    <div>
      <div className="usage-header">
        <span className="usage-label">
          {icon}
          {label}
        </span>
        <span className={`usage-value usage-${variant}`}>
          {val}%
        </span>
      </div>
      <div className="usage-bar">
        <div className={`usage-bar-fill usage-${variant}`} style={{ "--usage-width": `${val}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard({ routerInfo }) {
  const getVal = (v) => Array.isArray(v) ? (v.reduce((a,b)=>a+b,0)/v.length) : (v||0);
  const cpuVal = getVal(routerInfo.cpuUsage);
  const ramVal = getVal(routerInfo.ramUsage);

  const cpuVariant = cpuVal > 90 ? "danger" : cpuVal > 70 ? "warning" : "primary";
  const ramVariant = ramVal > 90 ? "danger" : ramVal > 70 ? "warning" : "primary";

  return (
    <div className="dashboard-panel">
      <div className="dashboard-heading">
        <div className="dashboard-heading-content">
          <h3 className="dashboard-title">
            {routerInfo.hostname}
          </h3>
        </div>
      </div>

      <Row className="g-2 mb-3">
        <Col xs={6} sm={3}><StatTile icon={<Network size={12} />} label="LAN IP" value={routerInfo.ip} accent="var(--nw-accent)" /></Col>
        <Col xs={6} sm={3}><StatTile icon={<Network size={12} />} label="MAC-адреса" value={routerInfo.mac} /></Col>
        <Col xs={6} sm={3}><StatTile icon={<Download size={12} />} label="Завантаження" value={routerInfo.downloadSpeed} accent="var(--nw-info)" /></Col>
        <Col xs={6} sm={3}><StatTile icon={<Upload size={12} />} label="Відправка" value={routerInfo.uploadSpeed} accent="var(--nw-purple)" /></Col>
      </Row>

      {routerInfo.dns && routerInfo.dns !== "—" && (
        <div className="dns-row">
          <span className="dns-label">DNS</span>
          <span className="font-monospace dns-value">{routerInfo.dns}</span>
        </div>
      )}

      <Stack gap={2}>
        <UsageBar icon={<Cpu size={12} />} label="ЦП" value={routerInfo.cpuUsage} variant={cpuVariant} />
        <UsageBar icon={<HardDrive size={12} />} label="ОЗП" value={routerInfo.ramUsage} variant={ramVariant} />
      </Stack>
    </div>
  );
}
