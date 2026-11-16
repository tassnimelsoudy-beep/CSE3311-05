// Setting the turn order while creating a rotation.
//
// Same drag list as the "Reorder turns" dialog, so the same caveat applies:
// jsdom has no layout and can't run pointer drags, but dnd-kit's keyboard
// sensor drives the identical reorder path.
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddResourceModal from '../Components/AddResourceModal.jsx'

const household = [
  { id: 1, name: 'Alex Chen', isYou: true },
  { id: 2, name: 'Sam Rivera' },
  { id: 3, name: 'Jordan Blake' },
]

function renderForm() {
  const onCreate = vi.fn().mockResolvedValue(null)
  render(
    <AddResourceModal
      household={household}
      meId={1}
      groupId={3}
      onClose={vi.fn()}
      onCreate={onCreate}
    />,
  )
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Dishes' } })
  return onCreate
}

// The list is the roster now: people come in through the "+ Add person"
// menu and leave through the row's remove button.
async function addPerson(user, name) {
  await user.click(screen.getByRole('button', { name: 'Add person' }))
  await user.click(screen.getByRole('menuitem', { name: new RegExp(name) }))
}

async function removePerson(user, name) {
  await user.click(screen.getByRole('button', { name: new RegExp(`Remove ${name}`) }))
}

function orderedNames() {
  return [...screen.getByRole('list', { name: 'Turn order' }).querySelectorAll('.reorder-name')]
    .map(node => node.textContent)
}

describe('turn order on the creation form', () => {
  it('lists people in the order they were added', async () => {
    const user = userEvent.setup()
    renderForm() // Alex is pre-selected as the signed-in user
    await addPerson(user, 'Jordan Blake')
    await addPerson(user, 'Sam Rivera')

    expect(orderedNames()).toEqual(['Alex Chen (you)', 'Jordan Blake', 'Sam Rivera'])
  })

  it('only offers people who are not already in the order', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Add person' }))

    expect(screen.queryByRole('menuitem', { name: /Alex Chen/ })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Sam Rivera/ })).toBeInTheDocument()
  })

  it('stops offering anyone once the whole group is in', async () => {
    const user = userEvent.setup()
    renderForm()
    await addPerson(user, 'Sam Rivera')
    await addPerson(user, 'Jordan Blake')

    expect(screen.queryByRole('button', { name: 'Add person' })).not.toBeInTheDocument()
    expect(screen.getByText(/Everyone in the group is taking turns/)).toBeInTheDocument()
  })

  it('marks the top person as going first', async () => {
    const user = userEvent.setup()
    renderForm()
    await addPerson(user, 'Sam Rivera')

    expect(screen.getByText('Goes first')).toBeInTheDocument()
  })

  it('drops someone when their row is removed, and offers them again', async () => {
    const user = userEvent.setup()
    renderForm()
    await addPerson(user, 'Sam Rivera')
    await removePerson(user, 'Sam Rivera')

    expect(orderedNames()).toEqual(['Alex Chen (you)'])

    await user.click(screen.getByRole('button', { name: 'Add person' }))
    expect(screen.getByRole('menuitem', { name: /Sam Rivera/ })).toBeInTheDocument()
  })

  it('says so plainly when nobody is left in the order', async () => {
    const user = userEvent.setup()
    renderForm()
    await removePerson(user, 'Alex Chen')

    expect(screen.getByText('Nobody is taking turns yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Turn order' })).not.toBeInTheDocument()
  })

  it('does not offer a first-turn tag when only one person is in', () => {
    renderForm()
    expect(screen.queryByText('Goes first')).not.toBeInTheDocument()
  })

  it('reorders with the keyboard and submits the new order', async () => {
    const user = userEvent.setup()
    const onCreate = renderForm()
    await addPerson(user, 'Sam Rivera')
    await addPerson(user, 'Jordan Blake')

    const rows = screen.getByRole('list', { name: 'Turn order' }).querySelectorAll('li')
    rows[2].focus() // Jordan, last
    await user.keyboard('{ }{ArrowUp}{ArrowUp}{ }')

    expect(orderedNames()).toEqual(['Jordan Blake', 'Alex Chen (you)', 'Sam Rivera'])

    fireEvent.click(screen.getByRole('button', { name: 'Add activity' }))
    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ memberIds: [3, 1, 2] }))
    })
  })

  it('is not shown for reservations, which have no turns', () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Reserve it' }))

    expect(screen.queryByRole('list', { name: 'Turn order' })).not.toBeInTheDocument()
  })
})
