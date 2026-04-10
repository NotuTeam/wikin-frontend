import { NextRequest, NextResponse } from "next/server";
import { readCookie, verifySession } from "@/server/auth/session";
import {
  createStudyGroup,
  listStudyGroupsForUser,
  joinStudyGroupByToken,
} from "@/server/db/studyGroups";

function getUser(req: NextRequest) {
  const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
  return verifySession(token);
}

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  try {
    const user = getUser(req);
    if (!user) return unauthorized();

    const groups = await listStudyGroupsForUser(user.sub);
    return NextResponse.json({ success: true, data: { groups } });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUser(req);
    if (!user) return unauthorized();

    const body = (await req.json()) as {
      name?: string;
      description?: string;
      picture?: string;
      inviteToken?: string;
    };

    if (body.inviteToken) {
      const joined = await joinStudyGroupByToken({
        token: body.inviteToken,
        userGoogleSub: user.sub,
      });

      if (!joined) {
        return NextResponse.json({ success: false, error: "Invalid invitation" }, { status: 400 });
      }

      return NextResponse.json({ success: true, data: { groupId: joined.groupId } });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: "Group name is required" }, { status: 400 });
    }

    const created = await createStudyGroup({
      ownerGoogleSub: user.sub,
      name: body.name,
      description: body.description,
      picture: body.picture,
    });

    return NextResponse.json({ success: true, data: { id: created.id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
