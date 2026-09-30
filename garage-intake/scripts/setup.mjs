import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY,
      token_hash TEXT UNIQUE NOT NULL,
      request_key_hash TEXT UNIQUE,
      token_ciphertext TEXT NOT NULL,
      data JSONB NOT NULL,
      revision INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY,
      conversation_id UUID NOT NULL REFERENCES conversations(id),
      recipient TEXT NOT NULL,
      body TEXT NOT NULL,
      return_path TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log("Database ready.");
} finally { await pool.end(); }
