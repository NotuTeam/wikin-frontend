import crypto from "crypto";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getCloudinaryConfig() {
  return {
    cloudName: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: getRequiredEnv("CLOUDINARY_API_KEY"),
    apiSecret: getRequiredEnv("CLOUDINARY_API_SECRET"),
    uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || "wiqin/profiles",
  };
}

export function signCloudinaryParams(params: Record<string, string | number>) {
  const { apiSecret } = getCloudinaryConfig();
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${serialized}${apiSecret}`)
    .digest("hex");
}

function getPublicIdFromCloudinaryUrl(url: string, cloudName: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("res.cloudinary.com")) return null;
    if (!parsed.pathname.includes(`/${cloudName}/`)) return null;

    const marker = "/image/upload/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    const afterUpload = parsed.pathname.slice(markerIndex + marker.length);
    const segments = afterUpload.split("/").filter(Boolean);
    if (!segments.length) return null;

    const firstVersionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    const publicPath =
      firstVersionIndex >= 0
        ? segments.slice(firstVersionIndex + 1)
        : segments;

    if (!publicPath.length) return null;

    const last = publicPath[publicPath.length - 1] || "";
    const lastWithoutExt = last.replace(/\.[^.]+$/, "");
    publicPath[publicPath.length - 1] = lastWithoutExt;

    return publicPath.join("/");
  } catch {
    return null;
  }
}

export async function deleteCloudinaryAssetFromUrl(url?: string | null) {
  if (!url) return;

  const { cloudName, apiKey } = getCloudinaryConfig();
  const publicId = getPublicIdFromCloudinaryUrl(url, cloudName);

  if (!publicId) return;

  const timestamp = Math.floor(Date.now() / 1000);
  const invalidate = "true";
  const signature = signCloudinaryParams({
    invalidate,
    public_id: publicId,
    timestamp,
  });

  const body = new URLSearchParams({
    api_key: apiKey,
    public_id: publicId,
    timestamp: String(timestamp),
    signature,
    invalidate,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary delete failed: ${text}`);
  }
}
