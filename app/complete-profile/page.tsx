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
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");
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

  // Same fix as app/register/page.tsx: parse the y/m/d integers directly rather than
  // through `new Date(dateString)`, which parses as UTC and can shift a day against
  // local `today` depending on timezone offset (caused false "invalid date" rejections).
  const calculateAge = (dateString: string) => {
    const [by, bm, bd] = dateString.split("-").map(Number);
    const today = new Date();
    let age = today.getFullYear() - by;
    const monthDiff = (today.getMonth() + 1) - bm;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bd)) age--;
    return age;
  };

  // Builds YYYY-MM-DD from the three neutral numeric fields, or "" if incomplete/invalid.
  // No defaults, no pre-filled values - plain digit entry only, per the FTC's 2025 COPPA
  // guidance on neutral age screens (also matches app/register/page.tsx).
  const buildDateOfBirth = (month: string, day: string, year: string): string => {
    if (!month || !day || !year) return "";
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    if (!m || !d || !y) return "";
    if (m < 1 || m > 12 || d < 1 || d > 31 || String(year).length !== 4) return "";
    const iso = `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
    const parsed = new Date(iso);
    if (isNaN(parsed.getTime()) || parsed.getUTCMonth() + 1 !== m || parsed.getUTCDate() !== d) return "";
    return iso;
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
    const dateOfBirth = buildDateOfBirth(dobMonth, dobDay, dobYear);
    if (!dobMonth || !dobDay || !dobYear) {
      setDobError("Date of birth is required");
      isValid = false;
    } else if (!dateOfBirth) {
      setDobError("Enter a valid date");
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
        body: JSON.stringify({ fullName: fullName.trim(), dateOfBirth: buildDateOfBirth(dobMonth, dobDay, dobYear), acceptTerms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save your profile");
      router.push("/dashboard");
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
                <label htmlFor="dobMonth" className={styles.inputLabel}>
                  Date of Birth
                </label>
                <p className={styles.dobHint} id="dobHint">
                  We ask this to confirm eligibility to join.
                </p>
                <div className={styles.dobRow} role="group" aria-labelledby="dobMonth-label" aria-describedby="dobHint">
                  <input
                    id="dobMonth"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    placeholder="MM"
                    aria-label="Birth month"
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    required
                    aria-required="true"
                    aria-invalid={!!dobError}
                    className={`${styles.inputField} ${styles.dobInput} ${styles.dobInputShort}`}
                    disabled={isLoading}
                  />
                  <span className={styles.dobSeparator} aria-hidden="true">/</span>
                  <input
                    id="dobDay"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    placeholder="DD"
                    aria-label="Birth day"
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    required
                    aria-required="true"
                    aria-invalid={!!dobError}
                    className={`${styles.inputField} ${styles.dobInput} ${styles.dobInputShort}`}
                    disabled={isLoading}
                  />
                  <span className={styles.dobSeparator} aria-hidden="true">/</span>
                  <input
                    id="dobYear"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="YYYY"
                    aria-label="Birth year"
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    required
                    aria-required="true"
                    aria-invalid={!!dobError}
                    className={`${styles.inputField} ${styles.dobInput} ${styles.dobInputLong}`}
                    disabled={isLoading}
                  />
                </div>
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
