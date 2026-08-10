import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info } from 'lucide-react';
import { useAppSetting } from '@/hooks/useAppSettings';
import { useToast } from '@/hooks/use-toast';
import {
  BREEDING_SETTINGS_KEY,
  DEFAULT_BREEDING_SETTINGS,
  normaliseBreedingSettings,
  type BreedingSettings as Settings,
} from '@/lib/breedingSettings';

interface FieldProps {
  id: keyof Settings;
  label: string;
  help: string;
  value: number;
  onChange: (n: number) => void;
}

const Field: React.FC<FieldProps> = ({ id, label, help, value, onChange }) => (
  <div className="space-y-1">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-28"
    />
    <p className="text-xs text-muted-foreground">{help}</p>
  </div>
);

/**
 * The numbers the breeding board runs on.
 *
 * These were hardcoded in three places that disagreed: gestation was 285 when a
 * record was created and 283 in the alerts, and the PD window was fixed at
 * 45-60 while a `pd_alert_days` setting existed that nothing read. One place
 * now, and the board reads exactly what is set here.
 */
export const BreedingSettings: React.FC = () => {
  const { toast } = useToast();
  const stored = useAppSetting<Settings>(BREEDING_SETTINGS_KEY);
  const [draft, setDraft] = useState<Settings>(DEFAULT_BREEDING_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stored.value) setDraft(normaliseBreedingSettings(stored.value));
  }, [stored.value]);

  const set = (key: keyof Settings) => (n: number) => setDraft((d) => ({ ...d, [key]: n }));

  const save = async () => {
    setSaving(true);
    try {
      // Normalised on the way in, so a window that runs backwards is corrected
      // rather than saved and left to make cows disappear from both lists.
      const clean = normaliseBreedingSettings(draft);
      setDraft(clean);
      await stored.saveAsync(clean as any);
      toast({ title: 'Breeding settings saved' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Gestation defaults to <strong>285 days</strong>, which is this herd's own median across 16
          recorded calvings (range 272–296). Changing it only affects records created afterwards.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
        <Field
          id="gestationDays"
          label="Gestation (days)"
          help="Service to calving. Sets the expected date on new records."
          value={draft.gestationDays}
          onChange={set('gestationDays')}
        />
        <Field
          id="heatWatchFromDays"
          label="Watch for heat from"
          help="A cow that did not conceive returns to heat around day 21."
          value={draft.heatWatchFromDays}
          onChange={set('heatWatchFromDays')}
        />
        <Field
          id="heatWatchToDays"
          label="Watch for heat until"
          value={draft.heatWatchToDays}
          help="End of the return-to-heat window."
          onChange={set('heatWatchToDays')}
        />
        <Field
          id="pdDueFromDays"
          label="PD due from"
          help="Earliest a rectal palpation is reliable. Check with your vet before lowering."
          value={draft.pdDueFromDays}
          onChange={set('pdDueFromDays')}
        />
        <Field
          id="pdOverdueAfterDays"
          label="PD overdue after"
          help="Past this, an unchecked cow is losing cycles."
          value={draft.pdOverdueAfterDays}
          onChange={set('pdOverdueAfterDays')}
        />
        <Field
          id="dueToCalveWithinDays"
          label="Due to calve within"
          help="How far ahead a calving appears on the board."
          value={draft.dueToCalveWithinDays}
          onChange={set('dueToCalveWithinDays')}
        />
        <Field
          id="dryToMilkingDaysBefore"
          label="Move to milking before"
          help="Days before calving to move her out of the dry group."
          value={draft.dryToMilkingDaysBefore}
          onChange={set('dryToMilkingDaysBefore')}
        />
      </div>

      {draft.dryToMilkingDaysBefore <= draft.dueToCalveWithinDays && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            "Move to milking" is not further out than "due to calve", so the same cows will appear
            under both headings. Setting the move a week or more earlier keeps the two jobs apart.
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={save} disabled={saving || stored.isLoading}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save breeding settings
      </Button>
    </div>
  );
};
