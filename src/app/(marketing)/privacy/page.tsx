import { LegalPage } from '../_components/LegalPage';

export const metadata = { title: 'Privacy Policy — EduCore' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 31, 2026">
      <p>
        EduCore respects your privacy. This policy explains what data we collect, how we use it,
        and your rights regarding it.
      </p>

      <h2>1. Information We Collect</h2>
      <h3>Account information</h3>
      <p>Name, email, role (admin, teacher, student), school affiliation, and password (hashed).</p>
      <h3>Learning data</h3>
      <p>Courses, assignments, submissions, grades, and progress records.</p>
      <h3>Usage data</h3>
      <p>Device, browser, IP address, and interaction logs to improve the service.</p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide and maintain the platform.</li>
        <li>To personalize learning experiences and analytics.</li>
        <li>To communicate updates, security notices, and support responses.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2>3. Sharing of Information</h2>
      <p>
        We do not sell your personal data. We may share information with:
      </p>
      <ul>
        <li>Your school or institution (for institution-managed accounts).</li>
        <li>Service providers who help us operate EduCore (under strict confidentiality).</li>
        <li>Authorities when required by law.</li>
      </ul>

      <h2>4. Data Security</h2>
      <p>
        We use industry-standard encryption in transit and at rest, along with access controls
        and regular audits to protect your data.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain your data as long as your account is active or as needed to provide the service.
        You can request deletion at any time.
      </p>

      <h2>6. Your Rights</h2>
      <ul>
        <li>Access, correct, or delete your personal data.</li>
        <li>Export your data in a portable format.</li>
        <li>Withdraw consent for optional processing.</li>
      </ul>

      <h2>7. Children's Privacy</h2>
      <p>
        For users under 13, we only collect data with verifiable parental or school consent, in
        accordance with applicable laws (COPPA, GDPR-K, etc.).
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We'll notify you of significant changes via email or an in-app notice.
      </p>

      <h2>9. Contact</h2>
      <p>
        For privacy questions, email <a href="mailto:privacy@educore.app">privacy@educore.app</a>.
      </p>
    </LegalPage>
  );
}