import React from 'react';

export default function Terminal({ 
  logs, 
  setLogs, 
  packets, 
  setPackets, 
  sessionOrder, 
  setSessionOrder, 
  logsContainerRef 
}) {

  const getFlagName = (flagValue) => {
    const val = parseInt(flagValue, 10);
    if (isNaN(val)) return flagValue;
    const labels = [];
    if (val & 0x01) labels.push('FIN');
    if (val & 0x02) labels.push('SYN');
    if (val & 0x04) labels.push('RST');
    if (val & 0x08) labels.push('PSH');
    if (val & 0x10) labels.push('ACK');
    if (val & 0x20) labels.push('URG');
    return labels.length > 0 ? labels.join('+') : `0x${val.toString(16).toUpperCase()}`;
  };

  return (
    <div className="terminal-container">
      {/* СИСТЕМНІ ЛОГИ */}
      <div className="terminal-card">
        <div className="terminal-header">
          <div className="terminal-title">System Logs & Alerts</div>
          <button className="terminal-clear-btn" onClick={() => setLogs([])}>Clear</button>
        </div>
        <div className="terminal-content" ref={logsContainerRef}>
          {logs.length === 0 ? (
            <div className="terminal-empty">Логи та атаки не зафіксовані</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`terminal-line ${log.type === 'alert' ? 'log-alert' : ''}`}>
                <span className="terminal-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="terminal-log">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FLOWS */}
      <div className="terminal-card">
        <div className="terminal-header">
          <div className="terminal-title">Network Flows Monitor</div>
          <button className="terminal-clear-btn" onClick={() => { setPackets({}); setSessionOrder([]); }}>Clear</button>
        </div>
        <div className="terminal-content">
          {sessionOrder.length === 0 ? (
            <div className="terminal-empty">Мережева активність відсутня</div>
          ) : (
            sessionOrder.map((key) => {
              const flow = packets[key];
              if (!flow) return null;

              const dports = flow.dports || {};
              const flags  = flow.flags  || {};

              const sortedPorts = Object.entries(dports)
                .sort(([, a], [, b]) => b - a);

              return (
                <div key={key} className="connection-item">
                  <div className="connection-header-row">
                    <div className="connection-title">
                      <span className={`protocol-badge ${flow.protocol === 6 ? 'proto-tcp' : 'proto-udp'}`}>
                        {flow.protocol === 6 ? 'TCP' : flow.protocol === 17 ? 'UDP' : `IP-${flow.protocol}`}
                      </span>
                      <strong>{flow.src}</strong>
                      <span className="arrow-divider"> → </span>
                      <strong>{flow.dst}</strong>
                    </div>
                    <div className="connection-meta-right">
                      Пакетів: <span className="highlight-text">{flow.count || 0}</span>
                      {' · '}
                      Портів: <span className={`highlight-text ${flow.unique_ports > 100 ? 'flag-anomaly' : ''}`}>
                        {flow.unique_ports || 0}
                      </span>
                    </div>
                  </div>

                  {flow.protocol === 6 && Object.keys(flags).length > 0 && (
                    <div className="connection-flags-container">
                      <span className="flags-label">Flags:</span>
                      {Object.entries(flags).map(([flag, count]) => {
                        const isSynFloodRisk = parseInt(flag, 10) === 2 && count > 15;
                        return (
                          <span key={flag} className={`flag-counter-badge ${isSynFloodRisk ? 'flag-anomaly' : ''}`}>
                            {getFlagName(flag)}: <span className="flag-count">{count}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}