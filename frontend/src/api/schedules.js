import api from './axios';

export const getSchedules = (params) =>
  api.get('/schedules', { params: typeof params === 'string' ? { month: params } : params });

export const getScheduleNames = () => api.get('/schedules/names');

export const getSlots = (startMonth, endMonth) =>
  api.get('/schedules/slots', { params: { startMonth, endMonth } });

export const createSchedule = (data) => api.post('/schedules', data);
export const deleteSchedule = (id) => api.delete(`/schedules/${id}`);
export const deletePeriod = (periodKey) => api.delete(`/schedules/period/${encodeURIComponent(periodKey)}`);
export const deleteScheduleName = (name) => api.delete(`/schedules/name/${encodeURIComponent(name)}`);
export const autoGenerate = (data) => api.post('/schedules/auto-generate', data);
export const getMonthlySummary = (params) =>
  api.get('/schedules/summary', { params: typeof params === 'string' ? { month: params } : params });
