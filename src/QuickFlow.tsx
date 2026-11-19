import { useEffect, useState } from 'react'
import { Button, Metric, Spinner, Text } from '@instructure/ui/v11_7'
import type { ReactNode } from 'react'
import SelectCourseStep from './SelectCourseStep'
import ContentStep from './ContentStep'
import RadioWithContent from './RadioWithContent'
import { DATE_ITEMS, rowInfo } from './fixDatesData'
import type { DateMode, FixDatesState, Included } from './fixDatesData'
import { RULE_LABEL, itemIdOf } from './reviewData'
import type { ReviewRow } from './reviewData'
import { nothingPicked } from './contentHelpers'
import type { CopyMode, Picked, Scope } from './contentHelpers'
import { useAppThemeKey, useSurfaceTokens } from './appTheme'

// The quick flow: the whole copy on one page. Four cards under each other, then the copy starts and the summary opens. No steps, no
// preview and no readiness check. The findings are only the ones of the cut flow (unused items, links, accessibility).
//   1 Choose the course   the same list and filters as step 1
//   2 Select content      the same choices as step 2, without the preview
//   3 Findings            the numbers, and one choice for all of them: include everything, or include it and add it to the to-do list
//   4 Dates               a way to move the dates. Moving them asks how to treat the days with no teaching, without listing the dates

function QuickCard({ number, title, description, children }: { number: number; title: string; description?: string; children: ReactNode }) {
  const t = useSurfaceTokens()
  const card = useAppThemeKey() !== 'legacy'
  return (
    <section
      aria-label={title}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.lg,
        ...(card ? { background: t.containerColor, borderRadius: t.radiusCardMd, boxShadow: t.shadowResting, padding: t.space.lg } : {}),
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.xs }}>
        <Text as="div" weight="bold" size="large">{`${number}. ${title}`}</Text>
        {description && <Text as="div" color="secondary">{description}</Text>}
      </div>
      {children}
    </section>
  )
}

export default function QuickFlow({
  course, onSelectCourse, scope, setScope, picked, setPicked, mode, setMode, rows, toDo, setToDo, dates, setDates, included, onCopy, onCancel,
}: {
  course: string
  onSelectCourse: (name: string) => void
  scope: Scope | null
  setScope: (s: Scope) => void
  picked: Picked
  setPicked: (p: Picked) => void
  mode: CopyMode
  setMode: (m: CopyMode) => void
  rows: ReviewRow[]
  // true: include everything and add the findings to the to-do list. false: include everything.
  toDo: boolean
  setToDo: (v: boolean) => void
  dates: FixDatesState
  setDates: (d: FixDatesState) => void
  included: Included
  onCopy: () => void
  onCancel: () => void
}) {
  const t = useSurfaceTokens()
  const card = useAppThemeKey() !== 'legacy'

  // The numbers of the findings: how many items need fixing, and how many have each kind of finding.
  const found = rows.filter((r) => r.hasSuggestion)
  const items = new Set(found.map(itemIdOf)).size
  const kinds = [...new Map(found.flatMap((r) => r.findings).map((f) => [f.rule.id, RULE_LABEL[f.rule.id] ?? f.rule.title])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([id, label]) => ({ id, label, count: found.filter((r) => r.findings.some((f) => f.rule.id === id)).length }))
  const tiles: [number, string][] = [[items, 'Need fixing'], ...kinds.map((k) => [k.count, k.label] as [number, string])]

  // Moving the dates asks what to do with the ones on a non-teaching day. The same choice as "Fix non-teaching days" in the dates step.
  const applyFix = (fixAll: 'before' | 'after') => {
    const next: FixDatesState['rows'] = {}
    for (const r of DATE_ITEMS.filter((i) => included(i.itemId)).map((i) => rowInfo(i, { ...dates, rows: {} }))) {
      if (r.closed) next[r.item.id] = { choice: fixAll, custom: '' }
      for (const sb of r.subs) if (sb.closed) next[sb.id] = { choice: fixAll, custom: '' }
    }
    setDates({ ...dates, mode: 'calendar', fixAll, rows: next })
  }
  const setMethod = (m: DateMode) => {
    if (m === 'calendar') applyFix(dates.fixAll || 'after')
    else setDates({ ...dates, mode: m, fixAll: '', rows: {} })
  }

  // Moving the dates starts with the next teaching day chosen, so nothing is left on a non-teaching day.
  useEffect(() => {
    if (dates.mode === 'calendar' && dates.fixAll === '') applyFix('after')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // After a click in card 2 (or when the course is chosen) the findings and the dates are worked out again, so a small loader
  // takes the place of cards 3 and 4 for a few seconds.
  const [busy, setBusy] = useState(false)
  // Switching between the whole course and part of it does not run it: with part of it and nothing ticked, cards 3 and 4 are not shown.
  const nothingChosen = scope === null || (scope === 'part' && nothingPicked(picked))
  const contentKey = `${course}|${mode}|${JSON.stringify(picked)}`
  useEffect(() => {
    if (!course) return
    setBusy(true)
    const id = window.setTimeout(() => setBusy(false), 2500)
    return () => window.clearTimeout(id)
  }, [contentKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const canCopy = !!course && !nothingChosen && !busy
  // The loader sits inside cards 3 and 4, which stay on the page, in place of what they show.
  const loader = (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: t.space.md, minHeight: '3rem' }}>
      <Spinner renderTitle="Working out the findings and the dates" size="x-small" />
      <Text color="secondary">Working out the findings and the dates…</Text>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: card ? t.space.xl : `calc(${t.space.xxl} + ${t.space.lg})` }}>
      <QuickCard number={1} title="Choose the course" description="Pick the course you want to copy content from. You can only pick one.">
        <SelectCourseStep bare selected={course} onSelect={onSelectCourse} />
      </QuickCard>

      {/* The other cards wait until a course is chosen, because what they show depends on it. */}
      {course && (
        <>
      <QuickCard number={2} title="Select content" description="Copy the whole course or only some learning objects.">
        <ContentStep bare noPreview scope={scope} setScope={setScope} picked={picked} setPicked={setPicked} mode={mode} setMode={setMode} />
      </QuickCard>

      {!nothingChosen && (
        <>
      <QuickCard number={3} title="Findings" description="What the check found in the content you are copying.">
        {busy ? loader : (
          <>
        {found.length === 0 ? (
          <Text as="div">Nothing needs fixing.</Text>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: t.space.lg }}>
            {tiles.map(([value, label], n) => (
              <div
                key={label}
                style={{
                  borderRadius: t.radiusCardMd,
                  padding: t.space.lg,
                  ...(card ? { background: t.pageColor } : { border: `${t.borderWidth} solid ${t.borderColor}` }),
                  ...(n === 0 ? { outline: `${t.borderWidth} solid ${t.borderColor}` } : {}),
                }}
              >
                <Metric textAlign="start" renderLabel={<Text size="medium">{label}</Text>} renderValue={String(value)} />
              </div>
            ))}
          </div>
        )}
        <RadioWithContent
          name="quick-findings"
          legend="What should happen with them?"
          value={toDo ? 'todo' : 'all'}
          onChange={(v) => setToDo(v === 'todo')}
          choices={[
            { value: 'all', label: 'Include everything', content: <Text as="div" color="secondary">All items are copied as they are.</Text> },
            { value: 'todo', label: 'Include everything and add the findings to my to-do list', content: <Text as="div" color="secondary">All items are copied, and each finding goes on your to-do list to fix after the copy.</Text> },
          ]}
        />
          </>
        )}
      </QuickCard>

      <QuickCard number={4} title="Dates" description="How the dates of the items move to the new term.">
        {busy ? loader : (
          <>
        <RadioWithContent
          name="quick-dates"
          legend="Method"
          value={dates.mode}
          onChange={(v) => setMethod(v as DateMode)}
          choices={[
            {
              value: 'calendar',
              label: 'Move dates to the new term',
              content: (
                <>
                  <Text as="div" color="secondary">Each item keeps its week of term and weekday.</Text>
                  <RadioWithContent
                    name="quick-fix"
                    legend="Dates on a non-teaching day"
                    value={dates.fixAll || 'after'}
                    onChange={(v) => applyFix(v as 'before' | 'after')}
                    choices={[
                      { value: 'before', label: 'Move to the previous teaching day' },
                      { value: 'after', label: 'Move to the next teaching day' },
                    ]}
                  />
                </>
              ),
            },
            { value: 'keep', label: 'Keep the dates as they are', content: <Text as="div" color="secondary">Items keep the dates of the old course.</Text> },
            { value: 'clear', label: 'Clear dates and set them later', content: <Text as="div" color="secondary">Items are copied without dates.</Text> },
          ]}
        />
          </>
        )}
      </QuickCard>
        </>
      )}
        </>
      )}

      <div style={{ display: 'flex', gap: t.gapButtons, justifyContent: 'space-between', paddingTop: t.space.lg, borderTop: `${t.borderWidth} solid ${t.borderColor}` }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color="primary" onClick={onCopy} interaction={canCopy ? 'enabled' : 'disabled'}>Copy content</Button>
      </div>
    </div>
  )
}
