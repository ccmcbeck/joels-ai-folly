import { api } from './api';
import type { EventData, EventParticipant, SubGroup, RoutePoint } from '../types';

export interface CreateEventInput {
  name: string;
  date: string;
}

export interface EventDetail extends EventData {
  participants: EventParticipant[];
  subGroups: SubGroup[];
  route?: RoutePoint[];
}

// Backend returns `eventId`, frontend uses `id` — map the field
function mapEvent<T extends { eventId?: string; id?: string }>(raw: T): T & { id: string } {
  const id = raw.id || raw.eventId || '';
  return { ...raw, id };
}

export const eventService = {
  async create(input: CreateEventInput): Promise<EventData> {
    const raw = await api.post<any>('/events', input);
    return mapEvent(raw);
  },

  async get(eventId: string): Promise<EventDetail> {
    const raw = await api.get<any>(`/events/${eventId}`);
    return mapEvent(raw);
  },

  async list(): Promise<EventData[]> {
    const raw = await api.get<any[]>('/events');
    return raw.map(mapEvent);
  },

  async join(inviteCode: string): Promise<EventData> {
    const raw = await api.post<any>('/events/join', { inviteCode });
    return mapEvent(raw);
  },

  async start(eventId: string): Promise<void> {
    await api.post(`/events/${eventId}/start`);
  },

  async end(eventId: string): Promise<void> {
    await api.post(`/events/${eventId}/end`);
  },

  async uploadRoute(eventId: string, route: RoutePoint[]): Promise<void> {
    await api.post(`/events/${eventId}/route`, { route });
  },

  // Sub-groups
  async createSubGroup(eventId: string, name: string): Promise<SubGroup> {
    return api.post<SubGroup>(`/events/${eventId}/subgroups`, { name });
  },

  async updateSubGroup(
    eventId: string,
    subGroupId: string,
    memberUids: string[],
  ): Promise<void> {
    await api.put(`/events/${eventId}/subgroups/${subGroupId}`, { memberUids });
  },

  async deleteSubGroup(eventId: string, subGroupId: string): Promise<void> {
    await api.del(`/events/${eventId}/subgroups/${subGroupId}`);
  },

  async leave(eventId: string): Promise<void> {
    await api.post(`/events/${eventId}/leave`);
  },
};
