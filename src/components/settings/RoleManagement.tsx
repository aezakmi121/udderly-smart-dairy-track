
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

type UserRole = 'admin' | 'farmer' | 'worker' | 'delivery_boy' | 'store_manager';

const roleLabels = {
  admin: 'Admin',
  farmer: 'Collection Centre',
  worker: 'Farm Worker',
  delivery_boy: 'Delivery Boy',
  store_manager: 'Store Manager'
};

export const RoleManagement = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ['all-users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      return profiles?.map(profile => ({
        ...profile,
        roles: userRoles?.filter(ur => ur.user_id === profile.id).map(ur => ur.role) || []
      })) || [];
    }
  });

  const assignRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: UserRole[] }) => {
      // First, remove all existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;

      // Then add the new roles
      if (roles.length > 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(
            roles.map(role => ({
              user_id: userId,
              role: role,
              assigned_by: (await supabase.auth.getUser()).data.user?.id
            }))
          );
        
        if (insertError) throw insertError;
      }

      // Update the profiles table with the primary role (first one)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: roles[0] || 'worker' })
        .eq('id', userId);
      
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast({ title: "Roles assigned successfully!" });
      setIsOpen(false);
      setSelectedUser('');
      setSelectedRoles([]);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to assign roles", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleRoleToggle = (role: UserRole, checked: boolean) => {
    if (checked) {
      setSelectedRoles(prev => [...prev, role]);
    } else {
      setSelectedRoles(prev => prev.filter(r => r !== role));
    }
  };

  const handleAssignRoles = () => {
    if (selectedUser && selectedRoles.length > 0) {
      assignRolesMutation.mutate({ userId: selectedUser, roles: selectedRoles });
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    const user = users?.find(u => u.id === userId);
    setSelectedRoles(user?.roles || []);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Manage Roles
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign User Roles</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="user-select">Select User</Label>
            <Select onValueChange={handleUserSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.roles.length ? user.roles.map(r => roleLabels[r as UserRole]).join(', ') : 'No roles'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Select Roles (multiple allowed)</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {Object.entries(roleLabels).map(([role, label]) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={role}
                    checked={selectedRoles.includes(role as UserRole)}
                    onCheckedChange={(checked) => handleRoleToggle(role as UserRole, checked as boolean)}
                  />
                  <Label htmlFor={role} className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignRoles}
              disabled={!selectedUser || selectedRoles.length === 0 || assignRolesMutation.isPending}
            >
              {assignRolesMutation.isPending ? 'Assigning...' : 'Assign Roles'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
