import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  I18nManager,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { colors } from '../../constants/colors';
import {
  ConflictDetectionEngine,
  Conflict,
  ConflictResolution,
  TimeSlot,
  ConflictDetectionOptions,
} from '../../utils/ConflictDetectionEngine';

interface ConflictResolverProps {
  visible: boolean;
  onClose: () => void;
  timeSlots: TimeSlot[];
  onSlotsUpdate: (updatedSlots: TimeSlot[]) => void;
  detectionOptions?: Partial<ConflictDetectionOptions>;
  autoResolve?: boolean;
}

export default function ConflictResolver({
  visible,
  onClose,
  timeSlots,
  onSlotsUpdate,
  detectionOptions = {},
  autoResolve = false,
}: ConflictResolverProps) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const locale = i18n.language === 'ar' ? ar : enUS;

  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [resolving, setResolving] = useState(false);
  const [conflictEngine] = useState(() => new ConflictDetectionEngine(detectionOptions));
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false);

  useEffect(() => {
    if (visible && timeSlots.length > 0) {
      analyzeConflicts();
    }
  }, [visible, timeSlots]);

  const analyzeConflicts = async () => {
    try {
      setResolving(true);
      const detectedConflicts = conflictEngine.analyzeConflicts(timeSlots);
      
      if (autoResolve) {
        const { resolved, unresolved } = conflictEngine.autoResolveConflicts(detectedConflicts);
        
        if (resolved.length > 0) {
          Alert.alert(
            t('autoResolved'),
            t('conflictsAutoResolved', { count: resolved.length }),
            [{ text: t('ok') }]
          );
        }
        
        setConflicts(unresolved);
      } else {
        setConflicts(detectedConflicts);
      }
    } catch (error) {
      console.error('Error analyzing conflicts:', error);
      Alert.alert(t('error'), t('failedToAnalyzeConflicts'));
    } finally {
      setResolving(false);
    }
  };

  const getSeverityColor = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'critical':
        return colors.error;
      case 'high':
        return colors.warning;
      case 'medium':
        return colors.secondary;
      case 'low':
        return colors.gray;
      default:
        return colors.gray;
    }
  };

  const getSeverityIcon = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'critical':
        return 'alert-circle';
      case 'high':
        return 'warning';
      case 'medium':
        return 'information-circle';
      case 'low':
        return 'checkmark-circle';
      default:
        return 'help-circle';
    }
  };

  const getConflictTypeIcon = (type: Conflict['type']) => {
    switch (type) {
      case 'overlap':
        return 'layers';
      case 'buffer_violation':
        return 'time';
      case 'prayer_conflict':
        return 'moon';
      case 'break_conflict':
        return 'pause';
      case 'double_booking':
        return 'copy';
      default:
        return 'alert';
    }
  };

  const applyResolution = async (conflict: Conflict, resolution: ConflictResolution) => {
    if (resolution.requiresApproval) {
      Alert.alert(
        t('confirmResolution'),
        i18n.language === 'ar' ? resolution.description_ar : resolution.description,
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('apply'),
            onPress: () => executeResolution(conflict, resolution),
          },
        ]
      );
    } else {
      executeResolution(conflict, resolution);
    }
  };

  const executeResolution = (conflict: Conflict, resolution: ConflictResolution) => {
    const updatedSlots = [...timeSlots];
    const targetSlotIndex = updatedSlots.findIndex(slot => slot.id === resolution.targetSlotId);

    if (targetSlotIndex === -1) {
      Alert.alert(t('error'), t('slotNotFound'));
      return;
    }

    const targetSlot = updatedSlots[targetSlotIndex];

    switch (resolution.type) {
      case 'move':
      case 'reschedule':
        if (resolution.newStartTime && resolution.newEndTime) {
          updatedSlots[targetSlotIndex] = {
            ...targetSlot,
            startTime: resolution.newStartTime,
            endTime: resolution.newEndTime,
          };
        }
        break;

      case 'adjust_buffer':
        // Reduce buffer times
        updatedSlots[targetSlotIndex] = {
          ...targetSlot,
          bufferAfter: Math.max((targetSlot.bufferAfter || 0) - 5, 0),
        };
        break;

      case 'remove_break':
        // Remove the break slot if it's flexible
        if (targetSlot.type === 'break' && targetSlot.isFlexible) {
          updatedSlots.splice(targetSlotIndex, 1);
        }
        break;

      case 'split':
        // Split working day (complex operation, simplified here)
        const midPoint = new Date((targetSlot.startTime.getTime() + targetSlot.endTime.getTime()) / 2);
        updatedSlots.splice(targetSlotIndex, 0, {
          id: `break_${Date.now()}`,
          startTime: midPoint,
          endTime: new Date(midPoint.getTime() + 60 * 60 * 1000), // 1 hour break
          type: 'break',
          title: 'Extended Break',
          priority: 1,
          isFlexible: true,
        });
        break;

      case 'extend_day':
        // Extend working hours (implementation depends on context)
        break;
    }

    onSlotsUpdate(updatedSlots);
    
    // Remove resolved conflict
    setConflicts(prev => prev.filter(c => c.id !== conflict.id));
    
    Alert.alert(t('success'), t('conflictResolved'));
    setResolutionModalVisible(false);
  };

  const renderConflictItem = (conflict: Conflict) => (
    <TouchableOpacity
      key={conflict.id}
      style={[
        styles.conflictItem,
        { borderLeftColor: getSeverityColor(conflict.severity) }
      ]}
      onPress={() => {
        setSelectedConflict(conflict);
        setResolutionModalVisible(true);
      }}
    >
      <View style={styles.conflictHeader}>
        <View style={styles.conflictTitleRow}>
          <Ionicons
            name={getConflictTypeIcon(conflict.type) as any}
            size={20}
            color={getSeverityColor(conflict.severity)}
          />
          <Text style={styles.conflictType}>
            {t(`conflictType_${conflict.type}`)}
          </Text>
          <View style={[
            styles.severityBadge,
            { backgroundColor: getSeverityColor(conflict.severity) }
          ]}>
            <Text style={styles.severityText}>
              {t(`severity_${conflict.severity}`)}
            </Text>
          </View>
        </View>

        <Text style={styles.conflictDescription}>
          {i18n.language === 'ar' ? conflict.description_ar : conflict.description}
        </Text>

        <View style={styles.conflictTime}>
          <Ionicons name="time" size={16} color={colors.gray} />
          <Text style={styles.timeText}>
            {format(conflict.affectedTime.start, 'HH:mm')} - {format(conflict.affectedTime.end, 'HH:mm')}
          </Text>
        </View>
      </View>

      <View style={styles.conflictSlots}>
        {conflict.conflictingSlots.map((slot, index) => (
          <View key={slot.id} style={styles.slotChip}>
            <Text style={styles.slotText}>
              {slot.title || `${t('slot')} ${index + 1}`}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.conflictFooter}>
        <Text style={styles.suggestionsCount}>
          {conflict.suggestions.length} {t('suggestions')}
        </Text>
        {conflict.autoResolvable && (
          <View style={styles.autoResolveBadge}>
            <Ionicons name="flash" size={12} color={colors.warning} />
            <Text style={styles.autoResolveText}>{t('autoResolvable')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderResolutionModal = () => (
    <Modal
      visible={resolutionModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setResolutionModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setResolutionModalVisible(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('resolveConflict')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {selectedConflict && (
          <ScrollView style={styles.modalContent}>
            {/* Conflict Details */}
            <View style={styles.conflictDetails}>
              <Text style={styles.detailsTitle}>{t('conflictDetails')}</Text>
              <Text style={styles.detailsDescription}>
                {i18n.language === 'ar' ? selectedConflict.description_ar : selectedConflict.description}
              </Text>
              
              <View style={styles.affectedSlotsSection}>
                <Text style={styles.sectionTitle}>{t('affectedSlots')}</Text>
                {selectedConflict.conflictingSlots.map(slot => (
                  <View key={slot.id} style={styles.affectedSlot}>
                    <Text style={styles.slotTitle}>
                      {slot.title || t('untitledSlot')}
                    </Text>
                    <Text style={styles.slotTime}>
                      {format(slot.startTime, 'HH:mm')} - {format(slot.endTime, 'HH:mm')}
                    </Text>
                    <Text style={styles.slotType}>{t(`slotType_${slot.type}`)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Resolution Options */}
            <View style={styles.resolutionsSection}>
              <Text style={styles.sectionTitle}>{t('resolutionOptions')}</Text>
              {selectedConflict.suggestions.map((resolution, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.resolutionOption,
                    !resolution.feasible && styles.infeasibleOption,
                  ]}
                  onPress={() => resolution.feasible ? applyResolution(selectedConflict, resolution) : null}
                  disabled={!resolution.feasible}
                >
                  <View style={styles.resolutionHeader}>
                    <Text style={[
                      styles.resolutionTitle,
                      !resolution.feasible && styles.infeasibleText,
                    ]}>
                      {i18n.language === 'ar' ? resolution.description_ar : resolution.description}
                    </Text>
                    <View style={styles.resolutionMeta}>
                      <View style={[
                        styles.costBadge,
                        { backgroundColor: getCostColor(resolution.cost) }
                      ]}>
                        <Text style={styles.costText}>
                          {t('impact')}: {resolution.cost}/10
                        </Text>
                      </View>
                      {resolution.requiresApproval && (
                        <Ionicons name="person" size={16} color={colors.warning} />
                      )}
                    </View>
                  </View>

                  {!resolution.feasible && (
                    <Text style={styles.infeasibleReason}>
                      {t('notFeasible')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const getCostColor = (cost: number) => {
    if (cost <= 3) return colors.success;
    if (cost <= 6) return colors.warning;
    return colors.error;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('conflictResolver')}</Text>
          <TouchableOpacity onPress={analyzeConflicts} disabled={resolving}>
            {resolving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {conflicts.length} {t('conflictsFound')}
          </Text>
          {conflicts.length > 0 && (
            <View style={styles.severityBreakdown}>
              {['critical', 'high', 'medium', 'low'].map(severity => {
                const count = conflicts.filter(c => c.severity === severity).length;
                if (count === 0) return null;
                
                return (
                  <View key={severity} style={styles.severityItem}>
                    <View style={[
                      styles.severityDot,
                      { backgroundColor: getSeverityColor(severity as any) }
                    ]} />
                    <Text style={styles.severityCount}>
                      {count} {t(`severity_${severity}`)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <ScrollView style={styles.content}>
          {conflicts.length > 0 ? (
            <View style={styles.conflictsList}>
              {conflicts.map(renderConflictItem)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color={colors.success} />
              <Text style={styles.emptyTitle}>{t('noConflicts')}</Text>
              <Text style={styles.emptySubtitle}>{t('scheduleOptimal')}</Text>
            </View>
          )}
        </ScrollView>

        {renderResolutionModal()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  summary: {
    backgroundColor: colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  severityBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  severityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityCount: {
    fontSize: 12,
    color: colors.gray,
  },
  content: {
    flex: 1,
  },
  conflictsList: {
    padding: 16,
    gap: 12,
  },
  conflictItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  conflictHeader: {
    marginBottom: 12,
  },
  conflictTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  conflictType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  conflictDescription: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
  },
  conflictTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: colors.gray,
  },
  conflictSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  slotChip: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slotText: {
    fontSize: 10,
    color: colors.text,
  },
  conflictFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionsCount: {
    fontSize: 12,
    color: colors.primary,
  },
  autoResolveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lightWarning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  autoResolveText: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.success,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  conflictDetails: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  detailsDescription: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 16,
  },
  affectedSlotsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  affectedSlot: {
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  slotTime: {
    fontSize: 12,
    color: colors.gray,
  },
  slotType: {
    fontSize: 10,
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  resolutionsSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
  },
  resolutionOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  infeasibleOption: {
    opacity: 0.5,
    backgroundColor: colors.lightGray,
  },
  resolutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resolutionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  infeasibleText: {
    color: colors.gray,
  },
  resolutionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  costBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  costText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: 'bold',
  },
  infeasibleReason: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    fontStyle: 'italic',
  },
});