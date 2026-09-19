import { useState, useMemo } from "react";
import { Row, Col } from "react-bootstrap";
import { Terminal as TerminalIcon, Activity, Trash2, Search } from "lucide-react";

function ClearBtn({ onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="clear-button"
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
  const [logFilter, setLogFilter] = useState("");
  const [flowFilter, setFlowFilter] = useState("");

  const filteredLogs = useMemo(() => {
    if (!logFilter.trim()) return logs;
    const q = logFilter.toLowerCase();
    return logs.filter(log => log.message?.toLowerCase().includes(q));
  }, [logFilter, logs]);

  const filteredOrder = useMemo(() => {
    if (!flowFilter.trim()) return sessionOrder;
    const q = flowFilter.toLowerCase();
    return sessionOrder.filter(key => {
      const f = packets[key];
      if (!f) return false;
      const proto = f.protocol === 6 ? "tcp" : f.protocol === 17 ? "udp" : `ip-${f.protocol}`;
      return (
        f.src.toLowerCase().includes(q) ||
        f.dst.toLowerCase().includes(q) ||
        (f.flow_id && f.flow_id.toLowerCase().includes(q)) ||
        proto.includes(q)
      );
    });
  }, [flowFilter, sessionOrder, packets]);

  return (
    <Row className="g-4">
      {/* System logs */}
      <Col lg={6}>
        <div className="terminal-panel">
          <div className="terminal-header">
            <div className="terminal-heading">
              <TerminalIcon size={15} color="var(--nw-info)" />
              <span className="terminal-title">
                Системні логи
              </span>
            </div>

            <div className="terminal-actions">
              <div className="terminal-search">
                <Search size={12} className="terminal-search-icon" />
                <input
                  type="text"
                  placeholder="Пошук..."
                  value={logFilter}
                  onChange={e => setLogFilter(e.target.value)}
                  className="terminal-search-input"
                />
              </div>
              <ClearBtn onClick={() => setLogs([])} title="Очистити логи" />
            </div>
          </div>

          <div className="log-pane" ref={logsContainerRef}>
            {filteredLogs.length === 0 ? (
              <div className="terminal-empty">
                {logFilter ? "Нічого не знайдено" : "Логи відсутні"}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id || log.timestamp}
                  className="log-row"
                >
                  <span className="log-time">
                    [{new Date(log.timestamp).toLocaleTimeString("uk-UA")}]
                  </span>
                  <span className={`log-message ${log.type === "alert" ? "alert-log" : ""}`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Col>

      <Col lg={6}>
        <div className="terminal-panel">
          <div className="terminal-header">
            <div className="terminal-heading">
              <Activity size={15} color="var(--nw-success)" />
              <span className="terminal-title">
                Пакети
              </span>
            </div>
            
            <div className="terminal-actions">
              <div className="terminal-search">
                <Search size={12} className="terminal-search-icon" />
                <input
                  type="text"
                  placeholder="Пошук..."
                  value={flowFilter}
                  onChange={e => setFlowFilter(e.target.value)}
                  className="terminal-search-input"
                />
              </div>
              <ClearBtn onClick={() => { setPackets({}); setSessionOrder([]); }} title="Очистити потоки" />
            </div>
          </div>

          <div className="log-pane flow-pane">
            {filteredOrder.length === 0 ? (
              <div className="terminal-empty flow-empty">
                {flowFilter ? "Нічого не знайдено" : "Активність відсутня"}
              </div>
            ) : (
              filteredOrder.map((key) => {
                const flow = packets[key];
                if (!flow) return null;
                const flags = flow.flags || {};
                const proto = flow.protocol === 6 ? "TCP" : flow.protocol === 17 ? "UDP" : `IP-${flow.protocol}`;
                const protoClass = flow.protocol === 6 ? "proto-tcp" : "proto-other";

                return (
                  <div
                    key={key}
                    className="flow-card"
                  >
                    <div className="flow-header">
                      <span 
                        title="Натисніть, щоб скопіювати"
                        onClick={() => {
                          navigator.clipboard.writeText(flow.flow_id);
                        }}
                        className="copyable-id flow-id"
                      >
                        ID: {flow.flow_id}
                      </span>
                      <span className="packet-count">
                        Пакетів: <span>{flow.count}</span>
                      </span>
                    </div>
                    <div className={`flow-route ${Object.keys(flags).length ? "has-flags" : ""}`}>
                      {/* Protocol badge */}
                      <span className={`protocol-badge ${protoClass}`}>
                        {proto}
                      </span>

                      {/* Src → Dst */}
                      <span className="font-monospace endpoint">
                        {flow.src}
                      </span>
                      <span className="route-arrow">→</span>
                      <span className="font-monospace endpoint">
                        {flow.dst}
                      </span>
                    </div>

                    {/* TCP flags */}
                    {flow.protocol === 6 && Object.keys(flags).length > 0 && (
                      <div className="flow-tags flags-list">
                        {Object.entries(flags).map(([flag, count]) => (
                          <span
                            key={flag}
                            className="flow-tag flag-tag"
                          >
                            {parseFlagBits(flag)}:{" "}
                            <span className="tag-count">{count}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {flow.ports && Object.keys(flow.ports).length > 0 && (
                      <div className="flow-tags">
                        <span className="ports-label">
                          Порти:
                        </span>
                        {Object.entries(flow.ports)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([port]) => (
                            <span
                              key={port}
                              className="flow-tag port-tag"
                            >
                              {port}
                            </span>
                          ))}
                        {Object.keys(flow.ports).length > 5 && (
                          <span className="more-count">
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
