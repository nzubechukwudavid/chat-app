import { React, useState } from 'react';
import { StreamChat } from 'stream-chat';
import { Chat } from 'stream-chat-react';
import Cookies from 'universal-cookie';
import { Analytics } from "@vercel/analytics/react";

import { ChannelListContainer, ChannelContainer, Auth } from './components';

import './App.css';
import 'stream-chat-react/dist/css/v2/index.css';

const cookies = new Cookies();

const apiKey = 'spz529r7wxmx';
const authToken = cookies.get('token');

const client = StreamChat.getInstance(apiKey);

if (authToken) {
  client.connectUser({
    name: cookies.get('username'),
    id: cookies.get('userID'),
    fullName: cookies.get('fullName'),
    phoneNumber: cookies.get('phoneNumber'),
    avatarURL: cookies.get('avatarURL'),
    hashedPassword: cookies.get('hashedPassword')
  }, authToken)
}

const App = () => {
  const [createType, setCreateType] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);


  if(!authToken) return <Auth />

  return (
    <div className="app__wrapper">
      <Chat client={client} theme="team light">
        <ChannelListContainer 
          isCreating={isCreating}
          setIsCreating={setIsCreating}
          setCreateType={setCreateType}
          setIsEditing={setIsEditing}
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
