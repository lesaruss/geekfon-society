'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SiteChrome from '@/components/SiteChrome';
import styles from './page.module.css';

type State = 'form' | 'sending' | 'code-entry';
type Tier = 'free' | 'passport' | 'all-access' | 'lifetime';

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<State>('form');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [code, setCode] = useState('');
  const [tier, setTier] = useState<Tier>((searchParams?.get('tier') as Tier) || 'free');

  const [fullNameError, setFullNameError] = useState('');
  const [dobError, setDobError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [termsError, setTermsError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          router.push('/dashboard');
        }
      } catch (err) {
        // Not logged in, continue
      }
    };
    checkSession();
  }, [router]);

  const calculateAge = (dateString: string) => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const validateForm = (): boolean => {
    let isValid = true;

    setFullNameError('');
    setDobError('');
    setEmailError('');
    setTermsError('');

    if (!fullName.trim()) {
      setFullNameError('Full name is required');
      isValid = false;
    } else if (fullName.trim().length < 2) {
      setFullNameError('Full name must be at least 2 characters');
      isValid = false;
    }

    if (!dateOfBirth) {
      setDobError('Date of birth is required');
      isValid = false;
    } else if (calculateAge(dateOfBirth) < 13) {
      setDobError('You must be at least 13 years old');
      isValid = false;
    }

    if (!email) {
      setEmailError('Email address is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!acceptTerms) {
      setTermsError('You must accept the Terms of Service');
      isValid = false;
    }

    return isValid;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setState('sending');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          dateOfBirth,
          email,
          tier,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create account');
      }

      setState('code-entry');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
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

      router.push('/welcome');
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
      const res = await fetch('/api/auth/resend-code', {
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
            <p className={styles.cardEyebrow}>Get Started</p>
            <h1 className={styles.cardHeading}>Join GeekFon Society</h1>
            <p className={styles.cardBody}>
              Create your account to unlock exclusive content and connect with the community.
            </p>

            {error && (
              <div className={styles.error} role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <form onSubmit={handleFormSubmit} noValidate>
              <div className={styles.inputGroup}>
                <label htmlFor="fullName" className={styles.inputLabel}>
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  minLength={2}
                  aria-required="true"
                  aria-describedby="fullNameError"
                  aria-invalid={!!fullNameError}
                  className={styles.inputField}
                  disabled={isLoading}
                />
                {fullNameError && (
                  <div id="fullNameError" className={styles.errorMessage} role="alert">
                    {fullNameError}
                  </div>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="dob" className={styles.inputLabel}>
                  Date of Birth
                </label>
                <input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  aria-required="true"
                  aria-describedby="dobError"
                  aria-invalid={!!dobError}
                  className={styles.inputField}
                  disabled={isLoading}
                />
                {dobError && (
                  <div id="dobError" className={styles.errorMessage} role="alert">
                    {dobError}
                  </div>
                )}
              </div>

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

              <div className={styles.checkboxGroup}>
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                  aria-required="true"
                  aria-describedby="termsError"
                  className={styles.checkbox}
                  disabled={isLoading}
                />
                <label htmlFor="terms" className={styles.checkboxLabel}>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </label>
              </div>
              {termsError && (
                <div id="termsError" className={styles.errorMessage} role="alert">
                  {termsError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitBtn}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <p className={styles.formNote}>
              Already a member?{' '}
              <a href="/login">Sign in</a> instead.
            </p>
          </div>
        )}

        {/* Sending State */}
        {state === 'sending' && (
          <div className={styles.state} aria-live="polite">
            <div className={styles.spinner}></div>
            <p className={styles.cardBody} style={{ textAlign: 'center' }}>
              Creating your account...
            </p>
          </div>
        )}

        {/* Code Entry State */}
        {state === 'code-entry' && (
          <div className={styles.state} aria-live="polite">
            <h2 className={styles.sentHeading}>Verify Your Email</h2>
            <p className={styles.sentBody}>We sent an 8-digit code to:</p>
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
                  Verification Code
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
                  'Verify and Continue'
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
                .
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <SiteChrome>
      <Suspense fallback={null}>
        <RegisterPageInner />
      </Suspense>
    </SiteChrome>
  );
}
