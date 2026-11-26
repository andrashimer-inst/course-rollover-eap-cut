import { useMemo, useState } from 'react'
import { Button, IconAddLine, IconExternalLinkLine, Link, IconButton, IconEmailLine, IconSearchLine, Metric, ScreenReaderContent, SimpleSelect, Table, Tabs, Text, TextInput, Tooltip } from '@instructure/ui/v11_7'
import DesktopWrapper from './DesktopWrapper'
import EditCriteria from './EditCriteria'
import FigmaAlert from './FigmaAlert'
import Pager from './Pager'
import StatusPill from './StatusPill'
import AdminHelpModal from './AdminHelpModal'
import AutoSelect from './AutoSelect'
import { CRITERIA } from './CriteriaModal'
import type { AdminCourse } from './adminData'
import { ADMIN_COURSES, SEED_SETS, SETUP_COLOR, SETUP_STATES, metOf, totalOf } from './adminData'
import type { CriteriaSet } from './adminData'
import type { SetupState } from './adminData'
import { SUB_ACCOUNTS } from './courseListData'
import { SummaryView } from './CopySummaryView'
import { summaryOf } from './sampleImports'
import { launchUrl } from './launch'
import { FlowSwitch, useFlow } from './flow'
import { useAppThemeKey, useSurfaceTokens } from './appTheme'

// The admin's Course import page: what Dashboard opens. The entry point is not decided yet, so this is only the page.
//   Courses          where every course of the term stands in its copy, and a way to message the people who are stuck
//   A course        its title opens the summary of its copy: what was copied, what was not, and the copy history (every copy writes to it)
//   Readiness criteria  what a course that is ready means for the account. Only in the full flow: the cut flow has no criteria.
// The data is made up. The courses are the ones of the copy wizard.

const noFill = { background: 'transparent' }
const ANY = 'any'
const PAGE_SIZE = 10

export default function AdminCourseImport({ onNavigate, onOpenCourse }: { onNavigate: (label: string) => void; onOpenCourse: () => void }) {
  const t = useSurfaceTokens()
  const themed = useAppThemeKey() !== 'legacy'
  const { cut } = useFlow()
  const [tab, setTab] = useState(0)
  // The sets of criteria of the account. One of them is open on the Readiness criteria tab. `counts` is how many settings are on in each area.
  const [sets, setSets] = useState<CriteriaSet[]>(SEED_SETS)
  const [setId, setSetId] = useState('basics')
  // The area whose settings are open below the cards. Choosing it again closes it.
  const [areaId, setAreaId] = useState<string | null>(null)
  // null: the list. 'edit': the open set. 'new': a new set.
  const [editing, setEditing] = useState<null | 'edit' | 'new'>(null)
  const openSet = sets.find((x) => x.id === setId)!
  const [toast, setToast] = useState('')
  const say = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(''), 4000)
  }

  // The course whose summary is open.
  const [viewing, setViewing] = useState<AdminCourse | null>(null)
  // The message to the people of one course, opened from the end of its row.
  const [msgFor, setMsgFor] = useState<AdminCourse | null>(null)

  // Courses
  const [query, setQuery] = useState('')
  const [sub, setSub] = useState(ANY)
  const [state, setState] = useState<string>(ANY)
  // Which set of criteria is applied to the course. Only the full flow has criteria.
  const [applied, setApplied] = useState<string>(ANY)
  const [page, setPage] = useState(1)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ADMIN_COURSES.filter((c) => (!q || `${c.name} ${c.code} ${c.sisId} ${c.people}`.toLowerCase().includes(q)) && (sub === ANY || c.subAccount === sub) && (state === ANY || c.state === state) && (cut || applied === ANY || c.criteriaId === applied))
  }, [query, sub, state, applied, cut])
  // Clicking a column title orders the list by that column. A second click turns the order around.
  type SortKey = 'course' | 'state' | 'where' | 'criteria' | 'people' | 'last'
  // The list starts in the order of the last activity: the courses with the most recent activity come first.
  const [sortBy, setSortBy] = useState<SortKey | null>('last')
  const [ascending, setAscending] = useState(true)
  const sortProps = (key: SortKey) => ({
    onRequestSort: () => {
      setPage(1)
      if (sortBy === key) setAscending(!ascending)
      else {
        setSortBy(key)
        setAscending(true)
      }
    },
    sortDirection: sortBy === key ? (ascending ? ('ascending' as const) : ('descending' as const)) : ('none' as const),
  })
  const daysAgo = (last: string) => (last === 'Today' ? 0 : last === 'Yesterday' ? 1 : parseInt(last, 10))
  const rows = useMemo(() => {
    if (!sortBy) return shown
    const value = (c: AdminCourse): string | number => {
      if (sortBy === 'course') return c.name.toLowerCase()
      if (sortBy === 'state') return SETUP_STATES.indexOf(c.state)
      // Courses at a step come by their step, the others by their text.
      if (sortBy === 'where') return (c.step ?? 0) * 1000 + (c.step ? 0 : c.where.length)
      if (sortBy === 'criteria') return metOf(c, sets.find((x) => x.id === c.criteriaId) ?? sets[0])
      if (sortBy === 'people') return c.people.toLowerCase()
      return daysAgo(c.last)
    }
    const sorted = [...shown].sort((a, b) => (value(a) > value(b) ? 1 : value(a) < value(b) ? -1 : 0))
    return ascending ? sorted : sorted.reverse()
  }, [shown, sortBy, ascending, sets])
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const pageRows = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const countOf = (s: SetupState) => ADMIN_COURSES.filter((c) => c.state === s).length

  const cardStyle = themed ? { background: t.containerColor, borderRadius: t.radiusCardMd, boxShadow: t.shadowResting, padding: t.space.xxl } : {}
  // Light and Dark (Figma ContentTabList): 24px from the tabs, 32px from the filters to the card.
  const tabGap = themed ? 'general.spaceXl 0 0 0' : 'general.spaceMd 0 0 0'
  const filterToCard = themed ? t.space.xxl : t.space.lg
  const filterSelect = (label: string, value: string, set: (v: string) => void, options: { id: string; label: string }[]) => (
    <div style={{ minWidth: 0 }}>
      <SimpleSelect renderLabel={<Text weight="bold">{label}</Text>} value={value} onChange={(_e, { value: v }) => set(String(v))}>
        {options.map((o) => <SimpleSelect.Option key={o.id} id={`${label}-${o.id}`} value={o.id}>{o.label}</SimpleSelect.Option>)}
      </SimpleSelect>
    </div>
  )

  if (viewing) {
    // The same summary the teacher sees after a copy, made for this course. Only a course that is ready has one.
    const summary = {
      ...summaryOf(viewing.name, 'Today', 20 + (viewing.code.length * 3) % 18, false, { 'assignments:4': 'leave', 'files:7': 'fix', 'pages:1': 'fix', 'quizzes:3': 'leave' }),
      course: viewing.name,
      target: viewing.name,
      opens: `This course ${viewing.where.charAt(0).toLowerCase()}${viewing.where.slice(1)}.`,
    }
    return (
      <DesktopWrapper
        pageTitle={viewing.name}
        breadcrumb={['Dashboard', 'Course import']}
        onBreadcrumb={(crumb) => (crumb === 'Course import' ? setViewing(null) : undefined)}
        activeNav="Dashboard"
        onNavigate={onNavigate}
        onOpenCourse={onOpenCourse}
        headerActions={<FlowSwitch />}
        barActions={<FlowSwitch />}
        description={`${viewing.code} · SIS ID: ${viewing.sisId} · ${viewing.people}`}
        fullWidth
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.xl }}>
          <SummaryView summary={summary} admin />
          <div>
            <Button color="primary" onClick={() => setViewing(null)}>Back to course import</Button>
          </div>
        </div>
      </DesktopWrapper>
    )
  }

  if (editing) {
    return (
      <DesktopWrapper
        pageTitle={editing === 'new' ? 'Create new criteria' : 'Edit criteria'}
        breadcrumb={['Dashboard', 'Course import', 'Criteria']}
        onBreadcrumb={(crumb) => (crumb === 'Criteria' || crumb === 'Course import' ? setEditing(null) : undefined)}
        activeNav="Dashboard"
        onNavigate={onNavigate}
        onOpenCourse={onOpenCourse}
        headerActions={<FlowSwitch />}
        barActions={<FlowSwitch />}
        description="Set criteria for how your account defines a course that is considered ready"
        fullWidth
      >
        <EditCriteria
          initialName={editing === 'new' ? '' : openSet.name}
          onCancel={() => setEditing(null)}
          onSave={(name, counts) => {
            if (editing === 'new') {
              const id = `set-${sets.length + 1}`
              setSets([...sets, { id, name, counts }])
              setSetId(id)
              say(`“${name}” was created. Teachers see it while they set up a course.`)
            } else {
              setSets(sets.map((x) => (x.id === setId ? { ...x, name, counts } : x)))
              say('Criteria saved. Teachers see the new criteria while they set up a course.')
            }
            setEditing(null)
          }}
        />
      </DesktopWrapper>
    )
  }

  const coursesTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: filterToCard }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.lg }}>
        {/* How the term stands, at a glance. */}
        <div role="group" aria-label="Courses by copy state" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: t.space.md }}>
          {SETUP_STATES.map((s) => {
            const on = state === s
            return (
              // The card filters the list below. Choosing the same card again shows every course.
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => { setState(on ? ANY : s); setPage(1) }}
                style={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  display: 'block',
                  background: on ? `color-mix(in srgb, ${t.linkColor} 8%, ${t.containerColor})` : t.containerColor,
                  borderRadius: t.radiusCardMd,
                  // The chosen card is the same size as the others: the second line of the border is drawn inside it.
                  border: `${t.borderWidth} solid ${on ? t.linkColor : themed ? 'transparent' : t.borderColor}`,
                  boxShadow: on ? `inset 0 0 0 ${t.borderWidth} ${t.linkColor}` : themed ? t.shadowResting : undefined,
                  padding: t.space.md,
                }}
              >
                <Metric textAlign="start" renderLabel={<Text size="medium">{s}</Text>} renderValue={String(countOf(s))} />
              </button>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: t.space.md, alignItems: 'end' }}>
          <div style={{ minWidth: 0 }}>
            <TextInput renderLabel={<Text weight="bold">Search courses</Text>} placeholder="Course name, code, SIS ID or teacher" renderBeforeInput={<IconSearchLine />} value={query} onChange={(_e, v) => { setQuery(v); setPage(1) }} />
          </div>
          {filterSelect('Sub-account', sub, (v) => { setSub(v); setPage(1) }, [{ id: ANY, label: 'All sub-accounts' }, ...SUB_ACCOUNTS.map((n) => ({ id: n, label: n }))])}
          {filterSelect('Copy state', state, (v) => { setState(v); setPage(1) }, [{ id: ANY, label: `All (${ADMIN_COURSES.length})` }, ...SETUP_STATES.map((s) => ({ id: s, label: `${s} (${countOf(s)})` }))])}
          {!cut && filterSelect('Criteria applied', applied, (v) => { setApplied(v); setPage(1) }, [{ id: ANY, label: `All criteria (${ADMIN_COURSES.length})` }, ...sets.map((x) => ({ id: x.id, label: `${x.name} (${ADMIN_COURSES.filter((c) => c.criteriaId === x.id).length})` }))])}
        </div>
      </div>

      <section aria-label="Courses" style={{ display: 'flex', flexDirection: 'column', gap: t.space.lg, ...cardStyle }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: t.space.md, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.sm }}>
            <Text as="div" weight="bold" size="large">Courses</Text>
            <Text as="div" color="secondary" aria-live="polite">{`${shown.length} of ${ADMIN_COURSES.length} courses`}</Text>
          </div>
        </div>
        {shown.length === 0 ? (
          <Text as="p">No course matches. Clear the search or a filter to see more.</Text>
        ) : (
          <>
            <style>{`
              .admin-courses table { table-layout: fixed; width: 100%; }
            `}</style>
            <div className="admin-courses">
              <Table caption={() => 'Courses of the new term'} themeOverride={noFill}>
                <Table.Head themeOverride={noFill}>
                  <Table.Row themeOverride={noFill}>
                    <Table.ColHeader themeOverride={noFill} id="course" width="24%" {...sortProps('course')}>Course</Table.ColHeader>
                    <Table.ColHeader themeOverride={noFill} id="state" width="13%" {...sortProps('state')}>Copy state</Table.ColHeader>
                    <Table.ColHeader themeOverride={noFill} id="where" width="25%" {...sortProps('where')}>Where it stands</Table.ColHeader>
                    {!cut && <Table.ColHeader themeOverride={noFill} id="ready" width="12%" {...sortProps('criteria')}>Criteria met</Table.ColHeader>}
                    <Table.ColHeader themeOverride={noFill} id="people" {...sortProps('people')}>People</Table.ColHeader>
                    <Table.ColHeader themeOverride={noFill} id="last" width="11%" {...sortProps('last')}>Last activity</Table.ColHeader>
                    <Table.ColHeader themeOverride={noFill} id="message" width="4rem"><ScreenReaderContent>Message</ScreenReaderContent></Table.ColHeader>
                  </Table.Row>
                </Table.Head>
                <Table.Body themeOverride={noFill}>
                  {pageRows.map((c) => (
                    <Table.Row themeOverride={noFill} key={c.id}>
                      <Table.Cell themeOverride={noFill}>
                        <Text as="div" weight="bold">
                          {/* A ready course opens its summary. The others open the copy where it stands. */}
                          {c.state === 'Ready' ? (
                            <Link as="button" onClick={() => setViewing(c)}>{c.name}</Link>
                          ) : (
                            // The others open the course in a new tab, in the copy wizard at the step where the course stands.
                            <Link href={launchUrl(c.name, c.step ?? 1, cut)} target="_blank" rel="noopener noreferrer" renderIcon={<IconExternalLinkLine />} iconPlacement="end">
                              {c.name}<ScreenReaderContent> (opens in a new tab)</ScreenReaderContent>
                            </Link>
                          )}
                        </Text>
                        <Text as="div" size="small" color="secondary">{c.code} · {c.subAccount}</Text>
                        <Text as="div" size="small" color="secondary">SIS ID: {c.sisId}</Text>
                      </Table.Cell>
                      <Table.Cell themeOverride={noFill}><StatusPill size="sm" color={SETUP_COLOR[c.state]}>{c.state}</StatusPill></Table.Cell>
                      <Table.Cell themeOverride={noFill}>
                        {/* A copy that is open shows its step, and what it says about it comes on hover. A ready course keeps its date. */}
                        {c.step ? (
                          <Tooltip placement="top" renderTip={c.state === 'Needs help' ? `At ${c.stepName}. ${c.where}` : c.where}>
                            <span tabIndex={0} style={{ display: 'inline-block' }}>
                              <Text>Step {c.step} of 5</Text>
                            </span>
                          </Tooltip>
                        ) : (
                          c.where
                        )}
                      </Table.Cell>
                      {!cut && (() => {
                        const set = sets.find((x) => x.id === c.criteriaId) ?? sets[0]
                        const total = totalOf(set)
                        const met = metOf(c, set)
                        return (
                          <Table.Cell themeOverride={noFill}>
                            {/* The pill says how many criteria are met. The tip only names the set of criteria that is applied. */}
                            <Tooltip placement="top" renderTip={set.name}>
                              <span tabIndex={0} style={{ display: 'inline-block' }}>
                                <StatusPill size="sm" color={met === total ? 'success' : met === 0 ? 'neutral' : 'warning'}>{`${met} of ${total}`}</StatusPill>
                              </span>
                            </Tooltip>
                          </Table.Cell>
                        )
                      })()}
                      <Table.Cell themeOverride={noFill}>{c.people}</Table.Cell>
                      <Table.Cell themeOverride={noFill}>{c.last}</Table.Cell>
                      <Table.Cell themeOverride={noFill}>
                        <Tooltip renderTip={`Message the people of ${c.name}`} placement="top">
                          <IconButton size="small" screenReaderLabel={`Message the people of ${c.name}`} onClick={() => setMsgFor(c)}>
                            <IconEmailLine />
                          </IconButton>
                        </Tooltip>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
            <Pager label="Course pages" page={current} pageCount={pageCount} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  )

  const areaIndex = CRITERIA.findIndex((x) => x.id === areaId)
  const rowFill = `color-mix(in srgb, ${t.textColor} 5%, ${t.containerColor})`
  const criteriaTab = (
    <section aria-label="Readiness criteria" style={{ display: 'flex', flexDirection: 'column', gap: t.space.lg, ...cardStyle }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.sm }}>
        <Text as="div" weight="bold" size="large">Readiness criteria</Text>
        <Text as="div" color="secondary">What a course that is ready means for your account. Teachers see the same criteria while they set up a course and before they open it.</Text>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: t.space.md, alignItems: 'flex-end' }}>
        {/* Type to find a set of criteria. A new one is added to the list. */}
        <div style={{ flex: '1 1 20rem', maxWidth: '36rem', minWidth: 0 }}>
          <AutoSelect
            key={setId + sets.length + openSet.name}
            label="Criteria name"
            assistiveText="Type to find a set of criteria. Use the up and down arrow keys to choose."
            noMatch="No criteria match"
            options={sets.map((x) => ({ id: x.id, label: x.name }))}
            value={setId}
            onChange={setSetId}
          />
        </div>
        <Button onClick={() => setEditing('edit')}>Edit criteria</Button>
        <Button color="primary" renderIcon={<IconAddLine />} onClick={() => setEditing('new')}>Create new criteria</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: t.space.md }}>
        {CRITERIA.map((a, i) => {
          const on = openSet.counts[i]
          const chosen = areaId === a.id
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={chosen}
              onClick={() => setAreaId(chosen ? null : a.id)}
              style={{
                all: 'unset',
                boxSizing: 'border-box',
                cursor: 'pointer',
                background: chosen ? `color-mix(in srgb, ${t.linkColor} 8%, ${t.containerColor})` : t.containerColor,
                // The chosen card is the same size as the others: the second line of the border is drawn inside it.
                border: `${t.borderWidth} solid ${chosen ? t.linkColor : t.borderColor}`,
                boxShadow: chosen ? `inset 0 0 0 ${t.borderWidth} ${t.linkColor}` : undefined,
                borderRadius: t.radiusCardSm,
                padding: t.space.md,
                display: 'flex',
                flexDirection: 'column',
                gap: t.space.xs,
              }}
            >
              <Text weight="bold">{a.title}</Text>
              <Text size="small" color="secondary">{a.about}</Text>
              <div><StatusPill size="xs" color={on === a.settings.length ? 'success' : 'neutral'}>{on} of {a.settings.length} on</StatusPill></div>
            </button>
          )
        })}
      </div>
      {/* What is set in the area that was chosen: each setting of the area and whether it is on for this set of criteria. */}
      {areaIndex >= 0 && (() => {
        const area = CRITERIA[areaIndex]
        const onList = area.settings.filter((x) => x.on).slice(0, openSet.counts[areaIndex])
        return (
          <div role="region" aria-label={area.title} style={{ display: 'flex', flexDirection: 'column', gap: t.space.md }}>
            {area.settings.map((x) => {
              const on = onList.includes(x)
              return (
                <div key={x.title} style={{ background: rowFill, borderRadius: t.radiusCardSm, padding: t.space.md, display: 'flex', flexWrap: 'wrap', gap: t.space.md, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: '1 1 20rem', minWidth: 0, display: 'flex', flexDirection: 'column', gap: t.space.xs }}>
                    <Text weight="bold">{x.title}</Text>
                    <Text as="div" size="small" color="secondary">{x.about}</Text>
                    {on && x.details?.map((d) => <Text key={d} as="div" size="small">{d}</Text>)}
                  </div>
                  <StatusPill size="sm" color={on ? 'success' : 'neutral'}>{on ? 'On' : 'Off'}</StatusPill>
                </div>
              )
            })}
          </div>
        )
      })()}
    </section>
  )

  return (
    <DesktopWrapper
      pageTitle="Course import"
      breadcrumb={['Dashboard']}
      activeNav="Dashboard"
      onNavigate={onNavigate}
      onOpenCourse={onOpenCourse}
      headerActions={<FlowSwitch />}
      barActions={<FlowSwitch />}
      description="See how the courses of the new term are set up, and what was copied."
      fullWidth
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.lg }}>
        <div role="status" aria-live="polite" style={{ position: 'fixed', top: t.space.lg, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, width: 'min(32rem, calc(100% - 2rem))' }}>
          {toast && <FigmaAlert variant="success" type="floating" dismissible onDismiss={() => setToast('')} closeLabel="Close the message">{toast}</FigmaAlert>}
        </div>
        <AdminHelpModal
          open={msgFor !== null}
          items={msgFor ? [{ title: msgFor.name, detail: msgFor.where }] : []}
          draft={msgFor ? {
            course: msgFor.name,
            to: msgFor.people,
            subject: `${msgFor.name}: how is the course copy going?`,
            message: (list) => `Hi,\n\nI am checking in on the copy of ${msgFor.name} (${msgFor.code}).\n\n${list}\n\nCan I help with anything? Let me know what you need.\n\nThank you`,
          } : undefined}
          onClose={() => setMsgFor(null)}
          onSend={() => say(`Message sent to ${msgFor?.people}.`)}
        />
        {/* The cut flow has no criteria, so there is only the courses and no tab to choose. */}
        {cut ? coursesTab : (
          <Tabs onRequestTabChange={(_e, { index }) => setTab(index)}>
            <Tabs.Panel id="admin-courses" renderTitle="Courses" isSelected={tab === 0} padding={tabGap}>{coursesTab}</Tabs.Panel>
            <Tabs.Panel id="admin-criteria" renderTitle="Readiness criteria" isSelected={tab === 1} padding={tabGap}>{criteriaTab}</Tabs.Panel>
          </Tabs>
        )}
      </div>
    </DesktopWrapper>
  )
}
