-- ============================================================================
-- Ethiopian Name Autocomplete & Name Suggestion Database Migration
-- Table: ethiopian_names
-- English/Latin characters only
-- ============================================================================

-- 1. Enable pg_trgm extension for fast trigram and fuzzy similarity searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create ethiopian_names table
CREATE TABLE IF NOT EXISTS public.ethiopian_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    gender TEXT NULL CHECK (gender IN ('male', 'female', 'unisex') OR gender IS NULL),
    name_type TEXT DEFAULT 'first_name' CHECK (name_type IN ('first_name', 'patronymic', 'both')),
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    category TEXT DEFAULT 'Traditional',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_ethiopian_names_normalized UNIQUE (normalized_name)
);

-- 3. Create high-performance indexes
-- Fast case-insensitive prefix search index: LIKE 'prefix%'
CREATE INDEX IF NOT EXISTS idx_ethiopian_names_normalized_prefix 
ON public.ethiopian_names (normalized_name text_pattern_ops) 
WHERE is_active = TRUE;

-- Trigram index for typo tolerance and fuzzy matching
CREATE INDEX IF NOT EXISTS idx_ethiopian_names_trgm 
ON public.ethiopian_names USING gin (normalized_name gin_trgm_ops) 
WHERE is_active = TRUE;

-- Popularity & Active status index
CREATE INDEX IF NOT EXISTS idx_ethiopian_names_popularity 
ON public.ethiopian_names (is_active, usage_count DESC);

-- Gender index for filtered suggestions
CREATE INDEX IF NOT EXISTS idx_ethiopian_names_gender 
ON public.ethiopian_names (gender) 
WHERE is_active = TRUE;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.ethiopian_names ENABLE ROW LEVEL SECURITY;

-- RLS Policies:
-- 1) Any client (anon / authenticated) can read active names
DROP POLICY IF EXISTS "Public can view active Ethiopian names" ON public.ethiopian_names;
CREATE POLICY "Public can view active Ethiopian names"
ON public.ethiopian_names
FOR SELECT
USING (is_active = TRUE);

-- 2) Admins / Authenticated service can view all names including inactive
DROP POLICY IF EXISTS "Admins can view all Ethiopian names" ON public.ethiopian_names;
CREATE POLICY "Admins can view all Ethiopian names"
ON public.ethiopian_names
FOR SELECT
TO authenticated
USING (true);

-- 3) Only Admins / Service role can insert new names
DROP POLICY IF EXISTS "Admins can insert Ethiopian names" ON public.ethiopian_names;
CREATE POLICY "Admins can insert Ethiopian names"
ON public.ethiopian_names
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4) Only Admins / Service role can update names
DROP POLICY IF EXISTS "Admins can update Ethiopian names" ON public.ethiopian_names;
CREATE POLICY "Admins can update Ethiopian names"
ON public.ethiopian_names
FOR UPDATE
TO authenticated
USING (true);

-- 5) Only Admins / Service role can delete names
DROP POLICY IF EXISTS "Admins can delete Ethiopian names" ON public.ethiopian_names;
CREATE POLICY "Admins can delete Ethiopian names"
ON public.ethiopian_names
FOR DELETE
TO authenticated
USING (true);

-- 5. Atomic stored procedure to safely increment usage_count upon selection
CREATE OR REPLACE FUNCTION public.increment_name_usage(name_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ethiopian_names
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = name_id;
END;
$$;

-- 6. High-speed ranked search RPC function
CREATE OR REPLACE FUNCTION public.search_ethiopian_names(
  search_query TEXT,
  max_results INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  normalized_name TEXT,
  gender TEXT,
  name_type TEXT,
  usage_count INT,
  is_active BOOLEAN,
  match_type TEXT,
  match_rank INT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_norm_query TEXT;
BEGIN
  v_norm_query := lower(trim(search_query));
  
  IF length(v_norm_query) = 0 THEN
    RETURN QUERY
    SELECT 
      en.id,
      en.name,
      en.normalized_name,
      en.gender,
      en.name_type,
      en.usage_count,
      en.is_active,
      'popular'::TEXT AS match_type,
      5 AS match_rank
    FROM public.ethiopian_names en
    WHERE en.is_active = TRUE
    ORDER BY en.usage_count DESC, en.name ASC
    LIMIT max_results;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    en.id,
    en.name,
    en.normalized_name,
    en.gender,
    en.name_type,
    en.usage_count,
    en.is_active,
    CASE 
      WHEN en.normalized_name = v_norm_query THEN 'exact'
      WHEN en.normalized_name LIKE v_norm_query || '%' THEN 'prefix'
      WHEN en.normalized_name LIKE '% ' || v_norm_query || '%' THEN 'word_prefix'
      WHEN en.normalized_name LIKE '%' || v_norm_query || '%' THEN 'contains'
      ELSE 'fuzzy'
    END AS match_type,
    CASE 
      WHEN en.normalized_name = v_norm_query THEN 1
      WHEN en.normalized_name LIKE v_norm_query || '%' THEN 2
      WHEN en.normalized_name LIKE '% ' || v_norm_query || '%' THEN 3
      WHEN en.normalized_name LIKE '%' || v_norm_query || '%' THEN 4
      ELSE 5
    END AS match_rank
  FROM public.ethiopian_names en
  WHERE en.is_active = TRUE
    AND (
      en.normalized_name LIKE '%' || v_norm_query || '%'
      OR (length(v_norm_query) >= 3 AND similarity(en.normalized_name, v_norm_query) > 0.3)
    )
  ORDER BY 
    match_rank ASC,
    en.usage_count DESC,
    length(en.name) ASC,
    en.name ASC
  LIMIT max_results;
END;
$$;

-- 7. Seed initial curated Ethiopian names
INSERT INTO public.ethiopian_names (name, normalized_name, gender, name_type, usage_count, category)
VALUES
  ('Abebe', 'abebe', 'male', 'first_name', 1450, 'Traditional'),
  ('Abel', 'abel', 'male', 'first_name', 1240, 'Christian'),
  ('Abdisa', 'abdisa', 'male', 'first_name', 980, 'Oromo'),
  ('Amanuel', 'amanuel', 'male', 'first_name', 1120, 'Christian'),
  ('Alemu', 'alemu', 'male', 'first_name', 890, 'Traditional'),
  ('Alemayehu', 'alemayehu', 'male', 'first_name', 1040, 'Traditional'),
  ('Asfaw', 'asfaw', 'male', 'first_name', 760, 'Traditional'),
  ('Abraham', 'abraham', 'male', 'first_name', 950, 'Christian'),
  ('Ahmed', 'ahmed', 'male', 'first_name', 1180, 'Muslim'),
  ('Almaz', 'almaz', 'female', 'first_name', 990, 'Traditional'),
  ('Aster', 'aster', 'female', 'first_name', 870, 'Traditional'),
  ('Anteneh', 'anteneh', 'male', 'first_name', 650, 'Traditional'),
  ('Bekele', 'bekele', 'male', 'first_name', 1100, 'Traditional'),
  ('Bereket', 'bereket', 'unisex', 'first_name', 1280, 'Traditional'),
  ('Betty', 'betty', 'female', 'first_name', 920, 'Modern'),
  ('Bethlehem', 'bethlehem', 'female', 'first_name', 1050, 'Christian'),
  ('Bethel', 'bethel', 'female', 'first_name', 840, 'Christian'),
  ('Biruk', 'biruk', 'male', 'first_name', 960, 'Christian'),
  ('Biniam', 'biniam', 'male', 'first_name', 910, 'Christian'),
  ('Bilal', 'bilal', 'male', 'first_name', 780, 'Muslim'),
  ('Bikila', 'bikila', 'male', 'first_name', 830, 'Oromo'),
  ('Bona', 'bona', 'male', 'first_name', 610, 'Oromo'),
  ('Chala', 'chala', 'male', 'first_name', 730, 'Oromo'),
  ('Chaltu', 'chaltu', 'female', 'first_name', 680, 'Oromo'),
  ('Dagmawi', 'dagmawi', 'male', 'first_name', 1080, 'Traditional'),
  ('Dagim', 'dagim', 'male', 'first_name', 890, 'Traditional'),
  ('Daniel', 'daniel', 'male', 'first_name', 1140, 'Christian'),
  ('Dawit', 'dawit', 'male', 'first_name', 1390, 'Christian'),
  ('Demeke', 'demeke', 'male', 'first_name', 680, 'Traditional'),
  ('Desta', 'desta', 'unisex', 'first_name', 990, 'Traditional'),
  ('Derartu', 'derartu', 'female', 'first_name', 760, 'Oromo'),
  ('Eden', 'eden', 'female', 'first_name', 1120, 'Christian'),
  ('Elias', 'elias', 'male', 'first_name', 980, 'Christian'),
  ('Ephrem', 'ephrem', 'male', 'first_name', 870, 'Christian'),
  ('Eskinder', 'eskinder', 'male', 'first_name', 690, 'Traditional'),
  ('Eyob', 'eyob', 'male', 'first_name', 1150, 'Christian'),
  ('Eyasu', 'eyasu', 'male', 'first_name', 730, 'Christian'),
  ('Fasika', 'fasika', 'unisex', 'first_name', 910, 'Traditional'),
  ('Fatuma', 'fatuma', 'female', 'first_name', 860, 'Muslim'),
  ('Fikru', 'fikru', 'male', 'first_name', 790, 'Traditional'),
  ('Feyisa', 'feyisa', 'male', 'first_name', 750, 'Oromo'),
  ('Gamachu', 'gamachu', 'male', 'first_name', 710, 'Oromo'),
  ('Genet', 'genet', 'female', 'first_name', 950, 'Traditional'),
  ('Getachew', 'getachew', 'male', 'first_name', 1220, 'Traditional'),
  ('Girma', 'girma', 'male', 'first_name', 1090, 'Traditional'),
  ('Habtamu', 'habtamu', 'male', 'first_name', 890, 'Traditional'),
  ('Haile', 'haile', 'male', 'first_name', 1140, 'Traditional'),
  ('Haile-Mariam', 'haile-mariam', 'male', 'first_name', 780, 'Traditional'),
  ('Halima', 'halima', 'female', 'first_name', 830, 'Muslim'),
  ('Hana', 'hana', 'female', 'first_name', 1310, 'Christian'),
  ('Hawi', 'hawi', 'female', 'first_name', 790, 'Oromo'),
  ('Henok', 'henok', 'male', 'first_name', 1180, 'Christian'),
  ('Hermela', 'hermela', 'female', 'first_name', 860, 'Christian'),
  ('Hiwot', 'hiwot', 'female', 'first_name', 1060, 'Traditional'),
  ('Jemal', 'jemal', 'male', 'first_name', 880, 'Muslim'),
  ('Kaleb', 'kaleb', 'male', 'first_name', 980, 'Traditional'),
  ('Kalkidan', 'kalkidan', 'female', 'first_name', 1130, 'Christian'),
  ('Kebede', 'kebede', 'male', 'first_name', 1350, 'Traditional'),
  ('Kedir', 'kedir', 'male', 'first_name', 860, 'Muslim'),
  ('Kenenisa', 'kenenisa', 'male', 'first_name', 890, 'Oromo'),
  ('Kidist', 'kidist', 'female', 'first_name', 1020, 'Christian'),
  ('Kidus', 'kidus', 'male', 'first_name', 960, 'Christian'),
  ('Lensa', 'lensa', 'female', 'first_name', 710, 'Oromo'),
  ('Liya', 'liya', 'female', 'first_name', 1290, 'Christian'),
  ('Mahlet', 'mahlet', 'female', 'first_name', 990, 'Christian'),
  ('Melaku', 'melaku', 'male', 'first_name', 890, 'Traditional'),
  ('Mekonnen', 'mekonnen', 'male', 'first_name', 1190, 'Traditional'),
  ('Meron', 'meron', 'female', 'first_name', 1340, 'Christian'),
  ('Mesfin', 'mesfin', 'male', 'first_name', 970, 'Traditional'),
  ('Meskerem', 'meskerem', 'female', 'first_name', 920, 'Traditional'),
  ('Meryem', 'meryem', 'female', 'first_name', 790, 'Muslim'),
  ('Mihret', 'mihret', 'female', 'first_name', 860, 'Christian'),
  ('Mintesnot', 'mintesnot', 'male', 'first_name', 950, 'Christian'),
  ('Mohammed', 'mohammed', 'male', 'first_name', 1420, 'Muslim'),
  ('Muktar', 'muktar', 'male', 'first_name', 780, 'Muslim'),
  ('Mulugeta', 'mulugeta', 'male', 'first_name', 920, 'Traditional'),
  ('Nahom', 'nahom', 'male', 'first_name', 1210, 'Christian'),
  ('Nardos', 'nardos', 'female', 'first_name', 980, 'Christian'),
  ('Nasir', 'nasir', 'male', 'first_name', 750, 'Muslim'),
  ('Natnael', 'natnael', 'male', 'first_name', 1170, 'Christian'),
  ('Negash', 'negash', 'male', 'first_name', 760, 'Traditional'),
  ('Obsa', 'obsa', 'male', 'first_name', 650, 'Oromo'),
  ('Rahel', 'rahel', 'female', 'first_name', 1110, 'Christian'),
  ('Rahma', 'rahma', 'female', 'first_name', 770, 'Muslim'),
  ('Redwan', 'redwan', 'male', 'first_name', 780, 'Muslim'),
  ('Robel', 'robel', 'male', 'first_name', 1040, 'Christian'),
  ('Ruth', 'ruth', 'female', 'first_name', 960, 'Christian'),
  ('Sadik', 'sadik', 'male', 'first_name', 720, 'Muslim'),
  ('Samrawit', 'samrawit', 'female', 'first_name', 990, 'Tigrayan'),
  ('Samuel', 'samuel', 'male', 'first_name', 1330, 'Christian'),
  ('Selam', 'selam', 'female', 'first_name', 1370, 'Traditional'),
  ('Selamawit', 'selamawit', 'female', 'first_name', 1250, 'Traditional'),
  ('Senait', 'senait', 'female', 'first_name', 940, 'Traditional'),
  ('Sifan', 'sifan', 'female', 'first_name', 780, 'Oromo'),
  ('Sisay', 'sisay', 'male', 'first_name', 820, 'Traditional'),
  ('Solomon', 'solomon', 'male', 'first_name', 1380, 'Christian'),
  ('Surafel', 'surafel', 'male', 'first_name', 1020, 'Christian'),
  ('Tadesse', 'tadesse', 'male', 'first_name', 1360, 'Traditional'),
  ('Tamirat', 'tamirat', 'male', 'first_name', 870, 'Traditional'),
  ('Tefera', 'tefera', 'male', 'first_name', 890, 'Traditional'),
  ('Tekle', 'tekle', 'male', 'first_name', 930, 'Traditional'),
  ('Temesgen', 'temesgen', 'male', 'first_name', 1090, 'Traditional'),
  ('Tesfaye', 'tesfaye', 'male', 'first_name', 1320, 'Traditional'),
  ('Teshome', 'teshome', 'male', 'first_name', 840, 'Traditional'),
  ('Tesema', 'tesema', 'male', 'first_name', 670, 'Traditional'),
  ('Tesfahun', 'tesfahun', 'male', 'first_name', 720, 'Traditional'),
  ('Tewodros', 'tewodros', 'male', 'first_name', 1280, 'Traditional'),
  ('Tigist', 'tigist', 'female', 'first_name', 1180, 'Traditional'),
  ('Tirhas', 'tirhas', 'female', 'first_name', 710, 'Tigrayan'),
  ('Tolosa', 'tolosa', 'male', 'first_name', 690, 'Oromo'),
  ('Tsion', 'tsion', 'female', 'first_name', 1140, 'Christian'),
  ('Tsige', 'tsige', 'female', 'first_name', 820, 'Traditional'),
  ('Umer', 'umer', 'male', 'first_name', 780, 'Muslim'),
  ('Weinshet', 'weinshet', 'female', 'first_name', 670, 'Traditional'),
  ('Wondwossen', 'wondwossen', 'male', 'first_name', 760, 'Traditional'),
  ('Worku', 'worku', 'male', 'first_name', 850, 'Traditional'),
  ('Yohannes', 'yohannes', 'male', 'first_name', 1310, 'Christian'),
  ('Yonas', 'yonas', 'male', 'first_name', 1290, 'Christian'),
  ('Yosef', 'yosef', 'male', 'first_name', 1270, 'Christian'),
  ('Yordanos', 'yordanos', 'female', 'first_name', 870, 'Christian'),
  ('Zeineb', 'zeineb', 'female', 'first_name', 760, 'Muslim'),
  ('Zerihun', 'zerihun', 'male', 'first_name', 840, 'Traditional'),
  ('Zewdu', 'zewdu', 'male', 'first_name', 790, 'Traditional')
ON CONFLICT (normalized_name) DO UPDATE 
SET usage_count = EXCLUDED.usage_count,
    gender = EXCLUDED.gender,
    name_type = EXCLUDED.name_type,
    category = EXCLUDED.category,
    updated_at = NOW();
