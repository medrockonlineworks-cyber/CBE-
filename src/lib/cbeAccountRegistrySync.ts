export interface CanonicalCbeAccount {
  accountNumber: string;
  accountName: string;
  phone: string;
  balance: number;
  bankName: string;
  userId?: string;
}

/**
 * Reads ALL accounts registered anywhere in CBE Mobile Banking:
 * 1. `tana_users` (registered users, profile edits, switched accounts, live balances)
 * 2. `tana_accounts` (additional bank accounts created via Manage Accounts)
 * 3. `tana_custom_directory_accounts` (accounts registered via Registered Accounts directory)
 *
 * Returns a deduplicated canonical list keyed by normalized account number digits
 * so Messages, Truecaller, and Phone stay 100% synchronized with every CBE account.
 */
export function getCanonicalCbeRegisteredAccounts(): CanonicalCbeAccount[] {
  if (typeof window === 'undefined') return [];

  const byCleanAcc = new Map<string, CanonicalCbeAccount>();
  const usersById = new Map<string, { name?: string; phone?: string }>();

  // 1. Primary source: tana_users
  try {
    const rawUsers = localStorage.getItem('tana_users');
    if (rawUsers) {
      const parsed = JSON.parse(rawUsers);
      if (Array.isArray(parsed)) {
        for (const u of parsed) {
          if (!u || typeof u !== 'object') continue;
          if (u.id) {
            usersById.set(String(u.id), {
              name: typeof u.name === 'string' ? u.name : undefined,
              phone: typeof u.phone === 'string' ? u.phone : undefined,
            });
          }
          const clean = String(u.accountNumber || '').replace(/\D/g, '');
          if (clean.length < 5) continue;
          const bal =
            typeof u.balance === 'number' && !Number.isNaN(u.balance)
              ? u.balance
              : typeof u.availableBalance === 'number' && !Number.isNaN(u.availableBalance)
                ? u.availableBalance
                : 0;
          byCleanAcc.set(clean, {
            accountNumber: clean,
            accountName: String(u.name || `Account ${clean.slice(-4)}`).trim(),
            phone: String(u.phone || '+251911000000').trim(),
            balance: bal,
            bankName: 'Commercial Bank of Ethiopia',
            userId: u.id ? String(u.id) : undefined,
          });
        }
      }
    }
  } catch {}

  // 2. Secondary bank accounts created under users (tana_accounts)
  try {
    const rawAccounts = localStorage.getItem('tana_accounts');
    if (rawAccounts) {
      const parsed = JSON.parse(rawAccounts);
      if (Array.isArray(parsed)) {
        for (const a of parsed) {
          if (!a || typeof a !== 'object') continue;
          const clean = String(a.accountNumber || '').replace(/\D/g, '');
          if (clean.length < 5) continue;
          const bal =
            typeof a.balance === 'number' && !Number.isNaN(a.balance)
              ? a.balance
              : typeof a.availableBalance === 'number' && !Number.isNaN(a.availableBalance)
                ? a.availableBalance
                : 0;
          const existing = byCleanAcc.get(clean);
          if (existing) {
            if (typeof a.balance === 'number' && !Number.isNaN(a.balance)) {
              existing.balance = a.balance;
            }
          } else {
            const owner = a.userId ? usersById.get(String(a.userId)) : undefined;
            const rawName = String(a.accountName || '').trim();
            const displayName =
              owner?.name && rawName && !rawName.toLowerCase().includes(owner.name.toLowerCase())
                ? `${owner.name} (${rawName})`
                : rawName || owner?.name || `Account ${clean.slice(-4)}`;
            byCleanAcc.set(clean, {
              accountNumber: clean,
              accountName: displayName,
              phone: owner?.phone || '+251911000000',
              balance: bal,
              bankName: 'Commercial Bank of Ethiopia',
              userId: a.userId ? String(a.userId) : undefined,
            });
          }
        }
      }
    }
  } catch {}

  // 3. Custom registered directory accounts (tana_custom_directory_accounts)
  try {
    const rawCustom = localStorage.getItem('tana_custom_directory_accounts');
    if (rawCustom) {
      const parsed = JSON.parse(rawCustom);
      if (Array.isArray(parsed)) {
        for (const c of parsed) {
          if (!c || typeof c !== 'object') continue;
          const clean = String(c.accountNumber || '').replace(/\D/g, '');
          if (clean.length < 5) continue;
          const bal =
            typeof c.balance === 'number' && !Number.isNaN(c.balance) ? c.balance : 25000.0;
          const existing = byCleanAcc.get(clean);
          if (!existing) {
            byCleanAcc.set(clean, {
              accountNumber: clean,
              accountName: String(c.accountName || `Account ${clean.slice(-4)}`).trim(),
              phone: String(c.phone || '+251911000000').trim(),
              balance: bal,
              bankName: String(c.bankName || 'Commercial Bank of Ethiopia').trim(),
              userId: c.userId ? String(c.userId) : undefined,
            });
          } else if (c.accountName && !existing.accountName) {
            existing.accountName = String(c.accountName).trim();
          }
        }
      }
    }
  } catch {}

  return Array.from(byCleanAcc.values());
}
