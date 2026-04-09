"use client";

import { ChangeEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDashboardUser } from "@/components/organisms/DashboardShell";

type AuthUser = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

export default function ProfilePage() {
  const user = useDashboardUser();
  const [name, setName] = useState(user.name);
  const [picture, setPicture] = useState(user.picture || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser>(user);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/profile", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) return;
        const json = (await res.json()) as {
          success: boolean;
          data?: { user?: AuthUser };
        };

        if (json.success && json.data?.user) {
          setCurrentUser(json.data.user);
          setName(json.data.user.name || "");
          setPicture(json.data.user.picture || "");
        }
      } catch {}
    };

    loadProfile();
  }, []);

  const uploadToCloudinary = async (file: File) => {
    const signRes = await fetch("/api/profile/upload-signature", {
      method: "POST",
      credentials: "include",
    });

    const signJson = (await signRes.json()) as {
      success: boolean;
      error?: string;
      data?: {
        cloudName: string;
        apiKey: string;
        folder: string;
        public_id: string;
        timestamp: number;
        signature: string;
      };
    };

    if (!signRes.ok || !signJson.success || !signJson.data) {
      throw new Error(signJson.error || "Failed to sign upload request");
    }

    const { cloudName, apiKey, folder, public_id, timestamp, signature } =
      signJson.data;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", folder);
    formData.append("public_id", public_id);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    const uploadJson = (await uploadRes.json()) as {
      secure_url?: string;
      error?: { message?: string };
    };

    if (!uploadRes.ok || !uploadJson.secure_url) {
      throw new Error(uploadJson.error?.message || "Cloudinary upload failed");
    }

    return uploadJson.secure_url;
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File must be image");
      return;
    }

    setIsUploading(true);
    try {
      const secureUrl = await uploadToCloudinary(file);
      setPicture(secureUrl);
      toast.success("Upload image success, don't forget to save the changes");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          picture: picture || null,
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        data?: { user?: AuthUser };
      };

      if (!res.ok || !json.success || !json.data?.user) {
        throw new Error(json.error || "Failed to save profule");
      }

      setCurrentUser(json.data.user);
      setName(json.data.user.name || "");
      setPicture(json.data.user.picture || "");
      toast.success("Change Profile Success.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-neutral-300)] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--color-neutral-900)]">
              Edit Profile
            </h2>
            <p className="mt-1 text-sm text-[var(--color-neutral-500)]">
              Change your username and profile picture.
            </p>

            <div className="mt-6 flex items-center gap-4">
              {picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={picture}
                  alt="Profile"
                  className="h-20 w-20 rounded-full border border-[var(--color-neutral-300)] object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] text-xs text-[var(--color-neutral-500)]">
                  No Photo
                </div>
              )}

              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center rounded-[10px] border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]">
                  {isUploading ? "Uploading..." : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading || isSaving}
                  />
                </label>
                <p className="text-xs text-[var(--color-neutral-500)]">
                  Format: JPG/PNG/WebP/GIF
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label className="text-sm font-medium text-[var(--color-neutral-700)]">
                Username
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full rounded-[10px] border border-[var(--color-neutral-300)] px-4 py-2.5 text-sm text-[var(--color-neutral-900)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-neutral-700)]">
                  Email
                </label>
                <input
                  value={currentUser.email}
                  disabled
                  readOnly
                  className="w-full cursor-not-allowed rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] px-4 py-2.5 text-sm text-[var(--color-neutral-500)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-neutral-700)]">
                  Google ID
                </label>
                <input
                  value={currentUser.sub}
                  disabled
                  readOnly
                  className="w-full cursor-not-allowed rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] px-4 py-2.5 text-sm text-[var(--color-neutral-500)]"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleSave}
                disabled={isSaving || isUploading}
                className="rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
    </div>
  );
}
