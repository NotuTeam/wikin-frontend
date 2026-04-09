import type { GoogleUserInfo } from "@/server/auth/google";
import { getDbPool } from "@/server/db/client";

export type AuthDbUser = {
  id: string;
  googleSub: string;
  email: string;
  name: string;
  picture: string | null;
};

let tableReady = false;

async function ensureUserTable() {
  if (tableReady) return;

  const pool = getDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      google_sub TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      picture TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users (email);",
  );

  tableReady = true;
}

export async function upsertGoogleUser(profile: GoogleUserInfo): Promise<AuthDbUser> {
  await ensureUserTable();

  const pool = getDbPool();

  const existing = await pool.query<{
    id: string;
    google_sub: string;
    email: string;
    name: string;
    picture: string | null;
  }>(
    `SELECT id, google_sub, email, name, picture FROM auth_users WHERE google_sub = $1 LIMIT 1;`,
    [profile.sub],
  );

  const existingRow = existing.rows[0];
  if (existingRow) {
    return {
      id: existingRow.id,
      googleSub: existingRow.google_sub,
      email: existingRow.email,
      name: existingRow.name,
      picture: existingRow.picture,
    };
  }

  try {
    const inserted = await pool.query<{
      id: string;
      google_sub: string;
      email: string;
      name: string;
      picture: string | null;
    }>(
      `
        INSERT INTO auth_users (google_sub, email, name, picture)
        VALUES ($1, $2, $3, $4)
        RETURNING id, google_sub, email, name, picture;
      `,
      [profile.sub, profile.email, profile.name, profile.picture || null],
    );

    const row = inserted.rows[0];
    return {
      id: row.id,
      googleSub: row.google_sub,
      email: row.email,
      name: row.name,
      picture: row.picture,
    };
  } catch (error) {
    const maybePgError = error as { code?: string };
    if (maybePgError.code === "23505") {
      const latest = await pool.query<{
        id: string;
        google_sub: string;
        email: string;
        name: string;
        picture: string | null;
      }>(
        `SELECT id, google_sub, email, name, picture FROM auth_users WHERE google_sub = $1 LIMIT 1;`,
        [profile.sub],
      );

      const row = latest.rows[0];
      if (row) {
        return {
          id: row.id,
          googleSub: row.google_sub,
          email: row.email,
          name: row.name,
          picture: row.picture,
        };
      }
    }

    throw error;
  }
}
