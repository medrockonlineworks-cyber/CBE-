import React from 'react';

export interface ServiceCardProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  layout?: 'horizontal' | 'vertical';
  onClick?: () => void;
  className?: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  id,
  title,
  subtitle,
  icon,
  iconBgColor,
  layout = 'vertical',
  onClick,
  className = '',
}) => {
  if (layout === 'horizontal') {
    return (
      <button
        id={`service-card-${id}`}
        onClick={onClick}
        className={`w-full min-h-[76px] bg-white rounded-2xl p-3 flex items-center gap-3 text-left shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100/70 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer group select-none ${className}`}
      >
        {/* Icon container */}
        <div 
          className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
            iconBgColor || 'bg-transparent text-[#6b1284]'
          }`}
        >
          {icon}
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-[13px] font-bold text-[#6b1284] leading-tight truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] sm:text-[11px] font-medium text-gray-400 mt-0.5 leading-tight truncate">
              {subtitle}
            </p>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      id={`service-card-${id}`}
      onClick={onClick}
      className={`w-full min-h-[105px] bg-white rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100/70 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer group select-none ${className}`}
    >
      {/* Icon container */}
      <div 
        className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-105 ${
          iconBgColor || 'bg-transparent text-[#6b1284]'
        }`}
      >
        {icon}
      </div>

      {/* Main Title */}
      <h3 className="text-xs sm:text-[13px] font-bold text-[#6b1284] leading-tight">
        {title}
      </h3>

      {/* Optional Subtitle */}
      {subtitle && (
        <p className="text-[10px] sm:text-[11px] font-medium text-gray-400 mt-0.5 leading-none">
          {subtitle}
        </p>
      )}
    </button>
  );
};

export default ServiceCard;
