import { Router } from 'express';
import { body } from 'express-validator';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get profile
router.get('/profile', userController.getProfile);

// Update profile
router.put(
  '/profile',
  validate([
    body('name').optional().notEmpty().trim(),
    body('phone').optional().isMobilePhone('any'),
    body('address').optional().isObject(),
  ]),
  userController.updateProfile
);

// Change password
router.put(
  '/password',
  validate([
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ]),
  userController.changePassword
);

// Delete account
router.delete('/account', userController.deleteAccount);

// Upload avatar
router.post('/avatar', userController.uploadAvatar);

// Favorites
router.get('/favorites', userController.getFavorites);
router.post(
  '/favorites',
  validate([
    body('providerId').notEmpty(),
  ]),
  userController.addFavorite
);
router.delete('/favorites/:providerId', userController.removeFavorite);

export default router;