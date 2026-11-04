import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { daysUntil, deadlineStatus, vaccineSummary, buildReminders } from '../frontend/reminders.mjs';

const today = new Date(2026, 10, 4, 23, 59);
test('calendar deadlines do not move with time of day; malformed dates stay unknown', () => {
  assert.equal(daysUntil('2026-11-04', today), 0);
  assert.equal(daysUntil('2026-11-03', today), -1);
  assert.equal(daysUntil('2026-02-30', today), null);
  assert.equal(deadlineStatus('', today).filterKey, 'unknown');
  assert.equal(deadlineStatus('2026-11-04', today).label, 'Vence hoje');
  assert.equal(deadlineStatus('2026-12-04', today).filterKey, 'soon');
  assert.equal(deadlineStatus('2026-12-05', today).filterKey, 'ok');
});
test('summary counts all overdue vaccines, showing two names plus remaining count', () => {
  const vaccines = ['FIV', 'FeLV', 'V10', 'Raiva', 'Outra'].map(name => ({ name, dueDate: '2026-11-03' }));
  assert.equal(vaccineSummary(vaccines, today).label, '5 vencidas: FIV, FeLV e mais 3');
  assert.equal(vaccineSummary([], today).type, 'warn');
  assert.equal(vaccineSummary([{ name: 'V10' }], today).type, 'warn');
});
test('all overdue vaccines remain individually available; orphaned records are omitted', () => {
  const items = buildReminders({ pets: [{ id: 'a', name: 'Luna' }], vaccines: [
    ...['one', 'two', 'three'].map(id => ({ id, petId: 'a', name: id, dueDate: '2026-11-03' })),
    { id: 'orphan', petId: 'removed', dueDate: '2026-11-03' }
  ] }, today);
  assert.equal(items.length, 3);
  assert(items.every(item => item.type === 'danger' && item.petId === 'a'));
});
test('documents and upcoming trips are included, completed and past trips excluded', () => {
  const data = { pets: [{ id: 'a', name: 'Luna' }, { id: 'b', name: 'Bob' }],
    documents: [{ id: 'd', petId: 'a', title: 'Atestado', expiresAt: '2026-11-04' }],
    travelByPet: { a: { destination: 'Praia', date: '2026-11-05', items: { food: false } },
      b: { destination: 'Serra', date: '2026-11-03', items: { food: false } } } };
  assert.deepEqual(buildReminders(data, today).map(item => item.kind), ['document', 'travel']);
  data.travelByPet.a.items.food = true;
  assert.equal(buildReminders(data, today).length, 1);
});

function travelContext() {
  const source = readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');
  const functions = source.slice(source.indexOf('function blankTravel()'), source.indexOf('async function handleForm('))
    + source.slice(source.indexOf('function updateTravelChecklist('), source.indexOf('function notificationsView('));
  const context = vm.createContext({ state: { pets: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], selectedPetId: 'a', travelByPet: {} } });
  vm.runInContext(functions, context);
  return context;
}
test('shared checklist updates and deletions propagate only to pets in the group', () => {
  const ctx = travelContext();
  for (const id of ['a', 'b', 'c']) ctx.setTravelForPet(id, { sharedGroupId: id === 'c' ? '' : 'group', items: { 'custom:Remédio': false } });
  const trip = ctx.getTravelForPet('a');
  trip.items.food = true;
  delete trip.items['custom:Remédio'];
  ctx.updateTravelChecklist('a', trip.items);
  assert.equal(ctx.getTravelForPet('b').items.food, true);
  assert.equal(ctx.getTravelForPet('c').items.food, false);
  assert.equal(Object.hasOwn(ctx.getTravelForPet('b').items, 'custom:Remédio'), false);
  assert.equal(Object.hasOwn(ctx.getTravelForPet('c').items, 'custom:Remédio'), true);
});
test('individual checklists and groups survive JSON persistence', () => {
  const ctx = travelContext();
  ctx.setTravelForPet('a', { sharedGroupId: 'group', items: { food: true, 'custom:Insulina': false } });
  ctx.setTravelForPet('b', { items: { food: false } });
  ctx.state.travelByPet = ctx.normalizeTravelByPet(JSON.parse(JSON.stringify(ctx.state.travelByPet)));
  assert.equal(ctx.getTravelForPet('a').sharedGroupId, 'group');
  assert.equal(ctx.getTravelForPet('a').items.food, true);
  assert.equal(ctx.getTravelForPet('b').items.food, false);
  assert.equal(ctx.travelProgressForPet('a'), 13);
});
