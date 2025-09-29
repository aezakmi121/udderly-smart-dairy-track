import React from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps extends ButtonProps {
  animation?: 'bounce' | 'pulse' | 'scale' | 'shake' | 'glow';
  loading?: boolean;
  success?: boolean;
  haptic?: boolean;
}

const animations = {
  bounce: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
  },
  pulse: {
    animate: { scale: [1, 1.02, 1] },
    transition: { duration: 2, repeat: Infinity },
  },
  scale: {
    whileHover: { scale: 1.1 },
    whileTap: { scale: 0.9 },
  },
  shake: {
    animate: { x: [-2, 2, -2, 2, 0] },
    transition: { duration: 0.5 },
  },
  glow: {
    whileHover: {
      boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)",
      transition: { duration: 0.3 },
    },
  },
};

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  className,
  animation = 'bounce',
  loading = false,
  success = false,
  haptic = false,
  onClick,
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onClick?.(e);
  };

  const motionProps = animations[animation] || animations.bounce;

  return (
    <motion.div
      {...motionProps}
      className="inline-block"
    >
      <Button
        className={cn(
          'relative overflow-hidden transition-all duration-300',
          loading && 'cursor-not-allowed',
          success && 'bg-green-600 hover:bg-green-700',
          className
        )}
        onClick={handleClick}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <motion.div
            className="absolute inset-0 bg-current opacity-20"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
        
        <motion.div
          animate={loading ? { opacity: 0.6 } : { opacity: 1 }}
          className="relative z-10 flex items-center gap-2"
        >
          {loading && (
            <motion.div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          )}
          {children}
        </motion.div>
      </Button>
    </motion.div>
  );
};