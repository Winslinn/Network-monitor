import { Row, Col, Stack } from "react-bootstrap";
import { Plus, X, Save, ToggleLeft, ToggleRight } from "lucide-react";

const SEVERITY = {
  critical: { color: "var(--nw-danger)", label: "Критичний" },
  high: { color: "var(--nw-danger)", label: "Високий" },
  medium: { color: "var(--nw-warning)", label: "Середній" },
  low: { color: "var(--nw-info)", label: "Низький" },
};

function FieldLabel({ children }) {
  return (
    <div className="field-label">
      {children}
    </div>
  );
}

function NwInput({ as, rows, ...props }) {
  const Tag = as || "input";
  return (
    <Tag
      rows={rows}
      className={`nw-input ${Tag === "textarea" ? "nw-textarea" : ""}`}
      {...props}
    />
  );
}

function NwSelect({ children, ...props }) {
  return (
    <select
      className="nw-select"
      {...props}
    >
      {children}
    </select>
  );
}

export default function Rules({ rules, showAddRule, setShowAddRule, newRule, setNewRule, handleAddRule, apiBase, availableDetectors }) {
  const handleDelete = async (rule) => {
    if (!window.confirm(`Видалити правило «${rule.name}»?`)) return;
    await fetch(`${apiBase}/api/rules/${rule.id}`, { method: "DELETE", credentials: "include" });
  };

  const handleToggle = async (rule) => {
    await fetch(`${apiBase}/api/rules/${rule.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: !rule.is_enabled }),
    });
  };

  return (
    <div className="nw-panel">
      {/* Header */}
      <div className="nw-panel-header">
        <div>
          <h5 className="panel-title">Правила виявлення</h5>
          <p className="panel-subtitle">
            {rules.length} активних конфігурацій
          </p>
        </div>
        {!showAddRule && (
          <button
            onClick={() => setShowAddRule(true)}
            className="btn btn-primary compact-button add-rule-button"
          >
            <Plus size={14} className="button-icon" />
            Додати
          </button>
        )}
      </div>

      <div className="nw-panel-body">
        {/* Add rule form */}
        {showAddRule && (
          <div className="rule-form-panel">
            <div className="rule-form-title">
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
                    <optgroup label="Доступні модулі">
                      {Object.entries(availableDetectors).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Власні правила">
                      <option value="pattern">Патерн</option>
                    </optgroup>
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
                  className="font-monospace"
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
              <div className="form-actions">
                <button
                  onClick={handleAddRule}
                  disabled={!newRule.name.trim()}
                  className="btn btn-primary compact-button save-button"
                >
                  <Save size={14} className="button-icon" />
                  Зберегти
                </button>
                <button
                  onClick={() => {
                    setShowAddRule(false);
                    setNewRule({ name: "", type: "custom", severity: "medium", description: "", pattern: "" });
                  }}
                  className="btn btn-outline-secondary compact-button"
                >
                  Скасувати
                </button>
              </div>
            </Stack>
          </div>
        )}

        {/* Rules list */}
        {rules.length === 0 ? (
          <div className="empty-state empty-rules-state">
            Список правил порожній
          </div>
        ) : (
          <div className="rules-list">
            {rules.map((rule, idx) => {
              const sev = SEVERITY[rule.severity?.toLowerCase()];
              return (
                <div
                  key={rule.id}
                  className={`rule-row ${rule.is_enabled ? "enabled" : "disabled"} ${idx < rules.length - 1 ? "has-divider" : ""}`}
                >
                  {/* Enable toggle */}
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`rule-toggle ${rule.is_enabled ? "enabled" : "disabled"}`}
                  >
                    {rule.is_enabled
                      ? <ToggleRight size={20} />
                      : <ToggleLeft size={20} />
                    }
                  </button>

                  {/* Info */}
                  <div className="rule-info">
                    <div className="rule-name">
                      {rule.name}
                    </div>
                    <div className="font-monospace rule-meta">
                      {availableDetectors[rule.type] || rule.type} | ID: {String(rule.id).slice(0, 8)}
                    </div>
                  </div>

                  {/* Severity badge */}
                  <span className={`rule-severity severity-${rule.severity?.toLowerCase()}`}>
                    {sev?.label || rule.severity}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(rule)}
                    className="delete-button"
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
