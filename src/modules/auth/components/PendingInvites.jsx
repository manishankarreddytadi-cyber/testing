import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelopeOpenText, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { getPendingInvite, acceptInvite } from '../../../services/users.service';
import { signOut } from '../../../services/auth.service';

export default function PendingInvites() {
  const { user, reloadProfile, switchOrg } = useAuth();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      getPendingInvite(user.email).then(inv => {
        setInvite(inv);
        setLoading(false);
      });
    }
  }, [user]);

  async function handleAccept() {
    if (!invite) return;
    await acceptInvite(invite.orgId, invite.id, user, invite.role);
    await reloadProfile(); // Refresh AuthContext to load new orgs
    await switchOrg(invite.orgId);
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Checking invites…</div>;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-main)'
    }}>
      <div style={{
        background: 'var(--surface)', padding: 40, borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: 400
      }}>
        <FontAwesomeIcon icon={faEnvelopeOpenText} style={{ fontSize: 48, color: 'var(--primary)', marginBottom: 20 }} />
        
        {invite ? (
          <>
            <h2 style={{ marginBottom: 10 }}>You've been invited!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 30 }}>
              You have been invited to join <strong>{invite.orgName || invite.orgId}</strong> as a <strong>{invite.role}</strong>.
            </p>
            <button className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: 16 }} onClick={handleAccept}>
              <FontAwesomeIcon icon={faCheck} /> Accept Invitation
            </button>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: 10 }}>No Access</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 30 }}>
              Your account ({user.email}) does not have an active profile or pending invitation for this organization.
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: 30, fontSize: 13 }}>
              Please ask an administrator to send an invite to your email.
            </p>
          </>
        )}
        <button className="btn-secondary" style={{ marginTop: 20 }} onClick={signOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
