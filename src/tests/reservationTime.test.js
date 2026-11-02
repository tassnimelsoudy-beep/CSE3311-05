// Tests for how a reservation's time window is written out.
import { describe, it, expect } from 'vitest'
import {
  formatClock,
  formatDayLabel,
  formatReservationWindow,
  isReservationActive,
  getActiveReservation,
} from '../utils/activity.js'

// Monday 2 November 2026, 9:00am local time.
const NOW = new Date(2026, 10, 2, 9, 0)
const at = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute)
const window = (start, end) => formatReservationWindow(start.toISOString(), end.toISOString(), NOW)

describe('formatClock', () => {
  it('leaves off the minutes on the hour, and the seconds always', () => {
    expect(formatClock(at(2, 15))).toMatch(/^3\s?PM$/)
    expect(formatClock(at(2, 15, 30))).toMatch(/^3:30\s?PM$/)
  })
})

describe('formatDayLabel', () => {
  it('uses the same words as the due dates', () => {
    expect(formatDayLabel(at(2, 20), NOW)).toBe('Today')
    expect(formatDayLabel(at(3, 8), NOW)).toBe('Tomorrow')
    expect(formatDayLabel(at(6, 8), NOW)).toBe('Friday')
    expect(formatDayLabel(at(20, 8), NOW)).toBe('Nov 20')
  })
})

describe('formatReservationWindow', () => {
  it('writes AM/PM once when both ends share it', () => {
    expect(window(at(2, 15), at(2, 17))).toBe('Today, 3 – 5 PM')
  })

  it('writes both when the window crosses midday', () => {
    expect(window(at(3, 10), at(3, 14))).toBe('Tomorrow, 10 AM – 2 PM')
  })

  it('keeps the minutes when a time is not on the hour', () => {
    expect(window(at(2, 15, 30), at(2, 17))).toBe('Today, 3:30 – 5 PM')
  })

  it('names both days when the window runs overnight', () => {
    expect(window(at(2, 22), at(3, 8))).toBe('Today, 10 PM – Tomorrow, 8 AM')
  })

  it('returns null rather than "Invalid Date" for unusable input', () => {
    expect(formatReservationWindow('not a date', 'also not', NOW)).toBeNull()
  })
})

describe('isReservationActive and getActiveReservation', () => {
  const current = { id: 1, starts_at: at(2, 8).toISOString(), ends_at: at(2, 11).toISOString() }
  const later = { id: 2, starts_at: at(3, 8).toISOString(), ends_at: at(3, 11).toISOString() }

  it('counts a reservation as active between its start and end', () => {
    expect(isReservationActive(current, NOW)).toBe(true)
    expect(isReservationActive(later, NOW)).toBe(false)
  })

  it('finds the reservation under way, or none', () => {
    expect(getActiveReservation({ reservations: [current, later] }, NOW)).toEqual(current)
    expect(getActiveReservation({ reservations: [later] }, NOW)).toBeNull()
    expect(getActiveReservation({}, NOW)).toBeNull()
  })
})
