import { useState } from "react";
import { Row, Col, Stack } from "react-bootstrap";
import { Plus, X, Save, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";

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

function PatternForm({ config, onConfigChange }) {
  return (
    <Row className="g-2">
      <Col sm={12}>
        <FieldLabel>Патерн</FieldLabel>
        <NwInput
          type="text"
          placeholder="IP, маска або регулярний вираз…"
          value={config?.pattern || ""}
          onChange={e => onConfigChange({ ...config, pattern: e.target.value })}
        />
      </Col>
    </Row>
  );
}

function DetectorForm({ config = {}, onConfigChange, isCreating = false }) {
  const fields = Object.entries(config);
  if (!fields.length) {
    return (
      <div className="rule-config-note">
        {isCreating
          ? "Параметри детектора збережуться зі значеннями за замовчуванням. Їх можна буде змінити після створення правила."
          : "У цього детектора немає параметрів для налаштування."}
      </div>
    );
  }

  return (
    <Row className="g-3">
      {fields.map(([key, value]) => {
        const label = key.replace(/_/g, " ").replace(/^./, char => char.toUpperCase());
        let input;

        if (typeof value === "boolean") {
          input = (
            <NwSelect
              value={String(value)}
              onChange={event => onConfigChange({ ...config, [key]: event.target.value === "true" })}
            >
              <option value="true">Так</option>
              <option value="false">Ні</option>
            </NwSelect>
          );
        } else if (typeof value === "number") {
          input = (
            <NwInput
              type="number"
              step={Number.isInteger(value) ? 1 : "any"}
              value={value}
              onChange={event => {
                if (event.target.value === "") return;
                const nextValue = Number(event.target.value);
                if (Number.isFinite(nextValue)) onConfigChange({ ...config, [key]: nextValue });
              }}
            />
          );
        } else if (typeof value === "string") {
          input = (
            <NwInput
              type="text"
              value={value}
              onChange={event => onConfigChange({ ...config, [key]: event.target.value })}
            />
          );
        } else {
          input = <NwInput type="text" value={JSON.stringify(value)} readOnly />;
        }

        return (
          <Col sm={6} key={key}>
            <FieldLabel>{label}</FieldLabel>
            {input}
          </Col>
        );
      })}
    </Row>
  );
}

const FORMS = {
  pattern: PatternForm,
  detector: DetectorForm,
};

function RuleConfigForm({ rule, config, onConfigChange }) {
  const SelectedForm = FORMS[rule.detection_method] || PatternForm;
  return <SelectedForm config={config} onConfigChange={onConfigChange} />;
}

function Form({ newRule, setNewRule }) {
  const SelectedForm = FORMS[newRule.detection_method] || FORMS.pattern;
  const updateConfig = config => setNewRule(current => ({ ...current, config }));
  return (
    <>
      <Stack gap={3}>
        {/* Name */}
        <Stack gap={3}>
          <Row className="g-2">
            <Col sm={6}>
              <FieldLabel>Назва правила</FieldLabel>
              <NwInput
                type="text"
                placeholder="Вкажіть назву…"
                value={newRule.name}
                onChange={e => setNewRule({ ...newRule, name: e.target.value })}
              />
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
        </Stack>

        {/* Description */}
        <div>
          <FieldLabel>Опис правила</FieldLabel>
          <NwInput
            type="text"
            placeholder="Опис правила…"
            value={newRule.description}
            onChange={e => setNewRule({ ...newRule, description: e.target.value })}
          />
        </div>

        <SelectedForm config={newRule.config} onConfigChange={updateConfig} isCreating />
      </Stack>
    </>
  )
}

export default function Rules({ rules, showAddRule, setShowAddRule, newRule, setNewRule, handleAddRule, apiBase, availableDetectors, canEditRules }) {
  const [expandedRuleId, setExpandedRuleId] = useState(null);
  const [ruleConfigs, setRuleConfigs] = useState({});
  const [loadingConfigId, setLoadingConfigId] = useState(null);
  const [savingConfigId, setSavingConfigId] = useState(null);
  const [configErrors, setConfigErrors] = useState({});
  const [savedConfigId, setSavedConfigId] = useState(null);

  const handleDetectionMethodChange = (event) => {
    const selected = event.target.value;
    if (selected === "pattern") {
      setNewRule(current => ({
        ...current,
        name: "",
        description: "",
        detection_method: "pattern",
        detector_id: null,
        config: { pattern: "" },
      }));
      return;
    }

    const detector = availableDetectors[selected];
    setNewRule(current => ({
      ...current,
      name: detector?.TYPE || current.name,
      detection_method: "detector",
      detector_id: selected,
      severity: detector?.SEVERITY || current.severity,
      description: detector?.DESCRIPTION || current.description,
      config: {},
    }));
  };

  const toggleConfig = async (rule) => {
    if (expandedRuleId === rule.id) {
      setExpandedRuleId(null);
      return;
    }

    setExpandedRuleId(rule.id);
    setSavedConfigId(null);
    setConfigErrors(current => ({ ...current, [rule.id]: "" }));
    if (Object.prototype.hasOwnProperty.call(ruleConfigs, rule.id)) return;

    setLoadingConfigId(rule.id);
    try {
      const response = await fetch(`${apiBase}/api/rules/${rule.id}/config`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Не вдалося завантажити параметри правила");
      setRuleConfigs(current => ({ ...current, [rule.id]: result.config || {} }));
    } catch (error) {
      setConfigErrors(current => ({ ...current, [rule.id]: error.message }));
    } finally {
      setLoadingConfigId(current => current === rule.id ? null : current);
    }
  };

  const saveConfig = async (rule) => {
    setSavingConfigId(rule.id);
    setSavedConfigId(null);
    setConfigErrors(current => ({ ...current, [rule.id]: "" }));
    try {
      const response = await fetch(`${apiBase}/api/rules/${rule.id}/config`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: ruleConfigs[rule.id] || {} }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Не вдалося зберегти параметри правила");
      setRuleConfigs(current => ({ ...current, [rule.id]: result.config || {} }));
      setSavedConfigId(rule.id);
    } catch (error) {
      setConfigErrors(current => ({ ...current, [rule.id]: error.message }));
    } finally {
      setSavingConfigId(null);
    }
  };

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

            {/* Type + Severity */}
            <Row className="g-2 mb-3">
              <FieldLabel>Виявлення</FieldLabel>
              <NwSelect
                value={newRule.detection_method === "pattern" ? "pattern" : (newRule.detector_id || "")}
                onChange={handleDetectionMethodChange}
              >
                <optgroup label="Доступні модулі">
                  {Object.entries(availableDetectors).map(([k, detector]) => (
                    <option key={k} value={k}>{detector.TYPE || k}</option>
                  ))}
                </optgroup>
                <optgroup label="Власні правила">
                  <option value="pattern">Патерн</option>
                </optgroup>
              </NwSelect>
            </Row>

            <Stack gap={3}>
              <Form newRule={newRule} setNewRule={setNewRule} />

              {/* Actions */}
              <div className="form-actions ">
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
                    setNewRule({
                      name: "", detection_method: "pattern", detector_id: null,
                      severity: "medium", description: "", config: { pattern: "" },
                    });
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
              const isExpanded = expandedRuleId === rule.id;
              const hasConfig = Object.prototype.hasOwnProperty.call(ruleConfigs, rule.id);
              return (
                <div key={rule.id}>
                  <div
                    className={`rule-row ${rule.is_enabled ? "enabled" : "disabled"} ${idx < rules.length - 1 && !isExpanded ? "has-divider" : ""}`}
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
                      <div className="rule-name">{rule.name}</div>
                      <div className="font-monospace rule-meta">
                        {(rule.detection_method === "pattern"
                          ? "Власний патерн"
                          : availableDetectors[rule.detector_id]?.TYPE || rule.detector_id)} | ID: {String(rule.id).slice(0, 8)}
                      </div>
                    </div>

                    {/* Severity badge */}
                    <span className={`rule-severity severity-${rule.severity?.toLowerCase()}`}>
                      {sev?.label || rule.severity}
                    </span>

                    {canEditRules && (
                      <button
                        type="button"
                        className="rule-config-toggle"
                        aria-label={isExpanded ? "Згорнути параметри" : "Розгорнути параметри"}
                        aria-expanded={isExpanded}
                        onClick={() => toggleConfig(rule)}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(rule)}
                      className="delete-button"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className={`rule-config-panel ${idx < rules.length - 1 ? "has-divider" : ""}`}>
                      {loadingConfigId === rule.id ? (
                        <div className="rule-config-note">Завантаження параметрів…</div>
                      ) : configErrors[rule.id] ? (
                        <div className="rule-config-error" role="alert">{configErrors[rule.id]}</div>
                      ) : hasConfig ? (
                        <>
                          <RuleConfigForm
                            rule={rule}
                            config={ruleConfigs[rule.id]}
                            onConfigChange={config => {
                              setRuleConfigs(current => ({ ...current, [rule.id]: config }));
                              setSavedConfigId(null);
                              setConfigErrors(current => ({ ...current, [rule.id]: "" }));
                            }}
                          />
                          <div className="form-actions rule-config-actions">
                            <button
                              type="button"
                              className="btn btn-primary compact-button save-button"
                              disabled={savingConfigId === rule.id}
                              onClick={() => saveConfig(rule)}
                            >
                              <Save size={14} className="button-icon" />
                              {savingConfigId === rule.id ? "Збереження…" : "Зберегти параметри"}
                            </button>
                            {savedConfigId === rule.id && <span className="rule-config-saved">Збережено</span>}
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div >
  );
}
