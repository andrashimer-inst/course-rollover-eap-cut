import { useMemo, useState } from 'react'
import { IconSearchLine, Pagination, RadioInput, ScreenReaderContent, SimpleSelect, Text, TextInput } from '@instructure/ui/v11_7'
import StatusPill from './StatusPill'
import { SOURCE_COURSES, SUB_ACCOUNTS, TERMS } from './courseListData'
import type { SourceCourse } from './courseListData'
import AutoSelect from './AutoSelect'
import { useAppThemeKey, useSurfaceTokens } from './appTheme'

// Step 1 of the copy wizard: pick the course to copy from. One course can be chosen, so each row has a radio button.
// The list shows 5 courses a page, as cards like the quick flow has. It can be searched and filtered by who taught it, and the term.

const PAGE_SIZE = 5
const taughtByYou = (c: SourceCourse) => c.teachers.includes('You')
const ANY = 'any'
// Everyone who teaches a course in the list: "You" first, then the other teachers by name.
const TEACHERS = [
  ...(SOURCE_COURSES.some(taughtByYou) ? ['You'] : []),
  ...[...new Set(SOURCE_COURSES.flatMap((c) => c.teachers))].filter((n) => n !== 'You').sort((a, b) => a.localeCompare(b)),
]
const TEACHER_OPTIONS = [{ id: ANY, label: 'Anyone' }, ...TEACHERS.map((n) => ({ id: n, label: n }))]

const SUB_ACCOUNT_OPTIONS = [{ id: ANY, label: 'All sub-accounts' }, ...SUB_ACCOUNTS.map((n) => ({ id: n, label: n }))]

export default function SelectCourseStep({ selected, onSelect, bare = false }: { selected: string; onSelect: (name: string) => void; bare?: boolean }) {
  const t = useSurfaceTokens()
  // Light and Dark put the table on a card. Legacy stays flat on the page.
  // Inside a card of the quick flow the table has no card of its own.
  const themed = useAppThemeKey() !== 'legacy'
  const card = themed && !bare
  const [query, setQuery] = useState('')
  const [taught, setTaught] = useState('You')
  const [subAccount, setSubAccount] = useState(SUB_ACCOUNTS[3])
  // The list starts on the latest term. The first term of the list is the latest.
  const [term, setTerm] = useState(TERMS[0])
  const [page, setPage] = useState(1)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SOURCE_COURSES.filter((c) => {
      if (q && !`${c.name} ${c.code} ${c.teachers.join(' ')}`.toLowerCase().includes(q)) return false
      if (subAccount !== ANY && c.subAccount !== subAccount) return false
      if (taught !== ANY && !c.teachers.includes(taught)) return false
      if (term !== ANY && c.term !== term) return false
      return true
    })
  }, [query, taught, term, subAccount])

  const rows = shown

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const total = rows.length
  const current = Math.min(page, pageCount)
  const first = (current - 1) * PAGE_SIZE
  const pageRows = rows.slice(first, first + PAGE_SIZE)

  const filter = (label: string, value: string, set: (v: string) => void, options: { id: string; label: string }[]) => (
    <div style={{ minWidth: 0 }}>
      <SimpleSelect renderLabel={<Text weight="bold">{label}</Text>} value={value} onChange={(_e, { value: v }) => set(String(v))}>
        {options.map((o) => (
          <SimpleSelect.Option key={o.id} id={`${label}-${o.id}`} value={o.id}>{o.label}</SimpleSelect.Option>
        ))}
      </SimpleSelect>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: themed ? t.space.xxl : t.space.lg }}>
      <div className="course-filters" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: t.space.md, alignItems: 'end' }}>
        {/* The sub-account decides which courses are in the list at all, so it stands apart from the search and filters. */}
        <div style={{ minWidth: 0 }}>
          <AutoSelect
            label="Sub-account"
            assistiveText="Type to find a sub-account. Use the up and down arrow keys to choose."
            noMatch="No sub-account matches"
            options={SUB_ACCOUNT_OPTIONS}
            value={subAccount}
            onChange={(v) => { setSubAccount(v); setPage(1) }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <TextInput
            renderLabel={<Text weight="bold">Search courses</Text>}
            placeholder="Course name, code or teacher"
            renderBeforeInput={<IconSearchLine />}
            value={query}
            onChange={(_e, value) => { setQuery(value); setPage(1) }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <AutoSelect
            label="Taught by"
            assistiveText="Type to find a teacher. Use the up and down arrow keys to choose."
            noMatch="No teacher matches"
            options={TEACHER_OPTIONS}
            value={taught}
            onChange={(v) => { setTaught(v); setPage(1) }}
          />
        </div>
        {filter('Term', term, (v) => { setTerm(v); setPage(1) }, [{ id: ANY, label: 'Any term' }, ...TERMS.map((k) => ({ id: k, label: k }))])}
      </div>

      {shown.length === 0 ? (
        <Text as="p">No course matches. Clear the search or a filter to see more.</Text>
      ) : (
        <div
          style={
            card
              ? {
                  background: t.containerColor,
                  borderRadius: t.radiusCardMd,
                  boxShadow: t.shadowResting,
                  padding: t.space.xxl,
                }
              : undefined
          }
        >
          <div style={{ paddingBlockEnd: t.space.md, paddingInline: '0.25rem' }}>
            <Text color="secondary" aria-live="polite">
              {shown.length === 0 ? '0' : `${first + 1} to ${first + pageRows.length}`} of {total} courses
            </Text>
          </div>
          {/* Each course is a white card with a radio. The chosen one gets the blue tint and border, like the quick flow. */}
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
                    background: on ? `color-mix(in srgb, ${t.linkColor} 8%, ${t.containerColor})` : t.containerColor,
                    // The chosen card is the same size as the others: the second line of the border is drawn inside it.
                    border: `${t.borderWidth} solid ${on ? t.linkColor : t.borderColor}`,
                    boxShadow: on ? `inset 0 0 0 ${t.borderWidth} ${t.linkColor}` : undefined,
                  }}
                >
                  <div style={{ flex: '0 0 1.5rem', width: '1.5rem', paddingBlockStart: '0.125rem' }}>
                    <RadioInput size="small" name="source-course" value={c.name} checked={on} onChange={() => onSelect(c.name)} label={<ScreenReaderContent>{`Copy from ${c.name}`}</ScreenReaderContent>} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.sm, minWidth: 0 }}>
                    <Text weight="bold">{c.name}</Text>
                    <Text as="div" size="small" color="secondary">{[c.code, c.term, `SIS ID: ${c.sisId}`, `Last updated ${c.date}`].join('  •  ')}</Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: t.space.sm, alignItems: 'center' }}>
                      <StatusPill size="xs" color="neutral">{c.subAccount}</StatusPill>
                      <Text size="small" color="secondary">Taught by {c.teachers.join(', ')}</Text>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {pageCount > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingBlockStart: t.space.lg }}>
              <Pagination
                as="nav"
                variant="compact"
                showDisabledButtons
                siblingCount={3}
                boundaryCount={1}
                labelNext="Next page"
                labelPrev="Previous page"
                screenReaderLabelPageButton={(c, total) => `Page ${c} of ${total}`}
                totalPageNumber={pageCount}
                currentPage={current}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
