import { Fragment, createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeftRightInstUIIcon, IconButton, Tooltip } from '@instructure/ui/v11_7'
import { launchCut } from './launch'
import { setCutMode } from './reviewData'

// Two versions of the copy flow in one prototype. A switch in the page header changes between them.
//   Full flow  the check against the readiness criteria of the account: Criteria window, the readiness check (after step 2,
//              in step 5 and on the summary) and every kind of finding.
//   Cut flow   no criteria and no readiness check. The review only has the findings about unused items, broken and missing links
//              and accessibility. The summary has no Course check tab.
// The cut flow starts first on this branch.
const FlowContext = createContext<{ cut: boolean; toggle: () => void }>({ cut: false, toggle: () => {} })

export function FlowProvider({ children }: { children: ReactNode }) {
  // The cut flow starts first, unless the address (a course opened by the admin) names the flow.
  const [cut, setCut] = useState(() => launchCut() ?? true)
  // Switching flows starts everything again: the key makes the whole prototype below mount fresh, so the wizard, its choices and the
  // copy history all go back to the start.
  const [round, setRound] = useState(0)
  // The findings are built from this, so it is set before anything renders.
  setCutMode(cut)
  const toggle = () => {
    setCut((c) => !c)
    setRound((r) => r + 1)
  }
  return (
    <FlowContext.Provider value={{ cut, toggle }}>
      <Fragment key={round}>{children}</Fragment>
    </FlowContext.Provider>
  )
}

export const useFlow = () => useContext(FlowContext)

// The icon button in the page header that switches between the two flows.
export function FlowSwitch() {
  const { cut, toggle } = useFlow()
  const label = cut ? 'Cut flow is on. Switch to the full flow' : 'Full flow is on. Switch to the cut flow'
  return (
    <Tooltip renderTip={label} placement="bottom">
      <IconButton color="secondary" screenReaderLabel={label} onClick={toggle}>
        <ArrowLeftRightInstUIIcon />
      </IconButton>
    </Tooltip>
  )
}
