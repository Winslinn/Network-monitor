import { Search, Monitor } from "lucide-react";

const STATUS_CFG = {
  active:  { color: "var(--nw-success)", label: "Активний" },
  expired: { color: "var(--nw-danger)",  label: "Закінчився" },
  waiting: { color: "var(--nw-warning)", label: "Очікування" },
};

export default function DHCPTable({ clients, search, setSearch }) {
  const activeCount = clients.filter(c => c.status === "active").length;
  const filtered = clients.filter(c =>
    !search ||
    c.ip?.includes(search) ||
    c.hostname?.toLowerCase().includes(search.toLowerCase()) ||
    c.mac?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      background: "var(--nw-surface)",
      border: "1px solid var(--nw-border)",
      borderRadius: 14, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
        padding: "1.1rem 1.5rem",
        borderBottom: "1px solid var(--nw-border)",
      }}>
        <div>
          <h5 style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>Пристрої мережі</h5>
          <div style={{ marginTop: 3, fontSize: ".78rem", color: "var(--nw-muted)" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              color: "var(--nw-success)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--nw-success)",
                boxShadow: "0 0 6px var(--nw-success)",
                display: "inline-block",
              }} />
              {activeCount} активних
            </span>
            <span style={{ color: "var(--nw-border)", margin: "0 6px" }}>·</span>
            {clients.length} всього
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", width: 260 }}>
          <Search size={14} style={{
            position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
            color: "var(--nw-muted)", pointerEvents: "none",
          }} />
          <input
            type="text"
            placeholder="IP, назва або MAC…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: ".55rem .9rem .55rem 2.2rem",
              background: "var(--nw-inset)",
              border: "1px solid var(--nw-border)",
              borderRadius: 8, color: "var(--nw-text)", fontSize: ".82rem",
              outline: "none", boxSizing: "border-box",
              transition: "border-color .15s",
            }}
            onFocus={e => e.target.style.borderColor = "var(--nw-accent)"}
            onBlur={e => e.target.style.borderColor = "var(--nw-border)"}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--nw-border)" }}>
              {["Пристрій", "MAC-адреса", "IP-адреса", "Статус"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: ".7rem 1.25rem",
                    fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: ".07em", color: "var(--nw-muted)",
                    textAlign: i === 3 ? "right" : "left",
                    background: "transparent", border: "none",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{
                  textAlign: "center", padding: "3rem",
                  color: "var(--nw-muted)", fontSize: ".85rem",
                }}>
                  Пристроїв не знайдено
                </td>
              </tr>
            ) : filtered.map((c) => {
              const cfg = STATUS_CFG[c.status] || { color: "var(--nw-muted)", label: c.status };
              return (
                <tr
                  key={c.id || c.mac}
                  style={{ borderBottom: "1px solid var(--nw-border)", transition: "background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--nw-inset)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Device */}
                  <td style={{ padding: ".85rem 1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <Monitor size={14} style={{ color: "var(--nw-accent)", flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: ".85rem" }}>
                        {c.hostname || "Невідомий"}
                      </span>
                    </div>
                  </td>

                  {/* MAC */}
                  <td style={{ padding: ".85rem 1.25rem" }}>
                    <span className="font-monospace" style={{ fontSize: ".78rem", color: "var(--nw-muted)" }}>
                      {c.mac}
                    </span>
                  </td>

                  {/* IP */}
                  <td style={{ padding: ".85rem 1.25rem" }}>
                    <span className="font-monospace" style={{
                      fontSize: ".82rem", fontWeight: 700, color: "var(--nw-accent)",
                    }}>
                      {c.ip}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: ".85rem 1.25rem", textAlign: "right" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: ".05em", padding: "3px 10px", borderRadius: 99,
                      color: cfg.color,
                      background: `${cfg.color}12`,
                      border: `1px solid ${cfg.color}30`,
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: cfg.color,
                        boxShadow: c.status === "active" ? `0 0 5px ${cfg.color}` : "none",
                      }} />
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
