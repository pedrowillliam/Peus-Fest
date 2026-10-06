import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

// true se este aparelho tem login de admin (feito em /admin). Só decide o que mostrar:
// quem bloqueia de verdade é o RLS no banco.
export function useIsAdmin(client: SupabaseClient): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    client.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id;
      if (!userId) return;
      const { data: row } = await client.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
      if (active) setIsAdmin(!!row);
    });
    return () => {
      active = false;
    };
  }, [client]);

  return isAdmin;
}
