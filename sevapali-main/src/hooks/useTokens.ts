import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { getLocalDateString } from '@/lib/utils';

export type Token = Database['public']['Tables']['tokens']['Row'];

// Hook for citizens to fetch their tokens
export const useMyTokens = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-tokens', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (error) throw error;
      return data as Token[];
    },
    enabled: !!user?.id,
  });
};

// Hook for officials to fetch all tokens (for queue management)
export const useQueueTokens = (officeId?: string, departmentId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['queue-tokens', officeId, departmentId],
    queryFn: async () => {
      const today = getLocalDateString();
      console.log('Fetching tokens for:', { today, officeId, departmentId });

      let query = supabase
        .from('tokens')
        .select('*')
        .in('status', ['waiting', 'serving', 'pending', 'checked_in', 'cancelled'])
        .eq('appointment_date', today)
        .order('created_at', { ascending: true });

      if (officeId) {
        query = query.eq('office_id', officeId);
      }
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching tokens:', error);
        throw error;
      }
      console.log('Fetched tokens:', data);
      return data as Token[];
    },
    enabled: enabled,
  });
};

// Hook to get today's stats for officials
export const useTodayStats = () => {
  return useQuery({
    queryKey: ['today-stats'],
    queryFn: async () => {
      const today = getLocalDateString();

      const { data, error } = await supabase
        .from('tokens')
        .select('status')
        .eq('appointment_date', today);

      if (error) throw error;

      const tokens = data || [];
      return {
        total: tokens.length,
        served: tokens.filter(t => t.status === 'completed').length,
        waiting: tokens.filter(t => t.status === 'waiting' || t.status === 'pending').length,
        serving: tokens.filter(t => t.status === 'serving').length,
      };
    },
  });
};

// Hook for booking a token
export const useBookToken = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenData: {
      office_id: string; // UUID
      office_name: string;
      service_name: string; // We store Name as per schema
      department: string;
      department_id?: string; // New field
      appointment_date: string;
      appointment_time: string;
      document_urls?: Record<string, string>;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const dateStr = tokenData.appointment_date.replace(/-/g, '').slice(2); // YYMMDD
      const randomSeq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const generatedTokenNumber = `JS-${dateStr}-${randomSeq}`;

      const { data, error } = await supabase
        .from('tokens')
        .insert({
          user_id: user.id,
          office_id: tokenData.office_id,
          office_name: tokenData.office_name,
          service_name: tokenData.service_name,
          department: tokenData.department,
          department_id: tokenData.department_id, // Insert into DB
          appointment_date: tokenData.appointment_date,
          appointment_time: tokenData.appointment_time,
          token_number: generatedTokenNumber,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tokens'] });
    },
  });
};

// Hook for canceling a token (citizen)
export const useCancelToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('tokens')
        .update({ status: 'cancelled' })
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tokens'] });
    },
  });
};

// Hook for officials to update token status
export const useUpdateTokenStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ tokenId, status }: { tokenId: string; status: string }) => {
      const updateData: any = { status };

      if (status === 'completed' || status === 'skipped') {
        updateData.served_at = new Date().toISOString();
        updateData.served_by = user?.id;
      }

      const { error } = await supabase
        .from('tokens')
        .update(updateData)
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
    },
  });
};

// Hook for officials to check-in a token (QR Scan)
export const useCheckInToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenId: string) => {
      // 1. Verify token exists and is pending
      const { data: token, error: fetchError } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();

      if (fetchError) throw new Error('Token not found');

      // If already waiting or serving, treat as success (idempotent)
      if (token.status === 'waiting' || token.status === 'serving' || token.status === 'checked_in') {
        return token as Token;
      }

      if (token.status !== 'pending') throw new Error(`Token is already ${token.status}`);

      // 2. Validate date (simple check)
      const today = getLocalDateString();
      if (token.appointment_date !== today) throw new Error('Token is not for today');

      // 3. Update status to checked_in (arrived but not verified)
      const { data, error } = await supabase
        .from('tokens')
        .update({
          status: 'waiting', // Direct to queue
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenId)
        .select()
        .eq('id', tokenId)
        .select();

      if (error) throw error;

      const updatedToken = data && data.length > 0 ? data[0] : null;

      if (!updatedToken) {
        // If update succeeded but returned no data (RLS?), we might just return the optimistic token or refetch.
        // But usually this means row not found or permission denied.
        console.warn("Check-in update returned no data. Possible RLS issue.");
      }
      return updatedToken as Token;
    },
    onSuccess: () => {
      toast.success('Citizen Checked-In Successfully');
      queryClient.invalidateQueries({ queryKey: ['queue-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Check-in failed');
    }
  });
};

// Hook for officials to call next token
export const useCallNextToken = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // First complete current serving token
      const { data: currentServing } = await supabase
        .from('tokens')
        .select('id')
        .eq('status', 'serving')
        .maybeSingle(); // Use maybeSingle to avoid error if none serving

      if (currentServing) {
        await supabase
          .from('tokens')
          .update({
            status: 'completed',
            served_at: new Date().toISOString(),
            served_by: user?.id,
          })
          .eq('id', currentServing.id);
      }

      // Get next WAITING token
      const { data: nextToken, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('status', 'waiting')
        .eq('appointment_date', getLocalDateString())
        .order('created_at', { ascending: true }) // FIFO
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (nextToken) {
        const { data: updatedToken, error: updateError } = await supabase
          .from('tokens')
          .update({
            status: 'serving',
            served_by: user?.id
          })
          .eq('id', nextToken.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return updatedToken as Token;
      }

      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
    },
  });
};

// Hook for skipping a token (smart re-queue)
export const useSkipToken = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenId: string) => {
      // 1. Get current waiting queue to find 5th position
      const today = getLocalDateString();
      const { data: queue } = await supabase
        .from('tokens')
        .select('created_at')
        .eq('status', 'waiting')
        .eq('appointment_date', today)
        .order('created_at', { ascending: true })
        .limit(6); // Fetch 6 to see if there is a 5th item

      let newCreatedAt = new Date().toISOString();

      // If we have at least 5 people waiting, insert after the 5th
      if (queue && queue.length >= 5) {
        const targetToken = queue[4]; // 5th item (0-indexed)
        if (targetToken) {
          const targetTime = new Date(targetToken.created_at).getTime();
          newCreatedAt = new Date(targetTime + 1000).toISOString(); // +1 second
        }
      }

      const { error } = await supabase
        .from('tokens')
        .update({
          status: 'waiting',
          created_at: newCreatedAt, // Move to back/middle
          served_by: null,
          served_at: null
        })
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.info('Token skipped and re-queued');
      queryClient.invalidateQueries({ queryKey: ['queue-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
    },
    onError: () => {
      toast.error('Failed to skip token');
    }
  });
};

// Hook for officials to verify documents and add to queue
export const useVerifyDocuments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tokenId, verified }: { tokenId: string; verified: boolean }) => {
      if (!verified) throw new Error('Verification failed');

      const { data, error } = await supabase
        .from('tokens')
        .update({
          status: 'waiting', // Move to queue
        })
        .eq('id', tokenId)
        .select()
        .single();

      if (error) throw error;
      return data as Token;
    },
    onSuccess: () => {
      toast.success('Documents Verified & Token Added to Queue');
      queryClient.invalidateQueries({ queryKey: ['queue-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Verification failed');
    }
  });
};
