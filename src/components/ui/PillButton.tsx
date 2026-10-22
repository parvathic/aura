import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, borderRadius } from '../../constants/theme';

interface PillButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'gradient' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function PillButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: PillButtonProps) {
  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 12 },
    md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 14 },
    lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 16 },
  };

  const { paddingVertical, paddingHorizontal, fontSize } = sizeStyles[size];

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { fontSize, fontFamily: typography.fontFamily.semiBold },
              variant === 'secondary' && { color: colors.secondary },
              variant === 'ghost' && { color: colors.onSurfaceVariant },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </>
  );

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={[fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={['#7345B6', '#B48A8F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            { paddingVertical, paddingHorizontal },
            fullWidth && styles.fullWidth,
            disabled && styles.disabled,
          ]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.9}
      style={[
        styles.base,
        { paddingVertical, paddingHorizontal },
        variant === 'primary' && styles.primaryBg,
        variant === 'secondary' && styles.secondaryBg,
        variant === 'ghost' && styles.ghostBg,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBg: {
    backgroundColor: colors.secondary,
  },
  secondaryBg: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: 'rgba(212, 194, 196, 0.15)', // ghost border per design system
  },
  ghostBg: {
    backgroundColor: colors.transparent,
  },
  text: {
    color: colors.onPrimary,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
