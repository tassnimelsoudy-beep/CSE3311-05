// A stand-in for a Supabase query, so service tests never touch the real database.
//
// Real queries are chains like supabase.from('x').select().eq(...).single().
// fakeQuery(result) returns an object where every chain step returns itself,
// and awaiting it (or calling .single()/.maybeSingle()) gives back `result`.
import { vi } from 'vitest'

export function fakeQuery(result) {
  const query = {}
  for (const step of ['select', 'insert', 'update', 'delete', 'eq', 'order']) {
    query[step] = vi.fn(() => query)
  }
  query.single = vi.fn(() => Promise.resolve(result))
  query.maybeSingle = vi.fn(() => Promise.resolve(result))
  query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  return query
}
