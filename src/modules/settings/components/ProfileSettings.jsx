import { useState, useEffect } from 'react';
import { updateOrgProfile } from '../../../services/settings.service';
import { useAuth } from '../../../contexts/AuthContext';
import { signOut } from '../../../services/auth.service';
export default function ProfileSettings({ profile }) {
  const { orgId, user, reloadGlobalUser } = useAuth();
  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'User';
  const [form, setForm] = useState({
    name:          profile?.name         || '',
    phone:         profile?.phone         || '',
    email:         profile?.email         || '',
    address:       profile?.address       || '',
    contactPerson: profile?.contactPerson || '',
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Re-sync form if profile loads asynchronously after first render
  useEffect(() => {
    if (profile) {
      setForm({
        name:          profile.name          || '',
        phone:         profile.phone         || '',
        email:         profile.email         || '',
        address:       profile.address       || '',
        contactPerson: profile.contactPerson || '',
      });
    }
  }, [profile]);

  function update(field, val) { setForm((f) => ({ ...f, [field]: val })); setSaved(false); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOrgProfile(user.uid, orgId, form);
      setSaved(true);
      if (reloadGlobalUser) await reloadGlobalUser();
    } catch (err) {
      console.error(err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2>Profile Settings</h2>
      </div>

      <div style={{ padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: '0 0 4px 0' }}>Personal Account</h4>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            <strong>{displayName}</strong> - {user?.email}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary btn-sm" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="section-header" style={{ marginBottom: '16px' }}>
        <h3>Organization Details</h3>
      </div>

      <form onSubmit={handleSave}>
        <div className="form-grid">
          <div className="form-group span-2" style={{ background: 'var(--highlight-bg)', padding: '16px 20px', borderRadius: 8, border: '1px dashed var(--primary)', marginBottom: 8 }}>
            <label style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Organisation Invite Code</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, flex: '1 1 200px' }}>Share this 6-character code with your team to invite them.</div>
              <div style={{ background: '#fff', padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 18, fontWeight: 700, letterSpacing: 3, userSelect: 'all', flexShrink: 0 }}>
                {profile?.inviteCode || 'N/A'}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label>Organization Name</label>
            <input className="excel-input" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Contact Person</label>
            <input className="excel-input" value={form.contactPerson} onChange={(e) => update('contactPerson', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input className="excel-input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" className="excel-input" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div className="form-group span-2">
            <label>Address</label>
            <input className="excel-input" value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && !saving && <span style={{ color: 'green', fontSize: 13 }}>✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
