
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MilkRateSettings } from './MilkRateSettings';
import { AccessControlSettings } from './AccessControlSettings';
import { UserRoleManagement } from './UserRoleManagement';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { SessionUnlock } from './SessionUnlock';
import { AlertSettings } from './AlertSettings';

export const SettingsManagement = () => {
  const { isAdmin } = useUserPermissions();
  const [openSections, setOpenSections] = useState({
    milkRates: false,
    milkingSessions: false,
    alerts: false,
    accessControl: false,
    userRoles: false,
  });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-600">Access Restricted</h2>
          <p className="text-gray-500 mt-2">You don't have permission to access settings.</p>
        </div>
      </div>
    );
  }

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure system settings and access controls.</p>
      </div>

      <div className="space-y-4">
        {/* Milk Rate Settings */}
        <Collapsible open={openSections.milkRates} onOpenChange={() => toggleSection('milkRates')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Milk Rate Settings</CardTitle>
                  {openSections.milkRates ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <MilkRateSettings />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Milking Session Controls */}
        <Collapsible open={openSections.milkingSessions} onOpenChange={() => toggleSection('milkingSessions')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Milking Session Controls</CardTitle>
                  {openSections.milkingSessions ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <SessionUnlock />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Alerts & Notifications Settings */}
        <Collapsible open={openSections.alerts} onOpenChange={() => toggleSection('alerts')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Alerts & Notifications</CardTitle>
                  {openSections.alerts ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <AlertSettings />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Access Control Settings */}
        <Collapsible open={openSections.accessControl} onOpenChange={() => toggleSection('accessControl')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Access Control</CardTitle>
                  {openSections.accessControl ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <AccessControlSettings />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* User Role Management */}
        <Collapsible open={openSections.userRoles} onOpenChange={() => toggleSection('userRoles')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">User Role Management</CardTitle>
                  {openSections.userRoles ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <UserRoleManagement />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
};
