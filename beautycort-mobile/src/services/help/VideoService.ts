import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface VideoTutorial {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  category: string;
  duration: number; // in seconds
  thumbnailUrl: string;
  videoUrl: string;
  subtitles?: {
    ar?: string; // Arabic subtitle file URL
    en?: string; // English subtitle file URL
  };
  transcription?: {
    ar?: string;
    en?: string;
  };
  tags: string[];
  tagsAr: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[];
  relatedVideos?: string[];
  relatedHelpContent?: string[];
  viewCount: number;
  likes: number;
  downloadSize?: number; // in MB
  quality: 'sd' | 'hd';
  isOfflineAvailable: boolean;
  lastUpdated: string;
  featured?: boolean;
}

export interface VideoProgress {
  videoId: string;
  watchedDuration: number; // in seconds
  completed: boolean;
  lastWatchedAt: string;
  bookmarks: number[]; // timestamps of bookmarks
  playbackSpeed: number;
  quality: 'sd' | 'hd';
}

export interface DownloadProgress {
  videoId: string;
  progress: number; // 0-100
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'paused';
  downloadedBytes: number;
  totalBytes: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface VideoCategory {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  color: string;
  order: number;
  videoCount: number;
}

export interface PlaylistInfo {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  videoIds: string[];
  duration: number; // total duration in seconds
  thumbnailUrl: string;
  category: string;
  difficulty: VideoTutorial['difficulty'];
  featured: boolean;
}

class VideoService {
  private static instance: VideoService;
  private videos: VideoTutorial[] = [];
  private categories: VideoCategory[] = [];
  private playlists: PlaylistInfo[] = [];
  private downloadQueue: DownloadProgress[] = [];
  private downloadListeners: ((progress: DownloadProgress) => void)[] = [];

  private constructor() {
    this.initializeVideoContent();
  }

  public static getInstance(): VideoService {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService();
    }
    return VideoService.instance;
  }

  private initializeVideoContent() {
    // Initialize video categories
    this.categories = [
      {
        id: 'getting-started',
        name: 'Getting Started',
        nameAr: 'البداية',
        description: 'Essential tutorials for new providers',
        descriptionAr: 'دروس أساسية لمقدمي الخدمات الجدد',
        icon: 'play-circle',
        color: '#4CAF50',
        order: 1,
        videoCount: 8,
      },
      {
        id: 'service-management',
        name: 'Service Management',
        nameAr: 'إدارة الخدمات',
        description: 'Managing your services and pricing',
        descriptionAr: 'إدارة خدماتك وأسعارك',
        icon: 'cut',
        color: '#2196F3',
        order: 2,
        videoCount: 12,
      },
      {
        id: 'customer-communication',
        name: 'Customer Communication',
        nameAr: 'التواصل مع العملاء',
        description: 'Best practices for customer interaction',
        descriptionAr: 'أفضل الممارسات للتفاعل مع العملاء',
        icon: 'chatbubbles',
        color: '#FF9800',
        order: 3,
        videoCount: 10,
      },
      {
        id: 'business-growth',
        name: 'Business Growth',
        nameAr: 'تنمية الأعمال',
        description: 'Marketing and growth strategies',
        descriptionAr: 'استراتيجيات التسويق والنمو',
        icon: 'trending-up',
        color: '#9C27B0',
        order: 4,
        videoCount: 15,
      },
      {
        id: 'analytics',
        name: 'Analytics & Insights',
        nameAr: 'التحليلات والرؤى',
        description: 'Understanding your business data',
        descriptionAr: 'فهم بيانات عملك',
        icon: 'bar-chart',
        color: '#607D8B',
        order: 5,
        videoCount: 6,
      },
    ];

    // Initialize video tutorials with Jordan market focus
    this.videos = [
      {
        id: 'welcome-to-beautycort',
        title: 'Welcome to BeautyCort - Complete Overview',
        titleAr: 'أهلاً بك في بيوتي كورت - نظرة شاملة',
        description: 'Complete introduction to BeautyCort platform for beauty providers in Jordan.',
        descriptionAr: 'مقدمة شاملة لمنصة بيوتي كورت لمقدمي خدمات الجمال في الأردن.',
        category: 'getting-started',
        duration: 480, // 8 minutes
        thumbnailUrl: 'https://example.com/thumbnails/welcome.jpg',
        videoUrl: 'https://example.com/videos/welcome-ar.mp4',
        subtitles: {
          ar: 'https://example.com/subtitles/welcome-ar.vtt',
          en: 'https://example.com/subtitles/welcome-en.vtt',
        },
        transcription: {
          ar: 'أهلاً وسهلاً بك في بيوتي كورت، المنصة الرائدة لخدمات الجمال في الأردن...',
          en: 'Welcome to BeautyCort, the leading beauty services platform in Jordan...',
        },
        tags: ['overview', 'introduction', 'basics'],
        tagsAr: ['نظرة عامة', 'مقدمة', 'أساسيات'],
        difficulty: 'beginner',
        viewCount: 2450,
        likes: 189,
        downloadSize: 95,
        quality: 'hd',
        isOfflineAvailable: true,
        lastUpdated: new Date().toISOString(),
        featured: true,
        relatedVideos: ['setup-profile', 'add-first-service'],
        relatedHelpContent: ['welcome-to-beautycort', 'setup-profile'],
      },
      {
        id: 'setup-profile',
        title: 'Setting Up Your Professional Profile',
        titleAr: 'إعداد ملفك الشخصي المهني',
        description: 'Step-by-step guide to create an attractive profile that customers will love.',
        descriptionAr: 'دليل خطوة بخطوة لإنشاء ملف شخصي جذاب سيعجب العملاء.',
        category: 'getting-started',
        duration: 360, // 6 minutes
        thumbnailUrl: 'https://example.com/thumbnails/profile-setup.jpg',
        videoUrl: 'https://example.com/videos/profile-setup-ar.mp4',
        subtitles: {
          ar: 'https://example.com/subtitles/profile-setup-ar.vtt',
          en: 'https://example.com/subtitles/profile-setup-en.vtt',
        },
        tags: ['profile', 'photos', 'description', 'verification'],
        tagsAr: ['ملف شخصي', 'صور', 'وصف', 'تحقق'],
        difficulty: 'beginner',
        prerequisites: ['welcome-to-beautycort'],
        viewCount: 1876,
        likes: 145,
        downloadSize: 72,
        quality: 'hd',
        isOfflineAvailable: true,
        lastUpdated: new Date().toISOString(),
        relatedVideos: ['add-photos', 'verification-process'],
      },
      {
        id: 'whatsapp-business-setup',
        title: 'WhatsApp Business Integration for Jordan Market',
        titleAr: 'تكامل واتساب بزنس للسوق الأردني',
        description: 'Essential guide to setting up WhatsApp Business for your beauty salon in Jordan.',
        descriptionAr: 'دليل أساسي لإعداد واتساب بزنس لصالون الجمال الخاص بك في الأردن.',
        category: 'customer-communication',
        duration: 420, // 7 minutes
        thumbnailUrl: 'https://example.com/thumbnails/whatsapp-setup.jpg',
        videoUrl: 'https://example.com/videos/whatsapp-setup-ar.mp4',
        subtitles: {
          ar: 'https://example.com/subtitles/whatsapp-setup-ar.vtt',
          en: 'https://example.com/subtitles/whatsapp-setup-en.vtt',
        },
        tags: ['whatsapp', 'business', 'communication', 'jordan', 'messaging'],
        tagsAr: ['واتساب', 'أعمال', 'تواصل', 'الأردن', 'مراسلة'],
        difficulty: 'beginner',
        viewCount: 3201,
        likes: 267,
        downloadSize: 84,
        quality: 'hd',
        isOfflineAvailable: true,
        lastUpdated: new Date().toISOString(),
        featured: true,
        relatedVideos: ['customer-communication', 'automated-responses'],
        relatedHelpContent: ['whatsapp-business'],
      },
      {
        id: 'service-creation-guide',
        title: 'Creating Your First Beauty Services',
        titleAr: 'إنشاء خدمات الجمال الأولى',
        description: 'Learn how to add services with proper Arabic naming, pricing strategies for Zarqa market.',
        descriptionAr: 'تعلم كيفية إضافة الخدمات مع التسمية العربية المناسبة واستراتيجيات التسعير لسوق الزرقاء.',
        category: 'service-management',
        duration: 540, // 9 minutes
        thumbnailUrl: 'https://example.com/thumbnails/service-creation.jpg',
        videoUrl: 'https://example.com/videos/service-creation-ar.mp4',
        subtitles: {
          ar: 'https://example.com/subtitles/service-creation-ar.vtt',
          en: 'https://example.com/subtitles/service-creation-en.vtt',
        },
        tags: ['services', 'pricing', 'arabic', 'zarqa', 'market'],
        tagsAr: ['خدمات', 'تسعير', 'عربي', 'الزرقاء', 'سوق'],
        difficulty: 'beginner',
        prerequisites: ['setup-profile'],
        viewCount: 2156,
        likes: 178,
        downloadSize: 108,
        quality: 'hd',
        isOfflineAvailable: true,
        lastUpdated: new Date().toISOString(),
        relatedVideos: ['pricing-strategies', 'service-photos'],
        relatedHelpContent: ['create-services', 'arabic-service-naming'],
      },
      {
        id: 'analytics-deep-dive',
        title: 'Understanding Your Business Analytics',
        titleAr: 'فهم تحليلات عملك',
        description: 'Master the analytics dashboard to grow your beauty business with data-driven decisions.',
        descriptionAr: 'أتقن لوحة التحليلات لتنمية عملك في مجال الجمال بقرارات مبنية على البيانات.',
        category: 'analytics',
        duration: 720, // 12 minutes
        thumbnailUrl: 'https://example.com/thumbnails/analytics.jpg',
        videoUrl: 'https://example.com/videos/analytics-ar.mp4',
        subtitles: {
          ar: 'https://example.com/subtitles/analytics-ar.vtt',
          en: 'https://example.com/subtitles/analytics-en.vtt',
        },
        tags: ['analytics', 'data', 'insights', 'growth', 'revenue'],
        tagsAr: ['تحليلات', 'بيانات', 'رؤى', 'نمو', 'إيرادات'],
        difficulty: 'intermediate',
        prerequisites: ['service-creation-guide'],
        viewCount: 1543,
        likes: 134,
        downloadSize: 144,
        quality: 'hd',
        isOfflineAvailable: true,
        lastUpdated: new Date().toISOString(),
        relatedVideos: ['revenue-optimization', 'customer-insights'],
      },
      {
        id: 'ramadan-business-tips',
        title: 'Maximizing Business During Ramadan',
        titleAr: 'تعظيم الأعمال خلال رمضان',
        description: 'Special strategies for beauty businesses during Ramadan in Jordan.',
        descriptionAr: 'استراتيجيات خاصة لأعمال الجمال خلال رمضان في الأردن.',
        category: 'business-growth',
        duration: 480, // 8 minutes
        thumbnailUrl: 'https://example.com/thumbnails/ramadan-tips.jpg',
        videoUrl: 'https://example.com/videos/ramadan-tips-ar.mp4',
        subtitles: {
          ar: 'https://example.com/subtitles/ramadan-tips-ar.vtt',
        },
        tags: ['ramadan', 'seasonal', 'jordan', 'marketing', 'schedule'],
        tagsAr: ['رمضان', 'موسمي', 'الأردن', 'تسويق', 'جدول'],
        difficulty: 'intermediate',
        viewCount: 987,
        likes: 89,
        downloadSize: 96,
        quality: 'hd',
        isOfflineAvailable: true,
        lastUpdated: new Date().toISOString(),
        featured: true,
        relatedVideos: ['seasonal-marketing', 'schedule-optimization'],
        relatedHelpContent: ['ramadan-schedule-tour'],
      },
    ];

    // Initialize playlists
    this.playlists = [
      {
        id: 'complete-beginner-guide',
        name: 'Complete Beginner Guide',
        nameAr: 'دليل المبتدئين الشامل',
        description: 'Everything you need to start your beauty business on BeautyCort',
        descriptionAr: 'كل ما تحتاجه لبدء عملك في مجال الجمال على بيوتي كورت',
        videoIds: ['welcome-to-beautycort', 'setup-profile', 'service-creation-guide', 'whatsapp-business-setup'],
        duration: 1800, // 30 minutes total
        thumbnailUrl: 'https://example.com/thumbnails/beginner-playlist.jpg',
        category: 'getting-started',
        difficulty: 'beginner',
        featured: true,
      },
      {
        id: 'jordan-market-mastery',
        name: 'Jordan Market Mastery',
        nameAr: 'إتقان السوق الأردني',
        description: 'Specialized content for succeeding in Jordan\'s beauty market',
        descriptionAr: 'محتوى متخصص للنجاح في سوق الجمال الأردني',
        videoIds: ['whatsapp-business-setup', 'service-creation-guide', 'ramadan-business-tips'],
        duration: 1440, // 24 minutes total
        thumbnailUrl: 'https://example.com/thumbnails/jordan-playlist.jpg',
        category: 'business-growth',
        difficulty: 'intermediate',
        featured: true,
      },
    ];
  }

  // Video retrieval methods
  public async getCategories(): Promise<VideoCategory[]> {
    return this.categories.sort((a, b) => a.order - b.order);
  }

  public async getVideosByCategory(categoryId: string): Promise<VideoTutorial[]> {
    return this.videos.filter(video => video.category === categoryId);
  }

  public async getFeaturedVideos(): Promise<VideoTutorial[]> {
    return this.videos.filter(video => video.featured).sort((a, b) => b.viewCount - a.viewCount);
  }

  public async getVideoById(videoId: string): Promise<VideoTutorial | null> {
    const video = this.videos.find(v => v.id === videoId);
    if (video) {
      // Increment view count
      video.viewCount++;
      await this.saveVideoProgress(videoId, { lastWatchedAt: new Date().toISOString() });
    }
    return video || null;
  }

  public async getPlaylists(): Promise<PlaylistInfo[]> {
    return this.playlists;
  }

  public async getPlaylistById(playlistId: string): Promise<PlaylistInfo | null> {
    return this.playlists.find(p => p.id === playlistId) || null;
  }

  public async searchVideos(query: string, language: 'ar' | 'en' = 'ar'): Promise<VideoTutorial[]> {
    const normalizedQuery = query.toLowerCase().trim();
    
    return this.videos.filter(video => {
      const title = language === 'ar' ? video.titleAr : video.title;
      const description = language === 'ar' ? video.descriptionAr : video.description;
      const tags = language === 'ar' ? video.tagsAr : video.tags;
      const transcription = video.transcription?.[language] || '';

      return title.toLowerCase().includes(normalizedQuery) ||
             description.toLowerCase().includes(normalizedQuery) ||
             tags.some(tag => tag.toLowerCase().includes(normalizedQuery)) ||
             transcription.toLowerCase().includes(normalizedQuery);
    }).sort((a, b) => b.viewCount - a.viewCount);
  }

  // Video progress tracking
  public async getVideoProgress(userId: string, videoId: string): Promise<VideoProgress | null> {
    try {
      const key = `video_progress_${userId}_${videoId}`;
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading video progress:', error);
      return null;
    }
  }

  public async saveVideoProgress(videoId: string, progress: Partial<VideoProgress>): Promise<void> {
    try {
      const userId = 'current-user'; // Would get from auth context
      const key = `video_progress_${userId}_${videoId}`;
      const existing = await this.getVideoProgress(userId, videoId);
      
      const updatedProgress: VideoProgress = {
        videoId,
        watchedDuration: 0,
        completed: false,
        lastWatchedAt: new Date().toISOString(),
        bookmarks: [],
        playbackSpeed: 1.0,
        quality: 'hd',
        ...existing,
        ...progress,
      };

      await AsyncStorage.setItem(key, JSON.stringify(updatedProgress));
    } catch (error) {
      console.error('Error saving video progress:', error);
    }
  }

  public async addBookmark(videoId: string, timestamp: number): Promise<void> {
    const userId = 'current-user';
    const progress = await this.getVideoProgress(userId, videoId);
    
    if (progress) {
      const bookmarks = [...(progress.bookmarks || []), timestamp];
      await this.saveVideoProgress(videoId, { bookmarks: bookmarks.sort((a, b) => a - b) });
    }
  }

  public async removeBookmark(videoId: string, timestamp: number): Promise<void> {
    const userId = 'current-user';
    const progress = await this.getVideoProgress(userId, videoId);
    
    if (progress) {
      const bookmarks = (progress.bookmarks || []).filter(t => Math.abs(t - timestamp) > 5);
      await this.saveVideoProgress(videoId, { bookmarks });
    }
  }

  // Offline download functionality
  public async isVideoDownloaded(videoId: string): Promise<boolean> {
    try {
      const filePath = await this.getVideoFilePath(videoId);
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      return fileInfo.exists;
    } catch (error) {
      return false;
    }
  }

  public async getDownloadProgress(videoId: string): Promise<DownloadProgress | null> {
    return this.downloadQueue.find(d => d.videoId === videoId) || null;
  }

  public async downloadVideo(videoId: string, quality: 'sd' | 'hd' = 'sd'): Promise<boolean> {
    const video = await this.getVideoById(videoId);
    if (!video || !video.isOfflineAvailable) return false;

    const existingDownload = await this.getDownloadProgress(videoId);
    if (existingDownload && existingDownload.status === 'downloading') {
      return false; // Already downloading
    }

    const downloadProgress: DownloadProgress = {
      videoId,
      progress: 0,
      status: 'queued',
      downloadedBytes: 0,
      totalBytes: 0,
      startedAt: new Date().toISOString(),
    };

    this.downloadQueue.push(downloadProgress);
    this.notifyDownloadProgress(downloadProgress);

    try {
      const filePath = await this.getVideoFilePath(videoId, quality);
      const videoUrl = this.getVideoUrlForQuality(video, quality);

      downloadProgress.status = 'downloading';
      this.notifyDownloadProgress(downloadProgress);

      const downloadResumable = FileSystem.createDownloadResumable(
        videoUrl,
        filePath,
        {},
        (downloadProgressUpdate) => {
          const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgressUpdate;
          downloadProgress.downloadedBytes = totalBytesWritten;
          downloadProgress.totalBytes = totalBytesExpectedToWrite;
          downloadProgress.progress = Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100);
          this.notifyDownloadProgress(downloadProgress);
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result && result.status === 200) {
        downloadProgress.status = 'completed';
        downloadProgress.completedAt = new Date().toISOString();
        downloadProgress.progress = 100;
        
        // Download subtitles if available
        if (video.subtitles) {
          await this.downloadSubtitles(videoId, video.subtitles);
        }
        
        this.notifyDownloadProgress(downloadProgress);
        return true;
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Video download error:', error);
      downloadProgress.status = 'failed';
      downloadProgress.error = error.message;
      this.notifyDownloadProgress(downloadProgress);
      return false;
    }
  }

  public async deleteDownloadedVideo(videoId: string): Promise<boolean> {
    try {
      const filePath = await this.getVideoFilePath(videoId);
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }

      // Remove from download queue
      this.downloadQueue = this.downloadQueue.filter(d => d.videoId !== videoId);
      
      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    }
  }

  public async getDownloadedVideos(): Promise<VideoTutorial[]> {
    const downloadedVideos: VideoTutorial[] = [];
    
    for (const video of this.videos) {
      if (await this.isVideoDownloaded(video.id)) {
        downloadedVideos.push(video);
      }
    }
    
    return downloadedVideos;
  }

  public async getTotalDownloadSize(): Promise<number> {
    let totalSize = 0;
    
    for (const video of this.videos) {
      if (await this.isVideoDownloaded(video.id)) {
        totalSize += video.downloadSize || 0;
      }
    }
    
    return totalSize;
  }

  // Utility methods
  private async getVideoFilePath(videoId: string, quality: 'sd' | 'hd' = 'hd'): Promise<string> {
    const documentsDir = FileSystem.documentDirectory;
    const videosDir = `${documentsDir}videos/`;
    
    // Ensure videos directory exists
    const dirInfo = await FileSystem.getInfoAsync(videosDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(videosDir, { intermediates: true });
    }
    
    return `${videosDir}${videoId}_${quality}.mp4`;
  }

  private getVideoUrlForQuality(video: VideoTutorial, quality: 'sd' | 'hd'): string {
    // In a real implementation, this would return different URLs for different qualities
    return video.videoUrl.replace('.mp4', `_${quality}.mp4`);
  }

  private async downloadSubtitles(videoId: string, subtitles: VideoTutorial['subtitles']): Promise<void> {
    if (!subtitles) return;

    try {
      const videosDir = `${FileSystem.documentDirectory}videos/`;
      
      for (const [lang, url] of Object.entries(subtitles)) {
        if (url) {
          const subtitlePath = `${videosDir}${videoId}_${lang}.vtt`;
          await FileSystem.downloadAsync(url, subtitlePath);
        }
      }
    } catch (error) {
      console.error('Error downloading subtitles:', error);
    }
  }

  // Download listeners
  public onDownloadProgress(listener: (progress: DownloadProgress) => void): () => void {
    this.downloadListeners.push(listener);
    return () => {
      this.downloadListeners = this.downloadListeners.filter(l => l !== listener);
    };
  }

  private notifyDownloadProgress(progress: DownloadProgress): void {
    this.downloadListeners.forEach(listener => listener(progress));
  }

  // Video recommendations
  public async getRecommendedVideos(userId: string, limit: number = 5): Promise<VideoTutorial[]> {
    // Simple recommendation based on view history and popular content
    // In a real implementation, this would use more sophisticated algorithms
    
    const popularVideos = this.videos
      .filter(video => video.viewCount > 1000)
      .sort((a, b) => b.viewCount - a.viewCount);
    
    const recentVideos = this.videos
      .filter(video => {
        const daysSinceUpdate = (Date.now() - new Date(video.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate <= 30; // Videos updated in last 30 days
      })
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

    // Combine and deduplicate
    const recommended = [...popularVideos.slice(0, 3), ...recentVideos.slice(0, 2)];
    const uniqueRecommended = recommended.filter((video, index, arr) => 
      arr.findIndex(v => v.id === video.id) === index
    );

    return uniqueRecommended.slice(0, limit);
  }

  // Analytics
  public async getVideoAnalytics(videoId: string): Promise<any> {
    const video = await this.getVideoById(videoId);
    if (!video) return null;

    return {
      viewCount: video.viewCount,
      likes: video.likes,
      averageWatchTime: video.duration * 0.7, // Mock average watch time
      completionRate: 0.65, // Mock completion rate
      downloadCount: Math.floor(video.viewCount * 0.3), // Mock download count
    };
  }
}

export default VideoService;