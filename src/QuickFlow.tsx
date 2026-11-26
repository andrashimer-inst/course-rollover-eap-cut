import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, DateInput, Heading, IconArrowOpenDownLine, IconArrowOpenUpLine, IconButton, IconInfoLine, IconSearchLine, ListOrderedInstUIIcon, Metric, RadioInput, ScreenReaderContent, Spinner, Text, TextInput, Tooltip } from '@instructure/ui/v11_7'
import type { ReactNode } from 'react'
import { SOURCE_COURSES } from './courseListData'
import StatusPill from './StatusPill'
import Pager from './Pager'
import ContentStep from './ContentStep'
import ChoiceCards from './ChoiceCards'
import { DATE_ITEMS, FALL_END, FALL_START, lastDayOf, parseStart, rowInfo, startFor } from './fixDatesData'
import type { DateMode, FixDatesState, Included } from './fixDatesData'
import { RULE_LABEL, itemIdOf } from './reviewData'
import type { ReviewRow } from './reviewData'
import { CONTENT_TYPES } from './courseContentData'
import { keys, nothingPicked, withPulledIn } from './contentHelpers'
import type { CopyMode, Picked, Scope } from './contentHelpers'
import { useAppThemeKey, useSurfaceTokens } from './appTheme'

// The quick flow: the whole copy on one page. Four cards under each other, then the copy starts and the summary opens. No steps, no
// preview and no readiness check. The findings are only the ones of the cut flow (unused items, links, accessibility).
//   1 Choose the course   the same list and filters as step 1
//   2 Select content      the same choices as step 2, without the preview
//   3 Content check       the numbers, and one choice for all of them: include everything, or include it and add it to the to-do list
//   4 Dates               a way to move the dates. Moving them asks how to treat the days with no teaching, without listing the dates

// What each kind of finding means, for the info icon next to it.
const WHAT_IT_MEANS: Record<string, string> = {
  'a11y-medium': "Text and its background don't have enough contrast, so some students can't read it easily.",
  'a11y-high': "An image has no text description, so a screen reader can't tell students what it shows.",
  'a11y-critical': "A video has no captions, so students who are deaf, hard of hearing or in a noisy place can't follow it.",
  links: 'A link points to the old course and shows an error after the copy.',
  'missing-links': "A link opens an LTI tool that Canvas can't connect during the copy. You link it again after the copy.",
  unused: 'No students, or only a few, opened or used this item last term.',
}

function QuickCard({ number, title, description, action, children }: { number: number; title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  const t = useSurfaceTokens()
  const card = useAppThemeKey() !== 'legacy'
  return (
    <section
      aria-label={title}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.lg,
        ...(card ? { background: t.containerColor, borderRadius: t.radiusCardMd, boxShadow: t.shadowResting, padding: t.space.xxl } : {}),
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: t.space.md, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.xs, flex: '1 1 20rem', minWidth: 0 }}>
          <Text as="div" weight="bold" size="large">{`${number}. ${title}`}</Text>
          {description && <Text as="div" color="secondary">{description}</Text>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// The course list of the quick flow: a search and the courses as cards. No filters, no sub-account, no dates. With nothing typed it shows
// the biology courses (the course is Cell Biology). A search looks through all courses by name, short code, SIS ID or teacher.
const isBiology = (code: string) => code.startsWith('BIO') || code === 'CHE 320'
function CourseCards({ selected, onSelect }: { selected: string; onSelect: (name: string) => void }) {
  const t = useSurfaceTokens()
  const [query, setQuery] = useState('')
  // Five courses a page, then the pages.
  const [page, setPage] = useState(1)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SOURCE_COURSES.filter((c) =>
      q ? `${c.name} ${c.code} ${c.sisId} ${c.teachers.join(' ')}`.toLowerCase().includes(q) : isBiology(c.code),
    )
  }, [query])
  const PAGE_SIZE = 5
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const pageRows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.lg }}>
      <TextInput
        renderLabel={<Text weight="bold">Search courses</Text>}
        placeholder="Course name, code, SIS ID or teacher"
        renderBeforeInput={<IconSearchLine />}
        value={query}
        onChange={(_e, value) => { setQuery(value); setPage(1) }}
      />
      <Text color="secondary" aria-live="polite">
        {`${shown.length} ${shown.length === 1 ? 'course' : 'courses'}`}
      </Text>
      {shown.length === 0 ? (
        <Text as="p">No course matches. Try another word.</Text>
      ) : (
        <div role="radiogroup" aria-label="Course to copy from" style={{ display: 'flex', flexDirection: 'column', gap: t.space.md, padding: '0.25rem' }}>
          {pageRows.map((c) => {
            const on = selected === c.name
            return (
              <div
                key={c.name}
                onClick={() => onSelect(c.name)}
                style={{
                  display: 'flex',
                  gap: t.space.md,
                  alignItems: 'flex-start',
                  padding: t.space.lg,
                  borderRadius: t.radiusCardMd,
                  cursor: 'pointer',
                  // Chosen: blue tint and blue border. Not chosen: a white card with an outline, like the choice cards further down.
                  background: on ? `color-mix(in srgb, ${t.linkColor} 8%, ${t.containerColor})` : t.containerColor,
                  // The chosen card is the same size as the others: the second line of the border is drawn inside it.
                  border: `${t.borderWidth} solid ${on ? t.linkColor : t.borderColor}`,
                  boxShadow: on ? `inset 0 0 0 ${t.borderWidth} ${t.linkColor}` : undefined,
                }}
              >
                <div style={{ flex: '0 0 1.5rem', width: '1.5rem', paddingBlockStart: '0.125rem' }}>
                  <RadioInput size="small" name="quick-course" value={c.name} checked={on} onChange={() => onSelect(c.name)} label={<ScreenReaderContent>{`Copy from ${c.name}`}</ScreenReaderContent>} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.sm, minWidth: 0 }}>
                  <Text weight="bold">{c.name}</Text>
                  <Text as="div" size="small" color="secondary">{[c.code, c.term, `SIS ID: ${c.sisId}`].join('  •  ')}</Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: t.space.sm, alignItems: 'center' }}>
                    <StatusPill size="xs" color="neutral">{c.subAccount}</StatusPill>
                    <Text size="small" color="secondary">Taught by {c.teachers.join(', ')}</Text>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Pager label="Course pages" page={current} pageCount={pageCount} onPage={setPage} />
    </div>
  )
}

export default function QuickFlow({
  course, onSelectCourse, scope, setScope, picked, setPicked, mode, setMode, rows, toDo, setToDo, skipUnused, setSkipUnused, dates, setDates, included, onCopy, onCancel, onSwitchToSteps,
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
  // true: the items that were unused last term are left out of the copy.
  skipUnused: boolean
  setSkipUnused: (v: boolean) => void
  dates: FixDatesState
  setDates: (d: FixDatesState) => void
  included: Included
  onCopy: () => void
  onCancel: () => void
  // Goes on in the step-by-step flow, at the review, with the course and content already chosen.
  onSwitchToSteps: () => void
}) {
  const t = useSurfaceTokens()
  const card = useAppThemeKey() !== 'legacy'

  // The numbers of the findings: how many items need fixing, and how many have each kind of finding.
  // The items flagged as unused last term can be left out of the copy. The findings below stay as they are, so the numbers do not change
  // when the box is ticked. Only the number of items that will be copied does.
  const unusedIds = new Set(rows.filter((r) => r.findings.some((f) => f.rule.id === 'unused')).map(itemIdOf))
  const found = rows.filter((r) => r.hasSuggestion)
  const items = new Set(found.map(itemIdOf)).size
  const kinds = [...new Map(found.flatMap((r) => r.findings).map((f) => [f.rule.id, RULE_LABEL[f.rule.id] ?? f.rule.title])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([id, label]) => ({ id, label, count: found.filter((r) => r.findings.some((f) => f.rule.id === id)).length }))
  // How many items are copied: what card 2 chose, without the modules themselves.
  const eff = withPulledIn(picked)
  const copyCount = CONTENT_TYPES.flatMap(keys).filter((k) => !k.startsWith('modules:') && (scope === 'whole' || eff[k])).length - (skipUnused ? unusedIds.size : 0)

  // Moving the dates asks what to do with the ones on a non-working day. The same choice as "Fix non-working days" in the dates step.
  const applyFix = (fixAll: 'before' | 'after', base: FixDatesState = dates) => {
    const next: FixDatesState['rows'] = {}
    for (const r of DATE_ITEMS.filter((i) => included(i.itemId)).map((i) => rowInfo(i, { ...base, rows: {} }))) {
      if (r.closed) next[r.item.id] = { choice: fixAll, custom: '' }
      for (const sb of r.subs) if (sb.closed) next[sb.id] = { choice: fixAll, custom: '' }
    }
    setDates({ ...base, mode: 'calendar', fixAll, rows: next })
  }
  // The first day of the new course. The last day moves with it, day by day, so the course keeps its length. A new first day puts the dates
  // on other days, so the days that are not working days are worked out again.
  const start = parseStart(dates.startText)
  const endOfCourse = (() => {
    if (!start) return null
    const end = new Date(lastDayOf(dates))
    end.setDate(end.getDate() + Math.round((start.getTime() - startFor(dates.mode, dates.startText).getTime()) / 86400000))
    return end
  })()
  const longDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const oldCourse = course || 'The old course'
  const changeStart = (text: string) => {
    const base: FixDatesState = { ...dates, startText: text, fixAll: '', rows: {} }
    if (parseStart(text)) applyFix(dates.fixAll || 'after', base)
    else setDates(base)
  }
  const setMethod = (m: DateMode) => {
    if (m === 'calendar') applyFix(dates.fixAll || 'after')
    else setDates({ ...dates, mode: m, fixAll: '', rows: {} })
  }

  // Moving the dates starts with the next working day chosen, so nothing is left on a non-working day.
  useEffect(() => {
    if (dates.mode === 'calendar' && dates.fixAll === '') applyFix('after')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // After a click in card 2 (or when the course is chosen) the findings and the dates are worked out again, so a small loader
  // takes the place of cards 3 and 4 for a few seconds.
  const [busy, setBusy] = useState(false)
  // The list of findings under "Need fixing" is folded until it is asked for.
  const [showKinds, setShowKinds] = useState(false)
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
      <QuickCard number={1} title="Choose the course" description="Choose the course you want to copy content from. You can pick one course. Search by name, code, SIS ID or teacher to find it.">
        <CourseCards selected={course} onSelect={onSelectCourse} />
      </QuickCard>

      {/* The other cards wait until a course is chosen, because what they show depends on it. */}
      {course && (
        <>
      <QuickCard number={2} title="Select content" description="Choose what you want to copy: the whole course, or only the learning objects you pick.">
        <ContentStep bare noPreview scope={scope} setScope={setScope} picked={picked} setPicked={setPicked} mode={mode} setMode={setMode} />
      </QuickCard>

      {!nothingChosen && (
        <>
      <QuickCard number={3} title="Content check" action={<Button renderIcon={<ListOrderedInstUIIcon />} onClick={onSwitchToSteps}>Switch to step by step</Button>} description="We checked the content you're copying for unused items, broken and missing links, and accessibility issues. The numbers show how many items have each kind of finding, so you know what might need your attention after the copy.">
        {busy ? loader : (
          <>
        {found.length === 0 ? (
          <Text as="div">Nothing needs fixing.</Text>
        ) : (
          // Two cards on the same level: all the items that are copied, and the ones that need fixing. What needs fixing is made of the
          // kinds of finding, which stay folded away in the second card until you ask for them.
          <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.md }}>
            <div style={{ borderRadius: t.radiusCardMd, padding: t.space.lg, ...(card ? { background: t.pageColor } : { border: `${t.borderWidth} solid ${t.borderColor}` }) }}>
              <Metric textAlign="start" renderLabel={<Text size="medium">Items that will be copied</Text>} renderValue={String(copyCount)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.md, borderRadius: t.radiusCardMd, padding: t.space.lg, ...(card ? { background: t.pageColor } : { border: `${t.borderWidth} solid ${t.borderColor}` }) }}>
              <Metric textAlign="start" renderLabel={<Text size="medium">Need fixing</Text>} renderValue={String(items)} />
              {/* A secondary button opens and closes the list of findings. */}
              <div>
                <Button
                  size="small"
                  color="secondary"
                  aria-expanded={showKinds}
                  renderIcon={showKinds ? <IconArrowOpenUpLine /> : <IconArrowOpenDownLine />}
                  onClick={() => setShowKinds(!showKinds)}
                >
                  {showKinds ? 'Hide what needs fixing' : 'See what needs fixing'}
                </Button>
              </div>
              {showKinds && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: t.space.sm }}>
                  {/* Three cards next to each other, then three below them, all the same width. */}
                  {kinds.map((k) => (
                    <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: t.space.md, padding: `${t.space.sm} ${t.space.md}`, background: t.containerColor, border: `${t.borderWidth} solid ${t.borderColor}`, borderRadius: t.radiusCardSm }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: t.space.xs }}>
                        <Text>{k.label}: </Text><Heading level="h3" as="span">{k.count}</Heading>
                        <Tooltip placement="top" renderTip={WHAT_IT_MEANS[k.id] ?? 'Something we noticed in an item.'}>
                          <IconButton size="small" withBackground={false} withBorder={false} screenReaderLabel={`What does ${k.label} mean?`}>
                            <IconInfoLine />
                          </IconButton>
                        </Tooltip>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <ChoiceCards
          name="quick-findings"
          legend="What do you want to do about these findings?"
          value={toDo ? 'todo' : 'all'}
          onChange={(v) => setToDo(v === 'todo')}
          choices={[
            { value: 'all', title: 'Copy everything as it is', text: "You'll copy every item you chose, including the ones with findings. Nothing goes on your to-do list." },
            { value: 'todo', title: 'Copy everything and add the findings to my to-do list', text: "You'll copy every item you chose, and each finding goes on your to-do list so you can fix it after the copy." },
          ]}
        />
        {/* The last option: leave out what nobody used. Only when there is something unused. */}
        {unusedIds.size > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.xs }}>
            <Checkbox label="Leave out the unused items" checked={skipUnused} onChange={() => setSkipUnused(!skipUnused)} />
            <div style={{ paddingInlineStart: '1.75rem' }}>
              <Text as="div" size="small" color="secondary">
                {`${unusedIds.size} ${unusedIds.size === 1 ? 'item was' : 'items were'} flagged as unused last term. If you leave them out, ${unusedIds.size === 1 ? "it isn't" : "they aren't"} copied and ${unusedIds.size === 1 ? "it doesn't" : "they don't"} go on your to-do list.`}
              </Text>
            </div>
          </div>
        )}
          </>
        )}
      </QuickCard>

      <QuickCard number={4} title="Dates" description="Choose how the dates of your items move into the new term.">
        {busy ? loader : (
          <>
        <ChoiceCards
          name="quick-dates"
          legend="Method"
          value={dates.mode}
          onChange={(v) => setMethod(v as DateMode)}
          choices={[
            {
              value: 'calendar',
              title: 'Move dates to the new term',
              text: 'Each item keeps its week of the term and its weekday. A date that lands on a non-working day moves to the next working day. You can change any date yourself afterwards.',
              // The first and last day of the new course, like the dates step.
              extra: (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: t.space.xl }}>
                  <div style={{ width: '21rem', maxWidth: '100%', flex: '0 0 auto' }}>
                    <DateInput
                      screenReaderLabels={{ calendarIcon: 'Open calendar', prevMonthButton: 'Previous month', nextMonthButton: 'Next month', datePickerDialog: 'Date picker', selectedLabel: 'Selected' }}
                      placeholder="Select a date"
                      invalidDateErrorMessage="Enter a valid date"
                      width="100%"
                      renderLabel={<Text weight="bold">First day of the course</Text>}
                      value={dates.startText}
                      onChange={(_e, v) => changeStart(v)}
                      messages={start ? [{ type: 'hint', text: `${oldCourse} started on ${longDate(FALL_START)}` }] : [{ type: 'newError', text: 'Enter a valid date' }]}
                    />
                  </div>
                  <div style={{ width: '21rem', maxWidth: '100%', flex: '0 0 auto' }}>
                    <TextInput
                      renderLabel={<Text weight="bold">Last day of the course</Text>}
                      interaction={card ? 'readonly' : 'disabled'}
                      value={endOfCourse ? longDate(endOfCourse) : 'Enter a first day'}
                      messages={[{ type: 'hint', text: `${oldCourse} ended on ${longDate(FALL_END)}` }]}
                    />
                  </div>
                </div>
              ),
            },
            { value: 'keep', title: 'Keep the dates as they are', text: 'Your items keep the dates from the old course. You can change them in the new course later.' },
            { value: 'clear', title: 'Clear dates and set them later', text: "Your items are copied without dates. You'll set them in the new course." },
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
