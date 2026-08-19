import { vi } from 'vitest';

/**
 * Shared Supabase mock used across tests. The real `src/config/supabase.ts`
 * is replaced with this module via `vi.mock`.
 *
 * The query builder is chainable: every chain method returns the same builder
 * instance (per table), so tests can stub the terminal call (`maybeSingle`,
 * `single`) and inspect the chain. The builder is also *thenable* so that
 * `await builder` (used by `list()` and the count query) resolves to a
 * configurable result.
 */

interface Builder extends Record<string, unknown> {
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  _result: unknown;
  then: (resolve: (value: unknown) => void) => void;
}

const builders = new Map<string, Builder>();

function builderFor(table: string): Builder {
  const existing = builders.get(table);
  if (existing) return existing;

  const b: Builder = {} as Builder;
  const chain = ['select', 'insert', 'update', 'eq', 'neq', 'or', 'order', 'range'];
  for (const m of chain) {
    b[m] = vi.fn(() => b);
  }
  b.maybeSingle = vi.fn();
  b.single = vi.fn();
  b._result = { data: null, error: null };
  b.then = (resolve) => resolve(b._result);
  builders.set(table, b);
  return b;
}

export const supabase = {
  auth: {
    signInWithPassword: vi.fn(),
    getUser: vi.fn(),
    admin: { signOut: vi.fn() },
  },
  from: vi.fn((table: string) => builderFor(table)),
};

export const supabaseAdmin = {
  auth: {
    admin: {
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    },
  },
  from: vi.fn((table: string) => builderFor(table)),
};

/** Get the chainable builder for a table so tests can stub terminal calls. */
export function builder(table: string): Builder {
  return builderFor(table);
}

/** Reset all mock state between tests. */
export function resetSupabaseMocks(): void {
  builders.clear();
  supabase.auth.signInWithPassword.mockReset();
  supabase.auth.getUser.mockReset();
  supabase.auth.admin.signOut.mockReset();
  supabase.from.mockClear();
  supabaseAdmin.auth.admin.createUser.mockReset();
  supabaseAdmin.auth.admin.deleteUser.mockReset();
  supabaseAdmin.from.mockClear();
}
