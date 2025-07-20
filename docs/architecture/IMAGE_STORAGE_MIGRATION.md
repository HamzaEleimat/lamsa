# Image Storage Migration Guide

## Overview

We've migrated from storing images as base64 strings in the database to using Supabase Storage with pre-signed URLs. This provides better performance, scalability, and cost efficiency.

## Architecture Changes

### Before (Base64 Storage)
- Images stored as base64 strings in database columns
- Large database size and slow queries
- 10MB request body limit required
- Poor caching and CDN support

### After (Object Storage)
- Images stored in Supabase Storage buckets
- Only URLs stored in database
- Direct client uploads with pre-signed URLs
- Efficient CDN delivery and caching

## Implementation Details

### 1. Storage Service (`image-storage.service.ts`)
- Generates pre-signed URLs for client uploads
- Validates uploaded images
- Manages image lifecycle (delete, copy)
- Supports thumbnail generation

### 2. API Endpoints
- `POST /api/images/upload-url` - Generate pre-signed upload URL
- `POST /api/images/confirm-upload` - Validate uploaded image
- `DELETE /api/images/:bucket/:key` - Delete image
- `POST /api/images/thumbnail` - Generate thumbnail URL

### 3. Storage Buckets
- `avatars` - User and provider profile pictures
- `services` - Service showcase images
- `reviews` - Review photos
- `certificates` - Provider certificates and licenses

## Migration Process

### 1. Setup Storage Buckets
```bash
# Run in Supabase SQL Editor
psql $DATABASE_URL -f database/setup-storage-buckets.sql
```

### 2. Run Migration Script
```bash
cd lamsa-api
npm run migrate:images
```

The migration script:
- Creates backups of existing base64 data
- Uploads images to appropriate buckets
- Updates database URLs
- Tracks migration progress and errors

### 3. Client Implementation

#### Mobile App (React Native)
```typescript
// 1. Request upload URL
const { data } = await api.post('/api/images/upload-url', {
  fileName: 'profile.jpg',
  bucket: 'avatars'
});

// 2. Upload file directly
const response = await fetch(data.uploadUrl, {
  method: 'PUT',
  body: imageFile,
  headers: {
    'Content-Type': 'image/jpeg'
  }
});

// 3. Confirm upload
await api.post('/api/images/confirm-upload', {
  bucket: 'avatars',
  key: data.key
});

// 4. Use the public URL
const imageUrl = data.publicUrl;
```

#### Web Dashboard (Next.js)
```typescript
// Similar process with FormData or File API
```

## Benefits

### Performance
- Reduced API request size from 10MB to 1MB
- Faster database queries (no large BLOB fields)
- CDN caching for images
- Parallel uploads support

### Scalability
- Unlimited storage capacity
- No database bloat
- Horizontal scaling enabled
- Better backup/restore performance

### Cost
- Cheaper storage (object storage vs database)
- Reduced bandwidth costs
- Efficient CDN delivery

## Security Considerations

1. **Pre-signed URLs**
   - 5-minute expiration
   - User-specific paths (userId in key)
   - Bucket-specific permissions

2. **Validation**
   - File type validation (jpg, png, webp)
   - Size limits (5MB default, 10MB for certificates)
   - Post-upload verification

3. **Access Control**
   - Users can only modify their own images
   - Public read access for all images
   - RLS policies enforce ownership

## Rollback Plan

If issues arise:
1. Backups are stored in `backups/image-migration-{timestamp}/`
2. Restore script available (TODO: implement)
3. Keep base64 columns for 30 days before dropping

## Monitoring

Track:
- Upload success rates
- Storage usage per bucket
- Failed upload attempts
- Migration completion status

## Next Steps

1. Update mobile app to use new upload flow
2. Update web dashboard image handling
3. Set up CDN for image delivery
4. Implement image optimization (resize, compress)
5. Add image moderation service