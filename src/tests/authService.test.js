// Tests for sign-up and login: what gets sent to Supabase and which
// error messages the user sees.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
      getUser: vi.fn(),
    },
  },
}))

import { supabase } from '../lib/supabase.js'
import { signUp, login, updateAccount } from '../services/authService.js'

beforeEach(() => {
  supabase.auth.signUp.mockReset()
  supabase.auth.signInWithPassword.mockReset()
  supabase.auth.updateUser.mockReset()
  supabase.auth.getUser.mockReset()
})

describe('signUp', () => {
  it('sends the name as account metadata so the database trigger can save it', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const result = await signUp('sarah@example.com', 'secret123', 'Sarah Miller')

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'sarah@example.com',
      password: 'secret123',
      options: { data: { name: 'Sarah Miller' } },
    })
    expect(result.error).toBeNull()
  })

  it('explains a duplicate email in plain language', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    })

    const result = await signUp('sarah@example.com', 'secret123', 'Sarah')

    expect(result.error).toBe('An account with this email already exists. Log in instead.')
  })
})

describe('login', () => {
  it('explains a wrong email or password in plain language', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    const result = await login('sarah@example.com', 'wrong')

    expect(result.error).toBe("That email and password don't match an account.")
  })
})

describe('updateAccount', () => {
  it('updates only the supplied auth fields and display-name metadata', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'sarah@example.com' } },
      error: null,
    })
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    supabase.auth.updateUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })

    await expect(updateAccount({
      name: 'Sarah Miller',
      email: 'sarah.new@example.com',
      password: '',
      currentPassword: 'current-secret',
      userId: 'u1',
    })).resolves.toEqual({ data: { user: { id: 'u1' } }, error: null })

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'sarah@example.com',
      password: 'current-secret',
    })
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      email: 'sarah.new@example.com',
      data: { name: 'Sarah Miller' },
    })
  })

  it('does not send an empty update to Supabase Auth', async () => {
    await expect(updateAccount({ name: '', email: '', password: '' })).resolves.toEqual({
      data: null,
      error: null,
    })
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('returns Supabase errors in a readable form', async () => {
    supabase.auth.updateUser.mockResolvedValue({
      data: null,
      error: { message: 'Password should be at least 6 characters' },
    })

    await expect(updateAccount({ email: '', password: 'bad', name: '' })).resolves.toEqual({
      data: null,
      error: 'Password must be at least 6 characters.',
    })
  })

  it('requires current-password verification before changing credentials', async () => {
    const result = await updateAccount({
      email: 'new@example.com',
      password: '',
      name: '',
      currentPassword: '',
    })

    expect(result.error).toMatch(/current password/)
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('does not update the account when the current password is incorrect', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'sarah@example.com' } },
      error: null,
    })
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    const result = await updateAccount({
      email: 'new@example.com',
      password: '',
      name: '',
      currentPassword: 'wrong-password',
      userId: 'u1',
    })

    expect(result.error).toBe('Your current password is incorrect.')
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })
})
