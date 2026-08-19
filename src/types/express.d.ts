import { User } from '@supabase/supabase-js';
import { Profile } from './index.js';

declare global {
  namespace Express {
    interface Request {
      /** Supabase auth user attached by the auth middleware. */
      authUser?: User;
      /** Application profile attached by the auth middleware. */
      profile?: Profile;
    }
  }
}
