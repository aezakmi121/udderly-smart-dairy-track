import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, UserPlus, Settings, Truck, Store } from 'lucide-react';
import { RoleManagement } from './RoleManagement';

export const AccessControlSettings = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          phone_number,
          role,
          created_at
        `)
        .order('created_at', { ascending: false });
      
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'farmer':
        return 'secondary';
      case 'worker':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'farmer':
        return 'Collection Centre';
      case 'worker':
        return 'Farm Worker';
      default:
        return 'No Role';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter(user => user.roles.includes('admin' as any)).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Full system access</p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Farm Workers</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter(user => user.roles.includes('worker' as any)).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Farm operations access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Centre</CardTitle>
            <Settings className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter(user => user.roles.includes('farmer' as any)).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Collection access</p>
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Roles & Permissions</CardTitle>
            <RoleManagement />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading users...</div>
          ) : users?.length === 0 ? (
            <div className="text-center py-4">No users found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Access Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.phone_number || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.roles.length > 0 ? (
                          user.roles.map((role: string) => (
                            <Badge key={role} variant={getRoleBadgeVariant(role)}>
                              {getRoleDisplayName(role)}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">No Roles</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.roles.includes('admin' as any) && 'Full Access'}
                      {user.roles.includes('worker' as any) && !user.roles.includes('admin' as any) && 'Farm Operations'}
                      {user.roles.includes('farmer' as any) && !user.roles.includes('admin' as any) && !user.roles.includes('worker' as any) && 'Collection Operations'}
                      {user.roles.length === 0 && 'Limited Access'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-red-600 mb-2">Admin</h4>
                <ul className="text-sm space-y-1">
                  <li>• Full system access</li>
                  <li>• User management</li>
                  <li>• Settings configuration</li>
                  <li>• All farm operations</li>
                  
                  <li>• Reports & analytics</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-green-600 mb-2">Farm Worker</h4>
                <ul className="text-sm space-y-1">
                  <li>• Cows & Calves management</li>
                  <li>• Milk production records</li>
                  <li>• Vaccination tracking</li>
                  <li>• Weight logs</li>
                  <li>• AI tracking</li>
                  <li>• Feed management</li>
                  <li>• Cow grouping</li>
                  <li>• Analytics access</li>
                </ul>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-purple-600 mb-2">Collection Centre</h4>
                <ul className="text-sm space-y-1">
                  <li>• Add farmers (no edit/delete)</li>
                  <li>• View farmers list</li>
                  <li>• Add milk collections</li>
                  <li>• View collection records</li>
                  <li>• Limited reporting</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
