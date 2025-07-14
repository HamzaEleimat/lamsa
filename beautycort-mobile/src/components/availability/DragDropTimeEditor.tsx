import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanGestureHandler,
  State,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { colors } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

interface TimeBlock {
  id: string;
  startTime: Date;
  endTime: Date;
  type: 'available' | 'break' | 'blocked';
  title?: string;
  color?: string;
  draggable?: boolean;
  resizable?: boolean;
}

interface DragDropTimeEditorProps {
  timeBlocks: TimeBlock[];
  onTimeBlockChange: (blocks: TimeBlock[]) => void;
  onTimeBlockSelect?: (block: TimeBlock) => void;
  startHour?: number;
  endHour?: number;
  slotDuration?: number; // in minutes
  snapToGrid?: boolean;
  showTimeLine?: boolean;
  readOnly?: boolean;
}

const SLOT_HEIGHT = 4; // Height per minute
const HOUR_HEIGHT = SLOT_HEIGHT * 60; // 240px per hour
const TIME_LABEL_WIDTH = 60;
const GRID_WIDTH = width - TIME_LABEL_WIDTH - 32;

export default function DragDropTimeEditor({
  timeBlocks,
  onTimeBlockChange,
  onTimeBlockSelect,
  startHour = 6,
  endHour = 22,
  slotDuration = 15,
  snapToGrid = true,
  showTimeLine = true,
  readOnly = false,
}: DragDropTimeEditorProps) {
  const { t } = useTranslation();
  
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<TimeBlock | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const totalHours = endHour - startHour;
  const gridHeight = totalHours * HOUR_HEIGHT;

  const getTimeFromPosition = (y: number): Date => {
    const minutes = Math.max(0, (y / SLOT_HEIGHT) + (startHour * 60));
    const snappedMinutes = snapToGrid 
      ? Math.round(minutes / slotDuration) * slotDuration
      : minutes;
    
    const date = new Date();
    date.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);
    return date;
  };

  const getPositionFromTime = (time: Date): number => {
    const totalMinutes = time.getHours() * 60 + time.getMinutes();
    const relativeMinutes = totalMinutes - (startHour * 60);
    return Math.max(0, relativeMinutes * SLOT_HEIGHT);
  };

  const getDurationHeight = (startTime: Date, endTime: Date): number => {
    const minutes = differenceInMinutes(endTime, startTime);
    return minutes * SLOT_HEIGHT;
  };

  const formatTime = (time: Date): string => {
    return format(time, 'HH:mm');
  };

  const getBlockColor = (type: TimeBlock['type'], isSelected: boolean): string => {
    if (isSelected) return colors.primary;
    
    switch (type) {
      case 'available':
        return colors.success;
      case 'break':
        return colors.warning;
      case 'blocked':
        return colors.error;
      default:
        return colors.gray;
    }
  };

  const handleBlockPress = (block: TimeBlock) => {
    if (readOnly) return;
    
    setSelectedBlockId(block.id === selectedBlockId ? null : block.id);
    onTimeBlockSelect?.(block);
    
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }
  };

  const updateTimeBlock = (blockId: string, updates: Partial<TimeBlock>) => {
    const updatedBlocks = timeBlocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    );
    onTimeBlockChange(updatedBlocks);
  };

  const createDragGestureHandler = (block: TimeBlock) => {
    return useAnimatedGestureHandler({
      onStart: (_, context) => {
        context.startY = getPositionFromTime(block.startTime);
        runOnJS(setIsDragging)(true);
        runOnJS(setDraggedBlock)(block);
        
        if (Platform.OS !== 'web') {
          runOnJS(Vibration.vibrate)(50);
        }
      },
      onActive: (event, context) => {
        const newY = context.startY + event.translationY;
        const newStartTime = getTimeFromPosition(newY);
        const duration = differenceInMinutes(block.endTime, block.startTime);
        const newEndTime = addMinutes(newStartTime, duration);
        
        // Update block position in real-time
        runOnJS(updateTimeBlock)(block.id, {
          startTime: newStartTime,
          endTime: newEndTime,
        });
      },
      onEnd: () => {
        runOnJS(setIsDragging)(false);
        runOnJS(setDraggedBlock)(null);
      },
    });
  };

  const createResizeGestureHandler = (block: TimeBlock, direction: 'top' | 'bottom') => {
    return useAnimatedGestureHandler({
      onStart: () => {
        runOnJS(setIsResizing)(true);
        
        if (Platform.OS !== 'web') {
          runOnJS(Vibration.vibrate)(30);
        }
      },
      onActive: (event) => {
        if (direction === 'top') {
          const newY = getPositionFromTime(block.startTime) + event.translationY;
          const newStartTime = getTimeFromPosition(newY);
          
          // Ensure minimum duration of 15 minutes
          if (differenceInMinutes(block.endTime, newStartTime) >= 15) {
            runOnJS(updateTimeBlock)(block.id, { startTime: newStartTime });
          }
        } else {
          const currentEndY = getPositionFromTime(block.endTime);
          const newY = currentEndY + event.translationY;
          const newEndTime = getTimeFromPosition(newY);
          
          // Ensure minimum duration of 15 minutes
          if (differenceInMinutes(newEndTime, block.startTime) >= 15) {
            runOnJS(updateTimeBlock)(block.id, { endTime: newEndTime });
          }
        }
      },
      onEnd: () => {
        runOnJS(setIsResizing)(false);
      },
    });
  };

  const renderTimeLabels = () => {
    const labels = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      labels.push(
        <View key={hour} style={[styles.timeLabel, { top: (hour - startHour) * HOUR_HEIGHT }]}>
          <Text style={styles.timeLabelText}>
            {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
          </Text>
        </View>
      );
    }
    return labels;
  };

  const renderGridLines = () => {
    const lines = [];
    
    // Hour lines
    for (let hour = startHour; hour <= endHour; hour++) {
      lines.push(
        <View
          key={`hour-${hour}`}
          style={[
            styles.gridLine,
            styles.hourLine,
            { top: (hour - startHour) * HOUR_HEIGHT }
          ]}
        />
      );
    }
    
    // Quarter hour lines
    if (slotDuration <= 15) {
      for (let hour = startHour; hour < endHour; hour++) {
        for (let quarter = 1; quarter < 4; quarter++) {
          lines.push(
            <View
              key={`quarter-${hour}-${quarter}`}
              style={[
                styles.gridLine,
                styles.quarterLine,
                { top: (hour - startHour) * HOUR_HEIGHT + (quarter * HOUR_HEIGHT / 4) }
              ]}
            />
          );
        }
      }
    }
    
    return lines;
  };

  const renderTimeBlock = (block: TimeBlock) => {
    const top = getPositionFromTime(block.startTime);
    const height = getDurationHeight(block.startTime, block.endTime);
    const isSelected = block.id === selectedBlockId;
    const blockColor = block.color || getBlockColor(block.type, isSelected);

    if (readOnly || !block.draggable) {
      return (
        <View
          key={block.id}
          style={[
            styles.timeBlock,
            {
              top,
              height: Math.max(height, 30), // Minimum height for visibility
              backgroundColor: blockColor,
              borderColor: isSelected ? colors.primary : 'transparent',
            },
          ]}
          onTouchEnd={() => handleBlockPress(block)}
        >
          <Text style={styles.blockTitle} numberOfLines={1}>
            {block.title || `${formatTime(block.startTime)} - ${formatTime(block.endTime)}`}
          </Text>
          <Text style={styles.blockTime}>
            {differenceInMinutes(block.endTime, block.startTime)}min
          </Text>
        </View>
      );
    }

    return (
      <PanGestureHandler
        key={block.id}
        onGestureEvent={createDragGestureHandler(block)}
      >
        <Animated.View
          style={[
            styles.timeBlock,
            {
              top,
              height: Math.max(height, 40),
              backgroundColor: blockColor,
              borderColor: isSelected ? colors.primary : 'transparent',
              opacity: isDragging && draggedBlock?.id === block.id ? 0.8 : 1,
              zIndex: isSelected ? 10 : 1,
            },
          ]}
        >
          {/* Resize Handle - Top */}
          {block.resizable && (
            <PanGestureHandler onGestureEvent={createResizeGestureHandler(block, 'top')}>
              <Animated.View style={styles.resizeHandleTop}>
                <View style={styles.resizeIndicator} />
              </Animated.View>
            </PanGestureHandler>
          )}

          {/* Block Content */}
          <View style={styles.blockContent} onTouchEnd={() => handleBlockPress(block)}>
            <Text style={styles.blockTitle} numberOfLines={1}>
              {block.title || `${formatTime(block.startTime)}`}
            </Text>
            <Text style={styles.blockTime}>
              {differenceInMinutes(block.endTime, block.startTime)}min
            </Text>
            {isSelected && (
              <View style={styles.blockActions}>
                <Ionicons name="move" size={16} color={colors.white} />
              </View>
            )}
          </View>

          {/* Resize Handle - Bottom */}
          {block.resizable && (
            <PanGestureHandler onGestureEvent={createResizeGestureHandler(block, 'bottom')}>
              <Animated.View style={styles.resizeHandleBottom}>
                <View style={styles.resizeIndicator} />
              </Animated.View>
            </PanGestureHandler>
          )}
        </Animated.View>
      </PanGestureHandler>
    );
  };

  const renderCurrentTimeLine = () => {
    if (!showTimeLine) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour < startHour || currentHour > endHour) return null;
    
    const position = getPositionFromTime(now);
    
    return (
      <View style={[styles.currentTimeLine, { top: position }]}>
        <View style={styles.currentTimeIndicator} />
        <Text style={styles.currentTimeText}>
          {formatTime(now)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Time Labels */}
      <View style={styles.timeLabelsContainer}>
        {renderTimeLabels()}
      </View>

      {/* Main Grid */}
      <View style={styles.gridContainer}>
        <View style={[styles.grid, { height: gridHeight }]}>
          {/* Grid Lines */}
          {renderGridLines()}
          
          {/* Time Blocks */}
          {timeBlocks.map(renderTimeBlock)}
          
          {/* Current Time Line */}
          {renderCurrentTimeLine()}
        </View>
      </View>

      {/* Instructions */}
      {!readOnly && (
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {isDragging ? t('dragToMove') : 
             isResizing ? t('dragToResize') : 
             t('tapToSelect')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  timeLabelsContainer: {
    width: TIME_LABEL_WIDTH,
    position: 'relative',
  },
  timeLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeLabelText: {
    fontSize: 12,
    color: colors.gray,
    fontWeight: '500',
  },
  gridContainer: {
    flex: 1,
    paddingLeft: 8,
  },
  grid: {
    position: 'relative',
    backgroundColor: colors.white,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  hourLine: {
    backgroundColor: colors.border,
  },
  quarterLine: {
    backgroundColor: colors.lightGray,
  },
  timeBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 6,
    borderWidth: 2,
    padding: 8,
    minHeight: 40,
    justifyContent: 'space-between',
  },
  blockContent: {
    flex: 1,
    justifyContent: 'center',
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 2,
  },
  blockTime: {
    fontSize: 10,
    color: colors.white,
    opacity: 0.9,
  },
  blockActions: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  resizeHandleTop: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  resizeHandleBottom: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  resizeIndicator: {
    width: 30,
    height: 4,
    backgroundColor: colors.white,
    borderRadius: 2,
    opacity: 0.8,
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  currentTimeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginLeft: -4,
  },
  currentTimeText: {
    fontSize: 10,
    color: colors.error,
    fontWeight: 'bold',
    marginLeft: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  instructions: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: colors.lightGray,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 12,
    color: colors.gray,
    fontStyle: 'italic',
  },
});