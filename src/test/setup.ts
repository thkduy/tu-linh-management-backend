import { beforeAll } from 'vitest';

// Ensure a test environment is set before any module reads env.
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
process.env.CORS_ORIGIN = 'http://localhost:3001';
process.env.PORT = '3000';
process.env.SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
process.env.SUPABASE_SECRET_KEY = 'secret-key';

beforeAll(() => {
  // Silence logger output during tests.
  process.env.LOG_LEVEL = 'silent';
});
