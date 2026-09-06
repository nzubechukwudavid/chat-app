import React, { useState, useEffect } from 'react';
import { StreamChat } from 'stream-chat'; 
import { Chat } from 'stream-chat-react';
import Cookies from 'universal-cookie';
import { Analytics } from "@vercel/analytics/react";

import { ChannelListContainer, ChannelContainer, Auth } from './components';
import { STREAM_API_KEY } from './config'; // Import STREAM_API_KEY from config.js

import 'stream-chat-react/dist/css/v2/index.css';
import './App.css';

const cookies = new Cookies();

const client = StreamChat.getInstance(STREAM_API_KEY);

const App = () => {
  const [authToken, setAuthToken] = useState(cookies.get('token'));
  const [createType, setCreateType] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      if (!authToken) {
        if (client.userID) {
          await client.disconnectUser();
        }
        if (isMounted) setLoading(false);
        return;
      }

      try {
        await client.connectUser(
          {
            id: cookies.get('userID'),
            name: cookies.get('username'),
            fullName: cookies.get('fullName'),
            image: cookies.get('avatarURL') || undefined,
          },
          authToken
        );
      } catch (err) {
        console.error('Failed to connect user to Stream Chat:', err);
        const cookiesToRemove = ['token', 'username', 'userID', 'fullName', 'phoneNumber', 'avatarURL', 'hashedPassword'];
        cookiesToRemove.forEach((c) => cookies.remove(c, { path: '/' }));
        if (isMounted) setAuthToken(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    connect();

    return () => {
      isMounted = false;
    };
  }, [authToken]);

  if (loading) return null; // Or a loading spinner

  if(!authToken) return <Auth setAuthToken={setAuthToken} />
  
  return (
    <div className="app__wrapper">
      <div 
        className="mobile-drawer-backdrop" 
        onClick={() => document.body.classList.remove('mobile-menu-open')}
        aria-hidden="true"
      />
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
      <Analytics />
    </div>
  );
}

export default App;
