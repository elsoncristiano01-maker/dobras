// Gráfico de linha em SVG, sem dependências.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** points: [{ x: 'YYYY-MM-DD', y: number }] */
export function lineChart(points, { unit = '', decimals = 1 } = {}) {
  const pts = points.filter((p) => Number.isFinite(p.y)).sort((a, b) => a.x.localeCompare(b.x));
  if (!pts.length) return '<p class="muted">Sem dados para exibir.</p>';
  const W = 640, H = 240, m = { l: 44, r: 16, t: 16, b: 32 };
  const t = pts.map((p) => new Date(p.x).getTime());
  const t0 = t[0], t1 = t[t.length - 1];
  const ys = pts.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const pad = (hi - lo || Math.abs(hi) * 0.1 || 1) * 0.2;
  lo -= pad; hi += pad;
  const X = (i) => (t1 === t0 ? (W + m.l - m.r) / 2 : m.l + ((t[i] - t0) / (t1 - t0)) * (W - m.l - m.r));
  const Y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
  const fmt = (v) => v.toFixed(decimals).replace('.', ',');
  const fdate = (s) => s.split('-').reverse().slice(0, 2).join('/') + '/' + s.slice(2, 4);

  let g = '';
  for (let i = 0; i <= 3; i++) {
    const v = lo + ((hi - lo) * i) / 3, y = Y(v);
    g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}" class="grid"/><text x="${m.l - 6}" y="${y + 4}" text-anchor="end" class="axis">${fmt(v)}</text>`;
  }
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const dots = pts.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="4.5" class="dot"><title>${fdate(p.x)}: ${fmt(p.y)}${unit}</title></circle>`).join('');
  const step = Math.max(1, Math.ceil(pts.length / 6));
  const labels = pts.map((p, i) => (i % step === 0 || i === pts.length - 1)
    ? `<text x="${X(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="axis">${esc(fdate(p.x))}</text>` : '').join('');
  const vals = pts.map((p, i) => `<text x="${X(i).toFixed(1)}" y="${(Y(p.y) - 9).toFixed(1)}" text-anchor="middle" class="val">${fmt(p.y)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Evolução">${g}<path d="${path}" class="line"/>${dots}${vals}${labels}</svg>`;
}
