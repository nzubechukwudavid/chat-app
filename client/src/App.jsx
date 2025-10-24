import React, { useState, useEffect } from 'react';
import { StreamChat } from 'stream-chat'; 
import { Chat } from 'stream-chat-react';
import Cookies from 'universal-cookie';
import { Analytics } from "@vercel/analytics/react";

import { ChannelListContainer, ChannelContainer, Auth } from './components';
import { STREAM_API_KEY } from './config'; // Import STREAM_API_KEY from config.js

import './App.css';
import 'stream-chat-react/dist/css/v2/index.css';

const cookies = new Cookies();

const client = StreamChat.getInstance(STREAM_API_KEY);

const App = () => {
  const [authToken, setAuthToken] = useState(cookies.get('token'));
  const [createType, setCreateType] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const connect = async () => {
      if (!authToken) {
        setLoading(false);
        return;
      }
    if (authToken) {
      await client.connectUser({
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
      setLoading(false);
    };

    connect();
  }, [authToken]);

  if (loading) return null; // Or a loading spinner

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
