import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onComplete?: (value: string) => void;
}

const LENGTH = 4;

/**
 * Four digit entry, shown as four boxes.
 *
 * A single text field with a numeric keyboard would be less code, but the boxes
 * tell a first-time user how many digits are wanted without anyone reading a
 * word -- which is the whole design brief for these screens. The real input is
 * kept transparent on top so the phone's own numeric keypad still opens.
 */
export const PinPad: React.FC<PinPadProps> = ({
  value,
  onChange,
  label,
  autoFocus,
  disabled,
  onComplete,
}) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, LENGTH);
    onChange(digits);
    if (digits.length === LENGTH) onComplete?.(digits);
  };

  return (
    <div>
      <div className="mb-2 text-center text-base font-medium">{label}</div>
      <div className="relative">
        <div className="flex justify-center gap-3">
          {Array.from({ length: LENGTH }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex h-14 w-12 items-center justify-center rounded-xl border-2 bg-card text-2xl font-bold',
                value.length === i ? 'border-primary' : 'border-input',
                disabled && 'opacity-50'
              )}
            >
              {value[i] ? '•' : ''}
            </div>
          ))}
        </div>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          value={value}
          disabled={disabled}
          onChange={(e) => handle(e.target.value)}
        />
      </div>
    </div>
  );
};
