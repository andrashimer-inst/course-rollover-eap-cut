import { useState } from 'react'
import { CloseButton, Heading, Link, Text, Tray } from '@instructure/ui/v11_7'
import { ItemPreviewModal } from './ContentStep'
import type { PreviewItem } from './ContentStep'
import { previewItemOf } from './courseContentData'
import StatusPill from './StatusPill'
import { TODO_GROUPS, groupTodo, tagOf } from './reviewCopyData'
import type { TodoItem } from './rolloverData'
import { useSurfaceTokens } from './appTheme'

// The to-do list so far. It is the same list as on the summary page after the copy, without the details column, and it
// grows and shrinks as the educator makes choices. In Light and Dark it is a utility panel of the wrapper: it sits
// beside the content and pushes it, like the notifications panel. Legacy has no panels, so it is a tray there.

export const todoTitle = (todo: TodoItem[]) => `To-do list (${todo.length})`
export const TODO_DESCRIPTION = 'What is left for you to do by hand. It changes as you make choices.'

export function TodoList({ todo, onOpenLink }: { todo: TodoItem[]; onOpenLink?: () => void }) {
  const t = useSurfaceTokens()
  // The item that was clicked. It opens in the preview window, view only.
  const [openItem, setOpenItem] = useState<PreviewItem | null>(null)
  if (todo.length === 0) return <Text>Nothing to do so far.</Text>
  // The same grey row as the items of the review: light grey, round corners, no line.
  const rowFill = `color-mix(in srgb, ${t.textColor} 5%, ${t.containerColor})`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.xl }}>
      <ItemPreviewModal item={openItem} onClose={() => setOpenItem(null)} />
      {TODO_GROUPS.map((g) => {
        const items = todo.filter((x) => x.group === g)
        if (items.length === 0) return null
        return (
          <section key={g} aria-label={g} style={{ display: 'flex', flexDirection: 'column', gap: t.space.md }}>
            <Heading level="h4" as="h3">
              {g} ({items.length})
            </Heading>
            {/* An item with more than one problem is one card: its problems, then where it is, once. */}
            {groupTodo(items).map((grp, i) => (
              <div key={i} style={{ background: rowFill, borderRadius: t.radiusCardSm, padding: t.space.md, display: 'flex', flexDirection: 'column', gap: t.space.sm }}>
                {/* Where the findings are comes first: the item is a link when it has a preview, the others stay as text. */}
                {grp.content && (
                  <Text as="div" size="small" color="secondary">
                    {previewItemOf(grp.content) ? (
                      <>
                        <Link as="button" onClick={() => (onOpenLink ? onOpenLink() : setOpenItem(previewItemOf(grp.content)))}>{grp.content.split(', in ')[0]}</Link>
                        {grp.content.includes(', in ') && `, in ${grp.content.split(', in ').slice(1).join(', in ')}`}
                      </>
                    ) : (
                      grp.content
                    )}
                  </Text>
                )}
                {grp.entries.map((x, n) => (
                  <div key={n} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: t.space.sm }}>
                    {tagOf(x) && <StatusPill size="sm" color={tagOf(x)!.tone}>{tagOf(x)!.tag}</StatusPill>}
                    <Text size="small" color="secondary">{x.title}</Text>
                    {/* Entries about one part of the course share the line below. The others say what to do themselves. */}
                    {!grp.content && x.detail && <Text as="div" size="small" color="secondary">{x.detail}</Text>}
                  </div>
                ))}
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

// Legacy only.
export default function TodoTray({ open, todo, onClose }: { open: boolean; todo: TodoItem[]; onClose: () => void }) {
  const t = useSurfaceTokens()
  return (
    <Tray label="To-do list" open={open} onDismiss={onClose} placement="end" size="small" shouldCloseOnDocumentClick>
      <div style={{ padding: t.space.lg, display: 'flex', flexDirection: 'column', gap: t.space.md }}>
        <div style={{ position: 'relative', paddingInlineEnd: '2.5rem' }}>
          <CloseButton placement="end" offset="none" onClick={onClose} screenReaderLabel="Close the to-do list" />
          <Heading level="h2" variant="titleSection">{todoTitle(todo)}</Heading>
          <Text color="secondary">{TODO_DESCRIPTION}</Text>
        </div>
        <TodoList todo={todo} />
      </div>
    </Tray>
  )
}
