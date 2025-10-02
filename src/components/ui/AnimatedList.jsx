import { AnimatePresence, motion } from 'framer-motion';

export default function AnimatedList({ items, renderItem, getKey }) {
  return (
    <div>
      <AnimatePresence initial={false}>
        {items.map((it, idx) => (
          <motion.div
            key={getKey ? getKey(it, idx) : idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderItem(it, idx)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
