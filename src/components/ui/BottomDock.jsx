import { motion } from 'framer-motion';

export default function BottomDock({ actions = [] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="dock"
    >
      {actions.map((a, i) => (
        <button key={i} className="dock-btn" onClick={a.onClick}>
          {a.icon}
          <span>{a.label}</span>
        </button>
      ))}
    </motion.div>
  );
}
