
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchemeManagement } from './scheme/SchemeManagement';

export const MilkSchemeSettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active Schemes</CardTitle>
        </CardHeader>
        <CardContent>
          <SchemeManagement />
        </CardContent>
      </Card>
    </div>
  );
};
