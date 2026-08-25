const PET_ACTIONS_STORAGE_KEY = "pet-id-wallet-state-v1";

const PET_ACTIONS_STYLE = `
.pet-action-link-card{cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;position:relative}
.pet-action-link-card:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(18,56,54,.08);border-color:rgba(42,201,167,.45)}
.pet-action-link-card::after{content:"›";position:absolute;right:18px;top:18px;font-size:24px;font-weight:800;opacity:.55}
.pet-record-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
.pet-record-modal{width:min(760px,calc(100vw - 28px));max-height:min(88dvh,820px);overflow:auto}
.pet-record-modal .modal-body{padding-top:8px}
.pet-record-modal .modal-actions{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px}
.pet-record-modal .modal-actions-right{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
.pet-record-modal .record-delete{margin-right:auto}
.pet-record-modal .record-delete.confirming{background:#b4232d;color:#fff}
.pet-record-hint{margin:-4px 0 14px}
`;

document.head.insertAdjacentHTML("beforeend", `<style>${PET_ACTIONS_STYLE}</style>`);

const petActionsObserver = new MutationObserver(() => enhancePetRecords());
petActionsObserver.observe(document.body, { childList: true, subtree: true });

document.addEventListener("click", handlePetRecordClick, true);

requestAnimationFrame(enhancePetRecords);

function readPetState() {
  try {
    return JSON.parse(localStorage.getItem(PET_ACTIONS_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function writePetState(nextState) {
  localStorage.setItem(PET_ACTIONS_STORAGE_KEY, JSON.stringify(nextState));
  window.location.reload();
}

function selectedPetId() {
  return readPetState()?.selectedPetId || "";
}

function enhancePetRecords() {
  const wallet = document.querySelector(".view-wallet");
  if (!wallet) return;

  wallet.querySelectorAll(".card").forEach((card) => {
    const heading = card.querySelector("h2")?.textContent?.trim().toLowerCase();
    if (heading !== "vacinas" && heading !== "documentos") return;
    if (card.dataset.petActionEnhanced === "true") return;

    card.dataset.petActionEnhanced = "true";
    card.classList.add("pet-action-link-card");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", heading === "vacinas" ? "Abrir tela de vacinas" : "Abrir documentos do pet");

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openPetSection(heading);
    });

    card.addEventListener("click", (event) => {
      if (event.target.closest("button,a,input,select,textarea")) return;
      openPetSection(heading);
    });
  });
}

function openPetSection(section) {
  const state = readPetState();
  if (!state) return;
  const pet = (state.pets || []).find((item) => item.id === state.selectedPetId) || state.pets?.[0];
  if (!pet) return;

  state.selectedPetId = pet.id;
  if (section === "vacinas") {
    state.currentView = "vaccines";
    localStorage.setItem(PET_ACTIONS_STORAGE_KEY, JSON.stringify(state));
    window.location.reload();
    return;
  }

  const documents = (state.documents || []).filter((doc) => doc.petId === pet.id);
  openDocumentsPicker(pet, documents);
}

function openDocumentsPicker(pet, documents) {
  const content = `
    <div class="modal-head">
      <div>
        <h2>Documentos de ${escapeHtml(pet.name)}</h2>
        <p class="muted small">Selecione um documento para editar ou excluir.</p>
      </div>
      <button class="icon-button" type="button" data-pet-record-action="close">×</button>
    </div>
    <div class="modal-body">
      ${documents.length ? `<div class="grid">${documents.map((doc) => `
        <button class="document-card" type="button" data-pet-record-action="edit-document" data-id="${escapeHtml(doc.id)}" style="text-align:left;width:100%;">
          <div class="document-card-content">
            <div class="document-top">
              <div>
                <h3>${escapeHtml(doc.title || "Documento")}</h3>
                <p class="muted small">${escapeHtml(doc.kind || "Documento")} · ${formatDateLocal(doc.date)}</p>
              </div>
              <span class="pill">${doc.expiresAt ? formatDateLocal(doc.expiresAt) : "Sem validade"}</span>
            </div>
            <p class="muted small">${escapeHtml(doc.notes || "Sem observações.")}</p>
          </div>
        </button>
      `).join("")}</div>` : `<div class="empty-state"><span class="empty-icon">□</span><div><h2>Sem documentos</h2><p class="muted">Use o botão ＋ Documento na carteira para cadastrar o primeiro.</p></div></div>`}
    </div>
  `;
  openPetModal(content);
}

function openDocumentEditor(id) {
  const state = readPetState();
  const doc = (state?.documents || []).find((item) => item.id === id);
  if (!doc) return;
  const pets = state.pets || [];
  const attachment = doc.attachment && typeof doc.attachment === "object" ? doc.attachment : null;

  const content = `
    <div class="modal-head">
      <div>
        <h2>Editar documento</h2>
        <p class="muted small">Atualize os dados ou exclua este registro.</p>
      </div>
      <button class="icon-button" type="button" data-pet-record-action="close">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-pet-record-form="document" data-id="${escapeHtml(doc.id)}">
        <div class="form-grid two">
          <div class="field">
            <label for="petRecordPetId">Pet</label>
            <select id="petRecordPetId" name="petId" required>
              ${pets.map((pet) => `<option value="${escapeHtml(pet.id)}" ${pet.id === doc.petId ? "selected" : ""}>${escapeHtml(pet.name)}</option>`).join("")}
            </select>
          </div>
          ${fieldHtml("Título", "title", doc.title, "text", true)}
          ${selectHtml("Tipo", "kind", doc.kind || "Outro", ["Viagem", "Exame", "Receita", "Atestado", "Outro"])}
          ${fieldHtml("Data", "date", doc.date, "date")}
          ${fieldHtml("Validade", "expiresAt", doc.expiresAt, "date")}
        </div>
        <div class="card" style="margin-top:4px;">
          <strong>Arquivo anexado</strong>
          <p class="muted small" style="margin-top:6px;">${attachment ? `${escapeHtml(attachment.name || "Arquivo")} · ${formatBytes(attachment.size)}` : "Nenhum arquivo anexado."}</p>
        </div>
        ${textareaHtml("Observações", "notes", doc.notes || "")}
        <div class="modal-actions">
          <button class="danger-button record-delete" type="button" data-pet-record-action="delete-document" data-id="${escapeHtml(doc.id)}">Excluir</button>
          <div class="modal-actions-right">
            <button class="secondary-button" type="button" data-pet-record-action="close">Cancelar</button>
            <button class="primary-button" type="submit">Salvar alterações</button>
          </div>
        </div>
      </form>
    </div>
  `;
  openPetModal(content);
}

function openVaccineEditor(id) {
  const state = readPetState();
  const vaccine = (state?.vaccines || []).find((item) => item.id === id);
  if (!vaccine) return;
  const pets = state.pets || [];

  const content = `
    <div class="modal-head">
      <div>
        <h2>Editar vacina</h2>
        <p class="muted small">Atualize os dados da vacinação ou exclua o registro.</p>
      </div>
      <button class="icon-button" type="button" data-pet-record-action="close">×</button>
    </div>
    <div class="modal-body">
      <form class="form" data-pet-record-form="vaccine" data-id="${escapeHtml(vaccine.id)}">
        <div class="form-grid two">
          <div class="field">
            <label for="petRecordVaccinePetId">Pet</label>
            <select id="petRecordVaccinePetId" name="petId" required>
              ${pets.map((pet) => `<option value="${escapeHtml(pet.id)}" ${pet.id === vaccine.petId ? "selected" : ""}>${escapeHtml(pet.name)}</option>`).join("")}
            </select>
          </div>
          ${fieldHtml("Vacina", "name", vaccine.name, "text", true)}
          ${fieldHtml("Dose", "dose", vaccine.dose)}
          ${fieldHtml("Data da aplicação", "applicationDate", vaccine.applicationDate, "date")}
          ${fieldHtml("Próxima dose", "dueDate", vaccine.dueDate, "date", true)}
          ${fieldHtml("Clínica", "clinic", vaccine.clinic)}
          ${fieldHtml("Veterinário", "veterinarian", vaccine.veterinarian)}
          ${fieldHtml("Lote", "batch", vaccine.batch)}
        </div>
        ${textareaHtml("Observações", "notes", vaccine.notes || "")}
        <div class="modal-actions">
          <button class="danger-button record-delete" type="button" data-pet-record-action="delete-vaccine" data-id="${escapeHtml(vaccine.id)}">Excluir</button>
          <div class="modal-actions-right">
            <button class="secondary-button" type="button" data-pet-record-action="close">Cancelar</button>
            <button class="primary-button" type="submit">Salvar alterações</button>
          </div>
        </div>
      </form>
    </div>
  `;
  openPetModal(content);
}

function enhanceVaccineList() {
  const list = document.querySelector("#vaccinesList");
  if (!list) return;
  const state = readPetState();
  if (!state) return;
  const vaccines = state.vaccines || [];
  list.querySelectorAll(".timeline-item").forEach((item) => {
    if (item.dataset.petActionEnhanced === "true") return;
    const heading = item.querySelector("h3")?.textContent?.trim();
    const petName = item.querySelector(".timeline-top .muted")?.textContent?.split("·")?.[0]?.trim();
    const vaccine = vaccines.find((entry) => entry.name === heading && ((state.pets || []).find((pet) => pet.id === entry.petId)?.name || "Pet removido") === petName);
    if (!vaccine) return;
    item.dataset.petActionEnhanced = "true";
    item.insertAdjacentHTML("beforeend", `<div class="pet-record-actions"><button class="ghost-button" type="button" data-pet-record-action="edit-vaccine" data-id="${escapeHtml(vaccine.id)}">Editar</button><button class="danger-button" type="button" data-pet-record-action="delete-vaccine" data-id="${escapeHtml(vaccine.id)}">Excluir</button></div>`);
  });
}

function enhanceDocumentsList() {
  document.querySelectorAll(".document-card").forEach((card) => {
    if (card.dataset.petActionEnhanced === "true") return;
    if (card.closest("[data-pet-record-modal]")) return;
    const title = card.querySelector("h3")?.textContent?.trim();
    if (!title) return;
    const state = readPetState();
    const doc = (state?.documents || []).find((entry) => entry.title === title);
    if (!doc) return;
    card.dataset.petActionEnhanced = "true";
    card.classList.add("pet-action-link-card");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Editar documento ${title}`);
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDocumentEditor(doc.id);
    });
    card.addEventListener("click", (event) => {
      if (event.target.closest("button,a,input,select,textarea")) return;
      openDocumentEditor(doc.id);
    });
  });
}

function handlePetRecordClick(event) {
  const action = event.target.closest("[data-pet-record-action]");
  if (!action) return;
  const name = action.dataset.petRecordAction;
  if (name === "close") {
    closePetModal();
    return;
  }
  if (name === "edit-document") {
    event.preventDefault();
    event.stopPropagation();
    openDocumentEditor(action.dataset.id);
    return;
  }
  if (name === "edit-vaccine") {
    event.preventDefault();
    event.stopPropagation();
    openVaccineEditor(action.dataset.id);
    return;
  }
  if (name === "delete-document") {
    event.preventDefault();
    event.stopPropagation();
    deleteDocument(action.dataset.id, action);
    return;
  }
  if (name === "delete-vaccine") {
    event.preventDefault();
    event.stopPropagation();
    deleteVaccine(action.dataset.id, action);
  }
}

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-pet-record-form]");
  if (!form) return;
  event.preventDefault();
  event.stopPropagation();
  savePetRecordForm(form);
}, true);

function savePetRecordForm(form) {
  const state = readPetState();
  if (!state) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const type = form.dataset.petRecordForm;
  const id = form.dataset.id;

  if (type === "document") {
    const index = (state.documents || []).findIndex((doc) => doc.id === id);
    if (index < 0) return;
    state.documents[index] = { ...state.documents[index], ...data };
    state.selectedPetId = data.petId;
    writePetState(state);
    return;
  }

  if (type === "vaccine") {
    const index = (state.vaccines || []).findIndex((vaccine) => vaccine.id === id);
    if (index < 0) return;
    state.vaccines[index] = { ...state.vaccines[index], ...data };
    state.selectedPetId = data.petId;
    writePetState(state);
  }
}

function deleteDocument(id, button) {
  const state = readPetState();
  if (!state) return;
  const doc = (state.documents || []).find((item) => item.id === id);
  if (!doc) return;
  if (button.dataset.confirmed !== "true") {
    button.dataset.confirmed = "true";
    button.textContent = "Confirmar exclusão";
    button.classList.add("confirming");
    return;
  }
  state.documents = (state.documents || []).filter((item) => item.id !== id);
  writePetState(state);
}

function deleteVaccine(id, button) {
  const state = readPetState();
  if (!state) return;
  const vaccine = (state.vaccines || []).find((item) => item.id === id);
  if (!vaccine) return;
  if (button.dataset.confirmed !== "true") {
    button.dataset.confirmed = "true";
    button.textContent = "Confirmar exclusão";
    button.classList.add("confirming");
    return;
  }
  state.vaccines = (state.vaccines || []).filter((item) => item.id !== id);
  writePetState(state);
}

function openPetModal(content) {
  closePetModal();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.dataset.petRecordModal = "true";
  backdrop.innerHTML = `<section class="modal pet-record-modal" role="dialog" aria-modal="true">${content}</section>`;
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closePetModal();
  });
  document.body.appendChild(backdrop);
  backdrop.querySelector("input:not([type='hidden']),select,textarea,button")?.focus();
}

function closePetModal() {
  document.querySelectorAll("[data-pet-record-modal]").forEach((modal) => modal.remove());
}

function fieldHtml(label, name, value = "", type = "text", required = false) {
  return `<div class="field"><label for="petRecord-${name}">${label}</label><input id="petRecord-${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? "required" : ""} /></div>`;
}

function selectHtml(label, name, value, options) {
  return `<div class="field"><label for="petRecord-${name}">${label}</label><select id="petRecord-${name}" name="${name}">${options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
}

function textareaHtml(label, name, value = "") {
  return `<div class="field"><label for="petRecord-${name}">${label}</label><textarea id="petRecord-${name}" name="${name}">${escapeHtml(value)}</textarea></div>`;
}

function formatDateLocal(value) {
  if (!value) return "Não informado";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function refreshEnhancements() {
  enhancePetRecords();
  enhanceVaccineList();
  enhanceDocumentsList();
}

setInterval(refreshEnhancements, 700);
