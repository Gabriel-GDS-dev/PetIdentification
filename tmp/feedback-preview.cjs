const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../frontend');
const pets = ['Luna', 'Bob', 'Mel'].map((name, i) => ({ id: `test-${i}`, name, species: 'Gato', breed: 'SRD', sex: 'Fêmea', birthDate: '2022-01-01', notes: '', weight: '4.3' }));
const fixture = {
  auth: { currentUserEmail: 'teste@example.invalid', trustedDevice: true, apiToken: '' },
  users: [{ id: 'local-test', email: 'teste@example.invalid', name: 'Teste local' }],
  owner: { name: 'Teste local', email: 'teste@example.invalid' },
  selectedPetId: 'test-0', pets,
  vaccines: ['FIV', 'FeLV', 'V10', 'Raiva', 'Outra'].map((name, i) => ({ id: `v${i}`, petId: 'test-0', name, applicationDate: '2025-01-01', dueDate: '2026-11-03', clinic: 'Clínica de teste' })),
  documents: [{ id: 'doc', petId: 'test-0', title: 'Atestado de teste', kind: 'Atestado', date: '2026-10-01', expiresAt: '2026-11-04' }],
  travelByPet: {}, feedback: []
};
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:5243');
  if (url.pathname.startsWith('/api/')) { res.writeHead(503, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Prévia isolada: banco não conectado.' })); }
  const name = url.pathname === '/' || url.pathname === '/seed' ? '/index.html' : url.pathname;
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  try {
    let content = fs.readFileSync(file);
    if (url.pathname === '/seed') content = content.toString().replace('<head>', `<head><script>localStorage.setItem('pet-id-wallet-state-v1', ${JSON.stringify(JSON.stringify(fixture))});</script>`);
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(content);
  } catch { res.writeHead(404); res.end(); }
}).listen(5243, '127.0.0.1', () => console.log('Isolated fixture: http://127.0.0.1:5243/seed'));
