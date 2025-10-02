import { motion } from 'framer-motion';

export default function Lanyard({ title, subtitle, meta }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="lanyard"
    >
      <div className="lanyard-main">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="lanyard-meta">
        {meta?.map((m, i) => (
          <div key={i} className="lanyard-chip">
            <span>{m.label}</span>
            <strong>{m.value}</strong>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
