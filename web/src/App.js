import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { 
  BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation 
} from "react-router-dom";
import { 
  Container, Navbar, Nav, Row, Col, Badge, 
  Alert, Button, Spinner, Stack 
} from "react-bootstrap";
import { LayoutDashboard as LayoutIcon, Bell as BellIcon, Shield as ShieldIcon, LogOut as LogOutIcon } from "lucide-react";

import "./App.css";
import Toasts from "./components/Toasts";
import Alerts from "./components/Alerts";
import DHCPTable from "./components/DHCPTable";
import Dashboard from "./components/Dashboard";
import Rules from "./components/Rules";
import Terminal from "./components/Terminal";
import Login from "./components/Login";

const API_BASE = "http://potyshyi-server:8000";
const WS_URL = "ws://potyshyi-server:8000/ws";
const RECONNECT_MS = 3001;
const PING_INTERVAL = 20000;

const TYPE_LABELS = {
  port_scan: "Port Scan", brute_force: "Brute Force", syn_flood: "SYN Flood",
  icmp_flood: "ICMP Flood", ddos_flood: "DDoS Flood", dns_anomaly: "DNS Anomaly",
  large_packet: "Large Packet", telnet_access: "Telnet Access",
  config_change: "Config Change", custom: "Custom Rule",
};

export function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("uk-UA") + " " + d.toLocaleTimeString("uk-UA");
  } catch { return iso; }
}

function MainLayout({ isAuth, setIsAuth }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const [wsStatus, setWsStatus] = useState("connecting");
  const [userRole, setUserRole] = useState(null);
  const wsRef = useRef(null);
  const pingTimer = useRef(null);

  const [routerInfo, setRouterInfo] = useState({
    hostname: "MikroTik CHR", ip: "-", mac: "-", dns: "-",
    wanStatus: "—", cpuUsage: 0, ramUsage: 0,
    downloadSpeed: "-", uploadSpeed: "-",
    uptime: "00:00:00",
  });

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [alertFilter, setAlertFilter] = useState("all");
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [rules, setRules] = useState([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", type: "custom", severity: "medium", description: "", pattern: "" });

  const [logs, setLogs] = useState([]);
  const [packets, setPackets] = useState({});
  const packetsRef = useRef({});
  const [sessionOrder, setSessionOrder] = useState([]);
  const [toasts, setToasts] = useState([]);
  
  const logsContainerRef = useRef(null);

  const addToast = useCallback((message, severity = "medium") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, severity }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4200);
  }, []);

  const wsSend = (p) => wsRef.current?.readyState === 1 && wsRef.current.send(JSON.stringify(p));

  const handleAddRule = useCallback(() => {
    if (!newRule.name.trim()) return;
    wsSend({ action: "add_rule", rule: newRule });
    setNewRule({ name: "", type: "custom", severity: "medium", description: "", pattern: "" });
    setShowAddRule(false);
  }, [newRule]);

  const handleMessage = useCallback((msg) => {
    const ctx = msg.context;
    if (ctx === "initial") {
      const r = msg.router || {};
      setUserRole(msg.role);
      setClients(msg.dhcp || []);
      setRouterInfo(prev => ({
        ...prev,
        hostname: r.device_name,
        ip: r.ip_address || "-",
        mac: r.mac_address || "-",
        dns: Array.isArray(r.dns_server) ? r.dns_server.join(", ") : (r.dns_server || "-"),
        wanStatus: r.wanStatus || "Connected",
        cpuUsage: r.cpuUsage ?? prev.cpuUsage,
        ramUsage: r.ramUsage ?? prev.ramUsage,
        downloadSpeed: r.downloadSpeed || prev.downloadSpeed,
        uploadSpeed: r.uploadSpeed || prev.uploadSpeed,
        uptime: r.uptime,
      }));
    }
    else if (ctx === "stats") setRouterInfo(prev => ({ ...prev, ...msg }));
    else if (ctx === "log") {
      setLogs(prev => [...prev.slice(-199), { ...msg.data, timestamp: new Date().toISOString(), id: Date.now() + Math.random() }]);
    }
    else if (ctx === "dhcp") {
      setClients(prev => {
        const exists = prev.find(c => c.id === msg.data.id);
        if (exists) return prev.map(c => c.id === msg.data.id ? msg.data : c);
        return [...prev, msg.data];
      });
    }
    else if (ctx === "flows") {
      const delta = msg.data || {};
      packetsRef.current = { ...packetsRef.current };
      const newKeys = [];
      Object.entries(delta).forEach(([sessionKey, flow]) => {
        const isNew = !packetsRef.current[sessionKey];
        packetsRef.current[sessionKey] = {
          ...flow,
          uniqueId: packetsRef.current[sessionKey]?.uniqueId || Math.random().toString(36).substr(2, 9),
        };
        if (isNew) newKeys.push(sessionKey);
      });
      setPackets({ ...packetsRef.current });
      if (newKeys.length > 0) setSessionOrder(prev => [...newKeys, ...prev]);
    }
    else if (ctx === "alert") {
      setAlerts(prev => [{ ...msg.data, _received: Date.now() }, ...prev].slice(0, 200));
      setUnreadAlerts(v => v + 1);
      addToast(`${TYPE_LABELS[msg.data.type] || msg.data.type}: ${msg.data.description?.slice(0, 60)}`, msg.data.severity);
    }
    else if (ctx === "rules_list") setRules(msg.data || []);
  }, [addToast]);

  const connect = useCallback(() => {
    if (!isAuth) return;
    if (wsRef.current) wsRef.current.close();
    setWsStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      setWsStatus("ok");
      pingTimer.current = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ action: "ping" })), PING_INTERVAL);
      ws.send(JSON.stringify({ action: "get_rules" }));
    };
    ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
    ws.onclose = (e) => {
      if (e.code === 1008) {
        setIsAuth(false);
        navigate("/login");
      } else {
        setWsStatus("reconnecting");
        clearInterval(pingTimer.current);
        setTimeout(connect, RECONNECT_MS);
      }
    };
  }, [handleMessage, isAuth, navigate, setIsAuth]);

  useEffect(() => {
    connect();
    return () => { clearInterval(pingTimer.current); if (wsRef.current) wsRef.current.close(); };
  }, [connect]);

  useEffect(() => { if (tab === "alerts") setUnreadAlerts(0); }, [tab]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
      setIsAuth(false);
      navigate("/login");
    } catch (err) { console.error('Logout failed', err); }
  };

  const alertProps = { alerts, alertFilter, setAlertFilter, setAlerts, fmtDate };
  const rulesProps = {
    rules, showAddRule, setShowAddRule, newRule, setNewRule,
    handleAddRule, wsSend: (p) => wsSend(p),
  };

  const statusVariant = wsStatus === "ok" ? "success" : wsStatus === "reconnecting" ? "warning" : "danger";

  return (
    <div className="bg-dark text-light min-vh-100">
      <Toasts toasts={toasts} />
      <Navbar bg="dark" variant="dark" className="border-bottom border-secondary px-3 sticky-top">
        <Navbar.Brand className="fw-bold"><ShieldIcon className="me-2 text-primary" /> NetWatch</Navbar.Brand>
        <Nav className="ms-auto align-items-center">
          <Badge bg={statusVariant} className="me-2 py-2 px-3 rounded-pill text-uppercase" style={{ fontSize: '0.7rem' }}>
            {wsStatus.toUpperCase()}
          </Badge>
          <div className="text-secondary small font-monospace bg-black bg-opacity-25 border border-secondary px-3 py-1 rounded-pill">{routerInfo.uptime}</div>
          <Button variant="link" className="text-secondary p-0 ms-3" onClick={handleLogout}><LogOutIcon size={18} /></Button>
        </Nav>
      </Navbar>

      <Container fluid className="p-0">
        <Row className="g-0">
          <Col md={3} lg={2} className="bg-dark border-end border-secondary min-vh-100 p-3 d-none d-md-block sticky-top" style={{ top: '56px', height: 'calc(100vh - 56px)' }}>
            <Nav variant="pills" className="flex-column gap-1">
              <Nav.Link active={tab === "dashboard"} onClick={() => setTab("dashboard")} className="d-flex align-items-center gap-3">
                <LayoutIcon size={18} /> <span>Дашборд</span>
              </Nav.Link>
              <Nav.Link active={tab === "alerts"} onClick={() => setTab("alerts")} className="d-flex align-items-center gap-3 position-relative">
                <BellIcon size={18} /> <span>Події</span>
                {unreadAlerts > 0 && <Badge bg="danger" pill className="ms-auto">{unreadAlerts}</Badge>}
              </Nav.Link>
              <Nav.Link active={tab === "rules"} onClick={() => setTab("rules")} className="d-flex align-items-center gap-3">
                <ShieldIcon size={18} /> <span>Правила</span>
              </Nav.Link>
            </Nav>
          </Col>
          <Col md={9} lg={10} className="p-4">
            <div className="tab-content">
              {tab === "dashboard" && (
                <Stack gap={4}>
                  <Dashboard routerInfo={routerInfo} />
                  <Terminal logs={logs} setLogs={setLogs} packets={packets} setPackets={setPackets} sessionOrder={sessionOrder} setSessionOrder={setSessionOrder} logsContainerRef={logsContainerRef} />
                  <DHCPTable clients={clients} search={search} setSearch={setSearch} />
                </Stack>
              )}
              {tab === "alerts" && <Alerts {...alertProps} />}
              {tab === "rules"  && <Rules {...rulesProps} />}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
      setIsAuth(res.ok);
    } catch (err) {
      setIsAuth(false);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (authChecking) {
    return <div className="bg-dark text-light min-vh-100 d-flex align-items-center justify-content-center"><Spinner animation="border" variant="primary" /></div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuth ? <Navigate to="/" /> : <Login onLoginSuccess={() => setIsAuth(true)} />} />
        <Route path="/*" element={isAuth ? <MainLayout isAuth={isAuth} setIsAuth={setIsAuth} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
