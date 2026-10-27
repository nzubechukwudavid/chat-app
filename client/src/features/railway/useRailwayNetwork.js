import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChatContext } from 'stream-chat-react';

import { byActivity, describeLine } from '../../lib/lines';

const TEAM_FILTER = (userId) => ({ type: 'team', members: { $in: [userId] } });
const DIRECT_FILTER = (userId) => ({ type: 'messaging', members: { $in: [userId] } });
const QUERY_OPTIONS = { state: true, watch: true, presence: true, limit: 50 };

/**
 * One source of truth for the station.
 *
 * The board is the first consumer, but keeping the query/event loop in a hook
 * means the sidebar mini-map and the split-view station can share the same
 * snapshot later instead of opening another set of watched queries.
 */
export const useRailwayNetwork = () => {
  const { client } = useChatContext();
  const [teamLines, setTeamLines] = useState([]);
  const [directLines, setDirectLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const requestRef = useRef(0);
  const timerRef = useRef(null);

  // Relative times and watch labels stay truthful without making the whole
  // board depend on a per-second data query.
  const [, setMinute] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setMinute((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    if (!client?.userID) return;

    const request = requestRef.current + 1;
    requestRef.current = request;

    try {
      const [team, direct] = await Promise.all([
        client.queryChannels(TEAM_FILTER(client.userID), { last_message_at: -1 }, QUERY_OPTIONS),
        client.queryChannels(DIRECT_FILTER(client.userID), { last_message_at: -1 }, QUERY_OPTIONS),
      ]);

      if (request !== requestRef.current) return;

      setTeamLines(team.map((channel) => describeLine(channel, client.userID)).sort(byActivity));
      setDirectLines(direct.map((channel) => describeLine(channel, client.userID)).sort(byActivity));
      setError('');
    } catch (loadError) {
      if (request !== requestRef.current) return;
      console.error('[RailHub] station refresh failed:', loadError);
      setError('The station board could not refresh. Check your connection.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  // A burst of dispatches or read receipts should cost one reconciliation,
  // not one full station reload per event.
  useEffect(() => {
    if (!client) return undefined;

    const schedule = () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(load, 350);
    };

    const events = [
      'message.new',
      'message.read',
      'notification.message_new',
      'notification.added_to_channel',
      'notification.removed_from_channel',
      'channel.deleted',
      'channel.updated',
    ];

    events.forEach((event) => client.on(event, schedule));

    return () => {
      window.clearTimeout(timerRef.current);
      events.forEach((event) => client.off(event, schedule));
    };
  }, [client, load]);

  const onWatch = useMemo(() => {
    const crew = new Map();
    [...teamLines, ...directLines].forEach((line) => {
      line.members.forEach((member) => {
        if (member?.id && member.online) crew.set(member.id, member);
      });
    });
    return crew.size;
  }, [teamLines, directLines]);

  const unreadTotal = useMemo(
    () => [...teamLines, ...directLines].reduce((total, line) => total + line.unread, 0),
    [teamLines, directLines],
  );

  return {
    teamLines,
    directLines,
    loading,
    error,
    reload: load,
    onWatch,
    unreadTotal,
  };
};
