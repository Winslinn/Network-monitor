import { Card, Button, Form, ListGroup, Badge, Stack, InputGroup } from "react-bootstrap";
import { Plus, X, ShieldAlert, Save } from "lucide-react";

export default function Rules({ rules, showAddRule, setShowAddRule, newRule, setNewRule, handleAddRule, wsSend }) {
  const getSeverityVariant = (sev) => {
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
        <div className="d-flex justify-content-between align-items-center">
          <Card.Title className="mb-0 fw-bold">Правила виявлення</Card.Title>
          {!showAddRule && (
            <Button variant="primary" size="sm" onClick={() => setShowAddRule(true)} className="d-flex align-items-center gap-2">
              <Plus size={16} /> Нове правило
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-4">
        {showAddRule && (
          <Card className="bg-black bg-opacity-25 border-secondary mb-4">
            <Card.Body className="p-3">
              <h6 className="text-secondary small text-uppercase fw-bold mb-3 font-monospace">Створення нового правила</h6>
              <Stack gap={3}>
                <Form.Group>
                  <Form.Control 
                    className="bg-dark border-secondary text-light font-monospace small"
                    placeholder="Назва правила"
                    value={newRule.name}
                    onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                  />
                </Form.Group>
                <div className="d-flex gap-2">
                  <Button variant="success" size="sm" onClick={handleAddRule} className="d-flex align-items-center gap-2 flex-grow-1 justify-content-center">
                    <Save size={16} /> Зберегти
                  </Button>
                  <Button variant="outline-secondary" size="sm" onClick={() => setShowAddRule(false)}>
                    Скасувати
                  </Button>
                </div>
              </Stack>
            </Card.Body>
          </Card>
        )}

        <ListGroup variant="flush" className="bg-transparent border border-secondary rounded overflow-hidden">
          {rules.length === 0 ? (
            <ListGroup.Item className="bg-dark text-secondary text-center py-5 font-monospace">
              Правила безпеки ще не налаштовані
            </ListGroup.Item>
          ) : (
            rules.map(rule => (
              <ListGroup.Item key={rule.id} className="bg-dark border-secondary py-3 px-4 d-flex align-items-center gap-3">
                <div 
                  className={`rounded-circle ${rule.is_enabled ? "bg-success" : "bg-secondary"}`} 
                  style={{ width: 8, height: 8, boxShadow: rule.is_enabled ? '0 0 8px var(--bs-success)' : 'none' }} 
                />
                <div className="flex-grow-1">
                  <div className="fw-bold mb-0 text-light">{rule.name}</div>
                  <div className="text-secondary small font-monospace">ID: {rule.id.slice(0,8)}...</div>
                </div>
                <Badge bg={getSeverityVariant(rule.severity)} className="text-uppercase font-monospace px-3 py-2">
                  {rule.severity}
                </Badge>
                <Button 
                  variant="link" 
                  className="text-danger p-0 ms-2 opacity-75 hover-opacity-100" 
                  onClick={() => wsSend({ action: "delete_rule", rule_id: rule.id })}
                >
                  <X size={20} />
                </Button>
              </ListGroup.Item>
            ))
          )}
        </ListGroup>
      </Card.Body>
    </Card>
  );
}
