import { Card, Button, ButtonGroup, Alert, Stack, Badge } from "react-bootstrap";
import { SEV_ICON } from "./Toasts";
import { Trash2, Filter, Bell } from "lucide-react";

export default function Alerts({ alerts, alertFilter, setAlertFilter, setAlerts, fmtDate }) {
  const filteredAlerts = alerts.filter(a => alertFilter === "all" || (a.severity?.toLowerCase() === alertFilter.toLowerCase()));

  const getAlertVariant = (sev) => {
    switch(sev?.toLowerCase()) {
      case 'critical': return 'danger';
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <Card bg="dark" text="light" className="border-secondary shadow-sm">
      <Card.Header className="bg-transparent border-secondary py-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center gap-2">
            <Filter size={18} className="text-secondary" />
            <ButtonGroup size="sm">
              {["all", "low", "medium", "high", "critical"].map(f => (
                <Button 
                  key={f} 
                  variant={alertFilter === f ? "primary" : "outline-secondary"}
                  onClick={() => setAlertFilter(f)}
                  className="text-uppercase fw-bold font-monospace px-3"
                  style={{ fontSize: '0.65rem' }}
                >
                  {f === "all" ? "Всі" : f}
                </Button>
              ))}
            </ButtonGroup>
          </div>
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={() => setAlerts([])}
            className="d-flex align-items-center gap-2 fw-bold px-3"
          >
            <Trash2 size={14} /> Очистити
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-4">
        <Stack gap={3}>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-5">
              <div className="text-secondary opacity-50 mb-2">
                <Bell size={48} />
              </div>
              <div className="text-secondary font-monospace">Журнал подій порожній</div>
            </div>
          ) : (
            filteredAlerts.map((a, i) => (
              <Alert 
                key={i} 
                variant={getAlertVariant(a.severity)} 
                className="bg-dark border-secondary border-start border-4 mb-0 py-3 px-4 position-relative"
              >
                <div className="d-flex gap-3">
                  <span className="fs-4">{SEV_ICON[a.severity] || "⚡"}</span>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <h6 className="mb-0 fw-bold text-light">{a.type}</h6>
                      <Badge 
                        bg={getAlertVariant(a.severity)} 
                        className="text-uppercase font-monospace"
                        style={{ fontSize: '0.6rem' }}
                      >
                        {a.severity}
                      </Badge>
                    </div>
                    <p className="mb-2 text-secondary small">{a.description}</p>
                    <div className="text-secondary font-monospace" style={{ fontSize: '0.7rem' }}>
                      {fmtDate(a.timestamp * 1000)}
                    </div>
                  </div>
                </div>
              </Alert>
            ))
          )}
        </Stack>
      </Card.Body>
    </Card>
  );
}
