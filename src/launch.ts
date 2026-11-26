import { INITIAL_DATES } from './fixDatesData'
import { INITIAL_OPENING } from './reviewCopyData'
import type { WizardDraft } from './RolloverWizard'

// The admin opens a course of the term in a new tab, at the step of the copy wizard where it stands. The new tab starts from the
// address, which says the course, the step and which flow is on. The wizard then opens as if a saved copy was picked up again.

// The courses of the admin's list can have a section in their name. The wizard knows the course by its name.
const wizardCourse = (name: string) => name.split(', Section')[0]

export function launchUrl(courseName: string, step: number, cut: boolean): string {
  const u = new URL(window.location.href)
  u.search = ''
  u.searchParams.set('copy', wizardCourse(courseName))
  u.searchParams.set('step', String(step))
  u.searchParams.set('flow', cut ? 'cut' : 'full')
  return u.toString()
}

// Read once when the page opens, and the address is cleaned at once, so a reload does not start the wizard again.
const params = new URLSearchParams(window.location.search)
const COURSE = params.get('copy')
const LAUNCH = COURSE ? { course: COURSE, step: Math.min(5, Math.max(1, Number(params.get('step')) || 1)) } : null
const FLOW = params.get('flow')
if (COURSE) window.history.replaceState(null, '', window.location.pathname)

// The wizard opens once. After that (when the flow is switched, which starts everything again) the page starts as usual.
let consumed = false
export const readLaunch = () => (consumed ? null : LAUNCH)
export const consumeLaunch = () => { consumed = true }

// The flow of the address, if it names one: true is the cut flow.
export const launchCut = (): boolean | null => (FLOW === 'full' ? false : FLOW === 'cut' ? true : null)

// A saved copy at the step where the course stands. The steps before it count as reached.
export function draftAt(course: string, step: number): WizardDraft & { savedAt: Date } {
  return {
    course,
    scope: 'whole',
    picked: {},
    mode: 'merge',
    step: step - 1,
    reached: step - 1,
    choices: {},
    dupes: {},
    dates: INITIAL_DATES,
    readyRan: false,
    opening: INITIAL_OPENING,
    savedAt: new Date(),
  }
}
