export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mb-8 text-gray-600">Last updated: July 2026</p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">1. Introduction</h2>
            <p>
              GeekFon Society ("we," "us," or "our") operates the GeekFon Society mobile application (the "App") and website. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Account Information</h3>
                <p>
                  When you create an account, we collect information such as your email address, name, and profile information you choose to provide.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Payment Information</h3>
                <p>
                  Payment information is processed securely through RevenueCat and Stripe. We do not directly store credit card or payment details—these are handled by our payment processors in compliance with PCI DSS standards.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Usage Data</h3>
                <p>
                  We collect information about how you interact with the App, including content viewed, features used, and engagement metrics. This helps us improve the service.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Device Information</h3>
                <p>
                  We collect device type, operating system, app version, and unique device identifiers to provide and maintain the App.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="mt-2 list-inside space-y-2">
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
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">4. Third-Party Service Providers</h2>
            <p>We use the following third-party services:</p>
            <ul className="mt-2 list-inside space-y-2">
              <li>
                <strong>RevenueCat:</strong> For in-app subscription and purchase management
              </li>
              <li>
                <strong>Stripe:</strong> For payment processing
              </li>
              <li>
                <strong>Vercel:</strong> For hosting and content delivery
              </li>
              <li>
                <strong>Supabase:</strong> For database and authentication services
              </li>
            </ul>
            <p className="mt-4">
              These providers have their own privacy policies governing their use of your data. We encourage you to review their privacy practices.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is completely secure.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">6. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="mt-2 list-inside space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt-out of marketing communications</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at the address provided below.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">7. Retention</h2>
            <p>
              We retain personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">8. Children's Privacy</h2>
            <p>
              The App is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete such information promptly.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">9. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by updating the "Last updated" date and, where appropriate, by providing notice within the App.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">10. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or our privacy practices, please contact us at:</p>
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <p className="font-semibold">LESARUSS Inc.</p>
              <p>Email: contact@lesaruss.com</p>
              <p>Website: https://geekfon.ai</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}