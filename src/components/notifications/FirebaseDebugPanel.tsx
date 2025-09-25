import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { firebaseConfig, vapidKey } from '@/config/firebase';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const FirebaseDebugPanel = () => {
  const [firebaseKeyInput, setFirebaseKeyInput] = useState('');
  const { toast } = useToast();

  const handleFirebaseKeyUpdate = async () => {
    try {
      // Validate JSON
      JSON.parse(firebaseKeyInput);
      toast({
        title: "Firebase Key Update",
        description: "Click the button below to securely update your Firebase service account key.",
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter a valid JSON service account key.",
        variant: "destructive",
      });
    }
  };
  const checkConfig = () => {
    const issues = [];
    
    if (firebaseConfig.apiKey === "YOUR_ACTUAL_API_KEY") {
      issues.push("API Key is placeholder");
    }
    
    if (firebaseConfig.projectId === "your-actual-project-id") {
      issues.push("Project ID is placeholder");
    }
    
    if (vapidKey.includes("YOUR_ACTUAL") || vapidKey.length < 50) {
      issues.push("VAPID Key appears to be placeholder or invalid");
    }
    
    return issues;
  };

  const testServiceWorker = async () => {
    try {
      console.log('Testing service worker registration...');
      
      if (!('serviceWorker' in navigator)) {
        console.error('Service Worker not supported');
        return false;
      }
      
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Firebase SW registered successfully:', registration);
      
      // Test if it's active
      if (registration.active) {
        console.log('Firebase SW is active');
        return true;
      } else {
        console.log('Firebase SW registered but not active yet');
        return false;
      }
    } catch (error) {
      console.error('Firebase SW registration failed:', error);
      return false;
    }
  };

  const testNotificationPermission = () => {
    console.log('Current notification permission:', Notification.permission);
    return Notification.permission;
  };

  const runDiagnostics = async () => {
    console.log('=== Firebase Push Notification Diagnostics ===');
    
    console.log('1. Configuration Check:');
    console.log('Firebase Config:', firebaseConfig);
    console.log('VAPID Key:', vapidKey);
    
    const configIssues = checkConfig();
    if (configIssues.length > 0) {
      console.log('❌ Configuration Issues:', configIssues);
    } else {
      console.log('✅ Configuration looks good');
    }
    
    console.log('2. Service Worker Test:');
    const swWorking = await testServiceWorker();
    console.log(swWorking ? '✅ Service Worker OK' : '❌ Service Worker Issues');
    
    console.log('3. Permission Check:');
    const permission = testNotificationPermission();
    console.log(`Permission status: ${permission}`);
    
    console.log('4. Browser Support:');
    console.log('Service Worker support:', 'serviceWorker' in navigator);
    console.log('Notification support:', 'Notification' in window);
    console.log('Push Manager support:', 'PushManager' in window);
    
    console.log('=== End Diagnostics ===');
  };

  const issues = checkConfig();
  const hasIssues = issues.length > 0;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasIssues ? (
            <AlertCircle className="h-5 w-5 text-orange-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          Firebase Configuration Debug
        </CardTitle>
        <CardDescription>
          Diagnostic information for push notification setup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Configuration Status</h4>
          {hasIssues ? (
            <div className="space-y-1">
              {issues.map((issue, index) => (
                <div key={index} className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">{issue}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">All configuration values set</span>
            </div>
          )}
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-medium mb-2">Current Config Values</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Project ID:</span>{' '}
              <Badge variant="outline">{firebaseConfig.projectId}</Badge>
            </div>
            <div>
              <span className="font-medium">Auth Domain:</span>{' '}
              <Badge variant="outline">{firebaseConfig.authDomain}</Badge>
            </div>
            <div>
              <span className="font-medium">Sender ID:</span>{' '}
              <Badge variant="outline">{firebaseConfig.messagingSenderId}</Badge>
            </div>
            <div>
              <span className="font-medium">VAPID Key:</span>{' '}
              <Badge variant="outline">{vapidKey.substring(0, 20)}...</Badge>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium">Update Firebase Service Account Key</h4>
          <div className="space-y-2">
            <label htmlFor="firebase-key" className="text-sm font-medium">
              Paste your new Firebase service account JSON key:
            </label>
            <textarea
              id="firebase-key"
              placeholder="Paste the entire JSON content from your Firebase service account key file here..."
              className="w-full h-32 p-2 text-xs font-mono border rounded-md resize-vertical"
              onChange={(e) => setFirebaseKeyInput(e.target.value)}
              value={firebaseKeyInput}
            />
            <Button 
              onClick={handleFirebaseKeyUpdate}
              disabled={!firebaseKeyInput.trim()}
              className="w-full"
            >
              Validate and Update Firebase Key
            </Button>
          </div>
        </div>
        
        <Separator />
        
        <Button onClick={runDiagnostics} className="w-full">
          Run Complete Diagnostics (Check Console)
        </Button>
        
        <div className="text-xs text-muted-foreground">
          <p><strong>Note:</strong> The "Registration failed - push service error" usually means:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Firebase project doesn't have Cloud Messaging enabled</li>
            <li>VAPID key doesn't match the Firebase project</li>
            <li>Service account permissions are insufficient</li>
            <li>Browser is blocking Firebase's push service</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};