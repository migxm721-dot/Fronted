/**
 * Level mapping system for egg icons
 * Maps user levels to their corresponding egg icon and color
 */
import { ImageSourcePropType } from 'react-native';

export interface LevelConfig {
  minLevel: number;
  maxLevel: number;
  icon: ImageSourcePropType;
  label: string;
}

export const LEVEL_MAPPING: LevelConfig[] = [
  {
    minLevel: 1,
    maxLevel: 10,
    icon: require('@/assets/ic_level/ic_eggwhite.png'),
    label: 'Beginner',
  },
  {
    minLevel: 11,
    maxLevel: 25,
    icon: require('@/assets/ic_level/ic_eggblue.png'),
    label: 'Novice',
  },
  {
    minLevel: 26,
    maxLevel: 35,
    icon: require('@/assets/ic_level/ic_egggreen.png'),
    label: 'Intermediate',
  },
  {
    minLevel: 36,
    maxLevel: 69,
    icon: require('@/assets/ic_level/ic_eggyellow.png'),
    label: 'Advanced',
  },
  {
    minLevel: 70,
    maxLevel: 100,
    icon: require('@/assets/ic_level/ic_eggred.png'),
    label: 'Master',
  },
];

/**
 * Get the level configuration based on the user's level
 */
export const getLevelConfig = (level: number): LevelConfig => {
  const config = LEVEL_MAPPING.find(
    (mapping) => level >= mapping.minLevel && level <= mapping.maxLevel
  );
  return config || LEVEL_MAPPING[0]; // Default to first tier if not found
};
