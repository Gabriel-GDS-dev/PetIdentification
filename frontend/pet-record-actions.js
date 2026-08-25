const PET_ACTIONS_STORAGE_KEY = "pet-id-wallet-state-v1";

const PET_ACTIONS_STYLE = `
.pet-action-card{cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;position:relative}
.pet-action-card:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(18,56,54,.08);border-color:rgba(42,201,167,.45)}
.pet-action-card:focus{outline:2px solid rgba(42,201,167,.7);outline-offset:2px}
.pet-action-card::after{content:"›";position:absolute;right:18px;top:18px;font-size:24px;font-weight:800;opacity:.45}
.pet-record-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
.pet-record-modal{width:min(760px,calc(100vw - 28px));max-height:min(90dvh,850px);overflow:auto}
.pet-record-modal .modal-body{padding-top:8px}
.pet-record-modal .modal-actions{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px}
.pet-record-modal .modal-actions-right{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
.pet-record-modal .record-delete{margin-right:auto}
.pet-record-modal .record-delete.confirming{background:#b4232d;color:#fff}
.pet-record-file-preview{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid rgba(127,145,143,.25);border-radius:14px;margin-top:8px}
.pet-record-file-preview img{width:64px;height:64px;object-fit:cover;border-radius:10px}
`;
document.head.insertAdjacentHTML("beforeend", `<style>${PET_ACTIONS_STYLE}</style>`);

let lastPetActionSignature = "";
const petActionsObserver = new MutationObserver(() => enhancePetScreen());
petActionsObserver.observe(document.body, { childList: true, subtree: true });
document.addEventListener("click", handlePetRecordClick, true);
requestAnimationFrame(enhancePetScreen);

function readPetState() {
  try { return JSON.parse(localStorage.getItem(PET_ACTIONS_STORAGE_KEY) || "null"); } catch { return null; }
}

function savePetState(nextState) {
  localStorage.setItem(PET_ACTIONS_STORAGE_KEY, JSON.stringify(nextState));
  window.location.reload();
}

function enhancePetScreen() {
  const state = readPetState();
  if (!state?.selectedPetId) return;
  const pet = (state.pets || []).find((item) => item.id === state.selectedPetId);
  if (!pet) return;

  const signature = `${state.selectedPetId}:${location.pathname}:${document.querySelectorAll(".screen-grid").length}`;
  if (signature === lastPetActionSignature && document.querySelector("[data-pet-record-ready]")) return;
  lastPetActionSignature = signature;

  // These are the exact two cards in the pet screen requested by the user.
  document.querySelectorAll(".screen-grid .card").forEach((card) => {
    const title = card.querySelector("h2")?.textContent?.trim().toLowerCase();
    if (title !== "vacinas" && title !== "documentos") return;
    if (card.dataset.petRecordReady === "true") return;
    card.dataset.petRecordReady = "true";
    card.classList.add("pet-action-card");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.dataset.petRecordCard = title;
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openPetSection(title);
    });
    card.addEventListener("click", (event) => {
      if (event.target.closest("button,a,input,select,textarea")) return;
      openPetSection(title);
    });
  });

  // Make each vaccine/document entry directly editable as well.
  enhanceVaccineItems(state, pet.id);
  enhanceDocumentItems(state, pet.id);
  document.body.dataset.petRecordReady = "true";
}

function enhanceVaccineItems(state, petId) {
  const vaccines = (state.vaccines || []).filter((item) => item.petId === petId);
  document.querySelectorAll(".timeline-item").forEach((item) => {
    if (item.dataset.petRecordEntry === "true") return;
    const name = item.querySelector("h3")?.textContent?.trim();
    const vaccine = vaccines.find((entry) => entry.name === name);
    if (!vaccine) return;
    item.dataset.petRecordEntry = "true";
    item.insertAdjacentHTML("beforeend", `<div class="pet-record-actions"><button class="ghost-button" type="button" data-pet-record-action="edit-vaccine" data-id="${escapeHtml(vaccine.id)}">Editar</button><button class="danger-button" type="button" data-pet-record-action="delete-vaccine" data-id="${escapeHtml(vaccine.id)}">Excluir</button></div>`);
  });
}

function enhanceDocumentItems(state, petId) {
  const documents = (state.documents || []).filter((item) => item.petId === petId);
  document.querySelectorAll(".document-card").forEach((card) => {
    if (card.dataset.petRecordEntry === "true") return;
    const title = card.querySelector("h3")?.textContent?.trim();
    const doc = documents.find((entry) => entry.title === title);
    if (!doc) return;
    card.dataset.petRecordEntry = "true";
    card.classList.add("pet-action-card");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
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

function openPetSection(section) {
  const state = readPetState();
  const pet = (state?.pets || []).find((item) => item.id === state?.selectedPetId);
  if (!state || !pet) return;

  if (section === "vacinas") {
    state.currentView = "vaccines";
    localStorage.setItem(PET_ACTIONS_STORAGE_KEY, JSON.stringify(state));
    window.location.reload();
    return;
  }

  const docs = (state.documents || []).filter((doc) => doc.petId === pet.id);
  if (docs.length === 1) openDocumentEditor(docs[0].id);
  else openDocumentsPicker(pet, docs);
}

function handlePetRecordClick(event) {
  const action = event.target.closest("[data-pet-record-action]");
  if (!action) return;
  const name = action.dataset.petRecordAction;
  event.preventDefault();
  event.stopPropagation();

  if (name === "close") return closePetRecordModal();
  if (name === "edit-vaccine") return openVaccineEditor(action.dataset.id);
  if (name === "delete-vaccine") return deleteVaccine(action.dataset.id, action);
  if (name === "edit-document") return openDocumentEditor(action.dataset.id);
  if (name === "delete-document") return deleteDocument(action.dataset.id, action);
}

function openDocumentsPicker(pet, documents) {
  openPetRecordModal(`
    <div class="modal-head"><div><h2>Documentos de ${escapeHtml(pet.name)}</h2><p class="muted small">Escolha o documento que deseja editar ou excluir.</p></div><button class="icon-button" type="button" data-pet-record-action="close">×</button></div>
    <div class="modal-body">
      ${documents.length ? `<div class="grid">${documents.map((doc) => `<button class="document-card" type="button" data-pet-record-action="edit-document" data-id="${escapeHtml(doc.id)}" style="text-align:left;width:100%;"><div class="document-card-content"><div class="document-top"><div><h3>${escapeHtml(doc.title || "Documento")}</h3><p class="muted small">${escapeHtml(doc.kind || "Documento")} · ${formatDateLocal(doc.date)}</p></div><span class="pill">${doc.expiresAt ? formatDateLocal(doc.expiresAt) : "Sem validade"}</span></div><p class="muted small">${escapeHtml(doc.notes || "Sem observações.")}</p></div></button>`).join("")}</div>` : `<div class="empty-state"><span class="empty-icon">□</span><div><h2>Sem documentos</h2><p class="muted">Cadastre o primeiro documento pela opção ＋ Documento.</p></div></div>`}
    </div>
  `);
}

function openVaccineEditor(id) {
  const state = readPetState();
  const vaccine = (state?.vaccines || []).find((item) => item.id === id);
  if (!vaccine) return;
  const pets = state.pets || [];
  openPetRecordModal(`
    <div class="modal-head"><div><h2>Editar vacina</h2><p class="muted small">Edite os dados desta vacinação.</p></div><button class="icon-button" type="button" data-pet-record-action="close">×</button></div>
    <div class="modal-body">
      <form class="form" data-pet-record-form="vaccine" data-id="${escapeHtml(id)}">
        <div class="form-grid two">
          ${petSelectHtml("Pet", "petId", vaccine.petId, pets)}
          ${fieldHtml("Vacina", "name", vaccine.name, "text", true)}
          ${fieldHtml("Dose", "dose", vaccine.dose)}
          ${fieldHtml("Data da aplicação", "applicationDate", vaccine.applicationDate, "date")}
          ${fieldHtml("Próxima dose", "dueDate", vaccine.dueDate, "date", true)}
          ${fieldHtml("Clínica", "clinic", vaccine.clinic)}
          ${fieldHtml("Veterinário", "veterinarian", vaccine.veterinarian)}
          ${fieldHtml("Lote", "batch", vaccine.batch)}
        </div>
        ${textareaHtml("Observações", "notes", vaccine.notes || "")}
        <div class="modal-actions"><button class="danger-button record-delete" type="button" data-pet-record-action="delete-vaccine" data-id="${escapeHtml(id)}">Excluir</button><div class="modal-actions-right"><button class="secondary-button" type="button" data-pet-record-action="close">Cancelar</button><button class="primary-button" type="submit">Salvar alterações</button></div></div>
      </form>
    </div>
  `);
}

function openDocumentEditor(id) {
  const state = readPetState();
  const doc = (state?.documents || []).find((item) => item.id === id);
  if (!doc) return;
  const pets = state.pets || [];
  const attachment = doc.attachment && typeof doc.attachment === "object" ? doc.attachment : null;
  const fileId = `pet-record-file-${Date.now()}`;
  openPetRecordModal(`
    <div class="modal-head"><div><h2>Editar documento</h2><p class="muted small">Altere as informações, substitua o arquivo ou exclua o documento.</p></div><button class="icon-button" type="button" data-pet-record-action="close">×</button></div>
    <div class="modal-body">
      <form class="form" data-pet-record-form="document" data-id="${escapeHtml(id)}">
        <div class="form-grid two">
          ${petSelectHtml("Pet", "petId", doc.petId, pets)}
          ${fieldHtml("Título", "title", doc.title, "text", true)}
          ${selectHtml("Tipo", "kind", doc.kind || "Outro", ["Viagem", "Exame", "Receita", "Atestado", "Outro"])}
          ${fieldHtml("Data", "date", doc.date, "date")}
          ${fieldHtml("Validade", "expiresAt", doc.expiresAt, "date")}
        </div>
        <input type="hidden" name="attachment" value="${escapeHtml(attachment ? JSON.stringify(attachment) : "")}" data-pet-record-attachment />
        <div class="field"><label>Arquivo</label><div data-pet-record-file-preview>${attachment ? filePreviewHtml(attachment) : `<div class="pet-record-file-preview"><span>PDF</span><strong>Nenhum arquivo anexado</strong></div>`}</div><div class="button-row" style="margin-top:8px"><label class="secondary-button" for="${fileId}">Escolher arquivo</label><input id="${fileId}" class="hidden" type="file" accept="image/*,.pdf,application/pdf" data-pet-record-file /></div></div>
        ${textareaHtml("Observações", "notes", doc.notes || "")}
        <div class="modal-actions"><button class="danger-button record-delete" type="button" data-pet-record-action="delete-document" data-id="${escapeHtml(id)}">Excluir</button><div class="modal-actions-right"><button class="secondary-button" type="button" data-pet-record-action="close">Cancelar</button><button class="primary-button" type="submit">Salvar alterações</button></div></div>
      </form>
    </div>
  `);

  const input = document.querySelector(`[data-pet-record-file][id="${fileId}"]`);
  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { alert("O arquivo deve ter no máximo 1,5 MB."); input.value = ""; return; }
    const dataUrl = await readFileAsDataUrl(file);
    const next = { name: file.name, type: file.type, size: file.size, dataUrl, uploadedAt: new Date().toISOString() };
    const form = input.closest("form");
    form.querySelector("[data-pet-record-attachment]").value = JSON.stringify(next);
    form.querySelector("[data-pet-record-file-preview]").innerHTML = filePreviewHtml(next);
  });
}

function savePetRecordForm(form) {
  const state = readPetState();
  if (!state) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const type = form.dataset.petRecordForm;
  const id = form.dataset.id;

  if (type === "vaccine") {
    const index = (state.vaccines || []).findIndex((item) => item.id === id);
    if (index < 0) return;
    state.vaccines[index] = { ...state.vaccines[index], ...data };
    state.selectedPetId = data.petId;
    savePetState(state);
    return;
  }

  if (type === "document") {
    const index = (state.documents || []).findIndex((item) => item.id === id);
    if (index < 0) return;
    let attachment = state.documents[index].attachment || null;
    try { attachment = data.attachment ? JSON.parse(data.attachment) : null; } catch {}
    state.documents[index] = { ...state.documents[index], ...data, attachment };
    delete state.documents[index].attachmentString;
    state.selectedPetId = data.petId;
    savePetState(state);
  }
}

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-pet-record-form]");
  if (!form) return;
  event.preventDefault();
  event.stopPropagation();
  savePetRecordForm(form);
}, true);

function deleteVaccine(id, button) {
  const state = readPetState();
  if (!state) return;
  if (button.dataset.confirmed !== "true") {
    button.dataset.confirmed = "true";
    button.textContent = "Confirmar exclusão";
    button.classList.add("confirming");
    return;
  }
  state.vaccines = (state.vaccines || []).filter((item) => item.id !== id);
  savePetState(state);
}

function deleteDocument(id, button) {
  const state = readPetState();
  if (!state) return;
  if (button.dataset.confirmed !== "true") {
    button.dataset.confirmed = "true";
    button.textContent = "Confirmar exclusão";
    button.classList.add("confirming");
    return;
  }
  state.documents = (state.documents || []).filter((item) => item.id !== id);
  savePetState(state);
}

function openPetRecordModal(content) {
  closePetRecordModal();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.dataset.petRecordModal = "true";
  backdrop.innerHTML = `<section class="modal pet-record-modal" role="dialog" aria-modal="true">${content}</section>`;
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closePetRecordModal(); });
  document.body.appendChild(backdrop);
  backdrop.querySelector("input,select,textarea,button")?.focus();
}

function closePetRecordModal() { document.querySelectorAll("[data-pet-record-modal]").forEach((item) => item.remove()); }

function fieldHtml(label, name, value = "", type = "text", required = false) { return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? "required" : ""}></div>`; }
function textareaHtml(label, name, value = "") { return `<div class="field"><label>${label}</label><textarea name="${name}">${escapeHtml(value)}</textarea></div>`; }
function selectHtml(label, name, value, options) { return `<div class="field"><label>${label}</label><select name="${name}">${options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`; }
function petSelectHtml(label, name, value, pets) { return `<div class="field"><label>${label}</label><select name="${name}" required>${pets.map((pet) => `<option value="${escapeHtml(pet.id)}" ${pet.id === value ? "selected" : ""}>${escapeHtml(pet.name)}</option>`).join("")}</select></div>`; }
function formatDateLocal(value) { if (!value) return "Não informado"; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR").format(date); }
function filePreviewHtml(file) { const isImage = String(file.type || "").startsWith("image/") || String(file.dataUrl || "").startsWith("data:image/"); return `<div class="pet-record-file-preview">${isImage ? `<img src="${escapeHtml(file.dataUrl)}" alt="Arquivo anexado">` : `<span>${String(file.type || "").includes("pdf") ? "PDF" : "ARQ"}</span>`}<strong>${escapeHtml(file.name || "Arquivo")}</strong></div>`; }
function readFileAsDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
function escapeHtml(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

// Keep the enhancements alive after the app's own render() replaces the DOM.
setInterval(enhancePetScreen, 500);
