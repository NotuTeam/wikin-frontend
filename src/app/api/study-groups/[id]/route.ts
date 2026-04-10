import { NextRequest, NextResponse } from "next/server";
import { readCookie, verifySession } from "@/server/auth/session";
import {
  deleteStudyGroup,
  getStudyGroupDetail,
  kickStudyGroupMember,
  updateStudyGroup,
} from "@/server/db/studyGroups";

type Params = { params: Promise<{ id: string }> };

function getUser(req: NextRequest) {
  const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
  return verifySession(token);
}

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = getUser(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const examTypeRaw = req.nextUrl.searchParams.get("examType") || "ielts";
    const examType = examTypeRaw === "toefl" ? "toefl" : "ielts";

    const detail = await getStudyGroupDetail({
      groupId: id,
      userGoogleSub: user.sub,
      examType,
    });

    if (!detail) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: detail });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = getUser(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const body = (await req.json()) as { name?: string; description?: string; picture?: string };

    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: "Group name is required" }, { status: 400 });
    }

    const ok = await updateStudyGroup({
      groupId: id,
      ownerGoogleSub: user.sub,
      name: body.name,
      description: body.description,
      picture: body.picture,
    });

    if (!ok) {
      return NextResponse.json({ success: false, error: "Only owner can update this group" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = getUser(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const memberGoogleSub = req.nextUrl.searchParams.get("memberGoogleSub")?.trim();

    if (memberGoogleSub) {
      const kicked = await kickStudyGroupMember({
        groupId: id,
        ownerGoogleSub: user.sub,
        memberGoogleSub,
      });

      if (!kicked) {
        return NextResponse.json({ success: false, error: "Failed to kick member" }, { status: 403 });
      }

      return NextResponse.json({ success: true, data: { kicked: true } });
    }

    const ok = await deleteStudyGroup({
      groupId: id,
      ownerGoogleSub: user.sub,
    });

    if (!ok) {
      return NextResponse.json({ success: false, error: "Only owner can delete this group" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
