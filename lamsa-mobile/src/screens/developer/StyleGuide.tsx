import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getTypography,
  createShadow,
  shadowPresets,
  spacing,
  layout,
  componentSpacing,
  animations,
  animationUtils,
} from '@styles/platform';
import { useExtendedTheme } from '@providers/ThemeProvider';
import { BORDER_RADIUS } from '@utils/platform/constants';

export default function StyleGuide() {
  const theme = useTheme();
  const { toggleTheme, isDark } = useExtendedTheme();
  const scaleAnim = animationUtils.createValue(1);

  const renderSection = (title: string, content: React.ReactNode) => (
    <View style={[styles.section, shadowPresets.card]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        {title}
      </Text>
      {content}
    </View>
  );

  const renderColorSwatch = (name: string, color: string) => (
    <View style={styles.colorItem}>
      <View style={[styles.colorSwatch, { backgroundColor: color }]} />
      <Text style={[styles.colorName, { color: theme.colors.onSurface }]}>
        {name}
      </Text>
      <Text style={[styles.colorValue, { color: theme.colors.onSurfaceVariant }]}>
        {color}
      </Text>
    </View>
  );

  const renderTypographySample = (variant: any, label: string) => (
    <View style={styles.typographyItem}>
      <Text style={[getTypography(variant), { color: theme.colors.onBackground }]}>
        {label}
      </Text>
      <Text style={[styles.typographyLabel, { color: theme.colors.onSurfaceVariant }]}>
        {variant}
      </Text>
    </View>
  );

  const renderShadowSample = (level: any, label: string) => (
    <View style={styles.shadowItem}>
      <View style={[styles.shadowBox, createShadow(level), { backgroundColor: theme.colors.surface }]}>
        <Text style={{ color: theme.colors.onSurface }}>{label}</Text>
      </View>
    </View>
  );

  const renderSpacingSample = (size: keyof typeof spacing, label: string) => (
    <View style={styles.spacingItem}>
      <View 
        style={[
          styles.spacingBox, 
          { 
            width: spacing[size], 
            height: spacing[size],
            backgroundColor: theme.colors.primary,
          }
        ]} 
      />
      <Text style={[styles.spacingLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}: {spacing[size]}px
      </Text>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          Style Guide
        </Text>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeToggle, { backgroundColor: theme.colors.primaryContainer }]}
        >
          <MaterialCommunityIcons
            name={isDark ? 'weather-sunny' : 'weather-night'}
            size={24}
            color={theme.colors.onPrimaryContainer}
          />
        </TouchableOpacity>
      </View>

      {renderSection('Colors', (
        <View style={styles.colorGrid}>
          {renderColorSwatch('Primary', theme.colors.primary)}
          {renderColorSwatch('Secondary', theme.colors.secondary)}
          {renderColorSwatch('Tertiary', theme.colors.tertiary)}
          {renderColorSwatch('Surface', theme.colors.surface)}
          {renderColorSwatch('Background', theme.colors.background)}
          {renderColorSwatch('Error', theme.colors.error)}
        </View>
      ))}

      {renderSection('Typography', (
        <View style={styles.typographyList}>
          {renderTypographySample('h1', 'Heading 1')}
          {renderTypographySample('h2', 'Heading 2')}
          {renderTypographySample('h3', 'Heading 3')}
          {renderTypographySample('h4', 'Heading 4')}
          {renderTypographySample('h5', 'Heading 5')}
          {renderTypographySample('h6', 'Heading 6')}
          {renderTypographySample('subtitle1', 'Subtitle 1')}
          {renderTypographySample('subtitle2', 'Subtitle 2')}
          {renderTypographySample('body1', 'Body 1 - Lorem ipsum dolor sit amet')}
          {renderTypographySample('body2', 'Body 2 - Lorem ipsum dolor sit amet')}
          {renderTypographySample('button', 'BUTTON TEXT')}
          {renderTypographySample('caption', 'Caption text')}
          {renderTypographySample('overline', 'OVERLINE TEXT')}
        </View>
      ))}

      {renderSection('Shadows', (
        <View style={styles.shadowGrid}>
          {renderShadowSample(0, 'Level 0')}
          {renderShadowSample(1, 'Level 1')}
          {renderShadowSample(2, 'Level 2')}
          {renderShadowSample(3, 'Level 3')}
          {renderShadowSample(4, 'Level 4')}
          {renderShadowSample(6, 'Level 6')}
          {renderShadowSample(8, 'Level 8')}
          {renderShadowSample(12, 'Level 12')}
          {renderShadowSample(16, 'Level 16')}
        </View>
      ))}

      {renderSection('Spacing', (
        <View style={styles.spacingList}>
          {renderSpacingSample('xxs', 'XXS')}
          {renderSpacingSample('xs', 'XS')}
          {renderSpacingSample('sm', 'SM')}
          {renderSpacingSample('md', 'MD')}
          {renderSpacingSample('lg', 'LG')}
          {renderSpacingSample('xl', 'XL')}
          {renderSpacingSample('xxl', 'XXL')}
          {renderSpacingSample('xxxl', 'XXXL')}
        </View>
      ))}

      {renderSection('Border Radius', (
        <View style={styles.radiusGrid}>
          <View style={[styles.radiusBox, { borderRadius: BORDER_RADIUS.small }]}>
            <Text style={styles.radiusLabel}>Small ({BORDER_RADIUS.small})</Text>
          </View>
          <View style={[styles.radiusBox, { borderRadius: BORDER_RADIUS.medium }]}>
            <Text style={styles.radiusLabel}>Medium ({BORDER_RADIUS.medium})</Text>
          </View>
          <View style={[styles.radiusBox, { borderRadius: BORDER_RADIUS.large }]}>
            <Text style={styles.radiusLabel}>Large ({BORDER_RADIUS.large})</Text>
          </View>
          <View style={[styles.radiusBox, { borderRadius: BORDER_RADIUS.round }]}>
            <Text style={styles.radiusLabel}>Round</Text>
          </View>
        </View>
      ))}

      {renderSection('Component Examples', (
        <View style={styles.componentExamples}>
          <TouchableOpacity
            style={[
              styles.button,
              shadowPresets.button,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => {
              animations.scale(scaleAnim, 0.95).start(() => {
                animations.scale(scaleAnim, 1, { type: 'bouncy' }).start();
              });
            }}
          >
            <Text style={[getTypography('button'), { color: theme.colors.onPrimary }]}>
              Primary Button
            </Text>
          </TouchableOpacity>

          <View style={[styles.card, shadowPresets.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[getTypography('h6'), { color: theme.colors.onSurface }]}>
              Card Title
            </Text>
            <Text 
              style={[
                getTypography('body2'), 
                { color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }
              ]}
            >
              This is a card component with proper shadows and spacing.
            </Text>
          </View>

          <View style={[styles.inputField, { borderColor: theme.colors.outline }]}>
            <Text style={[getTypography('body1'), { color: theme.colors.onSurfaceVariant }]}>
              Input Field Example
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...layout.padding('lg'),
    ...layout.paddingBottom('md'),
  },
  title: {
    ...getTypography('h3'),
  },
  themeToggle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.medium,
    ...layout.padding('md'),
    ...layout.marginHorizontal('md'),
    ...layout.marginBottom('md'),
  },
  sectionTitle: {
    ...getTypography('h5'),
    marginBottom: spacing.md,
  },
  
  // Color styles
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorItem: {
    width: '30%',
    alignItems: 'center',
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: spacing.xs,
  },
  colorName: {
    ...getTypography('caption'),
    fontWeight: '600',
  },
  colorValue: {
    ...getTypography('caption'),
  },
  
  // Typography styles
  typographyList: {
    gap: spacing.md,
  },
  typographyItem: {
    gap: spacing.xxs,
  },
  typographyLabel: {
    ...getTypography('caption'),
  },
  
  // Shadow styles
  shadowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  shadowItem: {
    width: '45%',
  },
  shadowBox: {
    height: 80,
    borderRadius: BORDER_RADIUS.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Spacing styles
  spacingList: {
    gap: spacing.sm,
  },
  spacingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  spacingBox: {
    backgroundColor: '#FF8FAB',
    borderRadius: BORDER_RADIUS.small,
  },
  spacingLabel: {
    ...getTypography('body2'),
  },
  
  // Border radius styles
  radiusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  radiusBox: {
    width: '45%',
    height: 60,
    backgroundColor: '#FFE5EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusLabel: {
    ...getTypography('caption'),
    color: '#50373E',
  },
  
  // Component examples
  componentExamples: {
    gap: spacing.md,
  },
  button: {
    height: 48,
    borderRadius: BORDER_RADIUS.medium,
    justifyContent: 'center',
    alignItems: 'center',
    ...layout.paddingHorizontal('lg'),
  },
  card: {
    borderRadius: BORDER_RADIUS.medium,
    ...layout.padding('md'),
  },
  inputField: {
    height: 56,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    ...layout.paddingHorizontal('md'),
    justifyContent: 'center',
  },
});