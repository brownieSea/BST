// ============================================================
//  GlucoseLog — app.js
// ============================================================

let ALL_DATA = [];
let trendChart = null, monthChart = null, oilChart = null;
let currentRange = 10;

// ── Helpers ──────────────────────────────────────────────────

function parseKoreanTime(str) {
  if (!str) return '';
  str = str.trim();
  const m = str.match(/([오전후]+)\s*(\d{1,2}):(\d{2})/);
  if (!m) return str;
  let h = parseInt(m[2]);
  if (m[1] === '오후' && h !== 12) h += 12;
  if (m[1] === '오전' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${m[3]}`;
}

function parseKoreanDate(str) {
  if (!str) return '';
  str = str.trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0,10);
  return str;
}

function fasting(lastMealTime, measureTime) {
  // Both in HH:MM or Korean format
  const toMins = t => {
    const p = parseKoreanTime(t);
    if (!p) return null;
    const [h, m] = p.split(':').map(Number);
    return h * 60 + m;
  };
  const meal = toMins(lastMealTime);
  const meas = toMins(measureTime);
  if (meal == null || meas == null) return null;
  let diff = meas - meal;
  if (diff < 0) diff += 1440; // overnight
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function level(g) {
  if (g < 70) return { label:'저혈당', cls:'badge-low' };
  if (g <= 99) return { label:'정상', cls:'badge-normal' };
  if (g <= 125) return { label:'주의', cls:'badge-caution' };
  return { label:'높음', cls:'badge-danger' };
}

function oilType(row) {
  const m = parseFloat(row.meta) || 0;
  const l = parseFloat(row.lemon) || 0;
  if (m > 0 && l > 0) return 'both';
  if (m > 0) return 'meta';
  if (l > 0) return 'lemon';
  return 'none';
}

function pointColor(row) {
  const t = oilType(row);
  if (t === 'meta') return '#f97316';
  if (t === 'lemon') return '#fde047';
  if (t === 'both') return '#fb923c'; // both → amber
  return '#64748b';
}

// ── CSV Fetch ────────────────────────────────────────────────

async function fetchData() {
  const url = CONFIG.SHEET_CSV_URL;
  if (url.includes('YOUR_SHEET_ID')) {
    loadDemoData();
    return;
  }
  try {
    const res = await fetch(url + '&cachebust=' + Date.now(), { cache: 'no-store' });
    const text = await res.text();
    ALL_DATA = parseCSV(text);
    renderAll();
  } catch (e) {
    console.warn('Fetch failed, using demo data:', e);
    loadDemoData();
  }
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) { // skip header
    const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g,'').trim());
    const C = CONFIG.COLUMNS;
    const date = parseKoreanDate(cols[C.date] || '');
    const glucose = parseInt(cols[C.glucose]);
    if (!date || isNaN(glucose)) continue;
    rows.push({
      date,
      time: parseKoreanTime(cols[C.time] || ''),
      glucose,
      lastMealTime: cols[C.lastMealTime] || '',
      meal: cols[C.meal] || '',
      oilYN: cols[C.oilYN] || '',
      meta: parseFloat(cols[C.meta]) || 0,
      lemon: parseFloat(cols[C.lemon]) || 0,
      note: cols[C.note] || '',
      sleep: cols[C.sleep] || '',
      prevMed: cols[C.prevMed] || '',
      lastOil: cols[C.lastOil] || '',
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

function loadDemoData() {
  const raw = [
    ['2026-04-07','09:00',150,'','',           'N',0,0,'4.15 오후 2시','','Y',''],
    ['2026-04-08','10:30',145,'오후 10:00','', 'N',0,0,'','','Y',''],
    ['2026-04-09','08:50',136,'오후 12:00','', 'Y',2,1,'','','Y',''],
    ['2026-04-10','08:40',114,'오후 12:00','', 'Y',2,1,'','','Y',''],
    ['2026-04-11','12:00',110,'오후 12:00','', 'Y',2,1,'','','Y',''],
    ['2026-04-12','10:50',131,'오전 11:00','', 'N',0,0,'','','Y',''],
    ['2026-04-13','08:50',131,'오후 12:00','', 'N',0,0,'','','Y',''],
    ['2026-04-14','10:05',119,'오후 10:00','치킨 2조각','Y',2,6,'','','Y',''],
    ['2026-04-15','10:05',106,'오후 8:00','요거트+건과류,콩나물국+','Y',2,6,'4.15 오전 10시','','Y',''],
    ['2026-04-16','','',  '오후 8:00','밀떡볶이,누룽지','Y',0,0,'','','Y',''],
    ['2026-04-17','08:40',111,'오전 6:00','쌀국수','Y',2,5,'','','Y',''],
    ['2026-04-18','09:40',116,'오후 8:00','바게트빵 1/2,토마토 1','Y',4,0,'','','Y',''],
    ['2026-04-19','08:50',128,'오후 8:00','브리또,토마토 1,견과류','Y',3,0,'','','Y',''],
    ['2026-04-20','09:25',113,'오후 11:00','잡곡밥 1/4,감자조림','Y',2,4,'','','Y',''],
    ['2026-04-21','09:00',114,'오전 7:30','샤브샤브','Y',0,4,'','','Y',''],
    ['2026-04-22','09:10',118,'오후 8:00','미니 대저토마토 15개,프','Y',2,4,'','','Y',''],
    ['2026-04-23','11:00',119,'오후 9:30','떡꼬치 배터지게,미니 대저토마토','Y',2,4,'','','Y',''],
    ['2026-04-24','12:30',103,'오후 9:30','라면,미니 대저토마토','Y',2,4,'','','Y',''],
    ['2026-04-25','11:00',123,'오후 9:30','맥주,안주','Y',2,4,'','','Y',''],
    ['2026-04-26','10:30',98, '오전 1:30','짜장밥','N',0,0,'','','Y',''],
    ['2026-04-27','08:50',136,'오후 7:00','짜장밥,김자강,녹차아이스','Y',0,4,'','','Y',''],
    ['2026-04-28','12:30',112,'오후 11:30','바게트빵,계란감자샐러드','N',0,0,'','','Y',''],
    ['2026-04-29','07:20',136,'오후 9:00','밥,전,나물','N',0,0,'3시간 56분','','Y',''],
    ['2026-04-30','07:30',127,'오후 9:00','김밥,누룽지,토마토','Y',2,1,'4시간 7분','','Y','N'],
    ['2026-05-01','07:30',148,'오후 8:00','밥,오이김치,매추리알장조림','Y',0,2,'7시간 13분','','Y','Y'],
    ['2026-05-02','10:00',107,'오후 7:00','해물찜','Y',4,2,'','Y','Y','Y'],
    ['2026-05-03','11:40',114,'오후 11:30','김밥','Y',4,4,'7시간 3분','Y','Y','Y'],
    ['2026-05-04','','',  '오후 10:00','치즈케이크','Y',2,1,'4시간','Y','Y','N'],
    ['2026-05-05','12:30',128,'오후 10:00','치킨,참외,떡꼬치,beer','Y',4,5,'7시간 30분','Y','Y','Y'],
    ['2026-05-06','07:20',111,'오후 7:00','케이크,김밥 1개','Y',0,4,'3시간','Y','Y','Y'],
    ['2026-05-07','07:20',131,'오후 11:30','바질파스타,누룽지','Y',2,1,'5시간','Y','Y','Y'],
    ['2026-05-08','02:00',123,'오전 7:30','바질잠봉 샌드위치','N',0,0,'5시간','Y','Y','Y'],
    ['2026-05-08','11:50',106,'','',          'N',0,0,'5시간','Y','Y','Y'],
    ['2026-05-09','11:00',117,'오후 11:00','짜장밥,꿀파배기','Y',0,0,'7시간','Y','Y','Y'],
  ].filter(r => r[2]);

  ALL_DATA = raw.map(r => ({
    date: r[0], time: r[1], glucose: r[2],
    lastMealTime: r[3], meal: r[4], oilYN: r[5],
    meta: r[6], lemon: r[7], note: r[8], sleep: r[9],
    prevMed: r[10], lastOil: r[11],
  })).sort((a,b) => a.date.localeCompare(b.date));

  renderAll();
}

// ── Render All ───────────────────────────────────────────────

function renderAll() {
  renderStats();
  renderTrend();
  renderMonthChart();
  renderOilChart();
  populateFilters();
  renderLog();
}

// ── Stats Cards ──────────────────────────────────────────────

function renderStats() {
  const d = ALL_DATA;
  if (!d.length) { document.getElementById('statsRow').innerHTML = '<div class="empty-state">데이터가 없습니다.</div>'; return; }

  const vals = d.map(r => r.glucose);
  const avg = Math.round(vals.reduce((a,b) => a+b, 0) / vals.length);
  const latest = d[d.length - 1];
  const last7 = d.slice(-7);
  const avg7 = Math.round(last7.map(r=>r.glucose).reduce((a,b)=>a+b,0) / last7.length);
  const highDays = vals.filter(v => v >= 126).length;
  const lv = level(latest.glucose);

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">최근 측정</div>
      <div class="stat-val">${latest.glucose}</div>
      <div class="stat-sub">${latest.date}
        <span class="stat-badge ${lv.cls}">${lv.label}</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">7일 평균</div>
      <div class="stat-val">${avg7}</div>
      <div class="stat-sub">mg/dL</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">전체 평균</div>
      <div class="stat-val">${avg}</div>
      <div class="stat-sub">${d.length}일 기록</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">높음 횟수</div>
      <div class="stat-val">${highDays}</div>
      <div class="stat-sub">전체의 ${Math.round(highDays/d.length*100)}%</div>
    </div>
  `;
}

// ── Trend Chart ──────────────────────────────────────────────

function renderTrend() {
  let rows = [...ALL_DATA];
  if (currentRange > 0) rows = rows.slice(-currentRange);

  const labels = rows.map(r => r.date.slice(5));
  const vals   = rows.map(r => r.glucose);
  const colors = rows.map(r => pointColor(r));
  const sizes  = rows.map(() => 6);

  const ctx = document.getElementById('trendChart').getContext('2d');
  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '혈당',
        data: vals,
        borderColor: 'rgba(42,124,94,0.35)',
        borderWidth: 1.5,
        pointBackgroundColor: colors,
        pointBorderColor: colors,
        pointRadius: sizes,
        pointHoverRadius: 8,
        tension: 0.3,
        fill: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }, // custom tooltip
      },
      scales: {
        y: {
          min: 70,
          suggestedMax: 160,
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: '#555b6e', font: { family: "'DM Mono', monospace", size: 11 } },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#555b6e', font: { size: 11 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 14 },
        }
      },
      // Reference lines via afterDraw plugin
    },
    plugins: [{
      id: 'refLines',
      afterDraw(chart) {
        const { ctx: c, chartArea: { left, right }, scales: { y } } = chart;
        [[100, 'rgba(248,113,113,0.3)'], [126, 'rgba(251,146,60,0.4)']].forEach(([val, color]) => {
          const yPos = y.getPixelForValue(val);
          c.save();
          c.setLineDash([4, 4]);
          c.strokeStyle = color;
          c.lineWidth = 1;
          c.beginPath(); c.moveTo(left, yPos); c.lineTo(right, yPos); c.stroke();
          c.restore();
        });
      }
    }]
  });

  // Custom tooltip
  attachChartTooltip(trendChart, rows);
}

function attachChartTooltip(chart, rows) {
  const tip = document.getElementById('tooltip');
  const canvas = chart.canvas;

  function showTip(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX || (event.touches?.[0]?.clientX)) - rect.left;
    const y = (event.clientY || (event.touches?.[0]?.clientY)) - rect.top;

    const points = chart.getElementsAtEventForMode({ x, y, native: event }, 'nearest', { intersect: false }, false);
    if (!points.length) { hideTip(); return; }

    const idx = points[0].index;
    const row = rows[idx];
    if (!row) return;

    const lv = level(row.glucose);
    const ft = fasting(row.lastMealTime, row.time);
    const ot = oilType(row);
    const oilLabel = { none:'없음', meta:`메타파워 ${row.meta}방울`, lemon:`레몬 ${row.lemon}방울`, both:`메타 ${row.meta} + 레몬 ${row.lemon}방울` }[ot];

    tip.innerHTML = `
      <div style="font-weight:500;margin-bottom:6px;color:#1e1c18">${row.date} ${row.time||''}</div>
      <div class="tooltip-row"><span class="tooltip-key">혈당</span><span class="tooltip-val" style="color:${row.glucose>=126?'#b91c1c':row.glucose>=100?'#92600a':'#1f6b47'}">${row.glucose} mg/dL</span></div>
      <div class="tooltip-row"><span class="tooltip-key">상태</span><span class="tooltip-val">${lv.label}</span></div>
      ${ft ? `<div class="tooltip-row"><span class="tooltip-key">공복 시간</span><span class="tooltip-val">${ft}</span></div>` : ''}
      <div class="tooltip-row"><span class="tooltip-key">오일</span><span class="tooltip-val">${oilLabel}</span></div>
      ${row.sleep ? `<div class="tooltip-row"><span class="tooltip-key">수면</span><span class="tooltip-val">${row.sleep}</span></div>` : ''}
      ${row.meal ? `<div class="tooltip-row" style="max-width:200px"><span class="tooltip-key">식사</span><span class="tooltip-val" style="text-align:right;font-family:inherit">${row.meal}</span></div>` : ''}
    `;

    const cx = event.clientX || event.touches?.[0]?.clientX || 0;
    const cy = event.clientY || event.touches?.[0]?.clientY || 0;
    const isMobile = window.innerWidth <= 640;
    if (isMobile) {
      tip.style.left = '12px'; tip.style.right = '12px';
      tip.style.bottom = '16px'; tip.style.top = 'auto'; tip.style.width = 'auto';
    } else {
      tip.style.right = ''; tip.style.bottom = ''; tip.style.width = '';
      const tw = 200, th = 140, vw = window.innerWidth, vh = window.innerHeight;
      tip.style.left = (cx + 14 + tw > vw ? cx - tw - 14 : cx + 14) + 'px';
      tip.style.top  = (cy + th > vh ? cy - th : cy + 6) + 'px';
    }
    tip.classList.add('show');
  }

  function hideTip() { tip.classList.remove('show'); }

  canvas.addEventListener('mousemove', showTip);
  canvas.addEventListener('mouseleave', hideTip);
  canvas.addEventListener('touchstart', showTip, { passive: true });
  canvas.addEventListener('touchend', hideTip);
}

// ── Month Chart ──────────────────────────────────────────────

function renderMonthChart() {
  const monthly = {};
  ALL_DATA.forEach(r => {
    const m = r.date.slice(0,7);
    if (!monthly[m]) monthly[m] = [];
    monthly[m].push(r.glucose);
  });
  const months = Object.keys(monthly).sort();
  const avgs = months.map(m => Math.round(monthly[m].reduce((a,b)=>a+b,0) / monthly[m].length));
  const bgColors = avgs.map(v => v >= 126 ? 'rgba(220,38,38,0.65)' : v >= 100 ? 'rgba(180,83,9,0.65)' : 'rgba(22,101,52,0.65)');

  const ctx = document.getElementById('monthChart').getContext('2d');
  if (monthChart) monthChart.destroy();

  monthChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{ label: '월평균', data: avgs, backgroundColor: bgColors, borderRadius: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `평균 ${c.parsed.y} mg/dL` } } },
      scales: {
        y: { min: 70, suggestedMax: 155, grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: '#555b6e', font: { size: 11 } } },
        x: { grid: { display: false }, ticks: { color: '#555b6e', font: { size: 11 }, autoSkip: false } }
      }
    }
  });
}

// ── Oil Effect Chart ─────────────────────────────────────────

function renderOilChart() {
  const groups = { none: [], meta: [], lemon: [], both: [] };
  ALL_DATA.forEach(r => groups[oilType(r)].push(r.glucose));

  const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
  const labels  = ['미복용', '메타파워', '레몬', '둘 다'];
  const vals    = [avg(groups.none), avg(groups.meta), avg(groups.lemon), avg(groups.both)];
  const counts  = [groups.none.length, groups.meta.length, groups.lemon.length, groups.both.length];
  const bgColors = ['rgba(100,116,139,0.7)', 'rgba(249,115,22,0.7)', 'rgba(253,224,71,0.8)', 'rgba(251,146,60,0.7)'];

  const ctx = document.getElementById('oilChart').getContext('2d');
  if (oilChart) oilChart.destroy();

  oilChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: '평균 혈당', data: vals, backgroundColor: bgColors, borderRadius: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          label: c => `평균 ${c.parsed.y} mg/dL`,
          afterLabel: c => `${counts[c.dataIndex]}회 기록`,
        } }
      },
      scales: {
        y: { min: 70, suggestedMax: 155, grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: '#555b6e', font: { size: 11 } } },
        x: { grid: { display: false }, ticks: { color: '#555b6e', font: { size: 11 } } }
      }
    }
  });
}

// ── Log Table ────────────────────────────────────────────────

function populateFilters() {
  const months = [...new Set(ALL_DATA.map(r => r.date.slice(0,7)))].sort().reverse();
  const sel = document.getElementById('filterMonth');
  sel.innerHTML = '<option value="">전체</option>' + months.map(m => `<option value="${m}">${m}</option>`).join('');
}

function renderLog() {
  const fMonth  = document.getElementById('filterMonth').value;
  const fPeriod = document.getElementById('filterPeriod').value;
  const fOil    = document.getElementById('filterOil').value;

  let rows = [...ALL_DATA].sort((a,b) => b.date.localeCompare(a.date));
  if (fMonth)  rows = rows.filter(r => r.date.startsWith(fMonth));
  if (fPeriod) {
    rows = rows.filter(r => {
      const d = parseInt(r.date.slice(8));
      if (fPeriod === '1') return d <= 10;
      if (fPeriod === '2') return d >= 11 && d <= 20;
      return d >= 21;
    });
  }
  if (fOil) rows = rows.filter(r => oilType(r) === fOil);

  const tip = document.getElementById('tooltip');
  const tbody = document.getElementById('logBody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">해당 조건의 기록이 없습니다.</td></tr>';
    return;
  }
  const lv = level;
  tbody.innerHTML = rows.map(r => {
    const l = lv(r.glucose);
    const ot = oilType(r);
    const metaDot  = r.meta  > 0 ? `<span class="oil-dot" style="background:#f97316"></span>${r.meta}` : '-';
    const lemonDot = r.lemon > 0 ? `<span class="oil-dot" style="background:#fde047"></span>${r.lemon}` : '-';
    return `<tr>
      <td>${r.date}</td>
      <td>${r.time || '-'}</td>
      <td class="glucose-val" style="color:${r.glucose>=126?'#b91c1c':r.glucose>=100?'#92600a':'#166534'}">${r.glucose}</td>
      <td><span class="stat-badge ${l.cls}">${l.label}</span></td>
      <td>${metaDot}</td>
      <td>${lemonDot}</td>
      <td>${r.sleep || '-'}</td>
      <td class="meal-cell" title="${r.meal}">${r.meal || '-'}</td>
    </tr>`;
  }).join('');
}

// ── Add Entry ────────────────────────────────────────────────

document.getElementById('saveBtn').addEventListener('click', async () => {
  const date    = document.getElementById('f-date').value;
  const glucose = parseInt(document.getElementById('f-glucose').value);
  if (!date || isNaN(glucose)) { setStatus('날짜와 혈당 수치를 입력해주세요.', 'err'); return; }

  const payload = {
    date,
    time:       document.getElementById('f-time').value,
    glucose,
    sleep:      document.getElementById('f-sleep').value,
    meta:       document.getElementById('f-meta').value || 0,
    lemon:      document.getElementById('f-lemon').value || 0,
    meal:       document.getElementById('f-meal').value,
    note:       document.getElementById('f-note').value,
  };

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  setStatus('저장 중...', '');

  if (CONFIG.APPS_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
    // Demo mode: just add to local array
    ALL_DATA.push({ ...payload, lastMealTime:'', oilYN:'Y', prevMed:'', lastOil:'' });
    ALL_DATA.sort((a,b) => a.date.localeCompare(b.date));
    renderAll();
    setStatus('저장됨 (데모 모드)', 'ok');
    btn.disabled = false;
    return;
  }

  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setStatus('✓ 저장 완료 — 구글 시트에 반영됐습니다.', 'ok');
    setTimeout(fetchData, 1500);
  } catch (e) {
    setStatus('오류가 발생했습니다. 다시 시도해주세요.', 'err');
  }
  btn.disabled = false;
});

function setStatus(msg, cls) {
  const el = document.getElementById('saveStatus');
  el.textContent = msg;
  el.className = 'save-status ' + cls;
}

// ── Tab switching ─────────────────────────────────────────────

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'log') { populateFilters(); renderLog(); }
  });
});

// ── Range pills ───────────────────────────────────────────────

document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentRange = parseInt(pill.dataset.range);
    renderTrend();
  });
});

// ── Log filters ───────────────────────────────────────────────

['filterMonth','filterPeriod','filterOil'].forEach(id => {
  document.getElementById(id).addEventListener('change', renderLog);
});

// ── Sync button ───────────────────────────────────────────────

document.getElementById('syncBtn').addEventListener('click', () => {
  const btn = document.getElementById('syncBtn');
  btn.classList.add('loading');
  fetchData().finally(() => btn.classList.remove('loading'));
});

// ── Form defaults ─────────────────────────────────────────────

function setFormDefaults() {
  const now = new Date();
  document.getElementById('f-date').value = now.toISOString().slice(0,10);
  document.getElementById('f-time').value =
    String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
}

// ── Init ──────────────────────────────────────────────────────

setFormDefaults();
fetchData();

// ── Resize handler ────────────────────────────────────────────
// 브라우저 리사이즈 시 모든 차트 재렌더링
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
      renderTrend();
      renderMonthChart();
      renderOilChart();
    }
  }, 150);
});
