import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Build the app user object from a Supabase session ──────────────────────
  const hydrateUser = useCallback(async (session) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, subscription_type, subscription_end_date, enterprise_config, user_type')
      .eq('id', session.user.id)
      .single();

    const userType = profile?.user_type ?? 'user';
    const elevated = ['super_admin','admin','technical_support','clerk','assistant','finance'];

    setUser({
      id:                    session.user.id,
      email:                 session.user.email,
      accessToken:           session.access_token,
      username:              profile?.username ?? session.user.email.split('@')[0],
      subscription_type:     profile?.subscription_type ?? 'free',
      subscription_end_date: profile?.subscription_end_date ?? null,
      enterprise_config:     profile?.enterprise_config ?? null,
      user_type:             userType,
      // ── Role flags ─────────────────────────────────────────────────────────
      isSuperAdmin:          userType === 'super_admin',
      isAdmin:               userType === 'admin' || userType === 'super_admin',
      isTechnicalSupport:    userType === 'technical_support',
      isClerk:               userType === 'clerk',
      isAssistant:           userType === 'assistant',
      isFinance:             userType === 'finance',
      isStaff:               elevated.includes(userType),
      isClient:              userType === 'user',
    });
    setLoading(false);
  }, []);

  // ── Session bootstrap ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) hydrateUser(session);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) hydrateUser(session);
      else { setUser(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, [hydrateUser]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    if (!supabase) return { success: false, error: 'Database not configured.' };
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      const msg = error.message?.toLowerCase?.() ?? '';
      if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('email not confirmed')) {
        return { success: false, error: 'Incorrect email or password. Please try again.' };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async (username, email, password) => {
    if (!supabase) return { success: false, error: 'Database not configured.' };
    setLoading(true);

    const attemptSignUp = (uname) =>
      supabase.auth.signUp({
        email,
        password,
        options: { data: { username: uname }, emailRedirectTo: undefined },
      });

    let { data: signUpData, error: signUpError } = await attemptSignUp(username);

    // Trigger failure is usually a username unique-constraint collision.
    // Retry once with a short random suffix to resolve it.
    if (signUpError) {
      const msg = signUpError.message?.toLowerCase?.() ?? '';
      const isDbTriggerError =
        msg.includes('database error') ||
        msg.includes('saving new user') ||
        msg.includes('register new user') ||
        msg.includes('failed to create');
      if (isDbTriggerError) {
        const suffix = Math.random().toString(36).slice(2, 6);
        const { data: retryData, error: retryError } = await attemptSignUp(`${username}_${suffix}`);
        if (!retryError) {
          signUpData  = retryData;
          signUpError = null;
        }
      }
    }

    if (signUpError) {
      setLoading(false);
      const msg = signUpError.message?.toLowerCase?.() ?? '';
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
        return { success: false, error: 'An account with this email already exists. Please log in instead.' };
      }
      return { success: false, error: signUpError.message };
    }

    // Case 1: Supabase returned a session immediately (email confirmation disabled)
    if (signUpData.session) {
      await hydrateUser(signUpData.session);
      return {
        success:     true,
        userId:      signUpData.user.id,
        email:       signUpData.user.email,
        accessToken: signUpData.session.access_token,
      };
    }

    // Case 2: No session yet — try signing in directly (works when email confirm is off)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInError && signInData.session) {
      await hydrateUser(signInData.session);
      return {
        success:     true,
        userId:      signInData.user.id,
        email:       signInData.user.email,
        accessToken: signInData.session.access_token,
      };
    }

    // Account created but auto-login failed (email confirm may be on in Supabase dashboard)
    setLoading(false);
    return { success: false, error: 'Account created but could not sign you in automatically. Please disable email confirmation in Supabase, or log in manually.' };
  };

  // ── Refresh profile from DB (call after payment activation) ───────────────
  const refreshProfile = async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await hydrateUser(session);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await supabase?.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, refreshProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
