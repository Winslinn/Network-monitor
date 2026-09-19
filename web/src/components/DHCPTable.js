import { Search, Monitor } from "lucide-react";

const STATUS_LABEL = {
  reachable: "Активний", stale: "Неактивний", failed: "Недоступний",
  incomplete: "Невизначений", permanent: "Призначений", probe: "Перевіряється",
};

export default function DHCPTable({ clients, search, setSearch }) {
  const activeCount = clients.filter(c => c.status === "reachable").length;
  const filtered = clients.filter(c =>
    !search ||
    c.ip?.includes(search) ||
    c.hostname?.toLowerCase().includes(search.toLowerCase()) ||
    c.mac?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="nw-panel nw-panel-clip">
      {/* Header */}
      <div className="nw-panel-header">
        <div>
          <h5 className="panel-title">Пристрої мережі</h5>
          <div className="panel-subtitle">
            <span className="success-text">{activeCount} активних</span>
            <span className="separator">|</span>
            {clients.length} всього
          </div>
        </div>

        {/* Search */}
        <div className="table-search">
          <Search size={12} className="search-icon" />
          <input
            type="text"
            placeholder="Фільтр пристроїв…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="table-search-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="nw-table">
          <thead>
            <tr className="nw-table-header">
              {["Пристрій", "MAC-адреса", "IP-адреса", "Статус"].map((h, i) => (
                <th
                  key={h}
                  className={i === 3 ? "text-end" : ""}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-table-state">
                  Дані відсутні
                </td>
              </tr>
            ) : filtered.map((c) => {
              return (
                <tr
                  key={c.id || c.mac}
                  className="nw-table-row"
                >
                  {/* Device */}
                  <td className="nw-table-cell">
                    <div className="device-name">
                      <Monitor size={12} className="device-icon" />
                      <span>
                        {c.hostname || "UNKNOWN"}
                      </span>
                    </div>
                  </td>

                  {/* MAC */}
                  <td className="nw-table-cell">
                    <span className="font-monospace mac-address">
                      {c.mac}
                    </span>
                  </td>

                  {/* IP */}
                  <td className="nw-table-cell">
                    <span className="font-monospace ip-address">
                      {c.ip}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="nw-table-cell text-end">
                    <span className={`device-status status-${c.status}`}>
                      {STATUS_LABEL[c.status] || c.label || c.status}
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
