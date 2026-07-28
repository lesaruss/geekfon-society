// Shared core logic for the on-demand Brand/Client audit feature.
//
// Runs a real Lighthouse pass (via Google PageSpeed Insights) against a
// brand's live domain and logs the result to brand_audit_reports. Used by
// both /api/brand-audit/run (single brand) and /api/brand-audit/run-all
// (whole universe).
//
// Deliberately does NOT include any review/approval workflow (no WCM-style
// submit/admin-review/pass/send-back) — V confirmed 2026-07-25 that's out
// of scope for now, this is display + a Run Audit trigger only.

import { serviceClient } from './supabase'
import { findBrandByBriefsSlug } from './brands'
import { runAxeScan } from './axe-scan'
import { runWaveScan } from './wave-scan'
import { runConnectionsCheck } from './connections-scan'

const GOOD_THRESHOLD = 0.9 // Lighthouse's own "green" cutoff (90/100)

export type AuditRunResult = {
  brandSlug: string
  ok: boolean
  domain?: string
  performancePct?: number
  accessibilityPct?: number
  adaScore?: number
  waveScore?: number
  error?: string
}

async function getPageSpeedKey(): Promise<string | null> {
  const db = serviceClient()
  if (!db) return null
  const { data } = await db
    .from('lesaruss_secrets')
    .select('value')
    .eq('key', 'GOOGLE_PAGESPEED_API_KEY')
    .single()
  return data?.value ?? null
}

// Resolves a brand's live domain from the sites registry. Returns null if
// the brand has no site row, or the site isn't status='live' yet (no point
// auditing a page that isn't really up).
async function getLiveDomain(briefsSlug: string): Promise<string | null> {
  const db = serviceClient()
  if (!db) return null
  const { data } = await db
    .from('sites')
    .select('domain, status')
    .eq('brand_slug', briefsSlug)
    .eq('status', 'live')
    .not('domain', 'is', null)
    .limit(1)
    .maybeSingle()
  return data?.domain ?? null
}

export async function runBrandAudit(briefsSlug: string): Promise<AuditRunResult> {
  const brand = findBrandByBriefsSlug(briefsSlug)
  if (!brand) {
    return { brandSlug: briefsSlug, ok: false, error: 'Unknown brand slug' }
  }

  const domain = await getLiveDomain(briefsSlug)
  if (!domain) {
    return { brandSlug: briefsSlug, ok: false, error: 'No live site on file for this brand yet' }
  }

  const key = await getPageSpeedKey()
  if (!key) {
    return { brandSlug: briefsSlug, ok: false, domain, error: 'GOOGLE_PAGESPEED_API_KEY missing from lesaruss_secrets' }
  }

  const db = serviceClient()
  if (!db) {
    return { brandSlug: briefsSlug, ok: false, domain, error: 'Database unavailable' }
  }

  const psiUrl =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(`https://${domain}`)}` +
    `&category=performance&category=accessibility&strategy=mobile&key=${key}`

  let perf: number | null = null
  let a11y: number | null = null
  let finalUrl: string | null = null
  let psiError: string | null = null

  try {
    const resp = await fetch(psiUrl, { signal: AbortSignal.timeout(110_000) })
    const json = await resp.json()
    if (!resp.ok) {
      psiError = json?.error?.message ?? `PageSpeed Insights returned HTTP ${resp.status}`
    } else {
      const cats = json?.lighthouseResult?.categories
      perf = cats?.performance?.score ?? null
      a11y = cats?.accessibility?.score ?? null
      finalUrl = json?.lighthouseResult?.finalUrl ?? null
    }
  } catch (err) {
    psiError = err instanceof Error ? err.message : String(err)
  }

  const functional = psiError === null
  const performancePass = perf != null ? perf >= GOOD_THRESHOLD : null
  const accessibilityPass = a11y != null ? a11y >= GOOD_THRESHOLD : null

  const perfPct = perf != null ? Math.round(perf * 100) : null
  const a11yPct = a11y != null ? Math.round(a11y * 100) : null

  // Gold-standard ADA pass — real axe-core scan in a real headless browser,
  // plus a real WAVE (WebAIM) scan, run alongside Lighthouse (V's directive
  // 2026-07-25: axe-core + WAVE are both "worth the extra work" because ADA
  // Unlocked sells this as a service line). WAVE_API_KEY was already
  // provisioned and proven live the same day under a separate initiative
  // (audit_reports/"Business Audit Standard") that this session wasn't aware
  // of until V corrected the record 2026-07-27 — known fork, flagged, V's
  // call was to let both systems run for now rather than block on it.
  //
  // Connections check (GitHub/Vercel/SSL) added 2026-07-27, same directive:
  // triggered by discovering Blink had no GitHub repo. Runs alongside the
  // other two rather than gating them — a missing repo shouldn't block the
  // web-quality scores from being recorded.
  const [axe, wave, connections] = await Promise.all([
    runAxeScan(`https://${domain}`),
    runWaveScan(`https://${domain}`),
    runConnectionsCheck(brand, domain),
  ])

  const summary = functional
    ? `Automated Lighthouse pass (mobile) on ${domain}: Performance ${perfPct}/100, Accessibility ${a11yPct}/100.` +
      (axe.ok
        ? ` ADA (axe-core): ${axe.adaScore}/100, ${axe.violations.length} violation(s).`
        : ` ADA scan failed: ${axe.error}.`) +
      (wave.ok
        ? ` WAVE: ${wave.waveScore ?? '—'}/100, ${wave.violations.length} item(s).`
        : ` WAVE scan failed: ${wave.error}.`) +
      ` Connections: GitHub ${connections.githubStatus}${connections.vercelGitLinked === false ? ', Vercel not git-linked' : ''}${connections.sslOk === false ? ', SSL/HTTPS unreachable' : ''}.` +
      (finalUrl && finalUrl !== `https://${domain}/` ? ` (redirected to ${finalUrl})` : '')
    : `Automated Lighthouse pass on ${domain} FAILED: ${psiError}`

  const issuesFound: string[] = []
  if (functional) {
    if (perfPct != null && perfPct < 90) issuesFound.push(`Performance ${perfPct}/100 — below the 90 "good" threshold`)
    if (a11yPct != null && a11yPct < 90) issuesFound.push(`Accessibility ${a11yPct}/100 — below the 90 "good" threshold`)
  } else {
    issuesFound.push(`Lighthouse could not complete a run: ${psiError}`)
  }
  if (axe.ok) {
    for (const v of axe.violations) {
      issuesFound.push(`[axe-core, ${v.impact ?? 'unknown'}] ${v.help} (${v.nodes} element(s)) — ${v.id}`)
    }
  } else {
    issuesFound.push(`axe-core ADA scan could not complete: ${axe.error}`)
  }
  if (wave.ok) {
    for (const v of wave.violations) {
      issuesFound.push(`[WAVE, ${v.category}] ${v.description} (${v.count}x) — ${v.id}`)
    }
  } else {
    issuesFound.push(`WAVE ADA scan could not complete: ${wave.error}`)
  }
  if (connections.githubStatus === 'missing') {
    issuesFound.push('No GitHub repo found for this property — deploys are not version-controlled.')
  } else if (connections.githubStatus === 'repo_only') {
    issuesFound.push(`GitHub repo exists (${connections.githubRepo}) but Vercel is not deploying from it — still a raw/manual deploy path.`)
  }
  if (connections.vercelGitLinked === false && connections.githubStatus === 'linked') {
    issuesFound.push('Vercel project is not linked to the GitHub repo.')
  }
  if (connections.sslOk === false) {
    issuesFound.push(`HTTPS/SSL check failed for ${domain} — site may be unreachable or the certificate is invalid.`)
  }
  if (connections.error) {
    issuesFound.push(`Connections check had an error, treat status as best-effort: ${connections.error}`)
  }

  const nextSteps: string[] = functional
    ? (issuesFound.length > 0
        ? ['Pull the full Lighthouse opportunities/diagnostics detail for the flagged category(ies)']
        : [])
    : ['Manually load the site and check for slow/hanging resources', 'Re-run once resolved']
  if (axe.ok && axe.violations.length > 0) {
    nextSteps.push('Work through the itemized axe-core ADA violations on the profile page, worst impact first')
  }
  if (wave.ok && wave.violations.length > 0) {
    nextSteps.push('Cross-check WAVE items against axe-core — overlap confirms real issues, WAVE-only items are worth a manual look')
  }
  if (connections.githubStatus === 'missing' || connections.githubStatus === 'repo_only') {
    nextSteps.push('Get this property onto a real GitHub-linked Vercel deploy before the next incident, not after')
  }

  await db.from('brand_audit_reports').insert({
    brand_slug: briefsSlug,
    audited_at: new Date().toISOString(),
    functional,
    visual: null,
    performance: performancePass,
    accessibility: accessibilityPass,
    standards: null,
    summary,
    issues_found: issuesFound,
    next_steps: nextSteps,
    created_by: 'hq-run-audit-button',
    performance_pct: perfPct,
    accessibility_pct: a11yPct,
    ada_score: axe.ok ? axe.adaScore : null,
    ada_violations: axe.ok ? axe.violations : null,
    ada_violations_critical: axe.counts.critical,
    ada_violations_serious: axe.counts.serious,
    ada_violations_moderate: axe.counts.moderate,
    ada_violations_minor: axe.counts.minor,
    wave_score: wave.ok ? wave.waveScore : null,
    wave_violations: wave.ok ? wave.violations : null,
    github_status: connections.githubStatus,
    github_repo: connections.githubRepo,
    github_url: connections.githubUrl,
    vercel_project: connections.vercelProject,
    vercel_git_linked: connections.vercelGitLinked,
    domain_ssl_ok: connections.sslOk,
  })

  return {
    brandSlug: briefsSlug,
    ok: functional,
    domain,
    performancePct: perfPct ?? undefined,
    accessibilityPct: a11yPct ?? undefined,
    adaScore: axe.ok && axe.adaScore != null ? axe.adaScore : undefined,
    waveScore: wave.ok && wave.waveScore != null ? wave.waveScore : undefined,
    error: psiError ?? undefined,
  }
}

// All brands that currently have a live site on file — the target list for
// "run for the whole universe."
export async function getLiveBrandSlugs(): Promise<string[]> {
  const db = serviceClient()
  if (!db) return []
  const { data } = await db
    .from('sites')
    .select('brand_slug')
    .eq('status', 'live')
    .not('brand_slug', 'is', null)
  const slugs = new Set((data ?? []).map((r) => r.brand_slug as string))
  // Only ones we actually track as a brand/client tile.
  return [...slugs].filter((s) => findBrandByBriefsSlug(s))
}

// force-redeploy: ensure Connections wiring (2026-07-27) actually reaches production HEAD, not a superseded intermediate build
