import React, { useState, useCallback } from 'react';
import { ChannelList, useChatContext } from 'stream-chat-react';
import Cookies from 'universal-cookie';

import { ChannelSearch, TeamChannelList, TeamChannelPreview } from './';
import RailwayIcon from '../assets/railway.png';
import LogoutIcon from '../assets/logout.png';


const cookies = new Cookies();

const SideBar = ({ logout }) => (
  <div className="channel-list__sidebar">
    <div className="channel-list__sidebar__icon1">
      <div className='icon1__inner'>
        <img src={RailwayIcon} alt="Rail Hub" width = "30" />
      </div>
    </div>
    <div className="channel-list__sidebar__icon2">
      <div className='icon1__inner' onClick={logout}>
        <img src={LogoutIcon} alt="Logout" width = "30" />
      </div>
    </div>
  </div>
)

const CompanyHeader = () => (
  <div className="channel-list__header">
      <p className="channel-list__header__text">Rail Hub</p>
  </div>
)

const customChannelTeamFilter = (channels) => {
  return channels.filter((channel) => channel.type === 'team');
}

const customChannelMessagingFilter = (channels) => {
  return channels.filter((channel) => channel.type === 'messaging');
}

const EmptyState = ({ type }) => (
  <div className="team-channel-list__message">
    No {type === 'team' ? 'channels' : 'messages'} found.
  </div>
);

const ChannelListContent = ({ isCreating, setIsCreating, setCreateType, setIsEditing, setToggleContainer, setAuthToken, client }) => {

  const logout = useCallback(() => {
    const cookiesToRemove = ['token', 'username', 'userID', 'fullName', 'phoneNumber', 'avatarURL', 'hashedPassword'];
    cookiesToRemove.forEach((cookie) => cookies.remove(cookie));

    if (client) {
      client.disconnectUser();
    }

    setAuthToken(null);
  }, [client, setAuthToken]);

  const filters = { members: { $in: [client.userID] } };

  return (
    <>
        <SideBar logout={logout}    />
        <div className="channel-list__list__wrapper">
          <CompanyHeader />
          <ChannelSearch setToggleContainer={setToggleContainer}/> 
          <ChannelList 
            filters={filters}
            channelRenderFilterFn={customChannelTeamFilter}
            EmptyStateIndicator={() => <EmptyState type="team" />}
            List={(listProps) => (
              <TeamChannelList
                {...listProps}
                type='team'
                isCreating = {isCreating}
                setIsCreating = {setIsCreating}
                setCreateType = {setCreateType}
                setIsEditing = {setIsEditing}
                setToggleContainer={setToggleContainer}
              />
            )}
            Preview={(previewProps) => (
              <TeamChannelPreview
                {...previewProps}
                setIsCreating = {setIsCreating}
                setIsEditing = {setIsEditing}
                setToggleContainer={setToggleContainer}
                type='team'
              />
            )}
          />
          <ChannelList 
            filters={filters}
            channelRenderFilterFn={customChannelMessagingFilter}
            EmptyStateIndicator={() => <EmptyState type="messaging" />}
            List={(listProps) => (
              <TeamChannelList
                {...listProps}
                type='messaging'
                isCreating = {isCreating}
                setIsCreating = {setIsCreating}
                setCreateType = {setCreateType}
                setIsEditing = {setIsEditing}
                setToggleContainer={setToggleContainer}
              />
            )}
            Preview={(previewProps) => (
              <TeamChannelPreview
                {...previewProps}
                setIsCreating = {setIsCreating}
                setIsEditing = {setIsEditing}
                setToggleContainer={setToggleContainer}
                type='messaging'
              />
            )}
          />
        </div>
    </>
  );
}

const ChannelListContainer = ({ isCreating, setIsCreating, setCreateType, setIsEditing, setAuthToken }) => {
  const [toggleContainer, setToggleContainer] = useState(false);
  const { client } = useChatContext();

  if (!client || !client.userID) return null; // Or a loading spinner/placeholder

  return (
    <>
      <div className="channel-list__container">
        <ChannelListContent
          client={client}
          setIsCreating={setIsCreating}
          setCreateType={setCreateType}
          setIsEditing={setIsEditing}
          setAuthToken={setAuthToken}
        />
      </div>

      <div className='channel-list__container-responsive'
        style = {{ left: toggleContainer ? '0%' : '-89%', backgroundColor: '#00733E'}}
      >
        <div className="channel-list__container-toggle" onClick = {() => setToggleContainer((prevToggleContainer) => !prevToggleContainer)}>
        </div>
        <ChannelListContent
          setIsCreating={setIsCreating}
          client={client}
          setCreateType={setCreateType}
          setIsEditing={setIsEditing}
          setToggleContainer={setToggleContainer}
          setAuthToken={setAuthToken}
        />
      </div>
    </>
  )

}
export default ChannelListContainer;