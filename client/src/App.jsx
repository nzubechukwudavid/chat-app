import React from 'react';
import { StreamChat } from 'stream-chat';
import { Chat } from 'stream-chat-react';
import Cookies from 'universal-cookie';

import { ChannelListContainer, ChannelContainer, Auth } from './components';

import './App.css';

const cookies = new Cookies();

const apiKey = 'spz529r7wxmx';
const authToken = cookies.get('token');

const client = StreamChat.getInstance(apiKey);

if (authToken) {
  client.connectUser({
    token: cookies.get('token'),
    username: cookies.get('username'),
    userID: cookies.get('userID'),
    fullName: cookies.get('fullName'),
    phoneNumber: cookies.get('phoneNumber'),
    avatarUR: cookies.get('avatarURL'),
    hashedPassword: cookies.get('hashedPassword')
  })
}

const App = () => {
  if(!authToken) return <Auth />

  return (
    <div className="app__wrapper">
      <Chat client={client} theme="team light">
        <ChannelListContainer 
        
        />
        <ChannelContainer

        />
      </Chat>
    </div>
  );
}

export default App;
