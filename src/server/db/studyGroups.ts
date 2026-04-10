import crypto from "crypto";
import { getDbPool } from "@/server/db/client";
import { ensureUserTable } from "@/server/db/users";

type ExamType = "ielts" | "toefl";

type StudyGroupRow = {
  id: string;
  name: string;
  description: string | null;
  picture: string | null;
  owner_google_sub: string;
  owner_name: string;
  role: "owner" | "member";
  member_count: number;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  user_google_sub: string;
  role: "owner" | "member";
  joined_at: string;
  name: string;
  email: string;
  picture: string | null;
};

type ResultRow = {
  user_google_sub: string;
  created_at: string;
  total_percentage: number;
  score_summary: {
    toefl?: { overall?: number };
    ielts?: { overallBand?: number };
  } | null;
};

let ready = false;

async function ensureStudyGroupTables() {
  if (ready) return;
  await ensureUserTable();

  const pool = getDbPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      picture TEXT,
      owner_google_sub TEXT NOT NULL REFERENCES auth_users(google_sub) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE study_groups
    ADD COLUMN IF NOT EXISTS picture TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_group_members (
      id BIGSERIAL PRIMARY KEY,
      group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
      user_google_sub TEXT NOT NULL REFERENCES auth_users(google_sub) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(group_id, user_google_sub)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_group_invites (
      id BIGSERIAL PRIMARY KEY,
      group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_by_google_sub TEXT NOT NULL REFERENCES auth_users(google_sub) ON DELETE CASCADE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    );
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS idx_study_group_members_user ON study_group_members(user_google_sub);");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_study_group_members_group ON study_group_members(group_id);");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_study_group_invites_token ON study_group_invites(token);");

  ready = true;
}

function toOverallScore(row: ResultRow, examType: ExamType) {
  if (examType === "toefl") {
    return Number(row.score_summary?.toefl?.overall ?? row.total_percentage);
  }
  return Number(row.score_summary?.ielts?.overallBand ?? row.total_percentage / 10);
}

export async function listStudyGroupsForUser(userGoogleSub: string) {
  await ensureStudyGroupTables();

  const pool = getDbPool();
  const rows = await pool.query<StudyGroupRow>(
    `
      SELECT
        g.id,
        g.name,
        g.description,
        g.picture,
        g.owner_google_sub,
        owner_u.name AS owner_name,
        m.role,
        (
          SELECT COUNT(*)::int
          FROM study_group_members x
          WHERE x.group_id = g.id
        ) AS member_count,
        g.created_at,
        g.updated_at
      FROM study_group_members m
      JOIN study_groups g ON g.id = m.group_id
      JOIN auth_users owner_u ON owner_u.google_sub = g.owner_google_sub
      WHERE m.user_google_sub = $1
      ORDER BY g.updated_at DESC;
    `,
    [userGoogleSub],
  );

  return rows.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || "",
    picture: row.picture || "",
    ownerGoogleSub: row.owner_google_sub,
    ownerName: row.owner_name,
    role: row.role,
    memberCount: row.member_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createStudyGroup(input: {
  ownerGoogleSub: string;
  name: string;
  description?: string;
  picture?: string;
}) {
  await ensureStudyGroupTables();

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const created = await client.query<{ id: string }>(
      `
        INSERT INTO study_groups (name, description, picture, owner_google_sub)
        VALUES ($1, $2, $3, $4)
        RETURNING id;
      `,
      [
        input.name.trim(),
        input.description?.trim() || null,
        input.picture?.trim() || null,
        input.ownerGoogleSub,
      ],
    );

    const groupId = created.rows[0].id;

    await client.query(
      `
        INSERT INTO study_group_members (group_id, user_google_sub, role)
        VALUES ($1, $2, 'owner')
        ON CONFLICT (group_id, user_google_sub) DO NOTHING;
      `,
      [groupId, input.ownerGoogleSub],
    );

    await client.query("COMMIT");

    return { id: groupId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateStudyGroup(input: {
  groupId: string;
  ownerGoogleSub: string;
  name: string;
  description?: string;
  picture?: string;
}) {
  await ensureStudyGroupTables();

  const pool = getDbPool();
  const result = await pool.query<{ id: string }>(
    `
      UPDATE study_groups
      SET name = $3, description = $4, picture = $5, updated_at = NOW()
      WHERE id = $1 AND owner_google_sub = $2
      RETURNING id;
    `,
    [
      input.groupId,
      input.ownerGoogleSub,
      input.name.trim(),
      input.description?.trim() || null,
      input.picture?.trim() || null,
    ],
  );

  return !!result.rows[0];
}

export async function deleteStudyGroup(input: { groupId: string; ownerGoogleSub: string }) {
  await ensureStudyGroupTables();

  const pool = getDbPool();
  const result = await pool.query<{ id: string }>(
    `
      DELETE FROM study_groups
      WHERE id = $1 AND owner_google_sub = $2
      RETURNING id;
    `,
    [input.groupId, input.ownerGoogleSub],
  );

  return !!result.rows[0];
}

export async function kickStudyGroupMember(input: {
  groupId: string;
  ownerGoogleSub: string;
  memberGoogleSub: string;
}) {
  await ensureStudyGroupTables();

  const pool = getDbPool();

  const ownerCheck = await pool.query<{ id: string }>(
    `SELECT id FROM study_groups WHERE id = $1 AND owner_google_sub = $2 LIMIT 1;`,
    [input.groupId, input.ownerGoogleSub],
  );

  if (!ownerCheck.rows[0]) return false;
  if (input.memberGoogleSub === input.ownerGoogleSub) return false;

  const removed = await pool.query<{ id: number }>(
    `
      DELETE FROM study_group_members
      WHERE group_id = $1
        AND user_google_sub = $2
        AND role = 'member'
      RETURNING id;
    `,
    [input.groupId, input.memberGoogleSub],
  );

  return !!removed.rows[0];
}

export async function createStudyGroupInvite(input: {
  groupId: string;
  ownerGoogleSub: string;
}) {
  await ensureStudyGroupTables();

  const pool = getDbPool();

  const ownerCheck = await pool.query<{ id: string }>(
    `SELECT id FROM study_groups WHERE id = $1 AND owner_google_sub = $2 LIMIT 1;`,
    [input.groupId, input.ownerGoogleSub],
  );

  if (!ownerCheck.rows[0]) return null;

  const token = crypto.randomUUID().replace(/-/g, "");

  await pool.query(
    `
      INSERT INTO study_group_invites (group_id, token, created_by_google_sub)
      VALUES ($1, $2, $3);
    `,
    [input.groupId, token, input.ownerGoogleSub],
  );

  return { token };
}

export async function joinStudyGroupByToken(input: {
  token: string;
  userGoogleSub: string;
}) {
  await ensureStudyGroupTables();

  const pool = getDbPool();

  const invite = await pool.query<{ group_id: string; active: boolean; expires_at: string | null }>(
    `
      SELECT group_id, active, expires_at
      FROM study_group_invites
      WHERE token = $1
      LIMIT 1;
    `,
    [input.token.trim()],
  );

  const row = invite.rows[0];
  if (!row || !row.active) return null;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;

  await pool.query(
    `
      INSERT INTO study_group_members (group_id, user_google_sub, role)
      VALUES ($1, $2, 'member')
      ON CONFLICT (group_id, user_google_sub) DO NOTHING;
    `,
    [row.group_id, input.userGoogleSub],
  );

  return { groupId: row.group_id };
}

export async function getStudyGroupDetail(input: {
  groupId: string;
  userGoogleSub: string;
  examType: ExamType;
}) {
  await ensureStudyGroupTables();

  const pool = getDbPool();

  const membership = await pool.query<{ role: "owner" | "member" }>(
    `
      SELECT role
      FROM study_group_members
      WHERE group_id = $1 AND user_google_sub = $2
      LIMIT 1;
    `,
    [input.groupId, input.userGoogleSub],
  );

  if (!membership.rows[0]) return null;

  const group = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    picture: string | null;
    owner_google_sub: string;
    created_at: string;
    updated_at: string;
  }>(
    `
      SELECT id, name, description, picture, owner_google_sub, created_at, updated_at
      FROM study_groups
      WHERE id = $1
      LIMIT 1;
    `,
    [input.groupId],
  );

  const groupRow = group.rows[0];
  if (!groupRow) return null;

  const members = await pool.query<MemberRow>(
    `
      SELECT
        m.user_google_sub,
        m.role,
        m.joined_at,
        u.name,
        u.email,
        u.picture
      FROM study_group_members m
      JOIN auth_users u ON u.google_sub = m.user_google_sub
      WHERE m.group_id = $1
      ORDER BY m.joined_at ASC;
    `,
    [input.groupId],
  );

  const memberSubs = members.rows.map((m) => m.user_google_sub);

  const results = memberSubs.length
    ? await pool.query<ResultRow>(
        `
          SELECT user_google_sub, created_at, total_percentage, score_summary
          FROM simulation_results
          WHERE user_google_sub = ANY($1::text[])
            AND exam_type = $2
          ORDER BY created_at ASC;
        `,
        [memberSubs, input.examType],
      )
    : { rows: [] as ResultRow[] };

  const grouped = new Map<string, Array<{ createdAt: string; overall: number }>>();
  for (const row of results.rows) {
    const list = grouped.get(row.user_google_sub) || [];
    list.push({
      createdAt: row.created_at,
      overall: toOverallScore(row, input.examType),
    });
    grouped.set(row.user_google_sub, list);
  }

  const membersWithStats = members.rows.map((member) => {
    const history = grouped.get(member.user_google_sub) || [];
    const attempts = history.length;
    const avgOverall = attempts
      ? Number((history.reduce((acc, h) => acc + h.overall, 0) / attempts).toFixed(input.examType === "ielts" ? 1 : 0))
      : 0;
    const bestOverall = attempts ? Math.max(...history.map((h) => h.overall)) : 0;
    const latestOverall = attempts ? history[history.length - 1].overall : 0;

    return {
      googleSub: member.user_google_sub,
      name: member.name,
      email: member.email,
      picture: member.picture || undefined,
      role: member.role,
      joinedAt: member.joined_at,
      stats: {
        attempts,
        avgOverall,
        bestOverall,
        latestOverall,
      },
      progress: history,
    };
  });

  const ranking = [...membersWithStats]
    .sort((a, b) => b.stats.avgOverall - a.stats.avgOverall)
    .map((member, idx) => ({
      rank: idx + 1,
      ...member,
    }));

  return {
    group: {
      id: groupRow.id,
      name: groupRow.name,
      description: groupRow.description || "",
      picture: groupRow.picture || "",
      ownerGoogleSub: groupRow.owner_google_sub,
      createdAt: groupRow.created_at,
      updatedAt: groupRow.updated_at,
      myRole: membership.rows[0].role,
    },
    members: membersWithStats,
    ranking,
  };
}
