import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({ children, className, padding = 'md', hover = false }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-slate-200 shadow-sm',
        paddings[padding],
        hover && 'transition-shadow hover:shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple';
}

export function StatCard({ title, value, icon, trend, color = 'blue' }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    gray: 'bg-slate-50 text-slate-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
          
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={clsx(
                  'text-sm font-medium',
                  trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-xs text-slate-500">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div className={clsx('p-3 rounded-lg', colors[color])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

