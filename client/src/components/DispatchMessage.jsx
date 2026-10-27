import React from 'react';
import { MessageSimple, useMessageContext } from 'stream-chat-react';

import { BroadcastIcon } from './ui/icons';

/**
 * Broadcast dispatches get a network-wide marker above the normal bubble.
 * The wrapper is deliberately thin so the SDK keeps owning layout, timestamps
 * and delivery state.
 *
 * The SDK passes this component only `groupedByUser`; the message itself comes
 * from `MessageContext`. It must also be passed to `MessageList`, not `Channel`:
 * `Channel` does not forward a `Message` override to the list.
 */
const DispatchMessage = (props) => {
  const { message } = useMessageContext();
  const broadcast = Boolean(message?.broadcast || message?.custom?.broadcast);

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
