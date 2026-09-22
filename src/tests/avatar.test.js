// Tests for the helpers that decide how a person's name and initials appear.
import { describe, it, expect } from 'vitest'
import { getInitials, getDisplayName } from '../utils/avatar.js'

describe('getInitials', () => {
  it('uses the first and last name, or one letter for a single name', () => {
    expect(getInitials('Sarah Miller')).toBe('SM')
    expect(getInitials('Mary Jo Smith')).toBe('MS')
    expect(getInitials('alex')).toBe('A')
    expect(getInitials('')).toBe('?')
  })
})

describe('getDisplayName', () => {
  const user = { email: 'sarah.m@example.com', user_metadata: { name: 'Sarah (signup)' } }

  it('prefers the participant name, then the sign-up name, then the email', () => {
    expect(getDisplayName({ name: 'Sarah Miller' }, user)).toBe('Sarah Miller')
    expect(getDisplayName(null, user)).toBe('Sarah (signup)')
    expect(getDisplayName(null, { email: 'sarah.m@example.com' })).toBe('sarah.m')
  })
})
