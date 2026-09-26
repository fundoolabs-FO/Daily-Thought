"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { markDone, saveReflection } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-secondary" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function ReflectionForm({ day, initial }: { day: string; initial: string | null }) {
  const [state, action] = useActionState(saveReflection, {});
  return (
    <form action={action} className="reflection">
      <input type="hidden" name="day" value={day} />
      <label htmlFor="reflection" className="label">
        Reflection <span className="muted">(optional, one line)</span>
      </label>
      <div className="reflection-row">
        <input
          id="reflection"
          name="reflection"
          type="text"
          maxLength={280}
          defaultValue={initial ?? ""}
          placeholder="What does this mean for you today?"
          autoComplete="off"
          enterKeyHint="done"
        />
        <SaveButton />
      </div>
      <p className="small muted" aria-live="polite">
        {state.error ? <span className="text-error">{state.error}</span> : state.saved ? "Saved." : " "}
      </p>
    </form>
  );
}

function DoneButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-wide" disabled={pending}>
      {pending ? "Marking…" : "Mark today as done"}
    </button>
  );
}

export function DoneForm({ day, completedAt }: { day: string; completedAt: string | null }) {
  if (completedAt) {
    const time = new Date(completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return (
      <p className="done-badge" role="status">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
        </svg>
        Done for today · {time}
      </p>
    );
  }
  return (
    <form action={markDone}>
      <input type="hidden" name="day" value={day} />
      <DoneButton />
    </form>
  );
}
