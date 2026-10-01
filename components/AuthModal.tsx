
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { User } from '../types';
import { dbService } from '../services/dbService';
import { ArrowLeft, Check, X } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: User) => void;
  onGuestChoice: () => void;
  isLight?: boolean;
}

type AuthView = 
  | 'choice' 
  | 'signin' 
  | 'signup' 
  | 'email-verification'
  | 'forgot-email' 
  | 'forgot-otp' 
  | 'forgot-new'
  | 'success';

const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, onGuestChoice, isLight }) => {
  const [view, setView] = useState<AuthView>('choice');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (view === 'signin' || view === 'signup' || view === 'forgot-email') {
      const emailInput = document.querySelector('input[type="email"]');
      (emailInput as HTMLInputElement)?.focus();
    } else if (view === 'email-verification' || view === 'forgot-otp') {
      otpRefs.current[0]?.focus();
    }
  }, [view]);

  const generateAndSetOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    return code;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatusMsg('ESTABLISHING SECURE CONNECTION...');

    try {
      const user = await dbService.findUserByEmail(formData.email);
      if (!user) {
        setError('We couldn’t find an account with that email. Please check the spelling or create a new node.');
        return;
      }

      if ((user as any).password_hash !== formData.password) {
        setError('The password you entered is incorrect. Please try again or reset your key.');
        return;
      }

      if (!user.isEmailConfirmed) {
        setPendingUser(user);
        generateAndSetOtp();
        setView('email-verification');
      } else {
        const { password_hash, ...cleanUser } = user as any;
        await dbService.recordLogin(cleanUser.id);
        onSuccess(cleanUser);
      }
    } catch (err) {
      setError('A system malfunction occurred while verifying credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatusMsg('PROVISIONING SECURE NODE...');

    try {
      const existing = await dbService.findUserByEmail(formData.email);
      if (existing) {
        setError('This email is already registered. Please sign in to your existing node.');
        return;
      }

      const newUser = await dbService.createUser(formData.username, formData.email, formData.password);
      setPendingUser(newUser);
      generateAndSetOtp();
      setView('email-verification');
    } catch (err) {
      setError('Node provisioning failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the complete 6-digit confirmation code.');
      return;
    }

    if (code === generatedOtp && pendingUser) {
      setLoading(true);
      await dbService.confirmEmail(pendingUser.id);
      setSuccessMsg('Account verified. Initializing session...');
      setTimeout(() => onSuccess({ ...pendingUser, isEmailConfirmed: true }), 1500);
    } else {
      setError('The code entered does not match our records. Please verify and try again.');
    }
  };

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const user = await dbService.findUserByEmail(formData.email);
    if (!user) {
      setError('We couldn’t find an account associated with this email.');
      setLoading(false);
    } else {
      generateAndSetOtp();
      setView('forgot-otp');
      setLoading(false);
    }
  };

  const handleForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.join('') === generatedOtp) {
      setView('forgot-new');
    } else {
      setError('Invalid recovery code. Please check your inbox.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('The passwords do not match. Please ensure both fields are identical.');
      return;
    }
    if (formData.password.length < 8) {
      setError('For your safety, passwords must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    const success = await dbService.updateUserPassword(formData.email, formData.password);
    if (success) {
      setSuccessMsg('Your security key has been updated. Redirecting to login...');
      setTimeout(() => setView('signin'), 2000);
    } else {
      setError('We were unable to update your password at this time.');
    }
    setLoading(false);
  };

  const StatusDisplay = () => (
    <div className="mb-6 space-y-3">
      {error && (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-500 text-[11px] font-mono leading-relaxed animate-in fade-in slide-in-from-top-2">
          <span className="font-bold">[!] NOTICE:</span> {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3" strokeWidth={4} />
          </div>
          {successMsg}
        </div>
      )}
    </div>
  );

  if (view === 'choice') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md">
        <div className="w-full max-w-5xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center neon-glow shadow-inner group">
                <div className="scale-[2.8] text-emerald-400 group-hover:scale-[3] transition-transform duration-500">
                  <Icons.Shield />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-[0.2em] text-white mb-4 font-mono uppercase">
              DEFENDRA_VAULT
            </h1>
            <p className="text-slate-400 text-sm tracking-widest uppercase font-mono max-w-md mx-auto opacity-70">
              Identity verification required to establish secure buffer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-4xl">
            <button
              onClick={() => setView('signin')}
              className="group relative flex flex-col items-center text-center p-12 glass-card rounded-[3rem] transition-all duration-500 hover:neon-glow hover:-translate-y-2 border-emerald-500/10 hover:border-emerald-500/40"
            >
              <div className="mb-10 p-7 rounded-full bg-emerald-500/5 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-500 shadow-inner">
                <div className="scale-[1.8]"><Icons.User /></div>
              </div>
              <h3 className="text-2xl font-bold font-mono tracking-widest text-white mb-4">AGENT_LOGIN</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-mono opacity-80 uppercase tracking-widest">
                Full neural access<br/>Session persistence enabled
              </p>
            </button>

            <button
              onClick={onGuestChoice}
              className="group relative flex flex-col items-center text-center p-12 glass-card rounded-[3rem] transition-all duration-500 hover:neon-glow hover:-translate-y-2 border-slate-700/30 hover:border-emerald-500/20"
            >
              <div className="mb-10 p-7 rounded-full bg-slate-800/50 text-slate-400 group-hover:bg-white group-hover:text-slate-950 transition-all duration-500 shadow-inner">
                <div className="scale-[1.8]"><Icons.Zap /></div>
              </div>
              <h3 className="text-2xl font-bold font-mono tracking-widest text-slate-200 mb-4">GUEST_BYPASS</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-mono opacity-80 uppercase tracking-widest">
                Ephemeral session<br/>Buffer purges on close
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/98 backdrop-blur-2xl">
      <div className="w-full max-w-md glass-card rounded-[3rem] border-emerald-500/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        <div className="p-10 border-b border-emerald-500/5 text-center relative bg-emerald-500/[0.01]">
          <button 
            onClick={() => { setView('choice'); setError(''); setSuccessMsg(''); }}
            className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-600 hover:text-emerald-400 transition-all hover:scale-110"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={3} />
          </button>
          
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-inner">
              <Icons.Shield />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold font-mono tracking-widest text-white uppercase">
            {view === 'signin' && 'Secure Login'}
            {view === 'signup' && 'Create Account'}
            {view === 'email-verification' && 'Verify Email'}
            {view.startsWith('forgot') && 'Account Recovery'}
          </h2>
          <p className="text-[10px] text-emerald-500/40 mt-2 uppercase tracking-[0.3em] font-mono">
            {view === 'signin' ? 'Access your protected session' : 'Initialize security node'}
          </p>
        </div>

        <div className="p-10">
          <StatusDisplay />

          {view === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-4">
                <input
                  type="email"
                  required
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-mono text-white focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-slate-700"
                  placeholder="EMAIL_ADDRESS"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
                <input
                  type="password"
                  required
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-mono text-white focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-slate-700"
                  placeholder="SECURITY_KEY"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-slate-950 font-mono font-bold py-4 rounded-2xl transition-all hover:bg-emerald-400 active:scale-95 text-[11px] tracking-[0.2em] uppercase shadow-lg shadow-emerald-500/20">
                {loading ? 'AUTHENTICATING...' : 'Initiate Secure Login'}
              </button>
              <div className="flex flex-col gap-4 text-center mt-6">
                <button type="button" onClick={() => setView('signup')} className="text-[10px] font-mono uppercase text-slate-500 hover:text-emerald-400 tracking-widest">Create New Node</button>
                <button type="button" onClick={() => setView('forgot-email')} className="text-[10px] font-mono uppercase text-slate-500 hover:text-emerald-400 tracking-widest">Reset Security Key</button>
              </div>
            </form>
          )}

          {view === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-4">
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-mono text-white focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-slate-700"
                  placeholder="AGENT_NAME"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
                <input
                  type="email"
                  required
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-mono text-white focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-slate-700"
                  placeholder="EMAIL_PROTOCOL"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
                <input
                  type="password"
                  required
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-mono text-white focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-slate-700"
                  placeholder="SET_SECURITY_KEY"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-slate-950 font-mono font-bold py-4 rounded-2xl transition-all hover:bg-emerald-400 active:scale-95 text-[11px] tracking-[0.2em] uppercase">
                {loading ? 'PROVISIONING...' : 'Register Secure Account'}
              </button>
              <button type="button" onClick={() => setView('signin')} className="w-full text-[10px] font-mono uppercase text-slate-500 hover:text-emerald-400 tracking-widest mt-4">Already have a node?</button>
            </form>
          )}

          {view === 'email-verification' && (
            <form onSubmit={handleVerification} className="space-y-10">
              <div className="text-center">
                <p className="text-slate-400 text-xs font-mono leading-relaxed px-4 opacity-80">
                  A unique 6-digit confirmation code has been dispatched. Enter it below to activate your account.
                </p>
              </div>
              
              <div className="flex justify-between gap-3 mb-8">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-12 h-16 bg-slate-950/50 border rounded-2xl text-center text-2xl font-mono text-emerald-400 focus:outline-none transition-all ${
                      error ? 'border-amber-500/40' : digit ? 'border-emerald-500/50' : 'border-slate-800'
                    }`}
                  />
                ))}
              </div>

              <div className="space-y-6">
                <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-slate-950 font-mono font-bold py-4 rounded-2xl transition-all hover:bg-emerald-400 active:scale-95 text-[11px] tracking-[0.2em] uppercase shadow-xl shadow-emerald-500/10">
                  {loading ? 'VERIFYING...' : 'Confirm Account Identity'}
                </button>
                <div className="text-center space-y-6">
                  <div className="p-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/5">
                    <p className="text-[10px] font-mono text-emerald-500/80 mb-2">Internal Challenge Intercepted:</p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-lg font-bold font-mono tracking-[0.3em] text-emerald-400 underline">{generatedOtp}</span>
                      <button type="button" onClick={() => setOtp(generatedOtp.split(''))} className="p-1 hover:scale-110 transition-transform text-emerald-500">
                        <Icons.Zap />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest leading-relaxed">Didn't receive code? Check spam or resend.</p>
                </div>
              </div>
            </form>
          )}

          {view === 'forgot-email' && (
            <form onSubmit={handleForgotEmail} className="space-y-6">
              <p className="text-slate-400 text-xs font-mono text-center mb-8 px-4">Enter your registered email to continue recovery.</p>
              <input
                type="email"
                required
                className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-mono text-white focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-slate-700"
                placeholder="NODE_EMAIL"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
              <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-slate-950 font-mono font-bold py-4 rounded-2xl transition-all hover:bg-emerald-400 active:scale-95 text-[11px] tracking-[0.2em] uppercase">
                {loading ? 'LOCATING NODE...' : 'Recover Access'}
              </button>
            </form>
          )}

          {view === 'forgot-otp' && (
            <form onSubmit={handleForgotOtp} className="space-y-10">
              <p className="text-slate-400 text-xs font-mono text-center px-4 leading-relaxed">Enter the recovery code sent to your terminal.</p>
              <div className="flex justify-between gap-3 mb-8">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-12 h-16 bg-slate-950/50 border rounded-2xl text-center text-2xl font-mono text-emerald-400 focus:outline-none transition-all ${
                      error ? 'border-amber-500/40' : digit ? 'border-emerald-500/50' : 'border-slate-800'
                    }`}
                  />
                ))}
              </div>
              <div className="p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 text-center">
                <p className="text-[10px] font-mono text-emerald-500/80">Recovery code: {generatedOtp}</p>
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-mono font-bold py-4 rounded-2xl transition-all hover:bg-emerald-400 active:scale-95 text-[11px] tracking-[0.2em] uppercase">
                Verify Code
              </button>
            </form>
          )}

          {view === 'forgot-new' && (
            <form onSubmit={handleResetPassword} className="space-y-8">
              <div className="space-y-4">
                <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest text-center mb-4">Set New Security Key</p>
                <input
                  type="password"
                  required
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-mono text-white focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-slate-700"
                  placeholder="NEW_KEY"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
                <input
                  type="password"
                  required
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-4 text-sm font-mono text-white focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-slate-700"
                  placeholder="CONFIRM_KEY"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-slate-950 font-mono font-bold py-4 rounded-2xl transition-all hover:bg-emerald-400 active:scale-95 text-[11px] tracking-[0.2em] uppercase">
                {loading ? 'RE-INITIALIZING...' : 'Update Security Key'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthModal;
