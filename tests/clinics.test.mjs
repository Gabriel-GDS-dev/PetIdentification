import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const databasePath = require.resolve('../backend/database');
require.cache[databasePath] = { loaded: true, exports: { createPoolWithSchema: async () => ({}) } };
const { handleRequest } = require('../backend/server');

async function nearby(params) {
  let status;
  let body;
  await handleRequest(
    { method: 'GET', headers: {}, url: `/api/clinics/nearby?${new URLSearchParams(params)}` },
    { writeHead: (code) => { status = code; }, end: (json) => { body = JSON.parse(json); } }
  );
  return { status, ...body };
}

const address = { address: 'Rua XV de Novembro', addressNumber: '123', city: 'Curitiba', state: 'PR' };
const mappedAddress = {
  road: address.address, house_number: address.addressNumber, city: address.city, 'ISO3166-2-lvl4': 'BR-PR'
};
const clinicNode = (id, lat) => ({
  type: 'node', id, lat, lon: -49.27, tags: { name: `Clínica ${id}`, amenity: 'veterinary' }
});

test('a busca por endereço ignora coordenadas antigas, confere a cidade e ordena apenas clínicas no raio', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'POST') {
      const query = new URLSearchParams(options.body).get('data');
      assert.match(query, /around:5000,-25\.43,-49\.27/);
      return Response.json({ elements: [clinicNode(1, -25.405), clinicNode(2, -25.429), clinicNode(3, -25.38)] });
    }
    assert.equal(new URL(url).searchParams.get('countrycodes'), 'br');
    return Response.json([
      { lat: '-23.55', lon: '-46.63', address: { ...mappedAddress, city: 'São Paulo' } },
      { lat: '-25.43', lon: '-49.27', address: mappedAddress }
    ]);
  });

  const result = await nearby({ ...address, lat: '-23.55', lon: '-46.63', source: 'address' });
  assert.equal(result.status, 200);
  assert.equal(result.origin.precision, 'number');
  assert.equal(result.radius, 5000);
  assert.deepEqual(result.clinics.map(({ id }) => id), ['node-2', 'node-1']);
});

test('o GPS ignora o endereço e a busca alternativa respeita o mesmo limite de 5 km', async (t) => {
  const radii = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'POST') {
      const query = new URLSearchParams(options.body).get('data');
      radii.push(...Array.from(query.matchAll(/around:(\d+),-25\.43,-49\.27/g), (match) => Number(match[1])));
      return Response.json({ elements: [] });
    }
    const params = new URL(url).searchParams;
    assert.equal(params.get('bounded'), '1');
    assert.ok(params.get('viewbox'));
    return Response.json([
      { osm_id: 1, lat: '-25.38', lon: '-49.27', type: 'veterinary' },
      { osm_id: 2, lat: '-25.429', lon: '-49.27', type: 'veterinary' }
    ]);
  });

  const result = await nearby({ ...address, lat: '-25.43', lon: '-49.27', source: 'gps' });
  assert.equal(result.status, 200);
  assert.equal(result.origin.source, 'gps');
  assert.ok(radii.length > 0);
  assert.deepEqual([...new Set(radii)], [5000]);
  assert.deepEqual(result.clinics.map(({ id }) => id), ['nominatim-place-2']);
});

test('um CEP novo não usa o endereço antigo de outra cidade', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'POST') return Response.json({ elements: [clinicNode(3, -23.55)] });
    if (new URL(url).hostname === 'viacep.com.br') {
      return Response.json({ cep: '01001-000', logradouro: 'Praça da Sé', localidade: 'São Paulo', uf: 'SP' });
    }
    if (new URL(url).hostname === 'brasilapi.com.br') {
      return Response.json({ location: { coordinates: { latitude: -23.55, longitude: -46.63 } } });
    }
    return Response.json([]);
  });
  assert.equal((await nearby({ ...address, cep: '01001000', source: 'address' })).status, 400);
  assert.equal((await nearby({ cep: '01001000', source: 'address' })).origin.source, 'cep');
});

test('a tela envia o endereço cadastrado e descarta a busca anterior ao trocar de origem', async () => {
  const app = readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');
  const requests = [];
  let gpsCalls = 0;
  const ctx = vm.createContext({
    state: { currentView: 'clinics', auth: { currentUserEmail: 'test@example.com' }, owner: {
      ...address, zipCode: '80000-000', latitude: -10, longitude: -20, locationSource: 'gps'
    } },
    document: { querySelector: () => null },
    window: { isSecureContext: true },
    navigator: { geolocation: { getCurrentPosition: (resolve) => {
      gpsCalls++;
      resolve({ coords: { latitude: 0, longitude: -49.27 } });
    } } },
    URLSearchParams,
    onlyDigits: (value) => value.replace(/\D/g, ''),
    apiRequest: (url) => new Promise((resolve) => requests.push({ params: new URL(url, 'https://example.com').searchParams, resolve }))
  });
  const source = app.slice(app.indexOf('let nearbyClinics'), app.indexOf('let clinicRequestId = 0;') + 'let clinicRequestId = 0;'.length)
    + '\n' + app.slice(app.indexOf('function renderClinicsList()'), app.indexOf('function feedbackView()'));
  vm.runInContext(source, ctx);

  const addressSearch = ctx.loadNearbyClinics('address');
  assert.equal(gpsCalls, 0);
  assert.equal(requests[0].params.get('cep'), '80000000');
  assert.equal(requests[0].params.get('lat'), null);
  const gpsSearch = ctx.loadNearbyClinics('gps');
  await new Promise(setImmediate);
  assert.equal(gpsCalls, 1);
  assert.equal(requests[1].params.get('lat'), '0');
  assert.equal(requests[1].params.get('cep'), null);
  requests[1].resolve({ clinics: [], radius: 5000, origin: { source: 'gps' } });
  await gpsSearch;
  requests[0].resolve({ clinics: [], radius: 5000, origin: { source: 'cep' } });
  await addressSearch;
  assert.equal(vm.runInContext('clinicOrigin.source', ctx), 'gps');
  assert.equal(ctx.state.owner.latitude, -10);
});
