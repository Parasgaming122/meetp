import React, { useState } from 'react';
import { Lobby } from './components/Lobby';
import { Classroom } from './components/Classroom';

const App: React.FC = () => {
  const [inCall, setInCall] = useState(false);
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  
  // Handle API key from env or user input
  const envApiKey = process.env.API_KEY || '';
  const [userApiKey, setUserApiKey] = useState('');
  const activeApiKey = envApiKey || userApiKey;

  const handleJoin = (name: string, id: string, admin: boolean, aiEnabled: boolean, apiKey?: string) => {
    setUserName(name);
    setRoomId(id);
    setIsAdmin(admin);
    setIsAIEnabled(aiEnabled);
    if (apiKey) setUserApiKey(apiKey);
    setInCall(true);
  };

  const handleLeave = () => {
    setInCall(false);
    setUserName('');
    setRoomId('');
    setIsAdmin(false);
    setIsAIEnabled(true);
  };

  return (
    <div className="antialiased h-full">
      {!inCall ? (
        <Lobby 
            onJoin={handleJoin} 
            needsApiKey={!envApiKey} 
            savedApiKey={userApiKey}
        />
      ) : (
        <Classroom 
            apiKey={activeApiKey} 
            userName={userName}
            roomId={roomId}
            isAdmin={isAdmin} 
            initialAIEnabled={isAIEnabled}
            onLeave={handleLeave} 
        />
      )}
    </div>
  );
};

export default App;