import type { AIRecommendation, CompleteActivityDto, CompleteActivityResponse, EmployeeProfile, HrAnalytics, HrEmployeeSummary } from '../../types';

async function request<T>(path: string, role: 'EMPLOYEE' | 'HR', employeeId?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': role,
      ...(employeeId ? { 'x-user-id': employeeId } : {}),
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
  profile: (id: string) => request<EmployeeProfile>(`/employees/${encodeURIComponent(id)}`, 'EMPLOYEE', id),
  recommendations: (id: string) => request<AIRecommendation[]>(`/employees/${encodeURIComponent(id)}/recommendations`, 'EMPLOYEE', id),
  complete: (dto: CompleteActivityDto) => request<CompleteActivityResponse>('/activities/complete', 'EMPLOYEE', dto.employeeId, { method: 'POST', body: JSON.stringify(dto) }),
  analytics: () => request<HrAnalytics>('/hr/analytics', 'HR'),
  employees: () => request<HrEmployeeSummary[]>('/hr/employees', 'HR'),
  importDataset: (payload: { employees: unknown[]; events: unknown[]; skills: unknown[]; history: unknown[] }) => request<{ success: boolean; message: string }>('/hr/import', 'HR', undefined, { method: 'POST', body: JSON.stringify(payload) }),
};
