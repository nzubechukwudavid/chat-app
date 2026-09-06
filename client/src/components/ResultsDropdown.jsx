import React from 'react';
import { Avatar, useChatContext } from 'stream-chat-react';

const channelByUser = async ({ client, setActiveChannel, channel, setChannel }) => {
  try {
    const filters = {
      type: 'messaging',
      member_count: 2,
      members: { $eq: [client.userID, channel.id] },
    };

    const [existingChannel] = await client.queryChannels(filters);

    if (existingChannel) {
      if (setChannel) setChannel(existingChannel);
      return setActiveChannel(existingChannel);
    }

    const newChannel = client.channel('messaging', {
      members: [channel.id, client.userID],
    });

    await newChannel.watch();

    if (setChannel) setChannel(newChannel);
    return setActiveChannel(newChannel);
  } catch (err) {
    console.error('Error opening DM channel:', err);
  }
};

const SearchResult = ({ channel, focusedId, type, setChannel, setToggleContainer }) => {
  const { client, setActiveChannel } = useChatContext();

  if (type === 'channel') {
    return (
      <div
        onClick={() => {
          if (setChannel) setChannel(channel);
          setActiveChannel(channel);
          if (setToggleContainer) {
            setToggleContainer((prevState) => !prevState);
          }
          document.body.classList.remove('mobile-menu-open');
        }}
        className={focusedId === channel.id ? 'channel-search__result-container__focused' : 'channel-search__result-container'}
      >
        <div className='result-hashtag'>#</div>
        <p className='channel-search__result-text'>{channel?.data?.name || channel?.id}</p>
      </div>
    );
  }

  return (
    <div
      onClick={async () => {
        await channelByUser({ client, setActiveChannel, channel, setChannel });
        if (setToggleContainer) {
          setToggleContainer((prevState) => !prevState);
        }
        document.body.classList.remove('mobile-menu-open');
      }}
      className={focusedId === channel.id ? 'channel-search__result-container__focused' : 'channel-search__result-container'}
    >
      <div className='channel-search__result-user'>
        <Avatar image={channel.image || undefined} name={channel.fullName || channel.name} size={28} />
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {channel.fullName || channel.name}
          </span>
          {channel.name && channel.name !== channel.fullName && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>@{channel.name}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const ResultsDropdown = ({ teamChannels = [], directChannels = [], focusedId, loading, setChannel, setToggleContainer }) => {
  return (
    <div className='channel-search__results'>
      <p className='channel-search__results-header'>Channels</p>
      {loading && !teamChannels.length && (
        <p className='channel-search__results-header'>
          <i>Loading...</i>
        </p>
      )}
      {!loading && !teamChannels.length ? (
        <p className='channel-search__results-header'>
          <i>No channels found</i>
        </p>
      ) : (
        teamChannels.map((channel, i) => (
          <SearchResult
            channel={channel}
            focusedId={focusedId}
            key={channel.id || i}
            setChannel={setChannel}
            type='channel'
            setToggleContainer={setToggleContainer}
          />
        ))
      )}

      <p className='channel-search__results-header'>Users</p>
      {loading && !directChannels.length && (
        <p className='channel-search__results-header'>
          <i>Loading...</i>
        </p>
      )}
      {!loading && !directChannels.length ? (
        <p className='channel-search__results-header'>
          <i>No direct messages found</i>
        </p>
      ) : (
        directChannels.map((channel, i) => (
          <SearchResult
            channel={channel}
            focusedId={focusedId}
            key={channel.id || i}
            setChannel={setChannel}
            type='user'
            setToggleContainer={setToggleContainer}
          />
        ))
      )}
    </div>
  );
};

export default ResultsDropdown;