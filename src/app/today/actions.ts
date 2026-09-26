"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReflectionState = { error?: string; saved?: boolean };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function readDay(fd: FormData) {
  const day = String(fd.get("day") ?? "");
  if (!ISO_DAY.test(day)) throw new Error("Invalid day");
  return day;
}

export async function saveReflection(_: ReflectionState, fd: FormData): Promise<ReflectionState> {
  const day = readDay(fd);
  // One line, max 280 characters; empty clears it.
  const text = String(fd.get("reflection") ?? "").replace(/\s+/g, " ").trim().slice(0, 280);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "Your session has expired. Please sign in again." };

  const { error } = await supabase
    .from("daily_thoughts")
    .update({ reflection: text || null })
    .eq("user_id", userId)
    .eq("day", day);
  if (error) return { error: error.message };

  revalidatePath("/today");
  return { saved: true };
}

export async function markDone(fd: FormData) {
  const day = readDay(fd);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return;

  await supabase
    .from("daily_thoughts")
    .update({ completed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("day", day)
    .is("completed_at", null);

  revalidatePath("/today");
}
