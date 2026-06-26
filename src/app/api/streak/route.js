import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activities = await prisma.userDailyActivity.findMany({
    where: { userId: session.user.id },
    select: { activityDate: true },
    orderBy: { activityDate: "desc" },
  });

  if (activities.length === 0) return NextResponse.json({ streak: 0 });

  const toDateStr = (date) => date.toISOString().split("T")[0];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = toDateStr(today);
  const yesterdayStr = toDateStr(yesterday);

  const dateStrings = activities.map((a) => toDateStr(a.activityDate));
  const hasToday = dateStrings.includes(todayStr);
  const hasYesterday = dateStrings.includes(yesterdayStr);

  if (!hasToday && !hasYesterday) return NextResponse.json({ streak: 0 });

  let streak = 0;
  let currentDate = hasToday ? today : yesterday;

  for (const dateStr of dateStrings) {
    const expected = toDateStr(currentDate);
    if (dateStr === expected) {
      streak++;
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (dateStr < expected) {
      break;
    }
  }

  return NextResponse.json({ streak });
}
