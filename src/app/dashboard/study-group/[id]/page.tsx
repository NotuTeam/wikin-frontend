"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LoadingState } from "@/components/features/LoadingState";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

type ExamType = "ielts" | "toefl";

type GroupDetail = {
  group: {
    id: string;
    name: string;
    description: string;
    picture: string;
    ownerGoogleSub: string;
    myRole: "owner" | "member";
  };
  members: Array<{
    googleSub: string;
    name: string;
    email: string;
    picture?: string;
    role: "owner" | "member";
    stats: {
      attempts: number;
      avgOverall: number;
      bestOverall: number;
      latestOverall: number;
    };
    progress: Array<{ createdAt: string; overall: number }>;
  }>;
  ranking: Array<{
    rank: number;
    googleSub: string;
    name: string;
    email: string;
    picture?: string;
    role: "owner" | "member";
    stats: {
      attempts: number;
      avgOverall: number;
      bestOverall: number;
      latestOverall: number;
    };
    progress: Array<{ createdAt: string; overall: number }>;
  }>;
};

const CHART_COLORS = [
  "#5D3FD3",
  "#3B82F6",
  "#3DD68C",
  "#F59E0B",
  "#EF4444",
  "#7B61E4",
  "#1DAF6A",
  "#06B6D4",
];

export default function StudyGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [examType, setExamType] = useState<ExamType>("ielts");
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [kickingMember, setKickingMember] = useState<string | null>(null);

  const load = async (selected: ExamType) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/study-groups/${id}?examType=${selected}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: GroupDetail;
      };
      if (res.ok && json.success && json.data) setDetail(json.data);
      else setDetail(null);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) void load(examType);
  }, [id, examType]);

  const rankLabel = examType === "ielts" ? "Overall Band" : "Overall Score";

  const rankingMembers = useMemo(() => detail?.ranking || [], [detail]);

  const podiumMembers = useMemo(() => rankingMembers.slice(0, 3), [rankingMembers]);
  const otherMembers = useMemo(() => rankingMembers.slice(3), [rankingMembers]);

  const chartMembers = rankingMembers;

  const combinedChart = useMemo<
    ChartData<"line", (number | null)[], string>
  >(() => {
    const members = chartMembers;
    if (members.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labelSet = new Set<string>();
    members.forEach((member) => {
      member.progress.forEach((point) => {
        labelSet.add(
          new Date(point.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          }),
        );
      });
    });

    const labels = Array.from(labelSet);

    return {
      labels,
      datasets: members.map((member, idx) => {
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        const map = new Map(
          member.progress.map((point) => [
            new Date(point.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
            point.overall,
          ]),
        );

        return {
          label: member.name,
          data: labels.map((label) => map.get(label) ?? null),
          borderColor: color,
          backgroundColor: color,
          tension: 0.35,
          spanGaps: true,
        };
      }),
    };
  }, [chartMembers]);

  const onKickMember = async (memberGoogleSub: string) => {
    if (!detail) return;
    setKickingMember(memberGoogleSub);
    try {
      await fetch(
        `/api/study-groups/${detail.group.id}?memberGoogleSub=${encodeURIComponent(memberGoogleSub)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      await load(examType);
    } finally {
      setKickingMember(null);
    }
  };

  return (
    <section className="space-y-5">
      <Link
        href="/dashboard/study-group"
        className="text-sm font-semibold text-[var(--color-primary)]"
      >
        ← Back to Study Groups
      </Link>

      {loading ? (
        <LoadingState message="Loading group detail..." />
      ) : !detail ? (
        <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 text-sm text-[var(--color-neutral-500)]">
          Group not found.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {detail.group.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.group.picture}
                    alt={detail.group.name}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-[var(--color-primary-pale)]" />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">
                    {detail.group.name}
                  </h1>
                  <p className="text-sm text-[var(--color-neutral-500)]">
                    {detail.group.description || "No description"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(["ielts", "toefl"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setExamType(type)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      examType === type
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)]"
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5">
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-neutral-900)]">
              Ranking Members ({rankLabel})
            </h2>

            {podiumMembers.length > 0 && (
              <div className="mb-4 rounded-xl border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-4 py-5">
                <div className="grid grid-cols-3 items-end gap-3">
                  {[2, 1, 3]
                    .map((rank) => podiumMembers.find((member) => member.rank === rank))
                    .filter((item): item is NonNullable<typeof item> => Boolean(item))
                    .map((item) => (
                      <div key={item.googleSub} className="text-center">
                        <div className="mb-2 flex justify-center">
                          {item.picture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.picture}
                              alt={item.name}
                              className="h-12 w-12 rounded-full border-2 border-white object-cover shadow"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full border-2 border-white bg-[var(--color-primary-pale)]" />
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[var(--color-neutral-900)]">{item.name}</p>
                        <p className="mb-2 text-[11px] text-[var(--color-neutral-500)]">{item.stats.avgOverall}</p>
                        <div
                          className={`flex items-center justify-center rounded-t-lg text-xs font-bold text-white ${
                            item.rank === 1
                              ? "h-24 bg-[var(--color-warning)]"
                              : item.rank === 2
                                ? "h-[72px] bg-[var(--color-neutral-500)]"
                                : "h-14 bg-[#D97706]"
                          }`}
                        >
                          #{item.rank}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {otherMembers.map((item) => (
                <div
                  key={item.googleSub}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-neutral-300)] px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    {item.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.picture}
                        alt={item.name}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-[var(--color-primary-pale)]" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
                        #{item.rank} {item.name}
                      </p>
                      <p className="text-xs text-[var(--color-neutral-500)]">
                        {item.email} · {item.role} · Attempts:{" "}
                        {item.stats.attempts} · Best: {item.stats.bestOverall}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--color-primary)]">
                      {item.stats.avgOverall}
                    </p>
                    {detail.group.myRole === "owner" &&
                      item.role === "member" && (
                        <button
                          onClick={() => onKickMember(item.googleSub)}
                          disabled={kickingMember === item.googleSub}
                          className="rounded-[10px] bg-[var(--color-danger)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {kickingMember === item.googleSub
                            ? "Kicking..."
                            : "Kick"}
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5">
            <p className="mb-2 text-sm font-semibold text-[var(--color-neutral-900)]">
              Member Progress
            </p>
            <Line
              data={combinedChart}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: true,
                    position: "bottom",
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: examType === "ielts" ? 9 : 700,
                  },
                },
              }}
            />
          </div>
        </>
      )}
    </section>
  );
}
