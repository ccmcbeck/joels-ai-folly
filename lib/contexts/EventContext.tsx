import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../config';
import { eventService, type EventDetail } from '../services/events';
import type { EventData, SubGroup, RoutePoint } from '../types';
import { SAMPLE_ROUTE } from '../mock-data';

interface EventState {
  activeEvent: EventDetail | null;
  isLoading: boolean;
  setActiveEvent: (event: EventDetail | null) => void;
  createEvent: (name: string, date: string) => Promise<EventDetail>;
  joinEvent: (inviteCode: string) => Promise<EventDetail>;
  leaveEvent: () => Promise<void>;
  refreshEvent: () => Promise<void>;
  createSubGroup: (name: string) => Promise<SubGroup>;
}

const EventContext = createContext<EventState | null>(null);

let mockEventCounter = 1;

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [activeEvent, setActiveEventState] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedEvent();
  }, []);

  async function loadSavedEvent() {
    try {
      const savedId = await AsyncStorage.getItem('activeEventId');
      if (!savedId) {
        setIsLoading(false);
        return;
      }

      if (config.useMockData) {
        const savedEvent = await AsyncStorage.getItem(`event:${savedId}`);
        if (savedEvent) {
          setActiveEventState(JSON.parse(savedEvent));
        }
      } else {
        const event = await eventService.get(savedId);
        setActiveEventState(event);
      }
    } catch {
      await AsyncStorage.removeItem('activeEventId');
    } finally {
      setIsLoading(false);
    }
  }

  const setActiveEvent = useCallback(async (event: EventDetail | null) => {
    setActiveEventState(event);
    if (event) {
      await AsyncStorage.setItem('activeEventId', event.id);
      if (config.useMockData) {
        await AsyncStorage.setItem(`event:${event.id}`, JSON.stringify(event));
      }
    } else {
      await AsyncStorage.removeItem('activeEventId');
    }
  }, []);

  const createEvent = useCallback(async (name: string, date: string): Promise<EventDetail> => {
    if (config.useMockData) {
      const event: EventDetail = {
        id: `event-${mockEventCounter++}`,
        name,
        date,
        status: 'draft',
        organizerUid: 'mock-user-1',
        inviteCode: generateInviteCode(),
        createdAt: new Date().toISOString(),
        participants: [
          {
            uid: 'mock-user-1',
            displayName: 'You',
            role: 'organizer',
            status: 'active',
          },
        ],
        subGroups: [],
        route: SAMPLE_ROUTE,
      };
      await setActiveEvent(event);
      return event;
    }
    const created = await eventService.create({ name, date });
    const detail = await eventService.get(created.id);
    await setActiveEvent(detail);
    return detail;
  }, [setActiveEvent]);

  const joinEvent = useCallback(async (inviteCode: string): Promise<EventDetail> => {
    if (config.useMockData) {
      // In mock mode, create a fake event as if we joined
      const event: EventDetail = {
        id: `event-joined-${mockEventCounter++}`,
        name: `Event ${inviteCode}`,
        date: new Date().toISOString(),
        status: 'active',
        organizerUid: 'organizer-1',
        inviteCode,
        createdAt: new Date().toISOString(),
        participants: [
          {
            uid: 'organizer-1',
            displayName: 'Organizer',
            role: 'organizer',
            status: 'active',
          },
          {
            uid: 'mock-user-1',
            displayName: 'You',
            role: 'participant',
            status: 'active',
          },
        ],
        subGroups: [],
        route: SAMPLE_ROUTE,
      };
      await setActiveEvent(event);
      return event;
    }
    const joined = await eventService.join(inviteCode);
    const detail = await eventService.get(joined.id);
    await setActiveEvent(detail);
    return detail;
  }, [setActiveEvent]);

  const leaveEvent = useCallback(async () => {
    if (activeEvent && !config.useMockData) {
      await eventService.leave(activeEvent.id);
    }
    await setActiveEvent(null);
  }, [activeEvent, setActiveEvent]);

  const refreshEvent = useCallback(async () => {
    if (!activeEvent) return;
    if (config.useMockData) return;
    const detail = await eventService.get(activeEvent.id);
    setActiveEventState(detail);
  }, [activeEvent]);

  const createSubGroup = useCallback(async (name: string): Promise<SubGroup> => {
    if (!activeEvent) throw new Error('No active event');

    if (config.useMockData) {
      const sg: SubGroup = {
        subGroupId: `sg-${Date.now()}`,
        name,
        memberUids: [],
        createdBy: 'mock-user-1',
      };
      const updated = {
        ...activeEvent,
        subGroups: [...activeEvent.subGroups, sg],
      };
      await setActiveEvent(updated);
      return sg;
    }

    const sg = await eventService.createSubGroup(activeEvent.id, name);
    await refreshEvent();
    return sg;
  }, [activeEvent, setActiveEvent, refreshEvent]);

  return (
    <EventContext.Provider
      value={{
        activeEvent,
        isLoading,
        setActiveEvent,
        createEvent,
        joinEvent,
        leaveEvent,
        refreshEvent,
        createSubGroup,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvent(): EventState {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent must be used within EventProvider');
  return ctx;
}
