import { Card, Table, Form, Badge, InputGroup } from "react-bootstrap";
import { Search, Monitor } from "lucide-react";

export default function DHCPTable({ clients, search, setSearch }) {
  const activeCount = clients.filter(c => c.status === "active").length;
  const filteredClients = clients.filter(c => !search || c.ip.includes(search) || c.hostname?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card bg="dark" text="light" className="border-secondary shadow-sm">
      <Card.Header className="bg-transparent border-secondary py-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <Card.Title className="mb-0 fw-bold">Пристрої мережі</Card.Title>
            <div className="text-secondary small font-monospace mt-1">
              <Badge bg="success" pill className="me-1">{activeCount}</Badge> активних сесій
            </div>
          </div>
          <InputGroup className="w-auto" style={{ maxWidth: '300px' }}>
            <InputGroup.Text className="bg-black border-secondary text-secondary">
              <Search size={16} />
            </InputGroup.Text>
            <Form.Control 
              className="bg-black border-secondary text-light small font-monospace"
              placeholder="Пошук за IP або назвою..." 
              onChange={e => setSearch(e.target.value)} 
            />
          </InputGroup>
        </div>
      </Card.Header>
      <div className="table-responsive">
        <Table variant="dark" hover className="mb-0 align-middle font-monospace small">
          <thead className="text-secondary text-uppercase" style={{ fontSize: '0.7rem' }}>
            <tr>
              <th className="border-secondary px-4">Пристрій</th>
              <th className="border-secondary">MAC-адреса</th>
              <th className="border-secondary">IP-адреса</th>
              <th className="border-secondary px-4 text-end">Статус</th>
            </tr>
          </thead>
          <tbody className="border-top-0">
            {filteredClients.map((c, i) => (
              <tr key={i} className="border-secondary">
                <td className="px-4 border-secondary py-3">
                  <div className="d-flex align-items-center gap-2">
                    <Monitor size={14} className="text-primary" />
                    <span className="fw-bold">{c.hostname || "Unknown"}</span>
                  </div>
                </td>
                <td className="text-secondary border-secondary">{c.mac}</td>
                <td className="text-info border-secondary fw-bold">{c.ip}</td>
                <td className="px-4 text-end border-secondary">
                  <Badge 
                    pill 
                    bg={c.status === "active" ? "success" : c.status === "expired" ? "danger" : "warning"}
                    className="bg-opacity-10 text-uppercase"
                    style={{ fontSize: '0.65rem', border: '1px solid currentColor' }}
                  >
                    {c.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-5 text-secondary">Пристроїв не знайдено</td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </Card>
  );
}
