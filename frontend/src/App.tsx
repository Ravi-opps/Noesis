/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  ChevronRight, 
  Shield, 
  CheckCircle2, 
  LayoutDashboard, 
  Key, 
  Building2,
  Menu,
  X,
  TrendingUp,
  Globe
} from 'lucide-react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

const ScrollBounceWrapper = ({ children }: { children: React.ReactNode }) => {
  const y = useMotionValue(0);
  const springY = useSpring(y, { stiffness: 400, damping: 40 });
  const lastTouchY = useRef(0);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const isAtTop = window.scrollY <= 0;
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

      if (isAtTop && e.deltaY < 0) {
        // Prevent default to stop native browser bounce if any
        // e.preventDefault(); 
        const currentY = y.get();
        y.set(currentY - e.deltaY * 0.15);
        // Return to zero
        setTimeout(() => y.set(0), 10);
      } else if (isAtBottom && e.deltaY > 0) {
        // e.preventDefault();
        const currentY = y.get();
        y.set(currentY - e.deltaY * 0.15);
        // Return to zero
        setTimeout(() => y.set(0), 10);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = lastTouchY.current - touchY;
      lastTouchY.current = touchY;

      const isAtTop = window.scrollY <= 0;
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

      if (isAtTop && deltaY < 0) {
        y.set(y.get() - deltaY * 0.3);
      } else if (isAtBottom && deltaY > 0) {
        y.set(y.get() - deltaY * 0.3);
      } else {
        y.set(0);
      }
    };

    const handleTouchEnd = () => {
      y.set(0);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [y]);

  return (
    <motion.div style={{ y: springY }} className="min-h-screen">
      {children}
    </motion.div>
  );
};

type AuthFormErrors = Partial<Record<'email' | 'password' | 'profession' | 'company' | 'form', string>>;

type AuthTokenResponse = {
  token: string;
  'token-type'?: string;
  token_type?: string;
};

type StoredAuth = {
  token: string;
  tokenType: string;
  storage: Storage;
};

type RAGPoint = {
  title: string;
  details: string;
  evidence: string[];
};

type RAGSuggestion = {
  title: string;
  details: string;
  technical_actions: string[];
  addresses: string[];
  evidence: string[];
};

type RAGSearchResponse = {
  search: string;
  positives: RAGPoint[];
  negatives: RAGPoint[];
  suggestions: RAGSuggestion[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim()))
    .filter((entry) => entry.length > 0);
};

const normalizePoint = (value: unknown): RAGPoint | null => {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const details = typeof value.details === 'string' ? value.details.trim() : '';

  if (!title && !details) {
    return null;
  }

  return {
    title: title || 'Untitled point',
    details: details || 'No additional details provided.',
    evidence: normalizeStringArray(value.evidence),
  };
};

const normalizeSuggestion = (value: unknown): RAGSuggestion | null => {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const details = typeof value.details === 'string' ? value.details.trim() : '';

  if (!title && !details) {
    return null;
  }

  return {
    title: title || 'Untitled suggestion',
    details: details || 'No additional details provided.',
    technical_actions: normalizeStringArray(value.technical_actions),
    addresses: normalizeStringArray(value.addresses),
    evidence: normalizeStringArray(value.evidence),
  };
};

const API_BASE_URL = 'http://127.0.0.1:5000';
const AUTH_TOKEN_KEY = 'noesis_auth_token';
const AUTH_TOKEN_TYPE_KEY = 'noesis_auth_token_type';
const RECENT_SEARCHES_STORAGE_PREFIX = 'noesis_recent_searches';

const getStoredAuth = (): StoredAuth | null => {
  const localToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (localToken) {
    return {
      token: localToken,
      tokenType: localStorage.getItem(AUTH_TOKEN_TYPE_KEY) ?? 'bearer',
      storage: localStorage,
    };
  }

  const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (sessionToken) {
    return {
      token: sessionToken,
      tokenType: sessionStorage.getItem(AUTH_TOKEN_TYPE_KEY) ?? 'bearer',
      storage: sessionStorage,
    };
  }

  return null;
};

const clearStoredAuth = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_TYPE_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_TYPE_KEY);
};

const storeAuthToken = (token: string, tokenType: string, keepSignedIn: boolean) => {
  clearStoredAuth();
  const storage = keepSignedIn ? localStorage : sessionStorage;
  storage.setItem(AUTH_TOKEN_KEY, token);
  storage.setItem(AUTH_TOKEN_TYPE_KEY, tokenType);
};

const authFetch = (path: string, init: RequestInit = {}) => {
  const storedAuth = getStoredAuth();
  const headers = new Headers(init.headers ?? {});

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (storedAuth?.token) {
    headers.set('Authorization', `${storedAuth.tokenType} ${storedAuth.token}`);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
};

const getCurrentAccountStorageKey = () => {
  const storedAuth = getStoredAuth();
  const rawToken = storedAuth?.token;
  if (!rawToken) {
    return 'anonymous';
  }

  const tokenParts = rawToken.split('.');
  if (tokenParts.length < 2) {
    return 'anonymous';
  }

  try {
    const payloadSegment = tokenParts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(tokenParts[1].length / 4) * 4, '=');
    const payload = JSON.parse(atob(payloadSegment)) as { sub?: unknown };
    const subject = typeof payload.sub === 'string' ? payload.sub.trim().toLowerCase() : '';
    return subject || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthHovered, setIsAuthHovered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getStoredAuth()?.token));
  const [isAuthChecking, setIsAuthChecking] = useState(() => Boolean(getStoredAuth()?.token));
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profession, setProfession] = useState('');
  const [company, setCompany] = useState('');
  const [formErrors, setFormErrors] = useState<AuthFormErrors>({});
  const authCardRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isSignUpMode = location.pathname === '/signup';
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (!storedAuth) {
      setIsLoggedIn(false);
      setIsAuthChecking(false);
      return;
    }

    let isMounted = true;

    const validateSession = async () => {
      setIsAuthChecking(true);
      try {
        const response = await authFetch('/dashboard/home', { method: 'GET' });
        if (!response.ok) {
          throw new Error('Session validation failed.');
        }
        if (isMounted) {
          setIsLoggedIn(true);
        }
      } catch {
        clearStoredAuth();
        if (isMounted) {
          setIsLoggedIn(false);
        }
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };

    void validateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setFormErrors({});
  }, [location.pathname]);

  useEffect(() => {
    if (Object.keys(formErrors).length === 0) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (authCardRef.current && !authCardRef.current.contains(event.target as Node)) {
        setFormErrors({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [formErrors]);

  const clearFieldError = (field: keyof AuthFormErrors) => {
    setFormErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateAuthForm = () => {
    const nextErrors: AuthFormErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = 'Mail ID is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = 'Enter a valid Mail ID.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    if (isSignUpMode) {
      if (!profession.trim()) {
        nextErrors.profession = 'Profession is required.';
      }
      if (!company.trim()) {
        nextErrors.company = 'Company is required.';
      }
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAuthForm()) {
      return;
    }

    const requestPath = isSignUpMode ? '/auth/signup' : '/auth/login';
    const payload = isSignUpMode
      ? {
          email: email.trim(),
          password,
          profession: profession.trim(),
          company: company.trim(),
        }
      : {
          email: email.trim(),
          password,
        };

    try {
      const response = await authFetch(requestPath, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setFormErrors({ form: errorText || 'Authentication failed. Please try again.' });
        return;
      }

      const result = (await response.json()) as AuthTokenResponse;
      if (!result.token) {
        setFormErrors({ form: 'Authentication response did not include a token.' });
        return;
      }

      const tokenType = (result['token-type'] ?? result.token_type ?? 'bearer').toLowerCase();
      storeAuthToken(result.token, tokenType, keepSignedIn);

      const dashboardResponse = await authFetch('/dashboard/home', { method: 'GET' });
      if (!dashboardResponse.ok) {
        clearStoredAuth();
        setFormErrors({ form: 'Unable to access dashboard with this session.' });
        return;
      }

      setFormErrors({});
      setIsLoggedIn(true);
      setIsAuthChecking(false);
      navigate('/dashboard/home');
    } catch {
      setFormErrors({ form: 'Unable to reach the server. Check backend availability.' });
      setIsAuthChecking(false);
    }
  };

  const switchAuthMode = (mode: 'login' | 'signup') => {
    navigate(`/${mode}`);
    setFormErrors({});
  };

  const handleLogout = () => {
    clearStoredAuth();
    setIsLoggedIn(false);
    setIsAuthChecking(false);
    navigate('/login');
  };

  const MagnifiedWords = ({ text }: { text: string }) => {
    return (
      <span className="inline-flex flex-wrap gap-x-[0.3em]">
        {text.split(' ').map((word, index) => (
          <motion.span
            key={index}
            className="inline-block cursor-default relative group"
            whileHover={{ 
              scale: 1.1,
              color: '#6d28d9',
              zIndex: 10,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {word}
          </motion.span>
        ))}
      </span>
    );
  };

  const LogoGlobe = ({ className = "w-10 h-10" }: { className?: string }) => (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-[#6d28d9]/20 blur-xl rounded-full animate-pulse"></div>
      <svg viewBox="0 0 100 100" className={`relative z-10 w-full h-full drop-shadow-[0_0_8px_rgba(109,40,217,0.35)]`}>
        <defs>
          <radialGradient id="flareGradient" cx="35%" cy="35%" r="35%">
            <stop offset="0%" stopColor="white" />
            <stop offset="30%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#6d28d9" strokeWidth="1.5" opacity="0.9" />
        <ellipse cx="50" cy="50" rx="45" ry="12" fill="none" stroke="#6d28d9" strokeWidth="1.2" transform="rotate(0 50 50)" opacity="0.7" />
        <ellipse cx="50" cy="50" rx="45" ry="12" fill="none" stroke="#6d28d9" strokeWidth="1.2" transform="rotate(60 50 50)" opacity="0.7" />
        <ellipse cx="50" cy="50" rx="45" ry="12" fill="none" stroke="#6d28d9" strokeWidth="1.2" transform="rotate(120 50 50)" opacity="0.7" />
        <ellipse cx="50" cy="50" rx="12" ry="45" fill="none" stroke="#6d28d9" strokeWidth="1.2" transform="rotate(0 50 50)" opacity="0.7" />
        <ellipse cx="50" cy="50" rx="12" ry="45" fill="none" stroke="#6d28d9" strokeWidth="1.2" transform="rotate(30 50 50)" opacity="0.7" />
        <ellipse cx="50" cy="50" rx="12" ry="45" fill="none" stroke="#6d28d9" strokeWidth="1.2" transform="rotate(-30 50 50)" opacity="0.7" />
        <circle cx="32" cy="32" r="15" fill="url(#flareGradient)" className="animate-pulse" />
        <g opacity="0.6">
          <line x1="32" y1="15" x2="32" y2="49" stroke="white" strokeWidth="0.5" />
          <line x1="15" y1="32" x2="49" y2="32" stroke="white" strokeWidth="0.5" />
          <line x1="20" y1="20" x2="44" y2="44" stroke="white" strokeWidth="0.5" />
          <line x1="44" y1="20" x2="20" y2="44" stroke="white" strokeWidth="0.5" />
        </g>
      </svg>
    </div>
  );

  const authCheckingScreen = (
    <motion.div
      key="auth-checking"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-[#f6f2ff] flex flex-col items-center justify-center z-[100]"
    >
      <div className="flex flex-col items-center gap-4">
        <LogoGlobe className="w-16 h-16" />
        <span className="text-sm font-semibold tracking-[0.2em] text-slate-700 font-headline uppercase">
          Authorizing session
        </span>
      </div>
    </motion.div>
  );

  return (
    <ScrollBounceWrapper>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="fixed inset-0 bg-[#f6f2ff] flex flex-col items-center justify-center z-[100]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-8"
            >
              <LogoGlobe className="w-24 h-24" />
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-3xl font-bold tracking-[0.4em] text-slate-900 font-headline uppercase"
              >
                Noesis
              </motion.span>
            </motion.div>
          </motion.div>
        ) : (
            <Routes location={location}>
              <Route
                path="/"
                element={
                  isAuthChecking
                    ? authCheckingScreen
                    : <Navigate to={isLoggedIn ? '/dashboard/home' : '/login'} replace />
                }
              />
              <Route
                path="/:authRoute"
                element={
                  isAuthChecking ? (
                    authCheckingScreen
                  ) : isLoggedIn ? (
                    <Navigate to="/dashboard/home" replace />
                  ) : !isAuthRoute ? (
                    <Navigate to="/login" replace />
                  ) : (
                  <motion.div
                    key="landing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                    transition={{ duration: 0.8 }}
                    className="min-h-screen bg-gradient-to-br from-[#f6f0ff] via-[#faf7ff] to-[#eee7ff] selection:bg-[#6d28d9] selection:text-white overflow-x-hidden"
                  >
                    {/* TopNavBar */}
                    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-violet-100 shadow-sm">
                      <div className="flex justify-between items-center max-w-7xl mx-auto px-6 py-4">
                        <div className="flex items-center gap-12">
                          <motion.div
                            className="relative w-32 h-10 cursor-pointer"
                            onMouseEnter={() => setIsLogoHovered(true)}
                            onMouseLeave={() => setIsLogoHovered(false)}
                            initial={false}
                            animate={{ rotateY: isLogoHovered ? 180 : 0 }}
                            transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                            style={{ transformStyle: 'preserve-3d' }}
                          >
                            {/* Front: Text */}
                            <div
                              className="absolute inset-0 flex items-center backface-hidden"
                              style={{ backfaceVisibility: 'hidden' }}
                            >
                              <span className="text-2xl font-bold tracking-[0.2em] text-slate-900 font-headline uppercase">Noesis</span>
                            </div>

                            {/* Back: Image */}
                            <div
                              className="absolute inset-0 flex items-center justify-center backface-hidden"
                              style={{
                                backfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)',
                              }}
                            >
                              <LogoGlobe />
                            </div>
                          </motion.div>
                        </div>

                        <div className="flex items-center gap-4 md:gap-6 font-headline font-semibold tracking-tight text-sm">
                          <button
                            className="hidden sm:block text-slate-600 hover:text-slate-900 transition-colors"
                            onClick={() => switchAuthMode('login')}
                          >
                            Login
                          </button>
                          <button
                            className="bg-[#6d28d9] text-white px-5 py-2 rounded-md hover:brightness-110 transition-all font-bold shadow-lg shadow-[#6d28d9]/25"
                            onClick={() => switchAuthMode('signup')}
                          >
                            Get Started
                          </button>
                          <button
                            className="md:hidden text-slate-900"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                          >
                            {isMenuOpen ? <X /> : <Menu />}
                          </button>
                        </div>
                      </div>

                      {/* Mobile Menu */}
                      {isMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="md:hidden bg-white border-b border-violet-100 px-6 py-8 flex flex-col gap-6"
                        >
                          <button
                            className="text-left text-lg font-headline font-semibold text-slate-700"
                            onClick={() => switchAuthMode('login')}
                          >
                            Login
                          </button>
                        </motion.div>
                      )}
                    </nav>

                    <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
                      <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                        {/* Hero Content */}
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6 }}
                          className="lg:col-span-7 flex flex-col"
                        >
                          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-headline font-extrabold tracking-tighter text-slate-900 leading-[1] mb-10">
                            <MagnifiedWords text="Decipher the" />
                            <span className="text-[#6d28d9] block">
                              <MagnifiedWords text="Human Sentiment" />
                            </span>
                            <span className="block">
                              <MagnifiedWords text="with AI Precision." />
                            </span>
                          </h1>

                          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed mb-12">
                            Our Editorial Intelligence engine transforms vast quantities of unstructured feedback into a prestigious collection of actionable insights. Move beyond raw noise to curated understanding.
                          </p>
                        </motion.div>

                        {/* Auth Card */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className="lg:col-span-5"
                          onMouseEnter={() => setIsAuthHovered(true)}
                          onMouseLeave={() => setIsAuthHovered(false)}
                        >
                          <div className={`bg-white/90 backdrop-blur-xl p-8 sm:p-10 rounded-2xl shadow-xl relative overflow-hidden border transition-all duration-500 ${isAuthHovered ? 'border-[#6d28d9] shadow-[0_0_40px_rgba(109,40,217,0.2)]' : 'border-violet-100'}`}>
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-[#6d28d9]/10 blur-3xl rounded-full -mr-16 -mt-16 transition-opacity duration-500 ${isAuthHovered ? 'opacity-100' : 'opacity-50'}`}></div>

                            <div className="relative z-10" ref={authCardRef}>
                              <h2 className="text-3xl font-headline font-bold text-slate-900 mb-2">
                                {isSignUpMode ? 'Sign Up' : 'Login'}
                              </h2>
                              <p className="text-slate-600 text-sm mb-6">
                                {isSignUpMode
                                  ? 'Create your account with your Mail ID, password, profession, and company.'
                                  : 'Enter your Mail ID and password to access your workspace.'}
                              </p>

                              <form className="space-y-6" onSubmit={handleLogin} noValidate>
                                {formErrors.form && (
                                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {formErrors.form}
                                  </div>
                                )}
                                <div>
                                  {formErrors.email && (
                                    <div className="mb-2 text-sm text-red-600 font-semibold">{formErrors.email}</div>
                                  )}
                                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Mail ID</label>
                                  <input
                                    className="w-full bg-white border border-violet-200 rounded-lg py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-[#6d28d9]/20 placeholder:text-slate-400 transition-all text-sm outline-none"
                                    placeholder="you@example.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                      setEmail(e.target.value);
                                      clearFieldError('email');
                                      clearFieldError('form');
                                    }}
                                  />
                                </div>
                                <div>
                                  {formErrors.password && (
                                    <div className="mb-2 text-sm text-red-600 font-semibold">{formErrors.password}</div>
                                  )}
                                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Password</label>
                                  <input
                                    className="w-full bg-white border border-violet-200 rounded-lg py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-[#6d28d9]/20 placeholder:text-slate-400 transition-all text-sm outline-none"
                                    placeholder="Minimum 8 characters"
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                      setPassword(e.target.value);
                                      clearFieldError('password');
                                      clearFieldError('form');
                                    }}
                                  />
                                </div>

                                {isSignUpMode && (
                                  <>
                                    <div>
                                      {formErrors.profession && (
                                        <div className="mb-2 text-sm text-red-600 font-semibold">{formErrors.profession}</div>
                                      )}
                                      <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Profession</label>
                                      <input
                                        className="w-full bg-white border border-violet-200 rounded-lg py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-[#6d28d9]/20 placeholder:text-slate-400 transition-all text-sm outline-none"
                                        placeholder="e.g. Product Manager"
                                        type="text"
                                        value={profession}
                                        onChange={(e) => {
                                          setProfession(e.target.value);
                                          clearFieldError('profession');
                                          clearFieldError('form');
                                        }}
                                      />
                                    </div>
                                    <div>
                                      {formErrors.company && (
                                        <div className="mb-2 text-sm text-red-600 font-semibold">{formErrors.company}</div>
                                      )}
                                      <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Company</label>
                                      <input
                                        className="w-full bg-white border border-violet-200 rounded-lg py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-[#6d28d9]/20 placeholder:text-slate-400 transition-all text-sm outline-none"
                                        placeholder="e.g. Acme Inc."
                                        type="text"
                                        value={company}
                                        onChange={(e) => {
                                          setCompany(e.target.value);
                                          clearFieldError('company');
                                          clearFieldError('form');
                                        }}
                                      />
                                    </div>
                                  </>
                                )}

                                <div className="flex items-center text-xs">
                                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-800 transition-colors">
                                    <input
                                      className="rounded bg-white border border-violet-200 text-[#6d28d9] focus:ring-0 w-4 h-4"
                                      type="checkbox"
                                      checked={keepSignedIn}
                                      onChange={(e) => setKeepSignedIn(e.target.checked)}
                                    />
                                    Keep me signed in
                                  </label>
                                </div>

                                <button className="w-full bg-[#6d28d9] text-white font-headline font-bold py-4 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-[#6d28d9]/20">
                                  {isSignUpMode ? 'Sign Up' : 'Login'}
                                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                              </form>

                              <p className="mt-8 text-center text-sm text-slate-500">
                                {isSignUpMode ? 'Already have an account?' : 'New to Noesis?'}{' '}
                                <button
                                  type="button"
                                  className="text-[#6d28d9] hover:underline font-bold"
                                  onClick={() => switchAuthMode(isSignUpMode ? 'login' : 'signup')}
                                >
                                  {isSignUpMode ? 'Login' : 'Sign up'}
                                </button>
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </main>

                    {/* Footer */}
                    <footer className="w-full border-t border-slate-200 bg-white/70 mt-20">
                      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-6 py-10 w-full font-body text-[10px] uppercase tracking-[0.2em] font-semibold"></div>
                    </footer>
                  </motion.div>
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                isAuthChecking
                  ? authCheckingScreen
                  : isLoggedIn
                    ? <Navigate to="/dashboard/home" replace />
                    : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/dashboard/:tab"
              element={
                isAuthChecking ? (
                  authCheckingScreen
                ) : isLoggedIn ? (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  >
                    <Dashboard
                      onLogout={handleLogout}
                      LogoGlobe={LogoGlobe}
                      accountStorageKey={getCurrentAccountStorageKey()}
                    />
                  </motion.div>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="*"
              element={
                isAuthChecking
                  ? authCheckingScreen
                  : <Navigate to={isLoggedIn ? '/dashboard/home' : '/login'} replace />
              }
            />
          </Routes>
        )}
      </AnimatePresence>
    </ScrollBounceWrapper>
  );
}

// Dashboard Component
import { 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { 
  LayoutDashboard as DashboardIcon, 
  Home,
  Clock,
  LogOut, 
  Search, 
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Cpu,
  Database,
  ShieldCheck,
  ExternalLink,
  Twitter,
  MessageCircle,
  Users,
  Hash
} from 'lucide-react';

type InsightPriority = 'Critical' | 'Positive' | 'Neutral';
type InsightSentiment = 'negative' | 'positive' | 'neutral';

type RawVoiceEntry = {
  author: string;
  source: string;
  region: string;
  text: string;
  time: string;
};

type InsightFeedItem = {
  id: string;
  title: string;
  source: string;
  sentiment: InsightSentiment;
  region: string;
  quotes: string[];
  explanation: string;
  action: string;
  priority: InsightPriority;
  rawVoice: RawVoiceEntry[];
};

type ThemeItem = {
  id: string;
  label: string;
  share: number;
  details: string;
  relatedInsightIds: string[];
};

type SentimentSlice = {
  name: 'Positive' | 'Negative' | 'Neutral';
  value: number;
  color: string;
};

type RawVoiceGroup = {
  insightId: string;
  insightTitle: string;
  entries: RawVoiceEntry[];
};

const aiSummaryBullets = [
  'Latency complaints are accelerating in APAC during evening peak hours.',
  'Onboarding friction is dropping after guided setup changes and is lifting week-one retention.',
  'Dark mode has become the fastest-growing feature request in SMB segments.',
  'Pricing confusion is blocking upgrades in EMEA mid-market accounts.',
];

const insightFeedData: InsightFeedItem[] = [
  {
    id: 'latency-apac',
    title: 'Latency complaints rising (+32%)',
    source: 'Reddit + Support Tickets',
    sentiment: 'negative',
    region: 'APAC',
    quotes: [
      'App slows down every evening around 8PM in Singapore.',
      'Search takes 6-8 seconds during peak traffic.',
      'Dashboard is fine in the morning but unusable at night.',
    ],
    explanation:
      'Traffic spikes in APAC are saturating the read replica pool. Query retries are increasing response time and causing visible lag in the product intelligence views.',
    action:
      'Investigate server load balancing for APAC peak windows and provision one additional read replica for high-volume tenant clusters.',
    priority: 'Critical',
    rawVoice: [
      {
        author: 'ops_pm_lee',
        source: 'Reddit',
        region: 'Singapore',
        text: 'Nightly reporting is painful because filters timeout every few clicks.',
        time: '2h ago',
      },
      {
        author: 'Lena P.',
        source: 'Support Ticket',
        region: 'Sydney',
        text: 'Users think data is missing, but it eventually appears after long waits.',
        time: '5h ago',
      },
    ],
  },
  {
    id: 'onboarding-retention',
    title: 'Onboarding flow improving activation (+18%)',
    source: 'In-app Feedback',
    sentiment: 'positive',
    region: 'Global',
    quotes: [
      'The checklist made setup way easier.',
      'I reached my first insight in under 10 minutes.',
      'The guided import removed most of the confusion.',
    ],
    explanation:
      'The revised onboarding sequence reduces decision fatigue by limiting configuration choices in the first session and highlighting one success path to value.',
    action:
      'Roll out the new onboarding path to all new workspaces and add a guided checkpoint for team invite completion.',
    priority: 'Positive',
    rawVoice: [
      {
        author: 'Marta G.',
        source: 'In-app Comment',
        region: 'Berlin',
        text: 'First-time setup finally feels clear and fast.',
        time: '1d ago',
      },
      {
        author: 'Niko',
        source: 'In-app Comment',
        region: 'Toronto',
        text: 'The progress tracker is what kept me moving.',
        time: '1d ago',
      },
    ],
  },
  {
    id: 'dark-mode-demand',
    title: 'Dark mode requests accelerating (+24%)',
    source: 'Community Forum',
    sentiment: 'neutral',
    region: 'North America',
    quotes: [
      'Need dark mode for long analysis sessions.',
      'Current bright theme is difficult during night shifts.',
      'Would adopt this immediately if dark mode shipped.',
    ],
    explanation:
      'Usage logs indicate a growing segment of users working outside standard hours. The current visual contrast profile causes fatigue for prolonged review sessions.',
    action:
      'Prioritize dark-mode token design in the next sprint and run a beta with power users in support and product ops teams.',
    priority: 'Neutral',
    rawVoice: [
      {
        author: 'Nate_H',
        source: 'Forum',
        region: 'Chicago',
        text: 'I love the insights but avoid using it at night due to brightness.',
        time: '6h ago',
      },
      {
        author: 'Priya K.',
        source: 'Forum',
        region: 'Austin',
        text: 'A dark theme would make daily monitoring much easier.',
        time: '9h ago',
      },
    ],
  },
  {
    id: 'pricing-clarity',
    title: 'Pricing clarity issues delaying upgrades (+19%)',
    source: 'Sales Call Notes',
    sentiment: 'negative',
    region: 'EMEA',
    quotes: [
      'Not sure which tier unlocks export automation.',
      'Pricing page feels unclear for multi-team rollout.',
      'Need clearer ROI framing before we expand seats.',
    ],
    explanation:
      'Prospective buyers are unclear about feature-to-tier mapping and expected ROI at each plan level, creating friction in procurement discussions.',
    action:
      'Publish a simplified plan comparison with feature outcomes and provide a guided pricing assistant for enterprise buyers.',
    priority: 'Critical',
    rawVoice: [
      {
        author: 'Sales - EMEA',
        source: 'Call Summary',
        region: 'London',
        text: 'Buyer asked three times which plan includes workflow automation.',
        time: '3h ago',
      },
      {
        author: 'Arnaud',
        source: 'Call Summary',
        region: 'Paris',
        text: 'Cost is acceptable, but packaging is hard to understand.',
        time: '7h ago',
      },
    ],
  },
];

const sentimentDonutData: SentimentSlice[] = [
  { name: 'Positive', value: 34, color: '#6d28d9' },
  { name: 'Negative', value: 44, color: '#8b5cf6' },
  { name: 'Neutral', value: 22, color: '#c4b5fd' },
];

const topIssueThemes: ThemeItem[] = [
  {
    id: 'performance',
    label: 'Performance',
    share: 32,
    details:
      'Performance concerns are concentrated around query latency and report rendering delays during peak usage hours.',
    relatedInsightIds: ['latency-apac'],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    share: 21,
    details:
      'Mid-market teams are hesitating to expand due to unclear feature packaging across plans.',
    relatedInsightIds: ['pricing-clarity'],
  },
  {
    id: 'feature-requests',
    label: 'Feature Requests',
    share: 18,
    details:
      'The most requested capability is dark mode, especially among teams operating late shifts.',
    relatedInsightIds: ['dark-mode-demand'],
  },
];

const rawVoiceGroups: RawVoiceGroup[] = insightFeedData.map((insight) => ({
  insightId: insight.id,
  insightTitle: insight.title,
  entries: insight.rawVoice,
}));

function Dashboard({ onLogout, LogoGlobe, accountStorageKey }: { onLogout: () => void, LogoGlobe: any, accountStorageKey: string }) {
  const { tab = 'home' } = useParams();
  const activeTab = tab === 'home' || tab === 'integrations' || tab === 'recents' ? tab : null;
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isRecentsHydrated, setIsRecentsHydrated] = useState(false);
  const [latestSearchResult, setLatestSearchResult] = useState<RAGSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchTakingLong, setIsSearchTakingLong] = useState(false);
  const [revealedFeedStep, setRevealedFeedStep] = useState(0);
  const recentsStorageKey = `${RECENT_SEARCHES_STORAGE_PREFIX}:${accountStorageKey}`;

  useEffect(() => {
    setIsRecentsHydrated(false);
    const storedRecents = localStorage.getItem(recentsStorageKey);
    if (!storedRecents) {
      setRecentSearches([]);
      setIsRecentsHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(storedRecents) as unknown;
      if (Array.isArray(parsed)) {
        setRecentSearches(
          parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 8),
        );
      } else {
        setRecentSearches([]);
      }
    } catch {
      setRecentSearches([]);
    } finally {
      setIsRecentsHydrated(true);
    }
  }, [recentsStorageKey]);

  useEffect(() => {
    if (!isRecentsHydrated) {
      return;
    }

    localStorage.setItem(recentsStorageKey, JSON.stringify(recentSearches));
  }, [isRecentsHydrated, recentSearches, recentsStorageKey]);

  useEffect(() => {
    if (!latestSearchResult || isSearching || searchError) {
      setRevealedFeedStep(0);
      return;
    }

    setRevealedFeedStep(0);
    const maxPointCount = Math.max(
      latestSearchResult.positives.length,
      latestSearchResult.negatives.length,
      latestSearchResult.suggestions.length,
    );
    if (maxPointCount === 0) {
      return;
    }

    const revealIntervalId = window.setInterval(() => {
      setRevealedFeedStep((previousStep) => {
        if (previousStep >= maxPointCount) {
          window.clearInterval(revealIntervalId);
          return previousStep;
        }
        return previousStep + 1;
      });
    }, 300);

    return () => {
      window.clearInterval(revealIntervalId);
    };
  }, [latestSearchResult, isSearching, searchError]);

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = searchQuery.trim();
    if (!normalizedQuery) {
      return;
    }

    setHasSearched(true);
    setIsSearching(true);
    setIsSearchTakingLong(false);
    setSearchError(null);
    const waitHintTimerId = window.setTimeout(() => {
      setIsSearchTakingLong(true);
    }, 10_000);

    try {
      const response = await authFetch('/rag/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ search: normalizedQuery }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setSearchError(errorText || 'Search failed. Please try again.');
        return;
      }

      const ragResult = (await response.json()) as Partial<RAGSearchResponse>;
      setLatestSearchResult({
        search: typeof ragResult.search === 'string' && ragResult.search.trim() ? ragResult.search : normalizedQuery,
        positives: Array.isArray(ragResult.positives) ? ragResult.positives.map(normalizePoint).filter((item): item is RAGPoint => item !== null) : [],
        negatives: Array.isArray(ragResult.negatives) ? ragResult.negatives.map(normalizePoint).filter((item): item is RAGPoint => item !== null) : [],
        suggestions: Array.isArray(ragResult.suggestions) ? ragResult.suggestions.map(normalizeSuggestion).filter((item): item is RAGSuggestion => item !== null) : [],
      });
      setRecentSearches((previousSearches) => [
        normalizedQuery,
        ...previousSearches.filter((item) => item.toLowerCase() !== normalizedQuery.toLowerCase()),
      ].slice(0, 8));
      setSearchQuery('');
    } catch (error) {
      console.error('Search request failed', error);
      setSearchError('Unable to reach the server. Please try again.');
    } finally {
      window.clearTimeout(waitHintTimerId);
      setIsSearchTakingLong(false);
      setIsSearching(false);
    }
  };

  if (!activeTab) {
    return <Navigate to="/dashboard/home" replace />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-[#f6f2ff] text-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="h-20 px-8 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <LogoGlobe className="w-8 h-8" />
              <span className="text-xl font-bold tracking-[0.2em] uppercase font-headline">Noesis</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-1 ml-8">
              <NavItem 
                icon={<Home size={18} />} 
                label="Home" 
                to="/dashboard/home"
              />
              <NavItem 
                icon={<Cpu size={18} />} 
                label="Integrations" 
                to="/dashboard/integrations"
              />
              <NavItem 
                icon={<Clock size={18} />} 
                label="Recents" 
                to="/dashboard/recents"
              />
            </nav>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative text-slate-500 hover:text-slate-900 transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#6d28d9] rounded-full"></span>
            </button>
            
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold">Editorial Admin</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Enterprise Tier</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c4b5fd] to-[#6d28d9] flex items-center justify-center font-bold text-white text-sm">
                EA
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <motion.main 
        key={activeTab}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 flex flex-col overflow-hidden"
      >
        {activeTab === 'home' ? (
          <div className="p-8 overflow-y-auto flex flex-col items-center">
            <motion.div variants={itemVariants} className="mb-8 text-center">
              <h1 className="text-3xl font-headline font-bold mb-2">Search</h1>
              <p className="text-slate-600">Find what you need quickly from your workspace.</p>
            </motion.div>

            <motion.form variants={itemVariants} className="max-w-3xl w-full" onSubmit={handleSearchSubmit}>
              <div className="group rounded-2xl p-[2px] bg-gradient-to-r from-fuchsia-400 via-violet-500 to-cyan-400 transition-all duration-300 hover:scale-[1.01]">
                <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Search className="text-violet-500" size={18} />
                  <input
                    type="text"
                    placeholder="search for your product"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </motion.form>

            {hasSearched && (
              <motion.div variants={itemVariants} className="mt-8 max-w-3xl w-full">
                <div className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-headline font-bold text-center">Search Feed</h2>
                  {isSearching ? (
                    <div className="mt-6 flex flex-col items-center">
                      <div className="h-7 w-7 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin"></div>
                      <p className="mt-3 text-sm text-slate-600">Fetching insights...</p>
                      {isSearchTakingLong && (
                        <p className="mt-2 text-xs text-slate-500">This is taking longer than usual. Please wait a bit longer.</p>
                      )}
                    </div>
                  ) : searchError ? (
                    <p className="mt-4 text-sm text-rose-600 text-center">{searchError}</p>
                  ) : latestSearchResult ? (
                    <div className="mt-6 space-y-6">
                      <div className="text-center text-sm text-slate-600">
                        Feed for <span className="font-semibold text-slate-900">"{latestSearchResult.search}"</span>
                      </div>
                      <div className="flex flex-col gap-4">
                        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                          <div className="flex items-center gap-2 text-sm font-bold text-violet-800 uppercase tracking-widest">
                            <ArrowUpRight size={16} />
                            Positive
                          </div>
                          <div className="mt-3 space-y-3">
                            {latestSearchResult.positives.slice(0, revealedFeedStep).map((point, index) => (
                              <motion.article
                                key={`${point.title}-${index}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className="rounded-lg border border-violet-100 bg-white p-3"
                              >
                                <h3 className="text-sm font-semibold text-slate-900">{point.title}</h3>
                                <p className="mt-1 text-sm text-slate-700">{point.details}</p>
                                {point.evidence.length > 0 && (
                                  <p className="mt-2 text-xs text-slate-500">{point.evidence[0]}</p>
                                )}
                              </motion.article>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                          <div className="flex items-center gap-2 text-sm font-bold text-rose-800 uppercase tracking-widest">
                            <ArrowDownRight size={16} />
                            Negative
                          </div>
                          <div className="mt-3 space-y-3">
                            {latestSearchResult.negatives.slice(0, revealedFeedStep).map((point, index) => (
                              <motion.article
                                key={`${point.title}-${index}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className="rounded-lg border border-rose-100 bg-white p-3"
                              >
                                <h3 className="text-sm font-semibold text-slate-900">{point.title}</h3>
                                <p className="mt-1 text-sm text-slate-700">{point.details}</p>
                                {point.evidence.length > 0 && (
                                  <p className="mt-2 text-xs text-slate-500">{point.evidence[0]}</p>
                                )}
                              </motion.article>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 uppercase tracking-widest">
                            <CheckCircle2 size={16} />
                            Suggestions
                          </div>
                          <div className="mt-3 space-y-3">
                            {latestSearchResult.suggestions.slice(0, revealedFeedStep).map((suggestion, index) => (
                              <motion.article
                                key={`${suggestion.title}-${index}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className="rounded-lg border border-emerald-100 bg-white p-3"
                              >
                                <h3 className="text-sm font-semibold text-slate-900">{suggestion.title}</h3>
                                <p className="mt-1 text-sm text-slate-700">{suggestion.details}</p>
                                {suggestion.technical_actions.length > 0 && (
                                  <p className="mt-2 text-xs text-emerald-700">
                                    Action: {suggestion.technical_actions[0]}
                                  </p>
                                )}
                              </motion.article>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600 text-center">Submit a search to generate a feed.</p>
                  )}
                </div>
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="mt-10 max-w-3xl w-full">
              <div className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-headline font-bold mb-4 text-center">Recent Searches</h2>
                {recentSearches.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">No searches saved for this account yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentSearches.map((search) => (
                      <div
                        key={search}
                        className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 text-center hover:border-violet-300 hover:bg-violet-50/50 transition-colors"
                      >
                        {search}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        ) : activeTab === 'integrations' ? (
          <div className="p-8 space-y-8 overflow-y-auto">
            <motion.div variants={itemVariants}>
              <h1 className="text-3xl font-headline font-bold mb-2">Data Integrations</h1>
              <p className="text-slate-600">Connect to global social platforms and community forums to ingest raw sentiment data.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <motion.div variants={itemVariants}>
                <IntegrationCard 
                  name="Reddit" 
                  description="Ingest discussions from subreddits and community threads in real-time."
                  icon={<MessageCircle className="text-[#ff4500]" />}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <IntegrationCard 
                  name="Twitter / X" 
                  description="Monitor global trends and real-time public sentiment via the X API."
                  icon={<Twitter className="text-[#1da1f2]" />}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <IntegrationCard 
                  name="Community Forums" 
                  description="Connect to specialized forums (vBulletin, XenForo) via custom scrapers."
                  icon={<Users className="text-[#6d28d9]" />}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <IntegrationCard 
                  name="Discord" 
                  description="Analyze sentiment within private and public community servers."
                  icon={<Hash className="text-[#5865f2]" />}
                />
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center flex-1 text-center">
            <Clock size={48} className="text-slate-400 mb-4" />
            <h2 className="text-xl font-bold text-slate-500">No Recent Activity</h2>
            <p className="text-slate-600 mt-2">Your recent analysis reports will appear here.</p>
          </div>
        )}
      </motion.main>
    </div>
  );
}

function NavItem({ icon, label, to }: { icon: React.ReactNode, label: string, to: string }) {
  return (
      <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${isActive ? 'bg-[#6d28d9]/10 text-[#6d28d9]' : 'text-slate-600 hover:text-slate-900 hover:bg-violet-50'}`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function IntegrationCard({ name, description, icon }: { name: string, description: string, icon: any }) {
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl hover:border-[#6d28d9]/30 transition-all group h-full flex flex-col shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div>
            <div className="font-bold text-lg">{name}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest">Data Source</div>
          </div>
        </div>
      </div>
      
      <p className="text-sm text-slate-600 mb-6 leading-relaxed flex-1">
        {description}
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-slate-600 mb-2 font-bold">API Access Key</label>
          <div className="relative">
            <input 
              type="password" 
              placeholder="Enter credentials..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg py-3 px-4 text-sm text-slate-900 focus:ring-1 focus:ring-[#6d28d9]/30 outline-none transition-all placeholder:text-slate-400"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#6d28d9] uppercase tracking-widest hover:brightness-125">
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummarySection({ bullets }: { bullets: string[] }) {
  return (
    <section className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-headline font-bold">AI Summary</h2>
      <ul className="mt-4 space-y-3">
        {bullets.map((point) => (
          <li key={point} className="flex items-start gap-3 text-sm text-slate-700">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#6d28d9]"></span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function InsightCard({ insight }: { insight: InsightFeedItem }) {
  const priorityClasses: Record<InsightPriority, string> = {
    Critical: 'bg-rose-50 text-rose-700 border-rose-200',
    Positive: 'bg-violet-50 text-violet-700 border-violet-200',
    Neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sentimentClasses: Record<InsightSentiment, string> = {
    negative: 'bg-rose-50 text-rose-700 border-rose-200',
    positive: 'bg-violet-50 text-violet-700 border-violet-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <article className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-headline font-bold text-slate-900">{insight.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider">
            <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
              Source: {insight.source}
            </span>
            <span className={`px-2.5 py-1 rounded-full border ${sentimentClasses[insight.sentiment]}`}>
              Sentiment: {insight.sentiment}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Region: {insight.region}
            </span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border ${priorityClasses[insight.priority]}`}>
          {insight.priority}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Key user quotes</p>
        <div className="mt-3 space-y-2">
          {insight.quotes.map((quote) => (
            <div key={quote} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              "{quote}"
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Why this is happening</p>
          <p className="text-sm text-slate-700 leading-relaxed">{insight.explanation}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-700 mb-2">Recommended action</p>
          <p className="text-sm text-violet-900 leading-relaxed font-semibold">{insight.action}</p>
        </div>
      </div>
    </article>
  );
}

function SentimentDonut({ data }: { data: SentimentSlice[] }) {
  return (
    <section className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-headline font-bold">Sentiment Distribution</h3>
      <div className="h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={66}
              outerRadius={94}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {data.map((slice) => (
          <div key={slice.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }}></span>
              {slice.name}
            </div>
            <span className="font-semibold text-slate-900">{slice.value}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ThemeList({ themes, insights }: { themes: ThemeItem[]; insights: InsightFeedItem[] }) {
  const [expandedTheme, setExpandedTheme] = useState<string | null>(themes[0]?.id ?? null);

  return (
    <section className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-headline font-bold">Top Issues</h3>
      <div className="mt-4 divide-y divide-violet-100">
        {themes.map((theme) => {
          const isExpanded = expandedTheme === theme.id;
          const relatedInsights = insights.filter((insight) => theme.relatedInsightIds.includes(insight.id));

          return (
            <div key={theme.id} className="py-3">
              <button
                type="button"
                onClick={() => setExpandedTheme(isExpanded ? null : theme.id)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <p className="font-semibold text-slate-900">{theme.label}</p>
                  <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">{theme.share}% of discussed issues</p>
                </div>
                <ChevronRight
                  size={16}
                  className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>

              {isExpanded && (
                <div className="mt-3 pl-1">
                  <p className="text-sm text-slate-700">{theme.details}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {relatedInsights.map((insight) => (
                      <span key={insight.id} className="text-xs px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                        {insight.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function UserQuotes({ groups }: { groups: RawVoiceGroup[] }) {
  return (
    <section className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-headline font-bold">Raw User Voice</h3>
      <p className="text-sm text-slate-600 mt-1">Direct user evidence grouped under each insight.</p>
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <article key={group.insightId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-900">{group.insightTitle}</h4>
            <div className="mt-3 space-y-2">
              {group.entries.map((entry, index) => (
                <div key={`${entry.author}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm text-slate-700">"{entry.text}"</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {entry.author} • {entry.source} • {entry.region} • {entry.time}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
