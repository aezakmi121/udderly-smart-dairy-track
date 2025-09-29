import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'default' | 'circular' | 'rectangular' | 'text';
  animation?: 'pulse' | 'wave' | 'shimmer';
  lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  variant = 'default',
  animation = 'shimmer',
  lines = 1,
}) => {
  const baseClasses = 'bg-muted rounded animate-pulse';
  
  const variantClasses = {
    default: 'h-4 w-full',
    circular: 'h-12 w-12 rounded-full',
    rectangular: 'h-32 w-full',
    text: 'h-4',
  };

  const animationVariants = {
    pulse: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        repeat: Infinity,
      }
    },
    wave: {
      x: ['-100%', '100%'],
      transition: {
        duration: 2,
        repeat: Infinity,
      }
    },
    shimmer: {
      backgroundPosition: ['200% 0', '-200% 0'],
      transition: {
        duration: 2,
        repeat: Infinity,
      }
    }
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <motion.div
            key={index}
            className={cn(
              baseClasses,
              variantClasses.text,
              index === lines - 1 && 'w-3/4', // Last line shorter
              className
            )}
            animate={animationVariants[animation]}
            style={{
              background: animation === 'shimmer' 
                ? 'linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.1) 50%, hsl(var(--muted)) 75%)'
                : undefined,
              backgroundSize: animation === 'shimmer' ? '200% 100%' : undefined,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(baseClasses, variantClasses[variant], className)}
      animate={animationVariants[animation]}
      style={{
        background: animation === 'shimmer' 
          ? 'linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.1) 50%, hsl(var(--muted)) 75%)'
          : undefined,
        backgroundSize: animation === 'shimmer' ? '200% 100%' : undefined,
      }}
    />
  );
};