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
      fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase",
      letterSpacing: ".05em", color: "var(--nw-muted)", marginBottom: 6,
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
        width: "100%", padding: ".6rem .9rem",
        background: "var(--nw-bg)", border: "1px solid var(--nw-border)",
        borderRadius: 8, color: "var(--nw-text)", fontSize: ".85rem",
        outline: "none", resize: "vertical", boxSizing: "border-box",
        fontFamily: Tag === "textarea" ? "inherit" : undefined,
        transition: "border-color .15s, box-shadow .15s",
      }}
      onFocus={e => {
        e.target.style.borderColor = "var(--nw-accent)";
        e.target.style.boxShadow = "0 0 0 3px var(--nw-accent-bg)";
      }}
      onBlur={e => {
        e.target.style.borderColor = "var(--nw-border)";
        e.target.style.boxShadow = "none";
      }}
      {...props}
    />
  );
}

function NwSelect({ children, ...props }) {
  return (
    <select
      style={{
        width: "100%", padding: ".6rem .9rem",
        background: "var(--nw-bg)", border: "1px solid var(--nw-border)",
        borderRadius: 8, color: "var(--nw-text)", fontSize: ".85rem",
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
      borderRadius: 14,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.25rem 1.5rem",
        borderBottom: "1px solid var(--nw-border)",
      }}>
        <div>
          <h5 style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>Правила виявлення</h5>
          <p style={{ margin: "2px 0 0", fontSize: ".78rem", color: "var(--nw-muted)" }}>
            {rules.length} {rules.length === 1 ? "правило" : rules.length < 5 ? "правила" : "правил"} налаштовано
          </p>
        </div>
        {!showAddRule && (
          <button
            onClick={() => setShowAddRule(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 9, cursor: "pointer",
              fontSize: ".82rem", fontWeight: 700,
              background: "var(--nw-accent)", border: "none", color: "#000",
              transition: "background .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#0aaa8e"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--nw-accent)"}
          >
            <Plus size={15} />
            Нове правило
          </button>
        )}
      </div>

      <div style={{ padding: "1.25rem 1.5rem" }}>
        {/* Add rule form */}
        {showAddRule && (
          <div style={{
            background: "var(--nw-inset)", border: "1px solid var(--nw-border)",
            borderRadius: 12, padding: "1.25rem", marginBottom: "1.25rem",
          }}>
            <div style={{
              fontSize: ".68rem", fontWeight: 800, textTransform: "uppercase",
              letterSpacing: ".08em", color: "var(--nw-muted)", marginBottom: "1.25rem",
            }}>
              Нове правило виявлення
            </div>

            <Stack gap={3}>
              {/* Name */}
              <div>
                <FieldLabel>Назва правила</FieldLabel>
                <NwInput
                  type="text"
                  placeholder="Наприклад: Сканування портів із внутрішньої мережі"
                  value={newRule.name}
                  onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                />
              </div>

              {/* Type + Severity */}
              <Row className="g-3">
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
                  <FieldLabel>Критичність</FieldLabel>
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
                <FieldLabel>Патерн виявлення</FieldLabel>
                <NwInput
                  type="text"
                  placeholder="IP-адреса, маска мережі або регулярний вираз"
                  value={newRule.pattern}
                  onChange={e => setNewRule({ ...newRule, pattern: e.target.value })}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                />
              </div>

              {/* Description */}
              <div>
                <FieldLabel>Опис (необов'язково)</FieldLabel>
                <NwInput
                  as="textarea"
                  rows={2}
                  placeholder="Пояснення умов спрацювання правила"
                  value={newRule.description}
                  onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button
                  onClick={handleAddRule}
                  disabled={!newRule.name.trim()}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "7px 22px", borderRadius: 8, cursor: "pointer",
                    fontSize: ".82rem", fontWeight: 700,
                    background: newRule.name.trim() ? "var(--nw-accent)" : "var(--nw-border)",
                    border: "none", color: newRule.name.trim() ? "#000" : "var(--nw-muted)",
                    transition: "all .15s",
                  }}
                >
                  <Save size={14} />
                  Зберегти
                </button>
                <button
                  onClick={() => {
                    setShowAddRule(false);
                    setNewRule({ name: "", type: "custom", severity: "medium", description: "", pattern: "" });
                  }}
                  style={{
                    padding: "7px 16px", borderRadius: 8, cursor: "pointer",
                    fontSize: ".82rem", fontWeight: 600, border: "none",
                    background: "transparent", color: "var(--nw-muted)",
                  }}
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
            textAlign: "center", padding: "3rem 1rem",
            color: "var(--nw-muted)", borderRadius: 10,
            border: "1px dashed var(--nw-border)",
          }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>🛡️</div>
            <div style={{ fontSize: ".85rem", fontWeight: 500 }}>Правила ще не налаштовані</div>
            <div style={{ fontSize: ".78rem", marginTop: 4, opacity: .7 }}>
              Натисніть «Нове правило» щоб додати перше
            </div>
          </div>
        ) : (
          <div style={{
            border: "1px solid var(--nw-border)",
            borderRadius: 10, overflow: "hidden",
          }}>
            {rules.map((rule, idx) => {
              const sev = SEVERITY[rule.severity?.toLowerCase()];
              return (
                <div
                  key={rule.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: ".85rem 1.1rem",
                    borderBottom: idx < rules.length - 1 ? "1px solid var(--nw-border)" : "none",
                    transition: "background .12s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--nw-inset)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Enable toggle */}
                  <button
                    onClick={() => handleToggle(rule)}
                    style={{
                      background: "none", border: "none", padding: 0,
                      cursor: "pointer", flexShrink: 0, lineHeight: 0,
                      color: rule.is_enabled ? "var(--nw-success)" : "var(--nw-muted)",
                      transition: "color .15s",
                    }}
                    title={rule.is_enabled ? "Вимкнути" : "Увімкнути"}
                  >
                    {rule.is_enabled
                      ? <ToggleRight size={22} />
                      : <ToggleLeft size={22} />
                    }
                  </button>

                  {/* Info */}
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".875rem", fontWeight: 700, color: "var(--nw-text)" }}>
                      {rule.name}
                    </div>
                    <div className="font-monospace" style={{ fontSize: ".65rem", color: "var(--nw-muted)", marginTop: 2 }}>
                      {RULE_TYPES[rule.type] || rule.type} · ID: {rule.id?.slice(0, 8)}…
                    </div>
                  </div>

                  {/* Severity badge */}
                  <span style={{
                    fontSize: ".62rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: ".05em", padding: "3px 10px", borderRadius: 99,
                    border: `1px solid ${sev?.color || "var(--nw-muted)"}40`,
                    color: sev?.color || "var(--nw-muted)",
                    background: `${sev?.color || "var(--nw-muted)"}10`,
                    whiteSpace: "nowrap",
                  }}>
                    {sev?.label || rule.severity}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(rule)}
                    style={{
                      background: "none", border: "none", padding: 4,
                      cursor: "pointer", flexShrink: 0, lineHeight: 0,
                      color: "var(--nw-muted)", borderRadius: 6,
                      transition: "color .15s, background .15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = "var(--nw-danger)";
                      e.currentTarget.style.background = "rgba(244,63,94,.08)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = "var(--nw-muted)";
                      e.currentTarget.style.background = "none";
                    }}
                    title="Видалити"
                  >
                    <X size={17} />
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
