import { TransactionType } from '../types';

export interface CbeFeeBreakdown {
  serviceCharge: number;
  vat: number; // 15% VAT on service charge
  disasterRecovery: number; // 5% Disaster Recovery on service charge
  totalFee: number; // serviceCharge + vat + disasterRecovery
  totalDebited: number; // amount + totalFee
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
      totalDebited: parsedAmount
    };
  }

  let baseServiceCharge = 0;

  // Standard CBE Mobile Banking & Inter-account Tariff Tier
  if (parsedAmount <= 100) {
    baseServiceCharge = 0.00;
  } else if (parsedAmount <= 1000) {
    baseServiceCharge = 2.00;
  } else if (parsedAmount <= 5000) {
    baseServiceCharge = 5.00;
  } else if (parsedAmount <= 10000) {
    baseServiceCharge = 10.00;
  } else if (parsedAmount <= 50000) {
    baseServiceCharge = 15.00;
  } else if (parsedAmount <= 100000) {
    baseServiceCharge = 20.00;
  } else {
    // High-value transfers (e.g. 300,000 ETB as in CBE receipts) have ETB 15.00 base service charge
    baseServiceCharge = 15.00;
  }

  const vat = Number((baseServiceCharge * 0.15).toFixed(2));
  const disasterRecovery = Number((baseServiceCharge * 0.05).toFixed(2));
  const totalFee = Number((baseServiceCharge + vat + disasterRecovery).toFixed(2));
  const totalDebited = Number((parsedAmount + totalFee).toFixed(2));

  return {
    serviceCharge: baseServiceCharge,
    vat,
    disasterRecovery,
    totalFee,
    totalDebited
  };
}
