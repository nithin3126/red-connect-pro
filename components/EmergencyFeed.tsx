
import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ChevronRight,
  Database,
  Loader2,
  Stethoscope,
  Building2,
  Smartphone,
  Volume2,
  ShieldCheck,
  Radio,
  Zap,
  Activity,
  Target,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { EmergencyRequest, AuthenticatedUser } from '../services/types';
import { GeoCoords } from '../services/locationService';
import { fetchLiveAvailability, ERaktKoshStatus } from '../services/eraktkoshService';
import { speakEmergencyAlert } from '../services/geminiService';

interface FeedProps {
  requests: EmergencyRequest[];
  onMatch: (req: EmergencyRequest) => void;
  dengueMode: boolean;
  userLocation: GeoCoords | null;
  user?: AuthenticatedUser | null;
}

const EmergencyFeed: React.FC<FeedProps> = ({ requests, onMatch, user }) => {
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [checkingInventory, setCheckingInventory] = useState<string | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<Record<string, ERaktKoshStatus>>({});
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);

  const stats = {
    total: requests.length,
    critical: requests.filter(r => r.urgency === 'Critical').length,
    fulfilled: requests.filter(r => r.status === 'Received' || r.status === 'Fulfilled').length,
    activeRelays: requests.filter(r => r.status === 'Dispatched').length
  };

  const handleSpeech = async (req: EmergencyRequest) => {
    if (isSpeaking) return;
    setIsSpeaking(req.id);
    const briefingText = `Priority alert for ${req.bloodType} at ${req.hospital}. Urgent requirement: ${req.unitsNeeded} units. Status: ${req.status || req.urgency}. Verification ID: ${req.id}.`;
    const audioData = await speakEmergencyAlert(briefingText);
    
    if (audioData) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const dataInt16 = new Int16Array(audioData.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channel[i] = dataInt16[i] / 32768.0;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(null);
      source.start();
    } else {
      setIsSpeaking(null);
    }
  };

  const handleInventoryCheck = async (requestId: string, hospitalName: string) => {
    setCheckingInventory(requestId);
    try {
      const status = await fetchLiveAvailability(hospitalName);
      setInventoryStatus(prev => ({ ...prev, [requestId]: status }));
    } finally {
      setCheckingInventory(null);
    }
  };

  const filtered = requests.filter(r => 
    r.patientName.toLowerCase().includes(filter.toLowerCase()) || 
    r.hospital.toLowerCase().includes(filter.toLowerCase()) ||
    r.bloodType.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      {/* COMMAND CENTER HEADER */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-900/40">
                <Globe className="w-12 h-12 animate-spin-slow text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight uppercase">Strategic Network Feed</h2>
                <div className="flex items-center gap-3 mt-2 text-emerald-400">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em]">State Command Relay: Optimized for T.N.</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               {[
                 { label: 'Total Cases', value: stats.total, icon: Database, color: 'text-slate-400' },
                 { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'text-red-500' },
                 { label: 'In Transit', value: stats.activeRelays, icon: Radio, color: 'text-amber-500' },
                 { label: 'Fulfilled', value: stats.fulfilled, icon: CheckCircle2, color: 'text-emerald-500' }
               ].map(stat => (
                 <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[120px]">
                    <stat.icon className={`w-4 h-4 mb-2 ${stat.color}`} />
                    <p className="text-2xl font-black">{stat.value}</p>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                 </div>
               ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Activity className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search patient, hospital, or blood type..."
                className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-600/20 transition-all font-bold text-sm"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
              <button onClick={() => setViewMode('list')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>Grid View</button>
              <button onClick={() => setViewMode('map')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'map' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>Sectors</button>
            </div>
          </div>
        </div>
        <BarChart3 className="absolute -bottom-10 -left-10 w-64 h-64 text-white/5 -rotate-12 pointer-events-none" />
      </div>

      {/* FEED GRID */}
      <div className="grid gap-8">
        {filtered.map(req => {
          const isFulfilled = req.status === 'Received' || req.status === 'Fulfilled';
          const isCritical = req.urgency === 'Critical';
          
          return (
            <div key={req.id} className={`group relative bg-white rounded-[3rem] border transition-all hover:shadow-2xl overflow-hidden ${isFulfilled ? 'border-emerald-100 bg-emerald-50/10' : isCritical ? 'border-red-200 ring-4 ring-red-500/5' : 'border-slate-100 shadow-xl'}`}>
              <div className="absolute top-0 right-0 flex gap-1 z-10">
                 {!isFulfilled && (
                    <button 
                      onClick={() => handleSpeech(req)}
                      className={`px-8 py-4 rounded-bl-[2rem] transition-all flex items-center gap-3 ${isSpeaking === req.id ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-red-600 hover:text-white'}`}
                    >
                      <Volume2 className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Audio SITREP</span>
                    </button>
                 )}
                 {isFulfilled && (
                    <div className="bg-emerald-600 text-white px-8 py-4 rounded-bl-[2rem] flex items-center gap-3 shadow-lg">
                       <ShieldCheck className="w-5 h-5" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]">Relay Verified</span>
                    </div>
                 )}
              </div>

              <div className="p-10">
                <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-8">
                  <div className="flex gap-8">
                    <div className={`w-24 h-24 rounded-[2rem] flex flex-col items-center justify-center font-black text-4xl border-4 transition-all ${isFulfilled ? 'bg-white text-emerald-600 border-emerald-100' : req.isPlateletRequest ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-500'}`}>
                      {req.bloodType}
                      <span className="text-[9px] font-black opacity-40 uppercase">{req.isPlateletRequest ? 'PLATELETS' : 'WHOLE BLOOD'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-black text-3xl tracking-tight ${isFulfilled ? 'text-emerald-900' : 'text-slate-800'}`}>{req.patientName}</h3>
                        {isCritical && !isFulfilled && <div className="px-3 py-1 bg-red-600 text-white text-[9px] font-black rounded-full animate-pulse uppercase">Critical</div>}
                      </div>
                      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 w-fit">
                        <Building2 className={`w-4 h-4 ${isFulfilled ? 'text-emerald-500' : 'text-red-500'}`} />
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{req.hospital}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-0">
                     <p className={`text-6xl font-black ${isFulfilled ? 'text-emerald-600' : 'text-slate-900'}`}>{req.unitsNeeded}</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Units Required</p>
                  </div>
                </div>

                {!isFulfilled && (
                  <div className={`p-8 rounded-[2.5rem] border-2 mb-8 transition-all ${inventoryStatus[req.id] ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-900 border-slate-800 text-white shadow-2xl shadow-slate-200'}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                          <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${inventoryStatus[req.id] ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white/10 text-white'}`}>
                              {checkingInventory === req.id ? <Loader2 className="w-8 h-8 animate-spin" /> : <Target className="w-8 h-8" />}
                          </div>
                          <div>
                              <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1.5 ${inventoryStatus[req.id] ? 'text-emerald-700' : 'text-slate-400'}`}>e-RaktKosh Command Proxy</p>
                              <h4 className={`text-lg font-black uppercase tracking-tight ${inventoryStatus[req.id] ? 'text-emerald-900' : 'text-white'}`}>
                                {inventoryStatus[req.id] ? `Verified Supply Node: ${inventoryStatus[req.id].region}` : 'Query state supply chain...'}
                              </h4>
                          </div>
                        </div>
                        {!inventoryStatus[req.id] && (
                          <button 
                            onClick={() => handleInventoryCheck(req.id, req.hospital)}
                            className="w-full md:w-auto px-10 py-4 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-700 shadow-2xl transition-all active:scale-95"
                          >
                            Initiate Sync
                          </button>
                        )}
                    </div>
                  </div>
                )}

                {isFulfilled ? (
                  <div className="bg-emerald-600 text-white p-6 rounded-[2rem] flex items-center justify-between shadow-xl shadow-emerald-100">
                     <div className="flex items-center gap-4">
                        <ShieldCheck className="w-7 h-7" />
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-tight">Units Successfully Delivered</h4>
                          <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-0.5">Integration Date: {new Date().toLocaleDateString()}</p>
                        </div>
                     </div>
                     <p className="text-[10px] font-black opacity-50 font-mono tracking-widest">RELAY-ID: {req.id}</p>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <button onClick={() => onMatch(req)} className="flex-1 bg-slate-900 text-white py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] hover:bg-red-600 transition-all flex items-center justify-center gap-4 shadow-xl shadow-slate-200">
                      <Zap className="w-5 h-5" /> Launch Tactical Matching
                    </button>
                    <a href={`tel:${req.contact}`} className="px-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-[1.5rem] hover:bg-slate-900 hover:text-white transition-all border border-slate-200">
                      <Smartphone className="w-6 h-6" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmergencyFeed;
