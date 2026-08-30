import { EthiopianName } from '../types/ethiopianName';
import { normalizeEthiopianName } from '../utils/normalizeName';

export interface RawEthiopianSeed {
  name: string;
  gender: 'male' | 'female' | 'unisex';
  name_type?: 'first_name' | 'patronymic' | 'both';
  usage_count?: number;
  category?: string;
}

export const RAW_ETHIOPIAN_NAMES: RawEthiopianSeed[] = [
  // A
  { name: 'Abebe', gender: 'male', usage_count: 1450, category: 'Traditional' },
  { name: 'Abel', gender: 'male', usage_count: 1240, category: 'Christian' },
  { name: 'Abdisa', gender: 'male', usage_count: 980, category: 'Oromo' },
  { name: 'Amanuel', gender: 'male', usage_count: 1120, category: 'Christian' },
  { name: 'Amare', gender: 'male', usage_count: 980, category: 'Traditional' },
  { name: 'Amen', gender: 'unisex', usage_count: 890, category: 'Christian' },
  { name: 'Ameha', gender: 'male', usage_count: 820, category: 'Traditional' },
  { name: 'Amha', gender: 'male', usage_count: 850, category: 'Traditional' },
  { name: 'Aman', gender: 'male', usage_count: 930, category: 'Muslim' },
  { name: 'Amina', gender: 'female', usage_count: 870, category: 'Muslim' },
  { name: 'Amir', gender: 'male', usage_count: 890, category: 'Muslim' },
  { name: 'Amsale', gender: 'female', usage_count: 760, category: 'Traditional' },
  { name: 'Amsalu', gender: 'male', usage_count: 790, category: 'Traditional' },
  { name: 'Amarech', gender: 'female', usage_count: 710, category: 'Traditional' },
  { name: 'Alemu', gender: 'male', usage_count: 890, category: 'Traditional' },
  { name: 'Alemayehu', gender: 'male', usage_count: 1040, category: 'Traditional' },
  { name: 'Asfaw', gender: 'male', usage_count: 760, category: 'Traditional' },
  { name: 'Abraham', gender: 'male', usage_count: 950, category: 'Christian' },
  { name: 'Ahmed', gender: 'male', usage_count: 1180, category: 'Muslim' },
  { name: 'Almaz', gender: 'female', usage_count: 990, category: 'Traditional' },
  { name: 'Aster', gender: 'female', usage_count: 870, category: 'Traditional' },
  { name: 'Anteneh', gender: 'male', usage_count: 650, category: 'Traditional' },
  { name: 'Aynalem', gender: 'female', usage_count: 530, category: 'Traditional' },
  { name: 'Abinet', gender: 'unisex', usage_count: 710, category: 'Traditional' },
  { name: 'Addis', gender: 'unisex', usage_count: 640, category: 'Traditional' },
  { name: 'Admasu', gender: 'male', usage_count: 480, category: 'Traditional' },
  { name: 'Ali', gender: 'male', usage_count: 820, category: 'Muslim' },
  { name: 'Aregawi', gender: 'male', usage_count: 450, category: 'Tigrayan' },
  { name: 'Aschalew', gender: 'male', usage_count: 510, category: 'Traditional' },
  { name: 'Asegedech', gender: 'female', usage_count: 430, category: 'Traditional' },
  { name: 'Asnakech', gender: 'female', usage_count: 520, category: 'Traditional' },
  { name: 'Ayana', gender: 'male', usage_count: 670, category: 'Oromo' },

  // B
  { name: 'Bekele', gender: 'male', usage_count: 1100, category: 'Traditional' },
  { name: 'Bereket', gender: 'unisex', usage_count: 1280, category: 'Traditional' },
  { name: 'Betty', gender: 'female', usage_count: 920, category: 'Modern' },
  { name: 'Bethlehem', gender: 'female', usage_count: 1050, category: 'Christian' },
  { name: 'Bethel', gender: 'female', usage_count: 840, category: 'Christian' },
  { name: 'Biruk', gender: 'male', usage_count: 960, category: 'Christian' },
  { name: 'Biniam', gender: 'male', usage_count: 910, category: 'Christian' },
  { name: 'Bilal', gender: 'male', usage_count: 780, category: 'Muslim' },
  { name: 'Bikila', gender: 'male', usage_count: 830, category: 'Oromo' },
  { name: 'Bona', gender: 'male', usage_count: 610, category: 'Oromo' },
  { name: 'Birtukan', gender: 'female', usage_count: 670, category: 'Traditional' },
  { name: 'Bisrat', gender: 'unisex', usage_count: 740, category: 'Traditional' },
  { name: 'Beza', gender: 'female', usage_count: 820, category: 'Traditional' },
  { name: 'Bezawit', gender: 'female', usage_count: 890, category: 'Traditional' },
  { name: 'Berhanu', gender: 'male', usage_count: 790, category: 'Traditional' },
  { name: 'Baye', gender: 'male', usage_count: 490, category: 'Traditional' },
  { name: 'Belay', gender: 'male', usage_count: 680, category: 'Traditional' },
  { name: 'Biftu', gender: 'female', usage_count: 540, category: 'Oromo' },

  // C
  { name: 'Chala', gender: 'male', usage_count: 730, category: 'Oromo' },
  { name: 'Chaltu', gender: 'female', usage_count: 680, category: 'Oromo' },
  { name: 'Chernet', gender: 'male', usage_count: 560, category: 'Traditional' },
  { name: 'Chere', gender: 'male', usage_count: 420, category: 'Traditional' },

  // D
  { name: 'Dagmawi', gender: 'male', usage_count: 1080, category: 'Traditional' },
  { name: 'Dagim', gender: 'male', usage_count: 890, category: 'Traditional' },
  { name: 'Daniel', gender: 'male', usage_count: 1140, category: 'Christian' },
  { name: 'Dawit', gender: 'male', usage_count: 1390, category: 'Christian' },
  { name: 'Demeke', gender: 'male', usage_count: 680, category: 'Traditional' },
  { name: 'Desta', gender: 'unisex', usage_count: 990, category: 'Traditional' },
  { name: 'Derartu', gender: 'female', usage_count: 760, category: 'Oromo' },
  { name: 'Diriba', gender: 'male', usage_count: 590, category: 'Oromo' },
  { name: 'Dejene', gender: 'male', usage_count: 720, category: 'Traditional' },
  { name: 'Danayit', gender: 'female', usage_count: 850, category: 'Traditional' },
  { name: 'Debre', gender: 'unisex', usage_count: 460, category: 'Traditional' },
  { name: 'Dereje', gender: 'male', usage_count: 770, category: 'Traditional' },
  { name: 'Desalegn', gender: 'male', usage_count: 690, category: 'Traditional' },

  // E
  { name: 'Eden', gender: 'female', usage_count: 1120, category: 'Christian' },
  { name: 'Elias', gender: 'male', usage_count: 980, category: 'Christian' },
  { name: 'Ephrem', gender: 'male', usage_count: 870, category: 'Christian' },
  { name: 'Eskinder', gender: 'male', usage_count: 690, category: 'Traditional' },
  { name: 'Eyob', gender: 'male', usage_count: 1150, category: 'Christian' },
  { name: 'Eyasu', gender: 'male', usage_count: 730, category: 'Christian' },
  { name: 'Eleni', gender: 'female', usage_count: 810, category: 'Christian' },
  { name: 'Emnet', gender: 'unisex', usage_count: 790, category: 'Traditional' },
  { name: 'Endalkachew', gender: 'male', usage_count: 580, category: 'Traditional' },
  { name: 'Ermias', gender: 'male', usage_count: 880, category: 'Christian' },
  { name: 'Etsegenet', gender: 'female', usage_count: 640, category: 'Traditional' },
  { name: 'Ezra', gender: 'male', usage_count: 670, category: 'Christian' },

  // F
  { name: 'Fasika', gender: 'unisex', usage_count: 910, category: 'Traditional' },
  { name: 'Fatuma', gender: 'female', usage_count: 860, category: 'Muslim' },
  { name: 'Fikru', gender: 'male', usage_count: 790, category: 'Traditional' },
  { name: 'Fikirte', gender: 'female', usage_count: 680, category: 'Traditional' },
  { name: 'Feyisa', gender: 'male', usage_count: 750, category: 'Oromo' },
  { name: 'Fanuel', gender: 'male', usage_count: 620, category: 'Christian' },
  { name: 'Feven', gender: 'female', usage_count: 840, category: 'Christian' },
  { name: 'Fisseha', gender: 'male', usage_count: 590, category: 'Tigrayan' },
  { name: 'Frehiwot', gender: 'female', usage_count: 770, category: 'Traditional' },
  { name: 'Fitsum', gender: 'unisex', usage_count: 830, category: 'Traditional' },

  // G
  { name: 'Gamachu', gender: 'male', usage_count: 710, category: 'Oromo' },
  { name: 'Gebre', gender: 'male', usage_count: 880, category: 'Traditional' },
  { name: 'Gebre-Egziabher', gender: 'male', usage_count: 630, category: 'Traditional' },
  { name: 'Genet', gender: 'female', usage_count: 950, category: 'Traditional' },
  { name: 'Getachew', gender: 'male', usage_count: 1220, category: 'Traditional' },
  { name: 'Getnet', gender: 'male', usage_count: 670, category: 'Traditional' },
  { name: 'Girma', gender: 'male', usage_count: 1090, category: 'Traditional' },
  { name: 'Girum', gender: 'male', usage_count: 720, category: 'Traditional' },
  { name: 'Gudaf', gender: 'female', usage_count: 540, category: 'Tigrayan' },
  { name: 'Gutu', gender: 'unisex', usage_count: 490, category: 'Oromo' },

  // H
  { name: 'Habtamu', gender: 'male', usage_count: 890, category: 'Traditional' },
  { name: 'Haile', gender: 'male', usage_count: 1140, category: 'Traditional' },
  { name: 'Haile-Mariam', gender: 'male', usage_count: 780, category: 'Traditional' },
  { name: 'Halima', gender: 'female', usage_count: 830, category: 'Muslim' },
  { name: 'Hana', gender: 'female', usage_count: 1310, category: 'Christian' },
  { name: 'Hawi', gender: 'female', usage_count: 790, category: 'Oromo' },
  { name: 'Helen', gender: 'female', usage_count: 940, category: 'Modern' },
  { name: 'Henok', gender: 'male', usage_count: 1180, category: 'Christian' },
  { name: 'Hermela', gender: 'female', usage_count: 860, category: 'Christian' },
  { name: 'Hiwot', gender: 'female', usage_count: 1060, category: 'Traditional' },
  { name: 'Hirut', gender: 'female', usage_count: 760, category: 'Traditional' },
  { name: 'Hassen', gender: 'male', usage_count: 870, category: 'Muslim' },
  { name: 'Hussein', gender: 'male', usage_count: 790, category: 'Muslim' },

  // J
  { name: 'Jemal', gender: 'male', usage_count: 880, category: 'Muslim' },
  { name: 'Jalata', gender: 'male', usage_count: 540, category: 'Oromo' },
  { name: 'Jawar', gender: 'male', usage_count: 620, category: 'Oromo' },

  // K
  { name: 'Kaleb', gender: 'male', usage_count: 980, category: 'Traditional' },
  { name: 'Kalkidan', gender: 'female', usage_count: 1130, category: 'Christian' },
  { name: 'Kassahun', gender: 'male', usage_count: 740, category: 'Traditional' },
  { name: 'Kebede', gender: 'male', usage_count: 1350, category: 'Traditional' },
  { name: 'Kedir', gender: 'male', usage_count: 860, category: 'Muslim' },
  { name: 'Kenenisa', gender: 'male', usage_count: 890, category: 'Oromo' },
  { name: 'Kidist', gender: 'female', usage_count: 1020, category: 'Christian' },
  { name: 'Kidus', gender: 'male', usage_count: 960, category: 'Christian' },
  { name: 'Kinfe', gender: 'male', usage_count: 520, category: 'Tigrayan' },
  { name: 'Kokeb', gender: 'female', usage_count: 590, category: 'Traditional' },
  { name: 'Kumsa', gender: 'male', usage_count: 480, category: 'Oromo' },

  // L
  { name: 'Lensa', gender: 'female', usage_count: 710, category: 'Oromo' },
  { name: 'Liya', gender: 'female', usage_count: 1290, category: 'Christian' },
  { name: 'Lidya', gender: 'female', usage_count: 870, category: 'Christian' },
  { name: 'Lemma', gender: 'male', usage_count: 750, category: 'Traditional' },
  { name: 'Lelisa', gender: 'male', usage_count: 620, category: 'Oromo' },
  { name: 'Leul', gender: 'male', usage_count: 710, category: 'Traditional' },
  { name: 'Lulit', gender: 'female', usage_count: 680, category: 'Traditional' },

  // M
  { name: 'Mahlet', gender: 'female', usage_count: 990, category: 'Christian' },
  { name: 'Marta', gender: 'female', usage_count: 840, category: 'Christian' },
  { name: 'Melaku', gender: 'male', usage_count: 890, category: 'Traditional' },
  { name: 'Melat', gender: 'female', usage_count: 870, category: 'Christian' },
  { name: 'Mekdes', gender: 'female', usage_count: 820, category: 'Christian' },
  { name: 'Mekonnen', gender: 'male', usage_count: 1190, category: 'Traditional' },
  { name: 'Meron', gender: 'female', usage_count: 1340, category: 'Christian' },
  { name: 'Meseret', gender: 'female', usage_count: 880, category: 'Traditional' },
  { name: 'Mesfin', gender: 'male', usage_count: 970, category: 'Traditional' },
  { name: 'Meskerem', gender: 'female', usage_count: 920, category: 'Traditional' },
  { name: 'Meryem', gender: 'female', usage_count: 790, category: 'Muslim' },
  { name: 'Mihret', gender: 'female', usage_count: 860, category: 'Christian' },
  { name: 'Million', gender: 'male', usage_count: 740, category: 'Traditional' },
  { name: 'Mintesnot', gender: 'male', usage_count: 950, category: 'Christian' },
  { name: 'Mohammed', gender: 'male', usage_count: 1420, category: 'Muslim' },
  { name: 'Muktar', gender: 'male', usage_count: 780, category: 'Muslim' },
  { name: 'Mulugeta', gender: 'male', usage_count: 920, category: 'Traditional' },
  { name: 'Mulu', gender: 'female', usage_count: 690, category: 'Traditional' },
  { name: 'Mustafa', gender: 'male', usage_count: 680, category: 'Muslim' },

  // N
  { name: 'Nahom', gender: 'male', usage_count: 1210, category: 'Christian' },
  { name: 'Nardos', gender: 'female', usage_count: 980, category: 'Christian' },
  { name: 'Nasir', gender: 'male', usage_count: 750, category: 'Muslim' },
  { name: 'Natnael', gender: 'male', usage_count: 1170, category: 'Christian' },
  { name: 'Negash', gender: 'male', usage_count: 760, category: 'Traditional' },
  { name: 'Nebiyu', gender: 'male', usage_count: 840, category: 'Christian' },
  { name: 'Netsanet', gender: 'female', usage_count: 810, category: 'Traditional' },
  { name: 'Nigist', gender: 'female', usage_count: 730, category: 'Traditional' },
  { name: 'Nuredin', gender: 'male', usage_count: 660, category: 'Muslim' },

  // O
  { name: 'Obsa', gender: 'male', usage_count: 650, category: 'Oromo' },
  { name: 'Oliyad', gender: 'male', usage_count: 580, category: 'Oromo' },
  { name: 'Oromia', gender: 'female', usage_count: 470, category: 'Oromo' },
  { name: 'Osman', gender: 'male', usage_count: 680, category: 'Muslim' },

  // R
  { name: 'Rahel', gender: 'female', usage_count: 1110, category: 'Christian' },
  { name: 'Rahma', gender: 'female', usage_count: 770, category: 'Muslim' },
  { name: 'Redwan', gender: 'male', usage_count: 780, category: 'Muslim' },
  { name: 'Robel', gender: 'male', usage_count: 1040, category: 'Christian' },
  { name: 'Roman', gender: 'female', usage_count: 730, category: 'Traditional' },
  { name: 'Ruth', gender: 'female', usage_count: 960, category: 'Christian' },
  { name: 'Roba', gender: 'male', usage_count: 530, category: 'Oromo' },

  // S
  { name: 'Sadik', gender: 'male', usage_count: 720, category: 'Muslim' },
  { name: 'Samrawit', gender: 'female', usage_count: 990, category: 'Tigrayan' },
  { name: 'Samuel', gender: 'male', usage_count: 1330, category: 'Christian' },
  { name: 'Sara', gender: 'female', usage_count: 1060, category: 'Christian' },
  { name: 'Selam', gender: 'female', usage_count: 1370, category: 'Traditional' },
  { name: 'Selamawit', gender: 'female', usage_count: 1250, category: 'Traditional' },
  { name: 'Semira', gender: 'female', usage_count: 710, category: 'Muslim' },
  { name: 'Senait', gender: 'female', usage_count: 940, category: 'Traditional' },
  { name: 'Seyoum', gender: 'male', usage_count: 680, category: 'Traditional' },
  { name: 'Shegitu', gender: 'female', usage_count: 490, category: 'Traditional' },
  { name: 'Shimelis', gender: 'male', usage_count: 710, category: 'Traditional' },
  { name: 'Sifan', gender: 'female', usage_count: 780, category: 'Oromo' },
  { name: 'Sintayehu', gender: 'unisex', usage_count: 770, category: 'Traditional' },
  { name: 'Sisay', gender: 'male', usage_count: 820, category: 'Traditional' },
  { name: 'Solomon', gender: 'male', usage_count: 1380, category: 'Christian' },
  { name: 'Surafel', gender: 'male', usage_count: 1020, category: 'Christian' },

  // T
  { name: 'Tadesse', gender: 'male', usage_count: 1360, category: 'Traditional' },
  { name: 'Tamirat', gender: 'male', usage_count: 870, category: 'Traditional' },
  { name: 'Tariku', gender: 'male', usage_count: 810, category: 'Traditional' },
  { name: 'Tefera', gender: 'male', usage_count: 890, category: 'Traditional' },
  { name: 'Tekle', gender: 'male', usage_count: 930, category: 'Traditional' },
  { name: 'Temesgen', gender: 'male', usage_count: 1090, category: 'Traditional' },
  { name: 'Tesfaye', gender: 'male', usage_count: 1320, category: 'Traditional' },
  { name: 'Teshome', gender: 'male', usage_count: 840, category: 'Traditional' },
  { name: 'Tesema', gender: 'male', usage_count: 670, category: 'Traditional' },
  { name: 'Tesfahun', gender: 'male', usage_count: 720, category: 'Traditional' },
  { name: 'Tewodros', gender: 'male', usage_count: 1280, category: 'Traditional' },
  { name: 'Tigist', gender: 'female', usage_count: 1180, category: 'Traditional' },
  { name: 'Tirhas', gender: 'female', usage_count: 710, category: 'Tigrayan' },
  { name: 'Tiruwork', gender: 'female', usage_count: 650, category: 'Traditional' },
  { name: 'Tolosa', gender: 'male', usage_count: 690, category: 'Oromo' },
  { name: 'Tsion', gender: 'female', usage_count: 1140, category: 'Christian' },
  { name: 'Tsige', gender: 'female', usage_count: 820, category: 'Traditional' },
  { name: 'Tsehay', gender: 'female', usage_count: 890, category: 'Traditional' },

  // U
  { name: 'Umer', gender: 'male', usage_count: 780, category: 'Muslim' },
  { name: 'Urji', gender: 'female', usage_count: 530, category: 'Oromo' },

  // W
  { name: 'Weinshet', gender: 'female', usage_count: 670, category: 'Traditional' },
  { name: 'Wondwossen', gender: 'male', usage_count: 760, category: 'Traditional' },
  { name: 'Worku', gender: 'male', usage_count: 850, category: 'Traditional' },
  { name: 'Worknesh', gender: 'female', usage_count: 710, category: 'Traditional' },
  { name: 'Welde', gender: 'male', usage_count: 740, category: 'Traditional' },
  { name: 'Wubishet', gender: 'male', usage_count: 680, category: 'Traditional' },

  // Y
  { name: 'Yared', gender: 'male', usage_count: 990, category: 'Christian' },
  { name: 'Yasin', gender: 'male', usage_count: 740, category: 'Muslim' },
  { name: 'Yemisrach', gender: 'female', usage_count: 780, category: 'Traditional' },
  { name: 'Yerusalem', gender: 'female', usage_count: 820, category: 'Christian' },
  { name: 'Yeshi', gender: 'female', usage_count: 710, category: 'Traditional' },
  { name: 'Yeshimebet', gender: 'female', usage_count: 640, category: 'Traditional' },
  { name: 'Yohannes', gender: 'male', usage_count: 1310, category: 'Christian' },
  { name: 'Yonas', gender: 'male', usage_count: 1290, category: 'Christian' },
  { name: 'Yosef', gender: 'male', usage_count: 1270, category: 'Christian' },
  { name: 'Yordanos', gender: 'female', usage_count: 870, category: 'Christian' },
  { name: 'Yusuf', gender: 'male', usage_count: 810, category: 'Muslim' },

  // Z
  { name: 'Zeineb', gender: 'female', usage_count: 760, category: 'Muslim' },
  { name: 'Zelalem', gender: 'male', usage_count: 920, category: 'Traditional' },
  { name: 'Zerihun', gender: 'male', usage_count: 840, category: 'Traditional' },
  { name: 'Zewdu', gender: 'male', usage_count: 790, category: 'Traditional' },
  { name: 'Zinash', gender: 'female', usage_count: 740, category: 'Traditional' },
  { name: 'Zufan', gender: 'female', usage_count: 680, category: 'Traditional' }
];

/**
 * Generate full EthiopianName items with unique IDs, normalized names, and timestamps.
 */
export function getInitialEthiopianNames(): EthiopianName[] {
  const timestamp = new Date().toISOString();
  return RAW_ETHIOPIAN_NAMES.map((item, index) => {
    return {
      id: `eth_name_${(index + 1).toString().padStart(4, '0')}`,
      name: item.name,
      normalized_name: normalizeEthiopianName(item.name),
      gender: item.gender,
      name_type: item.name_type || 'first_name',
      usage_count: item.usage_count || 100,
      is_active: true,
      category: item.category || 'Traditional',
      created_at: timestamp,
      updated_at: timestamp
    };
  });
}
