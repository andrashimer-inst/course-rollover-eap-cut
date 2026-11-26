import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Button, Checkbox, CheckboxGroup, CircleCheckInstUIIcon, IconXSolid, IconSettingsLine, IconInfoLine, IconModuleLine, IconAnalyticsLine, IconAssignmentLine,
  IconButton, NumberInput, ScreenReaderContent, SimpleSelect, Text, TextInput,
} from '@instructure/ui/v11_7'
import StatusPill from './StatusPill'
import { useAppThemeKey, useSurfaceTokens } from './appTheme'

// The form where the admin sets what "a course that is ready" means for the account. It was built in Legacy, so Legacy keeps its look
// (areas on the left with how many are on, the settings on the right with a switch each). Light and Dark put it on a card and use the
// theme tokens. It is the same form in all three, with the same settings as the criteria the teacher can see.

type Extra =
  | { kind: 'number'; label: string; value: number }
  | { kind: 'check'; label: string; checked: boolean }
  | { kind: 'select'; options: string[]; value: string }
  | { kind: 'homepage'; options: { value: string; label: string; note?: string }[]; picked: string[] }
  | { kind: 'nav'; visible: string[]; hidden: string[]; ordered: boolean }
type Setting = { id: string; title: string; about: string; on: boolean; extras: Extra[] }
type Area = { id: string; title: string; about: string; icon: ReactNode; settings: Setting[] }

const min = (label: string, value = 1): Extra => ({ kind: 'number', label, value })
const published: Extra = { kind: 'check', label: 'Published', checked: false }

const NAV_ITEMS = ['Home', 'Announcements', 'Assignments', 'Discussions', 'Grades', 'People', 'Pages', 'Files', 'Syllabus', 'Outcomes', 'Quizzes', 'Modules', 'Settings', 'Search']

const initial = (): Area[] => [
  {
    id: 'general', title: 'General', about: 'Basic criteria settings', icon: <IconSettingsLine />,
    settings: [
      { id: 'published', title: 'Course is published', about: 'Course must be published and visible to students', on: true, extras: [] },
      { id: 'dates', title: 'Course start and end date set', about: 'Term dates are configured for the course', on: true, extras: [] },
      { id: 'due', title: 'Published due dates fall within the course start and end dates', about: 'All assignments due dates fall within the course term', on: true, extras: [] },
    ],
  },
  {
    id: 'navigation', title: 'Navigation', about: 'Home page and navigation ordering settings', icon: <IconInfoLine />,
    settings: [
      {
        id: 'home', title: 'Home page', about: 'Select all options that are acceptable as course Home page', on: false,
        extras: [{
          kind: 'homepage', picked: [],
          options: [
            { value: 'stream', label: 'Course activity stream' },
            { value: 'modules', label: 'Course modules' },
            { value: 'assignments', label: 'Assignments list' },
            { value: 'syllabus', label: 'Syllabus' },
            { value: 'front', label: 'Pages front page', note: 'Requires a front page to be set in the course' },
          ],
        }],
      },
      { id: 'nav', title: 'Course Navigation Setup', about: 'Setup which items should be visible in the Courses navigation menu', on: true, extras: [{ kind: 'nav', visible: ['Settings', 'Syllabus'], hidden: ['Search'], ordered: false }] },
    ],
  },
  {
    id: 'content', title: 'Content', about: 'Course materials, pages and learning resources', icon: <IconModuleLine />,
    settings: [
      { id: 'announcements', title: 'Announcements', about: 'Course announcements are available', on: true, extras: [min('Minimum number of announcements:'), { ...published }] },
      { id: 'files', title: 'Files', about: 'Course files section is configured', on: true, extras: [min('Minimum number of files:')] },
      { id: 'modules', title: 'Modules', about: 'Course modules are available', on: true, extras: [min('Minimum number of modules:'), { ...published }] },
      { id: 'pages', title: 'Pages', about: 'Course pages are available', on: true, extras: [min('Minimum number of pages:'), { ...published }] },
      { id: 'syllabus', title: 'Syllabus', about: 'Syllabus is visible to students in the Course Navigation Menu', on: true, extras: [{ kind: 'check', label: 'Require minimum word count', checked: true }, min('Minimum number of words:')] },
    ],
  },
  {
    id: 'activities', title: 'Activities', about: 'Activities settings', icon: <IconAssignmentLine />,
    settings: [
      { id: 'assignments', title: 'Assignments', about: 'Assignments do not include Discussions or New Quizzes', on: true, extras: [min('Minimum number of assignments:'), { ...published }] },
      { id: 'classic', title: 'Classic Quizzes', about: 'Classic quizzes are available', on: true, extras: [min('Minimum number of classic quizzes:'), { ...published }] },
      { id: 'new', title: 'New Quizzes', about: 'New Quizzes are available', on: true, extras: [min('Minimum number of new quizzes:'), { ...published }] },
      { id: 'discussions', title: 'Discussions', about: 'Discussions are available', on: true, extras: [min('Minimum number of discussions:'), { ...published }] },
      { id: 'outcomes', title: 'Outcomes', about: 'An outcome has been created or imported into the course', on: true, extras: [min('Minimum number of outcomes:')] },
      { id: 'rubrics', title: 'Rubrics', about: 'A rubric has been created in the course', on: true, extras: [min('Minimum number of rubrics:'), { kind: 'check', label: 'Rubric is attached to at least one assignment', checked: false }] },
      { id: 'gradebook', title: 'Canvas Gradebook is in use', about: 'At least one student has a current course score published in the Canvas Gradebook', on: true, extras: [] },
    ],
  },
  {
    id: 'compliance', title: 'Compliance', about: 'Accessibility settings', icon: <IconAnalyticsLine />,
    settings: [
      { id: 'scan', title: 'Latest Accessibility Scan', about: 'Scanned by the Course Content Accessibility Checker', on: true, extras: [{ kind: 'select', value: 'Scanned at least once (ever)', options: ['Scanned at least once (ever)', 'Scanned in the last 7 days', 'Scanned in the last 14 days', 'Scanned in the last 30 days', 'Scanned in the last 60 days'] }] },
      { id: 'open', title: 'Open Accessibility Issues', about: 'Amount of total allowed accessibility issues', on: true, extras: [min('Maximum number of open accessibility issues:')] },
      { id: 'critical', title: 'Accessibility Issues with Critical severity', about: 'Amount of allowed Critical severity accessibility issues', on: true, extras: [min('Maximum number of Critical severity issues:')] },
      { id: 'high', title: 'Accessibility Issues with High severity', about: 'Amount of allowed High severity accessibility issues', on: true, extras: [min('Maximum number of High severity issues:')] },
      { id: 'medium', title: 'Accessibility Issues with Medium severity', about: 'Amount of allowed Medium severity accessibility issues', on: true, extras: [min('Maximum number of Medium severity issues:')] },
    ],
  },
]

// `initialName` is empty when a new set of criteria is made. `onSave` gives back the name and how many settings are on in each area.
export default function EditCriteria({ initialName, onCancel, onSave }: { initialName: string; onCancel: () => void; onSave: (name: string, counts: number[]) => void }) {
  const t = useSurfaceTokens()
  const legacy = useAppThemeKey() === 'legacy'
  const [areas, setAreas] = useState<Area[]>(initial)
  const [areaId, setAreaId] = useState('general')
  const [name, setName] = useState(initialName)
  const area = areas.find((a) => a.id === areaId)!

  const patch = (settingId: string, fn: (s: Setting) => Setting) =>
    setAreas(areas.map((a) => (a.id === areaId ? { ...a, settings: a.settings.map((s) => (s.id === settingId ? fn(s) : s)) } : a)))
  const setExtra = (s: Setting, i: number, e: Extra) => patch(s.id, (x) => ({ ...x, extras: x.extras.map((old, n) => (n === i ? e : old)) }))

  const extraView = (s: Setting, e: Extra, i: number) => {
    if (e.kind === 'number') {
      return (
        <div key={i} style={{ maxWidth: '22rem' }}>
          <NumberInput
            renderLabel={e.label}
            value={e.value}
            showArrows
            onChange={(_ev, v) => setExtra(s, i, { ...e, value: Math.max(0, Number(v) || 0) })}
            onIncrement={() => setExtra(s, i, { ...e, value: e.value + 1 })}
            onDecrement={() => setExtra(s, i, { ...e, value: Math.max(0, e.value - 1) })}
          />
        </div>
      )
    }
    if (e.kind === 'check') return <Checkbox key={i} label={e.label} checked={e.checked} onChange={() => setExtra(s, i, { ...e, checked: !e.checked })} />
    if (e.kind === 'select') {
      return (
        <div key={i} style={{ maxWidth: '28rem' }}>
          <SimpleSelect renderLabel={<ScreenReaderContent>{s.title}</ScreenReaderContent>} value={e.value} onChange={(_ev, { value }) => setExtra(s, i, { ...e, value: String(value) })}>
            {e.options.map((o) => <SimpleSelect.Option key={o} id={`${s.id}-${o}`} value={o}>{o}</SimpleSelect.Option>)}
          </SimpleSelect>
        </div>
      )
    }
    if (e.kind === 'homepage') {
      return (
        <CheckboxGroup key={i} name="home-page" description={<ScreenReaderContent>Acceptable home pages</ScreenReaderContent>} value={e.picked} onChange={(v) => setExtra(s, i, { ...e, picked: v as string[] })}>
          {e.options.map((o) => (
            <Checkbox key={o.value} value={o.value} label={o.label} />
          ))}
        </CheckboxGroup>
      )
    }
    // The navigation setup: two lists, the items that must be visible and the items that must be hidden.
    const list = (title: string, items: string[], other: string[], key: 'visible' | 'hidden') => (
      <div style={{ flex: '1 1 16rem', minWidth: 0, display: 'flex', flexDirection: 'column', gap: t.space.md, border: `${t.borderWidth} solid ${t.borderColor}`, borderRadius: t.radiusCardSm, padding: t.space.lg }}>
        <Text weight="bold">{title}</Text>
        <SimpleSelect
          renderLabel={<Text size="small">Add navigation item</Text>}
          placeholder="Select an item"
          value=""
          onChange={(_ev, { value }) => value && setExtra(s, i, { ...e, [key]: [...items, String(value)] })}
        >
          <SimpleSelect.Option id={`${key}-none`} value="">Select an item</SimpleSelect.Option>
          {NAV_ITEMS.filter((n) => !items.includes(n) && !other.includes(n)).map((n) => <SimpleSelect.Option key={n} id={`${key}-${n}`} value={n}>{n}</SimpleSelect.Option>)}
        </SimpleSelect>
        {key === 'visible' && <Checkbox label="Items must remain in this order" checked={e.ordered} onChange={() => setExtra(s, i, { ...e, ordered: !e.ordered })} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.sm }}>
          {items.map((n) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: t.space.sm, border: `${t.borderWidth} solid ${t.borderColor}`, borderRadius: t.radiusCardSm, padding: `${t.space.xs} ${t.space.sm} ${t.space.xs} ${t.space.md}` }}>
              <Text weight="bold">{n}</Text>
              <IconButton size="small" withBackground={false} withBorder={false} screenReaderLabel={`Remove ${n}`} onClick={() => setExtra(s, i, { ...e, [key]: items.filter((x) => x !== n) })}>
                <IconXSolid />
              </IconButton>
            </div>
          ))}
        </div>
      </div>
    )
    return (
      <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: t.space.md }}>
        {list('Must be visible', e.visible, e.hidden, 'visible')}
        {list('Must be hidden', e.hidden, e.visible, 'hidden')}
      </div>
    )
  }

  const onCount = (a: Area) => a.settings.filter((s) => s.on).length
  const countPill = (a: Area, active: boolean) => (
    <StatusPill size="xs" color={active ? 'info' : 'neutral'} colors={active ? { background: t.linkColor, text: t.onColor } : undefined}>
      {onCount(a)}/{a.settings.length}
    </StatusPill>
  )

  const rowFill = `color-mix(in srgb, ${t.linkColor} 12%, transparent)`
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.xl,
        ...(legacy ? {} : { background: t.containerColor, borderRadius: t.radiusCardMd, boxShadow: t.shadowResting, padding: t.space.xxl }),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: t.space.md, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 24rem', maxWidth: '40rem' }}>
          <TextInput renderLabel="Criteria name" isRequired display="block" value={name} onChange={(_e, v) => setName(v)} />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', borderBlock: `${t.borderWidth} solid ${t.borderColor}` }}>
        {/* The areas, each with how many of its settings are on. */}
        <nav aria-label="Criteria areas" style={{ flex: '0 0 15rem', padding: `${t.space.lg} ${t.space.lg} ${t.space.lg} 0`, borderInlineEnd: `${t.borderWidth} solid ${t.borderColor}`, display: 'flex', flexDirection: 'column', gap: t.space.sm }}>
          <div style={{ paddingBlockEnd: t.space.sm, borderBlockEnd: `${t.borderWidth} solid ${t.borderColor}`, marginBlockEnd: t.space.sm }}>
            <Text as="div" weight="bold">Select criteria</Text>
            <Text as="div" size="small" color="secondary">Configure criteria</Text>
          </div>
          {areas.map((a) => {
            const on = a.id === areaId
            return (
              <button
                key={a.id}
                type="button"
                aria-current={on ? 'true' : undefined}
                onClick={() => setAreaId(a.id)}
                style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: t.space.sm, padding: t.space.sm, borderRadius: t.radiusCardSm, background: on ? rowFill : 'transparent', color: t.textColor }}
              >
                <span aria-hidden="true" style={{ display: 'inline-flex' }}>{a.icon}</span>
                <span style={{ flex: 1 }}><Text weight={on ? 'bold' : 'normal'}>{a.title}</Text></span>
                {countPill(a, on)}
              </button>
            )
          })}
        </nav>

        {/* The settings of the area that is open. */}
        <section aria-label={area.title} style={{ flex: '1 1 24rem', minWidth: 0, padding: `${t.space.lg} 0 ${t.space.lg} ${t.space.xl}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ paddingBlockEnd: t.space.md, borderBlockEnd: `${t.borderWidth} solid ${t.borderColor}` }}>
            <Text as="div" weight="bold" size="large">{area.title}</Text>
            <Text as="div" size="small" color="secondary">{area.about}</Text>
          </div>
          {area.settings.map((s) => (
            <div key={s.id} style={{ padding: `${t.space.lg} 0`, borderBlockEnd: `${t.borderWidth} solid ${t.borderColor}`, display: 'flex', flexDirection: 'column', gap: t.space.md }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: t.space.md }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text as="div" weight="bold">{s.title}</Text>
                  <Text as="div" size="small" color="secondary">{s.about}</Text>
                </div>
                <div style={{ flex: '0 0 auto' }}>
                  <Checkbox
                    variant="toggle"
                    label={<ScreenReaderContent>{`${s.title} is ${s.on ? 'on' : 'off'}`}</ScreenReaderContent>}
                    checked={s.on}
                    onChange={() => patch(s.id, (x) => ({ ...x, on: !x.on }))}
                  />
                </div>
              </div>
              {s.on && s.extras.map((e, i) => extraView(s, e, i))}
            </div>
          ))}
        </section>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: t.space.sm }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color="primary" renderIcon={<CircleCheckInstUIIcon />} interaction={name.trim() ? 'enabled' : 'disabled'} onClick={() => onSave(name.trim(), areas.map((a) => a.settings.filter((x) => x.on).length))}>Save</Button>
      </div>
    </div>
  )
}
