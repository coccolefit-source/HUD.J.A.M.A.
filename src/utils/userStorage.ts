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

const SESSION_KEY = 'prime_user_session_v1';
const PROFILE_KEY = 'prime_user_profile_v1';

export function getStoredUserSession(): UserSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading stored user session:', e);
  }
  return DEFAULT_USER_SESSION;
}

export function saveStoredUserSession(session: UserSession): void {
  try {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      if (session.alias) {
        localStorage.setItem('prime_user_alias_global', session.alias);
      }
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.warn('Error saving user session:', e);
  }
}

export function getStoredUserProfile(): UserProfileState {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading stored user profile:', e);
  }
  return DEFAULT_PROFILE_STATE;
}

export function saveStoredUserProfile(profile: UserProfileState): void {
  try {
    if (profile) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
  } catch (e) {
    console.warn('Error saving user profile:', e);
  }
}

