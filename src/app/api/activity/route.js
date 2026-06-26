import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const activities = await prisma.userDailyActivity.findMany({
    where: {
      userId: session.user.id,
      activityDate: { gte: oneYearAgo },
    },
    select: { activityDate: true },
    orderBy: { activityDate: "asc" },
  });

  const activityMap = activities.map((a) => ({
    date: a.activityDate.toISOString().split("T")[0],
    count: 1,
  }));

  return NextResponse.json({ activity: activityMap });
}
