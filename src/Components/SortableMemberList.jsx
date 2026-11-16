import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import Avatar from './Avatar.jsx'

// One draggable row. The whole row is the drag handle, so it behaves the same
// with a mouse, a finger or the keyboard.
function SortableMember({ member, index, meId, tag, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: member.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`reorder-row${isDragging ? ' dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <GripVertical size={16} className="reorder-grip" aria-hidden="true" />
      <span className="reorder-position">{index + 1}</span>
      <Avatar name={member.name} size={28} />
      <span className="reorder-name">
        {member.id === meId ? `${member.name} (you)` : member.name}
      </span>
      {tag && <span className="reorder-tag">{tag}</span>}
      {onRemove && (
        // The row itself is the drag handle, so this button has to keep its
        // own pointer events from starting a drag.
        <button
          type="button"
          className="reorder-remove"
          onPointerDown={event => event.stopPropagation()}
          onKeyDown={event => event.stopPropagation()}
          onClick={() => onRemove(member.id)}
          aria-label={`Remove ${member.name} from the turn order`}
          title="Remove"
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </li>
  )
}

// A drag-to-reorder list of people, numbered from the top down: position 1 is
// the first turn. Shared by the creation form and the "Reorder turns" dialog so
// that setting an order and changing one later look and behave identically.
//
// - members:       everyone in the list, any order
// - order:         their ids, in the order to display
// - onOrderChange: called with the new id order after a move
// - firstTag:      optional label on the top row, e.g. "Goes first"
// - onRemove:      when given, each row gets a remove button
export default function SortableMemberList({
  members,
  order,
  onOrderChange,
  meId,
  firstTag,
  onRemove,
  ariaLabel = 'Turn order',
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // A few pixels of travel before a drag begins, so a plain click or tap
      // on a row isn't read as one.
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const byId = new Map((members || []).map(member => [member.id, member]))
  const ordered = (order || []).map(id => byId.get(id)).filter(Boolean)

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const from = order.indexOf(active.id)
    const to = order.indexOf(over.id)
    if (from === -1 || to === -1) return

    onOrderChange(arrayMove(order, from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order || []} strategy={verticalListSortingStrategy}>
        <ol className="reorder-list" aria-label={ariaLabel}>
          {ordered.map((member, index) => (
            <SortableMember
              key={member.id}
              member={member}
              index={index}
              meId={meId}
              tag={index === 0 ? firstTag : null}
              onRemove={onRemove}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}
