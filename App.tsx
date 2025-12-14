import React, { useState } from 'react';
import { Lobby } from './components/Lobby';
import { Classroom } from './components/Classroom';

const App: React.FC = () => {
  const [inCall, setInCall] = useState(false);
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  
  const apiKey = process.env.API_KEY || ''; 

  const handleJoin = (name: string, id: string, admin: boolean, aiEnabled: boolean) => {
    setUserName(name);
    setRoomId(id);
    setIsAdmin(admin);
    setIsAIEnabled(aiEnabled);
    setInCall(true);
  };

  const handleLeave = () => {
    setInCall(false);
    setUserName('');
    setRoomId('');
    setIsAdmin(false);
    setIsAIEnabled(true);
  };

  if (!apiKey) {
      return (
          <div className="h-screen flex items-center justify-center bg-[#202124] text-white">
              <div className="text-center p-8 border border-red-500 rounded-lg max-w-md bg-[#303134]">
                  <h2 className="text-xl font-bold mb-2 text-red-400">Configuration Error</h2>
                  <p className="text-gray-300">API_KEY environment variable is missing.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="antialiased h-full">
      {!inCall ? (
        <Lobby onJoin={handleJoin} />
      ) : (
        <Classroom 
            apiKey={apiKey} 
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