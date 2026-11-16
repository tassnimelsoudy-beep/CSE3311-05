// Tests for the "Reorder turns" dialog.
//
// jsdom has no layout, so dnd-kit's pointer dragging can't run here. Its
// keyboard sensor can, and it drives exactly the same reorder path, so these
// exercise the dialog through the keyboard: space to pick a row up, arrows to
// move it, space to drop. That also happens to be the accessibility story.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReorderTurnsModal from '../Components/ReorderTurnsModal.jsx'

const members = [
  { id: 1, name: 'Alex Chen' },
  { id: 2, name: 'Sam Rivera' },
  { id: 3, name: 'Jordan Blake' },
]

function renderModal(overrides = {}) {
  const onSave = overrides.onSave ?? vi.fn(() => Promise.resolve(null))
  const onClose = overrides.onClose ?? vi.fn()
  render(
    <ReorderTurnsModal
      members={members}
      meId={1}
      onClose={onClose}
      onSave={onSave}
      {...overrides}
    />,
  )
  return { onSave, onClose }
}

function rowNames() {
  return screen
    .getByRole('list', { name: 'Turn order' })
    .querySelectorAll('.reorder-name')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ReorderTurnsModal', () => {
  it('lists everyone in their current turn order', () => {
    renderModal()
    const names = [...rowNames()].map(node => node.textContent)

    expect(names).toEqual(['Alex Chen (you)', 'Sam Rivera', 'Jordan Blake'])
  })

  it('marks the person at the top as the one taking the turn', () => {
    renderModal()
    expect(screen.getByText('Takes the turn')).toBeInTheDocument()
  })

  it('keeps Save disabled until something actually moves', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled()
  })

  it('moves a row with the keyboard and saves the new order', async () => {
    const user = userEvent.setup()
    const { onSave } = renderModal()

    const rows = screen.getByRole('list', { name: 'Turn order' }).querySelectorAll('li')
    rows[2].focus() // Jordan, last
    await user.keyboard('{ }') // pick up
    await user.keyboard('{ArrowUp}')
    await user.keyboard('{ArrowUp}')
    await user.keyboard('{ }') // drop

    const names = [...rowNames()].map(node => node.textContent)
    expect(names).toEqual(['Jordan Blake', 'Alex Chen (you)', 'Sam Rivera'])

    await user.click(screen.getByRole('button', { name: 'Save order' }))
    expect(onSave).toHaveBeenCalledWith([3, 1, 2])
  })

  it('renumbers the positions shown as rows move', async () => {
    const user = userEvent.setup()
    renderModal()

    const rows = screen.getByRole('list', { name: 'Turn order' }).querySelectorAll('li')
    rows[2].focus()
    await user.keyboard('{ }{ArrowUp}{ArrowUp}{ }')

    const first = screen.getByRole('list', { name: 'Turn order' }).querySelector('li')
    expect(first.querySelector('.reorder-position').textContent).toBe('1')
    expect(first.querySelector('.reorder-name').textContent).toBe('Jordan Blake')
  })

  it('says who is about to take over before you commit', async () => {
    const user = userEvent.setup()
    renderModal()

    const rows = screen.getByRole('list', { name: 'Turn order' }).querySelectorAll('li')
    rows[1].focus() // Sam
    await user.keyboard('{ }{ArrowUp}{ }')

    const tagged = screen.getByText('Takes the turn').closest('li')
    expect(tagged.querySelector('.reorder-name').textContent).toBe('Sam Rivera')
  })

  it('shows the failure and stays open when saving does not work', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(() => Promise.resolve('Could not save the new order.'))
    renderModal({ onSave })

    const rows = screen.getByRole('list', { name: 'Turn order' }).querySelectorAll('li')
    rows[1].focus()
    await user.keyboard('{ }{ArrowUp}{ }')
    await user.click(screen.getByRole('button', { name: 'Save order' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the new order.')
    expect(screen.getByRole('button', { name: 'Save order' })).toBeEnabled()
  })

  it('closes without saving when cancelled', async () => {
    const user = userEvent.setup()
    const { onSave, onClose } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
