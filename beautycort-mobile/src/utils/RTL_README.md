# RTL (Right-to-Left) Layout System

A comprehensive RTL layout system for BeautyCort mobile app that provides seamless Arabic language support with proper right-to-left layouts.

## 🌍 Overview

This RTL system ensures that the BeautyCort mobile app provides an excellent user experience for Arabic-speaking users by automatically handling:

- Text alignment and direction
- Layout direction (flex, positioning)
- Spacing (margins, padding)
- Border positioning
- Icon rotation and positioning
- Animation directions
- Component layouts

## 📁 File Structure

```
src/
├── utils/
│   ├── rtl.ts                  # Core RTL utilities
│   ├── rtl-testing.ts          # RTL testing framework
│   └── RTL_README.md           # This documentation
├── components/
│   ├── RTLButton.tsx           # RTL-aware button component
│   ├── RTLCard.tsx             # RTL-aware card component
│   ├── RTLInput.tsx            # RTL-aware input component
│   ├── RTLList.tsx             # RTL-aware list component
│   └── RTLLayout.tsx           # RTL-aware layout components
└── examples/
    └── RTLExamples.tsx         # Usage examples and demos
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { getTextAlign, getFlexDirection, getMarginStart } from '../utils/rtl';

// Text alignment
const textStyle = {
  textAlign: getTextAlign('left') // Returns 'right' in RTL, 'left' in LTR
};

// Flex direction
const rowStyle = {
  flexDirection: getFlexDirection('row') // Returns 'row-reverse' in RTL, 'row' in LTR
};

// Spacing
const spacingStyle = {
  ...getMarginStart(16) // Returns { marginRight: 16 } in RTL, { marginLeft: 16 } in LTR
};
```

### Using RTL Components

```typescript
import RTLButton from '../components/RTLButton';
import RTLInput from '../components/RTLInput';
import { RTLRow, RTLContainer } from '../components/RTLLayout';

const MyComponent = () => (
  <RTLContainer padding={16}>
    <RTLInput
      value={text}
      onChangeText={setText}
      placeholder="أدخل النص هنا..."
      label="اسم المستخدم"
    />
    
    <RTLRow justify="space-between">
      <RTLButton
        title="إلغاء"
        onPress={onCancel}
        variant="secondary"
      />
      <RTLButton
        title="حفظ"
        onPress={onSave}
        variant="primary"
      />
    </RTLRow>
  </RTLContainer>
);
```

## 🔧 Core Utilities

### Text Alignment

```typescript
// Always use getTextAlign for text alignment
getTextAlign('left')    // 'right' in RTL, 'left' in LTR
getTextAlign('right')   // 'left' in RTL, 'right' in LTR
getTextAlign('center')  // 'center' in both (unchanged)
```

### Flex Direction

```typescript
// Always use getFlexDirection for row layouts
getFlexDirection('row')         // 'row-reverse' in RTL, 'row' in LTR
getFlexDirection('row-reverse') // 'row' in RTL, 'row-reverse' in LTR
getFlexDirection('column')      // 'column' in both (unchanged)
```

### Spacing Utilities

```typescript
// Margin utilities
getMarginStart(16)     // { marginRight: 16 } in RTL, { marginLeft: 16 } in LTR
getMarginEnd(16)       // { marginLeft: 16 } in RTL, { marginRight: 16 } in LTR
getMarginLeft(16)      // { marginRight: 16 } in RTL, { marginLeft: 16 } in LTR
getMarginRight(16)     // { marginLeft: 16 } in RTL, { marginRight: 16 } in LTR

// Padding utilities
getPaddingStart(16)    // { paddingRight: 16 } in RTL, { paddingLeft: 16 } in LTR
getPaddingEnd(16)      // { paddingLeft: 16 } in RTL, { paddingRight: 16 } in LTR
getPaddingLeft(16)     // { paddingRight: 16 } in RTL, { paddingLeft: 16 } in LTR
getPaddingRight(16)    // { paddingLeft: 16 } in RTL, { paddingRight: 16 } in LTR

// Horizontal spacing
getMarginHorizontal(8, 16)  // { marginLeft: 16, marginRight: 8 } in RTL
getPaddingHorizontal(8, 16) // { paddingLeft: 16, paddingRight: 8 } in RTL
```

### Position Utilities

```typescript
// Position utilities
getPositionStart(16)   // { right: 16 } in RTL, { left: 16 } in LTR
getPositionEnd(16)     // { left: 16 } in RTL, { right: 16 } in LTR
getPositionLeft(16)    // { right: 16 } in RTL, { left: 16 } in LTR
getPositionRight(16)   // { left: 16 } in RTL, { right: 16 } in LTR
```

### Border Utilities

```typescript
// Border utilities
getBorderStart(1, '#000')  // { borderRightWidth: 1, borderRightColor: '#000' } in RTL
getBorderEnd(1, '#000')    // { borderLeftWidth: 1, borderLeftColor: '#000' } in RTL
getBorderLeft(1, '#000')   // { borderRightWidth: 1, borderRightColor: '#000' } in RTL
getBorderRight(1, '#000')  // { borderLeftWidth: 1, borderLeftColor: '#000' } in RTL
```

## 🧩 RTL Components

### RTLButton

RTL-aware button component with proper icon positioning and text alignment.

```typescript
<RTLButton
  title="احفظ التغييرات"
  onPress={handleSave}
  variant="primary"
  icon={<SaveIcon />}
  iconPosition="left"      // Will appear on right in RTL
  fullWidth
/>
```

**Props:**
- `title`: Button text
- `onPress`: Press handler
- `variant`: 'primary' | 'secondary' | 'text'
- `size`: 'small' | 'medium' | 'large'
- `icon`: Icon component
- `iconPosition`: 'left' | 'right'
- `disabled`: Boolean
- `loading`: Boolean
- `fullWidth`: Boolean

### RTLInput

RTL-aware input component with proper text alignment and icon positioning.

```typescript
<RTLInput
  value={searchText}
  onChangeText={setSearchText}
  placeholder="ابحث عن الخدمات..."
  label="البحث"
  leftIcon={<SearchIcon />}   // Will appear on right in RTL
  rightIcon={<ClearIcon />}   // Will appear on left in RTL
  required
/>
```

**Props:**
- `value`: Input value
- `onChangeText`: Change handler
- `placeholder`: Placeholder text
- `label`: Input label
- `leftIcon`: Left icon component
- `rightIcon`: Right icon component
- `multiline`: Boolean
- `secureTextEntry`: Boolean
- `required`: Boolean
- `error`: Error message

### RTLCard

RTL-aware card component with proper content alignment and image positioning.

```typescript
<RTLCard
  title="صالون الجمال"
  subtitle="Beauty Salon"
  description="خدمات تجميل متكاملة"
  image={<Image source={salonImage} />}
  imagePosition="left"        // Will appear on right in RTL
  actions={
    <RTLButton title="احجز الآن" onPress={handleBook} />
  }
  onPress={handleCardPress}
/>
```

**Props:**
- `title`: Card title
- `subtitle`: Card subtitle
- `description`: Card description
- `image`: Image component
- `imagePosition`: 'left' | 'right' | 'top'
- `actions`: Action buttons
- `onPress`: Press handler
- `elevation`: Shadow elevation

### RTLList

RTL-aware list component with proper item layout and separator positioning.

```typescript
<RTLList
  data={items}
  renderItem={(item, index) => (
    <CustomListItem item={item} />
  )}
  showSeparator={true}
  onRefresh={handleRefresh}
  refreshing={isRefreshing}
/>
```

**Props:**
- `data`: Array of items
- `renderItem`: Custom item renderer
- `showSeparator`: Boolean
- `onRefresh`: Refresh handler
- `refreshing`: Boolean
- `ListHeaderComponent`: Header component
- `ListFooterComponent`: Footer component

### RTL Layout Components

Collection of layout components that work correctly in RTL.

```typescript
import { RTLRow, RTLColumn, RTLContainer, RTLSpacer } from '../components/RTLLayout';

<RTLContainer padding={16}>
  <RTLRow justify="space-between" align="center">
    <RTLButton title="إلغاء" variant="secondary" />
    <RTLSpacer size={8} horizontal />
    <RTLButton title="حفظ" variant="primary" />
  </RTLRow>
  
  <RTLSpacer size={16} />
  
  <RTLColumn align="center">
    <Text>المحتوى المحاذي للمركز</Text>
  </RTLColumn>
</RTLContainer>
```

## 🧪 Testing RTL Implementation

### Using RTL Testing Framework

```typescript
import RTLTester, { RTLTestScenarios } from '../utils/rtl-testing';

const testMyComponent = () => {
  const tester = new RTLTester();
  
  // Test button component
  const buttonStyle = { flexDirection: getFlexDirection('row') };
  const iconStyle = getMarginStart(8);
  RTLTestScenarios.testButton(tester, buttonStyle, iconStyle);
  
  // Test input component
  const inputStyle = { textAlign: getTextAlign('left') };
  const containerStyle = { flexDirection: getFlexDirection('row') };
  RTLTestScenarios.testInput(tester, inputStyle, containerStyle);
  
  // Print results
  tester.printResults();
};
```

### Manual Testing Checklist

- [ ] Text aligns correctly (right in Arabic, left in English)
- [ ] Icons position correctly (swap sides in RTL)
- [ ] Buttons and interactive elements work properly
- [ ] List items flow correctly
- [ ] Navigation works in both directions
- [ ] Forms submit correctly with Arabic text
- [ ] Animations flow in correct direction

## 📱 Common Use Cases

### 1. Provider Card Layout

```typescript
const ProviderCard = ({ provider }) => (
  <RTLCard
    title={provider.businessNameAr || provider.businessName}
    subtitle={provider.categoryAr || provider.category}
    description={provider.descriptionAr || provider.description}
    image={<ProviderImage source={provider.image} />}
    imagePosition="left"
    actions={
      <RTLRow>
        <RTLButton
          title="احجز الآن"
          onPress={() => handleBooking(provider.id)}
          variant="primary"
          size="small"
        />
        <RTLSpacer size={8} horizontal />
        <RTLButton
          title="تفاصيل أكثر"
          onPress={() => handleDetails(provider.id)}
          variant="text"
          size="small"
        />
      </RTLRow>
    }
  />
);
```

### 2. Search Bar

```typescript
const SearchBar = ({ value, onChangeText, onFilter }) => (
  <RTLRow align="center">
    <RTLInput
      value={value}
      onChangeText={onChangeText}
      placeholder="ابحث عن الخدمات..."
      leftIcon={<SearchIcon />}
      style={{ flex: 1 }}
    />
    <RTLSpacer size={8} horizontal />
    <RTLButton
      title="تصفية"
      onPress={onFilter}
      variant="secondary"
      icon={<FilterIcon />}
      iconPosition="left"
    />
  </RTLRow>
);
```

### 3. Form Layout

```typescript
const BookingForm = () => (
  <RTLContainer padding={16} scrollable>
    <RTLInput
      label="اسم العميل"
      value={customerName}
      onChangeText={setCustomerName}
      required
    />
    
    <RTLSpacer size={16} />
    
    <RTLInput
      label="رقم الهاتف"
      value={phoneNumber}
      onChangeText={setPhoneNumber}
      keyboardType="phone-pad"
      required
    />
    
    <RTLSpacer size={16} />
    
    <RTLInput
      label="ملاحظات"
      value={notes}
      onChangeText={setNotes}
      multiline
      numberOfLines={4}
    />
    
    <RTLSpacer size={32} />
    
    <RTLRow justify="space-between">
      <RTLButton
        title="إلغاء"
        onPress={handleCancel}
        variant="secondary"
        style={{ flex: 1 }}
      />
      <RTLSpacer size={16} horizontal />
      <RTLButton
        title="تأكيد الحجز"
        onPress={handleConfirm}
        variant="primary"
        style={{ flex: 1 }}
      />
    </RTLRow>
  </RTLContainer>
);
```

## 🎯 Best Practices

### 1. Always Use RTL Utilities

```typescript
// ❌ Don't do this
const badStyle = {
  textAlign: 'left',
  flexDirection: 'row',
  marginLeft: 16
};

// ✅ Do this
const goodStyle = {
  textAlign: getTextAlign('left'),
  flexDirection: getFlexDirection('row'),
  ...getMarginStart(16)
};
```

### 2. Use Semantic Spacing

```typescript
// ❌ Don't use left/right
const badSpacing = {
  marginLeft: 16,
  paddingRight: 8
};

// ✅ Use start/end
const goodSpacing = {
  ...getMarginStart(16),
  ...getPaddingEnd(8)
};
```

### 3. Test Both Languages

```typescript
// Always test components in both languages
const TestComponent = () => (
  <View>
    <Text>English text alignment test</Text>
    <Text>اختبار محاذاة النص العربي</Text>
  </View>
);
```

### 4. Handle Icons Properly

```typescript
// Use icon rotation for directional icons
const BackButton = ({ onPress }) => (
  <RTLButton
    title="رجوع"
    onPress={onPress}
    icon={<BackIcon style={getIconRotation('back')} />}
    iconPosition="left"
  />
);
```

## 🔧 Troubleshooting

### Common Issues

1. **Text not aligning correctly**
   - Solution: Use `getTextAlign()` instead of hardcoded values

2. **Icons appearing on wrong side**
   - Solution: Use RTL-aware components and `getIconRotation()`

3. **Spacing issues in RTL**
   - Solution: Use `getMarginStart()`, `getPaddingEnd()` etc.

4. **Animations going wrong direction**
   - Solution: Use `getSlideAnimation()` for directional animations

5. **Forms not submitting Arabic text**
   - Solution: Use RTL-aware inputs with proper text direction

### Debugging

```typescript
import { debugRTL } from '../utils/rtl';

// Debug RTL state
debugRTL();

// Debug component styles
import { RTLDebug } from '../utils/rtl-testing';
RTLDebug.debugComponentStyles('MyComponent', styles);
```

## 🚀 Performance Considerations

- RTL utilities are lightweight and have minimal performance impact
- Use `createRTLStyle()` for static styles to avoid repeated calculations
- Cache RTL-aware styles when possible
- Use `isRTL()` sparingly in render methods

## 📚 Examples

See `src/examples/RTLExamples.tsx` for comprehensive usage examples of all RTL components and utilities.

## 🤝 Contributing

When adding new RTL utilities or components:

1. Follow the existing naming conventions
2. Add comprehensive tests using the RTL testing framework
3. Update this documentation
4. Test thoroughly in both Arabic and English
5. Consider edge cases and accessibility

## 📄 License

This RTL system is part of the BeautyCort project and follows the same license terms.