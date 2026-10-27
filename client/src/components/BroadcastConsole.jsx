import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChatContext } from 'stream-chat-react';

import Modal from './ui/Modal';
import { useToast } from './ui/Toast';
import { BroadcastIcon, CheckIcon } from './ui/icons';
import { serviceCode } from '../lib/lines';

const MAX_LENGTH = 1200;

/**
 * All-stations broadcast.
 *
 * A normal chat app makes you repeat an announcement once per channel. A
 * control room does not. This console sends one dispatch to every selected
 * team line, tagging it so recipients can see it was a network-wide call.
 */
const BroadcastConsole = ({ open, onClose, onSent }) => {
  const { client } = useChatContext();
  const { success, warning } = useToast();

  const [lines, setLines] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState('');

  const textareaRef = useRef(null);

  useEffect(() => {
    if (!open || !client?.userID) return undefined;

    let cancelled = false;
    setLoading(true);
    setFailure('');

    client
      .queryChannels(
        { type: 'team', members: { $in: [client.userID] } },
        { last_message_at: -1 },
        // Watch the lines while the console is open. A state-only query can hand
        // back a channel that has never been activated, which makes the first
        // send unreliable. The channel list already watches these lines, so this
        // reuses the same subscriptions rather than adding a second set.
        { state: true, watch: true, presence: false, limit: 50 },
      )
      .then((channels) => {
        if (cancelled) return;

        setLines(
          channels.map((channel) => ({
            cid: channel.cid,
            name: channel.data?.name || channel.id,
            code: serviceCode(channel),
            channel,
          })),
        );
        setSelected(new Set());
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error('[RailHub] broadcast targets failed:', loadError);
        setFailure('Could not load the lines. Close this console and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, client]);

  useEffect(() => {
    if (!open) return;
    // Wait for the modal transition so the caret lands after the dialog opens.
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setText('');
      setSelected(new Set());
      setFailure('');
      setSending(false);
    }
  }, [open]);

  const toggle = useCallback((cid) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  }, []);

  const allSelected = lines.length > 0 && selected.size === lines.length;

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(lines.map((line) => line.cid)));
  }, [allSelected, lines]);

  const send = useCallback(async () => {
    const message = text.trim();

    if (!message || !selected.size || sending) return;

    setSending(true);
    setFailure('');

    const targets = lines.filter((line) => selected.has(line.cid));

    let results;
    try {
      results = await Promise.allSettled(
        targets.map((line) =>
          line.channel.sendMessage({ text: message, broadcast: true, custom: { broadcast: true } }),
        ),
      );
    } catch (sendError) {
      console.error('[RailHub] broadcast failed:', sendError);
      setSending(false);
      setFailure('The broadcast could not be sent. Check your connection and try again.');
      return;
    }

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `[RailHub] broadcast to ${targets[index]?.cid || 'line'} failed:`,
          result.reason,
        );
      }
    });

    const sent = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - sent;

    setSending(false);

    if (!sent) {
      setFailure('No line accepted the dispatch. Check your connection and try again.');
      return;
    }

    if (failed) {
      warning(
        `Broadcast reached ${sent} of ${results.length} lines`,
        `${failed} line${failed === 1 ? '' : 's'} could not be reached.`,
      );
    } else {
      success(
        `Broadcast sent to ${sent} ${sent === 1 ? 'line' : 'lines'}`,
        'The dispatch is already on the board.',
      );
    }

    setText('');
    setSelected(new Set());
    onClose?.();
    onSent?.();
  }, [lines, onClose, onSent, selected, sending, success, text, warning]);

  const footer = useMemo(
    () => (
      <>
        <span className="broadcast__targets">
          <BroadcastIcon size={13} />
          {selected.size} of {lines.length} selected
        </span>
        <div className="broadcast__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={send}
            disabled={sending || !selected.size || !text.trim()}
          >
            {sending ? 'Sending…' : `Send to ${selected.size || 0} ${selected.size === 1 ? 'line' : 'lines'}`}
          </button>
        </div>
      </>
    ),
    [lines.length, onClose, selected.size, send, sending, text],
  );

  return (
    <Modal
      open={open}
      onClose={sending ? () => {} : onClose}
      title="All-stations broadcast"
      subtitle="One dispatch, every selected line."
      size="modal--lg"
      footer={footer}
    >
      <div className="broadcast">
        <div className="broadcast__meta">
          <span className="broadcast__kicker">Master control</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={toggleAll}>
            {allSelected ? 'Clear all' : 'Select all lines'}
          </button>
        </div>

        {failure ? (
          <p className="broadcast__failure" role="alert">
            {failure}
          </p>
        ) : null}

        <div className="broadcast__lines" role="group" aria-label="Lines to broadcast to">
          {loading ? (
            <p className="broadcast__empty">Reading the network…</p>
          ) : !lines.length ? (
            <p className="broadcast__empty">
              There are no team lines yet. Create a line before broadcasting.
            </p>
          ) : (
            lines.map((line) => {
              const active = selected.has(line.cid);

              return (
                <button
                  type="button"
                  key={line.cid}
                  className={`broadcast-line${active ? ' is-selected' : ''}`}
                  onClick={() => toggle(line.cid)}
                  aria-pressed={active}
                >
                  <span className="broadcast-line__check" aria-hidden="true">
                    {active ? <CheckIcon size={12} strokeWidth={3} /> : null}
                  </span>
                  <span className="broadcast-line__name">{line.name}</span>
                  <span className="broadcast-line__code">{line.code}</span>
                </button>
              );
            })
          )}
        </div>

        <label className="broadcast__composer">
          <span className="broadcast__label">Dispatch</span>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
            placeholder="Write the announcement every selected line will receive…"
            rows={4}
            maxLength={MAX_LENGTH}
            disabled={sending}
          />
          <span className="broadcast__count">
            {text.length} / {MAX_LENGTH}
          </span>
        </label>

        <p className="broadcast__hint">
          Recipients see an <strong>All stations</strong> marker on the dispatch. The message is
          sent once to each selected line — it is not a group chat.
        </p>
      </div>
    </Modal>
  );
};

export default BroadcastConsole;
