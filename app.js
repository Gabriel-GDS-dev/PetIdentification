const STORAGE_KEY = "pet-id-wallet-state-v1";

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
  owner: {
    name: "Gabriela Souza",
    cpf: "123.456.789-00",
    phone: "(11) 98888-2026",
    email: "gabriela@email.com",
    address: "Rua das Palmeiras, 240",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
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

document.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  handleForm(form);
});

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;

  const { action: name } = action.dataset;
  const id = action.dataset.id;
  const view = action.dataset.view;

  if (name === "view") navigate(view);
  if (name === "drawer") openDrawer();
  if (name === "close-modal") closeModal();
  if (name === "new-pet") openPetModal();
  if (name === "edit-pet") openPetModal(id);
  if (name === "delete-pet") deletePet(id);
  if (name === "pet-wallet") {
    state.selectedPetId = id;
    navigate("wallet");
  }
  if (name === "new-vaccine") openVaccineModal(id || state.selectedPetId);
  if (name === "edit-owner") openOwnerModal();
  if (name === "save-travel") openTravelModal();
  if (name === "new-document") openDocumentModal(id || state.selectedPetId);
  if (name === "install") installApp();
  if (name === "dismiss-install") {
    state.installDismissed = true;
    saveState();
    render();
  }
  if (name === "export") exportData();
  if (name === "import") importData();
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

document.addEventListener("change", (event) => {
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
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(defaultState);
    const parsed = JSON.parse(stored);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      owner: { ...defaultState.owner, ...(parsed.owner || {}) },
      travel: {
        ...defaultState.travel,
        ...(parsed.travel || {}),
        items: { ...defaultState.travel.items, ...((parsed.travel || {}).items || {}) }
      }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  app.innerHTML = layout(screenTemplate());
}

function layout(content) {
  const active = state.currentView;
  return `
    <main class="screen">
      <header class="topbar">
        <button class="icon-button" type="button" data-action="drawer" aria-label="Abrir menu">☰</button>
        <div class="brand">
          <span class="brand-mark"><img src="./pet-icon.svg" alt="" /></span>
          <span>
            <span class="brand-title">Pet ID</span>
            <span class="brand-subtitle">${escapeHTML(state.owner.city)}, ${escapeHTML(state.owner.state)} · ${state.pets.length} pet${state.pets.length === 1 ? "" : "s"}</span>
          </span>
        </div>
        <div class="top-actions">
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

function homeView() {
  const selectedPet = getSelectedPet();
  const upcoming = getVaccines().filter((vaccine) => ["late", "soon"].includes(vaccineStatus(vaccine).type));
  const progress = travelProgress();
  return `
    <div class="hero">
      <div class="hero-copy">
        <span class="eyebrow">Carteira digital completa</span>
        <h1>Pet ID</h1>
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
          <p class="muted" style="margin-top: 8px;">Tudo fica salvo neste navegador pelo armazenamento local do dispositivo.</p>
          <div class="button-row" style="margin-top: 14px;">
            <button class="secondary-button" type="button" data-action="export">Exportar</button>
            <button class="secondary-button" type="button" data-action="import">Importar</button>
            <button class="danger-button" type="button" data-action="reset-demo">Restaurar demo</button>
          </div>
        </div>
      </div>
      <aside class="grid">
        ${installBanner(true)}
        <div class="card">
          <h2>Compatibilidade</h2>
          <div class="detail-list">
            ${detailRow("Android", "Instalável pelo Chrome ou Edge")}
            ${detailRow("iPhone", "Adicionar à Tela de Início pelo Safari")}
            ${detailRow("Offline", "Arquivos principais ficam em cache")}
          </div>
        </div>
      </aside>
    </section>
  `;
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

  return `
    <div class="install-banner ${canInstall || showIos || force ? "available" : ""}">
      <div>
        <strong>Instalar no celular</strong>
        <p class="small" style="margin-top: 2px;">Android e iOS como aplicativo PWA.</p>
      </div>
      <div class="button-row">
        ${canInstall ? `<button class="primary-button" type="button" data-action="install">Instalar</button>` : ""}
        <button class="ghost-button" type="button" data-action="dismiss-install" aria-label="Ocultar instalação">×</button>
      </div>
    </div>
  `;
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
    avatarColor: "#17716b"
  };

  openModal(`
    <div class="modal-head">
      <h2>${id ? "Editar pet" : "Novo pet"}</h2>
      <button class="icon-button" type="button" data-action="close-modal" aria-label="Fechar">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-form="pet">
        <input type="hidden" name="id" value="${escapeHTML(pet.id)}" />
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
          <span class="brand-mark"><img src="./pet-icon.svg" alt="" /></span>
          <span>
            <span class="brand-title">Pet ID</span>
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

function handleForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const type = form.dataset.form;

  if (type === "pet") {
    const pet = {
      ...data,
      id: data.id || `pet-${crypto.randomUUID()}`,
      weight: data.weight || "",
      avatarColor: data.avatarColor || "#17716b"
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
    state.vaccines.push({ ...data, id: `vac-${crypto.randomUUID()}` });
    state.selectedPetId = data.petId;
    notify("Vacina registrada.");
  }

  if (type === "document") {
    state.documents.push({ ...data, id: `doc-${crypto.randomUUID()}` });
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
  state = structuredClone(defaultState);
  saveState();
  notify("Demonstração restaurada.");
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pet-id-backup-${todayISO}.json`;
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
    notify("Use o menu do navegador para adicionar à tela inicial.");
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

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
}
