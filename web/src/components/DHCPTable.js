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
      borderRadius: "var(--nw-radius)", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
        padding: "0.85rem 1rem",
        borderBottom: "1px solid var(--nw-border)",
        background: "var(--nw-inset)",
      }}>
        <div>
          <h5 style={{ margin: 0, fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.05em" }}>Пристрої мережі</h5>
          <div style={{ marginTop: 2, fontSize: ".65rem", color: "var(--nw-muted)", fontWeight: 600 }}>
            <span style={{ color: "var(--nw-success)" }}>{activeCount} активних</span>
            <span style={{ color: "var(--nw-border)", margin: "0 6px" }}>|</span>
            {clients.length} всього
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", width: 220 }}>
          <Search size={12} style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "var(--nw-muted)", pointerEvents: "none",
          }} />
          <input
            type="text"
            placeholder="Фільтр пристроїв…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: ".4rem .7rem .4rem 2rem",
              background: "var(--nw-bg)",
              border: "1px solid var(--nw-border)",
              borderRadius: "var(--nw-radius)", color: "var(--nw-text)", fontSize: ".75rem",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--nw-border)" }}>
              {["Пристрій", "MAC-адреса", "IP-адреса", "Статус"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: ".6rem 1rem",
                    fontSize: ".6rem", fontWeight: 800,
                    letterSpacing: ".08em", color: "var(--nw-muted)",
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
                  textAlign: "center", padding: "2rem",
                  color: "var(--nw-muted)", fontSize: ".75rem", letterSpacing: "0.05em"
                }}>
                  Дані відсутні
                </td>
              </tr>
            ) : filtered.map((c) => {
              const cfg = STATUS_CFG[c.status] || { color: "var(--nw-muted)", label: c.status };
              return (
                <tr
                  key={c.id || c.mac}
                  style={{ borderBottom: "1px solid var(--nw-border)" }}
                >
                  {/* Device */}
                  <td style={{ padding: ".6rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Monitor size={12} style={{ color: "var(--nw-accent)", flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: ".75rem" }}>
                        {c.hostname || "UNKNOWN"}
                      </span>
                    </div>
                  </td>

                  {/* MAC */}
                  <td style={{ padding: ".6rem 1rem" }}>
                    <span className="font-monospace" style={{ fontSize: ".7rem", color: "var(--nw-muted)" }}>
                      {c.mac}
                    </span>
                  </td>

                  {/* IP */}
                  <td style={{ padding: ".6rem 1rem" }}>
                    <span className="font-monospace" style={{
                      fontSize: ".75rem", fontWeight: 700, color: "var(--nw-accent)",
                    }}>
                      {c.ip}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: ".6rem 1rem", textAlign: "right" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: ".6rem", fontWeight: 800,
                      letterSpacing: ".05em", padding: "2px 8px",
                      color: cfg.color,
                      border: `1px solid ${cfg.color}40`,
                      background: `${cfg.color}08`,
                      borderRadius: "var(--nw-radius)",
                    }}>
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
