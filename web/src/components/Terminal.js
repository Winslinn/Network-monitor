import React from 'react';
import { Card, Button, Row, Col, Badge, ListGroup } from 'react-bootstrap';
import { Terminal as TerminalIcon, Activity, Trash2 } from 'lucide-react';

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
    <Row className="g-4">
      {/* СИСТЕМНІ ЛОГИ */}
      <Col lg={6}>
        <Card bg="dark" text="light" className="border-secondary h-100 shadow-sm">
          <Card.Header className="bg-transparent border-secondary py-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <TerminalIcon size={18} className="text-info" />
              <Card.Title className="mb-0 fw-bold small text-uppercase font-monospace">System Logs</Card.Title>
            </div>
            <Button variant="outline-secondary" size="sm" onClick={() => setLogs([])} className="p-1 px-2 border-0 opacity-50 hover-opacity-100">
              <Trash2 size={14} />
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            <div 
              className="font-monospace p-3 overflow-auto" 
              style={{ height: '350px', fontSize: '0.75rem', backgroundColor: '#050505' }}
              ref={logsContainerRef}
            >
              {logs.length === 0 ? (
                <div className="text-secondary text-center py-5 opacity-50">Логи відсутні</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="d-flex gap-3 mb-1 border-bottom border-secondary border-opacity-25 pb-1">
                    <span className="text-secondary opacity-50" style={{ minWidth: '70px' }}>
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className={log.type === 'alert' ? 'text-danger fw-bold' : 'text-light'}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* FLOWS */}
      <Col lg={6}>
        <Card bg="dark" text="light" className="border-secondary h-100 shadow-sm">
          <Card.Header className="bg-transparent border-secondary py-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <Activity size={18} className="text-success" />
              <Card.Title className="mb-0 fw-bold small text-uppercase font-monospace">Network Flows</Card.Title>
            </div>
            <Button variant="outline-secondary" size="sm" onClick={() => { setPackets({}); setSessionOrder([]); }} className="p-1 px-2 border-0 opacity-50 hover-opacity-100">
              <Trash2 size={14} />
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            <div 
              className="p-3 overflow-auto" 
              style={{ height: '350px', backgroundColor: '#050505' }}
            >
              {sessionOrder.length === 0 ? (
                <div className="text-secondary text-center py-5 opacity-50 font-monospace" style={{ fontSize: '0.75rem' }}>Активність відсутня</div>
              ) : (
                sessionOrder.map((key) => {
                  const flow = packets[key];
                  if (!flow) return null;
                  const flags  = flow.flags  || {};

                  return (
                    <div key={key} className="bg-dark border border-secondary rounded p-2 mb-2 font-monospace" style={{ fontSize: '0.7rem' }}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <Badge bg={flow.protocol === 6 ? 'primary' : 'info'} style={{ fontSize: '0.6rem' }}>
                            {flow.protocol === 6 ? 'TCP' : flow.protocol === 17 ? 'UDP' : `IP-${flow.protocol}`}
                          </Badge>
                          <span className="fw-bold">{flow.src}</span>
                          <span className="text-secondary">→</span>
                          <span className="fw-bold">{flow.dst}</span>
                        </div>
                        <div className="text-secondary">
                          Pkt: <span className="text-light fw-bold">{flow.count}</span>
                        </div>
                      </div>

                      {flow.protocol === 6 && Object.keys(flags).length > 0 && (
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {Object.entries(flags).map(([flag, count]) => (
                            <Badge 
                              key={flag} 
                              bg="dark" 
                              className="border border-secondary text-secondary fw-normal"
                              style={{ fontSize: '0.6rem' }}
                            >
                              {getFlagName(flag)}: <span className="text-light">{count}</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
