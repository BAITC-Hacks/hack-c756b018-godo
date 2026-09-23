'use client';

import { create } from 'zustand';
import type { AIRecommendation, EmployeeProfile, SkillProgress } from '../../backend/types';

interface CareerState {
  profile: EmployeeProfile | null;
  recommendations: AIRecommendation[];
  setProfile: (profile: EmployeeProfile | null) => void;
  setRecommendations: (recommendations: AIRecommendation[]) => void;
  updateProgress: (skills: SkillProgress[], score: number) => void;
}

export const useCareerStore = create<CareerState>((set) => ({
  profile: null,
  recommendations: [],
  setProfile: (profile) => set({ profile }),
  setRecommendations: (recommendations) => set({ recommendations }),
  updateProgress: (skills, score) => set((state) => ({
    profile: state.profile ? { ...state.profile, skills, readinessScore: score } : null,
  })),
}));
