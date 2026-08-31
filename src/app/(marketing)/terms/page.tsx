import { LegalPage } from '../_components/LegalPage';

export const metadata = { title: 'Terms of Service — EduCore' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 31, 2026">
      <p>
        Welcome to EduCore. By accessing or using our platform, you agree to be bound by these
        Terms of Service. Please read them carefully.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By creating an account or using EduCore, you confirm that you have read, understood, and
        agreed to these Terms. If you do not agree, please do not use the service.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 13 years old to create an account. Users under 18 must have parental
        or guardian consent, and school-managed accounts are governed by the institution's agreement.
      </p>

      <h2>3. User Accounts</h2>
      <ul>
        <li>You are responsible for maintaining the confidentiality of your credentials.</li>
        <li>You agree to provide accurate and up-to-date information.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Upload unlawful, harmful, or infringing content.</li>
        <li>Attempt to disrupt or compromise the platform's security.</li>
        <li>Impersonate another person or misrepresent your affiliation.</li>
      </ul>

      <h2>5. Content Ownership</h2>
      <p>
        You retain ownership of content you upload. By submitting content, you grant EduCore a
        non-exclusive, worldwide license to host, display, and process it as needed to operate the service.
      </p>

      <h2>6. Termination</h2>
      <p>
        We may suspend or terminate your access if you violate these Terms. You may also delete
        your account at any time from your account settings.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        The service is provided "as is" without warranties of any kind. EduCore is not liable for
        indirect or consequential damages arising from use of the platform.
      </p>

      <h2>8. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the service after changes
        constitutes acceptance of the revised Terms.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these Terms? Email <a href="mailto:legal@educore.app">legal@educore.app</a>.
      </p>
    </LegalPage>
  );
}