const PET_ACTIONS_FIX_STORAGE_KEY = "pet-id-wallet-state-v1";

(function keepPetRecordActionsAlive() {
  let scheduled = false;

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensurePetRecordActions();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("load", schedule);
  setInterval(schedule, 350);
  schedule();

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(PET_ACTIONS_FIX_STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function ensurePetRecordActions() {
    const state = readState();
    if (!state?.selectedPetId) return;
    const petId = state.selectedPetId;
    const vaccines = (state.vaccines || []).filter((item) => item.petId === petId);
    const documents = (state.documents || []).filter((item) => item.petId === petId);

    document.querySelectorAll(".screen-grid .card").forEach((card) => {
      const title = card.querySelector("h2")?.textContent?.trim().toLowerCase();
      if (title !== "vacinas" && title !== "documentos") return;
      card.classList.add("pet-action-card");
      card.dataset.petRecordKeepAlive = "true";

      if (title === "vacinas") {
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        if (!card.dataset.petRecordKeepAliveClick) {
          card.dataset.petRecordKeepAliveClick = "true";
          card.addEventListener("click", (event) => {
            if (event.target.closest("button,a,input,select,textarea")) return;
            const next = readState();
            if (!next) return;
            next.currentView = "vaccines";
            localStorage.setItem(PET_ACTIONS_FIX_STORAGE_KEY, JSON.stringify(next));
            window.location.reload();
          });
          card.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            const next = readState();
            if (!next) return;
            next.currentView = "vaccines";
            localStorage.setItem(PET_ACTIONS_FIX_STORAGE_KEY, JSON.stringify(next));
            window.location.reload();
          });
        }
      }

      if (title === "documentos" && documents.length === 1) {
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        if (!card.dataset.petRecordKeepAliveClick) {
          card.dataset.petRecordKeepAliveClick = "true";
          const edit = () => {
            const button = card.querySelector("[data-pet-record-action='edit-document']");
            button?.click();
          };
          card.addEventListener("click", (event) => {
            if (event.target.closest("button,a,input,select,textarea")) return;
            edit();
          });
          card.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            edit();
          });
        }
      }
    });

    ensureVaccineEntryActions(vaccines);
    ensureDocumentEntryActions(documents);
  }

  function ensureVaccineEntryActions(vaccines) {
    document.querySelectorAll(".timeline-item").forEach((item) => {
      if (item.querySelector("[data-pet-record-action='edit-vaccine']")) return;
      const name = item.querySelector("h3")?.textContent?.trim();
      const vaccine = vaccines.find((entry) => entry.name === name);
      if (!vaccine) return;
      const actions = document.createElement("div");
      actions.className = "pet-record-actions";
      actions.innerHTML = `<button class="ghost-button" type="button" data-pet-record-action="edit-vaccine" data-id="${escapeAttribute(vaccine.id)}">Editar</button><button class="danger-button" type="button" data-pet-record-action="delete-vaccine" data-id="${escapeAttribute(vaccine.id)}">Excluir</button>`;
      item.appendChild(actions);
    });
  }

  function ensureDocumentEntryActions(documents) {
    document.querySelectorAll(".document-card").forEach((card) => {
      if (card.querySelector("[data-pet-record-action='edit-document']")) return;
      const title = card.querySelector("h3")?.textContent?.trim();
      const doc = documents.find((entry) => entry.title === title);
      if (!doc) return;
      const actions = document.createElement("div");
      actions.className = "pet-record-actions";
      actions.innerHTML = `<button class="ghost-button" type="button" data-pet-record-action="edit-document" data-id="${escapeAttribute(doc.id)}">Editar</button><button class="danger-button" type="button" data-pet-record-action="delete-document" data-id="${escapeAttribute(doc.id)}">Excluir</button>`;
      card.appendChild(actions);
      card.classList.add("pet-action-card");
    });
  }

  function escapeAttribute(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
})();
