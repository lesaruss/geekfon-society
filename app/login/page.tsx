'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SiteChrome from '@/components/SiteChrome';
import styles from './page.module.css';
import { signInWithProvider } from '@/lib/socialAuth';

type State = 'form' | 'sending' | 'code-entry';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/dashboard';

  const [state, setState] = useState<State>('form');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const handleSocialSignIn = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      await signInWithProvider(provider);
    } finally {
      setSocialLoading(null);
    }
  };


  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          router.push(redirect);
        }
      } catch (err) {
        // Not logged in, continue
      }
    };
    checkSession();
  }, [redirect, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setError('');

    if (!email) {
      setEmailError('Email address is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setState('sending');

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send code');
      }

      setState('code-entry');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
      setState('form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    setError('');

    if (!code || code.length !== 8) {
      setCodeError('Please enter an 8-digit code');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid code');
      }

      router.push(redirect);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error('Failed to resend code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
    setCode(value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.aurora} aria-hidden="true">
        <div className={styles.auroraGlow1}></div>
        <div className={styles.auroraGlow2}></div>
      </div>

      <main className={styles.card}>
        {/* Form State */}
        {state === 'form' && (
          <div className={styles.state}>
            <p className={styles.cardEyebrow}>Member Access</p>
            <h1 className={styles.cardHeading}>Sign In to Your Membership</h1>
            <p className={styles.cardBody}>
              Sign in with one tap, or get a one-time code by email. No password needed.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
              <button
                type="button"
                onClick={() => handleSocialSignIn('google')}
                disabled={socialLoading !== null}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {socialLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignIn('apple')}
                disabled={socialLoading !== null}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: '#fff', color: '#000', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {socialLoading === 'apple' ? 'Connecting...' : 'Continue with Apple'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 20px', color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
              or
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {error && (
              <div className={styles.error} role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailSubmit} noValidate>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.inputLabel}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-describedby="emailError"
                  aria-invalid={!!emailError}
                  className={styles.inputField}
                  disabled={isLoading}
                />
                {emailError && (
                  <div id="emailError" className={styles.errorMessage} role="alert">
                    {emailError}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitBtn}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Sending...
                  </>
                ) : (
                  'Email me a code'
                )}
              </button>
            </form>

            <p className={styles.formNote}>
              New to GeekFon Society?{' '}
              <a href="/passport">Get your membership</a> first.
            </p>
          </div>
        )}

        {/* Sending State */}
        {state === 'sending' && (
          <div className={styles.state} aria-live="polite">
            <div className={styles.spinner}></div>
            <p className={styles.cardBody} style={{ textAlign: 'center' }}>
              Sending your sign-in code...
            </p>
          </div>
        )}

        {/* Code Entry State */}
        {state === 'code-entry' && (
          <div className={styles.state} aria-live="polite">
            <h2 className={styles.sentHeading}>Enter Your Code</h2>
            <p className={styles.sentBody}>We emailed an 8-digit code to:</p>
            <div className={styles.sentEmailChip} aria-live="polite">
              {email}
            </div>

            {error && (
              <div className={styles.error} role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <form onSubmit={handleCodeSubmit} noValidate style={{ marginTop: '18px' }}>
              <div className={styles.inputGroup}>
                <label htmlFor="code" className={styles.inputLabel}>
                  Sign-in Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="________"
                  maxLength={8}
                  required
                  aria-required="true"
                  aria-describedby="codeError"
                  aria-invalid={!!codeError}
                  className={`${styles.inputField} ${styles.codeInput}`}
                  disabled={isLoading}
                  autoComplete="one-time-code"
                />
                {codeError && (
                  <div id="codeError" className={styles.errorMessage} role="alert">
                    {codeError}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitBtn}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Verifying...
                  </>
                ) : (
                  'Verify and sign in'
                )}
              </button>
            </form>

            <div className={styles.resendSection}>
              <p className={styles.sentBody} style={{ fontSize: '13px' }}>
                Didn't get it?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading}
                  className={styles.resendBtn}
                >
                  Resend code
                </button>
                . You can also tap the link in the email instead.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <SiteChrome>
      <Suspense fallback={null}>
        <LoginPageInner />
      </Suspense>
    </SiteChrome>
  );
}
