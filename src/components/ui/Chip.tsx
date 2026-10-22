import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography, borderRadius } from '../../constants/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}

export default function Chip({ label, selected, onPress, icon }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon}
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipSelected: {
    backgroundColor: colors.secondaryContainer,
  },
  text: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  textSelected: {
    color: colors.onSecondaryContainer,
    fontFamily: typography.fontFamily.semiBold,
  },
});
