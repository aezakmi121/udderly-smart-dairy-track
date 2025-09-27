import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight, AlertTriangle, Heart, Syringe, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCowDate } from '@/lib/pdUtils';

interface NotificationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    priority: string;
  } | null;
}

export const NotificationDetailsModal = ({ open, onOpenChange, notification }: NotificationDetailsModalProps) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'delivery_due':
        return <AlertTriangle className="h-6 w-6 text-orange-600" />;
      case 'pd_due':
        return <Heart className="h-6 w-6 text-blue-600" />;
      case 'vaccination_due':
        return <Syringe className="h-6 w-6 text-green-600" />;
      case 'low_stock':
        return <Package className="h-6 w-6 text-red-600" />;
      default:
        return <Calendar className="h-6 w-6 text-gray-600" />;
    }
  };

  const getNavigationPath = (type: string) => {
    switch (type) {
      case 'delivery_due':
      case 'pd_due':
        return '/ai-tracking';
      case 'vaccination_due':
        return '/vaccinations';
      case 'low_stock':
        return '/feed-management';
      default:
        return '/dashboard';
    }
  };

  const renderDetails = () => {
    if (!notification.data) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No additional details available.</p>
          </CardContent>
        </Card>
      );
    }

    switch (notification.type) {
      case 'delivery_due':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expected Deliveries</CardTitle>
                <CardDescription>
                  Cows expected to deliver in the next few days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notification.data.cows?.map((cow: any) => (
                    <div key={cow.cow_no} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Cow #{cow.cow_no}</p>
                        <p className="text-sm text-muted-foreground">
                          Expected: {formatCowDate(cow.expected_delivery)}
                        </p>
                      </div>
                      <Badge variant={cow.days_remaining <= 3 ? "destructive" : "secondary"}>
                        {cow.days_remaining} days
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'pd_due':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">PD Checks Due</CardTitle>
                <CardDescription>
                  Cows requiring pregnancy diagnosis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notification.data.cows?.map((cow: any) => (
                    <div key={cow.cow_no} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Cow #{cow.cow_no}</p>
                        <p className="text-sm text-muted-foreground">
                          AI Date: {formatCowDate(cow.ai_date)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Service #{cow.service_no}
                        </p>
                      </div>
                      <Badge variant={cow.overdue ? "destructive" : "secondary"}>
                        {cow.overdue ? 'Overdue' : 'Due Soon'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'vaccination_due':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vaccinations Due</CardTitle>
                <CardDescription>
                  Cows requiring vaccination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notification.data.cows?.map((cow: any) => (
                    <div key={cow.cow_no} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Cow #{cow.cow_no}</p>
                        <p className="text-sm text-muted-foreground">
                          Vaccine: {cow.vaccine_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Due: {formatCowDate(cow.due_date)}
                        </p>
                      </div>
                      <Badge variant={cow.overdue ? "destructive" : "secondary"}>
                        {cow.overdue ? 'Overdue' : 'Due'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'low_stock':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Low Stock Items</CardTitle>
                <CardDescription>
                  Feed items running low
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notification.data.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Current: {item.current_stock} {item.unit}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Minimum: {item.minimum_stock_level} {item.unit}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        Low Stock
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Details not available for this notification type.</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon(notification.type)}
            <div>
              <DialogTitle>{notification.title}</DialogTitle>
              <DialogDescription>{notification.message}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {renderDetails()}
          
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => {
                navigate(getNavigationPath(notification.type));
                onOpenChange(false);
              }}
              className="flex items-center gap-2"
            >
              Go to {notification.type === 'delivery_due' || notification.type === 'pd_due' ? 'AI Tracking' : 
                     notification.type === 'vaccination_due' ? 'Vaccinations' : 
                     notification.type === 'low_stock' ? 'Feed Management' : 'Dashboard'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};