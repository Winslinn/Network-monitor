import { Row, Col, Badge } from "react-bootstrap";
import { Terminal as TerminalIcon, Activity, Trash2 } from "lucide-react";

const PANEL_STYLE = {
  background: "var(--nw-surface)",
  border: "1px solid var(--nw-border)",
  borderRadius: "var(--nw-radius)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const HEADER_STYLE = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "0.75rem 1rem",
  borderBottom: "1px solid var(--nw-border)",
  background: "var(--nw-inset)",
  flexShrink: 0,
};

const LOG_PANE_STYLE = {
  height: 340,
  overflowY: "auto",
  padding: "0.75rem",
  background: "var(--nw-inset)",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: ".72rem",
};

function ClearBtn({ onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "none", border: "none", cursor: "pointer", padding: 5,
        lineHeight: 0,
        color: "var(--nw-muted)",
      }}
      onMouseEnter={e => e.currentTarget.style.color = "var(--nw-danger)"}
      onMouseLeave={e => e.currentTarget.style.color = "var(--nw-muted)"}
    >
      <Trash2 size={14} />
    </button>
  );
}

function parseFlagBits(flagValue) {
  const val = parseInt(flagValue, 10);
  if (isNaN(val)) return String(flagValue);
  const labels = [];
  if (val & 0x01) labels.push("FIN");
  if (val & 0x02) labels.push("SYN");
  if (val & 0x04) labels.push("RST");
  if (val & 0x08) labels.push("PSH");
  if (val & 0x10) labels.push("ACK");
  if (val & 0x20) labels.push("URG");
  return labels.length ? labels.join("+") : `0x${val.toString(16).toUpperCase()}`;
}

export default function Terminal({
  logs, setLogs,
  packets, setPackets,
  sessionOrder, setSessionOrder,
  logsContainerRef,
}) {
  return (
    <Row className="g-4">
      {/* System logs */}
      <Col lg={6}>
        <div style={PANEL_STYLE}>
          <div style={HEADER_STYLE}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TerminalIcon size={15} color="var(--nw-info)" />
              <span style={{
                fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".06em", color: "var(--nw-text)",
              }}>
                Системні логи
              </span>
            </div>
            <ClearBtn onClick={() => setLogs([])} title="Очистити логи" />
          </div>

          <div style={LOG_PANE_STYLE} ref={logsContainerRef}>
            {logs.length === 0 ? (
              <div style={{ color: "var(--nw-muted)", textAlign: "center", padding: "3rem 0", opacity: .4 }}>
                Логи відсутні
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id || log.timestamp}
                  style={{
                    display: "flex", gap: 12, marginBottom: 4,
                    paddingBottom: 4,
                    borderBottom: "1px solid rgba(255,255,255,.04)",
                  }}
                >
                  <span style={{ color: "var(--nw-muted)", opacity: .5, minWidth: 72, flexShrink: 0 }}>
                    [{new Date(log.timestamp).toLocaleTimeString("uk-UA")}]
                  </span>
                  <span style={{ color: log.type === "alert" ? "var(--nw-danger)" : "var(--nw-text)", fontWeight: log.type === "alert" ? 600 : 400 }}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Col>

      {/* Network flows */}
      <Col lg={6}>
        <div style={PANEL_STYLE}>
          <div style={HEADER_STYLE}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={15} color="var(--nw-success)" />
              <span style={{
                fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".06em", color: "var(--nw-text)",
              }}>
                Мережеві потоки
              </span>
            </div>
            <ClearBtn onClick={() => { setPackets({}); setSessionOrder([]); }} title="Очистити потоки" />
          </div>

          <div style={{ ...LOG_PANE_STYLE, fontFamily: undefined }} ref={undefined}>
            {sessionOrder.length === 0 ? (
              <div style={{
                color: "var(--nw-muted)", textAlign: "center",
                padding: "3rem 0", opacity: .4,
                fontFamily: "JetBrains Mono, monospace", fontSize: ".72rem",
              }}>
                Активність відсутня
              </div>
            ) : (
              sessionOrder.map((key) => {
                const flow = packets[key];
                if (!flow) return null;
                const flags = flow.flags || {};
                const proto = flow.protocol === 6 ? "TCP" : flow.protocol === 17 ? "UDP" : `IP-${flow.protocol}`;
                const protoColor = flow.protocol === 6 ? "var(--nw-accent)" : "var(--nw-info)";

                return (
                  <div
                    key={key}
                    style={{
                      background: "rgba(255,255,255,.025)",
                      border: "1px solid var(--nw-border)",
                      borderRadius: 7, padding: ".55rem .75rem",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: Object.keys(flags).length ? 6 : 0 }}>
                      {/* Protocol badge */}
                      <span style={{
                        fontSize: ".58rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                        background: `${protoColor}18`, color: protoColor,
                        border: `1px solid ${protoColor}30`,
                        fontFamily: "JetBrains Mono, monospace",
                      }}>
                        {proto}
                      </span>

                      {/* Src → Dst */}
                      <span className="font-monospace" style={{ fontSize: ".7rem", fontWeight: 600, color: "var(--nw-text)" }}>
                        {flow.src}
                      </span>
                      <span style={{ color: "var(--nw-muted)", fontSize: ".7rem" }}>→</span>
                      <span className="font-monospace" style={{ fontSize: ".7rem", fontWeight: 600, color: "var(--nw-text)" }}>
                        {flow.dst}
                      </span>

                      {/* Packet count */}
                      <span style={{ marginLeft: "auto", fontSize: ".68rem", color: "var(--nw-muted)" }}>
                        Кількість пакетів: <span style={{ color: "var(--nw-text)", fontWeight: 600 }}>{flow.count}</span>
                      </span>
                    </div>

                    {/* TCP flags */}
                    {flow.protocol === 6 && Object.keys(flags).length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                        {Object.entries(flags).map(([flag, count]) => (
                          <span
                            key={flag}
                            style={{
                              fontSize: ".58rem", padding: "1px 6px", borderRadius: 5,
                              background: "rgba(255,255,255,.04)",
                              border: "1px solid var(--nw-border)",
                              color: "var(--nw-muted)",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {parseFlagBits(flag)}:{" "}
                            <span style={{ color: "var(--nw-text)" }}>{count}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {flow.ports && Object.keys(flow.ports).length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        <span style={{ fontSize: ".58rem", color: "var(--nw-muted)", marginRight: 2, alignSelf: "center" }}>
                          Порти:
                        </span>
                        {Object.entries(flow.ports)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([port]) => (
                            <span
                              key={port}
                              style={{
                                fontSize: ".58rem", padding: "1px 6px", borderRadius: 5,
                                background: "var(--nw-accent)10",
                                border: "1px solid var(--nw-accent)30",
                                color: "var(--nw-accent)",
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                            >
                              {port}
                            </span>
                          ))}
                        {Object.keys(flow.ports).length > 5 && (
                          <span style={{ fontSize: ".58rem", color: "var(--nw-muted)", alignSelf: "center" }}>
                            +{Object.keys(flow.ports).length - 5} ще
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Col>
    </Row>
  );
}
