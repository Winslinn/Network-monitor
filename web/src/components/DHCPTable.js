export default function DHCPTable({ clients, search, setSearch }) {
  const activeCount = clients.filter(c => c.status === "active").length;
  return (
    <div className="card">
      <div className="dhcp-header-row">
        <div>
          <div className="card-title">DHCP клієнти</div>
          <div className="dhcp-count"><span>{activeCount}</span> активних</div>
        </div>
        <input className="search-input" placeholder="Пошук..." onChange={e => setSearch(e.target.value)} />
      </div>
      <table className="dhcp-table">
        <thead>
          <tr><th>Хост</th><th>MAC</th><th>IP</th><th>Статус</th></tr>
        </thead>
        <tbody>
          {clients.filter(c => !search || c.ip.includes(search)).map((c, i) => (
            <tr key={i} className="client-row">
              <td className="client-hostname">{c.hostname}</td>
              <td>{c.mac}</td>
              <td style={{ color: "#60a5fa" }}>{c.ip}</td>
              <td><span className={`status-tag ${c.status === "active" ? "tag-active" : "tag-idle"}`}>{c.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
