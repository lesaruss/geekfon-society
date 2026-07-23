"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SiteChrome from "@/components/SiteChrome";
import { supabase } from "@/lib/supabase";
import styles from "../register/page.module.css";

// First-time Google/Apple sign-ins land here. Reuses the register page's
// styling (same dark card, same input classes) since visually this is just
// the tail end of the same signup flow, minus the email/code step OAuth
// already handled for us.
export default function CompleteProfilePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [fullNameError, setFullNameError] = useState("");
  const [dobError, setDobError] = useState("");
  const [termsError, setTermsError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      const meta = data.user.user_metadata as Record<string, unknown> | undefined;
      const name = (meta?.full_name || meta?.name) as string | undefined;
      if (name) setFullName(name);
      setCheckingSession(false);
    });
  }, [router]);

  const calculateAge = (dateString: string) => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFullNameError("");
    setDobError("");
    setTermsError("");

    let isValid = true;
    if (!fullName.trim() || fullName.trim().length < 2) {
      setFullNameError("Full name must be at least 2 characters");
      isValid = false;
    }
    if (!dateOfBirth) {
      setDobError("Date of birth is required");
      isValid = false;
    } else if (calculateAge(dateOfBirth) < 13) {
      setDobError("You must be at least 13 years old");
      isValid = false;
    }
    if (!acceptTerms) {
      setTermsError("You must accept the Terms of Service");
      isValid = false;
    }
    if (!isValid) return;

    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ fullName: fullName.trim(), dateOfBirth, acceptTerms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save your profile");
      router.push("/welcome");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) return null;

  return (
    <SiteChrome>
      <div className={styles.container}>
        <div className={styles.aurora} aria-hidden="true">
          <div className={styles.auroraGlow1}></div>
          <div className={styles.auroraGlow2}></div>
        </div>
        <main className={styles.card}>
          <div className={styles.state}>
            <p className={styles.cardEyebrow}>One Last Step</p>
            <h1 className={styles.cardHeading}>Finish Your Account</h1>
            <p className={styles.cardBody}>
              Confirm a couple of details to finish setting up your GeekFon Society account.
            </p>

            {error && (
              <div className={styles.error} role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
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
                  aria-invalid={!!fullNameError}
                  className={styles.inputField}
                  disabled={isLoading}
                />
                {fullNameError && (
                  <div className={styles.errorMessage} role="alert">
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
                  aria-invalid={!!dobError}
                  className={styles.inputField}
                  disabled={isLoading}
                />
                {dobError && (
                  <div className={styles.errorMessage} role="alert">
                    {dobError}
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
                  className={styles.checkbox}
                  disabled={isLoading}
                />
                <label htmlFor="terms" className={styles.checkboxLabel}>
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </label>
              </div>
              {termsError && (
                <div className={styles.errorMessage} role="alert">
                  {termsError}
                </div>
              )}

              <button type="submit" disabled={isLoading} className={styles.submitBtn}>
                {isLoading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Saving...
                  </>
                ) : (
                  "Finish Sign Up"
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </SiteChrome>
  );
}
