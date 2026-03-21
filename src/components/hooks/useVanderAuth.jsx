import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function useVanderAuth() {
  const [user, setUser] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          setIsLoading(false);
          return;
        }
        const me = await base44.auth.me();
        setUser(me);
        setHasAccess(me.role === 'admin' || me.has_access === true);
      } catch (_e) {}
      setIsLoading(false);
    };
    check();
  }, []);

  return { user, hasAccess, isLoading };
}