#!/usr/bin/env bash
# measure-mapperf - benchmark the D3 network map in a real browser and emit a JSON artifact.
#
# Usage:
#   scripts/measure-mapperf.sh                                # http://localhost:5173/map
#   scripts/measure-mapperf.sh http://localhost:5173/map prod-baseline
#   scripts/measure-mapperf.sh https://mapping-ai.org/map
#
# Output: perf-artifacts/<iso-timestamp>__<label>.json  + a printed summary.
# Requires: agent-browser (brew install agent-browser).

set -euo pipefail

URL="${1:-http://localhost:5173/map}"
LABEL="${2:-$(echo "$URL" | sed -E 's#https?://##; s#[/:?&=]+#_#g')}"
SESSION="mapperf"
TS="$(date +%Y-%m-%dT%H-%M-%S)"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/perf-artifacts"
OUT_FILE="$OUT_DIR/${TS}__${LABEL}.json"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$OUT_DIR"
command -v agent-browser >/dev/null || { echo "agent-browser not installed" >&2; exit 1; }

echo "→ URL:    $URL"
echo "→ Label:  $LABEL"
echo "→ Output: $OUT_FILE"
echo

ab() { agent-browser --session "$SESSION" "$@"; }
abq() { agent-browser --session "$SESSION" "$@" >/dev/null 2>&1; }

# ---- 1. cold load -----------------------------------------------------------
echo "[1/5] cold load..."
abq close || true
abq set viewport 1440 900
ab open "$URL" >/dev/null
ab wait --load networkidle >/dev/null

# Force Network/All view (localStorage may leave it on Plot)
ab eval --stdin >/dev/null <<'EOF'
const modeBtns = Array.from(document.querySelectorAll('button.mode-btn'));
const netBtn = modeBtns.find(b => b.textContent.trim() === 'Network');
if (netBtn && !netBtn.classList.contains('active')) netBtn.click();
const allBtn = Array.from(document.querySelectorAll('button.view-btn')).find(b => b.textContent.trim() === 'All');
if (allBtn && !allBtn.classList.contains('active')) allBtn.click();
'ok'
EOF

# Wait for simulation to settle + capture time-to-settled since nav start
COLD_JSON="$TMP_DIR/cold.json"
ab eval --stdin > "$COLD_JSON" <<'EOF'
new Promise(resolve => {
  // Observe long tasks since nav start (buffered)
  let longTasks = [];
  try {
    const obs = new PerformanceObserver(list => { for (const e of list.getEntries()) longTasks.push({start: Math.round(e.startTime), dur_ms: +e.duration.toFixed(1)}); });
    obs.observe({ type: 'longtask', buffered: true });
  } catch {}

  const pollStart = performance.now();
  const iv = setInterval(() => {
    const sim = (typeof simulation !== 'undefined') ? simulation : null;
    const settled = sim && sim.alpha() < sim.alphaMin() + 0.001 && sim.nodes().length > 0;
    if (settled || performance.now() - pollStart > 15000) {
      clearInterval(iv);
      // Capture time-to-settled since nav start
      const tSettled = Math.round(performance.now());
      setTimeout(() => resolve(JSON.stringify({
        time_to_settled_ms: tSettled,
        long_tasks_during_load: longTasks,
        long_task_count: longTasks.length,
        long_task_total_ms: +longTasks.reduce((s, t) => s + t.dur_ms, 0).toFixed(1),
        long_task_max_ms: longTasks.reduce((m, t) => Math.max(m, t.dur_ms), 0),
      }, null, 2)), 250); // let observer flush
    }
  }, 50);
});
EOF

# ---- 2. collect static metrics ---------------------------------------------
echo "[2/5] static metrics..."
STATIC_JSON="$TMP_DIR/static.json"
ab eval --stdin > "$STATIC_JSON" <<'EOF'
const nav = performance.getEntriesByType('navigation')[0];
const paints = performance.getEntriesByType('paint');
const resources = performance.getEntriesByType('resource');
const mapData = resources.find(r => r.name.includes('map-data.json'));

const byInitiator = {};
for (const r of resources) {
  byInitiator[r.initiatorType] = byInitiator[r.initiatorType] || { count: 0, transfer_kb: 0 };
  byInitiator[r.initiatorType].count++;
  byInitiator[r.initiatorType].transfer_kb += (r.transferSize || 0) / 1024;
}
for (const k in byInitiator) byInitiator[k].transfer_kb = +byInitiator[k].transfer_kb.toFixed(1);

const q = s => document.querySelectorAll(s).length;

JSON.stringify({
  url: location.href,
  ua: navigator.userAgent,
  viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
  timing: {
    dom_interactive_ms: nav ? Math.round(nav.domInteractive - nav.startTime) : null,
    dom_content_loaded_ms: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
    load_event_ms: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
    first_paint_ms: Math.round(paints.find(p => p.name==='first-paint')?.startTime || 0),
    first_contentful_paint_ms: Math.round(paints.find(p => p.name==='first-contentful-paint')?.startTime || 0),
  },
  map_data_json: mapData ? {
    duration_ms: Math.round(mapData.duration),
    transfer_kb: Math.round((mapData.transferSize || 0) / 1024),
    decoded_kb: Math.round((mapData.decodedBodySize || 0) / 1024),
    encoded_kb: Math.round((mapData.encodedBodySize || 0) / 1024),
  } : null,
  resources: { total: resources.length, by_initiator: byInitiator },
  data_loaded: typeof allData !== 'undefined' ? {
    people: allData.people?.length || 0,
    organizations: allData.organizations?.length || 0,
    resources: allData.resources?.length || 0,
    relationships: allData.relationships?.length || 0,
  } : null,
  view: {
    entity_count_text: document.getElementById('entity-count')?.textContent,
    modes: Array.from(document.querySelectorAll('button.mode-btn'))
      .map(b => ({ text: b.textContent.trim(), active: b.classList.contains('active') })),
    views: Array.from(document.querySelectorAll('button.view-btn'))
      .map(b => ({ text: b.textContent.trim(), active: b.classList.contains('active') })),
  },
  simulation: (typeof simulation !== 'undefined' && simulation) ? {
    node_count: simulation.nodes().length,
    alpha: +simulation.alpha().toFixed(4),
    alpha_min: simulation.alphaMin(),
    alpha_decay: simulation.alphaDecay(),
    velocity_decay: simulation.velocityDecay(),
  } : null,
  dom: {
    total: q('*'),
    map_container: q('#map-container *'),
    canvas: q('#map-container canvas'),
    svg_elements: q('svg *'),
    g: q('#map-container g'),
    circle: q('#map-container circle'),
    rect: q('#map-container rect'),
    line: q('#map-container line'),
    path: q('#map-container path'),
    text: q('#map-container text'),
    image: q('#map-container image'),
    clipPath: q('#map-container clipPath'),
    pattern: q('#map-container pattern'),
  },
  heap: performance.memory ? {
    used_mb: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1),
    total_mb: +(performance.memory.totalJSHeapSize / 1048576).toFixed(1),
    limit_mb: +(performance.memory.jsHeapSizeLimit / 1048576).toFixed(1),
  } : null,
}, null, 2)
EOF

# ---- 3. tick benchmark (reheat sim and time 200 ticks) ----------------------
echo "[3/5] tick benchmark..."
TICK_JSON="$TMP_DIR/tick.json"
ab eval --stdin > "$TICK_JSON" <<'EOF'
new Promise(resolve => {
  if (typeof simulation === 'undefined' || !simulation) return resolve(JSON.stringify({error: 'no simulation'}));

  const results = { ticks: [], rafGaps: [] };
  let tickCount = 0;
  const origOnTick = simulation.on('tick');
  const start = performance.now();
  let lastTick = start;

  simulation.on('tick', function () {
    const t0 = performance.now();
    if (origOnTick) origOnTick.apply(this, arguments);
    const t1 = performance.now();
    results.ticks.push(+(t1 - t0).toFixed(2));
    tickCount++;
    lastTick = t1;
  });

  let lastRaf = performance.now();
  let rafActive = true;
  (function rafLoop() {
    const now = performance.now();
    results.rafGaps.push(+(now - lastRaf).toFixed(2));
    lastRaf = now;
    if (rafActive) requestAnimationFrame(rafLoop);
  })();

  simulation.alpha(0.5).alphaDecay(0.04).restart();

  const iv = setInterval(() => {
    const settled = simulation.alpha() < simulation.alphaMin() + 0.001;
    if (settled || tickCount > 400 || performance.now() - start > 20000) {
      clearInterval(iv);
      rafActive = false;
      simulation.on('tick', origOnTick);
      const sorted = [...results.ticks].sort((a, b) => a - b);
      const p = q => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
      const gaps = results.rafGaps.slice(1);
      const gapAvg = gaps.reduce((s, v) => s + v, 0) / Math.max(1, gaps.length);
      resolve(JSON.stringify({
        wall_ms: Math.round(performance.now() - start),
        tick_count: tickCount,
        tick_avg_ms: +(results.ticks.reduce((s, v) => s + v, 0) / Math.max(1, tickCount)).toFixed(2),
        tick_p50_ms: p(0.5),
        tick_p95_ms: p(0.95),
        tick_max_ms: sorted[sorted.length - 1] || 0,
        raf_frames: gaps.length,
        raf_avg_gap_ms: +gapAvg.toFixed(1),
        raf_max_gap_ms: Math.max(...gaps, 0),
        effective_fps: +(1000 / gapAvg).toFixed(1),
      }, null, 2));
    }
  }, 30);
});
EOF

# ---- 4. zoom/pan interaction FPS -------------------------------------------
echo "[4/5] pan/zoom fps..."
INTERACT_JSON="$TMP_DIR/interact.json"
ab eval --stdin > "$INTERACT_JSON" <<'EOF'
new Promise(resolve => {
  const canvasEl = document.querySelector('#map-container canvas');
  const svgEl = d3.select('#map-container svg');
  const zoomTarget = canvasEl ? d3.select(canvasEl) : svgEl;
  if (!zoomTarget.node() || typeof zoomBehavior === 'undefined') return resolve(JSON.stringify({error: 'no zoom'}));

  const gaps = [];
  let last = performance.now();
  let active = true;
  (function loop() {
    const now = performance.now();
    gaps.push(+(now - last).toFixed(2));
    last = now;
    if (active) requestAnimationFrame(loop);
  })();

  // Synthesize a zoom-in then pan (wheel-like transform changes)
  const start = performance.now();
  let k = 1, tx = 0, ty = 0;
  const step = () => {
    const t = performance.now() - start;
    if (t > 3000) { active = false;
      const g = gaps.slice(5);
      const avg = g.reduce((s, v) => s + v, 0) / Math.max(1, g.length);
      return resolve(JSON.stringify({
        duration_ms: Math.round(t),
        frames: g.length,
        avg_gap_ms: +avg.toFixed(1),
        p95_gap_ms: [...g].sort((a,b)=>a-b)[Math.floor(g.length*0.95)] || 0,
        max_gap_ms: Math.max(...g, 0),
        effective_fps: +(1000 / avg).toFixed(1),
      }, null, 2));
    }
    k = 1 + (t / 1500);
    tx = Math.sin(t / 300) * 150;
    ty = Math.cos(t / 300) * 150;
    zoomTarget.call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
    setTimeout(step, 16);
  };
  step();
});
EOF

# ---- 5. long-task observer during idle --------------------------------------
echo "[5/5] long tasks (2s idle window)..."
LONGTASK_JSON="$TMP_DIR/longtask.json"
ab eval --stdin > "$LONGTASK_JSON" <<'EOF'
new Promise(resolve => {
  const tasks = [];
  try {
    const obs = new PerformanceObserver(list => {
      for (const e of list.getEntries()) tasks.push({ start: Math.round(e.startTime), dur_ms: +e.duration.toFixed(1), name: e.name });
    });
    obs.observe({ entryTypes: ['longtask'] });
    setTimeout(() => { obs.disconnect(); resolve(JSON.stringify({ long_tasks: tasks, count: tasks.length, total_ms: +tasks.reduce((s,t)=>s+t.dur_ms,0).toFixed(1) }, null, 2)); }, 2000);
  } catch (e) { resolve(JSON.stringify({ error: String(e) })); }
});
EOF

# ---- assemble artifact ------------------------------------------------------
python3 - "$STATIC_JSON" "$TICK_JSON" "$INTERACT_JSON" "$LONGTASK_JSON" "$COLD_JSON" "$OUT_FILE" "$URL" "$LABEL" "$TS" <<'PY'
import json, sys
paths = sys.argv[1:6]
out_file, url, label, ts = sys.argv[6:10]
def load(p):
    with open(p) as f:
        raw = f.read().strip()
        if raw.startswith('"') and raw.endswith('"'):
            raw = json.loads(raw)
        return json.loads(raw)
static, tick, interact, longtask, cold = [load(p) for p in paths]
artifact = {
  'meta': {'url': url, 'label': label, 'timestamp': ts, 'ua': static.get('ua'), 'viewport': static.get('viewport')},
  'cold_load': {
    'timing': static.get('timing'),
    'map_data_json': static.get('map_data_json'),
    'resources': static.get('resources'),
    'time_to_settled_ms': cold.get('time_to_settled_ms'),
    'long_tasks': {
      'count': cold.get('long_task_count'),
      'total_ms': cold.get('long_task_total_ms'),
      'max_ms': cold.get('long_task_max_ms'),
      'entries': cold.get('long_tasks_during_load'),
    },
  },
  'data': static.get('data_loaded'),
  'view': static.get('view'),
  'simulation_state': static.get('simulation'),
  'dom': static.get('dom'),
  'heap': static.get('heap'),
  'drag_reheat_benchmark': tick,
  'pan_zoom_fps': interact,
  'idle_long_tasks_2s': longtask,
}
with open(out_file, 'w') as f:
    json.dump(artifact, f, indent=2)

# Print summary
def g(d, *keys):
    for k in keys:
        if d is None: return None
        d = d.get(k) if isinstance(d, dict) else None
    return d

print()
print('=' * 72)
print(f"  map performance artifact: {out_file}")
print('=' * 72)
print(f"  data:       {g(artifact,'data')}")
print(f"  view:       {g(artifact,'view','entity_count_text')}")
dom = artifact.get('dom') or {}
print(f"  dom total:  {dom.get('map_container')}  (g={dom.get('g')} circle={dom.get('circle')} line={dom.get('line')} clipPath={dom.get('clipPath')} pattern={dom.get('pattern')})")
t = artifact['cold_load']['timing'] or {}
print(f"  cold load:  FCP={t.get('first_contentful_paint_ms')}ms  DCL={t.get('dom_content_loaded_ms')}ms  load={t.get('load_event_ms')}ms")
print(f"  time-to-settled:  {artifact['cold_load'].get('time_to_settled_ms')}ms  <-- user-visible 'map is ready'")
clt = artifact['cold_load'].get('long_tasks') or {}
print(f"  cold long-tasks:  count={clt.get('count')}  total={clt.get('total_ms')}ms  max={clt.get('max_ms')}ms")
md = artifact['cold_load']['map_data_json'] or {}
print(f"  map-data:   transfer={md.get('transfer_kb')}KB  decoded={md.get('decoded_kb')}KB")
tb = artifact['drag_reheat_benchmark'] or {}
print(f"  drag reheat:  count={tb.get('tick_count')}  avg={tb.get('tick_avg_ms')}ms  p95={tb.get('tick_p95_ms')}ms  wall={tb.get('wall_ms')}ms  fps={tb.get('effective_fps')}")
pz = artifact['pan_zoom_fps'] or {}
print(f"  pan/zoom:   fps={pz.get('effective_fps')}  avg_gap={pz.get('avg_gap_ms')}ms  p95_gap={pz.get('p95_gap_ms')}ms  max_gap={pz.get('max_gap_ms')}ms")
lt = artifact['idle_long_tasks_2s'] or {}
print(f"  idle tasks: count={lt.get('count')}  total={lt.get('total_ms')}ms (post-settle 2s window)")
heap = artifact.get('heap') or {}
print(f"  heap:       {heap.get('used_mb')}MB used / {heap.get('total_mb')}MB total")
print('=' * 72)
PY

# Keep browser open for reuse (close with: agent-browser --session mapperf close)
