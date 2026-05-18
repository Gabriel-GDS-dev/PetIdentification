const STORAGE_KEY = "pet-id-wallet-state-v1";
const APP_NAME = "Identificação Pet";
const API_BASE = window.location.origin;
const SYNC_DEBOUNCE_MS = 900;

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
    address: "Rua das Palmeiras, 240",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01000-000",
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
  }
};

const views = [
  { id: "home", label: "Início", icon: "⌂" },
  { id: "pets", label: "Pets", icon: "◉" },
  { id: "vaccines", label: "Vacinas", icon: "✚" },
  { id: "travel", label: "Viagem", icon: "⇄" },
  { id: "clinics", label: "Vets", icon: "⌖" }
];

const clinicSeed = [
  {
    name: "Clínica Vida Animal",
    neighborhood: "Centro",
    city: "São Paulo",
    phone: "(11) 3344-2211",
    services: ["Vacinas", "Atestado", "Emergência"],
    distance: 1.4,
    open: "Aberta até 21h"
  },
  {
    name: "PetCare Centro",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    phone: "(11) 3122-9090",
    services: ["Vacinas", "Exames", "Internação"],
    distance: 2.1,
    open: "Aberta até 20h"
  },
  {
    name: "Vet Popular",
    neighborhood: "Liberdade",
    city: "São Paulo",
    phone: "(11) 2700-7740",
    services: ["Consulta", "Vacinas", "Microchip"],
    distance: 3.6,
    open: "Fecha às 18h"
  },
  {
    name: "Hospital Pet 24h",
    neighborhood: "Vila Mariana",
    city: "São Paulo",
    phone: "(11) 4002-2525",
    services: ["24h", "Emergência", "Cirurgia"],
    distance: 5.2,
    open: "24 horas"
  }
];

let state = loadState();
let deferredInstallPrompt = null;
let petFilter = "all";
let vaccineFilter = "all";
let searchTerm = "";
let syncTimer = null;
let syncing = false;

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
  if (!action) return;

  const { action: name } = action.dataset;
  const id = action.dataset.id;
  const view = action.dataset.view;

  if (name === "view") navigate(view);
  if (name === "auth-view") setAuthView(action.dataset.mode);
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
  if (name === "pet-wallet") {
    state.selectedPetId = id;
    navigate("wallet");
  }
  if (name === "new-vaccine") openVaccineModal(id || state.selectedPetId);
  if (name === "edit-owner") openOwnerModal();
  if (name === "save-travel") openTravelModal();
  if (name === "new-document") openDocumentModal(id || state.selectedPetId);
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
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-search='pets']")) {
    searchTerm = event.target.value.trim().toLowerCase();
    renderPets();
  }

  if (event.target.matches("[data-travel-check]")) {
    state.travel.items[event.target.dataset.travelCheck] = event.target.checked;
    saveState();
    renderTravel();
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.matches("[data-pet-photo]")) {
    await handlePetPhotoInput(event.target);
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
    state.selectedPetId = event.target.value;
    state.travel.selectedPetId = event.target.value;
    saveState();
    render();
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
    if (!stored) return structuredClone(defaultState);
    return mergeState(JSON.parse(stored));
  } catch {
    return structuredClone(defaultState);
  }
}

function mergeState(partial = {}) {
  return {
    ...structuredClone(defaultState),
    ...partial,
    auth: { ...defaultState.auth, ...(partial.auth || {}) },
    sync: { ...defaultState.sync, ...(partial.sync || {}) },
    users: Array.isArray(partial.users) ? partial.users : [],
    owner: { ...defaultState.owner, ...(partial.owner || {}) },
    travel: {
      ...defaultState.travel,
      ...(partial.travel || {}),
      items: { ...defaultState.travel.items, ...((partial.travel || {}).items || {}) }
    }
  };
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
  if (state.currentView === "settings") return settingsView();
  return homeView();
}

function navigate(view) {
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
  const upcoming = getVaccines().filter((vaccine) => ["late", "soon"].includes(vaccineStatus(vaccine).type));
  const progress = travelProgress();
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

  return `
    <div class="page-head">
      <span class="eyebrow">Documento digital</span>
      <h1>Carteira do ${escapeHTML(pet.name)}</h1>
      <p class="muted">Carteira animal com frente e verso, assinatura digital, dados do tutor e PDF para baixar.</p>
    </div>

    <section class="wallet-document" aria-label="Carteira de identidade animal">
      <div class="wallet-document-top">
        <button class="ghost-button" type="button" data-action="view" data-view="pets">Voltar</button>
        <div class="button-row">
          <button class="primary-button" type="button" data-action="edit-pet" data-id="${pet.id}">Editar Pet</button>
          <button class="secondary-button" type="button" data-action="sign-pet" data-id="${pet.id}">Assinar</button>
          <button class="secondary-button" type="button" data-action="download-wallet-pdf" data-id="${pet.id}">Baixar PDF</button>
        </div>
      </div>

      <div class="animal-wallet-pages" id="walletPrintArea">
        <article class="animal-wallet-card animal-wallet-front" aria-label="Frente da carteira animal">
          <div class="animal-wallet-ribbon">República Federativa dos Animais</div>
          <div class="animal-wallet-paper">
            <div class="animal-wallet-heading">
              <strong>Brasil</strong>
              <span>Carteira de Identidade Animal</span>
            </div>
            <div class="animal-wallet-front-grid">
              <div class="animal-photo-box">
                ${walletPhoto(pet)}
                <span>Foto do pet</span>
              </div>
              <div class="animal-paw-panel" aria-hidden="true">
                <span>🐾</span>
                <span>🐾</span>
                <span>🐾</span>
              </div>
            </div>
            <div class="animal-signature-line">
              ${signatureMarkup(pet, state.owner.name)}
              <span>Assinatura do titular</span>
            </div>
          </div>
          <div class="animal-wallet-code">🐾🐾🐾🐾🐾🐾🐾🐾🐾</div>
        </article>

        <article class="animal-wallet-card animal-wallet-back" aria-label="Verso da carteira animal">
          <div class="animal-wallet-ribbon">🐾🐾🐾🐾🐾🐾🐾🐾🐾🐾🐾</div>
          <div class="animal-valid-bar">Válido em todo território nacional</div>
          <div class="animal-wallet-paper animal-wallet-paper-back">
            <div class="animal-data-grid">
              ${animalData("Nome", pet.name)}
              ${animalData("Raça", pet.breed)}
              ${animalData("Nascimento", formatDate(pet.birthDate))}
              ${animalData("Natural de", state.owner.city)}
              ${animalData("Espécie", pet.species)}
              ${animalData("Cor", pet.color)}
              ${animalData("Sexo", pet.sex)}
              ${animalData("CEP", state.owner.zipCode || "")}
              ${animalData("Endereço", state.owner.address)}
              ${animalData("Estado", state.owner.state)}
              ${animalData("Bairro", state.owner.neighborhood)}
              ${animalData("Tel. Cel.", state.owner.phone)}
              ${animalData("Cidade", state.owner.city)}
              ${animalData("Microchip", pet.microchip)}
              ${animalData("E-mail", state.owner.email)}
              ${animalData("Registro", documentNumber)}
            </div>
            <div class="animal-description-box">
              <span>Descrição</span>
              <p>${escapeHTML(pet.notes || pet.temperament || "Sem observações cadastradas.")}</p>
            </div>
          </div>
        </article>
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
    return vaccineStatus(vaccine).type === vaccineFilter;
  });

  if (!vaccines.length) {
    return emptyState("✚", "Nenhum registro", "Cadastre uma vacina ou altere o filtro.", "Nova vacina", "new-vaccine");
  }
  return `<div class="timeline">${vaccines.map(vaccineItem).join("")}</div>`;
}

function travelView() {
  const travelPet = state.pets.find((pet) => pet.id === state.travel.selectedPetId) || getSelectedPet();
  const progress = travelProgress();
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
              <h2>${escapeHTML(state.travel.destination || "Destino não definido")}</h2>
              <p class="muted small">${formatDate(state.travel.date)} · ${escapeHTML(state.travel.transport || "Transporte não definido")}</p>
            </div>
            <button class="secondary-button" type="button" data-action="save-travel">Editar</button>
          </div>
          <div class="field" style="margin-top: 14px;">
            <label for="travelPet">Pet da viagem</label>
            <select id="travelPet" data-select-pet>
              ${state.pets.map((pet) => `<option value="${pet.id}" ${travelPet?.id === pet.id ? "selected" : ""}>${escapeHTML(pet.name)}</option>`).join("")}
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
            <label class="check-item ${state.travel.items[key] ? "done" : ""}">
              <input type="checkbox" data-travel-check="${key}" ${state.travel.items[key] ? "checked" : ""} />
              <span>
                <strong>${title}</strong>
                <span class="muted small" style="display:block;">${subtitle}</span>
              </span>
              <span>${state.travel.items[key] ? "✓" : "○"}</span>
            </label>
          `).join("")}
        </div>
      </div>
      <aside class="grid">
        ${travelPet ? petCard(travelPet, true) : emptyState("◉", "Sem pet", "Cadastre um pet para planejar a viagem.")}
        <div class="card">
          <h2>Anotações</h2>
          <p class="muted" style="margin-top: 8px;">${escapeHTML(state.travel.notes || "Sem anotações para a viagem.")}</p>
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
  const city = state.owner.city || "sua cidade";
  const query = encodeURIComponent(`veterinária perto de ${ownerAddress()}`);
  return `
    <div class="page-head">
      <span class="eyebrow">Perto de casa</span>
      <h1>Veterinárias próximas</h1>
      <p class="muted">Busca orientada pelo endereço do tutor e atalhos para atendimento, vacina e viagem.</p>
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
            <h2>${escapeHTML(ownerAddress())}</h2>
            <p class="muted small">Endereço usado como referência para ${escapeHTML(city)}.</p>
          </div>
        </div>
        <div class="button-row" style="margin-top: 14px;">
          <button class="primary-button" type="button" data-action="maps" data-query="${query}">Abrir no mapa</button>
          <button class="secondary-button" type="button" data-action="edit-owner">Editar endereço</button>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="grid two">
        ${clinicSeed.map((clinic) => clinicCard(clinic)).join("")}
      </div>
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
  const alertCount = vaccines.filter((vaccine) => ["late", "soon"].includes(vaccineStatus(vaccine).type)).length;
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
    </article>
  `;
}

function documentItem(doc) {
  return `
    <article class="document-card">
      <div class="document-top">
        <div>
          <h3>${escapeHTML(doc.title)}</h3>
          <p class="muted small">${escapeHTML(doc.kind)} · ${formatDate(doc.date)}</p>
        </div>
        <span class="pill">${doc.expiresAt ? formatDate(doc.expiresAt) : "Sem validade"}</span>
      </div>
      <p class="muted small">${escapeHTML(doc.notes || "Sem observações.")}</p>
    </article>
  `;
}

function clinicCard(clinic) {
  const query = encodeURIComponent(`${clinic.name} ${clinic.neighborhood} ${clinic.city}`);
  return `
    <article class="clinic-card">
      <div class="clinic-top">
        <div>
          <h3>${escapeHTML(clinic.name)}</h3>
          <p class="muted small">${escapeHTML(clinic.neighborhood)}, ${escapeHTML(clinic.city)}</p>
        </div>
        <span class="pill ok">${escapeHTML(clinic.open)}</span>
      </div>
      <div class="inline-meta">
        <span class="pill">${clinic.distance.toFixed(1).replace(".", ",")} km</span>
        ${clinic.services.map((service) => `<span class="pill">${escapeHTML(service)}</span>`).join("")}
      </div>
      <div class="button-row">
        <a class="secondary-button" href="tel:${onlyDigits(clinic.phone)}">${clinic.phone}</a>
        <button class="primary-button" type="button" data-action="maps" data-query="${query}">Mapa</button>
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
  const localUrl = "http://127.0.0.1:5240/";
  openModal(`
    <div class="modal-head">
      <h2>Instalar como aplicativo</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <div class="grid">
        <div class="card">
          <h3>Android</h3>
          <p class="muted small" style="margin-top: 6px;">No Chrome, abra o app em HTTPS ou localhost. Quando o navegador reconhecer a PWA, toque em Instalar app. Para teste sem hospedar, use cabo USB com ADB e acesse ${localUrl}</p>
        </div>
        <div class="card">
          <h3>iPhone</h3>
          <p class="muted small" style="margin-top: 6px;">No Safari, abra o app e use Compartilhar, depois Adicionar à Tela de Início. Para recursos completos de PWA, o iPhone normalmente exige HTTPS.</p>
        </div>
        <div class="card">
          <h3>Teste por Wi-Fi</h3>
          <p class="muted small" style="margin-top: 6px;">Abrir pelo IP do computador serve para testar layout e navegação. Porém, em http://IP:porta o navegador pode criar só atalho, porque não é uma origem segura.</p>
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
      <h2>Dados do tutor</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-form="owner">
        <div class="form-grid two">
          ${field("Nome completo", "name", state.owner.name, "text", true)}
          ${field("CPF", "cpf", state.owner.cpf)}
          ${field("Telefone", "phone", state.owner.phone, "tel", true)}
          ${field("E-mail", "email", state.owner.email, "email")}
          ${field("Endereço", "address", state.owner.address)}
          ${field("Bairro", "neighborhood", state.owner.neighborhood)}
          ${field("Cidade", "city", state.owner.city)}
          ${field("Estado", "state", state.owner.state)}
          ${field("CEP", "zipCode", state.owner.zipCode)}
          ${field("Contato de emergência", "emergencyName", state.owner.emergencyName)}
          ${field("Telefone de emergência", "emergencyPhone", state.owner.emergencyPhone, "tel")}
        </div>
        <button class="primary-button" type="submit">Salvar tutor</button>
      </form>
    </div>
  `);
}

function openVaccineModal(petId = "") {
  const selected = petId || state.selectedPetId || state.pets[0]?.id || "";
  openModal(`
    <div class="modal-head">
      <h2>Nova vacina</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-form="vaccine">
        <div class="form-grid two">
          ${petSelectField("Pet", "petId", selected)}
          ${field("Vacina", "name", "", "text", true)}
          ${field("Dose", "dose", "")}
          ${field("Data da aplicação", "applicationDate", todayISO, "date")}
          ${field("Próxima dose", "dueDate", "", "date", true)}
          ${field("Clínica", "clinic", "")}
          ${field("Veterinário", "veterinarian", "")}
          ${field("Lote", "batch", "")}
        </div>
        ${textareaField("Observações", "notes", "")}
        <button class="primary-button" type="submit">Salvar vacina</button>
      </form>
    </div>
  `);
}

function openDocumentModal(petId = "") {
  const selected = petId || state.selectedPetId || state.pets[0]?.id || "";
  openModal(`
    <div class="modal-head">
      <h2>Novo documento</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-form="document">
        <div class="form-grid two">
          ${petSelectField("Pet", "petId", selected)}
          ${field("Título", "title", "", "text", true)}
          ${selectField("Tipo", "kind", "Viagem", ["Viagem", "Exame", "Receita", "Atestado", "Outro"])}
          ${field("Data", "date", todayISO, "date")}
          ${field("Validade", "expiresAt", "", "date")}
        </div>
        ${textareaField("Observações", "notes", "")}
        <button class="primary-button" type="submit">Salvar documento</button>
      </form>
    </div>
  `);
}

function openTravelModal() {
  openModal(`
    <div class="modal-head">
      <h2>Plano de viagem</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-form="travel">
        <div class="form-grid two">
          ${petSelectField("Pet", "selectedPetId", state.travel.selectedPetId || state.selectedPetId)}
          ${field("Destino", "destination", state.travel.destination, "text", true)}
          ${field("Data", "date", state.travel.date, "date")}
          ${selectField("Transporte", "transport", state.travel.transport, ["Carro", "Ônibus", "Avião", "Hospedagem", "Outro"])}
        </div>
        ${textareaField("Anotações", "notes", state.travel.notes)}
        <button class="primary-button" type="submit">Salvar viagem</button>
      </form>
    </div>
  `);
}

function openDrawer() {
  const drawer = document.createElement("div");
  drawer.className = "drawer-backdrop";
  drawer.dataset.modal = "drawer";
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
        ${[...views, { id: "settings", label: "Configurações", icon: "⚙" }].map((view) => `
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

function openModal(content) {
  closeModal();
  const wrapper = document.createElement("div");
  wrapper.className = "modal-backdrop";
  wrapper.dataset.modal = "dialog";
  wrapper.innerHTML = `<section class="modal" role="dialog" aria-modal="true">${content}</section>`;
  wrapper.addEventListener("click", (event) => {
    if (event.target === wrapper) closeModal();
  });
  document.body.append(wrapper);
  const firstInput = wrapper.querySelector("input:not([type='hidden']), select, textarea, button");
  firstInput?.focus();
}

function closeModal() {
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
        <canvas class="signature-pad" width="900" height="300" data-signature-pad data-pet-id="${escapeHTML(pet.id)}"></canvas>
        <div class="button-row">
          <button class="secondary-button" type="button" data-action="clear-signature">Limpar</button>
          <button class="primary-button" type="button" data-action="save-signature" data-id="${pet.id}">Salvar assinatura</button>
        </div>
      </div>
    </div>
  `);

  const canvas = document.querySelector("[data-signature-pad]");
  setupSignaturePad(canvas, pet.signature);
}

function setupSignaturePad(canvas, initialData = "") {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  let drawing = false;
  let lastPoint = null;

  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(Math.round(rect.width * ratio), 600);
    canvas.height = Math.max(Math.round(rect.height * ratio), 210);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    clearCanvas(context, canvas);
  };

  const point = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const draw = (event) => {
    if (!drawing) return;
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
  };

  resize();
  if (initialData) drawSignatureImage(context, initialData, canvas);

  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    lastPoint = point(event);
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", draw);
  canvas.addEventListener("pointerup", () => {
    drawing = false;
    lastPoint = null;
  });
  canvas.addEventListener("pointerleave", () => {
    drawing = false;
    lastPoint = null;
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
    const pdf = createPdfFromCanvases([front, back]);
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
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
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
    notify("Dados do tutor atualizados.");
  }

  if (type === "vaccine") {
    state.vaccines.push({ ...data, id: createId("vac") });
    state.selectedPetId = data.petId;
    notify("Vacina registrada.");
  }

  if (type === "document") {
    state.documents.push({ ...data, id: createId("doc") });
    state.selectedPetId = data.petId;
    notify("Documento salvo.");
  }

  if (type === "travel") {
    state.travel = { ...state.travel, ...data };
    state.selectedPetId = data.selectedPetId;
    notify("Plano de viagem atualizado.");
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

async function renderWalletCanvas(pet, side) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1000;
  const context = canvas.getContext("2d");
  const doc = walletPdfData(pet);

  drawRoundedRect(context, 0, 0, canvas.width, canvas.height, 0, "#147a62");
  drawRoundedRect(context, 0, 210, canvas.width, 790, 0, "#47b84c");

  if (side === "front") {
    await drawWalletFront(context, pet, doc);
  } else {
    await drawWalletBack(context, pet, doc);
  }

  return canvas;
}

async function drawWalletFront(context, pet, doc) {
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
    ["ENDEREÇO", state.owner.address, "ESTADO", state.owner.state],
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
  return {
    documentNumber: pet.registry || `PET-${pet.id.slice(-6).toUpperCase()}`,
    ownerName: state.owner.name || "Tutor"
  };
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
  const words = String(text || "").split(/\s+/);
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) context.fillText(line, x, y);
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
  const imageHeight = imageWidth * (1000 / 1600);
  const imageY = (pageHeight - imageHeight) / 2;
  const objects = [];
  const pages = [];

  canvases.forEach((canvas, index) => {
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

function vaccineStatus(vaccine) {
  if (!vaccine.dueDate) return { type: "warn", label: "Sem data" };
  const due = new Date(`${vaccine.dueDate}T12:00:00`);
  const diffDays = Math.ceil((due - now) / 86400000);
  if (diffDays < 0) return { type: "danger", label: "Vencida" };
  if (diffDays <= 30) return { type: "warn", label: `${diffDays} dia${diffDays === 1 ? "" : "s"}` };
  return { type: "ok", label: "Em dia" };
}

function travelProgress() {
  const items = Object.values(state.travel.items);
  if (!items.length) return 0;
  return Math.round((items.filter(Boolean).length / items.length) * 100);
}

function ownerAddress() {
  return [state.owner.address, state.owner.neighborhood, state.owner.city, state.owner.state].filter(Boolean).join(", ");
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
