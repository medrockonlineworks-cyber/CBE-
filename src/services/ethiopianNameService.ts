import { 
  EthiopianName, 
  EthiopianNameSearchResult, 
  EthiopianNameFilter, 
  EthiopianNameImportResult 
} from '../types/ethiopianName';
import { getInitialEthiopianNames } from '../data/ethiopianFallbackNames';
import { 
  normalizeEthiopianName, 
  isValidEthiopianNameString, 
  formatEthiopianCapitalization,
  findHighlightRanges,
  calculateLevenshteinDistance 
} from '../utils/normalizeName';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'tana_ethiopian_names_db_v2';
const RECENT_SEARCHES_KEY = 'tana_eth_recent_searches_cache';

class EthiopianNameService {
  private inMemoryCache: EthiopianName[] | null = null;
  private recentQueryCache: Map<string, { timestamp: number; results: EthiopianNameSearchResult[] }> = new Map();
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute query cache

  /**
   * Internal helper: Loads names from LocalStorage or Fallback seed data
   */
  private getLocalNames(): EthiopianName[] {
    if (this.inMemoryCache && this.inMemoryCache.length > 0) {
      return this.inMemoryCache;
    }
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.inMemoryCache = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Error loading Ethiopian names from localStorage, using fallback dataset:', err);
    }

    const fallbackList = getInitialEthiopianNames();
    this.saveLocalNames(fallbackList);
    this.inMemoryCache = fallbackList;
    return fallbackList;
  }

  /**
   * Saves local names to localStorage and updates in-memory cache
   */
  private saveLocalNames(names: EthiopianName[]): void {
    this.inMemoryCache = names;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(names));
      this.recentQueryCache.clear();
      // Dispatch browser custom event for live component refresh
      window.dispatchEvent(new CustomEvent('ethiopian_names_updated'));
    } catch (err) {
      console.error('Failed to save Ethiopian names to localStorage:', err);
    }
  }

  /**
   * Searches Ethiopian names with ranked matching:
   * 1. Exact match
   * 2. Prefix match (starts with query)
   * 3. Word-prefix match
   * 4. Contains query
   * 5. Fuzzy match (typo-tolerant)
   * Maximum limit (default 8 suggestions).
   */
  async searchEthiopianNames(
    query: string, 
    maxResults: number = 8,
    genderFilter?: 'male' | 'female' | 'unisex'
  ): Promise<EthiopianNameSearchResult[]> {
    const cleanQuery = (query || '').trim();
    const normalizedQuery = normalizeEthiopianName(cleanQuery);

    // Empty query -> Return top popular active Ethiopian names
    if (!normalizedQuery) {
      const popular = await this.getPopularEthiopianNames(maxResults, genderFilter);
      return popular.map(item => ({
        item,
        matchScore: 100,
        matchType: 'exact',
        highlightRanges: []
      }));
    }

    // Check fast in-memory query cache
    const cacheKey = `${normalizedQuery}_${genderFilter || 'all'}_${maxResults}`;
    const cached = this.recentQueryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS)) {
      return cached.results;
    }

    const supabase = getSupabase();

    // 1. Try Supabase RPC if configured
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.rpc('search_ethiopian_names', {
          search_query: normalizedQuery,
          max_results: maxResults
        });

        if (!error && Array.isArray(data) && data.length > 0) {
          const results: EthiopianNameSearchResult[] = data.map((row: any) => {
            const item: EthiopianName = {
              id: row.id,
              name: row.name,
              normalized_name: row.normalized_name,
              gender: row.gender,
              name_type: row.name_type || 'first_name',
              usage_count: row.usage_count || 0,
              is_active: row.is_active,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            return {
              item,
              matchScore: 100 - (row.match_rank || 1) * 10,
              matchType: row.match_type || 'prefix',
              highlightRanges: findHighlightRanges(item.name, cleanQuery)
            };
          });

          this.recentQueryCache.set(cacheKey, { timestamp: Date.now(), results });
          return results;
        }
      } catch (rpcErr) {
        console.warn('Supabase search RPC failed, falling back to client engine:', rpcErr);
      }
    }

    // 2. High performance local ranked search engine
    const allNames = this.getLocalNames();
    const activeNames = allNames.filter(n => {
      if (!n.is_active) return false;
      if (genderFilter && n.gender && n.gender !== genderFilter && n.gender !== 'unisex') {
        return false;
      }
      return true;
    });

    const rankedResults: EthiopianNameSearchResult[] = [];

    for (const nameItem of activeNames) {
      const normName = nameItem.normalized_name;
      let matchType: 'exact' | 'prefix' | 'word_prefix' | 'contains' | 'fuzzy' | null = null;
      let rankPriority = 99;

      if (normName === normalizedQuery) {
        matchType = 'exact';
        rankPriority = 1;
      } else if (normName.startsWith(normalizedQuery)) {
        matchType = 'prefix';
        rankPriority = 2;
      } else if (normName.includes(' ' + normalizedQuery) || normName.includes('-' + normalizedQuery)) {
        matchType = 'word_prefix';
        rankPriority = 3;
      } else if (normName.includes(normalizedQuery)) {
        matchType = 'contains';
        rankPriority = 4;
      } else if (normalizedQuery.length >= 3) {
        // Fuzzy distance tolerance
        const dist = calculateLevenshteinDistance(normName, normalizedQuery);
        const maxAllowedDist = normalizedQuery.length >= 6 ? 2 : 1;
        if (dist <= maxAllowedDist) {
          matchType = 'fuzzy';
          rankPriority = 5;
        }
      }

      if (matchType) {
        const ranges = findHighlightRanges(nameItem.name, cleanQuery);
        rankedResults.push({
          item: nameItem,
          matchScore: 100 - (rankPriority * 15) + Math.min(nameItem.usage_count, 100) / 10,
          matchType,
          highlightRanges: ranges
        });
      }
    }

    // Sort order: Priority rank (1->5), then Usage count (descending), then shortest name first, then A-Z
    rankedResults.sort((a, b) => {
      const rankOrder = { exact: 1, prefix: 2, word_prefix: 3, contains: 4, fuzzy: 5 };
      const rankA = rankOrder[a.matchType];
      const rankB = rankOrder[b.matchType];

      if (rankA !== rankB) return rankA - rankB;
      if (b.item.usage_count !== a.item.usage_count) {
        return b.item.usage_count - a.item.usage_count;
      }
      if (a.item.name.length !== b.item.name.length) {
        return a.item.name.length - b.item.name.length;
      }
      return a.item.name.localeCompare(b.item.name);
    });

    const finalResults = rankedResults.slice(0, maxResults);
    this.recentQueryCache.set(cacheKey, { timestamp: Date.now(), results: finalResults });
    return finalResults;
  }

  /**
   * Retrieves popular Ethiopian names sorted by usage count
   */
  async getPopularEthiopianNames(
    limit: number = 8, 
    genderFilter?: 'male' | 'female' | 'unisex'
  ): Promise<EthiopianName[]> {
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('ethiopian_names')
          .select('*')
          .eq('is_active', true)
          .order('usage_count', { ascending: false })
          .limit(limit);

        if (genderFilter) {
          query = query.or(`gender.eq.${genderFilter},gender.eq.unisex,gender.is.null`);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          return data as EthiopianName[];
        }
      } catch (err) {
        console.warn('Could not fetch popular names from Supabase, using local:', err);
      }
    }

    const all = this.getLocalNames();
    return all
      .filter(n => {
        if (!n.is_active) return false;
        if (genderFilter && n.gender && n.gender !== genderFilter && n.gender !== 'unisex') {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit);
  }

  /**
   * Safely increments the usage count of a selected Ethiopian name
   */
  async incrementNameUsage(nameId: string): Promise<void> {
    if (!nameId) return;

    // 1. Update local state
    const all = this.getLocalNames();
    const index = all.findIndex(n => n.id === nameId);
    if (index !== -1) {
      all[index].usage_count = (all[index].usage_count || 0) + 1;
      all[index].updated_at = new Date().toISOString();
      this.saveLocalNames([...all]);
    }

    // 2. Sync with Supabase if online
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.rpc('increment_name_usage', { name_id: nameId });
      } catch (err) {
        console.warn('Failed to increment usage in Supabase:', err);
      }
    }
  }

  /**
   * Creates a new Ethiopian name with validation and duplicate checking
   */
  async createEthiopianName(data: {
    name: string;
    gender?: 'male' | 'female' | 'unisex' | null;
    name_type?: 'first_name' | 'patronymic' | 'both';
    category?: string;
    usage_count?: number;
    is_active?: boolean;
  }): Promise<EthiopianName> {
    const rawName = (data.name || '').trim();
    if (!isValidEthiopianNameString(rawName)) {
      throw new Error('Name must contain only English/Latin characters (letters, spaces, hyphens, or apostrophes).');
    }

    const formattedName = formatEthiopianCapitalization(rawName);
    const normalized = normalizeEthiopianName(rawName);
    const all = this.getLocalNames();

    // Check duplicate
    const exists = all.some(n => n.normalized_name === normalized);
    if (exists) {
      throw new Error(`The name "${formattedName}" already exists in the database.`);
    }

    const newRecord: EthiopianName = {
      id: 'eth_name_' + Math.random().toString(36).substring(2, 9),
      name: formattedName,
      normalized_name: normalized,
      gender: data.gender || 'unisex',
      name_type: data.name_type || 'first_name',
      usage_count: data.usage_count || 1,
      is_active: data.is_active !== undefined ? data.is_active : true,
      category: data.category || 'Custom',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    all.unshift(newRecord);
    this.saveLocalNames(all);

    // Sync to Supabase if configured
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('ethiopian_names').insert({
          name: newRecord.name,
          normalized_name: newRecord.normalized_name,
          gender: newRecord.gender,
          name_type: newRecord.name_type,
          usage_count: newRecord.usage_count,
          is_active: newRecord.is_active,
          category: newRecord.category
        });
      } catch (err) {
        console.warn('Could not sync created name to Supabase:', err);
      }
    }

    return newRecord;
  }

  /**
   * Updates an existing Ethiopian name
   */
  async updateEthiopianName(id: string, updates: Partial<EthiopianName>): Promise<EthiopianName | null> {
    const all = this.getLocalNames();
    const index = all.findIndex(n => n.id === id);
    if (index === -1) return null;

    let nextName = all[index].name;
    let nextNormalized = all[index].normalized_name;

    if (updates.name && updates.name.trim()) {
      const rawName = updates.name.trim();
      if (!isValidEthiopianNameString(rawName)) {
        throw new Error('Name must contain only English/Latin characters.');
      }
      nextName = formatEthiopianCapitalization(rawName);
      nextNormalized = normalizeEthiopianName(rawName);

      // Check duplicate against other items
      const duplicate = all.some(n => n.id !== id && n.normalized_name === nextNormalized);
      if (duplicate) {
        throw new Error(`Another record with the name "${nextName}" already exists.`);
      }
    }

    const updatedItem: EthiopianName = {
      ...all[index],
      ...updates,
      name: nextName,
      normalized_name: nextNormalized,
      updated_at: new Date().toISOString()
    };

    all[index] = updatedItem;
    this.saveLocalNames([...all]);

    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('ethiopian_names').update({
          name: updatedItem.name,
          normalized_name: updatedItem.normalized_name,
          gender: updatedItem.gender,
          name_type: updatedItem.name_type,
          usage_count: updatedItem.usage_count,
          is_active: updatedItem.is_active,
          category: updatedItem.category,
          updated_at: updatedItem.updated_at
        }).eq('id', id);
      } catch (err) {
        console.warn('Could not update in Supabase:', err);
      }
    }

    return updatedItem;
  }

  /**
   * Deletes an Ethiopian name by ID
   */
  async deleteEthiopianName(id: string): Promise<boolean> {
    const all = this.getLocalNames();
    const filtered = all.filter(n => n.id !== id);
    if (filtered.length === all.length) return false;

    this.saveLocalNames(filtered);

    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('ethiopian_names').delete().eq('id', id);
      } catch (err) {
        console.warn('Could not delete in Supabase:', err);
      }
    }

    return true;
  }

  /**
   * Retrieves all names with filtering, search, pagination, and sorting for Admin Panel
   */
  async getAllEthiopianNames(filter?: EthiopianNameFilter): Promise<{ names: EthiopianName[]; total: number }> {
    let list = [...this.getLocalNames()];

    if (filter) {
      if (filter.search && filter.search.trim()) {
        const searchNorm = normalizeEthiopianName(filter.search);
        list = list.filter(n => 
          n.normalized_name.includes(searchNorm) || 
          n.name.toLowerCase().includes(filter.search!.toLowerCase()) ||
          (n.category && n.category.toLowerCase().includes(filter.search!.toLowerCase()))
        );
      }

      if (filter.gender && filter.gender !== 'all') {
        list = list.filter(n => n.gender === filter.gender);
      }

      if (filter.nameType && filter.nameType !== 'all') {
        list = list.filter(n => n.name_type === filter.nameType);
      }

      if (filter.isActive !== undefined && filter.isActive !== 'all') {
        list = list.filter(n => n.is_active === filter.isActive);
      }

      // Sort
      const sortBy = filter.sortBy || 'popularity';
      if (sortBy === 'popularity') {
        list.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
      } else if (sortBy === 'name_asc') {
        list.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortBy === 'name_desc') {
        list.sort((a, b) => b.name.localeCompare(a.name));
      } else if (sortBy === 'recently_added') {
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    }

    const total = list.length;
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 100;
    const paginated = list.slice(offset, offset + limit);

    return { names: paginated, total };
  }

  /**
   * CSV Importer with validation, duplicate detection, and result metrics
   */
  async importEthiopianNamesCsv(csvContent: string): Promise<EthiopianNameImportResult> {
    const result: EthiopianNameImportResult = {
      total: 0,
      imported: 0,
      duplicates: 0,
      failed: 0,
      errors: []
    };

    if (!csvContent || typeof csvContent !== 'string') {
      result.errors.push('Empty CSV input provided.');
      return result;
    }

    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      result.errors.push('CSV contains no content rows.');
      return result;
    }

    // Determine header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('name');
    const dataLines = hasHeader ? lines.slice(1) : lines;
    result.total = dataLines.length;

    const currentNames = this.getLocalNames();
    const existingMap = new Map<string, EthiopianName>();
    for (const item of currentNames) {
      existingMap.set(item.normalized_name, item);
    }

    const newItems: EthiopianName[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      const rawName = parts[0];
      const rawGender = (parts[1] || '').toLowerCase();
      const rawType = (parts[2] || '').toLowerCase();
      const rawCategory = parts[3] || 'Imported';

      if (!rawName) {
        result.failed++;
        result.errors.push(`Row ${i + 1}: Empty name value.`);
        continue;
      }

      if (!isValidEthiopianNameString(rawName)) {
        result.failed++;
        result.errors.push(`Row ${i + 1}: "${rawName}" contains invalid characters. English/Latin letters only.`);
        continue;
      }

      const normalized = normalizeEthiopianName(rawName);
      if (existingMap.has(normalized)) {
        result.duplicates++;
        continue;
      }

      let gender: 'male' | 'female' | 'unisex' = 'unisex';
      if (rawGender === 'male' || rawGender === 'm') gender = 'male';
      else if (rawGender === 'female' || rawGender === 'f') gender = 'female';

      let nameType: 'first_name' | 'patronymic' | 'both' = 'first_name';
      if (rawType.includes('patronymic')) nameType = 'patronymic';
      else if (rawType.includes('both')) nameType = 'both';

      const formattedName = formatEthiopianCapitalization(rawName);
      const timestamp = new Date().toISOString();

      const newRecord: EthiopianName = {
        id: 'eth_imp_' + Math.random().toString(36).substring(2, 9),
        name: formattedName,
        normalized_name: normalized,
        gender,
        name_type: nameType,
        usage_count: 50,
        is_active: true,
        category: rawCategory,
        created_at: timestamp,
        updated_at: timestamp
      };

      existingMap.set(normalized, newRecord);
      newItems.push(newRecord);
      result.imported++;
    }

    if (newItems.length > 0) {
      const combined = [...newItems, ...currentNames];
      this.saveLocalNames(combined);

      // Attempt batch insert to Supabase if configured
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured()) {
        try {
          const insertPayload = newItems.map(item => ({
            name: item.name,
            normalized_name: item.normalized_name,
            gender: item.gender,
            name_type: item.name_type,
            usage_count: item.usage_count,
            is_active: item.is_active,
            category: item.category
          }));
          await supabase.from('ethiopian_names').insert(insertPayload);
        } catch (supabaseErr) {
          console.warn('Batch import sync to Supabase encountered issue:', supabaseErr);
        }
      }
    }

    return result;
  }

  /**
   * Exports all Ethiopian names to CSV format
   */
  async exportEthiopianNamesCsv(): Promise<string> {
    const names = this.getLocalNames();
    const rows = [
      'name,gender,name_type,usage_count,category,is_active',
      ...names.map(n => `"${n.name}","${n.gender || 'unisex'}","${n.name_type}","${n.usage_count}","${n.category || ''}","${n.is_active}"`)
    ];
    return rows.join('\n');
  }

  /**
   * Resets database to standard 200+ curated Ethiopian seed records
   */
  async resetToCuratedEthiopianDatabase(): Promise<number> {
    const seed = getInitialEthiopianNames();
    this.saveLocalNames(seed);
    return seed.length;
  }
}

export const ethiopianNameService = new EthiopianNameService();
