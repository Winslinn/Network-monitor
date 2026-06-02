import React, { useState } from "react";
import { Container, Row, Col, Form, Button, Card, Alert } from "react-bootstrap";
import { Shield, Lock, User } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://potyshyi-server:8000/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        onLoginSuccess();
      } else {
        const data = await response.json();
        setError(data.detail || "Невірний логін або пароль");
      }
    } catch (err) {
      setError("Помилка з'єднання з сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100">
      <Row className="w-100 justify-content-center">
        <Col md={6} lg={4}>
          <Card className="bg-dark text-light border-secondary shadow-lg">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <Shield size={48} className="text-primary mb-2" />
                <h3 className="fw-bold">NetWatch</h3>
                <p className="text-secondary small">Вхід у систему моніторингу</p>
              </div>

              {error && <Alert variant="danger" className="py-2 small border-0 bg-danger bg-opacity-10 text-danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="username">
                  <Form.Label className="small text-secondary">Користувач</Form.Label>
                  <div className="position-relative">
                    <User size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary" />
                    <Form.Control
                      type="text"
                      placeholder="Введіть логін"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-black border-secondary text-light ps-5 py-2"
                      required
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-4" controlId="password">
                  <Form.Label className="small text-secondary">Пароль</Form.Label>
                  <div className="position-relative">
                    <Lock size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary" />
                    <Form.Control
                      type="password"
                      placeholder="Введіть пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-black border-secondary text-light ps-5 py-2"
                      required
                    />
                  </div>
                </Form.Group>

                <Button variant="primary" type="submit" className="w-100 py-2 fw-bold" disabled={loading}>
                  {loading ? "Вхід..." : "Увійти"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
