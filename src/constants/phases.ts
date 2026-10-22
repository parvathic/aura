// Phase definitions, wellness content, and recommendations
// Keyed by phase name for easy lookup from phaseEngine

export type PhaseName = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export interface PhaseInfo {
  name: string;
  displayName: string;
  description: string;
  foods: string[];
  exerciseLevel: 'Low' | 'Moderate' | 'High' | 'Light';
  exerciseDescription: string;
  insight: string;
  ritualSuggestion: string;
}

export const PHASES: Record<PhaseName, PhaseInfo> = {
  menstrual: {
    name: 'menstrual',
    displayName: 'Menstrual Phase',
    description:
      'Your body is shedding the uterine lining. This is a time for rest, reflection, and gentle nourishment. Honor your need for stillness.',
    foods: ['Iron-Rich Foods', 'Dark Chocolate', 'Warm Soups', 'Ginger Tea'],
    exerciseLevel: 'Light',
    exerciseDescription: 'Gentle yoga, walking, stretching. Listen to your body and rest when needed.',
    insight: 'Embrace rest and renewal during your Menstrual phase.',
    ritualSuggestion: 'Warm herbal tea ritual with ginger and chamomile.',
  },
  follicular: {
    name: 'follicular',
    displayName: 'Follicular Phase',
    description:
      'Estrogen is rising, bringing fresh energy and creativity. Your body is preparing for ovulation. This is your spring — a time of new beginnings.',
    foods: ['Fermented Foods', 'Leafy Greens', 'Lean Proteins', 'Flaxseeds'],
    exerciseLevel: 'Moderate',
    exerciseDescription: 'Cardio, dance, hiking. Your energy is building — try something new.',
    insight: 'Nurturing your body during the Follicular phase.',
    ritualSuggestion: 'Morning sunlight exposure for 10 minutes.',
  },
  ovulatory: {
    name: 'ovulatory',
    displayName: 'Ovulatory Phase',
    description:
      'You are at your peak energy and confidence. Estrogen and testosterone are at their highest. This is your summer — radiant and magnetic.',
    foods: ['Cruciferous Greens', 'Berries', 'Quinoa', 'Light Grains'],
    exerciseLevel: 'High',
    exerciseDescription: 'HIIT, running, strength training. Channel your peak energy.',
    insight: 'Radiance from within. Today your physiology is designed for connection and expansion.',
    ritualSuggestion: 'Mirror mantras — affirm your strength and beauty.',
  },
  luteal: {
    name: 'luteal',
    displayName: 'Luteal Phase',
    description:
      'Progesterone rises as your body prepares for the next cycle. You may crave comfort and routine. This is your autumn — a time for nesting.',
    foods: ['Complex Carbs', 'Sweet Potatoes', 'Sesame Seeds', 'Magnesium-Rich Foods'],
    exerciseLevel: 'Moderate',
    exerciseDescription: 'Pilates, swimming, moderate strength. Steady and grounding movements.',
    insight: 'Align your hormones with warming rituals during the Luteal phase.',
    ritualSuggestion: 'Herbal Infusion Ritual — raspberry leaf tea.',
  },
};

// Default cycle parameters
export const DEFAULTS = {
  cycleLength: 28,
  periodLength: 5,
  lutealLength: 14, // Biologically stable constant
  minCycleLength: 21,
  maxCycleLength: 45,
  fertileWindowDays: 6, // 5 days before ovulation + ovulation day
};

// Mood options (from the v5 Daily Log mockup)
export const MOOD_OPTIONS = [
  'Balanced',
  'Energetic',
  'Irritable',
  'Tired',
  'Sensitive',
] as const;

// Symptom options (from wireframe Daily Log screen)
export const SYMPTOM_OPTIONS = [
  { label: 'Cramps', icon: 'fitness-center' },
  { label: 'Bloating', icon: 'water-drop' },
  { label: 'Headache', icon: 'psychology' },
  { label: 'Backache', icon: 'accessibility-new' },
] as const;

// Flow levels
export const FLOW_OPTIONS = ['None', 'Light', 'Medium', 'Heavy'] as const;

// Intention options for routines (from wireframe)
export const INTENTION_OPTIONS = ['Balance', 'Energy', 'Calm'] as const;

// Routine card icon for each intention (MaterialIcons names)
export const INTENTION_ICONS: Record<string, 'spa' | 'bolt' | 'nightlight'> = {
  balance: 'spa',
  energy: 'bolt',
  calm: 'nightlight',
};

// Frequency options for routines (from wireframe)
export const FREQUENCY_OPTIONS = ['Daily', 'Weekly', 'Monthly'] as const;
