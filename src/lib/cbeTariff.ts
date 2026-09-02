import { TransactionType } from '../types';

export interface CbeFeeBreakdown {
  serviceCharge: number;
  vat: number; // 15% VAT on service charge
  disasterRecovery: number; // 5% Disaster Recovery on service charge
  totalFee: number; // serviceCharge + vat + disasterRecovery
  totalDebited: number; // amount + totalFee
  tierLabel?: string;
}

export interface CbeServiceChargeTier {
  min: number;
  max: number;
  label: string;
  charge: number;
}

/**
 * Official CBE → CBE Service Charges:
 * 1–1,000 ETB: 0.50 ETB
 * 1,001–5,000 ETB: 1.00 ETB
 * 5,001–10,000 ETB: 2.00 ETB
 * 10,001–50,000 ETB: 3.00 ETB
 * 50,001–100,000 ETB: 5.00 ETB
 * 100,001–200,000 ETB: 10.00 ETB
 * 200,001–300,000 ETB: 15.00 ETB
 * Above 300,000 ETB: 20.00 ETB
 */
export const CBE_TO_CBE_SERVICE_CHARGES: CbeServiceChargeTier[] = [
  { min: 1, max: 1000, label: '1–1,000 ETB', charge: 0.50 },
  { min: 1001, max: 5000, label: '1,001–5,000 ETB', charge: 1.00 },
  { min: 5001, max: 10000, label: '5,001–10,000 ETB', charge: 2.00 },
  { min: 10001, max: 50000, label: '10,001–50,000 ETB', charge: 3.00 },
  { min: 50001, max: 100000, label: '50,001–100,000 ETB', charge: 5.00 },
  { min: 10001, max: 200000, label: '100,001–200,000 ETB', charge: 10.00 },
  { min: 200001, max: 300000, label: '200,001–300,000 ETB', charge: 15.00 },
  { min: 300001, max: Infinity, label: 'Above 300,000 ETB', charge: 20.00 },
];

/**
 * Retrieves the base service charge and tier label for a CBE → CBE transfer.
 */
export function getCbeTransferServiceCharge(amount: number): { charge: number; tierLabel: string } {
  const parsedAmount = Math.max(0, isNaN(amount) ? 0 : amount);
  if (parsedAmount <= 0) {
    return { charge: 0, tierLabel: '0 ETB' };
  }
  if (parsedAmount <= 1000) {
    return { charge: 0.50, tierLabel: '1–1,000 ETB' };
  }
  if (parsedAmount <= 5000) {
    return { charge: 1.00, tierLabel: '1,001–5,000 ETB' };
  }
  if (parsedAmount <= 10000) {
    return { charge: 2.00, tierLabel: '5,001–10,000 ETB' };
  }
  if (parsedAmount <= 50000) {
    return { charge: 3.00, tierLabel: '10,001–50,000 ETB' };
  }
  if (parsedAmount <= 100000) {
    return { charge: 5.00, tierLabel: '50,001–100,000 ETB' };
  }
  if (parsedAmount <= 200000) {
    return { charge: 10.00, tierLabel: '100,001–200,000 ETB' };
  }
  if (parsedAmount <= 300000) {
    return { charge: 15.00, tierLabel: '200,001–300,000 ETB' };
  }
  return { charge: 20.00, tierLabel: 'Above 300,000 ETB' };
}

/**
 * Calculates official CBE (Commercial Bank of Ethiopia) service charge,
 * VAT (15%), and Disaster Recovery (5%) based on transaction type and principal amount.
 */
export function calculateCbeFee(
  amount: number, 
  transferType: TransactionType | 'own' | 'withdraw' = 'transfer',
  isOwnAccount: boolean = false
): CbeFeeBreakdown {
  const parsedAmount = Math.max(0, isNaN(amount) ? 0 : amount);
  
  if (isOwnAccount || parsedAmount <= 0 || transferType === 'airtime' || transferType === 'receive') {
    return {
      serviceCharge: 0,
      vat: 0,
      disasterRecovery: 0,
      totalFee: 0,
      totalDebited: parsedAmount,
      tierLabel: isOwnAccount ? 'Own Account (Free)' : 'No Charge'
    };
  }

  // Calculate CBE → CBE Service Charge based on official tiers
  const { charge: baseServiceCharge, tierLabel } = getCbeTransferServiceCharge(parsedAmount);

  const vat = Number((baseServiceCharge * 0.15).toFixed(2));
  const disasterRecovery = Number((baseServiceCharge * 0.05).toFixed(2));
  const totalFee = Number((baseServiceCharge + vat + disasterRecovery).toFixed(2));
  const totalDebited = Number((parsedAmount + totalFee).toFixed(2));

  return {
    serviceCharge: baseServiceCharge,
    vat,
    disasterRecovery,
    totalFee,
    totalDebited,
    tierLabel
  };
}

