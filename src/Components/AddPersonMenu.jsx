import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import Avatar from './Avatar.jsx'

// "+ Add person" button with a small menu of whoever isn't in the list yet.
// The same shape as an assignee picker in Linear or Notion: the list on screen
// is the membership, and this is the only way to grow it, so there is no
// separate tick-box roster to keep in sync with it.
//
// - candidates: people not yet added
// - onAdd(id):  appends someone to the end of the list
export default function AddPersonMenu({ candidates, meId, onAdd }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!candidates || candidates.length === 0) {
    return <p className="hint">Everyone in the group is taking turns.</p>
  }

  return (
    <div className="add-person" ref={wrapperRef}>
      <button
        type="button"
        ref={buttonRef}
        className="add-person-trigger"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
      >
        <Plus size={15} aria-hidden="true" />
        Add person
      </button>

      {open && (
        <ul className="add-person-menu" role="menu" aria-label="Add someone to the turn order">
          {candidates.map(person => (
            <li key={person.id} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onAdd(person.id)
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
              >
                <Avatar name={person.name} size={24} />
                <span>{person.id === meId ? `${person.name} (you)` : person.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
