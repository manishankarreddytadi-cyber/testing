// src/modules/auth/components/Onboarding.jsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faRightToBracket, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { createOrganisation, joinOrganisation } from '../../../services/users.service';
import { useAuth } from '../../../contexts/AuthContext';

export default function Onboarding() {
  const { user, globalUser, reloadGlobalUser, setIsCreatingOrg } = useAuth();
  const [view, setView] = useState('choice'); // 'choice' | 'create' | 'join'
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!orgName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createOrganisation(user.uid, user.email, user.displayName, orgName);
      await reloadGlobalUser();
      setIsCreatingOrg(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An unknown error occurred while creating.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await joinOrganisation(user.uid, user.email, user.displayName, inviteCode);
      await reloadGlobalUser();
      setIsCreatingOrg(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An unknown error occurred while joining.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 450, width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Welcome to Aquanubandh</h2>
        
        {error && <div style={{ color: '#e74c3c', marginBottom: 15, textAlign: 'center', background: '#fdf2f2', padding: 10, borderRadius: 4, border: '1px solid #f9d8d8' }}>{error}</div>}

        {view === 'choice' && (
          <div>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 25 }}>
              To get started, you can either create your own organisation or join an existing one using an invite code.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn-primary" style={{ padding: 15, fontSize: 16 }} onClick={() => setView('create')}>
                <FontAwesomeIcon icon={faPlus} style={{ marginRight: 8 }} /> Create an Organisation
              </button>
              <button className="btn-secondary" style={{ padding: 15, fontSize: 16 }} onClick={() => setView('join')}>
                <FontAwesomeIcon icon={faRightToBracket} style={{ marginRight: 8 }} /> Join an Organisation
              </button>
            </div>
            {globalUser?.orgs?.length > 0 && (
              <button 
                className="btn-secondary" 
                style={{ width: '100%', padding: 15, fontSize: 16, marginTop: 15 }} 
                onClick={() => setIsCreatingOrg(false)}
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {view === 'create' && (
          <form onSubmit={handleCreate}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              Create a new workspace for your farms. You will be the Admin and can invite others later.
            </p>
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Organisation Name</label>
              <input
                type="text"
                className="excel-input"
                style={{ width: '100%', padding: 10, fontSize: 15 }}
                placeholder="e.g. My Aqua Farm"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, padding: 10 }} disabled={loading}>
                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Create'}
              </button>
              <button type="button" className="btn-secondary" style={{ padding: 10 }} onClick={() => setView('choice')} disabled={loading}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {view === 'join' && (
          <form onSubmit={handleJoin}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              Enter the unique 6-character invite code provided by your organisation Admin.
            </p>
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Invite Code</label>
              <input
                type="text"
                className="excel-input"
                style={{ width: '100%', padding: 10, fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' }}
                placeholder="e.g. A7X9P2"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                autoFocus
                required
                maxLength={6}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, padding: 10 }} disabled={loading}>
                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Join'}
              </button>
              <button type="button" className="btn-secondary" style={{ padding: 10 }} onClick={() => setView('choice')} disabled={loading}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
