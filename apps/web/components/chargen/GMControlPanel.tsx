'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, X, Shield, Lock, Unlock, Users, Download, Ban } from 'lucide-react';
import { useGMControls, ALL_CAREERS } from '../../lib/chargen/useGMControls';
import { useAllCharacters } from '../../lib/chargen/hooks';

interface GMControlPanelProps {
  currentUserId: string;
}

export function GMControlPanel({ currentUserId }: GMControlPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { isGM, settings, pendingRequests, actions } = useGMControls(currentUserId);
  const allCharacters = useAllCharacters();

  if (!isGM) return null;

  const getCharacterName = (charId: string) => {
    const char = allCharacters.find(c => c.id === charId);
    return char?.name || 'Unknown Character';
  };

  if (!settings) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 bg-zinc-900 border-b border-zinc-800 hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2 text-zinc-100 font-semibold">
          <Shield className="w-4 h-4 text-blue-500" />
          <span>GM CONTROLS</span>
          {pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
      </button>

      {isOpen && (
        <div className="overflow-y-auto p-4 space-y-6">
          
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Session Settings</h3>
            
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm text-zinc-300 cursor-pointer hover:text-zinc-100">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Require GM Approval</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.requireGMApproval}
                  onChange={(e) => actions.updateSettings({ requireGMApproval: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between text-sm text-zinc-300 cursor-pointer hover:text-zinc-100">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  <span>Cross-Player Connections</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.allowCrossPlayerConnections}
                  onChange={(e) => actions.updateSettings({ allowCrossPlayerConnections: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between text-sm text-zinc-300 cursor-pointer hover:text-zinc-100">
                <div className="flex items-center gap-2">
                  {settings.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>Lock Session</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.isLocked}
                  onChange={(e) => actions.updateSettings({ isLocked: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Allowed Careers</h3>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CAREERS.map(career => {
                const isAllowed = settings.allowedCareers.length === 0 || settings.allowedCareers.includes(career);
                return (
                  <label 
                    key={career} 
                    className={`
                      flex items-center gap-2 px-2 py-1.5 rounded text-xs border cursor-pointer transition-colors
                      ${isAllowed 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700' 
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:bg-zinc-900'}
                    `}
                  >
                    <input 
                      type="checkbox"
                      checked={isAllowed}
                      onChange={() => actions.toggleCareer(career)}
                      className="hidden"
                    />
                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isAllowed ? 'bg-blue-600 border-blue-600' : 'border-zinc-700'}`}>
                      {isAllowed && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {career}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pending Approvals</h3>
              {pendingRequests.length > 0 && (
                <span className="text-xs text-zinc-500">{pendingRequests.length} waiting</span>
              )}
            </div>
            
            {pendingRequests.length === 0 ? (
              <div className="text-xs text-zinc-600 italic text-center py-4 border border-zinc-900 rounded bg-zinc-900/20">
                No pending requests
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map(req => (
                  <div key={req.id} className="p-2 bg-zinc-900 rounded border border-zinc-800 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-zinc-200">
                        {getCharacterName(req.requesterCharId)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-zinc-400 text-xs mb-3">
                      wants to connect to <span className="text-zinc-300">{req.entity?.name || 'Unknown Entity'}</span> as <span className="text-blue-400">{req.relationship}</span>
                    </div>
                    {req.note && (
                      <div className="text-zinc-500 text-xs italic mb-3 pl-2 border-l-2 border-zinc-800">
                        "{req.note}"
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => actions.approveRequest(req.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 bg-zinc-800 hover:bg-green-900/30 text-zinc-300 hover:text-green-400 rounded text-xs border border-zinc-700 hover:border-green-800 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button 
                        onClick={() => actions.rejectRequest(req.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 bg-zinc-800 hover:bg-red-900/30 text-zinc-300 hover:text-red-400 rounded text-xs border border-zinc-700 hover:border-red-800 transition-colors"
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-800 space-y-2">
            <button 
              onClick={actions.exportAllCharacters}
              className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded text-sm border border-zinc-700 transition-colors"
            >
              <Download className="w-4 h-4" /> Export All Characters
            </button>
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to end the session? This cannot be undone.')) {
                  actions.endSession();
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-500 hover:text-red-400 rounded text-sm border border-red-900/30 hover:border-red-900/50 transition-colors"
            >
              <Ban className="w-4 h-4" /> End Session
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
