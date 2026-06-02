import { Card, Row, Col, ProgressBar, Stack } from "react-bootstrap";
import { Cpu, HardDrive, Download, Upload, Network } from "lucide-react";

export default function Dashboard({ routerInfo }) {
  const getProgressVariant = (val) => {
    if (val > 90) return "danger";
    if (val > 70) return "warning";
    return "primary";
  };

  return (
    <Card bg="dark" text="light" className="border-secondary shadow-sm">
      <Card.Body className="p-4">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="bg-primary bg-opacity-10 p-2 rounded">
            <Network className="text-primary" size={24} />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">{routerInfo.hostname}</h4>
            <div className="text-secondary small font-monospace">System Online</div>
          </div>
        </div>

        <Row className="g-3 mb-4">
          <Col sm={6}>
            <div className="bg-black bg-opacity-25 border border-secondary rounded p-3">
              <div className="text-secondary small text-uppercase fw-bold mb-1 font-monospace" style={{ fontSize: '0.65rem' }}>LAN IP</div>
              <div className="fw-bold font-monospace text-primary">{routerInfo.ip}</div>
            </div>
          </Col>
          <Col sm={6}>
            <div className="bg-black bg-opacity-25 border border-secondary rounded p-3">
              <div className="text-secondary small text-uppercase fw-bold mb-1 font-monospace" style={{ fontSize: '0.65rem' }}>MAC Address</div>
              <div className="fw-bold font-monospace text-primary">{routerInfo.mac}</div>
            </div>
          </Col>
        </Row>

        <Row className="g-3 mb-4">
          <Col xs={6}>
            <div className="bg-black bg-opacity-25 border border-secondary rounded p-3 text-center">
              <Download size={16} className="text-info mb-2" />
              <div className="text-secondary small text-uppercase font-monospace mb-1" style={{ fontSize: '0.6rem' }}>Download</div>
              <div className="h5 mb-0 fw-bold font-monospace text-info">{routerInfo.downloadSpeed}</div>
            </div>
          </Col>
          <Col xs={6}>
            <div className="bg-black bg-opacity-25 border border-secondary rounded p-3 text-center">
              <Upload size={16} className="text-purple mb-2" />
              <div className="text-secondary small text-uppercase font-monospace mb-1" style={{ fontSize: '0.6rem' }}>Upload</div>
              <div className="h5 mb-0 fw-bold font-monospace text-purple" style={{ color: '#a78bfa' }}>{routerInfo.uploadSpeed}</div>
            </div>
          </Col>
        </Row>

        <Stack gap={3}>
          <div>
            <div className="d-flex justify-content-between mb-2 small font-monospace">
              <span className="text-secondary d-flex align-items-center gap-2">
                <Cpu size={14} /> CPU Usage
              </span>
              <span className="fw-bold">{routerInfo.cpuUsage}%</span>
            </div>
            <ProgressBar 
              now={routerInfo.cpuUsage} 
              variant={getProgressVariant(routerInfo.cpuUsage)} 
              style={{ height: '6px' }} 
              className="bg-black bg-opacity-50"
            />
          </div>
          <div>
            <div className="d-flex justify-content-between mb-2 small font-monospace">
              <span className="text-secondary d-flex align-items-center gap-2">
                <HardDrive size={14} /> RAM Usage
              </span>
              <span className="fw-bold">{routerInfo.ramUsage}%</span>
            </div>
            <ProgressBar 
              now={routerInfo.ramUsage} 
              variant={getProgressVariant(routerInfo.ramUsage)} 
              style={{ height: '6px' }} 
              className="bg-black bg-opacity-50"
            />
          </div>
        </Stack>
      </Card.Body>
    </Card>
  );
}
