import React from 'react';
import { 
  Phone, 
  Wallet, 
  Building2,
  ShieldCheck,
  Store,
  Plane,
  ShoppingBag,
  Film,
  FileSpreadsheet
} from 'lucide-react';
import { MiniStatementIcon, OtherTransfersIcon, CbeBirrIcon } from './CbeCustomIcons';
import ServiceCard from './ServiceCard';

interface ServiceGridProps {
  onServiceSelect?: (serviceId: string) => void;
  className?: string;
}

export const ServiceGrid: React.FC<ServiceGridProps> = ({
  onServiceSelect,
  className = '',
}) => {
  return (
    <div className={`w-full max-w-md mx-auto px-4 relative select-none pb-8 ${className}`}>
      {/* 2-Column Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        
        {/* 1. CBE Transfer (Horizontal Layout with Soft Red/Coral Icon) */}
        <ServiceCard
          id="cbe-transfer"
          title="CBE Transfer"
          subtitle="Send Money"
          layout="horizontal"
          iconBgColor="bg-[#fbeeed]"
          icon={
            <svg 
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#eb4d4b]" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          }
          onClick={() => onServiceSelect?.('cbe-transfer')}
        />

        {/* 2. Receive (Horizontal Layout with Soft Mint Green Icon) */}
        <ServiceCard
          id="receive"
          title="Receive"
          subtitle="Get Paid"
          layout="horizontal"
          iconBgColor="bg-[#e6f7ef]"
          icon={
            <svg 
              className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#22c55e]" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="17" y1="7" x2="7" y2="17" />
              <polyline points="17 17 7 17 7 7" />
            </svg>
          }
          onClick={() => onServiceSelect?.('receive')}
        />

        {/* 3. Airtime */}
        <ServiceCard
          id="airtime"
          title="Airtime"
          layout="vertical"
          icon={<Phone className="w-6 h-6 text-[#70189F] fill-[#70189F] stroke-[2.2]" />}
          onClick={() => onServiceSelect?.('airtime')}
        />

        {/* 4. Other Transfers */}
        <ServiceCard
          id="other-transfers"
          title="Other Transfers"
          layout="vertical"
          icon={<OtherTransfersIcon size={25} color="#70189F" strokeWidth={2.4} />}
          onClick={() => onServiceSelect?.('other-transfers')}
        />

        {/* 5. CBEBirr */}
        <ServiceCard
          id="cbebirr"
          title="CBEBirr"
          layout="vertical"
          icon={<CbeBirrIcon size={26} color="#70189F" />}
          onClick={() => onServiceSelect?.('cbebirr')}
        />

        {/* 6. Bills & Utilities */}
        <ServiceCard
          id="bills-utilities"
          title="Bills & Utilities"
          layout="vertical"
          icon={<MiniStatementIcon size={26} color="#70189F" />}
          onClick={() => onServiceSelect?.('bills-utilities')}
        />

        {/* 7. Banking */}
        <ServiceCard
          id="banking"
          title="Banking"
          layout="vertical"
          icon={<Building2 className="w-6 h-6 text-[#6b1284] fill-[#6b1284]/15 stroke-[2.2]" />}
          onClick={() => onServiceSelect?.('banking')}
        />

        {/* 8. Government Services */}
        <ServiceCard
          id="government-services"
          title="Government Services"
          layout="vertical"
          icon={<ShieldCheck className="w-6 h-6 text-[#6b1284] stroke-[2.2]" />}
          onClick={() => onServiceSelect?.('government-services')}
        />

        {/* 9. Pay to Merchant */}
        <ServiceCard
          id="pay-merchant"
          title="Pay to Merchant"
          layout="vertical"
          icon={<Store className="w-6 h-6 text-[#6b1284] fill-[#6b1284]/15 stroke-[2.2]" />}
          onClick={() => onServiceSelect?.('pay-merchant')}
        />

        {/* 10. Travel */}
        <ServiceCard
          id="travel"
          title="Travel"
          layout="vertical"
          icon={<Plane className="w-6 h-6 text-[#6b1284] stroke-[2.2]" />}
          onClick={() => onServiceSelect?.('travel')}
        />

        {/* 11. Shopping */}
        <ServiceCard
          id="shopping"
          title="Shopping"
          layout="vertical"
          icon={<ShoppingBag className="w-6 h-6 text-[#6b1284] fill-[#6b1284]/15 stroke-[2.2]" />}
          onClick={() => onServiceSelect?.('shopping')}
        />

        {/* 12. Entertainment */}
        <ServiceCard
          id="entertainment"
          title="Entertainment"
          layout="vertical"
          icon={<Film className="w-6 h-6 text-[#6b1284] fill-[#6b1284]/15 stroke-[2.2]" />}
          onClick={() => onServiceSelect?.('entertainment')}
        />

        {/* 13. Tax Payment */}
        <ServiceCard
          id="tax-payment"
          title="Tax Payment"
          layout="vertical"
          icon={<FileSpreadsheet className="w-6 h-6 text-[#6b1284] stroke-[2.2]" />}
          onClick={() => onServiceSelect?.('tax-payment')}
        />

      </div>
    </div>
  );
};

export default ServiceGrid;
