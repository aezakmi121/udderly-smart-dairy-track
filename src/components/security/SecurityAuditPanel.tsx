import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ShieldAlert, ShieldCheck, Eye, EyeOff, Lock, Users, Database, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityIssue {
  id: string;
  category: 'authentication' | 'authorization' | 'data_protection' | 'input_validation' | 'configuration';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation: string;
  component?: string;
  status: 'active' | 'resolved' | 'acknowledged';
}

export const SecurityAuditPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();

  // Security audit results
  const securityIssues: SecurityIssue[] = [
    {
      id: 'auth-001',
      category: 'authentication',
      severity: 'high',
      title: 'Password visibility toggle without secure handling',
      description: 'Password visibility toggle implementations should include additional security measures.',
      recommendation: 'Implement password masking timeout and secure clipboard handling.',
      component: 'AuthForm.tsx',
      status: 'active'
    },
    {
      id: 'input-001',
      category: 'input_validation',
      severity: 'medium',
      title: 'Input validation on client-side only',
      description: 'Some forms rely primarily on client-side validation without server-side verification.',
      recommendation: 'Implement server-side validation for all user inputs.',
      component: 'ExpenseForm.tsx, other forms',
      status: 'active'
    },
    {
      id: 'auth-002',
      category: 'authorization',
      severity: 'info',
      title: 'RLS policies properly implemented',
      description: 'Row Level Security policies are correctly implemented for data access control.',
      recommendation: 'Continue monitoring and testing RLS policies.',
      status: 'resolved'
    },
    {
      id: 'data-001',
      category: 'data_protection',
      severity: 'low',
      title: 'Console logging in production',
      description: 'Debug console logs may expose sensitive information in production.',
      recommendation: 'Remove or conditionally disable console logs in production.',
      component: 'NotificationDetailsModal.tsx, others',
      status: 'active'
    },
    {
      id: 'config-001',
      category: 'configuration',
      severity: 'medium',
      title: 'Missing security headers',
      description: 'Some security headers might not be configured properly.',
      recommendation: 'Implement CSP, HSTS, and other security headers.',
      status: 'active'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      case 'info': return 'outline';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication': return <Lock className="h-4 w-4" />;
      case 'authorization': return <Users className="h-4 w-4" />;
      case 'data_protection': return <Database className="h-4 w-4" />;
      case 'input_validation': return <Shield className="h-4 w-4" />;
      case 'configuration': return <Settings className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const filteredIssues = selectedCategory === 'all' 
    ? securityIssues 
    : securityIssues.filter(issue => issue.category === selectedCategory);

  const criticalCount = securityIssues.filter(i => i.severity === 'critical' && i.status === 'active').length;
  const highCount = securityIssues.filter(i => i.severity === 'high' && i.status === 'active').length;
  const activeCount = securityIssues.filter(i => i.status === 'active').length;

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 right-4 z-40 bg-background border shadow-lg"
      >
        <Shield className="h-4 w-4 mr-2" />
        Security Audit
      </Button>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-background border rounded-lg shadow-xl flex flex-col max-h-[80vh]">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Security Audit Report</h2>
          {activeCount > 0 && (
            <Badge variant={criticalCount > 0 ? 'destructive' : highCount > 0 ? 'default' : 'secondary'}>
              {activeCount} active issues
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
          <EyeOff className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-sm font-medium">Critical</div>
                  <div className="text-lg font-bold">{criticalCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-sm font-medium">High</div>
                  <div className="text-lg font-bold">{highCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium">Total</div>
                  <div className="text-lg font-bold">{securityIssues.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-sm font-medium">Resolved</div>
                  <div className="text-lg font-bold">{securityIssues.filter(i => i.status === 'resolved').length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All Issues
          </Button>
          {['authentication', 'authorization', 'data_protection', 'input_validation', 'configuration'].map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="flex items-center gap-1"
            >
              {getCategoryIcon(category)}
              {category.replace('_', ' ')}
            </Button>
          ))}
        </div>

        {/* Issues List */}
        <div className="space-y-3">
          {filteredIssues.map((issue) => (
            <Card key={issue.id} className={issue.status === 'resolved' ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(issue.category)}
                      <h3 className="font-medium">{issue.title}</h3>
                      <Badge variant={getSeverityColor(issue.severity) as any}>
                        {issue.severity}
                      </Badge>
                      {issue.status === 'resolved' && (
                        <Badge variant="outline" className="text-green-600">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {issue.description}
                    </p>
                    {issue.component && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Component: {issue.component}
                      </p>
                    )}
                    <Alert>
                      <AlertDescription className="text-sm">
                        <strong>Recommendation:</strong> {issue.recommendation}
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="p-4 border-t bg-muted/50">
        <p className="text-xs text-muted-foreground">
          This security audit is for informational purposes. Always conduct professional security testing before production deployment.
        </p>
      </div>
    </div>
  );
};