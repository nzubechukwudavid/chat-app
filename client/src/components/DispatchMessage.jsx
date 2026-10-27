import React from 'react';
import { MessageSimple } from 'stream-chat-react';

import { BroadcastIcon } from './ui/icons';

/**
 * Broadcast dispatches get a network-wide marker above the normal bubble.
 * The wrapper is deliberately thin so the SDK keeps owning layout, timestamps
 * and delivery state.
 *
 * This must be passed to `MessageList`, not `Channel`: in the installed SDK,
 * `Channel` does not forward a `Message` override to the list.
 */
const DispatchMessage = (props) => {
  const broadcast = Boolean(props.message?.broadcast || props.message?.custom?.broadcast);

  if (!broadcast) return <MessageSimple {...props} />;

  return (
    <div className="dispatch-broadcast">
      <p className="dispatch-broadcast__tag">
        <BroadcastIcon size={11} strokeWidth={2.4} />
        All stations
      </p>
      <MessageSimple {...props} />
    </div>
  );
};

export default DispatchMessage;
