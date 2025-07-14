import {
  addMinutes,
  subMinutes,
  isWithinInterval,
  areIntervalsOverlapping,
  differenceInMinutes,
  format,
  startOfDay,
  parseISO,
} from 'date-fns';

export interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  type: 'available' | 'booked' | 'break' | 'prayer' | 'unavailable';
  title?: string;
  serviceId?: string;
  customerId?: string;
  priority: number; // 1-5, 5 being highest priority
  isFlexible?: boolean;
  bufferBefore?: number; // minutes
  bufferAfter?: number; // minutes
}

export interface Conflict {
  id: string;
  type: 'overlap' | 'buffer_violation' | 'prayer_conflict' | 'break_conflict' | 'double_booking';
  severity: 'low' | 'medium' | 'high' | 'critical';
  conflictingSlots: TimeSlot[];
  description: string;
  description_ar: string;
  affectedTime: {
    start: Date;
    end: Date;
  };
  suggestions: ConflictResolution[];
  autoResolvable: boolean;
}

export interface ConflictResolution {
  type: 'move' | 'reschedule' | 'split' | 'extend_day' | 'remove_break' | 'adjust_buffer';
  description: string;
  description_ar: string;
  targetSlotId: string;
  newStartTime?: Date;
  newEndTime?: Date;
  cost: number; // Impact score 1-10
  feasible: boolean;
  requiresApproval: boolean;
}

export interface ConflictDetectionOptions {
  includeBufferTime: boolean;
  respectPrayerTimes: boolean;
  allowFlexibleBreaks: boolean;
  maxWorkingHours: number;
  minBreakBetweenServices: number;
  considerCustomerPreferences: boolean;
}

export class ConflictDetectionEngine {
  private options: ConflictDetectionOptions;
  private prayerTimes: { [key: string]: string } = {
    fajr: '05:30',
    dhuhr: '12:30',
    asr: '15:30',
    maghrib: '18:00',
    isha: '19:30',
  };

  constructor(options: Partial<ConflictDetectionOptions> = {}) {
    this.options = {
      includeBufferTime: true,
      respectPrayerTimes: true,
      allowFlexibleBreaks: true,
      maxWorkingHours: 12,
      minBreakBetweenServices: 5,
      considerCustomerPreferences: true,
      ...options,
    };
  }

  /**
   * Analyze all conflicts in a given schedule
   */
  analyzeConflicts(timeSlots: TimeSlot[]): Conflict[] {
    const conflicts: Conflict[] = [];
    
    // Sort slots by start time for easier analysis
    const sortedSlots = [...timeSlots].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );

    for (let i = 0; i < sortedSlots.length; i++) {
      const currentSlot = sortedSlots[i];
      
      // Check for overlaps with subsequent slots
      for (let j = i + 1; j < sortedSlots.length; j++) {
        const nextSlot = sortedSlots[j];
        
        const overlapConflict = this.detectOverlap(currentSlot, nextSlot);
        if (overlapConflict) {
          conflicts.push(overlapConflict);
        }

        const bufferConflict = this.detectBufferViolation(currentSlot, nextSlot);
        if (bufferConflict) {
          conflicts.push(bufferConflict);
        }
      }

      // Check for prayer time conflicts
      if (this.options.respectPrayerTimes) {
        const prayerConflicts = this.detectPrayerTimeConflicts(currentSlot);
        conflicts.push(...prayerConflicts);
      }

      // Check for double booking
      const doubleBookingConflicts = this.detectDoubleBooking(currentSlot, sortedSlots);
      conflicts.push(...doubleBookingConflicts);
    }

    // Check for excessive working hours
    const workingHourConflicts = this.detectExcessiveWorkingHours(sortedSlots);
    conflicts.push(...workingHourConflicts);

    return this.deduplicateConflicts(conflicts);
  }

  /**
   * Detect overlap between two time slots
   */
  private detectOverlap(slot1: TimeSlot, slot2: TimeSlot): Conflict | null {
    const overlap = areIntervalsOverlapping(
      { start: slot1.startTime, end: slot1.endTime },
      { start: slot2.startTime, end: slot2.endTime }
    );

    if (!overlap) return null;

    const overlapStart = slot1.startTime > slot2.startTime ? slot1.startTime : slot2.startTime;
    const overlapEnd = slot1.endTime < slot2.endTime ? slot1.endTime : slot2.endTime;

    return {
      id: `overlap_${slot1.id}_${slot2.id}`,
      type: 'overlap',
      severity: this.calculateOverlapSeverity(slot1, slot2),
      conflictingSlots: [slot1, slot2],
      description: `${slot1.title || 'Appointment'} overlaps with ${slot2.title || 'appointment'}`,
      description_ar: `${slot1.title || 'الموعد'} يتداخل مع ${slot2.title || 'موعد آخر'}`,
      affectedTime: {
        start: overlapStart,
        end: overlapEnd,
      },
      suggestions: this.generateOverlapResolutions(slot1, slot2),
      autoResolvable: slot1.isFlexible || slot2.isFlexible || false,
    };
  }

  /**
   * Detect buffer time violations
   */
  private detectBufferViolation(slot1: TimeSlot, slot2: TimeSlot): Conflict | null {
    if (!this.options.includeBufferTime) return null;

    const buffer1After = slot1.bufferAfter || 0;
    const buffer2Before = slot2.bufferBefore || 0;
    const requiredGap = Math.max(buffer1After, buffer2Before, this.options.minBreakBetweenServices);

    const actualGap = differenceInMinutes(slot2.startTime, slot1.endTime);

    if (actualGap >= requiredGap) return null;

    return {
      id: `buffer_${slot1.id}_${slot2.id}`,
      type: 'buffer_violation',
      severity: 'medium',
      conflictingSlots: [slot1, slot2],
      description: `Insufficient buffer time between appointments (${actualGap}min < ${requiredGap}min required)`,
      description_ar: `وقت الفاصل غير كافي بين المواعيد (${actualGap} دقيقة < ${requiredGap} دقيقة مطلوبة)`,
      affectedTime: {
        start: slot1.endTime,
        end: slot2.startTime,
      },
      suggestions: this.generateBufferResolutions(slot1, slot2, requiredGap),
      autoResolvable: slot1.isFlexible || slot2.isFlexible || false,
    };
  }

  /**
   * Detect conflicts with prayer times
   */
  private detectPrayerTimeConflicts(slot: TimeSlot): Conflict[] {
    const conflicts: Conflict[] = [];
    
    if (slot.type === 'prayer') return conflicts; // Prayer slots don't conflict with themselves

    Object.entries(this.prayerTimes).forEach(([prayerName, timeStr]) => {
      const prayerTime = parseISO(`${format(slot.startTime, 'yyyy-MM-dd')}T${timeStr}:00`);
      const prayerDuration = prayerName === 'jumuah' ? 90 : 15; // Friday prayer is longer
      const prayerEnd = addMinutes(prayerTime, prayerDuration);

      const conflictsWithPrayer = areIntervalsOverlapping(
        { start: slot.startTime, end: slot.endTime },
        { start: prayerTime, end: prayerEnd }
      );

      if (conflictsWithPrayer) {
        conflicts.push({
          id: `prayer_${slot.id}_${prayerName}`,
          type: 'prayer_conflict',
          severity: 'high',
          conflictingSlots: [slot],
          description: `Appointment conflicts with ${prayerName} prayer time`,
          description_ar: `الموعد يتعارض مع وقت صلاة ${this.getPrayerNameArabic(prayerName)}`,
          affectedTime: {
            start: prayerTime,
            end: prayerEnd,
          },
          suggestions: this.generatePrayerResolutions(slot, prayerTime, prayerEnd),
          autoResolvable: slot.isFlexible || false,
        });
      }
    });

    return conflicts;
  }

  /**
   * Detect double booking conflicts
   */
  private detectDoubleBooking(slot: TimeSlot, allSlots: TimeSlot[]): Conflict[] {
    if (slot.type !== 'booked') return [];

    const overlappingBookings = allSlots.filter(otherSlot => 
      otherSlot.id !== slot.id &&
      otherSlot.type === 'booked' &&
      areIntervalsOverlapping(
        { start: slot.startTime, end: slot.endTime },
        { start: otherSlot.startTime, end: otherSlot.endTime }
      )
    );

    if (overlappingBookings.length === 0) return [];

    return [{
      id: `double_booking_${slot.id}`,
      type: 'double_booking',
      severity: 'critical',
      conflictingSlots: [slot, ...overlappingBookings],
      description: `Multiple bookings scheduled at the same time`,
      description_ar: `حجوزات متعددة مجدولة في نفس الوقت`,
      affectedTime: {
        start: slot.startTime,
        end: slot.endTime,
      },
      suggestions: this.generateDoubleBookingResolutions(slot, overlappingBookings),
      autoResolvable: false,
    }];
  }

  /**
   * Detect excessive working hours
   */
  private detectExcessiveWorkingHours(slots: TimeSlot[]): Conflict[] {
    const workingSlots = slots.filter(slot => 
      slot.type === 'booked' || slot.type === 'available'
    );

    if (workingSlots.length === 0) return [];

    const dayStart = workingSlots[0].startTime;
    const dayEnd = workingSlots[workingSlots.length - 1].endTime;
    const totalWorkingHours = differenceInMinutes(dayEnd, dayStart) / 60;

    if (totalWorkingHours <= this.options.maxWorkingHours) return [];

    return [{
      id: `excessive_hours_${format(dayStart, 'yyyy-MM-dd')}`,
      type: 'overlap', // Using overlap as closest match
      severity: 'medium',
      conflictingSlots: workingSlots,
      description: `Working day exceeds ${this.options.maxWorkingHours} hours (${totalWorkingHours.toFixed(1)}h)`,
      description_ar: `يوم العمل يتجاوز ${this.options.maxWorkingHours} ساعات (${totalWorkingHours.toFixed(1)} ساعة)`,
      affectedTime: {
        start: dayStart,
        end: dayEnd,
      },
      suggestions: this.generateWorkingHoursResolutions(workingSlots),
      autoResolvable: false,
    }];
  }

  /**
   * Generate resolution suggestions for overlap conflicts
   */
  private generateOverlapResolutions(slot1: TimeSlot, slot2: TimeSlot): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];

    // Move the lower priority slot
    const lowerPrioritySlot = slot1.priority < slot2.priority ? slot1 : slot2;
    const higherPrioritySlot = slot1.priority >= slot2.priority ? slot1 : slot2;

    // Option 1: Move lower priority slot to after higher priority slot
    resolutions.push({
      type: 'move',
      description: `Move ${lowerPrioritySlot.title || 'appointment'} to after ${higherPrioritySlot.title || 'other appointment'}`,
      description_ar: `نقل ${lowerPrioritySlot.title || 'الموعد'} إلى ما بعد ${higherPrioritySlot.title || 'الموعد الآخر'}`,
      targetSlotId: lowerPrioritySlot.id,
      newStartTime: addMinutes(higherPrioritySlot.endTime, lowerPrioritySlot.bufferBefore || 5),
      newEndTime: addMinutes(addMinutes(higherPrioritySlot.endTime, lowerPrioritySlot.bufferBefore || 5), 
        differenceInMinutes(lowerPrioritySlot.endTime, lowerPrioritySlot.startTime)),
      cost: lowerPrioritySlot.isFlexible ? 3 : 7,
      feasible: true,
      requiresApproval: !lowerPrioritySlot.isFlexible,
    });

    // Option 2: Move lower priority slot to before higher priority slot
    const newEndTime = subMinutes(higherPrioritySlot.startTime, higherPrioritySlot.bufferBefore || 5);
    const duration = differenceInMinutes(lowerPrioritySlot.endTime, lowerPrioritySlot.startTime);
    const newStartTime = subMinutes(newEndTime, duration);

    resolutions.push({
      type: 'move',
      description: `Move ${lowerPrioritySlot.title || 'appointment'} to before ${higherPrioritySlot.title || 'other appointment'}`,
      description_ar: `نقل ${lowerPrioritySlot.title || 'الموعد'} إلى ما قبل ${higherPrioritySlot.title || 'الموعد الآخر'}`,
      targetSlotId: lowerPrioritySlot.id,
      newStartTime,
      newEndTime,
      cost: lowerPrioritySlot.isFlexible ? 4 : 8,
      feasible: newStartTime > startOfDay(newStartTime),
      requiresApproval: !lowerPrioritySlot.isFlexible,
    });

    return resolutions;
  }

  /**
   * Generate resolution suggestions for buffer violations
   */
  private generateBufferResolutions(slot1: TimeSlot, slot2: TimeSlot, requiredGap: number): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];
    const actualGap = differenceInMinutes(slot2.startTime, slot1.endTime);
    const neededAdjustment = requiredGap - actualGap;

    // Option 1: Move second slot later
    resolutions.push({
      type: 'move',
      description: `Move second appointment ${neededAdjustment} minutes later`,
      description_ar: `تأخير الموعد الثاني ${neededAdjustment} دقيقة`,
      targetSlotId: slot2.id,
      newStartTime: addMinutes(slot2.startTime, neededAdjustment),
      newEndTime: addMinutes(slot2.endTime, neededAdjustment),
      cost: slot2.isFlexible ? 2 : 6,
      feasible: true,
      requiresApproval: !slot2.isFlexible,
    });

    // Option 2: Reduce buffer requirements
    if (this.options.allowFlexibleBreaks) {
      resolutions.push({
        type: 'adjust_buffer',
        description: `Reduce buffer time to ${actualGap} minutes`,
        description_ar: `تقليل وقت الفاصل إلى ${actualGap} دقيقة`,
        targetSlotId: slot1.id,
        cost: 4,
        feasible: actualGap >= this.options.minBreakBetweenServices,
        requiresApproval: true,
      });
    }

    return resolutions;
  }

  /**
   * Generate resolution suggestions for prayer conflicts
   */
  private generatePrayerResolutions(slot: TimeSlot, prayerStart: Date, prayerEnd: Date): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];
    const duration = differenceInMinutes(slot.endTime, slot.startTime);

    // Option 1: Move appointment to before prayer
    const newEndTimeBefore = subMinutes(prayerStart, 5);
    const newStartTimeBefore = subMinutes(newEndTimeBefore, duration);

    resolutions.push({
      type: 'move',
      description: `Move appointment to before prayer time`,
      description_ar: `نقل الموعد إلى ما قبل وقت الصلاة`,
      targetSlotId: slot.id,
      newStartTime: newStartTimeBefore,
      newEndTime: newEndTimeBefore,
      cost: slot.isFlexible ? 3 : 7,
      feasible: newStartTimeBefore > startOfDay(newStartTimeBefore),
      requiresApproval: !slot.isFlexible,
    });

    // Option 2: Move appointment to after prayer
    const newStartTimeAfter = addMinutes(prayerEnd, 5);
    const newEndTimeAfter = addMinutes(newStartTimeAfter, duration);

    resolutions.push({
      type: 'move',
      description: `Move appointment to after prayer time`,
      description_ar: `نقل الموعد إلى ما بعد وقت الصلاة`,
      targetSlotId: slot.id,
      newStartTime: newStartTimeAfter,
      newEndTime: newEndTimeAfter,
      cost: slot.isFlexible ? 2 : 6,
      feasible: true,
      requiresApproval: !slot.isFlexible,
    });

    return resolutions;
  }

  /**
   * Generate resolution suggestions for double booking
   */
  private generateDoubleBookingResolutions(slot: TimeSlot, overlappingSlots: TimeSlot[]): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];

    overlappingSlots.forEach((overlappingSlot) => {
      const duration = differenceInMinutes(overlappingSlot.endTime, overlappingSlot.startTime);
      const newStartTime = addMinutes(slot.endTime, 15); // 15-minute buffer
      const newEndTime = addMinutes(newStartTime, duration);

      resolutions.push({
        type: 'reschedule',
        description: `Reschedule overlapping appointment to ${format(newStartTime, 'HH:mm')}`,
        description_ar: `إعادة جدولة الموعد المتداخل إلى ${format(newStartTime, 'HH:mm')}`,
        targetSlotId: overlappingSlot.id,
        newStartTime,
        newEndTime,
        cost: 8,
        feasible: true,
        requiresApproval: true,
      });
    });

    return resolutions;
  }

  /**
   * Generate resolution suggestions for excessive working hours
   */
  private generateWorkingHoursResolutions(workingSlots: TimeSlot[]): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];

    // Suggest splitting the day
    resolutions.push({
      type: 'split',
      description: `Split working day with extended break`,
      description_ar: `تقسيم يوم العمل مع استراحة ممتدة`,
      targetSlotId: workingSlots[Math.floor(workingSlots.length / 2)].id,
      cost: 5,
      feasible: true,
      requiresApproval: true,
    });

    return resolutions;
  }

  /**
   * Calculate overlap severity based on slot types and priorities
   */
  private calculateOverlapSeverity(slot1: TimeSlot, slot2: TimeSlot): 'low' | 'medium' | 'high' | 'critical' {
    if (slot1.type === 'booked' && slot2.type === 'booked') {
      return 'critical';
    }
    if ((slot1.type === 'booked' || slot2.type === 'booked') && 
        (slot1.type === 'prayer' || slot2.type === 'prayer')) {
      return 'high';
    }
    if (slot1.type === 'booked' || slot2.type === 'booked') {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get Arabic prayer name
   */
  private getPrayerNameArabic(prayerName: string): string {
    const arabicNames: { [key: string]: string } = {
      fajr: 'الفجر',
      dhuhr: 'الظهر',
      asr: 'العصر',
      maghrib: 'المغرب',
      isha: 'العشاء',
    };
    return arabicNames[prayerName] || prayerName;
  }

  /**
   * Remove duplicate conflicts
   */
  private deduplicateConflicts(conflicts: Conflict[]): Conflict[] {
    const seen = new Set();
    return conflicts.filter(conflict => {
      const key = `${conflict.type}_${conflict.conflictingSlots.map(s => s.id).sort().join('_')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Auto-resolve conflicts where possible
   */
  autoResolveConflicts(conflicts: Conflict[]): { resolved: Conflict[], unresolved: Conflict[] } {
    const resolved: Conflict[] = [];
    const unresolved: Conflict[] = [];

    conflicts.forEach(conflict => {
      if (conflict.autoResolvable && conflict.suggestions.length > 0) {
        const bestSuggestion = conflict.suggestions
          .filter(s => s.feasible && !s.requiresApproval)
          .sort((a, b) => a.cost - b.cost)[0];

        if (bestSuggestion) {
          resolved.push(conflict);
        } else {
          unresolved.push(conflict);
        }
      } else {
        unresolved.push(conflict);
      }
    });

    return { resolved, unresolved };
  }

  /**
   * Update prayer times (for dynamic calculation based on location/date)
   */
  updatePrayerTimes(newPrayerTimes: { [key: string]: string }) {
    this.prayerTimes = { ...this.prayerTimes, ...newPrayerTimes };
  }

  /**
   * Update detection options
   */
  updateOptions(newOptions: Partial<ConflictDetectionOptions>) {
    this.options = { ...this.options, ...newOptions };
  }
}