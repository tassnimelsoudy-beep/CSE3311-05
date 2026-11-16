// Dates that fall outside the current year have to say which year they mean.
// The rule is the calendar year, not distance: "Jan 3" read on Dec 28 is four
// days away and still belongs to a different year, which is exactly the case
// a bare month/day gets wrong.
import { describe, it, expect } from 'vitest'
import { formatCalendarDate, formatDue, formatReservationWindow } from '../utils/activity.js'

const NOW = new Date(2026, 10, 15, 9, 0) // Sun 15 Nov 2026

describe('formatCalendarDate', () => {
  it('leaves the year off inside the current year', () => {
    expect(formatCalendarDate(new Date(2026, 11, 25), NOW)).toBe('Dec 25')
  })

  it('adds the year once the date moves into the next one', () => {
    expect(formatCalendarDate(new Date(2027, 0, 3), NOW)).toBe('Jan 3, 2027')
  })

  it('adds the year for a date a few days away that crosses new year', () => {
    const lateDecember = new Date(2026, 11, 28, 9, 0)
    expect(formatCalendarDate(new Date(2027, 0, 1), lateDecember)).toBe('Jan 1, 2027')
  })

  it('adds the year for dates in the past as well', () => {
    expect(formatCalendarDate(new Date(2025, 5, 4), NOW)).toBe('Jun 4, 2025')
  })

  it('adds the year for dates several years out', () => {
    expect(formatCalendarDate(new Date(2031, 2, 9), NOW)).toBe('Mar 9, 2031')
  })
})

describe('formatDue across year boundaries', () => {
  it('still prefers the friendly labels near today', () => {
    expect(formatDue(new Date(2026, 10, 15, 18, 0).toISOString(), NOW)).toBe('Today')
    expect(formatDue(new Date(2026, 10, 16, 9, 0).toISOString(), NOW)).toBe('Tomorrow')
  })

  it('shows a bare month and day later this year', () => {
    expect(formatDue(new Date(2026, 11, 20).toISOString(), NOW)).toBe('Dec 20')
  })

  it('shows the year for a rotation due next year', () => {
    expect(formatDue(new Date(2027, 1, 14).toISOString(), NOW)).toBe('Feb 14, 2027')
  })

  it('shows the year for a far-future rotation', () => {
    expect(formatDue(new Date(2029, 8, 1).toISOString(), NOW)).toBe('Sep 1, 2029')
  })
})

describe('reservation windows across year boundaries', () => {
  it('shows the year on a reservation booked into next year', () => {
    const starts = new Date(2027, 0, 5, 15, 0)
    const ends = new Date(2027, 0, 5, 17, 0)

    expect(formatReservationWindow(starts.toISOString(), ends.toISOString(), NOW))
      .toBe('Jan 5, 2027, 3 – 5 PM')
  })

  it('leaves the year off for one later this year', () => {
    const starts = new Date(2026, 11, 2, 15, 0)
    const ends = new Date(2026, 11, 2, 17, 0)

    expect(formatReservationWindow(starts.toISOString(), ends.toISOString(), NOW))
      .toBe('Dec 2, 3 – 5 PM')
  })
})
