import { Link } from 'react-router-dom'

export default function TermsOfService() {
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
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using ChoreMax ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>ChoreMax is a family organisation application that provides chore tracking, virtual currency management, meal planning, and calendar integration features. The Service is designed for use by parents/guardians and their children.</p>
        </section>

        <section>
          <h2>3. Account Registration</h2>
          <p>To use ChoreMax, you must create an account. You agree to:</p>
          <ul>
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Be responsible for all activity under your account</li>
            <li>Notify us immediately of any unauthorised access</li>
          </ul>
          <p>You must be at least 18 years old to create an account. By creating an account and adding children, you represent that you are the parent or legal guardian of those children.</p>
        </section>

        <section>
          <h2>4. Acceptable Use</h2>
          <p>You agree to use ChoreMax only for its intended purpose as a family organisation tool. You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorised access to other accounts</li>
            <li>Interfere with or disrupt the Service's infrastructure</li>
            <li>Upload malicious content or attempt to exploit vulnerabilities</li>
            <li>Use the Service to collect personal information about others</li>
            <li>Resell, redistribute, or sublicense the Service</li>
          </ul>
        </section>

        <section>
          <h2>5. Virtual Currency</h2>
          <p>ChoreMax includes a virtual currency system for educational and motivational purposes:</p>
          <ul>
            <li>Virtual currency has no real-world monetary value</li>
            <li>Virtual currency cannot be exchanged, transferred, or redeemed for real money</li>
            <li>Parents/guardians set the value and rules for their family's virtual currency</li>
            <li>We reserve the right to modify the virtual currency system at any time</li>
          </ul>
        </section>

        <section>
          <h2>6. Third-Party Integrations</h2>
          <p>ChoreMax offers integrations with third-party services such as Google Calendar. By connecting these services:</p>
          <ul>
            <li>You authorise ChoreMax to access and sync data as described in our Privacy Policy</li>
            <li>You acknowledge that third-party services are governed by their own terms</li>
            <li>We are not responsible for the availability or functionality of third-party services</li>
            <li>You may disconnect integrations at any time through your account settings</li>
          </ul>
        </section>

        <section>
          <h2>7. Data and Content</h2>
          <p>You retain ownership of all data you enter into ChoreMax, including family information, chore configurations, meal plans, and calendar events. By using the Service, you grant us a limited licence to store, process, and display this data solely for the purpose of providing the Service to you.</p>
        </section>

        <section>
          <h2>8. Service Availability</h2>
          <p>We strive to maintain high availability of ChoreMax but do not guarantee uninterrupted access. We may temporarily suspend the Service for maintenance, updates, or other operational reasons. We will make reasonable efforts to provide advance notice of planned downtime.</p>
        </section>

        <section>
          <h2>9. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law:</p>
          <ul>
            <li>ChoreMax is provided "as is" without warranties of any kind</li>
            <li>We are not liable for any indirect, incidental, or consequential damages</li>
            <li>Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim</li>
            <li>We are not responsible for data loss due to circumstances beyond our reasonable control</li>
          </ul>
        </section>

        <section>
          <h2>10. Termination</h2>
          <p>You may terminate your account at any time by contacting us. We may suspend or terminate your account if you violate these Terms. Upon termination, your data will be deleted in accordance with our Privacy Policy.</p>
        </section>

        <section>
          <h2>11. Changes to Terms</h2>
          <p>We may modify these Terms at any time. Material changes will be communicated through the Service or via email. Continued use of ChoreMax after changes constitutes acceptance of the updated Terms.</p>
        </section>

        <section>
          <h2>12. Governing Law</h2>
          <p>These Terms are governed by the laws of Australia. Any disputes arising from or relating to these Terms shall be resolved in the courts of New South Wales, Australia.</p>
        </section>

        <section>
          <h2>13. Contact</h2>
          <p>For questions about these Terms of Service, please contact us at <strong>legal@choremax.com</strong>.</p>
        </section>
      </div>

      <footer className="legal-footer">
        <Link to="/welcome">&larr; Back to Home</Link>
        <span>&copy; {new Date().getFullYear()} ChoreMax</span>
        <Link to="/privacy">Privacy Policy</Link>
      </footer>
    </div>
  )
}
