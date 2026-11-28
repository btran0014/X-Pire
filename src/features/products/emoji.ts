/** Picks a generic food emoji from an item name, for items without a product photo. */
const RULES: [RegExp, string][] = [
  [/\b(ice cream|gelato|popsicle)/, '🍨'],
  [/\b(frozen|ice)\b/, '🧊'],
  [/\b(milk|cream|kefir|half and half)\b/, '🥛'],
  [/\b(yogh?urt)/, '🥣'],
  [/\b(cheese|cheddar|mozzarella|parmesan|brie|feta)/, '🧀'],
  [/\b(butter|margarine)\b/, '🧈'],
  [/\begg/, '🥚'],
  [/\b(chicken|turkey|poultry|wings?|drumsticks?)\b/, '🍗'],
  [/\b(beef|steak|pork|lamb|ground meat|mince|veal)\b/, '🥩'],
  [/\b(bacon|ham)\b/, '🥓'],
  [/\b(sausage|hot dog|bratwurst|salami|pepperoni|deli)\b/, '🌭'],
  [/\b(fish|salmon|tuna|cod|tilapia|trout)\b/, '🐟'],
  [/\b(shrimp|prawn|lobster|crab|scallop)/, '🦐'],
  [/\b(bread|bagel|bun|roll|loaf|toast|baguette)/, '🍞'],
  [/\b(tortilla|wrap|pita)/, '🫓'],
  [/\b(croissant|pastry|muffin|donut|doughnut)/, '🥐'],
  [/\b(cake|cookie|brownie|pie)\b/, '🍰'],
  [/\b(rice)\b/, '🍚'],
  [/\b(pasta|spaghetti|noodle|macaroni|penne)/, '🍝'],
  [/\b(cereal|oat|granola)/, '🥣'],
  [/\b(apple)/, '🍎'],
  [/\b(banana)/, '🍌'],
  [/\b(orange|clementine|mandarin)/, '🍊'],
  [/\b(lemon|lime)\b/, '🍋'],
  [/\b(grape)/, '🍇'],
  [/\b(strawberr|raspberr|blueberr|blackberr|berr)/, '🍓'],
  [/\b(peach|nectarine|apricot)/, '🍑'],
  [/\b(pear)\b/, '🍐'],
  [/\b(melon|watermelon|cantaloupe)/, '🍉'],
  [/\b(pineapple)/, '🍍'],
  [/\b(avocado)/, '🥑'],
  [/\b(tomato)/, '🍅'],
  [/\b(potato|fries)/, '🥔'],
  [/\b(carrot)/, '🥕'],
  [/\b(corn)\b/, '🌽'],
  [/\b(broccoli|cauliflower)/, '🥦'],
  [/\b(lettuce|spinach|kale|salad|greens|arugula|cabbage)/, '🥬'],
  [/\b(cucumber|zucchini)/, '🥒'],
  [/\b(pepper|chili)/, '🫑'],
  [/\b(onion|garlic|shallot)/, '🧅'],
  [/\b(mushroom)/, '🍄'],
  [/\b(peas?|beans?|lentils?|chickpeas?)\b/, '🫘'],
  [/\b(juice|lemonade)/, '🧃'],
  [/\b(soda|cola|coke|pop|sparkling|seltzer)\b/, '🥤'],
  [/\b(water)\b/, '💧'],
  [/\b(coffee|espresso)/, '☕'],
  [/\b(tea)\b/, '🍵'],
  [/\b(beer|ale|lager)\b/, '🍺'],
  [/\b(wine)\b/, '🍷'],
  [/\b(chocolate|candy)/, '🍫'],
  [/\b(chips|crisps|crackers|pretzel|popcorn)/, '🍿'],
  [/\b(pizza)/, '🍕'],
  [/\b(soup|broth|stock)\b/, '🍲'],
  [/\b(honey)\b/, '🍯'],
  [/\b(nuts?|almonds?|peanuts?|cashews?|walnuts?)\b/, '🥜'],
  [/\b(sauce|ketchup|mustard|mayo|dressing|salsa)/, '🫙'],
];

export const DEFAULT_EMOJI = '🍽️';

export function emojiFor(name: string): string {
  const text = name.toLowerCase();
  for (const [pattern, emoji] of RULES) if (pattern.test(text)) return emoji;
  return DEFAULT_EMOJI;
}

/** Accepts a model-supplied emoji only if it's a short pictograph, not text. */
export function cleanEmoji(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 16) return null;
  return /\p{Extended_Pictographic}/u.test(trimmed) && !/[A-Za-z0-9]/.test(trimmed)
    ? trimmed
    : null;
}
