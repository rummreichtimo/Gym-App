export interface SeedFood {
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: 'g' | 'ml' | 'piece' | 'portion';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
}

/** Values per the given serving size. Sources: common nutrition tables. */
export const SEED_FOODS: SeedFood[] = [
  // Protein
  { name: 'Hähnchenbrust, roh', servingSize: 100, servingUnit: 'g', calories: 106, protein: 23, carbs: 0, fat: 1.2, category: 'protein' },
  { name: 'Putenbrust, roh', servingSize: 100, servingUnit: 'g', calories: 105, protein: 24, carbs: 0, fat: 1, category: 'protein' },
  { name: 'Rinderhackfleisch 5% Fett', servingSize: 100, servingUnit: 'g', calories: 137, protein: 21, carbs: 0, fat: 5, category: 'protein' },
  { name: 'Rindersteak (Rumpsteak)', servingSize: 100, servingUnit: 'g', calories: 180, protein: 26, carbs: 0, fat: 8, category: 'protein' },
  { name: 'Schweinefilet', servingSize: 100, servingUnit: 'g', calories: 110, protein: 22, carbs: 0, fat: 2, category: 'protein' },
  { name: 'Lachsfilet', servingSize: 100, servingUnit: 'g', calories: 208, protein: 20, carbs: 0, fat: 13, category: 'protein' },
  { name: 'Thunfisch in Wasser', servingSize: 100, servingUnit: 'g', calories: 116, protein: 26, carbs: 0, fat: 1, category: 'protein' },
  { name: 'Kabeljau', servingSize: 100, servingUnit: 'g', calories: 82, protein: 18, carbs: 0, fat: 0.7, category: 'protein' },
  { name: 'Garnelen', servingSize: 100, servingUnit: 'g', calories: 99, protein: 24, carbs: 0.2, fat: 0.3, category: 'protein' },
  { name: 'Ei, ganz', servingSize: 1, servingUnit: 'piece', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, category: 'protein' },
  { name: 'Eiklar', servingSize: 100, servingUnit: 'g', calories: 52, protein: 11, carbs: 0.7, fat: 0.2, category: 'protein' },
  { name: 'Tofu, natur', servingSize: 100, servingUnit: 'g', calories: 144, protein: 15, carbs: 2.8, fat: 8.7, category: 'protein' },
  { name: 'Tempeh', servingSize: 100, servingUnit: 'g', calories: 193, protein: 19, carbs: 9, fat: 11, category: 'protein' },
  { name: 'Seitan', servingSize: 100, servingUnit: 'g', calories: 141, protein: 25, carbs: 4, fat: 2, category: 'protein' },
  { name: 'Linsen, gekocht', servingSize: 100, servingUnit: 'g', calories: 116, protein: 9, carbs: 20, fat: 0.4, category: 'protein' },
  { name: 'Kichererbsen, gekocht', servingSize: 100, servingUnit: 'g', calories: 164, protein: 8.9, carbs: 27, fat: 2.6, category: 'protein' },
  { name: 'Schwarze Bohnen, gekocht', servingSize: 100, servingUnit: 'g', calories: 132, protein: 8.9, carbs: 24, fat: 0.5, category: 'protein' },

  // Milchprodukte
  { name: 'Magerquark', servingSize: 100, servingUnit: 'g', calories: 67, protein: 12, carbs: 4.1, fat: 0.3, category: 'dairy' },
  { name: 'Skyr, natur', servingSize: 100, servingUnit: 'g', calories: 63, protein: 11, carbs: 4, fat: 0.2, category: 'dairy' },
  { name: 'Griechischer Joghurt 10%', servingSize: 100, servingUnit: 'g', calories: 133, protein: 5.6, carbs: 4, fat: 10, category: 'dairy' },
  { name: 'Naturjoghurt 3,5%', servingSize: 100, servingUnit: 'g', calories: 61, protein: 3.5, carbs: 4.7, fat: 3.5, category: 'dairy' },
  { name: 'Hüttenkäse', servingSize: 100, servingUnit: 'g', calories: 98, protein: 12, carbs: 3.4, fat: 4.3, category: 'dairy' },
  { name: 'Milch 1,5%', servingSize: 100, servingUnit: 'ml', calories: 47, protein: 3.4, carbs: 4.8, fat: 1.5, category: 'dairy' },
  { name: 'Gouda 45%', servingSize: 100, servingUnit: 'g', calories: 356, protein: 25, carbs: 2.2, fat: 27, category: 'dairy' },
  { name: 'Mozzarella light', servingSize: 100, servingUnit: 'g', calories: 190, protein: 22, carbs: 1.5, fat: 11, category: 'dairy' },
  { name: 'Harzer Käse', servingSize: 100, servingUnit: 'g', calories: 125, protein: 30, carbs: 0, fat: 0.5, category: 'dairy' },

  // Kohlenhydrate
  { name: 'Reis, gekocht', servingSize: 100, servingUnit: 'g', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, category: 'carbs' },
  { name: 'Reis, roh', servingSize: 100, servingUnit: 'g', calories: 350, protein: 7, carbs: 78, fat: 1, category: 'carbs' },
  { name: 'Basmatireis, gekocht', servingSize: 100, servingUnit: 'g', calories: 121, protein: 3, carbs: 25, fat: 0.4, category: 'carbs' },
  { name: 'Vollkornnudeln, gekocht', servingSize: 100, servingUnit: 'g', calories: 124, protein: 5, carbs: 25, fat: 0.9, category: 'carbs' },
  { name: 'Nudeln, gekocht', servingSize: 100, servingUnit: 'g', calories: 131, protein: 5, carbs: 25, fat: 1.1, category: 'carbs' },
  { name: 'Kartoffeln, gekocht', servingSize: 100, servingUnit: 'g', calories: 87, protein: 2, carbs: 20, fat: 0.1, category: 'carbs' },
  { name: 'Süßkartoffel, gekocht', servingSize: 100, servingUnit: 'g', calories: 90, protein: 2, carbs: 21, fat: 0.1, category: 'carbs' },
  { name: 'Haferflocken', servingSize: 100, servingUnit: 'g', calories: 372, protein: 13, carbs: 59, fat: 7, category: 'carbs' },
  { name: 'Vollkornbrot', servingSize: 1, servingUnit: 'piece', calories: 105, protein: 4, carbs: 19, fat: 1.2, category: 'carbs' },
  { name: 'Toastbrot', servingSize: 1, servingUnit: 'piece', calories: 78, protein: 2.5, carbs: 14, fat: 1, category: 'carbs' },
  { name: 'Couscous, gekocht', servingSize: 100, servingUnit: 'g', calories: 112, protein: 3.8, carbs: 23, fat: 0.2, category: 'carbs' },
  { name: 'Quinoa, gekocht', servingSize: 100, servingUnit: 'g', calories: 120, protein: 4.4, carbs: 21, fat: 1.9, category: 'carbs' },
  { name: 'Reiswaffel', servingSize: 1, servingUnit: 'piece', calories: 35, protein: 0.7, carbs: 7.3, fat: 0.3, category: 'carbs' },

  // Gemüse
  { name: 'Brokkoli', servingSize: 100, servingUnit: 'g', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, category: 'vegetables' },
  { name: 'Spinat', servingSize: 100, servingUnit: 'g', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, category: 'vegetables' },
  { name: 'Paprika', servingSize: 100, servingUnit: 'g', calories: 31, protein: 1, carbs: 6, fat: 0.3, category: 'vegetables' },
  { name: 'Tomaten', servingSize: 100, servingUnit: 'g', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, category: 'vegetables' },
  { name: 'Gurke', servingSize: 100, servingUnit: 'g', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, category: 'vegetables' },
  { name: 'Zucchini', servingSize: 100, servingUnit: 'g', calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, category: 'vegetables' },
  { name: 'Karotten', servingSize: 100, servingUnit: 'g', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, category: 'vegetables' },
  { name: 'Champignons', servingSize: 100, servingUnit: 'g', calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, category: 'vegetables' },
  { name: 'Grüne Bohnen', servingSize: 100, servingUnit: 'g', calories: 31, protein: 1.8, carbs: 7, fat: 0.1, category: 'vegetables' },
  { name: 'Blumenkohl', servingSize: 100, servingUnit: 'g', calories: 25, protein: 1.9, carbs: 5, fat: 0.3, category: 'vegetables' },

  // Obst
  { name: 'Banane', servingSize: 1, servingUnit: 'piece', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, category: 'fruit' },
  { name: 'Apfel', servingSize: 1, servingUnit: 'piece', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, category: 'fruit' },
  { name: 'Orange', servingSize: 1, servingUnit: 'piece', calories: 62, protein: 1.2, carbs: 15, fat: 0.2, category: 'fruit' },
  { name: 'Heidelbeeren', servingSize: 100, servingUnit: 'g', calories: 57, protein: 0.7, carbs: 14, fat: 0.3, category: 'fruit' },
  { name: 'Erdbeeren', servingSize: 100, servingUnit: 'g', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, category: 'fruit' },
  { name: 'Weintrauben', servingSize: 100, servingUnit: 'g', calories: 69, protein: 0.7, carbs: 18, fat: 0.2, category: 'fruit' },
  { name: 'Ananas', servingSize: 100, servingUnit: 'g', calories: 50, protein: 0.5, carbs: 13, fat: 0.1, category: 'fruit' },
  { name: 'Mango', servingSize: 100, servingUnit: 'g', calories: 60, protein: 0.8, carbs: 15, fat: 0.4, category: 'fruit' },

  // Fette & Nüsse
  { name: 'Mandeln', servingSize: 100, servingUnit: 'g', calories: 579, protein: 21, carbs: 22, fat: 50, category: 'fat' },
  { name: 'Walnüsse', servingSize: 100, servingUnit: 'g', calories: 654, protein: 15, carbs: 14, fat: 65, category: 'fat' },
  { name: 'Cashewkerne', servingSize: 100, servingUnit: 'g', calories: 553, protein: 18, carbs: 30, fat: 44, category: 'fat' },
  { name: 'Erdnussbutter', servingSize: 100, servingUnit: 'g', calories: 588, protein: 25, carbs: 20, fat: 50, category: 'fat' },
  { name: 'Olivenöl', servingSize: 100, servingUnit: 'ml', calories: 884, protein: 0, carbs: 0, fat: 100, category: 'fat' },
  { name: 'Avocado', servingSize: 100, servingUnit: 'g', calories: 160, protein: 2, carbs: 9, fat: 15, category: 'fat' },
  { name: 'Leinsamen', servingSize: 100, servingUnit: 'g', calories: 534, protein: 18, carbs: 29, fat: 42, category: 'fat' },
  { name: 'Chiasamen', servingSize: 100, servingUnit: 'g', calories: 486, protein: 17, carbs: 42, fat: 31, category: 'fat' },

  // Supplements
  { name: 'Whey Protein Pulver', servingSize: 30, servingUnit: 'g', calories: 117, protein: 24, carbs: 2.5, fat: 1.5, category: 'supplements' },
  { name: 'Casein Protein Pulver', servingSize: 30, servingUnit: 'g', calories: 110, protein: 24, carbs: 2, fat: 0.8, category: 'supplements' },
  { name: 'Maltodextrin', servingSize: 100, servingUnit: 'g', calories: 380, protein: 0, carbs: 95, fat: 0, category: 'supplements' },
  { name: 'Creatin Monohydrat', servingSize: 5, servingUnit: 'g', calories: 0, protein: 0, carbs: 0, fat: 0, category: 'supplements' },

  // Getränke
  { name: 'Wasser', servingSize: 250, servingUnit: 'ml', calories: 0, protein: 0, carbs: 0, fat: 0, category: 'drinks' },
  { name: 'Kaffee, schwarz', servingSize: 250, servingUnit: 'ml', calories: 2, protein: 0.3, carbs: 0, fat: 0, category: 'drinks' },
  { name: 'Orangensaft', servingSize: 250, servingUnit: 'ml', calories: 112, protein: 1.7, carbs: 26, fat: 0.5, category: 'drinks' },
  { name: 'Cola', servingSize: 330, servingUnit: 'ml', calories: 139, protein: 0, carbs: 35, fat: 0, category: 'drinks' },
  { name: 'Cola Zero', servingSize: 330, servingUnit: 'ml', calories: 1, protein: 0, carbs: 0, fat: 0, category: 'drinks' },
  { name: 'Bier', servingSize: 330, servingUnit: 'ml', calories: 142, protein: 1.5, carbs: 11, fat: 0, category: 'drinks' },

  // Snacks
  { name: 'Proteinriegel', servingSize: 1, servingUnit: 'piece', calories: 200, protein: 20, carbs: 20, fat: 6, category: 'snacks' },
  { name: 'Zartbitterschokolade 85%', servingSize: 100, servingUnit: 'g', calories: 592, protein: 8, carbs: 26, fat: 48, category: 'snacks' },
  { name: 'Vollmilchschokolade', servingSize: 100, servingUnit: 'g', calories: 535, protein: 7.6, carbs: 59, fat: 30, category: 'snacks' },
  { name: 'Chips', servingSize: 100, servingUnit: 'g', calories: 536, protein: 6.6, carbs: 53, fat: 34, category: 'snacks' },
  { name: 'Popcorn, ungesüßt', servingSize: 100, servingUnit: 'g', calories: 387, protein: 13, carbs: 78, fat: 4.5, category: 'snacks' },

  // Fertiggerichte
  { name: 'Pizza Margherita', servingSize: 1, servingUnit: 'portion', calories: 850, protein: 34, carbs: 106, fat: 30, category: 'meals' },
  { name: 'Döner Kebab', servingSize: 1, servingUnit: 'portion', calories: 650, protein: 38, carbs: 55, fat: 30, category: 'meals' },
  { name: 'Burger (Rind, einfach)', servingSize: 1, servingUnit: 'portion', calories: 540, protein: 25, carbs: 42, fat: 29, category: 'meals' },
  { name: 'Sushi Box (12 Stück)', servingSize: 1, servingUnit: 'portion', calories: 480, protein: 20, carbs: 82, fat: 6, category: 'meals' },
  { name: 'Caesar Salat mit Hähnchen', servingSize: 1, servingUnit: 'portion', calories: 470, protein: 33, carbs: 12, fat: 32, category: 'meals' },
];
