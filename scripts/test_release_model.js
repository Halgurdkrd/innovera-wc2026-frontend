// Node-runnable tests for the release model (no test runner in this repo):
//   node scripts/test_release_model.js
// Covers: nextPollDelayMs cadence, ReleasePoller scheduling (fake timers),
// status resolution (new fields + legacy fallback), notice localization,
// XI-only bench rule, and intent routing + fixture-based answers for the
// four release questions. Uses sucrase to load the TypeScript modules.
require('sucrase/register')
const assert = require('assert')

const rs = require('../lib/fantasy/releaseStatus')
const { ReleasePoller } = require('../lib/fantasy/releasePoller')
const { IntentRouter } = require('../lib/services/fantasyChat/intentRouter')
const rq = require('../lib/services/fantasyChat/releaseQuestions')

let failures = 0
let passes = 0
function test(name, fn) {
  try { fn(); passes++; console.log(`  [PASS] ${name}`) } catch (e) { failures++; console.log(`  [FAIL] ${name}\n         ${e.message}`) }
}
async function atest(name, fn) {
  try { await fn(); passes++; console.log(`  [PASS] ${name}`) } catch (e) { failures++; console.log(`  [FAIL] ${name}\n         ${e.message}`) }
}

const NOW = Date.parse('2026-09-19T12:00:00Z')
const min = (n) => n * 60000
const iso = (ms) => new Date(ms).toISOString()

console.log('--- nextPollDelayMs ---')
test('IN_PROGRESS -> 30s', () => assert.strictEqual(rs.nextPollDelayMs({ resultsStatus: 'IN_PROGRESS', nowMs: NOW }), 30000))
test('fixture in progress -> 30s even if status says NOT_STARTED', () => assert.strictEqual(rs.nextPollDelayMs({ resultsStatus: 'NOT_STARTED', fixturesInProgress: 1, nowMs: NOW }), 30000))
test('kickoff in 15 min -> 30s', () => assert.strictEqual(rs.nextPollDelayMs({ resultsStatus: 'NOT_STARTED', nextKickoffUtc: iso(NOW + min(15)), nowMs: NOW }), 30000))
test('kickoff in 20 min boundary -> 30s', () => assert.strictEqual(rs.nextPollDelayMs({ resultsStatus: 'NOT_STARTED', nextKickoffUtc: iso(NOW + min(20)), nowMs: NOW }), 30000))
test('kickoff in 21 min -> 10 min', () => assert.strictEqual(rs.nextPollDelayMs({ resultsStatus: 'NOT_STARTED', nextKickoffUtc: iso(NOW + min(21)), nowMs: NOW }), 600000))
test('kickoff already passed (data lag) -> 30s', () => assert.strictEqual(rs.nextPollDelayMs({ resultsStatus: 'NOT_STARTED', nextKickoffUtc: iso(NOW - min(5)), nowMs: NOW }), 30000))
test('PROVISIONAL not finalized -> 120s', () => assert.strictEqual(rs.nextPollDelayMs({ resultsStatus: 'PROVISIONAL', finalized: false, nowMs: NOW }), 120000))
test('finalized -> stop (null)', () => assert.strictEqual(rs.nextPollDelayMs({ resultsStatus: 'FINAL', finalized: true, nowMs: NOW }), null))
test('finalized wins over in-progress signals', () => assert.strictEqual(rs.nextPollDelayMs({ resultsStatus: 'IN_PROGRESS', finalized: true, nowMs: NOW }), null))
test('NOT_STARTED / NOT_TRACKED / unknown -> 10 min', () => {
  for (const r of ['NOT_STARTED', 'NOT_TRACKED', undefined, null]) assert.strictEqual(rs.nextPollDelayMs({ resultsStatus: r, nowMs: NOW }), 600000)
})
test('backoff doubles from 30s and caps at 5 min', () => {
  const d = (e) => rs.nextPollDelayMs({ resultsStatus: 'IN_PROGRESS', nowMs: NOW, consecutiveErrors: e })
  assert.deepStrictEqual([d(0), d(1), d(2), d(3), d(4), d(5), d(20)], [30000, 60000, 120000, 240000, 300000, 300000, 300000])
})
test('backoff never makes the 10-min idle cadence faster', () => assert.strictEqual(rs.nextPollDelayMs({ resultsStatus: 'NOT_STARTED', nowMs: NOW, consecutiveErrors: 3 }), 600000))
test('backoff still stops when finalized', () => assert.strictEqual(rs.nextPollDelayMs({ finalized: true, nowMs: NOW, consecutiveErrors: 3 }), null))

console.log('--- ReleasePoller (fake timers) ---')
function avail(over) {
  return Object.assign({
    status: 'AVAILABLE', gameweek: 5,
    forecast: { status: 'EARLY', release_id: 'early-1', generated_at_utc: '2026-09-18T08:00:00Z' },
    results: { status: 'NOT_STARTED', revision: null, finalized: false },
    bundle: { manifest_hash: 'm1' },
  }, over || {})
}
function harness(responses, opts) {
  opts = opts || {}
  const timers = []
  let hidden = !!opts.hidden
  const calls = { fetch: 0, aborted: 0, maxConcurrent: 0, concurrent: 0 }
  const statuses = []
  const changes = []
  const errors = []
  let i = 0
  const poller = new ReleasePoller({
    fetchStatus: (signal) => {
      calls.fetch++
      calls.concurrent++
      calls.maxConcurrent = Math.max(calls.maxConcurrent, calls.concurrent)
      const r = responses[Math.min(i++, responses.length - 1)]
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => { calls.aborted++; calls.concurrent--; reject(new Error('aborted')) })
        setImmediate(() => {
          if (signal.aborted) return
          calls.concurrent--
          if (r instanceof Error) reject(r); else resolve(r)
        })
      })
    },
    onStatus: (s) => statuses.push(s),
    onChange: (n, p) => changes.push([n, p]),
    onError: (e, n) => errors.push(n),
    isHidden: () => hidden,
    now: () => NOW,
    setTimer: (fn, ms) => { const t = { fn, ms, cleared: false, fired: false }; timers.push(t); return t },
    clearTimer: (t) => { t.cleared = true },
  })
  const pending = () => timers.filter((t) => !t.cleared && !t.fired)
  const flush = () => new Promise((r) => setTimeout(r, 5))
  const fire = async () => { const t = pending()[0]; t.fired = true; t.fn(); await flush() }
  return { poller, timers, pending, fire, flush, calls, statuses, changes, errors, setHidden: (h) => { hidden = h; poller.setHidden(h) } }
}

async function main() {
  await atest('first fetch on start, then schedules 10 min when NOT_STARTED', async () => {
    const h = harness([avail()])
    h.poller.start(); await h.flush()
    assert.strictEqual(h.calls.fetch, 1)
    assert.strictEqual(h.pending().length, 1)
    assert.strictEqual(h.pending()[0].ms, 600000)
    h.poller.stop()
  })
  await atest('no overlapping fetches (refreshNow while in flight ignored)', async () => {
    const h = harness([avail()])
    h.poller.start(); h.poller.refreshNow(); h.poller.refreshNow(); await h.flush()
    assert.strictEqual(h.calls.fetch, 1); assert.strictEqual(h.calls.maxConcurrent, 1)
    h.poller.stop()
  })
  await atest('release id change (early -> final) fires onChange once', async () => {
    const h = harness([avail(), avail({ forecast: { status: 'FINAL_FROZEN', release_id: 'final-1' } })])
    h.poller.start(); await h.flush()
    assert.strictEqual(h.changes.length, 0)
    await h.fire()
    assert.strictEqual(h.changes.length, 1)
    assert.strictEqual(h.changes[0][0].forecast.release_id, 'final-1')
    assert.strictEqual(h.changes[0][1].forecast.release_id, 'early-1')
    h.poller.stop()
  })
  await atest('results revision change fires onChange; identical status does not', async () => {
    const a = avail({ results: { status: 'IN_PROGRESS', revision: 1 } })
    const b = avail({ results: { status: 'IN_PROGRESS', revision: 1 } })
    const c = avail({ results: { status: 'IN_PROGRESS', revision: 2 } })
    const h = harness([a, b, c])
    h.poller.start(); await h.flush(); await h.fire(); assert.strictEqual(h.changes.length, 0)
    await h.fire(); assert.strictEqual(h.changes.length, 1)
    assert.strictEqual(h.pending()[0].ms, 30000)
    h.poller.stop()
  })
  await atest('manifest hash change fires onChange', async () => {
    const h = harness([avail(), avail({ bundle: { manifest_hash: 'm2' } })])
    h.poller.start(); await h.flush(); await h.fire()
    assert.strictEqual(h.changes.length, 1)
    h.poller.stop()
  })
  await atest('errors back off exponentially with cap and recover', async () => {
    const e = new Error('x')
    const h = harness([e, e, e, e, e, e, avail({ results: { status: 'IN_PROGRESS' } })])
    h.poller.start(); await h.flush()
    const delays = [h.pending()[0].ms]
    for (let k = 0; k < 5; k++) { await h.fire(); delays.push(h.pending()[0].ms) }
    assert.deepStrictEqual(delays, [60000, 120000, 240000, 300000, 300000, 300000])
    await h.fire() // success
    assert.strictEqual(h.poller.consecutiveErrors, 0)
    assert.strictEqual(h.pending()[0].ms, 30000)
    h.poller.stop()
  })
  await atest('non-AVAILABLE payload counts as an error', async () => {
    const h = harness([{ status: 'TEMPORARILY_UNAVAILABLE' }])
    h.poller.start(); await h.flush()
    assert.strictEqual(h.errors.length, 1); assert.strictEqual(h.statuses.length, 0)
    h.poller.stop()
  })
  await atest('stops polling once finalized', async () => {
    const h = harness([avail({ results: { status: 'FINAL', finalized: true } })])
    h.poller.start(); await h.flush()
    assert.strictEqual(h.pending().length, 0); assert.strictEqual(h.poller.isFinished, true)
    h.setHidden(true); h.setHidden(false); await h.flush()
    assert.strictEqual(h.calls.fetch, 1, 'no refresh on visibility after finalized')
    h.poller.stop()
  })
  await atest('pauses when hidden, refreshes once on becoming visible', async () => {
    const h = harness([avail({ results: { status: 'IN_PROGRESS', revision: 1 } })])
    h.poller.start(); await h.flush()
    assert.strictEqual(h.calls.fetch, 1)
    h.setHidden(true)
    assert.strictEqual(h.pending().length, 0, 'timer cleared while hidden')
    h.setHidden(false); await h.flush()
    assert.strictEqual(h.calls.fetch, 2)
    assert.strictEqual(h.pending().length, 1)
    h.poller.stop()
  })
  await atest('starting while hidden defers the first fetch until visible', async () => {
    const h = harness([avail()], { hidden: true })
    h.poller.start(); await h.flush()
    assert.strictEqual(h.calls.fetch, 0)
    h.setHidden(false); await h.flush()
    assert.strictEqual(h.calls.fetch, 1)
    h.poller.stop()
  })
  await atest('hide while in flight aborts and does not block the visible refresh', async () => {
    const h = harness([avail(), avail()])
    h.poller.start()
    h.setHidden(true)
    h.setHidden(false); await h.flush()
    assert.strictEqual(h.calls.aborted, 1)
    assert.strictEqual(h.calls.fetch, 2)
    assert.strictEqual(h.statuses.length, 1)
    h.poller.stop()
  })
  await atest('stop() aborts in-flight and schedules nothing', async () => {
    const h = harness([avail()])
    h.poller.start(); h.poller.stop(); await h.flush()
    assert.strictEqual(h.calls.aborted, 1); assert.strictEqual(h.pending().length, 0); assert.strictEqual(h.statuses.length, 0)
  })

  console.log('--- status resolution ---')
  test('new fields are preferred over legacy status (frozen forecast stays FINAL_FROZEN once live)', () => {
    const d = rs.deriveRowRelease({ status: 'LIVE_PROVISIONAL', forecast_status: 'FINAL_FROZEN', results_status: 'IN_PROGRESS' })
    assert.strictEqual(d.forecast, 'FINAL_FROZEN'); assert.strictEqual(d.results, 'IN_PROGRESS'); assert.ok(d.tracked && d.live)
  })
  test('legacy fallbacks', () => {
    const f = (status, meta) => rs.deriveRowRelease({ status, live_results_meta: meta })
    assert.deepStrictEqual([f('EARLY_FORECAST_SUBJECT_TO_UPDATE').forecast, f('EARLY_FORECAST_SUBJECT_TO_UPDATE').results], ['EARLY', 'NOT_TRACKED'])
    assert.deepStrictEqual([f('FINAL_FROZEN_FORECAST').forecast, f('FINAL_FROZEN_FORECAST').results], ['FINAL_FROZEN', 'NOT_STARTED'])
    assert.deepStrictEqual([f('HISTORICAL_RECONSTRUCTION').forecast, f('HISTORICAL_RECONSTRUCTION').results], ['HISTORICAL_RECONSTRUCTION', 'NOT_TRACKED'])
    assert.strictEqual(f('LIVE_PROVISIONAL', { fixtures_total: 10, fixtures_not_started: 4 }).results, 'IN_PROGRESS')
    assert.strictEqual(f('LIVE_PROVISIONAL', { fixtures_total: 10, fixtures_not_started: 0 }).results, 'PROVISIONAL')
    assert.strictEqual(f('LIVE_PROVISIONAL', { fixtures_total: 10, fixtures_not_started: 0, event_officially_finalized: true }).results, 'FINAL')
  })
  test('labels exist in EN and KU for every status and match the required wording', () => {
    for (const f of ['EARLY', 'FINAL_FROZEN', 'HISTORICAL_RECONSTRUCTION', 'NONE']) for (const l of ['EN', 'KU']) assert.ok(rs.forecastLabel(f, l).length > 1)
    for (const r of ['NOT_STARTED', 'IN_PROGRESS', 'PROVISIONAL', 'FINAL', 'NOT_TRACKED']) for (const l of ['EN', 'KU']) assert.ok(rs.resultsLabel(r, l).length > 1)
    assert.strictEqual(rs.forecastLabel('EARLY', 'EN'), 'Early forecast -- subject to update')
    assert.strictEqual(rs.resultsLabel('PROVISIONAL', 'EN'), 'Gameweek matches complete -- points provisional')
  })
  test('notices localize (EN + KU) with the right timestamp; unknown code falls back to text_en', () => {
    const status = avail({ forecast: { status: 'EARLY', generated_at_utc: '2026-09-18T08:00:00Z' }, results: { last_updated_utc: '2026-09-19T11:00:00Z' } })
    const fmt = (i) => rs.formatUtc(i)
    for (const code of ['FINAL_NOT_REGISTERED_DEADLINE_PASSED', 'EARLY_FORECAST_STALE', 'RESULTS_STALE', 'MATCHES_COMPLETE_POINTS_PROVISIONAL', 'FINAL_REGISTRATION_PENDING_PUBLICATION']) {
      const en = rs.localizeNotice({ code, severity: 'info', text_en: 'x' }, status, 'EN', fmt)
      const ku = rs.localizeNotice({ code, severity: 'info', text_en: 'x' }, status, 'KU', fmt)
      assert.ok(en !== 'x' && ku !== 'x' && en !== ku, code)
      assert.ok(!en.includes('{time}') && !ku.includes('{time}'), code)
    }
    assert.ok(rs.localizeNotice({ code: 'FINAL_NOT_REGISTERED_DEADLINE_PASSED' }, status, 'EN', fmt).includes('2026-09-18 08:00 UTC'))
    assert.ok(rs.localizeNotice({ code: 'RESULTS_STALE' }, status, 'EN', fmt).includes('2026-09-19 11:00 UTC'))
    assert.strictEqual(rs.localizeNotice({ code: 'SOMETHING_NEW', text_en: 'hello' }, status, 'KU', fmt), 'hello')
  })
  test('XI-only objects render no bench; any object without BENCH players has none', () => {
    const withBench = [{ role: 'XI' }, { role: 'BENCH' }]
    for (const o of ['PRIMARY', 'OPTIONAL_XI_1', 'OPTIONAL_XI_2', 'OPTIONAL_XI_3', 'OPTIONAL_XI_4']) assert.strictEqual(rs.objectHasBench(o, withBench), false, o)
    assert.strictEqual(rs.objectHasBench('OWN_START', withBench), true)
    assert.strictEqual(rs.objectHasBench('B_LEGAL_BEST_XI', [{ role: 'XI' }]), false)
    assert.strictEqual(rs.objectHasBench('A_BLANK_SLATE', undefined), false)
  })
  test('reconciliation line', () => {
    const row = { reconciliation: { xi_raw: 40, captain_extra: 9, autosub_adjustment: 2, hit_cost: 4, total: 47, ok: true } }
    assert.strictEqual(rs.reconciliationLine(row, 'EN'), 'XI raw 40 + captain/vice extra 9 + autosub 2 - hits 4 = 47')
    assert.ok(rs.reconciliationLine(row, 'KU').includes('47'))
    assert.strictEqual(rs.reconciliationLine({}, 'EN'), null)
  })

  console.log('--- intent routing of the four release questions ---')
  const route = (q) => IntentRouter.routeIntent(q, [])
  const eachQ = (qs, kind) => {
    for (const q of qs) {
      assert.strictEqual(route(q), 'LIVE_GAMEWEEK', 'route: ' + q)
      assert.strictEqual(rq.classifyReleaseQuestion(q), kind, 'kind: ' + q)
    }
  }
  test('expected points', () => eachQ(['What are our expected points?', 'what is our predicted total?', "What are the AI Manager's expected points this gameweek?", 'how many expected points do we have'], 'EXPECTED_POINTS'))
  test('actual points so far', () => eachQ(['How many actual points do we have so far?', 'how many points do we have so far', 'What is our score so far?', 'our current points?'], 'ACTUAL_SO_FAR'))
  test('who still has to play', () => eachQ(['Who still has to play?', 'who is yet to play', 'Who has not played yet?', "Who hasn't played yet?"], 'YET_TO_PLAY'))
  test('are these points final', () => eachQ(['Are these points final?', 'are our points final', 'Is the score final?', 'Are the points provisional?'], 'POINTS_FINAL'))
  test('unrelated questions are not captured', () => {
    for (const q of ['Who should I captain?', 'What are the highest xP forwards?', 'What is xP?', "What are Haaland's expected points?", 'how many points did Gakpo get?']) {
      assert.strictEqual(rq.classifyReleaseQuestion(q), null, q)
    }
  })
  test('Sorani phrasing routes', () => {
    assert.strictEqual(rq.classifyReleaseQuestion('کێ هێشتا یاری نەکردووە؟'), 'YET_TO_PLAY')
    assert.strictEqual(rq.classifyReleaseQuestion('چەند خاڵمان هەیە؟'), 'ACTUAL_SO_FAR')
  })

  console.log('--- fixture answers ---')
  const players = () => [
    { name: 'Salah', role: 'XI', is_captain: true, actual_points: 8, match_status: 'FINISHED_PROVISIONAL', yet_to_play: false, points_final: false },
    { name: 'Haaland', role: 'XI', actual_points: null, match_status: 'NOT_STARTED', yet_to_play: true },
    { name: 'Saka', role: 'XI', actual_points: null, match_status: 'IN_PROGRESS', yet_to_play: false },
    { name: 'Gakpo', role: 'BENCH', actual_points: 0, match_status: 'DID_NOT_PLAY', yet_to_play: false },
  ]
  const earlyRow = { status: 'EARLY_FORECAST_SUBJECT_TO_UPDATE', forecast_status: 'EARLY', results_status: 'NOT_TRACKED', release_id: 'early-1', predicted_xi_total_xp: 61.23, players: [] }
  const liveRow = {
    status: 'LIVE_PROVISIONAL', forecast_status: 'FINAL_FROZEN', results_status: 'IN_PROGRESS', release_id: 'final-1', results_revision: 7,
    results_last_updated_utc: '2026-09-19T11:40:00Z', predicted_xi_total_xp: 64.5, points_so_far_total: 47,
    points_so_far_xi_raw: 40, captain_extra: 9, autosub_adjustment: 2, hit_cost_applied: 4, autosub_status: 'PENDING_UNRESOLVED_FIXTURES',
    reconciliation: { xi_raw: 40, captain_extra: 9, autosub_adjustment: 2, hit_cost: 4, total: 47, ok: true },
    players_yet_to_play: ['Haaland'], pending_adjustments: ['Autosubs pending'], players: players(),
  }
  const ans = (kind, row, lang, extra) => rq.buildReleaseAnswerText(Object.assign({ kind, lang: lang || 'en', gw: 5, objectLabel: 'AI Manager', row }, extra || {}))

  test('every answer states GW, object, forecast status and results update time', () => {
    for (const kind of ['EXPECTED_POINTS', 'ACTUAL_SO_FAR', 'YET_TO_PLAY', 'POINTS_FINAL']) {
      const a = ans(kind, liveRow)
      assert.ok(a.includes('GW5') && a.includes('AI Manager') && a.includes('Final frozen forecast'), kind + ': ' + a)
      assert.ok(a.includes('2026-09-19 11:40 UTC') && a.includes('r7'), kind + ': ' + a)
    }
  })
  test('(a) expected points: frozen xP, label unchanged while live', () => {
    const a = ans('EXPECTED_POINTS', liveRow)
    assert.ok(a.includes('64.5 xP') && a.includes('Final frozen forecast') && !/live provisional/i.test(a), a)
    assert.ok(a.includes('separate figure: 47'), a)
    const e = ans('EXPECTED_POINTS', earlyRow, 'en', { releaseStatus: avail() })
    assert.ok(e.includes('61.23 xP') && e.includes('Early forecast -- subject to update') && /subject to update/i.test(e), e)
    assert.ok(e.includes('2026-09-18 08:00 UTC'), 'early forecast update time: ' + e)
  })
  test('(b) actual points: breakdown, provisional; never substitutes predicted', () => {
    const a = ans('ACTUAL_SO_FAR', liveRow)
    assert.ok(a.includes('Actual points so far: 47 (provisional)') && a.includes('XI raw 40 + captain/vice extra 9 + autosub 2 - hits 4 = 47') && a.includes('Autosubs pending'), a)
    assert.ok(!a.includes('64.5'), 'predicted must not appear: ' + a)
    const e = ans('ACTUAL_SO_FAR', earlyRow)
    assert.ok(/No results are scored for this release/.test(e) && !e.includes('61.23') && !/ 0 points/.test(e), e)
    const ns = ans('ACTUAL_SO_FAR', Object.assign({}, liveRow, { results_status: 'NOT_STARTED', points_so_far_total: undefined }))
    assert.ok(/No matches have started/.test(ns), ns)
  })
  test('(c) yet to play by name (+ in progress)', () => {
    const a = ans('YET_TO_PLAY', liveRow)
    assert.ok(a.includes('Yet to play (1): Haaland.') && a.includes('Playing now (match in progress): Saka'), a)
    const derived = ans('YET_TO_PLAY', Object.assign({}, liveRow, { players_yet_to_play: undefined }))
    assert.ok(derived.includes('Haaland'), derived)
    assert.ok(/No results are tracked/.test(ans('YET_TO_PLAY', earlyRow)))
  })
  test('(d) final?: provisional vs final vs not tracked', () => {
    const prov = ans('POINTS_FINAL', Object.assign({}, liveRow, { results_status: 'PROVISIONAL' }))
    assert.ok(prov.includes('No -- Gameweek matches complete -- points provisional'), prov)
    const fin = ans('POINTS_FINAL', Object.assign({}, liveRow, { results_status: 'FINAL', finalization: { status: 'FINALIZED', net_points: 51 } }), 'en', { releaseStatus: avail({ results: { status: 'FINAL', finalized: true, officially_finalized: true } }) })
    assert.ok(fin.includes('Yes -- final: 51 net points (officially finalized)'), fin)
    assert.ok(/No -- there are no points to finalize/.test(ans('POINTS_FINAL', earlyRow)))
    const officialButNotOurs = ans('POINTS_FINAL', Object.assign({}, liveRow, { results_status: 'PROVISIONAL' }), 'en', { releaseStatus: avail({ results: { status: 'PROVISIONAL', officially_finalized: true, finalized: false } }) })
    assert.ok(officialButNotOurs.includes('official FPL event is finalized'), officialButNotOurs)
  })
  test('Sorani answers use the same labels as the page', () => {
    const a = ans('POINTS_FINAL', Object.assign({}, liveRow, { results_status: 'PROVISIONAL' }), 'ku')
    assert.ok(a.includes(rs.resultsLabel('PROVISIONAL', 'KU')) && a.includes(rs.forecastLabel('FINAL_FROZEN', 'KU')), a)
    const e = ans('EXPECTED_POINTS', earlyRow, 'ku')
    assert.ok(e.includes(rs.forecastLabel('EARLY', 'KU')), e)
  })

  console.log(`\n${passes} passed, ${failures} failed`)
  process.exit(failures ? 1 : 0)
}
main()
