
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useCowGrouping = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cow groups
  const { data: cowGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['cow-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cow_groups')
        .select('*')
        .eq('is_active', true)
        .order('group_name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch group assignments with cow and group details
  const { data: groupAssignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['cow-group-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cow_group_assignments')
        .select(`
          *,
          cows!cow_id (cow_number, status),
          cow_groups!group_id (group_name, description)
        `)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch grouping settings
  const { data: groupingSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['grouping-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grouping_settings')
        .select('*')
        .eq('is_active', true)
        .order('setting_name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch cows with their current milk production for grouping recommendations
  const { data: cowsForGrouping, isLoading: cowsLoading } = useQuery({
    queryKey: ['cows-for-grouping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select(`
          *,
          milk_production!cow_id (
            quantity,
            production_date,
            session
          )
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    }
  });

  // Create cow group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      const { data, error } = await supabase
        .from('cow_groups')
        .insert(groupData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cow-groups'] });
      toast({ title: "Cow group created successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create cow group", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Assign cow to group mutation
  const assignCowToGroupMutation = useMutation({
    mutationFn: async ({ cowId, groupId }: { cowId: string; groupId: string }) => {
      // First, deactivate any existing assignments for this cow
      await supabase
        .from('cow_group_assignments')
        .update({ is_active: false })
        .eq('cow_id', cowId)
        .eq('is_active', true);

      // Then create new assignment
      const { data, error } = await supabase
        .from('cow_group_assignments')
        .insert({
          cow_id: cowId,
          group_id: groupId,
          assigned_by_user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cow-group-assignments'] });
      toast({ title: "Cow assigned to group successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to assign cow to group", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Update grouping settings mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ settingName, settingValue }: { settingName: string; settingValue: any }) => {
      const { data, error } = await supabase
        .from('grouping_settings')
        .upsert({
          setting_name: settingName,
          setting_value: settingValue,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grouping-settings'] });
      toast({ title: "Settings updated successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update settings", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    cowGroups,
    groupAssignments,
    groupingSettings,
    cowsForGrouping,
    isLoading: groupsLoading || assignmentsLoading || settingsLoading || cowsLoading,
    createGroupMutation,
    assignCowToGroupMutation,
    updateSettingMutation
  };
};
