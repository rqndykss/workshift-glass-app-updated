'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/shared/lib/cn'

export function MotionButton({ className, children, ...props }: HTMLMotionProps<'button'>) {
  return (
    <motion.button
      whileHover={{ scale: 1.018 }}
      whileTap={{ scale: 0.975 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={cn('rounded-2xl', className)}
      {...props}
    >
      {children}
    </motion.button>
  )
}
