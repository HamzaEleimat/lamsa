/**
 * @swagger
 * components:
 *   schemas:
 *     CustomerSignupRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - phone
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: "Ahmed Al-Zahra"
 *         email:
 *           type: string
 *           format: email
 *           example: "ahmed@example.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           pattern: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)
 *           example: "SecurePass123"
 *         phone:
 *           type: string
 *           pattern: ^(\+962|962|07|7)[0-9]{8,9}$
 *           example: "+962799999999"
 *     
 *     OTPRequest:
 *       type: object
 *       required:
 *         - phone
 *       properties:
 *         phone:
 *           type: string
 *           pattern: ^(\+962|962|07|7)[0-9]{8,9}$
 *           example: "+962799999999"
 *     
 *     OTPVerifyRequest:
 *       type: object
 *       required:
 *         - phone
 *         - otp
 *       properties:
 *         phone:
 *           type: string
 *           pattern: ^(\+962|962|07|7)[0-9]{8,9}$
 *           example: "+962799999999"
 *         otp:
 *           type: string
 *           pattern: ^[0-9]{6}$
 *           example: "123456"
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           example: "SecurePass123"
 *     
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             email:
 *               type: string
 *             name:
 *               type: string
 *             phone:
 *               type: string
 *             role:
 *               type: string
 *               enum: [customer, provider, admin]
 *         token:
 *           type: string
 *         refreshToken:
 *           type: string
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *         message:
 *           type: string
 *         messageAr:
 *           type: string
 *         code:
 *           type: string
 * 
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: Authentication endpoints for customers and providers
 *   - name: Customer Auth
 *     description: Customer authentication endpoints
 *   - name: Provider Auth
 *     description: Provider authentication endpoints
 */

/**
 * @swagger
 * /api/auth/customer/signup:
 *   post:
 *     summary: Register a new customer account
 *     tags: [Customer Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerSignupRequest'
 *     responses:
 *       201:
 *         description: Customer successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests
 */

/**
 * @swagger
 * /api/auth/customer/send-otp:
 *   post:
 *     summary: Send OTP to customer phone
 *     tags: [Customer Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "OTP sent successfully"
 *                 expiresIn:
 *                   type: number
 *                   example: 600
 *       400:
 *         description: Invalid phone number
 *       429:
 *         description: Too many OTP requests
 */

/**
 * @swagger
 * /api/auth/customer/verify-otp:
 *   post:
 *     summary: Verify OTP and create/login customer
 *     tags: [Customer Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPVerifyRequest'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid or expired OTP
 *       429:
 *         description: Too many verification attempts
 */

/**
 * @swagger
 * /api/auth/customer/login:
 *   post:
 *     summary: Login customer with email and password
 *     tags: [Customer Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */

/**
 * @swagger
 * /api/auth/provider/signup:
 *   post:
 *     summary: Register a new provider account
 *     tags: [Provider Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - email
 *               - password
 *               - phone
 *               - businessType
 *             properties:
 *               businessName:
 *                 type: string
 *                 example: "Beauty Salon Amman"
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               phone:
 *                 type: string
 *               businessType:
 *                 type: string
 *                 enum: [salon, spa, home_service, freelancer]
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       201:
 *         description: Provider successfully registered
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/auth/provider/login:
 *   post:
 *     summary: Login provider with email and password
 *     tags: [Provider Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh authentication token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid refresh token
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and invalidate tokens
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */

export {}; // Make this a module