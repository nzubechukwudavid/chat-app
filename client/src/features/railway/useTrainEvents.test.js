import { act, render } from '@testing-library/react';
import React from 'react';

import { useTrainEvents } from './useTrainEvents';

const createClient = () => {
  const handlers = new Map();

  return {
    userID: 'me',
    activeChannels: {},
    on: jest.fn((event, handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
    }),
    off: jest.fn((event, handler) => {
      handlers.get(event)?.delete(handler);
    }),
    emit: (event, payload) => {
      handlers.get(event)?.forEach((handler) => handler(payload));
    },
  };
};

const renderHook = (client) => {
  const latest = { current: null };

  const Harness = () => {
    latest.current = useTrainEvents(client);
    return null;
  };

  render(<Harness />);
  return latest;
};

const messageEvent = (overrides = {}) => ({
  cid: 'team:alpha',
  channel_type: 'team',
  message: {
    id: 'message-1',
    user: { id: 'other', name: 'Maya', fullName: 'Maya Okafor' },
  },
  ...overrides,
});

describe('useTrainEvents', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('turns a received message into a named arrival and clears it', () => {
    const client = createClient();
    client.activeChannels['team:alpha'] = {
      id: 'alpha',
      type: 'team',
      data: { name: 'North Line' },
    };

    const latest = renderHook(client);

    act(() => {
      client.emit('message.new', messageEvent());
    });

    expect(latest.current.journey).toMatchObject({
      id: 'message-1',
      kind: 'arrival',
      lineName: 'North Line',
      userName: 'Maya Okafor',
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(latest.current.journey).toBeNull();
  });

  it('ignores ordinary self messages but lets broadcasts through', () => {
    const client = createClient();
    const latest = renderHook(client);

    act(() => {
      client.emit(
        'message.new',
        messageEvent({ message: { id: 'mine', user: { id: 'me', name: 'Me' } } }),
      );
    });
    expect(latest.current.journey).toBeNull();

    act(() => {
      client.emit(
        'message.new',
        messageEvent({
          message: { id: 'broadcast-1', user: { id: 'me', name: 'Me' }, broadcast: true },
        }),
      );
    });
    expect(latest.current.journey).toMatchObject({
      id: 'broadcast-1',
      kind: 'broadcast',
      lineName: 'All lines',
    });
  });

  it('tracks typing until stop or expiry', () => {
    const client = createClient();
    const latest = renderHook(client);

    act(() => {
      client.emit('typing.start', {
        cid: 'team:alpha',
        channel_type: 'team',
        user: { id: 'other', name: 'Maya', fullName: 'Maya Okafor' },
      });
    });

    expect(latest.current.typingByLine['team:alpha']).toMatchObject({
      userName: 'Maya Okafor',
    });

    act(() => {
      client.emit('typing.stop', {
        cid: 'team:alpha',
        user: { id: 'other', name: 'Maya' },
      });
    });
    expect(latest.current.typingByLine['team:alpha']).toBeUndefined();

    act(() => {
      client.emit('typing.start', {
        cid: 'team:alpha',
        channel_type: 'team',
        user: { id: 'other', name: 'Maya', fullName: 'Maya Okafor' },
      });
      jest.advanceTimersByTime(7000);
    });
    expect(latest.current.typingByLine['team:alpha']).toBeUndefined();
  });

  it('drops duplicate message deliveries', () => {
    const client = createClient();
    const latest = renderHook(client);

    act(() => {
      client.emit('message.new', messageEvent());
    });

    act(() => {
      jest.advanceTimersByTime(3000);
      client.emit('message.new', messageEvent());
    });

    expect(latest.current.journey).toBeNull();
  });
});
