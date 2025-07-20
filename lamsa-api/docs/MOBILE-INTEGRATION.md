# Lamsa Mobile Integration Guide

## Overview

This guide provides mobile developers with practical examples, best practices, and complete integration patterns for the Lamsa booking API. It includes React Native examples, error handling strategies, and offline considerations specific to mobile applications.

## Table of Contents

1. [Setup and Authentication](#setup-and-authentication)
2. [API Client Configuration](#api-client-configuration)
3. [Complete Booking Workflow](#complete-booking-workflow)
4. [Provider Dashboard Integration](#provider-dashboard-integration)
5. [Real-time Features](#real-time-features)
6. [Offline Support](#offline-support)
7. [Performance Optimization](#performance-optimization)
8. [Error Handling Patterns](#error-handling-patterns)
9. [State Management](#state-management)
10. [Push Notifications](#push-notifications)

---

## Setup and Authentication

### 1. API Client Setup

```javascript
// src/services/apiClient.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class APIClient {
  constructor() {
    this.baseURL = 'http://your-api-domain.com/api';
    this.token = null;
  }

  async initialize() {
    this.token = await AsyncStorage.getItem('auth_token');
  }

  async setToken(token) {
    this.token = token;
    await AsyncStorage.setItem('auth_token', token);
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Handle rate limiting
      this.handleRateLimit(response);

      if (!response.ok) {
        throw new APIError(data.error, data.code, response.status, data);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Network error', 'NETWORK_ERROR', 0, error);
    }
  }

  handleRateLimit(response) {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    // Store rate limit info for UI updates
    AsyncStorage.setItem('rate_limit_info', JSON.stringify({
      remaining: parseInt(remaining) || 0,
      reset: parseInt(reset) || 0,
      timestamp: Date.now()
    }));
  }

  // Convenience methods
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new APIClient();
```

### 2. Authentication Service

```javascript
// src/services/authService.js
import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  async login(phone, otp) {
    try {
      const response = await apiClient.post('/auth/login', { phone, otp });
      
      if (response.success) {
        await apiClient.setToken(response.data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      await apiClient.clearToken();
      await AsyncStorage.multiRemove(['user_data', 'rate_limit_info']);
    }
  }

  async refreshToken() {
    try {
      const response = await apiClient.post('/auth/refresh');
      if (response.success) {
        await apiClient.setToken(response.data.token);
        return response.data.token;
      }
    } catch (error) {
      // Token refresh failed, logout user
      await this.logout();
      throw error;
    }
  }

  async getCurrentUser() {
    const userData = await AsyncStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
}

export default new AuthService();
```

---

## API Client Configuration

### Booking Service Implementation

```javascript
// src/services/bookingService.js
import apiClient from './apiClient';

class BookingService {
  // Create booking
  async createBooking(bookingData) {
    try {
      return await apiClient.post('/bookings', bookingData);
    } catch (error) {
      // Enhanced error handling for bookings
      if (error.code === 'TOKEN_EXPIRED') {
        await authService.refreshToken();
        return await apiClient.post('/bookings', bookingData);
      }
      throw error;
    }
  }

  // Get user bookings with pagination
  async getUserBookings(page = 1, limit = 20, filters = {}) {
    const params = {
      page,
      limit,
      ...filters,
    };
    return await apiClient.get('/bookings/user', params);
  }

  // Get provider bookings
  async getProviderBookings(providerId, page = 1, limit = 20, filters = {}) {
    const params = { page, limit, ...filters };
    return await apiClient.get(`/bookings/provider/${providerId}`, params);
  }

  // Get booking details
  async getBookingDetails(bookingId) {
    return await apiClient.get(`/bookings/${bookingId}`);
  }

  // Update booking status
  async updateBookingStatus(bookingId, status, reason = '', providerNotes = '') {
    return await apiClient.patch(`/bookings/${bookingId}/status`, {
      status,
      reason,
      providerNotes,
    });
  }

  // Cancel booking
  async cancelBooking(bookingId, reason = '', refundRequested = false) {
    return await apiClient.post(`/bookings/${bookingId}/cancel`, {
      reason,
      refundRequested,
      notifyCustomer: true,
    });
  }

  // Reschedule booking
  async rescheduleBooking(bookingId, newDate, newTime, reason = '') {
    return await apiClient.post(`/bookings/${bookingId}/reschedule`, {
      date: newDate,
      time: newTime,
      reason,
    });
  }

  // Check availability
  async checkAvailability(providerId, serviceId, date, time, duration = 60) {
    return await apiClient.post('/bookings/check-availability', {
      providerId,
      serviceId,
      date,
      time,
      duration,
    });
  }

  // Search bookings
  async searchBookings(query, filters = {}, page = 1, limit = 20) {
    const params = {
      q: query,
      page,
      limit,
      ...filters,
    };
    return await apiClient.get('/bookings/search', params);
  }

  // Get dashboard data
  async getDashboardData(period = 'week') {
    return await apiClient.get('/bookings/dashboard', { period });
  }

  // Get analytics
  async getAnalytics(providerId = null, period = 'month', startDate = null, endDate = null) {
    const params = {
      period,
      ...(providerId && { providerId }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      includeRevenue: true,
      groupBy: 'day',
    };
    return await apiClient.get('/bookings/analytics/stats', params);
  }

  // Bulk operations
  async bulkOperation(bookingIds, operation, reason = '', newDate = null, newTime = null) {
    const data = {
      bookingIds,
      operation,
      reason,
      ...(newDate && { newDate }),
      ...(newTime && { newTime }),
    };
    return await apiClient.post('/bookings/bulk', data);
  }

  // Get reminders
  async getReminders(days = 1, hours = 24) {
    return await apiClient.get('/bookings/reminders', {
      days,
      hours,
      includeConfirmed: true,
      includePending: true,
      limit: 50,
    });
  }
}

export default new BookingService();
```

---

## Complete Booking Workflow

### Customer Booking Flow

```javascript
// src/screens/BookingScreen.js
import React, { useState, useEffect } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import bookingService from '../services/bookingService';

const BookingScreen = ({ route, navigation }) => {
  const { providerId, serviceId } = route.params;
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // Check availability when date/time changes
  useEffect(() => {
    if (selectedDate && selectedTime) {
      checkAvailability();
    }
  }, [selectedDate, selectedTime]);

  const checkAvailability = async () => {
    try {
      setLoading(true);
      const response = await bookingService.checkAvailability(
        providerId,
        serviceId,
        selectedDate,
        selectedTime
      );
      setAvailability(response.data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async () => {
    if (!availability?.available) {
      Alert.alert('Error', 'Selected time slot is not available');
      return;
    }

    try {
      setLoading(true);
      
      const bookingData = {
        providerId,
        serviceId,
        date: selectedDate,
        time: selectedTime,
        paymentMethod,
        notes: notes.trim(),
      };

      const response = await bookingService.createBooking(bookingData);
      
      if (response.success) {
        Alert.alert(
          'Booking Created',
          'Your booking has been created successfully!',
          [
            {
              text: 'View Booking',
              onPress: () => navigation.navigate('BookingDetails', {
                bookingId: response.data.id
              })
            }
          ]
        );
      }
    } catch (error) {
      handleBookingError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingError = (error) => {
    switch (error.code) {
      case 'BOOKING_CONFLICT':
        Alert.alert(
          'Time Conflict',
          'This time slot is no longer available. Please choose a different time.',
          [
            { text: 'OK' },
            {
              text: 'View Available Times',
              onPress: () => showSuggestedTimes(error.details?.suggestedTimes)
            }
          ]
        );
        break;

      case 'PAYMENT_METHOD_REQUIRED':
        Alert.alert(
          'Payment Method Required',
          `Online payment is required for bookings over 100 JOD. Your booking amount is ${error.details?.amount} JOD.`,
          [
            { text: 'Cancel' },
            {
              text: 'Use Online Payment',
              onPress: () => setPaymentMethod('online')
            }
          ]
        );
        break;

      case 'INVALID_PHONE_FORMAT':
        Alert.alert(
          'Phone Number Issue',
          'Please update your phone number in your profile to a valid Jordanian format.',
          [
            { text: 'OK' },
            {
              text: 'Update Profile',
              onPress: () => navigation.navigate('Profile')
            }
          ]
        );
        break;

      default:
        Alert.alert('Error', error.message || 'Unable to create booking');
    }
  };

  const showSuggestedTimes = (suggestedTimes) => {
    if (!suggestedTimes?.length) return;

    const timeOptions = suggestedTimes.map(slot => ({
      text: `${slot.startTime} - ${slot.endTime}`,
      onPress: () => {
        setSelectedTime(slot.startTime);
        checkAvailability();
      }
    }));

    Alert.alert(
      'Available Times',
      'Here are some available time slots:',
      [...timeOptions, { text: 'Cancel', style: 'cancel' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Date selection component */}
      <DatePicker
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        minDate={new Date()}
        maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} // 90 days
      />

      {/* Time selection component */}
      <TimePicker
        selectedTime={selectedTime}
        onTimeChange={setSelectedTime}
        businessHours={{ start: '08:00', end: '22:00' }}
        minimumAdvanceHours={2}
      />

      {/* Availability indicator */}
      {loading && <ActivityIndicator size="small" />}
      {availability && (
        <AvailabilityIndicator
          available={availability.available}
          message={availability.message}
          conflicting={availability.conflictingBookings}
        />
      )}

      {/* Payment method selection */}
      <PaymentMethodSelector
        selectedMethod={paymentMethod}
        onMethodChange={setPaymentMethod}
        estimatedAmount={availability?.estimatedAmount}
      />

      {/* Notes input */}
      <NotesInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Any special requests or notes..."
        maxLength={500}
      />

      {/* Book button */}
      <BookButton
        onPress={createBooking}
        disabled={!availability?.available || loading}
        loading={loading}
      />
    </View>
  );
};
```

### Booking Management Screen

```javascript
// src/screens/MyBookingsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, RefreshControl, Alert } from 'react-native';
import bookingService from '../services/bookingService';

const MyBookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, past, cancelled

  useEffect(() => {
    loadBookings();
  }, [filter]);

  const loadBookings = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);

      const filters = {};
      
      // Apply status filter
      if (filter === 'upcoming') {
        filters.status = 'pending,confirmed';
        filters.dateFrom = new Date().toISOString().split('T')[0];
      } else if (filter === 'past') {
        filters.status = 'completed';
      } else if (filter === 'cancelled') {
        filters.status = 'cancelled,no_show';
      }

      const response = await bookingService.getUserBookings(pageNum, 20, filters);
      
      if (response.success) {
        const newBookings = response.data.data;
        
        if (append) {
          setBookings(prev => [...prev, ...newBookings]);
        } else {
          setBookings(newBookings);
        }
        
        setHasMore(response.data.hasNext);
        setPage(pageNum);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings(1, false);
  }, [filter]);

  const loadMore = () => {
    if (hasMore && !loading) {
      loadBookings(page + 1, true);
    }
  };

  const cancelBooking = async (bookingId) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await bookingService.cancelBooking(
                bookingId,
                'Customer cancelled via mobile app'
              );
              
              if (response.success) {
                // Update booking in list
                setBookings(prev =>
                  prev.map(booking =>
                    booking.id === bookingId
                      ? { ...booking, status: 'cancelled' }
                      : booking
                  )
                );
                
                Alert.alert('Success', 'Booking cancelled successfully');
              }
            } catch (error) {
              handleCancellationError(error);
            }
          }
        }
      ]
    );
  };

  const rescheduleBooking = (booking) => {
    navigation.navigate('RescheduleBooking', {
      bookingId: booking.id,
      currentDate: booking.bookingDate,
      currentTime: booking.startTime,
      providerId: booking.providerId,
      serviceId: booking.serviceId,
    });
  };

  const handleCancellationError = (error) => {
    switch (error.code) {
      case 'CANCELLATION_NOT_ALLOWED':
        Alert.alert(
          'Cannot Cancel',
          'This booking cannot be cancelled. Please contact the provider directly.',
          [
            { text: 'OK' },
            {
              text: 'Contact Provider',
              onPress: () => {/* Navigate to provider contact */}
            }
          ]
        );
        break;
      case 'BOOKING_PAST_DUE':
        Alert.alert('Cannot Cancel', 'Cannot cancel past bookings.');
        break;
      default:
        Alert.alert('Error', error.message || 'Unable to cancel booking');
    }
  };

  const renderBookingItem = ({ item }) => (
    <BookingCard
      booking={item}
      onCancel={() => cancelBooking(item.id)}
      onReschedule={() => rescheduleBooking(item)}
      onViewDetails={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
    />
  );

  return (
    <View style={styles.container}>
      <FilterTabs
        selectedFilter={filter}
        onFilterChange={setFilter}
        tabs={[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'past', label: 'Past' },
          { key: 'cancelled', label: 'Cancelled' }
        ]}
      />

      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={loading && hasMore ? <LoadingIndicator /> : null}
        ListEmptyComponent={
          !loading && <EmptyState message="No bookings found" />
        }
      />
    </View>
  );
};
```

---

## Provider Dashboard Integration

### Provider Dashboard Screen

```javascript
// src/screens/ProviderDashboardScreen.js
import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import bookingService from '../services/bookingService';

const ProviderDashboardScreen = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats
      const dashboardResponse = await bookingService.getDashboardData('today');
      setDashboardData(dashboardResponse.data);

      // Load today's bookings
      const today = new Date().toISOString().split('T')[0];
      const todayResponse = await bookingService.getProviderBookings(
        null, // Current provider
        1,
        50,
        { dateFrom: today, dateTo: today, sortBy: 'time', sortOrder: 'asc' }
      );
      setTodayBookings(todayResponse.data.data);

      // Load pending bookings
      const pendingResponse = await bookingService.getProviderBookings(
        null,
        1,
        20,
        { status: 'pending', sortBy: 'date', sortOrder: 'asc' }
      );
      setPendingBookings(pendingResponse.data.data);

    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const updateBookingStatus = async (bookingId, newStatus, reason = '') => {
    try {
      const response = await bookingService.updateBookingStatus(
        bookingId,
        newStatus,
        reason
      );

      if (response.success) {
        // Update local state
        const updateBookingInList = (bookings) =>
          bookings.map(booking =>
            booking.id === bookingId
              ? { ...booking, status: newStatus }
              : booking
          );

        setTodayBookings(prev => updateBookingInList(prev));
        setPendingBookings(prev => updateBookingInList(prev));

        // Refresh dashboard stats
        loadDashboardData();
        
        Alert.alert('Success', `Booking ${newStatus} successfully`);
      }
    } catch (error) {
      handleStatusUpdateError(error);
    }
  };

  const confirmBooking = (bookingId) => {
    Alert.alert(
      'Confirm Booking',
      'Are you sure you want to confirm this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateBookingStatus(bookingId, 'confirmed', 'Confirmed by provider')
        }
      ]
    );
  };

  const completeBooking = (bookingId) => {
    updateBookingStatus(bookingId, 'completed', 'Service completed');
  };

  const markNoShow = (bookingId) => {
    Alert.alert(
      'Mark as No Show',
      'Customer did not show up for the appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark No Show',
          style: 'destructive',
          onPress: () => updateBookingStatus(bookingId, 'no_show', 'Customer did not show up')
        }
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {/* Dashboard Stats */}
      {dashboardData && (
        <DashboardStats
          todayRevenue={dashboardData.stats?.todayRevenue}
          weeklyRevenue={dashboardData.stats?.weeklyRevenue}
          monthlyRevenue={dashboardData.stats?.monthlyRevenue}
          completionRate={dashboardData.stats?.completionRate}
          pendingCount={pendingBookings.length}
        />
      )}

      {/* Today's Schedule */}
      <SectionCard title="Today's Schedule">
        {todayBookings.length > 0 ? (
          todayBookings.map(booking => (
            <ProviderBookingCard
              key={booking.id}
              booking={booking}
              onConfirm={() => confirmBooking(booking.id)}
              onComplete={() => completeBooking(booking.id)}
              onMarkNoShow={() => markNoShow(booking.id)}
              onViewDetails={() => navigation.navigate('BookingDetails', {
                bookingId: booking.id
              })}
            />
          ))
        ) : (
          <EmptyState message="No bookings today" />
        )}
      </SectionCard>

      {/* Pending Bookings */}
      <SectionCard title="Pending Bookings">
        {pendingBookings.length > 0 ? (
          pendingBookings.slice(0, 5).map(booking => (
            <PendingBookingCard
              key={booking.id}
              booking={booking}
              onConfirm={() => confirmBooking(booking.id)}
              onCancel={() => navigation.navigate('CancelBooking', {
                bookingId: booking.id
              })}
            />
          ))
        ) : (
          <EmptyState message="No pending bookings" />
        )}
        
        {pendingBookings.length > 5 && (
          <ViewAllButton
            onPress={() => navigation.navigate('PendingBookings')}
            text={`View all ${pendingBookings.length} pending bookings`}
          />
        )}
      </SectionCard>

      {/* Quick Actions */}
      <SectionCard title="Quick Actions">
        <QuickActionButton
          title="View All Bookings"
          icon="calendar"
          onPress={() => navigation.navigate('AllBookings')}
        />
        <QuickActionButton
          title="Analytics"
          icon="chart-line"
          onPress={() => navigation.navigate('Analytics')}
        />
        <QuickActionButton
          title="Bulk Operations"
          icon="list-check"
          onPress={() => navigation.navigate('BulkOperations')}
        />
      </SectionCard>
    </ScrollView>
  );
};
```

### Bulk Operations Screen

```javascript
// src/screens/BulkOperationsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import bookingService from '../services/bookingService';

const BulkOperationsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedBookings, setSelectedBookings] = useState(new Set());
  const [operation, setOperation] = useState('confirm');
  const [loading, setLoading] = useState(false);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingService.getProviderBookings(
        null,
        1,
        100,
        { status: 'pending,confirmed', sortBy: 'date', sortOrder: 'asc' }
      );
      setBookings(response.data.data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const executeBulkOperation = async () => {
    if (selectedBookings.size === 0) {
      Alert.alert('Error', 'Please select at least one booking');
      return;
    }

    const bookingIds = Array.from(selectedBookings);
    const operationNames = {
      confirm: 'confirm',
      complete: 'complete',
      cancel: 'cancel'
    };

    Alert.alert(
      `Bulk ${operationNames[operation]}`,
      `Are you sure you want to ${operation} ${bookingIds.length} booking(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              setLoading(true);
              
              const response = await bookingService.bulkOperation(
                bookingIds,
                operation,
                `Bulk ${operation} via mobile app`
              );

              if (response.success) {
                const { successful, failed } = response.data;
                
                Alert.alert(
                  'Bulk Operation Complete',
                  `${successful.length} successful, ${failed.length} failed`,
                  [
                    { text: 'OK', onPress: () => {
                      setSelectedBookings(new Set());
                      loadBookings();
                    }}
                  ]
                );

                // Show failed operations details if any
                if (failed.length > 0) {
                  console.log('Failed operations:', failed);
                }
              }
            } catch (error) {
              handleBulkOperationError(error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const toggleBookingSelection = (bookingId) => {
    const newSelection = new Set(selectedBookings);
    if (newSelection.has(bookingId)) {
      newSelection.delete(bookingId);
    } else {
      newSelection.add(bookingId);
    }
    setSelectedBookings(newSelection);
  };

  const selectAll = () => {
    const filteredBookings = bookings.filter(booking => {
      // Only allow selection based on current operation
      switch (operation) {
        case 'confirm':
          return booking.status === 'pending';
        case 'complete':
          return booking.status === 'confirmed';
        case 'cancel':
          return ['pending', 'confirmed'].includes(booking.status);
        default:
          return true;
      }
    });

    setSelectedBookings(new Set(filteredBookings.map(b => b.id)));
  };

  const clearSelection = () => {
    setSelectedBookings(new Set());
  };

  return (
    <View style={styles.container}>
      {/* Operation selector */}
      <OperationSelector
        selectedOperation={operation}
        onOperationChange={setOperation}
        operations={[
          { key: 'confirm', label: 'Confirm Bookings', color: '#28a745' },
          { key: 'complete', label: 'Mark Complete', color: '#007bff' },
          { key: 'cancel', label: 'Cancel Bookings', color: '#dc3545' }
        ]}
      />

      {/* Selection controls */}
      <SelectionControls
        selectedCount={selectedBookings.size}
        totalCount={bookings.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
      />

      {/* Bookings list */}
      <BulkBookingsList
        bookings={bookings}
        selectedBookings={selectedBookings}
        operation={operation}
        onToggleSelection={toggleBookingSelection}
        loading={loading}
      />

      {/* Execute button */}
      <BulkExecuteButton
        operation={operation}
        selectedCount={selectedBookings.size}
        onExecute={executeBulkOperation}
        loading={loading}
      />
    </View>
  );
};
```

---

## Real-time Features

### WebSocket Integration for Real-time Updates

```javascript
// src/services/websocketService.js
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  async connect() {
    const token = await AsyncStorage.getItem('auth_token');
    
    this.socket = io('ws://your-api-domain.com', {
      auth: {
        token
      },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    // Booking-related events
    this.socket.on('booking:created', this.handleBookingCreated.bind(this));
    this.socket.on('booking:updated', this.handleBookingUpdated.bind(this));
    this.socket.on('booking:cancelled', this.handleBookingCancelled.bind(this));
    this.socket.on('booking:reminder', this.handleBookingReminder.bind(this));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event handlers
  handleBookingCreated(data) {
    this.notifyListeners('booking:created', data);
  }

  handleBookingUpdated(data) {
    this.notifyListeners('booking:updated', data);
  }

  handleBookingCancelled(data) {
    this.notifyListeners('booking:cancelled', data);
  }

  handleBookingReminder(data) {
    this.notifyListeners('booking:reminder', data);
    // Show local notification
    this.showLocalNotification(data);
  }

  // Listener management
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Listener error:', error);
        }
      });
    }
  }

  showLocalNotification(data) {
    // Implementation depends on notification library
    // Example with react-native-push-notification
    PushNotification.localNotification({
      title: 'Booking Reminder',
      message: `You have a booking in ${data.timeUntilBooking}`,
      playSound: true,
      soundName: 'default',
    });
  }
}

export default new WebSocketService();
```

### Real-time Booking Updates Hook

```javascript
// src/hooks/useBookingUpdates.js
import { useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import websocketService from '../services/websocketService';

export const useBookingUpdates = (onBookingUpdate) => {
  const navigation = useNavigation();

  const handleBookingCreated = useCallback((data) => {
    // Show notification for new booking (providers)
    Alert.alert(
      'New Booking',
      `New booking from ${data.customerName} for ${data.serviceName}`,
      [
        { text: 'OK' },
        {
          text: 'View Booking',
          onPress: () => navigation.navigate('BookingDetails', {
            bookingId: data.bookingId
          })
        }
      ]
    );
    
    onBookingUpdate?.('created', data);
  }, [onBookingUpdate, navigation]);

  const handleBookingUpdated = useCallback((data) => {
    // Handle status updates
    const statusMessages = {
      confirmed: 'Your booking has been confirmed',
      completed: 'Your booking has been completed',
      cancelled: 'Your booking has been cancelled',
      no_show: 'You were marked as no-show'
    };

    const message = statusMessages[data.newStatus];
    if (message) {
      Alert.alert('Booking Update', message);
    }

    onBookingUpdate?.('updated', data);
  }, [onBookingUpdate]);

  const handleBookingCancelled = useCallback((data) => {
    Alert.alert(
      'Booking Cancelled',
      `Booking for ${data.serviceName} has been cancelled. ${data.reason || ''}`
    );
    
    onBookingUpdate?.('cancelled', data);
  }, [onBookingUpdate]);

  const handleBookingReminder = useCallback((data) => {
    // Handle reminders (usually shown as push notifications)
    onBookingUpdate?.('reminder', data);
  }, [onBookingUpdate]);

  useEffect(() => {
    // Add listeners
    websocketService.addListener('booking:created', handleBookingCreated);
    websocketService.addListener('booking:updated', handleBookingUpdated);
    websocketService.addListener('booking:cancelled', handleBookingCancelled);
    websocketService.addListener('booking:reminder', handleBookingReminder);

    // Cleanup
    return () => {
      websocketService.removeListener('booking:created', handleBookingCreated);
      websocketService.removeListener('booking:updated', handleBookingUpdated);
      websocketService.removeListener('booking:cancelled', handleBookingCancelled);
      websocketService.removeListener('booking:reminder', handleBookingReminder);
    };
  }, [handleBookingCreated, handleBookingUpdated, handleBookingCancelled, handleBookingReminder]);
};
```

---

## Offline Support

### Offline Storage and Sync

```javascript
// src/services/offlineService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';

class OfflineService {
  constructor() {
    this.syncQueue = [];
    this.isOnline = true;
    this.initializeNetworkMonitoring();
  }

  initializeNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;
      
      if (wasOffline && this.isOnline) {
        // Connection restored, sync pending operations
        this.syncPendingOperations();
      }
    });
  }

  // Cache booking data for offline access
  async cacheBookings(bookings, key = 'cached_bookings') {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({
        data: bookings,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to cache bookings:', error);
    }
  }

  // Get cached bookings
  async getCachedBookings(key = 'cached_bookings', maxAge = 30 * 60 * 1000) { // 30 minutes
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < maxAge) {
          return data;
        }
      }
    } catch (error) {
      console.error('Failed to get cached bookings:', error);
    }
    return null;
  }

  // Queue operation for later sync
  async queueOperation(operation) {
    try {
      const queueKey = 'sync_queue';
      const existingQueue = await AsyncStorage.getItem(queueKey);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      queue.push({
        ...operation,
        timestamp: Date.now(),
        id: Date.now().toString()
      });
      
      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      this.syncQueue = queue;
    } catch (error) {
      console.error('Failed to queue operation:', error);
    }
  }

  // Sync pending operations when online
  async syncPendingOperations() {
    try {
      const queueKey = 'sync_queue';
      const queue = await AsyncStorage.getItem(queueKey);
      
      if (!queue) return;
      
      const operations = JSON.parse(queue);
      const successfulOps = [];

      for (const operation of operations) {
        try {
          await this.executeOperation(operation);
          successfulOps.push(operation.id);
        } catch (error) {
          console.error('Failed to sync operation:', operation, error);
        }
      }

      // Remove successful operations from queue
      const remainingOps = operations.filter(op => !successfulOps.includes(op.id));
      await AsyncStorage.setItem(queueKey, JSON.stringify(remainingOps));
      this.syncQueue = remainingOps;

    } catch (error) {
      console.error('Failed to sync operations:', error);
    }
  }

  async executeOperation(operation) {
    switch (operation.type) {
      case 'CANCEL_BOOKING':
        return await bookingService.cancelBooking(
          operation.data.bookingId,
          operation.data.reason
        );
      case 'UPDATE_STATUS':
        return await bookingService.updateBookingStatus(
          operation.data.bookingId,
          operation.data.status,
          operation.data.reason
        );
      case 'CREATE_BOOKING':
        return await bookingService.createBooking(operation.data);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  // Enhanced booking service methods with offline support
  async cancelBookingOffline(bookingId, reason) {
    if (this.isOnline) {
      return await bookingService.cancelBooking(bookingId, reason);
    } else {
      // Queue for later
      await this.queueOperation({
        type: 'CANCEL_BOOKING',
        data: { bookingId, reason }
      });
      
      // Update local cache optimistically
      await this.updateCachedBookingStatus(bookingId, 'cancelled');
      
      return {
        success: true,
        offline: true,
        message: 'Booking will be cancelled when connection is restored'
      };
    }
  }

  async updateCachedBookingStatus(bookingId, newStatus) {
    const cached = await this.getCachedBookings('cached_bookings', Infinity);
    if (cached) {
      const updated = cached.map(booking =>
        booking.id === bookingId ? { ...booking, status: newStatus } : booking
      );
      await this.cacheBookings(updated, 'cached_bookings');
    }
  }
}

export default new OfflineService();
```

### Offline-Aware Booking Hook

```javascript
// src/hooks/useOfflineBookings.js
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-netinfo/netinfo';
import bookingService from '../services/bookingService';
import offlineService from '../services/offlineService';

export const useOfflineBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    // Monitor network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });

    return unsubscribe;
  }, []);

  const loadBookings = async (forceRefresh = false) => {
    setLoading(true);

    try {
      if (isOnline || forceRefresh) {
        // Try to load from API
        const response = await bookingService.getUserBookings(1, 50);
        if (response.success) {
          setBookings(response.data.data);
          setLastSync(new Date());
          
          // Cache for offline access
          await offlineService.cacheBookings(response.data.data);
        }
      } else {
        // Load from cache when offline
        const cached = await offlineService.getCachedBookings();
        if (cached) {
          setBookings(cached);
        }
      }
    } catch (error) {
      // Fallback to cache on error
      const cached = await offlineService.getCachedBookings();
      if (cached) {
        setBookings(cached);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId, reason) => {
    try {
      const result = await offlineService.cancelBookingOffline(bookingId, reason);
      
      if (result.success) {
        // Update local state immediately
        setBookings(prev =>
          prev.map(booking =>
            booking.id === bookingId
              ? { ...booking, status: 'cancelled' }
              : booking
          )
        );
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  const getPendingSyncOperations = async () => {
    return offlineService.syncQueue;
  };

  return {
    bookings,
    isOnline,
    loading,
    lastSync,
    loadBookings,
    cancelBooking,
    getPendingSyncOperations
  };
};
```

---

## Performance Optimization

### Pagination and Infinite Scroll

```javascript
// src/hooks/useInfiniteBookings.js
import { useState, useEffect, useCallback } from 'react';
import bookingService from '../services/bookingService';

export const useInfiniteBookings = (filters = {}) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const limit = 20;

  const loadBookings = useCallback(async (pageNum = 1, append = false) => {
    if (loading && !refreshing) return;

    try {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      }

      const response = await bookingService.getUserBookings(pageNum, limit, filters);
      
      if (response.success) {
        const newBookings = response.data.data;
        
        if (append) {
          setBookings(prev => {
            // Remove duplicates
            const existingIds = new Set(prev.map(b => b.id));
            const uniqueNew = newBookings.filter(b => !existingIds.has(b.id));
            return [...prev, ...uniqueNew];
          });
        } else {
          setBookings(newBookings);
        }
        
        setHasMore(response.data.hasNext);
        setPage(pageNum);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, loading, refreshing]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    loadBookings(1, false);
  }, [loadBookings]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && !refreshing) {
      loadBookings(page + 1, true);
    }
  }, [hasMore, loading, refreshing, page, loadBookings]);

  // Initial load
  useEffect(() => {
    loadBookings(1, false);
  }, [filters]);

  return {
    bookings,
    loading,
    refreshing,
    hasMore,
    error,
    refresh,
    loadMore
  };
};
```

### Memoized Components

```javascript
// src/components/BookingCard.js
import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const BookingCard = memo(({ booking, onCancel, onReschedule, onViewDetails }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-JO');
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('ar-JO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f39c12',
      confirmed: '#27ae60',
      completed: '#3498db',
      cancelled: '#e74c3c',
      no_show: '#95a5a6'
    };
    return colors[status] || '#95a5a6';
  };

  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const canReschedule = ['pending'].includes(booking.status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onViewDetails}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.providerName}>{booking.providerName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
          <Text style={styles.statusText}>{booking.status}</Text>
        </View>
      </View>

      <Text style={styles.serviceName}>{booking.serviceName}</Text>
      
      <View style={styles.dateTimeContainer}>
        <Text style={styles.date}>{formatDate(booking.bookingDate)}</Text>
        <Text style={styles.time}>{formatTime(booking.startTime)}</Text>
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.amount}>{booking.amount} JOD</Text>
        <Text style={styles.paymentMethod}>{booking.paymentMethod}</Text>
      </View>

      {(canCancel || canReschedule) && (
        <View style={styles.actions}>
          {canReschedule && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={onReschedule}
            >
              <Text style={styles.actionButtonText}>Reschedule</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.booking.id === nextProps.booking.id &&
    prevProps.booking.status === nextProps.booking.status &&
    prevProps.booking.updatedAt === nextProps.booking.updatedAt
  );
});

export default BookingCard;
```

### Image Caching and Optimization

```javascript
// src/components/OptimizedImage.js
import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';

const OptimizedImage = ({ source, style, placeholder, ...props }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <View style={[style, styles.placeholder]}>
        {placeholder || <Text>Image not available</Text>}
      </View>
    );
  }

  return (
    <View style={style}>
      <FastImage
        source={source}
        style={style}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        resizeMode={FastImage.resizeMode.cover}
        priority={FastImage.priority.normal}
        cache={FastImage.cacheControl.immutable}
        {...props}
      />
      {loading && (
        <View style={[style, styles.loadingOverlay]}>
          <ActivityIndicator size="small" color="#007bff" />
        </View>
      )}
    </View>
  );
};

const styles = {
  placeholder: {
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
  },
};

export default OptimizedImage;
```

---

This comprehensive mobile integration guide provides everything needed to build robust mobile applications that integrate seamlessly with the Lamsa booking API. The examples cover authentication, booking workflows, real-time features, offline support, and performance optimization specific to mobile development needs.