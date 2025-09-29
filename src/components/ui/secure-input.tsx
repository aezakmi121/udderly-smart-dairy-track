import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  maskTimeout?: number;
  preventClipboard?: boolean;
  showStrengthMeter?: boolean;
  onStrengthChange?: (strength: number) => void;
}

export const SecureInput: React.FC<SecureInputProps> = ({
  className,
  type = 'password',
  value,
  onChange,
  maskTimeout = 3000,
  preventClipboard = true,
  showStrengthMeter = false,
  onStrengthChange,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [strength, setStrength] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  const calculateStrength = (password: string): number => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;
    return Math.min(score, 100);
  };

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
    
    if (!isVisible && maskTimeout > 0) {
      // Auto-hide after timeout
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, maskTimeout);
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (showStrengthMeter) {
      const newStrength = calculateStrength(newValue);
      setStrength(newStrength);
      onStrengthChange?.(newStrength);
    }
    
    onChange?.(e);
  };

  const handleClipboard = (e: React.ClipboardEvent) => {
    if (preventClipboard && type === 'password') {
      e.preventDefault();
      return false;
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getStrengthColor = (strength: number) => {
    if (strength < 25) return 'bg-destructive';
    if (strength < 50) return 'bg-orange-500';
    if (strength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength < 25) return 'Weak';
    if (strength < 50) return 'Fair';
    if (strength < 75) return 'Good';
    return 'Strong';
  };

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          type={isVisible ? 'text' : type}
          value={value}
          onChange={handleInputChange}
          onCopy={handleClipboard}
          onCut={handleClipboard}
          onPaste={handleClipboard}
          className={cn('pr-20', className)}
          {...props}
        />
        
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {type === 'password' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-transparent"
              onClick={handleToggleVisibility}
              tabIndex={-1}
            >
              {isVisible ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          )}
          
          {preventClipboard && (
            <Shield className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {showStrengthMeter && type === 'password' && value && (
        <div className="space-y-1">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                getStrengthColor(strength)
              )}
              style={{ width: `${strength}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Password strength: {getStrengthText(strength)}</span>
            <span>{strength}%</span>
          </p>
        </div>
      )}
    </div>
  );
};