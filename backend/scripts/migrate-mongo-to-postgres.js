const { createPoolWithSchema } = require("../database");

function requireMongoClient() {
  try {
    return require("mongodb").MongoClient;
  } catch {
    console.error("Driver mongodb nao encontrado.");
    console.error("Instale temporariamente antes da migracao: npm install --no-save mongodb");
    process.exit(1);
  }
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function coerceTimestamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function main() {
  const MongoClient = requireMongoClient();
  const mongoUri = process.env.MONGODB_URI;
  const mongoDbName = process.env.MONGODB_DB || "pet_identification";

  if (!mongoUri) {
    throw new Error("Defina MONGODB_URI com a conexao antiga do MongoDB.");
  }

  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
    throw new Error("Defina DATABASE_URL com a conexao do PostgreSQL.");
  }

  const mongo = new MongoClient(mongoUri);
  const postgres = await createPoolWithSchema();

  try {
    await mongo.connect();
    const db = mongo.db(mongoDbName);

    const counts = {
      users: await migrateUsers(db, postgres.query),
      attachments: await migrateAttachments(db, postgres.query),
      walletStates: await migrateWalletStates(db, postgres.database),
      analyticsEvents: await migrateAnalyticsEvents(db, postgres.query)
    };

    console.log("Migracao concluida:");
    console.log(JSON.stringify(counts, null, 2));
  } finally {
    await mongo.close().catch(() => {});
    await postgres.client.end().catch(() => {});
  }
}

async function migrateUsers(db, query) {
  const users = await db.collection("users").find({}).toArray();
  let count = 0;

  for (const user of users) {
    const id = cleanText(user.id);
    const email = normalizeEmail(user.email || user.email_normalized);
    if (!id || !email || !user.password_hash) continue;

    await query(
      `INSERT INTO pet_app_users (id, name, email, email_normalized, phone, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, now()), COALESCE($8::timestamptz, now()))
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           email = EXCLUDED.email,
           email_normalized = EXCLUDED.email_normalized,
           phone = EXCLUDED.phone,
           password_hash = EXCLUDED.password_hash,
           updated_at = now()`,
      [
        id,
        cleanText(user.name),
        cleanText(user.email) || email,
        normalizeEmail(user.email_normalized || email),
        cleanText(user.phone),
        cleanText(user.password_hash),
        coerceTimestamp(user.created_at),
        coerceTimestamp(user.updated_at)
      ]
    );
    count += 1;
  }

  return count;
}

async function migrateAttachments(db, query) {
  const attachments = await db.collection("wallet_attachments").find({}).toArray();
  let count = 0;

  for (const attachment of attachments) {
    const userId = cleanText(attachment.user_id);
    const id = cleanText(attachment.id);
    if (!userId || !id) continue;

    await query(
      `INSERT INTO pet_wallet_attachments (
         user_id, id, document_id, name, type, original_type, size, data_url, uploaded_at, stored_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, now()), COALESCE($11::timestamptz, now()))
       ON CONFLICT (user_id, id) DO UPDATE
       SET document_id = EXCLUDED.document_id,
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           original_type = EXCLUDED.original_type,
           size = EXCLUDED.size,
           data_url = EXCLUDED.data_url,
           uploaded_at = EXCLUDED.uploaded_at,
           stored_at = EXCLUDED.stored_at,
           updated_at = now()`,
      [
        userId,
        id,
        cleanText(attachment.document_id),
        cleanText(attachment.name),
        cleanText(attachment.type),
        cleanText(attachment.original_type),
        Math.max(0, Math.round(Number(attachment.size) || 0)),
        cleanText(attachment.data_url),
        coerceTimestamp(attachment.uploaded_at),
        coerceTimestamp(attachment.stored_at),
        coerceTimestamp(attachment.updated_at)
      ]
    );
    count += 1;
  }

  return count;
}

async function migrateWalletStates(db, database) {
  const states = await db.collection("wallet_states").find({}).toArray();
  let count = 0;

  for (const state of states) {
    const userId = cleanText(state.user_id);
    if (!userId) continue;

    await database.collection("wallet_states").replaceOne(
      { user_id: userId },
      {
        user_id: userId,
        state: state.state && typeof state.state === "object" ? state.state : {},
        client_updated_at: coerceTimestamp(state.client_updated_at),
        updated_at: coerceTimestamp(state.updated_at)
      },
      { upsert: true }
    );
    count += 1;
  }

  return count;
}

async function migrateAnalyticsEvents(db, query) {
  const events = await db.collection("analytics_events").find({}).toArray();
  let count = 0;

  for (const event of events) {
    const userId = cleanText(event.user_id);
    const name = cleanText(event.event);
    if (!userId || !name) continue;

    try {
      await query(
        `INSERT INTO pet_analytics_events (event, user_id, metadata, created_at)
         VALUES ($1, $2, $3::jsonb, COALESCE($4::timestamptz, now()))`,
        [
          name,
          userId,
          JSON.stringify(event.metadata && typeof event.metadata === "object" ? event.metadata : {}),
          coerceTimestamp(event.created_at)
        ]
      );
      count += 1;
    } catch (error) {
      if (error?.code !== "23503") throw error;
    }
  }

  return count;
}

main().catch((error) => {
  console.error("Falha na migracao MongoDB -> PostgreSQL:");
  console.error(error?.message || error);
  process.exitCode = 1;
});
