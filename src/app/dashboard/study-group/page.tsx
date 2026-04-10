"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type StudyGroupItem = {
  id: string;
  name: string;
  description: string;
  picture: string;
  ownerGoogleSub: string;
  ownerName: string;
  role: "owner" | "member";
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

type ModalType = "join" | "create" | "edit" | "invite" | "delete" | null;

const PAGE_SIZE = 8;

export default function StudyGroupPage() {
  const params = useSearchParams();
  const [groups, setGroups] = useState<StudyGroupItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroupItem | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [picture, setPicture] = useState("");
  const [inviteToken, setInviteToken] = useState(params.get("invite") || "");
  const [inviteLink, setInviteLink] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const openCreateModal = () => {
    setSelectedGroup(null);
    setName("");
    setDescription("");
    setPicture("");
    setModalType("create");
  };

  const openEditModal = (group: StudyGroupItem) => {
    setSelectedGroup(group);
    setName(group.name);
    setDescription(group.description || "");
    setPicture(group.picture || "");
    setModalType("edit");
  };

  const openInviteModal = async (group: StudyGroupItem) => {
    setSelectedGroup(group);
    setInviteLink("");
    setModalType("invite");

    const res = await fetch(`/api/study-groups/${group.id}/invite`, {
      method: "POST",
      credentials: "include",
    });
    const json = (await res.json()) as { success?: boolean; data?: { inviteLink?: string } };
    if (res.ok && json.success && json.data?.inviteLink) {
      setInviteLink(json.data.inviteLink);
    }
  };

  const openDeleteModal = (group: StudyGroupItem) => {
    setSelectedGroup(group);
    setModalType("delete");
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedGroup(null);
    setInviteLink("");
    setPicture("");
  };

  const loadGroups = async () => {
    try {
      const res = await fetch("/api/study-groups", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { groups?: StudyGroupItem[] };
      };
      if (res.ok && json.success && json.data?.groups) setGroups(json.data.groups);
      else setGroups([]);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return groups.slice(start, start + PAGE_SIZE);
  }, [groups, currentPage]);

  const uploadGroupPicture = async (file: File) => {
    const signRes = await fetch("/api/study-groups/upload-signature", {
      method: "POST",
      credentials: "include",
    });

    const signJson = (await signRes.json()) as {
      success?: boolean;
      data?: {
        cloudName: string;
        apiKey: string;
        folder: string;
        public_id: string;
        timestamp: number;
        signature: string;
      };
      error?: string;
    };

    if (!signRes.ok || !signJson.success || !signJson.data) {
      throw new Error(signJson.error || "Failed to sign upload request");
    }

    const { cloudName, apiKey, folder, public_id, timestamp, signature } = signJson.data;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", folder);
    formData.append("public_id", public_id);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const uploadJson = (await uploadRes.json()) as {
      secure_url?: string;
      error?: { message?: string };
    };

    if (!uploadRes.ok || !uploadJson.secure_url) {
      throw new Error(uploadJson.error?.message || "Upload failed");
    }

    return uploadJson.secure_url;
  };

  const onCreate = async () => {
    if (!name.trim()) return;
    await fetch("/api/study-groups", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, picture }),
    });
    closeModal();
    await loadGroups();
  };

  const onUpdate = async () => {
    if (!name.trim() || !selectedGroup) return;
    await fetch(`/api/study-groups/${selectedGroup.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, picture }),
    });
    closeModal();
    await loadGroups();
  };

  const onDelete = async () => {
    if (!selectedGroup) return;
    await fetch(`/api/study-groups/${selectedGroup.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    closeModal();
    await loadGroups();
  };

  const onJoinByInvite = async () => {
    if (!inviteToken.trim()) return;
    await fetch("/api/study-groups", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteToken: inviteToken.trim() }),
    });
    setInviteToken("");
    closeModal();
    await loadGroups();
  };

  const onCopyInvite = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-bold text-[var(--color-neutral-900)]">Study Group</h1>
          <p className="text-sm text-[var(--color-neutral-500)]">Create, manage, invite members, and track group performance.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalType("join")} className="rounded-[10px] border border-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-primary)]">
            Join Invitation
          </button>
          <button onClick={openCreateModal} className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white">
            Create Group
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-4 text-sm text-[var(--color-neutral-500)]">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-4 text-sm text-[var(--color-neutral-500)]">No group yet.</div>
        ) : (
          <>
            {paginatedGroups.map((group) => (
              <div key={group.id} className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {group.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={group.picture} alt={group.name} className="h-11 w-11 rounded-lg object-cover" />
                    ) : (
                      <div className="h-11 w-11 rounded-lg bg-[var(--color-primary-pale)]" />
                    )}
                    <div>
                      <p className="text-base font-semibold text-[var(--color-neutral-900)]">{group.name}</p>
                      <p className="text-xs text-[var(--color-neutral-500)]">{group.description || "No description"}</p>
                      <p className="mt-1 text-xs text-[var(--color-neutral-500)]">Owner: {group.ownerName} · Members: {group.memberCount}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Link href={`/dashboard/study-group/${group.id}`} className="rounded-[10px] bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white">
                      Open
                    </Link>
                    {group.role === "owner" && (
                      <>
                        <button onClick={() => openEditModal(group)} className="rounded-[10px] border border-[var(--color-neutral-300)] px-3 py-2 text-xs font-semibold text-[var(--color-neutral-700)]">
                          Edit
                        </button>
                        <button onClick={() => openInviteModal(group)} className="rounded-[10px] border border-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)]">
                          Invite Link
                        </button>
                        <button onClick={() => openDeleteModal(group)} className="rounded-[10px] bg-[var(--color-danger)] px-3 py-2 text-xs font-semibold text-white">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {groups.length > PAGE_SIZE && (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-700)] disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-xs font-semibold text-[var(--color-neutral-600)]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-700)] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-xl">
            {modalType === "join" && (
              <>
                <h3 className="mb-2 text-lg font-semibold text-[var(--color-neutral-900)]">Join Study Group</h3>
                <input
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="Paste invitation token"
                  className="w-full rounded-[10px] border border-[var(--color-neutral-300)] px-3 py-2 text-sm"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={closeModal} className="rounded-[10px] border border-[var(--color-neutral-300)] px-4 py-2 text-xs font-semibold text-[var(--color-neutral-700)]">Cancel</button>
                  <button onClick={onJoinByInvite} className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white">Join</button>
                </div>
              </>
            )}

            {(modalType === "create" || modalType === "edit") && (
              <>
                <h3 className="mb-2 text-lg font-semibold text-[var(--color-neutral-900)]">{modalType === "create" ? "Create Group" : "Edit Group"}</h3>
                <div className="grid gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Group name"
                    className="rounded-[10px] border border-[var(--color-neutral-300)] px-3 py-2 text-sm"
                  />
                  <div className="flex items-center gap-3">
                    {picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={picture} alt="Group" className="h-10 w-10 rounded-lg object-cover border border-[var(--color-neutral-300)]" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-[var(--color-primary-pale)]" />
                    )}
                    <label className="inline-flex cursor-pointer items-center rounded-[10px] border border-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]">
                      Upload Group Picture
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith("image/")) return;
                          try {
                            const uploaded = await uploadGroupPicture(file);
                            setPicture(uploaded);
                          } catch {}
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    className="min-h-[90px] rounded-[10px] border border-[var(--color-neutral-300)] px-3 py-2 text-sm"
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={closeModal} className="rounded-[10px] border border-[var(--color-neutral-300)] px-4 py-2 text-xs font-semibold text-[var(--color-neutral-700)]">Cancel</button>
                  <button onClick={modalType === "create" ? onCreate : onUpdate} className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white">
                    {modalType === "create" ? "Create" : "Update"}
                  </button>
                </div>
              </>
            )}

            {modalType === "invite" && (
              <>
                <h3 className="mb-2 text-lg font-semibold text-[var(--color-neutral-900)]">Invitation Link</h3>
                <p className="mb-2 text-xs text-[var(--color-neutral-500)]">{selectedGroup?.name}</p>
                <input
                  readOnly
                  value={inviteLink}
                  placeholder="Generating invite link..."
                  className="w-full rounded-[10px] border border-[var(--color-neutral-300)] px-3 py-2 text-sm"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={closeModal} className="rounded-[10px] border border-[var(--color-neutral-300)] px-4 py-2 text-xs font-semibold text-[var(--color-neutral-700)]">Close</button>
                  <button onClick={onCopyInvite} disabled={!inviteLink} className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
                    Copy Link
                  </button>
                </div>
              </>
            )}

            {modalType === "delete" && (
              <>
                <h3 className="mb-2 text-lg font-semibold text-[var(--color-neutral-900)]">Delete Group?</h3>
                <p className="text-sm text-[var(--color-neutral-600)]">
                  This action will permanently delete <strong>{selectedGroup?.name}</strong> and cannot be undone.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={closeModal} className="rounded-[10px] border border-[var(--color-neutral-300)] px-4 py-2 text-xs font-semibold text-[var(--color-neutral-700)]">Cancel</button>
                  <button onClick={onDelete} className="rounded-[10px] bg-[var(--color-danger)] px-4 py-2 text-xs font-semibold text-white">Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
