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

export const eventService = {
  async create(input: CreateEventInput): Promise<EventData> {
    return api.post<EventData>('/events', input);
  },

  async get(eventId: string): Promise<EventDetail> {
    return api.get<EventDetail>(`/events/${eventId}`);
  },

  async list(): Promise<EventData[]> {
    return api.get<EventData[]>('/events');
  },

  async join(inviteCode: string): Promise<EventData> {
    return api.post<EventData>('/events/join', { inviteCode });
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
