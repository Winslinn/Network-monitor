import { Row, Col, ProgressBar, Stack } from "react-bootstrap";
import { Cpu, HardDrive, Download, Upload, Network } from "lucide-react";

function StatTile({ icon, label, value, accent }) {
  return (
    <div style={{
      background: "var(--nw-inset)",
      border: "1px solid var(--nw-border)",
      borderRadius: 10, padding: "1rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ color: accent || "var(--nw-muted)", display: "flex" }}>{icon}</span>
        <span style={{
          fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: ".06em", color: "var(--nw-muted)",
        }}>{label}</span>
      </div>
      <div className="font-monospace" style={{
        fontSize: "1.05rem", fontWeight: 700, color: accent || "var(--nw-text)",
      }}>{value || "—"}</div>
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
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".8rem", color: "var(--nw-muted)" }}>
          {icon}
          {label}
        </span>
        <span style={{ fontSize: ".85rem", fontWeight: 700, color, fontFamily: "JetBrains Mono, monospace" }}>
          {value}%
        </span>
      </div>
      <div style={{ height: 5, background: "var(--nw-inset)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: '100%', transform: `scaleX(${value / 100})`, transformOrigin: 'left',
          background: color,
          borderRadius: 99,
          transition: "transform .5s ease",
          boxShadow: `0 0 8px ${color}60`,
        }} />
      </div>
    </div>
  );
}

export default function Dashboard({ routerInfo }) {
  const cpuVariant = routerInfo.cpuUsage > 90 ? "danger" : routerInfo.cpuUsage > 70 ? "warning" : "primary";
  const ramVariant = routerInfo.ramUsage > 90 ? "danger" : routerInfo.ramUsage > 70 ? "warning" : "primary";

  return (
    <div style={{
      background: "var(--nw-surface)",
      border: "1px solid var(--nw-border)",
      borderRadius: 14, padding: "1.75rem",
    }}>
      {/* Hero row — system identity, full prominence */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        paddingBottom: "1.5rem",
        borderBottom: "1px solid var(--nw-border)",
        marginBottom: "1.5rem",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: "var(--nw-accent-bg)",
          border: "1px solid rgba(13,202,170,.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 24px rgba(13,202,170,.10)",
        }}>
          <Network size={22} color="var(--nw-accent)" />
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 style={{
            margin: 0, fontSize: "1.2rem", fontWeight: 800,
            color: "var(--nw-text)", letterSpacing: "-.015em",
          }}>
            {routerInfo.hostname || "MikroTik CHR"}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: ".72rem", fontWeight: 600, color: "var(--nw-success)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "var(--nw-success)",
                boxShadow: "0 0 6px var(--nw-success)",
              }} />
              Системи онлайн
            </span>
            {routerInfo.wanStatus && (
              <>
                <span style={{ color: "var(--nw-border)" }}>·</span>
                <span style={{ fontSize: ".72rem", color: "var(--nw-muted)" }}>
                  {routerInfo.wanStatus}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Network stats grid */}
      <Row className="g-3 mb-4">
        <Col xs={6} sm={3}>
          <StatTile icon={<Network size={13} />} label="LAN IP" value={routerInfo.ip} accent="var(--nw-accent)" />
        </Col>
        <Col xs={6} sm={3}>
          <StatTile icon={<Network size={13} />} label="MAC-адреса" value={routerInfo.mac} />
        </Col>
        <Col xs={6} sm={3}>
          <StatTile icon={<Download size={13} />} label="Завантаження" value={routerInfo.downloadSpeed} accent="var(--nw-info)" />
        </Col>
        <Col xs={6} sm={3}>
          <StatTile icon={<Upload size={13} />} label="Відвантаження" value={routerInfo.uploadSpeed} accent="var(--nw-purple)" />
        </Col>
      </Row>

      {/* DNS */}
      {routerInfo.dns && routerInfo.dns !== "—" && (
        <div style={{
          background: "var(--nw-inset)", border: "1px solid var(--nw-border)",
          borderRadius: 8, padding: ".6rem 1rem", marginBottom: "1.25rem",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: ".7rem", fontWeight: 600, color: "var(--nw-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
            DNS
          </span>
          <span className="font-monospace" style={{ fontSize: ".8rem", color: "var(--nw-text)" }}>
            {routerInfo.dns}
          </span>
        </div>
      )}

      {/* Resource usage */}
      <Stack gap={3}>
        <UsageBar
          icon={<Cpu size={13} />}
          label="Завантаження CPU"
          value={routerInfo.cpuUsage}
          variant={cpuVariant}
        />
        <UsageBar
          icon={<HardDrive size={13} />}
          label="Використання RAM"
          value={routerInfo.ramUsage}
          variant={ramVariant}
        />
      </Stack>
    </div>
  );
}
