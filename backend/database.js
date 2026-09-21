const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

const DEFAULT_DATABASE_NAME = process.env.PET_DB_NAME || "pet_identification";
const DEFAULT_DATABASE_PORT = process.env.PET_DB_PORT || "55432";
const DEFAULT_DATABASE_URL = `postgresql://postgres@127.0.0.1:${DEFAULT_DATABASE_PORT}/${DEFAULT_DATABASE_NAME}`;
const IS_PRODUCTION_DEPLOY = Boolean(process.env.VERCEL || process.env.RENDER || process.env.NODE_ENV === "production");

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || (!IS_PRODUCTION_DEPLOY ? DEFAULT_DATABASE_URL : "");
  if (!url) throw new Error("DATABASE_URL nao configurado no ambiente de producao.");
  return url;
}

function getDatabaseName() {
  try {
    const pathname = new URL(getDatabaseUrl()).pathname.replace(/^\/+/, "");
    return decodeURIComponent(pathname) || DEFAULT_DATABASE_NAME;
  } catch {
    return process.env.PGDATABASE || DEFAULT_DATABASE_NAME;
  }
}

function sslConfigForDatabaseUrl(databaseUrl) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return undefined;
  }

  const sslMode = parsed.searchParams.get("sslmode") || process.env.PGSSLMODE || "";
  if (sslMode && sslMode !== "disable") return { rejectUnauthorized: false };
  if (process.env.RENDER && !["127.0.0.1", "localhost"].includes(parsed.hostname)) return { rejectUnauthorized: false };
  return undefined;
}

function formatDatabaseError(error) {
  const message = String(error?.message || "");
  if (error?.code === "23505" || error?.code === 11000) return "Este e-mail ja esta cadastrado.";
  if (["28P01", "28000"].includes(error?.code) || /password authentication failed/i.test(message)) {
    return "O PostgreSQL recusou usuario ou senha. Confira DATABASE_URL no Render ou a senha do usuario local.";
  }
  if (error?.code === "3D000") {
    return `O banco PostgreSQL '${getDatabaseName()}' nao existe. Rode npm run db:start localmente ou confira o nome do banco no Render.`;
  }
  if (["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"].includes(error?.code)) {
    return "Nao foi possivel conectar ao PostgreSQL. Confira DATABASE_URL, host, porta, SSL e se o banco esta ligado.";
  }
  if (/self-signed certificate|ssl/i.test(message)) {
    return "Falha de SSL ao conectar ao PostgreSQL. No Render, use a Internal Database URL ou adicione ?sslmode=require na External Database URL.";
  }
  return message || "Erro desconhecido ao acessar o PostgreSQL.";
}

async function createPoolWithSchema() {
  const databaseUrl = getDatabaseUrl();
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: sslConfigForDatabaseUrl(databaseUrl),
    max: Number(process.env.PGPOOL_MAX || (process.env.VERCEL ? 5 : 10)),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  await applySchema(pool);
  await pool.query("SELECT 1");

  return {
    client: pool,
    database: new PostgresDatabase(pool),
    query: pool.query.bind(pool)
  };
}

async function applySchema(pool) {
  const schemaPath = path.join(__dirname, "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const client = await pool.connect();

  try {
    await client.query("SELECT pg_advisory_lock(hashtext('pet_identification_schema'))");
    await client.query(schema);
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('pet_identification_schema'))").catch(() => {});
    client.release();
  }
}

class PostgresDatabase {
  constructor(pool) {
    this.pool = pool;
  }

  async command(command) {
    if (command?.ping) {
      await this.pool.query("SELECT 1");
      return { ok: 1 };
    }
    return { ok: 1 };
  }

  collection(name) {
    return new PostgresCollection(this.pool, name);
  }
}

class QueryCursor {
  constructor(loader) {
    this.loader = loader;
    this.sortSpec = {};
  }

  sort(sortSpec = {}) {
    this.sortSpec = sortSpec;
    return this;
  }

  async toArray() {
    return this.loader(this.sortSpec);
  }
}

class PostgresCollection {
  constructor(pool, name) {
    this.pool = pool;
    this.name = name;
  }

  async insertOne(document) {
    if (this.name === "users") return insertUser(this.pool, document);
    if (this.name === "analytics_events") return insertAnalyticsEvent(this.pool, document);
    throw unsupportedCollectionMethod(this.name, "insertOne");
  }

  async findOne(filter = {}) {
    if (this.name === "users") return findUser(this.pool, filter);
    if (this.name === "wallet_states") return findWalletState(this.pool, filter);
    if (this.name === "wallet_attachments") return findWalletAttachment(this.pool, filter);
    throw unsupportedCollectionMethod(this.name, "findOne");
  }

  find(filter = {}, options = {}) {
    if (this.name === "wallet_states") return new QueryCursor(() => findWalletStates(this.pool, filter, options));
    if (this.name === "sync_chunks") return new QueryCursor((sortSpec) => findSyncChunks(this.pool, filter, sortSpec));
    throw unsupportedCollectionMethod(this.name, "find");
  }

  aggregate(pipeline = []) {
    if (this.name === "analytics_events") return new QueryCursor(() => aggregateAnalyticsEvents(this.pool, pipeline));
    throw unsupportedCollectionMethod(this.name, "aggregate");
  }

  async countDocuments(filter = {}) {
    if (this.name === "users") return countRows(this.pool, "pet_app_users");
    if (this.name === "analytics_events") return countAnalyticsEvents(this.pool, filter);
    throw unsupportedCollectionMethod(this.name, "countDocuments");
  }

  async updateOne(filter = {}, update = {}, options = {}) {
    if (this.name === "wallet_states") return updateWalletState(this.pool, filter, update, options);
    if (this.name === "sync_chunks") return upsertSyncChunk(this.pool, filter, update, options);
    throw unsupportedCollectionMethod(this.name, "updateOne");
  }

  async replaceOne(filter = {}, replacement = {}, options = {}) {
    if (this.name === "wallet_states") return replaceWalletState(this.pool, filter, replacement, options);
    if (this.name === "wallet_attachments") return replaceWalletAttachment(this.pool, filter, replacement, options);
    throw unsupportedCollectionMethod(this.name, "replaceOne");
  }

  async deleteMany(filter = {}) {
    if (this.name === "sync_chunks") return deleteSyncChunks(this.pool, filter);
    throw unsupportedCollectionMethod(this.name, "deleteMany");
  }
}

async function insertUser(pool, user) {
  try {
    const result = await pool.query(
      `INSERT INTO pet_app_users (id, name, email, email_normalized, phone, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, now()), COALESCE($8::timestamptz, now()))
       RETURNING id`,
      [
        cleanText(user.id),
        cleanText(user.name),
        cleanText(user.email),
        normalizeEmail(user.email_normalized || user.email),
        cleanText(user.phone),
        cleanText(user.password_hash),
        coerceTimestamp(user.created_at),
        coerceTimestamp(user.updated_at)
      ]
    );
    return { acknowledged: true, insertedId: result.rows[0]?.id || user.id };
  } catch (error) {
    if (error?.code === "23505") error.code = 11000;
    throw error;
  }
}

async function findUser(pool, filter) {
  if (filter.email_normalized) {
    const result = await pool.query(
      "SELECT id, name, email, phone, password_hash, created_at, updated_at FROM pet_app_users WHERE email_normalized = $1",
      [normalizeEmail(filter.email_normalized)]
    );
    return result.rows[0] || null;
  }

  if (filter.id) {
    const result = await pool.query(
      "SELECT id, name, email, phone, password_hash, created_at, updated_at FROM pet_app_users WHERE id = $1",
      [cleanText(filter.id)]
    );
    return result.rows[0] || null;
  }

  return null;
}

async function findWalletState(pool, filter) {
  const result = await pool.query(
    "SELECT user_id, state, client_updated_at, updated_at FROM pet_wallet_states WHERE user_id = $1",
    [cleanText(filter.user_id)]
  );
  return result.rows[0] || null;
}

async function findWalletStates(pool) {
  const result = await pool.query("SELECT user_id, state, client_updated_at, updated_at FROM pet_wallet_states");
  return result.rows;
}

async function replaceWalletState(pool, filter, replacement, options = {}) {
  if (!options.upsert && !(await findWalletState(pool, filter))) {
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  }

  const userId = cleanText(filter.user_id || replacement.user_id);
  const state = replacement.state && typeof replacement.state === "object" ? replacement.state : {};
  const clientUpdatedAt = coerceTimestamp(replacement.client_updated_at);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO pet_wallet_states (user_id, state, client_updated_at, updated_at)
       VALUES ($1, $2::jsonb, $3, COALESCE($4::timestamptz, now()))
       ON CONFLICT (user_id) DO UPDATE
       SET state = EXCLUDED.state,
           client_updated_at = EXCLUDED.client_updated_at,
           updated_at = now()`,
      [userId, JSON.stringify(state), clientUpdatedAt, coerceTimestamp(replacement.updated_at)]
    );
    await syncStructuredState(client, userId, state);
    await client.query("COMMIT");
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateWalletState(pool, filter, update, options = {}) {
  const set = update?.$set || {};
  const current = await findWalletState(pool, filter);
  if (!current && !options.upsert) {
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  }

  return replaceWalletState(pool, filter, { ...(current || {}), ...set, user_id: cleanText(filter.user_id), state: set.state || current?.state || {} }, { upsert: true });
}

async function replaceWalletAttachment(pool, filter, record, options = {}) {
  if (!options.upsert && !(await findWalletAttachment(pool, filter))) {
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  }

  await pool.query(
    `INSERT INTO pet_wallet_attachments (
       user_id, id, document_id, name, type, original_type, size, data_url, uploaded_at, stored_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::timestamptz, now()))
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
      cleanText(filter.user_id || record.user_id),
      cleanText(filter.id || record.id),
      cleanText(record.document_id),
      cleanText(record.name),
      cleanText(record.type),
      cleanText(record.original_type),
      Math.max(0, Math.round(Number(record.size) || 0)),
      cleanText(record.data_url),
      coerceTimestamp(record.uploaded_at),
      coerceTimestamp(record.stored_at) || new Date().toISOString(),
      coerceTimestamp(record.updated_at)
    ]
  );

  return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
}

async function findWalletAttachment(pool, filter) {
  const result = await pool.query(
    `SELECT user_id, id, document_id, name, type, original_type, size, data_url, uploaded_at, stored_at, updated_at
     FROM pet_wallet_attachments
     WHERE user_id = $1 AND id = $2`,
    [cleanText(filter.user_id), cleanText(filter.id)]
  );
  return result.rows[0] || null;
}

async function upsertSyncChunk(pool, filter, update, options = {}) {
  const set = update?.$set || {};
  if (!options.upsert) throw unsupportedCollectionMethod("sync_chunks", "updateOne without upsert");

  await pool.query(
    `INSERT INTO pet_sync_chunks (user_id, sync_id, chunk_index, total, body_bytes, data, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, now()))
     ON CONFLICT (user_id, sync_id, chunk_index) DO UPDATE
     SET total = EXCLUDED.total,
         body_bytes = EXCLUDED.body_bytes,
         data = EXCLUDED.data,
         updated_at = now()`,
    [
      cleanText(filter.user_id || set.user_id),
      cleanText(filter.sync_id || set.sync_id),
      Number(filter.index ?? set.index),
      Number(set.total) || 0,
      Number(set.body_bytes) || 0,
      typeof set.data === "string" ? set.data : "",
      coerceTimestamp(set.updated_at)
    ]
  );

  return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
}

async function findSyncChunks(pool, filter, sortSpec = {}) {
  const orderBy = sortSpec.index === -1 ? "DESC" : "ASC";
  const result = await pool.query(
    `SELECT user_id, sync_id, chunk_index AS index, total, body_bytes, data, updated_at
     FROM pet_sync_chunks
     WHERE user_id = $1 AND sync_id = $2
     ORDER BY chunk_index ${orderBy}`,
    [cleanText(filter.user_id), cleanText(filter.sync_id)]
  );
  return result.rows;
}

async function deleteSyncChunks(pool, filter) {
  if (filter.updated_at?.$lt) {
    const result = await pool.query(
      "DELETE FROM pet_sync_chunks WHERE user_id = $1 AND updated_at < $2",
      [cleanText(filter.user_id), coerceTimestamp(filter.updated_at.$lt) || new Date(0).toISOString()]
    );
    return { acknowledged: true, deletedCount: result.rowCount };
  }

  const result = await pool.query(
    "DELETE FROM pet_sync_chunks WHERE user_id = $1 AND sync_id = $2",
    [cleanText(filter.user_id), cleanText(filter.sync_id)]
  );
  return { acknowledged: true, deletedCount: result.rowCount };
}

async function insertAnalyticsEvent(pool, document) {
  const result = await pool.query(
    `INSERT INTO pet_analytics_events (event, user_id, metadata, created_at)
     VALUES ($1, $2, $3::jsonb, COALESCE($4::timestamptz, now()))
     RETURNING id`,
    [
      cleanText(document.event),
      cleanText(document.user_id),
      JSON.stringify(document.metadata && typeof document.metadata === "object" ? document.metadata : {}),
      coerceTimestamp(document.created_at)
    ]
  );
  return { acknowledged: true, insertedId: result.rows[0]?.id };
}

async function aggregateAnalyticsEvents(pool, pipeline) {
  const first = pipeline[0] || {};
  const second = pipeline[1] || {};

  if (first.$match?.created_at?.$gte && second.$group?._id === "$user_id") {
    const result = await pool.query(
      "SELECT user_id AS _id FROM pet_analytics_events WHERE created_at >= $1 GROUP BY user_id",
      [coerceTimestamp(first.$match.created_at.$gte)]
    );
    return result.rows;
  }

  if (first.$group?._id === "$event") {
    const result = await pool.query(
      "SELECT event AS _id, COUNT(*)::int AS total FROM pet_analytics_events GROUP BY event"
    );
    return result.rows;
  }

  return [];
}

async function countAnalyticsEvents(pool, filter = {}) {
  if (filter.event) {
    const result = await pool.query("SELECT COUNT(*)::int AS total FROM pet_analytics_events WHERE event = $1", [cleanText(filter.event)]);
    return result.rows[0]?.total || 0;
  }

  return countRows(pool, "pet_analytics_events");
}

async function countRows(pool, tableName) {
  const result = await pool.query(`SELECT COUNT(*)::int AS total FROM ${tableName}`);
  return result.rows[0]?.total || 0;
}

async function syncStructuredState(client, userId, rawState) {
  const state = rawState && typeof rawState === "object" ? rawState : {};
  const owner = state.owner && typeof state.owner === "object" ? state.owner : {};
  const pets = Array.isArray(state.pets) ? state.pets.filter((pet) => cleanText(pet.id) && cleanText(pet.name)) : [];
  const petIds = new Set(pets.map((pet) => cleanText(pet.id)));
  const vaccines = (Array.isArray(state.vaccines) ? state.vaccines : []).filter((item) => cleanText(item.id) && petIds.has(cleanText(item.petId)));
  const documents = (Array.isArray(state.documents) ? state.documents : []).filter((item) => cleanText(item.id) && petIds.has(cleanText(item.petId)));
  const travelByPet = state.travelByPet && typeof state.travelByPet === "object" ? state.travelByPet : {};
  const feedback = Array.isArray(state.feedback) ? state.feedback : [];

  await client.query(
    `INSERT INTO pet_owners (
       user_id, name, cpf, phone, email, address, address_number, address_complement,
       neighborhood, city, state, zip_code, latitude, longitude, emergency_name, emergency_phone
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (user_id) DO UPDATE
     SET name = EXCLUDED.name,
         cpf = EXCLUDED.cpf,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         address = EXCLUDED.address,
         address_number = EXCLUDED.address_number,
         address_complement = EXCLUDED.address_complement,
         neighborhood = EXCLUDED.neighborhood,
         city = EXCLUDED.city,
         state = EXCLUDED.state,
         zip_code = EXCLUDED.zip_code,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         emergency_name = EXCLUDED.emergency_name,
         emergency_phone = EXCLUDED.emergency_phone`,
    [
      userId,
      cleanText(owner.name),
      cleanText(owner.cpf),
      cleanText(owner.phone),
      cleanText(owner.email),
      cleanText(owner.address),
      cleanText(owner.addressNumber),
      cleanText(owner.addressComplement),
      cleanText(owner.neighborhood),
      cleanText(owner.city),
      cleanText(owner.state),
      cleanText(owner.zipCode),
      finiteNumber(owner.latitude),
      finiteNumber(owner.longitude),
      cleanText(owner.emergencyName),
      cleanText(owner.emergencyPhone)
    ]
  );

  await client.query("DELETE FROM pet_documents WHERE user_id = $1", [userId]);
  await client.query("DELETE FROM pet_vaccines WHERE user_id = $1", [userId]);
  await client.query("DELETE FROM pet_travel_items WHERE user_id = $1", [userId]);
  await client.query("DELETE FROM pet_travel_plans WHERE user_id = $1", [userId]);
  await client.query("DELETE FROM pet_feedback WHERE user_id = $1", [userId]);
  await client.query("DELETE FROM pet_pets WHERE user_id = $1", [userId]);

  for (const pet of pets) {
    await client.query(
      `INSERT INTO pet_pets (
         user_id, id, name, species, breed, sex, birth_date, weight, color, microchip,
         registry, temperament, allergies, notes, avatar_color
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        userId,
        cleanText(pet.id),
        cleanText(pet.name),
        cleanText(pet.species),
        cleanText(pet.breed),
        cleanText(pet.sex),
        coerceDate(pet.birthDate),
        cleanText(pet.weight),
        cleanText(pet.color),
        cleanText(pet.microchip),
        cleanText(pet.registry),
        cleanText(pet.temperament),
        cleanText(pet.allergies),
        cleanText(pet.notes),
        cleanText(pet.avatarColor) || "#17716b"
      ]
    );
  }

  for (const vaccine of vaccines) {
    await client.query(
      `INSERT INTO pet_vaccines (
         user_id, id, pet_id, name, dose, application_date, due_date, clinic, veterinarian, batch, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        cleanText(vaccine.id),
        cleanText(vaccine.petId),
        cleanText(vaccine.name),
        "",
        coerceDate(vaccine.applicationDate),
        coerceDate(vaccine.dueDate),
        cleanText(vaccine.clinic),
        cleanText(vaccine.veterinarian),
        cleanText(vaccine.batch),
        cleanText(vaccine.notes)
      ]
    );
  }

  for (const document of documents) {
    const attachment = attachmentMetadataForDocument(document.attachment);
    await client.query(
      `INSERT INTO pet_documents (
         user_id, id, pet_id, title, kind, document_date, expires_at, notes,
         attachment_name, attachment_type, attachment_original_type, attachment_size,
         attachment_storage_id, attachment_url, attachment_uploaded_at, attachment_stored_at,
         attachment_has_data, attachment_data
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        userId,
        cleanText(document.id),
        cleanText(document.petId),
        cleanText(document.title),
        cleanText(document.kind),
        coerceDate(document.date),
        coerceDate(document.expiresAt),
        cleanText(document.notes),
        attachment.name,
        attachment.type,
        attachment.originalType,
        attachment.size,
        attachment.storageId,
        attachment.url,
        coerceTimestamp(attachment.uploadedAt),
        coerceTimestamp(attachment.storedAt),
        attachment.hasData,
        attachment.dataUrl
      ]
    );
  }

  for (const [petId, petTravel] of Object.entries(travelByPet)) {
    if (petIds.size && !petIds.has(cleanText(petId))) continue;
    await upsertTravel(client, userId, petId, petTravel);
  }

  const activeTravel = state.travel && typeof state.travel === "object" ? state.travel : null;
  if (activeTravel) {
    const activePetId = cleanText(activeTravel.selectedPetId || state.selectedPetId || pets[0]?.id || "");
    if (activePetId && (!petIds.size || petIds.has(activePetId))) await upsertTravel(client, userId, activePetId, activeTravel);
  }

  for (const item of feedback) {
    const feedbackEntry = item && typeof item === "object" ? item : {};
    const id = cleanText(feedbackEntry.id);
    if (!id) continue;
    await client.query(
      `INSERT INTO pet_feedback (
         user_id, id, pet_id, veterinary_satisfaction, app_rating, improvements, suggestions, submitted_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, now()))
       ON CONFLICT (user_id, id) DO UPDATE
       SET pet_id = EXCLUDED.pet_id,
           veterinary_satisfaction = EXCLUDED.veterinary_satisfaction,
           app_rating = EXCLUDED.app_rating,
           improvements = EXCLUDED.improvements,
           suggestions = EXCLUDED.suggestions,
           submitted_at = EXCLUDED.submitted_at`,
      [
        userId,
        id,
        cleanText(feedbackEntry.petId || state.selectedPetId || pets[0]?.id || ""),
        boundedInteger(feedbackEntry.veterinarySatisfaction, 0, 5),
        boundedInteger(feedbackEntry.appRating, 0, 5),
        cleanText(feedbackEntry.improvements),
        cleanText(feedbackEntry.suggestions),
        coerceTimestamp(feedbackEntry.submittedAt)
      ]
    );
  }
}

async function upsertTravel(client, userId, petId, travel = {}) {
  const entry = travel && typeof travel === "object" ? travel : {};
  const cleanPetId = cleanText(petId || entry.selectedPetId);
  if (!cleanPetId) return;

  await client.query(
    `INSERT INTO pet_travel_plans (user_id, pet_id, destination, travel_date, transport, selected_pet_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, pet_id) DO UPDATE
     SET destination = EXCLUDED.destination,
         travel_date = EXCLUDED.travel_date,
         transport = EXCLUDED.transport,
         selected_pet_id = EXCLUDED.selected_pet_id,
         notes = EXCLUDED.notes`,
    [
      userId,
      cleanPetId,
      cleanText(entry.destination),
      coerceDate(entry.date),
      cleanText(entry.transport),
      cleanText(entry.selectedPetId || cleanPetId),
      cleanText(entry.notes)
    ]
  );

  const items = entry.items && typeof entry.items === "object" ? entry.items : {};
  for (const [key, checked] of Object.entries(items)) {
    await client.query(
      `INSERT INTO pet_travel_items (user_id, pet_id, item_key, checked)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, pet_id, item_key) DO UPDATE SET checked = EXCLUDED.checked`,
      [userId, cleanPetId, cleanText(key), Boolean(checked)]
    );
  }
}

function attachmentMetadataForDocument(attachment = {}) {
  const source = attachment && typeof attachment === "object" ? attachment : {};
  const dataUrl = safeAttachmentDataUrl(source.dataUrl);
  const storageId = cleanText(source.storageId);
  const url = storageId ? `/api/attachments/${encodeURIComponent(storageId)}` : cleanText(source.url);
  return {
    name: cleanText(source.name).slice(0, 240),
    type: cleanText(source.type || source.originalType).slice(0, 120),
    originalType: cleanText(source.originalType).slice(0, 120),
    size: Math.max(0, Math.round(Number(source.size) || Buffer.byteLength(dataUrl, "utf8") || 0)),
    storageId,
    url,
    uploadedAt: coerceTimestamp(source.uploadedAt),
    storedAt: coerceTimestamp(source.storedAt),
    hasData: Boolean(source.hasData || storageId || url || dataUrl),
    dataUrl
  };
}

function safeAttachmentDataUrl(value = "") {
  const text = cleanText(value);
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(text)) return text;
  if (/^data:application\/pdf;base64,/i.test(text)) return text;
  return "";
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function finiteNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function coerceDate(value) {
  const text = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function coerceTimestamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function boundedInteger(value, min, max) {
  const number = Math.round(Number(value) || 0);
  return Math.max(min, Math.min(max, number));
}

function unsupportedCollectionMethod(collectionName, methodName) {
  return new Error(`Operacao ${methodName} nao implementada para a tabela PostgreSQL '${collectionName}'.`);
}

module.exports = {
  createPoolWithSchema,
  formatDatabaseError,
  getDatabaseName,
  getDatabaseUrl
};
