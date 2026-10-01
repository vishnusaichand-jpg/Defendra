
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Icons } from '../constants';
import { X } from 'lucide-react';
import { dbService, AuditLog } from '../services/dbService';

interface UserProfileProps {
  user: User;
  onClose: () => void;
  onManageSubscription: () => void;
  isLight?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onClose, onManageSubscription, isLight }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const data = await dbService.getAuditLogs(user.id);
      setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, [user.id]);

  const registrationDate = new Date(user.createdDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
      <div className="w-full max-w-lg glass-card border-emerald-500/20 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80 shrink-0"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 rounded-full hover:bg-slate-800 text-slate-500 transition-all z-20"
        >
          <X className="w-5 h-5" strokeWidth={3} />
        </button>

        <div className="p-10 space-y-10">
          {/* Header Section */}
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-950 border-2 border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner group">
              <div className="scale-[2.5] transition-transform duration-500 group-hover:scale-[2.8]">
                <Icons.User />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold font-mono tracking-tight text-white truncate">@{user.username}</h2>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] font-mono text-emerald-400">
                  Node Status: Verified
                </p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-slate-950/40 border border-slate-800/60">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-500">Protocol ID</p>
              <p className="text-sm font-mono font-bold text-white">{user.id}</p>
            </div>
            <div className="p-5 rounded-3xl bg-slate-950/40 border border-slate-800/60">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-500">Security Clearance</p>
              <p className="text-sm font-mono font-bold text-emerald-400">{user.plan}</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-950/40 border border-slate-800/60 space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-500 font-mono">Registered Terminal</p>
              <p className="text-sm text-slate-200 font-mono">{user.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-500 font-mono">Commissioned On</p>
              <p className="text-sm text-slate-200 font-mono">{registrationDate}</p>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest font-mono flex items-center gap-3 text-emerald-500/80">
              <Icons.Shield /> Security Audit Trail
            </h3>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-950/20 p-4 max-h-[160px] overflow-y-auto scrollbar-hide space-y-3">
              {loading ? (
                <div className="py-6 text-center text-[11px] font-mono text-slate-600 animate-pulse uppercase tracking-widest">Querying Vault Logs...</div>
              ) : logs.length === 0 ? (
                <div className="py-6 text-center text-[11px] font-mono text-slate-600 uppercase tracking-widest">No access records detected</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="p-3 border-b border-slate-800/30 last:border-0 group transition-colors hover:bg-emerald-500/[0.02]">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">{log.event}</span>
                      <span className="text-[9px] text-slate-600 font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                      {log.details}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={onManageSubscription}
            className="w-full py-5 rounded-[2rem] font-bold transition-all text-[11px] tracking-[0.3em] uppercase flex items-center justify-center gap-3 shadow-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 shadow-emerald-500/10"
          >
            <Icons.Zap />
            Elevate Security Clearance
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
