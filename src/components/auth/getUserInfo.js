import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getUserInfo() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const user = session.user;
  const profile = user.username ? { username: user.username, id: user.id } : null;

  return { user, profile };
}
