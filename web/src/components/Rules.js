export default function Rules({ rules, showAddRule, setShowAddRule, newRule, setNewRule, handleAddRule, wsSend }) {
  return (
    <div className="tab-content">
      <div className="card">
        <div className="rules-header-row">
          <div className="card-title" style={{ marginBottom: 0 }}>Security Rules</div>
          <button className="form-btn" onClick={() => setShowAddRule(true)}>+ Нове правило</button>
        </div>

        {showAddRule && (
          <div className="add-rule-form">
            <input
              className="form-input"
              placeholder="Назва правила"
              value={newRule.name}
              onChange={e => setNewRule({ ...newRule, name: e.target.value })}
            />
            <button className="form-btn" onClick={handleAddRule}>Зберегти</button>
            <button className="form-btn cancel" onClick={() => setShowAddRule(false)}>Скасувати</button>
          </div>
        )}

        <div className="rules-list" style={{ marginTop: 14 }}>
          {rules.length === 0
            ? <div className="alert-empty">Правила відсутні</div>
            : rules.map(rule => (
              <div key={rule.id} className="rule-item">
                <div className={`rule-dot ${rule.is_enabled ? 'rule-dot-on' : 'rule-dot-off'}`} />
                <div className="rule-name">{rule.name}</div>
                <div className={`sev-tag sev-${rule.severity}`}>{rule.severity}</div>
                <button className="rule-del-btn" onClick={() => wsSend({ action: "delete_rule", rule_id: rule.id })}>✕</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
