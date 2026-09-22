// Tests for sign-up and login: what gets sent to Supabase and which
// error messages the user sees.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}))

import { supabase } from '../lib/supabase.js'
import { signUp, login } from '../services/authService.js'

beforeEach(() => {
  supabase.auth.signUp.mockReset()
  supabase.auth.signInWithPassword.mockReset()
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
