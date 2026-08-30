export type EthiopianNameGender = 'male' | 'female' | 'unisex';
export type EthiopianNameType = 'first_name' | 'patronymic' | 'both';

export interface EthiopianName {
  id: string;
  name: string;
  normalized_name: string;
  gender: EthiopianNameGender | null;
  name_type: EthiopianNameType;
  usage_count: number;
  is_active: boolean;
  category?: string; // Optional metadata for internal grouping (e.g. 'Amhara', 'Oromo', 'Tigrayan', 'Gurage', 'Christian', 'Muslim', 'Pan-Ethiopian')
  created_at: string;
  updated_at: string;
}

export interface EthiopianNameSearchResult {
  item: EthiopianName;
  matchScore: number;
  matchType: 'exact' | 'prefix' | 'word_prefix' | 'contains' | 'fuzzy';
  highlightRanges: [number, number][]; // [start, end] indices for highlighting matching characters
}

export interface EthiopianFullNameSuggestion {
  fullName: string;
  firstName: string;
  fathersName: string;
  grandfathersName: string;
  category?: string;
}

export interface EthiopianNamingStructure {
  firstName: string;
  fathersName: string;
  grandfathersName: string;
}

export interface EthiopianNameFilter {
  search?: string;
  gender?: EthiopianNameGender | 'all';
  nameType?: EthiopianNameType | 'all';
  isActive?: boolean | 'all';
  sortBy?: 'popularity' | 'name_asc' | 'name_desc' | 'recently_added';
  limit?: number;
  offset?: number;
}

export interface EthiopianNameImportResult {
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
  errors: string[];
}
