/**
 * Image Routes
 * Handles image upload operations
 */

import { Router } from 'express';
import { imageController } from '../controllers/image.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, param } from 'express-validator';

const router = Router();

// All image routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/images/upload-url:
 *   post:
 *     summary: Generate pre-signed URL for image upload
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - bucket
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: "profile.jpg"
 *               bucket:
 *                 type: string
 *                 enum: [avatars, services, reviews, certificates]
 *               maxSizeInMB:
 *                 type: number
 *                 default: 5
 *     responses:
 *       200:
 *         description: Upload URL generated successfully
 */
router.post(
  '/upload-url',
  [
    body('fileName').notEmpty().withMessage('File name is required'),
    body('bucket').notEmpty().isIn(['avatars', 'services', 'reviews', 'certificates']),
    body('maxSizeInMB').optional().isInt({ min: 1, max: 10 })
  ],
  validateRequest,
  imageController.generateUploadUrl
);

/**
 * @swagger
 * /api/images/confirm-upload:
 *   post:
 *     summary: Confirm and validate uploaded image
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bucket
 *               - key
 *             properties:
 *               bucket:
 *                 type: string
 *               key:
 *                 type: string
 *     responses:
 *       200:
 *         description: Image upload confirmed
 */
router.post(
  '/confirm-upload',
  [
    body('bucket').notEmpty(),
    body('key').notEmpty()
  ],
  validateRequest,
  imageController.confirmUpload
);

/**
 * @swagger
 * /api/images/{bucket}/{key}:
 *   delete:
 *     summary: Delete an image
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucket
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image deleted successfully
 */
router.delete(
  '/:bucket/:key(*)',
  [
    param('bucket').notEmpty(),
    param('key').notEmpty()
  ],
  validateRequest,
  imageController.deleteImage
);

/**
 * @swagger
 * /api/images/thumbnail:
 *   post:
 *     summary: Generate thumbnail URL
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *               width:
 *                 type: number
 *                 default: 200
 *               height:
 *                 type: number
 *                 default: 200
 *     responses:
 *       200:
 *         description: Thumbnail URL generated
 */
router.post(
  '/thumbnail',
  [
    body('imageUrl').notEmpty().isURL(),
    body('width').optional().isInt({ min: 50, max: 1000 }),
    body('height').optional().isInt({ min: 50, max: 1000 })
  ],
  validateRequest,
  imageController.generateThumbnail
);

export default router;