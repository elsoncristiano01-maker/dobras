// Armazenamento offline-first (localStorage) com sincronização opcional via Supabase.
import { CONFIG } from '../config.js';

const KEY = 'dobras:v1';
const TABLES = ['patients', 'assessments'];
const events = new EventTarget();
export const on = (fn) => events.addEventListener('change', fn);
const emit = () => events.dispatchEvent(new Event('change'));

const empty = () => ({
  patients: [], assessments: [],
  settings: { equation: 'siri', proName: '', proReg: '' },
  lastPull: null,
});

let state = empty();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) state = { ...empty(), ...JSON.parse(raw) };
} catch { /* armazenamento indisponível: opera em memória */ }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}
function commit() { persist(); emit(); }

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + Math.random().toString(16).slice(2));
const now = () => new Date().toISOString();

// ---------- leitura ----------
export const settings = () => state.settings;
export const patients = () => state.patients.filter((p) => !p.deleted).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
export const patient = (id) => state.patients.find((p) => p.id === id && !p.deleted);
export const assessments = () => state.assessments.filter((a) => !a.deleted).sort((a, b) => b.date.localeCompare(a.date));
export const assessment = (id) => state.assessments.find((a) => a.id === id && !a.deleted);
export const assessmentsOf = (pid) => assessments().filter((a) => a.patientId === pid);

// ---------- escrita ----------
function upsert(list, item) {
  const i = list.findIndex((x) => x.id === item.id);
  const rec = { ...(i >= 0 ? list[i] : {}), ...item, id: item.id || uid(), updated_at: now(), _dirty: true };
  if (i >= 0) list[i] = rec; else list.push(rec);
  commit();
  scheduleSync();
  return rec;
}
export const savePatient = (p) => upsert(state.patients, p);
export const saveAssessment = (a) => upsert(state.assessments, a);

export function removePatient(id) {
  upsert(state.patients, { id, deleted: true });
  state.assessments.filter((a) => a.patientId === id && !a.deleted).forEach((a) => upsert(state.assessments, { id: a.id, deleted: true }));
}
export const removeAssessment = (id) => upsert(state.assessments, { id, deleted: true });

export function saveSettings(s) {
  state.settings = { ...state.settings, ...s };
  commit();
}

export const counts = () => ({
  patients: state.patients.filter((p) => !p.deleted).length,
  assessments: state.assessments.filter((a) => !a.deleted).length,
  pending: state.patients.filter((x) => x._dirty).length + state.assessments.filter((x) => x._dirty).length,
});

export const hasDirty = () => TABLES.some((t) => state[t === 'patients' ? 'patients' : 'assessments'].some((x) => x._dirty));

// ---------- backup ----------
export const exportJSON = () => JSON.stringify({ app: 'dobras', version: 1, exportedAt: now(), patients: state.patients.filter((p) => !p.deleted), assessments: state.assessments.filter((a) => !a.deleted), settings: state.settings }, null, 2);

export function importJSON(text) {
  const d = JSON.parse(text);
  if (d.app !== 'dobras' || !Array.isArray(d.patients) || !Array.isArray(d.assessments)) throw new Error('Arquivo de backup inválido.');
  for (const p of d.patients) upsert(state.patients, p);
  for (const a of d.assessments) upsert(state.assessments, a);
}

export function wipeLocal() {
  const s = state.settings;
  state = { ...empty(), settings: s };
  commit();
}

// ---------- nuvem ----------
export const cloudConfigured = () => Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
let client = null;
let user = null;
export const cloudUser = () => user;
export const syncStatus = { state: 'idle', error: null, at: null };

async function loadSdk() {
  if (window.supabase) return window.supabase;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    s.onload = res; s.onerror = () => rej(new Error('Sem acesso ao serviço de login (verifique a conexão).'));
    document.head.appendChild(s);
  });
  return window.supabase;
}

export async function initCloud() {
  if (!cloudConfigured()) return;
  try {
    const sdk = await loadSdk();
    client = sdk.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    const { data } = await client.auth.getSession();
    user = data.session?.user || null;
    client.auth.onAuthStateChange((_e, session) => { user = session?.user || null; emit(); });
    emit();
    if (user) sync();
  } catch (e) { syncStatus.error = e.message; emit(); }
}

async function requireClient() {
  if (!client) await initCloud();
  if (!client) throw new Error('Nuvem não configurada ou indisponível.');
  return client;
}

export async function signIn(email, password) {
  const c = await requireClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(traduz(error.message));
  user = data.user; emit(); sync();
}

export async function signUp(email, password) {
  const c = await requireClient();
  const { data, error } = await c.auth.signUp({ email, password });
  if (error) throw new Error(traduz(error.message));
  if (!data.session) return 'confirm';
  user = data.user; emit(); sync();
  return 'ok';
}

export async function signOut() {
  if (user && hasDirty()) await sync();
  if (client) await client.auth.signOut();
  user = null;
  state.lastPull = null;
  wipeLocal(); // dados de saúde não ficam no aparelho após sair
}

function traduz(m) {
  if (/Invalid login/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/already registered/i.test(m)) return 'Este e-mail já está cadastrado.';
  if (/Password should be/i.test(m)) return 'A senha deve ter ao menos 6 caracteres.';
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail antes de entrar.';
  return m;
}

let timer = null;
function scheduleSync() {
  if (!user) return;
  clearTimeout(timer);
  timer = setTimeout(sync, 1200);
}

let running = false;
export async function sync() {
  if (!client || !user || running || !navigator.onLine) return;
  running = true; syncStatus.state = 'syncing'; syncStatus.error = null; emit();
  try {
    for (const t of TABLES) {
      const list = state[t];
      // envio
      const dirty = list.filter((x) => x._dirty);
      if (dirty.length) {
        const rows = dirty.map((x) => {
          const { _dirty, ...data } = x;
          return { id: x.id, user_id: user.id, data, updated_at: x.updated_at, deleted: !!x.deleted };
        });
        const { error } = await client.from(t).upsert(rows);
        if (error) throw error;
        const sent = new Set(dirty.map((x) => x.id + x.updated_at));
        list.forEach((x) => { if (sent.has(x.id + x.updated_at)) delete x._dirty; });
      }
    }
    // recebimento
    let maxPull = state.lastPull;
    for (const t of TABLES) {
      let q = client.from(t).select('*').order('synced_at', { ascending: true }).limit(1000);
      if (state.lastPull) q = q.gt('synced_at', state.lastPull);
      const { data, error } = await q;
      if (error) throw error;
      for (const r of data) {
        const list = state[t];
        const i = list.findIndex((x) => x.id === r.id);
        const remote = { ...r.data, id: r.id, updated_at: r.updated_at, deleted: r.deleted };
        if (i < 0) list.push(remote);
        else if (!list[i]._dirty && r.updated_at > list[i].updated_at) list[i] = remote;
        if (!maxPull || r.synced_at > maxPull) maxPull = r.synced_at;
      }
    }
    state.lastPull = maxPull;
    syncStatus.state = 'ok'; syncStatus.at = now();
    commit();
  } catch (e) {
    syncStatus.state = 'error'; syncStatus.error = e.message || String(e);
    emit();
  } finally { running = false; }
}

window.addEventListener('online', () => sync());
