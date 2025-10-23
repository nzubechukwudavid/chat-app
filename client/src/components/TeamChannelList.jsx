import React from 'react'

import { AddChannel } from "../assets";

const TeamChannelList = ({ children, error = false, loading, type, isCreating, setIsCreating, setCreateType, setIsEditing, setToggleContainer }) => {
    return (
        <div className='team-channel-list'>
            <div className='team-channel-list__header'>
                <p className='team-channel-list__header__title'>
                    {type === 'team' ? 'Channels' : 'Direct Messages'}
                </p>
                <AddChannel
                    isCreating={isCreating}
                    setIsCreating={setIsCreating}
                    setCreateType={setCreateType}
                    setIsEditing={setIsEditing}
                    type={type === 'team' ? 'team' : 'messaging'}
                    setToggleContainer={setToggleContainer}
                />
            </div>
            {error ? (
                <div className='team-channel-list__message'>
                    Connection error, please wait a moment and try again.
                </div>
            ) : loading ? (
                <div className='team-channel-list__message loading'>
                    {type === 'team' ? 'Channels' : 'Messages'} loading...
                </div>
            ) : (
                children
            )}
        </div>
    )
}

export default TeamChannelList
