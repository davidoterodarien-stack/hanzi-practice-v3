// Proyecto Supabase DEDICADO a hanzi-practice-v2 ("shuozhongwen") — separado
// de cualquier otra app.
const SUPABASE_URL = 'https://pwqwlfrlaxnybnkdauvk.supabase.co';
const SUPABASE_KEY = 'sb_publishable__0T0_tkgiEdgUGtwMoSHjA_xRd8btWE';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const { useState, useEffect, useMemo } = React;
const { createRoot } = ReactDOM;

const html = React.createElement;
const STORAGE_KEY = 'hanzi-practice-progress-v1';
const NAME_KEY = 'hanzi-practice-name-v1';

function loadVocab() {
  // Sin fallback hardcodeado: arranca vacío y se llena 100% desde Supabase
  // (tabla `vocabulary`). Ver App() -> useEffect de carga de contenido.
  return {};
}

function loadProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return { lessons: {} };
}

function saveProgress(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LESSON_THEMES = {}; // se puebla 100% desde Supabase (tabla lesson_themes)

function playCorrect() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + i * 0.09 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.25);
      osc.start(ctx.currentTime + i * 0.09);
      osc.stop(ctx.currentTime + i * 0.09 + 0.25);
    });
  } catch(e) {}
}

function playWrong() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, ctx.currentTime + offset);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + offset + 0.22);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.22);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.22);
    });
  } catch(e) {}
}


// ----------------- Descarga resumen -----------------
function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function downloadResumen(vocab, progress, lessons, playerName) {
  const safeName = escapeHtml(playerName);
  const date = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const pp = progress.prueba || {};

  const scoreColor = (p) => p >= 80 ? '#58CC02' : p >= 50 ? '#FFC800' : '#C1432B';
  const star = (p) => p >= 80 ? '⭐' : p > 0 ? '🔸' : '—';

  // Helper: render a table of missed words (hanzi / pinyin / español)
  const wordRows = (arr) => arr.map(w =>
    `<tr>
      <td style="font-family:'Noto Serif SC',serif;font-size:20px;padding:10px 12px;border-bottom:1px solid #E5E5E5">${w.hanzi}</td>
      <td style="color:#C1432B;font-weight:700;padding:10px 12px;border-bottom:1px solid #E5E5E5">${w.pinyin}</td>
      <td style="color:#777777;padding:10px 12px;border-bottom:1px solid #E5E5E5">${w.es}</td>
    </tr>`
  ).join('');

  // ── Lecciones regulares (1-8): tabla de puntajes ─────────────────────────
  const regularLessons = lessons.filter(id => id !== 'mod-paises' && id !== 'mod-numeros');
  const specialLessons = lessons.filter(id => id === 'mod-paises' || id === 'mod-numeros');

  const lessonRows = regularLessons.map(id => {
    const lp = progress.lessons[id] || {};
    const theme = LESSON_THEMES[id] || { name: 'Lección ' + id };
    const m = lp.match || 0, c = lp.cards || 0, q = lp.quiz || 0;
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #E5E5E5"><strong>Lección ${id}</strong><br><span style="font-size:12px;color:#777777">${theme.name}</span></td>
      <td style="color:${scoreColor(m)};font-weight:800;padding:10px 12px;border-bottom:1px solid #E5E5E5">${star(m)} ${m}%</td>
      <td style="color:${scoreColor(c)};font-weight:800;padding:10px 12px;border-bottom:1px solid #E5E5E5">${star(c)} ${c}%</td>
      <td style="color:${scoreColor(q)};font-weight:800;padding:10px 12px;border-bottom:1px solid #E5E5E5">${star(q)} ${q}%</td>
    </tr>`;
  }).join('');

  // ── Módulos especiales (países y números) ─────────────────────────────────
  const specialRows = specialLessons.map(id => {
    const lp = progress.lessons[id] || {};
    const theme = LESSON_THEMES[id] || { name: id === 'mod-paises' ? 'Países del mundo' : 'Los números' };
    const m = lp.match || 0, c = lp.cards || 0, q = lp.quiz || 0;
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #E5E5E5"><strong>${theme.name}</strong></td>
      <td style="color:${scoreColor(m)};font-weight:800;padding:10px 12px;border-bottom:1px solid #E5E5E5">${star(m)} ${m}%</td>
      <td style="color:${scoreColor(c)};font-weight:800;padding:10px 12px;border-bottom:1px solid #E5E5E5">${star(c)} ${c}%</td>
      <td style="color:${scoreColor(q)};font-weight:800;padding:10px 12px;border-bottom:1px solid #E5E5E5">${star(q)} ${q}%</td>
    </tr>`;
  }).join('');

  // ── Para repasar: errores reales por módulo ───────────────────────────────
  let repasarHTML = '';

  // Lecciones regulares
  regularLessons.forEach(id => {
    const lp = progress.lessons[id] || {};
    const theme = LESSON_THEMES[id] || { name: 'Lección ' + id };
    ['match', 'cards', 'quiz'].forEach(mode => {
      const modeLabel = { match: 'Emparejar', cards: 'Tarjetas', quiz: 'Quiz' }[mode];
      const missed = lp[mode + '_missed'] || [];
      if (missed.length === 0) return;
      const unique = missed.filter((w, i, arr) => arr.findIndex(x => x.hanzi === w.hanzi) === i);
      repasarHTML += `<h3 style="margin:24px 0 6px;color:#3C3C3C;font-size:15px">
        Lección ${id} · ${theme.name} — <em>${modeLabel}</em>
        <span style="font-size:12px;color:#C1432B;font-weight:700">(${unique.length} ${unique.length === 1 ? 'error' : 'errores'})</span>
      </h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:4px">${wordRows(unique)}</table>`;
    });
  });

  // Módulos especiales
  specialLessons.forEach(id => {
    const lp = progress.lessons[id] || {};
    const theme = LESSON_THEMES[id] || { name: id === 'mod-paises' ? 'Países del mundo' : 'Los números' };
    ['match', 'cards', 'quiz'].forEach(mode => {
      const modeLabel = { match: 'Emparejar', cards: 'Tarjetas', quiz: 'Quiz' }[mode];
      const missed = lp[mode + '_missed'] || [];
      if (missed.length === 0) return;
      const unique = missed.filter((w, i, arr) => arr.findIndex(x => x.hanzi === w.hanzi) === i);
      repasarHTML += `<h3 style="margin:24px 0 6px;color:#3C3C3C;font-size:15px">
        ${theme.name} — <em>${modeLabel}</em>
        <span style="font-size:12px;color:#C1432B;font-weight:700">(${unique.length} ${unique.length === 1 ? 'error' : 'errores'})</span>
      </h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:4px">${wordRows(unique)}</table>`;
    });
  });

  // Prueba games
  const pruebaLabels = { clas: 'Clasificadores', modal: 'Verbos modales', tiempo: 'Expresiones de tiempo', dialogo: 'Completa el diálogo', orden: 'Ordena la oración' };
  ['clas', 'dialogo', 'orden'].forEach(game => {
    const missed = pp[game + '_missed'] || [];
    if (missed.length === 0) return;
    const unique = missed.filter((w, i, arr) => arr.findIndex(x => x.hanzi === w.hanzi) === i);
    repasarHTML += `<h3 style="margin:24px 0 6px;color:#3C3C3C;font-size:15px">
      ${pruebaLabels[game]}
      <span style="font-size:12px;color:#C1432B;font-weight:700">(${unique.length} ${unique.length === 1 ? 'error' : 'errores'})</span>
    </h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:4px">${wordRows(unique)}</table>`;
  });

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <!-- © 2026 大卫 · dawei.com.ar -->
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;700&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
  <title>说中文 ShuoZhongwen · Resumen${safeName ? ' · ' + safeName : ''}</title>
  <style>
    body{font-family:'Nunito',sans-serif;background:#FFFFFF;color:#3C3C3C;max-width:700px;margin:40px auto;padding:0 24px}
    h1{color:#C1432B;margin-bottom:4px}
    h2{color:#3C3C3C;border-bottom:2px solid #E5E5E5;padding-bottom:8px;margin-top:32px}
    table{width:100%;border-collapse:collapse}
    th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#777777;padding:8px 12px;border-bottom:2px solid #E5E5E5;text-align:left}
    @media print{body{background:#fff}}
  </style></head><body>
  <h1>说中文 ShuoZhongwen · Resumen de repaso</h1>
  ${safeName ? `<p style="margin-top:0;font-size:18px">👋 <strong>${safeName}</strong></p>` : ''}
  <p style="color:#777777;margin-top:0">汉语课 CUI · Nivel 4 · Ariel 老师 &nbsp;|&nbsp; ${date}</p>

  <h2>📚 Lecciones</h2>
  <table><thead><tr>
    <th>Lección</th><th>Emparejar</th><th>Tarjetas</th><th>Quiz</th>
  </tr></thead><tbody>${lessonRows}</tbody></table>

  ${specialRows ? `<h2>🌍 Módulos especiales</h2>
  <table><thead><tr>
    <th>Módulo</th><th>Emparejar</th><th>Tarjetas</th><th>Quiz</th>
  </tr></thead><tbody>${specialRows}</tbody></table>` : ''}

  <h2>🧠 ¿Cuánto aprendiste?</h2>
  <table><tbody>
    <tr><td style="padding:10px 12px;border-bottom:1px solid #E5E5E5">Clasificadores</td><td style="color:${scoreColor(pp.clas||0)};font-weight:800;padding:10px 12px;border-bottom:1px solid #E5E5E5">${star(pp.clas||0)} ${pp.clas||0}%</td></tr>
    <tr><td style="padding:10px 12px;border-bottom:1px solid #E5E5E5">Completa el diálogo</td><td style="color:${scoreColor(pp.dialogo||0)};font-weight:800;padding:10px 12px;border-bottom:1px solid #E5E5E5">${star(pp.dialogo||0)} ${pp.dialogo||0}%</td></tr>
    <tr><td style="padding:10px 12px;border-bottom:1px solid #E5E5E5">Ordena la oración</td><td style="color:${scoreColor(pp.orden||0)};font-weight:800;padding:10px 12px;border-bottom:1px solid #E5E5E5">${star(pp.orden||0)} ${pp.orden||0}%</td></tr>
  </tbody></table>

  ${repasarHTML
    ? '<h2>📝 Errores para repasar</h2>' + repasarHTML
    : '<h2>✅ ¡Sin errores pendientes!</h2><p>No cometiste errores en ningún módulo. ¡Excelente trabajo!</p>'
  }
  <p style="margin-top:48px;font-size:11px;color:#aaa;text-align:center">© 2026 大卫 · dawei.com.ar</p>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileSlug = playerName ? '-' + playerName.toLowerCase().replace(/[^a-z0-9]/gi, '_') : '';
  a.download = 'hanzi-resumen' + fileSlug + '-' + new Date().toISOString().slice(0,10) + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ----------------- Prueba: Audio -----------------
let _zhVoice = null;
function getZhVoice() {
  if (_zhVoice) return _zhVoice;
  const voices = window.speechSynthesis.getVoices();
  _zhVoice = voices.find(v => v.lang === 'zh-CN') ||
             voices.find(v => v.lang.startsWith('zh')) ||
             null;
  return _zhVoice;
}
window.speechSynthesis.onvoiceschanged = () => { _zhVoice = null; };

function speak(text) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.85;
  const voice = getZhVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

function buildAudioRound(allWords) {
  const picked = shuffle([...allWords]).slice(0, 6);
  const soundCol = shuffle(picked.map((w, i) => ({ ...w, sid: 's' + i })));
  const hanziCol = shuffle(picked.map((w, i) => ({ ...w, hid: 'h' + i })));
  return { picked, soundCol, hanziCol };
}

function AudioGame({ allWords, onBack, onFinish, playerName }) {
  const [round, setRound] = useState(() => buildAudioRound(allWords));
  const [selectedSound, setSelectedSound] = useState(null);
  const [selectedHanzi, setSelectedHanzi] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [wrong, setWrong] = useState([]);
  const [errors, setErrors] = useState(0);
  const [missed, setMissed] = useState([]);
  const [playing, setPlaying] = useState(null);
  const [done, setDone] = useState(false);

  const { soundCol, hanziCol, picked } = round;

  const playSound = (item) => {
    setPlaying(item.sid);
    speak(item.hanzi);
    setTimeout(() => setPlaying(null), 1200);
    if (!matched.has(item.hanzi)) setSelectedSound(item);
  };

  const pickHanzi = (item) => {
    if (matched.has(item.hanzi) || !selectedSound) return;
    setSelectedHanzi(item);

    if (selectedSound.hanzi === item.hanzi) {
      // Correcto
      const newMatched = new Set(matched);
      newMatched.add(item.hanzi);
      setMatched(newMatched);
      setSelectedSound(null);
      setSelectedHanzi(null);

      if (newMatched.size === picked.length) {
        const pct = Math.round((picked.length / (picked.length + errors)) * 100);
        if (onFinish) onFinish(pct, missed);
        setDone(true);
      }
    } else {
      // Incorrecto
      const newErrors = errors + 1;
      setErrors(newErrors);
      if (!missed.find(m => m.hanzi === selectedSound.hanzi)) {
        setMissed(prev => [...prev, { hanzi: selectedSound.hanzi, pinyin: selectedSound.pinyin, es: selectedSound.es }]);
      }
      setWrong([selectedSound.sid, item.hid]);
      setTimeout(() => {
        setWrong([]);
        setSelectedSound(null);
        setSelectedHanzi(null);
      }, 600);
    }
  };

  const retry = () => {
    setRound(buildAudioRound(allWords));
    setSelectedSound(null);
    setSelectedHanzi(null);
    setMatched(new Set());
    setWrong([]);
    setErrors(0);
    setMissed([]);
    setPlaying(null);
    setDone(false);
  };

  if (done) return html(PruebaResult, {
    percent: Math.round((picked.length / (picked.length + errors)) * 100),
    total: picked.length, correct: picked.length, missed,
    onRetry: retry, onBack, playerName,
  });

  return html(React.Fragment, null,
    html('main', { style: { paddingTop: '18px', paddingBottom: 40 } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, 'Reconocer por audio'),
        html('div', { className: 'flash-counter' }, matched.size + '/' + picked.length),
      ),
      html('div', { className: 'flash-score-row' },
        html('div', { className: 'flash-score-chip no' }, html('i', null, '✕'), 'Errores: ' + errors),
        html('div', { className: 'flash-score-chip yes' }, html('i', null, '✓'), 'Aciertos: ' + matched.size),
      ),
      html('p', { style: { textAlign: 'center', fontSize: 13, color: 'var(--ink-soft)', fontWeight: 700, margin: '4px 0 12px' } },
        selectedSound
          ? '👆 Ahora tocá el hanzi que corresponde'
          : '👆 Tocá un 🔊 para escuchar la palabra'
      ),
      html('div', { className: 'audio-game-cols' },
        // Columna izquierda: botones de audio
        html('div', { className: 'audio-col' },
          soundCol.map(item => {
            const isMatched = matched.has(item.hanzi);
            const isPlaying = playing === item.sid;
            const isSelected = selectedSound && selectedSound.sid === item.sid;
            const isWrong = wrong.includes(item.sid);
            let cls = 'audio-sound-btn';
            if (isMatched) cls += ' matched';
            else if (isWrong) cls += ' wrong';
            else if (isPlaying) cls += ' playing';
            else if (isSelected) cls += ' selected';
            return html('button', { key: item.sid, className: cls, onClick: () => !isMatched && playSound(item) },
              html('span', null, isMatched ? '✓' : '🔊'),
              html('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' } }, isMatched ? item.hanzi : '#' + (soundCol.indexOf(item) + 1)),
            );
          })
        ),
        // Columna derecha: hanzi
        html('div', { className: 'audio-col' },
          hanziCol.map(item => {
            const isMatched = matched.has(item.hanzi);
            const isSelected = selectedHanzi && selectedHanzi.hid === item.hid;
            const isWrong = wrong.includes(item.hid);
            let cls = 'audio-hanzi-btn';
            if (isMatched) cls += ' matched';
            else if (isWrong) cls += ' wrong';
            else if (isSelected) cls += ' selected';
            return html('button', { key: item.hid, className: cls, onClick: () => pickHanzi(item) },
              item.hanzi,
            );
          })
        ),
      ),
    ),
  );
}

// ----------------- AuthGate: solo nombre → Supabase anonymous auth -----------------
// El alumno ingresa solo su nombre. Se crea una sesión anónima real en Supabase
// (auth.uid() verificable, RLS funciona igual). El nombre queda en `profiles`.
// Requiere "Enable anonymous sign-ins" activado en Supabase Auth Settings.
function AuthGate({ onAuthenticated }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!name.trim()) { setErr('Ingresá tu nombre.'); return; }
    setLoading(true);
    setErr('');
    // Intento 1: anonymous auth (requiere estar habilitado en Supabase)
    let sessionData = null;
    const anonRes = await db.auth.signInAnonymously();
    if (!anonRes.error && anonRes.data?.session) {
      sessionData = anonRes.data.session;
    } else {
      // Fallback: credenciales derivadas del dispositivo (estables, sin contraseña visible)
      let did = localStorage.getItem('hanzi-device-id');
      if (!did) {
        did = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('hanzi-device-id', did);
      }
      const email = did + '@hanziapp.internal';
      const pwd   = 'hz' + did.replace(/-/g, '').slice(0, 20);
      let res = await db.auth.signInWithPassword({ email, password: pwd });
      if (res.error) {
        res = await db.auth.signUp({ email, password: pwd, options: { data: { name: name.trim() } } });
      }
      if (res.error || !res.data?.session) {
        setErr('No se pudo conectar. Verificá tu conexión.');
        setLoading(false);
        return;
      }
      sessionData = res.data.session;
    }
    setLoading(false);
    onAuthenticated(sessionData, name.trim());
  };

  return html('div', { className: 'name-modal-overlay' },
    html('div', { className: 'name-modal' },
      html('div', { className: 'name-modal-hanzi hanzi-font' }, '你好！'),
      html('h2', { className: 'name-modal-title' }, '¿Cómo te llamás?'),
      html('p', { className: 'name-modal-sub' }, 'Ingresá tu nombre para empezar.'),
      html('form', { onSubmit: handleSubmit },
        html('input', {
          className: 'name-modal-input', type: 'text', placeholder: 'Tu nombre...',
          value: name, autoFocus: true, maxLength: 30, required: true,
          onChange: (e) => setName(e.target.value),
          disabled: loading,
        }),
        err && html('div', { style: { color: 'var(--lacquer-dark)', fontSize: 13, fontWeight: 700, marginTop: 6 } }, err),
        html('button', {
          className: 'primary-btn', type: 'submit',
          disabled: !name.trim() || loading,
          style: { width: '100%', marginTop: 10 },
        }, loading ? 'Un momento...' : '¡Comenzar! →'),
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reportes: helpers y componentes
// ─────────────────────────────────────────────────────────────────────────────

function BarChart({ items, colorFn }) {
  const max = Math.max(...items.map(d => d.value), 1);
  return html('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    items.map((d, i) => html('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10 } },
      html('div', { style: { width: 88, fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, d.label),
      html('div', { style: { flex: 1, height: 18, background: 'var(--paper-deep)', borderRadius: 4, overflow: 'hidden' } },
        html('div', { style: {
          height: '100%',
          width: Math.round(d.value / max * 100) + '%',
          background: colorFn ? colorFn(d.value) : (d.value >= 80 ? 'var(--jade)' : d.value >= 50 ? 'var(--gold)' : 'var(--lacquer)'),
          borderRadius: 4, transition: 'width 0.6s ease',
        } })
      ),
      html('div', { style: { width: 36, fontSize: 12, fontWeight: 800, textAlign: 'right', flexShrink: 0, color: 'var(--ink)' } }, d.suffix !== undefined ? d.suffix : d.value + '%'),
    ))
  );
}

function LaoshiReports({ onBack }) {
  const [classes,          setClasses]          = useState([]);
  const [selectedClass,    setSelectedClass]    = useState(null);
  const [students,         setStudents]         = useState([]);
  const [classWordErrors,  setClassWordErrors]  = useState([]);
  const [selectedStudent,  setSelectedStudent]  = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [tab,              setTab]              = useState('overview');
  const [newTask,          setNewTask]          = useState({ title: '', description: '', due_date: '' });
  const [taskTab,          setTaskTab]          = useState('list');
  const [tasks,            setTasks]            = useState([]);

  useEffect(() => {
    db.from('classes').select('id,name,code').order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setClasses(list);
        if (list.length > 0) setSelectedClass(list[0]);
      });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    loadClassData(selectedClass.id);
    loadTasks(selectedClass.id);
  }, [selectedClass]);

  const loadTasks = async (classId) => {
    const { data } = await db.from('assignments').select('id,title,description,lesson_ids,due_date,created_at')
      .eq('class_id', classId).order('due_date', { ascending: true });
    setTasks(data || []);
  };

  const loadClassData = async (classId) => {
    setLoading(true); setStudents([]); setClassWordErrors([]); setSelectedStudent(null); setTab('overview');
    try {
      const { data: members } = await db.from('class_members').select('student_id').eq('class_id', classId);
      if (!members || members.length === 0) { setLoading(false); return; }
      const ids = members.map(m => m.student_id).filter(Boolean);

      const [profilesRes, progressRes, errorsRes] = await Promise.all([
        db.from('profiles').select('id,name,email,last_seen,streak_days,streak_last_date').in('id', ids),
        db.from('progress').select('student_id,lesson_id,mode,percent,updated_at').in('student_id', ids),
        db.from('word_errors').select('student_id,hanzi,pinyin,es,error_count,last_error').in('student_id', ids),
      ]);

      const profiles    = profilesRes.data || [];
      const progressAll = progressRes.data || [];
      const errorsAll   = (errorsRes.data  || []).map(nfcRow);

      const studentData = ids.map(sid => {
        const profile    = profiles.find(p => p.id === sid) || { id: sid };
        const myProgress = progressAll.filter(r => r.student_id === sid);
        const myErrors   = errorsAll.filter(r => r.student_id === sid).sort((a, b) => b.error_count - a.error_count);
        const lessonIds  = [...new Set(myProgress.map(r => r.lesson_id))];
        const avgPercent = lessonIds.length === 0 ? 0 : Math.round(
          lessonIds.reduce((acc, lid) => {
            const best = Math.max(...myProgress.filter(r => r.lesson_id === lid).map(r => r.percent), 0);
            return acc + best;
          }, 0) / lessonIds.length
        );
        return { profile, progress: myProgress, wordErrors: myErrors, avgPercent };
      });

      // Palabras más difíciles de la clase (agregado)
      const errorMap = {};
      errorsAll.forEach(e => {
        if (!errorMap[e.hanzi]) errorMap[e.hanzi] = { hanzi: e.hanzi, pinyin: e.pinyin, es: e.es, total: 0, students: 0 };
        errorMap[e.hanzi].total    += e.error_count;
        errorMap[e.hanzi].students += 1;
      });

      setStudents(studentData);
      setClassWordErrors(Object.values(errorMap).sort((a, b) => b.total - a.total).slice(0, 20));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const daysSince = (d) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 999;
  const fmtDate   = (d) => {
    const n = daysSince(d);
    if (n === 0) return 'Hoy'; if (n === 1) return 'Ayer'; if (n > 30) return 'Nunca'; return 'Hace ' + n + ' días';
  };

  // ── Vista individual de alumno ──────────────────────────────────────────────
  if (selectedStudent) {
    const s = selectedStudent;
    const lp = {};
    s.progress.forEach(r => { if (!lp[r.lesson_id]) lp[r.lesson_id] = {}; lp[r.lesson_id][r.mode] = r.percent; });
    return html('main', { style: { paddingTop: 18, paddingBottom: 40 } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: () => setSelectedStudent(null) }, '←'),
        html('div', null,
          html('h1', null, s.profile.name || s.profile.email || 'Alumno'),
          html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 } },
            '🔥 ' + (s.profile.streak_days || 0) + ' días · 📅 ' + fmtDate(s.profile.last_seen)
          ),
        ),
      ),
      html('div', { className: 'admin-panel' },
        html('div', null,
          html('label', null, '📚 Progreso por lección'),
          Object.keys(lp).length === 0
            ? html('p', { className: 'admin-note', style: { marginTop: 6 } }, 'Sin actividad registrada aún.')
            : html('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 } },
                Object.keys(lp).sort().map(lid =>
                  html('div', { key: lid, style: { background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-paper)' } },
                    html('div', { style: { fontWeight: 800, fontSize: 13, marginBottom: 8 } },
                      (lid === 'mod-paises' ? '🌍 Países' : lid === 'mod-numeros' ? '🔢 Números' : 'Lección ' + lid) +
                      ((LESSON_THEMES[lid] && LESSON_THEMES[lid].name) ? ' · ' + LESSON_THEMES[lid].name : '')
                    ),
                    html(BarChart, {
                      items: ['match','cards','quiz'].map(m => ({ label: { match:'Emparejar', cards:'Tarjetas', quiz:'Quiz' }[m], value: lp[lid][m] || 0 })),
                    }),
                  )
                )
              ),
        ),
        html('hr', { style: { border: 'none', borderTop: '1px solid var(--paper-deep)', margin: '14px 0' } }),
        html('div', null,
          html('label', null, '⚠️ Palabras que más le cuestan'),
          s.wordErrors.length === 0
            ? html('p', { className: 'admin-note', style: { marginTop: 6 } }, 'Sin errores registrados todavía.')
            : html(BarChart, {
                items: s.wordErrors.slice(0, 10).map(e => ({ label: e.hanzi + ' ' + e.pinyin, value: e.error_count, suffix: e.error_count + '×' })),
                colorFn: v => v >= 5 ? 'var(--lacquer)' : v >= 3 ? 'var(--gold)' : 'var(--jade)',
              }),
        ),
      ),
    );
  }

  // ── Selector de tareas: formulario para crear ─────────────────────────────
  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !selectedClass) return;
    const { data: { user } } = await db.auth.getUser();
    await db.from('assignments').insert({
      class_id: selectedClass.id, laoshi_id: user.id,
      title: newTask.title.trim(), description: newTask.description.trim(),
      due_date: newTask.due_date || null,
    });
    setNewTask({ title: '', description: '', due_date: '' });
    loadTasks(selectedClass.id);
  };

  const handleDeleteTask = async (id) => {
    await db.from('assignments').delete().eq('id', id);
    loadTasks(selectedClass.id);
  };

  // ── Vista principal de la clase ────────────────────────────────────────────
  return html('main', { style: { paddingTop: 18, paddingBottom: 40 } },
    html('div', { className: 'header-row' },
      html('button', { className: 'back-btn', onClick: onBack }, '←'),
      html('h1', null, '📊 Reportes'),
    ),

    classes.length === 0 && html('div', { className: 'admin-panel' },
      html('p', { className: 'admin-note' }, 'No tenés clases creadas todavía.'),
    ),

    classes.length > 1 && html('div', { style: { padding: '0 0 14px', display: 'flex', gap: 8, flexWrap: 'wrap' } },
      classes.map(c => html('button', {
        key: c.id, onClick: () => setSelectedClass(c),
        style: {
          padding: '8px 14px', borderRadius: 10, border: '2px solid',
          borderColor: selectedClass && selectedClass.id === c.id ? 'var(--jade)' : 'var(--paper-deep)',
          background: selectedClass && selectedClass.id === c.id ? 'var(--jade-light)' : '#fff',
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
        },
      }, c.name))
    ),

    selectedClass && html('div', { className: 'admin-panel' },

      // Tabs principales
      html('div', { style: { display: 'flex', gap: 8, marginBottom: 16 } },
        [
          { id: 'overview', label: '👥 Alumnos' },
          { id: 'words',    label: '⚠️ Palabras difíciles' },
          { id: 'tasks',    label: '📋 Tareas' },
        ].map(t => html('button', {
          key: t.id, onClick: () => setTab(t.id),
          style: {
            flex: 1, padding: '9px 0', borderRadius: 10, border: '2px solid',
            borderColor: tab === t.id ? 'var(--jade)' : 'var(--paper-deep)',
            background: tab === t.id ? 'var(--jade-light)' : '#fff',
            fontWeight: 800, fontSize: 12, cursor: 'pointer',
            color: tab === t.id ? 'var(--jade-dark)' : 'var(--ink)',
          },
        }, t.label))
      ),

      loading && html('p', { className: 'admin-note' }, '⏳ Cargando datos...'),

      // ── Tab: Alumnos ──────────────────────────────────────────────────────
      !loading && tab === 'overview' && (
        students.length === 0
          ? html('p', { className: 'admin-note' }, 'No hay alumnos en esta clase todavía.')
          : html(React.Fragment, null,

              // Alertas inactividad
              students.filter(s => daysSince(s.profile.last_seen) >= 7).length > 0 && html('div', {
                style: { background: '#FDE8E3', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }
              },
                html('div', { style: { fontWeight: 800, color: '#C0392B', marginBottom: 6, fontSize: 13 } }, '⚠️ Sin actividad hace 7+ días'),
                students.filter(s => daysSince(s.profile.last_seen) >= 7).map((s, i) =>
                  html('div', { key: i, style: { fontSize: 13, color: '#C0392B', fontWeight: 700 } },
                    (s.profile.name || s.profile.email || 'Alumno') + ' — ' + fmtDate(s.profile.last_seen)
                  )
                ),
              ),

              // Lista de alumnos
              html('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                students.slice().sort((a, b) => daysSince(a.profile.last_seen) - daysSince(b.profile.last_seen)).map((s, i) => {
                  const inactive = daysSince(s.profile.last_seen) >= 7;
                  return html('button', {
                    key: i, onClick: () => setSelectedStudent(s),
                    style: {
                      background: inactive ? '#FFF4F2' : '#fff',
                      border: '2px solid ' + (inactive ? '#F1948A' : 'var(--paper-deep)'),
                      borderRadius: 14, padding: '12px 14px', boxShadow: 'var(--shadow-paper)',
                      textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                    },
                  },
                    html('div', { style: { flex: 1 } },
                      html('div', { style: { fontWeight: 800, fontSize: 14 } }, s.profile.name || s.profile.email || 'Alumno'),
                      html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 2 } },
                        '📅 ' + fmtDate(s.profile.last_seen) + ' · 🔥 ' + (s.profile.streak_days || 0) + ' días'
                      ),
                    ),
                    html('div', { style: { textAlign: 'right' } },
                      html('div', { style: { fontWeight: 900, fontSize: 20, color: s.avgPercent >= 80 ? 'var(--jade)' : s.avgPercent >= 50 ? 'var(--gold)' : 'var(--lacquer)' } }, s.avgPercent + '%'),
                      html('div', { style: { fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 } }, 'promedio'),
                    ),
                    html('span', { style: { fontSize: 14, color: 'var(--ink-soft)' } }, '›'),
                  );
                })
              ),

              // Progreso promedio de la clase por lección
              (() => {
                const lids = [...new Set(students.flatMap(s => s.progress.map(p => p.lesson_id)))].sort();
                if (lids.length === 0) return null;
                return html('div', { style: { marginTop: 20 } },
                  html('label', null, 'Promedio de la clase por lección'),
                  html('div', { style: { marginTop: 10 } },
                    html(BarChart, {
                      items: lids.map(lid => {
                        const label = lid === 'mod-paises' ? 'Países' : lid === 'mod-numeros' ? 'Números' : 'Lec. ' + lid;
                        const percs = students.map(s => {
                          const rows = s.progress.filter(p => p.lesson_id === lid);
                          return rows.length ? Math.max(...rows.map(r => r.percent)) : 0;
                        });
                        return { label, value: Math.round(percs.reduce((a, b) => a + b, 0) / percs.length) };
                      }),
                    }),
                  ),
                );
              })(),
            )
      ),

      // ── Tab: Palabras difíciles de la clase ───────────────────────────────
      !loading && tab === 'words' && (
        classWordErrors.length === 0
          ? html('p', { className: 'admin-note' }, 'Sin datos de errores todavía. Se irán acumulando a medida que los alumnos practiquen.')
          : html(React.Fragment, null,
              html('p', { className: 'admin-note', style: { marginBottom: 14 } },
                'Palabras que más errores acumulan en toda la clase. Útil para enfocarse en la próxima clase.'
              ),
              html('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                classWordErrors.map((e, i) => html('div', {
                  key: i,
                  style: { background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-paper)', display: 'flex', alignItems: 'center', gap: 12 },
                },
                  html('div', { className: 'hanzi-font', style: { fontSize: 30, color: 'var(--lacquer)', minWidth: 44, textAlign: 'center' } }, e.hanzi),
                  html('div', { style: { flex: 1 } },
                    html('div', { style: { fontWeight: 700, fontSize: 13 } }, e.pinyin + ' · ' + e.es),
                    html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 2 } },
                      e.students + ' ' + (e.students === 1 ? 'alumno' : 'alumnos') + ' · ' + e.total + ' errores en total'
                    ),
                  ),
                  html('div', { style: { fontWeight: 900, fontSize: 18, color: e.total >= 10 ? 'var(--lacquer)' : e.total >= 5 ? 'var(--gold)' : 'var(--ink-soft)' } }, e.total + '×'),
                ))
              ),
            )
      ),

      // ── Tab: Tareas ───────────────────────────────────────────────────────
      !loading && tab === 'tasks' && html(React.Fragment, null,

        html('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } },
          [{ id: 'list', label: '📋 Ver tareas' }, { id: 'new', label: '➕ Nueva tarea' }].map(t =>
            html('button', {
              key: t.id, onClick: () => setTaskTab(t.id),
              style: {
                flex: 1, padding: '8px 0', borderRadius: 10, border: '2px solid',
                borderColor: taskTab === t.id ? 'var(--jade)' : 'var(--paper-deep)',
                background: taskTab === t.id ? 'var(--jade-light)' : '#fff',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              },
            }, t.label)
          )
        ),

        taskTab === 'list' && (
          tasks.length === 0
            ? html('p', { className: 'admin-note' }, 'No hay tareas asignadas para esta clase.')
            : html('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                tasks.map(t => html('div', {
                  key: t.id,
                  style: { background: '#fff', borderRadius: 12, padding: '12px 14px', boxShadow: 'var(--shadow-paper)' },
                },
                  html('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
                    html('div', { style: { fontWeight: 800, fontSize: 14 } }, t.title),
                    html('button', {
                      onClick: () => handleDeleteTask(t.id),
                      style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--lacquer)', padding: '0 4px' },
                    }, '🗑'),
                  ),
                  t.description && html('div', { style: { fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 } }, t.description),
                  t.due_date && html('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--jade-dark)', marginTop: 6 } },
                    '⏰ ' + new Date(t.due_date + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                  ),
                ))
              )
        ),

        taskTab === 'new' && html('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          html('input', {
            className: 'admin-input',
            placeholder: 'Título de la tarea *',
            value: newTask.title,
            onChange: e => setNewTask(prev => ({ ...prev, title: e.target.value })),
          }),
          html('input', {
            className: 'admin-input',
            placeholder: 'Descripción (opcional)',
            value: newTask.description,
            onChange: e => setNewTask(prev => ({ ...prev, description: e.target.value })),
          }),
          html('label', { style: { fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' } }, 'Fecha límite'),
          html('input', {
            className: 'admin-input',
            type: 'date',
            value: newTask.due_date,
            onChange: e => setNewTask(prev => ({ ...prev, due_date: e.target.value })),
          }),
          html('button', {
            className: 'primary-btn',
            onClick: handleCreateTask,
            disabled: !newTask.title.trim(),
          }, '📋 Crear tarea'),
        ),
      ),
    ),
  );
}

// ----------------- BrandAnimText -----------------
const BRAND_FRAMES_DEFAULT = [
  { title: 'HanziPractice',  sub: '汉语课 CUI · Nivel 4'        },
  { title: 'ShuōZhōngwén', sub: 'Nivel 4 · CUI · Ariel 老师' },
];

function BrandAnimText({ frames, intervalSec }) {
  const frameData = (frames && frames.length) ? frames : BRAND_FRAMES_DEFAULT;
  const holdMs = ((intervalSec && intervalSec > 0) ? intervalSec : 9) * 1000;
  const [frame, setFrame] = useState(0);
  const [phase, setPhase] = useState('show'); // 'show' | 'out' | 'in'

  useEffect(() => {
    const hold = setTimeout(() => {
      setPhase('out');
      setTimeout(() => {
        setFrame(f => (f + 1) % frameData.length);
        setPhase('in');
        setTimeout(() => setPhase('show'), 400);
      }, 400);
    }, holdMs);
    return () => clearTimeout(hold);
  }, [frame, holdMs, frameData.length]);

  const { title, sub } = frameData[frame] || frameData[0];

  const styleMap = {
    show: { opacity: 1,   transform: 'translateY(0)',    filter: 'blur(0px)' },
    out:  { opacity: 0,   transform: 'translateY(-6px)', filter: 'blur(2px)' },
    in:   { opacity: 0,   transform: 'translateY(6px)',  filter: 'blur(2px)' },
  };

  const s = {
    ...styleMap[phase],
    transition: 'opacity 0.4s ease, transform 0.4s ease, filter 0.4s ease',
  };

  return html('div', { className: 'brand-text', style: s },
    html('strong', null, title),
    html('span', null, sub),
  );
}

// ----------------- App -----------------
function App() {
  const [vocab, setVocab] = useState(loadVocab);
  const [progress, setProgress] = useState(loadProgress);
  const [screen, setScreen] = useState({ name: 'home' });
  const [secretTaps, setSecretTaps] = useState(0);
  const [showSecretExam, setShowSecretExam] = useState(false);
  const [showDialogo, setShowDialogo] = useState(false);
  const secretTimer = React.useRef(null);
  const handleSecretTap = () => {
    clearTimeout(secretTimer.current);
    setSecretTaps(n => n + 1);
    secretTimer.current = setTimeout(() => setSecretTaps(0), 2000);
  };
  useEffect(() => {
    if (secretTaps >= 5) {
      setShowSecretExam(true);
      setSecretTaps(0);
      clearTimeout(secretTimer.current);
    }
  }, [secretTaps]);
  const [lastResults, setLastResults] = useState({});
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(false);
  const [themesTick, setThemesTick] = useState(0); // fuerza re-render al mutar LESSON_THEMES
  const [appConfig, setAppConfig] = useState({});
  // --- Identidad del alumno: sesión anónima de Supabase Auth ---
  // El alumno ingresa solo su nombre. Se crea una sesión anónima (auth.uid() real).
  // El nombre queda en `profiles`. RLS y progreso funcionan igual que antes.
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [pendingName, setPendingName] = useState(null);

  useEffect(() => {
    db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data: listener } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const studentId = session ? session.user.id : null;

  // Contenido pedagógico 100% desde Supabase: nada hardcodeado, nada de
  // fallback local. Recién se pide cuando hay sesión (RLS exige auth.uid()).
  useEffect(() => {
    if (!studentId) return;
    setContentLoading(true);
    setContentError(false);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
    Promise.race([
      Promise.all([
        db.from('vocabulary').select('lesson,hanzi,pinyin,es'),
        db.from('lesson_themes').select('lesson,name,icon,hidden'),
        db.from('app_config').select('key,value'),
      ]),
      timeout,
    ]).then(([vocabRes, themesRes, configRes]) => {
      setVocab(supabaseRowsToVocab(vocabRes.data || []));
      Object.keys(LESSON_THEMES).forEach(k => delete LESSON_THEMES[k]);
      (themesRes.data || []).forEach(r => {
        LESSON_THEMES[r.lesson] = { name: nfc(r.name), icon: nfc(r.icon || r.lesson), hidden: !!r.hidden };
      });
      const cfg = {};
      (configRes.data || []).forEach(r => { cfg[r.key] = r.value; });
      setAppConfig(cfg);
      setThemesTick(t => t + 1);
      setContentLoading(false);
    }).catch(() => {
      setContentLoading(false);
      setContentError(true);
    });
  }, [studentId]);

  // Al loguearse: trae el perfil real, y actualiza racha + last_seen en Supabase.
  // Si es usuario anónimo nuevo (no hay profile), lo crea con el nombre ingresado.
  useEffect(() => {
    if (!studentId) { setProfile(null); return; }
    db.from('profiles').select('*').eq('id', studentId).maybeSingle().then(({ data }) => {
      const today     = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (!data) {
        // Usuario anónimo nuevo: crear profile con el nombre pendiente
        const nombre = pendingName || 'Alumno';
        const newProfile = { id: studentId, name: nombre, streak_days: 1, streak_last_date: today, last_seen: new Date().toISOString() };
        db.from('profiles').upsert(newProfile).then(() => {});
        setProfile(newProfile);
        setPendingName(null);
        return;
      }
      if (data.streak_last_date === today) {
        setProfile(data);
        db.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', studentId).then(() => {});
        return;
      }
      const newStreak = data.streak_last_date === yesterday ? (data.streak_days || 0) + 1 : 1;
      db.from('profiles').update({
        streak_days: newStreak, streak_last_date: today, last_seen: new Date().toISOString(),
      }).eq('id', studentId).select().maybeSingle().then(({ data: updated }) => {
        setProfile(updated || data);
      });
    });
  }, [studentId]);

  const playerName = profile ? (profile.name || '') : (pendingName || '');

  const handleSignOut = () => { db.auth.signOut(); };

  // ── Estado extra ──
  const [assignments,  setAssignments]  = useState([]);
  const [wordErrorsMap, setWordErrorsMap] = useState({});

  // --- Progreso: al loguearse, traer de Supabase y fusionar con la copia local ---
  useEffect(() => {
    if (!studentId) return;
    Promise.all([
      db.from('progress').select('lesson_id,mode,percent,missed').eq('student_id', studentId),
      db.from('prueba_progress').select('game,percent,missed').eq('student_id', studentId),
    ]).then(([lessonsRes, pruebaRes]) => {
      setProgress(prev => {
        const next = { lessons: { ...prev.lessons }, prueba: { ...(prev.prueba || {}) } };
        (lessonsRes.data || []).forEach(r => {
          const cur = next.lessons[r.lesson_id] || {};
          next.lessons[r.lesson_id] = {
            ...cur,
            [r.mode]: Math.max(cur[r.mode] || 0, r.percent),
            [r.mode + '_missed']: (r.missed && r.missed.length) ? r.missed : (cur[r.mode + '_missed'] || []),
          };
        });
        (pruebaRes.data || []).forEach(r => {
          next.prueba[r.game] = Math.max(next.prueba[r.game] || 0, r.percent);
          next.prueba[r.game + '_missed'] = (r.missed && r.missed.length) ? r.missed : (next.prueba[r.game + '_missed'] || []);
        });
        return next;
      });
    });
  }, [studentId]);

  useEffect(() => { saveProgress(progress); }, [progress]);

  const lessons = Object.keys(vocab).sort((a, b) => {
    const na = parseFloat(a), nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1;
    if (!isNaN(nb)) return 1;
    return a.localeCompare(b);
  });

  const updateLessonResult = (lessonId, mode, percent, missed) => {
    setProgress(prev => {
      const next = { ...prev, lessons: { ...prev.lessons } };
      const current = next.lessons[lessonId] || {};
      const prevBest = current[mode] || 0;
      const missedKey = mode + '_missed';
      const newPercent = Math.max(prevBest, percent);
      // Always overwrite missed list with latest run (most recent attempt)
      next.lessons[lessonId] = {
        ...current,
        [mode]: newPercent,
        [missedKey]: missed || [],
      };
      if (studentId) {
        db.from('progress').upsert({
          student_id: studentId, lesson_id: lessonId, mode,
          percent: newPercent, missed: missed || [],
          updated_at: new Date().toISOString(),
        }).then(() => {});
        // Registrar errores de palabras para repaso inteligente
        (missed || []).forEach(w => {
          if (w && w.hanzi) {
            db.rpc('record_word_error', { p_hanzi: w.hanzi, p_pinyin: w.pinyin || '', p_es: w.es || '' }).then(() => {});
            setWordErrorsMap(prev => {
              const cur = prev[w.hanzi] || { error_count: 0 };
              return { ...prev, [w.hanzi]: { ...cur, error_count: (cur.error_count || 0) + 1, last_error: new Date().toISOString() } };
            });
          }
        });
      }
      return next;
    });
  };

  const resultKey = (lessonId, mode) => lessonId + ':' + mode;

  const setLastResult = (lessonId, mode, result) => {
    setLastResults(prev => ({ ...prev, [resultKey(lessonId, mode)]: result }));
  };

  const clearLastResult = (lessonId, mode) => {
    setLastResults(prev => {
      const next = { ...prev };
      delete next[resultKey(lessonId, mode)];
      return next;
    });
  };

  const totalWords = lessons.reduce((acc, l) => acc + vocab[l].length, 0);
  const totalStars = lessons.reduce((acc, l) => {
    const lp = progress.lessons[l] || {};
    const vals = [lp.match || 0, lp.cards || 0, lp.quiz || 0];
    return acc + vals.filter(v => v >= 80).length;
  }, 0);

  let content;
  if (screen.name === 'home') {
    content = html(Home, {
      vocab, lessons, progress, totalWords, totalStars,
      modulesList: appConfig.modules_list,
      onSelectLesson: (id) => {
        setScreen({ name: 'lesson', lessonId: id });
        if (studentId) db.from('activity_log')
          .update({ max_lesson: id, last_active: new Date().toISOString() })
          .eq('student_id', studentId)
          .order('connected_at', { ascending: false }).limit(1).then(() => {});
      },
      onAdmin: () => setScreen({ name: 'admin' }),
      onPrueba: (game) => setScreen({ name: 'prueba', game }),
      pruebaProgress: progress.prueba || {},
      onRefuerzo: () => setScreen({ name: 'refuerzo' }),
      onDownload: () => downloadResumen(vocab, progress, lessons, playerName),
      playerName,
      onChangeName: handleSignOut,
      streak: profile ? (profile.streak_days || 0) : 0,
      assignments,
    });
  } else if (screen.name === 'lesson') {
    content = html(LessonMenu, {
      vocab, lessonId: screen.lessonId, progress,
      onBack: () => setScreen({ name: 'home' }),
      onSelectMode: (mode) => setScreen({ name: 'play', lessonId: screen.lessonId, mode }),
      onWorkbookListen: () => setScreen({ name: 'workbook-listen', lessonId: screen.lessonId }),
      onWorkbookStroke: () => setScreen({ name: 'workbook-stroke', lessonId: screen.lessonId }),
    });
  } else if (screen.name === 'workbook-listen') {
    content = html(WorkbookListeningGame, {
      lessonId: screen.lessonId, playerName,
      onBack: () => setScreen({ name: 'lesson', lessonId: screen.lessonId }),
      onFinish: (percent, missed) => updateLessonResult(screen.lessonId, 'workbook_listen', percent, missed),
    });
  } else if (screen.name === 'workbook-stroke') {
    content = html(WorkbookStrokeGame, {
      lessonId: screen.lessonId,
      onBack: () => setScreen({ name: 'lesson', lessonId: screen.lessonId }),
    });
  } else if (screen.name === 'play') {
    const modeOrder = ['match', 'cards', 'quiz'];
    const modeIdx = modeOrder.indexOf(screen.mode);
    const lessonIdx = lessons.indexOf(screen.lessonId);
    let nextAction = null;
    if (modeIdx < modeOrder.length - 1) {
      const nextMode = modeOrder[modeIdx + 1];
      nextAction = { label: 'Siguiente ejercicio', go: () => setScreen({ name: 'play', lessonId: screen.lessonId, mode: nextMode }) };
    } else if (lessonIdx < lessons.length - 1) {
      const nextLessonId = lessons[lessonIdx + 1];
      nextAction = { label: 'Siguiente lección', go: () => setScreen({ name: 'play', lessonId: nextLessonId, mode: 'match' }) };
    }
    const key = resultKey(screen.lessonId, screen.mode);
    content = html(PlayScreen, {
      key,
      vocab, lessonId: screen.lessonId, mode: screen.mode,
      onBack: () => setScreen({ name: 'lesson', lessonId: screen.lessonId }),
      onHome: () => setScreen({ name: 'home' }),
      onFinish: (percent, missed) => updateLessonResult(screen.lessonId, screen.mode, percent, missed),
      nextAction,
      savedResult: lastResults[key] || null,
      onSaveResult: (result) => setLastResult(screen.lessonId, screen.mode, result),
      onClearResult: () => clearLastResult(screen.lessonId, screen.mode),
    });
  } else if (screen.name === 'practica') {
    content = html(PracticaHub, {
      modulesList: appConfig.modules_list,
      pruebaProgress: progress.prueba || {},
      onBack: () => setScreen({ name: 'home' }),
      onPrueba: (game) => setScreen({ name: 'prueba', game, from: 'practica' }),
    });
  } else if (screen.name === 'refuerzo') {
    const missedWords = getSmartMissedWords(progress, wordErrorsMap);
    const allWords = lessons.filter(id => id !== 'mod-paises' && id !== 'mod-numeros').flatMap(id => vocab[id]);
    content = html(RefuerzoSession, {
      words: missedWords, allWords,
      onBack: () => setScreen({ name: 'home' }),
      playerName,
    });
  } else if (screen.name === 'admin') {
    content = html(AdminPanel, {
      vocab,
      appConfig,
      onAppConfigChange: (key, value) => setAppConfig(prev => ({ ...prev, [key]: value })),
      onBack: () => setScreen({ name: 'home' }),
      onVocabUpdate: (newVocab) => {
        setVocab(newVocab);
      },
      onReports: () => setScreen({ name: 'reports' }),
    });
  } else if (screen.name === 'reports') {
    content = html(LaoshiReports, {
      onBack: () => setScreen({ name: 'admin' }),
    });
  } else if (screen.name === 'prueba') {
    const onPruebaFinish = (percent, missed) => {
      setProgress(prev => {
        const pp = prev.prueba || {};
        const newPercent = Math.max(pp[screen.game] || 0, percent);
        const next = { ...prev, prueba: {
          ...pp,
          [screen.game]: newPercent,
          [screen.game + '_missed']: missed || [],
        }};
        if (studentId) {
          db.from('prueba_progress').upsert({
            student_id: studentId, game: screen.game,
            percent: newPercent, missed: missed || [],
            updated_at: new Date().toISOString(),
          }).then(() => {});
          db.from('activity_log')
            .update({ max_game: screen.game, max_game_score: newPercent, last_active: new Date().toISOString() })
            .eq('student_id', studentId)
            .order('connected_at', { ascending: false }).limit(1).then(() => {});
        }
        return next;
      });
    };
    const gameProps = {
      onBack: () => setScreen({ name: screen.from || 'practica' }),
      onFinish: onPruebaFinish,
      playerName,
      priorMissed: (progress.prueba || {})[screen.game + '_missed'] || [],
    };
    if (screen.game === 'clas') content = html(ClasificadorGame, { ...gameProps, tipo: 'clasificador' });
    else if (screen.game === 'modal') content = html(ClasificadorGame, { ...gameProps, tipo: 'modal' });
    else if (screen.game === 'tiempo') content = html(ClasificadorGame, { ...gameProps, tipo: 'tiempo' });
    else if (screen.game === 'dialogo') content = html(DialogoGame, gameProps);
    else if (screen.game === 'orden') content = html(OrdenGame, gameProps);
    else if (screen.game === 'audio') {
      const allWords = lessons.filter(id => id !== 'mod-paises' && id !== 'mod-numeros').flatMap(id => vocab[id]);
      content = html(AudioGame, { ...gameProps, allWords });
    }
    else if (screen.game === 'escritura') {
      const allVocab = {};
      lessons.filter(id => id !== 'mod-paises' && id !== 'mod-numeros').forEach(id => { allVocab[id] = vocab[id] || []; });
      content = html(HanziWriteGame, { ...gameProps, vocab: allVocab, writeConfig: appConfig.write_game_config, keyboardHint: appConfig.keyboard_hint_text });
    }
  }

  if (sessionLoading) {
    return html('div', { className: 'app-loader' },
      html('div', { className: 'app-loader-hanzi' }, '说'),
      html('div', { className: 'app-loader-dots' },
        html('span'), html('span'), html('span')
      ),
    );
  }

  if (!session) {
    return html('div', { className: 'app' }, html(AuthGate, { onAuthenticated: (s, nombre) => {
      if (nombre) setPendingName(nombre);
      setSession(s);
      // Registrar conexión en activity_log una sola vez por día/sesión
      if (s && nombre) {
        const today = new Date().toISOString().slice(0, 10);
        const logKey = 'hanzi-log-' + s.user.id + '-' + today;
        if (!localStorage.getItem(logKey)) {
          db.from('activity_log').insert({
            student_id: s.user.id,
            name: nombre,
            connected_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
          }).then(() => { localStorage.setItem(logKey, '1'); });
        }
      }
    } }));
  }

  if (contentLoading) {
    return html('div', { className: 'app-loader' },
      html('div', { className: 'app-loader-hanzi' }, '汉字'),
      html('div', { className: 'app-loader-dots' },
        html('span'), html('span'), html('span')
      ),
      html('div', { className: 'app-loader-msg' }, 'Preparando tus lecciones…'),
    );
  }

  if (contentError) {
    return html('div', { className: 'app-loader' },
      html('div', { style: { fontSize: 48, marginBottom: 12 } }, '📡'),
      html('div', { style: { fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginBottom: 8 } }, 'Sin conexión'),
      html('div', { style: { fontSize: 14, color: 'var(--ink-soft)', marginBottom: 24, textAlign: 'center', maxWidth: 280 } },
        'No se pudo conectar con el servidor. Verificá tu conexión a internet e intentá de nuevo.',
      ),
      html('button', {
        className: 'primary-btn',
        onClick: () => { setContentError(false); setContentLoading(true); setStudentId && null; window.location.reload(); },
      }, '🔄 Reintentar'),
    );
  }

  if (showSecretExam) {
    if (showDialogo === 'oral') return html(DialogoPractica, { onBack: () => setShowDialogo(false) });
    if (showDialogo === 'escrito') return html(ExamenSimulacro, { onBack: () => setShowDialogo(false) });
    return html('main', { style: { paddingTop: 16, paddingBottom: 40 } },
      html('div', { style: { padding: '0 16px', maxWidth: 480, margin: '0 auto' } },
        html('div', { className: 'header-row' },
          html('button', { className: 'back-btn', onClick: () => setShowSecretExam(false) }, '←'),
          html('h1', null, '模拟考试 · Nivel III'),
        ),
        html('p', { style: { color: 'var(--ink-soft)', fontSize: 14, marginBottom: 20 } }, 'Elegí qué querés practicar:'),
        html('button', {
          className: 'mode-card', style: { width: '100%', marginBottom: 12 },
          onClick: () => setShowDialogo('oral'),
        },
          html('div', { className: 'mode-emoji', style: { background: '#EDE9FE', fontSize: 24 } }, '🎙️'),
          html('div', null,
            html('div', { className: 'mode-title' }, 'Práctica oral — Diálogo'),
            html('div', { className: 'mode-sub' }, 'Elegí tu rol y practicá en voz alta'),
          )
        ),
        html('button', {
          className: 'mode-card', style: { width: '100%' },
          onClick: () => setShowDialogo('escrito'),
        },
          html('div', { className: 'mode-emoji', style: { background: '#FEF3C7', fontSize: 24 } }, '📝'),
          html('div', null,
            html('div', { className: 'mode-title' }, 'Examen escrito — Simulacro'),
            html('div', { className: 'mode-sub' }, 'Todas las secciones · 100 pts'),
          )
        ),
      )
    );
  }

  const topbar = html('div', { className: 'topbar' },
    html('div', { className: 'brand' },
      html('div', { className: 'brand-mark hanzi-font', onClick: handleSecretTap, style: { cursor: 'default', userSelect: 'none' } }, '说'),
      html(BrandAnimText, { frames: appConfig.brand_frames, intervalSec: appConfig.brand_anim_interval }),
    ),
    screen.name === 'home' && html('button', { className: 'icon-btn', onClick: () => setScreen({ name: 'admin' }), title: 'Administrar vocabulario' }, '⚙')
  );

  const streakDays = profile ? (profile.streak_days || 0) : 0;
  const navIsHome = screen.name === 'home';
  const navIsRefuerzo = screen.name === 'refuerzo';
  const navIsPractica = screen.name === 'practica' || screen.name === 'prueba';
  const navIsAdmin = screen.name === 'admin' || screen.name === 'reports';

  const sidebar = html('aside', { className: 'sidebar' },
    html('div', { className: 'sidebar-brand' },
      html('div', { className: 'brand-mark hanzi-font', onClick: handleSecretTap, style: { cursor: 'default', userSelect: 'none' } }, '说'),
      html(BrandAnimText, { frames: appConfig.brand_frames, intervalSec: appConfig.brand_anim_interval }),
    ),
    html('nav', { className: 'sidebar-nav' },
      html('button', {
        className: 'sidebar-link' + (navIsHome ? ' active' : ''),
        onClick: () => setScreen({ name: 'home' }),
      },
        html('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          html('path', { d: 'M3 11.5 12 4l9 7.5' }),
          html('path', { d: 'M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9' }),
        ),
        'Aprender',
      ),
      html('button', {
        className: 'sidebar-link' + (navIsPractica ? ' active' : ''),
        onClick: () => setScreen({ name: 'practica' }),
      },
        html('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          html('circle', { cx: 12, cy: 12, r: 8 }),
          html('circle', { cx: 12, cy: 12, r: 4 }),
          html('circle', { cx: 12, cy: 12, r: 0.6, fill: 'currentColor' }),
        ),
        'Práctica',
      ),
      html('button', {
        className: 'sidebar-link' + (navIsRefuerzo ? ' active' : ''),
        onClick: () => setScreen({ name: 'refuerzo' }),
      },
        html('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          html('path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }),
          html('path', { d: 'M21 3v5h-5' }),
          html('path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }),
          html('path', { d: 'M3 21v-5h5' }),
        ),
        'Refuerzo',
      ),
      html('button', {
        className: 'sidebar-link' + (navIsAdmin ? ' active' : ''),
        onClick: () => setScreen({ name: 'admin' }),
      },
        html('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          html('circle', { cx: 12, cy: 12, r: 3 }),
          html('path', { d: 'M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z' }),
        ),
        'Administrar',
      ),
    ),
    html('div', { className: 'sidebar-progress-panel' },
      html('div', { className: 'sidebar-progress-title' }, '📊 Mi avance'),
      lessons
        .filter(id => id !== 'mod-paises' && id !== 'mod-numeros' && !LESSON_THEMES[id]?.hidden)
        .map(id => {
          const theme = LESSON_THEMES[id] || { name: 'Lección ' + id, icon: '汉' };
          const lp = progress.lessons[id] || {};
          const best = Math.round(((lp.match || 0) + (lp.cards || 0) + (lp.quiz || 0)) / 3);
          // % a repasar: palabras marcadas como errores en la última sesión
          const missedCount = [
            ...(lp.match_missed || []),
            ...(lp.cards_missed || []),
            ...(lp.quiz_missed || []),
          ].reduce((acc, w) => { if (!acc.includes(w?.hanzi)) acc.push(w?.hanzi); return acc; }, []).length;
          const wordCount = (vocab[id] || []).length || 1;
          const reviewPct = Math.min(100, Math.round((missedCount / wordCount) * 100));
          const okPct = best;
          return html('div', {
            key: id,
            className: 'sidebar-lesson-row',
            onClick: () => setScreen({ name: 'lesson', lessonId: id }),
          },
            html('div', { className: 'sidebar-lesson-row-top' },
              html('span', { className: 'sidebar-lesson-icon' }, theme.icon || '汉'),
              html('span', { className: 'sidebar-lesson-label' }, 'L' + id + ' · ' + theme.name),
              html('span', { className: 'pct-progress' }, okPct > 0 ? okPct + '%' : '—'),
            ),
            html('div', { className: 'sidebar-dual-bar' },
              html('div', { className: 'sidebar-bar-ok', style: { width: okPct + '%' } }),
              html('div', { className: 'sidebar-bar-review', style: { width: (100 - okPct) + '%', opacity: okPct > 0 ? 1 : 0 } }),
            ),
            okPct > 0 && html('div', { className: 'sidebar-accuracy-row' },
              html('span', { className: 'pct-ok' }, '✓ ' + okPct + '%'),
              html('span', { className: 'pct-err' }, '✕ ' + (100 - okPct) + '%'),
            ),
          );
        }),
      streakDays > 0 && html('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 0', marginTop: 4, borderTop: '1px solid var(--paper-deep)' } },
        html('span', { style: { fontSize: 18 } }, '🔥'),
        html('span', { style: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: '#C07818' } }, streakDays + ' día' + (streakDays === 1 ? '' : 's') + ' seguido' + (streakDays === 1 ? '' : 's')),
      ),
    ),
    playerName && html('button', { className: 'sidebar-signout', onClick: handleSignOut }, '🚪 ' + playerName + ' · Salir'),
  );

  return html('div', { className: 'app-shell' }, sidebar, html('div', { className: 'app' }, topbar, content));
}

// ----------------- PanelLectura -----------------
const FRASES_DEL_DIA = [
  { zh: '今天天气很好！', py: 'Jīntiān tiānqì hěn hǎo!', es: '¡Hoy hace muy buen tiempo!' },
  { zh: '我想喝一杯茶。', py: 'Wǒ xiǎng hē yī bēi chá.', es: 'Me gustaría tomar una taza de té.' },
  { zh: '这个周末有聚会！', py: 'Zhège zhōumò yǒu jùhuì!', es: '¡Este fin de semana hay una fiesta!' },
  { zh: '我们去吃中餐吧。', py: 'Wǒmen qù chī zhōngcān ba.', es: 'Vamos a comer comida china.' },
  { zh: '明天是我的生日。', py: 'Míngtiān shì wǒde shēngrì.', es: 'Mañana es mi cumpleaños.' },
  { zh: '下午我有汉语课。', py: 'Xiàwǔ wǒ yǒu Hànyǔ kè.', es: 'Por la tarde tengo clase de chino.' },
  { zh: '我买了一瓶红葡萄酒。', py: 'Wǒ mǎi le yī píng hóng pútaojiǔ.', es: 'Compré una botella de vino tinto.' },
  { zh: '你今年多大了？', py: 'Nǐ jīnnián duō dà le?', es: '¿Cuántos años tienes este año?' },
  { zh: '晚上我们去参加聚会。', py: 'Wǎnshang wǒmen qù cānjiā jùhuì.', es: 'Esta noche vamos a la fiesta.' },
  { zh: '祝贺你生日快乐！', py: 'Zhùhè nǐ shēngrì kuàilè!', es: '¡Feliz cumpleaños!' },
  { zh: '我上午没有课。', py: 'Wǒ shàngwǔ méiyǒu kè.', es: 'Por la mañana no tengo clase.' },
  { zh: '今天星期几？', py: 'Jīntiān xīngqī jǐ?', es: '¿Qué día de la semana es hoy?' },
  { zh: '我属龙。你呢？', py: 'Wǒ shǔ lóng. Nǐ ne?', es: 'Soy del año del dragón. ¿Y tú?' },
  { zh: '我们去吃蛋糕吧！', py: 'Wǒmen qù chī dàngāo ba!', es: '¡Vamos a comer torta!' },
  { zh: '你喝可乐还是茶？', py: 'Nǐ hē kělè háishì chá?', es: '¿Tomás Coca-Cola o té?' },
  { zh: '今天是个好日子！', py: 'Jīntiān shì gè hǎo rìzi!', es: '¡Hoy es un buen día!' },
  { zh: '我出生在北京。', py: 'Wǒ chūshēng zài Běijīng.', es: 'Nací en Pekín.' },
  { zh: '我想吃热狗和面包。', py: 'Wǒ xiǎng chī règǒu hé miànbāo.', es: 'Quiero comer pancho y pan.' },
  { zh: '这个星期我很忙。', py: 'Zhège xīngqī wǒ hěn máng.', es: 'Esta semana estoy muy ocupado/a.' },
  { zh: '晚上好！今天怎么样？', py: 'Wǎnshang hǎo! Jīntiān zěnmeyàng?', es: '¡Buenas noches! ¿Cómo estuvo el día?' },
];
const DIAS_ZH = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function PanelLectura({ playerName }) {
  const [mostrarPinyin, setMostrarPinyin] = useState(false);
  const [mostrarTrad, setMostrarTrad] = useState(false);
  const [dbFrases, setDbFrases] = useState(null);
  useEffect(() => {
    db.from('frases_del_dia').select('zh,py,es').eq('active', true)
      .then(({ data }) => { if (data && data.length > 0) setDbFrases(data.map(nfcRow)); });
  }, []);
  const now = new Date();
  const hora = now.getHours();
  const minutos = String(now.getMinutes()).padStart(2, '0');
  const periodo = hora < 12 ? '上午' : hora < 20 ? '下午' : '晚上';
  const horaStr = (hora % 12 || 12) + ':' + minutos;
  const diaSemana = DIAS_ZH[now.getDay()];
  const diaNum = now.getDate();
  const mes = MESES_ES[now.getMonth()];
  const anio = now.getFullYear();
  const frasesSource = (dbFrases && dbFrases.length > 0) ? dbFrases : FRASES_DEL_DIA;
  const idx = (now.getFullYear() * 1000 + now.getMonth() * 31 + now.getDate()) % frasesSource.length;
  const frase = frasesSource[idx];
  const saludo = hora < 12 ? '早上好' : hora < 20 ? '下午好' : '晚上好';
  const nombre = playerName || '同学';
  return html('div', {
    style: { background: 'linear-gradient(135deg, var(--lacquer) 0%, var(--lacquer-dark) 100%)', borderRadius: 'var(--radius)', padding: '16px 18px', marginBottom: 18, color: '#fff', position: 'relative', overflow: 'hidden' }
  },
    html('div', { style: { fontSize: 11, fontWeight: 700, opacity: 0.75, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 } }, '📖 Lectura del día'),
    html('div', { className: 'hanzi-font', style: { fontSize: 22, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 } },
      saludo + '，', html('span', { style: { color: '#FFD97D' } }, nombre), '！'
    ),
    html('div', { className: 'hanzi-font', style: { fontSize: 17, lineHeight: 1.6, marginBottom: 2 } },
      '今天是' + anio + '年' + (now.getMonth()+1) + '月' + diaNum + '日，' + diaSemana + '。'
    ),
    html('div', { className: 'hanzi-font', style: { fontSize: 17, lineHeight: 1.6, marginBottom: 12 } },
      '现在是' + periodo + horaStr + '。'
    ),
    html('div', { style: { borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 10, marginBottom: 10 } },
      html('div', { className: 'hanzi-font', style: { fontSize: 19, fontWeight: 700, marginBottom: 4 } }, '💬 ' + frase.zh),
      mostrarPinyin && html(TonedPinyin, { text: frase.py, style: { fontSize: 13, opacity: 0.85, fontStyle: 'italic', marginBottom: 4, display: 'block' } }),
      mostrarTrad && html('div', { style: { fontSize: 14, opacity: 0.9, marginBottom: 4 } }, '→ ' + frase.es),
    ),
    html('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      html('button', { onClick: () => setMostrarPinyin(p => !p), style: { fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.5)', background: mostrarPinyin ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff', cursor: 'pointer' } }, mostrarPinyin ? '🙈 Ocultar pīnyīn' : '👁 Ver pīnyīn'),
      html('button', { onClick: () => setMostrarTrad(t => !t), style: { fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.5)', background: mostrarTrad ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff', cursor: 'pointer' } }, mostrarTrad ? '🙈 Ocultar traducción' : '🌐 Ver traducción'),
      html('div', { style: { marginLeft: 'auto', fontSize: 11, opacity: 0.6, alignSelf: 'center' } }, diaNum + ' de ' + mes + ', ' + anio),
    )
  );
}

// ----------------- Home -----------------
const MODULES_LIST_DEFAULT = [
  { id: 'clas',      icon: '🔢', cls: 'clas',  title: 'Clasificadores',        sub: 'Elige 个, 本, 张, 斤 correctamente',            active: true },
  { id: 'modal',     icon: '🔵', cls: 'clas',  title: 'Verbos modales',         sub: 'Distinguí 会, 能, 可以 y 应该',                  active: true },
  { id: 'tiempo',    icon: '🕐', cls: 'clas',  title: 'Expresiones de tiempo',  sub: 'Elige 半, 刻, 差, 分 correctamente',             active: true },
  { id: 'dialogo',   icon: '💬', cls: 'dial',  title: 'Completa el diálogo',    sub: 'Rellena el hueco de la conversación',           active: true },
  { id: 'orden',     icon: '🔀', cls: 'orden', title: 'Ordena la oración',      sub: 'Coloca las palabras en el orden correcto',      active: true },
  { id: 'audio',     icon: '🔊', cls: 'audio', title: 'Reconocer por audio',    sub: 'Escuchá y uní el sonido con el hanzi',          active: true },
  { id: 'escritura', icon: '✍️', cls: 'clas',  title: 'Práctica de escritura',  sub: 'Escribí el hanzi desde cero · nivel progresivo', active: true },
];

function PracticaHub({ modulesList, pruebaProgress, onBack, onPrueba }) {
  return html('main', { style: { paddingTop: 18, paddingBottom: 40 } },
    html('div', { className: 'header-row' },
      html('button', { className: 'back-btn', onClick: onBack }, '←'),
      html('div', null,
        html('h1', null, 'Práctica'),
        html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 2 } }, 'Actividades de gramática y vocabulario'),
      ),
    ),
    html('div', { style: { padding: '0 16px' } },
      html('div', { className: 'prueba-grid' },
        (modulesList || MODULES_LIST_DEFAULT)
          .filter(g => g.active !== false && !LESSON_THEMES['mod-' + g.id]?.hidden).map(g => {
          const best = pruebaProgress[g.id] || 0;
          const hasStar = best >= 80;
          return html('button', { key: g.id, className: 'prueba-card', onClick: () => onPrueba(g.id) },
            html('div', { className: 'prueba-icon ' + g.cls }, g.icon),
            html('div', { style: { flex: 1 } },
              html('div', { className: 'mode-title' }, g.title),
              html('div', { className: 'mode-sub' }, best > 0 ? '⭐ Mejor: ' + best + '%' : g.sub),
            ),
            hasStar && html('div', { style: { fontSize: 20 } }, '⭐'),
          );
        })
      ),
    ),
  );
}

function Home({ vocab, lessons, progress, totalWords, totalStars, onSelectLesson, onAdmin, onPrueba, pruebaProgress, onDownload, onRefuerzo, playerName, onChangeName, streak, assignments, modulesList }) {
  const regularCount = lessons.filter(id => id !== 'mod-paises' && id !== 'mod-numeros').length;
  return html(React.Fragment, null,
    playerName && html('div', { className: 'greeting-bar' },
      html('span', null, '👋 ¡Hola, ', html('strong', null, playerName), '!'),
      html('button', { className: 'change-name-btn', onClick: onChangeName, title: 'Cerrar sesión' }, '🚪'),
    ),
    html('main', null,
      html('div', { className: 'score-strip' },
        html('div', { className: 'score-chip' },
          html('div', { className: 'num' }, totalWords),
          html('div', { className: 'lbl' }, 'palabras')
        ),
        html('div', { className: 'score-chip' },
          html('div', { className: 'num' }, regularCount),
          html('div', { className: 'lbl' }, 'lecciones')
        ),
        html('div', { className: 'score-chip' },
          html('div', { className: 'num' }, totalStars + '/' + (regularCount * 3)),
          html('div', { className: 'lbl' }, 'estrellas')
        ),
      ),

      html(PanelLectura, { playerName }),

      streak > 0 && html('div', { style: {
        background: 'linear-gradient(135deg,#E09A2B,#C07818)', borderRadius: 14,
        padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12,
      } },
        html('span', { style: { fontSize: 24 } }, '🔥'),
        html('div', null,
          html('div', { style: { fontWeight: 800, fontSize: 15, color: '#fff' } },
            streak + ' día' + (streak === 1 ? '' : 's') + ' seguido' + (streak === 1 ? '' : 's')
          ),
          html('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600 } },
            '¡Seguí practicando para mantener la racha!'
          ),
        ),
      ),

      assignments && assignments.length > 0 && html('div', { style: {
        background: 'linear-gradient(135deg,var(--jade),#1A7A50)', borderRadius: 14,
        padding: '12px 16px', marginBottom: 14, color: '#fff',
      } },
        html('div', { style: { fontWeight: 800, fontSize: 13, opacity: 0.9, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '📋 Tarea de tu laoshi'),
        html('div', { style: { fontWeight: 800, fontSize: 15 } }, assignments[0].title),
        assignments[0].description && html('div', { style: { fontSize: 13, opacity: 0.9, marginTop: 3 } }, assignments[0].description),
        assignments[0].due_date && html('div', { style: { fontSize: 12, opacity: 0.8, marginTop: 4, fontWeight: 700 } },
          '⏰ Hasta el ' + new Date(assignments[0].due_date + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
        ),
      ),

      html('h2', { className: 'section-title' }, 'Elegí una lección'),
      html('div', { className: 'lesson-grid' },
        lessons.filter(id => id !== 'mod-paises' && id !== 'mod-numeros' && !LESSON_THEMES[id]?.hidden).map(id => {
          const words = vocab[id];
          const theme = LESSON_THEMES[id] || { name: 'Lección ' + id, icon: words[0]?.hanzi?.[0] || '汉' };
          const lp = progress.lessons[id] || {};
          const best = Math.round(((lp.match || 0) + (lp.cards || 0) + (lp.quiz || 0)) / 3);
          const stars = [lp.match || 0, lp.cards || 0, lp.quiz || 0].filter(v => v >= 80).length;
          return html('button', {
            key: id,
            className: 'lesson-card',
            onClick: () => onSelectLesson(id),
          },
            stars > 0 && html('div', { className: 'seal hanzi-font' }, stars === 3 ? '✓' : stars),
            html('div', { className: 'hanzi-big hanzi-font' }, theme.icon),
            html('div', { className: 'lesson-name' }, 'Lección ' + id),
            html('div', { className: 'lesson-meta' }, theme.name + ' · ' + words.length + ' palabras'),
            html('div', { className: 'progress-track' },
              html('div', { className: 'progress-fill', style: { width: best + '%' } })
            ),
          );
        })
      ),

      // ── Módulos especiales ──
      vocab['mod-paises'] && !LESSON_THEMES['mod-paises']?.hidden && html(React.Fragment, null,
        html('h2', { className: 'section-title' }, 'Aprende los países'),
        html('button', {
          style: {
            display: 'flex', alignItems: 'center', gap: 14, width: '100%', marginBottom: 14,
            background: '#fff', border: '2px solid var(--paper-deep)', borderRadius: 'var(--radius)',
            padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
            boxShadow: 'var(--shadow-paper)',
          },
          onClick: () => onSelectLesson('mod-paises'),
        },
          html('div', { className: 'hanzi-font', style: { fontSize: 36, color: 'var(--lacquer)', minWidth: 44 } }, '国'),
          html('div', null,
            html('div', { style: { fontWeight: 800, fontSize: 15, color: 'var(--ink)' } }, 'Nombres de países en chino'),
            html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 2 } },
              (vocab['mod-paises'] ? vocab['mod-paises'].length : 0) + ' países · Latinoamérica, Europa, Asia'
            ),
          ),
        ),
      ),

      vocab['mod-numeros'] && !LESSON_THEMES['mod-numeros']?.hidden && html(React.Fragment, null,
        html('h2', { className: 'section-title' }, 'Aprende los números'),
        html('button', {
          style: {
            display: 'flex', alignItems: 'center', gap: 14, width: '100%', marginBottom: 14,
            background: '#fff', border: '2px solid var(--paper-deep)', borderRadius: 'var(--radius)',
            padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
            boxShadow: 'var(--shadow-paper)',
          },
          onClick: () => onSelectLesson('mod-numeros'),
        },
          html('div', { className: 'hanzi-font', style: { fontSize: 36, color: 'var(--lacquer)', minWidth: 44 } }, '数'),
          html('div', null,
            html('div', { style: { fontWeight: 800, fontSize: 15, color: 'var(--ink)' } }, 'Del 0 al 100 en chino'),
            html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 2 } }, '0 al 10 · decenas del 20 al 100'),
          ),
        ),
      ),
      html('h2', { className: 'section-title' }, '¿Cuánto aprendiste?'),
      html('div', { className: 'prueba-grid' },
        (modulesList || MODULES_LIST_DEFAULT)
          .filter(g => g.active !== false && !LESSON_THEMES['mod-' + g.id]?.hidden).map(g => {
          const best = pruebaProgress[g.id] || 0;
          const hasStar = best >= 80;
          return html('button', { key: g.id, className: 'prueba-card', onClick: () => onPrueba(g.id) },
            html('div', { className: 'prueba-icon ' + g.cls }, g.icon),
            html('div', { style: { flex: 1 } },
              html('div', { className: 'mode-title' }, g.title),
              html('div', { className: 'mode-sub' }, best > 0 ? '⭐ Mejor: ' + best + '%' : g.sub),
            ),
            hasStar && html('div', { style: { fontSize: 20 } }, '⭐'),
          );
        })
      ),
      html('button', {
        className: 'download-resumen-btn',
        onClick: onDownload,
      },
        html('span', { style: { fontSize: 22 } }, '📥'),
        html('span', null,
          html('div', { style: { fontWeight: 800, fontSize: 15 } }, 'Descargar mi resumen de repaso'),
          html('div', { style: { fontSize: 12, opacity: 0.75, fontWeight: 600 } }, 'Aciertos, errores y palabras para repasar'),
        ),
      ),
      !LESSON_THEMES['mod-refuerzo']?.hidden && html('h2', { className: 'section-title' }, 'Reforcemos'),
      !LESSON_THEMES['mod-refuerzo']?.hidden && html('button', {
        style: {
          display: 'flex', alignItems: 'center', gap: 14,
          width: '100%', marginTop: 0, marginBottom: 12,
          background: 'linear-gradient(135deg, var(--lacquer) 0%, var(--lacquer-dark) 100%)',
          color: '#fff', border: 'none', borderRadius: 'var(--radius)',
          padding: '16px 20px', cursor: 'pointer', textAlign: 'left',
          boxShadow: '0 4px 16px rgba(193,67,43,0.28)',
        },
        onClick: onRefuerzo,
      },
        html('span', { style: { fontSize: 22 } }, '💪'),
        html('span', null,
          html('div', { style: { fontWeight: 800, fontSize: 15 } }, 'Práctica personalizada'),
          html('div', { style: { fontSize: 12, opacity: 0.8, fontWeight: 600, marginTop: 2 } }, 'Ejercicios con tus palabras para reforzar'),
        ),
      ),
    )
  );
}

// ----------------- Números: tabla interactiva -----------------
function NumbersIntro({ words, onBack, onPlay }) {
  const [active, setActive] = useState(null);

  const playNum = (w) => {
    setActive(w.hanzi);
    speak(w.hanzi);
    setTimeout(() => setActive(null), 1200);
  };

  const singles = words.filter(w => ['零','一','二','三','四','五','六','七','八','九','十'].includes(w.hanzi));
  const tens    = words.filter(w => w.hanzi.length > 1 && w.es.includes('·'));

  const NumCard = ({ w }) => html('button', {
    key: w.hanzi,
    onClick: () => playNum(w),
    style: {
      background: active === w.hanzi ? 'var(--lacquer)' : '#fff',
      border: '2px solid ' + (active === w.hanzi ? 'var(--lacquer)' : 'var(--paper-deep)'),
      borderRadius: 14, padding: '10px 6px', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      transition: 'all 0.15s',
    }
  },
    html('div', { className: 'hanzi-font', style: { fontSize: 32, color: active === w.hanzi ? '#fff' : 'var(--lacquer)', lineHeight: 1 } }, w.hanzi),
    html('div', { style: { fontSize: 11, fontWeight: 800, color: active === w.hanzi ? 'rgba(255,255,255,0.85)' : 'var(--lacquer-dark)', letterSpacing: 0.5 } }, w.pinyin),
    html('div', { style: { fontSize: 10, color: active === w.hanzi ? 'rgba(255,255,255,0.75)' : 'var(--ink-soft)', fontWeight: 600 } }, w.es.split('·')[0].trim()),
  );

  return html(React.Fragment, null,
    html('main', { style: { paddingTop: 18, paddingBottom: 40 } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, 'Los números'),
        html('div', { style: { fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700 } }, 'Tocá para escuchar'),
      ),
      html('div', { style: { padding: '0 16px' } },

        html('p', { className: 'admin-note', style: { marginBottom: 12, textAlign: 'center' } }, '🔊 Tocá cada número para escuchar cómo suena'),

        html('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 } },
          singles.map(w => html(NumCard, { key: w.hanzi, w }))
        ),

        html('div', { style: { background: 'var(--jade-light)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 } },
          html('div', { style: { fontWeight: 800, fontSize: 13, color: 'var(--jade-dark)', marginBottom: 8 } }, '💡 ¿Cómo se forman las decenas?'),
          html('div', { style: { fontSize: 13, color: 'var(--jade-dark)', lineHeight: 1.7 } },
            '二 + 十 = 二十 (20) · tres dieces = tres dieces', html('br', null),
            'El patrón es: ', html('strong', null, '[número] + 十'), ' para las decenas.',  html('br', null),
            'Ejemplo: 七十 = qīshí = 70 (siete + diez)',
          ),
        ),

        html('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 } },
          tens.map(w => html(NumCard, { key: w.hanzi, w }))
        ),

        html('button', { className: 'primary-btn', onClick: onPlay }, '¡Listo! Ir a practicar →'),
      ),
    )
  );
}

// ----------------- Lesson menu -----------------
function LessonMenu({ vocab, lessonId, progress, onBack, onSelectMode, onWorkbookListen, onWorkbookStroke }) {
  const theme = LESSON_THEMES[lessonId] || { name: 'Lección ' + lessonId };
  const lp = progress.lessons[lessonId] || {};
  const hasWorkbook = false;

  const modes = [
    { id: 'match', emoji: '🔗', title: 'Emparejar', sub: 'Une carácter, pinyin y significado', cls: 'match', best: lp.match },
    { id: 'cards', emoji: '🀄', title: 'Tarjetas', sub: 'Repasá carácter por carácter', cls: 'cards', best: lp.cards },
    { id: 'quiz', emoji: '✅', title: 'Opción múltiple', sub: 'Elegí el significado correcto', cls: 'quiz', best: lp.quiz },
  ];

  return html(React.Fragment, null,
    html('main', { style: { paddingTop: '18px' } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, (lessonId === 'mod-paises' || lessonId === 'mod-numeros') ? theme.name : 'Lección ' + lessonId + ' · ' + theme.name),
      ),
      html('div', { className: 'mode-list' },
        lessonId === 'mod-numeros' && html('button', { className: 'mode-card', onClick: () => onSelectMode('intro') },
          html('div', { className: 'mode-emoji', style: { background: '#FFF3C4', fontSize: 22 } }, '📊'),
          html('div', null,
            html('div', { className: 'mode-title' }, 'Explorar los números'),
            html('div', { className: 'mode-sub' }, 'Tabla interactiva con audio · toca para escuchar'),
          )
        ),
        modes.map(m => html('button', { key: m.id, className: 'mode-card', onClick: () => onSelectMode(m.id) },
          html('div', { className: 'mode-emoji ' + m.cls }, m.emoji),
          html('div', { style: { flex: 1 } },
            html('div', { className: 'mode-title' }, m.title),
            html('div', { className: 'mode-sub' }, m.sub),
            m.best ? html('div', { className: 'mode-stats-row' },
              html('span', { className: 'mode-stat-pct' }, m.best + '% completado'),
              html('span', { className: 'mode-stat-ok' }, '✓ ' + m.best + '%'),
              html('span', { className: 'mode-stat-err' }, '✕ ' + (100 - m.best) + '%'),
            ) : null,
          )
        ))
      ),
      hasWorkbook && html(React.Fragment, null,
        html('h2', { className: 'section-title', style: { marginTop: 20 } }, '📘 Libro de Ejercicios'),
        html('div', { className: 'mode-list' },
          html('button', { className: 'mode-card', onClick: onWorkbookListen },
            html('div', { className: 'mode-emoji', style: { background: '#DCEEE9', fontSize: 22 } }, '🎧'),
            html('div', null,
              html('div', { className: 'mode-title' }, 'Discriminación auditiva'),
              html('div', { className: 'mode-sub' }, 'Sonido y tono, con el audio real del libro'),
            )
          ),
          html('button', { className: 'mode-card', onClick: onWorkbookStroke },
            html('div', { className: 'mode-emoji', style: { background: '#F6E2B0', fontSize: 22 } }, '✍️'),
            html('div', null,
              html('div', { className: 'mode-title' }, 'Trazo de caracteres'),
              html('div', { className: 'mode-sub' }, 'Practicá el orden de trazos como en el libro'),
            )
          ),
        )
      )
    )
  );
}

// ----------------- Play screen router -----------------
function PlayScreen({ vocab, lessonId, mode, onBack, onHome, onFinish, nextAction, savedResult, onSaveResult, onClearResult }) {
  const words = vocab[lessonId];
  const extra = { savedResult, onSaveResult, onClearResult };
  if (mode === 'intro') return html(NumbersIntro, { words, onBack, onPlay: onBack });
  if (mode === 'match') return html(MatchGame, { words, lessonId, onBack, onHome, onFinish, nextAction, ...extra });
  if (mode === 'cards') return html(FlashcardGame, { words, lessonId, onBack, onHome, onFinish, nextAction, ...extra });
  if (mode === 'quiz') return html(QuizGame, { words, lessonId, onBack, onHome, onFinish, nextAction, ...extra });
  return null;
}

// ----------------- Matching game -----------------
const ROUND_SIZE = 6;

function buildMatchRound(words) {
  const picked = shuffle(words).slice(0, Math.min(ROUND_SIZE, words.length));
  const left = picked.map((w, i) => ({ id: i + '-h', pairId: i, kind: 'hanzi', text: w.hanzi, es: w.es }));
  const right = picked.map((w, i) => ({ id: i + '-p', pairId: i, kind: 'pinyin', text: w.pinyin, es: w.es }));
  return { left: shuffle(left), right: shuffle(right) };
}

function MatchGame({ words, lessonId, onBack, onHome, onFinish, nextAction, savedResult, onSaveResult, onClearResult }) {
  const [columns, setColumns] = useState(() => buildMatchRound(words));
  const [selected, setSelected] = useState(null);
  const [wrongPair, setWrongPair] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [missedWords, setMissedWords] = useState(() => (savedResult ? savedResult.reviewWords || [] : []));
  const [done, setDone] = useState(!!savedResult);

  const totalPairs = columns.left.length;

  const handleTap = (tile) => {
    if (matchedPairs.has(tile.pairId) || wrongPair) return;
    if (!selected) {
      setSelected(tile);
      return;
    }
    if (selected.id === tile.id) {
      setSelected(null);
      return;
    }
    if (selected.kind === tile.kind) {
      // Misma columna: simplemente cambia la selección
      setSelected(tile);
      return;
    }
    if (selected.pairId === tile.pairId) {
      playCorrect();
      const newMatched = new Set(matchedPairs);
      newMatched.add(tile.pairId);
      setMatchedPairs(newMatched);
      setSelected(null);
      if (newMatched.size === totalPairs) {
        const percent = Math.round((totalPairs / (totalPairs + mistakes)) * 100);
        setTimeout(() => {
          setDone(true);
          onFinish(percent, missedWords);
          onSaveResult({ percent, completed: mistakes === 0, reviewWords: missedWords });
        }, 400);
      }
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      // Record the word that was missed (from the selected tile's pairId)
      const missedWord = words.find(w => w.hanzi === selected.pairId || w.pinyin === selected.pairId || (selected.kind === 'hanzi' ? selected.text === w.hanzi : selected.text === w.pinyin));
      if (missedWord && !missedWords.find(m => m.hanzi === missedWord.hanzi)) {
        setMissedWords(prev => [...prev, missedWord]);
      }
      playWrong();
      setWrongPair([selected.id, tile.id]);
      setTimeout(() => {
        setWrongPair(null);
        setSelected(null);
      }, 500);
    }
  };

  if (done) {
    const percent = savedResult ? savedResult.percent : Math.round((totalPairs / (totalPairs + mistakes)) * 100);
    const completed = savedResult ? savedResult.completed : mistakes === 0;
    const shownReview = savedResult ? (savedResult.reviewWords || []) : missedWords;
    return html(ResultScreen, {
      percent, lessonId, mode: 'match',
      completed,
      reviewWords: shownReview,
      onRetry: () => {
        setColumns(buildMatchRound(words));
        setSelected(null);
        setWrongPair(null);
        setMatchedPairs(new Set());
        setMistakes(0);
        setMissedWords([]);
        setDone(false);
        onClearResult();
      },
      onHome,
      nextAction,
    });
  }

  const renderTile = (tile) => {
    const isMatched = matchedPairs.has(tile.pairId);
    const isSelected = selected && selected.id === tile.id;
    const isWrong = wrongPair && wrongPair.includes(tile.id);
    let cls = 'match-tile ' + (tile.kind === 'hanzi' ? 'hanzi hanzi-font' : 'text pinyin');
    if (isMatched) cls += ' correct matched-hidden';
    else if (isWrong) cls += ' wrong';
    else if (isSelected) cls += ' selected';
    return html('button', {
      key: tile.id, className: cls,
      onClick: () => handleTap(tile),
      disabled: isMatched,
    },
      tile.kind === 'pinyin'
        ? html(React.Fragment, null, html(TonedPinyin, { text: tile.text }), html('span', { className: 'es-tooltip' }, tile.es))
        : tile.text
    );
  };

  return html(React.Fragment, null,
    html('main', { style: { paddingTop: '18px' } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, 'Emparejar'),
        html('button', { className: 'back-btn', onClick: onHome, title: 'Ir al inicio' }, '⌂'),
      ),
      html('div', { className: 'match-progress-row' },
        html('div', { className: 'match-progress-track' },
          html('div', { className: 'match-progress-fill', style: { width: (matchedPairs.size / totalPairs * 100) + '%' } })
        ),
        html('div', { className: 'match-counter' }, matchedPairs.size + '/' + totalPairs)
      ),
      html('p', { className: 'admin-note', style: { textAlign: 'center', marginBottom: 14 } }, 'Pasá el mouse sobre el pinyin para ver el significado'),
      html('div', { className: 'match-columns' },
        html('div', { className: 'match-column' }, columns.left.map(renderTile)),
        html('div', { className: 'match-column' }, columns.right.map(renderTile)),
      )
    )
  );
}

// ----------------- Flashcards -----------------
function FlashcardGame({ words, lessonId, onBack, onHome, onFinish, nextAction, savedResult, onSaveResult, onClearResult }) {
  const [deck, setDeck] = useState(() => shuffle(words));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [reviewWords, setReviewWords] = useState(() => (savedResult ? savedResult.reviewWords || [] : []));
  const [done, setDone] = useState(!!savedResult);

  const card = deck[index];

  const advance = (gotIt) => {
    const newKnown = known + (gotIt ? 1 : 0);
    const newReview = gotIt ? reviewWords : [...reviewWords, card];
    if (index + 1 >= deck.length) {
      const percent = Math.round((newKnown / deck.length) * 100);
      setKnown(newKnown);
      setReviewWords(newReview);
      setDone(true);
      onFinish(percent, newReview);
      onSaveResult({ percent, completed: newKnown === deck.length, reviewWords: newReview });
    } else {
      setKnown(newKnown);
      setReviewWords(newReview);
      setIndex(index + 1);
      setFlipped(false);
    }
  };

  if (done) {
    const percent = savedResult ? savedResult.percent : Math.round((known / deck.length) * 100);
    const completed = savedResult ? savedResult.completed : known === deck.length;
    const shownReview = savedResult ? (savedResult.reviewWords || []) : reviewWords;
    return html(ResultScreen, {
      percent, lessonId, mode: 'cards',
      completed,
      reviewWords: shownReview,
      onRetry: () => {
        setDeck(shuffle(words));
        setIndex(0);
        setFlipped(false);
        setKnown(0);
        setReviewWords([]);
        setDone(false);
        onClearResult();
      },
      onHome,
      nextAction,
    });
  }

  return html(React.Fragment, null,
    html('main', { style: { paddingTop: '18px' } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, 'Tarjetas'),
        html('div', { className: 'flash-counter' }, (index + 1) + '/' + deck.length),
        html('button', { className: 'back-btn', onClick: onHome, title: 'Ir al inicio' }, '⌂'),
      ),
      html('div', { className: 'flash-score-row' },
        html('div', { className: 'flash-score-chip no' },
          html('i', null, '✕'), 'No la sabía: ' + reviewWords.length
        ),
        html('div', { className: 'flash-score-chip yes' },
          html('i', null, '✓'), 'La sabía: ' + known
        ),
      ),
      html('div', { className: 'flashcard-wrap' },
        html('div', { className: 'flashcard', onClick: () => {
          if (!flipped) { setFlipped(true); speak(card.hanzi); }
        }},
          !flipped
            ? html('div', { className: 'front hanzi-font' }, card.hanzi)
            : html('div', { className: 'back-content' },
                html(TonedPinyin, { text: card.pinyin, className: 'back-pinyin' }),
                html('div', { className: 'back-es' }, card.es),
              ),
          html('div', { className: 'tap-hint' }, flipped ? '' : 'Toca para ver la respuesta')
        ),
        flipped && html('div', { className: 'flash-controls' },
          html('button', { className: 'flash-btn no', onClick: () => { playWrong(); setFlipped(false); advance(false); } }, 'No lo sabía'),
          html('button', { className: 'flash-btn yes', onClick: () => { playCorrect(); setFlipped(false); advance(true); } }, 'Lo sabía'),
        )
      )
    )
  );
}

// ----------------- Quiz -----------------
const FLAG_RE = /^\p{Emoji_Presentation}/u;
const FLAG_CODE_RE = /^([\u{1F1E0}-\u{1F1FF}]{2})/u;
function getFlagCode(es) {
  if (!es) return null;
  const m = es.match(FLAG_CODE_RE);
  if (!m) return null;
  return [...m[1]].map(c => String.fromCharCode(c.codePointAt(0) - 0x1F1A5)).join('').toLowerCase();
}
function stripFlag(es) {
  return es ? es.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '') : es;
}
function FlagImg({ es, size }) {
  const code = getFlagCode(es);
  if (!code) return null;
  const h = size || 18;
  const w = Math.round(h * 1.33);
  return html('img', { src: 'https://flagcdn.com/' + w + 'x' + h + '/' + code + '.png', style: { borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }, alt: code.toUpperCase() });
}
function sameCategory(a, b) {
  // Si ambas tienen bandera (países) o ambas no tienen, son misma categoría
  return FLAG_RE.test(a.es) === FLAG_RE.test(b.es);
}
function buildQuizQuestions(words) {
  const picked = shuffle(words).slice(0, Math.min(8, words.length));
  return picked.map(w => {
    // Preferir distractores de la misma categoría (países con países, palabras con palabras)
    const samePool = shuffle(words.filter(x => x.es !== w.es && sameCategory(w, x)));
    const diffPool = shuffle(words.filter(x => x.es !== w.es && !sameCategory(w, x)));
    const pool = [...samePool, ...diffPool];
    const distractors = pool.slice(0, 3).map(x => x.es);
    const options = shuffle([w.es, ...distractors]);
    return { hanzi: w.hanzi, pinyin: w.pinyin, correct: w.es, options };
  });
}

function QuizGame({ words, lessonId, onBack, onHome, onFinish, nextAction, savedResult, onSaveResult, onClearResult }) {
  const [questions, setQuestions] = useState(() => buildQuizQuestions(words));
  const [index, setIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [showPinyin, setShowPinyin] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [reviewWords, setReviewWords] = useState(() => (savedResult ? savedResult.reviewWords || [] : []));
  const [done, setDone] = useState(!!savedResult);

  const q = questions[index];

  const handlePick = (opt) => {
    if (selectedOpt) return;
    setSelectedOpt(opt);
    const isCorrect = opt === q.correct;
    if (isCorrect) playCorrect(); else playWrong();
    speak(q.hanzi);
    const newCount = correctCount + (isCorrect ? 1 : 0);
    const newWrong = wrongCount + (isCorrect ? 0 : 1);
    const newReview = isCorrect ? reviewWords : [...reviewWords, { hanzi: q.hanzi, pinyin: q.pinyin, es: q.correct }];
    setTimeout(() => {
      if (index + 1 >= questions.length) {
        const percent = Math.round((newCount / questions.length) * 100);
        setCorrectCount(newCount);
        setWrongCount(newWrong);
        setReviewWords(newReview);
        setDone(true);
        onFinish(percent, newReview);
        onSaveResult({ percent, completed: newCount === questions.length, reviewWords: newReview });
      } else {
        setCorrectCount(newCount);
        setWrongCount(newWrong);
        setReviewWords(newReview);
        setIndex(index + 1);
        setSelectedOpt(null);
        setShowPinyin(false);
      }
    }, 700);
  };

  if (done) {
    const percent = savedResult ? savedResult.percent : Math.round((correctCount / questions.length) * 100);
    const completed = savedResult ? savedResult.completed : correctCount === questions.length;
    const shownReview = savedResult ? (savedResult.reviewWords || []) : reviewWords;
    return html(ResultScreen, {
      percent, lessonId, mode: 'quiz',
      completed,
      reviewWords: shownReview,
      onRetry: () => {
        setQuestions(buildQuizQuestions(words));
        setIndex(0);
        setSelectedOpt(null);
        setCorrectCount(0);
        setWrongCount(0);
        setReviewWords([]);
        setDone(false);
        onClearResult();
      },
      onHome,
      nextAction,
    });
  }

  return html(React.Fragment, null,
    html('main', { style: { paddingTop: '18px' } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, 'Opción múltiple'),
        html('div', { className: 'flash-counter' }, (index + 1) + '/' + questions.length),
        html('button', { className: 'back-btn', onClick: onHome, title: 'Ir al inicio' }, '⌂'),
      ),
      html('div', { className: 'flash-score-row' },
        html('div', { className: 'flash-score-chip no' },
          html('i', null, '✕'), 'Incorrectas: ' + wrongCount
        ),
        html('div', { className: 'flash-score-chip yes' },
          html('i', null, '✓'), 'Correctas: ' + correctCount
        ),
      ),
      html('div', { className: 'quiz-prompt' },
        !selectedOpt && html('button', { className: 'pinyin-toggle-btn', style: { marginBottom: 6 }, onClick: () => setShowPinyin(v => !v) },
          showPinyin ? '🙈 Ocultar pīnyīn' : '👁 Ver pīnyīn'
        ),
        (showPinyin || selectedOpt) && html(TonedPinyin, { text: q.pinyin, className: 'q-label' }),
        html('div', { className: 'q-hanzi hanzi-font' }, q.hanzi),
      ),
      html('div', { className: 'quiz-options' },
        q.options.map(opt => {
          let cls = 'quiz-option';
          if (selectedOpt) {
            cls += ' disabled';
            if (opt === q.correct) cls += ' correct';
            else if (opt === selectedOpt) cls += ' wrong';
          }
          return html('button', { key: opt, className: cls, onClick: () => handlePick(opt) }, stripFlag(opt));
        })
      )
    )
  );
}

// ----------------- Result screen -----------------
function ReviewList({ reviewWords }) {
  if (!reviewWords || reviewWords.length === 0) return null;
  return html('div', { className: 'review-list' },
    html('div', { className: 'review-list-title' }, 'Para repasar (' + reviewWords.length + ')'),
    reviewWords.map((w, i) => html('div', { key: i, className: 'review-item' },
      html('div', { className: 'review-hanzi hanzi-font' }, w.hanzi),
      html('div', { className: 'review-info' },
        html('div', { className: 'review-pinyin' }, w.pinyin),
        html('div', { className: 'review-es' }, w.es),
      )
    ))
  );
}

function ResultScreen({ percent, mode, completed, reviewWords, onRetry, onHome, nextAction }) {
  if (completed) {
    return html('main', { style: { paddingTop: '18px' } },
      html('div', { className: 'result-screen' },
        html('div', { className: 'result-seal hanzi-font celebrate' },
          html('div', { className: 'pct' }, '完'),
          html('div', { className: 'label' }, '100%')
        ),
        html('div', { className: 'result-title' }, '¡Felicitaciones!'),
        html('div', { className: 'result-sub' }, 'Completaste este ejercicio sin errores'),
        html('div', { className: 'result-actions' },
          nextAction && html('button', { className: 'primary-btn', onClick: nextAction.go }, nextAction.label),
          html('button', { className: nextAction ? 'secondary-btn' : 'primary-btn', onClick: onRetry }, 'Volver a intentar'),
          html('button', { className: 'secondary-btn', onClick: onHome }, 'Volver al inicio'),
        ),
        html(ReviewList, { reviewWords })
      )
    );
  }

  let title, sub;
  if (percent >= 90) { title = '¡Excelente!'; sub = 'Dominaste esta lección'; }
  else if (percent >= 70) { title = '¡Muy bien!'; sub = 'Casi perfecto, seguí practicando'; }
  else if (percent >= 50) { title = 'Buen intento'; sub = 'Repasá un poco más y volvé a intentar'; }
  else { title = 'Sigamos practicando'; sub = 'Cada repaso ayuda a memorizar'; }

  return html('main', { style: { paddingTop: '18px' } },
    html('div', { className: 'result-screen' },
      html('div', { className: 'result-seal hanzi-font' },
        html('div', { className: 'pct' }, percent + '%'),
        html('div', { className: 'label' }, 'SCORE')
      ),
      html('div', { className: 'result-title' }, title),
      html('div', { className: 'result-sub' }, sub),
      html('div', { className: 'result-actions' },
        nextAction && html('button', { className: 'primary-btn', onClick: nextAction.go }, nextAction.label),
        html('button', { className: nextAction ? 'secondary-btn' : 'primary-btn', onClick: onRetry }, 'Volver a intentar'),
        html('button', { className: 'secondary-btn', onClick: onHome }, 'Volver al inicio'),
      ),
      html(ReviewList, { reviewWords })
    )
  );
}

// ----------------- Refuerzo: helpers -----------------
function getMissedWords(progress) {
  const all = [];
  const lp = progress.lessons || {};
  Object.keys(lp).forEach(lid => {
    ['match', 'cards', 'quiz'].forEach(mode => {
      (lp[lid][mode + '_missed'] || []).forEach(w => { if (w && w.hanzi) all.push(w); });
    });
  });
  const pp = progress.prueba || {};
  ['clas', 'dialogo', 'orden', 'audio'].forEach(game => {
    (pp[game + '_missed'] || []).forEach(w => { if (w && w.hanzi) all.push(w); });
  });
  const seen = new Set();
  return all.filter(w => {
    if (seen.has(w.hanzi)) return false;
    seen.add(w.hanzi);
    return true;
  });
}

// Versión con pesos: prioriza palabras con más errores y errores recientes
function getSmartMissedWords(progress, wordErrorsMap) {
  const base = getMissedWords(progress);
  if (!wordErrorsMap || Object.keys(wordErrorsMap).length === 0) return base;
  const now = Date.now();
  return base.map(w => {
    const err = wordErrorsMap[w.hanzi];
    if (!err) return { ...w, _score: 1 };
    const daysSinceError   = err.last_error   ? (now - new Date(err.last_error).getTime())   / 86400000 : 30;
    const daysSinceCorrect = err.last_correct ? (now - new Date(err.last_correct).getTime()) / 86400000 : 999;
    const recency      = daysSinceError < 1 ? 2.0 : daysSinceError < 3 ? 1.5 : daysSinceError < 7 ? 1.1 : 0.8;
    const correctBonus = daysSinceCorrect < 1 ? 0.2 : daysSinceCorrect < 3 ? 0.5 : 1.0;
    return { ...w, _score: (err.error_count || 1) * recency * correctBonus };
  }).sort((a, b) => b._score - a._score);
}

// ----------------- Refuerzo: Tarjetas de estudio -----------------
function StudyCardsPhase({ words, onDone, onBack }) {
  const [deck] = useState(() => shuffle([...words]));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const w = deck[index];
  const isLast = index === deck.length - 1;
  return html(React.Fragment, null,
    html('main', { style: { paddingTop: 18, paddingBottom: 40 } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, 'Tarjetas de estudio'),
        html('div', { className: 'flash-counter' }, (index + 1) + '/' + deck.length),
      ),
      html('div', { style: { padding: '16px 16px 0' } },
        html('div', {
          onClick: () => { setFlipped(f => !f); if (!flipped) speak(w.hanzi); },
          style: {
            minHeight: 220, borderRadius: 20, background: '#fff',
            boxShadow: 'var(--shadow-paper)', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '32px 24px', gap: 14, marginBottom: 24, transition: 'background 0.2s',
          }
        },
          !flipped
            ? html(React.Fragment, null,
                html('div', { className: 'hanzi-font', style: { fontSize: 96, color: 'var(--lacquer)', lineHeight: 1.1 } }, w.hanzi),
                html('div', { style: { fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 8 } }, '👆 Tocá para ver'),
              )
            : html(React.Fragment, null,
                html('div', { className: 'hanzi-font', style: { fontSize: 72, color: 'var(--lacquer)', lineHeight: 1.1, marginBottom: 4 } }, w.hanzi),
                html(TonedPinyin, { text: w.pinyin, style: { fontSize: 20, fontWeight: 800, letterSpacing: 1 } }),
                html('div', { style: { fontSize: 16, color: 'var(--ink-mid)', fontWeight: 600, textAlign: 'center', marginTop: 6 } }, w.es),
              ),
        ),
        html('div', { style: { display: 'flex', gap: 12 } },
          html('button', {
            className: 'secondary-btn', style: { margin: 0, flex: 1 },
            disabled: index === 0,
            onClick: () => { setFlipped(false); setIndex(i => i - 1); },
          }, '← Anterior'),
          isLast
            ? html('button', { className: 'primary-btn', style: { flex: 1 }, onClick: onDone }, '¡Listo! →')
            : html('button', { className: 'primary-btn', style: { flex: 1 }, onClick: () => { setFlipped(false); setIndex(i => i + 1); } }, 'Siguiente →'),
        ),
      ),
    )
  );
}

// ----------------- Refuerzo: Quiz genérico -----------------
function buildRefuerzoMC(words, allWords, mode) {
  return shuffle([...words]).map(w => {
    let show, hint, correct, distractor;
    if (mode === 'pinyin') { show = w.hanzi; hint = w.es; correct = w.pinyin; distractor = x => x.pinyin; }
    else if (mode === 'hanzi') { show = w.es; hint = w.pinyin; correct = w.hanzi; distractor = x => x.hanzi; }
    else { show = w.hanzi; hint = w.pinyin; correct = w.es; distractor = x => x.es; }
    const pool = shuffle([...allWords].filter(x => x.hanzi !== w.hanzi && distractor(x) !== correct));
    const options = shuffle([correct, ...pool.slice(0, 2).map(distractor)]);
    return { show, hint, correct, options };
  });
}

function RefuerzoMC({ words, allWords, mode, title, onDone, onBack, playerName }) {
  const [questions] = useState(() => buildRefuerzoMC(words, allWords, mode));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [correctRef, setCorrectRef] = useState(0);
  const [missed, setMissed] = useState([]);
  const [done, setDone] = useState(false);

  const q = questions[index];
  const isHanzi = mode === 'hanzi';
  const isCorrect = selected !== null && selected === q.correct;

  const handlePick = (opt) => {
    if (selected !== null) return;
    setSelected(opt);
    const ok = opt === q.correct;
    if (ok) playCorrect(); else playWrong();
    // Pronunciar el hanzi (si el modo lo muestra) o la respuesta correcta en hanzi
    const hanziToSpeak = mode === 'es' || mode === 'pinyin' ? q.show : q.correct;
    if (hanziToSpeak && /[一-鿿]/.test(hanziToSpeak)) speak(hanziToSpeak);
    const nc = correct + (ok ? 1 : 0);
    setCorrectRef(nc);
    if (ok) setCorrect(nc);
    else {
      const orig = words.find(w => (mode === 'pinyin' || mode === 'es' ? w.hanzi : w.es) === q.show) || {};
      setMissed(m => [...m, orig]);
    }
  };

  const handleNext = () => {
    const next = index + 1;
    if (next >= questions.length) {
      setDone(true);
      if (onDone) onDone();
    } else { setIndex(next); setSelected(null); }
  };

  if (done) return html(PruebaResult, {
    percent: Math.round((correctRef / questions.length) * 100),
    total: questions.length, correct: correctRef, missed,
    onRetry: () => { setIndex(0); setSelected(null); setCorrect(0); setCorrectRef(0); setMissed([]); setDone(false); },
    onBack, playerName,
  });

  return html(React.Fragment, null,
    html('main', { style: { paddingTop: 18 } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, title),
        html('div', { className: 'flash-counter' }, (index + 1) + '/' + questions.length),
      ),
      html('div', { className: 'flash-score-row' },
        html('div', { className: 'flash-score-chip yes' }, html('i', null, '✓'), correct + ' correctas'),
      ),
      html('div', { style: { padding: '16px 16px 0' } },
        html('div', { style: { background: '#fff', borderRadius: 20, boxShadow: 'var(--shadow-paper)', padding: '28px 24px', textAlign: 'center', marginBottom: 20 } },
          isHanzi
            ? html(React.Fragment, null,
                html('div', { style: { fontSize: 16, color: 'var(--ink-mid)', fontWeight: 600, marginBottom: 10 } }, q.show),
                html(TonedPinyin, { text: q.hint, style: { fontSize: 15, color: 'var(--lacquer-dark)', fontWeight: 700, letterSpacing: 0.5 } }),
              )
            : html(React.Fragment, null,
                html('div', { className: 'hanzi-font', style: { fontSize: 60, color: 'var(--lacquer)', lineHeight: 1.1, marginBottom: 8 } }, q.show),
                html(TonedPinyin, { text: q.hint, style: { fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600 } }),
              ),
        ),
        selected !== null
          ? html(React.Fragment, null,
              html('div', { style: {
                borderRadius: 16, padding: '18px 20px', textAlign: 'center', fontWeight: 800, marginBottom: 16,
                background: isCorrect ? 'var(--jade-light)' : '#FDE4DD',
                color: isCorrect ? 'var(--jade-dark)' : 'var(--lacquer-dark)',
              }},
                html('div', { style: { fontSize: 36 } }, isCorrect ? '✓' : '✗'),
                html('div', { style: { fontSize: 18, marginTop: 4 } }, isCorrect ? '¡Correcto!' : 'Correcto: ' + q.correct),
              ),
              html('button', { className: 'primary-btn', onClick: handleNext },
                index < questions.length - 1 ? 'Siguiente →' : 'Ver resultado'
              ),
            )
          : html('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              q.options.map((opt, i) => html('button', {
                key: i, className: 'quiz-option',
                style: {
                  textAlign: 'center',
                  fontFamily: isHanzi ? 'Noto Serif SC, serif' : 'Nunito, sans-serif',
                  fontSize: isHanzi ? 24 : 15,
                },
                onClick: () => handlePick(opt),
              }, String.fromCharCode(65 + i) + '.  ' + opt)),
            ),
      ),
    )
  );
}

// ----------------- Refuerzo: Session hub -----------------
const REFUERZO_EXERCISES = [
  { id: 'cards',  icon: '📖', label: 'Tarjetas de estudio',    sub: 'Repasá hanzi, pinyin y significado' },
  { id: 'es',     icon: '🇪🇸', label: '¿Qué significa?',        sub: 'Ves el hanzi, elegís el significado' },
  { id: 'pinyin', icon: '🔤', label: '¿Cuál es el pinyin?',      sub: 'Ves el hanzi, elegís el pinyin' },
  { id: 'hanzi',  icon: '汉', label: '¿Cómo se escribe?',       sub: 'Ves el significado, elegís el hanzi' },
  { id: 'match',  icon: '🔗', label: 'Emparejamiento',          sub: 'Une hanzi con su pinyin y significado' },
];

function RefuerzoSession({ words, allWords, onBack, playerName }) {
  const [current, setCurrent] = useState(null);
  const [done, setDone] = useState(new Set());

  const markDone = (id) => { setDone(prev => new Set([...prev, id])); setCurrent(null); };
  const goBack = () => setCurrent(null);
  const noop = () => {};

  if (!words || words.length === 0) return html('main', { style: { paddingTop: 18, paddingBottom: 40 } },
    html('div', { className: 'header-row' },
      html('button', { className: 'back-btn', onClick: onBack }, '←'),
      html('div', null, html('h1', null, 'Reforcemos')),
    ),
    html('div', { style: { padding: '0 16px', marginTop: 24 } },
      html('div', { style: { background: 'var(--card)', borderRadius: 16, padding: '28px 20px', textAlign: 'center', border: '1.5px solid var(--border)' } },
        html('div', { style: { fontSize: 48, marginBottom: 12 } }, '🌱'),
        html('div', { style: { fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 } }, 'Todavía no tenés palabras para repasar'),
        html('div', { style: { fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55 } },
          'Esta sección se llena automáticamente con las palabras donde te equivocaste en Tarjetas, Quiz y los juegos.',
          html('br', null),
          html('br', null),
          'Practicá algunas actividades — cuando cometas errores, esas palabras aparecerán acá para reforzarlas. 💪',
        ),
      ),
    ),
  );

  if (current === 'cards') return html(StudyCardsPhase, { words, onDone: () => markDone('cards'), onBack: goBack });
  if (current === 'es')    return html(RefuerzoMC, { words, allWords, mode: 'es',    title: '¿Qué significa?',   onDone: () => markDone('es'),    onBack: goBack, playerName });
  if (current === 'pinyin') return html(RefuerzoMC, { words, allWords, mode: 'pinyin', title: '¿Cuál es el pinyin?',     onDone: () => markDone('pinyin'), onBack: goBack, playerName });
  if (current === 'hanzi')  return html(RefuerzoMC, { words, allWords, mode: 'hanzi',  title: '¿Cómo se escribe?', onDone: () => markDone('hanzi'),  onBack: goBack, playerName });
  if (current === 'match')  return html(MatchGame, {
    words, lessonId: null,
    onBack: goBack, onHome: goBack,
    onFinish: () => markDone('match'),
    nextAction: null, savedResult: null, onSaveResult: noop, onClearResult: noop,
  });

  // Hub
  const allDone = done.size === REFUERZO_EXERCISES.length;
  return html(React.Fragment, null,
    html('main', { style: { paddingTop: 18, paddingBottom: 40 } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('div', null,
          html('h1', null, 'Reforcemos'),
          html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, marginTop: 2 } }, 'Práctica personalizada · ' + words.length + ' palabras'),
        ),
        html('div', { style: { fontSize: 13, fontWeight: 800, color: done.size === REFUERZO_EXERCISES.length ? 'var(--jade)' : 'var(--ink-soft)' } },
          done.size + '/' + REFUERZO_EXERCISES.length + ' ✓'
        ),
      ),
      html('div', { style: { padding: '0 16px' } },
        html('div', { style: { display: 'flex', gap: 6, marginBottom: 20 } },
          REFUERZO_EXERCISES.map((e, i) => html('div', {
            key: e.id,
            style: {
              flex: 1, height: 5, borderRadius: 4,
              background: done.has(e.id) ? 'var(--jade)' : 'var(--paper-deep)',
            }
          }))
        ),
        allDone && html('div', { style: {
          background: 'var(--jade-light)', borderRadius: 16, padding: '16px 20px',
          textAlign: 'center', marginBottom: 20, fontWeight: 800, color: 'var(--jade-dark)',
        }},
          html('div', { style: { fontSize: 32 } }, '🎉'),
          html('div', { style: { fontSize: 17, marginTop: 6 } }, '¡Completaste todos los ejercicios!'),
        ),
        REFUERZO_EXERCISES.map(e => html('button', {
          key: e.id,
          className: 'prueba-card',
          style: { marginBottom: 10, opacity: 1 },
          onClick: () => setCurrent(e.id),
        },
          html('div', { className: 'prueba-icon', style: { fontFamily: 'Noto Serif SC, serif', fontSize: e.id === 'hanzi' ? 22 : 20, background: done.has(e.id) ? 'var(--jade-light)' : 'var(--paper)' } }, e.icon),
          html('div', { style: { flex: 1 } },
            html('div', { className: 'mode-title' }, e.label),
            html('div', { className: 'mode-sub' }, e.sub),
          ),
          done.has(e.id) && html('div', { style: { fontSize: 20, color: 'var(--jade)' } }, '✓'),
        )),
      ),
    )
  );
}

// ----------------- Admin panel -----------------
function parseVocabText(text) {
  // Expects lines like: 5 | 餐厅 | cāntīng | comedor
  // or tab-separated, grouped by "Lección N" headers
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result = {};
  let currentLesson = null;
  for (const line of lines) {
    const lessonMatch = line.match(/lecci[oó]n\s+(\d+)/i);
    if (lessonMatch) {
      currentLesson = lessonMatch[1];
      if (!result[currentLesson]) result[currentLesson] = [];
      continue;
    }
    const parts = line.split(/\t|\|/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      let lesson = currentLesson;
      let hanzi, pinyin, es;
      if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
        lesson = parts[0];
        [hanzi, pinyin, es] = [parts[1], parts[2], parts[3]];
      } else {
        [hanzi, pinyin, es] = [parts[0], parts[1], parts[2]];
      }
      if (!lesson) lesson = '1';
      if (!result[lesson]) result[lesson] = [];
      if (hanzi && pinyin && es && hanzi !== 'Carácter') {
        result[lesson].push({ hanzi, pinyin, es });
      }
    }
  }
  return result;
}

// Helper: convierte filas de Supabase al formato { "5": [{hanzi,pinyin,es},...], ... }
// Normaliza strings NFD→NFC para que las tildes del pinyin se muestren correctas
function nfc(s) { return s ? s.normalize('NFC') : s; }

function supabaseRowsToVocab(rows) {
  const vocab = {};
  rows.forEach(r => {
    if (!vocab[r.lesson]) vocab[r.lesson] = [];
    vocab[r.lesson].push({ hanzi: nfc(r.hanzi), pinyin: nfc(r.pinyin), es: nfc(r.es) });
  });
  return vocab;
}

// ═══════════════════════════════════════════════════════════
// SIMULACRO DE EXAMEN — Nivel III, Lecciones 9-11 (admin only)
// ═══════════════════════════════════════════════════════════
const EXAM_EJ1A = [
  { hanzi: '蛋糕', pinyin: 'dàngāo', es: 'pastel' },
  { hanzi: '便宜', pinyin: 'piányi', es: 'barato' },
  { hanzi: '英语', pinyin: 'Yīngyǔ', es: 'inglés' },
  { hanzi: '睡觉', pinyin: 'shuìjiào', es: 'dormir' },
  { hanzi: '一刻', pinyin: 'kè', es: 'cuarto (de hora)' },
];
const EXAM_EJ1B_LEFT  = ['买', '差', '祝你', '我晚上', '他今年', '一张'];
const EXAM_EJ1B_RIGHT = ['生日快乐', '在家看书', '一斤苹果', '音乐光盘', '二十二岁', '五分十点'];
// correcto: LEFT[i] → RIGHT[ EXAM_EJ1B_ANS[i] ]
const EXAM_EJ1B_ANS   = [2, 5, 0, 1, 4, 3];

const EXAM_EJ2 = [
  { q: '苹果多少钱一 ______？', opts: ['A 斤', 'B 个', 'C 瓶'], ans: 0 },
  { q: '我 ______ 林娜去买生日蛋糕。', opts: ['A 都', 'B 跟', 'C 很'], ans: 1 },
  { q: '这个星期天是我的 ______。', opts: ['A 聚会', 'B 快乐', 'C 生日'], ans: 2 },
  { q: '我们早上八点 ______ 上课。', opts: ['A 分', 'B 半', 'C 差'], ans: 1 },
  { q: '你的手机号码是 ______？', opts: ['A 多大', 'B 几', 'C 多少'], ans: 2 },
  { q: '您 ______？', opts: ['A 怎么卖', 'B 贵姓', 'C 多少钱'], ans: 1 },
];

const EXAM_EJ3 = [
  { words: ['去','下午','书店','星期一','我'], correct: '星期一下午我去书店', es: 'El lunes por la tarde voy a la librería.' },
  { words: ['买','音乐光盘','你','几张','要'], correct: '你要买几张音乐光盘', es: '¿Cuántos CDs de música querés comprar?' },
  { words: ['我们','见面','点','晚上','差一刻','七'], correct: '我们晚上差一刻七点见面', es: 'Nos encontramos a las siete menos cuarto de la noche.' },
  { words: ['朋友','她','常常','玩儿','去','家'], correct: '她常常去朋友家玩儿', es: 'Ella a menudo va a la casa de su amigo a pasarla bien.' },
  { words: ['是','号码','多少','你的','手机'], correct: '你的手机号码是多少', es: '¿Cuál es tu número de celular?' },
];

const EXAM_EJ4_PARTES = [
  { t: '今天是星期六。大卫晚上有一个生日聚会。上午他' },
  { blank: 0, ans: '跟' },
  { t: '宋华去商场买东西。商场的苹果很便宜，他买了两斤。他' },
  { blank: 1, ans: '还' },
  { t: '买了三个面包。大卫问宋华："你晚上' },
  { blank: 2, ans: '怎么' },
  { t: '去聚会？"宋华说："我打的(dǎdī)去。"晚上七点' },
  { blank: 3, ans: '半' },
  { t: '，他们' },
  { blank: 4, ans: '在' },
  { t: '朋友家一起吃生日蛋糕，听中国音乐。' },
];
const EXAM_EJ4_BANCO = ['在', '半', '跟', '还', '怎么'];

const EXAM_EJ4B = [
  { s: '今天是星期天。', ans: false, exp: '→ 今天是星期六' },
  { s: '大卫买了三斤苹果。', ans: false, exp: '→ 买了两斤' },
  { s: '宋华晚上打的去聚会。', ans: true, exp: '✓ Correcto' },
  { s: '聚会晚上七点半开始。', ans: true, exp: '✓ Correcto' },
  { s: '他们在商场吃蛋糕。', ans: false, exp: '→ 在朋友家吃蛋糕' },
];

const EXAM_EJ5A = [
  { q: '马大为早上 ______ 起床。', opts: ['A 七点', 'B 八点', 'C 九点'], ans: 1 },
  { q: '他下午 ______ 下课。', opts: ['A 差一刻两点', 'B 两点', 'C 两点半'], ans: 0 },
  { q: '晚上他在家 ______。', opts: ['A 听音乐', 'B 睡觉', 'C 看书'], ans: 2 },
  { q: '马大为 ______ 吃早饭。', opts: ['A 7:00', 'B 7:30', 'C 8:00'], ans: 1 },
  { q: '他几点睡觉？', opts: ['A 十点', 'B 十点半', 'C 十一点'], ans: 2 },
];

const EXAM_EJ5B = [
  { s: '马大为每天早上八点起床。', ans: false, exp: '→ 七点起床' },
  { s: '他在学院上课。', ans: false, exp: '→ No se menciona en el texto' },
  { s: '晚上他去朋友家。', ans: false, exp: '→ Está en casa leyendo' },
  { s: '差一刻两点是1:45。', ans: true, exp: '✓ Correcto' },
  { s: '他十一点去睡觉。', ans: true, exp: '✓ Correcto' },
];

// ── Diálogos para práctica oral ──
const DIALOGOS_PRACTICA = {
  reunion: {
    titulo: '朋友们去买东西 — Amigos que van de compras',
    roles: ['朋友A (David)', '朋友B (Lin)'],
    turns: [
      { quien: 0, texto: '喂，你好，林娜！这个星期六你有没有时间？', pinyin: 'Wèi, nǐ hǎo, Línnà! Zhège xīngqīliù nǐ yǒu méiyou shíjiān?', es: '¡Hola Lin! ¿Tenés tiempo este sábado?' },
      { quien: 1, texto: '有！你想做什么？', pinyin: 'Yǒu! Nǐ xiǎng zuò shénme?', es: '¡Sí! ¿Qué tenés en mente?' },
      { quien: 0, texto: '我们一起去商场买东西，怎么样？', pinyin: 'Wǒmen yīqǐ qù shāngchǎng mǎi dōngxi, zěnmeyàng?', es: '¿Vamos juntos al shopping a comprar cosas?' },
      { quien: 1, texto: '好主意！几点见面？在哪儿见？', pinyin: 'Hǎo zhǔyi! Jǐ diǎn jiànmiàn? Zài nǎr jiàn?', es: '¡Buena idea! ¿A qué hora y dónde nos encontramos?' },
      { quien: 0, texto: '上午十点，在学院门口，好吗？', pinyin: 'Shàngwǔ shí diǎn, zài xuéyuàn ménkǒu, hǎo ma?', es: 'A las diez de la mañana, en la entrada del instituto, ¿te parece?' },
      { quien: 1, texto: '好的，没问题！那你想买什么？', pinyin: 'Hǎo de, méi wèntí! Nà nǐ xiǎng mǎi shénme?', es: '¡Perfecto, sin problema! ¿Y qué querés comprar?' },
      { quien: 0, texto: '我想买一张音乐光盘，还想买一点儿水果。你呢？', pinyin: 'Wǒ xiǎng mǎi yī zhāng yīnyuè guāngpán, hái xiǎng mǎi yīdiǎnr shuǐguǒ. Nǐ ne?', es: 'Quiero comprar un CD de música y también un poco de fruta. ¿Y vos?' },
      { quien: 1, texto: '我想买苹果和蛋糕，是我朋友的生日！', pinyin: 'Wǒ xiǎng mǎi píngguǒ hé dàngāo, shì wǒ péngyou de shēngrì!', es: '¡Quiero comprar manzanas y una torta, es el cumpleaños de mi amigo!' },
      { quien: 0, texto: '太好了！祝你朋友生日快乐！星期六见！', pinyin: 'Tài hǎo le! Zhù nǐ péngyou shēngrì kuàilè! Xīngqīliù jiàn!', es: '¡Qué bueno! ¡Feliz cumpleaños a tu amigo! ¡Nos vemos el sábado!' },
      { quien: 1, texto: '好，再见！', pinyin: 'Hǎo, zàijiàn!', es: '¡Hasta el sábado!' },
    ]
  },
  compras: {
    titulo: '在商场买东西 — En el shopping (compra + regateo)',
    roles: ['老板 (vendedor)', 'Cliente'],
    turns: [
      { quien: 1, texto: '你好！这张光盘多少钱？', pinyin: 'Nǐ hǎo! Zhè zhāng guāngpán duōshao qián?', es: '¡Hola! ¿Cuánto cuesta este CD?' },
      { quien: 0, texto: '十五块钱。', pinyin: 'Shíwǔ kuài qián.', es: 'Quince yuan.' },
      { quien: 1, texto: '太贵了！便宜一点儿，好吗？', pinyin: 'Tài guì le! Piányi yīdiǎnr, hǎo ma?', es: '¡Es muy caro! ¿Un poco más barato, por favor?' },
      { quien: 0, texto: '好，十二块钱，怎么样？', pinyin: 'Hǎo, shíèr kuài qián, zěnmeyàng?', es: 'Bueno, doce yuan, ¿qué te parece?' },
      { quien: 1, texto: '好的，我买。苹果多少钱一斤？', pinyin: 'Hǎo de, wǒ mǎi. Píngguǒ duōshao qián yī jīn?', es: 'Bien, lo compro. ¿A cuánto está el medio kilo de manzanas?' },
      { quien: 0, texto: '三块钱一斤。你要几斤？', pinyin: 'Sān kuài qián yī jīn. Nǐ yào jǐ jīn?', es: 'Tres yuan el medio kilo. ¿Cuántos jin querés?' },
      { quien: 1, texto: '我要两斤。一共多少钱？', pinyin: 'Wǒ yào liǎng jīn. Yīgòng duōshao qián?', es: 'Quiero dos jin. ¿Cuánto es en total?' },
      { quien: 0, texto: '光盘十二块，苹果六块，一共十八块钱。', pinyin: 'Guāngpán shíèr kuài, píngguǒ liù kuài, yīgòng shíbā kuài qián.', es: 'El CD doce yuan, las manzanas seis yuan, en total dieciocho yuan.' },
      { quien: 1, texto: '给你二十块钱。', pinyin: 'Gěi nǐ èrshí kuài qián.', es: 'Aquí tiene veinte yuan.' },
      { quien: 0, texto: '找你两块钱。谢谢，再见！', pinyin: 'Zhǎo nǐ liǎng kuài qián. Xièxie, zàijiàn!', es: 'Le devuelvo dos yuan. ¡Gracias, hasta luego!' },
      { quien: 1, texto: '谢谢！再见！', pinyin: 'Xièxie! Zàijiàn!', es: '¡Gracias! ¡Hasta luego!' },
    ]
  },
  vendedor: {
    titulo: 'Vendedor y cliente — frutas / CDs',
    roles: ['老板 (vendedor)', 'Cliente'],
    turns: [
      { quien: 1, texto: '你好！老板，苹果多少钱一斤？', pinyin: 'Nǐ hǎo! Lǎobǎn, píngguǒ duōshao qián yī jīn?', es: '¡Hola! ¿A cuánto está el medio kilo de manzanas?' },
      { quien: 0, texto: '你好！苹果三块二毛一斤。', pinyin: 'Nǐ hǎo! Píngguǒ sān kuài èr máo yī jīn.', es: '¡Hola! Las manzanas son 3,20 yuan el medio kilo (500g).' },
      { quien: 1, texto: '太贵了！便宜一点儿，好吗？', pinyin: 'Tài guì le! Piányi yīdiǎnr, hǎo ma?', es: '¡Demasiado caro! ¿Un poco más barato, por favor?' },
      { quien: 0, texto: '好，三块钱一斤。你要几斤？', pinyin: 'Hǎo, sān kuài qián yī jīn. Nǐ yào jǐ jīn?', es: 'Bueno, 3 yuan el medio kilo. ¿Cuántos jin querés?' },
      { quien: 1, texto: '我要两斤。一共多少钱？', pinyin: 'Wǒ yào liǎng jīn. Yīgòng duōshao qián?', es: 'Quiero dos jin (1kg). ¿Cuánto es en total?' },
      { quien: 0, texto: '一共六块钱。', pinyin: 'Yīgòng liù kuài qián.', es: 'En total son 6 yuan.' },
      { quien: 1, texto: '给你十块钱。', pinyin: 'Gěi nǐ shí kuài qián.', es: 'Aquí tiene diez yuan.' },
      { quien: 0, texto: '找你四块钱。谢谢！', pinyin: 'Zhǎo nǐ sì kuài qián. Xièxie!', es: 'Le devuelvo cuatro yuan. ¡Gracias!' },
      { quien: 1, texto: '谢谢，再见！', pinyin: 'Xièxie, zàijiàn!', es: '¡Gracias, hasta luego!' },
      { quien: 0, texto: '再见！', pinyin: 'Zàijiàn!', es: '¡Hasta luego!' },
    ]
  },
  amigos: {
    titulo: 'Dos amigos — acordar una actividad',
    roles: ['朋友A', '朋友B'],
    turns: [
      { quien: 0, texto: '喂，你好！这个星期六晚上你有没有时间？', pinyin: 'Wèi, nǐ hǎo! Zhège xīngqīliù wǎnshang nǐ yǒu méiyou shíjiān?', es: '¡Hola! ¿Tenés tiempo el sábado por la noche?' },
      { quien: 1, texto: '对不起，星期六晚上我去看京剧。星期三晚上怎么样？', pinyin: 'Duìbuqǐ, xīngqīliù wǎnshang wǒ qù kàn jīngjù. Xīngqīsān wǎnshang zěnmeyàng?', es: 'Lo siento, el sábado por la noche voy a ver ópera de Pekín. ¿Qué tal el miércoles por la noche?' },
      { quien: 0, texto: '星期三晚上可以。我们去游泳，好吗？', pinyin: 'Xīngqīsān wǎnshang kěyǐ. Wǒmen qù yóuyǒng, hǎo ma?', es: 'El miércoles por la noche está bien. ¿Vamos a nadar?' },
      { quien: 1, texto: '好主意！几点见面？', pinyin: 'Hǎo zhǔyi! Jǐ diǎn jiànmiàn?', es: '¡Buena idea! ¿A qué hora nos encontramos?' },
      { quien: 0, texto: '晚上七点，在学院门口，怎么样？', pinyin: 'Wǎnshang qī diǎn, zài xuéyuàn ménkǒu, zěnmeyàng?', es: 'A las siete de la noche, en la entrada del instituto. ¿Te parece?' },
      { quien: 1, texto: '好的，没问题！星期三晚上七点见！', pinyin: 'Hǎo de, méi wèntí! Xīngqīsān wǎnshang qī diǎn jiàn!', es: '¡Perfecto, sin problema! ¡Nos vemos el miércoles a las siete!' },
      { quien: 0, texto: '好，再见！', pinyin: 'Hǎo, zàijiàn!', es: '¡Genial, hasta luego!' },
      { quien: 1, texto: '再见！', pinyin: 'Zàijiàn!', es: '¡Hasta luego!' },
    ]
  },
};

const DIAL_AVATARES = {
  reunion: [
    { emoji: '🧑', nombre: 'David', color: '#E8EAF6', acento: '#3949ab' },
    { emoji: '👩', nombre: 'Lin', color: '#FCE4EC', acento: '#c2185b' },
  ],
  compras: [
    { emoji: '🧑‍💼', nombre: '老板', color: '#FFF3E0', acento: '#e65100' },
    { emoji: '🙋', nombre: 'Cliente', color: '#E3F2FD', acento: '#1565c0' },
  ],
  vendedor: [
    { emoji: '🧑‍💼', nombre: '老板', color: '#FFF3E0', acento: '#e65100' },
    { emoji: '🙋', nombre: 'Cliente', color: '#E3F2FD', acento: '#1565c0' },
  ],
  amigos: [
    { emoji: '🧑', nombre: '朋友A', color: '#F3E5F5', acento: '#6a1b9a' },
    { emoji: '👩', nombre: '朋友B', color: '#E8F5E9', acento: '#2e7d32' },
  ],
};

function hablarChino(texto) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'zh-CN';
  u.rate = 0.85;
  // Intentar usar voz china si existe
  const voces = window.speechSynthesis.getVoices();
  const vozCh = voces.find(v => v.lang.startsWith('zh'));
  if (vozCh) u.voice = vozCh;
  window.speechSynthesis.speak(u);
}

function AvatarBurbuja({ avatar, nombre, texto, pinyin, es, miTurno, mostrarResp, onMostrar, onSiguiente, onAudio, esUltimo }) {
  const bg = miTurno ? '#EEF2FF' : avatar.color;
  const borde = miTurno ? '#6366f1' : avatar.acento;
  const textColor = miTurno ? '#4338ca' : avatar.acento;
  return html('div', { style: { marginBottom: 16 } },
    // Fila con avatar + burbuja
    html('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: miTurno ? 'row-reverse' : 'row' } },
      // Avatar
      html('div', { style: {
        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
        background: avatar.color, border: '2px solid ' + avatar.acento,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, lineHeight: 1,
      }},
        avatar.emoji,
        html('div', { style: { fontSize: 8, fontWeight: 800, color: avatar.acento, fontFamily: "'Nunito',sans-serif", marginTop: 1 } }, avatar.nombre),
      ),
      // Burbuja
      html('div', { style: {
        flex: 1, background: bg, borderRadius: miTurno ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        padding: '14px 16px', border: '2px solid ' + borde,
      }},
        html('div', { style: { fontSize: 11, fontWeight: 700, color: textColor, marginBottom: 8 } },
          miTurno ? '🎤 Tu turno — ' + nombre : nombre + ' dice:',
        ),
        miTurno && !mostrarResp
          ? html('div', { style: { color: '#6366f1', fontSize: 14, fontStyle: 'italic' } }, 'Pensá tu respuesta en voz alta…')
          : html('div', null,
              html('div', { className: 'hanzi-font', style: { fontSize: 22, color: textColor, lineHeight: 1.4, marginBottom: 6 } }, texto),
              html('div', { style: { fontSize: 13, color: 'var(--ink-mid)', fontWeight: 600, marginBottom: 3 } }, pinyin),
              html('div', { style: { fontSize: 12, color: 'var(--ink-soft)' } }, es),
              // Botón audio
              !miTurno && html('button', {
                onClick: () => hablarChino(texto),
                style: { marginTop: 8, background: 'none', border: '1.5px solid ' + avatar.acento, borderRadius: 8, padding: '3px 10px', fontSize: 13, color: avatar.acento, cursor: 'pointer', fontWeight: 700 },
              }, '🔊 Escuchar'),
            ),
      ),
    ),
    // Botones de acción
    html('div', { style: { marginTop: 10 } },
      miTurno
        ? !mostrarResp
          ? html('button', {
              className: 'secondary-btn', style: { width: '100%', borderColor: '#6366f1', color: '#4338ca' },
              onClick: onMostrar,
            }, '💡 Ver respuesta sugerida')
          : html('button', { className: 'primary-btn', style: { width: '100%' }, onClick: onSiguiente },
              esUltimo ? '🔁 Repetir diálogo' : 'Siguiente →')
        : html('button', { className: 'primary-btn', style: { width: '100%' }, onClick: onSiguiente },
            esUltimo ? '🔁 Repetir diálogo' : 'Mi turno →'),
    ),
  );
}

function DialogoPractica({ onBack }) {
  const [escenario, setEscenario] = useState(null);
  const [miRol, setMiRol] = useState(null);
  const [turno, setTurno] = useState(0);
  const [mostrarResp, setMostrarResp] = useState(false);
  const [dialogosDB, setDialogosDB] = useState(null); // null=cargando

  useEffect(() => {
    Promise.all([
      db.from('exam_dialogues').select('*').order('sort_order'),
      db.from('dialogue_turns').select('*').order('dialogue_key,turn_order'),
    ]).then(([dialRes, turnsRes]) => {
      if (dialRes.data && dialRes.data.length > 0) {
        const result = {};
        dialRes.data.forEach(d => {
          result[d.key] = {
            titulo: nfc(d.titulo),
            roles: (d.roles || []).map(nfc),
            turns: (turnsRes.data || [])
              .filter(t => t.dialogue_key === d.key)
              .map(t => ({ quien: t.quien, texto: nfc(t.texto), pinyin: nfc(t.pinyin), es: nfc(t.es) })),
          };
        });
        setDialogosDB(result);
      } else {
        setDialogosDB(DIALOGOS_PRACTICA);
      }
    }).catch(() => setDialogosDB(DIALOGOS_PRACTICA));
  }, []);

  // Hook debe estar antes de cualquier return condicional
  useEffect(() => {
    if (escenario === null || miRol === null || !dialogosDB) return;
    const dial = (dialogosDB || DIALOGOS_PRACTICA)[escenario];
    if (!dial) return;
    const turnoActual = dial.turns[turno];
    if (turnoActual && turnoActual.quien !== miRol) hablarChino(turnoActual.texto);
  }, [turno, escenario, miRol, dialogosDB]);

  if (dialogosDB === null) return html('div', { className: 'app-loader' },
    html('div', { className: 'app-loader-hanzi' }, '说'),
    html('div', { className: 'app-loader-dots' }, html('span'), html('span'), html('span')),
    html('div', { className: 'app-loader-msg' }, 'Preparando los diálogos…'),
  );

  if (!escenario) return html('div', { style: { padding: '20px 16px', maxWidth: 480, margin: '0 auto' } },
    html('div', { className: 'header-row' },
      html('button', { className: 'back-btn', onClick: onBack }, '←'),
      html('h1', null, '🎙️ Práctica oral'),
    ),
    html('p', { style: { color: 'var(--ink-soft)', fontSize: 14, marginBottom: 20 } }, 'Elegí el escenario que querés practicar:'),
    // ── Diálogos nuevos para el oral ──
    html('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--lacquer)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 } }, '⭐ Para el examen oral'),
    html('button', { className: 'mode-card', style: { width: '100%', marginBottom: 10, borderColor: 'var(--lacquer)', borderWidth: 2 }, onClick: () => setEscenario('reunion') },
      html('div', { className: 'mode-emoji', style: { background: '#E8EAF6', fontSize: 24 } }, '📞'),
      html('div', null,
        html('div', { className: 'mode-title' }, '朋友们去买东西 — Acordar salida + compras'),
        html('div', { className: 'mode-sub' }, 'Llamada entre amigos: día, hora, lugar y qué comprar'),
      )
    ),
    html('button', { className: 'mode-card', style: { width: '100%', marginBottom: 16, borderColor: 'var(--lacquer)', borderWidth: 2 }, onClick: () => setEscenario('compras') },
      html('div', { className: 'mode-emoji', style: { background: '#FFF3E0', fontSize: 24 } }, '🛒'),
      html('div', null,
        html('div', { className: 'mode-title' }, '在商场买东西 — En el shopping (CD + frutas)'),
        html('div', { className: 'mode-sub' }, 'Preguntar precio, regatear, pagar y recibir vuelto'),
      )
    ),
    // ── Diálogos originales ──
    html('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 } }, 'Práctica adicional'),
    html('button', { className: 'mode-card', style: { width: '100%', marginBottom: 10 }, onClick: () => setEscenario('vendedor') },
      html('div', { className: 'mode-emoji', style: { background: '#FFF3E0', fontSize: 24 } }, '🛍️'),
      html('div', null,
        html('div', { className: 'mode-title' }, 'Opción B — Vendedor / Cliente (frutas)'),
        html('div', { className: 'mode-sub' }, 'Frutas, precio, cantidad y vuelto'),
      )
    ),
    html('button', { className: 'mode-card', style: { width: '100%' }, onClick: () => setEscenario('amigos') },
      html('div', { className: 'mode-emoji', style: { background: '#E8F5E9', fontSize: 24 } }, '📅'),
      html('div', null,
        html('div', { className: 'mode-title' }, 'Opción A — Acordar una actividad'),
        html('div', { className: 'mode-sub' }, 'Dos amigos, horarios y plan semanal'),
      )
    ),
  );

  const dial = (dialogosDB || DIALOGOS_PRACTICA)[escenario] || DIALOGOS_PRACTICA[escenario];
  const avatares = DIAL_AVATARES[escenario];

  if (miRol === null) return html('div', { style: { padding: '20px 16px', maxWidth: 480, margin: '0 auto' } },
    html('div', { className: 'header-row' },
      html('button', { className: 'back-btn', onClick: () => setEscenario(null) }, '←'),
      html('h1', null, dial.titulo),
    ),
    html('p', { style: { color: 'var(--ink-soft)', fontSize: 14, marginBottom: 20 } }, '¿Qué rol querés practicar?'),
    dial.roles.map((rol, i) => {
      const av = avatares[i];
      return html('button', { key: i,
        className: 'mode-card', style: { width: '100%', marginBottom: 12 },
        onClick: () => { setMiRol(i); setTurno(0); setMostrarResp(false); },
      },
        html('div', { style: {
          width: 44, height: 44, borderRadius: '50%', background: av.color,
          border: '2px solid ' + av.acento, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22, flexShrink: 0,
        }}, av.emoji),
        html('div', null,
          html('div', { className: 'mode-title' }, rol),
          html('div', { className: 'mode-sub' }, 'La app hace de ' + dial.roles[1 - i]),
        )
      );
    }),
  );

  const turnoActual = dial.turns[turno];
  const esAppTurn = turnoActual.quien !== miRol;
  const esUltimo = turno >= dial.turns.length - 1;
  const avatarHablante = avatares[turnoActual.quien];

  const siguiente = () => {
    window.speechSynthesis && window.speechSynthesis.cancel();
    if (esUltimo) { setTurno(0); setMostrarResp(false); }
    else { setTurno(t => t + 1); setMostrarResp(false); }
  };

  return html('main', { style: { paddingTop: 16, paddingBottom: 40 } },
    html('div', { style: { padding: '0 16px', maxWidth: 500, margin: '0 auto' } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: () => { window.speechSynthesis && window.speechSynthesis.cancel(); setMiRol(null); } }, '←'),
        html('h1', { style: { fontSize: 16 } }, dial.titulo),
      ),
      // Progreso
      html('div', { style: { display: 'flex', gap: 4, marginBottom: 16 } },
        dial.turns.map((t, i) =>
          html('div', { key: i, style: {
            flex: 1, height: 5, borderRadius: 3,
            background: i < turno ? 'var(--jade-dark)' : i === turno ? 'var(--lacquer)' : 'var(--paper-deep)',
          }})
        )
      ),
      // Mini avatares de rol
      html('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '8px 12px', background: 'var(--paper-deep)', borderRadius: 10 } },
        html('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: avatares[miRol].acento } },
          html('span', { style: { fontSize: 18 } }, avatares[miRol].emoji),
          'Vos: ' + dial.roles[miRol],
        ),
        html('div', { style: { fontSize: 11, color: 'var(--ink-soft)' } }, turno + 1 + ' / ' + dial.turns.length),
        html('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: avatares[1-miRol].acento } },
          'App: ' + dial.roles[1 - miRol],
          html('span', { style: { fontSize: 18 } }, avatares[1-miRol].emoji),
        ),
      ),
      html(AvatarBurbuja, {
        avatar: avatarHablante,
        nombre: dial.roles[turnoActual.quien],
        texto: turnoActual.texto,
        pinyin: turnoActual.pinyin,
        es: turnoActual.es,
        miTurno: !esAppTurn,
        mostrarResp,
        onMostrar: () => setMostrarResp(true),
        onSiguiente: siguiente,
        onAudio: () => hablarChino(turnoActual.texto),
        esUltimo,
      }),
    )
  );
}

const EXAM_ORAL_PREGUNTAS = [
  '你今年多大？','星期日是几号？','你哪年出生？你属什么？','今天是几月几号？',
  '你什么时候生日？','明天上午你有没有课？','一斤苹果多少钱？',
  '星期天你常常去哪儿？','请问，现在几点？','我们几点上课？','你为什么不能来上课？',
];

const EXAM_HORARIO_ROWS = [
  { time: '上午', mon: '汉语课', tue: '文化课', wed: '汉语课', thu: '', fri: '汉语课', sat: '看朋友', sun: '' },
  { time: '下午', mon: '', tue: '汉语课', wed: '', thu: '汉语课', fri: '打球 dǎ qiú', sat: '', sun: '生日聚会' },
  { time: '晚上\nwǎnshang', mon: '朋友来', tue: '', wed: '游泳\nyóuyǒng', thu: '', fri: '', sat: '看京剧\njīngjù', sun: '' },
];

function SimMC({ items, ptsCada, title, answers, setAnswers }) {
  return html('div', { className: 'sim-section' },
    html('h3', { className: 'sim-sec-title' }, title),
    items.map((item, i) =>
      html('div', { key: i, className: 'sim-q-block' },
        html('div', { className: 'sim-q-text hanzi-font' }, (i+1) + '. ' + item.q),
        html('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 } },
          item.opts.map((opt, j) =>
            html('button', {
              key: j,
              className: 'sim-opt-btn' + (answers[i] === j ? ' selected' : ''),
              onClick: () => setAnswers({ ...answers, [i]: j }),
            }, opt)
          )
        )
      )
    )
  );
}

function SimVF({ items, ptsCada, title, answers, setAnswers }) {
  return html('div', { className: 'sim-section' },
    html('h3', { className: 'sim-sec-title' }, title),
    items.map((item, i) =>
      html('div', { key: i, className: 'sim-q-block' },
        html('div', { className: 'sim-q-text hanzi-font' }, (i+1) + '. ' + item.s),
        html('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
          html('button', {
            className: 'sim-opt-btn vf' + (answers[i] === true ? ' selected ok' : ''),
            onClick: () => setAnswers({ ...answers, [i]: true }),
          }, '✓ Verdadero'),
          html('button', {
            className: 'sim-opt-btn vf' + (answers[i] === false ? ' selected err' : ''),
            onClick: () => setAnswers({ ...answers, [i]: false }),
          }, '✗ Falso'),
        )
      )
    )
  );
}

function SimOrdenar({ items, answers, setAnswers }) {
  return html('div', { className: 'sim-section' },
    html('h3', { className: 'sim-sec-title' }, '练习三 · Ordenar las palabras (4 pts c/u · 20 pts)'),
    items.map((item, qi) => {
      const chosen = answers[qi] || [];
      const available = item.words.map((w, i) => ({ w, i }))
        .filter(x => !chosen.find(c => c.i === x.i));
      const tapAvail = (it) => setAnswers({ ...answers, [qi]: [...chosen, it] });
      const tapChosen = (it) => setAnswers({ ...answers, [qi]: chosen.filter(c => c.i !== it.i) });
      return html('div', { key: qi, className: 'sim-q-block' },
        html('div', { className: 'sim-q-text', style: { fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 } }, (qi+1) + '. Ordená las palabras:'),
        html('div', {
          style: {
            minHeight: 48, background: 'var(--paper-deep)', borderRadius: 10,
            padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8,
            border: '2px dashed var(--paper-mid, #ddd)',
          }
        },
          chosen.length === 0
            ? html('span', { style: { color: 'var(--ink-soft)', fontSize: 13, alignSelf: 'center' } }, 'Tocá las palabras de abajo →')
            : chosen.map(it => html('button', { key: it.i, className: 'word-chip placed', onClick: () => tapChosen(it) }, it.w))
        ),
        html('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
          available.map(it => html('button', { key: it.i, className: 'word-chip', onClick: () => tapAvail(it) }, it.w))
        ),
        chosen.length > 0 && html('button', {
          style: { marginTop: 6, fontSize: 11, color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
          onClick: () => setAnswers({ ...answers, [qi]: [] }),
        }, '↺ Limpiar'),
      );
    })
  );
}

function SimRellenar({ partes, banco, answers, setAnswers }) {
  const ej4Partes = partes || EXAM_EJ4_PARTES;
  const ej4Banco  = banco  || EXAM_EJ4_BANCO;
  const total = ej4Banco.length;
  const bancoUsado = (answers || []).filter(Boolean);
  const disponible = ej4Banco.filter(w => !bancoUsado.includes(w));
  const fillNext = (word) => {
    const newAns = [...(answers || Array(total).fill(null))];
    const idx = newAns.findIndex(v => v === null || v === undefined);
    if (idx !== -1) { newAns[idx] = word; setAnswers([...newAns]); }
  };
  const clearBlank = (blankIdx) => {
    const newAns = [...(answers || Array(total).fill(null))];
    newAns[blankIdx] = null;
    setAnswers([...newAns]);
  };
  const ans = answers || Array(total).fill(null);
  return html('div', { className: 'sim-section' },
    html('h3', { className: 'sim-sec-title' }, '练习四A · Completar el texto (2 pts c/u · 10 pts)'),
    html('p', { style: { fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 } }, 'Banco de palabras: Tocá una palabra del banco para rellenar el próximo hueco. Tocá un hueco para liberar esa palabra.'),
    html('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
      ej4Banco.map(w =>
        html('button', {
          key: w,
          className: 'word-chip' + (disponible.includes(w) ? '' : ' placed'),
          style: { opacity: disponible.includes(w) ? 1 : 0.4, cursor: disponible.includes(w) ? 'pointer' : 'default' },
          onClick: () => disponible.includes(w) && fillNext(w),
        }, w)
      )
    ),
    html('div', { className: 'sim-q-text hanzi-font', style: { lineHeight: 2.2, fontSize: 18 } },
      ej4Partes.map((p, i) =>
        p.t
          ? html('span', { key: i }, p.t)
          : html('button', {
              key: i,
              onClick: () => ans[p.blank] && clearBlank(p.blank),
              style: {
                display: 'inline-block', minWidth: 60, padding: '2px 8px',
                background: ans[p.blank] ? 'var(--gold-light)' : 'transparent',
                border: '2px solid ' + (ans[p.blank] ? 'var(--gold)' : 'var(--lacquer)'),
                borderRadius: 6, cursor: ans[p.blank] ? 'pointer' : 'default',
                fontFamily: 'Nunito, sans-serif', fontSize: 15, fontWeight: 700,
                color: ans[p.blank] ? '#6b4c00' : 'var(--lacquer)',
                margin: '0 2px',
              }
            }, ans[p.blank] || '___')
      )
    )
  );
}

function SimConectar1A({ items, answers, setAnswers }) {
  const ej1a = items || EXAM_EJ1A;
  const [pinyins] = useState(() => shuffle([...ej1a.map(x => x.pinyin)]));
  const [meanings] = useState(() => shuffle([...ej1a.map(x => x.es)]));
  return html('div', { className: 'sim-section' },
    html('h3', { className: 'sim-sec-title' }, '练习一A · Conectar hanzi, pinyin y significado (2 pts c/u · 10 pts)'),
    html('p', { style: { fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 } }, 'Seleccioná el pinyin y el significado correcto para cada carácter.'),
    html('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 14 } },
      html('thead', null,
        html('tr', null,
          html('th', { style: simThStyle }, '汉字'),
          html('th', { style: simThStyle }, 'Pinyin'),
          html('th', { style: simThStyle }, 'Significado'),
        )
      ),
      html('tbody', null,
        ej1a.map((item, i) => {
          const cur = answers[i] || {};
          return html('tr', { key: i },
            html('td', { style: { ...simTdStyle, fontFamily: 'Noto Serif SC, serif', fontSize: 22, color: 'var(--lacquer)' } }, item.hanzi),
            html('td', { style: simTdStyle },
              html('select', {
                className: 'sim-select',
                value: cur.pinyin || '',
                onChange: e => setAnswers({ ...answers, [i]: { ...(answers[i]||{}), pinyin: e.target.value } }),
              },
                html('option', { value: '' }, '— elegí —'),
                pinyins.map(p => html('option', { key: p, value: p }, p))
              )
            ),
            html('td', { style: simTdStyle },
              html('select', {
                className: 'sim-select',
                value: cur.es || '',
                onChange: e => setAnswers({ ...answers, [i]: { ...(answers[i]||{}), es: e.target.value } }),
              },
                html('option', { value: '' }, '— elegí —'),
                meanings.map(m => html('option', { key: m, value: m }, m))
              )
            ),
          );
        })
      )
    )
  );
}

const simThStyle = { background: 'var(--paper-deep)', padding: '8px 10px', textAlign: 'left', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' };
const simTdStyle = { padding: '8px 10px', borderBottom: '1px solid var(--paper-deep)' };

function SimConectar1B({ left, right, answers, setAnswers }) {
  const ej1bLeft  = left  || EXAM_EJ1B_LEFT;
  const ej1bRight = right || EXAM_EJ1B_RIGHT;
  return html('div', { className: 'sim-section' },
    html('h3', { className: 'sim-sec-title' }, '练习一B · Completar frases (2 pts c/u · 12 pts)'),
    ej1bLeft.map((leftItem, i) =>
      html('div', { key: i, className: 'sim-q-block', style: { display: 'flex', alignItems: 'center', gap: 10 } },
        html('span', { style: { fontFamily: 'Noto Serif SC, serif', fontSize: 18, color: 'var(--lacquer)', minWidth: 80 } }, (i+1) + '. ' + leftItem),
        html('span', { style: { color: 'var(--ink-soft)' } }, '→'),
        html('select', {
          className: 'sim-select',
          value: answers[i] !== undefined ? answers[i] : '',
          onChange: e => setAnswers({ ...answers, [i]: parseInt(e.target.value) }),
        },
          html('option', { value: '' }, '— elegí —'),
          ej1bRight.map((r, j) => html('option', { key: j, value: j }, r))
        )
      )
    )
  );
}

function SimOral({ preguntas, horario, onPracticarDialogo }) {
  const oralPregs   = preguntas || EXAM_ORAL_PREGUNTAS;
  const horarioRows = horario   || EXAM_HORARIO_ROWS;
  const dias = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
  return html('div', { className: 'sim-section' },
    html('h3', { className: 'sim-sec-title' }, '🎙️ Examen Oral · Nivel III'),
    html('button', {
      onClick: onPracticarDialogo,
      style: {
        width: '100%', marginBottom: 16, padding: '14px',
        background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
        color: '#fff', border: 'none', borderRadius: 12,
        fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }
    }, '🎙️ Practicar diálogo interactivo →'),
    html('p', { style: { fontSize: 13, color: 'var(--ink-mid)', marginBottom: 16, lineHeight: 1.6 } },
      'El examen oral tiene dos partes. Practicá en voz alta.'
    ),
    html('div', { style: { background: 'var(--jade-light)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 } },
      html('div', { style: { fontWeight: 700, fontSize: 13, color: 'var(--jade-dark)', marginBottom: 8 } }, 'Opción A — Diálogo con planilla de horarios'),
      html('p', { style: { fontSize: 12, color: 'var(--ink-mid)', marginBottom: 10 } }, 'Dos amigos quieren acordar una actividad juntos según este horario:'),
      html('div', { style: { overflowX: 'auto' } },
        html('table', { style: { borderCollapse: 'collapse', fontSize: 12, width: '100%' } },
          html('thead', null,
            html('tr', null,
              html('th', { style: { ...simThStyle, minWidth: 70 } }, ''),
              dias.map(d => html('th', { key: d, style: simThStyle }, d))
            )
          ),
          html('tbody', null,
            horarioRows.map((row, i) =>
              html('tr', { key: i },
                html('td', { style: { ...simTdStyle, fontWeight: 700, fontSize: 11, whiteSpace: 'pre-line' } }, row.time),
                [row.mon, row.tue, row.wed, row.thu, row.fri, row.sat, row.sun].map((cell, j) =>
                  html('td', { key: j, style: { ...simTdStyle, fontSize: 12, textAlign: 'center', whiteSpace: 'pre-line', minWidth: 70 } }, cell || '')
                )
              )
            )
          )
        )
      )
    ),
    html('div', { style: { background: '#EEF2FF', borderRadius: 12, padding: '12px 14px', marginBottom: 16 } },
      html('div', { style: { fontWeight: 700, fontSize: 13, color: '#3730a3', marginBottom: 6 } }, 'Opción B — Diálogo vendedor / comprador'),
      html('p', { style: { fontSize: 12, color: 'var(--ink-mid)' } }, 'Diálogo sobre libros, CDs o frutas: preguntar precio y cantidad, pagar y dar el vuelto.'),
    ),
    html('div', { style: { marginTop: 16 } },
      html('div', { style: { fontWeight: 700, fontSize: 13, marginBottom: 8 } }, 'Parte 2 — Responder preguntas (2 por alumno)'),
      oralPregs.map((p, i) =>
        html('div', { key: i, className: 'sim-q-block', style: { display: 'flex', gap: 10, alignItems: 'flex-start' } },
          html('span', { style: { minWidth: 22, fontWeight: 700, color: 'var(--ink-soft)', fontSize: 13 } }, String.fromCharCode(96+i+1) + '.'),
          html('span', { className: 'hanzi-font', style: { fontSize: 17 } }, p),
        )
      )
    )
  );
}

function calcExamScore(ans) {
  let score = 0, max = 0;
  // EJ1A: 10 pts (2 cada uno)
  max += 10;
  const a1a = ans.ej1a || {};
  EXAM_EJ1A.forEach((item, i) => {
    const r = a1a[i] || {};
    if (r.pinyin === item.pinyin) score += 1;
    if (r.es === item.es) score += 1;
  });
  // EJ1B: 12 pts (2 cada uno)
  max += 12;
  const a1b = ans.ej1b || {};
  EXAM_EJ1B_ANS.forEach((correct, i) => {
    if (a1b[i] === correct) score += 2;
  });
  // EJ2: 18 pts (3 cada uno)
  max += 18;
  const a2 = ans.ej2 || {};
  EXAM_EJ2.forEach((item, i) => { if (a2[i] === item.ans) score += 3; });
  // EJ3: 20 pts (4 cada uno)
  max += 20;
  const a3 = ans.ej3 || {};
  EXAM_EJ3.forEach((item, qi) => {
    const chosen = (a3[qi] || []).map(c => c.w).join('');
    if (chosen === item.correct) score += 4;
  });
  // EJ4A: 10 pts (2 cada hueco)
  max += 10;
  const a4a = ans.ej4a || [];
  EXAM_EJ4_PARTES.filter(p => p.blank !== undefined).forEach((p, i) => {
    if (a4a[i] === p.ans) score += 2;
  });
  // EJ4B: 10 pts (2 cada uno)
  max += 10;
  const a4b = ans.ej4b || {};
  EXAM_EJ4B.forEach((item, i) => { if (a4b[i] === item.ans) score += 2; });
  // EJ5A: 10 pts (2 cada uno)
  max += 10;
  const a5a = ans.ej5a || {};
  EXAM_EJ5A.forEach((item, i) => { if (a5a[i] === item.ans) score += 2; });
  // EJ5B: 10 pts (2 cada uno)
  max += 10;
  const a5b = ans.ej5b || {};
  EXAM_EJ5B.forEach((item, i) => { if (a5b[i] === item.ans) score += 2; });
  return { score, max };
}

function ResDetailRow({ ok, label, tu, correcto, extra }) {
  return html('div', { style: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    padding: '8px 10px', borderRadius: 8, marginBottom: 4,
    background: ok ? '#f0faf5' : '#fff5f5',
    border: '1.5px solid ' + (ok ? 'var(--jade-dark)' : 'var(--lacquer)'),
  }},
    html('span', { style: { fontSize: 16, flexShrink: 0 } }, ok ? '✓' : '✗'),
    html('div', { style: { flex: 1 } },
      html('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--ink-dark)', fontFamily: 'Noto Serif SC, serif' } }, label),
      !ok && html('div', { style: { fontSize: 12, marginTop: 3 } },
        html('span', { style: { color: 'var(--lacquer)', fontWeight: 600 } }, 'Tu resp: '),
        html('span', { style: { fontFamily: 'Noto Serif SC, serif' } }, tu || '—'),
      ),
      !ok && html('div', { style: { fontSize: 12, marginTop: 2 } },
        html('span', { style: { color: 'var(--jade-dark)', fontWeight: 600 } }, 'Correcto: '),
        html('span', { style: { fontFamily: 'Noto Serif SC, serif' } }, correcto),
      ),
      extra && html('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 } }, extra),
    ),
  );
}

function ExamenResultados({ answers, onRetry, onBack }) {
  const [showDetail, setShowDetail] = useState(false);
  const { score, max } = calcExamScore(answers);
  const pct = Math.round((score / max) * 100);
  const nota = pct >= 60 ? (pct >= 80 ? '¡Excelente! 🎉' : 'Aprobado ✓') : 'A seguir practicando 📚';
  const color = pct >= 60 ? (pct >= 80 ? 'var(--jade-dark)' : '#1d6aa5') : 'var(--lacquer)';

  const secciones = [
    { label: '练习一A · Conectar 3 columnas', pts: (() => { let s=0; const a=answers.ej1a||{}; EXAM_EJ1A.forEach((item,i)=>{ const r=a[i]||{}; if(r.pinyin===item.pinyin)s+=1; if(r.es===item.es)s+=1; }); return s; })(), max: 10 },
    { label: '练习一B · Completar frases', pts: (() => { let s=0; const a=answers.ej1b||{}; EXAM_EJ1B_ANS.forEach((c,i)=>{ if(a[i]===c)s+=2; }); return s; })(), max: 12 },
    { label: '练习二 · Opción múltiple', pts: (() => { let s=0; const a=answers.ej2||{}; EXAM_EJ2.forEach((it,i)=>{ if(a[i]===it.ans)s+=3; }); return s; })(), max: 18 },
    { label: '练习三 · Ordenar palabras', pts: (() => { let s=0; const a=answers.ej3||{}; EXAM_EJ3.forEach((it,qi)=>{ if(((a[qi]||[]).map(c=>c.w).join(''))===it.correct)s+=4; }); return s; })(), max: 20 },
    { label: '练习四A · Completar texto', pts: (() => { let s=0; const a=answers.ej4a||[]; EXAM_EJ4_PARTES.filter(p=>p.blank!==undefined).forEach((p,i)=>{ if(a[i]===p.ans)s+=2; }); return s; })(), max: 10 },
    { label: '练习四B · Verdadero/Falso', pts: (() => { let s=0; const a=answers.ej4b||{}; EXAM_EJ4B.forEach((it,i)=>{ if(a[i]===it.ans)s+=2; }); return s; })(), max: 10 },
    { label: '练习五A · Escucha opciones', pts: (() => { let s=0; const a=answers.ej5a||{}; EXAM_EJ5A.forEach((it,i)=>{ if(a[i]===it.ans)s+=2; }); return s; })(), max: 10 },
    { label: '练习五B · Escucha V/F', pts: (() => { let s=0; const a=answers.ej5b||{}; EXAM_EJ5B.forEach((it,i)=>{ if(a[i]===it.ans)s+=2; }); return s; })(), max: 10 },
  ];

  const buildDetail = () => {
    const a1a = answers.ej1a || {}, a1b = answers.ej1b || {}, a2 = answers.ej2 || {};
    const a3 = answers.ej3 || {}, a4a = answers.ej4a || [], a4b = answers.ej4b || {};
    const a5a = answers.ej5a || {}, a5b = answers.ej5b || {};
    const blancos = EXAM_EJ4_PARTES.filter(p => p.blank !== undefined);
    return [
      // 1A
      html('div', { key: '1a', style: { marginBottom: 16 } },
        html('div', { className: 'sim-sec-title', style: { fontSize: 13 } }, '练习一A · Conectar'),
        EXAM_EJ1A.map((item, i) => {
          const r = a1a[i] || {};
          const okP = r.pinyin === item.pinyin, okE = r.es === item.es;
          return html(ResDetailRow, { key: i,
            ok: okP && okE,
            label: item.hanzi,
            tu: (!okP ? 'pinyin: ' + (r.pinyin||'—') : '') + (!okE ? ((!okP?' · ':'') + 'sig: ' + (r.es||'—')) : ''),
            correcto: item.pinyin + ' · ' + item.es,
          });
        })
      ),
      // 1B
      html('div', { key: '1b', style: { marginBottom: 16 } },
        html('div', { className: 'sim-sec-title', style: { fontSize: 13 } }, '练习一B · Completar frases'),
        EXAM_EJ1B_LEFT.map((left, i) => {
          const ok = a1b[i] === EXAM_EJ1B_ANS[i];
          return html(ResDetailRow, { key: i, ok,
            label: left + ' + …',
            tu: a1b[i] !== undefined ? EXAM_EJ1B_RIGHT[a1b[i]] : '—',
            correcto: EXAM_EJ1B_RIGHT[EXAM_EJ1B_ANS[i]],
          });
        })
      ),
      // 2
      html('div', { key: '2', style: { marginBottom: 16 } },
        html('div', { className: 'sim-sec-title', style: { fontSize: 13 } }, '练习二 · Opción múltiple'),
        EXAM_EJ2.map((item, i) => {
          const ok = a2[i] === item.ans;
          return html(ResDetailRow, { key: i, ok,
            label: item.q,
            tu: a2[i] !== undefined ? item.opts[a2[i]] : '—',
            correcto: item.opts[item.ans],
          });
        })
      ),
      // 3
      html('div', { key: '3', style: { marginBottom: 16 } },
        html('div', { className: 'sim-sec-title', style: { fontSize: 13 } }, '练习三 · Ordenar palabras'),
        EXAM_EJ3.map((item, qi) => {
          const chosen = (a3[qi] || []).map(c => c.w).join('');
          const ok = chosen === item.correct;
          return html(ResDetailRow, { key: qi, ok,
            label: item.words.join(' / '),
            tu: chosen || '—',
            correcto: item.correct,
            extra: item.es,
          });
        })
      ),
      // 4A
      html('div', { key: '4a', style: { marginBottom: 16 } },
        html('div', { className: 'sim-sec-title', style: { fontSize: 13 } }, '练习四A · Completar el texto'),
        blancos.map((p, i) => {
          const ok = a4a[i] === p.ans;
          return html(ResDetailRow, { key: i, ok,
            label: 'Hueco ' + (i+1) + ': «' + p.ans + '»',
            tu: a4a[i] || '—',
            correcto: p.ans,
          });
        })
      ),
      // 4B
      html('div', { key: '4b', style: { marginBottom: 16 } },
        html('div', { className: 'sim-sec-title', style: { fontSize: 13 } }, '练习四B · Verdadero/Falso'),
        EXAM_EJ4B.map((item, i) => {
          const ok = a4b[i] === item.ans;
          return html(ResDetailRow, { key: i, ok,
            label: item.s,
            tu: a4b[i] === undefined ? '—' : a4b[i] ? 'Verdadero' : 'Falso',
            correcto: item.ans ? 'Verdadero' : 'Falso',
            extra: !ok ? item.exp : null,
          });
        })
      ),
      // 5A
      html('div', { key: '5a', style: { marginBottom: 16 } },
        html('div', { className: 'sim-sec-title', style: { fontSize: 13 } }, '练习五A · Escucha — Opción múltiple'),
        EXAM_EJ5A.map((item, i) => {
          const ok = a5a[i] === item.ans;
          return html(ResDetailRow, { key: i, ok,
            label: item.q,
            tu: a5a[i] !== undefined ? item.opts[a5a[i]] : '—',
            correcto: item.opts[item.ans],
          });
        })
      ),
      // 5B
      html('div', { key: '5b', style: { marginBottom: 16 } },
        html('div', { className: 'sim-sec-title', style: { fontSize: 13 } }, '练习五B · Escucha — Verdadero/Falso'),
        EXAM_EJ5B.map((item, i) => {
          const ok = a5b[i] === item.ans;
          return html(ResDetailRow, { key: i, ok,
            label: item.s,
            tu: a5b[i] === undefined ? '—' : a5b[i] ? 'Verdadero' : 'Falso',
            correcto: item.ans ? 'Verdadero' : 'Falso',
            extra: !ok ? item.exp : null,
          });
        })
      ),
    ];
  };

  return html('main', { style: { paddingTop: 16, paddingBottom: 40 } },
    html('div', { style: { padding: '0 16px', maxWidth: 580, margin: '0 auto' } },
      // Puntaje total
      html('div', { style: { textAlign: 'center', padding: '24px 0 20px' } },
        html('div', { style: { fontSize: 72, fontWeight: 900, color, fontFamily: 'var(--font-display)', lineHeight: 1 } }, score + '/' + max),
        html('div', { style: { fontSize: 24, fontWeight: 700, color, marginTop: 4 } }, pct + '%'),
        html('div', { style: { fontSize: 16, color: 'var(--ink-mid)', marginTop: 4 } }, nota),
      ),
      // Resumen por sección
      html('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 } },
        secciones.map(({ label, pts, max: m }) =>
          html('div', { key: label, style: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--paper-deep)', borderRadius: 8, padding: '8px 12px' } },
            html('div', { style: {
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: pts === m ? 'var(--jade-dark)' : pts === 0 ? 'var(--lacquer)' : '#f59e0b',
            }}),
            html('span', { style: { flex: 1, fontSize: 12, fontWeight: 600 } }, label),
            html('span', { style: { fontWeight: 800, fontSize: 13, color: pts === m ? 'var(--jade-dark)' : pts === 0 ? 'var(--lacquer)' : '#92400e' } }, pts + '/' + m),
          )
        )
      ),
      // Toggle detalle
      html('button', {
        onClick: () => setShowDetail(d => !d),
        style: {
          width: '100%', padding: '12px', borderRadius: 10, marginBottom: 16,
          border: '2px solid var(--paper-deep)', background: '#fff',
          fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', color: 'var(--ink-mid)',
        }
      }, showDetail ? '▲ Ocultar detalle pregunta a pregunta' : '▼ Ver detalle pregunta a pregunta'),
      showDetail && html('div', null, ...buildDetail()),
      // Botones
      html('div', { style: { display: 'flex', gap: 10, marginTop: 8 } },
        html('button', { className: 'secondary-btn', style: { flex: 1, margin: 0 }, onClick: onBack }, '← Volver al admin'),
        html('button', { className: 'primary-btn', style: { flex: 1 }, onClick: onRetry }, '↺ Repetir examen'),
      )
    )
  );
}

const SIM_SECTIONS = ['ej1a','ej1b','ej2','ej3','ej4a','ej4b','ej5a','ej5b','oral'];
const SIM_LABELS   = ['1A','1B','2','3','4A','4B','5A','5B','Oral'];

function ExamenSimulacro({ onBack }) {
  const [sec, setSec] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [practicaOral, setPracticaOral] = useState(false);
  const [examDB, setExamDB] = useState(null); // null=cargando, obj=listo
  const setSecAns = (key) => (val) => setAnswers(a => ({ ...a, [key]: val }));

  useEffect(() => {
    db.from('exam_content').select('*').order('sort_order')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const map = {};
          data.forEach(row => { map[row.section_key] = row.data; });
          setExamDB(map);
        } else {
          setExamDB({});
        }
      })
      .catch(() => setExamDB({}));
  }, []);

  if (practicaOral) return html(DialogoPractica, { onBack: () => setPracticaOral(false) });

  if (examDB === null) return html('div', { className: 'app-loader' },
    html('div', { className: 'app-loader-hanzi' }, '试'),
    html('div', { className: 'app-loader-dots' }, html('span'), html('span'), html('span')),
    html('div', { className: 'app-loader-msg' }, 'Preparando el examen…'),
  );

  // DB tiene prioridad; si no hay contenido, se usan las constantes locales como respaldo
  const ej1a        = (examDB.ej1a)        || EXAM_EJ1A;
  const ej1b_left   = (examDB.ej1b_left)   || EXAM_EJ1B_LEFT;
  const ej1b_right  = (examDB.ej1b_right)  || EXAM_EJ1B_RIGHT;
  const ej1b_ans    = (examDB.ej1b_ans)    || EXAM_EJ1B_ANS;
  const ej2         = (examDB.ej2)         || EXAM_EJ2;
  const ej3         = (examDB.ej3)         || EXAM_EJ3;
  const ej4_partes  = (examDB.ej4_partes)  || EXAM_EJ4_PARTES;
  const ej4_banco   = (examDB.ej4_banco)   || EXAM_EJ4_BANCO;
  const ej4b        = (examDB.ej4b)        || EXAM_EJ4B;
  const ej5a        = (examDB.ej5a)        || EXAM_EJ5A;
  const ej5b        = (examDB.ej5b)        || EXAM_EJ5B;
  const oralPregs   = (examDB.oral_preguntas) || EXAM_ORAL_PREGUNTAS;
  const horarioRows = (examDB.horario_rows)   || EXAM_HORARIO_ROWS;

  if (submitted) return html(ExamenResultados, {
    answers,
    onRetry: () => { setAnswers({}); setSec(0); setSubmitted(false); },
    onBack,
  });

  const isLast = sec === SIM_SECTIONS.length - 1;

  const renderSection = () => {
    switch (SIM_SECTIONS[sec]) {
      case 'ej1a': return html(SimConectar1A, { items: ej1a, answers: answers.ej1a || {}, setAnswers: setSecAns('ej1a') });
      case 'ej1b': return html(SimConectar1B, { left: ej1b_left, right: ej1b_right, answers: answers.ej1b || {}, setAnswers: setSecAns('ej1b') });
      case 'ej2':  return html(SimMC, { items: ej2, ptsCada: 3, title: '练习二 · Opción múltiple (3 pts c/u · 18 pts)', answers: answers.ej2 || {}, setAnswers: setSecAns('ej2') });
      case 'ej3':  return html(SimOrdenar, { items: ej3, answers: answers.ej3 || {}, setAnswers: setSecAns('ej3') });
      case 'ej4a': return html(SimRellenar, { partes: ej4_partes, banco: ej4_banco, answers: answers.ej4a, setAnswers: setSecAns('ej4a') });
      case 'ej4b': return html(SimVF, { items: ej4b, ptsCada: 2, title: '练习四B · Verdadero / Falso (2 pts c/u · 10 pts)', answers: answers.ej4b || {}, setAnswers: setSecAns('ej4b') });
      case 'ej5a': return html(SimMC, { items: ej5a, ptsCada: 2, title: '练习五A · Comprensión auditiva — Opción múltiple (2 pts c/u · 10 pts)', answers: answers.ej5a || {}, setAnswers: setSecAns('ej5a') });
      case 'ej5b': return html(SimVF, { items: ej5b, ptsCada: 2, title: '练习五B · Comprensión auditiva — Verdadero / Falso (2 pts c/u · 10 pts)', answers: answers.ej5b || {}, setAnswers: setSecAns('ej5b') });
      case 'oral': return html(SimOral, { preguntas: oralPregs, horario: horarioRows, onPracticarDialogo: () => setPracticaOral(true) });
    }
  };

  return html(React.Fragment, null,
    html('main', { style: { paddingTop: 16, paddingBottom: 40 } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, '模拟考试 · Simulacro Nivel III'),
      ),
      // Barra de progreso de secciones
      html('div', { style: { display: 'flex', gap: 4, padding: '0 16px', marginBottom: 16, overflowX: 'auto' } },
        SIM_LABELS.map((label, i) =>
          html('button', {
            key: i,
            onClick: () => setSec(i),
            style: {
              flex: '0 0 auto', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              background: i === sec ? 'var(--lacquer)' : 'var(--paper-deep)',
              color: i === sec ? '#fff' : 'var(--ink-mid)',
            }
          }, label)
        )
      ),
      html('div', { style: { padding: '0 16px' } }, renderSection()),
      html('div', { style: { display: 'flex', gap: 10, padding: '20px 16px 0' } },
        sec > 0 && html('button', { className: 'secondary-btn', style: { margin: 0 }, onClick: () => setSec(s => s - 1) }, '← Anterior'),
        html('div', { style: { flex: 1 } }),
        isLast
          ? html('button', { className: 'primary-btn', style: { margin: 0 }, onClick: () => setSubmitted(true) }, '🏁 Ver resultados')
          : html('button', { className: 'primary-btn', style: { margin: 0 }, onClick: () => setSec(s => s + 1) }, 'Siguiente →'),
      )
    )
  );
}

// ── Editor de preguntas por módulo ────────────────────────────────────────────
function ModuleQuestionsEditor({ modId }) {
  const CONFIGS = {
    'mod-clas': {
      table: 'clasificador_questions',
      tipos: [
        { key: 'clasificador', label: '🔢 Clasificadores' },
        { key: 'modal',        label: '🔵 Verbos modales' },
        { key: 'tiempo',       label: '🕐 Expresiones de tiempo' },
      ],
      hasTipo: true,
      fields: [
        { key: 'sentence',       label: 'Oración (con ___)', type: 'text' },
        { key: 'pinyin',         label: 'Pinyin de la oración', type: 'text' },
        { key: 'answer',         label: 'Respuesta correcta', type: 'text', sm: true },
        { key: 'answer_pinyin',  label: 'Pinyin de la respuesta', type: 'text', sm: true },
        { key: 'options',        label: 'Opciones (separadas por coma)', type: 'options' },
        { key: 'hint',           label: 'Pista', type: 'text' },
      ],
      defaultTipo: 'clasificador',
    },
    'mod-dialogo': {
      table: 'dialogo_questions',
      hasTipo: false,
      fields: [
        { key: 'context',       label: 'Contexto', type: 'text' },
        { key: 'line_a',        label: 'Línea A (usa ___ para el hueco)', type: 'text' },
        { key: 'line_b',        label: 'Línea B (usa ___ para el hueco)', type: 'text' },
        { key: 'blank_in',      label: 'Hueco en', type: 'select', opts: ['A','B'] },
        { key: 'answer',        label: 'Respuesta correcta', type: 'text', sm: true },
        { key: 'answer_pinyin', label: 'Pinyin respuesta', type: 'text', sm: true },
        { key: 'answer_es',     label: 'Traducción respuesta', type: 'text', sm: true },
        { key: 'options',       label: 'Opciones (separadas por coma)', type: 'options' },
        { key: 'explanation',   label: 'Explicación (opcional)', type: 'text' },
      ],
    },
    'mod-orden': {
      table: 'orden_questions',
      hasTipo: false,
      fields: [
        { key: 'words',   label: 'Palabras (separadas por coma)', type: 'options' },
        { key: 'correct', label: 'Orden correcto (separado por coma)', type: 'options' },
        { key: 'pinyin',  label: 'Pinyin de la oración', type: 'text' },
        { key: 'es',      label: 'Traducción', type: 'text' },
      ],
    },
  };

  const cfg = CONFIGS[modId];
  if (!cfg) {
    return html('div', { className: 'admin-note', style: { padding: '12px 0' } },
      'Este módulo usa el vocabulario de las lecciones. Para editarlo, modificá las palabras desde la sección de lecciones.'
    );
  }

  const [activeTipo, setActiveTipo] = useState(cfg.defaultTipo || null);
  const [rows, setRows] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [addDraft, setAddDraft] = useState({});
  const [msg, setMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // id a eliminar

  const loadRows = () => {
    let q = db.from(cfg.table).select('*');
    if (cfg.hasTipo && activeTipo) q = q.eq('tipo', activeTipo);
    q.order('id', { ascending: true }).then(({ data }) => setRows((data || []).map(nfcRow)));
  };

  useEffect(() => { setRows(null); loadRows(); }, [activeTipo]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };

  const optionsToArr = (v) => {
    if (Array.isArray(v)) return v;
    try { return JSON.parse(v); } catch { return String(v).split(',').map(s => s.trim()).filter(Boolean); }
  };
  const arrToDisplay = (v) => {
    if (Array.isArray(v)) return v.join(', ');
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.join(', '); } catch {}
    return v;
  };

  const buildPayload = (draft) => {
    const out = {};
    cfg.fields.forEach(f => {
      if (f.type === 'options') out[f.key] = optionsToArr(draft[f.key] || '');
      else out[f.key] = draft[f.key] || '';
    });
    if (cfg.hasTipo) out.tipo = activeTipo;
    if (cfg.table === 'clasificador_questions') out.active = true;
    return out;
  };

  const startEdit = (row) => {
    const draft = {};
    cfg.fields.forEach(f => {
      draft[f.key] = f.type === 'options' ? arrToDisplay(row[f.key]) : (row[f.key] || '');
    });
    setEditDraft(draft);
    setEditId(row.id);
    setAddMode(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    const { error } = await db.from(cfg.table).update(buildPayload(editDraft)).eq('id', editId);
    setSaving(false);
    if (error) { flash('❌ Error: ' + error.message); return; }
    flash('✅ Guardado');
    setEditId(null);
    loadRows();
  };

  const deleteRow = async (id) => {
    await db.from(cfg.table).delete().eq('id', id);
    setConfirmDelete(null);
    loadRows();
  };

  const saveAdd = async () => {
    setSaving(true);
    const payload = buildPayload(addDraft);
    if (cfg.table === 'clasificador_questions') payload.lesson = 9;
    const { error } = await db.from(cfg.table).insert(payload);
    setSaving(false);
    if (error) { flash('❌ Error: ' + error.message); return; }
    flash('✅ Pregunta agregada');
    setAddMode(false);
    setAddDraft({});
    loadRows();
  };

  const FieldInput = ({ fieldCfg, draft, setDraft }) =>
    fieldCfg.type === 'select'
      ? html('select', {
          value: draft[fieldCfg.key] || fieldCfg.opts[0],
          onChange: e => setDraft(d => ({ ...d, [fieldCfg.key]: e.target.value })),
          style: { padding: '5px 8px', borderRadius: 8, border: '1px solid var(--paper-deep)', fontSize: 13, background: '#fff' }
        }, ...fieldCfg.opts.map(o => html('option', { key: o, value: o }, o)))
      : html('input', {
          type: 'text',
          value: draft[fieldCfg.key] || '',
          onChange: e => setDraft(d => ({ ...d, [fieldCfg.key]: e.target.value })),
          placeholder: fieldCfg.label,
          style: { width: '100%', padding: '5px 8px', borderRadius: 8, border: '1px solid var(--paper-deep)', fontSize: 13, boxSizing: 'border-box' }
        });

  const FormBlock = ({ draft, setDraft, onSave, onCancel }) =>
    html('div', { style: { background: 'var(--paper)', borderRadius: 12, padding: 14, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 } },
      ...cfg.fields.map(f =>
        html('div', { key: f.key },
          html('div', { style: { fontSize: 11, color: 'var(--ink-soft)', marginBottom: 3, fontWeight: 700 } }, f.label),
          html(FieldInput, { fieldCfg: f, draft, setDraft })
        )
      ),
      html('div', { style: { display: 'flex', gap: 8, marginTop: 4 } },
        html('button', { className: 'primary-btn', style: { fontSize: 13, padding: '7px 16px' }, onClick: onSave, disabled: saving },
          saving ? 'Guardando...' : '💾 Guardar'
        ),
        html('button', { className: 'secondary-btn', style: { fontSize: 13, padding: '7px 16px' }, onClick: onCancel }, 'Cancelar'),
      )
    );

  return html('div', { style: { marginTop: 10 } },

    // Tabs de tipo (solo para clasificadores)
    cfg.hasTipo && html('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
      cfg.tipos.map(t =>
        html('button', {
          key: t.key,
          onClick: () => { setActiveTipo(t.key); setEditId(null); setAddMode(false); },
          style: {
            padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            background: activeTipo === t.key ? 'var(--lacquer)' : 'var(--paper-deep)',
            color: activeTipo === t.key ? '#fff' : 'var(--ink)',
          }
        }, t.label)
      )
    ),

    // Mensaje flash
    msg && html('div', { style: { background: '#f0fdf4', color: '#166534', borderRadius: 8, padding: '7px 12px', fontSize: 13, marginBottom: 8 } }, msg),

    // Lista de preguntas
    rows === null
      ? html('p', { className: 'admin-note' }, '⏳ Cargando...')
      : rows.length === 0
        ? html('p', { className: 'admin-note' }, 'No hay preguntas todavía.')
        : html('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto', paddingRight: 4 } },
            rows.map((row, i) =>
              html('div', { key: row.id || i },
                editId === row.id
                  ? html(FormBlock, { draft: editDraft, setDraft: setEditDraft, onSave: saveEdit, onCancel: () => setEditId(null) })
                  : html('div', {
                      style: { background: '#fff', borderRadius: 10, padding: '9px 12px', boxShadow: 'var(--shadow-paper)', display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }
                    },
                      html('div', { style: { flex: 1, minWidth: 0 } },
                        html('div', { className: 'hanzi-font', style: { fontSize: 15, fontWeight: 700 } },
                          row.sentence || row.line_a || (Array.isArray(row.words) ? row.words.join(' ') : row.words) || '—'
                        ),
                        html('div', { style: { color: 'var(--ink-soft)', fontSize: 12, marginTop: 2 } },
                          row.pinyin || row.answer_pinyin || ''
                        ),
                        row.answer && html('div', { style: { marginTop: 3, fontSize: 12 } },
                          html('span', { style: { background: 'var(--jade-light)', color: 'var(--jade-dark)', borderRadius: 6, padding: '2px 7px', fontWeight: 700 } }, '✓ ' + row.answer)
                        ),
                        row.es && html('div', { style: { color: 'var(--ink-soft)', fontSize: 11, marginTop: 2 } }, row.es),
                      ),
                      html('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 } },
                        html('button', { onClick: () => startEdit(row), style: { background: 'var(--paper-deep)', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, '✏️'),
                        confirmDelete === row.id
                          ? html('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                              html('span', { style: { fontSize: 11, fontWeight: 700, color: 'var(--lacquer)' } }, '¿Eliminar?'),
                              html('button', { onClick: () => deleteRow(row.id), style: { background: 'var(--lacquer)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, 'Sí'),
                              html('button', { onClick: () => setConfirmDelete(null), style: { background: 'var(--paper-deep)', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12 } }, 'No'),
                            )
                          : html('button', { onClick: () => setConfirmDelete(row.id), style: { background: '#fee2e2', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12 } }, '🗑️'),
                      )
                    )
              )
            )
          ),

    // Agregar pregunta
    html('div', { style: { marginTop: 10 } },
      !addMode
        ? html('button', { className: 'secondary-btn', style: { fontSize: 13 }, onClick: () => { setAddMode(true); setAddDraft({}); setEditId(null); } }, '+ Agregar pregunta')
        : html(FormBlock, { draft: addDraft, setDraft: setAddDraft, onSave: saveAdd, onCancel: () => setAddMode(false) })
    ),
  );
}

// ═══════════════════════════════════════════════════════════
// Constantes de HanziWriteGame (aquí para que AppConfigEditor
// las pueda usar como fallback antes de su definición)
// ═══════════════════════════════════════════════════════════
const WRITE_LEVELS_DEFAULT = [
  { level: 1, label: '1 carácter',     minChars: 1, maxChars: 1,   hint: 'Escribí el carácter en chino' },
  { level: 2, label: '2 caracteres',   minChars: 2, maxChars: 2,   hint: 'Escribí la palabra en chino' },
  { level: 3, label: '3-4 caracteres', minChars: 3, maxChars: 4,   hint: 'Escribí la palabra o frase' },
  { level: 4, label: 'Oración',        minChars: 5, maxChars: 999, hint: 'Completá el espacio en blanco' },
];
const WRITE_STREAK_DEFAULT = 3;

// ═══════════════════════════════════════════════════════════
// AppConfigEditor — edita app_config en Supabase
// ═══════════════════════════════════════════════════════════
function AppConfigEditor({ appConfig, onAppConfigChange }) {
  const [saving, setSaving] = useState(null);       // key que se está guardando
  const [saveStatus, setSaveStatus] = useState({}); // { [key]: 'ok' | 'err' }
  const [editingKey, setEditingKey] = useState(null);

  // Estados de edición por sección
  const [brandFrames, setBrandFrames] = useState(null);
  const [brandInterval, setBrandInterval] = useState(null);
  const [modulesList, setModulesList] = useState(null);
  const [writeConfig, setWriteConfig] = useState(null);
  const [kbHint, setKbHint] = useState(null);

  const openEdit = (key) => {
    if (editingKey === key) { setEditingKey(null); return; }
    setEditingKey(key);
    if (key === 'brand_frames') setBrandFrames(JSON.parse(JSON.stringify(appConfig.brand_frames || BRAND_FRAMES_DEFAULT)));
    if (key === 'brand_anim_interval') setBrandInterval(appConfig.brand_anim_interval || 9);
    if (key === 'modules_list') setModulesList(JSON.parse(JSON.stringify(appConfig.modules_list || MODULES_LIST_DEFAULT)));
    if (key === 'write_game_config') setWriteConfig(JSON.parse(JSON.stringify(appConfig.write_game_config || { streak_to_level_up: WRITE_STREAK_DEFAULT, levels: WRITE_LEVELS_DEFAULT })));
    if (key === 'keyboard_hint_text') setKbHint(appConfig.keyboard_hint_text || '📱 Necesitás el teclado chino (Pinyin) activado · iOS: Ajustes → General → Teclado · Android: Ajustes → Idioma');
  };

  const save = async (key, value) => {
    setSaving(key);
    setSaveStatus(s => ({ ...s, [key]: null }));
    const { error } = await db.from('app_config')
      .upsert({ key, value, label: { brand_frames: 'Textos de animación de marca', brand_anim_interval: 'Segundos entre cambios de marca', modules_list: 'Módulos de práctica', write_game_config: 'Juego de escritura — niveles', keyboard_hint_text: 'Instrucción teclado chino' }[key] || key });
    setSaving(null);
    if (error) {
      setSaveStatus(s => ({ ...s, [key]: 'err' }));
    } else {
      onAppConfigChange(key, value);
      setSaveStatus(s => ({ ...s, [key]: 'ok' }));
      setEditingKey(null);
    }
  };

  const sectionStyle = { background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--shadow-paper)', marginBottom: 10 };
  const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' };
  const editBtnStyle = (open) => ({ background: open ? 'var(--lacquer)' : 'var(--paper-deep)', border: 'none', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 800, color: open ? '#fff' : 'var(--ink)' });
  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--paper-deep)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
  const saveBtnStyle = { background: 'var(--jade)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 800, fontSize: 13, marginTop: 10 };

  return html('div', null,
    // ── Animación de marca ──
    html('div', { style: sectionStyle },
      html('div', { style: headerStyle, onClick: () => openEdit('brand_frames') },
        html('div', null,
          html('div', { style: { fontWeight: 800, fontSize: 14 } }, '🎬 Animación de marca'),
          html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 } }, (appConfig.brand_frames || BRAND_FRAMES_DEFAULT).map(f => f.title).join(' → ')),
        ),
        html('button', { style: editBtnStyle(editingKey === 'brand_frames'), onClick: e => { e.stopPropagation(); openEdit('brand_frames'); } }, editingKey === 'brand_frames' ? '▲ Cerrar' : '▼ Editar'),
      ),
      editingKey === 'brand_frames' && brandFrames && html('div', { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
        brandFrames.map((f, i) =>
          html('div', { key: i, style: { display: 'flex', gap: 8, alignItems: 'center' } },
            html('div', { style: { fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)', minWidth: 24 } }, (i + 1) + '.'),
            html('input', { style: { ...inputStyle, flex: 1 }, placeholder: 'Título', value: f.title, onChange: e => { const n = [...brandFrames]; n[i] = { ...n[i], title: e.target.value }; setBrandFrames(n); } }),
            html('input', { style: { ...inputStyle, flex: 1 }, placeholder: 'Subtítulo', value: f.sub, onChange: e => { const n = [...brandFrames]; n[i] = { ...n[i], sub: e.target.value }; setBrandFrames(n); } }),
            brandFrames.length > 1 && html('button', { onClick: () => setBrandFrames(brandFrames.filter((_, j) => j !== i)), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--lacquer)', padding: '0 4px' } }, '🗑'),
          )
        ),
        html('div', { style: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 } },
          html('button', { onClick: () => setBrandFrames([...brandFrames, { title: '', sub: '' }]), style: { background: 'none', border: '1.5px dashed var(--paper-deep)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' } }, '+ Agregar frame'),
          html('div', { style: { fontSize: 12, color: 'var(--ink-soft)' } }, 'Intervalo: '),
          html('input', { type: 'number', min: 3, max: 60, value: appConfig.brand_anim_interval || 9, onChange: async (e) => { const v = parseInt(e.target.value) || 9; await save('brand_anim_interval', v); onAppConfigChange('brand_anim_interval', v); }, style: { ...inputStyle, width: 60 } }),
          html('div', { style: { fontSize: 12, color: 'var(--ink-soft)' } }, 'seg'),
        ),
        html('button', { style: saveBtnStyle, disabled: saving === 'brand_frames', onClick: () => save('brand_frames', brandFrames) }, saving === 'brand_frames' ? '⏳ Guardando…' : '💾 Guardar'),
        saveStatus.brand_frames === 'ok' && html('div', { style: { color: 'var(--jade-dark)', fontWeight: 700, fontSize: 13, marginTop: 6 } }, '✅ Guardado'),
        saveStatus.brand_frames === 'err' && html('div', { style: { color: 'var(--lacquer)', fontWeight: 700, fontSize: 13, marginTop: 6 } }, '❌ Error al guardar'),
      ),
    ),

    // ── Módulos de práctica ──
    html('div', { style: sectionStyle },
      html('div', { style: headerStyle, onClick: () => openEdit('modules_list') },
        html('div', null,
          html('div', { style: { fontWeight: 800, fontSize: 14 } }, '📋 Módulos de práctica'),
          html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 } }, (appConfig.modules_list || MODULES_LIST_DEFAULT).filter(m => m.active !== false).length + ' activos · orden y textos editables'),
        ),
        html('button', { style: editBtnStyle(editingKey === 'modules_list'), onClick: e => { e.stopPropagation(); openEdit('modules_list'); } }, editingKey === 'modules_list' ? '▲ Cerrar' : '▼ Editar'),
      ),
      editingKey === 'modules_list' && modulesList && html('div', { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
        modulesList.map((m, i) =>
          html('div', { key: m.id || i, style: { background: 'var(--paper)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, opacity: m.active === false ? 0.6 : 1 } },
            html('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
              html('input', { style: { ...inputStyle, width: 50, textAlign: 'center', fontSize: 18 }, placeholder: '🔢', value: m.icon, onChange: e => { const n = [...modulesList]; n[i] = { ...n[i], icon: e.target.value }; setModulesList(n); } }),
              html('input', { style: { ...inputStyle, flex: 1, fontWeight: 700 }, placeholder: 'Título', value: m.title, onChange: e => { const n = [...modulesList]; n[i] = { ...n[i], title: e.target.value }; setModulesList(n); } }),
              html('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
                html('input', { type: 'checkbox', id: 'mod-active-' + i, checked: m.active !== false, onChange: e => { const n = [...modulesList]; n[i] = { ...n[i], active: e.target.checked }; setModulesList(n); } }),
                html('label', { htmlFor: 'mod-active-' + i, style: { fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, 'Activo'),
              ),
            ),
            html('input', { style: inputStyle, placeholder: 'Descripción', value: m.sub, onChange: e => { const n = [...modulesList]; n[i] = { ...n[i], sub: e.target.value }; setModulesList(n); } }),
          )
        ),
        html('button', { style: saveBtnStyle, disabled: saving === 'modules_list', onClick: () => save('modules_list', modulesList) }, saving === 'modules_list' ? '⏳ Guardando…' : '💾 Guardar'),
        saveStatus.modules_list === 'ok' && html('div', { style: { color: 'var(--jade-dark)', fontWeight: 700, fontSize: 13, marginTop: 6 } }, '✅ Guardado'),
        saveStatus.modules_list === 'err' && html('div', { style: { color: 'var(--lacquer)', fontWeight: 700, fontSize: 13, marginTop: 6 } }, '❌ Error al guardar'),
      ),
    ),

    // ── Juego de escritura ──
    html('div', { style: sectionStyle },
      html('div', { style: headerStyle, onClick: () => openEdit('write_game_config') },
        html('div', null,
          html('div', { style: { fontWeight: 800, fontSize: 14 } }, '✍️ Práctica de escritura'),
          html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 } }, 'Racha para subir nivel: ' + ((appConfig.write_game_config && appConfig.write_game_config.streak_to_level_up) || WRITE_STREAK_DEFAULT) + ' · ' + ((appConfig.write_game_config && appConfig.write_game_config.levels) || WRITE_LEVELS_DEFAULT).length + ' niveles'),
        ),
        html('button', { style: editBtnStyle(editingKey === 'write_game_config'), onClick: e => { e.stopPropagation(); openEdit('write_game_config'); } }, editingKey === 'write_game_config' ? '▲ Cerrar' : '▼ Editar'),
      ),
      editingKey === 'write_game_config' && writeConfig && html('div', { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 } },
        html('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          html('label', { style: { fontSize: 13, fontWeight: 700, minWidth: 180 } }, 'Aciertos para subir nivel:'),
          html('input', { type: 'number', min: 1, max: 10, value: writeConfig.streak_to_level_up, onChange: e => setWriteConfig({ ...writeConfig, streak_to_level_up: parseInt(e.target.value) || 3 }), style: { ...inputStyle, width: 70 } }),
        ),
        html('div', { style: { fontSize: 13, fontWeight: 800, color: 'var(--ink-soft)', marginTop: 4 } }, 'Niveles de dificultad:'),
        (writeConfig.levels || []).map((lv, i) =>
          html('div', { key: i, style: { background: 'var(--paper)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 } },
            html('div', { style: { display: 'flex', gap: 8 } },
              html('input', { style: { ...inputStyle, flex: 1 }, placeholder: 'Etiqueta', value: lv.label, onChange: e => { const n = [...writeConfig.levels]; n[i] = { ...n[i], label: e.target.value }; setWriteConfig({ ...writeConfig, levels: n }); } }),
              html('input', { type: 'number', min: 1, placeholder: 'Min', value: lv.minChars, onChange: e => { const n = [...writeConfig.levels]; n[i] = { ...n[i], minChars: parseInt(e.target.value) || 1 }; setWriteConfig({ ...writeConfig, levels: n }); }, style: { ...inputStyle, width: 60 } }),
              html('input', { type: 'number', min: 1, placeholder: 'Max', value: lv.maxChars === 999 ? '' : lv.maxChars, onChange: e => { const n = [...writeConfig.levels]; n[i] = { ...n[i], maxChars: parseInt(e.target.value) || 999 }; setWriteConfig({ ...writeConfig, levels: n }); }, style: { ...inputStyle, width: 60 } }),
            ),
            html('input', { style: inputStyle, placeholder: 'Pista para el alumno', value: lv.hint, onChange: e => { const n = [...writeConfig.levels]; n[i] = { ...n[i], hint: e.target.value }; setWriteConfig({ ...writeConfig, levels: n }); } }),
          )
        ),
        html('button', { style: saveBtnStyle, disabled: saving === 'write_game_config', onClick: () => save('write_game_config', writeConfig) }, saving === 'write_game_config' ? '⏳ Guardando…' : '💾 Guardar'),
        saveStatus.write_game_config === 'ok' && html('div', { style: { color: 'var(--jade-dark)', fontWeight: 700, fontSize: 13, marginTop: 6 } }, '✅ Guardado'),
        saveStatus.write_game_config === 'err' && html('div', { style: { color: 'var(--lacquer)', fontWeight: 700, fontSize: 13, marginTop: 6 } }, '❌ Error al guardar'),
      ),
    ),

    // ── Instrucción teclado ──
    html('div', { style: sectionStyle },
      html('div', { style: headerStyle, onClick: () => openEdit('keyboard_hint_text') },
        html('div', null,
          html('div', { style: { fontWeight: 800, fontSize: 14 } }, '📱 Instrucción teclado chino'),
          html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, appConfig.keyboard_hint_text || '—'),
        ),
        html('button', { style: editBtnStyle(editingKey === 'keyboard_hint_text'), onClick: e => { e.stopPropagation(); openEdit('keyboard_hint_text'); } }, editingKey === 'keyboard_hint_text' ? '▲ Cerrar' : '▼ Editar'),
      ),
      editingKey === 'keyboard_hint_text' && html('div', { style: { marginTop: 10 } },
        html('textarea', { rows: 3, style: { ...inputStyle, resize: 'vertical' }, value: kbHint || '', onChange: e => setKbHint(e.target.value) }),
        html('button', { style: saveBtnStyle, disabled: saving === 'keyboard_hint_text', onClick: () => save('keyboard_hint_text', kbHint) }, saving === 'keyboard_hint_text' ? '⏳ Guardando…' : '💾 Guardar'),
        saveStatus.keyboard_hint_text === 'ok' && html('div', { style: { color: 'var(--jade-dark)', fontWeight: 700, fontSize: 13, marginTop: 6 } }, '✅ Guardado'),
        saveStatus.keyboard_hint_text === 'err' && html('div', { style: { color: 'var(--lacquer)', fontWeight: 700, fontSize: 13, marginTop: 6 } }, '❌ Error al guardar'),
      ),
    ),
  );
}

function AdminPanel({ vocab, onBack, onVocabUpdate, onReports, appConfig, onAppConfigChange }) {
  const [showSimulacro, setShowSimulacro] = useState(false);
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginBlocked, setLoginBlocked] = useState(false);
  const [loginCooldown, setLoginCooldown] = useState(0);

  // El rol (admin / laoshi / alumno) decide qué puede ver cada quien.
  // Importante: ahora que los alumnos también tienen sesión real (mail),
  // NO alcanza con "hay sesión" para mostrar el panel — hay que chequear el rol.
  useEffect(() => {
    if (!session) { setRole(null); return; }
    db.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setRole(data ? data.role : null));
  }, [session]);
  const isAdmin = role === 'admin';
  const isLaoshi = role === 'laoshi' || isAdmin;

  useEffect(() => { if (isLaoshi) loadClasses(); }, [isLaoshi]);

  // texto manual (modo legacy)
  const [text, setText] = useState('');
  // archivo CSV
  const [csvFile, setCsvFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  // ── Audios reales por lección (Supabase Storage) ──
  const [audioLesson, setAudioLesson] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioTitle, setAudioTitle] = useState('');
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioStatus, setAudioStatus] = useState(null);
  const [audioList, setAudioList] = useState([]);

  const loadAudioList = async (lessonId) => {
    if (!lessonId) { setAudioList([]); return; }
    const { data } = await db.from('lesson_audio').select('id,title,storage_path,position')
      .eq('lesson', lessonId).order('position');
    setAudioList(data || []);
  };
  useEffect(() => { loadAudioList(audioLesson); }, [audioLesson]);

  const handleAudioUpload = async () => {
    if (!audioFile || !audioLesson) return;
    setAudioUploading(true);
    setAudioStatus(null);
    const safeName = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = audioLesson + '/' + Date.now() + '-' + safeName;
    const { error: upErr } = await db.storage.from('lesson-audio').upload(path, audioFile, {
      contentType: audioFile.type || 'audio/mpeg',
    });
    if (upErr) { setAudioUploading(false); setAudioStatus({ type: 'err', msg: '❌ ' + upErr.message }); return; }
    const { error: rowErr } = await db.from('lesson_audio').insert({
      lesson: audioLesson, title: audioTitle.trim(), storage_path: path, position: audioList.length,
    });
    setAudioUploading(false);
    if (rowErr) { setAudioStatus({ type: 'err', msg: '❌ ' + rowErr.message }); return; }
    setAudioFile(null);
    setAudioTitle('');
    setAudioStatus({ type: 'ok', msg: '✅ Audio subido.' });
    loadAudioList(audioLesson);
  };

  const handleAudioDelete = async (track) => {
    await db.storage.from('lesson-audio').remove([track.storage_path]);
    await db.from('lesson_audio').delete().eq('id', track.id);
    loadAudioList(audioLesson);
  };

  // gestión de lecciones
  const [renamingLesson, setRenamingLesson] = useState(null);
  const [visibilityTick, setVisibilityTick] = useState(0);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  // editor de contenido de lección
  const [editingLesson, setEditingLesson] = useState(null);
  const [editWords, setEditWords] = useState([]);

  // ── Mis clases (clases del laoshi: código + listado de mails) ──
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [rosterDrafts, setRosterDrafts] = useState({}); // { [classId]: 'texto del textarea' }
  const [rosterCounts, setRosterCounts] = useState({}); // { [classId]: n }
  const [memberCounts, setMemberCounts] = useState({}); // { [classId]: n }
  const [classStatus, setClassStatus] = useState(null);

  const genClassCode = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusiones
    let c = '';
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
  };

  const loadClasses = async () => {
    setLoadingClasses(true);
    const { data } = await db.from('classes').select('id,name,code,created_at').order('created_at', { ascending: false });
    setClasses(data || []);
    setLoadingClasses(false);
    (data || []).forEach(async (c) => {
      const [{ count: rCount }, { count: mCount }] = await Promise.all([
        db.from('class_roster').select('email', { count: 'exact', head: true }).eq('class_id', c.id),
        db.from('class_members').select('student_id', { count: 'exact', head: true }).eq('class_id', c.id),
      ]);
      setRosterCounts(prev => ({ ...prev, [c.id]: rCount || 0 }));
      setMemberCounts(prev => ({ ...prev, [c.id]: mCount || 0 }));
    });
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    const { error } = await db.from('classes').insert({ name, code: genClassCode(), laoshi_id: session.user.id });
    if (error) { setClassStatus({ type: 'err', msg: '❌ ' + error.message }); return; }
    setNewClassName('');
    setClassStatus({ type: 'ok', msg: '✅ Clase creada.' });
    loadClasses();
  };

  const handleAddRoster = async (classId) => {
    const raw = rosterDrafts[classId] || '';
    const emails = raw.split(/[\n,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
    if (emails.length === 0) return;
    const rows = emails.map(email => ({ class_id: classId, email }));
    const { error } = await db.from('class_roster').upsert(rows, { onConflict: 'class_id,email' });
    if (error) { setClassStatus({ type: 'err', msg: '❌ ' + error.message }); return; }
    setRosterDrafts(prev => ({ ...prev, [classId]: '' }));
    setClassStatus({ type: 'ok', msg: '✅ Se agregaron ' + emails.length + ' mail(s) a la clase.' });
    loadClasses();
  };

  // log de inicios de sesión (admins)
  const [loginLog, setLoginLog] = useState([]);
  const [showLoginLog, setShowLoginLog] = useState(false);
  const loadLoginLog = () => {
    db.from('login_log').select('email,created_at').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setLoginLog(data || []));
    setShowLoginLog(true);
  };

  // módulo expandido en el panel de edición
  const [expandedMod, setExpandedMod] = useState(null);

  // log de actividad de alumnos
  const [activityLog, setActivityLog] = useState([]);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const loadActivityLog = () => {
    db.from('activity_log')
      .select('name,connected_at,last_active,max_lesson,max_game,max_game_score')
      .order('connected_at', { ascending: false }).limit(200)
      .then(({ data }) => setActivityLog(data || []));
    setShowActivityLog(true);
  };

  const handleRenameLesson = (id) => {
    const theme = LESSON_THEMES[id] || { name: 'Lección ' + id };
    setRenamingLesson(id);
    setRenameValue(theme.name);
  };

  const handleRenameSave = async (id) => {
    if (renameValue.trim()) {
      const theme = { ...(LESSON_THEMES[id] || {}), name: renameValue.trim() };
      LESSON_THEMES[id] = theme;
      // Guardar en Supabase (para todos)
      await db.from('lesson_themes').upsert({ lesson: id, name: theme.name, icon: theme.icon || id });
      // Guardar en localStorage (fallback offline)
      const saved = JSON.parse(localStorage.getItem('hanzi-lesson-themes') || '{}');
      saved[id] = theme;
      localStorage.setItem('hanzi-lesson-themes', JSON.stringify(saved));
      setStatus({ type: 'ok', msg: '✅ Nombre de Lección ' + id + ' actualizado para todos.' });
    }
    setRenamingLesson(null);
  };


  useEffect(() => {
    db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    const { data: listener } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loginBlocked) return;
    setLoginStatus(null);
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= 5) {
        // Bloquear 60 segundos tras 5 intentos fallidos
        setLoginBlocked(true);
        setLoginCooldown(60);
        setLoginStatus({ type: 'err', msg: '🔒 Demasiados intentos. Esperá 60 segundos.' });
        const interval = setInterval(() => {
          setLoginCooldown(s => {
            if (s <= 1) { clearInterval(interval); setLoginBlocked(false); setLoginAttempts(0); return 0; }
            return s - 1;
          });
        }, 1000);
      } else {
        setLoginStatus({ type: 'err', msg: error.message + (newAttempts >= 3 ? ' (' + (5 - newAttempts) + ' intentos restantes)' : '') });
      }
      return;
    }
    setLoginAttempts(0);
    db.from('login_log').insert({ email: data.user?.email || email }).then(() => {});
  };

  const handleLogout = async () => {
    await db.auth.signOut();
    setStatus(null);
  };

  // nueva lección

  // Parsea CSV con formato: Lección, 汉字, Pīnyīn, Significado en español
  // Agrupa automáticamente por número de lección
  const parseCsvMultiLesson = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const sep = lines[0].includes(';') ? ';' : ',';
    // Saltar encabezado si la primera celda empieza con "Lecci"
    const startIdx = /^lecci/i.test(lines[0].split(sep)[0]) ? 1 : 0;
    const lessons = {}; // { id: { name, icon, words: [] } }
    lines.slice(startIdx).forEach(line => {
      // Parsear respetando comillas
      const parts = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; }
        else if (c === sep && !inQ) { parts.push(cur.trim()); cur = ''; }
        else { cur += c; }
      }
      parts.push(cur.trim());
      if (parts.length < 4) return;
      const [lecCol, hanzi, pinyin, es] = parts;
      if (!hanzi || !pinyin || !es) return;
      // Extraer número de lección: "Lección 3 — ..." → "3"
      const numMatch = lecCol.match(/lecci[oó]n\s+(\d+)/i);
      if (!numMatch) return;
      const lid = numMatch[1];
      if (!lessons[lid]) {
        // Nombre: lo que viene después de "—" en la primera aparición
        const nameMatch = lecCol.match(/[—-]\s*(.+)/);
        const rawName = nameMatch ? nameMatch[1].trim() : ('Lección ' + lid);
        // Ícono: primer carácter chino del nombre
        const iconMatch = rawName.match(/[一-鿿]/);
        lessons[lid] = { name: rawName, icon: iconMatch ? iconMatch[0] : lid, words: [] };
      }
      lessons[lid].words.push({ lesson: lid, hanzi, pinyin, es });
    });
    return lessons;
  };

  // Subir CSV multi-lección al Supabase
  const handleCsvUpload = async () => {
    if (!csvFile) { setStatus({ type: 'err', msg: 'Seleccioná un archivo CSV primero.' }); return; }
    setUploading(true);
    setStatus(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const lessons = parseCsvMultiLesson(e.target.result);
        const lessonIds = Object.keys(lessons);
        if (lessonIds.length === 0) { setStatus({ type: 'err', msg: 'No se encontraron lecciones. Verificá el formato del CSV.' }); setUploading(false); return; }

        let totalWords = 0;
        const newVocab = { ...vocab };

        for (const lid of lessonIds) {
          const { name, icon, words } = lessons[lid];
          // Borrar palabras existentes de esa lección en Supabase antes de insertar
          await db.from('vocabulary').delete().eq('lesson', lid);
          const { error: insErr } = await db.from('vocabulary').insert(words);
          if (insErr) throw insErr;
          await db.from('lesson_themes').upsert({ lesson: lid, name, icon });
          LESSON_THEMES[lid] = { name, icon };
          newVocab[lid] = words.map(w => ({ hanzi: w.hanzi, pinyin: w.pinyin, es: w.es }));
          totalWords += words.length;
        }

        onVocabUpdate(newVocab);
        setStatus({ type: 'ok', msg: '✅ ' + lessonIds.length + ' lección(es) cargadas con ' + totalWords + ' palabras en total para todos los usuarios.' });
        setCsvFile(null);
      } catch (err) {
        setStatus({ type: 'err', msg: 'Error: ' + err.message });
      }
      setUploading(false);
    };
    reader.readAsText(csvFile, 'UTF-8');
  };

  // Eliminar lección (local + Supabase)
  const handleToggleVisibility = async (id) => {
    const theme = LESSON_THEMES[id] || { name: 'Lección ' + id };
    const newHidden = !theme.hidden;
    const updated = { ...theme, hidden: newHidden };
    LESSON_THEMES[id] = updated;
    await db.from('lesson_themes').upsert({ lesson: id, name: updated.name, icon: updated.icon || id, hidden: newHidden });
    setStatus({ type: 'ok', msg: newHidden ? '🚫 Módulo ocultado para los alumnos.' : '👁️ Módulo visible para los alumnos.' });
    setVisibilityTick(t => t + 1);
  };

  const handleDeleteLesson = async (id) => {
    try {
      await db.from('vocabulary').delete().eq('lesson', id);
      await db.from('lesson_themes').delete().eq('lesson', id);
    } catch (e) { /* silencioso si no estaba en Supabase */ }
    const newVocab = { ...vocab };
    delete newVocab[id];
    onVocabUpdate(newVocab);
    setConfirmDelete(null);
    setStatus({ type: 'ok', msg: '✅ Lección ' + id + ' eliminada para todos.' });
  };

  const handleApply = () => {
    if (!text.trim()) { setStatus({ type: 'err', msg: 'Pegá el contenido del vocabulario antes de aplicar.' }); return; }
    try {
      const parsed = parseVocabText(text);
      const wordCount = Object.values(parsed).reduce((acc, arr) => acc + arr.length, 0);
      if (wordCount === 0) { setStatus({ type: 'err', msg: 'No se encontraron palabras.' }); return; }
      onVocabUpdate(parsed);
      setStatus({ type: 'ok', msg: 'Listo: ' + wordCount + ' palabras cargadas localmente.' });
    } catch (err) {
      setStatus({ type: 'err', msg: 'Error: ' + err.message });
    }
  };

  const handleReset = () => {
    setStatus({ type: 'ok', msg: 'Vocabulario original restaurado.' });
    setTimeout(() => window.location.reload(), 600);
  };

  // Abrir editor de palabras de una lección
  const handleEditLesson = (id) => {
    setEditingLesson(id);
    setEditWords((vocab[id] || []).map((w, i) => ({ ...w, _key: Date.now() + i })));
  };

  // Guardar palabras editadas a Supabase
  const handleSaveEditLesson = async () => {
    setUploading(true);
    try {
      const rows = editWords
        .filter(w => w.hanzi && w.pinyin && w.es)
        .map(w => ({ lesson: editingLesson, hanzi: w.hanzi.trim(), pinyin: w.pinyin.trim(), es: w.es.trim() }));
      if (rows.length === 0) { setStatus({ type: 'err', msg: 'No hay palabras válidas para guardar.' }); setUploading(false); return; }
      await db.from('vocabulary').delete().eq('lesson', editingLesson);
      const { error } = await db.from('vocabulary').insert(rows);
      if (error) throw error;
      const newVocab = { ...vocab, [editingLesson]: rows.map(r => ({ hanzi: r.hanzi, pinyin: r.pinyin, es: r.es })) };
      onVocabUpdate(newVocab);
      setStatus({ type: 'ok', msg: '✅ Lección ' + editingLesson + ' guardada con ' + rows.length + ' palabras para todos.' });
      setEditingLesson(null);
    } catch (err) {
      setStatus({ type: 'err', msg: 'Error: ' + err.message });
    }
    setUploading(false);
  };

  const updateEditWord = (key, field, value) => setEditWords(prev => prev.map(w => w._key === key ? { ...w, [field]: value } : w));
  const removeEditWord = (key) => setEditWords(prev => prev.filter(w => w._key !== key));
  const addEditWord = () => setEditWords(prev => [...prev, { hanzi: '', pinyin: '', es: '', _key: Date.now() }]);

  const totalWords = Object.values(vocab).reduce((acc, arr) => acc + arr.length, 0);

  if (loadingSession) return html('main', { style: { paddingTop: 40, textAlign: 'center' } }, '⏳ Cargando...');

  if (showSimulacro) return html(ExamenSimulacro, { onBack: () => setShowSimulacro(false) });

  // ── Editor de palabras ──
  if (editingLesson) {
    const theme = LESSON_THEMES[editingLesson] || { name: 'Lección ' + editingLesson };
    const inputStyle = { padding: '7px 9px', borderRadius: 8, border: '1.5px solid var(--paper-deep)', fontSize: 13, fontFamily: 'Nunito, sans-serif', width: '100%' };
    return html('main', { style: { paddingTop: 18, paddingBottom: 40 } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: () => setEditingLesson(null) }, '←'),
        html('div', null,
          html('h1', null, 'Editar lección ' + editingLesson),
          html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 } }, theme.name + ' · ' + editWords.length + ' palabras'),
        ),
      ),
      html('div', { className: 'admin-panel' },
        html('div', { style: { display: 'grid', gridTemplateColumns: '2fr 2fr 3fr auto', gap: 6, marginBottom: 6 } },
          html('div', { style: { fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: 0.5 } }, '汉字'),
          html('div', { style: { fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Pīnyīn'),
          html('div', { style: { fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Español'),
          html('div', null),
        ),
        html('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 } },
          editWords.map(w => html('div', { key: w._key, style: { display: 'grid', gridTemplateColumns: '2fr 2fr 3fr auto', gap: 6, alignItems: 'center' } },
            html('input', { value: w.hanzi, onChange: e => updateEditWord(w._key, 'hanzi', e.target.value), style: { ...inputStyle, fontFamily: 'Noto Serif SC, serif', fontSize: 16 } }),
            html('input', { value: w.pinyin, onChange: e => updateEditWord(w._key, 'pinyin', e.target.value), style: inputStyle }),
            html('input', { value: w.es, onChange: e => updateEditWord(w._key, 'es', e.target.value), style: inputStyle }),
            html('button', { onClick: () => removeEditWord(w._key), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--lacquer)', padding: '0 4px' } }, '🗑️'),
          )),
        ),
        html('button', { className: 'secondary-btn', style: { marginBottom: 16 }, onClick: addEditWord }, '+ Agregar palabra'),
        html('button', { className: 'primary-btn', onClick: handleSaveEditLesson, disabled: uploading }, uploading ? '⏳ Guardando...' : '💾 Guardar para todos'),
        status && html('div', { className: 'admin-status ' + (status.type === 'ok' ? 'ok' : 'err'), style: { marginTop: 10 } }, status.msg),
      ),
    );
  }

  return html('main', { style: { paddingTop: '18px' } },
    html('div', { className: 'header-row' },
      html('button', { className: 'back-btn', onClick: onBack }, '←'),
      html('h1', null, 'Administrar'),
    ),
    html('div', { className: 'admin-panel' },

      // ── Info vocab actual ──
      html('div', null,
        html('label', null, 'Vocabulario actual'),
        html('p', { className: 'admin-note', style: { marginTop: 6 } },
          totalWords + ' palabras en ' + Object.keys(vocab).filter(id => id !== 'mod-paises' && id !== 'mod-numeros').length + ' lecciones + 2 módulos especiales.'
        )
      ),

      // ── Panel admin/laoshi (según rol del perfil, no solo "hay sesión") ──
      isLaoshi
        ? html(React.Fragment, null,
            html('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--jade-light)', borderRadius: 12, padding: '10px 14px' } },
              html('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--jade-dark)' } }, (isAdmin ? '🔓 Admin: ' : '🏫 Laoshi: ') + session.user.email),
              html('button', { className: 'secondary-btn', style: { margin: 0, padding: '6px 14px', fontSize: 13 }, onClick: handleLogout }, 'Cerrar sesión'),
            ),

            html('button', {
              className: 'primary-btn',
              style: { marginTop: 8, width: '100%' },
              onClick: onReports,
            }, '📊 Ver reportes de mis clases'),

            html('button', {
              className: 'secondary-btn',
              style: { marginTop: 8, width: '100%', borderColor: 'var(--lacquer)', color: 'var(--lacquer)', fontWeight: 700 },
              onClick: () => setShowSimulacro(true),
            }, '模拟考试 · Simulacro de Examen Nivel III'),

            // ── Mis clases ──
            html('div', null,
              html('label', null, '🏫 Mis clases'),
              html('p', { className: 'admin-note', style: { margin: '6px 0 10px' } },
                'Creá una clase, compartile el código a tus alumnos y cargá de antemano los mails habilitados (solo ellos van a poder activar su cuenta con ese código).'
              ),
              html('form', { onSubmit: handleCreateClass, style: { display: 'flex', gap: 8, marginBottom: 14 } },
                html('input', {
                  value: newClassName, onChange: e => setNewClassName(e.target.value),
                  placeholder: 'Nombre de la clase (ej: Nivel 2 - Sábados)',
                  style: { flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--paper-deep)', fontSize: 14, fontFamily: 'Nunito, sans-serif' },
                }),
                html('button', { className: 'primary-btn', type: 'submit', style: { margin: 0, padding: '10px 16px' } }, '+ Crear'),
              ),
              classStatus && html('div', { className: 'admin-status ' + (classStatus.type === 'ok' ? 'ok' : 'err'), style: { marginBottom: 12 } }, classStatus.msg),
              loadingClasses
                ? html('p', { className: 'admin-note' }, 'Cargando clases...')
                : classes.length === 0
                  ? html('p', { className: 'admin-note' }, 'Todavía no creaste ninguna clase.')
                  : html('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
                      classes.map(c => html('div', {
                        key: c.id,
                        style: { background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--shadow-paper)' },
                      },
                        html('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
                          html('strong', { style: { fontSize: 15 } }, c.name),
                          html('span', {
                            style: { fontFamily: 'monospace', fontWeight: 800, fontSize: 16, letterSpacing: 1, background: 'var(--gold-light)', padding: '4px 10px', borderRadius: 8, cursor: 'pointer' },
                            title: 'Tocá para copiar',
                            onClick: () => { navigator.clipboard && navigator.clipboard.writeText(c.code); setClassStatus({ type: 'ok', msg: '📋 Código ' + c.code + ' copiado.' }); },
                          }, c.code),
                        ),
                        html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700, marginBottom: 10 } },
                          (rosterCounts[c.id] != null ? rosterCounts[c.id] : '…') + ' mail(s) habilitados · ' +
                          (memberCounts[c.id] != null ? memberCounts[c.id] : '…') + ' alumno(s) activado(s)'
                        ),
                        html('textarea', {
                          value: rosterDrafts[c.id] || '',
                          onChange: e => setRosterDrafts(prev => ({ ...prev, [c.id]: e.target.value })),
                          placeholder: 'Pegá los mails de tus alumnos (uno por línea, o separados por coma)',
                          rows: 3,
                          style: { width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid var(--paper-deep)', fontSize: 13, fontFamily: 'Nunito, sans-serif', marginBottom: 8 },
                        }),
                        html('button', {
                          className: 'secondary-btn', style: { fontSize: 13, padding: '7px 14px' },
                          onClick: () => handleAddRoster(c.id),
                        }, '➕ Agregar a la lista'),
                      ))
                    ),
            ),

            isAdmin && html('hr', { style: { border: 'none', borderTop: '1px solid var(--paper-deep)', margin: '8px 0' } }),

            isAdmin && html(React.Fragment, null,
            html('div', null,
              html('label', null, '➕ Cargar lecciones desde CSV'),
              html('p', { className: 'admin-note', style: { margin: '6px 0 10px' } },
                'El archivo puede contener ', html('strong', null, 'una o varias lecciones'),
                '. Las lecciones y nombres se detectan automáticamente. Si ya existe una lección con el mismo número, se reemplaza.'
              ),
              html('p', { className: 'admin-note', style: { fontFamily: 'monospace', background: 'var(--paper)', padding: '8px 10px', borderRadius: 8, fontSize: 12, whiteSpace: 'pre' } },
                'Lección,Nº,Pīnyīn,汉字,Tipo,Significado en español\nLección 1 — 你好 (Nǐ hǎo),1,nǐ,你,Pr.,tú\nLección 1 — 你好 (Nǐ hǎo),2,hǎo,好,A,bien / bueno'
              ),
              html('input', {
                type: 'file', accept: '.csv',
                style: { margin: '8px 0 10px', width: '100%' },
                onChange: (e) => setCsvFile(e.target.files[0] || null),
              }),
              csvFile && html('p', { className: 'admin-note', style: { margin: '0 0 8px', color: 'var(--ink-mid)' } }, '📄 ' + csvFile.name),
              html('button', {
                className: 'primary-btn',
                onClick: handleCsvUpload,
                disabled: uploading || !csvFile,
              }, uploading ? '⏳ Publicando lecciones...' : '➕ Publicar para todos'),
            ),

            html('hr', { style: { border: 'none', borderTop: '1px solid var(--paper-deep)', margin: '8px 0' } }),

            // ── Gestión de lecciones ──
            html('div', null,
              html('label', null, '📚 Lecciones cargadas'),
              html('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 } },
                Object.keys(vocab).sort().filter(id => id !== 'mod-paises' && id !== 'mod-numeros').map(id => {
                  const theme = LESSON_THEMES[id] || { name: 'Lección ' + id };
                  const count = vocab[id].length;
                  const isRenaming = renamingLesson === id;
                  const isConfirmingDelete = confirmDelete === id;
                  return html('div', {
                    key: id,
                    style: { background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-paper)', display: 'flex', flexDirection: 'column', gap: 6 }
                  },
                    html('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                      html('span', { className: 'hanzi-font', style: { fontSize: 22, color: 'var(--lacquer)', minWidth: 32 } }, theme.icon || id),
                      isRenaming
                        ? html('input', {
                            autoFocus: true,
                            value: renameValue,
                            onChange: e => setRenameValue(e.target.value),
                            onKeyDown: e => { if (e.key === 'Enter') handleRenameSave(id); if (e.key === 'Escape') setRenamingLesson(null); },
                            style: { flex: 1, padding: '6px 10px', borderRadius: 8, border: '2px solid var(--jade)', fontSize: 14, fontFamily: 'Nunito, sans-serif' }
                          })
                        : html('div', { style: { flex: 1 } },
                            html('div', { style: { fontWeight: 800, fontSize: 14 } }, 'Lección ' + id + ' · ' + theme.name),
                            html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 } }, count + ' palabras'),
                          ),
                      isRenaming
                        ? html(React.Fragment, null,
                            html('button', { onClick: () => handleRenameSave(id), style: { background: 'var(--jade)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 800, cursor: 'pointer', fontSize: 13 } }, '✓ Guardar'),
                            html('button', { onClick: () => setRenamingLesson(null), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink-soft)' } }, '✕'),
                          )
                        : html(React.Fragment, null,
                            html('button', { onClick: () => handleToggleVisibility(id), title: theme.hidden ? 'Mostrar a alumnos' : 'Ocultar a alumnos', style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: theme.hidden ? 0.4 : 1 } }, theme.hidden ? '🚫' : '👁️'),
                            html('button', { onClick: () => handleEditLesson(id), title: 'Editar palabras', style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 } }, '📝'),
                            html('button', { onClick: () => handleRenameLesson(id), title: 'Renombrar', style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 } }, '✏️'),
                            html('button', { onClick: () => setConfirmDelete(id), title: 'Eliminar', style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 } }, '🗑️'),
                          ),
                    ),
                    isConfirmingDelete && html('div', { style: { background: '#FDE4DD', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
                      html('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--lacquer-dark)' } }, '¿Eliminar "' + theme.name + '" y sus ' + count + ' palabras?'),
                      html('div', { style: { display: 'flex', gap: 6 } },
                        html('button', { onClick: () => handleDeleteLesson(id), style: { background: 'var(--lacquer)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 800, cursor: 'pointer', fontSize: 13 } }, 'Eliminar'),
                        html('button', { onClick: () => setConfirmDelete(null), style: { background: 'none', border: '2px solid var(--paper-deep)', borderRadius: 8, padding: '6px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13 } }, 'Cancelar'),
                      ),
                    ),
                  );
                })
              ),
            ),

            html('hr', { style: { border: 'none', borderTop: '1px solid var(--paper-deep)', margin: '8px 0' } }),

            // ── Módulos especiales (países y números) ──
            html('div', null,
              html('label', null, '🌍 Módulos especiales'),
              html('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 } },
                ['9', '10'].filter(id => vocab[id]).map(id => {
                  const theme = LESSON_THEMES[id] || { name: 'Módulo ' + id };
                  const count = vocab[id].length;
                  const isRenaming = renamingLesson === id;
                  const isConfirmingDelete = confirmDelete === id;
                  return html('div', {
                    key: id,
                    style: { background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-paper)', display: 'flex', flexDirection: 'column', gap: 6 }
                  },
                    html('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                      html('span', { className: 'hanzi-font', style: { fontSize: 22, color: 'var(--lacquer)', minWidth: 32 } }, theme.icon || id),
                      isRenaming
                        ? html('input', {
                            autoFocus: true,
                            value: renameValue,
                            onChange: e => setRenameValue(e.target.value),
                            onKeyDown: e => { if (e.key === 'Enter') handleRenameSave(id); if (e.key === 'Escape') setRenamingLesson(null); },
                            style: { flex: 1, padding: '6px 10px', borderRadius: 8, border: '2px solid var(--jade)', fontSize: 14, fontFamily: 'Nunito, sans-serif' }
                          })
                        : html('div', { style: { flex: 1 } },
                            html('div', { style: { fontWeight: 800, fontSize: 14 } }, theme.name),
                            html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 } }, count + ' palabras'),
                          ),
                      isRenaming
                        ? html(React.Fragment, null,
                            html('button', { onClick: () => handleRenameSave(id), style: { background: 'var(--jade)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 800, cursor: 'pointer', fontSize: 13 } }, '✓ Guardar'),
                            html('button', { onClick: () => setRenamingLesson(null), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink-soft)' } }, '✕'),
                          )
                        : html(React.Fragment, null,
                            html('button', { onClick: () => handleToggleVisibility(id), title: theme.hidden ? 'Mostrar a alumnos' : 'Ocultar a alumnos', style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: theme.hidden ? 0.4 : 1 } }, theme.hidden ? '🚫' : '👁️'),
                            html('button', { onClick: () => handleEditLesson(id), title: 'Editar palabras', style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 } }, '📝'),
                            html('button', { onClick: () => handleRenameLesson(id), title: 'Renombrar', style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 } }, '✏️'),
                            html('button', { onClick: () => setConfirmDelete(id), title: 'Eliminar', style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 } }, '🗑️'),
                          ),
                    ),
                    isConfirmingDelete && html('div', { style: { background: '#FDE4DD', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
                      html('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--lacquer-dark)' } }, '¿Eliminar "' + theme.name + '" y sus ' + count + ' palabras?'),
                      html('div', { style: { display: 'flex', gap: 6 } },
                        html('button', { onClick: () => handleDeleteLesson(id), style: { background: 'var(--lacquer)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 800, cursor: 'pointer', fontSize: 13 } }, 'Eliminar'),
                        html('button', { onClick: () => setConfirmDelete(null), style: { background: 'none', border: '2px solid var(--paper-deep)', borderRadius: 8, padding: '6px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13 } }, 'Cancelar'),
                      ),
                    ),
                  );
                })
              ),
            ),

            html('hr', { style: { border: 'none', borderTop: '1px solid var(--paper-deep)', margin: '8px 0' } }),

            // ── Módulos de práctica ──
            html('div', null,
              html('label', null, '🎮 Módulos de práctica'),
              html('p', { className: 'admin-note', style: { margin: '6px 0 10px' } }, 'Activá o desactivá cada módulo para todos los alumnos.'),
              html('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                [
                  { id: 'mod-clas',     icon: '🔢', name: 'Clasificadores',       editable: true },
                  { id: 'mod-dialogo',  icon: '💬', name: 'Completa el diálogo',  editable: true },
                  { id: 'mod-orden',    icon: '🔀', name: 'Ordena la oración',    editable: true },
                  { id: 'mod-audio',    icon: '🔊', name: 'Reconocer por audio',  editable: false },
                  { id: 'mod-refuerzo', icon: '💪', name: 'Reforcemos',           editable: false },
                ].map(m => {
                  const theme = LESSON_THEMES[m.id] || {};
                  const isHidden = !!theme.hidden;
                  const isOpen = expandedMod === m.id;
                  return html('div', { key: m.id },
                    html('div', {
                      style: { background: '#fff', borderRadius: isOpen ? '12px 12px 0 0' : 12, padding: '10px 14px', boxShadow: 'var(--shadow-paper)', display: 'flex', alignItems: 'center', gap: 10, opacity: isHidden ? 0.6 : 1 }
                    },
                      html('span', { style: { fontSize: 22, minWidth: 32 } }, m.icon),
                      html('div', { style: { flex: 1, fontWeight: 700, fontSize: 14 } }, m.name),
                      m.editable && html('button', {
                        onClick: () => setExpandedMod(isOpen ? null : m.id),
                        title: isOpen ? 'Cerrar editor' : 'Editar preguntas',
                        style: { background: isOpen ? 'var(--lacquer)' : 'var(--paper-deep)', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: isOpen ? '#fff' : 'var(--ink)', marginRight: 4 }
                      }, isOpen ? '▲ Editar' : '▼ Editar'),
                      html('button', {
                        onClick: () => handleToggleVisibility(m.id),
                        title: isHidden ? 'Mostrar a alumnos' : 'Ocultar a alumnos',
                        style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: isHidden ? 0.4 : 1 }
                      }, isHidden ? '🚫' : '👁️'),
                    ),
                    isOpen && html('div', {
                      style: { background: 'var(--paper)', borderRadius: '0 0 12px 12px', padding: '12px 14px', boxShadow: 'var(--shadow-paper)', borderTop: '1px solid var(--paper-deep)' }
                    },
                      html(ModuleQuestionsEditor, { modId: m.id })
                    ),
                  );
                })
              ),
            ),

            html('hr', { style: { border: 'none', borderTop: '1px solid var(--paper-deep)', margin: '8px 0' } }),

            // ── Log de inicios de sesión ──
            html('div', null,
              html('label', null, '🕒 Registro de inicios de sesión'),
              html('p', { className: 'admin-note', style: { margin: '6px 0 10px' } }, 'Últimos 50 accesos al panel de administrador.'),
              !showLoginLog
                ? html('button', { className: 'secondary-btn', onClick: loadLoginLog }, 'Ver registro')
                : html('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                    loginLog.length === 0
                      ? html('p', { className: 'admin-note' }, 'Sin registros todavía.')
                      : loginLog.map((r, i) => html('div', {
                          key: i,
                          style: { background: '#fff', borderRadius: 10, padding: '8px 12px', boxShadow: 'var(--shadow-paper)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }
                        },
                          html('span', { style: { fontWeight: 700 } }, r.email),
                          html('span', { style: { color: 'var(--ink-soft)' } }, new Date(r.created_at).toLocaleString('es-AR')),
                        ))
                  ),
            ),

            html('hr', { style: { border: 'none', borderTop: '1px solid var(--paper-deep)', margin: '8px 0' } }),

            // ── Log de actividad de alumnos ──
            html('div', null,
              html('label', null, '👥 Actividad de alumnos'),
              html('p', { className: 'admin-note', style: { margin: '6px 0 10px' } }, 'Nombre, hora de conexión, última actividad y nivel máximo alcanzado.'),
              !showActivityLog
                ? html('button', { className: 'secondary-btn', onClick: loadActivityLog }, 'Ver registro')
                : html('div', null,
                    html('button', { className: 'secondary-btn', style: { marginBottom: 10, fontSize: 12 }, onClick: loadActivityLog }, '🔄 Actualizar'),
                    activityLog.length === 0
                      ? html('p', { className: 'admin-note' }, 'Sin registros todavía.')
                      : html('div', { style: { overflowX: 'auto' } },
                          html('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
                            html('thead', null,
                              html('tr', null,
                                ['Alumno','Conexión','Última actividad','Lección','Juego','%'].map(h =>
                                  html('th', { key: h, style: { background: 'var(--paper-deep)', padding: '7px 10px', textAlign: 'left', fontWeight: 800, color: 'var(--ink-soft)', whiteSpace: 'nowrap' } }, h)
                                )
                              )
                            ),
                            html('tbody', null,
                              activityLog.map((r, i) => {
                                const gameLabels = { clas: 'Clasificadores', modal: 'Verbos modales', tiempo: 'Tiempo', dialogo: 'Diálogo', orden: 'Ordenar', audio: 'Audio' };
                                const lessonLabel = r.max_lesson ? (LESSON_THEMES[r.max_lesson] ? LESSON_THEMES[r.max_lesson].name : 'Lección ' + r.max_lesson) : '—';
                                return html('tr', { key: i, style: { borderBottom: '1px solid var(--paper-deep)', background: i % 2 === 0 ? '#fff' : 'var(--paper)' } },
                                  html('td', { style: { padding: '7px 10px', fontWeight: 700 } }, r.name),
                                  html('td', { style: { padding: '7px 10px', color: 'var(--ink-soft)', whiteSpace: 'nowrap' } }, new Date(r.connected_at).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })),
                                  html('td', { style: { padding: '7px 10px', color: 'var(--ink-soft)', whiteSpace: 'nowrap' } }, r.last_active ? new Date(r.last_active).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—'),
                                  html('td', { style: { padding: '7px 10px' } }, lessonLabel),
                                  html('td', { style: { padding: '7px 10px' } }, r.max_game ? (gameLabels[r.max_game] || r.max_game) : '—'),
                                  html('td', { style: { padding: '7px 10px', fontWeight: 700, color: r.max_game_score >= 80 ? 'var(--jade-dark)' : r.max_game_score >= 50 ? 'var(--gold-dark)' : 'var(--lacquer)' } },
                                    r.max_game_score ? r.max_game_score + '%' : '—'
                                  ),
                                );
                              })
                            )
                          )
                        )
                  ),
            ),
            html('hr', { style: { border: 'none', borderTop: '1px solid var(--paper-deep)', margin: '8px 0' } }),

            // ── Configuración del app ──
            html('div', null,
              html('label', null, '⚙️ Configuración del app'),
              html('p', { className: 'admin-note', style: { margin: '6px 0 12px' } }, 'Editá los textos y módulos de la app sin tocar código.'),
              html(AppConfigEditor, { appConfig: appConfig || {}, onAppConfigChange }),
            ),

            ), // cierre isAdmin &&
          )

        // ── Login ──
        : html('div', null,
            html('label', null, '🔐 Acceso admin'),
            html('p', { className: 'admin-note', style: { marginBottom: 14 } }, 'Solo el administrador puede cargar vocabulario para todos los usuarios.'),
            html('form', { onSubmit: handleLogin, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              html('input', { type: 'email', placeholder: 'Email', value: email, onChange: e => setEmail(e.target.value), style: { padding: '12px 14px', borderRadius: 12, border: '2px solid var(--paper-deep)', fontSize: 15, fontFamily: 'Nunito, sans-serif' } }),
              html('input', { type: 'password', placeholder: 'Contraseña', value: password, onChange: e => setPassword(e.target.value), style: { padding: '12px 14px', borderRadius: 12, border: '2px solid var(--paper-deep)', fontSize: 15, fontFamily: 'Nunito, sans-serif' } }),
              loginStatus && html('div', { className: 'admin-status err' }, loginStatus.msg),
              html('button', {
                type: 'submit', className: 'primary-btn', style: { marginTop: 4 },
                disabled: loginBlocked,
              }, loginBlocked ? '🔒 Bloqueado — ' + loginCooldown + 's' : 'Iniciar sesión'),
            ),
          ),

      // ── Reiniciar progreso (visible para todos) ──
      html('div', { style: { borderTop: '1px solid var(--paper-deep)', paddingTop: 16, marginTop: 8 } },
        html('label', null, '🔄 Mi progreso'),
        html('p', { className: 'admin-note', style: { margin: '6px 0 12px' } },
          'Borra todo tu progreso local: puntajes, estrellas, nombre y errores guardados. No afecta a otros usuarios.'
        ),
        confirmDelete === 'reset'
          ? html('div', { style: { background: '#FDE4DD', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 } },
              html('span', { style: { fontWeight: 800, fontSize: 14, color: 'var(--lacquer-dark)' } }, '¿Seguro que querés borrar todo tu progreso? Esta acción no se puede deshacer.'),
              html('div', { style: { display: 'flex', gap: 8 } },
                html('button', {
                  className: 'primary-btn', style: { margin: 0, background: 'var(--lacquer)' },
                  onClick: () => {
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(NAME_KEY);
                    setConfirmDelete(null);
                    setTimeout(() => window.location.reload(), 300);
                  }
                }, '🗑️ Sí, borrar todo'),
                html('button', { className: 'secondary-btn', style: { margin: 0 }, onClick: () => setConfirmDelete(null) }, 'Cancelar'),
              ),
            )
          : html('button', {
              className: 'secondary-btn',
              style: { borderColor: 'var(--lacquer)', color: 'var(--lacquer)' },
              onClick: () => setConfirmDelete('reset'),
            }, '🔄 Reiniciar mi progreso'),
      ),

      status && html('div', { className: 'admin-status ' + (status.type === 'ok' ? 'ok' : 'err') }, status.msg),
    )
  );
}

// ----------------- Prueba: resultado -----------------
function PruebaResult({ percent, total, correct, missed, onRetry, onBack, playerName }) {
  let title;
  if (percent === 100) title = (playerName ? '¡Perfecto, ' + playerName + '!' : '¡Perfecto!');
  else if (percent >= 80) title = (playerName ? '¡Muy bien, ' + playerName + '!' : '¡Muy bien!');
  else if (percent >= 60) title = 'Buen intento' + (playerName ? ', ' + playerName : '');
  else title = 'Seguí practicando' + (playerName ? ', ' + playerName : '');
  return html('main', { style: { paddingTop: '18px', paddingBottom: 40 } },
    html('div', { className: 'result-screen' },
      html('div', { className: 'result-seal hanzi-font' + (percent === 100 ? ' celebrate' : '') },
        html('div', { className: 'pct' }, percent === 100 ? '完' : percent + '%'),
        html('div', { className: 'label' }, percent === 100 ? '100%' : 'SCORE')
      ),
      html('div', { className: 'result-title' }, title),
      html('div', { className: 'result-sub' }, correct + ' de ' + total + ' correctas'),
      html('div', { className: 'result-actions' },
        html('button', { className: 'primary-btn', onClick: onRetry }, 'Volver a intentar'),
        html('button', { className: 'secondary-btn', onClick: onBack }, 'Volver al inicio'),
      ),
      missed && missed.length > 0 && html('div', { className: 'review-list', style: { textAlign: 'left', width: '100%', marginTop: 8 } },
        html('div', { className: 'review-list-title' }, 'Para repasar (' + missed.length + ')'),
        missed.map((m, i) => html('div', { key: i, className: 'review-item', style: { flexDirection: 'column', alignItems: 'flex-start', gap: 3 } },
          html('div', { className: 'hanzi-font', style: { fontSize: 16, fontWeight: 700 } }, m.hanzi),
          html('div', { style: { fontSize: 12, color: 'var(--lacquer-dark)', fontWeight: 700 } }, m.pinyin),
          html('div', { style: { fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 } }, m.es),
        ))
      )
    )
  );
}

// ----------------- Preguntas de juegos: 100% desde Supabase -----------------
// Los 3 juegos de abajo (Clasificadores/Diálogo/Ordenar) ya no traen su
// banco de preguntas hardcodeado: lo piden a Supabase al montar. Mientras
// llega, muestran un loader; si no hay preguntas cargadas todavía, avisan.
function GameStatusScreen({ onBack, title, msg, onRetry }) {
  return html('main', { style: { paddingTop: '18px' } },
    html('div', { className: 'header-row' },
      html('button', { className: 'back-btn', onClick: onBack }, '←'),
      html('h1', null, title),
    ),
    html('div', { style: { textAlign: 'center', marginTop: 40 } },
      html('p', { className: 'admin-note' }, msg),
      onRetry && html('button', { className: 'secondary-btn', style: { marginTop: 12 }, onClick: onRetry }, '🔄 Reintentar')
    )
  );
}

function nfcRow(r) {
  if (!r || typeof r !== 'object') return r;
  const out = {};
  Object.keys(r).forEach(k => { out[k] = typeof r[k] === 'string' ? nfc(r[k]) : r[k]; });
  return out;
}

// ── Pinyin con colores de tono ────────────────────────────────────────────────
function getTone(syllable) {
  if (/[āēīōūǖ]/.test(syllable)) return 1;
  if (/[áéíóúǘ]/.test(syllable)) return 2;
  if (/[ǎěǐǒǔǚ]/.test(syllable)) return 3;
  if (/[àèìòùǜ]/.test(syllable)) return 4;
  return 0;
}
const TONE_COLORS = { 1: '#3B82F6', 2: '#16A34A', 3: '#EA580C', 4: '#C1432B', 0: '#888' };

function TonedPinyin({ text, style, className }) {
  if (!text) return null;
  const segments = String(text).split(/(\s+)/);
  return html('span', { style, className },
    ...segments.map((seg, i) =>
      /^\s+$/.test(seg)
        ? seg
        : html('span', { key: i, style: { color: TONE_COLORS[getTone(seg)] } }, seg)
    )
  );
}

// ── Error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return html('div', { style: { padding: '48px 24px', textAlign: 'center' } },
      html('div', { style: { fontSize: 56 } }, '😕'),
      html('h2', { style: { margin: '16px 0 8px' } }, 'Algo salió mal'),
      html('p', { style: { color: '#888', marginBottom: 20 } }, 'Recargá la página para continuar.'),
      html('button', { className: 'primary-btn', onClick: () => window.location.reload() }, 'Recargar página')
    );
    return this.props.children;
  }
}

function useGameQuestions(table, select, mapRow) {
  const [state, setState] = useState({ data: null, error: false });
  const load = () => {
    setState({ data: null, error: false });
    db.from(table).select(select).eq('active', true).then(({ data, error: err }) => {
      if (err) setState({ data: null, error: true });
      else setState({ data: (data || []).map(r => mapRow(nfcRow(r))), error: false });
    });
  };
  useEffect(() => { load(); }, []);
  return [state.data, state.error, load];
}

// ----------------- Ejercicios del Libro: Discriminación auditiva -----------------
// Ejercicios reales del Libro de Ejercicios (fotos del libro físico), agrupados
// por número de ejercicio (1=sonido, 2=tono, 3=marcar tono, 4=tercer tono/tono neutro).
// El libro no imprime la clave de respuestas (se corrige con el CD + el profesor),
// así que este ejercicio no marca correcto/incorrecto: trackea avance, no precisión.
function WorkbookListeningGame({ lessonId, onBack, playerName, onFinish }) {
  const [items, setItems] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    let alive = true;
    db.from('listening_exercises').select('id,ejercicio,tipo,item_num,options')
      .eq('lesson', lessonId).order('ejercicio').order('item_num')
      .then(({ data }) => { if (alive) setItems(data || []); });
    db.from('lesson_audio').select('id,title,storage_path').eq('lesson', lessonId).order('position')
      .then(({ data }) => { if (alive) setTracks(data || []); });
    return () => { alive = false; };
  }, [lessonId]);

  if (items === null) return html(GameStatusScreen, { onBack, title: 'Discriminación auditiva', msg: '⏳ Cargando...' });
  if (items.length === 0) return html(GameStatusScreen, { onBack, title: 'Discriminación auditiva', msg: 'Todavía no hay ejercicios cargados para esta lección.' });

  const groups = {};
  items.forEach(it => {
    const key = it.ejercicio + ':' + it.tipo;
    (groups[key] = groups[key] || []).push(it);
  });

  const tipoLabel = { sonido: 'Rodeá el sonido correcto según lo que escuchás',
    tono: 'Rodeá el tono correcto según lo que escuchás',
    marcar_tono: 'Marcá el tono correcto sobre la sílaba',
    tono_neutro: 'Rodeá los tonos neutros',
    tercer_tono: 'Rodeá la variación del tercer tono' };

  const pick = (id, idx) => setAnswers(prev => ({ ...prev, [id]: idx }));
  const answeredCount = Object.keys(answers).length;
  const percent = Math.round((answeredCount / items.length) * 100);

  return html('main', { style: { paddingTop: 18, paddingBottom: 40 } },
    html('div', { className: 'header-row' },
      html('button', { className: 'back-btn', onClick: onBack }, '←'),
      html('h1', null, 'Discriminación auditiva'),
    ),
    tracks.length > 0 && html('div', { className: 'admin-panel', style: { marginBottom: 16 } },
      html('label', null, '🎧 Audio de la lección'),
      html('p', { className: 'admin-note', style: { margin: '6px 0 10px' } }, 'Escuchalo y marcá lo que corresponda en cada ejercicio. No se autocorrige (como en el libro): tu laoshi lo revisa.'),
      tracks.map(t => html('audio', { key: t.id, controls: true, preload: 'none', style: { width: '100%', marginTop: 6 },
        src: db.storage.from('lesson-audio').getPublicUrl(t.storage_path).data.publicUrl }))
    ),
    html('div', { className: 'admin-note', style: { textAlign: 'center', marginBottom: 14 } }, 'Marcado: ' + answeredCount + '/' + items.length),
    Object.keys(groups).sort().map(key => {
      const [ejercicio, tipo] = key.split(':');
      return html('div', { key, className: 'admin-panel', style: { marginBottom: 14 } },
        html('label', null, 'Ejercicio ' + ejercicio + ' · ' + (tipoLabel[tipo] || tipo)),
        html('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 } },
          groups[key].map(it => html('div', { key: it.id },
            html('div', { style: { fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)', marginBottom: 4 } }, it.item_num + ')'),
            html('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
              it.options.map((opt, idx) => html('button', {
                key: idx,
                onClick: () => pick(it.id, idx),
                style: {
                  padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  border: answers[it.id] === idx ? '2px solid var(--lacquer)' : '1.5px solid var(--paper-deep)',
                  background: answers[it.id] === idx ? '#FDE4DD' : '#fff',
                  color: answers[it.id] === idx ? 'var(--lacquer-dark)' : 'var(--ink)',
                },
              }, opt))
            )
          ))
        )
      );
    }),
    html('button', {
      className: 'primary-btn', style: { width: '100%', marginTop: 8 },
      onClick: () => { if (onFinish) onFinish(percent, []); onBack(); },
    }, 'Terminar (' + percent + '% marcado)')
  );
}

// ----------------- Ejercicios del Libro: Trazo de caracteres -----------------
function StrokeCanvas() {
  const canvasRef = React.useRef(null);
  const drawing = React.useRef(false);
  const start = (e) => {
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    ctx.beginPath();
    ctx.moveTo(p.clientX - rect.left, p.clientY - rect.top);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.strokeStyle = '#C1432B';
    ctx.lineTo(p.clientX - rect.left, p.clientY - rect.top);
    ctx.stroke();
  };
  const end = () => { drawing.current = false; };
  const clear = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
  };
  return html('div', null,
    html('canvas', {
      ref: canvasRef, width: 280, height: 280,
      style: { width: '100%', maxWidth: 280, aspectRatio: '1', background: '#fff', borderRadius: 12, border: '2px dashed var(--paper-deep)', touchAction: 'none', display: 'block', margin: '0 auto' },
      onMouseDown: start, onMouseMove: move, onMouseUp: end, onMouseLeave: end,
      onTouchStart: start, onTouchMove: move, onTouchEnd: end,
    }),
    html('button', { className: 'secondary-btn', style: { marginTop: 8, fontSize: 13, padding: '6px 14px' }, onClick: clear }, '🧹 Borrar y reintentar')
  );
}

function WorkbookStrokeGame({ lessonId, onBack }) {
  const [chars, setChars] = useState(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    db.from('stroke_practice').select('id,hanzi,pinyin,strokes,es').eq('lesson', lessonId).order('position')
      .then(({ data }) => { if (alive) setChars((data || []).map(r => ({ ...r, hanzi: nfc(r.hanzi), pinyin: nfc(r.pinyin), es: nfc(r.es) }))); });
    return () => { alive = false; };
  }, [lessonId]);

  if (chars === null) return html(GameStatusScreen, { onBack, title: 'Trazo de caracteres', msg: '⏳ Cargando...' });
  if (chars.length === 0) return html(GameStatusScreen, { onBack, title: 'Trazo de caracteres', msg: 'Todavía no hay caracteres cargados para esta lección.' });

  const c = chars[index];
  return html('main', { style: { paddingTop: 18, paddingBottom: 40 } },
    html('div', { className: 'header-row' },
      html('button', { className: 'back-btn', onClick: onBack }, '←'),
      html('h1', null, 'Trazo de caracteres'),
      html('div', { className: 'flash-counter' }, (index + 1) + '/' + chars.length),
    ),
    html('div', { className: 'admin-panel', style: { textAlign: 'center' } },
      html('div', { className: 'hanzi-font', style: { fontSize: 64, color: 'var(--lacquer)' } }, c.hanzi),
      html('div', { style: { fontWeight: 800, fontSize: 18, marginTop: 4 } }, c.pinyin),
      html('div', { style: { fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 } }, c.es),
      html('div', { className: 'hanzi-font', style: { fontSize: 20, letterSpacing: 4, color: 'var(--jade-dark)', margin: '10px 0' } }, c.strokes),
      html(StrokeCanvas, { key: c.id }),
    ),
    html('div', { style: { display: 'flex', gap: 10, marginTop: 14 } },
      index > 0 && html('button', { className: 'secondary-btn', style: { flex: 1 }, onClick: () => setIndex(index - 1) }, '← Anterior'),
      index < chars.length - 1
        ? html('button', { className: 'primary-btn', style: { flex: 1 }, onClick: () => setIndex(index + 1) }, 'Siguiente →')
        : html('button', { className: 'primary-btn', style: { flex: 1 }, onClick: onBack }, '✓ Terminar'),
    )
  );
}

// ----------------- Prueba: Clasificadores -----------------
function ClasificadorGame(props) {
  const { tipo = 'clasificador' } = props;
  const titles = { clasificador: 'Clasificadores', modal: 'Verbos modales', tiempo: 'Expresiones de tiempo' };
  const title = titles[tipo] || 'Clasificadores';
  const [raw, setRaw] = useState(null);
  const [rawErr, setRawErr] = useState(false);
  const load = () => {
    setRaw(null); setRawErr(false);
    db.from('clasificador_questions').select('sentence,pinyin,answer,answer_pinyin,options,hint,tipo')
      .eq('active', true).eq('tipo', tipo)
      .then(({ data, error: err }) => {
        if (err) setRawErr(true);
        else setRaw((data || []).map(nfcRow));
      });
  };
  useEffect(() => { load(); }, [tipo]);
  if (rawErr) return html(GameStatusScreen, { onBack: props.onBack, title, msg: '❌ Error de conexión.', onRetry: load });
  if (raw === null) return html(GameStatusScreen, { onBack: props.onBack, title, msg: '⏳ Cargando preguntas...' });
  if (raw.length === 0) return html(GameStatusScreen, { onBack: props.onBack, title, msg: 'Todavía no hay preguntas cargadas. Pedile a tu laoshi que las suba.' });
  // Priorizar preguntas previamente fallidas (match por answer)
  const priorMissed = new Set((props.priorMissed || []).map(m => m.hanzi));
  const ordered = [
    ...raw.filter(q => priorMissed.has(q.sentence.replace('___', q.answer))),
    ...shuffle(raw.filter(q => !priorMissed.has(q.sentence.replace('___', q.answer)))),
  ];
  return html(ClasificadorGameBody, { ...props, title, rawQuestions: ordered });
}
function ClasificadorGameBody({ onBack, onFinish, playerName, rawQuestions, title }) {
  const questions = useMemo(() => shuffle(rawQuestions), []);
  const [index, setIndex] = useState(0);
  const [opts, setOpts] = useState(() => shuffle([...questions[0].options]));
  const [selected, setSelected] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [missed, setMissed] = useState([]);
  const [done, setDone] = useState(false);

  const q = questions[index];
  const isCorrect = selected && selected === q.answer;
  const parts = q.sentence.split('___');
  const fullSentence = q.sentence.replace('___', q.answer);
  const fullPinyin = q.pinyin.replace('___', q.answer_pinyin || q.answer);

  const [newCorrectRef, setNewCorrectRef] = useState(0);
  const [showPinyin, setShowPinyin] = useState(false);

  const handlePick = (opt) => {
    if (selected) return;
    setSelected(opt);
    setShowPinyin(false);
    const ok = opt === q.answer;
    if (ok) playCorrect(); else playWrong();
    speak(fullSentence);
    const nc = correct + (ok ? 1 : 0);
    setNewCorrectRef(nc);
    if (ok) setCorrect(nc);
    else {
      setErrors(e => e + 1);
      setMissed(m => [...m, { hanzi: fullSentence, pinyin: fullPinyin, es: q.hint }]);
    }
  };

  const handleNext = () => {
    const next = index + 1;
    if (next >= questions.length) {
      // Use newCorrectRef (updated synchronously) to avoid stale-closure on `correct`
      const finalCorrect = newCorrectRef;
      const pct = Math.round((finalCorrect / questions.length) * 100);
      if (onFinish) onFinish(pct, missed);
      setDone(true);
    } else { setIndex(next); setOpts(shuffle([...questions[next].options])); setSelected(null); setShowPinyin(false); }
  };

  if (done) return html(PruebaResult, {
    percent: Math.round((newCorrectRef / questions.length) * 100),
    total: questions.length, correct: newCorrectRef, missed,
    onRetry: () => { setIndex(0); setOpts(shuffle([...questions[0].options])); setSelected(null); setCorrect(0); setNewCorrectRef(0); setErrors(0); setMissed([]); setDone(false); },
    onBack, playerName,
  });

  return html(React.Fragment, null,
    html('main', { style: { paddingTop: '18px' } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, title || 'Clasificadores'),
        html('div', { className: 'flash-counter' }, (index + 1) + '/' + questions.length),
      ),
      html('div', { className: 'flash-score-row' },
        html('div', { className: 'flash-score-chip no' }, html('i', null, '✕'), 'Errores: ' + errors),
        html('div', { className: 'flash-score-chip yes' }, html('i', null, '✓'), 'Correctas: ' + correct),
      ),
      html('div', { className: 'clas-sentence' },
        parts[0],
        html('span', { className: 'clas-blank', style: selected ? { color: isCorrect ? 'var(--jade-dark)' : 'var(--error)' } : {} }, selected || ''),
        parts[1] || ''
      ),
      !selected && html('button', {
        className: 'pinyin-toggle-btn',
        onClick: () => setShowPinyin(v => !v),
      }, showPinyin ? '🙈 Ocultar pīnyīn' : '👁 Ver pīnyīn'),
      showPinyin && !selected && html(TonedPinyin, { text: q.pinyin, className: 'clas-pinyin' }),
      html('div', { className: 'clas-hint' }, q.hint),
      selected
        ? html(React.Fragment, null,
            html('div', { style: { borderRadius: 16, padding: '18px 20px', textAlign: 'center', fontWeight: 800, marginBottom: 12,
                background: isCorrect ? 'var(--jade-light)' : '#FDE4DD',
                color: isCorrect ? 'var(--jade-dark)' : 'var(--lacquer-dark)' } },
              html('div', { style: { fontSize: 40 } }, isCorrect ? '✓' : '✗'),
              html('div', { style: { fontSize: 22, marginTop: 4 } }, isCorrect ? '¡Correcto!' : 'Incorrecto'),
              html('div', { className: 'hanzi-font', style: { fontSize: 26, marginTop: 10 } }, fullSentence),
              html(TonedPinyin, { text: fullPinyin, style: { fontSize: 14, marginTop: 4, opacity: 0.85, display: 'block' } }),
              html('div', { style: { fontSize: 13, marginTop: 2, opacity: 0.75 } }, q.hint),
            ),
            html('button', { className: 'primary-btn', onClick: handleNext },
              index + 1 >= questions.length ? 'Ver resultado' : 'Siguiente →'
            )
          )
        : html('div', { className: 'quiz-options' },
            opts.map(opt => html('button', { key: opt, className: 'quiz-option', onClick: () => handlePick(opt) }, opt))
          )
    )
  );
}

// ----------------- Prueba: Diálogo -----------------
function DialogoGame(props) {
  const [raw, rawErr, rawReload] = useGameQuestions(
    'dialogo_questions',
    'context,line_a,line_b,blank_in,answer,answer_pinyin,answer_es,options,explanation',
    r => ({ context: r.context, A: r.line_a, B: r.line_b, blankIn: r.blank_in, answer: r.answer, answerPinyin: r.answer_pinyin, answerEs: r.answer_es, options: r.options, explanation: r.explanation })
  );
  if (rawErr) return html(GameStatusScreen, { onBack: props.onBack, title: 'Completa el diálogo', msg: '❌ Error de conexión.', onRetry: rawReload });
  if (raw === null) return html(GameStatusScreen, { onBack: props.onBack, title: 'Completa el diálogo', msg: '⏳ Cargando preguntas...' });
  if (raw.length === 0) return html(GameStatusScreen, { onBack: props.onBack, title: 'Completa el diálogo', msg: 'Todavía no hay preguntas cargadas. Pedile a tu laoshi que las suba desde el panel de administrador.' });
  // Priorizar preguntas previamente fallidas
  const priorMissed = new Set((props.priorMissed || []).map(m => m.hanzi));
  const ordered = [
    ...raw.filter(q => priorMissed.has(q.answer)),
    ...shuffle(raw.filter(q => !priorMissed.has(q.answer))),
  ];
  return html(DialogoGameBody, { ...props, rawQuestions: ordered });
}
function DialogoGameBody({ onBack, onFinish, playerName, rawQuestions }) {
  const questions = useMemo(() => shuffle(rawQuestions), []);
  const [index, setIndex] = useState(0);
  const [opts, setOpts] = useState(() => shuffle([...questions[0].options]));
  const [selected, setSelected] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [missed, setMissed] = useState([]);
  const [done, setDone] = useState(false);

  const q = questions[index];
  const isCorrect = selected && selected === q.answer;

  const [correctRef, setCorrectRef] = useState(0);

  const handlePick = (opt) => {
    if (selected) return;
    setSelected(opt);
    const ok = opt === q.answer;
    if (ok) playCorrect(); else playWrong();
    speak(q.blankIn === 'A' ? q.A.replace('___', q.answer) : q.B.replace('___', q.answer));
    const newCorrect = correctRef + (ok ? 1 : 0);
    setCorrectRef(newCorrect);
    if (ok) setCorrect(newCorrect);
    else {
      setErrors(e => e + 1);
      const full = (q.blankIn === 'A' ? q.A : q.B).replace('___', q.answer);
      setMissed(m => [...m, { hanzi: full, pinyin: q.answerPinyin, es: q.answerEs }]);
    }
  };

  const handleNext = () => {
    const next = index + 1;
    if (next >= questions.length) {
      const pct = Math.round((correctRef / questions.length) * 100);
      if (onFinish) onFinish(pct, missed);
      setDone(true);
    } else { setIndex(next); setOpts(shuffle([...questions[next].options])); setSelected(null); }
  };

  if (done) return html(PruebaResult, {
    percent: Math.round((correctRef / questions.length) * 100),
    total: questions.length, correct: correctRef, missed,
    onRetry: () => { setIndex(0); setOpts(shuffle([...questions[0].options])); setSelected(null); setCorrect(0); setCorrectRef(0); setErrors(0); setMissed([]); setDone(false); },
    onBack, playerName,
  });

  const renderLine = (speaker, text, hasBlank) => {
    const parts = text.split('___');
    return html('div', { className: 'dialogo-line' },
      html('span', { className: 'dialogo-speaker ' + speaker.toLowerCase() }, speaker + ':'),
      hasBlank
        ? html('span', null, parts[0], html('span', { className: 'dialogo-blank' }, selected || ''), parts[1] || '')
        : text
    );
  };

  const FeedbackBox = ({ bg, color, icon, label, hanzi, pinyin, es }) =>
    html('div', { style: { borderRadius: 14, padding: '12px 16px', background: bg, color, marginBottom: 8, textAlign: 'center' } },
      html('div', { style: { fontSize: 28 } }, icon),
      html('div', { style: { fontWeight: 800, fontSize: 17, margin: '4px 0' } }, label),
      html('div', { className: 'hanzi-font', style: { fontSize: 22 } }, hanzi),
      html('div', { style: { fontSize: 13, marginTop: 2, fontWeight: 700 } }, pinyin),
      html('div', { style: { fontSize: 12, marginTop: 1, opacity: 0.8 } }, es),
    );

  return html(React.Fragment, null,
    html('main', { style: { paddingTop: '18px' } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, 'Completa el diálogo'),
        html('div', { className: 'flash-counter' }, (index + 1) + '/' + questions.length),
      ),
      html('div', { className: 'flash-score-row' },
        html('div', { className: 'flash-score-chip no' }, html('i', null, '✕'), 'Errores: ' + errors),
        html('div', { className: 'flash-score-chip yes' }, html('i', null, '✓'), 'Correctas: ' + correct),
      ),
      html('div', { className: 'dialogo-context' }, q.context),
      html('div', { className: 'dialogo-card' },
        renderLine('A', q.A, q.blankIn === 'A'),
        renderLine('B', q.B, q.blankIn === 'B'),
      ),
      selected
        ? html(React.Fragment, null,
            !isCorrect && html(FeedbackBox, {
              bg: '#FDE4DD', color: 'var(--lacquer-dark)', icon: '✗', label: 'Elegiste: ' + selected,
              hanzi: selected, pinyin: '', es: 'Incorrecto',
            }),
            html(FeedbackBox, {
              bg: 'var(--jade-light)', color: 'var(--jade-dark)',
              icon: isCorrect ? '✓' : '→',
              label: isCorrect ? '¡Correcto!' : 'Correcto:',
              hanzi: q.answer, pinyin: q.answerPinyin, es: q.answerEs,
            }),
            html('div', { className: 'dialogo-explanation' }, '💡 ' + q.explanation),
            html('button', { className: 'primary-btn', onClick: handleNext },
              index + 1 >= questions.length ? 'Ver resultado' : 'Siguiente →'
            )
          )
        : html('div', { className: 'quiz-options' },
            opts.map(opt => html('button', { key: opt, className: 'quiz-option', onClick: () => handlePick(opt) }, opt))
          )
    )
  );
}

// ----------------- Prueba: Ordenar -----------------
const CIRCLE_NUMS = ['①','②','③','④','⑤','⑥','⑦','⑧'];

function OrdenGame(props) {
  const [raw, rawErr, rawReload] = useGameQuestions('orden_questions', 'words,correct,es,pinyin', r => r);
  if (rawErr) return html(GameStatusScreen, { onBack: props.onBack, title: 'Ordena la oración', msg: '❌ Error de conexión.', onRetry: rawReload });
  if (raw === null) return html(GameStatusScreen, { onBack: props.onBack, title: 'Ordena la oración', msg: '⏳ Cargando preguntas...' });
  if (raw.length === 0) return html(GameStatusScreen, { onBack: props.onBack, title: 'Ordena la oración', msg: 'Todavía no hay preguntas cargadas. Pedile a tu laoshi que las suba desde el panel de administrador.' });
  // Priorizar preguntas previamente fallidas (matched por oración correcta)
  const priorMissed = new Set((props.priorMissed || []).map(m => m.hanzi));
  const ordered = [
    ...raw.filter(q => priorMissed.has(q.correct)),
    ...shuffle(raw.filter(q => !priorMissed.has(q.correct))),
  ];
  return html(OrdenGameBody, { ...props, rawQuestions: ordered });
}
function OrdenGameBody({ onBack, onFinish, playerName, rawQuestions }) {
  const questions = useMemo(() => shuffle(rawQuestions), []);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState([]);
  const [available, setAvailable] = useState(() => shuffle(questions[0].words).map((w, i) => ({ w, i })));
  const [checked, setChecked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [missed, setMissed] = useState([]);
  const [done, setDone] = useState(false);

  const q = questions[index];

  const loadQ = (i) => {
    setPlaced([]);
    setAvailable(shuffle(questions[i].words).map((w, idx) => ({ w, idx })));
    setChecked(null);
  };

  const tapAvailable = (item) => {
    if (checked) return;
    setAvailable(av => av.filter(x => x !== item));
    setPlaced(pl => [...pl, item]);
  };

  const tapPlaced = (item) => {
    if (checked) return;
    setPlaced(pl => pl.filter(x => x !== item));
    setAvailable(av => [...av, item]);
  };

  const [correctRef, setCorrectRef] = useState(0);

  const handleCheck = () => {
    const answer = placed.map(x => x.w).join('');
    const isCorrect = answer === q.correct;
    if (isCorrect) playCorrect(); else playWrong();
    speak(q.correct);
    setChecked(isCorrect ? 'correct' : 'wrong');
    const newCorrect = correctRef + (isCorrect ? 1 : 0);
    setCorrectRef(newCorrect);
    if (isCorrect) setCorrect(newCorrect);
    else {
      setErrors(e => e + 1);
      setMissed(m => [...m, { hanzi: q.correct, pinyin: q.pinyin, es: q.es }]);
    }
  };

  const handleNext = () => {
    const nextIdx = index + 1;
    if (nextIdx >= questions.length) {
      const pct = Math.round((correctRef / questions.length) * 100);
      if (onFinish) onFinish(pct, missed);
      setDone(true);
    } else { setIndex(nextIdx); loadQ(nextIdx); }
  };

  if (done) return html(PruebaResult, {
    percent: Math.round((correctRef / questions.length) * 100),
    total: questions.length, correct: correctRef, missed,
    onRetry: () => { setIndex(0); setCorrect(0); setCorrectRef(0); setErrors(0); setMissed([]); setDone(false); loadQ(0); },
    onBack, playerName,
  });

  return html(React.Fragment, null,
    html('main', { style: { paddingTop: '18px' } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, 'Ordena la oración'),
        html('div', { className: 'flash-counter' }, (index + 1) + '/' + questions.length),
      ),
      html('div', { className: 'flash-score-row' },
        html('div', { className: 'flash-score-chip no' }, html('i', null, '✕'), 'Errores: ' + errors),
        html('div', { className: 'flash-score-chip yes' }, html('i', null, '✓'), 'Correctas: ' + correct),
      ),
      html('div', { className: 'orden-hint' },
        html('div', null, 'Toca las palabras en el orden correcto'),
        html('div', { style: { fontSize: 13, color: 'var(--lacquer-dark)', fontWeight: 700, marginTop: 4, fontStyle: 'italic' } }, '→ ' + q.es),
      ),
      html('div', { className: 'orden-answer-zone' + (checked === 'correct' ? ' correct-zone' : checked === 'wrong' ? ' wrong-zone' : '') },
        placed.length === 0
          ? html('span', { style: { color: 'var(--ink-soft)', fontSize: 13, fontWeight: 700 } }, 'Toca las palabras de abajo...')
          : placed.map(item => html('button', { key: 'p' + item.i, className: 'word-chip placed', onClick: () => tapPlaced(item) }, item.w))
      ),
      checked && html('div', { style: { borderRadius: 16, padding: '16px 20px', textAlign: 'center', fontWeight: 800, marginBottom: 10,
          background: checked === 'correct' ? 'var(--jade-light)' : '#FDE4DD',
          color: checked === 'correct' ? 'var(--jade-dark)' : 'var(--lacquer-dark)' } },
        html('div', { style: { fontSize: 36 } }, checked === 'correct' ? '✓' : '✗'),
        html('div', { style: { fontSize: 20, margin: '4px 0' } }, checked === 'correct' ? '¡Correcto!' : 'Incorrecto'),
        html('div', { className: 'hanzi-font', style: { fontSize: 22, marginTop: 8 } }, q.correct),
        html(TonedPinyin, { text: q.pinyin, style: { fontSize: 14, marginTop: 4, fontWeight: 700, display: 'block' } }),
        html('div', { style: { fontSize: 13, marginTop: 2, opacity: 0.8 } }, q.es),
      ),
      checked === 'wrong' && html('div', { className: 'orden-numbered' },
        q.words.map((w, i) => html('div', { key: i, className: 'orden-numbered-item' },
          html('div', { className: 'orden-num' }, CIRCLE_NUMS[i]),
          html('div', { className: 'word-chip', style: { cursor: 'default' } }, w)
        ))
      ),
      !checked && html('div', { className: 'orden-words' },
        available.map(item => html('button', { key: 'a' + item.i, className: 'word-chip', onClick: () => tapAvailable(item) }, item.w))
      ),
      !checked
        ? html('button', { className: 'primary-btn', onClick: handleCheck,
            style: placed.length < q.words.length ? { opacity: 0.5, pointerEvents: 'none' } : {} }, 'Comprobar')
        : html('button', { className: 'primary-btn', onClick: handleNext },
            index + 1 >= questions.length ? 'Ver resultado' : 'Siguiente →'
          )
    )
  );
}

// ═══════════════════════════════════════════════════════════
// PRÁCTICA DE ESCRITURA — HanziWriteGame
// Dificultad progresiva: 1 char → 2 chars → 3-4 → oraciones
// Fuente de datos: vocabulary (niveles 1-3) + clasificador (nivel 4)
// ═══════════════════════════════════════════════════════════

function HanziWriteGame({ vocab, onBack, onFinish, playerName, priorMissed, writeConfig, keyboardHint }) {
  const WRITE_LEVELS = (writeConfig && writeConfig.levels) ? writeConfig.levels : WRITE_LEVELS_DEFAULT;
  const WRITE_STREAK_TO_LEVEL_UP = (writeConfig && writeConfig.streak_to_level_up) ? writeConfig.streak_to_level_up : WRITE_STREAK_DEFAULT;
  const kbHint = keyboardHint || '📱 Necesitás el teclado chino (Pinyin) activado · iOS: Ajustes → General → Teclado · Android: Ajustes → Idioma';

  // Construir banco de preguntas por nivel desde vocabulary
  const buildBank = () => {
    const allWords = Object.values(vocab).flat().filter(w => w && w.hanzi);
    const unique = [...new Map(allWords.map(w => [w.hanzi, w])).values()];
    const byLevel = WRITE_LEVELS.slice(0, 3).map(({ minChars, maxChars }) =>
      shuffle(unique.filter(w => {
        const len = [...w.hanzi].length; // cuenta caracteres Unicode correctamente
        return len >= minChars && len <= maxChars;
      })).map(w => ({ type: 'vocab', prompt: w.es, pinyin: w.pinyin, answer: w.hanzi }))
    );
    return byLevel;
  };

  const [bank] = useState(buildBank);
  const [clasBankRaw, setClasBank] = useState(null);
  const [level, setLevel] = useState(0);          // 0-3
  const [streak, setStreak] = useState(0);         // aciertos seguidos en nivel actual
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState('question');  // 'question' | 'result'
  const [isCorrect, setIsCorrect] = useState(null);
  const [showPinyin, setShowPinyin] = useState(false);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAsked, setTotalAsked] = useState(0);
  const [levelUpAnim, setLevelUpAnim] = useState(false);
  const [queueIdx, setQueueIdx] = useState(0);
  const [queue, setQueue] = useState([]);
  const inputRef = React.useRef(null);

  // Cargar clasificador para nivel 4
  useEffect(() => {
    db.from('clasificador_questions').select('sentence,pinyin,answer,answer_pinyin,hint').eq('active', true)
      .then(({ data }) => {
        if (data && data.length) {
          setClasBank(shuffle(data.map(nfcRow)).map(r => ({
            type: 'clas',
            prompt: r.hint,
            sentence: r.sentence,
            pinyin: r.pinyin.replace('___', r.answer_pinyin || r.answer),
            answer: r.answer,
            fullSentence: r.sentence.replace('___', r.answer),
          })));
        } else setClasBank([]);
      });
  }, []);

  // Construir cola de preguntas para el nivel actual
  const buildQueue = (lvl) => {
    if (lvl < 3) return [...(bank[lvl] || [])].slice(0, 20);
    return (clasBankRaw || []).slice(0, 20);
  };

  useEffect(() => {
    setQueue(buildQueue(level));
    setQueueIdx(0);
    setInput('');
    setPhase('question');
    setShowPinyin(false);
  }, [level, clasBankRaw]);

  useEffect(() => {
    if (phase === 'question' && inputRef.current) {
      setTimeout(() => inputRef.current && inputRef.current.focus(), 120);
    }
  }, [phase, queueIdx]);

  const currentQ = queue[queueIdx % Math.max(queue.length, 1)];

  const handleSubmit = () => {
    if (!currentQ || !input.trim()) return;
    const ok = input.trim() === currentQ.answer;
    setIsCorrect(ok);
    setPhase('result');
    setTotalAsked(t => t + 1);
    if (ok) {
      playCorrect();
      speak(currentQ.answer);
      setTotalCorrect(t => t + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak >= WRITE_STREAK_TO_LEVEL_UP && level < WRITE_LEVELS.length - 1) {
        setLevelUpAnim(true);
        setTimeout(() => {
          setLevelUpAnim(false);
          setLevel(l => l + 1);
          setStreak(0);
        }, 1800);
      }
    } else {
      playWrong();
      setStreak(0);
    }
  };

  const handleNext = () => {
    setInput('');
    setShowPinyin(false);
    setPhase('question');
    setQueueIdx(i => i + 1);
  };

  if (!currentQ || (level === 3 && clasBankRaw === null)) {
    return html(GameStatusScreen, { onBack, title: 'Práctica de escritura', msg: '⏳ Cargando...' });
  }
  if (level === 3 && clasBankRaw && clasBankRaw.length === 0) {
    return html(GameStatusScreen, { onBack, title: 'Práctica de escritura', msg: 'Todavía no hay oraciones cargadas para este nivel.' });
  }

  const lvlInfo = WRITE_LEVELS[level];
  const pct = totalAsked > 0 ? Math.round((totalCorrect / totalAsked) * 100) : 0;

  return html(React.Fragment, null,
    // Animación de subida de nivel
    levelUpAnim && html('div', { style: {
      position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(88,204,2,0.15)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }},
      html('div', { style: { fontSize: 64 } }, '🎉'),
      html('div', { style: { fontSize: 28, fontWeight: 800, color: 'var(--jade-dark)', marginTop: 12 } }, '¡Nivel ' + (level + 2) + '!'),
      html('div', { style: { fontSize: 16, color: 'var(--ink-soft)', marginTop: 8 } }, WRITE_LEVELS[level + 1]?.label),
    ),

    html('main', { style: { paddingTop: '18px' } },
      html('div', { className: 'header-row' },
        html('button', { className: 'back-btn', onClick: onBack }, '←'),
        html('h1', null, 'Práctica de escritura'),
        html('div', { className: 'flash-counter' }, pct + '%'),
      ),

      // Barra de nivel
      html('div', { style: { padding: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 6 } },
        html('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          html('div', { style: { fontSize: 12, fontWeight: 800, color: 'var(--lacquer-dark)' } },
            'Nivel ' + (level + 1) + ' · ' + lvlInfo.label
          ),
          html('div', { style: { fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700 } },
            streak + '/' + WRITE_STREAK_TO_LEVEL_UP + ' para subir' + (level === WRITE_LEVELS.length - 1 ? ' (máx)' : '')
          ),
        ),
        // Puntos de racha
        html('div', { style: { display: 'flex', gap: 6 } },
          Array.from({ length: WRITE_STREAK_TO_LEVEL_UP }).map((_, i) =>
            html('div', { key: i, style: {
              width: 28, height: 6, borderRadius: 3,
              background: i < streak ? 'var(--jade)' : 'var(--paper-deep)',
              transition: 'background 0.3s',
            }})
          )
        ),
      ),

      // Tarjeta de pregunta
      html('div', { style: {
        background: '#fff', borderRadius: 20, padding: '28px 20px 20px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.07)', marginBottom: 16, textAlign: 'center',
      }},
        // Para nivel 4: mostrar oración con blank
        currentQ.type === 'clas'
          ? html('div', { className: 'clas-sentence', style: { fontSize: 26, marginBottom: 8 } },
              currentQ.sentence.split('___')[0],
              html('span', { style: { borderBottom: '2px solid var(--lacquer)', padding: '0 16px', color: 'var(--lacquer)' } }, ' '),
              currentQ.sentence.split('___')[1] || ''
            )
          : null,

        // Hanzi visible pero no copiable (el alumno debe tipear con teclado chino)
        currentQ.type !== 'clas' && html('div', {
          className: 'hanzi-font',
          style: {
            fontSize: 64, color: 'var(--ink)', marginBottom: 8, lineHeight: 1,
            userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'none',
          },
          onCopy: e => e.preventDefault(),
        }, currentQ.answer),

        // Pista en español
        html('div', { style: { fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 } },
          currentQ.prompt
        ),

        // Botón ver pinyin (solo en fase pregunta)
        phase === 'question' && html('button', {
          className: 'pinyin-toggle-btn',
          style: { marginTop: 8 },
          onClick: () => setShowPinyin(v => !v),
        }, showPinyin ? '🙈 Ocultar pīnyīn' : '👁 Ver pīnyīn'),

        showPinyin && phase === 'question' && html(TonedPinyin, {
          text: currentQ.pinyin,
          style: { fontSize: 15, fontWeight: 700, color: 'var(--lacquer-dark)', display: 'block', marginTop: 6 },
        }),
      ),

      // Input de escritura (solo en fase pregunta)
      phase === 'question' && html('div', { style: { marginBottom: 16 } },
        html('div', { style: { fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' } },
          lvlInfo.hint
        ),
        html('input', {
          ref: inputRef,
          type: 'text',
          lang: 'zh',
          value: input,
          onChange: e => setInput(e.target.value),
          onKeyDown: e => { if (e.key === 'Enter') handleSubmit(); },
          placeholder: '写汉字…',
          style: {
            width: '100%', fontSize: 28, textAlign: 'center', padding: '14px 16px',
            border: '2px solid var(--paper-deep)', borderRadius: 14, outline: 'none',
            fontFamily: "'Noto Sans SC', sans-serif", background: '#fff',
            caretColor: 'var(--lacquer)',
          },
        }),
        html('button', {
          className: 'primary-btn', style: { width: '100%', marginTop: 10 },
          onClick: handleSubmit,
          disabled: !input.trim(),
        }, '确认 Confirmar'),
      ),

      // Feedback resultado
      phase === 'result' && html('div', { style: {
        borderRadius: 16, padding: '20px', textAlign: 'center', fontWeight: 800, marginBottom: 12,
        background: isCorrect ? 'var(--jade-light)' : '#FDE4DD',
        color: isCorrect ? 'var(--jade-dark)' : 'var(--lacquer-dark)',
      }},
        html('div', { style: { fontSize: 48 } }, isCorrect ? '✓' : '✗'),
        html('div', { style: { fontSize: 20, margin: '4px 0' } }, isCorrect ? '¡Correcto!' : 'Incorrecto'),
        !isCorrect && html('div', { style: { fontSize: 13, marginBottom: 6 } }, 'Escribiste: ' + input),
        html('div', { className: 'hanzi-font', style: { fontSize: 36, margin: '8px 0 4px' } }, currentQ.answer),
        html(TonedPinyin, { text: currentQ.pinyin, style: { fontSize: 16, fontWeight: 700, display: 'block', marginBottom: 4 } }),
        html('div', { style: { fontSize: 13, opacity: 0.8 } }, currentQ.prompt),
        html('button', {
          className: 'primary-btn', style: { marginTop: 16, width: '100%' },
          onClick: handleNext,
        }, levelUpAnim ? '🎉 ¡Subiste de nivel!' : 'Siguiente →'),
      ),

      // Instrucción teclado chino (primera visita)
      html('div', { style: {
        marginTop: 8, padding: '10px 14px', background: 'var(--paper-deep)', borderRadius: 10,
        fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600, textAlign: 'center', lineHeight: 1.5,
      }},
        kbHint
      ),
    )
  );
}

const root = createRoot(document.getElementById('root'));
root.render(html(ErrorBoundary, null, html(App)));