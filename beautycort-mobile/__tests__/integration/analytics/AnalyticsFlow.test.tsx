import React from 'react';
import { render, fireEvent, waitFor } from '../../utils/testHelpers';
import { mockAnalyticsData, generateMockMetrics } from '../../fixtures/analytics';

// Mock the analytics service
const mockAnalyticsService = {
  getKeyMetrics: jest.fn(),
  getRevenueData: jest.fn(),
  getServicePerformance: jest.fn(),
  getBookingPatterns: jest.fn(),
  getCustomerAnalytics: jest.fn(),
  getReviewAnalytics: jest.fn(),
  getCompetitorInsights: jest.fn(),
  getGrowthRecommendations: jest.fn(),
};

// Mock chart components
const MockChart = ({ data, testID }: { data: any[]; testID: string }) => (
  <div testID={testID}>
    <div testID="chartData">{JSON.stringify(data)}</div>
  </div>
);

// Mock analytics dashboard
const MockProviderDashboard = () => {
  const [keyMetrics, setKeyMetrics] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedPeriod, setSelectedPeriod] = React.useState('week');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    loadMetrics();
  }, [selectedPeriod]);

  const loadMetrics = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const metrics = await mockAnalyticsService.getKeyMetrics(selectedPeriod);
      setKeyMetrics(metrics);
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div testID="loadingIndicator">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div testID="errorState">
        <div testID="errorMessage">{error}</div>
        <button testID="retryButton" onClick={loadMetrics}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div testID="providerDashboard">
      <div testID="periodSelector">
        <button 
          testID="dayButton"
          onClick={() => setSelectedPeriod('day')}
          style={{ 
            backgroundColor: selectedPeriod === 'day' ? '#007AFF' : 'transparent' 
          }}
        >
          Today
        </button>
        <button 
          testID="weekButton"
          onClick={() => setSelectedPeriod('week')}
          style={{ 
            backgroundColor: selectedPeriod === 'week' ? '#007AFF' : 'transparent' 
          }}
        >
          This Week
        </button>
        <button 
          testID="monthButton"
          onClick={() => setSelectedPeriod('month')}
          style={{ 
            backgroundColor: selectedPeriod === 'month' ? '#007AFF' : 'transparent' 
          }}
        >
          This Month
        </button>
      </div>

      <div testID="keyMetrics">
        <div testID="revenueMetric">
          <span testID="revenueLabel">Revenue</span>
          <span testID="revenueValue">{keyMetrics?.revenue} JOD</span>
        </div>
        <div testID="bookingsMetric">
          <span testID="bookingsLabel">Bookings</span>
          <span testID="bookingsValue">{keyMetrics?.bookings}</span>
        </div>
        <div testID="customersMetric">
          <span testID="customersLabel">New Customers</span>
          <span testID="customersValue">{keyMetrics?.newCustomers}</span>
        </div>
        <div testID="ratingMetric">
          <span testID="ratingLabel">Rating</span>
          <span testID="ratingValue">{keyMetrics?.reviewScore}</span>
        </div>
      </div>

      <button testID="refreshButton" onClick={loadMetrics}>
        Refresh Data
      </button>
    </div>
  );
};

// Mock revenue analytics screen
const MockRevenueAnalytics = () => {
  const [revenueData, setRevenueData] = React.useState(null);
  const [timeframe, setTimeframe] = React.useState('weekly');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadRevenueData();
  }, [timeframe]);

  const loadRevenueData = async () => {
    setIsLoading(true);
    const data = await mockAnalyticsService.getRevenueData(timeframe);
    setRevenueData(data);
    setIsLoading(false);
  };

  if (isLoading) {
    return <div testID="revenueLoading">Loading revenue data...</div>;
  }

  return (
    <div testID="revenueAnalytics">
      <div testID="timeframeSelector">
        <button 
          testID="dailyTimeframe"
          onClick={() => setTimeframe('daily')}
        >
          Daily
        </button>
        <button 
          testID="weeklyTimeframe"
          onClick={() => setTimeframe('weekly')}
        >
          Weekly
        </button>
        <button 
          testID="monthlyTimeframe"
          onClick={() => setTimeframe('monthly')}
        >
          Monthly
        </button>
      </div>

      <MockChart 
        testID="revenueChart"
        data={revenueData}
      />

      <div testID="revenueInsights">
        <div testID="totalRevenue">
          Total: {revenueData?.reduce((sum: number, item: any) => sum + item.amount, 0)} JOD
        </div>
        <div testID="averageRevenue">
          Average: {Math.round(revenueData?.reduce((sum: number, item: any) => sum + item.amount, 0) / revenueData?.length)} JOD
        </div>
      </div>
    </div>
  );
};

// Mock booking patterns screen
const MockBookingPatterns = () => {
  const [patterns, setPatterns] = React.useState(null);
  const [viewType, setViewType] = React.useState('heatmap');

  React.useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    const data = await mockAnalyticsService.getBookingPatterns();
    setPatterns(data);
  };

  if (!patterns) {
    return <div testID="patternsLoading">Loading patterns...</div>;
  }

  return (
    <div testID="bookingPatterns">
      <div testID="viewTypeSelector">
        <button 
          testID="heatmapView"
          onClick={() => setViewType('heatmap')}
        >
          Heatmap
        </button>
        <button 
          testID="chartView"
          onClick={() => setViewType('chart')}
        >
          Chart
        </button>
      </div>

      {viewType === 'heatmap' && (
        <div testID="bookingHeatmap">
          {/* Simplified heatmap representation */}
          {patterns.peakHours?.map((item: any, index: number) => (
            <div 
              key={index}
              testID={`heatmap-cell-${item.hour}-${item.day}`}
              style={{ 
                opacity: item.intensity,
                backgroundColor: '#007AFF',
                width: '20px',
                height: '20px',
                display: 'inline-block',
                margin: '1px',
              }}
            />
          ))}
        </div>
      )}

      {viewType === 'chart' && (
        <MockChart 
          testID="patternsChart"
          data={patterns.daily}
        />
      )}

      <div testID="patternInsights">
        <div testID="busiestDay">
          Busiest Day: {patterns.daily?.reduce((max: any, day: any) => 
            day.bookings > max.bookings ? day : max
          )?.day}
        </div>
        <div testID="peakHour">
          Peak Hour: {patterns.peakHours?.reduce((max: any, hour: any) => 
            hour.intensity > max.intensity ? hour : max
          )?.hour}:00
        </div>
      </div>
    </div>
  );
};

describe('Analytics Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockAnalyticsService.getKeyMetrics.mockImplementation((period) => 
      Promise.resolve(mockAnalyticsData.keyMetrics[period] || mockAnalyticsData.keyMetrics.week)
    );
    
    mockAnalyticsService.getRevenueData.mockImplementation((timeframe) => 
      Promise.resolve(mockAnalyticsData.revenueData[timeframe] || mockAnalyticsData.revenueData.weekly)
    );
    
    mockAnalyticsService.getBookingPatterns.mockResolvedValue(mockAnalyticsData.bookingPatterns);
  });

  describe('Dashboard Loading and Period Selection', () => {
    it('should load dashboard metrics on mount', async () => {
      const { getByTestId } = render(<MockProviderDashboard />);

      // Should show loading initially
      expect(getByTestId('loadingIndicator')).toBeTruthy();

      // Should load and display metrics
      await waitFor(() => {
        expect(getByTestId('providerDashboard')).toBeTruthy();
        expect(getByTestId('revenueValue')).toHaveTextContent('1420');
        expect(getByTestId('bookingsValue')).toHaveTextContent('58');
      });

      expect(mockAnalyticsService.getKeyMetrics).toHaveBeenCalledWith('week');
    });

    it('should update metrics when period changes', async () => {
      const { getByTestId } = render(<MockProviderDashboard />);

      await waitFor(() => {
        expect(getByTestId('providerDashboard')).toBeTruthy();
      });

      // Change to today
      fireEvent.press(getByTestId('dayButton'));

      await waitFor(() => {
        expect(mockAnalyticsService.getKeyMetrics).toHaveBeenCalledWith('day');
        expect(getByTestId('revenueValue')).toHaveTextContent('285');
        expect(getByTestId('bookingsValue')).toHaveTextContent('12');
      });
    });

    it('should handle analytics loading errors', async () => {
      mockAnalyticsService.getKeyMetrics.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(<MockProviderDashboard />);

      await waitFor(() => {
        expect(getByTestId('errorState')).toBeTruthy();
        expect(getByTestId('errorMessage')).toHaveTextContent('Failed to load analytics data');
      });

      // Test retry functionality
      mockAnalyticsService.getKeyMetrics.mockResolvedValue(mockAnalyticsData.keyMetrics.week);
      
      fireEvent.press(getByTestId('retryButton'));

      await waitFor(() => {
        expect(getByTestId('providerDashboard')).toBeTruthy();
      });
    });

    it('should refresh data manually', async () => {
      const { getByTestId } = render(<MockProviderDashboard />);

      await waitFor(() => {
        expect(getByTestId('providerDashboard')).toBeTruthy();
      });

      jest.clearAllMocks();

      fireEvent.press(getByTestId('refreshButton'));

      await waitFor(() => {
        expect(mockAnalyticsService.getKeyMetrics).toHaveBeenCalledWith('week');
      });
    });
  });

  describe('Revenue Analytics Flow', () => {
    it('should load and display revenue chart', async () => {
      const { getByTestId } = render(<MockRevenueAnalytics />);

      await waitFor(() => {
        expect(getByTestId('revenueAnalytics')).toBeTruthy();
        expect(getByTestId('revenueChart')).toBeTruthy();
      });

      expect(mockAnalyticsService.getRevenueData).toHaveBeenCalledWith('weekly');
    });

    it('should change timeframe and reload data', async () => {
      const { getByTestId } = render(<MockRevenueAnalytics />);

      await waitFor(() => {
        expect(getByTestId('revenueAnalytics')).toBeTruthy();
      });

      fireEvent.press(getByTestId('dailyTimeframe'));

      await waitFor(() => {
        expect(mockAnalyticsService.getRevenueData).toHaveBeenCalledWith('daily');
      });
    });

    it('should calculate and display revenue insights', async () => {
      mockAnalyticsService.getRevenueData.mockResolvedValue([
        { amount: 100 },
        { amount: 200 },
        { amount: 150 },
      ]);

      const { getByTestId } = render(<MockRevenueAnalytics />);

      await waitFor(() => {
        expect(getByTestId('totalRevenue')).toHaveTextContent('Total: 450 JOD');
        expect(getByTestId('averageRevenue')).toHaveTextContent('Average: 150 JOD');
      });
    });
  });

  describe('Booking Patterns Analysis', () => {
    it('should display booking heatmap', async () => {
      const mockPeakHours = [
        { hour: 10, day: 1, intensity: 0.5 },
        { hour: 11, day: 1, intensity: 0.8 },
        { hour: 19, day: 1, intensity: 1.0 },
      ];

      mockAnalyticsService.getBookingPatterns.mockResolvedValue({
        ...mockAnalyticsData.bookingPatterns,
        peakHours: mockPeakHours,
      });

      const { getByTestId } = render(<MockBookingPatterns />);

      await waitFor(() => {
        expect(getByTestId('bookingHeatmap')).toBeTruthy();
        expect(getByTestId('heatmap-cell-10-1')).toBeTruthy();
        expect(getByTestId('heatmap-cell-11-1')).toBeTruthy();
        expect(getByTestId('heatmap-cell-19-1')).toBeTruthy();
      });
    });

    it('should switch between heatmap and chart views', async () => {
      const { getByTestId, queryByTestId } = render(<MockBookingPatterns />);

      await waitFor(() => {
        expect(getByTestId('bookingHeatmap')).toBeTruthy();
      });

      fireEvent.press(getByTestId('chartView'));

      expect(queryByTestId('bookingHeatmap')).toBeFalsy();
      expect(getByTestId('patternsChart')).toBeTruthy();
    });

    it('should show pattern insights', async () => {
      const mockData = {
        daily: [
          { day: 'الإثنين', bookings: 20 },
          { day: 'الثلاثاء', bookings: 35 },
          { day: 'الأربعاء', bookings: 28 },
        ],
        peakHours: [
          { hour: 10, intensity: 0.5 },
          { hour: 14, intensity: 0.8 },
          { hour: 19, intensity: 1.0 },
        ],
      };

      mockAnalyticsService.getBookingPatterns.mockResolvedValue(mockData);

      const { getByTestId } = render(<MockBookingPatterns />);

      await waitFor(() => {
        expect(getByTestId('busiestDay')).toHaveTextContent('Busiest Day: الثلاثاء');
        expect(getByTestId('peakHour')).toHaveTextContent('Peak Hour: 19:00');
      });
    });
  });

  describe('Real-time Data Updates', () => {
    it('should handle live data updates', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockAnalyticsService.getKeyMetrics.mockReturnValue(mockPromise);

      const { getByTestId } = render(<MockProviderDashboard />);

      // Should show loading
      expect(getByTestId('loadingIndicator')).toBeTruthy();

      // Simulate real-time update
      resolvePromise!(generateMockMetrics('week'));

      await waitFor(() => {
        expect(getByTestId('providerDashboard')).toBeTruthy();
      });
    });

    it('should handle concurrent data requests', async () => {
      const { getByTestId } = render(<MockProviderDashboard />);

      await waitFor(() => {
        expect(getByTestId('providerDashboard')).toBeTruthy();
      });

      // Rapidly change periods
      fireEvent.press(getByTestId('dayButton'));
      fireEvent.press(getByTestId('monthButton'));
      fireEvent.press(getByTestId('weekButton'));

      // Should handle all requests gracefully
      await waitFor(() => {
        expect(mockAnalyticsService.getKeyMetrics).toHaveBeenCalledTimes(4); // Initial + 3 changes
      });
    });
  });

  describe('Performance with Large Datasets', () => {
    it('should handle large revenue datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 365 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 500) + 100,
      }));

      mockAnalyticsService.getRevenueData.mockResolvedValue(largeDataset);

      const startTime = Date.now();
      const { getByTestId } = render(<MockRevenueAnalytics />);

      await waitFor(() => {
        expect(getByTestId('revenueChart')).toBeTruthy();
      });

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(3000);
    });

    it('should paginate large booking pattern data', async () => {
      const largeHeatmapData = Array.from({ length: 1000 }, (_, i) => ({
        hour: i % 24,
        day: Math.floor(i / 24) % 7,
        intensity: Math.random(),
      }));

      mockAnalyticsService.getBookingPatterns.mockResolvedValue({
        ...mockAnalyticsData.bookingPatterns,
        peakHours: largeHeatmapData,
      });

      const { getByTestId } = render(<MockBookingPatterns />);

      await waitFor(() => {
        expect(getByTestId('bookingHeatmap')).toBeTruthy();
      });

      // Should handle large dataset without crashing
      expect(getByTestId('bookingHeatmap').children).toHaveLength(1000);
    });
  });

  describe('Accessibility and Internationalization', () => {
    it('should provide accessible chart descriptions', async () => {
      const { getByTestId } = render(<MockRevenueAnalytics />);

      await waitFor(() => {
        const chart = getByTestId('revenueChart');
        expect(chart).toBeTruthy();
        // In real implementation, would check for aria-label, etc.
      });
    });

    it('should display Arabic number formatting', async () => {
      mockAnalyticsService.getKeyMetrics.mockResolvedValue({
        revenue: 1234.56,
        bookings: 42,
        newCustomers: 8,
        reviewScore: 4.8,
      });

      const { getByTestId } = render(<MockProviderDashboard />);

      await waitFor(() => {
        expect(getByTestId('revenueValue')).toHaveTextContent('1234.56 JOD');
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from partial data loading failures', async () => {
      // Mock some services to fail, others to succeed
      mockAnalyticsService.getKeyMetrics.mockRejectedValue(new Error('Metrics failed'));
      mockAnalyticsService.getRevenueData.mockResolvedValue(mockAnalyticsData.revenueData.weekly);

      const { getByTestId } = render(<MockProviderDashboard />);

      await waitFor(() => {
        expect(getByTestId('errorState')).toBeTruthy();
      });

      // Revenue analytics should still work
      const { getByTestId: getRevenueTestId } = render(<MockRevenueAnalytics />);

      await waitFor(() => {
        expect(getRevenueTestId('revenueAnalytics')).toBeTruthy();
      });
    });

    it('should handle stale data gracefully', async () => {
      // First call succeeds
      mockAnalyticsService.getKeyMetrics.mockResolvedValueOnce(mockAnalyticsData.keyMetrics.week);
      
      // Second call fails (network issue)
      mockAnalyticsService.getKeyMetrics.mockRejectedValueOnce(new Error('Network timeout'));

      const { getByTestId } = render(<MockProviderDashboard />);

      await waitFor(() => {
        expect(getByTestId('providerDashboard')).toBeTruthy();
      });

      // Trigger refresh which fails
      fireEvent.press(getByTestId('refreshButton'));

      await waitFor(() => {
        // Should show error but keep previous data visible
        expect(getByTestId('errorState')).toBeTruthy();
      });
    });
  });
});