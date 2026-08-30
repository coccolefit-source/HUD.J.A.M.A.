import { UserSession, UserProfileState } from '../types';

export const DEFAULT_USER_SESSION: UserSession = {
  email: '',
  alias: '',
  hudName: 'HUD OPERADOR',
  updatedAt: new Date().toISOString()
};

export const DEFAULT_PROFILE_STATE: UserProfileState = {
  streak: 0,
  xp: 0,
  level: 1,
  rankTitle: "OPERADOR NOVATO",
  progressPercentage: 0,
  isMaxLevel: false
};

export function getStoredUserSession(): UserSession {
  return DEFAULT_USER_SESSION;
}

export function saveStoredUserSession(_session: UserSession): void {
  // Persistence strictly handled via Supabase
}

export function getStoredUserProfile(): UserProfileState {
  return DEFAULT_PROFILE_STATE;
}

export function saveStoredUserProfile(_profile: UserProfileState): void {
  // Persistence strictly handled via Supabase
}
