import { getDbPool } from "@/server/db/client";
import { ensureUserTable } from "@/server/db/users";
import { SimulationResultData } from "@/types";

type ResultSummaryRow = {
  id: string;
  exam_type: "toefl" | "ielts";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  total_correct: number;
  total_questions: number;
  total_percentage: number;
  score_summary: SimulationResultData["scoreSummary"] | null;
  created_at: string;
};

type ResultSectionRow = {
  result_id: string;
  section_id: string;
  section_title: string;
  correct: number;
  total: number;
  percentage: number;
  scaled_score: number | null;
  band_score: number | null;
};

let tableReady = false;

async function ensureResultsTables() {
  if (tableReady) return;

  await ensureUserTable();
  const pool = getDbPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS simulation_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_google_sub TEXT NOT NULL REFERENCES auth_users(google_sub) ON DELETE CASCADE,
      exam_type TEXT NOT NULL CHECK (exam_type IN ('toefl', 'ielts')),
      difficulty TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
      total_correct INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      total_percentage INTEGER NOT NULL,
      score_summary JSONB,
      result_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS simulation_result_sections (
      id BIGSERIAL PRIMARY KEY,
      result_id UUID NOT NULL REFERENCES simulation_results(id) ON DELETE CASCADE,
      user_google_sub TEXT NOT NULL REFERENCES auth_users(google_sub) ON DELETE CASCADE,
      exam_type TEXT NOT NULL CHECK (exam_type IN ('toefl', 'ielts')),
      section_id TEXT NOT NULL,
      section_title TEXT NOT NULL,
      correct INTEGER NOT NULL,
      total INTEGER NOT NULL,
      percentage INTEGER NOT NULL,
      scaled_score INTEGER,
      band_score NUMERIC(3,1),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_simulation_results_user_created ON simulation_results (user_google_sub, created_at DESC);",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_simulation_results_user_exam_created ON simulation_results (user_google_sub, exam_type, created_at DESC);",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_simulation_result_sections_user_section_created ON simulation_result_sections (user_google_sub, section_id, created_at DESC);",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_simulation_result_sections_result_id ON simulation_result_sections (result_id);",
  );

  tableReady = true;
}

function toHeroValue(row: ResultSummaryRow) {
  if (row.exam_type === "toefl") {
    const value = row.score_summary?.toefl?.overall;
    return {
      heroLabel: "TOEFL ITP",
      heroValue: typeof value === "number" ? String(value) : String(row.total_percentage),
    };
  }

  const value = row.score_summary?.ielts?.overallBand;
  return {
    heroLabel: "IELTS Band",
    heroValue: typeof value === "number" ? value.toFixed(1) : (row.total_percentage / 10).toFixed(1),
  };
}

function mapResultSummary(row: ResultSummaryRow) {
  const hero = toHeroValue(row);
  return {
    id: row.id,
    examType: row.exam_type,
    difficulty: row.difficulty,
    totalCorrect: row.total_correct,
    totalQuestions: row.total_questions,
    totalPercentage: row.total_percentage,
    scoreSummary: row.score_summary,
    createdAt: row.created_at,
    ...hero,
  };
}

export async function saveSimulationResult(input: {
  userGoogleSub: string;
  result: SimulationResultData;
}) {
  await ensureResultsTables();

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inserted = await client.query<{
      id: string;
      created_at: string;
    }>(
      `
        INSERT INTO simulation_results (
          user_google_sub,
          exam_type,
          difficulty,
          total_correct,
          total_questions,
          total_percentage,
          score_summary,
          result_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
        RETURNING id, created_at;
      `,
      [
        input.userGoogleSub,
        input.result.examType,
        input.result.difficulty,
        input.result.totalCorrect,
        input.result.totalQuestions,
        input.result.totalPercentage,
        JSON.stringify(input.result.scoreSummary || null),
        JSON.stringify(input.result),
      ],
    );

    const resultId = inserted.rows[0].id;

    for (const section of input.result.sectionScores) {
      await client.query(
        `
          INSERT INTO simulation_result_sections (
            result_id,
            user_google_sub,
            exam_type,
            section_id,
            section_title,
            correct,
            total,
            percentage,
            scaled_score,
            band_score
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `,
        [
          resultId,
          input.userGoogleSub,
          input.result.examType,
          section.sectionId,
          section.sectionTitle,
          section.correct,
          section.total,
          section.percentage,
          section.scaledScore ?? null,
          section.bandScore ?? null,
        ],
      );
    }

    await client.query("COMMIT");

    return {
      id: resultId,
      createdAt: inserted.rows[0].created_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listSimulationResults(userGoogleSub: string, limit = 20) {
  await ensureResultsTables();

  const pool = getDbPool();
  const rows = await pool.query<ResultSummaryRow>(
    `
      SELECT
        id,
        exam_type,
        difficulty,
        total_correct,
        total_questions,
        total_percentage,
        score_summary,
        created_at
      FROM simulation_results
      WHERE user_google_sub = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `,
    [userGoogleSub, limit],
  );

  return rows.rows.map(mapResultSummary);
}

async function listSimulationResultHistoryByGoogleSub(userGoogleSub: string, limit = 20) {
  await ensureResultsTables();

  const pool = getDbPool();
  const rows = await pool.query<ResultSummaryRow>(
    `
      SELECT
        id,
        exam_type,
        difficulty,
        total_correct,
        total_questions,
        total_percentage,
        score_summary,
        created_at
      FROM simulation_results
      WHERE user_google_sub = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `,
    [userGoogleSub, limit],
  );

  const resultIds = rows.rows.map((row) => row.id);
  if (resultIds.length === 0) return [];

  const sectionRows = await pool.query<ResultSectionRow>(
    `
      SELECT
        result_id,
        section_id,
        section_title,
        correct,
        total,
        percentage,
        scaled_score,
        band_score
      FROM simulation_result_sections
      WHERE result_id = ANY($1::uuid[])
      ORDER BY result_id, section_id;
    `,
    [resultIds],
  );

  const groupedSections = sectionRows.rows.reduce((acc, row) => {
    const list = acc.get(row.result_id) || [];
    list.push(mapSection(row));
    acc.set(row.result_id, list);
    return acc;
  }, new Map<string, ReturnType<typeof mapSection>[]>());

  return rows.rows.map((row) => ({
    ...mapResultSummary(row),
    sections: groupedSections.get(row.id) || [],
  }));
}

export async function listSimulationResultHistory(userGoogleSub: string, limit = 20) {
  return listSimulationResultHistoryByGoogleSub(userGoogleSub, limit);
}

export async function listSimulationResultHistoryByUserId(userId: string, limit = 20) {
  await ensureResultsTables();

  const pool = getDbPool();
  const user = await pool.query<{ google_sub: string }>(
    `SELECT google_sub FROM auth_users WHERE id = $1 LIMIT 1;`,
    [userId],
  );

  const googleSub = user.rows[0]?.google_sub;
  if (!googleSub) return [];

  return listSimulationResultHistoryByGoogleSub(googleSub, limit);
}

export async function getResultStatsByUserGoogleSubs(googleSubs: string[]) {
  await ensureResultsTables();
  if (!googleSubs.length) return new Map<string, { simulationCount: number; latestResultAt: string | null }>();

  const pool = getDbPool();
  const stats = await pool.query<{
    user_google_sub: string;
    simulation_count: number;
    latest_result_at: string | null;
  }>(
    `
      SELECT
        user_google_sub,
        COUNT(*)::int AS simulation_count,
        MAX(created_at) AS latest_result_at
      FROM simulation_results
      WHERE user_google_sub = ANY($1::text[])
      GROUP BY user_google_sub;
    `,
    [googleSubs],
  );

  return stats.rows.reduce((acc, row) => {
    acc.set(row.user_google_sub, {
      simulationCount: row.simulation_count,
      latestResultAt: row.latest_result_at,
    });
    return acc;
  }, new Map<string, { simulationCount: number; latestResultAt: string | null }>());
}

export async function getSimulationResultById(
  userGoogleSub: string,
  resultId: string,
): Promise<SimulationResultData | null> {
  await ensureResultsTables();

  const pool = getDbPool();
  const row = await pool.query<{ result_json: SimulationResultData }>(
    `
      SELECT result_json
      FROM simulation_results
      WHERE id = $1 AND user_google_sub = $2
      LIMIT 1;
    `,
    [resultId, userGoogleSub],
  );

  return row.rows[0]?.result_json || null;
}

export type MonthlyRankingItem = {
  rank: number;
  userGoogleSub: string;
  userName: string;
  userPicture: string | null;
  bestScore: number;
  bestScoreLabel: string;
  bestScoreValue: string;
  examType: "toefl" | "ielts";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  totalSimulations: number;
  achievedAt: string;
};

export async function getMonthlyRankings(
  year: number,
  month: number,
  options?: {
    limit?: number;
    offset?: number;
    examType?: "toefl" | "ielts";
    difficulty?: "EASY" | "MEDIUM" | "HARD";
  },
): Promise<{ rankings: MonthlyRankingItem[]; total: number }> {
  await ensureResultsTables();

  const pool = getDbPool();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const filterClauses: string[] = [];
  const filterParams: unknown[] = [startDate.toISOString(), endDate.toISOString()];
  let paramIdx = 3;

  if (options?.examType) {
    filterClauses.push(`r.exam_type = $${paramIdx}`);
    filterParams.push(options.examType);
    paramIdx++;
  }

  if (options?.difficulty) {
    filterClauses.push(`r.difficulty = $${paramIdx}`);
    filterParams.push(options.difficulty);
    paramIdx++;
  }

  const whereFilter = filterClauses.length > 0
    ? `AND ${filterClauses.join(" AND ")}`
    : "";

  // Count total
  const countRow = await pool.query<{ total: number }>(
    `
      WITH monthly_filtered AS (
        SELECT user_google_sub
        FROM simulation_results r
        WHERE r.created_at >= $1 AND r.created_at <= $2
          ${whereFilter}
        GROUP BY user_google_sub
      )
      SELECT COUNT(*)::int AS total FROM monthly_filtered;
    `,
    filterParams,
  );
  const total = countRow.rows[0]?.total ?? 0;

  const rows = await pool.query<{
    user_google_sub: string;
    name: string;
    picture: string | null;
    exam_type: "toefl" | "ielts";
    difficulty: "EASY" | "MEDIUM" | "HARD";
    total_percentage: number;
    score_summary: SimulationResultData["scoreSummary"] | null;
    total_simulations: number;
    achieved_at: string;
  }>(
    `
      WITH monthly_results AS (
        SELECT 
          r.user_google_sub,
          r.exam_type,
          r.difficulty,
          r.total_percentage,
          r.score_summary,
          r.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY r.user_google_sub 
            ORDER BY r.total_percentage DESC, r.created_at ASC
          ) as rn
        FROM simulation_results r
        WHERE r.created_at >= $1 AND r.created_at <= $2
          ${whereFilter}
      ),
      user_best AS (
        SELECT 
          mr.user_google_sub,
          mr.exam_type,
          mr.difficulty,
          mr.total_percentage,
          mr.score_summary,
          mr.created_at as achieved_at
        FROM monthly_results mr
        WHERE mr.rn = 1
      ),
      user_stats AS (
        SELECT 
          user_google_sub,
          COUNT(*) as total_simulations
        FROM simulation_results r
        WHERE r.created_at >= $1 AND r.created_at <= $2
          ${whereFilter}
        GROUP BY user_google_sub
      )
      SELECT 
        ub.user_google_sub,
        u.name,
        u.picture,
        ub.exam_type,
        ub.difficulty,
        ub.total_percentage,
        ub.score_summary,
        us.total_simulations::int,
        ub.achieved_at
      FROM user_best ub
      JOIN auth_users u ON u.google_sub = ub.user_google_sub
      JOIN user_stats us ON us.user_google_sub = ub.user_google_sub
      ORDER BY ub.total_percentage DESC, ub.achieved_at ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
    `,
    [...filterParams, limit, offset],
  );

  const rankings = rows.rows.map((row, index) => {
    let heroLabel = "Score";
    let heroValue = String(row.total_percentage);

    if (row.exam_type === "toefl") {
      const toeflScore = row.score_summary?.toefl?.overall;
      if (typeof toeflScore === "number") {
        heroLabel = "TOEFL ITP";
        heroValue = String(toeflScore);
      }
    } else {
      const ieltsBand = row.score_summary?.ielts?.overallBand;
      if (typeof ieltsBand === "number") {
        heroLabel = "IELTS Band";
        heroValue = ieltsBand.toFixed(1);
      } else {
        heroValue = (row.total_percentage / 10).toFixed(1);
      }
    }

    return {
      rank: offset + index + 1,
      userGoogleSub: row.user_google_sub,
      userName: row.name,
      userPicture: row.picture,
      bestScore: row.total_percentage,
      bestScoreLabel: heroLabel,
      bestScoreValue: heroValue,
      examType: row.exam_type,
      difficulty: row.difficulty,
      totalSimulations: row.total_simulations,
      achievedAt: row.achieved_at,
    };
  });

  return { rankings, total };
}

export async function getProgressOverview(userGoogleSub: string) {
  await ensureResultsTables();

  const pool = getDbPool();

  const [summaryRows, sectionAggRows] = await Promise.all([
    pool.query<ResultSummaryRow>(
      `
        SELECT
          id,
          exam_type,
          difficulty,
          total_correct,
          total_questions,
          total_percentage,
          score_summary,
          created_at
        FROM simulation_results
        WHERE user_google_sub = $1
        ORDER BY created_at DESC
        LIMIT 30;
      `,
      [userGoogleSub],
    ),
    pool.query<{
      section_id: string;
      section_title: string;
      attempts: number;
      avg_percentage: string;
      best_percentage: number;
      latest_percentage: number;
    }>(
      `
        SELECT
          s.section_id,
          s.section_title,
          COUNT(*)::int AS attempts,
          ROUND(AVG(s.percentage)::numeric, 1) AS avg_percentage,
          MAX(s.percentage)::int AS best_percentage,
          (
            ARRAY_AGG(s.percentage ORDER BY s.created_at DESC)
          )[1]::int AS latest_percentage
        FROM simulation_result_sections s
        WHERE s.user_google_sub = $1
        GROUP BY s.section_id, s.section_title
        ORDER BY avg_percentage DESC, attempts DESC;
      `,
      [userGoogleSub],
    ),
  ]);

  const recentRows = summaryRows.rows;
  const completedSessions = recentRows.length;
  const averageAccuracy =
    completedSessions > 0
      ? Math.round(
          recentRows.reduce((acc, row) => acc + row.total_percentage, 0) /
            completedSessions,
        )
      : 0;

  const latest = recentRows[0] ? mapResultSummary(recentRows[0]) : null;
  const previous = recentRows[1] || null;
  const improvementFromPrevious =
    latest && previous ? latest.totalPercentage - previous.total_percentage : null;

  const bestPercentage =
    recentRows.length > 0
      ? Math.max(...recentRows.map((row) => row.total_percentage))
      : 0;

  const recentIds = recentRows.slice(0, 10).map((row) => row.id);
  let recentSections = new Map<string, ReturnType<typeof mapSection>[]>();

  if (recentIds.length > 0) {
    const sectionRows = await pool.query<ResultSectionRow>(
      `
        SELECT
          result_id,
          section_id,
          section_title,
          correct,
          total,
          percentage,
          scaled_score,
          band_score
        FROM simulation_result_sections
        WHERE result_id = ANY($1::uuid[])
        ORDER BY result_id, section_id;
      `,
      [recentIds],
    );

    recentSections = sectionRows.rows.reduce((acc, row) => {
      const list = acc.get(row.result_id) || [];
      list.push(mapSection(row));
      acc.set(row.result_id, list);
      return acc;
    }, new Map<string, ReturnType<typeof mapSection>[]>());
  }

  const recentResults = recentRows.slice(0, 10).map((row) => ({
    ...mapResultSummary(row),
    sections: recentSections.get(row.id) || [],
  }));

  return {
    stats: {
      completedSessions,
      averageAccuracy,
      bestPercentage,
      latestResult: latest,
      improvementFromPrevious,
    },
    trend: recentRows.slice(0, 10).reverse().map((row, idx) => ({
      id: row.id,
      label: `S${idx + 1}`,
      percentage: row.total_percentage,
      examType: row.exam_type,
      createdAt: row.created_at,
    })),
    sectionProgress: sectionAggRows.rows.map((row) => ({
      sectionId: row.section_id,
      sectionTitle: row.section_title,
      attempts: row.attempts,
      averagePercentage: Number(row.avg_percentage),
      bestPercentage: row.best_percentage,
      latestPercentage: row.latest_percentage,
    })),
    recentResults,
  };
}

export async function getDailyQuotaUsage(userGoogleSub: string): Promise<{ used: number; limit: number }> {
  await ensureResultsTables();
  const pool = getDbPool();

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const row = await pool.query<{ count: number }>(
    `
      SELECT COUNT(*)::int AS count
      FROM simulation_results
      WHERE user_google_sub = $1
        AND created_at >= $2 AND created_at < $3;
    `,
    [userGoogleSub, startOfDay.toISOString(), startOfTomorrow.toISOString()],
  );

  const DAILY_LIMIT = 3;
  return { used: row.rows[0].count, limit: DAILY_LIMIT };
}

function mapSection(row: ResultSectionRow) {
  return {
    sectionId: row.section_id,
    sectionTitle: row.section_title,
    correct: row.correct,
    total: row.total,
    percentage: row.percentage,
    scaledScore: row.scaled_score ?? undefined,
    bandScore: row.band_score ?? undefined,
  };
}
