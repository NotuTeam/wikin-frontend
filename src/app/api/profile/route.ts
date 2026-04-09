import { NextRequest, NextResponse } from "next/server";
import {
  getSessionCookie,
  readCookie,
  signSession,
  verifySession,
} from "@/server/auth/session";
import { deleteCloudinaryAssetFromUrl } from "@/server/cloudinary";
import { getUserByGoogleSub, updateUserProfile } from "@/server/db/users";

type ProfileBody = {
  name?: string;
  picture?: string | null;
};

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
}

export async function GET(req: NextRequest) {
  try {
    const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
    const user = verifySession(token);

    if (!user) return unauthorized();

    const dbUser = await getUserByGoogleSub(user.sub);
    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          sub: dbUser.googleSub,
          email: dbUser.email,
          name: dbUser.name,
          picture: dbUser.picture || undefined,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
    const user = verifySession(token);

    if (!user) return unauthorized();

    const body = (await req.json()) as ProfileBody;
    const name = body.name?.trim();
    const picture = typeof body.picture === "string" ? body.picture.trim() : null;

    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json(
        { success: false, error: "Name must be between 2 and 60 characters" },
        { status: 400 },
      );
    }

    const existingUser = await getUserByGoogleSub(user.sub);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const nextPicture = picture || null;
    const previousPicture = existingUser.picture || null;

    if (previousPicture && previousPicture !== nextPicture) {
      await deleteCloudinaryAssetFromUrl(previousPicture);
    }

    const updated = await updateUserProfile(user.sub, {
      name,
      picture: nextPicture,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const nextSessionToken = signSession({
      sub: updated.googleSub,
      email: updated.email,
      name: updated.name,
      picture: updated.picture || undefined,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          sub: updated.googleSub,
          email: updated.email,
          name: updated.name,
          picture: updated.picture || undefined,
        },
      },
    });

    response.headers.set("Set-Cookie", getSessionCookie(nextSessionToken));

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
