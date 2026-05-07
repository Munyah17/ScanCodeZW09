import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  async function hydrateUser(session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, subscription_type, subscription_end_date, enterprise_config, user_type')
      .eq('id', session.user.id)
      .single();

    setUser({
      id:                    session.user.id,
      email:                 session.user.email,
      accessToken:           session.access_token,
      username:              profile?.username ?? session.user.email.split('@')[0],
      subscription_type:     profile?.subscription_type ?? 'starter',
      subscription_end_date: profile?.subscription_end_date ?? null,
      enterprise_config:     profile?.enterprise_config ?? null,
      user_type:             profile?.user_type ?? 'user',
    });
    setLoading(false);
  }

  const login = async (email, password) => {
    if (!supabase) return { success: false, error: 'Database not configured.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    await supabase?.auth.signOut();
    setUser(null);
  };

  const register = async (username, email, password) => {
    if (!supabase) return { success: false, error: 'Database not configured.' };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
