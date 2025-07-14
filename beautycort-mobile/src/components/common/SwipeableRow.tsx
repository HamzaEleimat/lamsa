import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  I18nManager,
} from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onArchive?: () => void;
  onEdit?: () => void;
}

export default function SwipeableRow({
  children,
  onDelete,
  onArchive,
  onEdit,
}: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const actions = [];

    if (onEdit) {
      actions.push({
        key: 'edit',
        color: colors.primary,
        icon: 'create-outline',
        onPress: () => {
          onEdit();
          swipeableRef.current?.close();
        },
      });
    }

    if (onArchive) {
      actions.push({
        key: 'archive',
        color: colors.warning,
        icon: 'archive-outline',
        onPress: () => {
          onArchive();
          swipeableRef.current?.close();
        },
      });
    }

    if (onDelete) {
      actions.push({
        key: 'delete',
        color: colors.error,
        icon: 'trash-outline',
        onPress: () => {
          onDelete();
          swipeableRef.current?.close();
        },
      });
    }

    return (
      <View style={styles.rightActionsContainer}>
        {actions.map((action, index) => {
          const trans = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [actions.length * 64, 0],
          });

          return (
            <Animated.View
              key={action.key}
              style={{ transform: [{ translateX: trans }] }}
            >
              <RectButton
                style={[styles.rightAction, { backgroundColor: action.color }]}
                onPress={action.onPress}
              >
                <Ionicons name={action.icon as any} size={24} color="white" />
              </RectButton>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!onArchive) return null;

    const trans = dragX.interpolate({
      inputRange: [0, 50, 100, 101],
      outputRange: [-20, 0, 0, 1],
    });

    return (
      <RectButton
        style={styles.leftAction}
        onPress={() => {
          onArchive();
          swipeableRef.current?.close();
        }}
      >
        <Animated.Text
          style={[
            styles.actionText,
            {
              transform: [{ translateX: trans }],
            },
          ]}
        >
          Archive
        </Animated.Text>
      </RectButton>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  rightActionsContainer: {
    flexDirection: 'row',
  },
  rightAction: {
    width: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftAction: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    backgroundColor: 'transparent',
    padding: 10,
  },
});