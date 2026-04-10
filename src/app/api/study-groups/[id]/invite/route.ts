import { NextRequest, NextResponse } from "next/server";
import { readCookie, verifySession } from "@/server/auth/session";
import { createStudyGroupInvite } from "@/server/db/studyGroups";

type Params = { params: Promise<{ id: string }> };

function getUser(req: NextRequest) {
  const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
  return verifySession(token);
}

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = getUser(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const invite = await createStudyGroupInvite({ groupId: id, ownerGoogleSub: user.sub });

    if (!invite) {
      return NextResponse.json({ success: false, error: "Only owner can create invite" }, { status: 403 });
    }

    const origin = req.nextUrl.origin;
    const inviteLink = `${origin}/dashboard/study-group?invite=${invite.token}`;

    return NextResponse.json({ success: true, data: { inviteToken: invite.token, inviteLink } });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
