import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Filter, Search, History, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useNotificationHistory } from '@/hooks/useNotificationHistory';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface NotificationHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationHistoryModal = ({ open, onOpenChange }: NotificationHistoryModalProps) => {
  const [days, setDays] = useState(30);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const { history, isLoading, updateStatus, snoozeNotification } = useNotificationHistory(days);

  const filteredHistory = history.filter(item => {
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'read' && item.status === 'read') ||
      (activeTab === 'snoozed' && item.status === 'snoozed') ||
      (activeTab === 'dismissed' && item.status === 'dismissed');
    
    return matchesSearch && matchesTab;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'snoozed':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <History className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'read':
        return <Badge variant="outline" className="text-green-600">Read</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="text-gray-600">Dismissed</Badge>;
      case 'snoozed':
        return <Badge variant="outline" className="text-orange-600">Snoozed</Badge>;
      default:
        return <Badge variant="outline" className="text-blue-600">Sent</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-orange-500 bg-orange-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            Loading notification history...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Notification History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="rounded border border-input bg-background px-3 py-1 text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              {filteredHistory.length} of {history.length} notifications
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">
                All ({history.length})
              </TabsTrigger>
              <TabsTrigger value="read">
                Read ({history.filter(h => h.status === 'read').length})
              </TabsTrigger>
              <TabsTrigger value="snoozed">
                Snoozed ({history.filter(h => h.status === 'snoozed').length})
              </TabsTrigger>
              <TabsTrigger value="dismissed">
                Dismissed ({history.filter(h => h.status === 'dismissed').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="h-[60vh]">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "p-4 rounded-lg border-l-4",
                          getPriorityColor(item.priority)
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex-shrink-0 mt-0.5">
                              {getStatusIcon(item.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">
                                  {item.title}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {item.priority}
                                </Badge>
                                {item.is_grouped && (
                                  <Badge variant="secondary" className="text-xs">
                                    Grouped
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {item.message}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  Created: {formatDateTime(item.created_at)}
                                </span>
                                {item.read_at && (
                                  <span>
                                    Read: {formatDateTime(item.read_at)}
                                  </span>
                                )}
                                {item.dismissed_at && (
                                  <span>
                                    Dismissed: {formatDateTime(item.dismissed_at)}
                                  </span>
                                )}
                                {item.snoozed_until && (
                                  <span>
                                    Snoozed until: {formatDateTime(item.snoozed_until)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(item.status)}
                            {item.status === 'snoozed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateStatus(item.id, 'sent')}
                              >
                                Unsnooze
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};