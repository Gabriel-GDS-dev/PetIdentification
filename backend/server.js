const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const os = require("node:os");
const crypto = require("node:crypto");
const { createPoolWithSchema, formatDatabaseError, getDatabaseName } = require("./database");

const PORT = Number(process.env.PORT || 5241);
const HOST = process.env.HOST || "0.0.0.0";
const IS_PRODUCTION_DEPLOY = Boolean(process.env.VERCEL || process.env.RENDER || process.env.NODE_ENV === "production");
const SESSION_SECRET = process.env.SESSION_SECRET || (IS_PRODUCTION_DEPLOY ? "" : "pet-identification-dev-secret");
const ANALYTICS_ADMIN_TOKEN = process.env.ANALYTICS_ADMIN_TOKEN || "";
const ADMIN_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL || "");
const ANALYTICS_EVENTS = new Set([
  "LOGIN", "CADASTRO_USUARIO", "CADASTRO_PET", "ADICIONOU_VACINA",
  "UPLOAD_DOCUMENTO", "VISUALIZOU_CARTEIRA", "ABRIU_APP", "SINCRONIZOU_DADOS",
  "FEEDBACK_ENVIADO", "API_ERROR"
]);
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const SYNC_CHUNK_MAX_COUNT = 80;
const SYNC_CHUNK_MAX_AGE_MS = 60 * 60 * 1000;
const EXTERNAL_REQUEST_TIMEOUT_MS = 22000;
const OVERPASS_REQUEST_TIMEOUT_MS = 12000;
const OVERPASS_API_URL = process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter";
const OVERPASS_API_URLS = (process.env.OVERPASS_API_URLS ? process.env.OVERPASS_API_URLS.split(/[,\s]+/) : [OVERPASS_API_URL, "https://overpass.kumi.systems/api/interpreter", "https://lz4.overpass-api.de/api/interpreter"]).filter(Boolean);
const GEOCODING_API_URL = process.env.GEOCODING_API_URL || "https://nominatim.openstreetmap.org/search";
const EXTERNAL_USER_AGENT = "RegistroDigitalAnimal/1.0 (local animal wallet application)";
const DEFAULT_CLINIC_RADIUS = 12000;
const CLINIC_SEARCH_RADII = [DEFAULT_CLINIC_RADIUS, 25000, 50000];
const MAX_CLINIC_RADIUS = CLINIC_SEARCH_RADII[CLINIC_SEARCH_RADII.length - 1];
const geocodeCache = new Map();
let lastGeocodeRequestAt = 0;
const PROJECT_DIR = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(PROJECT_DIR, "frontend");
const EXTRA_STATIC_FILES = new Map([
  ["/tcc_screenshots_mobile/Frente.png", path.join(PROJECT_DIR, "tcc_screenshots_mobile", "Frente.png")],
  ["/tcc_screenshots_mobile/Verso.png", path.join(PROJECT_DIR, "tcc_screenshots_mobile", "Verso.png")]
]);
const STATIC_FILES = new Set([
  "/", "/index.html", "/styles.css", "/app.js", "/service-worker.js", "/manifest.webmanifest",
  "/assets/pet-icon.svg", "/assets/pet-icon-dark.svg", "/assets/pet-icon-180.png", "/assets/pet-icon-192.png", "/assets/pet-icon-512.png",
  "/assets/pet-icon-maskable-512.png", "/assets/pet-icon-dark-192.png", "/assets/pet-icon-dark-512.png",
  "/assets/fluxograma-registro-digital-animal.svg", "/assets/fluxograma-registro-digital-animal.png",
  "/admin/analytics", "/admin/analytics.html"
]);
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8"
};
let pool;
let poolPromise;

async function main() {
  const server = http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      if (error.statusCode) return sendJson(response, error.statusCode, { error: error.message });
      console.error(error); sendJson(response, 500, { error: "Erro interno do servidor." });
    });
  });
  server.listen(PORT, HOST, () => {
    console.log(`Registro Digital Animal rodando no computador: http://127.0.0.1:${PORT}`);
    for (const accessUrl of getNetworkAccessUrls(PORT)) console.log(`Abra no celular conectado ao mesmo Wi-Fi: ${accessUrl}`);
    initializePool()
      .then(() => console.log(`Banco conectado: MongoDB/${getDatabaseName()}`))
      .catch((error) => console.error("Banco indisponivel durante a inicializacao:", publicStartupErrorMessage(error)));
  });
}
async function initializePool() {
  if (pool) return pool;
  if (!poolPromise) {
    poolPromise = createPoolWithSchema().then((createdPool) => {
      pool = createdPool;
      return pool;
    }).catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}
function getNetworkAccessUrls(port) {
  if (HOST !== "0.0.0.0" && HOST !== "::") return [`http://${HOST}:${port}`];
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) for (const entry of entries || []) {
    if (entry.family !== "IPv4" || entry.internal || !isPrivateIpv4(entry.address)) continue;
    addresses.push(entry.address);
  }
  return [...new Set(addresses)].map((address) => `http://${address}:${port}`);
}
function isPrivateIpv4(address) {
  if (/^10\./.test(address) || /^192\.168\./.test(address)) return true;
  const match = address.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}
async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) return sendJson(response, 204, null);
  if (url.pathname.startsWith("/api/")) return handleApi(request, response, url);
  if (request.method !== "GET" && request.method !== "HEAD") return sendText(response, 405, "Metodo nao permitido.");
  return serveStatic(url, response, request.method === "HEAD");
}
async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/live") {
    return sendJson(response, 200, { ok: true, service: "pet-identification", checkedAt: new Date().toISOString() });
  }
  assertSessionSecret();
  await initializePool();
  if (request.method === "GET" && url.pathname === "/api/health") {
    await pool.database.command({ ping: 1 });
    const users = await pool.database.collection("users").countDocuments();
    const states = await pool.database.collection("wallet_states").find({}, { projection: { state: 1 } }).toArray();
    const counts = states.reduce((total, item) => {
      const state = item.state || {};
      total.pets += Array.isArray(state.pets) ? state.pets.length : 0;
      total.vaccines += Array.isArray(state.vaccines) ? state.vaccines.length : 0;
      total.documents += Array.isArray(state.documents) ? state.documents.length : 0;
      return total;
    }, { users, pets: 0, vaccines: 0, documents: 0 });
    return sendJson(response, 200, { ok: true, database: getDatabaseName(), counts });
  }
  if (request.method === "GET" && url.pathname === "/api/address/cep") return lookupAddressByCep(response, url.searchParams.get("cep"));
  if (request.method === "GET" && url.pathname === "/api/clinics/nearby") return findNearbyClinics(response, url.searchParams);
  if (request.method === "POST" && url.pathname === "/api/register") return registerUser(response, await readJson(request));
  if (request.method === "POST" && url.pathname === "/api/login") return loginUser(response, await readJson(request));
  if (request.method === "POST" && url.pathname === "/api/analytics/event") {
    const user = await requireUser(request);
    return recordAnalyticsEvent(response, user, await readJson(request));
  }
  if (request.method === "GET" && url.pathname === "/api/admin/analytics") {
    requireAnalyticsAdmin(request);
    try {
      return sendJson(response, 200, await getAnalyticsDashboard());
    } catch (error) {
      console.error("Falha ao carregar analytics administrativo:", {
        name: error?.name,
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      });
      throw httpError(503, "Nao foi possivel consultar o analytics no MongoDB. Verifique os logs do Render.");
    }
  }
  if (request.method === "GET" && url.pathname === "/api/state") {
    const user = await requireUser(request); return sendJson(response, 200, { user: publicUser(user), state: await getStoredState(user), syncedAt: new Date().toISOString() });
  }
  if (request.method === "POST" && url.pathname === "/api/attachments") {
    const user = await requireUser(request); const attachment = await saveAttachment(user, await readJson(request));
    return sendJson(response, 200, { user: publicUser(user), attachment, syncedAt: new Date().toISOString() });
  }
  {
    const attachmentMatch = url.pathname.match(/^\/api\/attachments\/([^/]+)$/);
    if (request.method === "GET" && attachmentMatch) {
      const user = await requireUser(request); const attachment = await getAttachment(user, decodeURIComponent(attachmentMatch[1]));
      return sendJson(response, 200, { user: publicUser(user), attachment, syncedAt: new Date().toISOString() });
    }
  }
  if (request.method === "POST" && url.pathname === "/api/sync/chunk") {
    const user = await requireUser(request); const payload = await saveSyncChunk(user, await readJson(request));
    return sendJson(response, 200, payload);
  }
  if (request.method === "POST" && url.pathname === "/api/sync") {
    const user = await requireUser(request); const body = await readJson(request); const state = await saveWalletState(user, body.state, body.clientUpdatedAt);
    const payload = { user: publicUser(user), syncedAt: new Date().toISOString() };
    if (body.returnState !== false) payload.state = state;
    return sendJson(response, 200, payload);
  }
  return sendJson(response, 404, { error: "Rota da API nao encontrada." });
}
async function lookupAddressByCep(response, rawCep) {
  try { return sendJson(response, 200, await lookupCepAddress(rawCep)); }
  catch (error) { if (error.statusCode) return sendJson(response, error.statusCode, { error: error.message }); throw error; }
}
async function lookupCepAddress(rawCep) {
  const cep = cleanText(rawCep).replace(/\D/g, "");
  if (!/^\d{8}$/.test(cep)) throw httpError(400, "Informe um CEP com 8 digitos.");
  const [viaCepResult, brasilApiResult] = await Promise.allSettled([fetchExternalJson(`https://viacep.com.br/ws/${cep}/json/`), fetchExternalJson(`https://brasilapi.com.br/api/cep/v2/${cep}`).catch(() => null)]);
  const viaCep = viaCepResult.status === "fulfilled" ? viaCepResult.value : null;
  const brasilApi = brasilApiResult.status === "fulfilled" ? brasilApiResult.value : null;
  if (viaCep?.erro && !brasilApi) throw httpError(404, "CEP nao encontrado.");
  if (!viaCep && !brasilApi) throw httpError(502, "Servicos de CEP indisponiveis.");
  const addressData = { zipCode: viaCep?.cep || formatCep(brasilApi?.cep || cep), address: viaCep?.logradouro || brasilApi?.street || "", neighborhood: viaCep?.bairro || brasilApi?.neighborhood || "", city: viaCep?.localidade || brasilApi?.city || "", state: viaCep?.uf || brasilApi?.state || "", ibge: viaCep?.ibge || "" };
  const coordinates = brasilApi?.location?.coordinates || {};
  let latitude = finiteNumber(coordinates.latitude), longitude = finiteNumber(coordinates.longitude);
  if (latitude === null || longitude === null) { const geocoded = await geocodePublicAddress(addressData).catch(() => null); latitude = geocoded?.latitude ?? null; longitude = geocoded?.longitude ?? null; }
  return { ...addressData, latitude, longitude };
}
async function geocodePublicAddress(address) {
  const queries = buildGeocodeQueries(address); if (!queries.length) return null;
  for (const query of queries) { const result = await geocodePublicQuery(query); if (hasValidCoordinates(result?.latitude, result?.longitude)) return result; }
  return null;
}
async function geocodePublicQuery(query) {
  const key = query.toLocaleLowerCase("pt-BR"); if (geocodeCache.has(key)) return geocodeCache.get(key);
  const waitMs = Math.max(0, 1000 - (Date.now() - lastGeocodeRequestAt)); if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs)); lastGeocodeRequestAt = Date.now();
  const url = new URL(GEOCODING_API_URL); url.searchParams.set("q", query); url.searchParams.set("format", "jsonv2"); url.searchParams.set("limit", "1");
  const payload = await fetchExternalJson(url.toString()); const first = Array.isArray(payload) ? payload[0] : null; const result = first ? { latitude: finiteNumber(first.lat), longitude: finiteNumber(first.lon) } : null; geocodeCache.set(key, result); return result;
}
async function findNearbyClinics(response, searchParams) {
  const requestedRadius = finiteNumber(searchParams.get("radius")) || DEFAULT_CLINIC_RADIUS; const origin = await resolveClinicOrigin(searchParams);
  if (!origin) return sendJson(response, 400, { error: "Informe a localizacao do celular, um CEP valido ou um endereco completo do tutor." });
  let clinics = [], radius = clinicSearchRadii(requestedRadius)[0], overpassError = null; const radii = clinicSearchRadii(requestedRadius);
  try { for (const candidateRadius of radii) { clinics = await fetchNearbyClinics(origin.latitude, origin.longitude, candidateRadius); radius = candidateRadius; if (clinics.length) break; } for (const candidateRadius of clinics.length ? [] : radii) { clinics = await fetchNearbyClinics(origin.latitude, origin.longitude, candidateRadius, { broad: true }); radius = candidateRadius; if (clinics.length) break; } } catch (error) { overpassError = error; }
  if (!clinics.length) { radius = Math.max(radius, MAX_CLINIC_RADIUS); const fallbackClinics = await fetchClinicsFromNominatim(origin, radius).catch((error) => { if (overpassError) throw overpassError; throw error; }); if (fallbackClinics.length) clinics = fallbackClinics; }
  return sendJson(response, 200, { clinics, origin, radius, attribution: "Dados © colaboradores do OpenStreetMap" });
}
async function resolveClinicOrigin(searchParams) {
  const latitude = finiteNumber(searchParams.get("lat")), longitude = finiteNumber(searchParams.get("lon"));
  if (hasValidCoordinates(latitude, longitude)) return { latitude, longitude, source: cleanText(searchParams.get("source")) || "coordinates" };
  const address = addressFromSearchParams(searchParams);
  if (address.zipCode) { const cepAddress = await lookupCepAddress(address.zipCode).catch(() => null); if (hasValidCoordinates(cepAddress?.latitude, cepAddress?.longitude)) return { latitude: cepAddress.latitude, longitude: cepAddress.longitude, source: "cep", address: cepAddress }; Object.assign(address, cepAddress || {}); }
  const geocoded = await geocodePublicAddress(address).catch(() => null); if (hasValidCoordinates(geocoded?.latitude, geocoded?.longitude)) return { latitude: geocoded.latitude, longitude: geocoded.longitude, source: address.zipCode ? "cep" : "address", address }; return null;
}
async function fetchNearbyClinics(latitude, longitude, radius, options = {}) {
  const payload = await fetchOverpassJson(buildClinicOverpassQuery(latitude, longitude, radius, Boolean(options.broad))); const seen = new Set();
  return (Array.isArray(payload?.elements) ? payload.elements : []).map((element) => normalizeClinic(element, latitude, longitude)).filter((clinic) => clinic && !seen.has(clinic.key) && seen.add(clinic.key)).sort((left, right) => left.distance - right.distance).slice(0, 12).map(({ key, ...clinic }) => clinic);
}
function buildClinicOverpassQuery(latitude, longitude, radius, broad = false) {
  const searchRadius = Math.round(radius); const broadSelectors = broad ? `nwr["name"~"veterin[áa]ri|\\\\bvet\\\\b|pet clinic|animal clinic",i](around:${searchRadius},${latitude},${longitude});nwr["operator"~"veterin[áa]ri|\\\\bvet\\\\b|pet clinic|animal clinic",i](around:${searchRadius},${latitude},${longitude});` : "";
  return `[out:json][timeout:25];(${[`
      nwr["amenity"="veterinary"](around:${searchRadius},${latitude},${longitude});`,
      `nwr["healthcare"="veterinary"](around:${searchRadius},${latitude},${longitude});`,
      `nwr["office"="veterinary"](around:${searchRadius},${latitude},${longitude});`,
      `nwr["veterinary"="yes"](around:${searchRadius},${latitude},${longitude});`,
      `nwr["shop"="pet"]["veterinary"="yes"](around:${searchRadius},${latitude},${longitude});`,
      `nwr["healthcare:speciality"~"veterinary|animal",i](around:${searchRadius},${latitude},${longitude});`, broadSelectors].join("\n")});out center tags 80;`;
}
async function fetchOverpassJson(query) {
  let lastError; for (const url of [...new Set(OVERPASS_API_URLS)]) { try { return await fetchExternalJson(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }, body: new URLSearchParams({ data: query }).toString(), timeoutMs: OVERPASS_REQUEST_TIMEOUT_MS }); } catch (error) { lastError = error; } }
  throw lastError || httpError(502, "Servico externo indisponivel.");
}
async function fetchClinicsFromNominatim(origin, radius) {
  const queries = clinicTextSearchQueries(origin.address), seen = new Set(), clinics = [];
  for (const query of queries) { const url = new URL(GEOCODING_API_URL); url.searchParams.set("q", query); url.searchParams.set("format", "jsonv2"); url.searchParams.set("limit", "12"); url.searchParams.set("addressdetails", "1"); url.searchParams.set("extratags", "1"); url.searchParams.set("namedetails", "1"); const viewbox = viewboxAround(origin.latitude, origin.longitude, radius); if (viewbox) { url.searchParams.set("viewbox", viewbox); url.searchParams.set("bounded", "1"); } const payload = await fetchExternalJson(url.toString(), { timeoutMs: 10000 }); for (const item of Array.isArray(payload) ? payload : []) { const clinic = normalizeNominatimClinic(item, origin.latitude, origin.longitude, radius); if (clinic && !seen.has(clinic.key)) { seen.add(clinic.key); clinics.push(clinic); } } if (clinics.length >= 12) break; }
  return clinics.sort((left, right) => left.distance - right.distance).slice(0, 12).map(({ key, ...clinic }) => clinic);
}
function normalizeClinic(element, originLatitude, originLongitude) {
  const latitude = finiteNumber(element?.lat ?? element?.center?.lat), longitude = finiteNumber(element?.lon ?? element?.center?.lon); if (latitude === null || longitude === null) return null;
  const tags = element.tags || {}; if (!isVeterinaryElement(tags)) return null;
  const street = cleanText(tags["addr:street"]), number = cleanText(tags["addr:housenumber"]), neighborhood = cleanText(tags["addr:suburb"] || tags["addr:neighbourhood"]), city = cleanText(tags["addr:city"] || tags["addr:municipality"]);
  const address = [street && number ? `${street}, ${number}` : street || number, neighborhood, city].filter(Boolean).join(" · "); const phone = cleanText(tags["contact:phone"] || tags.phone || tags["contact:mobile"]).split(/[;|]/)[0].trim(); const openingHours = cleanText(tags.opening_hours); const services = ["Veterinária"]; if (tags.emergency === "yes") services.push("Emergência"); if (openingHours) services.push("Horário informado");
  return { key: `${element.type}-${element.id}`, id: `${element.type}-${element.id}`, name: cleanText(tags.name || tags.operator) || "Clínica veterinária", address: address || "Endereço não informado no mapa", neighborhood, city, phone, website: cleanText(tags["contact:website"] || tags.website), openingHours, emergency: tags.emergency === "yes", services, latitude, longitude, distance: haversineDistance(originLatitude, originLongitude, latitude, longitude) };
}
function addressFromSearchParams(searchParams) { return normalizeAddressParts({ zipCode: searchParams.get("cep") || searchParams.get("zipCode"), address: searchParams.get("address"), addressNumber: searchParams.get("number") || searchParams.get("addressNumber"), addressComplement: searchParams.get("complement") || searchParams.get("addressComplement"), neighborhood: searchParams.get("neighborhood"), city: searchParams.get("city"), state: searchParams.get("state") }); }
function normalizeAddressParts(address = {}) { const zipCode = cleanText(address.zipCode || address.cep || address.postcode).replace(/\D/g, ""); return { zipCode: zipCode.length === 8 ? zipCode : "", address: cleanText(address.address || address.street || address.logradouro), addressNumber: cleanText(address.addressNumber || address.number || address.numero), addressComplement: cleanText(address.addressComplement || address.complemento), neighborhood: cleanText(address.neighborhood || address.bairro || address.suburb), city: cleanText(address.city || address.localidade || address.municipio), state: cleanText(address.state || address.uf) }; }
function buildGeocodeQueries(address) { const parts = normalizeAddressParts(address), streetWithNumber = [parts.address, parts.addressNumber].filter(Boolean).join(", "); return [...new Set([[streetWithNumber, parts.neighborhood, parts.city, parts.state, "Brasil"],[parts.address, parts.neighborhood, parts.city, parts.state, "Brasil"],[parts.zipCode && formatCep(parts.zipCode), parts.city, parts.state, "Brasil"],[parts.neighborhood, parts.city, parts.state, "Brasil"],[parts.city, parts.state, "Brasil"]].map((items) => items.filter(Boolean).join(", ")).filter((query) => query.length >= 6))]; }
function clinicSearchRadii(requestedRadius) { const initialRadius = Math.max(1000, Math.min(MAX_CLINIC_RADIUS, requestedRadius)); return [...new Set([initialRadius, ...CLINIC_SEARCH_RADII.filter((radius) => radius > initialRadius)])]; }
function isVeterinaryElement(tags = {}) { if (tags.amenity === "veterinary" || tags.healthcare === "veterinary" || tags.office === "veterinary" || tags.veterinary === "yes") return true; return isVeterinaryText([tags.name, tags.operator, tags.description, tags["healthcare:speciality"], tags["contact:website"], tags.website].map(normalizeSearchText).join(" ")); }
function normalizeNominatimClinic(item, originLatitude, originLongitude, radius) { const latitude = finiteNumber(item?.lat), longitude = finiteNumber(item?.lon); if (!hasValidCoordinates(latitude, longitude)) return null; const distance = haversineDistance(originLatitude, originLongitude, latitude, longitude); if (radius && distance > (radius / 1000) * 1.25) return null; const address = item.address || {}, extra = item.extratags || {}, namedetails = item.namedetails || {}, displayName = cleanText(item.display_name), firstDisplayPart = displayName.split(",")[0] || "", name = cleanText(namedetails.name || item.name || address.amenity || address.shop || firstDisplayPart) || "Clínica veterinária"; if (!isVeterinaryText([name, displayName, item.category, item.class, item.type].join(" "))) return null; const street = cleanText(address.road || address.pedestrian || address.street), number = cleanText(address.house_number), neighborhood = cleanText(address.suburb || address.neighbourhood || address.city_district || address.quarter), city = cleanText(address.city || address.town || address.village || address.municipality || address.county), addressLine = [street && number ? `${street}, ${number}` : street || number, neighborhood, city].filter(Boolean).join(" · "), openingHours = cleanText(extra.opening_hours), services = ["Veterinária"]; if (extra.emergency === "yes") services.push("Emergência"); if (openingHours) services.push("Horário informado"); const key = `nominatim-${item.osm_type || "place"}-${item.osm_id || `${latitude},${longitude}`}`; return { key, id: key, name, address: addressLine || displayName || "Endereço não informado no mapa", neighborhood, city, phone: cleanText(extra["contact:phone"] || extra.phone || extra["contact:mobile"]).split(/[;|]/)[0].trim(), website: cleanText(extra["contact:website"] || extra.website || extra.url), openingHours, emergency: extra.emergency === "yes", services, latitude, longitude, distance }; }
function clinicTextSearchQueries(address = {}) { const parts = normalizeAddressParts(address), nearNeighborhood = [parts.neighborhood, parts.city, parts.state, "Brasil"].filter(Boolean).join(", "), nearCity = [parts.city, parts.state, "Brasil"].filter(Boolean).join(", "), place = nearNeighborhood || nearCity; return [...new Set(place ? [`veterinaria ${place}`, `clinica veterinaria ${place}`, `hospital veterinario ${place}`, `vet ${place}`] : ["veterinary", "veterinaria", "animal clinic", "pet clinic"])]; }
function viewboxAround(latitude, longitude, radius) { if (!hasValidCoordinates(latitude, longitude)) return ""; const kilometers = Math.max(1, radius / 1000), latitudeDelta = kilometers / 111.32, longitudeDelta = kilometers / (111.32 * Math.max(0.2, Math.abs(Math.cos((latitude * Math.PI) / 180)))), west = longitude - longitudeDelta, east = longitude + longitudeDelta, north = Math.min(90, latitude + latitudeDelta), south = Math.max(-90, latitude - latitudeDelta); return [west, north, east, south].map((value) => value.toFixed(6)).join(","); }
function isVeterinaryText(value = "") { const text = normalizeSearchText(value); return /\b(vet|veterinaria|veterinario|veterinary)\b/.test(text) || /animal clinic|pet clinic/.test(text); }
function normalizeSearchText(value = "") { return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function hasValidCoordinates(latitude, longitude) { return latitude !== null && latitude >= -90 && latitude <= 90 && longitude !== null && longitude >= -180 && longitude <= 180; }
function haversineDistance(fromLatitude, fromLongitude, toLatitude, toLongitude) { const earthRadiusKm = 6371, toRadians = (degrees) => (degrees * Math.PI) / 180, latitudeDelta = toRadians(toLatitude - fromLatitude), longitudeDelta = toRadians(toLongitude - fromLongitude), value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(fromLatitude)) * Math.cos(toRadians(toLatitude)) * Math.sin(longitudeDelta / 2) ** 2; return Number((earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))).toFixed(2)); }
async function fetchExternalJson(url, options = {}) { const { timeoutMs = EXTERNAL_REQUEST_TIMEOUT_MS, ...fetchOptions } = options, controller = new AbortController(), timeout = setTimeout(() => controller.abort(), timeoutMs); try { const response = await fetch(url, { ...fetchOptions, headers: { Accept: "application/json", "User-Agent": EXTERNAL_USER_AGENT, ...(fetchOptions.headers || {}) }, signal: controller.signal }); if (!response.ok) throw httpError(502, `Servico externo indisponivel (${response.status}).`); return await response.json(); } catch (error) { if (error.name === "AbortError") throw httpError(504, "A consulta externa demorou demais."); throw error; } finally { clearTimeout(timeout); } }
function finiteNumber(value) { if (value === "" || value === null || value === undefined) return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function normalizeDocumentAttachment(attachment = {}) { const source = attachment && typeof attachment === "object" ? attachment : {}, dataUrl = cleanText(source.dataUrl), safeDataUrl = /^data:(image\/(png|jpe?g|webp|gif)|application\/pdf);base64,/i.test(dataUrl) ? dataUrl : "", size = Math.max(0, Math.min(Number(source.size) || 0, 8 * 1024 * 1024)); return { name: cleanText(source.name).slice(0, 240), type: cleanText(source.type || source.originalType).slice(0, 120), size: Math.round(size), dataUrl: safeDataUrl }; }
function formatCep(value) { const digits = cleanText(value).replace(/\D/g, ""); return digits.length === 8 ? digits.replace(/^(\d{5})(\d{3})$/, "$1-$2") : cleanText(value); }
async function registerUser(response, body) { const name = cleanText(body.name), email = normalizeEmail(body.email), phone = cleanText(body.phone), password = String(body.password || ""); if (!name || !email || !phone || !password) return sendJson(response, 400, { error: "Preencha nome, e-mail, telefone e senha." }); if (password.length < 4) return sendJson(response, 400, { error: "Use uma senha com pelo menos 4 caracteres." }); const existing = await findUserByEmail(email); if (existing) return sendJson(response, 409, { error: "Este e-mail ja esta cadastrado." }); const id = crypto.randomUUID(), passwordHash = hashPassword(password), result = await pool.query(`INSERT INTO pet_app_users (id, name, email, email_normalized, phone, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, phone, created_at`, [id, name, email, email, phone, passwordHash]); const user = result.rows[0]; return sendJson(response, 201, { user: publicUser(user), token: signToken(user), state: null }); }
async function loginUser(response, body) { const email = normalizeEmail(body.email), password = String(body.password || ""), user = await findUserByEmail(email); if (!user || !verifyPassword(password, user.password_hash)) return sendJson(response, 401, { error: "E-mail ou senha invalidos." }); return sendJson(response, 200, { user: publicUser(user), token: signToken(user), state: await getStoredState(user) }); }
async function findUserByEmail(email) { const result = await pool.query("SELECT id, name, email, phone, password_hash, created_at FROM pet_app_users WHERE email_normalized = $1", [normalizeEmail(email)]); return result.rows[0] || null; }
async function findUserById(id) { const result = await pool.query("SELECT id, name, email, phone, password_hash, created_at FROM pet_app_users WHERE id = $1", [id]); return result.rows[0] || null; }
async function getStoredState(user) { const result = await pool.query("SELECT state FROM pet_wallet_states WHERE user_id = $1", [user.id]); if (!result.rowCount) return null; return stateForClient(result.rows[0].state, user); }
async function saveWalletState(user, incomingState, clientUpdatedAt) { const state = sanitizeIncomingState(incomingState, user), owner = state.owner || {}, pets = Array.isArray(state.pets) ? state.pets.filter((pet) => cleanText(pet.id) && cleanText(pet.name)) : [], petIds = new Set(pets.map((pet) => cleanText(pet.id))), vaccines = (Array.isArray(state.vaccines) ? state.vaccines : []).filter((item) => cleanText(item.id) && petIds.has(cleanText(item.petId))), documents = (Array.isArray(state.documents) ? state.documents : []).filter((item) => cleanText(item.id) && petIds.has(cleanText(item.petId))), travelByPet = state.travelByPet && typeof state.travelByPet === "object" ? state.travelByPet : {}, feedback = Array.isArray(state.feedback) ? state.feedback : [], activeTravel = state.travel || {}, travelItems = activeTravel.items && typeof activeTravel.items === "object" ? activeTravel.items : {}, client = await pool.connect(); try { await client.query("BEGIN"); await client.query(`INSERT INTO pet_wallet_states (user_id, state, client_updated_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, client_updated_at = EXCLUDED.client_updated_at`, [user.id, state, coerceTimestamp(clientUpdatedAt)]); await client.query(`INSERT INTO pet_owners (user_id, name, cpf, phone, email, address, address_number, address_complement, neighborhood, city, state, zip_code, latitude, longitude, emergency_name, emergency_phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, cpf = EXCLUDED.cpf, phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address, address_number = EXCLUDED.address_number, address_complement = EXCLUDED.address_complement, neighborhood = EXCLUDED.neighborhood, city = EXCLUDED.city, state = EXCLUDED.state, zip_code = EXCLUDED.zip_code, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, emergency_name = EXCLUDED.emergency_name, emergency_phone = EXCLUDED.emergency_phone`, [user.id, cleanText(owner.name), cleanText(owner.cpf), cleanText(owner.phone), cleanText(owner.email), cleanText(owner.address), cleanText(owner.addressNumber), cleanText(owner.addressComplement), cleanText(owner.neighborhood), cleanText(owner.city), cleanText(owner.state), cleanText(owner.zipCode), finiteNumber(owner.latitude), finiteNumber(owner.longitude), cleanText(owner.emergencyName), cleanText(owner.emergencyPhone)]); await client.query("DELETE FROM pet_documents WHERE user_id = $1", [user.id]); await client.query("DELETE FROM pet_vaccines WHERE user_id = $1", [user.id]); await client.query("DELETE FROM pet_pets WHERE user_id = $1", [user.id]); await client.query("DELETE FROM pet_travel_plans WHERE user_id = $1", [user.id]); await client.query("DELETE FROM pet_travel_items WHERE user_id = $1", [user.id]); await client.query("DELETE FROM pet_feedback WHERE user_id = $1", [user.id]); for (const pet of pets) await client.query(`INSERT INTO pet_pets (user_id, id, name, species, breed, sex, birth_date, weight, color, microchip, registry, temperament, allergies, notes, avatar_color) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [user.id, cleanText(pet.id), cleanText(pet.name), cleanText(pet.species), cleanText(pet.breed), cleanText(pet.sex), coerceDate(pet.birthDate), cleanText(pet.weight), cleanText(pet.color), cleanText(pet.microchip), cleanText(pet.registry), cleanText(pet.temperament), cleanText(pet.allergies), cleanText(pet.notes), cleanText(pet.avatarColor) || "#17716b"]); for (const vaccine of vaccines) await client.query(`INSERT INTO pet_vaccines (user_id, id, pet_id, name, dose, application_date, due_date, clinic, veterinarian, batch, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [user.id, cleanText(vaccine.id), cleanText(vaccine.petId), cleanText(vaccine.name), cleanText(vaccine.dose), coerceDate(vaccine.applicationDate), coerceDate(vaccine.dueDate), cleanText(vaccine.clinic), cleanText(vaccine.veterinarian), cleanText(vaccine.batch), cleanText(vaccine.notes)]); for (const document of documents) { const attachment = normalizeDocumentAttachment(document.attachment); await client.query(`INSERT INTO pet_documents (user_id, id, pet_id, title, kind, document_date, expires_at, notes, attachment_name, attachment_type, attachment_size, attachment_data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [user.id, cleanText(document.id), cleanText(document.petId), cleanText(document.title), cleanText(document.kind), coerceDate(document.date), coerceDate(document.expiresAt), cleanText(document.notes), attachment.name, attachment.type, attachment.size, attachment.dataUrl]); } for (const [petId, petTravel] of Object.entries(travelByPet || {})) { const nextTravel = petTravel && typeof petTravel === "object" ? petTravel : {}; const travelItemsByPet = nextTravel.items && typeof nextTravel.items === "object" ? nextTravel.items : {}; const selectedPetId = cleanText(nextTravel.selectedPetId || petId); await client.query(`INSERT INTO pet_travel_plans (user_id, pet_id, destination, travel_date, transport, selected_pet_id, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id, pet_id) DO UPDATE SET destination = EXCLUDED.destination, travel_date = EXCLUDED.travel_date, transport = EXCLUDED.transport, selected_pet_id = EXCLUDED.selected_pet_id, notes = EXCLUDED.notes`, [user.id, cleanText(petId), cleanText(nextTravel.destination), coerceDate(nextTravel.date), cleanText(nextTravel.transport), selectedPetId, cleanText(nextTravel.notes)]); for (const [key, checked] of Object.entries(travelItemsByPet)) await client.query("INSERT INTO pet_travel_items (user_id, pet_id, item_key, checked) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, pet_id, item_key) DO UPDATE SET checked = EXCLUDED.checked", [user.id, cleanText(petId), cleanText(key), Boolean(checked)]); } if (activeTravel && typeof activeTravel === "object") { const selectedPetId = cleanText(activeTravel.selectedPetId || state.selectedPetId || pets[0]?.id || ""); const activeItems = activeTravel.items && typeof activeTravel.items === "object" ? activeTravel.items : {}; await client.query(`INSERT INTO pet_travel_plans (user_id, pet_id, destination, travel_date, transport, selected_pet_id, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id, pet_id) DO UPDATE SET destination = EXCLUDED.destination, travel_date = EXCLUDED.travel_date, transport = EXCLUDED.transport, selected_pet_id = EXCLUDED.selected_pet_id, notes = EXCLUDED.notes`, [user.id, cleanText(selectedPetId), cleanText(activeTravel.destination), coerceDate(activeTravel.date), cleanText(activeTravel.transport), selectedPetId, cleanText(activeTravel.notes)]); for (const [key, checked] of Object.entries(activeItems)) await client.query("INSERT INTO pet_travel_items (user_id, pet_id, item_key, checked) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, pet_id, item_key) DO UPDATE SET checked = EXCLUDED.checked", [user.id, cleanText(selectedPetId), cleanText(key), Boolean(checked)]); } for (const item of feedback) { const feedbackEntry = item && typeof item === "object" ? item : {}; await client.query(`INSERT INTO pet_feedback (user_id, id, pet_id, veterinary_satisfaction, app_rating, improvements, suggestions, submitted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (user_id, id) DO UPDATE SET pet_id = EXCLUDED.pet_id, veterinary_satisfaction = EXCLUDED.veterinary_satisfaction, app_rating = EXCLUDED.app_rating, improvements = EXCLUDED.improvements, suggestions = EXCLUDED.suggestions, submitted_at = EXCLUDED.submitted_at`, [user.id, cleanText(feedbackEntry.id || item.id || "feedback"), cleanText(feedbackEntry.petId || state.selectedPetId || pets[0]?.id || ""), Number(feedbackEntry.veterinarySatisfaction || 0), Number(feedbackEntry.appRating || 0), cleanText(feedbackEntry.improvements), cleanText(feedbackEntry.suggestions), coerceTimestamp(feedbackEntry.submittedAt) || new Date().toISOString()]); } await client.query("COMMIT"); return stateForClient(state, user); } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); } }
function sanitizeIncomingState(incomingState, user) { const state = incomingState && typeof incomingState === "object" ? JSON.parse(JSON.stringify(incomingState)) : {}; delete state.sync; state.auth = { ...(state.auth || {}), currentUserEmail: user.email, authView: "login", trustedDevice: true, apiToken: "" }; state.users = upsertPublicUser(state.users, user); state.owner = state.owner && typeof state.owner === "object" ? state.owner : {}; state.pets = Array.isArray(state.pets) ? state.pets : []; state.vaccines = Array.isArray(state.vaccines) ? state.vaccines : []; state.documents = Array.isArray(state.documents) ? state.documents : []; state.travel = state.travel && typeof state.travel === "object" ? state.travel : {}; state.travelByPet = state.travelByPet && typeof state.travelByPet === "object" ? state.travelByPet : {}; state.feedback = Array.isArray(state.feedback) ? state.feedback : []; return state; }
function stateForClient(storedState, user) { const state = storedState && typeof storedState === "object" ? JSON.parse(JSON.stringify(storedState)) : {}; state.auth = { ...(state.auth || {}), currentUserEmail: user.email, authView: "login", trustedDevice: true, apiToken: "" }; state.users = upsertPublicUser(state.users, user); delete state.sync; return state; }
function upsertPublicUser(users, user) { const cleanUsers = Array.isArray(users) ? users.filter(Boolean) : []; const sanitized = cleanUsers.map((item) => ({ id: item.id || undefined, name: cleanText(item.name), email: normalizeEmail(item.email), phone: cleanText(item.phone), createdAt: item.createdAt || item.created_at || undefined })).filter((item) => item.email && item.email !== normalizeEmail(user.email)); return [...sanitized, publicUser(user)]; }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email, phone: user.phone || "", createdAt: user.created_at || user.createdAt || new Date().toISOString() }; }
async function requireUser(request) { const header = request.headers.authorization || "", match = header.match(/^Bearer\s+(.+)$/i); if (!match) throw httpError(401, "Sessao nao informada."); const payload = verifyToken(match[1]), user = await findUserById(payload.sub); if (!user) throw httpError(401, "Sessao invalida."); return user; }
function signToken(user) { const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" })), payload = base64url(JSON.stringify({ sub: user.id, email: user.email, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 })), signature = sign(`${header}.${payload}`); return `${header}.${payload}.${signature}`; }
function verifyToken(token) { const [header, payload, signature] = String(token || "").split("."); if (!header || !payload || !signature) throw httpError(401, "Sessao invalida."); const expected = sign(`${header}.${payload}`); if (!timingSafeEqual(signature, expected)) throw httpError(401, "Sessao invalida."); let data; try { data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { throw httpError(401, "Sessao invalida."); } if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) throw httpError(401, "Sessao expirada."); return data; }
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) { const derived = crypto.pbkdf2Sync(String(password), salt, 310000, 32, "sha256").toString("hex"); return `pbkdf2_sha256$310000$${salt}$${derived}`; }
function verifyPassword(password, passwordHash) { const [algorithm, iterations, salt, hash] = String(passwordHash || "").split("$"); if (algorithm !== "pbkdf2_sha256" || !iterations || !salt || !hash) return false; const derived = crypto.pbkdf2Sync(String(password), salt, Number(iterations), 32, "sha256").toString("hex"); return timingSafeEqual(derived, hash); }
function timingSafeEqual(left, right) { const a = Buffer.from(String(left)), b = Buffer.from(String(right)); return a.length === b.length && crypto.timingSafeEqual(a, b); }
function sign(value) { return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url"); }
function base64url(value) { return Buffer.from(value).toString("base64url"); }
function cleanText(value) { return String(value ?? "").trim(); }
function normalizeEmail(value) { return cleanText(value).toLowerCase(); }
function coerceDate(value) { const text = cleanText(value); if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null; return text; }
function coerceTimestamp(value) { const text = cleanText(value); if (!text) return null; const date = new Date(text); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
async function readJson(request) { const chunks = []; let total = 0; for await (const chunk of request) { total += chunk.length; if (total > MAX_JSON_BYTES) throw httpError(413, "JSON muito grande para a API da Vercel."); chunks.push(chunk); } if (!chunks.length) return {}; try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw httpError(400, "JSON invalido."); } }
function serveStatic(url, response, headOnly = false) { const pathname = url.pathname === "/" ? "/index.html" : url.pathname === "/admin/analytics" ? "/admin/analytics.html" : url.pathname, extraFilePath = EXTRA_STATIC_FILES.get(url.pathname) || EXTRA_STATIC_FILES.get(pathname); if (!extraFilePath && !STATIC_FILES.has(url.pathname) && !STATIC_FILES.has(pathname)) return sendText(response, 404, "Arquivo nao encontrado."); const publicRoot = path.resolve(PUBLIC_DIR), extraRoot = path.resolve(PROJECT_DIR, "tcc_screenshots_mobile"), filePath = extraFilePath ? path.resolve(extraFilePath) : path.resolve(publicRoot, pathname.replace(/^\/+/, "")), allowedRoot = extraFilePath ? extraRoot : publicRoot; if (!filePath.startsWith(allowedRoot)) return sendText(response, 403, "Acesso negado."); fs.stat(filePath, (error, stats) => { if (error || !stats.isFile()) return sendText(response, 404, "Arquivo nao encontrado."); const extension = path.extname(filePath); response.writeHead(200, { "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream", "Cache-Control": extension === ".html" ? "no-store" : "no-cache" }); if (headOnly) return response.end(); fs.createReadStream(filePath).pipe(response); }); }
function sendJson(response, statusCode, payload) { response.writeHead(statusCode, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Content-Type": "application/json; charset=utf-8" }); if (statusCode === 204) return response.end(); return response.end(JSON.stringify(payload)); }
function sendText(response, statusCode, text) { response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" }); response.end(text); }
function httpError(statusCode, message) { const error = new Error(message); error.statusCode = statusCode; return error; }
process.on("uncaughtException", (error) => { if (error.statusCode) return; console.error(error); });

async function vercelHandler(request, response) {
  const startedAt = performance.now();
  const originalEnd = response.end;
  response.end = function (...args) {
    console.log(JSON.stringify({
      metric: "api.request_duration_ms",
      value: Math.round(performance.now() - startedAt),
      method: request.method || "UNKNOWN",
      route: String(request.url || "/").split("?")[0],
      status: response.statusCode || 200
    }));
    return originalEnd.apply(this, args);
  };
  try {
    assertSessionSecret();
    await initializePool();
    return await handleRequest(request, response);
  } catch (error) {
    if (error.statusCode) return sendJson(response, error.statusCode, { error: error.message });
    console.error("Falha ao inicializar ou executar a API:", {
      name: error?.name,
      code: error?.code,
      message: error?.message
    });
    return sendJson(response, 500, { error: publicStartupErrorMessage(error) });
  }
}

function assertSessionSecret() {
  if (!SESSION_SECRET) throw new Error("SESSION_SECRET nao configurado no ambiente de producao.");
}

function publicStartupErrorMessage(error) {
  const message = String(error?.message || "");
  if (message.includes("SESSION_SECRET")) return message;
  if (message.includes("MONGODB_URI")) return message;
  if (["28P01", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"].includes(error?.code)) return formatDatabaseError(error);
  if (String(error?.name || "").startsWith("Mongo") || /bad auth|authentication failed/i.test(message)) return formatDatabaseError(error);
  if (/^[0-9A-Z]{5}$/.test(String(error?.code || ""))) return `Erro do MongoDB (${error.code}): ${message}`;
  return "Erro interno do servidor.";
}

// MongoDB stores the user documents and the complete wallet state atomically.
async function registerUser(response, body) {
  const name = cleanText(body.name);
  const email = normalizeEmail(body.email);
  const phone = cleanText(body.phone);
  const password = String(body.password || "");
  if (!name || !email || !phone || !password) return sendJson(response, 400, { error: "Preencha nome, e-mail, telefone e senha." });
  if (password.length < 4) return sendJson(response, 400, { error: "Use uma senha com pelo menos 4 caracteres." });

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    email_normalized: email,
    phone,
    password_hash: hashPassword(password),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  try {
    await pool.database.collection("users").insertOne(user);
  } catch (error) {
    if (error?.code === 11000) return sendJson(response, 409, { error: "Este e-mail ja esta cadastrado." });
    throw error;
  }
  await insertAnalyticsEvent("CADASTRO_USUARIO", user.id);
  return sendJson(response, 201, { user: publicUser(user), token: signToken(user), state: null });
}

async function loginUser(response, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) return sendJson(response, 401, { error: "E-mail ou senha invalidos." });
  await insertAnalyticsEvent("LOGIN", user.id);
  return sendJson(response, 200, { user: publicUser(user), token: signToken(user), state: await getStoredState(user) });
}

async function findUserByEmail(email) {
  return pool.database.collection("users").findOne({ email_normalized: normalizeEmail(email) });
}

async function findUserById(id) {
  return pool.database.collection("users").findOne({ id });
}

async function getStoredState(user) {
  const stored = await pool.database.collection("wallet_states").findOne({ user_id: user.id });
  if (!stored) return null;

  const prepared = await detachStateAttachments(user, stored.state);
  if (prepared.changed) {
    await pool.database.collection("wallet_states").updateOne(
      { user_id: user.id },
      {
        $set: {
          state: prepared.state,
          updated_at: new Date().toISOString()
        }
      }
    );
  }
  return stateForClient(prepared.state, user);
}

async function detachStateAttachments(user, incomingState) {
  const state = incomingState && typeof incomingState === "object" ? JSON.parse(JSON.stringify(incomingState)) : {};
  const documents = Array.isArray(state.documents) ? state.documents : [];
  let changed = false;

  for (const document of documents) {
    if (!document || typeof document !== "object") continue;
    const attachment = document.attachment && typeof document.attachment === "object" ? document.attachment : null;
    if (!attachment) continue;

    if (safeAttachmentDataUrl(attachment.dataUrl)) {
      document.attachment = await saveAttachment(user, { documentId: document.id, attachment });
      changed = true;
      continue;
    }

    const stripped = attachmentMetadataForState(attachment);
    if (stripped && JSON.stringify(stripped) !== JSON.stringify(attachment)) {
      document.attachment = stripped;
      changed = true;
    }
  }

  return { state, changed };
}

function attachmentMetadataForState(source = {}) {
  const storageId = cleanText(source.storageId);
  const url = storageId ? `/api/attachments/${encodeURIComponent(storageId)}` : cleanText(source.url);
  const hasData = Boolean(storageId || url || source.hasData);
  const name = cleanText(source.name);
  const type = cleanText(source.type);
  if (!hasData && !name && !type) return null;

  return {
    name: name || "documento",
    type,
    originalType: cleanText(source.originalType),
    size: Math.max(0, Math.round(Number(source.size) || 0)),
    storageId,
    url,
    uploadedAt: coerceTimestamp(source.uploadedAt) || "",
    storedAt: coerceTimestamp(source.storedAt) || "",
    hasData
  };
}

async function saveAttachment(user, body) {
  const source = body?.attachment && typeof body.attachment === "object" ? body.attachment : {};
  const attachment = normalizeUploadedAttachment(source);
  if (!attachment.dataUrl) throw httpError(400, "Anexo invalido ou vazio.");

  const id = cleanText(source.storageId || body.storageId) || crypto.randomUUID();
  const now = new Date().toISOString();
  const record = {
    user_id: user.id,
    id,
    document_id: cleanText(body.documentId || source.documentId),
    name: attachment.name,
    type: attachment.type,
    original_type: attachment.originalType,
    size: attachment.size,
    data_url: attachment.dataUrl,
    uploaded_at: attachment.uploadedAt,
    stored_at: now,
    updated_at: now
  };

  await pool.database.collection("wallet_attachments").replaceOne(
    { user_id: user.id, id },
    record,
    { upsert: true }
  );

  return attachmentForClient(record);
}

async function getAttachment(user, id) {
  const storageId = cleanText(id);
  if (!storageId) throw httpError(400, "Anexo nao informado.");

  const record = await pool.database.collection("wallet_attachments").findOne({ user_id: user.id, id: storageId });
  if (!record) throw httpError(404, "Anexo nao encontrado.");
  return attachmentForClient(record, true);
}

async function saveSyncChunk(user, body) {
  const syncId = cleanText(body.syncId).slice(0, 160);
  const index = Number(body.index);
  const total = Number(body.total);
  const data = typeof body.data === "string" ? body.data : "";

  if (!syncId) throw httpError(400, "Identificador da sincronizacao nao informado.");
  if (!Number.isInteger(index) || index < 0) throw httpError(400, "Indice do lote invalido.");
  if (!Number.isInteger(total) || total < 1 || total > SYNC_CHUNK_MAX_COUNT) throw httpError(400, "Quantidade de lotes invalida.");
  if (index >= total) throw httpError(400, "Indice do lote fora da sequencia.");
  if (!data) throw httpError(400, "Lote vazio.");

  const chunks = pool.database.collection("sync_chunks");
  await chunks.deleteMany({
    user_id: user.id,
    updated_at: { $lt: new Date(Date.now() - SYNC_CHUNK_MAX_AGE_MS) }
  });
  await chunks.updateOne(
    { user_id: user.id, sync_id: syncId, index },
    {
      $set: {
        user_id: user.id,
        sync_id: syncId,
        index,
        total,
        body_bytes: Number(body.bodyBytes) || 0,
        data,
        updated_at: new Date()
      }
    },
    { upsert: true }
  );

  const receivedChunks = await chunks.find({ user_id: user.id, sync_id: syncId }).sort({ index: 1 }).toArray();
  if (receivedChunks.length < total) {
    return {
      user: publicUser(user),
      complete: false,
      chunksReceived: receivedChunks.length,
      totalChunks: total,
      chunkCount: total,
      syncedAt: new Date().toISOString()
    };
  }

  const byIndex = new Map(receivedChunks.map((chunk) => [chunk.index, chunk]));
  const ordered = [];
  for (let current = 0; current < total; current += 1) {
    const chunk = byIndex.get(current);
    if (!chunk) {
      return {
        user: publicUser(user),
        complete: false,
        chunksReceived: receivedChunks.length,
        totalChunks: total,
        chunkCount: total,
        syncedAt: new Date().toISOString()
      };
    }
    ordered.push(chunk.data);
  }

  let mergedBody;
  try {
    mergedBody = JSON.parse(ordered.join(""));
  } catch {
    await chunks.deleteMany({ user_id: user.id, sync_id: syncId });
    throw httpError(400, "Lotes de sincronizacao invalidos.");
  }

  await saveWalletState(user, mergedBody.state, mergedBody.clientUpdatedAt);
  await chunks.deleteMany({ user_id: user.id, sync_id: syncId });

  return {
    user: publicUser(user),
    complete: true,
    chunksReceived: total,
    totalChunks: total,
    chunkCount: total,
    payloadSize: Number(body.bodyBytes) || 0,
    syncedAt: new Date().toISOString()
  };
}

function normalizeUploadedAttachment(source = {}) {
  const dataUrl = safeAttachmentDataUrl(source.dataUrl);
  const mimeFromData = dataUrl.match(/^data:([^;,]+);base64,/i)?.[1] || "";
  const type = cleanText(source.type || mimeFromData).slice(0, 120);

  return {
    name: (cleanText(source.name).slice(0, 240) || "documento"),
    type,
    originalType: cleanText(source.originalType).slice(0, 120),
    size: Math.max(0, Math.round(Number(source.size) || Buffer.byteLength(dataUrl, "utf8"))),
    dataUrl,
    uploadedAt: coerceTimestamp(source.uploadedAt) || new Date().toISOString()
  };
}

function attachmentForClient(record, includeDataUrl = false) {
  const attachment = {
    name: cleanText(record.name) || "documento",
    type: cleanText(record.type),
    originalType: cleanText(record.original_type),
    size: Math.max(0, Math.round(Number(record.size) || 0)),
    storageId: cleanText(record.id),
    url: `/api/attachments/${encodeURIComponent(cleanText(record.id))}`,
    uploadedAt: coerceTimestamp(record.uploaded_at) || "",
    storedAt: coerceTimestamp(record.stored_at) || "",
    hasData: true
  };
  if (includeDataUrl) attachment.dataUrl = safeAttachmentDataUrl(record.data_url);
  return attachment;
}

function safeAttachmentDataUrl(value = "") {
  const text = cleanText(value);
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(text)) return text;
  if (/^data:application\/pdf;base64,/i.test(text)) return text;
  return "";
}

async function recordAnalyticsEvent(response, user, body = {}) {
  const event = cleanText(body.event).toUpperCase();
  if (!ANALYTICS_EVENTS.has(event)) throw httpError(400, "Evento de analytics invalido.");
  const rawMetadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
    ? body.metadata
    : {};
  const metadata = {};
  for (const [key, value] of Object.entries(rawMetadata).slice(0, 12)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)) continue;
    if (["string", "number", "boolean"].includes(typeof value)) metadata[key] = String(value).slice(0, 200);
  }
  await insertAnalyticsEvent(event, user.id, metadata);
  return sendJson(response, 202, { ok: true });
}

async function insertAnalyticsEvent(event, userId, metadata = {}) {
  await pool.database.collection("analytics_events").insertOne({
    event,
    user_id: userId,
    metadata,
    created_at: new Date()
  });
}

function requireAnalyticsAdmin(request) {
  if (!ANALYTICS_ADMIN_TOKEN || !ADMIN_EMAIL) {
    throw httpError(503, "Analytics administrativo nao configurado.");
  }
  const token = cleanText(request.headers["x-analytics-admin-token"]);
  const email = normalizeEmail(request.headers["x-admin-email"]);
  if (!timingSafeEqual(token, ANALYTICS_ADMIN_TOKEN) || email !== ADMIN_EMAIL) {
    throw httpError(403, "Acesso administrativo negado.");
  }
}

async function getAnalyticsDashboard() {
  const events = pool.database.collection("analytics_events");
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const [uniqueToday, uniqueWeek, eventCounts, users, states, feedbacks] = await Promise.all([
    events.distinct("user_id", { created_at: { $gte: todayStart } }),
    events.distinct("user_id", { created_at: { $gte: weekStart } }),
    events.aggregate([{ $group: { _id: "$event", total: { $sum: 1 } } }]).toArray(),
    pool.database.collection("users").countDocuments(),
    pool.database.collection("wallet_states").find({}, { projection: { state: 1 } }).toArray(),
    events.countDocuments({ event: "FEEDBACK_ENVIADO" })
  ]);
  const counts = Object.fromEntries(eventCounts.map((item) => [item._id, item.total]));
  const totals = states.reduce((result, item) => {
    const state = item.state || {};
    result.pets += Array.isArray(state.pets) ? state.pets.length : 0;
    result.vaccines += Array.isArray(state.vaccines) ? state.vaccines.length : 0;
    result.documents += Array.isArray(state.documents) ? state.documents.length : 0;
    return result;
  }, { pets: 0, vaccines: 0, documents: 0 });
  return {
    generatedAt: now.toISOString(),
    users,
    uniqueUsersToday: uniqueToday.length,
    uniqueUsersWeek: uniqueWeek.length,
    logins: counts.LOGIN || 0,
    pets: totals.pets,
    vaccines: totals.vaccines,
    documents: totals.documents,
    feedbacks,
    synchronizations: counts.SINCRONIZOU_DADOS || 0,
    apiErrors: counts.API_ERROR || 0,
    events: counts
  };
}

async function saveWalletState(user, incomingState, clientUpdatedAt) {
  const prepared = await detachStateAttachments(user, sanitizeIncomingState(incomingState, user));
  const state = prepared.state;
  await pool.database.collection("wallet_states").replaceOne(
    { user_id: user.id },
    {
      user_id: user.id,
      state,
      client_updated_at: coerceTimestamp(clientUpdatedAt),
      updated_at: new Date().toISOString()
    },
    { upsert: true }
  );
  return stateForClient(state, user);
}

module.exports = { handleRequest, initializePool, vercelHandler };

if (require.main === module) {
  main().catch((error) => {
    console.error("Nao foi possivel iniciar o servidor.");
    console.error(formatDatabaseError(error));
    process.exitCode = 1;
  });
}
