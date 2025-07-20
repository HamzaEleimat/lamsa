import { Router } from 'express';
import { enhancedProviderController } from '../controllers/enhanced-provider.controller';
import { authenticate } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Public routes
router.get('/slug/:slug', enhancedProviderController.getProviderBySlug);
router.get('/:id/enhanced', enhancedProviderController.getEnhancedProviderProfile);

// Protected routes (require authentication)
router.use(authenticate);

// Provider profile management
router.put('/:id/profile', enhancedProviderController.updateProviderProfile);
router.put('/:id/working-hours', enhancedProviderController.updateWorkingHours);

// Service categories
router.post('/:id/categories', enhancedProviderController.addServiceCategory);

// Gallery management
router.post('/:id/gallery', upload.single('image'), enhancedProviderController.uploadGalleryImage);

// Analytics
router.get('/:id/analytics', enhancedProviderController.getProviderAnalytics);

export default router;
