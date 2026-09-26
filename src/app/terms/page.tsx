import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="26 September 2026">
      <p>By using Daily Thought you agree to these terms.</p>

      <h2>The service</h2>
      <p>
        Daily Thought offers a short daily thought for reflection, with optional notes and a
        streak. The thoughts are general encouragement, not professional, medical or psychological
        advice.
      </p>

      <h2>Your account</h2>
      <p>
        Keep your sign-in details safe; you are responsible for activity on your account. Please
        don&apos;t misuse the service, for example by trying to access other people&apos;s data or
        disrupting the app.
      </p>

      <h2>Your content</h2>
      <p>
        Your reflections belong to you. We store them only to show them back to you, as described
        in the <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Availability</h2>
      <p>
        We aim to keep the app running but provide it &quot;as is&quot;, without guarantees. We may
        change or discontinue features, and we may update these terms; the date above shows the
        latest version.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
