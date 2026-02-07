
import React, { useState, useEffect, useRef } from 'react';
import { 
  Droplet, Mail, Lock, ChevronRight, User, Building2, Landmark, 
  ShieldCheck, ArrowLeft, AlertCircle, Loader2, Sparkles, Eye, 
  EyeOff, Shield, Zap, Clock, RefreshCw, CheckCircle2, UserPlus,
  ShieldAlert, Fingerprint
} from 'lucide-react';
import { UserRole, AuthenticatedUser } from '../services/types';
import { backendService } from '../services/backendService';
import InstitutionalRegistrationForm from './InstitutionalRegistrationForm';
import DonorRegistrationForm from './DonorRegistrationForm';
import OtpInput from './OtpInput';
import MailInterceptor from './MailInterceptor';

interface LoginPageProps {
  onLogin: (user: AuthenticatedUser) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register-bank' | 'register-hospital' | 'register-donor'>('login');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [role, setRole] = useState<UserRole>('Donor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // OTP Timer State
  const [timeLeft, setTimeLeft] = useState(120);
  const [maxTime, setMaxTime] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = (duration: number = 120) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(duration);
    setMaxTime(duration);
    setCanResend(false);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await backendService.authenticate(email, password, role);
      if (!user) {
        setError(`Identity Mismatch: Verification failed for ${role} profile.`);
        setIsLoading(false);
        return;
      }

      const res = await backendService.requestOtp(email);
      if (res.success) {
        setStep('otp');
        const duration = email === '24cc024@nandhaengg.org' ? 30 : 120;
        startTimer(duration);
      } else {
        setError(res.message || "Relay gateway busy.");
      }
    } catch (err) {
      setError("Secure handshake failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await backendService.requestOtp(email);
      if (res.success) {
        const duration = email === '24cc024@nandhaengg.org' ? 30 : 120;
        startTimer(duration);
      } else {
        setError(res.message);
      }
    } catch (e) {
      setError("Resend aborted.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpComplete = async (otp: string) => {
    if (timeLeft === 0) {
      setError("OTP Expired ❌");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const res = await backendService.verifyOtp(email, otp);
      if (res.success) {
        const authenticatedUser = await backendService.authenticate(email, password, role);
        if (authenticatedUser) onLogin(authenticatedUser);
      } else {
        setError(res.message || "Wrong OTP ❌");
      }
    } catch (err) {
      setError("Verification node unreachable.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demo: { email: string; pass: string; role: UserRole }) => {
    setEmail(demo.email);
    setPassword(demo.pass);
    setRole(demo.role);
    setShowDemo(false);
    setError(null);
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  };

  const demoAccounts = [
    { label: 'Nandha Hub (Fast Relay)', email: '24cc024@nandhaengg.org', pass: 'Madan@2007..', role: 'BloodBank' as UserRole },
    { label: 'Donor: Arjun (O-)', email: 'arjun@donor.com', pass: 'password123', role: 'Donor' as UserRole },
    { label: 'Blood Bank: IRT', email: 'irt@tnhealth.gov.in', pass: 'irt123', role: 'BloodBank' as UserRole },
    { label: 'Hospital: Metro ER', email: 'er@metrolife.com', pass: 'hosp123', role: 'Hospital' as UserRole },
  ];

  const RoleButton = ({ r, title, sub, icon: Icon }: { r: UserRole, title: string, sub: string, icon: any }) => (
    <button
      type="button"
      onClick={() => { setRole(r); setError(null); }}
      className={`w-full flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left group ${
        role === r 
          ? 'bg-white border-red-600 shadow-xl ring-2 ring-red-600/5' 
          : 'bg-white border-slate-100 hover:border-slate-200'
      }`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
        role === r ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'
      }`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${role === r ? 'text-slate-900' : 'text-slate-500'}`}>{title}</h4>
        <p className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${role === r ? 'text-slate-400' : 'text-slate-300'}`}>{sub}</p>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <MailInterceptor />
      
      <div className="w-full max-w-[1100px] min-h-[780px] grid md:grid-cols-2 bg-white rounded-[4rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] overflow-hidden relative border border-slate-100">
        
        {/* Left Professional Brand Panel */}
        <div className="hidden md:flex flex-col justify-between p-20 bg-[#0f172a] text-white relative">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-20">
              <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-900/40">
                <Droplet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">RED COMMAND<span className="text-red-500">ELITE</span></h1>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1">Institutional Authority</p>
              </div>
            </div>
            
            <div className="space-y-12">
              <h2 className="text-6xl font-black leading-[1.1] tracking-tighter max-w-sm">
                Unified <span className="text-red-500 underline decoration-red-500/30 underline-offset-[16px] decoration-[4px]">Medical Relay</span> System.
              </h2>
              <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-xs">
                Secure SMTP Hub integrated for official medical facilities.
              </p>
              
              <div className="space-y-6 pt-6">
                {[
                  { text: 'Fast Relay Protocol: Active', icon: Zap, color: 'text-amber-400' },
                  { text: 'End-to-End Audit Logs', icon: ShieldCheck, color: 'text-emerald-400' },
                  { text: 'Authorized State Node', icon: Fingerprint, color: 'text-blue-400' }
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-5 group">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
                      <f.icon className={`w-4 h-4 ${f.color}`} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="relative z-10">
            <button 
              onClick={() => setShowDemo(!showDemo)} 
              className="text-indigo-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:text-indigo-300 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> MASTER HANDSHAKE KEYS
            </button>
            {showDemo && (
              <div className="mt-4 grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {demoAccounts.map(demo => (
                  <button key={demo.label} onClick={() => fillDemo(demo)} className="text-left px-5 py-3 bg-white/5 rounded-2xl text-[10px] font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5">{demo.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Authentication Panel */}
        <div className="p-8 sm:p-20 flex flex-col justify-center bg-white overflow-y-auto max-h-[95vh] scrollbar-hide">
          {view === 'login' ? (
            <div className="animate-in fade-in slide-in-from-right-12 duration-1000">
              {step === 'credentials' ? (
                <div className="space-y-12">
                  <div className="space-y-4">
                    <RoleButton r="Donor" title="State Volunteer" sub="Personal Blood Donor Profile" icon={User} />
                    <RoleButton r="BloodBank" title="Blood Hub" sub="Central Supply Management" icon={Landmark} />
                    <RoleButton r="Hospital" title="Medical Node" sub="Emergency ER Operations" icon={Building2} />
                  </div>

                  {error && (
                    <div className="p-5 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center gap-4 text-red-600 text-[11px] font-black uppercase tracking-widest animate-in shake">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    </div>
                  )}

                  <form onSubmit={handleInitialSubmit} className="space-y-8">
                    <div className="space-y-6">
                      <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 px-1">Institutional Email</label>
                        <div className="relative">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                          <input type="email" required placeholder="name@facility.gov.in" className="w-full pl-16 pr-6 py-6 bg-[#f8fafc] border-2 border-slate-50 rounded-[2rem] focus:outline-none focus:ring-8 focus:ring-red-600/5 focus:border-red-600 focus:bg-white transition-all font-bold text-slate-800 text-sm" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                      </div>
                      <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 px-1">Access Token</label>
                        <div className="relative">
                          <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                          <input type={showPass ? "text" : "password"} required placeholder="••••••••" className="w-full pl-16 pr-16 py-6 bg-[#f8fafc] border-2 border-slate-50 rounded-[2rem] focus:outline-none focus:ring-8 focus:ring-red-600/5 focus:border-red-600 focus:bg-white transition-all font-bold text-slate-800 text-sm" value={password} onChange={e => setPassword(e.target.value)} />
                          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">{showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                        </div>
                      </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-[#0f172a] text-white py-7 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all hover:-translate-y-1 active:scale-95">{isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>DISPATCH SECURITY TOKEN <ChevronRight className="w-4 h-4" /></>}</button>
                  </form>

                  <div className="space-y-8 pt-10 border-t border-slate-100">
                    <div className="space-y-5">
                      <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Institutional Onboarding</p>
                      
                      <button 
                        onClick={() => setView('register-donor')} 
                        className="w-full flex items-center justify-center gap-3 px-4 py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 group"
                      >
                        <UserPlus className="w-5 h-5 group-hover:scale-125 transition-transform" /> Register Professional Node
                      </button>

                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setView('register-bank')} 
                          className="flex items-center justify-center gap-3 px-4 py-5 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-red-600 transition-all group"
                        >
                          <Landmark className="w-5 h-5 text-slate-400 group-hover:text-red-600" />
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Add Hub</span>
                        </button>
                        <button 
                          onClick={() => setView('register-hospital')} 
                          className="flex items-center justify-center gap-3 px-4 py-5 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-red-600 transition-all group"
                        >
                          <Building2 className="w-5 h-5 text-slate-400 group-hover:text-red-600" />
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Add Node</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-16 animate-in zoom-in-95 duration-700 text-center">
                  <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <svg className="absolute inset-0 transform -rotate-90 w-32 h-32">
                      <circle
                        className={`transition-all duration-1000 ${timeLeft < 30 ? 'text-red-500' : 'text-red-600'}`}
                        strokeWidth="4"
                        strokeDasharray={282.6}
                        strokeDashoffset={282.6 - (282.6 * timeLeft) / maxTime}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="45"
                        cx="64"
                        cy="64"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Clock className={`w-6 h-6 mb-1 ${timeLeft < 30 ? 'text-red-500' : 'text-slate-400'}`} />
                      <span className={`text-lg font-black ${timeLeft < 30 ? 'text-red-500' : 'text-slate-900'}`}>{formatTime(timeLeft)}</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Secure Handshake</h2>
                    <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.3em] leading-relaxed">
                      Tactical OTP dispatched to official medical gateway: <br/>
                      <span className="text-red-600">{email}</span>
                    </p>
                  </div>

                  {error && (
                    <div className="p-5 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center gap-4 text-red-600 text-[11px] font-black uppercase tracking-widest animate-in shake">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    </div>
                  )}

                  <div className="px-4">
                    <OtpInput onComplete={handleOtpComplete} disabled={isLoading || timeLeft === 0} />
                  </div>
                  
                  <div className="flex flex-col gap-8 pt-4">
                    <button 
                      onClick={handleResendOtp}
                      disabled={!canResend || isLoading}
                      className={`text-[11px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3 mx-auto ${canResend ? 'text-red-600 hover:text-red-700' : 'text-slate-300 cursor-not-allowed'}`}
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> RE-INITIATE SECURE RELAY
                    </button>
                    
                    <button onClick={() => setStep('credentials')} className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-3 mx-auto">
                      <ArrowLeft className="w-5 h-5" /> ABORT HANDSHAKE
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
             <div className="animate-in fade-in slide-in-from-right-12 duration-1000">
                <button onClick={() => setView('login')} className="flex items-center gap-3 text-[11px] font-black text-slate-400 hover:text-red-600 uppercase tracking-[0.3em] transition-colors mb-12">
                  <ArrowLeft className="w-5 h-5" /> BACK TO SECURE RELAY
                </button>
                {view === 'register-donor' ? (
                  <DonorRegistrationForm onRegister={d => { backendService.saveDonor(d); setView('login'); }} onBack={() => setView('login')} isOffline={false} />
                ) : (
                  <InstitutionalRegistrationForm type={view === 'register-bank' ? 'BloodBank' : 'Hospital'} onRegister={d => { backendService.saveInstitution(d, view === 'register-bank' ? 'BloodBank' : 'Hospital'); setView('login'); }} />
                )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
