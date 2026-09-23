'use client';

import { useSyncExternalStore } from 'react';

export type DemoRole = 'employee' | 'hr';
const key = 'careerQuestRole';

export function getDemoRole(): DemoRole {
  if (typeof window === 'undefined') return 'employee';
  try { return window.localStorage.getItem(key) === 'hr' ? 'hr' : 'employee'; }
  catch { return 'employee'; }
}

export function setDemoRole(role: DemoRole) {
  window.localStorage.setItem(key, role);
  window.dispatchEvent(new Event('career-role-change'));
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('career-role-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('career-role-change', callback);
  };
}

export function useDemoRole() {
  return useSyncExternalStore(subscribe, getDemoRole, () => 'employee' as const);
}
