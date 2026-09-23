import type { AIRecommendation, CompleteActivityDto, CompleteActivityResponse, EmployeeProfile, HrAnalytics, HrEmployeeSummary } from '../../backend/types';
import { getDemoRole } from './demo-role';

async function request<T>(path: string, employeeId?: string, init?: RequestInit): Promise<T> {
  const role = getDemoRole();
  const response = await fetch(`/api${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Role': role,
      'X-User-Role': role.toUpperCase(),
      ...(employeeId ? { 'X-Employee-Id': employeeId, 'X-User-Id': employeeId } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let message = `Ошибка сервера (${response.status})`;
    try {
      const body = await response.json();
      message = Array.isArray(body.message) ? body.message.join(', ') : body.message || message;
    } catch { /* response may not contain JSON */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const api = {
  profile: (id: string) => request<EmployeeProfile>(`/employees/${encodeURIComponent(id)}`, id),
  hrProfile: (id: string) => request<EmployeeProfile>(`/hr/employees/${encodeURIComponent(id)}`),
  recommendations: (id: string) => request<AIRecommendation[]>(`/employees/${encodeURIComponent(id)}/recommendations`, id),
  complete: (dto: CompleteActivityDto) => request<CompleteActivityResponse>('/activities/complete', dto.employeeId, { method: 'POST', body: JSON.stringify(dto) }),
  analytics: () => request<HrAnalytics>('/hr/analytics'),
  employees: () => request<HrEmployeeSummary[]>('/hr/employees'),
  importDataset: (payload: { employees: unknown[]; events: unknown[]; skills: unknown[]; history: unknown[] }) => request<{ success: boolean; message: string }>('/hr/import', undefined, { method: 'POST', body: JSON.stringify(payload) }),
};
