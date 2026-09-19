import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  rightAction?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  backTo,
  rightAction,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'sticky top-0 z-20 bg-[--color-bg]/95 backdrop-blur-sm border-b border-[--color-border] px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3 max-w-2xl mx-auto lg:max-w-full">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="btn btn-ghost btn-sm p-2 -ml-2"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-xl text-[--color-text] leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-[--color-text-secondary] mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
      </div>
    </header>
  );
}
