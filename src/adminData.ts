import { SOURCE_COURSES } from './courseListData'
import { EDUCATORS } from './copyHistory'
import { CRITERIA } from './CriteriaModal'

// Sample data for the admin's Course import page. Everything here is made up. The courses are the ones of the copy wizard, so the
// admin sees the same names, codes, sub-accounts and teachers as the teacher does.

export type SetupState = 'Ready' | 'In progress' | 'Stuck' | 'Needs help'
export const SETUP_STATES: SetupState[] = ['Ready', 'In progress', 'Stuck', 'Needs help']
// Pill colors by meaning: ready is green, stuck is orange, needs help is violet, in progress is blue.
export const SETUP_COLOR: Record<SetupState, 'success' | 'info' | 'warning' | 'neutral' | 'ai'> = {
  Ready: 'success',
  'In progress': 'info',
  Stuck: 'warning',
  'Needs help': 'ai',
}

export type AdminCourse = {
  id: string
  name: string
  code: string
  // The ID from the student information system, like in the copy wizard.
  sisId: string
  subAccount: string
  people: string
  state: SetupState
  where: string
  // The step of the copy wizard the course is at (1 to 5), and its name. None when the copy is done.
  step?: number
  stepName?: string
  last: string
  // The set of readiness criteria that is applied to the course, and how many criteria it has not met. Only the full flow has criteria.
  criteriaId: string
  gap: number
}

// The sets of criteria of the account, and how many settings are on in each area (General, Navigation, Content, Activities, Compliance).
export type CriteriaSet = { id: string; name: string; counts: number[] }
export const SEED_SETS: CriteriaSet[] = [
  { id: 'basics', name: 'Basics: Syllabus is visible to students', counts: [3, 1, 5, 7, 5] },
  { id: 'online', name: 'Online courses: minimum content', counts: [3, 2, 3, 4, 3] },
  { id: 'a11y', name: 'Accessibility first: no open critical issues', counts: [2, 1, 2, 2, 5] },
]
export const totalOf = (set: CriteriaSet) => set.counts.reduce((n, c) => n + c, 0)
// The criteria of a set by name, in the order of the areas.
export const criteriaTitles = (set: CriteriaSet): string[] =>
  CRITERIA.flatMap((a, i) => a.settings.filter((x) => x.on).slice(0, set.counts[i]).map((x) => x.title))
// How many criteria the course meets: a number short of all of them. A ready course can miss a criterion or two as well.
export const metOf = (c: AdminCourse, set: CriteriaSet) => {
  const total = totalOf(set)
  // A ready course can still miss a criterion or two: ready means the copy is done, not that every criterion is met.
  return c.state === 'Ready' ? total - (c.gap % 3) : Math.max(1, total - c.gap)
}

// The teachers of the wizard's list say "You" for the signed-in teacher. The admin sees a name.
const nameOf = (n: string) => (n === 'You' ? EDUCATORS[0] : n)

// The five steps of the copy wizard.
const STEPS = ['Select course', 'Select content', 'Learning object review', 'Set dates', 'Review and copy']
const HELP = ['a broken link in Week 1', 'a Publisher e-book licence', 'dates that land on a non-working day', 'a missing quiz tool']
// A fixed pattern, so the page looks the same every time it opens.
const PATTERN: SetupState[] = ['Needs help', 'Stuck', 'Ready', 'In progress', 'Stuck', 'Ready', 'In progress', 'Stuck', 'Ready', 'Needs help', 'In progress', 'In progress', 'Ready', 'Stuck', 'Stuck', 'Ready']
const LAST = ['Today', '5 days ago', 'Yesterday', 'Today', '6 days ago', 'Yesterday', 'Today', '8 days ago', '2 days ago', '3 days ago', '7 days ago', 'Today', 'Yesterday', '9 days ago', '4 days ago', 'Today']
const OPENS = ['Tue Jan 19, 8:00 AM', 'Mon Jan 11, 8:00 AM', 'Wed Jan 13, 9:00 AM', 'Tue Jan 12, 8:00 AM']

// Every course of the wizard's list, the biology courses first, in three sections each, so the list has many pages like a real term does.
const BIO = SOURCE_COURSES.filter((c) => c.code.startsWith('BIO') || c.code === 'CHE 320')
const OTHER = SOURCE_COURSES.filter((c) => !(c.code.startsWith('BIO') || c.code === 'CHE 320'))
const SECTIONS = 3
const PICK = Array.from({ length: SECTIONS }, (_, section) => [...BIO, ...OTHER].map((c) => ({ ...c, section }))).flat()

export const ADMIN_COURSES: AdminCourse[] = PICK.map((c, i) => {
  const state = PATTERN[i % PATTERN.length]
  const open = state === 'In progress' || state === 'Stuck' || state === 'Needs help'
  // Help is asked for in the review (step 3), so a course that needs help is at step 3 or further. It may have moved on after the message.
  // Once the copy is done the course is ready, and Ready takes the place of Needs help.
  // A copy that is stuck can be at any step: it was started and saved, and nobody came back to it. One that is in progress has chosen its course.
  const at = state === 'Needs help' ? 2 + (i % 3) : state === 'Stuck' ? i % STEPS.length : 1 + (i % (STEPS.length - 1))
  const step = STEPS[at]
  const where =
    state === 'Ready' ? `Opens ${OPENS[i % OPENS.length]}`
    : state === 'In progress' ? `At ${step}`
    : state === 'Stuck' ? `At ${step} for ${3 + (i % 6)} days`
    : `Asked for help with ${HELP[i % HELP.length]}`
  const criteriaId = SEED_SETS[i % SEED_SETS.length].id
  return {
    id: `${c.code}-0${c.section + 1}`,
    name: c.section === 0 ? c.name : `${c.name}, Section 0${c.section + 1}`,
    code: c.code,
    sisId: c.section === 0 ? c.sisId : `${c.sisId}-0${c.section + 1}`,
    subAccount: c.subAccount,
    people: c.teachers.map(nameOf).join(', '),
    state,
    where,
    step: open ? at + 1 : undefined,
    stepName: open ? step : undefined,
    last: LAST[i % LAST.length],
    criteriaId,
    gap: 2 + (i % 5),
  }
})
