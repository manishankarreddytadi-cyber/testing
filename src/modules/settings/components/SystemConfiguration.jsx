// src/modules/settings/components/SystemConfiguration.jsx
import { useState } from 'react';
import { updateSystemConfig } from '../../../services/settings.service';
import { useAuth } from '../../../contexts/AuthContext';

const CURRENCIES   = ['INR (₹)', 'USD ($)', 'EUR (€)'];
const WEIGHT_UNITS = ['Kilograms (kg)', 'Pounds (lbs)', 'Tons (MT)'];
const TIMEZONES    = ['IST', 'UTC', 'EST', 'PST'];

export default function SystemConfiguration({ config }) {
  const { orgId } = useAuth();
  const [form, setForm] = useState({
    currency:   config?.currency   || 'INR (₹)',
    weightUnit: config?.weightUnit || 'Kilograms (kg)',
    timezone:   config?.timezone   || 'IST',
  });
  const [saved, setSaved] = useState(false);

  function update(field, val) { setForm((f) => ({ ...f, [field]: val })); setSaved(false); }

  async function handleSave(e) {
    e.preventDefault();
    await updateSystemConfig(orgId, form);
    setSaved(true);
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h2>System Configuration</h2>
      </div>
      <form onSubmit={handleSave}>
        <div className="form-grid single-col">
          <div className="form-group">
            <label>Currency</label>
            <select className="excel-input" value={form.currency} onChange={(e) => update('currency', e.target.value)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Weight Unit</label>
            <select className="excel-input" value={form.weightUnit} onChange={(e) => update('weightUnit', e.target.value)}>
              {WEIGHT_UNITS.map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Timezone</label>
            <select className="excel-input" value={form.timezone} onChange={(e) => update('timezone', e.target.value)}>
              {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="submit" className="btn-primary">Save Changes</button>
          {saved && <span style={{ color: 'green', fontSize: 13 }}>✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
