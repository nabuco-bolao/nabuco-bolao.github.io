'use strict';
/* Bolão Copa 2026 — app estático. Dados em /data, resultados ao vivo via ESPN. */

const $ = (s, r = document) => r.querySelector(s);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

const estado = { jogos: [], palpites: [], resultados: { grupos: {}, master: {} }, matamata: null,
  tabela: [], aba: 'hoje', aoVivo: {}, parResultado: {}, odds: {},
  sel: { p: null, a: null, b: null, scope: 'consolidado', dia: null } };

const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719';
const INTERVALO = 60000;

const FASE_LABEL = { grupos: 'Fase de grupos', '32avos': '32-avos de final', '16avos': '16-avos de final',
  oitavas: 'Oitavas de final', quartas: 'Quartas de final', semis: 'Semifinais', terceiro: 'Disputa de 3º lugar', final: 'Final' };
const FASE_CURTA = { grupos: 'Grupos', '32avos': '32-avos', '16avos': '16-avos', oitavas: 'Oitavas',
  quartas: 'Quartas', semis: 'Semis', terceiro: '3º lugar', final: 'Final' };
const ORDEM_MATA = ['32avos', '16avos', 'oitavas', 'quartas', 'semis', 'terceiro', 'final'];

const TIME_EN_PT = {
  mexico:'México', southafrica:'África do Sul', southkorea:'Coreia do Sul', korearepublic:'Coreia do Sul',
  czechrepublic:'República Tcheca', czechia:'República Tcheca', canada:'Canadá', qatar:'Catar',
  switzerland:'Suíça', bosniaherzegovina:'Bósnia e Herzegovina', bosniaandherzegovina:'Bósnia e Herzegovina',
  brazil:'Brasil', morocco:'Marrocos', haiti:'Haiti', scotland:'Escócia',
  usa:'Estados Unidos', unitedstates:'Estados Unidos', paraguay:'Paraguai', australia:'Austrália',
  turkey:'Turquia', turkiye:'Turquia', germany:'Alemanha', curacao:'Curaçao',
  ivorycoast:'Costa do Marfim', cotedivoire:'Costa do Marfim', ecuador:'Equador',
  netherlands:'Holanda', japan:'Japão', tunisia:'Tunísia', sweden:'Suécia',
  belgium:'Bélgica', egypt:'Egito', iran:'Irã', iriran:'Irã', newzealand:'Nova Zelândia',
  spain:'Espanha', capeverde:'Cabo Verde', saudiarabia:'Arábia Saudita', uruguay:'Uruguai',
  france:'França', senegal:'Senegal', norway:'Noruega', iraq:'Iraque',
  argentina:'Argentina', algeria:'Argélia', austria:'Áustria', jordan:'Jordânia',
  portugal:'Portugal', uzbekistan:'Uzbequistão', colombia:'Colômbia',
  drcongo:'RD Congo', congodr:'RD Congo', democraticrepublicofcongo:'RD Congo',
  england:'Inglaterra', croatia:'Croácia', ghana:'Gana', panama:'Panamá',
};
const ptDoTime = (en) => TIME_EN_PT[norm(en)];
const chaveJogo = (g) => `${g.data} | ${g.casa} x ${g.fora}`;
// consolida variações de nome de artilheiro (texto livre) num rótulo único
const ART_ALIAS = [
  [/mbapp|mbape|mpab|^mba/, 'Mbappé'], [/haaland/, 'Haaland'], [/vinicius|vinijr|^vini/, 'Vinícius Jr'],
  [/messi/, 'Messi'], [/neymar/, 'Neymar'], [/kane/, 'Harry Kane'], [/endrick/, 'Endrick'],
  [/yamal/, 'Lamine Yamal'], [/ronaldo|cr7/, 'Cristiano Ronaldo'], [/alvarez/, 'Julián Álvarez'],
  [/oyarzabal/, 'Mikel Oyarzabal'], [/markinhos/, 'Markinhos'], [/lautaro/, 'Lautaro Martínez'],
  [/griezmann/, 'Griezmann'], [/lewandowski/, 'Lewandowski'], [/kolomuani|kolo/, 'Kolo Muani'],
];
const canonArtLabel = (s) => { const n = norm(s); for (const [re, label] of ART_ALIAS) if (re.test(n)) return label; return (s || '').trim(); };
const canonArt = (s) => norm(canonArtLabel(s));
const hojeBR = () => { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; };

// bandeiras (emoji) por seleção
const FLAG = {
  'México':'🇲🇽','África do Sul':'🇿🇦','Coreia do Sul':'🇰🇷','República Tcheca':'🇨🇿','Canadá':'🇨🇦','Catar':'🇶🇦',
  'Suíça':'🇨🇭','Bósnia e Herzegovina':'🇧🇦','Brasil':'🇧🇷','Marrocos':'🇲🇦','Haiti':'🇭🇹','Escócia':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Estados Unidos':'🇺🇸','Paraguai':'🇵🇾','Austrália':'🇦🇺','Turquia':'🇹🇷','Alemanha':'🇩🇪','Curaçao':'🇨🇼',
  'Costa do Marfim':'🇨🇮','Equador':'🇪🇨','Holanda':'🇳🇱','Japão':'🇯🇵','Tunísia':'🇹🇳','Suécia':'🇸🇪',
  'Bélgica':'🇧🇪','Egito':'🇪🇬','Irã':'🇮🇷','Nova Zelândia':'🇳🇿','Espanha':'🇪🇸','Cabo Verde':'🇨🇻',
  'Arábia Saudita':'🇸🇦','Uruguai':'🇺🇾','França':'🇫🇷','Senegal':'🇸🇳','Noruega':'🇳🇴','Iraque':'🇮🇶',
  'Argentina':'🇦🇷','Argélia':'🇩🇿','Áustria':'🇦🇹','Jordânia':'🇯🇴','Portugal':'🇵🇹','Uzbequistão':'🇺🇿',
  'Colômbia':'🇨🇴','RD Congo':'🇨🇩','Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croácia':'🇭🇷','Gana':'🇬🇭','Panamá':'🇵🇦',
};
const bandeira = (n) => FLAG[n] ? FLAG[n] + ' ' : '';

// cor principal de cada seleção (para a barra de distribuição)
const COR = {
  'África do Sul':'#1a9e57','Canadá':'#e23b2e','Brasil':'#ffd400','Japão':'#1f5fd0','Catar':'#8d1b3d',
  'Coreia do Sul':'#1763c9','Alemanha':'#ffce00','Paraguai':'#d52b1e','Holanda':'#ff7a1a','Marrocos':'#c1272d',
  'Costa do Marfim':'#ff8a1e','Noruega':'#d24158','França':'#2a6fd6','Suécia':'#ffd84d','México':'#0a8a4f',
  'Equador':'#ffd100','Inglaterra':'#e23b4d','RD Congo':'#3aa3ff','Bélgica':'#f3d02f','Senegal':'#1aa05a',
  'Estados Unidos':'#4a6fd0','Bósnia e Herzegovina':'#ffd200','Espanha':'#d6303f','Áustria':'#d9dde3',
  'Portugal':'#1f9d4d','Croácia':'#ff3b3b','Suíça':'#e23b2e','Argélia':'#1aa05a','Austrália':'#13a05a',
  'Egito':'#e2384a','Argentina':'#7fb6ee','Cabo Verde':'#2f6fd0','Colômbia':'#ffcd00','Gana':'#1faf63',
};
const corTime = (n) => COR[n] || '#64748b';

// odds americanas -> decimais (formato Betano/Bet365)
function amerParaDec(a) { a = Number(a); if (!a) return null; return a > 0 ? +(1 + a / 100).toFixed(2) : +(1 + 100 / Math.abs(a)).toFixed(2); }

/* ---------- pontuação ---------- */
function pontos(palpite, res, mata) {
  if (!palpite || !res || res.gc == null || res.gf == null) return null;
  const [pa, pb] = palpite, gc = res.gc, gf = res.gf;
  if (pa === gc && pb === gf) return 5;
  if (Math.sign(pa - pb) === Math.sign(gc - gf)) return 2;
  return 0;
}

/* ---------- carregar ---------- */
async function carregar() {
  const [jogos, palpites, resultados, matamata] = await Promise.all([
    fetch('data/jogos.json').then(r => r.json()),
    fetch('data/palpites.json').then(r => r.json()),
    fetch('data/resultados.json?_=' + Date.now()).then(r => r.json()),
    fetch('data/palpites_matamata.json?_=' + Date.now()).then(r => r.json()).catch(() => null),
  ]);
  estado.jogos = jogos; estado.palpites = palpites; estado.resultados = resultados; estado.matamata = matamata;
}

/* fases que já têm jogos (para seletor e cálculo) */
function fasesAtivas() {
  const arr = estado.jogos.length ? [{ key: 'grupos', mata: false }] : [];
  if (estado.matamata && estado.matamata.fases)
    for (const k of ORDEM_MATA) { const f = estado.matamata.fases[k]; if (f && (f.jogos || []).length) arr.push({ key: k, mata: true }); }
  return arr;
}

/* lista unificada de jogos */
function todosJogos() {
  const arr = estado.jogos.map((g, i) => ({ ...g, tipo: 'grupo', gi: i, mata: false, faseKey: 'grupos' }));
  if (estado.matamata && estado.matamata.fases)
    for (const k of ORDEM_MATA) {
      const fase = estado.matamata.fases[k]; if (!fase) continue;
      (fase.jogos || []).forEach(j => arr.push({ data: j.data, hora: j.hora, casa: j.casa, fora: j.fora, tipo: 'mata', fase: k, faseKey: k, id: String(j.id), mata: true }));
    }
  return arr;
}
function resultadoDe(j) {
  if (!j.mata) return estado.resultados.grupos[chaveJogo(j)] || null;
  const fase = estado.matamata.fases[j.fase];
  return (fase.resultados && fase.resultados[j.id]) || null;
}
function aoVivoDe(j) { return estado.aoVivo[j.mata ? (j.fase + '#' + j.id) : chaveJogo(j)]; }
function palpiteDe(nome, j) {
  if (!j.mata) { const p = estado.palpites.find(x => x.nome === nome); return p ? p.p[j.gi] : null; }
  const fase = estado.matamata.fases[j.fase];
  return (fase.palpites && fase.palpites[nome]) ? fase.palpites[nome][j.id] : null;
}

/* ---------- ESPN ---------- */
function indicePares() {
  const idx = {};
  estado.jogos.forEach(g => { idx[[norm(g.casa), norm(g.fora)].sort().join('|')] = { tipo: 'grupo', chave: chaveJogo(g), casaNorm: norm(g.casa) }; });
  if (estado.matamata && estado.matamata.fases)
    for (const [fk, fase] of Object.entries(estado.matamata.fases))
      (fase.jogos || []).forEach(j => { idx[[norm(j.casa), norm(j.fora)].sort().join('|')] = { tipo: 'mata', fase: fk, id: String(j.id), casaNorm: norm(j.casa) }; });
  return idx;
}
async function aplicarAoVivo() {
  let dados;
  try { const r = await fetch(ESPN_URL, { cache: 'no-store' }); if (!r.ok) return false; dados = await r.json(); }
  catch (e) { return false; }
  const eventos = (dados && dados.events) || [];
  const idx = indicePares(); estado.aoVivo = {}; estado.odds = {};
  for (const e of eventos) {
    const tp = e.status && e.status.type; if (!tp) continue;
    const comp = e.competitions && e.competitions[0]; const cs = (comp && comp.competitors) || [];
    const home = cs.find(x => x.homeAway === 'home'), away = cs.find(x => x.homeAway === 'away'); if (!home || !away) continue;
    const casaPT = ptDoTime(home.team && home.team.displayName), foraPT = ptDoTime(away.team && away.team.displayName);
    if (!casaPT || !foraPT) continue;
    // guarda resultado/vencedor por par de times (usado no chaveamento)
    if (tp.state === 'post') {
      const hs = Number(home.score), as = Number(away.score);
      const wComp = cs.find(x => x.winner === true);
      const winner = wComp ? ptDoTime(wComp.team && wComp.team.displayName) : (hs > as ? casaPT : as > hs ? foraPT : null);
      estado.parResultado[[norm(casaPT), norm(foraPT)].sort().join('|')] = { casa: casaPT, fora: foraPT, gc: hs, gf: as, winner };
    }
    const ref = idx[[norm(casaPT), norm(foraPT)].sort().join('|')]; if (!ref) continue;
    const casaEhHome = ref.casaNorm === norm(casaPT);
    const gc = Number(casaEhHome ? home.score : away.score), gf = Number(casaEhHome ? away.score : home.score);
    if (Number.isNaN(gc) || Number.isNaN(gf)) continue;
    const refKey = ref.tipo === 'grupo' ? ref.chave : (ref.fase + '#' + ref.id);
    // odds (DraftKings via ESPN) -> casa/empate/visitante em decimal
    const oo = (comp.odds || []).find(x => x && x.moneyline);
    if (oo) {
      const ml = oo.moneyline, get = (s) => { const o = ml[s]; if (!o) return null; return amerParaDec((o.close && o.close.odds) || (o.open && o.open.odds)); };
      const h = get('home'), a = get('away'), dr = get('draw');
      if (h && a) estado.odds[refKey] = { casa: casaEhHome ? h : a, fora: casaEhHome ? a : h, empate: dr, prov: (oo.provider || {}).name || 'casa' };
    }
    if (tp.state === 'in') estado.aoVivo[refKey] = { gc, gf, det: tp.shortDetail || 'ao vivo' };
    if (tp.state !== 'post') continue;
    if (ref.tipo === 'grupo') { estado.resultados.grupos[ref.chave] = Object.assign(estado.resultados.grupos[ref.chave] || {}, { gc, gf }); }
    else { const fase = estado.matamata.fases[ref.fase]; fase.resultados = fase.resultados || {}; const a = fase.resultados[ref.id]; if (!a || !a.manual) fase.resultados[ref.id] = { gc, gf }; }
  }
  return true;
}

/* ---------- cálculo (por fase + total) ---------- */
const novoAcc = () => ({ pts: 0, exatos: 0, certos: 0, zeros: 0, resolvidos: 0 });
function somar(a, pt, exato) { if (pt == null) return; a.resolvidos++; a.pts += pt; if (pt === exato) a.exatos++; else if (pt > 0) a.certos++; else a.zeros++; }

function calcular() {
  const master = estado.resultados.master || {};
  const campOK = master.campeao ? norm(master.campeao) : null;
  const artLista = Array.isArray(master.artilheiro) ? master.artilheiro.map(canonArt) : (master.artilheiro ? [canonArt(master.artilheiro)] : []);

  estado.tabela = estado.palpites.map(p => {
    const fases = {};
    const g = novoAcc();
    estado.jogos.forEach((j, i) => somar(g, pontos(p.p[i], estado.resultados.grupos[chaveJogo(j)], false), 5));
    fases.grupos = g;
    if (estado.matamata && estado.matamata.fases)
      for (const fk of ORDEM_MATA) {
        const fase = estado.matamata.fases[fk]; if (!fase || !(fase.jogos || []).length) continue;
        const a = novoAcc();
        fase.jogos.forEach(j => { const pal = (fase.palpites && fase.palpites[p.nome]) ? fase.palpites[p.nome][String(j.id)] : null; somar(a, pontos(pal, fase.resultados && fase.resultados[String(j.id)], true), 5); });
        fases[fk] = a;
      }
    const camp = !!(campOK && norm(p.campeao) === campOK);
    const art = !!(artLista.length && artLista.includes(canonArt(p.artilheiro)));
    const masterPts = (camp ? 7 : 0) + (art ? 5 : 0);
    const total = novoAcc();
    for (const k in fases) { total.pts += fases[k].pts; total.exatos += fases[k].exatos; total.certos += fases[k].certos; total.zeros += fases[k].zeros; total.resolvidos += fases[k].resolvidos; }
    total.pts += masterPts;
    return { nome: p.nome, fases, masterPts, camp, art, total };
  });
}

function rankingDe(scope) {
  return estado.tabela.map(t => {
    const s = scope === 'consolidado' ? t.total : (t.fases[scope] || novoAcc());
    return { nome: t.nome, pts: s.pts, exatos: s.exatos, certos: s.certos, zeros: s.zeros, camp: t.camp, art: t.art };
  }).sort((a, b) => b.pts - a.pts || b.exatos - a.exatos || a.zeros - b.zeros ||
      (scope === 'consolidado' ? (b.camp - a.camp) || (b.art - a.art) : 0) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/* placar mais palpitado de um jogo */
function topPalpite(j) {
  const g = {};
  estado.palpites.forEach(p => { const pal = palpiteDe(p.nome, j); if (!pal) return; const k = pal[0] + 'x' + pal[1]; (g[k] = g[k] || { pa: pal[0], pb: pal[1], n: 0 }).n++; });
  let best = null, tot = 0;
  for (const v of Object.values(g)) { tot += v.n; if (!best || v.n > best.n) best = v; }
  return best ? { ...best, tot } : null;
}

/* contagem de palpites master (campeão/artilheiro) */
function contagem(getter, canon) {
  const m = {};
  estado.palpites.forEach(p => { let v = (getter(p) || '').trim(); if (!v) return; if (canon) v = canon(v); const k = norm(v); (m[k] = m[k] || { label: v, n: 0 }).n++; });
  return Object.values(m).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'pt-BR'));
}

// stats de um participante numa fase, podendo ignorar jogos de uma data (p/ variação do dia)
function statsScope(p, scope, skipDate) {
  const a = novoAcc();
  if (scope === 'consolidado' || scope === 'grupos')
    estado.jogos.forEach((g, i) => { if (skipDate && g.data === skipDate) return; somar(a, pontos(p.p[i], estado.resultados.grupos[chaveJogo(g)], false), 5); });
  if (estado.matamata) for (const fk of ORDEM_MATA) {
    if (scope !== 'consolidado' && scope !== fk) continue;
    const fase = estado.matamata.fases[fk]; if (!fase || !(fase.jogos || []).length) continue;
    fase.jogos.forEach(j => { if (skipDate && j.data === skipDate) return; const pal = (fase.palpites && fase.palpites[p.nome]) ? fase.palpites[p.nome][String(j.id)] : null; somar(a, pontos(pal, fase.resultados && fase.resultados[String(j.id)], true), 8); });
  }
  if (scope === 'consolidado') {
    const m = estado.resultados.master || {}, campOK = m.campeao ? norm(m.campeao) : null;
    const artL = Array.isArray(m.artilheiro) ? m.artilheiro.map(canonArt) : (m.artilheiro ? [canonArt(m.artilheiro)] : []);
    if (campOK && norm(p.campeao) === campOK) a.pts += 7;
    if (artL.length && artL.includes(canonArt(p.artilheiro))) a.pts += 5;
  }
  return a;
}
function posicoesScope(scope, skipDate) {
  const arr = estado.palpites.map(p => ({ nome: p.nome, ...statsScope(p, scope, skipDate) }))
    .sort((a, b) => b.pts - a.pts || b.exatos - a.exatos || a.zeros - b.zeros || a.nome.localeCompare(b.nome, 'pt-BR'));
  const pos = {}; arr.forEach((x, i) => pos[x.nome] = i + 1); return pos;
}

/* ---------- detalhe de um jogo: palpites de todos ---------- */
function abrirJogo(j) {
  const res = resultadoDe(j), vivo = aoVivoDe(j), exato = 5;
  // agrupa participantes por placar palpitado
  const grupos = {};
  estado.palpites.forEach(p => { const pal = palpiteDe(p.nome, j); if (!pal) return; const k = pal[0] + ' x ' + pal[1];
    (grupos[k] = grupos[k] || { pa: pal[0], pb: pal[1], nomes: [] }).nomes.push(p.nome); });
  let arr = Object.values(grupos).map(g => ({ ...g, n: g.nomes.length, pt: pontos([g.pa, g.pb], res, j.mata) }));
  // ordena por pontos (se encerrado) e depois pelo placar mais escolhido
  arr.sort((a, b) => (res ? (b.pt || 0) - (a.pt || 0) : 0) || b.n - a.n || a.pa - b.pa || a.pb - b.pb);
  arr.forEach(g => g.nomes.sort((x, y) => x.localeCompare(y, 'pt-BR')));
  const semPalpite = estado.palpites.length - arr.reduce((s, g) => s + g.n, 0);
  let ex = 0, ac = 0, er = 0; arr.forEach(g => { if (g.pt == null) return; if (g.pt === exato) ex += g.n; else if (g.pt > 0) ac += g.n; else er += g.n; });

  const placar = res ? `${res.gc} <span class="muted">x</span> ${res.gf}` : vivo ? `${vivo.gc} <span class="muted">x</span> ${vivo.gf}` : '<span class="muted">a definir</span>';
  const status = res ? '<span class="badge fim">encerrado</span>' : vivo ? `<span class="badge" style="color:var(--acc2)">🔴 ${esc(vivo.det)}</span>` : `<span class="badge">${esc(j.hora || j.data)}</span>`;

  const corpo = arr.map(g => {
    const cls = g.pt == null ? '' : 'pt' + g.pt;
    const bdg = g.pt == null ? '' : `<span class="ppt ${cls}">+${g.pt}</span>`;
    return `<div class="grp">
      <div class="grp-h"><span class="placar-mini ${cls}">${g.pa} x ${g.pb}</span>
        <span class="small muted">${g.n} ${g.n > 1 ? 'palpites' : 'palpite'}</span>${bdg}</div>
      <div class="grp-nomes">${g.nomes.map(esc).join(', ')}</div></div>`;
  }).join('');

  const ov = el(`<div class="overlay"><div class="modal">
    <div class="modal-h">
      <div><div style="font-weight:700">${bandeira(j.casa)}${esc(j.casa)} <span class="muted">x</span> ${bandeira(j.fora)}${esc(j.fora)}</div>
      <div class="small muted">${esc(j.data)}${j.hora ? ' · ' + esc(j.hora) : ''} · ${esc(FASE_LABEL[j.faseKey] || '')}</div></div>
      <button class="x" aria-label="Fechar">✕</button>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:14px;border-bottom:1px solid var(--line)">
      <span class="placar" style="font-size:20px">${placar}</span> ${status}
    </div>
    ${res
      ? `<div class="dist" style="padding:10px 16px">🎯 ${ex} cravaram · ✅ ${ac} acertaram o vencedor · ❌ ${er} erraram</div>`
      : `<div class="dist" style="padding:10px 16px">⏳ Placar ao vivo — a pontuação entra no ranking só quando o jogo encerrar.</div>`}
    <div class="dist" style="padding:2px 16px 6px;color:var(--mut)">Palpites por placar ${res ? '(ordenados por pontos)' : '(do mais escolhido ao menos)'}:</div>
    ${corpo}
    ${semPalpite ? `<div class="dist" style="padding:8px 16px 14px">${semPalpite} sem palpite registrado.</div>` : '<div style="height:10px"></div>'}
  </div></div>`);
  const fechar = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov) fechar(); });
  ov.querySelector('.x').addEventListener('click', fechar);
  document.body.appendChild(ov);
}

/* ---------- montagem de lista de jogos (clicável) ---------- */
function blocoJogos(lista) {
  const frag = document.createDocumentFragment();
  const dias = [];
  lista.forEach(j => { let d = dias.find(x => x.data === j.data); if (!d) { d = { data: j.data, jogos: [] }; dias.push(d); } d.jogos.push(j); });
  dias.forEach(dia => {
    frag.appendChild(el(`<div class="dia-h">${esc(dia.data)}</div>`));
    const card = el(`<div class="card"></div>`);
    dia.jogos.forEach(j => {
      const res = resultadoDe(j), vivo = aoVivoDe(j);
      let placar, pcls = 'placar', badge;
      if (res) { placar = `${res.gc} <span class="muted">x</span> ${res.gf}`; badge = `<span class="badge fim">encerrado</span>`; }
      else if (vivo) { placar = `${vivo.gc} <span class="muted">x</span> ${vivo.gf}`; pcls += ' vivo'; badge = `<span class="badge" style="color:var(--acc2)">🔴 ${esc(vivo.det)}</span>`; }
      else { placar = '–'; pcls += ' aberto'; badge = `<span class="badge">${esc(j.hora || 'a definir')}</span>`; }
      const item = el(`<div class="jogo-item clicavel">
        <div class="jogo">
          <div class="time casa">${esc(j.casa)}</div>
          <div class="${pcls}">${placar}</div>
          <div class="time fora">${esc(j.fora)}</div>
        </div>
        <div class="jogo-meta">${badge} <span class="ver-todos">ver palpites de todos ›</span></div>
      </div>`);
      item.addEventListener('click', () => abrirJogo(j));
      card.appendChild(item);
    });
    frag.appendChild(card);
  });
  return frag;
}

/* pontos que cada participante fez HOJE (jogos com data de hoje já encerrados) */
function pontosHoje() {
  const hoje = hojeBR(), m = {};
  todosJogos().forEach(j => {
    if (j.data !== hoje) return; const res = resultadoDe(j); if (!res) return;
    estado.palpites.forEach(p => { const pt = pontos(palpiteDe(p.nome, j), res, j.mata); if (pt != null) m[p.nome] = (m[p.nome] || 0) + pt; });
  });
  return m;
}

/* datas: utilidades de rótulo */
const dataKey = (d) => { const [dd, mm] = d.split('/').map(Number); return mm * 100 + dd; };
const DIASEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function dataObj(d) { const [dd, mm] = d.split('/').map(Number); return new Date(2026, mm - 1, dd); }
function rotuloData(d) {
  const hoje = hojeBR(); const amanha = (() => { const x = dataObj(hoje); x.setDate(x.getDate() + 1); return `${String(x.getDate()).padStart(2,'0')}/${String(x.getMonth()+1).padStart(2,'0')}`; })();
  if (d === hoje) return `Hoje · ${d}`;
  if (d === amanha) return `Amanhã · ${d}`;
  return `${DIASEM[dataObj(d).getDay()]} · ${d}`;
}

/* ---------- CHAVEAMENTO (estrutura oficial FIFA 2026) ---------- */
// ordem vertical pensada para o desenho de chave (top→bottom)
const CHAVE = [
  { fase: '16avos', titulo: '16-avos', ids: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87] },
  { fase: 'oitavas', titulo: 'Oitavas', jogos: [
    { id: 89, data: '04/07', hora: '18:00', a: { w: 74 }, b: { w: 77 } },
    { id: 90, data: '04/07', hora: '14:00', a: { w: 73 }, b: { w: 75 } },
    { id: 93, data: '06/07', hora: '16:00', a: { w: 83 }, b: { w: 84 } },
    { id: 94, data: '06/07', hora: '21:00', a: { w: 81 }, b: { w: 82 } },
    { id: 91, data: '05/07', hora: '17:00', a: { w: 76 }, b: { w: 78 } },
    { id: 92, data: '05/07', hora: '21:00', a: { w: 79 }, b: { w: 80 } },
    { id: 95, data: '07/07', hora: '13:00', a: { w: 86 }, b: { w: 88 } },
    { id: 96, data: '07/07', hora: '17:00', a: { w: 85 }, b: { w: 87 } },
  ]},
  { fase: 'quartas', titulo: 'Quartas', jogos: [
    { id: 97, data: '09/07', hora: '17:00', a: { w: 89 }, b: { w: 90 } },
    { id: 98, data: '10/07', hora: '16:00', a: { w: 93 }, b: { w: 94 } },
    { id: 99, data: '11/07', hora: '18:00', a: { w: 91 }, b: { w: 92 } },
    { id: 100, data: '11/07', hora: '22:00', a: { w: 95 }, b: { w: 96 } },
  ]},
  { fase: 'semis', titulo: 'Semifinais', jogos: [
    { id: 101, data: '14/07', hora: '16:00', a: { w: 97 }, b: { w: 98 } },
    { id: 102, data: '15/07', hora: '', a: { w: 99 }, b: { w: 100 } },
  ]},
  { fase: 'final', titulo: 'Final', jogos: [
    { id: 104, data: '19/07', hora: '', a: { w: 101 }, b: { w: 102 } },
  ]},
];
function jogoMataInfo(id) { // dados do jogo das 16-avos (id 73-88) a partir do palpites_matamata
  const fase = estado.matamata && estado.matamata.fases['16avos'];
  const j = fase && (fase.jogos || []).find(x => String(x.id) === String(id));
  return j || null;
}
const _chaveMatch = {};
function chaveMatchById(id) {
  if (Object.keys(_chaveMatch).length === 0) CHAVE.forEach(r => (r.jogos || []).forEach(j => _chaveMatch[j.id] = j));
  return _chaveMatch[id];
}
function timeDoSlot(slot) { // retorna nome do time ou null
  if (slot.fixed) return slot.fixed;
  return vencedorJogo(slot.w);
}
function vencedorJogo(id) {
  if (id >= 73 && id <= 88) { // 16-avos: times fixos
    const j = jogoMataInfo(id); if (!j) return null;
    const r = estado.parResultado[[norm(j.casa), norm(j.fora)].sort().join('|')];
    return r ? r.winner : null;
  }
  const m = chaveMatchById(id); if (!m) return null;
  const A = timeDoSlot(m.a), B = timeDoSlot(m.b); if (!A || !B) return null;
  const r = estado.parResultado[[norm(A), norm(B)].sort().join('|')];
  return r ? r.winner : null;
}

/* ---------- RENDER ---------- */
function render() {
  const app = $('#app'); app.innerHTML = '';
  ({ hoje: renderHoje, ranking: renderRanking, jogos: renderJogos, chave: renderChave, participante: renderParticipante, comparar: renderComparar, master: renderMaster, regras: renderRegras }[estado.aba] || renderHoje)(app);
}

function renderHoje(c) {
  const todos = todosJogos(), hoje = hojeBR();
  const datas = [...new Set(todos.map(j => j.data))].filter(Boolean).sort((a, b) => dataKey(a) - dataKey(b));
  let futuras = datas.filter(d => dataKey(d) >= dataKey(hoje));
  if (!futuras.length) futuras = [hoje];
  if (!estado.sel.dia || !futuras.includes(estado.sel.dia)) estado.sel.dia = futuras.includes(hoje) ? hoje : futuras[0];
  const opts = futuras.map(d => `<option value="${d}" ${d === estado.sel.dia ? 'selected' : ''}>${rotuloData(d)}</option>`).join('');
  c.appendChild(el(`<div class="card" style="padding:12px 14px"><div class="row2"><div>
    <label class="small muted">Ver jogos de</label><select id="selDia">${opts}</select></div></div></div>`));
  c.appendChild(el(`<div class="small muted" style="margin:0 4px 8px">Toque em um jogo para ver o palpite de todos os participantes.</div>`));
  const box = el(`<div id="boxHoje"></div>`); c.appendChild(box);
  const desenhar = () => {
    const dia = $('#selDia').value; estado.sel.dia = dia; box.innerHTML = '';
    const lista = todos.filter(j => j.data === dia).sort((a, b) => (a.hora || '99:99').localeCompare(b.hora || '99:99'));
    if (!lista.length) { box.appendChild(el(`<div class="card" style="padding:30px;text-align:center"><div style="font-size:34px;margin-bottom:6px">📅</div><div class="muted">Nenhum jogo nesse dia.</div></div>`)); return; }
    lista.forEach(j => {
      const res = resultadoDe(j), vivo = aoVivoDe(j);
      let placar, pcls = 'placar', badge;
      if (res) { placar = `${res.gc} <span class="muted">x</span> ${res.gf}`; badge = `<span class="badge fim">encerrado</span>`; }
      else if (vivo) { placar = `${vivo.gc} <span class="muted">x</span> ${vivo.gf}`; pcls += ' vivo'; badge = `<span class="badge" style="color:var(--acc2)">🔴 ${esc(vivo.det)}</span>`; }
      else { placar = '–'; pcls += ' aberto'; badge = `<span class="badge">${esc(j.hora || 'a definir')}</span>`; }
      const top = topPalpite(j);
      const maisP = top ? `<div class="mais-palpitado">🔮 Placar mais palpitado: <b>${top.pa} x ${top.pb}</b> <span class="muted">· ${top.n} de ${top.tot}</span></div>` : '';
      const hora = j.hora ? `<div class="jogo-hora">🕐 ${esc(j.hora)} <span class="muted">(Brasília)</span></div>` : '';
      // distribuição: vitória casa / empate / vitória visitante
      let dc = 0, de = 0, df = 0, dt = 0;
      estado.palpites.forEach(p => { const pal = palpiteDe(p.nome, j); if (!pal) return; dt++; if (pal[0] > pal[1]) dc++; else if (pal[0] < pal[1]) df++; else de++; });
      let barra = '';
      if (dt) {
        const pc = Math.round(dc / dt * 100), pe = Math.round(de / dt * 100), pf = 100 - pc - pe;
        const cc = corTime(j.casa), cf = corTime(j.fora);
        barra = `<div class="dist-wrap">
          <div class="dist-bar"><i style="width:${pc}%;background:${cc}"></i><i class="emp" style="width:${pe}%"></i><i style="width:${pf}%;background:${cf}"></i></div>
          <div class="dist-leg"><span style="color:${cc}">${bandeira(j.casa)}Casa ${pc}%</span><span class="muted">Empate ${pe}%</span><span style="color:${cf}">Fora ${pf}% ${bandeira(j.fora)}</span></div>
        </div>`;
      }
      const od = estado.odds[j.mata ? (j.fase + '#' + j.id) : chaveJogo(j)];
      let oddsHtml = '';
      if (od) {
        const nums = [od.casa, od.empate, od.fora].filter(v => v != null);
        const mn = Math.min(...nums), mx = Math.max(...nums), dist = mn !== mx;
        const cls = (v) => (!dist || v == null) ? '' : v === mn ? 'fav' : v === mx ? 'zebra' : '';
        const ico = (v) => (!dist || v == null) ? '' : v === mn ? ' ⭐' : v === mx ? ' 🦓' : '';
        const box = (v, lbl) => `<span class="odd ${cls(v)}"><small>${lbl}</small> <b>${v ?? '—'}</b>${ico(v)}</span>`;
        oddsHtml = `<div class="odds-row">${box(od.casa, 'Casa')}${box(od.empate, 'Empate')}${box(od.fora, 'Visit.')}</div>
        <div class="odds-nota">📌 Odds da casa de apostas ${esc(od.prov)} (somem quando o jogo começa). Servem apenas como parâmetro para avaliar os palpites do bolão.</div>`;
      }
      const item = el(`<div class="card jogo-card clicavel">
        ${hora}
        <div class="jogo"><div class="time casa">${bandeira(j.casa)}${esc(j.casa)}</div><div class="${pcls}">${placar}</div>
        <div class="time fora">${bandeira(j.fora)}${esc(j.fora)}</div></div>
        <div class="jogo-meta">${badge} <span class="ver-todos">ver palpites de todos ›</span></div>
        ${maisP}${barra}${oddsHtml}</div>`);
      item.addEventListener('click', () => abrirJogo(j));
      box.appendChild(item);
    });
  };
  $('#selDia').addEventListener('change', desenhar); desenhar();
}

const QUAD = (() => { const m = {}; [[74,77,73,75,89,90,97],[83,84,81,82,93,94,98],[76,78,79,80,91,92,99],[86,88,85,87,95,96,100]].forEach((a, qi) => a.forEach(id => m[id] = qi)); return m; })();
const QUAD_LET = ['A', 'B', 'C', 'D'];
function corMatch(id) { return id === 104 ? 'fin' : (id === 101 || id === 102) ? 'semi' : ('q' + QUAD[id]); }

function renderChave(c) {
  c.appendChild(el(`<div class="small muted" style="margin:6px 4px 8px">🗺️ Caminho até a final. As cores marcam as <b>4 chaves</b>: a vencedora de cada chave vai às quartas; depois <b>A × B</b> e <b>C × D</b> decidem as semifinais. Deslize para o lado ➡️</div>`));
  c.appendChild(el(`<div class="chave-legenda">
    <span class="lg q0">Chave A</span><span class="lg q1">Chave B</span>
    <span class="lg q2">Chave C</span><span class="lg q3">Chave D</span>
    <span class="lg-obs">A+B → Semifinal 1 · C+D → Semifinal 2</span></div>`));
  const wrap = el(`<div class="bracket"></div>`);
  CHAVE.forEach(rod => {
    const col = el(`<div class="rnd"><div class="rnd-t">${esc(rod.titulo)}</div><div class="rnd-matches"></div></div>`);
    const mc = col.querySelector('.rnd-matches');
    const jogos = rod.fase === '16avos'
      ? rod.ids.map(id => { const j = jogoMataInfo(id); return j ? { id, data: j.data, hora: j.hora, a: { fixed: j.casa }, b: { fixed: j.fora } } : null; }).filter(Boolean)
      : rod.jogos;
    jogos.forEach(j => {
      const A = timeDoSlot(j.a), B = timeDoSlot(j.b), venc = vencedorJogo(j.id), q = QUAD[j.id];
      const par = (A && B) ? estado.parResultado[[norm(A), norm(B)].sort().join('|')] : null;
      const nomeA = A ? bandeira(A) + A : `Venc. J${j.a.w}`, nomeB = B ? bandeira(B) + B : `Venc. J${j.b.w}`;
      const clsA = venc && A && norm(venc) === norm(A) ? 'venc' : '';
      const clsB = venc && B && norm(venc) === norm(B) ? 'venc' : '';
      const plA = par ? (par.casa === A ? par.gc : par.gf) : '', plB = par ? (par.casa === A ? par.gf : par.gc) : '';
      const tag = (rod.fase === '16avos' || rod.fase === 'oitavas') && q !== undefined ? `<span class="bm-tag q${q}">${QUAD_LET[q]}</span>` : '';
      mc.appendChild(el(`<div class="bm ${corMatch(j.id)}">
        <div class="bm-h">${tag}J${j.id} · ${esc(j.data || '')}${j.hora ? ' ' + esc(j.hora) : ''}</div>
        <div class="bm-l ${clsA} ${A ? '' : 'tbd'}"><span>${esc(nomeA)}</span>${par ? `<b class="bm-pl">${plA}</b>` : ''}</div>
        <div class="bm-l ${clsB} ${B ? '' : 'tbd'}"><span>${esc(nomeB)}</span>${par ? `<b class="bm-pl">${plB}</b>` : ''}</div>
      </div>`));
    });
    wrap.appendChild(col);
  });
  c.appendChild(wrap);
}

function renderRanking(c) {
  const ativas = fasesAtivas();
  const opts = [`<option value="consolidado">Consolidado (todas as fases)</option>`]
    .concat(ativas.map(f => `<option value="${f.key}">${FASE_LABEL[f.key]}</option>`)).join('');
  c.appendChild(el(`<div class="card" style="padding:12px 14px"><div class="row2"><div>
    <label class="small muted">Ver pontuação de</label>
    <select id="scope">${opts}</select></div></div></div>`));
  const box = el(`<div id="boxRank"></div>`); c.appendChild(box);
  const sel = $('#scope'); sel.value = estado.sel.scope;
  if (![...sel.options].some(o => o.value === estado.sel.scope)) { estado.sel.scope = 'consolidado'; sel.value = 'consolidado'; }

  const desenhar = () => {
    const scope = sel.value; estado.sel.scope = scope; box.innerHTML = '';
    const r = rankingDe(scope);
    const hojePts = pontosHoje();
    const posAntes = posicoesScope(scope, hojeBR());
    const resolvidos = todosJogos().filter(j => resultadoDe(j) && (scope === 'consolidado' || j.faseKey === scope))
      .sort((a, b) => (dataKey(a.data) - dataKey(b.data)) || ((a.hora || '').localeCompare(b.hora || '')));
    const ult5 = resolvidos.slice(-5);
    const totJogos = resolvidos.length;
    const lider = r.find(x => x.pts > 0) || r[0];
    const scopeLabel = scope === 'consolidado' ? 'todas as fases' : FASE_LABEL[scope];
    box.appendChild(el(`<div class="resumo-dia">
      <div class="pill">👥 <b>${r.length}</b> participantes</div>
      <div class="pill">⚽ <b>${totJogos}</b> jogos apurados</div>
      ${lider && lider.pts > 0 ? `<div class="pill">👑 Líder: <b>${esc(lider.nome)}</b> · ${lider.pts} pts</div>` : ''}
    </div>`));
    const card = el(`<div class="card"><div class="card-h"><span>🏅 Ranking · <span class="muted">${scopeLabel}</span></span>
      <span class="small muted hide-sm">➡️ deslize para ver mais colunas</span></div><div class="rank-scroll"></div></div>`);
    const tbl = el(`<table class="rank"><thead><tr>
      <th class="pos">#</th><th class="nm-col">Participante</th>
      <th class="num">Pts</th><th class="num">Dia</th>
      <th class="num">Exa</th><th class="num">Ven</th><th class="num">Zero</th>
      <th class="forma-h">Últimos 5</th></tr></thead><tbody></tbody></table>`);
    const tb = tbl.querySelector('tbody');
    r.forEach((x, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      const posNow = i + 1, mov = (posAntes[x.nome] || posNow) - posNow;
      const movHtml = mov > 0 ? `<span class="mov up">▲${mov}</span>` : mov < 0 ? `<span class="mov down">▼${-mov}</span>` : `<span class="mov eq">=</span>`;
      const hp = hojePts[x.nome] || 0;
      const dots = ult5.map(g => { const pt = pontos(palpiteDe(x.nome, g), resultadoDe(g), g.mata); const cls = pt == null ? 'd-na' : pt === 5 ? 'd-ex' : pt > 0 ? 'd-ac' : 'd-er'; return `<i class="dot ${cls}" title="${esc(g.casa)} x ${esc(g.fora)}"></i>`; }).join('');
      tb.appendChild(el(`<tr class="${i < 3 ? 'top' + (i + 1) : ''}">
        <td class="pos">${posNow}</td>
        <td class="nm-col"><div class="nome-cel"><span class="medal">${medal}</span><span class="nm">${esc(x.nome)}${x.camp ? ' 👑' : ''}${x.art ? ' ⚽' : ''}</span></div></td>
        <td class="num pts">${x.pts}</td>
        <td class="num dia">${movHtml}${hp > 0 ? `<span class="hoje-pt">+${hp}</span>` : ''}</td>
        <td class="num">${x.exatos}</td><td class="num">${x.certos}</td><td class="num">${x.zeros}</td>
        <td class="forma">${dots || '<span class="muted small">—</span>'}</td></tr>`));
    });
    card.querySelector('.rank-scroll').appendChild(tbl); box.appendChild(card);
    box.appendChild(el(`<div class="small muted" style="padding:6px">Dia = variação de posição hoje (+pts ganhos) · Exa = placar exato · Ven = só o vencedor · Zero = sem pontos · Últimos 5: 🟢 exato 🟡 vencedor 🔴 erro</div>`));
  };
  sel.addEventListener('change', desenhar); desenhar();
}

function renderJogos(c) {
  const ativas = fasesAtivas();
  const opts = [`<option value="todos">Todas as fases</option>`].concat(ativas.map(f => `<option value="${f.key}">${FASE_LABEL[f.key]}</option>`)).join('');
  c.appendChild(el(`<div class="card" style="padding:12px 14px"><div class="row2"><div>
    <label class="small muted">Fase</label><select id="fjogos">${opts}</select></div></div></div>`));
  c.appendChild(el(`<div class="small muted" style="margin:0 4px 4px">Toque em um jogo para ver o palpite de todos.</div>`));
  const cont = el(`<div id="lista-jogos"></div>`); c.appendChild(cont);
  const desenhar = () => {
    const f = $('#fjogos').value; cont.innerHTML = '';
    let lista = todosJogos();
    if (f !== 'todos') lista = lista.filter(j => j.faseKey === f);
    cont.appendChild(blocoJogos(lista));
  };
  $('#fjogos').addEventListener('change', desenhar); desenhar();
}

function selectParticipantes(id, sel) {
  const nomes = estado.palpites.map(p => p.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return `<select id="${id}"><option value="">— escolha —</option>${nomes.map(n => `<option ${n === sel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
}

function linhasPalpites(nome) {
  const jogos = todosJogos(); let html = '', secao = '';
  const tot = estado.tabela.find(t => t.nome === nome).total;
  jogos.forEach(j => {
    const tag = FASE_LABEL[j.faseKey];
    if (tag !== secao) { secao = tag; html += `<div class="dia-h">${tag}</div>`; }
    const pal = palpiteDe(nome, j), res = resultadoDe(j), pt = pontos(pal, res, j.mata);
    const cls = pt == null ? 'ptpend' : 'pt' + pt;
    html += `<div class="pl"><div class="pdata">${esc(j.data)}</div>
      <div>${esc(j.casa)} <span class="muted">x</span> ${esc(j.fora)}</div>
      <div class="ppal">${pal ? `${pal[0]} x ${pal[1]}` : '—'} <span class="pres">${res ? `(${res.gc} x ${res.gf})` : ''}</span></div>
      <div class="ppt ${cls}">${pt == null ? '·' : pt}</div></div>`;
  });
  return { html, tot };
}

function renderParticipante(c) {
  c.appendChild(el(`<div class="card" style="padding:12px 14px"><label class="small muted">Participante</label>${selectParticipantes('selP', estado.sel.p)}</div>`));
  const box = el(`<div id="boxP"></div>`); c.appendChild(box);
  const desenhar = () => {
    const nome = $('#selP').value; estado.sel.p = nome; box.innerHTML = '';
    if (!nome) { box.appendChild(el(`<div class="card" style="padding:28px;text-align:center"><span class="muted">Escolha um participante para ver os palpites.</span></div>`)); return; }
    const rk = rankingDe('consolidado').findIndex(x => x.nome === nome) + 1;
    const d = linhasPalpites(nome);
    box.appendChild(el(`<div class="card">
      <div class="total-pessoa">
        <div class="kv"><span>Pontos</span><span class="big">${d.tot.pts}</span></div>
        <div class="kv"><span>Posição</span><b>${rk}º</b></div>
        <div class="kv"><span>Exatos</span><b>${d.tot.exatos}</b></div>
        <div class="kv"><span>Vencedor</span><b>${d.tot.certos}</b></div>
        <div class="kv"><span>Zerados</span><b>${d.tot.zeros}</b></div>
      </div>${d.html}</div>`));
  };
  $('#selP').addEventListener('change', desenhar); desenhar();
}

function renderComparar(c) {
  c.appendChild(el(`<div class="card" style="padding:12px 14px"><div class="row2">
    <div><label class="small muted">Participante A</label>${selectParticipantes('selA', estado.sel.a)}</div>
    <div><label class="small muted">Participante B</label>${selectParticipantes('selB', estado.sel.b)}</div></div></div>`));
  const box = el(`<div id="boxC"></div>`); c.appendChild(box);
  const desenhar = () => {
    const a = $('#selA').value, b = $('#selB').value; estado.sel.a = a; estado.sel.b = b; box.innerHTML = '';
    if (!a || !b) { box.appendChild(el(`<div class="card" style="padding:28px;text-align:center"><span class="muted">Escolha dois participantes para comparar.</span></div>`)); return; }
    const ta = estado.tabela.find(x => x.nome === a), tb = estado.tabela.find(x => x.nome === b);
    const card = el(`<div class="card"><div class="card-h">Comparativo</div>
      <div class="total-pessoa">
        <div class="kv"><span>${esc(a)}</span><span class="big">${ta.total.pts}</span></div>
        <div class="kv"><span>${esc(b)}</span><span class="big">${tb.total.pts}</span></div>
      </div></div>`);
    const jogos = todosJogos(); let secao = '';
    jogos.forEach(j => {
      const res = resultadoDe(j), pa = palpiteDe(a, j), pb = palpiteDe(b, j);
      if (!res && !pa && !pb) return;
      const tag = FASE_LABEL[j.faseKey];
      if (tag !== secao) { secao = tag; card.appendChild(el(`<div class="dia-h">${tag}</div>`)); }
      const pta = pontos(pa, res, j.mata), ptb = pontos(pb, res, j.mata);
      card.appendChild(el(`<div class="pl" style="grid-template-columns:1fr auto 1fr">
        <div class="ppal" style="text-align:right">${pa ? `${pa[0]} x ${pa[1]}` : '—'} <span class="ppt pt${pta == null ? 'pend' : pta}">${pta == null ? '·' : pta}</span></div>
        <div class="small muted" style="text-align:center;min-width:78px">${esc(j.casa)}<br><b>${res ? `${res.gc} x ${res.gf}` : 'x'}</b><br>${esc(j.fora)}</div>
        <div class="ppal"><span class="ppt pt${ptb == null ? 'pend' : ptb}">${ptb == null ? '·' : ptb}</span> ${pb ? `${pb[0]} x ${pb[1]}` : '—'}</div>
      </div>`));
    });
    box.appendChild(card);
  };
  $('#selA').addEventListener('change', desenhar); $('#selB').addEventListener('change', desenhar); desenhar();
}

function renderMaster(c) {
  const master = estado.resultados.master || {};
  const campOK = master.campeao ? norm(master.campeao) : null;
  const artOK = Array.isArray(master.artilheiro) ? master.artilheiro.map(canonArt) : (master.artilheiro ? [canonArt(master.artilheiro)] : []);
  const bloco = (titulo, emoji, lista, acerto, vazio) => {
    const max = lista.length ? lista[0].n : 1;
    const linhas = lista.length ? lista.map(x => {
      const ok = acerto(x);
      return `<div class="barrow${ok ? ' acerto' : ''}">
        <div class="barlbl">${esc(x.label)}${ok ? ' ✅' : ''}</div>
        <div class="barwrap"><div class="barfill${ok ? ' ok' : ''}" style="width:${Math.max(6, Math.round(x.n / max * 100))}%"></div></div>
        <div class="barn">${x.n}</div></div>`;
    }).join('') : `<div class="muted small" style="padding:8px 2px">${vazio}</div>`;
    return el(`<div class="card"><div class="card-h">${emoji} ${titulo} <span class="small muted">${lista.length} ${lista.length === 1 ? 'opção' : 'opções'}</span></div><div style="padding:10px 14px 14px">${linhas}</div></div>`);
  };
  c.appendChild(el(`<div class="small muted" style="margin:6px 4px 10px">Palpites de <b>campeão</b> (vale <b>7 pts</b>) e <b>artilheiro</b> (vale <b>5 pts</b>) — apurados no fim da Copa.</div>`));
  c.appendChild(bloco('Campeão da Copa', '👑', contagem(p => p.campeao), x => !!(campOK && norm(x.label) === campOK), 'Nenhum palpite de campeão.'));
  c.appendChild(bloco('Artilheiro da Copa', '⚽', contagem(p => p.artilheiro, canonArtLabel), x => artOK.includes(canonArt(x.label)), 'Nenhum palpite de artilheiro.'));
}

function renderRegras(c) {
  c.appendChild(el(`
  <div class="regras">
    <div class="card reg-hero">
      <div class="reg-hero-ico">🏆</div>
      <div><div class="reg-hero-t">Regras do Bolão Nabuco</div>
      <div class="small muted">Copa do Mundo 2026 · a partir das 16-avos. Tudo o que vale ponto, num lugar só.</div></div>
    </div>

    <div class="card">
      <div class="card-h">🎯 Como pontua</div>
      <div style="padding:6px 14px 14px">
        <table class="reg">
          <thead><tr><th>Resultado do seu palpite</th><th class="cnum">Pontos</th></tr></thead>
          <tbody>
            <tr><td>Cravou o <b>placar exato</b></td><td class="cnum verde">5</td></tr>
            <tr><td>Acertou o <b>vencedor/empate</b>, mas errou o placar</td><td class="cnum ouro">2</td></tr>
            <tr><td>Errou o resultado</td><td class="cnum verm">0</td></tr>
          </tbody>
        </table>
        <div class="callout alerta">⚠️ Vale apenas o placar dos <b>90 minutos + acréscimos</b>. Prorrogação e pênaltis <b>não contam</b>, mesmo que definam quem se classifica.</div>
        <div class="reg-ex">
          <div><b>Exemplo</b> — palpite Brasil 2×1: real 2×1 (90') = <span class="verde">5</span>; real 3×1 p/ Brasil = <span class="ouro">2</span>; 1×1 e Brasil passa nos pênaltis = vale o 1×1 = <span class="verm">0</span>.</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-h">⭐ Palpites master (campeão e artilheiro)</div>
      <div style="padding:10px 14px 14px">
        <ul class="reg-lista">
          <li><b>Campeão da Copa</b> — acertou: <span class="verde">7 pontos</span></li>
          <li><b>Artilheiro da Copa</b> — acertou: <span class="verde">5 pontos</span></li>
          <li>Enviados <b>uma vez</b>, junto com os 16-avos, e valem até o fim da Copa.</li>
          <li>Empate na artilharia: vale o acerto para <b>qualquer</b> um dos líderes de gols.</li>
        </ul>
      </div>
    </div>

    <div class="card">
      <div class="card-h">🕐 Prazos e travamento</div>
      <div style="padding:10px 14px 14px">
        <ul class="reg-lista">
          <li><b>Cada fase:</b> palpites enviados antes do primeiro jogo da fase.</li>
          <li><b>Travamento:</b> depois do prazo, não há alteração de palpites.</li>
          <li>💾 Preenchendo logado na conta Google, o progresso é salvo sozinho.</li>
        </ul>
      </div>
    </div>

    <div class="card">
      <div class="card-h">⚖️ Critérios de desempate</div>
      <div style="padding:10px 14px 14px">
        <ol class="reg-lista num">
          <li>Maior número de <b>placares exatos</b>.</li>
          <li>Menor número de <b>jogos com 0 ponto</b>.</li>
          <li>Acerto do <b>campeão</b>.</li>
          <li>Acerto do <b>artilheiro</b>.</li>
          <li>Persistindo o empate: somam-se os prêmios das posições empatadas e divide-se igualmente.</li>
        </ol>
      </div>
    </div>

    <div class="card">
      <div class="card-h">💰 Premiação</div>
      <div style="padding:10px 14px 14px">
        <ul class="reg-lista">
          <li>Cota e divisão dos prêmios <b>combinadas no grupo</b> do Nabuco.</li>
        </ul>
      </div>
    </div>

    <div class="card">
      <div class="card-h">📝 Participação</div>
      <div style="padding:10px 14px 14px">
        <ul class="reg-lista">
          <li>Bolão do grupo <b>Nabuco</b>, iniciado na fase de <b>16-avos</b>.</li>
          <li>Palpites enviados pelo formulário; ranking atualizado ao vivo aqui.</li>
        </ul>
      </div>
    </div>
  </div>`));
}

/* ---------- carimbo + loop ---------- */
function carimbo(ok) {
  const d = new Date(); const hhmm = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const e = $('#atualizado'); e.textContent = ok ? `🟢 ao vivo · ${hhmm}` : `atualizado: ${estado.resultados.atualizado_em || '—'}`;
  e.classList.toggle('ok', ok); e.classList.remove('pulso'); void e.offsetWidth; e.classList.add('pulso');
}
async function tick() { const ok = await aplicarAoVivo(); calcular(); render(); carimbo(ok); }

async function init() {
  document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#tabs button').forEach(x => x.classList.remove('ativo'));
    b.classList.add('ativo'); estado.aba = b.dataset.aba; render();
  }));
  try { await carregar(); } catch (e) { $('#app').innerHTML = `<div class="loading">Erro ao carregar os dados.</div>`; return; }
  calcular(); render(); carimbo(false);
  tick(); setInterval(tick, INTERVALO);
}
init();
