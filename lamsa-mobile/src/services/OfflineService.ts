import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnhancedService, ServiceCategory, ServiceTag } from '../types/service.types';

interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE';
  entity: 'service' | 'package';
  data: any;
  timestamp: number;
}

interface OfflineData {
  services: EnhancedService[];
  categories: ServiceCategory[];
  tags: ServiceTag[];
  packages: any[];
  lastSync: number;
}

class OfflineService {
  private readonly STORAGE_KEYS = {
    OFFLINE_DATA: 'offline_data',
    SYNC_QUEUE: 'sync_queue',
    LAST_SYNC: 'last_sync',
  };

  // Initialize offline storage
  async initialize(): Promise<void> {
    try {
      const offlineData = await this.getOfflineData();
      if (!offlineData) {
        await this.saveOfflineData({
          services: [],
          categories: [],
          tags: [],
          packages: [],
          lastSync: 0,
        });
      }
    } catch (error) {
      console.error('Error initializing offline service:', error);
    }
  }

  // Get offline data
  async getOfflineData(): Promise<OfflineData | null> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting offline data:', error);
      return null;
    }
  }

  // Save offline data
  async saveOfflineData(data: OfflineData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }

  // Get services from offline storage
  async getServices(): Promise<EnhancedService[]> {
    const data = await this.getOfflineData();
    return data?.services || [];
  }

  // Save services to offline storage
  async saveServices(services: EnhancedService[]): Promise<void> {
    const data = await this.getOfflineData();
    if (data) {
      data.services = services;
      await this.saveOfflineData(data);
    }
  }

  // Get categories from offline storage
  async getCategories(): Promise<ServiceCategory[]> {
    const data = await this.getOfflineData();
    return data?.categories || [];
  }

  // Save categories to offline storage
  async saveCategories(categories: ServiceCategory[]): Promise<void> {
    const data = await this.getOfflineData();
    if (data) {
      data.categories = categories;
      await this.saveOfflineData(data);
    }
  }

  // Get tags from offline storage
  async getTags(): Promise<ServiceTag[]> {
    const data = await this.getOfflineData();
    return data?.tags || [];
  }

  // Save tags to offline storage
  async saveTags(tags: ServiceTag[]): Promise<void> {
    const data = await this.getOfflineData();
    if (data) {
      data.tags = tags;
      await this.saveOfflineData(data);
    }
  }

  // Add action to sync queue
  async addToSyncQueue(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const newAction: OfflineAction = {
        ...action,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      queue.push(newAction);
      await AsyncStorage.setItem(this.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }

  // Get sync queue
  async getSyncQueue(): Promise<OfflineAction[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  // Clear sync queue
  async clearSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing sync queue:', error);
    }
  }

  // Process sync queue
  async processSyncQueue(): Promise<void> {
    const queue = await this.getSyncQueue();
    if (queue.length === 0) return;

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      for (const action of queue) {
        await this.processAction(action, token);
      }

      // Clear queue after successful sync
      await this.clearSyncQueue();
      await this.updateLastSync();
    } catch (error) {
      console.error('Error processing sync queue:', error);
    }
  }

  // Process individual action
  private async processAction(action: OfflineAction, token: string): Promise<void> {
    const { API_URL } = require('../config');
    
    try {
      let url = '';
      let method = 'POST';
      let body: any = action.data;

      switch (action.type) {
        case 'CREATE':
          url = `${API_URL}/api/${action.entity === 'service' ? 'services' : 'services/packages'}`;
          method = 'POST';
          break;
        case 'UPDATE':
          url = `${API_URL}/api/${action.entity === 'service' ? 'services' : 'services/packages'}/${action.data.id}`;
          method = 'PUT';
          break;
        case 'DELETE':
          url = `${API_URL}/api/${action.entity === 'service' ? 'services' : 'services/packages'}/${action.data.id}`;
          method = 'DELETE';
          body = null;
          break;
        case 'TOGGLE':
          url = `${API_URL}/api/services/${action.data.id}/toggle`;
          method = 'PATCH';
          body = { active: action.data.active };
          break;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : null,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error processing action:', error);
      throw error;
    }
  }

  // Update last sync timestamp
  async updateLastSync(): Promise<void> {
    try {
      const timestamp = Date.now();
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, timestamp.toString());
      
      const data = await this.getOfflineData();
      if (data) {
        data.lastSync = timestamp;
        await this.saveOfflineData(data);
      }
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  }

  // Get last sync timestamp
  async getLastSync(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);
      return data ? parseInt(data) : 0;
    } catch (error) {
      console.error('Error getting last sync:', error);
      return 0;
    }
  }

  // Check if online
  async isOnline(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Sync with server
  async sync(): Promise<void> {
    try {
      const isOnline = await this.isOnline();
      if (!isOnline) {
        console.log('Device is offline, skipping sync');
        return;
      }

      // Process pending actions first
      await this.processSyncQueue();

      // Fetch latest data from server
      await this.fetchLatestData();

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Error during sync:', error);
    }
  }

  // Fetch latest data from server
  private async fetchLatestData(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const providerId = await AsyncStorage.getItem('providerId');
      
      if (!token || !providerId) return;

      const { API_URL } = require('../config');

      const [servicesRes, categoriesRes, tagsRes, packagesRes] = await Promise.all([
        fetch(`${API_URL}/api/providers/${providerId}/services`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/services/categories`),
        fetch(`${API_URL}/api/services/tags`),
        fetch(`${API_URL}/api/services/packages/${providerId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const [servicesData, categoriesData, tagsData, packagesData] = await Promise.all([
        servicesRes.ok ? servicesRes.json() : { data: { services: [] } },
        categoriesRes.ok ? categoriesRes.json() : { data: [] },
        tagsRes.ok ? tagsRes.json() : { data: [] },
        packagesRes.ok ? packagesRes.json() : { data: [] },
      ]);

      const offlineData: OfflineData = {
        services: servicesData.data.services || [],
        categories: categoriesData.data || [],
        tags: tagsData.data || [],
        packages: packagesData.data || [],
        lastSync: Date.now(),
      };

      await this.saveOfflineData(offlineData);
    } catch (error) {
      console.error('Error fetching latest data:', error);
    }
  }

  // Create service offline
  async createServiceOffline(serviceData: any): Promise<void> {
    // Add to local storage
    const services = await this.getServices();
    const newService = {
      ...serviceData,
      id: `offline_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    services.push(newService);
    await this.saveServices(services);

    // Add to sync queue
    await this.addToSyncQueue({
      type: 'CREATE',
      entity: 'service',
      data: serviceData,
    });
  }

  // Update service offline
  async updateServiceOffline(serviceId: string, serviceData: any): Promise<void> {
    // Update local storage
    const services = await this.getServices();
    const index = services.findIndex(s => s.id === serviceId);
    if (index !== -1) {
      services[index] = { ...services[index], ...serviceData, updated_at: new Date().toISOString() };
      await this.saveServices(services);
    }

    // Add to sync queue
    await this.addToSyncQueue({
      type: 'UPDATE',
      entity: 'service',
      data: { id: serviceId, ...serviceData },
    });
  }

  // Delete service offline
  async deleteServiceOffline(serviceId: string): Promise<void> {
    // Remove from local storage
    const services = await this.getServices();
    const filteredServices = services.filter(s => s.id !== serviceId);
    await this.saveServices(filteredServices);

    // Add to sync queue
    await this.addToSyncQueue({
      type: 'DELETE',
      entity: 'service',
      data: { id: serviceId },
    });
  }

  // Toggle service offline
  async toggleServiceOffline(serviceId: string, active: boolean): Promise<void> {
    // Update local storage
    const services = await this.getServices();
    const index = services.findIndex(s => s.id === serviceId);
    if (index !== -1) {
      services[index].active = active;
      await this.saveServices(services);
    }

    // Add to sync queue
    await this.addToSyncQueue({
      type: 'TOGGLE',
      entity: 'service',
      data: { id: serviceId, active },
    });
  }
}

export default new OfflineService();