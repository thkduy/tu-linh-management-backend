import { Profile } from '../../types/index.js';

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  user: {
    id: string;
    email: string;
  };
}

export interface LoginResult {
  session: AuthSession;
  profile: Profile;
}
