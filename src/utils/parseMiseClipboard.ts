const MISE_PATTERN = /^mise:(\d+)cal\|(\d+)p\|(\d+)f\|(\d+)c\|(\d+)meals$/;

export interface MiseNutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealsPlanned: number;
}

export function parseMiseClipboard(text: string): MiseNutrition | null {
  const trimmed = text.trim();
  const match = trimmed.match(MISE_PATTERN);
  if (!match) return null;

  return {
    calories: parseInt(match[1]),
    protein: parseInt(match[2]),
    fat: parseInt(match[3]),
    carbs: parseInt(match[4]),
    mealsPlanned: parseInt(match[5]),
  };
}
