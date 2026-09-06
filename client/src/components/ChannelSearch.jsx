import React, { useState, useEffect } from 'react';
import { useChatContext } from 'stream-chat-react';
import { ResultsDropdown } from './';
import { SearchIcon } from '../assets';

const ChannelSearch = ({ setToggleContainer }) => {
  const { client, setActiveChannel } = useChatContext();
  const [teamChannels, setTeamChannels] = useState([]);
  const [directChannels, setDirectChannels] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setTeamChannels([]);
      setDirectChannels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const channelPromise = client.queryChannels({
          type: 'team',
          members: { $in: [client.userID] },
          name: { $autocomplete: query.trim() },
        });

        const userPromise = client.queryUsers({
          id: { $ne: client.userID },
          name: { $autocomplete: query.trim() },
        });

        const [channels, userResponse] = await Promise.all([channelPromise, userPromise]);

        setTeamChannels(channels || []);
        setDirectChannels(userResponse?.users || []);
      } catch (error) {
        console.error('Channel search error:', error);
        setTeamChannels([]);
        setDirectChannels([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, client]);

  const onSearch = (event) => {
    setQuery(event.target.value);
  };

  const setChannel = (channel) => {
    setQuery('');
    setActiveChannel(channel);
  };

  return (
    <div className='channel-search__container'>
      <div className='channel-search__input__wrapper'>
        <div className='channel-search__input__icon'>
          <SearchIcon />
        </div>
        <input
          className='channel-search__input__text'
          placeholder='Search channels & users...'
          type='text'
          value={query}
          onChange={onSearch}
        />
      </div>
      {query.trim() && (
        <ResultsDropdown
          teamChannels={teamChannels}
          directChannels={directChannels}
          loading={loading}
          setChannel={setChannel}
          setToggleContainer={setToggleContainer}
        />
      )}
    </div>
  );
};

export default ChannelSearch;
