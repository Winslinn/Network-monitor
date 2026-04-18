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
  return (
    <div className="terminal-container">
      {/* System logs */}
      <div className="terminal-card">
        <div className="terminal-header">
          <div className="terminal-title">System Logs</div>
          <button className="terminal-clear-btn" onClick={() => setLogs([])}>
            Clear
          </button>
        </div>
        <div className="terminal-content" ref={logsContainerRef}>
          {logs.length === 0 ? (
            <div className="terminal-empty">Логи відсутні</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="terminal-line">
                <span className="terminal-time">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="terminal-log">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Packet monitoring */}
      <div className="terminal-card">
        <div className="terminal-header">
          <div className="terminal-title">Connection Monitor</div>
          <button 
            className="terminal-clear-btn" 
            onClick={() => { setPackets({}); setSessionOrder([]); }}
          >
            Clear
          </button>
        </div>
        <div className="terminal-content">
          {sessionOrder.length === 0 ? (
            <div className="terminal-empty">Немає з'єднань</div>
          ) : (
            sessionOrder.map((key) => {
              const s = packets[key];
              if (!s) return null;
              return (
                <div key={s.uniqueId} className="connection-item">
                  <div className="connection-title">
                    {s.src_address} → {s.dst_address}:{s.dst_port}
                  </div>
                  <div className="connection-meta">
                    Пакетів: {s.count} | {new Date(s.last_seen).toLocaleTimeString()}
                  </div>
                  {s.payload && (
                    <div className="connection-payload">
                      {s.payload}
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