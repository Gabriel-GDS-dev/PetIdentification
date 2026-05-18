const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { createPoolWithSchema, getDatabaseName, getDatabaseUrl } = require("./database");

const PORT = Number(process.env.PORT || 5241);
const HOST = process.env.HOST || "0.0.0.0";
const SESSION_SECRET = process.env.SESSION_SECRET || "pet-identification-dev-secret";
const MAX_JSON_BYTES = 2 * 1024 * 1024;

const PUBLIC_DIR = path.join(__dirname, "..", "frontend");
const STATIC_FILES = new Set([
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/service-worker.js",
  "/manifest.webmanifest",
  "/assets/pet-icon.svg",
  "/assets/pet-icon-dark.svg",
  "/assets/pet-icon-180.png",
  "/assets/pet-icon-192.png",
  "/assets/pet-icon-512.png",
  "/assets/pet-icon-maskable-512.png",
  "/assets/pet-icon-dark-192.png",
  "/assets/pet-icon-dark-512.png"
]);

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

let pool;

async function main() {
  pool = await createPoolWithSchema();
  const server = http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      if (error.statusCode) {
        return sendJson(response, error.statusCode, { error: error.message });
      }
      console.error(error);
      sendJson(response, 500, { error: "Erro interno do servidor." });
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`Pet Identification rodando em http://${HOST}:${PORT}`);
    console.log(`Banco conectado: ${getDatabaseName(getDatabaseUrl())}`);
  });
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    return sendJson(response, 204, null);
  }

  if (url.pathname.startsWith("/api/")) {
    return handleApi(request, response, url);
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return sendText(response, 405, "Metodo nao permitido.");
  }

  return serveStatic(url, response, request.method === "HEAD");
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    await pool.query("SELECT 1");
    const counts = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM pet_app_users) AS users,
        (SELECT count(*)::int FROM pet_pets) AS pets,
        (SELECT count(*)::int FROM pet_vaccines) AS vaccines,
        (SELECT count(*)::int FROM pet_documents) AS documents
    `);
    return sendJson(response, 200, { ok: true, database: getDatabaseName(getDatabaseUrl()), counts: counts.rows[0] });
  }

  if (request.method === "POST" && url.pathname === "/api/register") {
    const body = await readJson(request);
    return registerUser(response, body);
  }

  if (request.method === "POST" && url.pathname === "/api/login") {
    const body = await readJson(request);
    return loginUser(response, body);
  }

  if (request.method === "GET" && url.pathname === "/api/state") {
    const user = await requireUser(request);
    const state = await getStoredState(user);
    return sendJson(response, 200, { user: publicUser(user), state, syncedAt: new Date().toISOString() });
  }

  if (request.method === "POST" && url.pathname === "/api/sync") {
    const user = await requireUser(request);
    const body = await readJson(request);
    const state = await saveWalletState(user, body.state, body.clientUpdatedAt);
    return sendJson(response, 200, { user: publicUser(user), state, syncedAt: new Date().toISOString() });
  }

  return sendJson(response, 404, { error: "Rota da API nao encontrada." });
}

async function registerUser(response, body) {
  const name = cleanText(body.name);
  const email = normalizeEmail(body.email);
  const phone = cleanText(body.phone);
  const password = String(body.password || "");

  if (!name || !email || !phone || !password) {
    return sendJson(response, 400, { error: "Preencha nome, e-mail, telefone e senha." });
  }

  if (password.length < 4) {
    return sendJson(response, 400, { error: "Use uma senha com pelo menos 4 caracteres." });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return sendJson(response, 409, { error: "Este e-mail ja esta cadastrado." });
  }

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const result = await pool.query(
    `INSERT INTO pet_app_users (id, name, email, email_normalized, phone, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, email, phone, created_at`,
    [id, name, email, email, phone, passwordHash]
  );

  const user = result.rows[0];
  return sendJson(response, 201, { user: publicUser(user), token: signToken(user), state: null });
}

async function loginUser(response, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const user = await findUserByEmail(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return sendJson(response, 401, { error: "E-mail ou senha invalidos." });
  }

  const state = await getStoredState(user);
  return sendJson(response, 200, { user: publicUser(user), token: signToken(user), state });
}

async function findUserByEmail(email) {
  const result = await pool.query(
    "SELECT id, name, email, phone, password_hash, created_at FROM pet_app_users WHERE email_normalized = $1",
    [normalizeEmail(email)]
  );
  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await pool.query("SELECT id, name, email, phone, password_hash, created_at FROM pet_app_users WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function getStoredState(user) {
  const result = await pool.query("SELECT state FROM pet_wallet_states WHERE user_id = $1", [user.id]);
  if (!result.rowCount) return null;
  return stateForClient(result.rows[0].state, user);
}

async function saveWalletState(user, incomingState, clientUpdatedAt) {
  const state = sanitizeIncomingState(incomingState, user);
  const owner = state.owner || {};
  const pets = Array.isArray(state.pets) ? state.pets.filter((pet) => cleanText(pet.id) && cleanText(pet.name)) : [];
  const petIds = new Set(pets.map((pet) => cleanText(pet.id)));
  const vaccines = (Array.isArray(state.vaccines) ? state.vaccines : []).filter((item) => cleanText(item.id) && petIds.has(cleanText(item.petId)));
  const documents = (Array.isArray(state.documents) ? state.documents : []).filter((item) => cleanText(item.id) && petIds.has(cleanText(item.petId)));
  const travel = state.travel || {};
  const travelItems = travel.items && typeof travel.items === "object" ? travel.items : {};

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO pet_wallet_states (user_id, state, client_updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET state = EXCLUDED.state, client_updated_at = EXCLUDED.client_updated_at`,
      [user.id, state, coerceTimestamp(clientUpdatedAt)]
    );

    await client.query(
      `INSERT INTO pet_owners (user_id, name, cpf, phone, email, address, neighborhood, city, state, zip_code, emergency_name, emergency_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (user_id)
       DO UPDATE SET
        name = EXCLUDED.name,
        cpf = EXCLUDED.cpf,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        neighborhood = EXCLUDED.neighborhood,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip_code = EXCLUDED.zip_code,
        emergency_name = EXCLUDED.emergency_name,
        emergency_phone = EXCLUDED.emergency_phone`,
      [
        user.id,
        cleanText(owner.name),
        cleanText(owner.cpf),
        cleanText(owner.phone),
        cleanText(owner.email),
        cleanText(owner.address),
        cleanText(owner.neighborhood),
        cleanText(owner.city),
        cleanText(owner.state),
        cleanText(owner.zipCode),
        cleanText(owner.emergencyName),
        cleanText(owner.emergencyPhone)
      ]
    );

    await client.query("DELETE FROM pet_documents WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM pet_vaccines WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM pet_pets WHERE user_id = $1", [user.id]);

    for (const pet of pets) {
      await client.query(
        `INSERT INTO pet_pets (
          user_id, id, name, species, breed, sex, birth_date, weight, color,
          microchip, registry, temperament, allergies, notes, avatar_color
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          user.id,
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
          user_id, id, pet_id, name, dose, application_date, due_date,
          clinic, veterinarian, batch, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          user.id,
          cleanText(vaccine.id),
          cleanText(vaccine.petId),
          cleanText(vaccine.name),
          cleanText(vaccine.dose),
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
      await client.query(
        `INSERT INTO pet_documents (
          user_id, id, pet_id, title, kind, document_date, expires_at, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.id,
          cleanText(document.id),
          cleanText(document.petId),
          cleanText(document.title),
          cleanText(document.kind),
          coerceDate(document.date),
          coerceDate(document.expiresAt),
          cleanText(document.notes)
        ]
      );
    }

    await client.query(
      `INSERT INTO pet_travel_plans (user_id, destination, travel_date, transport, selected_pet_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id)
       DO UPDATE SET
        destination = EXCLUDED.destination,
        travel_date = EXCLUDED.travel_date,
        transport = EXCLUDED.transport,
        selected_pet_id = EXCLUDED.selected_pet_id,
        notes = EXCLUDED.notes`,
      [
        user.id,
        cleanText(travel.destination),
        coerceDate(travel.date),
        cleanText(travel.transport),
        cleanText(travel.selectedPetId),
        cleanText(travel.notes)
      ]
    );

    await client.query("DELETE FROM pet_travel_items WHERE user_id = $1", [user.id]);
    for (const [key, checked] of Object.entries(travelItems)) {
      await client.query(
        "INSERT INTO pet_travel_items (user_id, item_key, checked) VALUES ($1, $2, $3)",
        [user.id, cleanText(key), Boolean(checked)]
      );
    }

    await client.query("COMMIT");
    return stateForClient(state, user);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function sanitizeIncomingState(incomingState, user) {
  const state = incomingState && typeof incomingState === "object" ? JSON.parse(JSON.stringify(incomingState)) : {};
  delete state.sync;
  state.auth = {
    ...(state.auth || {}),
    currentUserEmail: user.email,
    authView: "login",
    trustedDevice: true,
    apiToken: ""
  };
  state.users = upsertPublicUser(state.users, user);
  state.owner = state.owner && typeof state.owner === "object" ? state.owner : {};
  state.pets = Array.isArray(state.pets) ? state.pets : [];
  state.vaccines = Array.isArray(state.vaccines) ? state.vaccines : [];
  state.documents = Array.isArray(state.documents) ? state.documents : [];
  state.travel = state.travel && typeof state.travel === "object" ? state.travel : {};
  return state;
}

function stateForClient(storedState, user) {
  const state = storedState && typeof storedState === "object" ? JSON.parse(JSON.stringify(storedState)) : {};
  state.auth = {
    ...(state.auth || {}),
    currentUserEmail: user.email,
    authView: "login",
    trustedDevice: true,
    apiToken: ""
  };
  state.users = upsertPublicUser(state.users, user);
  delete state.sync;
  return state;
}

function upsertPublicUser(users, user) {
  const cleanUsers = Array.isArray(users) ? users.filter(Boolean) : [];
  const sanitized = cleanUsers
    .map((item) => ({
      id: item.id || undefined,
      name: cleanText(item.name),
      email: normalizeEmail(item.email),
      phone: cleanText(item.phone),
      createdAt: item.createdAt || item.created_at || undefined
    }))
    .filter((item) => item.email && item.email !== normalizeEmail(user.email));

  return [...sanitized, publicUser(user)];
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    createdAt: user.created_at || user.createdAt || new Date().toISOString()
  };
}

async function requireUser(request) {
  const header = request.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw httpError(401, "Sessao nao informada.");

  const payload = verifyToken(match[1]);
  const user = await findUserById(payload.sub);
  if (!user) throw httpError(401, "Sessao invalida.");
  return user;
}

function signToken(user) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
    })
  );
  const signature = sign(`${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  const [header, payload, signature] = String(token || "").split(".");
  if (!header || !payload || !signature) throw httpError(401, "Sessao invalida.");

  const expected = sign(`${header}.${payload}`);
  if (!timingSafeEqual(signature, expected)) throw httpError(401, "Sessao invalida.");

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw httpError(401, "Sessao invalida.");
  }
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) throw httpError(401, "Sessao expirada.");
  return data;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.pbkdf2Sync(String(password), salt, 310000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$310000$${salt}$${derived}`;
}

function verifyPassword(password, passwordHash) {
  const [algorithm, iterations, salt, hash] = String(passwordHash || "").split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterations || !salt || !hash) return false;
  const derived = crypto.pbkdf2Sync(String(password), salt, Number(iterations), 32, "sha256").toString("hex");
  return timingSafeEqual(derived, hash);
}

function timingSafeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function coerceDate(value) {
  const text = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function coerceTimestamp(value) {
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function readJson(request) {
  const chunks = [];
  let total = 0;

  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_JSON_BYTES) throw httpError(413, "JSON muito grande.");
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw httpError(400, "JSON invalido.");
  }
}

function serveStatic(url, response, headOnly = false) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  if (!STATIC_FILES.has(url.pathname) && !STATIC_FILES.has(pathname)) {
    return sendText(response, 404, "Arquivo nao encontrado.");
  }

  const publicRoot = path.resolve(PUBLIC_DIR);
  const filePath = path.resolve(publicRoot, pathname.replace(/^\/+/, ""));
  if (!filePath.startsWith(publicRoot)) return sendText(response, 403, "Acesso negado.");

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) return sendText(response, 404, "Arquivo nao encontrado.");

    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream",
      "Cache-Control": extension === ".html" ? "no-store" : "no-cache"
    });

    if (headOnly) return response.end();
    fs.createReadStream(filePath).pipe(response);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  });
  if (statusCode === 204) return response.end();
  return response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

process.on("uncaughtException", (error) => {
  if (error.statusCode) return;
  console.error(error);
});

main().catch((error) => {
  console.error("Nao foi possivel iniciar o servidor.");
  console.error(error.message);
  process.exitCode = 1;
});
