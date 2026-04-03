import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <nav className="land-nav">
        <div className="land-nav-inner">
          <Link to="/welcome" className="land-logo">
            <span className="land-logo-icon">&#x2728;</span>
            <span className="land-logo-text">ChoreMax</span>
          </Link>
          <div className="land-nav-links">
            <Link to="/welcome" className="land-nav-login">&larr; Back</Link>
          </div>
        </div>
      </nav>

      <div className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <section>
          <h2>1. Introduction</h2>
          <p>ChoreMax ("we", "our", "us") is committed to protecting the privacy of our users, including children. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our family chore management application.</p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <h3>Account Information</h3>
          <p>When you create an account, we collect your name, email address, and a password (stored securely as a hash). We do not collect or store passwords in plain text.</p>

          <h3>Family Information</h3>
          <p>You may provide information about your children including their first names, avatars (selected from built-in options), and age-appropriate chore assignments. We do not collect children's email addresses, dates of birth, or other sensitive personal information.</p>

          <h3>Usage Data</h3>
          <p>We collect information about chore completions, savings transactions, meal plans, and calendar events that you create within the application. This data is necessary to provide the core functionality of the service.</p>

          <h3>Waitlist Information</h3>
          <p>If you join our waitlist, we collect your name, email address, and feature preference. This information is used solely to notify you about ChoreMax updates and launch information.</p>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve the ChoreMax application</li>
            <li>Track chore completions and manage virtual currency/savings</li>
            <li>Display family calendars and meal plans</li>
            <li>Authenticate your account and protect parent-only features</li>
            <li>Send you important service updates (e.g., security notices)</li>
            <li>Communicate about new features or changes to the service</li>
          </ul>
        </section>

        <section>
          <h2>4. Children's Privacy</h2>
          <p>ChoreMax is designed with children's privacy as a priority:</p>
          <ul>
            <li><strong>No child accounts:</strong> Children do not create accounts or log in. They access the app through their parent's authenticated session by tapping their avatar.</li>
            <li><strong>Minimal data:</strong> We only store a child's first name, chosen avatar, and chore/savings activity.</li>
            <li><strong>Parent control:</strong> All child data is managed entirely by the parent account holder.</li>
            <li><strong>No advertising:</strong> We do not show advertisements to children or use their data for advertising purposes.</li>
            <li><strong>No third-party tracking:</strong> We do not use analytics or tracking tools that collect data from children.</li>
          </ul>
        </section>

        <section>
          <h2>5. Third-Party Services</h2>
          <p>ChoreMax integrates with the following third-party services at your discretion:</p>
          <ul>
            <li><strong>Google Calendar:</strong> If you choose to connect your Google Calendar, we access your calendar data using OAuth 2.0 authentication. We store encrypted access tokens to sync events. You can disconnect at any time.</li>
            <li><strong>iCal Feeds:</strong> If you add iCal feed URLs, we periodically fetch calendar data from those URLs. No authentication credentials are shared.</li>
          </ul>
          <p>We do not sell, rent, or share your personal information with third parties for their marketing purposes.</p>
        </section>

        <section>
          <h2>6. Data Security</h2>
          <p>We implement appropriate security measures including:</p>
          <ul>
            <li>Passwords hashed using bcrypt</li>
            <li>OAuth tokens encrypted at rest using Fernet symmetric encryption</li>
            <li>HTTPS encryption for all data in transit</li>
            <li>HTTP-only secure cookies for session management</li>
            <li>Parent PIN protection for sensitive settings</li>
            <li>Rate limiting on authentication endpoints</li>
          </ul>
        </section>

        <section>
          <h2>7. Data Retention</h2>
          <p>We retain your account data for as long as your account is active. You may request deletion of your account and all associated data at any time by contacting us. Upon deletion, all data including children's information, chore history, savings records, and calendar connections will be permanently removed.</p>
        </section>

        <section>
          <h2>8. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you and your family</li>
            <li>Correct any inaccurate information</li>
            <li>Request deletion of your account and data</li>
            <li>Export your data in a portable format</li>
            <li>Withdraw consent for optional data processing</li>
            <li>Disconnect third-party calendar integrations</li>
          </ul>
        </section>

        <section>
          <h2>9. Cookies</h2>
          <p>ChoreMax uses a single essential HTTP-only cookie for authentication purposes. We do not use tracking cookies, advertising cookies, or analytics cookies.</p>
        </section>

        <section>
          <h2>10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised "Last updated" date.</p>
        </section>

        <section>
          <h2>11. Contact Us</h2>
          <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us at <strong>privacy@choremax.com</strong>.</p>
        </section>
      </div>

      <footer className="legal-footer">
        <Link to="/welcome">&larr; Back to Home</Link>
        <span>&copy; {new Date().getFullYear()} ChoreMax</span>
        <Link to="/terms">Terms of Service</Link>
      </footer>
    </div>
  )
}
