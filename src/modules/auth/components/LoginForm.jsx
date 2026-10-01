// src/modules/auth/components/LoginForm.jsx
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { signInWithGoogle } from '../../../services/auth.service';

export default function LoginForm() {
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      // AuthContext's onAuthStateChanged handles the rest
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized. Please add it to Firebase Auth settings.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else {
        setError(`Sign-in failed: ${err.message}`);
      }
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo" style={{ width: '100%', justifyContent: 'center' }}>
          <img src="/favicon.svg" alt="Aquanubandh Logo" style={{ height: 32, width: 'auto', marginRight: 8 }} />
          Aquanubandh
        </div>
        <h2>Sign in to your account</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
          Use your authorized Google account to continue.
        </p>

        {error && <p className="login-error">{error}</p>}

        <button
          id="google-signin-btn"
          className="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
}
