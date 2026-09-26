import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import {
  BrowserRouter as Router, Routes, Route, Navigate, useNavigate,
} from "react-router-dom";
import { Navbar, Nav, Row, Col, Badge, Alert, Button, Spinner, Stack } from "react-bootstrap";
import { Shield, LayoutDashboard, Bell, LogOut } from "lucide-react";

import "./App.css";
import Toasts from "./components/Toasts";
import Alerts from "./components/Alerts";
import DHCPTable from "./components/DHCPTable";
import Dashboard from "./components/Dashboard";
import Rules from "./components/Rules";
import Terminal from "./components/Terminal";
import Login from "./components/Login";

export const API_BASE = "https://potyshyi-server:8443";
const WS_URL = "wss://potyshyi-server:8443/api/ws";
const RECONNECT_MS = 3001;
const PING_INTERVAL = 20000;

export function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("uk-UA") + " " + d.toLocaleTimeString("uk-UA");
  } catch { return iso; }
}

const PAGE = {
  dashboard: { title: "Дашборд", sub: "Огляд мережі та системи" },
  alerts: { title: "Події", sub: "Журнал безпеки та сповіщень" },
  rules: { title: "Правила", sub: "Управління правилами виявлення" },
};

const STATUS_LABEL = {
  ok: "ОК", connecting: "ПІДКЛЮЧЕННЯ", reconnecting: "ПЕРЕПІДКЛЮЧЕННЯ",
};

// ── Main layout (authenticated) ───────────────────────────────────────────
function MainLayout({ setIsAuth }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const [wsStatus, setWsStatus] = useState("connecting");
  const wsRef = useRef(null);
  const pingTimer = useRef(null);

  const [routerInfo, setRouterInfo] = useState({
    hostname: "MikroTik CHR", ip: "—", mac: "—", dns: "—",
    wanStatus: "—", cpuUsage: 0, ramUsage: 0,
    downloadSpeed: "—", uploadSpeed: "—", uptime: null,
  });

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [alertFilter, setAlertFilter] = useState("all");
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [rules, setRules] = useState([]);
  const [availableDetectors, setAvailableDetectors] = useState({});
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "", type: "pattern", severity: "medium", description: "", pattern: "",
  });
  const addingRuleRef = useRef(false);
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

  const handleAddRule = useCallback(async () => {
    if (!newRule.name.trim() || addingRuleRef.current) return;
    addingRuleRef.current = true;
    try {
      const response = await fetch(`${API_BASE}/api/rules`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule),
      });
      if (!response.ok) {
        addToast("Не вдалося додати правило", "high");
        return;
      }
      const created = await response.json();
      setRules(prev => prev.some(rule => rule.id === created.id) ? prev : [...prev, created]);
      addToast(`Правило додано: ${created.name}`, "low");
      setNewRule({ name: "", type: "custom", severity: "medium", description: "", pattern: "" });
      setShowAddRule(false);
    } finally {
      addingRuleRef.current = false;
    }
  }, [newRule, addToast]);

  const handleMessage = useCallback((msg) => {
    const ctx = msg.context;
    if (ctx === "stats") setRouterInfo(prev => ({ ...prev, ...msg }));
    else if (ctx === "log") setLogs(prev => [...prev.slice(-199), {
      ...msg.data, timestamp: new Date().toISOString(), id: Date.now() + Math.random(),
    }]);
    else if (ctx === "dhcp") setClients(prev => {
      const exists = prev.find(c => c.id === msg.data.id);
      return exists ? prev.map(c => c.id === msg.data.id ? msg.data : c) : [...prev, msg.data];
    });
    else if (ctx === "flows") {
      const delta = msg.data || {};
      if (!Object.keys(delta).length) return;
      packetsRef.current = { ...packetsRef.current };
      const newKeys = [];
      Object.entries(delta).forEach(([k, flow]) => {
        const isNew = !packetsRef.current[k];
        packetsRef.current[k] = {
          flow_id: flow.flow_id,
          src: flow.src, dst: flow.dst, protocol: flow.protocol,
          ports: flow.ports, flags: flow.flags,
          count: flow.packet_count,
          uniqueId: packetsRef.current[k]?.uniqueId || Math.random().toString(36).slice(2),
        };
        if (isNew) newKeys.push(k);
      });
      setPackets({ ...packetsRef.current });
      if (newKeys.length) setSessionOrder(prev => [...newKeys, ...prev]);
    }
    else if (ctx === "alert") {
      setAlerts(prev => {
        const data = msg.data || {};
        const exists = prev.find(a => a.id === data.id);

        if (exists) {
          // Оновлюємо існуючу подію
          return prev.map(a => a.id === data.id ? { ...data, _received: Date.now() } : a);
        } else {
          // Це нова подія
          setUnreadAlerts(v => v + 1);
          addToast(
            `${data.type}: ${data.description?.slice(0, 60)}`,
            data.severity,
          );

          return [{
            ...data,
            _id: Date.now() + Math.random(),
            _received: Date.now(),
          }, ...prev].slice(0, 200);
        }
      });
    }
    else if (ctx === "rule_created" && msg.data) setRules(prev => prev.some(r => r.id === msg.data.id) ? prev : [...prev, msg.data]);
    else if (ctx === "rule_updated" && msg.data) setRules(prev => prev.map(r => r.id === msg.data.id ? msg.data : r));
    else if (ctx === "rule_deleted" && msg.data) setRules(prev => prev.filter(r => r.id !== msg.data.id));
  }, [addToast]);

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    setWsStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      setWsStatus("ok");
      pingTimer.current = setInterval(
        () => ws.readyState === 1 && ws.send(JSON.stringify({ action: "ping" })),
        PING_INTERVAL,
      );
    };
    ws.onmessage = e => handleMessage(JSON.parse(e.data));
    ws.onclose = e => {
      clearInterval(pingTimer.current);
      if (e.code === 1008) {
        setIsAuth(false);
        navigate("/login");
      } else {
        setWsStatus("reconnecting");
        setTimeout(connect, RECONNECT_MS);
      }
    };
  }, [handleMessage, navigate, setIsAuth]);

  useEffect(() => {
    connect();
    return () => { clearInterval(pingTimer.current); wsRef.current?.close(); };
  }, [connect]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${API_BASE}/api/bootstrap`, { credentials: "include" }),
      fetch(`${API_BASE}/api/alerts`, { credentials: "include" }),
      fetch(`${API_BASE}/api/flows`, { credentials: "include" }),
    ]).then(async ([bootstrapResponse, alertsResponse, flowsResponse]) => {
      if (bootstrapResponse.status === 401) {
        setIsAuth(false);
        navigate("/login");
        return;
      }
      const bootstrap = await bootstrapResponse.json();
      const history = alertsResponse.ok ? await alertsResponse.json() : [];
      const storedFlows = flowsResponse.ok ? await flowsResponse.json() : [];
      if (cancelled) return;
      const r = bootstrap.router || {};
      setClients(bootstrap.dhcp || []);
      setRules(bootstrap.rules || []);
      setRouterInfo(prev => ({ ...prev, hostname: r.device_name || prev.hostname, ip: r.ip_address || "—", mac: r.mac_address || "—", dns: r.dns_server || "—" }));
      setAlerts(history || []);
      const detectors = bootstrap.available_detectors || {};
      setAvailableDetectors({
        ...Object.fromEntries(Object.entries(detectors).map(([k, d]) => [d.ID, d.TYPE]))
      });

      const initialPackets = {};
      const initialOrder = [];
      (storedFlows || []).forEach(flow => {
        const key = flow.flow_id || String(flow.id);
        if (!key) return;
        initialPackets[key] = {
          flow_id: flow.flow_id,
          src: flow.src || flow.src_ip,
          dst: flow.dst || flow.dst_ip,
          protocol: flow.protocol,
          ports: flow.ports || {},
          flags: flow.flags || {},
          count: flow.packet_count || 0,
          uniqueId: Math.random().toString(36).slice(2),
        };
        initialOrder.push(key);
      });
      packetsRef.current = { ...initialPackets, ...packetsRef.current };
      setPackets(prev => ({ ...initialPackets, ...prev }));
      setSessionOrder(prev => [
        ...initialOrder.filter(key => !prev.includes(key)),
        ...prev,
      ]);
    }).catch(() => addToast("Не вдалося завантажити початкові дані", "high"));
    return () => { cancelled = true; };
  }, [addToast, navigate, setIsAuth]);

  useEffect(() => { if (tab === "alerts") setUnreadAlerts(0); }, [tab]);

  useLayoutEffect(() => {
    if (logsContainerRef.current)
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
  }, [logs]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    clearInterval(pingTimer.current);
    wsRef.current?.close();
    setIsAuth(false);
    navigate("/login");
  };

  const statusVariant = wsStatus === "ok" ? "success" : wsStatus === "reconnecting" ? "warning" : "danger";

  const NavItem = ({ id, icon, label, badge }) => (
    <Nav.Link
      active={tab === id}
      onClick={() => setTab(id)}
      className="d-flex align-items-center gap-3"
    >
      {icon}
      {label}
      {badge > 0 && (
        <Badge bg="danger" pill className="ms-auto nav-badge">{badge}</Badge>
      )}
    </Nav.Link>
  );

  return (
    <div className="app-shell">
      <Toasts toasts={toasts} />

      {/* Top bar */}
      <nav className="topbar">
        <div className="brand">
          <Shield size={16} color="var(--nw-accent)" />
          <span>NetWatch</span>
        </div>

        <div className="topbar-actions">
          {/* WS badge */}
          <span className={`connection-status status-${wsStatus}`}>
            <span className="status-dot" />
            {STATUS_LABEL[wsStatus]}
          </span>

          {/* Uptime */}
          {routerInfo.uptime && <span className="font-monospace uptime">UPTIME: {routerInfo.uptime}</span>}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="logout-button"
            title="Вийти"
          >
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      <div className="app-body">
        {/* Sidebar */}
        <aside className="sidebar flex-column">
          <Nav variant="pills" className="flex-column gap-1">
            <NavItem id="dashboard" icon={<LayoutDashboard size={14} />} label="Дашборд" />
            <NavItem id="alerts" icon={<Bell size={14} />} label="Події" badge={unreadAlerts} />
            <NavItem id="rules" icon={<Shield size={14} />} label="Правила" />
          </Nav>
        </aside>

        {/* Content */}
        <main className="app-main">
          <header className="page-header">
            <h2 className="page-title">
              {PAGE[tab].title}
            </h2>
            <p className="page-subtitle">
              {PAGE[tab].sub}
            </p>
          </header>

          {/* Reconnect banner */}
          {wsStatus !== "ok" && (
            <div className="reconnect-banner">
              <Spinner
                animation="border" size="sm"
                className="reconnect-spinner"
              />
              <span className="reconnect-text">
                {wsStatus === "reconnecting" ? "Перепідключення до сервера…" : "Втрачено зв'язок з сервером"}
              </span>
            </div>
          )}

          <div className="tab-content">
            {tab === "dashboard" && (
              <Stack gap={4}>
                <Dashboard routerInfo={routerInfo} />
                <Terminal
                  logs={logs} setLogs={setLogs}
                  packets={packets} setPackets={setPackets}
                  sessionOrder={sessionOrder} setSessionOrder={setSessionOrder}
                  logsContainerRef={logsContainerRef}
                />
                <DHCPTable clients={clients} search={search} setSearch={setSearch} />
              </Stack>
            )}
            {tab === "alerts" && (
              <Alerts
                alerts={alerts} alertFilter={alertFilter}
                setAlertFilter={setAlertFilter} setAlerts={setAlerts}
                fmtDate={fmtDate}
                availableDetectors={availableDetectors}
              />
            )}
            {tab === "rules" && (
              <Rules
                rules={rules} showAddRule={showAddRule}
                setShowAddRule={setShowAddRule} newRule={newRule}
                setNewRule={setNewRule} handleAddRule={handleAddRule}
                apiBase={API_BASE}
                availableDetectors={availableDetectors}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/session`, { credentials: "include" })
      .then(r => setIsAuth(r.ok))
      .catch(() => setIsAuth(false))
      .finally(() => setAuthChecking(false));
  }, []);

  if (authChecking) {
    return (
      <div className="auth-loading">
        <Spinner animation="border" className="auth-spinner" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route
          path="/login"
          element={isAuth ? <Navigate to="/dashboard" /> : <Login onLoginSuccess={() => setIsAuth(true)} />}
        />
        <Route
          path="/dashboard"
          element={isAuth ? <MainLayout setIsAuth={setIsAuth} /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}
