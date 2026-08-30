import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../lib/firebase';
import { UserProfile, Transaction, AuditLog, Beneficiary } from '../types';
import { EthiopianName } from '../types/ethiopianName';

export class FirebaseService {
  /**
   * Checks if Firebase is active and connected
   */
  isConfigured(): boolean {
    return isFirebaseConfigured;
  }

  /**
   * Syncs user profile document to Firestore
   */
  async syncUserProfile(user: UserProfile): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        accountNumber: user.accountNumber,
        balance: user.balance,
        availableBalance: user.availableBalance,
        biometricEnabled: Boolean(user.biometricEnabled),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firebase user sync error (using local state fallback):', err);
    }
  }

  /**
   * Syncs a new or updated transaction to Firestore
   */
  async syncTransaction(tx: Transaction): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      const txRef = doc(db, 'transactions', tx.id);
      await setDoc(txRef, {
        ...tx,
        syncedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Firebase transaction sync error (using local state fallback):', err);
    }
  }

  /**
   * Syncs an Ethiopian name record to Firestore
   */
  async syncEthiopianName(nameItem: EthiopianName): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      const nameRef = doc(db, 'ethiopianNames', nameItem.id);
      await setDoc(nameRef, {
        id: nameItem.id,
        name: nameItem.name,
        normalized_name: nameItem.normalized_name,
        gender: nameItem.gender,
        name_type: nameItem.name_type,
        usage_count: nameItem.usage_count,
        is_active: nameItem.is_active,
        category: nameItem.category || null,
        updated_at: nameItem.updated_at || new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Firebase Ethiopian name sync error:', err);
    }
  }

  /**
   * Fetches Ethiopian names from Firestore if available
   */
  async fetchEthiopianNamesFromFirestore(): Promise<EthiopianName[] | null> {
    if (!this.isConfigured()) return null;
    try {
      const colRef = collection(db, 'ethiopianNames');
      const snap = await getDocs(colRef);
      if (snap.empty) return null;
      const list: EthiopianName[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name,
          normalized_name: data.normalized_name || data.name.toLowerCase(),
          gender: data.gender || 'unisex',
          name_type: data.name_type || 'first_name',
          usage_count: Number(data.usage_count) || 1,
          is_active: data.is_active !== false,
          category: data.category || 'General',
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        });
      });
      return list;
    } catch (err) {
      console.warn('Could not fetch Ethiopian names from Firestore:', err);
      return null;
    }
  }

  /**
   * Syncs an audit log entry to Firestore
   */
  async syncAuditLog(log: AuditLog): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      const logRef = doc(db, 'auditLogs', log.id);
      await setDoc(logRef, {
        id: log.id,
        userId: log.userId,
        userEmail: log.userEmail,
        action: log.action,
        details: log.details,
        createdAt: log.createdAt,
        serverTime: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firebase audit log sync error:', err);
    }
  }
}

export const firebaseService = new FirebaseService();
