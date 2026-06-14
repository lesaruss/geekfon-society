export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.02em" }}>GeekFon Society</h1>
      <p style={{ color: "var(--lr-text-75)", marginTop: 12 }}>
        Next.js platform foundation. Artist pages render from data; members and admins enter via Passport.
      </p>
      <ul style={{ marginTop: 24, lineHeight: 2 }}>
        <li><a style={{ color: "var(--rx-text)", fontWeight: 800 }} href="/roxanne">/roxanne — data-driven artist page</a></li>
        <li><a style={{ color: "var(--rx-text)", fontWeight: 800 }} href="/passport">/passport — member + admin access</a></li>
      </ul>
    </main>
  );
}
