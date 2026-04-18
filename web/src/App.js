import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";

import "./App.css";
import Toasts from "./components/Toasts";
import Alerts from "./components/Alerts";
import DHCPTable from "./components/DHCPTable";
import Dashboard from "./components/Dashboard";
import Rules from "./components/Rules";
import Terminal from "./components/Terminal";

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

export default function NetworkMonitor() {
  // ── STATE ──
  const [tab, setTab] = useState("dashboard");
  const [now, setNow] = useState(new Date());
  const [wsStatus, setWsStatus] = useState("connecting");
  const wsRef = useRef(null);
  const pingTimer = useRef(null);

  const [routerInfo, setRouterInfo] = useState({
    hostname: "MikroTik CHR", ip: "-", mac: "-", dns: "-",
    wanStatus: "—", cpuUsage: 0, ramUsage: 0,
    downloadSpeed: "-", uploadSpeed: "-",
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
  const [sessionOrder, setSessionOrder] = useState([]);
  const [toasts, setToasts] = useState([]);
  
  const logsContainerRef = useRef(null);

  // ── PROPS ──
  const alertProps = { alerts, alertFilter, setAlertFilter, setAlerts, fmtDate };
  const rulesProps = { rules, showAddRule, setShowAddRule, newRule, setNewRule, wsSend: (p) => wsSend(p) };

  // ── LOGIC & EFFECTS ──
  const addToast = useCallback((message, severity = "medium") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, severity }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4200);
  }, []);

  const wsSend = (p) => wsRef.current?.readyState === 1 && wsRef.current.send(JSON.stringify(p));

  const handleMessage = useCallback((msg) => {
    const ctx = msg.context;
    if (ctx === "initial") {
      const r = msg.router || {};
      setClients(msg.dhcp || []);
      setRouterInfo(prev => ({
        ...prev,
        hostname: r.hostname || "MikroTik",
        ip: r.ip_address || "-",
        mac: r.mac_address || "-",
        dns: Array.isArray(r.dns_server) ? r.dns_server.join(", ") : (r.dns_server || "-"),
        wanStatus: r.wanStatus || "Connected",
        cpuUsage: r.cpuUsage ?? prev.cpuUsage,
        ramUsage: r.ramUsage ?? prev.ramUsage,
        downloadSpeed: r.downloadSpeed || prev.downloadSpeed,
        uploadSpeed: r.uploadSpeed || prev.uploadSpeed,
      }));
      if (msg.logs) setLogs(msg.logs.map(log => ({ ...log, timestamp: log.timestamp || new Date().toISOString() })));
    }
    else if (ctx === "stats") setRouterInfo(prev => ({ ...prev, ...msg }));
    else if (ctx === "log") setLogs(prev => [...prev.slice(-199), { ...msg.data, timestamp: new Date().toISOString(), id: Date.now() + Math.random() }]);
    else if (ctx === "dhcp") setClients(msg.data || []);
    else if (ctx === "packet") {
      const incoming = msg.data || [];
      setPackets(prev => {
        const newMap = { ...prev };
        const newKeys = [];
        incoming.forEach(pkt => {
          const sessionKey = `${pkt.src_address}_${pkt.dst_address}_${pkt.dst_port}`;
          if (newMap[sessionKey]) {
            newMap[sessionKey] = {
              ...newMap[sessionKey],
              count: (newMap[sessionKey].count || 0) + 1,
              last_seen: new Date().toISOString(),
              payload: (pkt.payload && pkt.payload.trim() !== "") ? pkt.payload : newMap[sessionKey].payload
            };
          } else {
            newMap[sessionKey] = { ...pkt, count: 1, last_seen: new Date().toISOString(), uniqueId: Math.random().toString(36).substr(2, 9) };
            newKeys.push(sessionKey);
          }
        });
        if (newKeys.length > 0) setSessionOrder(prevOrder => [...prevOrder, ...newKeys]);
        return newMap;
      });
    }
    else if (ctx === "alert") {
      setAlerts(prev => [{ ...msg.data, _received: Date.now() }, ...prev].slice(0, 200));
      setUnreadAlerts(v => v + 1);
      addToast(`${TYPE_LABELS[msg.data.type] || msg.data.type}: ${msg.data.description?.slice(0, 60)}`, msg.data.severity);
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
      setWsStatus("open");
      pingTimer.current = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ action: "ping" })), PING_INTERVAL);
      ws.send(JSON.stringify({ action: "get_rules" }));
    };
    ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
    ws.onclose = () => {
      setWsStatus("reconnecting");
      clearInterval(pingTimer.current);
      setTimeout(connect, RECONNECT_MS);
    };
  }, [handleMessage]);

  useEffect(() => {
    connect();
    return () => { clearInterval(pingTimer.current); if (wsRef.current) wsRef.current.close(); };
  }, [connect]);

  useEffect(() => { if (tab === "alerts") setUnreadAlerts(0); }, [tab]);

  useLayoutEffect(() => {
    if (logsContainerRef.current) logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const PAGE_TITLES = {
    dashboard: { title: "Дашборд", sub: "Огляд мережі та системи" },
    alerts:    { title: "Події",    sub: "Журнал безпеки та сповіщень" },
    rules:     { title: "Правила", sub: "Управління правилами виявлення" },
  };

  return (
    <>
      <Toasts toasts={toasts} />
      
      <div className="app-shell">
        {/* ── TOP BAR ── */}
        <header className="topbar">
          <div className="topbar-logo">📡</div>
          <div>
            <span className="topbar-brand">NetWatch</span>
            <span className="topbar-version">v1.2</span>
          </div>
          <div className="topbar-spacer" />
          <div className="topbar-status">
            <div className={`pulse-dot ${wsStatus === "open" ? "dot-green" : wsStatus === "reconnecting" ? "dot-yellow" : "dot-red"}`} />
            {wsStatus.toUpperCase()}
          </div>
          <div className="topbar-time">{now.toLocaleTimeString("uk-UA")}</div>
        </header>

        <div className="app-body">
          {/* ── SIDEBAR ── */}
          <nav className="sidebar">
            <span className="sidebar-section-label">Навігація</span>
            <button className={`nav-btn ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>
              <span className="nav-icon">▣</span><span>Дашборд</span>
            </button>
            <button className={`nav-btn ${tab === "alerts" ? "active" : ""}`} onClick={() => setTab("alerts")}>
              <span className="nav-icon">⚡</span><span>Події</span>
              {unreadAlerts > 0 && <span className="nav-badge">{unreadAlerts}</span>}
            </button>
            <button className={`nav-btn ${tab === "rules" ? "active" : ""}`} onClick={() => setTab("rules")}>
              <span className="nav-icon">⚙</span><span>Правила</span>
            </button>
          </nav>

          {/* ── MAIN CONTENT ── */}
          <main className="main-content">
            <div className="page-header">
              <div className="page-title">{PAGE_TITLES[tab].title}</div>
              <div className="page-subtitle">{PAGE_TITLES[tab].sub}</div>
            </div>

            {(wsStatus === "reconnecting" || wsStatus === "connecting") && (
              <div className={`ws-banner ${wsStatus}`}>
                <div className={`pulse-dot ${wsStatus === "reconnecting" ? "dot-yellow" : "dot-red"}`} />
                {wsStatus === "reconnecting" ? "Перепідключення..." : "Підключення..."}
              </div>
            )}

            {/* ── DASHBOARD ── */}
            {tab === "dashboard" && (
              <>
                <Dashboard routerInfo={routerInfo} />
                <Terminal 
                  logs={logs} setLogs={setLogs} 
                  packets={packets} setPackets={setPackets}
                  sessionOrder={sessionOrder} setSessionOrder={setSessionOrder}
                  logsContainerRef={logsContainerRef}
                />
                <DHCPTable clients={clients} search={search} setSearch={setSearch} />
              </>
            )}

            {tab === "alerts" && <Alerts {...alertProps} />}
            {tab === "rules" && <Rules {...rulesProps} />}
          </main>
        </div>
      </div>
    </>
  );
}