import React, { useState, useEffect } from 'react';
import { StreamChat } from 'stream-chat'; 
import { Chat } from 'stream-chat-react';
import Cookies from 'universal-cookie';
import { Analytics } from "@vercel/analytics/react";

import { ChannelListContainer, ChannelContainer, Auth } from './components';

import './App.css';
import 'stream-chat-react/dist/css/v2/index.css';

const cookies = new Cookies();

const apiKey = process.env.REACT_APP_STREAM_API_KEY;

const client = StreamChat.getInstance(apiKey);

const App = () => {
  const [authToken, setAuthToken] = useState(cookies.get('token'));
  const [createType, setCreateType] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (authToken) {
      client.connectUser({
        id: cookies.get('userID'),
        name: cookies.get('username'),
        fullName: cookies.get('fullName'),
      }, authToken);
    } else {
      // Ensure the client is disconnected when there's no token
      if (client.userID) {
        client.disconnectUser();
      }
    }
  }, [authToken]);


  if(!authToken) return <Auth setAuthToken={setAuthToken} />

  return (
    <div className="app__wrapper">
      <Chat client={client} theme="team light">
        <ChannelListContainer 
          isCreating={isCreating}
          setIsCreating={setIsCreating}
          setCreateType={setCreateType}
          setIsEditing={setIsEditing}
          setAuthToken={setAuthToken}
        />
        <ChannelContainer
          isCreating={isCreating}
          setIsCreating={setIsCreating}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          createType={createType}
        />
      </Chat>
    </div>
  );
}

export default App;
