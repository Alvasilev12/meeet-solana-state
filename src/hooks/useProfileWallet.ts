import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the current user's saved wallet address from their profile.
 * Use in any form that needs a Solana wallet address pre-filled.
 */
export function useProfileWallet() {
  const { user } = useAuth();

  const { data: walletAddress, isLoading } = useQuery({
    queryKey: ["profile-wallet", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.wallet_address ?? null;
    },
  });

  return { walletAddress, isLoading };
}
