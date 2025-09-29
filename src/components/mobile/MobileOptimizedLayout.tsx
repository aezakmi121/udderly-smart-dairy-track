import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MobileOptimizedLayoutProps {
  children: React.ReactNode;
  className?: string;
  enableSafeArea?: boolean;
  fullHeight?: boolean;
}

export const MobileOptimizedLayout: React.FC<MobileOptimizedLayoutProps> = ({
  children,
  className,
  enableSafeArea = true,
  fullHeight = false
}) => {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'w-full',
        fullHeight && 'min-h-screen',
        isMobile && enableSafeArea && 'pb-safe-area-bottom pt-safe-area-top',
        isMobile ? 'px-4' : 'px-6',
        className
      )}
    >
      {children}
    </div>
  );
};

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className,
  padding = 'md',
  shadow = true
}) => {
  const isMobile = useIsMobile();
  
  const paddingClasses = {
    sm: isMobile ? 'p-3' : 'p-4',
    md: isMobile ? 'p-4' : 'p-6',
    lg: isMobile ? 'p-6' : 'p-8'
  };

  return (
    <div
      className={cn(
        'bg-background border rounded-lg',
        shadow && 'shadow-sm',
        paddingClasses[padding],
        isMobile && 'touch-manipulation',
        className
      )}
    >
      {children}
    </div>
  );
};

interface MobileButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
}

export const MobileButtonGroup: React.FC<MobileButtonGroupProps> = ({
  children,
  className,
  direction = 'horizontal',
  spacing = 'md'
}) => {
  const isMobile = useIsMobile();
  
  const spacingClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3'
  };

  const directionClasses = {
    horizontal: isMobile ? 'flex-col' : 'flex-row',
    vertical: 'flex-col'
  };

  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        spacingClasses[spacing],
        className
      )}
    >
      {children}
    </div>
  );
};

interface MobileTextProps {
  children: React.ReactNode;
  variant?: 'heading' | 'subheading' | 'body' | 'caption';
  className?: string;
}

export const MobileText: React.FC<MobileTextProps> = ({
  children,
  variant = 'body',
  className
}) => {
  const isMobile = useIsMobile();

  const variantClasses = {
    heading: isMobile ? 'text-xl font-bold' : 'text-2xl font-bold',
    subheading: isMobile ? 'text-lg font-semibold' : 'text-xl font-semibold',
    body: isMobile ? 'text-sm' : 'text-base',
    caption: isMobile ? 'text-xs' : 'text-sm'
  };

  return (
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  );
};