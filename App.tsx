import React, { useState, useEffect } from 'react';
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
  
  // URL Routing: Check for room ID in URL on mount
  const [initialRoomId, setInitialRoomId] = useState('');

  useEffect(() => {
    const path = window.location.pathname.substring(1); // Remove leading slash
    if (path && path.split('-').length >= 3) {
      setInitialRoomId(path);
    }
  }, []);

  const handleJoin = (name: string, id: string, admin: boolean, aiEnabled: boolean, apiKey?: string) => {
    setUserName(name);
    setRoomId(id);
    setIsAdmin(admin);
    setIsAIEnabled(aiEnabled);
    if (apiKey) setUserApiKey(apiKey);
    
    // Update URL
    window.history.pushState({}, '', `/${id}`);
    
    setInCall(true);
  };

  const handleLeave = () => {
    setInCall(false);
    setUserName('');
    setRoomId('');
    setIsAdmin(false);
    setIsAIEnabled(true);
    
    // Reset URL
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="antialiased h-full">
      {!inCall ? (
        <Lobby 
            onJoin={handleJoin} 
            needsApiKey={!envApiKey} 
            savedApiKey={userApiKey}
            initialRoomId={initialRoomId}
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