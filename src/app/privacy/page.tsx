import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="26 September 2026">
      <p>
        Daily Thought shows you one thought a day and lets you keep a short reflection and a streak.
        This page explains what we store and why.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Account details:</b> your email address, and if you sign in with Google, the name and
          profile picture Google shares with us. We never see your Google password.
        </li>
        <li>
          <b>Your practice:</b> which thought you were shown each day, your optional one-line
          reflections, and when you marked a day as done.
        </li>
        <li>
          <b>Your timezone</b>, stored in a cookie, so &quot;today&quot; matches your local day.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        Only to run the app: to sign you in, choose your daily thought, and show your reflections,
        streak and recent days. We do not sell your data, show ads, or share it with advertisers.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        We use essential cookies to keep you signed in and to remember your timezone. Your device
        also stores small preferences, such as whether you have already seen today&apos;s thought or
        dismissed the install banner, and cached pages so the app works offline. Signing out clears
        the cached pages.
      </p>

      <h2>Where it is stored</h2>
      <p>
        Your data is stored with Supabase (database and sign-in) and the app is hosted on Vercel.
        They process data on our behalf to run the service. Access to your records is limited to
        your own account.
      </p>

      <h2>Your choices</h2>
      <p>
        You can clear a reflection at any time by saving it empty. To delete your account and all
        of its data, or to get a copy of it, email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address you signed up
        with.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. If we
        change this policy, we will update the date above.
      </p>
    </LegalPage>
  );
}
