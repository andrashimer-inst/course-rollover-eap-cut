import { useState } from 'react'
import { InstUISettingsProvider } from '@instructure/ui/v11_7'
import AssignmentsList from './AssignmentsList'
import CourseContent from './CourseContent'
import AdminCourseImport from './AdminCourseImport'
import CourseRollover from './CourseRollover'
import ThemeSwitcher from './ThemeSwitcher'
import { AppThemeContext, THEMES } from './appTheme'
import type { ThemeKey } from './appTheme'
import { useNotes } from './useNotes'
import { FlowProvider } from './flow'

// Two flows in one prototype. Clicking Account in the global nav switches between them.
//   Course Rollover flow   rollover      Settings > Import Content, with the copy wizard
//   Notebook flow          assignments   the All Assignments page, where the flow starts
//                          assignment    one assignment, with the Notebook
//                          page          one page, with the Notebook
//   Admin flow             admin         Dashboard: the admin's Course import page (courses, copy history, readiness criteria)
// Notes are shared, and the copy wizard shows them in its Review comments step.
type Screen = 'rollover' | 'assignments' | 'assignment' | 'page' | 'admin'

export default function App() {
  const [themeKey, setThemeKey] = useState<ThemeKey>('light')
  const [screen, setScreen] = useState<Screen>('rollover')
  const [pageId, setPageId] = useState('week5')
  const [assignmentId, setAssignmentId] = useState('a3')
  const api = useNotes()

  // Account switches between the two flows. The other global nav items have no screen here.
  const onNavigate = (label: string) => {
    if (label === 'Account') setScreen((s) => (s === 'rollover' ? 'assignments' : 'rollover'))
    else if (label === 'Dashboard' || label === 'Home') setScreen('admin')
  }
  // The course menu of the notebook course (Design Portfolio). Settings goes back to Import Content.
  const onSelectMenu = (label: string) => {
    if (label === 'Pages') setScreen('page')
    else if (label === 'Assignments') setScreen('assignments')
    else if (label === 'Settings') setScreen('rollover')
  }

  return (
    <FlowProvider>
    <AppThemeContext.Provider value={themeKey}>
      <InstUISettingsProvider theme={THEMES[themeKey]}>
        {screen === 'rollover' && <CourseRollover notes={api.notes} onNavigate={onNavigate} />}
        {screen === 'admin' && <AdminCourseImport onNavigate={(label) => (label === 'Account' ? setScreen('rollover') : onNavigate(label))} onOpenCourse={() => setScreen('rollover')} />}
        {screen === 'assignments' && (
          <AssignmentsList
            api={api}
            onOpen={(id) => {
              setAssignmentId(id)
              setScreen('assignment')
            }}
            onNavigate={onNavigate}
            onSelectMenu={onSelectMenu}
          />
        )}
        {screen === 'assignment' && (
          <CourseContent
            kind="Assignments"
            itemId={assignmentId}
            onItemChange={setAssignmentId}
            api={api}
            onNavigate={onNavigate}
            onSelectMenu={onSelectMenu}
          />
        )}
        {screen === 'page' && (
          <CourseContent
            kind="Pages"
            itemId={pageId}
            onItemChange={setPageId}
            api={api}
            onNavigate={onNavigate}
            onSelectMenu={onSelectMenu}
          />
        )}

        {/* Theme switcher overlay: movable and collapsible (see ThemeSwitcher.tsx) */}
        <ThemeSwitcher themeKey={themeKey} onChange={setThemeKey} />
      </InstUISettingsProvider>
    </AppThemeContext.Provider>
    </FlowProvider>
  )
}
