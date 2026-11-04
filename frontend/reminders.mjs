// Compare calendar dates without time-of-day or daylight-saving rounding.
export function daysUntil(value, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const stamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(stamp);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return Math.round((stamp - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}

export function deadlineStatus(date, today = new Date()) {
  const days = daysUntil(date, today);
  if (days === null) return { type: "warn", filterKey: "unknown", label: "Sem data válida" };
  if (days < 0) return { type: "danger", filterKey: "late", label: "Vencida" };
  if (days === 0) return { type: "warn", filterKey: "soon", label: "Vence hoje" };
  if (days <= 30) return { type: "warn", filterKey: "soon", label: `Em ${days} dia${days === 1 ? "" : "s"}` };
  return { type: "ok", filterKey: "ok", label: "Em dia" };
}

export function vaccineSummary(vaccines, today = new Date()) {
  if (!vaccines.length) return { type: "warn", label: "Sem vacinas cadastradas" };
  const late = vaccines.filter(v => deadlineStatus(v.dueDate, today).filterKey === "late");
  if (late.length) {
    const names = late.slice(0, 2).map(v => v.name).join(", ");
    return { type: "danger", label: `${late.length} vencida${late.length === 1 ? "" : "s"}: ${names}${late.length > 2 ? ` e mais ${late.length - 2}` : ""}` };
  }
  const unknown = vaccines.filter(v => daysUntil(v.dueDate, today) === null);
  if (unknown.length) return { type: "warn", label: `${unknown.length} vacina(s) sem próxima dose definida` };
  const soon = vaccines.filter(v => deadlineStatus(v.dueDate, today).filterKey === "soon");
  if (soon.length) return { type: "warn", label: `${soon.length} próxima(s) do prazo` };
  return { type: "ok", label: "Registros em dia" };
}

export function buildReminders({ pets = [], vaccines = [], documents = [], travelByPet = {} }, today = new Date()) {
  const alerts = [];
  for (const pet of pets) {
    for (const vaccine of vaccines.filter(v => v.petId === pet.id)) {
      const status = deadlineStatus(vaccine.dueDate, today);
      if (status.filterKey === "ok") continue;
      alerts.push({ kind: "vaccine", petId: pet.id, id: vaccine.id, title: vaccine.name,
        detail: `${pet.name} · ${status.label}`, type: status.type, date: vaccine.dueDate || "" });
    }
    for (const doc of documents.filter(d => d.petId === pet.id && d.expiresAt)) {
      const status = deadlineStatus(doc.expiresAt, today);
      if (status.filterKey === "ok") continue;
      alerts.push({ kind: "document", petId: pet.id, id: doc.id, title: doc.title,
        detail: `${pet.name} · Documento: ${status.label.toLowerCase()}`, type: status.type, date: doc.expiresAt });
    }
    const trip = travelByPet[pet.id];
    const days = daysUntil(trip?.date, today);
    if (days === null || days < 0 || days > 30 || !trip?.destination) continue;
    const pending = Object.values(trip.items || {}).filter(done => !done).length;
    if (!pending) continue;
    alerts.push({ kind: "travel", petId: pet.id, id: pet.id, title: `Viagem para ${trip.destination}`,
      detail: `${pet.name} · ${days === 0 ? "Hoje" : `Em ${days} dia(s)`} · ${pending} item(ns) pendente(s)`, type: "warn", date: trip.date });
  }
  return alerts.sort((a, b) => (a.type === "danger" ? 0 : 1) - (b.type === "danger" ? 0 : 1) || a.date.localeCompare(b.date));
}
