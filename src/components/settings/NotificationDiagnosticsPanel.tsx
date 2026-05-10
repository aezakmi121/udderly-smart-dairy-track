import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, RefreshCw, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

type EventRow = {
  id: string;
  user_id: string | null;
  subscription_endpoint_hash: string | null;
  event_type: string;
  payload_tag: string | null;
  status: string | null;
  error_code: number | null;
  source: string | null;
  created_at: string;
  meta: any;
};

type SubRow = {
  id: string;
  endpoint: string;
  user_agent: string | null;
  created_at: string;
};

export const NotificationDiagnosticsPanel = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: ev }, { data: sb }] = await Promise.all([
        supabase
          .from('notification_events' as any)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('push_subscriptions')
          .select('id, endpoint, user_agent, created_at')
          .order('created_at', { ascending: false }),
      ]);
      setEvents((ev as any) || []);
      setSubs((sb as any) || []);
    } catch (e: any) {
      toast({ title: 'Failed to load diagnostics', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Triple-fire detection: same payload_tag with >1 dispatch_ok in 24h
  const tripleFires = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      if (e.event_type !== 'dispatch_ok' || !e.payload_tag) continue;
      map.set(e.payload_tag, (map.get(e.payload_tag) || 0) + 1);
    }
    return Array.from(map.entries()).filter(([, n]) => n > 1);
  }, [events]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of events) c[e.event_type] = (c[e.event_type] || 0) + 1;
    return c;
  }, [events]);

  const sendTest = async (endpoint?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const tag = `diagnostic_test_${Date.now()}`;
      const { data, error } = await supabase.functions.invoke('send-web-push', {
        body: {
          title: '🧪 Diagnostic Test',
          body: endpoint ? 'Test to this device' : 'Test to all your devices',
          userId: user.id,
          data: { type: 'test', tag },
        },
      });
      if (error) throw error;
      toast({ title: 'Test dispatched', description: `Sent to ${data?.sent ?? 0} device(s).` });
      setTimeout(load, 1500);
    } catch (e: any) {
      toast({ title: 'Test failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Notification Diagnostics
        </h4>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {tripleFires.length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Duplicate dispatch detected</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                {tripleFires.slice(0, 5).map(([tag, n]) => (
                  <li key={tag}><code>{tag}</code> sent {n}× — investigate cron/idempotency</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {['dispatch_ok', 'dispatch_fail', 'sw_received', 'sw_clicked'].map((k) => (
          <Card key={k}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{k.replace(/_/g, ' ')}</p>
              <p className="text-xl font-semibold">{counts[k] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Registered Devices ({subs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {subs.length === 0 && (
            <p className="text-xs text-muted-foreground">No devices registered. Click Enable above on each device.</p>
          )}
          {subs.map((s) => (
            <div key={s.id} className="flex items-start justify-between text-xs border rounded p-2">
              <div className="min-w-0 flex-1">
                <p className="font-mono truncate">…{s.endpoint.slice(-20)}</p>
                <p className="text-muted-foreground truncate">{s.user_agent || 'unknown agent'}</p>
                <p className="text-muted-foreground">
                  registered {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          <Button onClick={() => sendTest()} size="sm" variant="outline" className="w-full">
            Send Test To All My Devices
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Events (last 100)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-80 overflow-auto">
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground">No events yet.</p>
          )}
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-xs border-b last:border-0 py-1">
              <Badge
                variant={
                  e.event_type.includes('fail') || e.event_type.includes('expired')
                    ? 'destructive'
                    : e.event_type.includes('skipped')
                    ? 'secondary'
                    : 'default'
                }
                className="text-[10px]"
              >
                {e.event_type}
              </Badge>
              <span className="font-mono truncate flex-1">{e.payload_tag || e.source}</span>
              {e.error_code && <span className="text-destructive">{e.error_code}</span>}
              <span className="text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
