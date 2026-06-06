import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import {
  BrowserRouter as Router, Routes, Route, Navigate, useNavigate,
} from "react-router-dom";
import { Navbar, Nav, Row, Col, Badge, Alert, Button, Spinner, Stack } from "react-bootstrap";
import { Shield, LayoutDashboard, Bell, LogOut } from "lucide-react";

import "./App.css";
import Toasts    from "./components/Toasts";
import Alerts    from "./components/Alerts";
import DHCPTable from "./components/DHCPTable";
import Dashboard from "./components/Dashboard";
import Rules     from "./components/Rules";
import Terminal  from "./components/Terminal";
import Login     from "./components/Login";

const API_BASE      = "https://potyshyi-server:8443";
const WS_URL        = "wss://potyshyi-server:8443/api/ws";
const RECONNECT_MS  = 3001;
const PING_INTERVAL = 20000;

export const TYPE_LABELS = {
  port_scan:     "Сканування портів",
  brute_force:   "Брутфорс",
  syn_flood:     "SYN-флуд",
  icmp_flood:    "ICMP-флуд",
  ddos_flood:    "DDoS-флуд",
  dns_anomaly:   "DNS-аномалія",
  large_packet:  "Великий пакет",
  telnet_access: "Telnet-доступ",
  config_change: "Зміна конфігурації",
  custom:        "Власне правило",
};

export function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("uk-UA") + " " + d.toLocaleTimeString("uk-UA");
  } catch { return iso; }
}

const PAGE = {
  dashboard: { title: "Дашборд",  sub: "Огляд мережі та системи" },
  alerts:    { title: "Події",    sub: "Журнал безпеки та сповіщень" },
  rules:     { title: "Правила",  sub: "Управління правилами виявлення" },
};

const STATUS_LABEL = {
  ok: "ОК", connecting: "ПІДКЛЮЧЕННЯ", reconnecting: "ПЕРЕПІДКЛЮЧЕННЯ",
};

// ── Main layout (authenticated) ───────────────────────────────────────────
function MainLayout({ setIsAuth }) {
  const navigate = useNavigate();
  const [tab, setTab]           = useState("dashboard");
  const [wsStatus, setWsStatus] = useState("connecting");
  const wsRef    = useRef(null);
  const pingTimer = useRef(null);

  const [routerInfo, setRouterInfo] = useState({
    hostname: "MikroTik CHR", ip: "—", mac: "—", dns: "—",
    wanStatus: "—", cpuUsage: 0, ramUsage: 0,
    downloadSpeed: "—", uploadSpeed: "—", uptime: null,
  });

  const [clients, setClients]           = useState([]);
  const [search, setSearch]             = useState("");
  const [alerts, setAlerts]             = useState([]);
  const [alertFilter, setAlertFilter]   = useState("all");
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [rules, setRules]               = useState([]);
  const [showAddRule, setShowAddRule]   = useState(false);
  const [newRule, setNewRule]           = useState({
    name: "", type: "custom", severity: "medium", description: "", pattern: "",
  });
  const [logs, setLogs]               = useState([]);
  const [packets, setPackets]         = useState({});
  const packetsRef                    = useRef({});
  const [sessionOrder, setSessionOrder] = useState([]);
  const [toasts, setToasts]           = useState([]);
  const logsContainerRef              = useRef(null);

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
      setClients(msg.dhcp || []);
      setRouterInfo(prev => ({
        ...prev,
        hostname:      r.device_name     || prev.hostname,
        ip:            r.ip_address      || "—",
        mac:           r.mac_address     || "—",
        dns:           Array.isArray(r.dns_server)
                         ? r.dns_server.join(", ")
                         : (r.dns_server || "—"),
        cpuUsage:      r.cpuUsage        ?? prev.cpuUsage,
        ramUsage:      r.ramUsage        ?? prev.ramUsage,
        downloadSpeed: r.downloadSpeed   || prev.downloadSpeed,
        uploadSpeed:   r.uploadSpeed     || prev.uploadSpeed,
        uptime:        r.uptime          || null,
      }));
      if (msg.logs)
        setLogs(msg.logs.map(l => ({
          ...l,
          timestamp: l.timestamp || new Date().toISOString(),
          id: Math.random().toString(36).slice(2),
        })));
    }
    else if (ctx === "stats")  setRouterInfo(prev => ({ ...prev, ...msg }));
    else if (ctx === "log")    setLogs(prev => [...prev.slice(-199), {
      ...msg.data, timestamp: new Date().toISOString(), id: Date.now() + Math.random(),
    }]);
    else if (ctx === "dhcp")   setClients(prev => {
      const exists = prev.find(c => c.id === msg.data.id);
      return exists ? prev.map(c => c.id === msg.data.id ? msg.data : c) : [...prev, msg.data];
    });
    else if (ctx === "flows")  {
      const delta = msg.data || {};
      if (!Object.keys(delta).length) return;
      packetsRef.current = { ...packetsRef.current };
      const newKeys = [];
      Object.entries(delta).forEach(([k, flow]) => {
        const isNew = !packetsRef.current[k];
        packetsRef.current[k] = {
          src: flow.src, dst: flow.dst, protocol: flow.protocol,
          unique_ports: flow.unique_ports, flags: flow.flags,
          count: flow.packet_count,
          uniqueId: packetsRef.current[k]?.uniqueId || Math.random().toString(36).slice(2),
        };
        if (isNew) newKeys.push(k);
      });
      setPackets({ ...packetsRef.current });
      if (newKeys.length) setSessionOrder(prev => [...newKeys, ...prev]);
    }
    else if (ctx === "alert")  {
      setAlerts(prev => [{
        ...msg.data,
        _id: Date.now() + Math.random(),
        _received: Date.now(),
      }, ...prev].slice(0, 200));
      setUnreadAlerts(v => v + 1);
      addToast(
        `${TYPE_LABELS[msg.data.type] || msg.data.type}: ${msg.data.description?.slice(0, 60)}`,
        msg.data.severity,
      );
    }
    else if (ctx === "rules_list") setRules(msg.data || []);
    else if (ctx === "rule_added" && msg.rule) {
      setRules(prev => [...prev, msg.rule]);
      addToast(`Правило додано: ${msg.rule.name}`, "low");
    }
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
      ws.send(JSON.stringify({ action: "get_rules" }));
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
        <Badge bg="danger" pill className="ms-auto" style={{ fontSize: ".58rem" }}>{badge}</Badge>
      )}
    </Nav.Link>
  );

  return (
    <div style={{ background: "var(--nw-bg)", minHeight: "100vh", color: "var(--nw-text)" }}>
      <Toasts toasts={toasts} />

      {/* Top bar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "var(--nw-surface)",
        borderBottom: "1px solid var(--nw-border)",
        display: "flex", alignItems: "center",
        padding: ".65rem 1.25rem", gap: "1rem", height: 57,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: ".95rem" }}>
          <Shield size={19} color="var(--nw-accent)" />
          <span style={{ color: "var(--nw-text)" }}>NetWatch</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {/* WS badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 99,
            fontSize: ".68rem", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
            background: wsStatus === "ok"
              ? "rgba(34,197,94,.12)"
              : wsStatus === "reconnecting"
                ? "rgba(245,158,11,.12)"
                : "rgba(244,63,94,.12)",
            color: wsStatus === "ok"
              ? "var(--nw-success)"
              : wsStatus === "reconnecting"
                ? "var(--nw-warning)"
                : "var(--nw-danger)",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: wsStatus === "ok" ? "var(--nw-success)" : wsStatus === "reconnecting" ? "var(--nw-warning)" : "var(--nw-danger)",
              boxShadow: wsStatus === "ok" ? "0 0 6px var(--nw-success)" : "none",
            }} />
            {STATUS_LABEL[wsStatus]}
          </span>

          {/* Uptime */}
          {routerInfo.uptime && (
            <span className="font-monospace" style={{
              fontSize: ".72rem", color: "var(--nw-muted)",
              background: "var(--nw-inset)", border: "1px solid var(--nw-border)",
              borderRadius: 99, padding: "4px 12px",
            }}>
              {routerInfo.uptime}
            </span>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 6,
              color: "var(--nw-muted)", borderRadius: 8, lineHeight: 0,
              transition: "color .15s",
            }}
            title="Вийти"
            onMouseEnter={e => e.currentTarget.style.color = "var(--nw-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--nw-muted)"}
          >
            <LogOut size={17} />
          </button>
        </div>
      </nav>

      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <aside
          className="flex-column"
          style={{
            width: 220, flexShrink: 0,
            background: "var(--nw-surface)",
            borderRight: "1px solid var(--nw-border)",
            position: "sticky", top: 57,
            height: "calc(100vh - 57px)",
            padding: "1rem .75rem",
            overflowY: "auto",
            display: "flex",
          }}
        >
          <Nav variant="pills" className="flex-column gap-1">
            <NavItem id="dashboard" icon={<LayoutDashboard size={16} />} label="Дашборд" />
            <NavItem id="alerts"    icon={<Bell size={16} />}            label="Події" badge={unreadAlerts} />
            <NavItem id="rules"     icon={<Shield size={16} />}          label="Правила" />
          </Nav>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: "1.75rem", minWidth: 0, paddingBottom: "5rem" }}>
          <header style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-.02em" }}>
              {PAGE[tab].title}
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: ".8rem", color: "var(--nw-muted)" }}>
              {PAGE[tab].sub}
            </p>
          </header>

          {/* Reconnect banner */}
          {wsStatus !== "ok" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: ".65rem 1rem", borderRadius: 10, marginBottom: "1.25rem",
              background: wsStatus === "reconnecting" ? "rgba(245,158,11,.07)" : "rgba(244,63,94,.07)",
              border: `1px solid ${wsStatus === "reconnecting" ? "rgba(245,158,11,.25)" : "rgba(244,63,94,.25)"}`,
            }}>
              <Spinner
                animation="border" size="sm"
                style={{
                  width: 14, height: 14, borderWidth: 2,
                  color: wsStatus === "reconnecting" ? "var(--nw-warning)" : "var(--nw-danger)",
                }}
              />
              <span style={{
                fontSize: ".82rem", fontWeight: 600,
                color: wsStatus === "reconnecting" ? "var(--nw-warning)" : "var(--nw-danger)",
              }}>
                {wsStatus === "reconnecting" ? "Перепідключення до сервера…" : "Підключення…"}
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
              />
            )}
            {tab === "rules" && (
              <Rules
                rules={rules} showAddRule={showAddRule}
                setShowAddRule={setShowAddRule} newRule={newRule}
                setNewRule={setNewRule} handleAddRule={handleAddRule}
                wsSend={p => wsSend(p)}
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
  const [isAuth, setIsAuth]           = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/me`, { credentials: "include" })
      .then(r => setIsAuth(r.ok))
      .catch(() => setIsAuth(false))
      .finally(() => setAuthChecking(false));
  }, []);

  if (authChecking) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--nw-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Spinner animation="border" style={{ color: "var(--nw-accent)", width: 32, height: 32, borderWidth: 3 }} />
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
