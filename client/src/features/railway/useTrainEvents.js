import { useEffect, useRef, useState } from 'react';

const ARRIVAL_MS = 2400;
const BROADCAST_MS = 3200;
const TYPING_MS = 7000;
const COALESCE_MS = 1400;
const BROADCAST_COOLDOWN_MS = 2600;
const MAX_JOURNEYS = 3;
const MAX_SEEN_MESSAGES = 240;

const fullName = (user) => user?.fullName || user?.name || 'Someone';

const isDirectLine = (event, channel) =>
  event.channel_type === 'messaging' ||
  channel?.type === 'messaging' ||
  String(event.cid || '').startsWith('messaging:');

const lineDetails = (event, channel, direct) => {
  if (direct) {
    return {
      lineName: fullName(event.message?.user) || 'Direct message',
      userName: fullName(event.message?.user),
    };
  }

  return {
    lineName: channel?.data?.name || channel?.id || event.cid || 'Line',
    userName: fullName(event.message?.user),
  };
};

/**
 * Turns real Stream activity into a short, finite train journey.
 *
 * The board remains the source of truth: this hook only listens for live
 * events after the station mounts. It never replays channel history, and it
 * drops duplicate deliveries so a reconnect cannot send a train stampede.
 */
export const useTrainEvents = (client) => {
  const [journeys, setJourneys] = useState([]);
  const [typingByLine, setTypingByLine] = useState({});

  const seenMessages = useRef(new Set());
  const journeyTimers = useRef(new Map());
  const typingTimers = useRef(new Map());
  const lastJourneyAt = useRef(new Map());
  const lastBroadcastAt = useRef(0);

  useEffect(() => {
    if (!client) return undefined;

    const journeyTimerMap = journeyTimers.current;
    const typingTimerMap = typingTimers.current;

    const removeJourney = (id) => {
      const timer = journeyTimerMap.get(id);
      if (timer) window.clearTimeout(timer);
      journeyTimerMap.delete(id);
      setJourneys((current) => current.filter((journey) => journey.id !== id));
    };

    const pushJourney = (journey) => {
      setJourneys((current) => [...current, journey].slice(-MAX_JOURNEYS));

      const timer = window.setTimeout(
        () => removeJourney(journey.id),
        journey.duration + 350,
      );
      journeyTimerMap.set(journey.id, timer);
    };

    const clearTyping = (cid, userId) => {
      setTypingByLine((current) => {
        const entry = current[cid];
        if (!entry || (userId && entry.userId !== userId)) return current;

        const timer = typingTimerMap.get(cid);
        if (timer) window.clearTimeout(timer);
        typingTimerMap.delete(cid);

        const next = { ...current };
        delete next[cid];
        return next;
      });
    };

    const onMessage = (event) => {
      const message = event.message;
      if (!message?.id || seenMessages.current.has(message.id)) return;

      seenMessages.current.add(message.id);
      if (seenMessages.current.size > MAX_SEEN_MESSAGES) {
        const stale = Array.from(seenMessages.current).slice(0, 80);
        stale.forEach((id) => seenMessages.current.delete(id));
      }

      const isBroadcast = Boolean(message.broadcast || message.custom?.broadcast);
      const isOwnMessage = message.user?.id === client.userID;

      // The board is not visible while a user is typing in a channel, so a
      // normal message from this same account does not need a journey. A
      // broadcast is different: it is sent from the station modal while the
      // board stays mounted behind it.
      if (isOwnMessage && !isBroadcast) return;

      const now = Date.now();

      if (isBroadcast) {
        if (now - lastBroadcastAt.current < BROADCAST_COOLDOWN_MS) return;
        lastBroadcastAt.current = now;
      } else {
        const previous = lastJourneyAt.current.get(event.cid) || 0;
        if (now - previous < COALESCE_MS) return;
        lastJourneyAt.current.set(event.cid, now);
      }

      const channel = event.channel || client.activeChannels?.[event.cid] || null;
      const direct = isDirectLine(event, channel);
      const details = lineDetails(event, channel, direct);

      pushJourney({
        id: message.id,
        kind: isBroadcast ? 'broadcast' : 'arrival',
        cid: event.cid,
        direct,
        lineName: isBroadcast ? 'All lines' : details.lineName,
        userName: details.userName,
        duration: isBroadcast ? BROADCAST_MS : ARRIVAL_MS,
        createdAt: now,
      });

      clearTyping(event.cid, message.user?.id);
    };

    const onTypingStart = (event) => {
      const user = event.user;
      if (!event.cid || !user?.id || user.id === client.userID) return;

      const channel = event.channel || client.activeChannels?.[event.cid] || null;
      const direct = isDirectLine(event, channel);
      const lineName = direct
        ? fullName(user)
        : channel?.data?.name || channel?.id || event.cid || 'Line';

      setTypingByLine((current) => ({
        ...current,
        [event.cid]: {
          cid: event.cid,
          userId: user.id,
          userName: fullName(user),
          lineName,
          direct,
        },
      }));

      const previous = typingTimerMap.get(event.cid);
      if (previous) window.clearTimeout(previous);

      const timer = window.setTimeout(() => {
        setTypingByLine((current) => {
          if (current[event.cid]?.userId !== user.id) return current;

          const next = { ...current };
          delete next[event.cid];
          return next;
        });
        typingTimerMap.delete(event.cid);
      }, TYPING_MS);

      typingTimerMap.set(event.cid, timer);
    };

    const onTypingStop = (event) => {
      if (!event.cid) return;
      clearTyping(event.cid, event.user?.id);
    };

    client.on('message.new', onMessage);
    client.on('typing.start', onTypingStart);
    client.on('typing.stop', onTypingStop);

    return () => {
      client.off('message.new', onMessage);
      client.off('typing.start', onTypingStart);
      client.off('typing.stop', onTypingStop);

      journeyTimerMap.forEach((timer) => window.clearTimeout(timer));
      journeyTimerMap.clear();
      typingTimerMap.forEach((timer) => window.clearTimeout(timer));
      typingTimerMap.clear();
    };
  }, [client]);

  return {
    journey: journeys[journeys.length - 1] || null,
    typingByLine,
  };
};
