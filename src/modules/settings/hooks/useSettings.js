// src/modules/settings/hooks/useSettings.js
import { useState, useEffect } from 'react';
import { getOrgProfile, getSystemConfig } from '../../../services/settings.service';
import { useAuth } from '../../../contexts/AuthContext';

export function useSettings() {
  const { orgId } = useAuth();
  const [profile, setProfile]   = useState({});
  const [config, setConfig]     = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getOrgProfile(orgId), getSystemConfig(orgId)])
      .then(([p, c]) => { setProfile(p); setConfig(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId]);

  return { profile, config, loading };
}
