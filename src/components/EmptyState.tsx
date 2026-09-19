import { motion } from 'framer-motion';
import { PackageSearch } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}

export default function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
        {icon || <PackageSearch size={28} className="text-gray-400" />}
      </div>
      <h3 className="font-semibold text-[--color-text] mb-1">{title}</h3>
      {description && <p className="text-sm text-[--color-text-secondary] max-w-xs">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn btn-primary btn-sm mt-4">
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
