import { useId } from 'react'
import type { ReactNode } from 'react'
import { RadioInput, ScreenReaderContent, Text } from '@instructure/ui/v11_7'
import { useSurfaceTokens } from './appTheme'

// A choice as cards under each other, for the quick flow. Each card has a small radio, a bold name and what it does. Not chosen: a white
// card with an outline. Chosen: the blue tint and blue border of the chosen course card. `extra` shows inside the card while it is chosen, for
// a follow-up choice or a warning. The question is the name of the group.
export type ChoiceCard = { value: string; title: string; text?: ReactNode; extra?: ReactNode }

export default function ChoiceCards({
  name, legend, hideLegend = false, value, onChange, choices,
}: {
  name: string
  legend: string
  // The question stays the name of the group for screen readers, without showing it.
  hideLegend?: boolean
  value: string
  onChange: (value: string) => void
  choices: ChoiceCard[]
}) {
  const t = useSurfaceTokens()
  const legendId = useId()
  return (
    <div role="radiogroup" aria-labelledby={legendId} style={{ display: 'flex', flexDirection: 'column', gap: t.space.md }}>
      {hideLegend ? <ScreenReaderContent id={legendId}>{legend}</ScreenReaderContent> : <Text weight="bold" id={legendId}>{legend}</Text>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.md }}>
        {choices.map((c) => {
          const on = c.value === value
          return (
            <div
              key={c.value}
              onClick={() => onChange(c.value)}
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
                <RadioInput size="small" name={name} value={c.value} checked={on} onChange={() => onChange(c.value)} label={<ScreenReaderContent>{c.title}</ScreenReaderContent>} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.xs, minWidth: 0, flex: 1 }}>
                <Text weight="bold">{c.title}</Text>
                {c.text && <Text as="div" color="secondary">{c.text}</Text>}
                {on && c.extra && (
                  <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: t.space.md, marginBlockStart: t.space.sm, cursor: 'default' }}>
                    {c.extra}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
