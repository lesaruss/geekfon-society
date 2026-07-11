export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Animated Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: 'url("https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-media/city-backgrounds/orlando-desktop-cropped.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          animation: 'slideBackground 20s linear infinite',
        }}
      >
        {/* Dark Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(2, 12, 10, 0.85)',
        }}></div>
      </div>

      <style>{`
        @keyframes slideBackground {
          0% { background-position: center; }
          50% { background-position: calc(center + 20px); }
          100% { background-position: center; }
        }
      `}</style>

      {/* Header */}
      <header className="relative z-10 border-b" style={{ borderColor: 'rgba(232, 232, 232, 0.1)' }}>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <a href="/" className="text-2xl font-bold tracking-wide" style={{ color: 'rgb(232, 232, 232)' }}>
              <span style={{ color: '#f69820' }}>GEEK</span><span>FON</span>
            </a>
            <nav className="hidden sm:flex gap-8">
              <a href="/#overview" className="text-sm hover:text-orange-400 transition-colors" style={{ color: 'rgba(232, 232, 232, 0.8)' }}>Overview</a>
              <a href="/roster" className="text-sm hover:text-orange-400 transition-colors" style={{ color: 'rgba(232, 232, 232, 0.8)' }}>Roster</a>
              <a href="/welcome" className="text-sm hover:text-orange-400 transition-colors" style={{ color: 'rgba(232, 232, 232, 0.8)' }}>Tour</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="relative z-10 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl text-center">
          <h1 className="text-5xl font-bold mb-2" style={{ color: '#f69820' }}>Privacy Policy</h1>
          <p className="mb-12 text-sm" style={{ color: 'rgba(232, 232, 232, 0.7)' }}>Last updated: July 2026</p>

          <div className="space-y-12 text-left">
          <section>
            <h2 className="mb-4 text-2xl font-bold mb-6" style={{ color: '#f69820' }}>1. Introduction</h2>
            <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.9)' }}>
              GeekFon Society ("we," "us," or "our") operates the GeekFon Society mobile application (the "App") and website. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
            </p>
          </section>

          <section>
            <h2 className="mb-6 text-2xl font-bold" style={{ color: '#f69820' }}>2. Information We Collect</h2>
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 font-bold text-lg" style={{ color: 'rgba(232, 232, 232, 0.95)' }}>Account Information</h3>
                <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.85)' }}>
                  When you create an account, we collect information such as your email address, name, and profile information you choose to provide.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-bold text-lg" style={{ color: 'rgba(232, 232, 232, 0.95)' }}>Payment Information</h3>
                <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.85)' }}>
                  Payment information is processed securely through RevenueCat and Stripe. We do not directly store credit card or payment details—these are handled by our payment processors in compliance with PCI DSS standards.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-bold text-lg" style={{ color: 'rgba(232, 232, 232, 0.95)' }}>Usage Data</h3>
                <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.85)' }}>
                  We collect information about how you interact with the App, including content viewed, features used, and engagement metrics. This helps us improve the service.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-bold text-lg" style={{ color: 'rgba(232, 232, 232, 0.95)' }}>Device Information</h3>
                <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.85)' }}>
                  We collect device type, operating system, app version, and unique device identifiers to provide and maintain the App.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold mb-6" style={{ color: '#f69820' }}>3. How We Use Your Information</h2>
            <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.9)', marginBottom: '1rem' }}>We use your information to:</p>
            <ul className="space-y-3 list-disc list-inside">
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Provide, operate, and maintain the App</li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Process transactions and send related information</li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Send promotional communications (with your consent)</li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Monitor and analyze trends, usage, and activities</li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Detect and prevent fraudulent transactions and other illegal activities</li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Personalize and improve your experience</li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-6 text-2xl font-bold" style={{ color: '#f69820' }}>4. Third-Party Service Providers</h2>
            <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.9)', marginBottom: '1rem' }}>We use the following third-party services:</p>
            <ul className="space-y-3 list-disc list-inside">
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>
                <strong>RevenueCat:</strong> For in-app subscription and purchase management
              </li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>
                <strong>Stripe:</strong> For payment processing
              </li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>
                <strong>Vercel:</strong> For hosting and content delivery
              </li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>
                <strong>Supabase:</strong> For database and authentication services
              </li>
            </ul>
            <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.85)', marginTop: '1.5rem' }}>
              These providers have their own privacy policies governing their use of your data. We encourage you to review their privacy practices.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold mb-6" style={{ color: '#f69820' }}>5. Data Security</h2>
            <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.9)' }}>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is completely secure.
            </p>
          </section>

          <section>
            <h2 className="mb-6 text-2xl font-bold" style={{ color: '#f69820' }}>6. Your Rights</h2>
            <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.9)', marginBottom: '1rem' }}>Depending on your location, you may have the right to:</p>
            <ul className="space-y-3 list-disc list-inside">
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Access your personal information</li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Correct inaccurate information</li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Request deletion of your information</li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Opt-out of marketing communications</li>
              <li style={{ color: 'rgba(232, 232, 232, 0.85)', lineHeight: '1.6' }}>Data portability</li>
            </ul>
            <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.85)', marginTop: '1.5rem' }}>
              To exercise these rights, please contact us at the address provided below.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold mb-6" style={{ color: '#f69820' }}>7. Retention</h2>
            <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.9)' }}>
              We retain personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold mb-6" style={{ color: '#f69820' }}>8. Children's Privacy</h2>
            <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.9)' }}>
              The App is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete such information promptly.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold mb-6" style={{ color: '#f69820' }}>9. Changes to This Privacy Policy</h2>
            <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.9)' }}>
              We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by updating the "Last updated" date and, where appropriate, by providing notice within the App.
            </p>
          </section>

          <section>
            <h2 className="mb-6 text-2xl font-bold" style={{ color: '#f69820' }}>10. Contact Us</h2>
            <p style={{ lineHeight: '1.7', color: 'rgba(232, 232, 232, 0.9)', marginBottom: '1.5rem' }}>If you have questions about this Privacy Policy or our privacy practices, please contact us at:</p>
            <div className="p-6 rounded-lg" style={{ backgroundColor: 'rgba(246, 152, 32, 0.1)', border: '1px solid rgba(246, 152, 32, 0.3)' }}>
              <p className="font-bold" style={{ color: 'rgba(232, 232, 232, 0.95)' }}>LESARUSS Inc.</p>
              <p style={{ color: 'rgba(232, 232, 232, 0.85)' }}>Email: contact@lesaruss.com</p>
              <p style={{ color: 'rgba(232, 232, 232, 0.85)' }}>Website: https://geekfon.ai</p>
            </div>
          </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t py-8 text-center" style={{ borderColor: 'rgba(232, 232, 232, 0.1)', color: 'rgba(232, 232, 232, 0.6)' }}>
        <p className="text-sm">&copy; 2024 LESARUSS Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}