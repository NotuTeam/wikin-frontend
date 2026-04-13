import { Pool } from "pg";

let pool: Pool | null = null;

function getDbConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const scheme = process.env.DB_SCHEME;

  if (!host || !port || !user || !password || !database) {
    throw new Error(
      "Missing DB configuration. Set DATABASE_URL or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME",
    );
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?schema=${scheme}&options=-csearch_path%3D${scheme}`;
}

export function getDbPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDbConnectionString(),
      max: 5,
    });
  }

  return pool;
}
