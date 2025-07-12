/**
 * Swagger/OpenAPI Configuration for BeautyCort API
 * Auto-generates interactive API documentation from JSDoc comments
 */

const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BeautyCort API',
      version: '1.0.0',
      description: `
# BeautyCort API Documentation

A comprehensive beauty booking platform for the Jordan market featuring:

- **Dual Authentication**: Phone-based OTP for customers, email/password for providers
- **Geolocation Services**: PostGIS-powered proximity searches and mobile service support
- **Multi-language Support**: Arabic (RTL) and English localization
- **Loyalty Program**: Points-based system with tier management
- **Payment Integration**: Tap Gateway integration for JOD transactions
- **Real-time Booking**: Live availability and booking management

## Authentication

This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## Phone Number Format

All phone numbers must be in Jordan format:
- International: +962XXXXXXXXX
- Local formats (0791234567, 791234567) are automatically converted

## Response Format

All API responses follow this standard format:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "pagination": { ... } // For paginated endpoints
}
\`\`\`

Error responses:
\`\`\`json
{
  "success": false,
  "error": "Error message",
  "details": { ... } // Optional error details
}
\`\`\`
      `,
      contact: {
        name: 'BeautyCort API Support',
        email: 'api@beautycort.com',
        url: 'https://docs.beautycort.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.beautycort.com/api',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.beautycort.com/api',
        description: 'Staging server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from authentication endpoints'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier'
            },
            phone: {
              type: 'string',
              pattern: '^\\+962[0-9]{9}$',
              description: 'Jordan mobile number in international format',
              example: '+962791234567'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'User full name',
              example: 'أحمد محمد'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address (optional)',
              example: 'ahmad@example.com'
            },
            preferred_language: {
              type: 'string',
              enum: ['ar', 'en'],
              description: 'User interface language preference',
              example: 'ar'
            },
            active: {
              type: 'boolean',
              description: 'User account status'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          },
          required: ['id', 'phone', 'name']
        },
        Provider: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique provider identifier'
            },
            business_name: {
              type: 'string',
              description: 'Business name in English',
              example: 'Beauty Salon'
            },
            business_name_ar: {
              type: 'string',
              description: 'Business name in Arabic',
              example: 'صالون الجمال'
            },
            owner_name: {
              type: 'string',
              description: 'Business owner name',
              example: 'فاطمة أحمد'
            },
            phone: {
              type: 'string',
              pattern: '^\\+962[0-9]{9}$',
              description: 'Provider contact number',
              example: '+962791234567'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Provider email for login',
              example: 'salon@example.com'
            },
            location: {
              type: 'object',
              properties: {
                latitude: {
                  type: 'number',
                  minimum: -90,
                  maximum: 90,
                  description: 'Geographic latitude'
                },
                longitude: {
                  type: 'number',
                  minimum: -180,
                  maximum: 180,
                  description: 'Geographic longitude'
                }
              },
              description: 'Provider geographic location'
            },
            address: {
              type: 'string',
              description: 'Provider physical address'
            },
            rating: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              description: 'Average provider rating',
              example: 4.7
            },
            total_reviews: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of reviews'
            },
            is_mobile: {
              type: 'boolean',
              description: 'Offers mobile/home services'
            },
            travel_radius_km: {
              type: 'integer',
              minimum: 1,
              description: 'Service radius for mobile providers (km)'
            },
            verified: {
              type: 'boolean',
              description: 'Provider verification status'
            },
            active: {
              type: 'boolean',
              description: 'Provider account status'
            }
          },
          required: ['id', 'business_name', 'business_name_ar', 'owner_name', 'phone', 'email', 'location']
        },
        Service: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique service identifier'
            },
            provider_id: {
              type: 'string',
              format: 'uuid',
              description: 'Provider offering this service'
            },
            category_id: {
              type: 'string',
              format: 'uuid',
              description: 'Service category'
            },
            name_en: {
              type: 'string',
              description: 'Service name in English',
              example: 'Hair Cut & Styling'
            },
            name_ar: {
              type: 'string',
              description: 'Service name in Arabic',
              example: 'قص وتصفيف الشعر'
            },
            description_en: {
              type: 'string',
              description: 'Service description in English'
            },
            description_ar: {
              type: 'string',
              description: 'Service description in Arabic'
            },
            price: {
              type: 'number',
              minimum: 1,
              maximum: 10000,
              description: 'Service price in JOD',
              example: 25.00
            },
            duration_minutes: {
              type: 'integer',
              minimum: 15,
              maximum: 480,
              description: 'Service duration in minutes',
              example: 60
            },
            active: {
              type: 'boolean',
              description: 'Service availability status'
            }
          },
          required: ['id', 'provider_id', 'category_id', 'name_en', 'name_ar', 'price', 'duration_minutes']
        },
        Booking: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique booking identifier'
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'Customer who made the booking'
            },
            provider_id: {
              type: 'string',
              format: 'uuid',
              description: 'Provider for this booking'
            },
            service_id: {
              type: 'string',
              format: 'uuid',
              description: 'Booked service'
            },
            booking_date: {
              type: 'string',
              format: 'date',
              description: 'Date of the service',
              example: '2024-01-15'
            },
            start_time: {
              type: 'string',
              pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Service start time',
              example: '14:00'
            },
            end_time: {
              type: 'string',
              pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Service end time',
              example: '15:00'
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'refunded'],
              description: 'Current booking status'
            },
            total_price: {
              type: 'number',
              minimum: 0,
              description: 'Final price after discounts in JOD'
            },
            original_price: {
              type: 'number',
              minimum: 0,
              description: 'Original service price in JOD'
            },
            discount_amount: {
              type: 'number',
              minimum: 0,
              description: 'Total discount applied in JOD'
            },
            platform_fee: {
              type: 'number',
              minimum: 0,
              description: 'Platform commission in JOD'
            },
            payment_method: {
              type: 'string',
              enum: ['cash', 'card', 'tap_gateway', 'wallet', 'loyalty_points'],
              description: 'Payment method used'
            },
            payment_status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
              description: 'Payment processing status'
            },
            location_type: {
              type: 'string',
              enum: ['salon', 'customer', 'event'],
              description: 'Service location type'
            },
            user_notes: {
              type: 'string',
              description: 'Customer notes for the provider'
            }
          },
          required: ['id', 'user_id', 'provider_id', 'service_id', 'booking_date', 'start_time', 'end_time', 'status', 'total_price']
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Validation failed'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          },
          required: ['success', 'error']
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            message: {
              type: 'string',
              description: 'Success message'
            }
          },
          required: ['success']
        },
        PaginatedResponse: {
          type: 'object',
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                pagination: {
                  type: 'object',
                  properties: {
                    page: {
                      type: 'integer',
                      minimum: 1,
                      description: 'Current page number'
                    },
                    limit: {
                      type: 'integer',
                      minimum: 1,
                      description: 'Items per page'
                    },
                    total: {
                      type: 'integer',
                      minimum: 0,
                      description: 'Total number of items'
                    },
                    totalPages: {
                      type: 'integer',
                      minimum: 0,
                      description: 'Total number of pages'
                    }
                  },
                  required: ['page', 'limit', 'total', 'totalPages']
                }
              }
            }
          ]
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Authentication token missing or invalid'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Insufficient permissions for this operation'
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Validation failed',
                details: {
                  phone: 'Phone number must be in Jordan format (+962XXXXXXXXX)'
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Resource not found'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Internal server error'
              }
            }
          }
        }
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination (starts from 1)',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        LanguageParam: {
          name: 'Accept-Language',
          in: 'header',
          description: 'Preferred language for response content',
          required: false,
          schema: {
            type: 'string',
            enum: ['ar', 'en'],
            default: 'ar'
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User and provider authentication operations'
      },
      {
        name: 'Users',
        description: 'Customer account management'
      },
      {
        name: 'Providers',
        description: 'Service provider operations'
      },
      {
        name: 'Services',
        description: 'Service catalog management'
      },
      {
        name: 'Bookings',
        description: 'Booking lifecycle management'
      },
      {
        name: 'Payments',
        description: 'Payment processing and settlements'
      },
      {
        name: 'Reviews',
        description: 'Review and rating system'
      },
      {
        name: 'Search',
        description: 'Provider and service discovery'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './docs/api/endpoints/*.md'
  ]
};

module.exports = {
  swaggerOptions,
  swaggerSpec: swaggerJsdoc(swaggerOptions)
};
