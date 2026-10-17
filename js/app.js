import * as S from './store.js';
import {
  SITES, PERIMETERS, PROTOCOLS, EQUATIONS, BAND_LIMITS, byId, calcAll, composition, targetWeight,
  classifyBf, bmi, classifyBmi, whr, classifyWaist, ageAt, median,
} from './protocols.js';
import { lineChart } from './charts.js';

// ---------- utilidades ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (v, d = 1) => (v == null || !Number.isFinite(v) ? '–' : v.toFixed(d).replace('.', ','));
const num = (s) => { const v = parseFloat(String(s ?? '').trim().replace(',', '.')); return Number.isFinite(v) ? v : null; };
const dateBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const today = () => new Date().toLocaleDateString('sv-SE');
const sexLabel = (s) => (s === 'M' ? 'Masculino' : 'Feminino');
const app = $('#app');

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

const dlg = $('#dlg');
function openDialog(html) {
  dlg.innerHTML = html;
  if (!dlg.open) dlg.showModal();
  return dlg;
}
dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });

const SITE_HELP = {
  peitoral: 'Dobra diagonal, entre a axila e o mamilo (⅓ para homens; ½ para mulheres).',
  axilar: 'Dobra vertical (ou horizontal), na linha axilar média, ao nível do apêndice xifoide.',
  triceps: 'Dobra vertical, face posterior do braço, ponto médio entre acrômio e olécrano.',
  subescapular: 'Dobra oblíqua, 1–2 cm abaixo do ângulo inferior da escápula.',
  abdominal: 'Dobra horizontal (ou vertical), 2 cm à direita da cicatriz umbilical.',
  suprailiaca: 'Dobra oblíqua, 1–2 cm acima da crista ilíaca, na linha axilar anterior.',
  coxa: 'Dobra vertical, face anterior da coxa, ponto médio entre dobra inguinal e borda proximal da patela.',
  panturrilha: 'Dobra vertical, face medial da perna, na maior circunferência da panturrilha.',
  biceps: 'Dobra vertical, face anterior do braço, na mesma altura do tríceps.',
  lombar: 'Dobra oblíqua, na altura da linha dos ombros em relação à coluna, cerca de 2 cm lateral à linha média.',
};

// ---------- análise ----------
function analyze(d) {
  const eq = S.settings().equation;
  const input = { sex: d.sex, age: d.age, weight: d.weight, height: d.height, folds: d.folds || {}, maturity: d.maturity };
  const res = calcAll(input, eq);
  const main = res.find((r) => r.id === d.mainProtocol);
  const comp = main?.status === 'ok' ? composition(d.weight, main.bf) : null;
  return { res, main: main?.status === 'ok' ? main : null, mainDef: main, comp, eq };
}

// ---------- componentes ----------
function gauge(sex, bf) {
  const lim = BAND_LIMITS[sex], max = 40;
  const edges = [0, ...lim, max];
  const segs = edges.slice(1).map((e, i) => `<span style="width:${((e - edges[i]) / max) * 100}%;background:var(--l${i})"></span>`).join('');
  const pos = Math.min(Math.max(bf, 0), max) / max * 100;
  const ticks = lim.map((l) => `<span style="left:${(l / max) * 100}%">${l}</span>`).join('');
  return `<div class="gauge" aria-hidden="true">${segs}<i style="left:${pos}%"></i></div><div class="ticks" aria-hidden="true">${ticks}</div>`;
}

function renderResults(d, { full = false } = {}) {
  const a = analyze(d);
  const def = byId(d.mainProtocol);
  const sites = def?.sites[d.sex] || [];
  let out = '';

  if (a.main) {
    const cls = classifyBf(d.sex, a.main.bf, d.age);
    const t = d.targetBf ? targetWeight(d.weight, a.main.bf, d.targetBf) : null;
    const imc = bmi(d.weight, d.height), rcq = whr(d.per?.cintura, d.per?.quadril);
    out += `<div class="card hero">
      <span class="muted small">${esc(def.name)} · ${EQUATIONS[a.eq].label.split(' ')[0]}</span>
      <div class="big">${fmt(a.main.bf)}<small>%</small></div>
      ${cls ? `<div><span class="badge">${esc(cls.label)}</span></div>` : ''}
      ${cls && cls.level >= 0 ? gauge(d.sex, a.main.bf) : ''}
      <div class="stats">
        ${a.comp ? `<div class="stat"><b>${fmt(a.comp.fat)} kg</b><span>Massa gorda</span></div><div class="stat"><b>${fmt(a.comp.lean)} kg</b><span>Massa magra</span></div>` : ''}
        ${a.main.density ? `<div class="stat"><b>${fmt(a.main.density, 4)}</b><span>Densidade (g/cm³)</span></div>` : ''}
        <div class="stat"><b>${fmt(a.main.sum)} mm</b><span>Σ dobras do protocolo</span></div>
        ${imc ? `<div class="stat"><b>${fmt(imc)}</b><span>IMC · ${esc(classifyBmi(imc, d.age))}</span></div>` : ''}
        ${rcq ? `<div class="stat"><b>${fmt(rcq, 2)}</b><span>Relação cintura/quadril</span></div>` : ''}
        ${d.per?.cintura ? `<div class="stat"><b>${fmt(d.per.cintura)} cm</b><span>Cintura · ${esc(classifyWaist(d.sex, d.per.cintura))}</span></div>` : ''}
      </div>
      ${t ? `<div class="note" style="margin-top:.75rem">Para atingir <b>${fmt(d.targetBf)}%</b> de gordura mantendo a massa magra: peso-alvo <b>${fmt(t.weight)} kg</b> (${t.delta >= 0 ? '+' : ''}${fmt(t.delta)} kg; ${t.fatToLose >= 0 ? 'reduzir' : 'ganhar'} ${fmt(Math.abs(t.fatToLose))} kg de gordura).</div>` : ''}
      ${a.main.warnings.map((w) => `<div class="warn">⚠ ${esc(w)}</div>`).join('')}
    </div>`;
  } else {
    const faltam = (a.mainDef?.missing || sites).map((m) => SITES[m] || m);
    out += `<div class="card"><h2>Protocolo principal</h2><p class="muted">Preencha as dobras destacadas para calcular com <b>${esc(def?.name || '')}</b>.</p>
      ${faltam.length ? `<p class="small">Faltam: ${esc(faltam.join(', '))}</p>` : ''}</div>`;
  }

  // comparação entre protocolos
  const ok = a.res.filter((r) => r.status === 'ok');
  const pending = a.res.filter((r) => r.status === 'missing');
  if (ok.length) {
    const clean = ok.filter((r) => !r.warnings.length);
    const avg = clean.length >= 2 ? clean.reduce((s, r) => s + r.bf, 0) / clean.length : null;
    out += `<div class="card"><h2>Comparação entre protocolos</h2>
      <div class="tablewrap"><table><thead><tr><th>Protocolo</th><th class="num">% G</th><th class="num">M. gorda</th><th class="num">M. magra</th></tr></thead><tbody>
      ${ok.map((r) => {
        const c = composition(d.weight, r.bf);
        return `<tr class="${r.id === d.mainProtocol ? 'main' : ''}"><td>${esc(r.name)}${r.warnings.map((w) => `<div class="small" style="color:var(--warn);font-weight:400">⚠ ${esc(w)}</div>`).join('')}</td><td class="num">${fmt(r.bf)}%</td><td class="num">${c ? fmt(c.fat) + ' kg' : '–'}</td><td class="num">${c ? fmt(c.lean) + ' kg' : '–'}</td></tr>`;
      }).join('')}
      ${avg != null ? `<tr><td class="muted">Média dos protocolos sem alerta (${clean.length})</td><td class="num">${fmt(avg)}%</td><td></td><td></td></tr>` : ''}
      </tbody></table></div>
      <p class="small muted">Protocolos diferem em população de origem e erro-padrão (≈3–4 %G); use o mais adequado ao perfil do avaliado.</p></div>`;
  }
  if (pending.length && !full) {
    out += `<details class="card no-print"><summary>Protocolos incompletos (${pending.length})</summary><ul class="small">${pending.map((r) => `<li><b>${esc(r.name)}</b>: faltam ${esc(r.missing.map((m) => SITES[m] || m).join(', '))}</li>`).join('')}</ul></details>`;
  }
  return out;
}

// ---------- roteamento ----------
const routes = [
  [/^pacientes$/, viewPatients, 'pacientes'],
  [/^paciente\/([\w-]+)$/, viewPatient, 'pacientes'],
  [/^avaliar$/, viewForm, 'avaliar'],
  [/^avaliacoes$/, viewHistory, 'avaliacoes'],
  [/^avaliacao\/([\w-]+)$/, viewReport, 'avaliacoes'],
  [/^protocolos$/, viewProtocols, 'protocolos'],
  [/^conta$/, viewAccount, 'conta'],
];
let editing = false; // true enquanto há formulário aberto: evita re-render por eventos de sincronização

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '') || 'pacientes';
  const [path, qs] = raw.split('?');
  return { path, q: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function render() {
  const { path, q } = parseHash();
  const r = routes.find(([re]) => re.test(path)) || routes[0];
  const m = path.match(r[0]) || [];
  editing = false;
  $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === r[2]));
  app.innerHTML = '';
  r[1](m[1], q);
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);
const go = (h) => { location.hash = h; };

S.on(() => { renderSync(); if (!editing) { const y = window.scrollY; render(); window.scrollTo(0, y); } });

function renderSync() {
  const el = $('#syncBadge'); if (!el) return;
  const u = S.cloudUser();
  if (!S.cloudConfigured()) el.textContent = '💾 Dados somente neste aparelho';
  else if (!u) el.textContent = '☁️ Nuvem: não conectado';
  else el.innerHTML = `☁️ ${esc(u.email)}<br>${{ syncing: 'Sincronizando…', ok: 'Sincronizado', error: 'Erro ao sincronizar', idle: '' }[S.syncStatus.state]}`;
}

// ---------- pacientes ----------
function patientSummary(p) {
  const list = S.assessmentsOf(p.id);
  const last = list[0];
  let bf = '';
  if (last) { const a = analyze(last); if (a.main) bf = `${fmt(a.main.bf)}%`; }
  const age = ageAt(p.birth);
  return { last, bf, age };
}

function viewPatients() {
  app.innerHTML = `
    <div class="page-head"><div><h1>Pacientes</h1><p class="muted" style="margin:0">${S.patients().length} cadastrados</p></div>
      <button class="primary" id="newP">+ Novo paciente</button></div>
    <div class="field"><input type="search" id="q" placeholder="Buscar por nome…" aria-label="Buscar paciente"></div>
    <div class="card" style="padding:0"><ul class="list" id="plist"></ul></div>`;
  const draw = () => {
    const q = $('#q').value.trim().toLowerCase();
    const items = S.patients().filter((p) => p.name.toLowerCase().includes(q));
    $('#plist').innerHTML = items.length ? items.map((p) => {
      const s = patientSummary(p);
      return `<li><a class="item" href="#/paciente/${p.id}"><div><b>${esc(p.name)}</b><div class="meta">${sexLabel(p.sex)}${s.age != null ? ` · ${s.age} anos` : ''}${s.last ? ` · última avaliação ${dateBR(s.last.date)}` : ' · sem avaliações'}</div></div>${s.bf ? `<span class="badge">${s.bf} G</span>` : ''}</a></li>`;
    }).join('') : `<li class="empty">${S.patients().length ? 'Nenhum paciente encontrado.' : 'Nenhum paciente ainda.<br>Cadastre o primeiro ou faça uma <a href="#/avaliar">avaliação avulsa</a>.'}</li>`;
  };
  draw();
  $('#q').addEventListener('input', draw);
  $('#newP').addEventListener('click', () => patientDialog());
}

function patientDialog(p) {
  openDialog(`<form id="pf" method="dialog">
    <h2>${p ? 'Editar paciente' : 'Novo paciente'}</h2>
    <div class="field"><label for="pn">Nome</label><input id="pn" required maxlength="120" value="${esc(p?.name)}" autocomplete="off"></div>
    <div class="field"><label>Sexo biológico</label><div class="seg">
      <label><input type="radio" name="sex" value="M" ${p?.sex !== 'F' ? 'checked' : ''}><span>Masculino</span></label>
      <label><input type="radio" name="sex" value="F" ${p?.sex === 'F' ? 'checked' : ''}><span>Feminino</span></label></div></div>
    <div class="fields">
      <div class="field"><label for="pb">Nascimento</label><input id="pb" type="date" required max="${today()}" value="${esc(p?.birth)}"></div>
      <div class="field"><label for="ph">Altura (cm)</label><input id="ph" inputmode="decimal" value="${esc(p?.height ?? '')}"></div>
    </div>
    <div class="field"><label for="po">Observações</label><textarea id="po" rows="3" maxlength="1000">${esc(p?.notes)}</textarea></div>
    <div class="row spread"><button type="button" data-close>Cancelar</button><button class="primary" type="submit">Salvar</button></div></form>`);
  $('#pf').addEventListener('submit', (e) => {
    e.preventDefault();
    const rec = S.savePatient({
      id: p?.id, name: $('#pn').value.trim(), sex: $('input[name=sex]:checked').value,
      birth: $('#pb').value, height: num($('#ph').value), notes: $('#po').value.trim(),
    });
    dlg.close(); toast('Paciente salvo.');
    if (!p) go(`#/paciente/${rec.id}`);
  });
}

const METRICS = {
  bf: ['% de gordura', '%', (a, r) => r.main?.bf],
  weight: ['Peso (kg)', ' kg', (a) => a.weight],
  fat: ['Massa gorda (kg)', ' kg', (a, r) => r.comp?.fat],
  lean: ['Massa magra (kg)', ' kg', (a, r) => r.comp?.lean],
};

function viewPatient(id) {
  const p = S.patient(id);
  if (!p) { app.innerHTML = '<div class="empty">Paciente não encontrado. <a href="#/pacientes">Voltar</a></div>'; return; }
  const list = S.assessmentsOf(id), age = ageAt(p.birth);
  app.innerHTML = `
    <p class="small"><a href="#/pacientes">← Pacientes</a></p>
    <div class="page-head"><div><h1>${esc(p.name)}</h1>
      <p class="muted" style="margin:0">${sexLabel(p.sex)} · ${age} anos${p.height ? ` · ${fmt(p.height, 0)} cm` : ''}</p></div>
      <div class="row"><button id="edP">Editar</button><button class="primary" id="newA">+ Nova avaliação</button></div></div>
    ${p.notes ? `<div class="note" style="margin-bottom:1rem">${esc(p.notes)}</div>` : ''}
    <div class="card"><div class="row spread"><h2>Evolução</h2>
      <select id="metric" style="width:auto" aria-label="Métrica">${Object.entries(METRICS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></div>
      <div id="chart"></div></div>
    <div class="card" style="padding:0"><ul class="list">${list.length ? list.map((a) => {
      const r = analyze(a);
      return `<li><a class="item" href="#/avaliacao/${a.id}"><div><b>${dateBR(a.date)}</b><div class="meta">${fmt(a.weight)} kg · ${esc(byId(a.mainProtocol)?.name || '')}</div></div>${r.main ? `<span class="badge">${fmt(r.main.bf)}% G</span>` : '<span class="muted small">incompleta</span>'}</a></li>`;
    }).join('') : '<li class="empty">Nenhuma avaliação registrada.</li>'}</ul></div>
    <button class="danger ghost" id="delP">Excluir paciente</button>`;
  const draw = () => {
    const m = METRICS[$('#metric').value];
    const pts = list.map((a) => ({ x: a.date, y: m[2](a, analyze(a)) })).filter((p) => p.y != null);
    $('#chart').innerHTML = pts.length >= 1 ? lineChart(pts, { unit: m[1] }) : '<p class="muted">Registre avaliações para acompanhar a evolução.</p>';
  };
  draw();
  $('#metric').addEventListener('change', draw);
  $('#edP').addEventListener('click', () => patientDialog(p));
  $('#newA').addEventListener('click', () => go(`#/avaliar?p=${p.id}`));
  $('#delP').addEventListener('click', () => {
    if (confirm(`Excluir ${p.name} e todas as suas avaliações? Esta ação não pode ser desfeita.`)) { S.removePatient(p.id); go('#/pacientes'); toast('Paciente excluído.'); }
  });
}

// ---------- formulário de avaliação ----------
function viewForm(_, q) {
  editing = true;
  const edit = q.e ? S.assessment(q.e) : null;
  const pid = edit ? edit.patientId : (q.p || '');
  const pat = pid ? S.patient(pid) : null;
  const a = edit || {
    date: today(), sex: pat?.sex || 'M', age: pat ? ageAt(pat.birth, today()) : '', weight: '', height: pat?.height || '',
    foldsRaw: {}, per: {}, maturity: 'pub', mainProtocol: 'jp7', targetBf: '', notes: '',
  };
  const raw = a.foldsRaw || {};
  app.innerHTML = `
    <div class="page-head"><div><h1>${edit ? 'Editar avaliação' : 'Nova avaliação'}</h1>
      <p class="muted" style="margin:0">Resultados atualizam enquanto você digita.</p></div></div>
    <form id="af" class="formgrid" autocomplete="off" novalidate>
      <div>
        <div class="card">
          <h2>Avaliado</h2>
          <div class="field"><label for="fp">Paciente</label><select id="fp"><option value="">Avulsa (sem paciente)</option>
            ${S.patients().map((p) => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
          <div class="fields">
            <div class="field"><label for="fd">Data</label><input id="fd" type="date" required value="${esc(a.date)}" max="${today()}"></div>
            <div class="field"><label>Sexo biológico</label><div class="seg">
              <label><input type="radio" name="sex" value="M" ${a.sex === 'M' ? 'checked' : ''}><span>M</span></label>
              <label><input type="radio" name="sex" value="F" ${a.sex === 'F' ? 'checked' : ''}><span>F</span></label></div></div>
            <div class="field"><label for="fa">Idade (anos)</label><input id="fa" inputmode="numeric" value="${esc(a.age)}"></div>
            <div class="field"><label for="fw">Peso (kg)</label><input id="fw" inputmode="decimal" value="${esc(a.weight)}"></div>
            <div class="field"><label for="fh">Altura (cm)</label><input id="fh" inputmode="decimal" value="${esc(a.height)}"></div>
          </div>
        </div>
        <div class="card">
          <h2>Dobras cutâneas (mm)</h2>
          <p class="small muted">Meça no hemicorpo direito. Informe até 3 medidas por local: o app usa a mediana. <span class="legend"></span> = usado no protocolo selecionado.</p>
          <div class="fold-head"><span>Local</span><span>1ª</span><span>2ª</span><span>3ª</span></div>
          <div class="folds">${Object.entries(SITES).map(([k, label]) => `<div class="fold" data-site="${k}"><div class="name">${label}</div>${[0, 1, 2].map((i) => `<input inputmode="decimal" aria-label="${label}, medida ${i + 1}" data-site="${k}" data-i="${i}" value="${esc(raw[k]?.[i] ?? '')}">`).join('')}</div>`).join('')}</div>
        </div>
        <div class="card">
          <h2>Perímetros (cm) <span class="muted small">opcional</span></h2>
          <div class="per">${Object.entries(PERIMETERS).map(([k, label]) => `<div class="field"><label for="pe-${k}">${label}</label><input id="pe-${k}" inputmode="decimal" data-per="${k}" value="${esc(a.per?.[k] ?? '')}"></div>`).join('')}</div>
        </div>
        <div class="card">
          <h2>Protocolo e meta</h2>
          <div class="field"><label for="fm">Protocolo principal</label><select id="fm">${PROTOCOLS.map((p) => `<option value="${p.id}" ${p.id === a.mainProtocol ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
            <div class="small muted" id="popu" style="margin-top:.3rem"></div></div>
          <div class="fields">
            <div class="field" id="matWrap"><label for="fmat">Maturação (meninos, Slaughter)</label><select id="fmat">
              <option value="pre" ${a.maturity === 'pre' ? 'selected' : ''}>Pré-púbere</option><option value="pub" ${a.maturity === 'pub' ? 'selected' : ''}>Púbere</option><option value="pos" ${a.maturity === 'pos' ? 'selected' : ''}>Pós-púbere</option></select></div>
            <div class="field"><label for="ft">Meta de % de gordura</label><input id="ft" inputmode="decimal" placeholder="ex.: 15" value="${esc(a.targetBf ?? '')}"></div>
          </div>
          <div class="field"><label for="fn">Observações</label><textarea id="fn" rows="2" maxlength="1000">${esc(a.notes)}</textarea></div>
        </div>
        <div class="row spread no-print"><button type="button" id="cancel">Cancelar</button><button class="primary" type="submit">${edit ? 'Salvar alterações' : 'Salvar avaliação'}</button></div>
      </div>
      <div class="live"><div id="live"></div></div>
    </form>
    <div class="mini" id="mini" aria-live="polite"></div>`;

  const form = $('#af');
  const read = () => {
    const sex = $('input[name=sex]:checked').value;
    const foldsRaw = {}, folds = {};
    for (const k of Object.keys(SITES)) {
      const vals = $$(`input[data-site="${k}"]`, form).map((i) => i.value);
      foldsRaw[k] = vals;
      const m = median(vals.map(num).filter((v) => v > 0));
      if (m != null) folds[k] = m;
    }
    const per = {};
    $$('input[data-per]', form).forEach((i) => { const v = num(i.value); if (v > 0) per[i.dataset.per] = v; });
    return {
      id: edit?.id, patientId: $('#fp').value || null, date: $('#fd').value, sex, age: num($('#fa').value),
      weight: num($('#fw').value), height: num($('#fh').value), foldsRaw, folds, per,
      maturity: $('#fmat').value, mainProtocol: $('#fm').value, targetBf: num($('#ft').value), notes: $('#fn').value.trim(),
    };
  };
  const update = () => {
    const d = read(), def = byId(d.mainProtocol);
    const req = new Set(def.sites[d.sex] || []);
    $$('.fold', form).forEach((r) => r.classList.toggle('req', req.has(r.dataset.site)));
    $('#popu').textContent = def.population;
    $('#matWrap').classList.toggle('hide', !(d.sex === 'M' && d.mainProtocol === 'slaughter-ts'));
    $('#live').innerHTML = renderResults(d);
    const an = analyze(d);
    $('#mini').innerHTML = an.main ? `<b>${fmt(an.main.bf)}%</b> gordura · ${esc(an.mainDef.name)}` : 'Preencha as dobras destacadas';
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);

  // paciente/data preenchem sexo e idade
  const fromPatient = () => {
    const p = S.patient($('#fp').value);
    if (!p) return;
    $(`input[name=sex][value=${p.sex}]`).checked = true;
    if (p.birth) $('#fa').value = ageAt(p.birth, $('#fd').value) ?? '';
    if (p.height && !$('#fh').value) $('#fh').value = p.height;
  };
  $('#fp').addEventListener('change', () => { fromPatient(); update(); });
  $('#fd').addEventListener('change', () => { fromPatient(); update(); });

  $('#cancel').addEventListener('click', () => history.back());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = read();
    if (!d.date) return toast('Informe a data.');
    if (!(d.age > 0 && d.age < 120)) return toast('Informe a idade.');
    if (!Object.keys(d.folds).length) return toast('Informe ao menos uma dobra.');
    const rec = S.saveAssessment(d);
    editing = false;
    toast('Avaliação salva.');
    go(`#/avaliacao/${rec.id}`);
  });
  update();
}

// ---------- relatório ----------
function viewReport(id) {
  const a = S.assessment(id);
  if (!a) { app.innerHTML = '<div class="empty">Avaliação não encontrada. <a href="#/avaliacoes">Voltar</a></div>'; return; }
  const p = a.patientId ? S.patient(a.patientId) : null;
  const st = S.settings();
  app.innerHTML = `
    <p class="small no-print"><a href="${p ? `#/paciente/${p.id}` : '#/avaliacoes'}">← ${p ? esc(p.name) : 'Histórico'}</a></p>
    <div class="report-head"><h1>Avaliação de composição corporal</h1>
      <div>${st.proName ? `<b>${esc(st.proName)}</b>${st.proReg ? ` · ${esc(st.proReg)}` : ''}` : ''}</div></div>
    <div class="page-head"><div><h1>${p ? esc(p.name) : 'Avaliação avulsa'}</h1>
      <p class="muted" style="margin:0">${dateBR(a.date)} · ${sexLabel(a.sex)} · ${a.age} anos${a.weight ? ` · ${fmt(a.weight)} kg` : ''}${a.height ? ` · ${fmt(a.height, 0)} cm` : ''}</p></div>
      <div class="row no-print"><button id="print">🖨️ Imprimir / PDF</button><button id="edit">Editar</button></div></div>
    ${renderResults(a, { full: true })}
    <div class="card"><h2>Medidas</h2><div class="tablewrap"><table><thead><tr><th>Dobra</th><th class="num">Medidas (mm)</th><th class="num">Valor usado</th></tr></thead><tbody>
      ${Object.entries(SITES).filter(([k]) => a.folds?.[k]).map(([k, l]) => `<tr><td>${l}</td><td class="num">${(a.foldsRaw?.[k] || []).filter((v) => v !== '').map(esc).join(' · ')}</td><td class="num">${fmt(a.folds[k])}</td></tr>`).join('')}
      </tbody></table></div>
      ${Object.keys(a.per || {}).length ? `<h3 style="margin-top:1rem">Perímetros</h3><p>${Object.entries(a.per).map(([k, v]) => `${PERIMETERS[k]}: <b>${fmt(v)} cm</b>`).join(' · ')}</p>` : ''}
      ${a.notes ? `<h3 style="margin-top:1rem">Observações</h3><p>${esc(a.notes)}</p>` : ''}
    </div>
    <p class="small muted">Estimativa por equações preditivas (erro-padrão típico de 3–4 %G); não substitui diagnóstico clínico. Classificação adulta: ACE / Pollock &amp; Wilmore.</p>
    <button class="danger ghost no-print" id="del">Excluir avaliação</button>`;
  $('#print').addEventListener('click', () => window.print());
  $('#edit').addEventListener('click', () => go(`#/avaliar?e=${a.id}`));
  $('#del').addEventListener('click', () => {
    if (confirm('Excluir esta avaliação?')) { S.removeAssessment(a.id); go(p ? `#/paciente/${p.id}` : '#/avaliacoes'); toast('Avaliação excluída.'); }
  });
}

function viewHistory() {
  const list = S.assessments();
  app.innerHTML = `<div class="page-head"><div><h1>Histórico</h1><p class="muted" style="margin:0">${list.length} avaliações</p></div><a class="btn primary" href="#/avaliar">+ Nova avaliação</a></div>
    <div class="card" style="padding:0"><ul class="list">${list.length ? list.map((a) => {
      const p = a.patientId ? S.patient(a.patientId) : null, r = analyze(a);
      return `<li><a class="item" href="#/avaliacao/${a.id}"><div><b>${p ? esc(p.name) : 'Avulsa'}</b><div class="meta">${dateBR(a.date)} · ${sexLabel(a.sex)}, ${a.age} anos · ${esc(byId(a.mainProtocol)?.name || '')}</div></div>${r.main ? `<span class="badge">${fmt(r.main.bf)}% G</span>` : '<span class="muted small">incompleta</span>'}</a></li>`;
    }).join('') : '<li class="empty">Nenhuma avaliação ainda.</li>'}</ul></div>`;
}

// ---------- protocolos ----------
function viewProtocols() {
  app.innerHTML = `<div class="page-head"><div><h1>Protocolos</h1><p class="muted" style="margin:0">Equações, populações e referências originais.</p></div></div>
    <div class="note" style="margin-bottom:1rem">Densidade corporal convertida em % de gordura por <b>Siri</b> (4,95/D − 4,50) × 100 ou <b>Brozek</b> (4,57/D − 4,142) × 100 — escolha em <a href="#/conta">Conta</a>. Faulkner, Yuhasz, Parrillo e Slaughter calculam o %G diretamente.</div>
    ${PROTOCOLS.map((p) => `<details class="card"><summary><b>${esc(p.name)}</b></summary>
      <p>${esc(p.population)}</p>
      <p class="small"><b>Masculino:</b> ${p.sites.M.map((s) => SITES[s]).join(', ')}<br><b>Feminino:</b> ${p.sites.F.map((s) => SITES[s]).join(', ')}${p.ages ? `<br><b>Faixa etária:</b> ${p.ages[0]}–${p.ages[1]} anos` : ''}</p>
      <p class="small muted">${esc(p.ref)}</p></details>`).join('')}
    <div class="card"><h2>Como marcar os pontos</h2>
      <ul class="small">${Object.entries(SITES).map(([k, l]) => `<li><b>${l}:</b> ${SITE_HELP[k]}</li>`).join('')}</ul>
      <p class="small muted">Use adipômetro calibrado, pinçando a pele e o tecido subcutâneo com polegar e indicador a 1 cm do ponto; leia 2–3 s após soltar a pinça; repita a sequência 2–3 vezes (circuito) e use a mediana. Avalie pela manhã, sem exercício prévio, preferencialmente sempre pelo mesmo avaliador.</p></div>`;
}

// ---------- conta ----------
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (parseHash().path === 'conta') render(); });
window.addEventListener('appinstalled', () => { installEvt = null; toast('App instalado.'); });

function viewAccount() {
  editing = true; // evita re-render por sync enquanto digita
  const st = S.settings(), u = S.cloudUser();
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  app.innerHTML = `<div class="page-head"><h1>Conta e configurações</h1></div>
    <div class="grid cols-2">
    <div class="card"><h2>Profissional</h2>
      <p class="small muted">Aparece no cabeçalho do relatório impresso.</p>
      <div class="field"><label for="sn">Nome</label><input id="sn" value="${esc(st.proName)}"></div>
      <div class="field"><label for="sr">Registro (CRN, CREF, CRM…)</label><input id="sr" value="${esc(st.proReg)}"></div>
      <div class="field"><label for="se">Conversão densidade → %G</label><select id="se">${Object.entries(EQUATIONS).map(([k, v]) => `<option value="${k}" ${st.equation === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
      <button class="primary" id="saveS">Salvar</button></div>

    <div class="card"><h2>Nuvem</h2>${!S.cloudConfigured()
      ? `<p class="muted">A nuvem não está configurada: os dados ficam somente neste aparelho. Para sincronizar entre aparelhos, preencha <code>config.js</code> com os dados do seu projeto Supabase (veja o README).</p>`
      : u ? `<p>Conectado como <b>${esc(u.email)}</b>.</p><p class="small muted">${{ syncing: 'Sincronizando…', ok: 'Sincronizado', error: 'Erro: ' + esc(S.syncStatus.error), idle: '' }[S.syncStatus.state]}</p>
          <p class="small muted">Neste aparelho: ${S.counts().patients} pacientes, ${S.counts().assessments} avaliações, ${S.counts().pending} pendentes de envio.</p>
          <div class="row"><button id="syncNow">Sincronizar agora</button><button class="danger" id="out">Sair</button></div>
          <p class="small muted">Ao sair, os dados são removidos deste aparelho (permanecem na nuvem).</p>`
        : `<form id="lf"><div class="field"><label for="le">E-mail</label><input id="le" type="email" required autocomplete="username"></div>
          <div class="field"><label for="lp">Senha</label><input id="lp" type="password" required minlength="6" autocomplete="current-password"></div>
          <div class="row"><button class="primary" type="submit">Entrar</button><button type="button" id="signup">Criar conta</button></div>
          <p class="small muted" id="lmsg"></p></form>`}
    </div>

    <div class="card"><h2>Instalar no celular</h2>
      ${standalone ? '<p>✅ O app já está instalado neste aparelho.</p>'
        : installEvt ? '<button class="primary" id="install">Instalar app</button><p class="small muted">Adiciona o ícone à tela inicial e permite uso offline.</p>'
        : ios ? '<p>No iPhone/iPad (Safari): toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>'
        : '<p class="small">No Android (Chrome): menu <b>⋮</b> → <b>Instalar app</b> / <b>Adicionar à tela inicial</b>. No computador: ícone de instalação na barra de endereço.</p>'}
    </div>

    <div class="card"><h2>Backup</h2>
      <p class="small muted">Exporte uma cópia dos dados em arquivo JSON ou restaure a partir de um backup.</p>
      <div class="row"><button id="exp">Exportar</button><button id="imp">Importar</button><input type="file" id="file" accept="application/json" class="hide"></div></div>
    </div>`;

  $('#saveS').addEventListener('click', () => {
    S.saveSettings({ proName: $('#sn').value.trim(), proReg: $('#sr').value.trim(), equation: $('#se').value });
    toast('Configurações salvas.');
  });
  $('#install')?.addEventListener('click', async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; render(); });
  $('#syncNow')?.addEventListener('click', () => S.sync({ full: true }));
  $('#out')?.addEventListener('click', async () => {
    if (confirm('Sair? Os dados serão removidos deste aparelho e permanecem na nuvem.')) { await S.signOut(); go('#/pacientes'); }
  });
  const auth = async (fn) => {
    const msg = $('#lmsg'); msg.textContent = 'Aguarde…';
    try { const r = await fn($('#le').value.trim(), $('#lp').value); if (r === 'confirm') msg.textContent = 'Conta criada. Confirme seu e-mail e depois entre.'; else go('#/pacientes'); }
    catch (e) { msg.textContent = e.message; }
  };
  $('#lf')?.addEventListener('submit', (e) => { e.preventDefault(); auth(S.signIn); });
  $('#signup')?.addEventListener('click', () => { if ($('#lf').reportValidity()) auth(S.signUp); });
  $('#exp').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([S.exportJSON()], { type: 'application/json' }));
    a.download = `dobras-backup-${today()}.json`; a.click(); URL.revokeObjectURL(a.href);
  });
  $('#imp').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', async (e) => {
    try { S.importJSON(await e.target.files[0].text()); toast('Backup importado.'); } catch (err) { toast(err.message); }
  });
}

// ---------- início ----------
renderSync();
render();
S.initCloud();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
