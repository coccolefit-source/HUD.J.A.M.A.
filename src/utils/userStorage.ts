import { UserSession, UserProfileState } from '../types';

const USER_SESSION_KEY = 'habitpulse_user_session_v1';
const USER_PROFILE_KEY = 'habitpulse_profile_v1';

export const DEFAULT_USER_SESSION: UserSession = {
  email: '',
  alias: '',
  hudName: 'HUD INVITADO',
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
  try {
    const data = localStorage.getItem(USER_SESSION_KEY);
    if (!data) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(DEFAULT_USER_SESSION));
      return DEFAULT_USER_SESSION;
    }
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_USER_SESSION,
      ...parsed
    };
  } catch (e) {
    console.error('Error loading user session', e);
    return DEFAULT_USER_SESSION;
  }
}

export function saveStoredUserSession(session: UserSession): void {
  try {
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Error saving user session', e);
  }
}

export function getStoredUserProfile(): UserProfileState {
  try {
    const data = localStorage.getItem(USER_PROFILE_KEY);
    if (!data) {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(DEFAULT_PROFILE_STATE));
      return DEFAULT_PROFILE_STATE;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading user profile', e);
    return DEFAULT_PROFILE_STATE;
  }
}

export function saveStoredUserProfile(profile: UserProfileState): void {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving user profile', e);
  }
}
