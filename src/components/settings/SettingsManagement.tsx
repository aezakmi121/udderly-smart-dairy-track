import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Milk, Bell, Users, Shield, Printer } from 'lucide-react';
import { MilkRateSettings } from './MilkRateSettings';
import { SpeciesDetectionSettings } from './SpeciesDetectionSettings';
import { AccessControlSettings } from './AccessControlSettings';
import { UserRoleManagement } from './UserRoleManagement';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { SessionUnlock } from './SessionUnlock';
import { AlertSettings } from './AlertSettings';
import { MilkingSessionSettings } from './MilkingSessionSettings';
import { FCMPushTest } from './ExpoPushTest';
import { PrinterSettings } from './PrinterSettings';

export const SettingsManagement = () => {
  const { isAdmin } = useUserPermissions();
  const [openSections, setOpenSections] = useState({
    milkingSettings: false,
    notificationSettings: false,
    systemSettings: false,
    userManagement: false,
    printerSettings: false,
  });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-muted-foreground">Access Restricted</h2>
          <p className="text-muted-foreground mt-2">You don't have permission to access settings.</p>
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
        {/* Milking & Production Settings */}
        <Collapsible open={openSections.milkingSettings} onOpenChange={() => toggleSection('milkingSettings')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Milk className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Milking & Production</CardTitle>
                  </div>
                  {openSections.milkingSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-md font-semibold mb-3">Milk Rates</h3>
                  <MilkRateSettings />
                </div>
                <div className="border-t pt-6">
                  <h3 className="text-md font-semibold mb-3">Species Detection</h3>
                  <SpeciesDetectionSettings />
                </div>
                <div className="border-t pt-6">
                  <h3 className="text-md font-semibold mb-3">Session Controls</h3>
                  <SessionUnlock />
                </div>
                <div className="border-t pt-6">
                  <h3 className="text-md font-semibold mb-3">Session Settings</h3>
                  <MilkingSessionSettings />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Printer Settings */}
        <Collapsible open={openSections.printerSettings} onOpenChange={() => toggleSection('printerSettings')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Printer className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Thermal Printer</CardTitle>
                  </div>
                  {openSections.printerSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <PrinterSettings />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Notifications & Alerts */}
        <Collapsible open={openSections.notificationSettings} onOpenChange={() => toggleSection('notificationSettings')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Notifications & Alerts</CardTitle>
                  </div>
                  {openSections.notificationSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-md font-semibold mb-3">FCM Push Notifications Test</h3>
                  <FCMPushTest />
                </div>
                <div className="border-t pt-6">
                  <h3 className="text-md font-semibold mb-3">Alert Settings</h3>
                  <AlertSettings />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* System & Access Control */}
        <Collapsible open={openSections.systemSettings} onOpenChange={() => toggleSection('systemSettings')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">System & Security</CardTitle>
                  </div>
                  {openSections.systemSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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

        {/* User Management */}
        <Collapsible open={openSections.userManagement} onOpenChange={() => toggleSection('userManagement')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">User Management</CardTitle>
                  </div>
                  {openSections.userManagement ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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