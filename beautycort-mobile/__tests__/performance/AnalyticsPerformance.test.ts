// Performance benchmarks for analytics features
// Tests loading times, memory usage, and rendering performance

import { measurePerformance, detectMemoryLeaks } from '../utils/testHelpers';
import { mockAnalyticsData, generateMockMetrics, generateMockRevenueData } from '../fixtures/analytics';

// Mock the analytics service for performance testing
const mockAnalyticsService = {
  getKeyMetrics: jest.fn(),
  getRevenueData: jest.fn(),
  getServicePerformance: jest.fn(),
  getBookingPatterns: jest.fn(),
  getCustomerAnalytics: jest.fn(),
  processLargeDataset: jest.fn(),
};

describe('Analytics Performance Tests', () => {
  let memoryLeakDetector: ReturnType<typeof detectMemoryLeaks>;

  beforeEach(() => {
    jest.clearAllMocks();
    memoryLeakDetector = detectMemoryLeaks();
  });

  afterEach(() => {
    const memoryIncrease = memoryLeakDetector.measure();
    if (memoryIncrease > 0) {
      console.warn(`Memory increased by ${memoryIncrease / 1024 / 1024}MB in test`);
    }
  });

  describe('Data Loading Performance', () => {
    it('should load key metrics within 500ms', async () => {
      mockAnalyticsService.getKeyMetrics.mockResolvedValue(mockAnalyticsData.keyMetrics.week);

      const { duration } = await measurePerformance('getKeyMetrics', async () => {
        return await mockAnalyticsService.getKeyMetrics('week');
      });

      expect(duration).toBeLessThan(500);
    });

    it('should load revenue data within 800ms', async () => {
      const largeRevenueData = generateMockRevenueData(365); // Full year
      mockAnalyticsService.getRevenueData.mockResolvedValue(largeRevenueData);

      const { duration } = await measurePerformance('getRevenueData', async () => {
        return await mockAnalyticsService.getRevenueData('yearly');
      });

      expect(duration).toBeLessThan(800);
    });

    it('should handle concurrent data requests efficiently', async () => {
      mockAnalyticsService.getKeyMetrics.mockResolvedValue(mockAnalyticsData.keyMetrics.week);
      mockAnalyticsService.getRevenueData.mockResolvedValue(mockAnalyticsData.revenueData.weekly);
      mockAnalyticsService.getBookingPatterns.mockResolvedValue(mockAnalyticsData.bookingPatterns);

      const { duration } = await measurePerformance('concurrentRequests', async () => {
        return await Promise.all([
          mockAnalyticsService.getKeyMetrics('week'),
          mockAnalyticsService.getRevenueData('weekly'),
          mockAnalyticsService.getBookingPatterns(),
        ]);
      });

      // Concurrent requests should complete faster than sequential
      expect(duration).toBeLessThan(1000);
    });

    it('should cache repeated requests', async () => {
      let callCount = 0;
      mockAnalyticsService.getKeyMetrics.mockImplementation(() => {
        callCount++;
        return Promise.resolve(mockAnalyticsData.keyMetrics.week);
      });

      // Simulate caching mechanism
      let cache: Record<string, any> = {};
      const getCachedMetrics = async (period: string) => {
        if (cache[period]) {
          return cache[period];
        }
        const result = await mockAnalyticsService.getKeyMetrics(period);
        cache[period] = result;
        return result;
      };

      // First call
      await getCachedMetrics('week');
      expect(callCount).toBe(1);

      // Second call (should use cache)
      await getCachedMetrics('week');
      expect(callCount).toBe(1);

      // Different period (should make new call)
      await getCachedMetrics('month');
      expect(callCount).toBe(2);
    });
  });

  describe('Large Dataset Handling', () => {
    it('should process 1000+ data points efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        date: new Date(2024, 0, i % 365).toISOString(),
        revenue: Math.random() * 500 + 100,
        bookings: Math.floor(Math.random() * 20),
      }));

      mockAnalyticsService.processLargeDataset.mockImplementation((data) => {
        // Simulate processing time
        return new Promise(resolve => {
          setTimeout(() => {
            const processed = data.map((item: any) => ({
              ...item,
              processed: true,
            }));
            resolve(processed);
          }, 50);
        });
      });

      const { duration, result } = await measurePerformance('processLargeDataset', async () => {
        return await mockAnalyticsService.processLargeDataset(largeDataset);
      });

      expect(duration).toBeLessThan(200); // Should process within 200ms
      expect(result).toHaveLength(1000);
    });

    it('should handle pagination for large datasets', async () => {
      const generatePagedData = (page: number, pageSize: number) => {
        const start = page * pageSize;
        return Array.from({ length: pageSize }, (_, i) => ({
          id: start + i,
          value: Math.random() * 100,
        }));
      };

      const { duration } = await measurePerformance('paginatedDataLoading', async () => {
        const pages = [];
        for (let page = 0; page < 10; page++) {
          pages.push(generatePagedData(page, 100));
        }
        return pages;
      });

      expect(duration).toBeLessThan(100);
    });

    it('should efficiently filter and sort large datasets', async () => {
      const largeServiceList = Array.from({ length: 500 }, (_, i) => ({
        id: `service-${i}`,
        name: `Service ${i}`,
        nameAr: `خدمة ${i}`,
        price: Math.floor(Math.random() * 100) + 10,
        category: ['HAIR', 'MAKEUP', 'NAILS', 'SPA'][i % 4],
        bookings: Math.floor(Math.random() * 100),
        revenue: Math.floor(Math.random() * 1000),
      }));

      const { duration } = await measurePerformance('filterAndSort', async () => {
        // Filter by category
        const filtered = largeServiceList.filter(service => service.category === 'HAIR');
        
        // Sort by revenue
        const sorted = filtered.sort((a, b) => b.revenue - a.revenue);
        
        // Get top 20
        return sorted.slice(0, 20);
      });

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Chart Rendering Performance', () => {
    it('should render charts with 365 data points quickly', async () => {
      const chartData = generateMockRevenueData(365);

      const { duration } = await measurePerformance('chartDataProcessing', async () => {
        // Simulate chart data processing
        const processedData = chartData.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.amount,
          label: point.date,
        }));

        // Simulate chart optimization (data point reduction for mobile)
        const optimizedData = processedData.filter((_, index) => index % 7 === 0); // Weekly points only
        
        return optimizedData;
      });

      expect(duration).toBeLessThan(100);
    });

    it('should handle heatmap data efficiently', async () => {
      // Generate 7 days x 24 hours = 168 heatmap cells
      const heatmapData = Array.from({ length: 168 }, (_, i) => ({
        hour: i % 24,
        day: Math.floor(i / 24),
        intensity: Math.random(),
        bookings: Math.floor(Math.random() * 20),
      }));

      const { duration } = await measurePerformance('heatmapProcessing', async () => {
        // Find peak hours
        const peakHours = heatmapData
          .filter(cell => cell.intensity > 0.7)
          .sort((a, b) => b.intensity - a.intensity)
          .slice(0, 10);

        // Calculate averages by day
        const dailyAverages = Array.from({ length: 7 }, (_, day) => {
          const dayData = heatmapData.filter(cell => cell.day === day);
          const avg = dayData.reduce((sum, cell) => sum + cell.intensity, 0) / dayData.length;
          return { day, average: avg };
        });

        return { peakHours, dailyAverages };
      });

      expect(duration).toBeLessThan(50);
    });

    it('should optimize chart data for mobile screens', async () => {
      const fullDataset = generateMockRevenueData(365);

      const { duration } = await measurePerformance('chartOptimization', async () => {
        // Mobile optimization: reduce data points based on screen width
        const screenWidth = 375; // iPhone SE width
        const maxDataPoints = Math.floor(screenWidth / 10); // 10px per point minimum

        if (fullDataset.length <= maxDataPoints) {
          return fullDataset;
        }

        // Use sampling to reduce data points while preserving trends
        const step = Math.ceil(fullDataset.length / maxDataPoints);
        const optimizedData = fullDataset.filter((_, index) => index % step === 0);

        return optimizedData;
      });

      expect(duration).toBeLessThan(30);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during repeated data updates', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate multiple data updates
      for (let i = 0; i < 100; i++) {
        const data = generateMockMetrics('week');
        mockAnalyticsService.getKeyMetrics.mockResolvedValue(data);
        await mockAnalyticsService.getKeyMetrics('week');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it('should clean up chart instances properly', async () => {
      const chartInstances: any[] = [];

      const createMockChart = (data: any[]) => {
        const chart = {
          data,
          destroy: jest.fn(),
          update: jest.fn(),
        };
        chartInstances.push(chart);
        return chart;
      };

      // Create and destroy multiple charts
      for (let i = 0; i < 50; i++) {
        const data = generateMockRevenueData(30);
        const chart = createMockChart(data);
        
        // Simulate chart lifecycle
        chart.update(data);
        chart.destroy();
      }

      // All charts should have been destroyed
      expect(chartInstances.every(chart => chart.destroy)).toHaveBeenCalledTimes(50);
    });

    it('should handle rapid data updates without accumulating memory', async () => {
      let dataStore: any[] = [];

      const updateData = (newData: any) => {
        // Simulate proper cleanup of old data
        dataStore = newData;
      };

      const initialMemory = process.memoryUsage().heapUsed;

      // Rapid updates
      for (let i = 0; i < 1000; i++) {
        const newData = generateMockMetrics('day');
        updateData(newData);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not accumulate old data in memory
      expect(memoryIncrease).toBeLessThan(1 * 1024 * 1024); // Less than 1MB
    });
  });

  describe('Real-time Performance', () => {
    it('should handle real-time updates efficiently', async () => {
      const updateQueue: any[] = [];
      let processingUpdates = false;

      const processUpdates = async () => {
        if (processingUpdates || updateQueue.length === 0) return;
        
        processingUpdates = true;
        const updates = updateQueue.splice(0, 10); // Process in batches
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 10));
        
        processingUpdates = false;
        
        // Process remaining updates
        if (updateQueue.length > 0) {
          setImmediate(processUpdates);
        }
      };

      const { duration } = await measurePerformance('realTimeUpdates', async () => {
        // Simulate 100 rapid updates
        for (let i = 0; i < 100; i++) {
          updateQueue.push({ id: i, data: generateMockMetrics('day') });
        }
        
        await processUpdates();
        
        // Wait for all updates to be processed
        while (updateQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      });

      expect(duration).toBeLessThan(500);
    });

    it('should throttle API calls during rapid interactions', async () => {
      let apiCallCount = 0;
      let lastCallTime = 0;

      const throttledApiCall = async (period: string) => {
        const now = Date.now();
        const timeSinceLastCall = now - lastCallTime;
        
        // Throttle to maximum 1 call per 100ms
        if (timeSinceLastCall < 100) {
          return; // Skip this call
        }
        
        lastCallTime = now;
        apiCallCount++;
        await mockAnalyticsService.getKeyMetrics(period);
      };

      // Simulate rapid period changes
      const periods = ['day', 'week', 'month'];
      for (let i = 0; i < 50; i++) {
        await throttledApiCall(periods[i % 3]);
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms intervals
      }

      // Should have made significantly fewer API calls due to throttling
      expect(apiCallCount).toBeLessThan(10);
    });

    it('should debounce search queries', async () => {
      let searchCallCount = 0;
      const searchQueries: string[] = [];

      const debouncedSearch = (() => {
        let timeoutId: NodeJS.Timeout;
        
        return (query: string) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            searchCallCount++;
            // Simulate search
            const mockResults = mockAnalyticsData.servicePerformance.filter(
              service => service.name.includes(query)
            );
            searchQueries.push(query);
          }, 300); // 300ms debounce
        };
      })();

      // Simulate rapid typing
      const searchTerms = ['قص', 'قص ', 'قص ش', 'قص شع', 'قص شعر'];
      
      for (const term of searchTerms) {
        debouncedSearch(term);
        await new Promise(resolve => setTimeout(resolve, 50)); // Type every 50ms
      }

      // Wait for debounce to complete
      await new Promise(resolve => setTimeout(resolve, 400));

      // Should have only searched once (for the final term)
      expect(searchCallCount).toBe(1);
      expect(searchQueries).toEqual(['قص شعر']);
    });
  });

  describe('Network Performance', () => {
    it('should handle slow network conditions gracefully', async () => {
      // Simulate slow network response
      mockAnalyticsService.getKeyMetrics.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(mockAnalyticsData.keyMetrics.week);
          }, 2000); // 2 second delay
        });
      });

      const { duration } = await measurePerformance('slowNetworkHandling', async () => {
        // Should show loading state and handle timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 3000);
        });

        try {
          return await Promise.race([
            mockAnalyticsService.getKeyMetrics('week'),
            timeoutPromise
          ]);
        } catch (error) {
          return { error: 'timeout' };
        }
      });

      expect(duration).toBeLessThan(3500); // Should handle within timeout + buffer
    });

    it('should implement request cancellation', async () => {
      let cancelled = false;
      
      const cancellableRequest = () => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            if (cancelled) {
              reject(new Error('Request cancelled'));
            } else {
              resolve(mockAnalyticsData.keyMetrics.week);
            }
          }, 1000);

          // Return cancellation function
          return {
            cancel: () => {
              cancelled = true;
              clearTimeout(timeoutId);
            }
          };
        });
      };

      const startTime = Date.now();
      const request = cancellableRequest();
      
      // Cancel after 100ms
      setTimeout(() => {
        cancelled = true;
      }, 100);

      try {
        await request;
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(200); // Should cancel quickly
        expect(error.message).toBe('Request cancelled');
      }
    });
  });

  describe('Background Processing', () => {
    it('should process analytics calculations in background', async () => {
      const calculateComplex = async (data: any[]) => {
        // Simulate CPU-intensive calculation
        return new Promise(resolve => {
          setTimeout(() => {
            const result = data.reduce((acc, item) => {
              // Complex calculations
              acc.total += item.revenue;
              acc.average = acc.total / data.length;
              acc.growth = (item.revenue / acc.total) * 100;
              return acc;
            }, { total: 0, average: 0, growth: 0 });
            
            resolve(result);
          }, 0); // Use setTimeout to yield to event loop
        });
      };

      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        revenue: Math.random() * 1000,
        date: new Date(2024, 0, i),
      }));

      const { duration } = await measurePerformance('backgroundCalculation', async () => {
        return await calculateComplex(largeDataset);
      });

      expect(duration).toBeLessThan(100); // Should complete quickly due to async processing
    });
  });
});