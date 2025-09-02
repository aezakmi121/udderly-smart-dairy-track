import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail } from 'lucide-react';

export const AccessPendingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Access Pending</CardTitle>
          <CardDescription>
            Your account is being reviewed. Please wait for an administrator to assign you a role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Once your role is assigned, you'll have access to the appropriate features based on your permissions:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><strong>Admin:</strong> Full system access</li>
              <li><strong>Farm Worker:</strong> Cow, calf, milk, and feed management</li>
              <li><strong>Collection Centre:</strong> Milk collection management</li>
            </ul>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = 'mailto:admin@yourfarm.com?subject=Role Assignment Request'}
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact Administrator
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};