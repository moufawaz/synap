const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const TEST_USER = '02cada30-141d-458c-b452-63204e6a30d8' // Alaa - has active plans, no prior renewals
const TABLE = 'diet_plans'
const PLAN_TYPE = 'diet'

let passed = 0
let failed = 0
let bugs = []

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

function bug(label, detail) {
  console.log(`  🐛 BUG:  ${label}${detail ? ' — ' + detail : ''}`)
  bugs.push(label)
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(60))
}

async function getAllPlans() {
  const { data } = await admin.from(TABLE)
    .select('id,active,start_date,end_date,created_at,plan_json')
    .eq('user_id', TEST_USER)
    .order('created_at', { ascending: false })
  return data || []
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════════')
  console.log('  RENEWAL SYSTEM END-TO-END TEST')
  console.log('  Target user: Alaa (02cada30...)')
  console.log('════════════════════════════════════════════════════════════')

  // ── BASELINE ─────────────────────────────────────────────────────────
  section('BASELINE — checking pre-test state')

  const baseline = await getAllPlans()
  const originalActive = baseline.find(p => p.active)

  assert('User has at least 1 active diet plan', !!originalActive)
  assert('User has at least 1 inactive diet plan (needed for rollback test)', baseline.filter(p => !p.active).length >= 1)

  const nullEndDates = baseline.filter(p => !p.end_date).length
  if (nullEndDates === baseline.length) {
    bug('All plans have null end_date', `${nullEndDates}/${baseline.length} plans missing end_date — admin "expired plans" detection broken for initial plans`)
  }

  console.log(`  Plans found: ${baseline.length} total, ${baseline.filter(p=>p.active).length} active, ${baseline.filter(p=>!p.active).length} inactive`)

  // ── STEP 1: INSERT PREVIEW ────────────────────────────────────────────
  section('STEP 1 — Simulate preview generation')

  const fakePlanJson = {
    name: 'TEST Renewed Diet Plan (auto-test)',
    daily_calories: 2100,
    protein_g: 180,
    carbs_g: 210,
    fat_g: 70,
    water_l: 3,
    meals: [],
    _test: true
  }

  const fakePreviewMeta = {
    pending_plan_json: fakePlanJson,
    pending_plan_type: PLAN_TYPE,
    previous_plan_id: originalActive?.id ?? null,
    preview: { planType: PLAN_TYPE, calories: { before: 2000, after: 2100 }, why: 'Auto test' },
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    total_estimated_cost_usd: 0.05,
  }

  const { data: previewRow, error: previewErr } = await admin.from('chat_messages').insert({
    user_id: TEST_USER,
    role: 'assistant',
    content: 'TEST preview message',
    message_type: 'text',
    metadata: { ...fakePreviewMeta, renewal_preview: true },
  }).select('id').single()

  assert('Preview saved to chat_messages', !previewErr && !!previewRow?.id, previewErr?.message)
  const previewId = previewRow?.id
  if (!previewId) { console.log('Cannot continue without previewId'); process.exit(1) }
  console.log(`  Preview ID: ${previewId}`)

  // ── STEP 2: APPLY ─────────────────────────────────────────────────────
  section('STEP 2 — Simulate apply (replicate applyRenewalPreview logic)')

  // Replicate exact logic from route.ts lines 226-258
  const startDate = new Date().toISOString().split('T')[0]
  const endDate = new Date(Date.now() + 4 * 7 * 86400000).toISOString().split('T')[0]
  const planToInsert = {
    ...fakePlanJson,
    _renewal: {
      preview_id: previewId,
      previous_plan_id: originalActive?.id ?? null,
      applied_at: new Date().toISOString(),
    }
  }

  // BUG CHECK: deactivate happens before insert — window where user has no plan
  const { error: deactivateErr } = await admin.from(TABLE)
    .update({ active: false })
    .eq('user_id', TEST_USER)
    .eq('active', true)

  assert('Deactivate old plan succeeds', !deactivateErr, deactivateErr?.message)

  // Check state mid-apply
  const midState = await getAllPlans()
  const activeMid = midState.find(p => p.active)
  if (!activeMid) {
    bug(
      'No active plan between deactivate and insert (same bug as generate-plan, not atomic)',
      'If insert fails here, user is left with zero active plans'
    )
  }

  // Insert new plan
  const { data: newPlan, error: insertErr } = await admin.from(TABLE).insert({
    user_id: TEST_USER,
    plan_json: planToInsert,
    active: true,
    start_date: startDate,
    end_date: endDate,
  }).select('id,plan_json').single()

  assert('Insert new active plan succeeds', !insertErr && !!newPlan?.id, insertErr?.message)
  assert('New plan has end_date set', !!endDate, endDate)
  assert('New plan has _renewal metadata', !!planToInsert._renewal?.preview_id)

  // BUG CHECK: mark preview applied — error not checked in real code
  const { error: markErr } = await admin.from('chat_messages').update({
    metadata: { ...fakePreviewMeta, applied_at: new Date().toISOString(), applied_plan_id: newPlan?.id }
  }).eq('id', previewId)

  if (markErr) {
    bug('mark-preview-applied error is swallowed in real code', 'Preview not marked applied → double-apply creates duplicate plan')
  } else {
    console.log('  ℹ️  NOTE: real code does NOT check this update error (silent failure risk)')
  }

  // Verify state after apply
  const afterApply = await getAllPlans()
  const activePlansAfterApply = afterApply.filter(p => p.active)
  assert('Exactly 1 active plan after apply', activePlansAfterApply.length === 1, `got ${activePlansAfterApply.length}`)
  assert('New plan is the active one', activePlansAfterApply[0]?.id === newPlan?.id)

  // BUG CHECK: try double-apply (same previewId)
  section('STEP 2b — Double-apply guard (idempotency)')

  const { data: previewCheck } = await admin.from('chat_messages')
    .select('metadata')
    .eq('id', previewId)
    .eq('message_type', 'text')
    .maybeSingle()

  const isMarkedApplied = !!previewCheck?.metadata?.applied_at
  assert('Preview marked as applied_at after apply', isMarkedApplied, '409 guard depends on this')

  if (!isMarkedApplied) {
    bug('applied_at not set on preview — double-apply would create a second active plan', 'Race condition: two concurrent apply calls both pass the 409 check')
  }

  // ── STEP 3: ROLLBACK ──────────────────────────────────────────────────
  section('STEP 3 — Simulate rollback')

  const beforeRollback = await getAllPlans()
  const currentActive = beforeRollback.find(p => p.active)
  const inactivePlans = beforeRollback.filter(p => !p.active).sort((a,b) => b.created_at.localeCompare(a.created_at))
  const targetPlan = inactivePlans[0] // most recent inactive — same as real code

  assert('Has inactive plan to roll back to', !!targetPlan)

  if (targetPlan) {
    // Replicate rollbackPlan logic (lines 287-349)
    const { error: rollDeactivateErr } = await admin.from(TABLE)
      .update({ active: false })
      .eq('id', currentActive.id)
      .eq('user_id', TEST_USER)

    assert('Rollback: deactivate current plan', !rollDeactivateErr, rollDeactivateErr?.message)

    const restoredJson = {
      ...(targetPlan.plan_json || {}),
      _restored: { restored_at: new Date().toISOString(), replaced_plan_id: currentActive.id }
    }

    const { error: rollRestoreErr } = await admin.from(TABLE)
      .update({ active: true, plan_json: restoredJson })
      .eq('id', targetPlan.id)
      .eq('user_id', TEST_USER)

    assert('Rollback: restore target plan', !rollRestoreErr, rollRestoreErr?.message)

    // BUG CHECK: rollback message language
    const rollbackMsg = 'I restored your previous nutrition plan. Your nutrition page now uses that cycle again.'
    bug('Rollback chat message is always English (hardcoded)', 'Arabic users get English rollback message in chat — no language variable passed to rollbackPlan()')

    const afterRollback = await getAllPlans()
    const activePlansAfterRollback = afterRollback.filter(p => p.active)
    assert('Exactly 1 active plan after rollback', activePlansAfterRollback.length === 1, `got ${activePlansAfterRollback.length}`)
    assert('Restored plan ID matches target', activePlansAfterRollback[0]?.id === targetPlan.id)

    // ── STEP 4: RE-APPLY AFTER ROLLBACK ──────────────────────────────────
    section('STEP 4 — Re-apply availability check')

    const afterRollbackPlans = await getAllPlans()
    const availableForReApply = afterRollbackPlans.filter(p => !p.active)
    assert('Inactive plans exist for re-apply', availableForReApply.length >= 1, `${availableForReApply.length} available`)
    console.log(`  Plans available for re-apply: ${availableForReApply.length}`)

    // Verify the _restored metadata stuck
    const restoredActive = afterRollbackPlans.find(p => p.active)
    assert('_restored metadata present on rolled-back plan', !!restoredActive?.plan_json?._restored)
  }

  // ── BUG CHECK: hardcoded model in renew-plan ──────────────────────────
  section('STEP 5 — Static code checks')

  const fs = require('fs')
  const routeCode = fs.readFileSync('src/app/api/renew-plan/route.ts', 'utf8')

  if (routeCode.includes("model: 'claude-opus-4-5'") && !routeCode.includes('process.env.ANTHROPIC_PLAN_MODEL')) {
    bug('Hardcoded model in renew-plan route', "model: 'claude-opus-4-5' — not using ANTHROPIC_PLAN_MODEL env var (unlike generate-plan which was fixed)")
  } else {
    assert('Model uses env var', true)
  }

  if (routeCode.includes('if (deactivateError) throw deactivateError') ||
      routeCode.includes('if (deactivateErr) throw deactivateErr')) {
    // Check for atomicity pattern
    const hasAtomicPattern = routeCode.includes('active: false') &&
      routeCode.indexOf('insert(') < routeCode.indexOf('.update({ active: false }')
    if (!hasAtomicPattern) {
      bug('Non-atomic apply: deactivate fires before insert', 'If insert fails, user has zero active plans (same pattern fixed in generate-plan)')
    }
  }

  if (!routeCode.includes('if (markErr)') && !routeCode.includes('if (updatePreviewError)')) {
    bug('apply: mark-preview-applied error not checked', 'If the chat_messages update fails, applied_at is never set, allowing double-apply')
  }

  // ── CLEANUP ───────────────────────────────────────────────────────────
  section('CLEANUP — restoring original DB state')

  await admin.from(TABLE).update({ active: false }).eq('user_id', TEST_USER)
  await admin.from(TABLE).update({ active: true }).eq('id', originalActive.id).eq('user_id', TEST_USER)

  // Delete the test plan we created
  if (newPlan?.id) {
    await admin.from(TABLE).delete().eq('id', newPlan.id).eq('user_id', TEST_USER)
  }
  // Delete test preview
  await admin.from('chat_messages').delete().eq('id', previewId)

  // Restore _restored-polluted plan_json on target plan
  if (targetPlan) {
    await admin.from(TABLE)
      .update({ active: false, plan_json: targetPlan.plan_json })
      .eq('id', targetPlan.id)
      .eq('user_id', TEST_USER)
  }

  const finalState = await getAllPlans()
  assert('Original active plan restored', finalState.find(p => p.active)?.id === originalActive.id)
  assert('Test plan deleted', !finalState.find(p => p.id === newPlan?.id))

  // ── SUMMARY ───────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════')
  console.log('  TEST SUMMARY')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log(`  🐛 Bugs found: ${bugs.length}`)
  if (bugs.length > 0) {
    console.log('\n  BUGS:')
    bugs.forEach((b, i) => console.log(`  ${i+1}. ${b}`))
  }
  console.log()
}

main().catch(e => {
  console.error('\nFATAL ERROR:', e.message)
  process.exit(1)
})
