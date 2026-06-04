"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createDeck(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Введите название колоды" };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("decks")
    .insert({ name: trimmed, user_id: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/decks");
  return { id: data.id as string };
}

export async function renameDeck(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Введите название колоды" };

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("decks")
    .update({ name: trimmed })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/decks");
  return { ok: true };
}

export async function deleteDeck(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("decks").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/decks");
  return { ok: true };
}
