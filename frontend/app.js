import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";

inject();
injectSpeedInsights();

const STORAGE_KEY = "pet-id-wallet-state-v1";
const APP_NAME = "Identificação Pet";
const API_BASE = window.location.origin;
const SYNC_DEBOUNCE_MS = 900;
const DOCUMENT_FILE_MAX_BYTES = 1.5 * 1024 * 1024;
const WALLET_TEMPLATE_IMAGES = {
  front: "../tcc_screenshots_mobile/Frente.png",
  back: "../tcc_screenshots_mobile/Verso.png"
};

const now = new Date();
const todayISO = toISODate(now);
const plusDays = (days) => {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

const defaultState = {
  currentView: "home",
  selectedPetId: "pet-luna",
  installDismissed: false,
  theme: "light",
  auth: {
    currentUserEmail: "",
    authView: "login",
    trustedDevice: true,
    apiToken: ""
  },
  sync: {
    status: "local",
    lastSyncedAt: "",
    lastError: "",
    apiOnline: false
  },
  users: [],
  owner: {
    name: "Gabriela Souza",
    cpf: "123.456.789-00",
    phone: "(11) 98888-2026",
    email: "gabriela@email.com",
    address: "Rua das Palmeiras",
    addressNumber: "240",
    addressComplement: "",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01000-000",
    latitude: "",
    longitude: "",
    locationSource: "",
    emergencyName: "Marcos Souza",
    emergencyPhone: "(11) 97777-1010"
  },
  pets: [
    {
      id: "pet-luna",
      name: "Luna",
      species: "Cachorro",
      breed: "Golden Retriever",
      sex: "Fêmea",
      birthDate: "2021-08-14",
      weight: "24",
      color: "Dourado",
      microchip: "BR-982000411223",
      registry: "PET-2026-001",
      temperament: "Dócil e sociável",
      allergies: "Sem alergias conhecidas",
      notes: "Usa coleira azul com pingente. Gosta de água.",
      avatarColor: "#17716b"
    },
    {
      id: "pet-nina",
      name: "Nina",
      species: "Gato",
      breed: "SRD",
      sex: "Fêmea",
      birthDate: "2022-03-22",
      weight: "4.8",
      color: "Preto e branco",
      microchip: "BR-982000433884",
      registry: "PET-2026-002",
      temperament: "Reservada",
      allergies: "Sensível a alguns antipulgas",
      notes: "Prefere caixa de transporte rígida.",
      avatarColor: "#0f595b"
    }
  ],
  vaccines: [
    {
      id: "vac-1",
      petId: "pet-luna",
      name: "Antirrábica",
      dose: "Anual",
      applicationDate: "2025-08-20",
      dueDate: "2026-08-20",
      clinic: "Clínica Vida Animal",
      veterinarian: "Dra. Marina Prado",
      batch: "RA-4482",
      notes: "Carteira física conferida"
    },
    {
      id: "vac-2",
      petId: "pet-luna",
      name: "V10",
      dose: "Reforço",
      applicationDate: "2025-04-12",
      dueDate: plusDays(12),
      clinic: "PetCare Centro",
      veterinarian: "Dr. Felipe Nunes",
      batch: "V10-1189",
      notes: ""
    },
    {
      id: "vac-3",
      petId: "pet-nina",
      name: "V4 Felina",
      dose: "Anual",
      applicationDate: "2025-05-06",
      dueDate: plusDays(-8),
      clinic: "Vet Popular",
      veterinarian: "Dra. Helena Costa",
      batch: "FEL-7710",
      notes: "Reforço pendente"
    }
  ],
  documents: [
    {
      id: "doc-1",
      petId: "pet-luna",
      title: "Atestado de saúde",
      kind: "Viagem",
      date: "2026-04-22",
      expiresAt: "2026-05-22",
      notes: "Emitido para transporte rodoviário"
    },
    {
      id: "doc-2",
      petId: "pet-nina",
      title: "Exame de sangue",
      kind: "Exame",
      date: "2026-02-16",
      expiresAt: "",
      notes: "Arquivo físico com a tutora"
    }
  ],
  travel: {
    destination: "Curitiba, PR",
    date: "2026-07-08",
    transport: "Carro",
    selectedPetId: "pet-luna",
    notes: "Confirmar hotel pet friendly e rota com pausas.",
    items: {
      vaccine: true,
      certificate: false,
      carrier: true,
      food: true,
      collar: true,
      destinationRules: false,
      medicine: false
    }
  },
  travelByPet: {
    "pet-luna": {
      destination: "Curitiba, PR",
      date: "2026-07-08",
      transport: "Carro",
      selectedPetId: "pet-luna",
      notes: "Confirmar hotel pet friendly e rota com pausas.",
      items: {
        vaccine: true,
        certificate: false,
        carrier: true,
        food: true,
        collar: true,
        destinationRules: false,
        medicine: false
      }
    }
  },
  feedback: []
};

const views = [
  { id: "home", label: "Início", icon: "⌂" },
  { id: "pets", label: "Pets", icon: "◉" },
  { id: "vaccines", label: "Vacinas", icon: "✚" },
  { id: "travel", label: "Viagem", icon: "⇄" },
  { id: "clinics", label: "Vets", icon: "⌖" }
];

let state = loadState();
let deferredInstallPrompt = null;
let petFilter = "all";
let vaccineFilter = "all";
let searchTerm = "";
let syncTimer = null;
let syncing = false;
let walletSlideIndex = 0;
let nearbyClinics = [];
let clinicsStatus = "idle";
let clinicsError = "";
let clinicLocationLabel = "";
let cepLookupTimer = null;
let signaturePadCleanup = null;

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  render();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  state.installDismissed = true;
  saveState();
  notify("Aplicativo instalado no dispositivo.");
  render();
});

window.addEventListener("online", () => syncWithServer("online"));
window.addEventListener("offline", () => markSyncOffline("Sem conexão com a internet."));

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  try {
    await handleForm(form);
  } catch (error) {
    console.error(error);
    notify("Não foi possível salvar. Recarregue o app e tente novamente.");
  }
});

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (action) {
    const { action: name } = action.dataset;
    const id = action.dataset.id;
    const view = action.dataset.view;

    if (name === "view") navigate(view);
    if (name === "auth-view") setAuthView(action.dataset.mode);
    if (name === "open-feedback") navigate("feedback");
    if (name === "feedback") navigate("feedback");
    if (name === "logout") logout();
    if (name === "drawer") openDrawer();
    if (name === "close-modal") closeModal();
    if (name === "new-pet") openPetModal();
    if (name === "edit-pet") openPetModal(id);
    if (name === "delete-pet") deletePet(id);
    if (name === "sign-pet") openSignatureModal(id || state.selectedPetId);
    if (name === "clear-signature") clearSignaturePad();
    if (name === "save-signature") saveSignature(id || state.selectedPetId);
    if (name === "download-wallet-pdf") downloadWalletPdf(id || state.selectedPetId);
    if (name === "wallet-slide") {
      const slide = Number(action.dataset.slide);
      const step = action.classList.contains("wallet-carousel-arrow") ? (slide <= 0 ? -1 : 1) : 0;
      setWalletSlide(step ? walletSlideIndex + step : slide);
    }
    if (name === "pet-wallet") {
      state.selectedPetId = id;
      walletSlideIndex = 0;
      navigate("wallet");
    }
    if (name === "new-vaccine") openVaccineModal(id || state.selectedPetId);
    if (name === "edit-vaccine") openVaccineModal("", id);
    if (name === "delete-vaccine") deleteVaccine(id);
    if (name === "view-vaccines") navigate("vaccines");
    if (name === "edit-owner") openOwnerModal();
    if (name === "save-travel") openTravelModal();
    if (name === "new-document") openDocumentModal(id || state.selectedPetId);
    if (name === "edit-document") openDocumentModal("", id);
    if (name === "delete-document") deleteDocument(id);
    if (name === "install") installApp();
    if (name === "install-help") openInstallHelp();
    if (name === "toggle-theme") toggleTheme();
    if (name === "dismiss-install") {
      state.installDismissed = true;
      saveState();
      render();
    }
    if (name === "export") exportData();
    if (name === "import") importData();
    if (name === "sync-now") syncWithServer("manual");
    if (name === "reset-demo") resetDemo();
    if (name === "maps") openMaps(action.dataset.query);
    if (name === "lookup-cep") lookupCep(action.closest("form"));
    if (name === "refresh-clinics") loadNearbyClinics(true);
  }

  const starButton = event.target.closest("[data-rating-value]");
  if (starButton) {
    const fieldName = starButton.dataset.ratingField;
    const input = starButton.closest(".field")?.querySelector(`input[name="${fieldName}"]`);
    const buttons = starButton.parentElement?.querySelectorAll(".star-button") || [];
    const value = Number(starButton.dataset.ratingValue || 0);
    if (input) input.value = String(value);
    buttons.forEach((button) => {
      const buttonValue = Number(button.dataset.ratingValue || 0);
      const isActive = buttonValue <= value;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-search='pets']")) {
    searchTerm = event.target.value.trim().toLowerCase();
    renderPets();
  }

  if (event.target.matches("[data-travel-check]")) {
    const petId = state.selectedPetId || state.travel.selectedPetId || state.pets[0]?.id || "";
    const travel = getTravelForPet(petId);
    travel.items[event.target.dataset.travelCheck] = event.target.checked;
    setTravelForPet(petId, travel);
    saveState();
    renderTravel();
  }

  if (event.target.matches("[data-cep-input]")) {
    const digits = onlyDigits(event.target.value).slice(0, 8);
    const form = event.target.closest("form");
    event.target.value = digits.replace(/^(\d{5})(\d)/, "$1-$2");
    setFormValue(form, "latitude", "");
    setFormValue(form, "longitude", "");
    setFormValue(form, "locationSource", "");
    clearTimeout(cepLookupTimer);
    if (digits.length === 8) {
      cepLookupTimer = setTimeout(() => lookupCep(form), 450);
    }
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.matches("[data-pet-photo]")) {
    await handlePetPhotoInput(event.target);
  }

  if (event.target.matches("[data-document-file]")) {
    await handleDocumentFileInput(event.target);
  }

  if (event.target.matches("[data-filter='pet']")) {
    petFilter = event.target.value;
    renderPets();
  }

  if (event.target.matches("[data-filter='vaccine']")) {
    vaccineFilter = event.target.value;
    renderVaccines();
  }

  if (event.target.matches("[data-select-pet]")) {
    const petId = event.target.value;
    state.selectedPetId = petId;
    const travel = getTravelForPet(petId);
    setTravelForPet(petId, travel);
    saveState();
    render();
  }
});

document.addEventListener(
  "scroll",
  (event) => {
    const track = event.target;
    if (!(track instanceof HTMLElement) || !track.matches("[data-wallet-track]")) return;
    const nextIndex = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
    updateWalletSlideControls(nextIndex);
  },
  true
);

document.addEventListener("keydown", (event) => {
  if (!event.target.matches("[data-wallet-track]")) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setWalletSlide(walletSlideIndex - 1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    setWalletSlide(walletSlideIndex + 1);
  }
});

init();

function init() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
  render();
  syncWithServer("startup", { silent: true });
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const baseState = stored ? mergeState(JSON.parse(stored)) : structuredClone(defaultState);
    const selectedPetId = baseState.selectedPetId && baseState.pets.some((pet) => pet.id === baseState.selectedPetId)
      ? baseState.selectedPetId
      : baseState.pets[0]?.id || "";
    const normalizedTravelByPet = normalizeTravelByPet(baseState.travelByPet || {});
    return {
      ...baseState,
      currentView: "home",
      selectedPetId,
      travel: normalizeTravelEntry(baseState.travel || getTravelForPet(selectedPetId)),
      travelByPet: normalizedTravelByPet,
      feedback: Array.isArray(baseState.feedback) ? baseState.feedback : []
    };
  } catch {
    const fallback = structuredClone(defaultState);
    fallback.currentView = "home";
    fallback.selectedPetId = fallback.pets[0]?.id || "";
    fallback.travel = normalizeTravelEntry(fallback.travel || blankTravel());
    fallback.travelByPet = normalizeTravelByPet(fallback.travelByPet || {});
    return fallback;
  }
}

function mergeState(partial = {}) {
  return {
    ...structuredClone(defaultState),
    ...partial,
    auth: { ...defaultState.auth, ...(partial.auth || {}) },
    sync: { ...defaultState.sync, ...(partial.sync || {}) },
    users: Array.isArray(partial.users) ? partial.users : [],
    owner: normalizeOwner(partial.owner),
    travel: normalizeTravelEntry(partial.travel || defaultState.travel),
    travelByPet: normalizeTravelByPet(partial.travelByPet || (partial.travel ? { [partial.travel.selectedPetId || partial.selectedPetId || ""]: partial.travel } : {})),
    feedback: Array.isArray(partial.feedback) ? partial.feedback : []
  };
}

function normalizeOwner(partialOwner = {}) {
  const owner = { ...defaultState.owner, ...(partialOwner || {}) };
  if (!owner.addressNumber) {
    const match = String(owner.address || "").match(/^(.*?),\s*(\d+[\w-]*)$/);
    if (match) {
      owner.address = match[1].trim();
      owner.addressNumber = match[2].trim();
    }
  }
  return owner;
}

function saveState(options = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (options.sync !== false && isAuthenticated()) scheduleSync();
}

function scheduleSync() {
  if (!state.auth?.apiToken || syncing) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncWithServer("auto", { silent: true }), SYNC_DEBOUNCE_MS);
}

async function syncWithServer(reason = "auto", options = {}) {
  if (!isAuthenticated()) return;

  if (!state.auth?.apiToken) {
    state.sync = {
      ...defaultState.sync,
      status: "local",
      lastError: "Entre novamente pela API para conectar esta conta ao banco.",
      apiOnline: false
    };
    saveState({ sync: false });
    return;
  }

  if (syncing) return;
  syncing = true;
  clearTimeout(syncTimer);

  const previousSync = { ...defaultState.sync, ...(state.sync || {}) };
  state.sync = { ...previousSync, status: "syncing", lastError: "", apiOnline: true };
  saveState({ sync: false });
  if (!options.silent && reason === "manual") render();

  try {
    const payload = await apiRequest("/api/sync", {
      method: "POST",
      auth: true,
      body: {
        state: stateForServer(),
        clientUpdatedAt: new Date().toISOString()
      }
    });

    applyServerSession(payload, { keepToken: true });
    state.sync = {
      status: "synced",
      lastSyncedAt: payload.syncedAt || new Date().toISOString(),
      lastError: "",
      apiOnline: true
    };
    saveState({ sync: false });
    if (!options.silent && reason === "manual") notify("Dados sincronizados com o PostgreSQL.");
    render();
  } catch (error) {
    state.sync = {
      ...previousSync,
      status: "error",
      lastError: error.message || "Banco indisponível.",
      apiOnline: false
    };
    saveState({ sync: false });
    if (!options.silent && reason === "manual") notify("Banco indisponível. Dados seguem salvos no celular.");
    if (!options.silent) render();
  } finally {
    syncing = false;
  }
}

function markSyncOffline(message) {
  state.sync = {
    ...defaultState.sync,
    ...(state.sync || {}),
    status: "error",
    lastError: message,
    apiOnline: false
  };
  saveState({ sync: false });
  render();
}

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (options.auth && state.auth?.apiToken) headers.Authorization = `Bearer ${state.auth.apiToken}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || "API indisponível.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

function applyServerSession(payload, options = {}) {
  const apiUser = payload?.user;
  if (!apiUser?.email) return;

  const previousUsers = Array.isArray(state.users) ? state.users : [];
  const preferences = {
    theme: state.theme,
    installDismissed: state.installDismissed
  };
  const token = options.keepToken ? state.auth?.apiToken : payload.token || state.auth?.apiToken || "";
  const remoteState = payload.state ? mergeState(payload.state) : blankStateForUser(apiUser, options.password || "");
  const knownUsers = [...previousUsers, ...(Array.isArray(remoteState.users) ? remoteState.users : [])];

  state = {
    ...remoteState,
    theme: preferences.theme,
    installDismissed: preferences.installDismissed,
    auth: {
      ...defaultState.auth,
      ...(remoteState.auth || {}),
      currentUserEmail: apiUser.email,
      authView: "login",
      trustedDevice: true,
      apiToken: token
    },
    users: upsertLocalUser(knownUsers, apiUser, options.password),
    sync: {
      status: "synced",
      lastSyncedAt: payload.syncedAt || new Date().toISOString(),
      lastError: "",
      apiOnline: true
    }
  };
}

function blankStateForUser(user, password = "") {
  return {
    ...structuredClone(defaultState),
    currentView: "home",
    selectedPetId: "",
    owner: blankOwner(user),
    pets: [],
    vaccines: [],
    documents: [],
    travel: blankTravel(),
    travelByPet: {},
    feedback: [],
    users: upsertLocalUser([], user, password),
    auth: {
      ...defaultState.auth,
      currentUserEmail: user.email,
      authView: "login",
      trustedDevice: true
    }
  };
}

function upsertLocalUser(users, user, password = "") {
  const email = normalizeEmail(user.email);
  const cleanUsers = Array.isArray(users) ? users.filter((item) => normalizeEmail(item.email) !== email) : [];
  const previous = Array.isArray(users) ? users.find((item) => normalizeEmail(item.email) === email) : null;

  return [
    ...cleanUsers,
    {
      id: user.id || previous?.id || createId("user"),
      name: user.name || previous?.name || "",
      email,
      phone: user.phone || previous?.phone || "",
      password: password || previous?.password || "",
      createdAt: user.createdAt || user.created_at || previous?.createdAt || new Date().toISOString()
    }
  ];
}

function stateForServer() {
  const snapshot = JSON.parse(JSON.stringify(state));
  delete snapshot.sync;
  snapshot.auth = { ...(snapshot.auth || {}), apiToken: "" };
  snapshot.users = (Array.isArray(snapshot.users) ? snapshot.users : []).map((user) => {
    const { password, ...safeUser } = user;
    return safeUser;
  });
  return snapshot;
}

function render() {
  applyTheme();
  app.innerHTML = isAuthenticated() ? layout(screenTemplate()) : authView();
  if (state.currentView === "wallet") requestAnimationFrame(() => setWalletSlide(walletSlideIndex, false));
  if (state.currentView === "clinics" && clinicsStatus === "idle") requestAnimationFrame(() => loadNearbyClinics());
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme === "dark" ? "dark" : "light";
  document
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", state.theme === "dark" ? "#0d1f20" : "#2ac9a7");
}

function isAuthenticated() {
  return Boolean(state.auth?.currentUserEmail && currentUser());
}

function currentUser() {
  const email = normalizeEmail(state.auth?.currentUserEmail || "");
  return (state.users || []).find((user) => normalizeEmail(user.email) === email) || null;
}

function setAuthView(mode) {
  state.auth = { ...state.auth, authView: mode === "register" ? "register" : "login" };
  saveState();
  render();
}

function authView() {
  const mode = state.auth?.authView === "register" ? "register" : "login";
  const isRegister = mode === "register";

  return `
    <main class="auth-screen">
      <section class="auth-hero">
        <div class="auth-brand">
          <span class="auth-logo"><img src="${logoSrc()}" alt="${APP_NAME}" /></span>
          <div>
            <strong>${APP_NAME}</strong>
            <span>Carteira digital para pets</span>
          </div>
        </div>
        <div class="auth-copy">
          <span class="eyebrow">Identificação segura</span>
          <h1>${isRegister ? "Crie sua carteira pet" : "Bem-vindo de volta"}</h1>
          <p>Tenha dados do pet, tutor, vacinas, viagem e veterinárias próximas em um app instalável no celular.</p>
        </div>
      </section>

      <section class="auth-panel" aria-label="${isRegister ? "Criar conta" : "Entrar"}">
        <div class="auth-tabs">
          <button class="${!isRegister ? "active" : ""}" type="button" data-action="auth-view" data-mode="login">Entrar</button>
          <button class="${isRegister ? "active" : ""}" type="button" data-action="auth-view" data-mode="register">Cadastrar</button>
        </div>
        ${isRegister ? registerForm() : loginForm()}
      </section>
    </main>
  `;
}

function loginForm() {
  return `
    <form class="form auth-form" data-form="login">
      ${field("E-mail", "email", "", "email", true)}
      ${field("Senha", "password", "", "password", true)}
      <button class="primary-button" type="submit">Entrar</button>
      <p class="muted small">Este aparelho será lembrado após o login e abrirá direto no início.</p>
    </form>
  `;
}

function registerForm() {
  return `
    <form class="form auth-form" data-form="register">
      ${field("Nome completo", "name", "", "text", true)}
      ${field("E-mail", "email", "", "email", true)}
      ${field("Telefone", "phone", "", "tel", true)}
      ${field("Senha", "password", "", "password", true)}
      ${field("Confirmar senha", "confirmPassword", "", "password", true)}
      <button class="primary-button" type="submit">Criar conta</button>
      <p class="muted small">Depois do cadastro, a carteira começa vazia para você adicionar seus pets.</p>
    </form>
  `;
}

function layout(content) {
  const active = state.currentView;
  return `
    <main class="screen view-${active}">
      <header class="topbar">
        <button class="icon-button" type="button" data-action="drawer" aria-label="Abrir menu">☰</button>
        <div class="brand">
          <span class="brand-mark"><img src="${logoSrc()}" alt="" /></span>
          <span>
            <span class="brand-title">${APP_NAME}</span>
            <span class="brand-subtitle">${escapeHTML(state.owner.city)}, ${escapeHTML(state.owner.state)} · ${state.pets.length} pet${state.pets.length === 1 ? "" : "s"}</span>
          </span>
        </div>
        <div class="top-actions">
          <button class="icon-button" type="button" data-action="toggle-theme" aria-label="Alternar tema">${themeIcon()}</button>
          <button class="secondary-button desktop-only" type="button" data-action="new-pet">＋ Pet</button>
          <button class="avatar-button" type="button" data-action="edit-owner" aria-label="Editar tutor">${initials(state.owner.name)}</button>
        </div>
      </header>
      <section class="content">${content}</section>
      <nav class="bottom-nav" aria-label="Navegação principal">
        ${views.map((view) => `
          <button class="nav-item ${active === view.id ? "active" : ""}" type="button" data-action="view" data-view="${view.id}">
            <span class="nav-icon">${view.icon}</span>
            <span>${view.label}</span>
          </button>
        `).join("")}
      </nav>
    </main>
  `;
}

function screenTemplate() {
  if (state.currentView === "home") return homeView();
  if (state.currentView === "pets") return petsView();
  if (state.currentView === "wallet") return walletView();
  if (state.currentView === "vaccines") return vaccinesView();
  if (state.currentView === "travel") return travelView();
  if (state.currentView === "clinics") return clinicsView();
  if (state.currentView === "feedback") return feedbackView();
  if (state.currentView === "settings") return settingsView();
  return homeView();
}

function navigate(view) {
  if (view === "wallet" && state.currentView !== "wallet") walletSlideIndex = 0;
  state.currentView = view;
  saveState();
  closeModal();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveState();
  closeModal();
  render();
  notify(state.theme === "dark" ? "Tema escuro ativado." : "Tema claro ativado.");
}

function themeIcon() {
  return state.theme === "dark" ? "☀" : "☾";
}

function logoSrc() {
  return state.theme === "dark" ? "./assets/pet-icon-dark.svg" : "./assets/pet-icon.svg";
}

function homeView() {
  const selectedPet = getSelectedPet();
  const upcoming = getVaccines().filter((vaccine) => ["late", "soon"].includes(vaccineFilterKey(vaccine)));
  const selectedPetId = state.selectedPetId || state.pets[0]?.id || "";
  const progress = travelProgressForPet(selectedPetId);
  return `
    <div class="hero">
      <div class="hero-copy">
        <span class="eyebrow">Carteira digital completa</span>
        <h1>${APP_NAME}</h1>
        <p>Identificação, tutor, vacinas, documentos de viagem e clínicas próximas em um app instalável no celular.</p>
        <div class="button-row">
          <button class="primary-button" type="button" data-action="new-pet">＋ Cadastrar pet</button>
          <button class="secondary-button" type="button" data-action="view" data-view="wallet">Carteira atual</button>
        </div>
      </div>
      <div class="hero-panel">
        ${installBanner()}
        <div class="status-stack">
          ${statusCard("◉", "Pets cadastrados", state.pets.length)}
          ${statusCard("✚", "Vacinas em atenção", upcoming.length)}
          ${statusCard("⇄", "Checklist de viagem", `${progress}%`)}
        </div>
      </div>
    </div>

    <section class="section">
      <div class="quick-actions">
        ${quickAction("pets", "◉", "Pets", "Lista, busca e cadastro completo")}
        ${quickAction("vaccines", "✚", "Vacinas", "Histórico e próximas doses")}
        ${quickAction("travel", "⇄", "Viagem", "Checklist e documentos")}
        ${quickAction("clinics", "⌖", "Veterinárias", "Busca perto do tutor")}
      </div>
    </section>

    <section class="section screen-grid">
      <div class="grid">
        <div class="section-title">
          <div>
            <h2>Carteira em destaque</h2>
            <p class="muted small">${selectedPet ? "Dados prontos para identificação rápida." : "Cadastre um pet para gerar a carteira."}</p>
          </div>
          <button class="ghost-button" type="button" data-action="view" data-view="pets">Ver todos</button>
        </div>
        ${selectedPet ? petCard(selectedPet, true) : emptyState("◉", "Nenhum pet cadastrado", "Adicione o primeiro pet para criar a carteira digital.", "Cadastrar pet", "new-pet")}
      </div>
      <aside class="grid">
        <div class="section-title">
          <div>
            <h2>Próximas vacinas</h2>
            <p class="muted small">Acompanhamento por data de vencimento.</p>
          </div>
        </div>
        ${upcoming.length ? `<div class="timeline">${upcoming.slice(0, 3).map(vaccineItem).join("")}</div>` : emptyState("✓", "Vacinas em dia", "Nenhuma vacina vencida ou próxima nos próximos 30 dias.")}
      </aside>
    </section>
  `;
}

function petsView() {
  return `
    <div class="page-head">
      <span class="eyebrow">Meus pets</span>
      <h1>Carteiras cadastradas</h1>
      <p class="muted">Organize dados de identificação, saúde, contato do tutor e observações importantes.</p>
    </div>
    <div class="toolbar">
      <label class="searchbar">
        <span>⌕</span>
        <input type="search" value="${escapeHTML(searchTerm)}" data-search="pets" placeholder="Buscar por nome, raça ou microchip" />
      </label>
      <select class="secondary-button" data-filter="pet" aria-label="Filtrar pets">
        <option value="all" ${petFilter === "all" ? "selected" : ""}>Todos</option>
        <option value="Cachorro" ${petFilter === "Cachorro" ? "selected" : ""}>Cachorros</option>
        <option value="Gato" ${petFilter === "Gato" ? "selected" : ""}>Gatos</option>
        <option value="Outros" ${petFilter === "Outros" ? "selected" : ""}>Outros</option>
      </select>
    </div>
    <div id="petsList">${petsListTemplate()}</div>
  `;
}

function renderPets() {
  const target = document.querySelector("#petsList");
  if (target) target.innerHTML = petsListTemplate();
}

function petsListTemplate() {
  const pets = filteredPets();
  if (!pets.length) {
    return emptyState("⌕", "Nada encontrado", "Ajuste a busca ou cadastre outro pet.", "Cadastrar pet", "new-pet");
  }
  return `<div class="grid two">${pets.map((pet) => petCard(pet)).join("")}</div>`;
}

function walletView() {
  const pet = getSelectedPet();
  if (!pet) {
    return emptyState("◉", "Nenhum pet selecionado", "Cadastre um pet para visualizar a carteira digital.", "Cadastrar pet", "new-pet");
  }

  const petVaccines = getVaccines(pet.id);
  const petDocs = state.documents.filter((doc) => doc.petId === pet.id);
  return animalWalletDocumentView(pet, petVaccines, petDocs);

  return `
    <div class="page-head">
      <span class="eyebrow">Carteira do pet</span>
      <h1>${escapeHTML(pet.name)}</h1>
      <p class="muted">Identificação digital com dados do pet, tutor, saúde e documentos.</p>
    </div>

    <div class="identity">
      <div class="identity-main">
        ${petAvatar(pet)}
        <div>
          <h2>${escapeHTML(pet.name)}</h2>
          <div class="inline-meta">
            <span class="pill">${escapeHTML(pet.species)}</span>
            <span class="pill">${escapeHTML(pet.breed || "Raça não informada")}</span>
            <span class="pill">${petAge(pet.birthDate)}</span>
          </div>
        </div>
      </div>
      <div class="identity-code">
        ${qrTemplate(`${pet.registry}-${pet.microchip}-${state.owner.phone}`)}
        <span class="pill">${escapeHTML(pet.registry || "Registro digital")}</span>
      </div>
    </div>

    <section class="section">
      <div class="button-row">
        <button class="primary-button" type="button" data-action="edit-pet" data-id="${pet.id}">Editar dados</button>
        <button class="secondary-button" type="button" data-action="new-vaccine" data-id="${pet.id}">＋ Vacina</button>
        <button class="secondary-button" type="button" data-action="new-document" data-id="${pet.id}">＋ Documento</button>
      </div>
    </section>

    <section class="section screen-grid">
      <div class="grid">
        <div class="card">
          <h2>Dados do pet</h2>
          <div class="detail-list">
            ${detailRow("Espécie", pet.species)}
            ${detailRow("Raça", pet.breed)}
            ${detailRow("Sexo", pet.sex)}
            ${detailRow("Nascimento", formatDate(pet.birthDate))}
            ${detailRow("Peso", pet.weight ? `${pet.weight} kg` : "")}
            ${detailRow("Cor", pet.color)}
            ${detailRow("Microchip", pet.microchip)}
            ${detailRow("Temperamento", pet.temperament)}
            ${detailRow("Alergias", pet.allergies)}
            ${detailRow("Observações", pet.notes)}
          </div>
        </div>
        <div class="card">
          <h2>Tutor responsável</h2>
          <div class="detail-list">
            ${detailRow("Nome", state.owner.name)}
            ${detailRow("CPF", state.owner.cpf)}
            ${detailRow("Telefone", state.owner.phone)}
            ${detailRow("E-mail", state.owner.email)}
            ${detailRow("Endereço", ownerAddress())}
            ${detailRow("Emergência", `${state.owner.emergencyName} · ${state.owner.emergencyPhone}`)}
          </div>
        </div>
      </div>
      <aside class="grid">
        <div class="card">
          <div class="section-title">
            <div>
              <h2>Vacinas</h2>
              <p class="muted small">${petVaccines.length} registro${petVaccines.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          ${petVaccines.length ? `<div class="timeline">${petVaccines.map(vaccineItem).join("")}</div>` : emptyState("✚", "Sem vacinas", "Adicione o primeiro registro de vacinação.")}
        </div>
        <div class="card">
          <div class="section-title">
            <div>
              <h2>Documentos</h2>
              <p class="muted small">Atestados, exames e arquivos de viagem.</p>
            </div>
          </div>
          ${petDocs.length ? `<div class="grid">${petDocs.map(documentItem).join("")}</div>` : emptyState("□", "Sem documentos", "Registre atestados e exames importantes.")}
        </div>
      </aside>
    </section>
  `;
}

function animalWalletDocumentView(pet, petVaccines, petDocs) {
  const nextVaccine = petVaccines[0];
  const status = nextVaccine ? vaccineStatus(nextVaccine) : { type: "warn", label: "Sem vacinas" };
  const documentNumber = pet.registry || `PET-${pet.id.slice(-6).toUpperCase()}`;
  const issuedAt = formatDate(todayISO);
  const address = ownerAddress();
  const walletSlides = ["Frente", "Verso", "Documentos"];

  return `
    <div class="page-head">
      <span class="eyebrow">Identificação oficial do pet</span>
      <h1>Carteira do ${escapeHTML(pet.name)}</h1>
      <p class="muted">Deslize para consultar a frente e o verso da identificação.</p>
    </div>

    <section class="wallet-document" aria-label="Carteira de identidade animal">
      <div class="wallet-document-top">
        <button class="ghost-button" type="button" data-action="view" data-view="pets">← Voltar</button>
        <div class="button-row">
          <button class="primary-button" type="button" data-action="edit-pet" data-id="${pet.id}">Editar pet</button>
          <button class="secondary-button" type="button" data-action="sign-pet" data-id="${pet.id}">Assinar</button>
          <button class="secondary-button" type="button" data-action="download-wallet-pdf" data-id="${pet.id}">Baixar PDF</button>
        </div>
      </div>

      <div class="wallet-carousel" aria-roledescription="carrossel" aria-label="Frente e verso da carteira pet">
        <div class="animal-wallet-pages" id="walletPrintArea" data-wallet-track tabindex="0">
          <article class="animal-wallet-card animal-wallet-front" aria-label="Frente da carteira pet" aria-roledescription="slide">
            <header class="pet-id-header">
              <span class="pet-id-seal"><img src="./assets/pet-icon.svg" alt="" /></span>
              <span class="pet-id-heading">
                <small>República Federativa do Brasil</small>
                <strong>Carteira Nacional de Identificação Pet</strong>
                <em>CNIP · Documento digital</em>
              </span>
              <span class="pet-id-country">BR</span>
            </header>

            <div class="pet-id-body">
              <div class="pet-id-portrait-column">
                <div class="pet-id-portrait">${walletIdentityPhoto(pet)}</div>
                <span class="pet-id-caption">Foto do pet</span>
                <div class="pet-id-signature">
                  ${signatureMarkup(pet, state.owner.name)}
                  <span>Assinatura do tutor</span>
                </div>
              </div>

              <div class="pet-id-fields">
                ${walletField("Nome", pet.name, true)}
                <div class="pet-id-field-row pet-id-field-row-three">
                  ${walletField("Nascimento", formatDate(pet.birthDate))}
                  ${walletField("Espécie", pet.species)}
                  ${walletField("Sexo", pet.sex)}
                </div>
                <div class="pet-id-field-row">
                  ${walletField("Raça", pet.breed)}
                  ${walletField("Cor", pet.color)}
                </div>
                <div class="pet-id-field-row">
                  ${walletField("Registro", documentNumber)}
                  ${walletField("Microchip", pet.microchip)}
                </div>
                ${walletField("Tutor responsável", state.owner.name, true)}
                <div class="pet-id-health ${status.type}">
                  <span>Situação vacinal</span>
                  <strong>${escapeHTML(nextVaccine ? `${nextVaccine.name} · ${status.label}` : status.label)}</strong>
                </div>
              </div>
            </div>

            <footer class="pet-id-footer">
              <strong>${escapeHTML(documentNumber)}</strong>
              <span>Válida em todo o território nacional</span>
              <em>1ª via</em>
            </footer>
          </article>

          <article class="animal-wallet-card animal-wallet-back" aria-label="Verso da carteira pet" aria-roledescription="slide">
            <header class="pet-id-header pet-id-header-back">
              <span class="pet-id-seal"><img src="./assets/pet-icon.svg" alt="" /></span>
              <span class="pet-id-heading">
                <small>Identificação Pet</small>
                <strong>Dados do tutor e segurança</strong>
                <em>Apresente esta carteira em caso de emergência</em>
              </span>
              <span class="pet-id-country">BR</span>
            </header>

            <div class="pet-id-back-body">
              <div class="pet-id-owner-fields">
                <div class="pet-id-field-row">
                  ${walletField("Tutor", state.owner.name)}
                  ${walletField("CPF", state.owner.cpf)}
                </div>
                <div class="pet-id-field-row">
                  ${walletField("Telefone", state.owner.phone)}
                  ${walletField("E-mail", state.owner.email)}
                </div>
                ${walletField("Endereço", address, true)}
                <div class="pet-id-field-row">
                  ${walletField("Contato de emergência", state.owner.emergencyName)}
                  ${walletField("Telefone", state.owner.emergencyPhone)}
                </div>
                <div class="pet-id-field-row">
                  ${walletField("Temperamento", pet.temperament)}
                  ${walletField("Alergias", pet.allergies)}
                </div>
                <div class="pet-id-notes">
                  <span>Observações</span>
                  <strong>${escapeHTML(pet.notes || "Sem observações cadastradas.")}</strong>
                </div>
              </div>

              <div class="pet-id-validation">
                ${qrTemplate(`${documentNumber}-${pet.microchip}-${state.owner.phone}`)}
                <strong>QR PET</strong>
                <span>Validação da identidade</span>
              </div>
            </div>

            <footer class="pet-id-footer">
              <strong>Emitida em ${issuedAt}</strong>
              <span>${escapeHTML(pet.name)} · ${escapeHTML(documentNumber)}</span>
              <em>Documento digital</em>
            </footer>
          </article>
          ${walletDocumentsSlide(pet, petDocs)}
        </div>

        <div class="wallet-carousel-navigation">
          <button class="wallet-carousel-arrow" type="button" data-action="wallet-slide" data-slide="0" aria-label="Mostrar frente da carteira">←</button>
          <div class="wallet-carousel-dots" role="tablist" aria-label="Lados da carteira">
            ${walletSlides.map((label, index) => `<button class="${index === 0 ? "active" : ""}" type="button" role="tab" data-action="wallet-slide" data-slide="${index}" aria-label="${label}" aria-selected="${index === 0 ? "true" : "false"}"></button>`).join("")}
          </div>
          <button class="wallet-carousel-arrow" type="button" data-action="wallet-slide" data-slide="1" aria-label="Mostrar verso da carteira">→</button>
        </div>
        <p class="wallet-carousel-status" aria-live="polite" data-wallet-slide-status>Frente · 1 de ${walletSlides.length} — arraste para o lado</p>
      </div>
    </section>

    <section class="section">
      <div class="button-row">
        <button class="secondary-button" type="button" data-action="new-vaccine" data-id="${pet.id}">＋ Vacina</button>
        <button class="secondary-button" type="button" data-action="new-document" data-id="${pet.id}">＋ Documento</button>
        <button class="danger-button" type="button" data-action="delete-pet" data-id="${pet.id}">Deletar Pet</button>
      </div>
    </section>

    <section class="section screen-grid">
      <div class="grid">
        <div class="card">
          <div class="section-title">
            <div>
              <h2>Dados completos</h2>
              <p class="muted small">Informações usadas no documento digital.</p>
            </div>
          </div>
          <div class="detail-list">
            ${detailRow("Espécie", pet.species)}
            ${detailRow("Raça", pet.breed)}
            ${detailRow("Sexo", pet.sex)}
            ${detailRow("Nascimento", formatDate(pet.birthDate))}
            ${detailRow("Peso", pet.weight ? `${pet.weight} kg` : "")}
            ${detailRow("Microchip", pet.microchip)}
            ${detailRow("Tutor", state.owner.name)}
            ${detailRow("Endereço", address)}
            ${detailRow("Vacina", nextVaccine ? `${nextVaccine.name} - ${status.label}` : "Sem vacinas")}
            ${detailRow("Emitido em", issuedAt)}
            ${detailRow("Observações", pet.notes)}
          </div>
        </div>
        <div class="card">
          <h2>Vacinas</h2>
          ${petVaccines.length ? `<div class="timeline" style="margin-top: 12px;">${petVaccines.map(vaccineItem).join("")}</div>` : emptyState("✓", "Sem vacinas", "Adicione o primeiro registro de vacinação.")}
        </div>
      </div>
      <aside class="grid">
        <div class="card">
          <h2>Documentos</h2>
          ${petDocs.length ? `<div class="grid" style="margin-top: 12px;">${petDocs.map(documentItem).join("")}</div>` : emptyState("□", "Sem documentos", "Registre atestados e exames importantes.")}
        </div>
      </aside>
    </section>
  `;
}

function walletDocumentsSlide(pet, petDocs) {
  const documentNumber = pet.registry || `PET-${pet.id.slice(-6).toUpperCase()}`;
  const docs = petDocs.slice(0, 4);
  const attachedCount = petDocs.filter((doc) => documentAttachment(doc)).length;

  return `
    <article class="animal-wallet-card animal-wallet-documents" aria-label="Documentos anexados do pet" aria-roledescription="slide">
      <header class="pet-id-header pet-id-header-documents">
        <span class="pet-id-seal"><img src="./assets/pet-icon.svg" alt="" /></span>
        <span class="pet-id-heading">
          <small>Arquivos do pet</small>
          <strong>Documentos anexados</strong>
          <em>${escapeHTML(pet.name)} · ${escapeHTML(documentNumber)}</em>
        </span>
        <span class="pet-id-country">${attachedCount}</span>
      </header>

      <div class="pet-id-documents-body">
        <div class="pet-id-documents-summary">
          <div>
            <span>Registros salvos</span>
            <strong>${petDocs.length} documento${petDocs.length === 1 ? "" : "s"}</strong>
          </div>
          <div>
            <span>Arquivos enviados</span>
            <strong>${attachedCount} anexo${attachedCount === 1 ? "" : "s"}</strong>
          </div>
        </div>

        ${
          docs.length
            ? `<div class="wallet-documents-grid">${docs.map(walletDocumentTile).join("")}</div>`
            : `<div class="wallet-documents-empty">
                <strong>Nenhum documento cadastrado</strong>
                <span>Use o botão Documento para anexar atestados, exames e receitas.</span>
              </div>`
        }
      </div>

      <footer class="pet-id-footer">
        <strong>Anexos digitais</strong>
        <span>${escapeHTML(pet.name)} · ${escapeHTML(documentNumber)}</span>
        <em>${formatDate(todayISO)}</em>
      </footer>
    </article>
  `;
}

function walletDocumentTile(doc) {
  const attachment = documentAttachment(doc);
  return `
    <div class="wallet-document-tile ${attachment ? "has-attachment" : ""}">
      <div class="wallet-document-preview ${attachment && isImageAttachment(attachment) ? "image" : "file"}">
        ${
          attachment && isImageAttachment(attachment)
            ? `<img src="${escapeHTML(attachment.dataUrl)}" alt="Documento ${escapeHTML(doc.title)}" />`
            : `<span>${attachment ? documentFileKind(attachment) : "DOC"}</span>`
        }
      </div>
      <div class="wallet-document-tile-text">
        <span>${escapeHTML(doc.kind || "Documento")}</span>
        <strong>${escapeHTML(doc.title || "Documento")}</strong>
        <em>${formatDate(doc.date)} · ${doc.expiresAt ? `Val. ${formatDate(doc.expiresAt)}` : "Sem validade"}</em>
        ${attachment ? `<small>${escapeHTML(attachment.name)} · ${formatFileSize(attachment.size)}</small>` : `<small>Sem arquivo anexado</small>`}
      </div>
    </div>
  `;
}

function walletIdentityPhoto(pet) {
  if (pet.photo) return `<img src="${escapeHTML(safeImageSrc(pet.photo))}" alt="Foto de ${escapeHTML(pet.name)}" />`;
  return `<div class="pet-id-photo-placeholder">${initials(pet.name)}</div>`;
}

function walletField(label, value, wide = false) {
  return `
    <div class="pet-id-field ${wide ? "wide" : ""}">
      <span>${label}</span>
      <strong>${escapeHTML(value || "Não informado")}</strong>
    </div>
  `;
}

function setWalletSlide(index, smooth = true) {
  const track = document.querySelector("[data-wallet-track]");
  const maxIndex = Math.max((track?.children.length || 1) - 1, 0);
  const normalizedIndex = Math.max(0, Math.min(maxIndex, Number.isFinite(index) ? index : 0));
  walletSlideIndex = normalizedIndex;
  if (track) {
    track.scrollTo({
      left: track.clientWidth * normalizedIndex,
      behavior: smooth ? "smooth" : "auto"
    });
  }
  updateWalletSlideControls(normalizedIndex);
}

function updateWalletSlideControls(index) {
  const track = document.querySelector("[data-wallet-track]");
  const total = Math.max(track?.children.length || 1, 1);
  const labels = ["Frente", "Verso", "Documentos"];
  const normalizedIndex = Math.max(0, Math.min(total - 1, index));
  walletSlideIndex = normalizedIndex;
  document.querySelectorAll(".wallet-carousel-dots [data-slide]").forEach((dot) => {
    const selected = Number(dot.dataset.slide) === normalizedIndex;
    dot.classList.toggle("active", selected);
    dot.setAttribute("aria-selected", String(selected));
  });
  const status = document.querySelector("[data-wallet-slide-status]");
  if (status) status.textContent = `${labels[normalizedIndex] || "Slide"} · ${normalizedIndex + 1} de ${total} — arraste para o lado`;
}

function animalData(label, value) {
  return `
    <div class="animal-data">
      <span>${label}</span>
      <strong>${escapeHTML(value || "")}</strong>
    </div>
  `;
}

function walletPhoto(pet) {
  if (pet.photo) return `<img src="${escapeHTML(safeImageSrc(pet.photo))}" alt="Foto de ${escapeHTML(pet.name)}" />`;
  return `<div class="animal-photo-placeholder">${initials(pet.name)}</div>`;
}

function signatureMarkup(pet, fallbackName = "") {
  if (pet.signature) return `<img src="${escapeHTML(safeImageSrc(pet.signature))}" alt="Assinatura digital" />`;
  return `<strong>${escapeHTML(fallbackName || "Assinatura digital")}</strong>`;
}

function walletDocumentView(pet, petVaccines, petDocs) {
  const nextVaccine = petVaccines[0];
  const status = nextVaccine ? vaccineStatus(nextVaccine) : { type: "warn", label: "Sem vacinas" };
  const documentNumber = pet.registry || `PET-${pet.id.slice(-6).toUpperCase()}`;
  const issuedAt = formatDate(todayISO);

  return `
    <div class="page-head">
      <span class="eyebrow">Documento digital</span>
      <h1>Carteira do ${escapeHTML(pet.name)}</h1>
      <p class="muted">Layout inspirado em documentos digitais, com identificação do pet, tutor, saúde e QR visual.</p>
    </div>

    <section class="digital-wallet" aria-label="Documento digital do pet">
      <article class="license-card license-front">
        <img class="doc-watermark" src="${logoSrc()}" alt="" />
        <div class="doc-topline">
          <div>
            <span class="doc-country">BRASIL</span>
            <strong>${APP_NAME}</strong>
            <span>Documento Digital do Pet</span>
          </div>
          <img class="doc-logo" src="${logoSrc()}" alt="${APP_NAME}" />
        </div>

        <div class="doc-main">
          <div class="doc-photo">${petAvatar(pet)}</div>
          <div class="doc-name">
            <span>Nome do pet</span>
            <h2>${escapeHTML(pet.name)}</h2>
            <div class="inline-meta">
              <span class="pill">${escapeHTML(pet.species)}</span>
              <span class="pill">${escapeHTML(pet.breed || "Raça não informada")}</span>
              <span class="pill ${status.type}">${status.label}</span>
            </div>
          </div>
          <div class="doc-qr">
            ${qrTemplate(`${documentNumber}-${pet.microchip}-${state.owner.phone}`)}
            <span>QR PET</span>
          </div>
        </div>

        <div class="doc-grid">
          ${walletData("Registro", documentNumber)}
          ${walletData("Microchip", pet.microchip)}
          ${walletData("Nascimento", formatDate(pet.birthDate))}
          ${walletData("Sexo", pet.sex)}
          ${walletData("Peso", pet.weight ? `${pet.weight} kg` : "")}
          ${walletData("Cor", pet.color)}
        </div>

        <div class="doc-footer">
          <span>Emitido em ${issuedAt}</span>
          <span>Validação digital local</span>
        </div>
      </article>

      <article class="license-card license-back">
        <img class="doc-watermark" src="${logoSrc()}" alt="" />
        <div class="doc-topline">
          <div>
            <span class="doc-country">Tutor responsável</span>
            <strong>${escapeHTML(state.owner.name)}</strong>
            <span>${escapeHTML(state.owner.phone)}</span>
          </div>
          <span class="doc-chip">ID</span>
        </div>

        <div class="doc-grid owner-doc-grid">
          ${walletData("CPF", state.owner.cpf)}
          ${walletData("E-mail", state.owner.email)}
          ${walletData("Endereço", ownerAddress(), true)}
          ${walletData("Emergência", `${state.owner.emergencyName} - ${state.owner.emergencyPhone}`, true)}
          ${walletData("Temperamento", pet.temperament, true)}
          ${walletData("Alergias", pet.allergies, true)}
        </div>

        <div class="doc-signature">
          <span>${escapeHTML(state.owner.name)}</span>
          <strong>Assinatura do tutor</strong>
        </div>
      </article>
    </section>

    <section class="section">
      <div class="button-row">
        <button class="primary-button" type="button" data-action="edit-pet" data-id="${pet.id}">Editar dados</button>
        <button class="secondary-button" type="button" data-action="new-vaccine" data-id="${pet.id}">＋ Vacina</button>
        <button class="secondary-button" type="button" data-action="new-document" data-id="${pet.id}">＋ Documento</button>
      </div>
    </section>

    <section class="section screen-grid">
      <div class="grid">
        <div class="card">
          <div class="section-title">
            <div>
              <h2>Dados completos</h2>
              <p class="muted small">Informações usadas no documento digital.</p>
            </div>
          </div>
          <div class="detail-list">
            ${detailRow("Espécie", pet.species)}
            ${detailRow("Raça", pet.breed)}
            ${detailRow("Sexo", pet.sex)}
            ${detailRow("Nascimento", formatDate(pet.birthDate))}
            ${detailRow("Peso", pet.weight ? `${pet.weight} kg` : "")}
            ${detailRow("Microchip", pet.microchip)}
            ${detailRow("Observações", pet.notes)}
          </div>
        </div>
        <div class="card">
          <h2>Vacinas</h2>
          ${petVaccines.length ? `<div class="timeline" style="margin-top: 12px;">${petVaccines.map(vaccineItem).join("")}</div>` : emptyState("✚", "Sem vacinas", "Adicione o primeiro registro de vacinação.")}
        </div>
      </div>
      <aside class="grid">
        <div class="card">
          <h2>Documentos</h2>
          ${petDocs.length ? `<div class="grid" style="margin-top: 12px;">${petDocs.map(documentItem).join("")}</div>` : emptyState("□", "Sem documentos", "Registre atestados e exames importantes.")}
        </div>
      </aside>
    </section>
  `;
}

function walletData(label, value, wide = false) {
  return `
    <div class="doc-data ${wide ? "wide" : ""}">
      <span>${label}</span>
      <strong>${escapeHTML(value || "Não informado")}</strong>
    </div>
  `;
}

function vaccinesView() {
  return `
    <div class="page-head">
      <span class="eyebrow">Saúde</span>
      <h1>Carteira de vacinação</h1>
      <p class="muted">Histórico de aplicações, próximas doses e vacinas vencidas por pet.</p>
    </div>
    <div class="toolbar">
      <div class="segmented" role="tablist" aria-label="Filtro de vacinas">
        ${[
          ["all", "Todas"],
          ["late", "Vencidas"],
          ["soon", "Próximas"],
          ["ok", "Em dia"]
        ].map(([value, label]) => `
          <button type="button" class="${vaccineFilter === value ? "active" : ""}" onclick="window.__setVaccineFilter('${value}')">${label}</button>
        `).join("")}
      </div>
      <button class="primary-button" type="button" data-action="new-vaccine">＋ Nova vacina</button>
    </div>
    <div id="vaccinesList">${vaccinesListTemplate()}</div>
  `;
}

window.__setVaccineFilter = (value) => {
  vaccineFilter = value;
  renderVaccines();
};

function renderVaccines() {
  const target = document.querySelector("#vaccinesList");
  if (target) {
    const toolbar = target.previousElementSibling;
    if (toolbar) {
      toolbar.querySelectorAll(".segmented button").forEach((button) => {
        button.classList.toggle("active", button.textContent.trim().toLowerCase().startsWith(filterLabel(vaccineFilter)));
      });
    }
    target.innerHTML = vaccinesListTemplate();
  }
}

function filterLabel(value) {
  return { all: "todas", late: "vencidas", soon: "próximas", ok: "em dia" }[value] || "todas";
}

function vaccinesListTemplate() {
  const vaccines = getVaccines().filter((vaccine) => {
    if (vaccineFilter === "all") return true;
    return vaccineFilterKey(vaccine) === vaccineFilter;
  });

  if (!vaccines.length) {
    return emptyState("✚", "Nenhum registro", "Cadastre uma vacina ou altere o filtro.", "Nova vacina", "new-vaccine");
  }
  return `<div class="timeline">${vaccines.map(vaccineItem).join("")}</div>`;
}

function travelView() {
  const selectedPetId = state.selectedPetId || state.travel?.selectedPetId || state.pets[0]?.id || "";
  const petTravel = getTravelForPet(selectedPetId);
  state.travel = petTravel;
  state.travel.selectedPetId = selectedPetId;
  const travelPet = state.pets.find((pet) => pet.id === selectedPetId) || getSelectedPet();
  const progress = travelProgressForPet(selectedPetId);
  const items = [
    ["vaccine", "Vacinas conferidas", "Principalmente antirrábica e polivalente"],
    ["certificate", "Atestado de saúde", "Emitido pelo veterinário antes da viagem"],
    ["carrier", "Caixa ou cinto de transporte", "Tamanho adequado ao pet"],
    ["food", "Ração, água e potes", "Quantidade para ida e volta"],
    ["collar", "Coleira com identificação", "Telefone do tutor atualizado"],
    ["destinationRules", "Regras do destino", "Hotel, companhia aérea ou rodoviária"],
    ["medicine", "Medicamentos e receitas", "Inclua antipulgas e uso contínuo"]
  ];

  return `
    <div class="page-head">
      <span class="eyebrow">Viagem com pet</span>
      <h1>Preparação segura</h1>
      <p class="muted">Checklist, destino, transporte e documentos essenciais para levar o pet.</p>
    </div>

    <section class="section screen-grid">
      <div class="grid">
        <div class="card">
          <div class="section-title">
            <div>
              <h2>${escapeHTML(petTravel.destination || "Destino não definido")}</h2>
              <p class="muted small">${formatDate(petTravel.date)} · ${escapeHTML(petTravel.transport || "Transporte não definido")}</p>
            </div>
            <button class="secondary-button" type="button" data-action="save-travel">Editar</button>
          </div>
          <div class="field" style="margin-top: 14px;">
            <label for="travelPet">Pet da viagem</label>
            <select id="travelPet" data-select-pet>
              ${state.pets.map((pet) => `<option value="${pet.id}" ${selectedPetId === pet.id ? "selected" : ""}>${escapeHTML(pet.name)}</option>`).join("")}
            </select>
          </div>
          <div class="progress" style="margin-top: 16px;">
            <div class="timeline-top">
              <strong>Checklist concluído</strong>
              <span class="pill ${progress === 100 ? "ok" : "warn"}">${progress}%</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width: ${progress}%"></div></div>
          </div>
        </div>
        <div class="checklist">
          ${items.map(([key, title, subtitle]) => `
            <label class="check-item ${petTravel.items[key] ? "done" : ""}">
              <input type="checkbox" data-travel-check="${key}" ${petTravel.items[key] ? "checked" : ""} />
              <span>
                <strong>${title}</strong>
                <span class="muted small" style="display:block;">${subtitle}</span>
              </span>
              <span>${petTravel.items[key] ? "✓" : "○"}</span>
            </label>
          `).join("")}
        </div>
      </div>
      <aside class="grid">
        ${travelPet ? petCard(travelPet, true) : emptyState("◉", "Sem pet", "Cadastre um pet para planejar a viagem.")}
        <div class="card">
          <h2>Anotações</h2>
          <p class="muted" style="margin-top: 8px;">${escapeHTML(petTravel.notes || "Sem anotações para a viagem.")}</p>
        </div>
      </aside>
    </section>
  `;
}

function renderTravel() {
  const travelScreen = document.querySelector(".content");
  if (travelScreen && state.currentView === "travel") travelScreen.innerHTML = travelView();
}

function clinicsView() {
  const address = ownerAddress();
  const query = encodeURIComponent(`veterinária perto de ${address || state.owner.city || "mim"}`);
  return `
    <div class="page-head">
      <span class="eyebrow">Localização do tutor</span>
      <h1>Veterinárias próximas</h1>
      <p class="muted">Clínicas reais encontradas perto da sua localização atual ou do endereço cadastrado.</p>
    </div>
    <div class="map-strip" aria-hidden="true">
      <span class="map-pin" style="left: 16%; top: 48%;"><span>⌂</span></span>
      <span class="map-pin" style="left: 42%; top: 24%;"><span>✚</span></span>
      <span class="map-pin" style="left: 70%; top: 58%;"><span>✚</span></span>
    </div>
    <section class="section">
      <div class="card">
        <div class="profile-strip">
          <div class="owner-avatar">${initials(state.owner.name)}</div>
          <div>
            <h2>${escapeHTML(address || "Endereço ainda não cadastrado")}</h2>
            <p class="muted small">${escapeHTML(clinicLocationLabel || "O app pedirá acesso à localização e usará o CEP como alternativa.")}</p>
          </div>
        </div>
        <div class="button-row" style="margin-top: 14px;">
          <button class="primary-button" type="button" data-action="refresh-clinics">⌖ Atualizar busca</button>
          <button class="secondary-button" type="button" data-action="maps" data-query="${query}">Abrir no mapa</button>
          <button class="secondary-button" type="button" data-action="edit-owner">Editar endereço</button>
        </div>
      </div>
    </section>
    <section class="section" id="clinicsList" aria-live="polite">
      ${clinicsListTemplate()}
    </section>
  `;
}

function clinicsListTemplate() {
  if (clinicsStatus === "loading" || clinicsStatus === "idle") {
    return `
      <div class="card location-status-card">
        ${loadingDots()}
        <div>
          <h2>Buscando veterinárias próximas</h2>
          <p class="muted small">Consultando sua localização, endereço cadastrado e dados do OpenStreetMap.</p>
        </div>
      </div>
    `;
  }

  if (clinicsStatus === "error") {
    return `
      <div class="empty-state">
        <span class="empty-icon">⌖</span>
        <div>
          <h2>Não foi possível localizar as veterinárias</h2>
          <p class="muted">${escapeHTML(clinicsError || "Confira o CEP ou permita o acesso à localização.")}</p>
        </div>
        <div class="button-row">
          <button class="primary-button" type="button" data-action="refresh-clinics">Tentar novamente</button>
          <button class="secondary-button" type="button" data-action="edit-owner">Conferir CEP</button>
        </div>
      </div>
    `;
  }

  if (!nearbyClinics.length) {
    return emptyState("⌖", "Nenhuma veterinária encontrada", "Não encontramos locais cadastrados perto desse endereço. Confira o CEP ou tente atualizar a busca.", "Tentar novamente", "refresh-clinics");
  }

  return `
    <div class="section-title">
      <div>
        <h2>${nearbyClinics.length} veterinária${nearbyClinics.length === 1 ? "" : "s"} por perto</h2>
        <p class="muted small">Ordenadas pela distância em linha reta.</p>
      </div>
    </div>
    <div class="grid two">${nearbyClinics.map((clinic) => clinicCard(clinic)).join("")}</div>
    <p class="map-attribution">Dados © colaboradores do OpenStreetMap</p>
  `;
}

function renderClinicsList() {
  const target = document.querySelector("#clinicsList");
  if (target) target.innerHTML = clinicsListTemplate();
}

async function loadNearbyClinics(force = false) {
  if (clinicsStatus === "loading") return;
  if (!force && clinicsStatus === "loaded") return;

  clinicsStatus = "loading";
  clinicsError = "";
  renderClinicsList();

  try {
    const location = await resolveTutorLocation();
    const payload = await apiRequest(`/api/clinics/nearby?${clinicSearchParams(location)}`);
    nearbyClinics = Array.isArray(payload.clinics) ? payload.clinics : [];
    updateOwnerCoordinates(payload.origin, location.source);
    clinicLocationLabel = clinicLocationDescription(payload.origin || location, payload.radius);
    clinicsStatus = "loaded";
  } catch (error) {
    nearbyClinics = [];
    clinicsStatus = "error";
    clinicsError = error.message || "Não foi possível consultar a localização.";
  }

  if (state.currentView === "clinics") {
    const description = document.querySelector(".profile-strip .muted");
    if (description && clinicLocationLabel) description.textContent = clinicLocationLabel;
    renderClinicsList();
  }
}

async function resolveTutorLocation() {
  if (navigator.geolocation && window.isSecureContext) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 10 * 60 * 1000
        });
      });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      state.owner.latitude = latitude;
      state.owner.longitude = longitude;
      state.owner.locationSource = "gps";
      saveState();
      return { latitude, longitude, source: "gps" };
    } catch {
      // O CEP cadastrado é usado quando o tutor não autoriza ou o GPS está indisponível.
    }
  }

  const latitude = Number(state.owner.latitude);
  const longitude = Number(state.owner.longitude);
  if (hasUsableCoordinates(latitude, longitude)) {
    return { latitude, longitude, source: state.owner.locationSource || "cep" };
  }

  const address = tutorAddressPayload();
  if (address.cep || address.address || address.neighborhood || address.city) {
    return { ...address, source: address.cep ? "cep" : "address" };
  }

  throw new Error("Permita a localização do celular ou cadastre um CEP/endereço válido nos dados do tutor.");
}

function loadingDots() {
  return `
    <span class="location-spinner" aria-hidden="true">
      ${Array.from({ length: 8 }, (_, index) => `<span style="--dot:${index};"></span>`).join("")}
    </span>
  `;
}

function clinicSearchParams(location) {
  const params = new URLSearchParams({ radius: "12000" });
  if (location.source) params.set("source", location.source);
  if (hasUsableCoordinates(location.latitude, location.longitude)) {
    params.set("lat", location.latitude);
    params.set("lon", location.longitude);
  }
  for (const [key, value] of Object.entries(tutorAddressPayload())) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

function tutorAddressPayload() {
  return {
    cep: onlyDigits(state.owner.zipCode || ""),
    address: state.owner.address || "",
    addressNumber: state.owner.addressNumber || "",
    addressComplement: state.owner.addressComplement || "",
    neighborhood: state.owner.neighborhood || "",
    city: state.owner.city || "",
    state: state.owner.state || ""
  };
}

function updateOwnerCoordinates(origin, fallbackSource = "") {
  if (!hasUsableCoordinates(origin?.latitude, origin?.longitude)) return;
  const source = origin.source || fallbackSource || state.owner.locationSource || "address";
  if (state.owner.latitude === origin.latitude && state.owner.longitude === origin.longitude && state.owner.locationSource === source) return;
  state.owner.latitude = origin.latitude;
  state.owner.longitude = origin.longitude;
  state.owner.locationSource = source;
  saveState();
}

function clinicLocationDescription(origin = {}, radiusMeters = 12000) {
  const radius = Number(radiusMeters || 0);
  const radiusNote = radius > 12000 ? ` Busca ampliada para até ${Math.round(radius / 1000)} km.` : "";
  if (origin.source === "gps") return `Usando a localização atual do celular.${radiusNote}`;
  if (origin.source === "cep") return `Usando o CEP ${state.owner.zipCode || "cadastrado"}.${radiusNote}`;
  if (origin.source === "coordinates") return `Usando a última localização salva.${radiusNote}`;
  return `Usando o endereço cadastrado.${radiusNote}`;
}

function hasUsableCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

function feedbackView() {
  const currentFeedback = state.feedback?.[state.feedback.length - 1] || null;
  return `
    <div class="page-head">
      <span class="eyebrow">Feedback</span>
      <h1>Avaliação do app e da carteira</h1>
      <p class="muted">Ajude a melhorar a experiência do app, a clareza das informações da carteira e a qualidade do atendimento veterinário.</p>
    </div>

    <section class="section screen-grid">
      <div class="grid">
        <div class="card feedback-card">
          <form class="form" data-form="feedback">
            <div class="feedback-grid">
              <div class="field">
                <label>Grau de satisfação com as informações do pet na carteira</label>
                <div class="star-picker" data-rating-group="veterinarySatisfaction">
                  ${[1, 2, 3, 4, 5].map((value) => `<button type="button" class="star-button ${Number(currentFeedback?.veterinarySatisfaction || 0) >= value ? "active" : ""}" data-rating-value="${value}" data-rating-field="veterinarySatisfaction" aria-label="${value} estrela${value > 1 ? "s" : ""}">★</button>`).join("")}
                </div>
                <input type="hidden" name="veterinarySatisfaction" value="${Number(currentFeedback?.veterinarySatisfaction || 0)}" />
              </div>

              <div class="field">
                <label>Avaliação geral do app</label>
                <div class="star-picker" data-rating-group="appRating">
                  ${[1, 2, 3, 4, 5].map((value) => `<button type="button" class="star-button ${Number(currentFeedback?.appRating || 0) >= value ? "active" : ""}" data-rating-value="${value}" data-rating-field="appRating" aria-label="${value} estrela${value > 1 ? "s" : ""}">★</button>`).join("")}
                </div>
                <input type="hidden" name="appRating" value="${Number(currentFeedback?.appRating || 0)}" />
              </div>
            </div>

            <div class="field">
              <label for="feedback-improvements">O que pode ficar melhor?</label>
              <textarea id="feedback-improvements" name="improvements" placeholder="Descreva o que pode melhorar na experiência do usuário, nas informações do pet ou na usabilidade do app.">${escapeHTML(currentFeedback?.improvements || "")}</textarea>
            </div>

            <div class="field">
              <label for="feedback-suggestions">Sugestões e melhorias</label>
              <textarea id="feedback-suggestions" name="suggestions" placeholder="Compartilhe ideias, sugestões de campos extras, consultas, documentos ou melhorias de layout.">${escapeHTML(currentFeedback?.suggestions || "")}</textarea>
            </div>

            <div class="button-row">
              <button class="primary-button" type="submit">Salvar avaliação</button>
            </div>
          </form>
        </div>
      </div>

      <aside class="grid">
        <div class="card">
          <h2>Último feedback</h2>
          <div class="detail-list" style="margin-top: 12px;">
            ${currentFeedback ? `
              <div class="detail-row"><span class="detail-label">Informações do pet</span><span class="detail-value">${escapeHTML(currentFeedback.veterinarySatisfaction ? `${currentFeedback.veterinarySatisfaction}/5` : "Sem avaliação")}</span></div>
              <div class="detail-row"><span class="detail-label">Avaliação do app</span><span class="detail-value">${escapeHTML(currentFeedback.appRating ? `${currentFeedback.appRating}/5` : "Sem avaliação")}</span></div>
              <div class="detail-row"><span class="detail-label">Enviado em</span><span class="detail-value">${escapeHTML(currentFeedback.submittedAt ? formatDateTime(currentFeedback.submittedAt) : "Ainda não enviado")}</span></div>
              <div class="detail-row"><span class="detail-label">Sugestões</span><span class="detail-value">${escapeHTML(currentFeedback.suggestions || "Sem sugestões")}</span></div>
            ` : `
              <div class="empty-state">
                <span class="empty-icon">★</span>
                <div>
                  <h2>Ainda não há avaliação</h2>
                  <p class="muted">Envie sua análise para melhorar as informações da carteira e a experiência do app.</p>
                </div>
              </div>
            `}
          </div>
        </div>
      </aside>
    </section>
  `;
}

function settingsView() {
  return `
    <div class="page-head">
      <span class="eyebrow">Configurações</span>
      <h1>Perfil e dados</h1>
      <p class="muted">Gerencie tutor, instalação da PWA, exportação e restauração dos dados locais.</p>
    </div>
    <section class="section screen-grid">
      <div class="grid">
        <div class="card">
          <div class="section-title">
            <div>
              <h2>Tutor</h2>
              <p class="muted small">Dados de contato aparecem na carteira de cada pet.</p>
            </div>
            <button class="secondary-button" type="button" data-action="edit-owner">Editar</button>
          </div>
          <div class="detail-list" style="margin-top: 12px;">
            ${detailRow("Nome", state.owner.name)}
            ${detailRow("Telefone", state.owner.phone)}
            ${detailRow("E-mail", state.owner.email)}
            ${detailRow("Endereço", ownerAddress())}
          </div>
        </div>
        <div class="card">
          <h2>Dados do aplicativo</h2>
          <p class="muted" style="margin-top: 8px;">O celular mantém uma cópia offline e sincroniza com o PostgreSQL quando o servidor está acessível.</p>
          <div class="button-row" style="margin-top: 14px;">
            <button class="secondary-button" type="button" data-action="toggle-theme">${themeIcon()} Tema ${state.theme === "dark" ? "claro" : "escuro"}</button>
            <button class="secondary-button" type="button" data-action="export">Exportar</button>
            <button class="secondary-button" type="button" data-action="import">Importar</button>
            <button class="secondary-button" type="button" data-action="sync-now">Sincronizar</button>
            <button class="secondary-button" type="button" data-action="logout">Sair</button>
            <button class="danger-button" type="button" data-action="reset-demo">Restaurar demo</button>
          </div>
        </div>
      </div>
      <aside class="grid">
        ${syncCard()}
        ${installBanner(true)}
        <div class="card">
          <h2>Compatibilidade</h2>
          <div class="detail-list">
            ${detailRow("Android", "Instalável pelo Chrome ou Edge")}
            ${detailRow("iPhone", "Adicionar à Tela de Início pelo Safari")}
            ${detailRow("Offline", "Arquivos ficam em cache e dados ficam no aparelho")}
            ${detailRow("Banco", "PostgreSQL via API /api/sync")}
          </div>
        </div>
      </aside>
    </section>
  `;
}

function syncCard() {
  const sync = { ...defaultState.sync, ...(state.sync || {}) };
  return `
    <div class="card">
      <div class="section-title">
        <div>
          <h2>Banco de dados</h2>
          <p class="muted small">${syncDescription(sync)}</p>
        </div>
        ${syncPill(sync)}
      </div>
      <div class="detail-list" style="margin-top: 12px;">
        ${detailRow("Servidor", sync.apiOnline ? "Conectado" : "Aguardando conexão")}
        ${detailRow("Última sincronização", sync.lastSyncedAt ? formatDateTime(sync.lastSyncedAt) : "Ainda não sincronizado")}
        ${sync.lastError ? detailRow("Aviso", sync.lastError) : ""}
      </div>
      <div class="button-row" style="margin-top: 14px;">
        <button class="primary-button" type="button" data-action="sync-now">Sincronizar agora</button>
      </div>
    </div>
  `;
}

function syncPill(sync) {
  const className = sync.status === "synced" ? "ok" : sync.status === "error" ? "danger" : "warn";
  return `<span class="pill ${className}">${syncLabel(sync.status)}</span>`;
}

function syncLabel(status) {
  if (status === "synced") return "Sincronizado";
  if (status === "syncing") return "Sincronizando";
  if (status === "error") return "Offline";
  return "Local";
}

function syncDescription(sync) {
  if (!state.auth?.apiToken) return "Conta local. Faça login com o servidor ativo para gravar no banco.";
  if (sync.status === "synced") return "Dados salvos no celular e no PostgreSQL.";
  if (sync.status === "syncing") return "Enviando alterações para a API.";
  if (sync.status === "error") return "O app segue funcionando offline no celular.";
  return "Pronto para sincronizar com a API.";
}

function statusCard(icon, label, value) {
  return `
    <div class="status-card">
      <span class="status-icon">${icon}</span>
      <span>
        <strong>${label}</strong>
        <span class="muted small" style="display:block;">Atualizado hoje</span>
      </span>
      <span class="status-value">${value}</span>
    </div>
  `;
}

function quickAction(view, icon, title, subtitle) {
  return `
    <button class="quick-action" type="button" data-action="view" data-view="${view}">
      <span class="nav-icon">${icon}</span>
      <span>
        <strong>${title}</strong>
        <span class="muted small" style="display:block;">${subtitle}</span>
      </span>
    </button>
  `;
}

function petCard(pet, compact = false) {
  const vaccines = getVaccines(pet.id);
  const alertCount = vaccines.filter((vaccine) => ["late", "soon"].includes(vaccineFilterKey(vaccine))).length;
  return `
    <article class="pet-card">
      <div class="pet-top">
        ${petAvatar(pet)}
        <div>
          <h3>${escapeHTML(pet.name)}</h3>
          <div class="pet-meta">
            <span class="pill">${escapeHTML(pet.species)}</span>
            <span class="pill">${petAge(pet.birthDate)}</span>
            ${alertCount ? `<span class="pill warn">${alertCount} alerta${alertCount === 1 ? "" : "s"}</span>` : `<span class="pill ok">Em dia</span>`}
          </div>
        </div>
        <button class="icon-button" type="button" data-action="pet-wallet" data-id="${pet.id}" aria-label="Abrir carteira de ${escapeHTML(pet.name)}">›</button>
      </div>
      ${compact ? "" : `<p class="muted small">${escapeHTML(pet.notes || "Sem observações.")}</p>`}
      <div class="button-row">
        <button class="secondary-button" type="button" data-action="pet-wallet" data-id="${pet.id}">Carteira</button>
        <button class="ghost-button" type="button" data-action="edit-pet" data-id="${pet.id}">Editar</button>
      </div>
    </article>
  `;
}

function petAvatar(pet) {
  if (pet.photo) {
    return `<span class="pet-avatar has-photo"><img src="${escapeHTML(safeImageSrc(pet.photo))}" alt="${escapeHTML(pet.name)}" /></span>`;
  }
  return `<span class="pet-avatar" style="background:${escapeHTML(pet.avatarColor || "#17716b")}">${initials(pet.name)}</span>`;
}

function vaccineItem(vaccine) {
  const pet = state.pets.find((item) => item.id === vaccine.petId);
  const status = vaccineStatus(vaccine);
  return `
    <article class="timeline-item">
      <div class="timeline-top">
        <div>
          <h3>${escapeHTML(vaccine.name)}</h3>
          <p class="muted small">${escapeHTML(pet?.name || "Pet removido")} · ${escapeHTML(vaccine.dose || "Dose")}</p>
        </div>
        <span class="pill ${status.type}">${status.label}</span>
      </div>
      <div class="detail-list">
        ${detailRow("Aplicação", formatDate(vaccine.applicationDate))}
        ${detailRow("Próxima dose", formatDate(vaccine.dueDate))}
        ${detailRow("Clínica", vaccine.clinic)}
        ${detailRow("Veterinário", vaccine.veterinarian)}
        ${detailRow("Lote", vaccine.batch)}
      </div>
      <div class="button-row" style="margin-top: 12px;">
        <button class="secondary-button" type="button" data-action="view-vaccines">Ver todas</button>
        <button class="ghost-button" type="button" data-action="edit-vaccine" data-id="${vaccine.id}">Editar</button>
        <button class="danger-button" type="button" data-action="delete-vaccine" data-id="${vaccine.id}">Excluir</button>
      </div>
    </article>
  `;
}

function documentItem(doc) {
  const attachment = documentAttachment(doc);
  return `
    <article class="document-card ${attachment ? "has-attachment" : ""}">
      ${attachment ? documentAttachmentPreview(attachment, "card") : ""}
      <div class="document-card-content">
        <div class="document-top">
          <div>
            <h3>${escapeHTML(doc.title)}</h3>
            <p class="muted small">${escapeHTML(doc.kind)} · ${formatDate(doc.date)}</p>
          </div>
          <span class="pill">${doc.expiresAt ? formatDate(doc.expiresAt) : "Sem validade"}</span>
        </div>
        <p class="muted small">${escapeHTML(doc.notes || "Sem observações.")}</p>
        ${attachment ? `<p class="muted small">${escapeHTML(attachment.name)} · ${formatFileSize(attachment.size)}</p>` : ""}
        <div class="button-row" style="margin-top: 12px;">
          <button class="ghost-button" type="button" data-action="edit-document" data-id="${doc.id}">Editar</button>
          <button class="danger-button" type="button" data-action="delete-document" data-id="${doc.id}">Excluir</button>
        </div>
      </div>
    </article>
  `;
}

function documentAttachment(doc) {
  const attachment = doc?.attachment && typeof doc.attachment === "object" ? doc.attachment : null;
  if (!attachment?.dataUrl) return null;
  return normalizeDocumentAttachment(attachment);
}

function normalizeDocumentAttachment(attachment) {
  const source = attachment && typeof attachment === "object" ? attachment : {};
  const dataUrl = safeDocumentDataUrl(source.dataUrl);
  if (!dataUrl) return null;

  return {
    name: String(source.name || "documento").trim() || "documento",
    type: String(source.type || "").trim(),
    originalType: String(source.originalType || "").trim(),
    size: Number(source.size || 0),
    dataUrl,
    uploadedAt: source.uploadedAt || ""
  };
}

function documentAttachmentFromForm(data) {
  try {
    const attachment = JSON.parse(String(data.attachment || ""));
    return normalizeDocumentAttachment(attachment);
  } catch {
    return null;
  }
}

function documentUploadPreview(attachment) {
  const normalized = normalizeDocumentAttachment(attachment);
  if (!normalized) {
    return `
      <div class="document-upload-preview empty" data-document-attachment-preview>
        <span>PDF</span>
        <strong>Nenhum arquivo anexado</strong>
      </div>
    `;
  }

  return documentAttachmentPreview(normalized, "upload");
}

function documentAttachmentPreview(attachment, mode = "card") {
  const isImage = isImageAttachment(attachment);
  return `
    <div class="document-attachment-preview ${isImage ? "image" : "file"} ${mode}" data-document-attachment-preview>
      ${isImage ? `<img src="${escapeHTML(attachment.dataUrl)}" alt="Documento anexado" />` : `<span>${documentFileKind(attachment)}</span>`}
      <strong>${escapeHTML(attachment.name)}</strong>
    </div>
  `;
}

function documentFileKind(attachment) {
  if (isImageAttachment(attachment)) return "IMG";
  if ((attachment.type || "").includes("pdf") || /\.pdf$/i.test(attachment.name || "")) return "PDF";
  return "ARQ";
}

function isImageAttachment(attachment) {
  return Boolean(attachment?.dataUrl?.startsWith("data:image/"));
}

function clinicCard(clinic) {
  const query = encodeURIComponent(`${clinic.latitude},${clinic.longitude}`);
  const distance = Number(clinic.distance || 0);
  const statusLabel = clinic.emergency ? "Emergência" : clinic.openingHours || "Horário não informado";
  const website = safeExternalUrl(clinic.website);
  return `
    <article class="clinic-card">
      <div class="clinic-top">
        <div>
          <h3>${escapeHTML(clinic.name)}</h3>
          <p class="muted small">${escapeHTML(clinic.address || "Endereço não informado")}</p>
        </div>
        <span class="pill ${clinic.emergency ? "danger" : "ok"}">${escapeHTML(statusLabel)}</span>
      </div>
      <div class="inline-meta">
        <span class="pill">${distance.toFixed(1).replace(".", ",")} km</span>
        ${(clinic.services || []).map((service) => `<span class="pill">${escapeHTML(service)}</span>`).join("")}
      </div>
      <div class="button-row">
        ${clinic.phone ? `<a class="secondary-button" href="tel:${onlyDigits(clinic.phone)}">Ligar</a>` : ""}
        ${website ? `<a class="secondary-button" href="${escapeHTML(website)}" target="_blank" rel="noopener noreferrer">Site</a>` : ""}
        <button class="primary-button" type="button" data-action="maps" data-query="${query}">Ver rota</button>
      </div>
    </article>
  `;
}

function emptyState(icon, title, text, actionLabel = "", action = "") {
  return `
    <div class="empty-state">
      <span class="empty-icon">${icon}</span>
      <div>
        <h2>${title}</h2>
        <p class="muted">${text}</p>
      </div>
      ${actionLabel ? `<button class="primary-button" type="button" data-action="${action}">${actionLabel}</button>` : ""}
    </div>
  `;
}

function detailRow(label, value) {
  return `
    <div class="detail-row">
      <span class="detail-label">${label}</span>
      <span class="detail-value">${escapeHTML(value || "Não informado")}</span>
    </div>
  `;
}

function installBanner(force = false) {
  const canInstall = Boolean(deferredInstallPrompt) && !state.installDismissed;
  const showIos = isIos() && !isStandalone() && !state.installDismissed;
  if (!force && !canInstall && !showIos) return "";
  const installLabel = canInstall ? "Instalar" : "Como instalar";
  const installAction = canInstall ? "install" : "install-help";

  return `
    <div class="install-banner ${canInstall || showIos || force ? "available" : ""}">
      <div>
        <strong>Instalar no celular</strong>
        <p class="small" style="margin-top: 2px;">${installHint()}</p>
      </div>
      <div class="button-row">
        <button class="primary-button" type="button" data-action="${installAction}">${installLabel}</button>
        <button class="ghost-button" type="button" data-action="dismiss-install" aria-label="Ocultar instalação">×</button>
      </div>
    </div>
  `;
}

function installHint() {
  if (isStandalone()) return "O app já está aberto em modo instalado.";
  if (window.isSecureContext) return "Pronto para instalação quando o navegador liberar o botão.";
  return "Para instalar como app, use HTTPS ou localhost.";
}

function openInstallHelp() {
  const localUrl = "http://127.0.0.1:5241/";
  const wifiUrl = "http://IP-DO-COMPUTADOR:5241/";
  openModal(`
    <div class="modal-head">
      <h2>Instalar como aplicativo</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <div class="grid">
        <div class="card">
          <h3>Android</h3>
          <p class="muted small" style="margin-top: 6px;">No Chrome, abra o app em HTTPS para instalar como PWA completa. No computador, o modo local continua em ${localUrl}</p>
        </div>
        <div class="card">
          <h3>iPhone</h3>
          <p class="muted small" style="margin-top: 6px;">No Safari, abra o app e use Compartilhar, depois Adicionar à Tela de Início. Para recursos completos de PWA, o iPhone normalmente exige HTTPS.</p>
        </div>
        <div class="card">
          <h3>Teste por Wi-Fi</h3>
          <p class="muted small" style="margin-top: 6px;">Com computador e celular na mesma rede, rode o servidor e abra o endereço mostrado no terminal, como ${wifiUrl}. Esse modo sincroniza, mas HTTP local pode virar apenas atalho.</p>
        </div>
        <div class="card">
          <h3>Fora da rede</h3>
          <p class="muted small" style="margin-top: 6px;">Para usar de qualquer lugar, rode npm.cmd run internet no computador de casa e abra o link HTTPS mostrado no terminal.</p>
        </div>
      </div>
    </div>
  `);
}

function openPetModal(id = "") {
  const pet = state.pets.find((item) => item.id === id) || {
    id: "",
    name: "",
    species: "Cachorro",
    breed: "",
    sex: "Fêmea",
    birthDate: "",
    weight: "",
    color: "",
    microchip: "",
    registry: `PET-${new Date().getFullYear()}-${String(state.pets.length + 1).padStart(3, "0")}`,
    temperament: "",
    allergies: "",
    notes: "",
    avatarColor: "#17716b",
    photo: "",
    signature: ""
  };

  openModal(`
    <div class="modal-head">
      <h2>${id ? "Editar pet" : "Novo pet"}</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-form="pet">
        <input type="hidden" name="id" value="${escapeHTML(pet.id)}" />
        <input type="hidden" name="photo" value="${escapeHTML(pet.photo || "")}" data-pet-photo-value />
        <input type="hidden" name="signature" value="${escapeHTML(pet.signature || "")}" />
        <div class="pet-photo-editor">
          <div class="pet-photo-preview" data-pet-photo-preview>${walletPhoto(pet)}</div>
          <label class="secondary-button" for="petPhotoInput">Escolher foto</label>
          <input id="petPhotoInput" class="hidden" type="file" accept="image/*" data-pet-photo />
        </div>
        <div class="form-grid two">
          ${field("Nome", "name", pet.name, "text", true)}
          ${selectField("Espécie", "species", pet.species, ["Cachorro", "Gato", "Ave", "Coelho", "Outros"])}
          ${field("Raça", "breed", pet.breed)}
          ${selectField("Sexo", "sex", pet.sex, ["Fêmea", "Macho", "Não informado"])}
          ${field("Nascimento", "birthDate", pet.birthDate, "date")}
          ${field("Peso (kg)", "weight", pet.weight, "number")}
          ${field("Cor", "color", pet.color)}
          ${field("Microchip", "microchip", pet.microchip)}
          ${field("Registro", "registry", pet.registry)}
          ${field("Cor do cartão", "avatarColor", pet.avatarColor, "color")}
        </div>
        ${field("Temperamento", "temperament", pet.temperament)}
        ${field("Alergias", "allergies", pet.allergies)}
        ${textareaField("Observações", "notes", pet.notes)}
        <div class="button-row">
          <button class="primary-button" type="submit">Salvar pet</button>
          ${id ? `<button class="danger-button" type="button" data-action="delete-pet" data-id="${id}">Excluir</button>` : ""}
        </div>
      </form>
    </div>
  `);
}

function openOwnerModal() {
  openModal(`
    <div class="modal-head">
      <div>
        <h2>Dados do tutor</h2>
        <p class="muted small">Informe o CEP; rua, bairro, cidade e estado serão preenchidos automaticamente.</p>
      </div>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-form="owner">
        <div class="form-grid two">
          ${field("Nome completo", "name", state.owner.name, "text", true)}
          ${field("CPF", "cpf", state.owner.cpf)}
          ${field("Telefone", "phone", state.owner.phone, "tel", true)}
          ${field("E-mail", "email", state.owner.email, "email")}
        </div>

        <div class="form-section-head">
          <h3>Endereço</h3>
          <span>Preenchimento automático por CEP</span>
        </div>
        <div class="cep-lookup-row">
          <div class="field">
            <label for="zipCode">CEP</label>
            <input id="zipCode" name="zipCode" inputmode="numeric" autocomplete="postal-code" value="${escapeHTML(state.owner.zipCode)}" data-cep-input required />
          </div>
          <button class="secondary-button" type="button" data-action="lookup-cep">Buscar CEP</button>
        </div>
        <p class="cep-status muted small" data-cep-status>Digite os 8 números do CEP.</p>

        <div class="form-grid two">
          ${readonlyField("Rua", "address", state.owner.address)}
          ${field("Número", "addressNumber", state.owner.addressNumber, "text", true)}
          ${field("Complemento", "addressComplement", state.owner.addressComplement)}
          ${readonlyField("Bairro", "neighborhood", state.owner.neighborhood)}
          ${readonlyField("Cidade", "city", state.owner.city)}
          ${readonlyField("Estado", "state", state.owner.state)}
          <input type="hidden" name="latitude" value="${escapeHTML(state.owner.latitude)}" />
          <input type="hidden" name="longitude" value="${escapeHTML(state.owner.longitude)}" />
          <input type="hidden" name="locationSource" value="${escapeHTML(state.owner.locationSource)}" />
        </div>

        <div class="form-section-head">
          <h3>Emergência</h3>
          <span>Contato exibido na identificação do pet</span>
        </div>
        <div class="form-grid two">
          ${field("Contato de emergência", "emergencyName", state.owner.emergencyName)}
          ${field("Telefone de emergência", "emergencyPhone", state.owner.emergencyPhone, "tel")}
        </div>
        <button class="primary-button" type="submit">Salvar tutor</button>
      </form>
    </div>
  `);
}

async function lookupCep(form) {
  if (!form) return;
  const input = form.querySelector("[name='zipCode']");
  const status = form.querySelector("[data-cep-status]");
  const button = form.querySelector("[data-action='lookup-cep']");
  const cep = onlyDigits(input?.value || "");

  if (cep.length !== 8) {
    if (status) status.textContent = "Informe um CEP com 8 números.";
    return;
  }

  if (button) button.disabled = true;
  if (status) status.textContent = "Buscando endereço...";

  try {
    const address = await apiRequest(`/api/address/cep?cep=${cep}`);
    setFormValue(form, "zipCode", address.zipCode || cep.replace(/^(\d{5})(\d{3})$/, "$1-$2"));
    setFormValue(form, "address", address.address);
    setFormValue(form, "neighborhood", address.neighborhood);
    setFormValue(form, "city", address.city);
    setFormValue(form, "state", address.state);
    setFormValue(form, "latitude", address.latitude ?? "");
    setFormValue(form, "longitude", address.longitude ?? "");
    setFormValue(form, "locationSource", "cep");
    if (status) status.textContent = "Endereço encontrado. Agora informe somente número e complemento.";
    form.querySelector("[name='addressNumber']")?.focus();
  } catch (error) {
    if (status) status.textContent = error.message || "Não foi possível consultar o CEP.";
  } finally {
    if (button) button.disabled = false;
  }
}

function setFormValue(form, name, value) {
  const input = form.querySelector(`[name='${name}']`);
  if (input) input.value = value ?? "";
}

function openVaccineModal(petId = "", vaccineId = "") {
  const vaccine = vaccineId ? state.vaccines.find((item) => item.id === vaccineId) : null;
  const selected = vaccine?.petId || petId || state.selectedPetId || state.pets[0]?.id || "";
  openModal(`
    <div class="modal-head">
      <h2>${vaccine ? "Editar vacina" : "Nova vacina"}</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-form="vaccine">
        ${vaccine ? `<input type="hidden" name="id" value="${escapeHTML(vaccine.id)}" />` : ""}
        <div class="form-grid two">
          ${petSelectField("Pet", "petId", selected)}
          ${field("Vacina", "name", vaccine?.name || "", "text", true)}
          ${field("Dose", "dose", vaccine?.dose || "")}
          ${field("Data da aplicação", "applicationDate", vaccine?.applicationDate || todayISO, "date")}
          ${field("Próxima dose", "dueDate", vaccine?.dueDate || "", "date", true)}
          ${field("Clínica", "clinic", vaccine?.clinic || "")}
          ${field("Veterinário", "veterinarian", vaccine?.veterinarian || "")}
          ${field("Lote", "batch", vaccine?.batch || "")}
        </div>
        ${textareaField("Observações", "notes", vaccine?.notes || "")}
        <div class="button-row">
          <button class="primary-button" type="submit">${vaccine ? "Salvar alterações" : "Salvar vacina"}</button>
          ${vaccine ? `<button class="danger-button" type="button" data-action="delete-vaccine" data-id="${vaccine.id}">Excluir</button>` : ""}
        </div>
      </form>
    </div>
  `);
}

function openDocumentModal(petId = "", documentId = "") {
  const doc = documentId ? state.documents.find((item) => item.id === documentId) : null;
  const selected = doc?.petId || petId || state.selectedPetId || state.pets[0]?.id || "";
  const fileInputId = createId("document-file");
  openModal(`
    <div class="modal-head">
      <h2>${doc ? "Editar documento" : "Novo documento"}</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-form="document">
        ${doc ? `<input type="hidden" name="id" value="${escapeHTML(doc.id)}" />` : ""}
        <div class="form-grid two">
          ${petSelectField("Pet", "petId", selected)}
          ${field("Título", "title", doc?.title || "", "text", true)}
          ${selectField("Tipo", "kind", doc?.kind || "Viagem", ["Viagem", "Exame", "Receita", "Atestado", "Outro"])}
          ${field("Data", "date", doc?.date || todayISO, "date")}
          ${field("Validade", "expiresAt", doc?.expiresAt || "", "date")}
        </div>
        <input type="hidden" name="attachment" value='${escapeHTML(JSON.stringify(doc?.attachment || {}))}' data-document-attachment-value />
        <div class="document-upload">
          <div class="document-upload-preview ${doc?.attachment ? "" : "empty"}" data-document-attachment-preview>
            ${doc?.attachment ? documentAttachmentPreview(doc.attachment, "upload") : `<span>PDF</span><strong>Nenhum arquivo anexado</strong>`}
          </div>
          <div class="document-upload-actions">
            <label class="secondary-button" for="${fileInputId}">Anexar documento</label>
            <input id="${fileInputId}" class="hidden" type="file" accept="image/*,.pdf,application/pdf" data-document-file />
            <p class="muted small">Use foto/scan do documento ou PDF de atestado, exame, receita e viagem.</p>
          </div>
        </div>
        ${textareaField("Observações", "notes", doc?.notes || "")}
        <div class="button-row">
          <button class="primary-button" type="submit">${doc ? "Salvar alterações" : "Salvar documento"}</button>
          ${doc ? `<button class="danger-button" type="button" data-action="delete-document" data-id="${doc.id}">Excluir</button>` : ""}
        </div>
      </form>
    </div>
  `);
}

function openTravelModal() {
  const selectedPetId = state.selectedPetId || state.travel?.selectedPetId || state.pets[0]?.id || "";
  const activeTravel = getTravelForPet(selectedPetId);
  openModal(`
    <div class="modal-head">
      <h2>Plano de viagem</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-form="travel">
        <div class="form-grid two">
          ${petSelectField("Pet", "selectedPetId", selectedPetId)}
          ${field("Destino", "destination", activeTravel.destination, "text", true)}
          ${field("Data", "date", activeTravel.date, "date")}
          ${selectField("Transporte", "transport", activeTravel.transport, ["Carro", "Ônibus", "Avião", "Hospedagem", "Outro"])}
        </div>
        ${textareaField("Anotações", "notes", activeTravel.notes)}
        <button class="primary-button" type="submit">Salvar viagem</button>
      </form>
    </div>
  `);
}

function openDrawer() {
  const drawer = document.createElement("div");
  drawer.className = "drawer-backdrop";
  drawer.dataset.modal = "drawer";
  const drawerViews = [...views, { id: "feedback", label: "Feedback", icon: "★" }, { id: "settings", label: "Configurações", icon: "⚙" }];
  drawer.innerHTML = `
    <aside class="drawer">
      <div class="drawer-head">
        <div class="brand">
          <span class="brand-mark"><img src="${logoSrc()}" alt="" /></span>
          <span>
            <span class="brand-title">${APP_NAME}</span>
            <span class="brand-subtitle">Carteira digital</span>
          </span>
        </div>
        <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
      </div>
      <div class="drawer-profile">
        <div class="owner-avatar">${initials(state.owner.name)}</div>
        <div>
          <strong>${escapeHTML(state.owner.name)}</strong>
          <p class="muted small">${escapeHTML(state.owner.phone)}</p>
        </div>
      </div>
      <nav class="drawer-nav" aria-label="Menu lateral">
        <button type="button" data-action="toggle-theme">
          <span>${themeIcon()}</span> ${state.theme === "dark" ? "Tema claro" : "Tema escuro"}
        </button>
        <button type="button" data-action="logout">
          <span>↩</span> Sair da conta
        </button>
        ${drawerViews.map((view) => `
          <button class="${state.currentView === view.id ? "active" : ""}" type="button" data-action="view" data-view="${view.id}">
            <span>${view.icon}</span> ${view.label}
          </button>
        `).join("")}
      </nav>
    </aside>
  `;
  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) closeModal();
  });
  document.body.append(drawer);
}

function openModal(content, options = {}) {
  closeModal();
  const wrapper = document.createElement("div");
  wrapper.className = ["modal-backdrop", options.backdropClass || ""].filter(Boolean).join(" ");
  wrapper.dataset.modal = "dialog";
  const modalClass = ["modal", options.className || ""].filter(Boolean).join(" ");
  wrapper.innerHTML = `<section class="${modalClass}" role="dialog" aria-modal="true">${content}</section>`;
  wrapper.addEventListener("click", (event) => {
    if (event.target === wrapper) closeModal();
  });
  document.body.append(wrapper);
  const firstInput = wrapper.querySelector("input:not([type='hidden']), select, textarea, button");
  firstInput?.focus();
}

function closeModal() {
  if (signaturePadCleanup) {
    signaturePadCleanup();
    signaturePadCleanup = null;
  }
  document.querySelectorAll("[data-modal]").forEach((modal) => modal.remove());
}

async function handlePetPhotoInput(input) {
  const file = input.files?.[0];
  if (!file) return;

  try {
    const dataUrl = await imageFileToDataUrl(file, 900);
    const form = input.closest("form");
    const hidden = form?.querySelector("[data-pet-photo-value]");
    const preview = form?.querySelector("[data-pet-photo-preview]");
    if (hidden) hidden.value = dataUrl;
    if (preview) preview.innerHTML = `<img src="${escapeHTML(dataUrl)}" alt="Foto do pet" />`;
    notify("Foto pronta para salvar.");
  } catch (error) {
    console.error(error);
    notify("Não foi possível carregar a foto.");
  }
}

async function handleDocumentFileInput(input) {
  const file = input.files?.[0];
  if (!file) return;

  try {
    const attachment = await documentFileToAttachment(file);
    const form = input.closest("form");
    const hidden = form?.querySelector("[data-document-attachment-value]");
    const preview = form?.querySelector("[data-document-attachment-preview]");
    if (hidden) hidden.value = JSON.stringify(attachment);
    if (preview) preview.outerHTML = documentUploadPreview(attachment);
    notify("Documento anexado. Agora salve o registro.");
  } catch (error) {
    console.error(error);
    notify(error.message || "Não foi possível anexar o documento.");
    input.value = "";
  }
}

function openSignatureModal(id = "") {
  const pet = state.pets.find((item) => item.id === id) || getSelectedPet();
  if (!pet) return;

  openModal(`
    <div class="modal-head">
      <h2>Assinatura digital</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <div class="signature-pad-wrap">
        <canvas class="signature-pad" width="1200" height="420" data-signature-pad data-pet-id="${escapeHTML(pet.id)}"></canvas>
        <div class="button-row signature-pad-actions">
          <button class="secondary-button" type="button" data-action="clear-signature">Limpar</button>
          <button class="primary-button" type="button" data-action="save-signature" data-id="${pet.id}">Salvar assinatura</button>
        </div>
      </div>
    </div>
  `, { className: "signature-modal", backdropClass: "signature-backdrop" });

  const canvas = document.querySelector("[data-signature-pad]");
  setupSignaturePad(canvas, pet.signature);
}

function setupSignaturePad(canvas, initialData = "") {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  let drawing = false;
  let lastPoint = null;
  canvas.signatureData = initialData || "";

  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    const previousData = canvas.signatureData || canvas.toDataURL("image/png");
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(Math.round(rect.width * ratio), 600);
    canvas.height = Math.max(Math.round(rect.height * ratio), 210);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    clearCanvas(context, canvas);
    if (previousData) drawSignatureImage(context, previousData, canvas);
  };

  const point = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const draw = (event) => {
    if (!drawing) return;
    event.preventDefault();
    const current = point(event);
    context.strokeStyle = "#123836";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(current.x, current.y);
    context.stroke();
    lastPoint = current;
    canvas.signatureData = "";
  };

  resize();
  window.addEventListener("resize", resize);
  signaturePadCleanup = () => window.removeEventListener("resize", resize);

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    drawing = true;
    lastPoint = point(event);
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", draw);
  canvas.addEventListener("pointerup", () => {
    drawing = false;
    lastPoint = null;
    canvas.signatureData = canvas.toDataURL("image/png");
  });
  canvas.addEventListener("pointerleave", () => {
    drawing = false;
    lastPoint = null;
    canvas.signatureData = canvas.toDataURL("image/png");
  });
}

function clearCanvas(context, canvas) {
  const rect = canvas.getBoundingClientRect();
  context.clearRect(0, 0, rect.width, rect.height);
  context.fillStyle = "#f5fff9";
  context.fillRect(0, 0, rect.width, rect.height);
  context.strokeStyle = "rgba(18, 56, 54, 0.26)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(34, rect.height - 46);
  context.lineTo(rect.width - 34, rect.height - 46);
  context.stroke();
}

function drawSignatureImage(context, dataUrl, canvas) {
  const image = new Image();
  image.onload = () => {
    const rect = canvas.getBoundingClientRect();
    context.drawImage(image, 24, 20, rect.width - 48, rect.height - 58);
  };
  image.src = safeImageSrc(dataUrl);
}

function clearSignaturePad() {
  const canvas = document.querySelector("[data-signature-pad]");
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;
  clearCanvas(context, canvas);
  canvas.signatureData = "";
}

function saveSignature(id = "") {
  const canvas = document.querySelector("[data-signature-pad]");
  if (!canvas) return;
  const pet = state.pets.find((item) => item.id === id);
  if (!pet) return;
  pet.signature = canvas.toDataURL("image/png");
  saveState();
  closeModal();
  notify("Assinatura digital salva.");
  render();
}

async function downloadWalletPdf(id = "") {
  const pet = state.pets.find((item) => item.id === id) || getSelectedPet();
  if (!pet) return;

  try {
    const front = await renderWalletCanvas(pet, "front");
    const back = await renderWalletCanvas(pet, "back");
    const petDocs = state.documents.filter((doc) => doc.petId === pet.id);
    const canvases = [front, back];
    const documentPages = chunkItems(petDocs, 4);
    for (let index = 0; index < documentPages.length; index += 1) {
      canvases.push(await renderWalletDocumentsCanvas(pet, petDocs, documentPages[index], index + 1, documentPages.length));
    }
    const pdf = createPdfFromCanvases(canvases);
    downloadBlob(pdf, `carteira-${slugify(pet.name || "pet")}.pdf`);
    notify("PDF da carteira baixado.");
  } catch (error) {
    console.error(error);
    notify("Não foi possível gerar o PDF.");
  }
}

async function login(data) {
  const email = normalizeEmail(data.email);
  const password = String(data.password || "");

  try {
    const payload = await apiRequest("/api/login", {
      method: "POST",
      body: { email, password }
    });
    applyServerSession(payload, { password });
    saveState({ sync: false });
    notify("Login realizado com banco conectado.");
    render();
    return;
  } catch (error) {
    if (error.status && error.status !== 404 && error.status !== 401) {
      notify(error.message || "Não foi possível acessar o banco.");
      return;
    }
  }

  const user = (state.users || []).find((item) => normalizeEmail(item.email) === email);

  if (!user || user.password !== password) {
    notify("E-mail ou senha inválidos.");
    return;
  }

  state.auth = {
    ...state.auth,
    currentUserEmail: user.email,
    authView: "login",
    trustedDevice: true
  };

  if (!state.owner.email) {
    state.owner = { ...state.owner, name: user.name, email: user.email, phone: user.phone || "" };
  }

  state.currentView = "home";
  saveState();
  notify(state.auth.apiToken ? "Login realizado. Sincronizando banco..." : "Login local realizado.");
  render();
}

async function register(data) {
  const email = normalizeEmail(data.email);
  const password = String(data.password || "");
  const confirmPassword = String(data.confirmPassword || "");

  if (!email || !data.name || !data.phone || !password) {
    notify("Preencha todos os campos.");
    return;
  }

  if (password.length < 4) {
    notify("Use uma senha com pelo menos 4 caracteres.");
    return;
  }

  if (password !== confirmPassword) {
    notify("As senhas não conferem.");
    return;
  }

  if ((state.users || []).some((user) => normalizeEmail(user.email) === email)) {
    notify("Este e-mail já está cadastrado.");
    setAuthView("login");
    return;
  }

  try {
    const payload = await apiRequest("/api/register", {
      method: "POST",
      body: {
        name: String(data.name || "").trim(),
        email,
        phone: String(data.phone || "").trim(),
        password
      }
    });
    applyServerSession(payload, { password });
    saveState({ sync: false });
    await syncWithServer("register", { silent: true });
    notify("Conta criada com banco conectado. Pode cadastrar seu primeiro pet.");
    render();
    return;
  } catch (error) {
    if (error.status === 409) {
      notify("Este e-mail já está cadastrado no banco.");
      setAuthView("login");
      return;
    }

    if (error.status && error.status !== 404) {
      notify(error.message || "Não foi possível criar a conta no banco.");
      return;
    }
  }

  const user = {
    id: createId("user"),
    name: String(data.name).trim(),
    email,
    phone: String(data.phone || "").trim(),
    password,
    createdAt: new Date().toISOString()
  };

  const previousTheme = state.theme;
  const previousInstallDismissed = state.installDismissed;
  const previousUsers = Array.isArray(state.users) ? state.users : [];

  state = {
    ...structuredClone(defaultState),
    theme: previousTheme,
    installDismissed: previousInstallDismissed,
    users: [...previousUsers, user],
    auth: {
      currentUserEmail: user.email,
      authView: "login",
      trustedDevice: true
    },
    currentView: "home",
    selectedPetId: "",
    owner: blankOwner(user),
    pets: [],
    vaccines: [],
    documents: [],
    travel: blankTravel()
  };

  saveState();
  notify("Conta criada neste celular. Inicie o servidor para sincronizar com o banco.");
  render();
}

function logout() {
  state.auth = { ...state.auth, currentUserEmail: "", authView: "login", apiToken: "" };
  saveState();
  closeModal();
  notify("Sessão encerrada.");
  render();
}

function blankOwner(user = {}) {
  return {
    name: user.name || "",
    cpf: "",
    phone: user.phone || "",
    email: user.email || "",
    address: "",
    addressNumber: "",
    addressComplement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    latitude: "",
    longitude: "",
    locationSource: "",
    emergencyName: "",
    emergencyPhone: ""
  };
}

function blankTravel() {
  return {
    destination: "",
    date: "",
    transport: "Carro",
    selectedPetId: "",
    notes: "",
    items: {
      vaccine: false,
      certificate: false,
      carrier: false,
      food: false,
      collar: false,
      destinationRules: false,
      medicine: false
    }
  };
}

function normalizeTravelEntry(entry = {}) {
  const base = blankTravel();
  const items = { ...base.items, ...((entry.items && typeof entry.items === "object") ? entry.items : {}) };
  return {
    ...base,
    ...entry,
    items,
    selectedPetId: entry.selectedPetId || "",
    transport: entry.transport || base.transport
  };
}

function normalizeTravelByPet(entries = {}) {
  const normalized = {};
  for (const [petId, petTravel] of Object.entries(entries || {})) {
    if (!petId) continue;
    normalized[petId] = normalizeTravelEntry(petTravel || {});
    normalized[petId].selectedPetId = petId;
  }
  return normalized;
}

function getTravelForPet(petId = "") {
  const id = petId || state.selectedPetId || state.travel?.selectedPetId || state.pets[0]?.id || "";
  const saved = state.travelByPet && state.travelByPet[id];
  if (saved) return normalizeTravelEntry(saved);
  return normalizeTravelEntry({ selectedPetId: id });
}

function setTravelForPet(petId = "", nextTravel = {}) {
  const id = petId || state.selectedPetId || state.travel?.selectedPetId || state.pets[0]?.id || "";
  if (!id) return blankTravel();
  const current = getTravelForPet(id);
  const normalized = normalizeTravelEntry({
    ...current,
    ...nextTravel,
    selectedPetId: id,
    items: {
      ...blankTravel().items,
      ...current.items,
      ...((nextTravel.items && typeof nextTravel.items === "object") ? nextTravel.items : {})
    }
  });
  state.travelByPet[id] = normalized;
  state.travel = normalized;
  state.travel.selectedPetId = id;
  return normalized;
}

function travelProgressForPet(petId = "") {
  const id = petId || state.selectedPetId || state.travel?.selectedPetId || "";
  const items = Object.values(getTravelForPet(id).items || {});
  if (!items.length) return 0;
  return Math.round((items.filter(Boolean).length / items.length) * 100);
}

async function handleForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const type = form.dataset.form;

  if (type === "login") {
    await login(data);
    return;
  }

  if (type === "register") {
    await register(data);
    return;
  }

  if (type === "pet") {
    const existingPet = state.pets.find((item) => item.id === data.id);
    const pet = {
      ...data,
      id: data.id || createId("pet"),
      weight: data.weight || "",
      avatarColor: data.avatarColor || "#17716b",
      photo: data.photo || existingPet?.photo || "",
      signature: data.signature || existingPet?.signature || ""
    };
    const existing = state.pets.findIndex((item) => item.id === pet.id);
    if (existing >= 0) state.pets[existing] = pet;
    else state.pets.push(pet);
    state.selectedPetId = pet.id;
    notify("Pet salvo na carteira.");
  }

  if (type === "owner") {
    state.owner = { ...state.owner, ...data };
    clinicsStatus = "idle";
    nearbyClinics = [];
    clinicLocationLabel = "";
    notify("Dados do tutor atualizados.");
  }

  if (type === "vaccine") {
    const vaccineId = data.id || createId("vac");
    const vaccineIndex = state.vaccines.findIndex((item) => item.id === vaccineId);
    const nextVaccine = {
      ...data,
      id: vaccineId,
      petId: data.petId,
      name: String(data.name || "").trim(),
      dose: String(data.dose || "").trim(),
      clinic: String(data.clinic || "").trim(),
      veterinarian: String(data.veterinarian || "").trim(),
      batch: String(data.batch || "").trim(),
      notes: String(data.notes || "").trim()
    };
    if (vaccineIndex >= 0) state.vaccines[vaccineIndex] = nextVaccine;
    else state.vaccines.push(nextVaccine);
    state.selectedPetId = data.petId;
    notify(vaccineIndex >= 0 ? "Vacina atualizada." : "Vacina registrada.");
  }

  if (type === "document") {
    const documentId = data.id || createId("doc");
    const documentIndex = state.documents.findIndex((item) => item.id === documentId);
    const attachment = documentAttachmentFromForm(data);
    const nextDocument = {
      id: documentId,
      petId: data.petId,
      title: data.title,
      kind: data.kind,
      date: data.date,
      expiresAt: data.expiresAt,
      notes: data.notes,
      attachment
    };
    if (documentIndex >= 0) state.documents[documentIndex] = nextDocument;
    else state.documents.push(nextDocument);
    state.selectedPetId = data.petId;
    notify(documentIndex >= 0 ? "Documento atualizado." : "Documento salvo.");
  }

  if (type === "travel") {
    const selectedPetId = String(data.selectedPetId || state.selectedPetId || state.pets[0]?.id || "").trim();
    const currentTravel = getTravelForPet(selectedPetId);
    const nextTravel = {
      ...currentTravel,
      ...data,
      selectedPetId,
      items: {
        ...blankTravel().items,
        ...currentTravel.items,
        ...((data.items && typeof data.items === "object") ? data.items : {})
      }
    };
    setTravelForPet(selectedPetId, nextTravel);
    state.selectedPetId = selectedPetId;
    notify("Plano de viagem atualizado.");
  }

  if (type === "feedback") {
    const submission = {
      id: createId("feedback"),
      submittedAt: new Date().toISOString(),
      veterinarySatisfaction: Number(data.veterinarySatisfaction || 0),
      appRating: Number(data.appRating || 0),
      improvements: String(data.improvements || "").trim(),
      suggestions: String(data.suggestions || "").trim(),
      petId: state.selectedPetId || state.pets[0]?.id || ""
    };
    state.feedback = Array.isArray(state.feedback) ? [...state.feedback, submission] : [submission];
    notify("Avaliação salva com sucesso.");
  }

  saveState();
  closeModal();
  render();
}

function deletePet(id) {
  const pet = state.pets.find((item) => item.id === id);
  if (!pet) return;
  const confirmed = confirm(`Excluir ${pet.name} e seus registros?`);
  if (!confirmed) return;
  state.pets = state.pets.filter((item) => item.id !== id);
  state.vaccines = state.vaccines.filter((item) => item.petId !== id);
  state.documents = state.documents.filter((item) => item.petId !== id);
  state.selectedPetId = state.pets[0]?.id || "";
  saveState();
  closeModal();
  notify("Pet removido.");
  render();
}

function deleteVaccine(id) {
  const vaccine = state.vaccines.find((item) => item.id === id);
  if (!vaccine) return;
  const confirmed = confirm(`Excluir a vacina ${vaccine.name}?`);
  if (!confirmed) return;
  state.vaccines = state.vaccines.filter((item) => item.id !== id);
  saveState();
  closeModal();
  notify("Vacina removida.");
  render();
}

function deleteDocument(id) {
  const doc = state.documents.find((item) => item.id === id);
  if (!doc) return;
  const confirmed = confirm(`Excluir o documento ${doc.title}?`);
  if (!confirmed) return;
  state.documents = state.documents.filter((item) => item.id !== id);
  saveState();
  closeModal();
  notify("Documento removido.");
  render();
}

function resetDemo() {
  if (!confirm("Restaurar os dados de demonstração?")) return;
  const previousAuth = { ...state.auth };
  const previousUsers = Array.isArray(state.users) ? state.users : [];
  const previousTheme = state.theme;
  state = {
    ...structuredClone(defaultState),
    auth: previousAuth,
    users: previousUsers,
    theme: previousTheme
  };
  saveState();
  notify("Demonstração restaurada.");
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `identificcao-pet-backup-${todayISO}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  notify("Backup exportado.");
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = { ...structuredClone(defaultState), ...JSON.parse(String(reader.result)) };
        saveState();
        notify("Backup importado.");
        render();
      } catch {
        notify("Arquivo inválido.");
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

async function installApp() {
  if (!deferredInstallPrompt) {
    openInstallHelp();
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  state.installDismissed = true;
  saveState();
  render();
}

function openMaps(query) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
}

function imageFileToDataUrl(file, maxSize = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

async function documentFileToAttachment(file) {
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

  if (!isImage && !isPdf) {
    throw new Error("Anexe uma imagem ou um PDF.");
  }

  if (!isImage && file.size > DOCUMENT_FILE_MAX_BYTES) {
    throw new Error(`Use um PDF de até ${formatFileSize(DOCUMENT_FILE_MAX_BYTES)}.`);
  }

  const dataUrl = isImage ? await imageFileToDataUrl(file, 1400) : await fileToDataUrl(file);
  if (dataUrl.length > DOCUMENT_FILE_MAX_BYTES * 1.4) {
    throw new Error(`Use um arquivo de até ${formatFileSize(DOCUMENT_FILE_MAX_BYTES)}.`);
  }

  return {
    name: file.name || "documento",
    type: isImage ? "image/jpeg" : "application/pdf",
    originalType: file.type || "",
    size: isImage ? dataUrl.length : file.size,
    dataUrl,
    uploadedAt: new Date().toISOString()
  };
}

async function renderWalletCanvas(pet, side) {
  const template = await loadCanvasImage(WALLET_TEMPLATE_IMAGES[side]);
  const canvas = document.createElement("canvas");
  canvas.width = template.naturalWidth || template.width;
  canvas.height = template.naturalHeight || template.height;
  const context = canvas.getContext("2d");
  const doc = walletPdfData(pet);

  context.drawImage(template, 0, 0, canvas.width, canvas.height);

  if (side === "front") {
    await drawWalletFront(context, pet, doc);
  } else {
    await drawWalletBack(context, pet, doc);
  }

  return canvas;
}

async function renderWalletDocumentsCanvas(pet, allPetDocs, pageDocs = allPetDocs, pageNumber = 1, totalPages = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 807;
  const context = canvas.getContext("2d");
  const documentNumber = pet.registry || `PET-${pet.id.slice(-6).toUpperCase()}`;
  const attachedCount = allPetDocs.filter((doc) => documentAttachment(doc)).length;
  const docs = pageDocs.slice(0, 4);

  drawRoundedRect(context, 0, 0, canvas.width, canvas.height, 0, "#eaf1e8");
  drawGrid(context, 0, 0, canvas.width, canvas.height, "rgba(42, 201, 167, 0.08)");
  drawRoundedRect(context, 32, 30, 1216, 118, 18, "#173733");
  drawRoundedRect(context, 58, 53, 72, 72, 36, "#f7f2df");
  drawFittedText(context, "PET", 94, 99, 54, {
    align: "center",
    color: "#17716b",
    size: 24,
    minSize: 16,
    weight: 900
  });
  drawFittedText(context, "DOCUMENTOS ANEXADOS", 154, 78, 620, {
    color: "#f4fbf8",
    size: 32,
    minSize: 20,
    weight: 900
  });
  drawFittedText(context, `${pet.name || "Pet"} - ${documentNumber}`, 154, 119, 620, {
    color: "#e8c978",
    size: 24,
    minSize: 15,
    weight: 800,
    uppercase: false
  });
  drawFittedText(context, `${allPetDocs.length} REGISTROS | ${attachedCount} ANEXOS`, 1090, 102, 260, {
    align: "center",
    color: "#e8c978",
    size: 25,
    minSize: 14,
    weight: 900
  });

  if (!docs.length) {
    drawRoundedRect(context, 78, 220, 1124, 390, 20, "rgba(255, 255, 255, 0.72)");
    drawFittedText(context, "NENHUM DOCUMENTO CADASTRADO", 640, 385, 760, {
      align: "center",
      color: "#173731",
      size: 32,
      minSize: 18,
      weight: 900
    });
    drawFittedText(context, "Adicione atestados, exames, receitas e arquivos de viagem pelo app.", 640, 430, 760, {
      align: "center",
      color: "#466b62",
      size: 23,
      minSize: 14,
      weight: 700,
      uppercase: false
    });
  } else {
    const positions = [
      [58, 184],
      [650, 184],
      [58, 455],
      [650, 455]
    ];

    for (let index = 0; index < docs.length; index += 1) {
      await drawWalletDocumentTile(context, docs[index], positions[index][0], positions[index][1], 572, 230);
    }
  }

  drawRoundedRect(context, 34, 742, 1212, 44, 10, "rgba(255, 255, 255, 0.72)");
  drawFittedText(context, "ANEXOS DIGITAIS", 62, 772, 260, {
    color: "#173c35",
    size: 20,
    minSize: 13,
    weight: 900
  });
  drawFittedText(context, `Emitido em ${formatDate(todayISO)}`, 640, 772, 420, {
    align: "center",
    color: "#1e5549",
    size: 20,
    minSize: 13,
    weight: 700,
    uppercase: false
  });
  drawFittedText(context, totalPages > 1 ? `CARTEIRA PET ${pageNumber}/${totalPages}` : "CARTEIRA PET", 1210, 772, 220, {
    align: "right",
    color: "#173c35",
    size: 20,
    minSize: 13,
    weight: 900
  });

  return canvas;
}

async function drawWalletDocumentTile(context, doc, x, y, width, height) {
  const attachment = documentAttachment(doc);
  drawRoundedRect(context, x, y, width, height, 16, "rgba(255, 255, 255, 0.82)");
  drawRoundedRect(context, x + 16, y + 18, 188, height - 36, 12, "#d8eee1");

  if (attachment && isImageAttachment(attachment)) {
    await drawDataImageClipped(context, attachment.dataUrl, x + 16, y + 18, 188, height - 36, 12, true);
  } else {
    drawGrid(context, x + 16, y + 18, 188, height - 36, "#e8f6ee");
    drawFittedText(context, attachment ? documentFileKind(attachment) : "DOC", x + 110, y + height / 2 + 10, 142, {
      align: "center",
      color: "#17716b",
      size: 48,
      minSize: 26,
      weight: 900
    });
  }

  drawFittedText(context, doc.kind || "Documento", x + 228, y + 48, width - 252, {
    color: "#24705e",
    size: 18,
    minSize: 12,
    weight: 900
  });
  drawFittedText(context, doc.title || "Documento", x + 228, y + 88, width - 252, {
    color: "#173731",
    size: 28,
    minSize: 16,
    weight: 900
  });
  drawFittedText(context, `Data: ${formatDate(doc.date)}`, x + 228, y + 126, width - 252, {
    color: "#466b62",
    size: 20,
    minSize: 13,
    weight: 700,
    uppercase: false
  });
  drawFittedText(context, doc.expiresAt ? `Validade: ${formatDate(doc.expiresAt)}` : "Sem validade cadastrada", x + 228, y + 158, width - 252, {
    color: "#466b62",
    size: 20,
    minSize: 13,
    weight: 700,
    uppercase: false
  });
  drawFittedText(context, attachment ? `${attachment.name} - ${formatFileSize(attachment.size)}` : "Sem arquivo anexado", x + 228, y + 198, width - 252, {
    color: "#173731",
    size: 18,
    minSize: 12,
    weight: 800,
    uppercase: false
  });
}

async function drawWalletFront(context, pet, doc) {
  await drawWalletPhoto(context, pet, 48, 193, 327, 389, 8);

  drawWalletFieldValue(context, pet.name, 412, 228, 850, { size: 28, minSize: 17, weight: 800 });
  drawWalletFieldValue(context, formatDate(pet.birthDate), 412, 318, 274, { size: 23 });
  drawWalletFieldValue(context, pet.species, 704, 318, 274, { size: 23 });
  drawWalletFieldValue(context, pet.sex, 995, 318, 250, { size: 23 });
  drawWalletFieldValue(context, pet.breed, 412, 410, 420, { size: 23 });
  drawWalletFieldValue(context, pet.color, 849, 410, 410, { size: 23 });
  drawWalletFieldValue(context, doc.documentNumber, 412, 500, 420, { size: 23 });
  drawWalletFieldValue(context, pet.microchip, 849, 500, 410, { size: 23 });
  drawWalletFieldValue(context, doc.ownerName, 412, 590, 850, { size: 24, minSize: 15, weight: 800 });
  drawWalletFieldValue(context, doc.vaccineText, 650, 669, 590, {
    size: 21,
    minSize: 13,
    color: doc.vaccineColor,
    uppercase: false
  });
  drawWalletFieldValue(context, doc.documentNumber, 56, 757, 320, {
    align: "center",
    size: 18,
    minSize: 12
  });

  if (pet.signature) {
    await drawDataImage(context, pet.signature, 78, 612, 270, 48, false);
  } else {
    drawFittedText(context, doc.ownerName, 212, 652, 300, {
      align: "center",
      color: "#173c35",
      family: "Georgia, serif",
      size: 24,
      minSize: 14,
      style: "italic",
      uppercase: false
    });
  }

  return;

  drawText(context, "REPÚBLICA FEDERATIVA DOS ANIMAIS", 800, 270, {
    align: "center",
    color: "#dff6eb",
    font: "700 26px Arial"
  });
  drawRoundedRect(context, 104, 345, 1392, 560, 34, "#edf7ee");
  drawText(context, "BRASIL", 800, 398, { align: "center", color: "#2f7045", font: "700 25px Arial" });
  drawText(context, "CARTEIRA DE IDENTIDADE ANIMAL", 800, 430, { align: "center", color: "#2f7045", font: "700 25px Arial" });

  drawRoundedRect(context, 170, 488, 620, 250, 0, "#cfead1");
  drawRoundedRect(context, 290, 555, 380, 210, 0, "#fff");
  if (pet.photo) {
    await drawDataImage(context, pet.photo, 306, 571, 348, 178, true);
  } else {
    drawGrid(context, 306, 571, 348, 178, "#4be09a");
    drawText(context, initials(pet.name), 480, 686, { align: "center", color: "#ffffff", font: "700 72px Arial" });
  }
  drawText(context, "FOTO DO PET", 480, 802, { align: "center", color: "#4b6f54", font: "700 14px Arial" });

  drawRoundedRect(context, 820, 488, 620, 250, 0, "#45ad4d");
  drawPaws(context, 1130, 565);
  drawPaws(context, 1130, 675);
  drawPaws(context, 1130, 785);

  context.strokeStyle = "#163a36";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(170, 842);
  context.lineTo(1440, 842);
  context.stroke();
  if (pet.signature) {
    await drawDataImage(context, pet.signature, 510, 780, 580, 74, false);
  } else {
    drawText(context, doc.ownerName, 800, 830, { align: "center", color: "#14302f", font: "italic 36px Georgia" });
  }
  drawText(context, "Assinatura do titular", 800, 878, { align: "center", color: "#587069", font: "18px Arial" });
  drawText(context, "🐾🐾🐾🐾🐾🐾🐾🐾🐾", 800, 958, { align: "center", color: "#17716b", font: "24px Arial" });
}

async function drawWalletBack(context, pet, doc) {
  const cover = (x, y, width, height) => coverWalletText(context, x, y, width, height);

  cover(36, 208, 470, 33);
  cover(523, 208, 470, 33);
  cover(36, 295, 470, 33);
  cover(523, 295, 470, 33);
  cover(36, 382, 957, 33);
  cover(36, 470, 470, 33);
  cover(523, 470, 470, 33);
  cover(36, 558, 470, 33);
  cover(523, 558, 470, 33);
  coverWalletText(context, 51, 658, 920, 37, 8);
  coverWalletText(context, 40, 738, 275, 38, 10);
  coverWalletText(context, 453, 738, 420, 38, 10);
  coverWalletText(context, 1042, 738, 220, 38, 10);

  drawWalletFieldValue(context, doc.ownerName, 36, 232, 470, { size: 22, minSize: 14 });
  drawWalletFieldValue(context, state.owner.cpf, 523, 232, 470, { size: 22, minSize: 14 });
  drawWalletFieldValue(context, state.owner.phone, 36, 320, 470, { size: 22, minSize: 14 });
  drawWalletFieldValue(context, state.owner.email, 523, 320, 470, {
    size: 21,
    minSize: 13,
    uppercase: false
  });
  drawWalletFieldValue(context, doc.address, 36, 407, 957, { size: 20, minSize: 12 });
  drawWalletFieldValue(context, state.owner.emergencyName, 36, 493, 470, { size: 22, minSize: 14 });
  drawWalletFieldValue(context, state.owner.emergencyPhone, 523, 493, 470, { size: 22, minSize: 14 });
  drawWalletFieldValue(context, pet.temperament, 36, 581, 470, { size: 21, minSize: 13 });
  drawWalletFieldValue(context, pet.allergies, 523, 581, 470, { size: 21, minSize: 13 });
  wrapCanvasText(context, walletCardText(pet.notes, "Sem observacoes cadastradas.", false), 55, 681, 900, 24, {
    color: "#173731",
    font: "700 19px Arial",
    maxLines: 2
  });

  drawWalletQr(context, doc.qrText, 1068, 313, 201);
  drawFittedText(context, `EMITIDA EM ${doc.issuedAt}`, 58, 763, 250, {
    color: "#122b29",
    size: 21,
    minSize: 13,
    weight: 500,
    uppercase: false
  });
  drawFittedText(context, `${pet.name || "Pet"} - ${doc.documentNumber}`, 663, 763, 390, {
    align: "center",
    color: "#122b29",
    size: 20,
    minSize: 12,
    weight: 800
  });
  drawFittedText(context, "DOCUMENTO DIGITAL", 1152, 763, 205, {
    align: "center",
    color: "#122b29",
    size: 19,
    minSize: 12,
    weight: 800
  });

  return;

  drawText(context, "🐾🐾🐾🐾🐾🐾🐾🐾🐾🐾🐾", 800, 270, { align: "center", color: "#167c61", font: "24px Arial" });
  drawRoundedRect(context, 52, 330, 1496, 56, 0, "#ffffff");
  drawText(context, "VÁLIDO EM TODO TERRITÓRIO NACIONAL", 800, 367, {
    align: "center",
    color: "#2f7045",
    font: "700 23px Arial"
  });

  drawRoundedRect(context, 78, 438, 1444, 488, 24, "#edf7ee");
  const rows = [
    ["NOME", pet.name, "RAÇA", pet.breed],
    ["NASCIMENTO", formatDate(pet.birthDate), "NATURAL DE", state.owner.city],
    ["ESPÉCIE", pet.species, "COR", pet.color],
    ["SEXO", pet.sex, "CEP", state.owner.zipCode || ""],
    ["ENDEREÇO", [state.owner.address, state.owner.addressNumber].filter(Boolean).join(", "), "ESTADO", state.owner.state],
    ["BAIRRO", state.owner.neighborhood, "TEL. CEL.", state.owner.phone],
    ["CIDADE", state.owner.city, "MICROCHIP", pet.microchip],
    ["E-MAIL", state.owner.email, "REGISTRO", doc.documentNumber]
  ];

  let y = 500;
  for (const row of rows) {
    drawLabelValue(context, row[0], row[1], 145, y);
    drawLabelValue(context, row[2], row[3], 830, y);
    y += 54;
  }

  drawRoundedRect(context, 140, 800, 1320, 96, 0, "#c9ebce");
  drawText(context, "DESCRIÇÃO", 170, 840, { color: "#2f7045", font: "700 18px Arial" });
  wrapCanvasText(context, pet.notes || pet.temperament || "Sem observações cadastradas.", 170, 870, 1250, 24, {
    color: "#14302f",
    font: "18px Arial"
  });
}

function walletPdfData(pet) {
  const nextVaccine = getVaccines(pet.id)[0];
  const status = nextVaccine ? vaccineStatus(nextVaccine) : { type: "warn", label: "Sem vacinas" };
  return {
    documentNumber: pet.registry || `PET-${pet.id.slice(-6).toUpperCase()}`,
    ownerName: state.owner.name || "Tutor",
    issuedAt: formatDate(todayISO),
    address: ownerAddress(),
    vaccineText: nextVaccine ? `${nextVaccine.name} - ${status.label}` : status.label,
    vaccineColor: status.type === "danger" ? "#a12f38" : status.type === "warn" ? "#8c5a0f" : "#226b43",
    qrText: `${pet.registry || pet.id}-${pet.microchip || ""}-${state.owner.phone || ""}`
  };
}

function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Nao foi possivel carregar ${src}`));
    image.src = src;
  });
}

async function drawWalletPhoto(context, pet, x, y, width, height, radius = 8) {
  if (pet.photo) {
    await drawDataImageClipped(context, pet.photo, x, y, width, height, radius, true);
    return;
  }

  drawRoundedRect(context, x, y, width, height, radius, "#d8eee1");
  drawGrid(context, x, y, width, height, "#44c9a4");
  drawFittedText(context, canvasInitials(pet.name), x + width / 2, y + height / 2 + 30, width - 40, {
    align: "center",
    color: "#ffffff",
    size: 88,
    minSize: 44,
    weight: 900
  });
}

function drawWalletFieldValue(context, value, x, y, maxWidth, options = {}) {
  drawFittedText(context, walletCardText(value, options.fallback, options.uppercase !== false), x, y, maxWidth, {
    color: options.color || "#173731",
    size: options.size || 22,
    minSize: options.minSize || 13,
    weight: options.weight || 700,
    align: options.align || "left",
    uppercase: false
  });
}

function walletCardText(value, fallback = "Nao informado", uppercase = true) {
  const text = String(value || "").trim() || fallback;
  return uppercase ? text.toLocaleUpperCase("pt-BR") : text;
}

function canvasInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] || "P") + (parts.length > 1 ? parts.at(-1)[0] : "");
  return letters.toLocaleUpperCase("pt-BR");
}

function drawFittedText(context, text, x, y, maxWidth, options = {}) {
  const family = options.family || "Arial, sans-serif";
  const style = options.style || "normal";
  const weight = options.weight || 700;
  const minSize = options.minSize || 12;
  let size = options.size || 20;
  const content = options.uppercase === false ? String(text || "") : walletCardText(text, "", true);

  context.save();
  context.fillStyle = options.color || "#173731";
  context.textAlign = options.align || "left";
  context.textBaseline = "alphabetic";

  do {
    context.font = `${style} ${weight} ${size}px ${family}`;
    if (context.measureText(content).width <= maxWidth || size <= minSize) break;
    size -= 1;
  } while (size >= minSize);

  context.fillText(trimCanvasText(context, content, maxWidth), x, y);
  context.restore();
}

function trimCanvasText(context, text, maxWidth) {
  const content = String(text || "");
  if (context.measureText(content).width <= maxWidth) return content;

  const suffix = "...";
  let trimmed = content;
  while (trimmed.length > 1 && context.measureText(`${trimmed}${suffix}`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed.trimEnd()}${suffix}`;
}

function coverWalletText(context, x, y, width, height, radius = 4) {
  context.save();
  context.globalAlpha = 0.92;
  drawRoundedRect(context, x, y, width, height, radius, "#eef7f1");
  context.restore();
}

function drawWalletQr(context, text, x, y, size) {
  const cells = 9;
  const padding = 14;
  const gap = 5;
  const dot = (size - padding * 2 - gap * (cells - 1)) / cells;
  const hash = [...String(text)].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);

  drawRoundedRect(context, x, y, size, size, 10, "#ffffff");

  for (let index = 0; index < cells * cells; index += 1) {
    const row = Math.floor(index / cells);
    const col = index % cells;
    const finder = (row < 3 && col < 3) || (row < 3 && col > 5) || (row > 5 && col < 3);
    const on = finder || ((hash >> (index % 24)) + index * 11) % 3 === 0;
    const cx = x + padding + col * (dot + gap) + dot / 2;
    const cy = y + padding + row * (dot + gap) + dot / 2;

    context.fillStyle = on ? "#6bded0" : "#d7e6e2";
    context.beginPath();
    context.arc(cx, cy, dot / 2, 0, Math.PI * 2);
    context.fill();
  }
}

function drawDataImageClipped(context, dataUrl, x, y, width, height, radius = 0, cover = false) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      context.save();
      context.beginPath();
      if (radius && typeof context.roundRect === "function") {
        context.roundRect(x, y, width, height, radius);
      } else {
        context.rect(x, y, width, height);
      }
      context.clip();

      if (cover) {
        const scale = Math.max(width / image.width, height / image.height);
        const sourceWidth = width / scale;
        const sourceHeight = height / scale;
        const sourceX = (image.width - sourceWidth) / 2;
        const sourceY = (image.height - sourceHeight) / 2;
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
      } else {
        context.drawImage(image, x, y, width, height);
      }

      context.restore();
      resolve();
    };
    image.onerror = resolve;
    image.src = safeImageSrc(dataUrl);
  });
}

function drawLabelValue(context, label, value, x, y) {
  drawText(context, label, x, y, { color: "#2f7045", font: "700 18px Arial" });
  drawText(context, value || "", x + 190, y, { color: "#14302f", font: "18px Arial" });
}

function drawPaws(context, x, y) {
  context.fillStyle = "#1b75bc";
  for (const [dx, dy, radius] of [[0, 16, 14], [-24, 0, 9], [-8, -14, 9], [10, -14, 9], [26, 0, 9]]) {
    context.beginPath();
    context.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawGrid(context, x, y, width, height, color) {
  drawRoundedRect(context, x, y, width, height, 0, color);
  context.strokeStyle = "rgba(255,255,255,0.28)";
  context.lineWidth = 1;
  for (let gx = x; gx <= x + width; gx += 28) {
    context.beginPath();
    context.moveTo(gx, y);
    context.lineTo(gx, y + height);
    context.stroke();
  }
  for (let gy = y; gy <= y + height; gy += 28) {
    context.beginPath();
    context.moveTo(x, gy);
    context.lineTo(x + width, gy);
    context.stroke();
  }
}

function drawRoundedRect(context, x, y, width, height, radius, fill) {
  context.fillStyle = fill;
  context.beginPath();
  if (radius && typeof context.roundRect === "function") {
    context.roundRect(x, y, width, height, radius);
  } else {
    context.rect(x, y, width, height);
  }
  context.fill();
}

function drawText(context, text, x, y, options = {}) {
  context.fillStyle = options.color || "#14302f";
  context.font = options.font || "18px Arial";
  context.textAlign = options.align || "left";
  context.textBaseline = "alphabetic";
  context.fillText(String(text || ""), x, y);
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight, options = {}) {
  context.fillStyle = options.color || "#14302f";
  context.font = options.font || "18px Arial";
  const maxLines = options.maxLines || Number.POSITIVE_INFINITY;
  const words = String(text || "").split(/\s+/);
  let line = "";
  let lineCount = 0;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      lineCount += 1;
      if (lineCount >= maxLines) {
        context.fillText(trimCanvasText(context, `${line} ${word}`, maxWidth), x, y);
        return;
      }
      context.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) context.fillText(trimCanvasText(context, line, maxWidth), x, y);
}

function drawDataImage(context, dataUrl, x, y, width, height, cover = false) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      if (cover) {
        const scale = Math.max(width / image.width, height / image.height);
        const sourceWidth = width / scale;
        const sourceHeight = height / scale;
        const sourceX = (image.width - sourceWidth) / 2;
        const sourceY = (image.height - sourceHeight) / 2;
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
      } else {
        context.drawImage(image, x, y, width, height);
      }
      resolve();
    };
    image.onerror = resolve;
    image.src = safeImageSrc(dataUrl);
  });
}

function createPdfFromCanvases(canvases) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 28;
  const imageWidth = pageWidth - margin * 2;
  const objects = [];
  const pages = [];

  canvases.forEach((canvas, index) => {
    const imageHeight = imageWidth * (canvas.height / canvas.width);
    const imageY = (pageHeight - imageHeight) / 2;
    const imageData = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
    const imageObject = objects.push(
      `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${base64ToBinary(imageData).length} >>\nstream\n${base64ToBinary(imageData)}\nendstream`
    ) + 2;
    const content = `q\n${imageWidth} 0 0 ${imageHeight} ${margin} ${imageY} cm\n/Im${index} Do\nQ`;
    const contentObject = objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`) + 2;
    const pageObject = objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${index} ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`
    ) + 2;
    pages.push(`${pageObject} 0 R`);
  });

  const pageTree = `<< /Type /Pages /Kids [${pages.join(" ")}] /Count ${pages.length} >>`;
  const catalog = "<< /Type /Catalog /Pages 2 0 R >>";
  const ordered = [catalog, pageTree, ...objects];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  ordered.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xref = pdf.length;
  pdf += `xref\n0 ${ordered.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${ordered.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([binaryStringToUint8Array(pdf)], { type: "application/pdf" });
}

function base64ToBinary(base64) {
  const raw = atob(base64);
  let binary = "";
  for (let index = 0; index < raw.length; index += 1) {
    binary += String.fromCharCode(raw.charCodeAt(index));
  }
  return binary;
}

function binaryStringToUint8Array(binary) {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function chunkItems(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function filteredPets() {
  return state.pets.filter((pet) => {
    const matchesFilter = petFilter === "all" || pet.species === petFilter || (petFilter === "Outros" && !["Cachorro", "Gato"].includes(pet.species));
    const haystack = `${pet.name} ${pet.breed} ${pet.microchip} ${pet.registry}`.toLowerCase();
    return matchesFilter && (!searchTerm || haystack.includes(searchTerm));
  });
}

function getVaccines(petId = "") {
  return [...state.vaccines]
    .filter((vaccine) => !petId || vaccine.petId === petId)
    .sort((a, b) => new Date(a.dueDate || "2999-01-01") - new Date(b.dueDate || "2999-01-01"));
}

function getSelectedPet() {
  return state.pets.find((pet) => pet.id === state.selectedPetId) || state.pets[0] || null;
}

function vaccineFilterKey(vaccine) {
  const status = vaccineStatus(vaccine);
  return status.filterKey || status.type;
}

function vaccineStatus(vaccine) {
  if (!vaccine.dueDate) return { type: "warn", filterKey: "soon", label: "Sem data" };
  const due = new Date(`${vaccine.dueDate}T12:00:00`);
  const diffDays = Math.ceil((due - now) / 86400000);
  if (diffDays < 0) return { type: "danger", filterKey: "late", label: "Vencida" };
  if (diffDays <= 30) return { type: "warn", filterKey: "soon", label: `${diffDays} dia${diffDays === 1 ? "" : "s"}` };
  return { type: "ok", filterKey: "ok", label: "Em dia" };
}

function travelProgress() {
  return travelProgressForPet(state.selectedPetId || state.travel?.selectedPetId || state.pets[0]?.id || "");
}

function ownerAddress() {
  const street = [state.owner.address, state.owner.addressNumber].filter(Boolean).join(", ");
  const city = [state.owner.city, state.owner.state].filter(Boolean).join(" - ");
  return [street, state.owner.addressComplement, state.owner.neighborhood, city, state.owner.zipCode].filter(Boolean).join(", ");
}

function field(label, name, value = "", type = "text", required = false) {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="${type}" value="${escapeHTML(value)}" ${required ? "required" : ""} />
    </div>
  `;
}

function textareaField(label, name, value = "") {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <textarea id="${name}" name="${name}">${escapeHTML(value)}</textarea>
    </div>
  `;
}

function selectField(label, name, value, options) {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}">
        ${options.map((option) => `<option value="${escapeHTML(option)}" ${option === value ? "selected" : ""}>${escapeHTML(option)}</option>`).join("")}
      </select>
    </div>
  `;
}

function petSelectField(label, name, value) {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}" required>
        ${state.pets.map((pet) => `<option value="${pet.id}" ${pet.id === value ? "selected" : ""}>${escapeHTML(pet.name)}</option>`).join("")}
      </select>
    </div>
  `;
}

function qrTemplate(text) {
  const hash = [...String(text)].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
  const cells = Array.from({ length: 81 }, (_, index) => {
    const finder = (index < 21 && index % 9 < 3) || (index < 27 && index % 9 > 5) || (index > 53 && index % 9 < 3);
    const on = finder || ((hash >> (index % 24)) + index * 11) % 3 === 0;
    return `<span class="${on ? "on" : ""}"></span>`;
  }).join("");
  return `<div class="qr" aria-label="Código visual da carteira">${cells}</div>`;
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] || "P") + (parts.length > 1 ? parts.at(-1)[0] : "");
  return escapeHTML(letters.toUpperCase());
}

function petAge(date) {
  if (!date) return "Idade não informada";
  const birth = new Date(`${date}T12:00:00`);
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (months < 12) return `${Math.max(months, 0)} meses`;
  const years = Math.floor(months / 12);
  return `${years} ano${years === 1 ? "" : "s"}`;
}

function formatDate(value) {
  if (!value) return "Não informado";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatFileSize(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function readonlyField(label, name, value = "") {
  return `
    <div class="field readonly-field">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" value="${escapeHTML(value)}" readonly aria-readonly="true" />
    </div>
  `;
}

function formatDateTime(value) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeImageSrc(value = "") {
  const text = String(value || "");
  if (text.startsWith("data:image/") || text.startsWith("./") || text.startsWith("/")) return text;
  return "";
}

function safeDocumentDataUrl(value = "") {
  const text = String(value || "");
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(text)) return text;
  if (/^data:application\/pdf;base64,/i.test(text)) return text;
  return "";
}

function safeExternalUrl(value = "") {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function slugify(value = "") {
  return String(value || "pet")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "pet";
}

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function createId(prefix = "id") {
  const randomPart =
    globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomPart}`;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
}
