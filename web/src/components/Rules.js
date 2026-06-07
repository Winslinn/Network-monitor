import { Row, Col, Stack, Form } from "react-bootstrap";
import { Plus, X, Save, ToggleLeft, ToggleRight } from "lucide-react";

const RULE_TYPES = {
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

const SEVERITY = {
  critical: { color: "var(--nw-danger)",   label: "Критичний" },
  high:     { color: "var(--nw-danger)",   label: "Високий" },
  medium:   { color: "var(--nw-warning)",  label: "Середній" },
  low:      { color: "var(--nw-info)",     label: "Низький" },
};

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: ".65rem", fontWeight: 800,
      letterSpacing: ".08em", color: "var(--nw-muted)", marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function NwInput({ as, rows, ...props }) {
  const Tag = as || "input";
  return (
    <Tag
      rows={rows}
      style={{
        width: "100%", padding: ".5rem .75rem",
        background: "var(--nw-bg)", border: "1px solid var(--nw-border)",
        borderRadius: "var(--nw-radius)", color: "var(--nw-text)", fontSize: ".8rem",
        outline: "none", resize: "vertical", boxSizing: "border-box",
        fontFamily: Tag === "textarea" ? "inherit" : undefined,
      }}
      {...props}
    />
  );
}

function NwSelect({ children, ...props }) {
  return (
    <select
      style={{
        width: "100%", padding: ".5rem .75rem",
        background: "var(--nw-bg)", border: "1px solid var(--nw-border)",
        borderRadius: "var(--nw-radius)", color: "var(--nw-text)", fontSize: ".8rem",
        outline: "none", boxSizing: "border-box", cursor: "pointer",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234e6580' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export default function Rules({ rules, showAddRule, setShowAddRule, newRule, setNewRule, handleAddRule, wsSend }) {
  const handleDelete = (rule) => {
    if (!window.confirm(`Видалити правило «${rule.name}»?`)) return;
    wsSend({ action: "delete_rule", rule_id: rule.id });
  };

  const handleToggle = (rule) => {
    wsSend({ action: "toggle_rule", rule_id: rule.id, enabled: !rule.is_enabled });
  };

  return (
    <div style={{
      background: "var(--nw-surface)",
      border: "1px solid var(--nw-border)",
      borderRadius: "var(--nw-radius)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.85rem 1rem",
        borderBottom: "1px solid var(--nw-border)",
        background: "var(--nw-inset)",
      }}>
        <div>
          <h5 style={{ margin: 0, fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.05em" }}>Правила виявлення</h5>
          <p style={{ margin: "2px 0 0", fontSize: ".65rem", color: "var(--nw-muted)", fontWeight: 600 }}>
            {rules.length} активних конфігурацій
          </p>
        </div>
        {!showAddRule && (
          <button
            onClick={() => setShowAddRule(true)}
            className="btn btn-primary"
            style={{ padding: "4px 12px" }}
          >
            <Plus size={14} style={{ marginRight: 6 }} />
            Додати
          </button>
        )}
      </div>

      <div style={{ padding: "1rem" }}>
        {/* Add rule form */}
        {showAddRule && (
          <div style={{
            background: "var(--nw-inset)", border: "1px solid var(--nw-border)",
            borderRadius: "var(--nw-radius)", padding: "1rem", marginBottom: "1rem",
          }}>
            <div style={{
              fontSize: ".6rem", fontWeight: 900,
              letterSpacing: ".1em", color: "var(--nw-muted)", marginBottom: "1rem",
              borderBottom: "1px solid var(--nw-border)", paddingBottom: "0.5rem"
            }}>
              Створення нового правила
            </div>

            <Stack gap={3}>
              {/* Name */}
              <div>
                <FieldLabel>Назва правила</FieldLabel>
                <NwInput
                  type="text"
                  placeholder="Вкажіть назву…"
                  value={newRule.name}
                  onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                />
              </div>

              {/* Type + Severity */}
              <Row className="g-2">
                <Col sm={6}>
                  <FieldLabel>Тип загрози</FieldLabel>
                  <NwSelect
                    value={newRule.type}
                    onChange={e => setNewRule({ ...newRule, type: e.target.value })}
                  >
                    {Object.entries(RULE_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </NwSelect>
                </Col>
                <Col sm={6}>
                  <FieldLabel>Рівень ризику</FieldLabel>
                  <NwSelect
                    value={newRule.severity}
                    onChange={e => setNewRule({ ...newRule, severity: e.target.value })}
                  >
                    {Object.entries(SEVERITY).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </NwSelect>
                </Col>
              </Row>

              {/* Pattern */}
              <div>
                <FieldLabel>Патерн / Сигнатура</FieldLabel>
                <NwInput
                  type="text"
                  placeholder="IP, маска або регулярний вираз…"
                  value={newRule.pattern}
                  onChange={e => setNewRule({ ...newRule, pattern: e.target.value })}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                />
              </div>

              {/* Description */}
              <div>
                <FieldLabel>Додатковий опис</FieldLabel>
                <NwInput
                  as="textarea"
                  rows={2}
                  placeholder="Умови спрацювання…"
                  value={newRule.description}
                  onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button
                  onClick={handleAddRule}
                  disabled={!newRule.name.trim()}
                  className="btn btn-primary"
                  style={{ padding: "4px 16px" }}
                >
                  <Save size={14} style={{ marginRight: 6 }} />
                  Зберегти
                </button>
                <button
                  onClick={() => {
                    setShowAddRule(false);
                    setNewRule({ name: "", type: "custom", severity: "medium", description: "", pattern: "" });
                  }}
                  className="btn btn-outline-secondary"
                  style={{ padding: "4px 12px" }}
                >
                  Скасувати
                </button>
              </div>
            </Stack>
          </div>
        )}

        {/* Rules list */}
        {rules.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "2rem 1rem",
            color: "var(--nw-muted)", border: "1px dashed var(--nw-border)",
            fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em"
          }}>
            Список правил порожній
          </div>
        ) : (
          <div style={{
            border: "1px solid var(--nw-border)",
            borderRadius: "var(--nw-radius)", overflow: "hidden",
          }}>
            {rules.map((rule, idx) => {
              const sev = SEVERITY[rule.severity?.toLowerCase()];
              return (
                <div
                  key={rule.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: ".65rem 1rem",
                    borderBottom: idx < rules.length - 1 ? "1px solid var(--nw-border)" : "none",
                    background: rule.is_enabled ? "transparent" : "rgba(255,255,255,0.02)",
                  }}
                >
                  {/* Enable toggle */}
                  <button
                    onClick={() => handleToggle(rule)}
                    style={{
                      background: "none", border: "none", padding: 0,
                      cursor: "pointer", flexShrink: 0, lineHeight: 0,
                      color: rule.is_enabled ? "var(--nw-success)" : "var(--nw-muted)",
                    }}
                  >
                    {rule.is_enabled
                      ? <ToggleRight size={20} />
                      : <ToggleLeft size={20} />
                    }
                  </button>

                  {/* Info */}
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".8rem", fontWeight: 700, color: rule.is_enabled ? "var(--nw-text)" : "var(--nw-muted)" }}>
                      {rule.name}
                    </div>
                    <div className="font-monospace" style={{ fontSize: ".65rem", color: "var(--nw-muted)", marginTop: 2 }}>
                      {RULE_TYPES[rule.type] || rule.type} | ID: {rule.id?.slice(0, 8)}
                    </div>
                  </div>

                  {/* Severity badge */}
                  <span style={{
                    fontSize: ".6rem", fontWeight: 800,
                    letterSpacing: ".05em", padding: "2px 8px",
                    border: `1px solid ${sev?.color || "var(--nw-muted)"}40`,
                    color: sev?.color || "var(--nw-muted)",
                    background: `${sev?.color || "var(--nw-muted)"}08`,
                    whiteSpace: "nowrap",
                    borderRadius: "var(--nw-radius)",
                  }}>
                    {sev?.label || rule.severity}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(rule)}
                    style={{
                      background: "none", border: "none", padding: 4,
                      cursor: "pointer", flexShrink: 0, lineHeight: 0,
                      color: "var(--nw-muted)",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--nw-danger)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--nw-muted)"}
                  >
                    <X size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
