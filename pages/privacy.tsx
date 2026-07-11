export default function PrivacyPolicy() {
  return (
    <>
      <style>{`
        html, body {
          background-color: rgb(2, 12, 10) !important;
          color: rgb(232, 232, 232) !important;
          font-family: Montserrat, sans-serif !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        main {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background-image: url("https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/geekfon-media/city-backgrounds/orlando-desktop-cropped.png");
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          position: relative;
          color: rgb(232, 232, 232) !important;
        }

        main::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(2, 12, 10, 0.85);
          z-index: 1;
        }

        main > div {
          position: relative;
          z-index: 2;
          max-width: 48rem;
          text-align: center;
          color: rgb(232, 232, 232) !important;
        }

        h1 {
          color: #f69820 !important;
          font-size: 3rem !important;
          font-weight: bold !important;
          margin-bottom: 0.5rem !important;
          text-align: center !important;
        }

        .subtitle {
          color: rgba(232, 232, 232, 0.7) !important;
          font-size: 0.875rem !important;
          margin-bottom: 3rem !important;
        }

        .content {
          text-align: left !important;
          space-y: 3rem !important;
        }

        section {
          margin-bottom: 3rem !important;
        }

        h2 {
          color: #f69820 !important;
          font-size: 1.5rem !important;
          font-weight: bold !important;
          margin-bottom: 1.5rem !important;
        }

        h3 {
          color: rgba(232, 232, 232, 0.95) !important;
          font-size: 1.125rem !important;
          font-weight: bold !important;
          margin-bottom: 0.5rem !important;
        }

        p {
          color: rgba(232, 232, 232, 0.9) !important;
          line-height: 1.7 !important;
          margin-bottom: 1rem !important;
        }

        ul {
          color: rgba(232, 232, 232, 0.85) !important;
          list-style-type: disc !important;
          margin-left: 1.5rem !important;
          margin-bottom: 1rem !important;
        }

        li {
          color: rgba(232, 232, 232, 0.85) !important;
          line-height: 1.6 !important;
          margin-bottom: 0.75rem !important;
        }

        .contact-box {
          background-color: rgba(246, 152, 32, 0.1) !important;
          border: 1px solid rgba(246, 152, 32, 0.3) !important;
          padding: 1.5rem !important;
          border-radius: 0.5rem !important;
          margin-top: 1.5rem !important;
        }

        .contact-box p {
          margin-bottom: 0.5rem !important;
          color: rgba(232, 232, 232, 0.85) !important;
        }

        .contact-box p:first-child {
          font-weight: bold !important;
          color: rgba(232, 232, 232, 0.95) !important;
        }

        footer {
          position: relative;
          z-index: 10;
          border-top: 1px solid rgba(232, 232, 232, 0.1);
          padding: 2rem 1rem;
          text-align: center;
          color: rgba(232, 232, 232, 0.6) !important;
          background-color: rgba(2, 12, 10, 0.95);
        }

        footer p {
          font-size: 0.875rem !important;
          color: rgba(232, 232, 232, 0.6) !important;
        }
      `}</style>

      <main>
        <div>
          <h1>Privacy Policy</h1>
          <p className="subtitle">Last updated: July 2026</p>

          <div className="content">
            <section>
              <h2>1. Introduction</h2>
              <p>
                GeekFon Society ("we," "us," or "our") operates the GeekFon Society mobile application (the "App") and website. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
              </p>
            </section>

            <section>
              <h2>2. Information We Collect</h2>
              <div>
                <h3>Account Information</h3>
                <p>
                  When you create an account, we collect information such as your email address, name, and profile information you choose to provide.
                </p>
              </div>
              <div>
                <h3>Payment Information</h3>
                <p>
                  Payment information is processed securely through RevenueCat and Stripe. We do not directly store credit card or payment details—these are handled by our payment processors in compliance with PCI DSS standards.
                </p>
              </div>
              <div>
                <h3>Usage Data</h3>
                <p>
                  We collect information about how you interact with the App, including content viewed, features used, and engagement metrics. This helps us improve the service.
                </p>
              </div>
              <div>
                <h3>Device Information</h3>
                <p>
                  We collect device type, operating system, app version, and unique device identifiers to provide and maintain the App.
                </p>
              </div>
            </section>

            <section>
              <h2>3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul>
                <li>Provide, operate, and maintain the App</li>
                <li>Process transactions and send related information</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect and prevent fraudulent transactions and other illegal activities</li>
                <li>Personalize and improve your experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2>4. Third-Party Service Providers</h2>
              <p>We use the following third-party services:</p>
              <ul>
                <li><strong>RevenueCat:</strong> For in-app subscription and purchase management</li>
                <li><strong>Stripe:</strong> For payment processing</li>
                <li><strong>Vercel:</strong> For hosting and content delivery</li>
                <li><strong>Supabase:</strong> For database and authentication services</li>
              </ul>
              <p>
                These providers have their own privacy policies governing their use of your data. We encourage you to review their privacy practices.
              </p>
            </section>

            <section>
              <h2>5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is completely secure.
              </p>
            </section>

            <section>
              <h2>6. Your Rights</h2>
              <p>Depending on your location, you may have the right to:</p>
              <ul>
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Opt-out of marketing communications</li>
                <li>Data portability</li>
              </ul>
              <p>
                To exercise these rights, please contact us at the address provided below.
              </p>
            </section>

            <section>
              <h2>7. Retention</h2>
              <p>
                We retain personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. You may request deletion of your account and associated data at any time.
              </p>
            </section>

            <section>
              <h2>8. Children's Privacy</h2>
              <p>
                The App is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete such information promptly.
              </p>
            </section>

            <section>
              <h2>9. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by updating the "Last updated" date and, where appropriate, by providing notice within the App.
              </p>
            </section>

            <section>
              <h2>10. Contact Us</h2>
              <p>If you have questions about this Privacy Policy or our privacy practices, please contact us at:</p>
              <div className="contact-box">
                <p>LESARUSS Inc.</p>
                <p>Email: contact@lesaruss.com</p>
                <p>Website: https://geekfon.ai</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer>
        <p>&copy; 2024 LESARUSS Inc. All rights reserved.</p>
      </footer>
    </>
  );
}