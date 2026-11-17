import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  CheckCircle2,
  KeyRound,
  HelpCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  X,
  AlertCircle,
  Calendar,
  LogOut,
  Fingerprint,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { VerificationBadge } from './VerificationBadge';
import {
  authenticateOwnerBackend,
  syncUserProfileWithGuardian,
} from '../services/aiGuardianService';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  passcode: string;
  securityQuestion: string;
  securityAnswer: string;
  isVerified: boolean;
  tier: 'basic' | 'vip';
  avatar: string;
  tagline: string;
  age: number;
  city: string;
}

export const SECURITY_QUESTIONS = [
  "What's your favorite meal?",
  "Which school did you study at?",
  "Which games do you like?",
  "Which movie do you like to watch?",
  "What is your childhood pet's name?",
  "What city were you born in?",
];

// Pre-seeded verified members for instant testing
const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr_verified_1',
    name: 'Dylan Wisney',
    email: 'dylan.wisney@gmail.com',
    password: 'password123',
    passcode: '2026',
    securityQuestion: "What's your favorite meal?",
    securityAnswer: 'Pizza',
    isVerified: true,
    tier: 'basic',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    tagline: 'Music producer & tech innovator 🎧',
    age: 25,
    city: 'London',
  },
  {
    id: 'usr_verified_2',
    name: 'Alex Chen',
    email: 'alex.chen@twogether.app',
    password: 'twogether2026',
    passcode: '7788',
    securityQuestion: 'Which movie do you like to watch?',
    securityAnswer: 'Interstellar',
    isVerified: true,
    tier: 'basic',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    tagline: 'VR Explorer & Deep Space enthusiast ✨',
    age: 26,
    city: 'Neo-Tokyo',
  },
];

interface AuthPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onLoginSuccess: (user: UserAccount) => void;
  initialMode?: 'login' | 'register' | 'forgot_password' | 'owner_login';
  onOpenUpgradeModal?: () => void;
  onOwnerAuthenticated?: (ownerToken: string, ownerEmail: string) => void;
}

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  initialMode = 'login',
  onOpenUpgradeModal,
  onOwnerAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password' | 'reset_password' | 'owner_login'>(initialMode);

  // Load accounts from localStorage or fallback
  const getStoredAccounts = (): UserAccount[] => {
    try {
      const data = localStorage.getItem('twogether_users_db');
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    return DEFAULT_ACCOUNTS;
  };

  const saveStoredAccounts = (accounts: UserAccount[]) => {
    try {
      localStorage.setItem('twogether_users_db', JSON.stringify(accounts));
    } catch {
      // ignore
    }
  };

  // Form States: Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form States: Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAge, setRegAge] = useState(24);
  const [regPasscode, setRegPasscode] = useState('');
  const [regQuestion, setRegQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [regAnswer, setRegAnswer] = useState('');

  // Form States: Recovery & Reset
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMethod, setRecoveryMethod] = useState<'question' | 'passcode'>('question');
  const [recoveryPasscode, setRecoveryPasscode] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [targetRecoveryAccount, setTargetRecoveryAccount] = useState<UserAccount | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [ownerEmailInput, setOwnerEmailInput] = useState('');
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Handle Standard Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const accounts = getStoredAccounts();
    const cleanEmail = loginEmail.trim().toLowerCase();

    const found = accounts.find(
      (acc) =>
        acc.email.toLowerCase() === cleanEmail ||
        acc.name.toLowerCase() === cleanEmail
    );

    if (!found) {
      setErrorMsg('No member found with this email or username. Please check your spelling or register.');
      return;
    }

    if (found.password !== loginPassword) {
      setErrorMsg('Incorrect password. If you forgot your password, click "Forgot Password" below to recover via your passcode or security question.');
      return;
    }

    // Login successful
    setSuccessMsg(`Welcome back, ${found.name}! Logging you in directly...`);
    setTimeout(() => {
      onLoginSuccess(found);
      onClose();
    }, 600);
  };

  // Handle 1-Click Direct Login for Verified Members
  const handleDirectVerifiedLogin = (acc: UserAccount) => {
    setSuccessMsg(`Official Verified Login confirmed for ${acc.name}! ✨`);
    setTimeout(() => {
      onLoginSuccess(acc);
      onClose();
    }, 400);
  };

  // Handle Registration for New Members (audited live by AI Guardian)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword || !regAnswer.trim()) {
      setErrorMsg('Please complete all fields, including your security question and answer.');
      return;
    }

    if (Number(regAge) < 18) {
      setErrorMsg('🚨 Strict 18+ Requirement: You must be at least 18 years of age to join Twogether. Minors cannot be registered or approved.');
      return;
    }

    const accounts = getStoredAccounts();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (accounts.some((acc) => acc.email.toLowerCase() === cleanEmail)) {
      setErrorMsg('An account with this email already exists. Please log in instead.');
      return;
    }

    const newUserId = `usr_${Date.now()}`;
    setIsBusy(true);
    const guardianCheck = await syncUserProfileWithGuardian({
      id: newUserId,
      name: regName.trim(),
      email: cleanEmail,
      age: Number(regAge) || 22,
      location: 'London',
      tagline: 'New member ready to connect & verify ✨',
      bio: 'Joined Twogether for good vybes and authentic connections.',
      tier: 'basic',
      isVerified: false,
      actionLabel: 'registration',
    });
    setIsBusy(false);

    if (guardianCheck.isViolating) {
      setErrorMsg(`🛡️ AI Safety Guardian Blocked Registration: ${guardianCheck.reason}`);
      return;
    }

    const newAccount: UserAccount = {
      id: newUserId,
      name: regName.trim(),
      email: cleanEmail,
      password: regPassword,
      passcode: regPasscode.trim() || '2026',
      securityQuestion: regQuestion,
      securityAnswer: regAnswer.trim(),
      isVerified: false, // New member leads to verification
      tier: 'basic',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      tagline: 'New member ready to connect & verify ✨',
      age: Number(regAge) || 22,
      city: 'London',
    };

    const updated = [newAccount, ...accounts];
    saveStoredAccounts(updated);

    setSuccessMsg(`Welcome to Twogether, ${newAccount.name}! Account created with security safeguards.`);
    setTimeout(() => {
      onLoginSuccess(newAccount);
      onClose();
    }, 700);
  };

  // Handle App Owner Back-End Sign-In
  const handleOwnerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsBusy(true);
    const res = await authenticateOwnerBackend(ownerEmailInput.trim(), ownerPinInput.trim());
    setIsBusy(false);

    if (!res.success || !res.ownerToken) {
      setErrorMsg(res.message || 'Access Denied: Only the verified App Owner may enter Back-End.');
      return;
    }

    setSuccessMsg('Owner Back-End Console unlocked cleanly!');
    setTimeout(() => {
      if (onOwnerAuthenticated && res.ownerToken) {
        onOwnerAuthenticated(res.ownerToken, res.ownerEmail || ownerEmailInput.trim());
      }
      onClose();
    }, 500);
  };

  // Handle Forgot Password - Step 1: Find Account
  const handleFindAccountForRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const accounts = getStoredAccounts();
    const cleanEmail = recoveryEmail.trim().toLowerCase();

    const found = accounts.find(
      (acc) =>
        acc.email.toLowerCase() === cleanEmail ||
        acc.name.toLowerCase() === cleanEmail
    );

    if (!found) {
      setErrorMsg('Account not found. Please verify the email or username you registered with.');
      return;
    }

    setTargetRecoveryAccount(found);
  };

  // Handle Forgot Password - Step 2: Validate Security Answer or Passcode
  const handleValidateRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!targetRecoveryAccount) return;

    if (recoveryMethod === 'passcode') {
      if (recoveryPasscode.trim() !== targetRecoveryAccount.passcode) {
        setErrorMsg('Incorrect security passcode. Please verify or try answering your security question.');
        return;
      }
    } else {
      const cleanInput = recoveryAnswer.trim().toLowerCase();
      const cleanActual = targetRecoveryAccount.securityAnswer.trim().toLowerCase();

      if (cleanInput !== cleanActual) {
        setErrorMsg(`Incorrect answer for security question: "${targetRecoveryAccount.securityQuestion}". Please try again or use your passcode.`);
        return;
      }
    }

    // Identification Confirmed! Move to reset password
    setSuccessMsg('Identity verified successfully! Please enter your new password.');
    setTimeout(() => {
      setSuccessMsg(null);
      setMode('reset_password');
    }, 600);
  };

  // Handle Reset Password - Step 3: Change Password & Confirm
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-type your confirmation password.');
      return;
    }

    if (!targetRecoveryAccount) return;

    const accounts = getStoredAccounts();
    const updated = accounts.map((acc) => {
      if (acc.id === targetRecoveryAccount.id) {
        return { ...acc, password: newPassword };
      }
      return acc;
    });

    saveStoredAccounts(updated);
    const updatedUser = { ...targetRecoveryAccount, password: newPassword };

    setSuccessMsg('🎉 Password changed successfully! Logging you in officially to your account...');
    setTimeout(() => {
      onLoginSuccess(updatedUser);
      onClose();
    }, 900);
  };

  const storedAccounts = getStoredAccounts();

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-[#141221] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden my-auto text-left"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Logo */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-[#0F0E17] rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-black text-white font-sans tracking-tight">
              Twogether Member Portal
            </h2>
            <p className="text-[11px] font-mono text-zinc-400">
              {mode === 'login' && 'Direct Verified Login & Member Access'}
              {mode === 'register' && 'New Member Registration & Safeguards'}
              {mode === 'forgot_password' && 'Account Recovery via Passcode or Question'}
              {mode === 'reset_password' && 'Change Password & Official Confirmation'}
              {mode === 'owner_login' && 'App Owner Back-End Authentication'}
            </p>
          </div>
        </div>

        {/* Alert Notifications */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3 mb-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3 mb-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* -------------------------------------------------------------
            MODE 1: LOGIN (Direct Login for Members)
            ------------------------------------------------------------- */}
        {mode === 'login' && (
          <div className="space-y-4">
            {/* Quick 1-Click Direct Login for Verified Members */}
            {storedAccounts.length > 0 && (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold block">
                  ⚡ 1-Click Direct Verified Login:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {storedAccounts.slice(0, 2).map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleDirectVerifiedLogin(acc)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 flex items-center gap-2 transition-all cursor-pointer text-left"
                    >
                      <img
                        src={acc.avatar}
                        alt={acc.name}
                        className="w-8 h-8 rounded-full object-cover border border-cyan-400/40"
                      />
                      <div className="truncate">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-white truncate">{acc.name}</span>
                          <VerificationBadge tier={acc.tier} isVerified={acc.isVerified} size="sm" />
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono truncate block">
                          Log In Directly →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. dylan.wisney@gmail.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-mono text-zinc-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setMode('forgot_password');
                    }}
                    className="text-[11px] font-mono text-cyan-300 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-3 text-zinc-400 hover:text-white"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-black font-extrabold text-xs shadow-lg hover:scale-[1.02] transition-all cursor-pointer mt-2"
              >
                Log In Officially →
              </button>
            </form>

            {/* Switch to Register */}
            <div className="pt-2 text-center text-xs text-zinc-400 font-mono space-y-2">
              <div>
                New to Twogether?{' '}
                <button
                  onClick={() => {
                    setErrorMsg(null);
                    setMode('register');
                  }}
                  className="text-pink-400 font-bold hover:underline cursor-pointer"
                >
                  Register as a New Member
                </button>
              </div>
              {onOwnerAuthenticated && (
                <div className="pt-1 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setMode('owner_login');
                    }}
                    className="text-[10px] text-zinc-500 hover:text-amber-300 font-mono cursor-pointer transition-colors"
                  >
                    🔒 App Owner Back-End Sign-In
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MODE 2: REGISTER (New Member Registration & Safeguards)
            ------------------------------------------------------------- */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-mono text-zinc-300 block mb-1">Full Name / Display Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Dylan Wisney"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs font-mono text-zinc-300 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-400"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-zinc-300 block mb-1">Age</label>
                <input
                  type="number"
                  min={18}
                  max={99}
                  required
                  value={regAge}
                  onChange={(e) => setRegAge(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-300 block mb-1">Password</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Create strong password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-400"
              />
            </div>

            {/* Security Passcode Safeguard */}
            <div>
              <label className="text-xs font-mono text-amber-300 flex items-center gap-1 mb-1">
                <KeyRound className="w-3.5 h-3.5" /> Security Passcode (4–6 Digits for Fast Recovery)
              </label>
              <input
                type="text"
                maxLength={6}
                value={regPasscode}
                onChange={(e) => setRegPasscode(e.target.value)}
                placeholder="e.g. 2026 or 7788"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Security Question Selection */}
            <div>
              <label className="text-xs font-mono text-cyan-300 flex items-center gap-1 mb-1">
                <HelpCircle className="w-3.5 h-3.5" /> Security Recovery Question:
              </label>
              <select
                value={regQuestion}
                onChange={(e) => setRegQuestion(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 mb-2"
              >
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q} className="bg-zinc-900">
                    {q}
                  </option>
                ))}
              </select>

              <input
                type="text"
                required
                value={regAnswer}
                onChange={(e) => setRegAnswer(e.target.value)}
                placeholder="Your secret answer (e.g. Sushi / Pizza / Oxford / Matrix)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Instant Auto-Verify Shortcut Option */}
            {onOpenUpgradeModal && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-left flex items-center justify-between gap-2">
                <div className="text-[11px] text-zinc-300">
                  <span className="font-bold text-amber-300 block font-mono">⚡ Skip Document Review?</span>
                  <span>Instant VIP triggers Auto-Verify immediately upon checkout.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenUpgradeModal();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-400 text-black text-[10px] font-black hover:scale-105 transition-all flex-shrink-0 cursor-pointer"
                >
                  Auto-Verify VIP
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-400 text-white font-extrabold text-xs shadow-lg hover:scale-[1.02] transition-all cursor-pointer mt-2"
            >
              Complete Registration & Lead to Verification →
            </button>

            <div className="pt-2 text-center text-xs text-zinc-400 font-mono">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('login');
                }}
                className="text-cyan-300 font-bold hover:underline cursor-pointer"
              >
                Log In Directly
              </button>
            </div>
          </form>
        )}

        {/* -------------------------------------------------------------
            MODE 3: FORGOT PASSWORD (Passcode OR Security Question)
            ------------------------------------------------------------- */}
        {mode === 'forgot_password' && (
          <div className="space-y-4">
            {!targetRecoveryAccount ? (
              <form onSubmit={handleFindAccountForRecovery} className="space-y-3">
                <p className="text-xs text-zinc-300 font-mono">
                  Enter your registered email or username to locate your recovery questions:
                </p>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="e.g. dylan.wisney@gmail.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-extrabold text-xs shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                >
                  Locate Member Security Profile →
                </button>
              </form>
            ) : (
              <form onSubmit={handleValidateRecovery} className="space-y-3">
                {/* Identified Account Badge */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                  <img
                    src={targetRecoveryAccount.avatar}
                    alt={targetRecoveryAccount.name}
                    className="w-8 h-8 rounded-full object-cover border border-cyan-400/40"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {targetRecoveryAccount.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {targetRecoveryAccount.email}
                    </span>
                  </div>
                </div>

                {/* Choose Recovery Method */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setRecoveryMethod('question')}
                    className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      recoveryMethod === 'question'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Security Question
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecoveryMethod('passcode')}
                    className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      recoveryMethod === 'passcode'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Passcode PIN
                  </button>
                </div>

                {/* Method A: Security Question */}
                {recoveryMethod === 'question' && (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block mb-1">
                        Your Chosen Question:
                      </span>
                      <p className="text-xs font-bold text-white">
                        &quot;{targetRecoveryAccount.securityQuestion}&quot;
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-mono text-zinc-300 block mb-1">
                        Enter Your Secret Answer:
                      </label>
                      <input
                        type="text"
                        required
                        value={recoveryAnswer}
                        onChange={(e) => setRecoveryAnswer(e.target.value)}
                        placeholder="Type the answer you saved"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                )}

                {/* Method B: Security Passcode */}
                {recoveryMethod === 'passcode' && (
                  <div>
                    <label className="text-xs font-mono text-amber-300 block mb-1">
                      Enter Your 4–6 Digit Security Passcode:
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={recoveryPasscode}
                      onChange={(e) => setRecoveryPasscode(e.target.value)}
                      placeholder="e.g. 2026"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-xs shadow-md hover:scale-[1.02] transition-all cursor-pointer mt-2"
                >
                  Verify Identity & Proceed to Password Reset →
                </button>
              </form>
            )}

            <div className="pt-2 text-center text-xs text-zinc-400 font-mono">
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('login');
                  setTargetRecoveryAccount(null);
                }}
                className="text-cyan-300 font-bold hover:underline cursor-pointer"
              >
                Back to Direct Login
              </button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MODE 4: RESET PASSWORD (Change Password & Official Confirmation)
            ------------------------------------------------------------- */}
        {mode === 'reset_password' && targetRecoveryAccount && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-xs text-emerald-200 font-mono">
                Identity confirmed for <strong>{targetRecoveryAccount.name}</strong>. Create a new password below.
              </span>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-300 block mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-300 block mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-black font-extrabold text-xs shadow-lg hover:scale-[1.02] transition-all cursor-pointer mt-2"
            >
              Confirm Password & Log In Officially →
            </button>
          </form>
        )}

        {/* -------------------------------------------------------------
            MODE 5: OWNER BACK-END AUTHENTICATION (OWNER ONLY)
            ------------------------------------------------------------- */}
        {mode === 'owner_login' && (
          <form onSubmit={handleOwnerSignIn} className="space-y-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 font-mono">
              Strictly restricted to the verified Twogether App Owner. User approval documents remain hidden even in Back-End mode.
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-300 block mb-1">
                Owner Email
              </label>
              <input
                type="email"
                required
                value={ownerEmailInput}
                onChange={(e) => setOwnerEmailInput(e.target.value)}
                placeholder="Enter registered Owner Email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-300 block mb-1">
                Owner Back-End Security PIN
              </label>
              <input
                type="password"
                required
                value={ownerPinInput}
                onChange={(e) => setOwnerPinInput(e.target.value)}
                placeholder="Enter Owner Security PIN"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-extrabold text-xs shadow-lg hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-50"
            >
              {isBusy ? 'Authenticating Owner Session...' : 'Unlock Owner Back-End Console →'}
            </button>

            <div className="pt-1 text-center text-xs text-zinc-400 font-mono">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('login');
                }}
                className="text-cyan-300 hover:underline cursor-pointer"
              >
                ← Return to Member Login
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
