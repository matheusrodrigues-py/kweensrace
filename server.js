const http = require('node:http');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { createClient } = require('@supabase/supabase-js');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 5500;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'drag-media';
const STAFF_USER = process.env.STAFF_USER || 'admin';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !STAFF_PASSWORD) {
  console.error('Variáveis obrigatórias ausentes: SUPABASE_URL, SUPABASE_SECRET_KEY e STAFF_PASSWORD.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
const sessions = new Map();
const loginAttempts = new Map();
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.pdf': 'application/pdf'
};

const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};
const safe = (value, max = 3000) => String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const protocol = () => `KDR-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(item => item.trim().split('=').map(decodeURIComponent)));
const secureEqual = (a, b) => {
  const left = Buffer.from(String(a)); const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

function authenticatedUser(req) {
  const sid = cookies(req).kweens_session;
  const session = sid && sessions.get(sid);
  if (!session || session.expiresAt < Date.now()) { if (sid) sessions.delete(sid); return null; }
  return { username: session.username };
}
function requireUser(req, res) {
  const current = authenticatedUser(req);
  if (!current) json(res, 401, { error: 'Sessão inválida ou expirada.' });
  return current;
}
async function bodyJson(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 1e6) throw Error('Corpo muito grande'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}
function loginAllowed(ip) {
  const now = Date.now(); const record = loginAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60e3 };
  if (record.resetAt < now) { record.count = 0; record.resetAt = now + 15 * 60e3; }
  record.count += 1; loginAttempts.set(ip, record); return record.count <= 8;
}

async function createApplication(req, res) {
  const request = new Request('http://local/api/applications', { method: 'POST', headers: req.headers, body: Readable.toWeb(req), duplex: 'half' });
  const form = await request.formData();
  const required = ['nomeCompleto','nomeDrag','nascimento','cidade','estado','pais','instagram','email','whatsapp','historiaPersonagem','estilo','referencias','diferenciais','experienciaIA','disponibilidade'];
  for (const key of required) if (!safe(form.get(key))) return json(res, 422, { error: `Campo obrigatório ausente: ${key}` });
  const birth = new Date(form.get('nascimento'));
  if (!Number.isFinite(birth.getTime()) || (Date.now() - birth.getTime()) / 31557600000 < 18) return json(res, 422, { error: 'A candidata deve ter 18 anos ou mais.' });

  const files = [];
  for (const field of ['fotoRosto','fotoCorpo','fotoEditorial']) {
    const file = form.get(field);
    if (!file || typeof file === 'string' || !file.size) return json(res, 422, { error: 'As três fotos são obrigatórias.' });
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return json(res, 422, { error: 'Envie somente imagens JPG, PNG ou WEBP.' });
    if (file.size > 8 * 1024 * 1024) return json(res, 422, { error: 'Cada imagem deve ter no máximo 8 MB.' });
    files.push({ field, file });
  }

  const personalData = {}, artisticProfile = {};
  ['nomeCompleto','nomeDrag','nascimento','cidade','estado','pais','instagram','email','whatsapp'].forEach(key => personalData[key] = safe(form.get(key), 500));
  ['historiaPersonagem','estilo','referencias','diferenciais','experienciaIA','ferramentasIA','disponibilidade'].forEach(key => artisticProfile[key] = safe(form.get(key), 5000));
  const consents = { termos: form.get('termos') === 'on', imagem: form.get('imagem') === 'on', maioridade: form.get('maioridade') === 'on', privacidade: form.get('privacidade') === 'on' };
  if (Object.values(consents).some(value => !value)) return json(res, 422, { error: 'Todos os consentimentos são obrigatórios.' });

  const applicationProtocol = protocol(); const uploadedPaths = [];
  try {
    for (const { field, file } of files) {
      const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
      const storagePath = `${applicationProtocol}/${field}-${crypto.randomUUID()}${ext}`;
      const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
      if (error) throw error;
      uploadedPaths.push({ field_name: field, original_name: safe(file.name, 255), storage_path: storagePath, mime_type: file.type, size: file.size });
    }
    const { data: application, error: appError } = await supabase.from('applications').insert({ protocol: applicationProtocol, personal_data: personalData, artistic_profile: artisticProfile, consents }).select('id,protocol,created_at').single();
    if (appError) throw appError;
    const { error: fileError } = await supabase.from('application_files').insert(uploadedPaths.map(file => ({ ...file, application_id: application.id })));
    if (fileError) throw fileError;
    return json(res, 201, { protocol: application.protocol, createdAt: application.created_at, nomeDrag: personalData.nomeDrag });
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from(SUPABASE_BUCKET).remove(uploadedPaths.map(file => file.storage_path));
    console.error('Falha ao criar inscrição:', error.message);
    return json(res, 500, { error: 'Não foi possível armazenar a inscrição. Tente novamente.' });
  }
}

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    const { error } = await supabase.from('applications').select('id', { count: 'exact', head: true });
    return error ? json(res, 503, { status: 'error' }) : json(res, 200, { status: 'ok', database: 'supabase' });
  }
  if (req.method === 'POST' && url.pathname === '/api/applications') return createApplication(req, res);
  if (req.method === 'POST' && url.pathname === '/api/staff/login') {
    const ip = req.socket.remoteAddress || 'unknown';
    if (!loginAllowed(ip)) return json(res, 429, { error: 'Muitas tentativas. Aguarde 15 minutos.' });
    const body = await bodyJson(req);
    if (!secureEqual(body.username, STAFF_USER) || !secureEqual(body.password, STAFF_PASSWORD)) return json(res, 401, { error: 'Usuário ou senha inválidos.' });
    loginAttempts.delete(ip);
    const sid = crypto.randomBytes(32).toString('hex');
    sessions.set(sid, { username: STAFF_USER, expiresAt: Date.now() + 8 * 3600e3 });
    res.setHeader('Set-Cookie', `kweens_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    return json(res, 200, { username: STAFF_USER });
  }
  if (req.method === 'POST' && url.pathname === '/api/staff/logout') {
    const sid = cookies(req).kweens_session; if (sid) sessions.delete(sid);
    res.setHeader('Set-Cookie', 'kweens_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }
  const current = requireUser(req, res); if (!current) return;
  if (req.method === 'GET' && url.pathname === '/api/staff/me') return json(res, 200, current);
  if (req.method === 'GET' && url.pathname === '/api/staff/applications') {
    const { data, error } = await supabase.from('applications').select('id,protocol,status,created_at,personal_data').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: 'Não foi possível carregar as inscrições.' });
    const query = safe(url.searchParams.get('q') || '', 100).toLowerCase(); const status = safe(url.searchParams.get('status') || '', 30);
    let rows = data.map(row => ({ ...row, personalData: row.personal_data }));
    if (query) rows = rows.filter(row => JSON.stringify(row).toLowerCase().includes(query));
    if (status) rows = rows.filter(row => row.status === status);
    return json(res, 200, rows);
  }
  const match = url.pathname.match(/^\/api\/staff\/applications\/(\d+)$/);
  if (match && req.method === 'GET') {
    const { data, error } = await supabase.from('applications').select('*,application_files(*)').eq('id', match[1]).single();
    if (error || !data) return json(res, 404, { error: 'Inscrição não encontrada.' });
    return json(res, 200, { ...data, personalData: data.personal_data, artisticProfile: data.artistic_profile, consents: data.consents, files: data.application_files });
  }
  if (match && req.method === 'PATCH') {
    const body = await bodyJson(req); const allowed = ['recebida','em triagem','pré-selecionada','entrevista','aprovada','não selecionada','desclassificada'];
    if (!allowed.includes(body.status)) return json(res, 422, { error: 'Status inválido.' });
    const { error } = await supabase.from('applications').update({ status: body.status, staff_notes: safe(body.notes, 5000), updated_at: new Date().toISOString() }).eq('id', match[1]);
    return error ? json(res, 500, { error: 'Não foi possível atualizar.' }) : json(res, 200, { ok: true });
  }
  const fileMatch = url.pathname.match(/^\/api\/staff\/files\/(\d+)$/);
  if (fileMatch && req.method === 'GET') {
    const { data: file, error } = await supabase.from('application_files').select('storage_path,mime_type,original_name').eq('id', fileMatch[1]).single();
    if (error || !file) return json(res, 404, { error: 'Arquivo não encontrado.' });
    const { data: storedFile, error: downloadError } = await supabase.storage.from(SUPABASE_BUCKET).download(file.storage_path);
    if (downloadError || !storedFile) return json(res, 500, { error: 'Não foi possível abrir o arquivo.' });
    const content = Buffer.from(await storedFile.arrayBuffer());
    const inlineName = String(file.original_name || 'imagem').replace(/["\r\n]/g, '');
    res.writeHead(200, {
      'Content-Type': file.mime_type || storedFile.type || 'application/octet-stream',
      'Content-Length': content.length,
      'Content-Disposition': `inline; filename="${inlineName}"`,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.end(content);
  }
  return json(res, 404, { error: 'Rota não encontrada.' });
}

async function serve(req, res, url) {
  const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  if (relative.includes('..') || relative === '/server.js' || relative.startsWith('/.env')) return json(res, 403, { error: 'Acesso negado.' });
  const file = path.join(ROOT, relative);
  try {
    const stat = await fsp.stat(file); if (!stat.isFile()) throw Error();
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'self'"
    });
    fs.createReadStream(file).pipe(res);
  } catch { json(res, 404, { error: 'Página não encontrada.' }); }
}

const server = http.createServer(async (req, res) => {
  try { const url = new URL(req.url, 'http://local'); url.pathname.startsWith('/api/') ? await api(req, res, url) : await serve(req, res, url); }
  catch (error) { console.error(error); if (!res.headersSent) json(res, 500, { error: 'Não foi possível concluir a operação.' }); }
});
server.requestTimeout = 120000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Kweens Drag Race: http://localhost:${PORT}`);
  console.log(`Staff: http://localhost:${PORT}/staff.html`);
});
