/**
 * @swagger
 * components:
 *   schemas:
 *     CreateBookingRequest:
 *       type: object
 *       required:
 *         - providerId
 *         - serviceId
 *         - bookingDate
 *         - startTime
 *         - customerPhone
 *       properties:
 *         providerId:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         serviceId:
 *           type: string
 *           format: uuid
 *         bookingDate:
 *           type: string
 *           format: date
 *           example: "2024-08-15"
 *         startTime:
 *           type: string
 *           format: time
 *           example: "14:30"
 *         customerPhone:
 *           type: string
 *           pattern: ^(\+962|962|07|7)[0-9]{8,9}$
 *         notes:
 *           type: string
 *           maxLength: 500
 *     
 *     BookingResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         customerId:
 *           type: string
 *         providerId:
 *           type: string
 *         serviceId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, no_show]
 *         bookingDate:
 *           type: string
 *           format: date
 *         startTime:
 *           type: string
 *         endTime:
 *           type: string
 *         totalAmount:
 *           type: number
 *         platformFee:
 *           type: number
 *         providerEarnings:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     BookingFilters:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, no_show]
 *         providerId:
 *           type: string
 *         customerId:
 *           type: string
 *         fromDate:
 *           type: string
 *           format: date
 *         toDate:
 *           type: string
 *           format: date
 *         page:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 * 
 * @swagger
 * tags:
 *   - name: Bookings
 *     description: Booking management endpoints
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookingRequest'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 booking:
 *                   $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         description: Validation error or slot not available
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get bookings with filters
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, no_show]
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BookingResponse'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 booking:
 *                   $ref: '#/components/schemas/BookingResponse'
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/bookings/{id}/confirm:
 *   patch:
 *     summary: Confirm a pending booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking confirmed
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       400:
 *         description: Cannot cancel this booking
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/bookings/{id}/complete:
 *   patch:
 *     summary: Mark booking as completed
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking completed
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/bookings/{id}/reschedule:
 *   patch:
 *     summary: Reschedule a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newDate
 *               - newStartTime
 *             properties:
 *               newDate:
 *                 type: string
 *                 format: date
 *               newStartTime:
 *                 type: string
 *                 format: time
 *     responses:
 *       200:
 *         description: Booking rescheduled
 *       400:
 *         description: Invalid date/time or slot not available
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/bookings/check-availability:
 *   post:
 *     summary: Check booking slot availability
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - serviceId
 *               - date
 *               - startTime
 *             properties:
 *               providerId:
 *                 type: string
 *               serviceId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 format: time
 *     responses:
 *       200:
 *         description: Availability check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 conflictingBookings:
 *                   type: array
 *                   items:
 *                     type: string
 */

export {}; // Make this a module