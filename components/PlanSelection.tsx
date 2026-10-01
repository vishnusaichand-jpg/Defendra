
import React from 'react';
import { PLANS } from '../constants';
import { PlanType } from '../types';

interface PlanSelectionProps {
  currentPlan: PlanType;
  onUpgrade: (plan: PlanType) => void;
  onClose: () => void;
  isLight?: boolean;
}

const PlanSelection: React.FC<PlanSelectionProps> = ({ currentPlan, onUpgrade, onClose, isLight }) => {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isLight ? 'bg-slate-900/40 backdrop-blur-md' : 'bg-black/90 backdrop-blur-xl'}`}>
      <div className="w-full max-w-4xl relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className={`absolute -top-12 right-0 flex items-center gap-2 font-mono text-xs tracking-widest ${isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
        >
          <span>CLOSE_TERMINAL</span> [X]
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div 
              key={plan.id}
              className={`${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              } border ${
                plan.id === currentPlan ? (isLight ? 'border-blue-500 scale-105 z-10' : 'border-emerald-500 scale-105 z-10') : 'hover:border-slate-400'
              } p-8 rounded-3xl flex flex-col transition-all shadow-2xl`}
            >
              <div className="mb-6">
                <h3 className={`text-lg font-bold font-mono ${
                  plan.id === currentPlan ? (isLight ? 'text-blue-600' : 'text-emerald-400') : (isLight ? 'text-slate-900' : 'text-slate-100')
                }`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-3xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{plan.price}</span>
                  <span className="text-slate-400 text-xs">/month</span>
                </div>
              </div>

              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className={`text-xs flex items-start gap-2 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    <span className={`${isLight ? 'text-blue-500' : 'text-emerald-500'} mt-0.5`}>▹</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onUpgrade(plan.id as PlanType)}
                disabled={plan.id === currentPlan}
                className={`w-full py-3 rounded-xl font-bold transition-all text-xs tracking-widest ${
                  plan.id === currentPlan 
                  ? (isLight ? 'bg-blue-50 text-blue-600 cursor-default' : 'bg-emerald-500/20 text-emerald-400 cursor-default')
                  : (isLight ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' : 'bg-slate-100 text-slate-900 hover:bg-white active:scale-95')
                }`}
              >
                {plan.id === currentPlan ? 'ACTIVE_PROTOCOL' : 'UPGRADE_SUBSCRIPTION'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlanSelection;
