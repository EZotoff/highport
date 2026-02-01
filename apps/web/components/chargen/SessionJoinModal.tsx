'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/chargen/hooks';
import { useParticipants } from '../../lib/chargen/useParticipants';
import { createCharacter } from '../../lib/chargen/state';
import { getYDoc } from '../../lib/ydoc';
import { getOrCreateUser } from '../../lib/identity';
import { Loader2, Users, AlertCircle, Shield } from 'lucide-react';

export default function SessionJoinModal() {
  const router = useRouter();
  const session = useSession();
  const participants = useParticipants();
  
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getOrCreateUser> | null>(null);
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);

  useEffect(() => {
    const user = getOrCreateUser();
    setCurrentUser(user);
    if (user.name && user.name !== 'Anonymous') {
        setPlayerName(user.name);
    }
  }, []);

  useEffect(() => {
    if (session) return;
    const timer = setTimeout(() => setConnectionTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [session]);

  // Check if already joined
  useEffect(() => {
    if (currentUser && participants.length > 0) {
         const myChar = participants.find(p => p.userId === currentUser.userId && !p.isGM)?.character;
         if (myChar) {
             localStorage.setItem('planeshift_active_character', JSON.stringify({
                 characterId: myChar.id,
                 name: myChar.name
             }));
             router.push('/chargen');
         }
    }
  }, [currentUser, participants, router]);

  const handleJoin = async () => {
    if (!playerName.trim()) {
        setError("Please enter your name");
        return;
    }
    
    if (!currentUser) return;

    setIsJoining(true);
    setError(null);

    try {
        const doc = getYDoc();
        
        // Update user name if changed
        const updatedUser = { ...currentUser, name: playerName };
        localStorage.setItem('planeshift_user', JSON.stringify(updatedUser));

        // Create character
        const charId = createCharacter(doc, currentUser.userId, playerName);
        
        // Set active character
        localStorage.setItem('planeshift_active_character', JSON.stringify({
            characterId: charId,
            name: playerName
        }));

        // Redirect
        router.push('/chargen');
    } catch (e) {
        console.error("Failed to join session", e);
        setError("Failed to join session. Please try again.");
        setIsJoining(false);
    }
  };

  if (!session) {
    if (connectionTimedOut) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-zinc-900 border border-red-900/50 rounded-lg p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-zinc-100 mb-2">Session Not Found</h2>
                    <p className="text-zinc-400 mb-6">
                        Could not connect to the session. Please check the link and try again.
                    </p>
                    <button 
                        onClick={() => router.push('/')}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-6 py-2 rounded transition-colors"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-zinc-400">Connecting to session...</p>
        </div>
      </div>
    );
  }

  // Locked or Completed check
  if (session.settings.isLocked || session.status !== 'active') {
      return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-red-900/50 rounded-lg p-8 max-w-md w-full text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-zinc-100 mb-2">Session Unavailable</h2>
                <p className="text-zinc-400 mb-6">
                    {session.status !== 'active' 
                        ? "This session has ended or been abandoned." 
                        : "The GM has locked this session. New players cannot join."}
                </p>
                <button 
                    onClick={() => router.push('/')}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-6 py-2 rounded transition-colors"
                >
                    Return Home
                </button>
            </div>
        </div>
      );
  }

  const gmParticipant = participants.find(p => p.isGM);
  const players = participants.filter(p => !p.isGM);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-950 p-6 border-b border-zinc-800">
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Join Chargen Session
            </h1>
            <div className="mt-2 text-zinc-400 text-sm">
                Joining Campaign <span className="text-zinc-200 font-medium">{session.campaignId}</span>
            </div>
            {gmParticipant && (
                 <div className="mt-1 text-zinc-500 text-xs flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    GM: {gmParticipant.character?.name || "Game Master"}
                 </div>
            )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
            {/* Participants List */}
            <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Current Participants: {players.length}</h3>
                <div className="bg-zinc-950/50 rounded border border-zinc-800/50 p-3 max-h-32 overflow-y-auto space-y-2">
                    {players.length === 0 ? (
                        <p className="text-zinc-600 text-sm italic">No other players yet.</p>
                    ) : (
                        players.map(p => (
                            <div key={p.userId} className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-blue-500/50" />
                                <span className="text-zinc-300">{p.character?.name || "Creating character..."}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Your Name</label>
                    <input 
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                        autoFocus
                    />
                </div>
                
                {error && (
                    <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-900/50">
                        {error}
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-950 p-6 border-t border-zinc-800 flex justify-end gap-3">
            <button 
                onClick={() => router.push('/')}
                className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleJoin}
                disabled={isJoining || !playerName.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded font-medium transition-colors flex items-center gap-2"
            >
                {isJoining && <Loader2 className="w-4 h-4 animate-spin" />}
                Join Session
            </button>
        </div>
      </div>
    </div>
  );
}
