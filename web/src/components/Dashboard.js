import { Row, Col, Stack } from "react-bootstrap";
import { Cpu, HardDrive, Download, Upload, Network } from "lucide-react";

function StatTile({ icon, label, value, accent }) {
  return (
    <div style={{
      background: "var(--nw-inset)",
      border: "1px solid var(--nw-border)",
      borderRadius: "var(--nw-radius)", padding: "0.75rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ color: accent || "var(--nw-muted)", display: "flex" }}>{icon}</span>
        <span style={{
          fontSize: ".6rem", fontWeight: 800,
          letterSpacing: ".08em", color: "var(--nw-muted)",
        }}>{label}</span>
      </div>
      <div style={{
        fontSize: ".85rem", fontWeight: 700, color: "var(--nw-text)",
        fontFamily: "JetBrains Mono, monospace",
      }}>
        {value || "—"}
      </div>
    </div>
  );
}

function UsageBar({ icon, label, value, variant }) {
  const colorMap = {
    danger:  "var(--nw-danger)",
    warning: "var(--nw-warning)",
    primary: "var(--nw-accent)",
  };
  const color = colorMap[variant] || colorMap.primary;
  
  const val = Array.isArray(value) 
    ? (value.length > 0 ? Math.round(value.reduce((a, b) => a + b, 0) / value.length) : 0)
    : (value || 0);

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 6,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".75rem", color: "var(--nw-muted)", fontWeight: 600 }}>
          {icon}
          {label}
        </span>
        <span style={{ fontSize: ".8rem", fontWeight: 700, color, fontFamily: "JetBrains Mono, monospace" }}>
          {val}%
        </span>
      </div>
      <div style={{ height: 4, background: "var(--nw-inset)", border: "1px solid var(--nw-border)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${val}%`,
          background: color,
          transition: "width .5s ease",
        }} />
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
    <div style={{
      background: "var(--nw-surface)",
      border: "1px solid var(--nw-border)",
      borderRadius: "var(--nw-radius)", padding: "1.25rem",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        paddingBottom: "1rem",
        borderBottom: "1px solid var(--nw-border)",
        marginBottom: "1.25rem",
      }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontSize: "1.1rem", fontWeight: 800,
            color: "var(--nw-text)", letterSpacing: "-.01em",
          }}>
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
        <div style={{
          background: "var(--nw-inset)", border: "1px solid var(--nw-border)",
          borderRadius: "var(--nw-radius)", padding: ".4rem .75rem", marginBottom: "1rem",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: ".6rem", fontWeight: 800, color: "var(--nw-muted)" }}>DNS</span>
          <span className="font-monospace" style={{ fontSize: ".75rem", color: "var(--nw-text)" }}>{routerInfo.dns}</span>
        </div>
      )}

      <Stack gap={2}>
        <UsageBar icon={<Cpu size={12} />} label="ЦП" value={routerInfo.cpuUsage} variant={cpuVariant} />
        <UsageBar icon={<HardDrive size={12} />} label="ОЗП" value={routerInfo.ramUsage} variant={ramVariant} />
      </Stack>
    </div>
  );
}
