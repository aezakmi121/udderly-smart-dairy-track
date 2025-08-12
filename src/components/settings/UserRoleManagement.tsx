import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { UserPlus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
}

 type AppRole = 'admin' | 'worker' | 'farmer' | 'store_manager' | 'delivery_boy';
 
 export const UserRoleManagement = () => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('farmer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { isAdmin } = useUserPermissions();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // Fetch all users with their roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Get user emails from auth.users (this requires admin access)
      const userIds = profiles.map(p => p.id);
      const usersWithRoles: UserWithRoles[] = [];

      for (const profile of profiles) {
        const roles = userRoles
          .filter(ur => ur.user_id === profile.id)
          .map(ur => ur.role);
        
        usersWithRoles.push({
          id: profile.id,
          email: 'Email hidden for security',
          full_name: profile.full_name || 'Unknown',
          roles
        });
      }

      return usersWithRoles;
    },
    enabled: isAdmin,
  });

  const existingUsers = users.filter((u) => u.roles.length > 0);
  const pendingUsers = users.filter((u) => u.roles.length === 0);
  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user.id)
        .single();

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email,
          role,
          inviterName: profile?.full_name || user.user.email || 'Admin',
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setSuccess('Invitation sent successfully! User will receive an email with signup instructions.');
      setInviteEmail('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to send invitation');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Insert the new role FIRST to avoid losing admin during self-updates
      const insertRes = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });
      if (insertRes.error) throw insertRes.error;

      // Then remove all other roles for that user
      const deleteRes = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .neq('role', newRole);
      if (deleteRes.error) throw deleteRes.error;
    },
    onSuccess: () => {
      setSuccess('User role updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update user role');
    }
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (currentUserId && userId === currentUserId) {
        throw new Error("You can't remove your own admin access.");
      }
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSuccess('User deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to delete user');
    }
  });

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await inviteUserMutation.mutateAsync({ email: inviteEmail, role: inviteRole });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">You don't have permission to manage user roles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Existing Users</CardTitle>
            <CardDescription>
              Manage roles for existing users. Pending approvals are shown below.
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading users...</p>
          ) : (
            <div className="space-y-4">
              {existingUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium">{user.full_name}</h4>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                      {user.roles.length === 0 ? (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Pending approval</span>
                      ) : (
                        user.roles.map((role) => (
                          <span
                            key={role}
                            className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded"
                          >
                            {role === 'worker' ? 'Farm Worker' : role === 'farmer' ? 'Collection Centre' : 'Admin'}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0">
                    <Select
                      value={user.roles[0] || ''}
                      onValueChange={(newRole) => {
                        const role = newRole as AppRole;
                        const isSelf = currentUserId === user.id;
                        const msg = isSelf && role !== 'admin'
                          ? `You are changing your own role to "${role}". You will lose admin access. Continue?`
                          : `Assign role "${role}" to ${user.full_name}?`;
                        if (window.confirm(msg)) {
                          updateRoleMutation.mutate({ userId: user.id, newRole: role });
                        }
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Assign role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="worker">Farm Worker</SelectItem>
                        <SelectItem value="farmer">Collection Centre</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={currentUserId === user.id}
                          title={currentUserId === user.id ? "You can't remove yourself" : undefined}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove user access?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the user’s roles. You can re-assign them later if needed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeUserMutation.mutate(user.id)}>
                            Confirm
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              
              {existingUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No users found
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>New signups awaiting role assignment.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium">{user.full_name}</h4>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Pending approval</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Select
                      value=""
                      onValueChange={(newRole) => {
                        const role = newRole as AppRole;
                        if (window.confirm(`Assign role "${role}" to ${user.full_name}?`)) {
                          updateRoleMutation.mutate({ userId: user.id, newRole: role });
                        }
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Assign role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="worker">Farm Worker</SelectItem>
                        <SelectItem value="farmer">Collection Centre</SelectItem>
                      </SelectContent>
                    </Select>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={currentUserId === user.id}
                          title={currentUserId === user.id ? "You can't remove yourself" : undefined}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete pending user?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the user and their profile.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeUserMutation.mutate(user.id)}>
                            Confirm
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};