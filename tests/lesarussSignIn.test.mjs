// node --experimental-strip-types --test tests/lesarussSignIn.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../lib/lesarussSignIn.ts";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const base = { hasSession: false, pathname: "/", quietFlag: null, userAgent: CHROME, hostname: "geekfon.ai", inFrame: false };

test("state: matches only the saved, valid value", () => {
  const s = L.newState();
  assert.ok(L.validState(s));
  assert.equal(s.length, 32);
  assert.ok(L.stateMatches(s, s));
  assert.ok(!L.stateMatches(s, L.newState()));
  assert.ok(!L.stateMatches(null, s));
  assert.ok(!L.stateMatches(s, null));
  assert.ok(!L.stateMatches("short", "short"));
  assert.ok(!L.stateMatches("bad state with spaces!!", "bad state with spaces!!"));
});

test("redirect_uri: this origin's /auth/lesaruss", () => {
  assert.equal(L.redirectUriFor("https://geekfon.ai"), "https://geekfon.ai/auth/lesaruss");
  assert.equal(L.redirectUriFor("https://www.geekfon.ai/"), "https://www.geekfon.ai/auth/lesaruss");
  const u = new URL(L.silentUrl("https://geekfon.ai", "s".repeat(20)));
  assert.equal(u.origin + u.pathname, "https://hq.lesaruss.ai/connect/silent");
  assert.equal(u.searchParams.get("client"), "geekfon");
  assert.equal(u.searchParams.get("redirect_uri"), "https://geekfon.ai/auth/lesaruss");
  assert.equal(new URL(L.connectUrl("https://geekfon.ai", "s".repeat(20))).pathname, "/connect");
});

test("allowed redirect_uri: registered hosts only", () => {
  assert.ok(L.isAllowedRedirectUri("https://geekfon.ai/auth/lesaruss"));
  assert.ok(L.isAllowedRedirectUri("https://www.geekfon.ai/auth/lesaruss"));
  assert.ok(L.isAllowedRedirectUri("https://geekfon-society-abc123-contact-2245s-projects.vercel.app/auth/lesaruss"));
  assert.ok(!L.isAllowedRedirectUri("http://geekfon.ai/auth/lesaruss"));
  assert.ok(!L.isAllowedRedirectUri("https://evil.com/auth/lesaruss"));
  assert.ok(!L.isAllowedRedirectUri("https://geekfon.ai.evil.com/auth/lesaruss"));
  assert.ok(!L.isAllowedRedirectUri("https://geekfon.ai/auth/lesaruss?x=1"));
  assert.ok(!L.isAllowedRedirectUri("https://geekfon.ai/other"));
  assert.ok(!L.isAllowedRedirectUri("not a url"));
});

test("hq handoff url uses HQ's lrsso + next", () => {
  const u = new URL(L.hqHandoffUrl("a.b.c"));
  assert.equal(u.origin + u.pathname, "https://hq.lesaruss.ai/api/shell/sso");
  assert.equal(u.searchParams.get("lrsso"), "a.b.c");
  assert.equal(u.searchParams.get("next"), "/new/branddesk/geekfon-society");
});

test("quiet check conditions", () => {
  assert.ok(L.shouldQuietCheck(base));
  assert.ok(L.shouldQuietCheck({ ...base, hostname: "www.geekfon.ai", pathname: "/roxanne" }));
  assert.ok(!L.shouldQuietCheck({ ...base, hasSession: true }));
  assert.ok(!L.shouldQuietCheck({ ...base, quietFlag: "1" }));
  assert.ok(!L.shouldQuietCheck({ ...base, inFrame: true }));
  assert.ok(!L.shouldQuietCheck({ ...base, pathname: "/auth/lesaruss" }));
  assert.ok(!L.shouldQuietCheck({ ...base, pathname: "/auth/sso" }));
  assert.ok(!L.shouldQuietCheck({ ...base, hostname: "localhost" }));
  for (const ua of ["Googlebot/2.1", "facebookexternalhit/1.1", "Mozilla/5.0 HeadlessChrome/131", "Slackbot-LinkExpanding", "Chrome-Lighthouse", "", null]) {
    assert.ok(!L.shouldQuietCheck({ ...base, userAgent: ua }), String(ua));
  }
});

test("safeBack keeps same-site paths, never /auth", () => {
  assert.equal(L.safeBack("/roxanne?x=1#y"), "/roxanne?x=1#y");
  assert.equal(L.safeBack("//evil.com"), null);
  assert.equal(L.safeBack("https://evil.com"), null);
  assert.equal(L.safeBack("/auth/lesaruss"), null);
  assert.equal(L.safeBack(null), null);
});
