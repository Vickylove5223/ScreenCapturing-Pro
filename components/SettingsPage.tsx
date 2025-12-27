/** Fix: Added DOM library reference to resolve missing browser global properties like confirm, localStorage, and window.location */
/// <reference lib="dom" />

import React, { useState } from 'react';
import { Trash2, Shield, Keyboard, Info, Youtube, Cloud, Link2, ExternalLink, CheckCircle, Database, Zap, Cpu } from 'lucide-react';
import { Button } from './Button';

export const SettingsPage: React.FC = () => {
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isYoutubeConnected, setIsYoutubeConnected] = useState(false);

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 mt-8 px-4">
      
      <div className="space-y-2">
        <h2 className="text-6xl font-[900] text-[#344E41] tracking-tighter leading-none">System <br/> Preferences</h2>
        <p className="text-[#588157] text-lg font-medium">Manage your engine and integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        
        <aside className="space-y-2">
           <button className="w-full text-left px-6 py-4 bg-[#344E41] text-[#DAD7CD] rounded-2xl font-bold text-sm shadow-xl shadow-[#344E41]/20">General</button>
           <button className="w-full text-left px-6 py-4 text-[#3A5A40] hover:text-[#344E41] font-bold text-sm transition-all">Integrations</button>
           <button className="w-full text-left px-6 py-4 text-[#3A5A40] hover:text-[#344E41] font-bold text-sm transition-all">Privacy</button>
           <button className="w-full text-left px-6 py-4 text-[#3A5A40] hover:text-[#344E41] font-bold text-sm transition-all">Shortcuts</button>
        </aside>

        <div className="md:col-span-3 space-y-12">
          
          {/* Section 1 */}
          <section className="bg-[#3A5A40] border border-[#588157] rounded-[2.5rem] p-10 card-shadow space-y-10">
            <div className="space-y-1">
               <h3 className="text-2xl font-[900] text-[#DAD7CD] tracking-tight">Cloud Connect</h3>
               <p className="text-[#A3B18A] text-sm font-medium">Sync your vibes to the cloud automatically.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Drive */}
              <div className="p-6 bg-[#344E41] rounded-3xl border border-[#588157] space-y-6">
                <div className="flex items-center justify-between">
                   <div className="w-12 h-12 bg-[#3A5A40] rounded-2xl flex items-center justify-center shadow-sm border border-[#588157]"><Cloud size={24} className="text-[#A3B18A]" /></div>
                   {isDriveConnected && <CheckCircle size={16} className="text-emerald-500" />}
                </div>
                <div>
                  <p className="text-[#DAD7CD] font-black text-xs uppercase tracking-widest">Google Drive</p>
                  <p className="text-[#A3B18A] text-xs font-medium">Auto-upload exports</p>
                </div>
                <Button 
                  variant={isDriveConnected ? "secondary" : "primary"}
                  fullWidth
                  className="!py-3 !text-xs !rounded-xl"
                  onClick={() => setIsDriveConnected(!isDriveConnected)}
                >
                  {isDriveConnected ? "Disconnect" : "Link Account"}
                </Button>
              </div>

              {/* YouTube */}
              <div className="p-6 bg-[#344E41] rounded-3xl border border-[#588157] space-y-6">
                <div className="flex items-center justify-between">
                   <div className="w-12 h-12 bg-[#3A5A40] rounded-2xl flex items-center justify-center shadow-sm border border-[#588157]"><Youtube size={24} className="text-[#A3B18A]" /></div>
                   {isYoutubeConnected && <CheckCircle size={16} className="text-emerald-500" />}
                </div>
                <div>
                  <p className="text-[#DAD7CD] font-black text-xs uppercase tracking-widest">YouTube</p>
                  <p className="text-[#A3B18A] text-xs font-medium">Direct publish vibe</p>
                </div>
                <Button 
                  variant={isYoutubeConnected ? "secondary" : "primary"}
                  fullWidth
                  className="!py-3 !text-xs !rounded-xl"
                  onClick={() => setIsYoutubeConnected(!isYoutubeConnected)}
                >
                  {isYoutubeConnected ? "Disconnect" : "Link Account"}
                </Button>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-[#3A5A40] border border-[#588157] rounded-[2.5rem] p-10 card-shadow space-y-8">
            <h3 className="text-2xl font-[900] text-[#DAD7CD] tracking-tight">Security & Engine</h3>
            
            <div className="space-y-4">
               <div className="p-6 bg-[#344E41] rounded-3xl border border-[#588157] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-[#3A5A40] rounded-xl flex items-center justify-center text-[#A3B18A] border border-[#588157]">
                        <Database size={20} />
                     </div>
                     <div>
                        <p className="text-[#DAD7CD] font-bold">Local Data Buffer</p>
                        <p className="text-[#A3B18A] text-xs">Clear all library records</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => {
                      if(confirm("Permanently clear all library items?")) {
                          localStorage.removeItem('vibe_recordings_meta');
                          window.location.reload();
                      }
                    }}
                    className="p-4 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
               </div>

               <div className="p-8 bg-[#344E41] rounded-[2.5rem] border border-[#588157]">
                  <div className="flex items-start gap-4">
                     <Shield className="text-[#A3B18A] mt-1 shrink-0" size={24} />
                     <div>
                        <h4 className="text-[#DAD7CD] font-[900] mb-2 uppercase tracking-tight">Zero-Server Guarantee</h4>
                        <p className="text-[#A3B18A] text-sm leading-snug font-medium">
                          Vibe Recorder is serverless. Your pixels never touch our hardware. Capturing, processing, and editing happen 100% on your device using WebAssembly technology.
                        </p>
                     </div>
                  </div>
               </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};