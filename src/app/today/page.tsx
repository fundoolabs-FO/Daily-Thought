import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SignOutButton } from "@/components/SignOutButton";
import { ThoughtModal } from "@/components/ThoughtModal";
import { TimezoneSync } from "@/components/TimezoneSync";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDay, isValidTimeZone, TZ_COOKIE } from "@/lib/tz";
import { DoneForm, ReflectionForm } from "./practice";

export const metadata: Metadata = { title: "Today" };

type TodayRow = {
  day: string;
  thought_id: number;
  body: string;
  author: string | null;
  reflection: string | null;
  completed_at: string | null;
};

type HistoryRow = {
  day: string;
  reflection: string | null;
  completed_at: string | null;
  thoughts: { body: string } | null;
};

export default async function TodayPage() {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  const timeZone = tz ? decodeURIComponent(tz) : undefined;

  // First ever visit on this device: learn the timezone before assigning a thought,
  // so the day is the user's local day rather than UTC.
  if (!isValidTimeZone(timeZone)) {
    return (
      <main className="page center-screen">
        <TimezoneSync refreshOnChange />
        <p className="muted">Preparing your thought…</p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login?next=/today");

  const { data: today, error } = await supabase
    .rpc("get_daily_thought", { p_tz: timeZone })
    .single<TodayRow>();

  if (error || !today) {
    return (
      <main className="page center-screen">
        <div className="card">
          <h1>Something went wrong</h1>
          <p className="muted">We couldn&apos;t load today&apos;s thought. {error?.message}</p>
          <a className="btn btn-primary" href="/today">
            Try again
          </a>
        </div>
      </main>
    );
  }

  const [{ data: streak }, { data: history }] = await Promise.all([
    supabase.rpc("get_streak", { p_tz: timeZone }),
    supabase
      .from("daily_thoughts")
      .select("day, reflection, completed_at, thoughts(body)")
      .eq("user_id", userId)
      .gte("day", addDays(today.day, -7))
      .lt("day", today.day)
      .order("day", { ascending: false })
      .overrideTypes<HistoryRow[], { merge: false }>(),
  ]);

  const byDay = new Map((history ?? []).map((row) => [row.day, row]));
  const lastSeven = Array.from({ length: 7 }, (_, i) => addDays(today.day, -(i + 1)));
  const streakCount = typeof streak === "number" ? streak : 0;
  const longDate = formatDay(today.day, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="app">
      <TimezoneSync refreshOnChange />
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden /> Daily Thought
        </span>
        <div className="topbar-actions">
          <span className="streak" title="Consecutive days marked as done">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M13.5.7s.7 2.6.7 4.7c0 2-1.3 3.7-3.4 3.7S7.3 7.4 7.3 5.4l.1-.4C5.2 7.5 4 10.7 4 14a8 8 0 0 0 16 0C20 8.6 17.4 3.8 13.5.7zM11.7 20c-1.8 0-3.2-1.4-3.2-3.1 0-1.6 1-2.8 2.8-3.1 1.8-.4 3.6-1.2 4.6-2.6.4 1.3.6 2.7.6 4.1 0 2.6-2.1 4.7-4.8 4.7z"
              />
            </svg>
            {streakCount} day{streakCount === 1 ? "" : "s"}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="page">
        <section className="card today" aria-labelledby="today-heading">
          <div className="today-head">
            <p id="today-heading" className="eyebrow">
              {longDate}
            </p>
            <ThoughtModal
              userId={userId}
              day={today.day}
              dayLabel={formatDay(today.day, { weekday: "long" })}
              body={today.body}
              author={today.author}
            />
          </div>
          <blockquote className="thought">{today.body}</blockquote>
          {today.author && <p className="thought-author">{today.author}</p>}

          <ReflectionForm key={today.day} day={today.day} initial={today.reflection} />
          <DoneForm day={today.day} completedAt={today.completed_at} />
        </section>

        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="section-title">
            Last 7 days
          </h2>
          <ol className="history">
            {lastSeven.map((day) => {
              const row = byDay.get(day);
              return (
                <li key={day} className={`history-item${row?.completed_at ? " is-done" : ""}`}>
                  <div className="history-date">
                    <span>{formatDay(day, { weekday: "short" })}</span>
                    <span className="muted small">{formatDay(day, { month: "short", day: "numeric" })}</span>
                  </div>
                  <div className="history-body">
                    {row?.thoughts ? (
                      <>
                        <p>{row.thoughts.body}</p>
                        {row.reflection && <p className="history-reflection">“{row.reflection}”</p>}
                      </>
                    ) : (
                      <p className="muted">No visit</p>
                    )}
                  </div>
                  <span
                    className="history-status"
                    aria-label={row?.completed_at ? "Done" : "Not done"}
                    title={row?.completed_at ? "Done" : "Not done"}
                  />
                </li>
              );
            })}
          </ol>
        </section>
      </main>

      <InstallPrompt />
    </div>
  );
}
