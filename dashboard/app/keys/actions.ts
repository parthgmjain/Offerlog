"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { createKey, revokeKey } from "@/lib/keys";
import { getDashboardPool } from "@/lib/db";

export interface CreateKeyState {
  token?: string;
  name?: string;
  error?: string;
}

/** Every action checks the session itself, because server actions are reachable by direct POST. */
export async function createKeyAction(_prev: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const session = await auth0.getSession();
  if (!session) {
    return { error: "Please log in again." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 60) {
    return { error: "Name must be 1 to 60 characters." };
  }

  const { token, row } = await createKey(getDashboardPool(), { userId: session.user.sub, name });
  revalidatePath("/keys");
  return { token, name: row.name };
}

export async function revokeKeyAction(formData: FormData): Promise<void> {
  const session = await auth0.getSession();
  if (!session) {
    return;
  }

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  await revokeKey(getDashboardPool(), session.user.sub, id);
  revalidatePath("/keys");
}
