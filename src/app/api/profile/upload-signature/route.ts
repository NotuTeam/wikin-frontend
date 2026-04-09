import { NextRequest, NextResponse } from "next/server";
import { readCookie, verifySession } from "@/server/auth/session";
import { getCloudinaryConfig, signCloudinaryParams } from "@/server/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
    const user = verifySession(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { cloudName, apiKey, uploadFolder } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = uploadFolder;
    const public_id = `${user.sub}-${Date.now()}`;

    const signature = signCloudinaryParams({ folder, public_id, timestamp });

    return NextResponse.json({
      success: true,
      data: {
        cloudName,
        apiKey,
        folder,
        public_id,
        timestamp,
        signature,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
