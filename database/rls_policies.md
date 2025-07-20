# RLS Policies for Lamsa Database

## Instructions
Create these policies in Supabase Dashboard under Authentication > Policies

## Users Table Policies

1. **Policy Name**: Users can view their own profile
   - **Operation**: SELECT
   - **Expression**: `auth.uid()::text = id::text`

2. **Policy Name**: Users can update their own profile
   - **Operation**: UPDATE
   - **Expression**: `auth.uid()::text = id::text`

3. **Policy Name**: Users can insert their own profile
   - **Operation**: INSERT
   - **Check Expression**: `auth.uid()::text = id::text`

## Providers Table Policies

1. **Policy Name**: Anyone can view active verified providers
   - **Operation**: SELECT
   - **Expression**: `verified = TRUE AND active = TRUE`

2. **Policy Name**: Providers can view their own profile
   - **Operation**: SELECT
   - **Expression**: `auth.uid()::text = id::text`

3. **Policy Name**: Providers can update their own profile
   - **Operation**: UPDATE
   - **Expression**: `auth.uid()::text = id::text`

## Service Categories Table Policies

1. **Policy Name**: Anyone can view service categories
   - **Operation**: SELECT
   - **Expression**: `true`

## Services Table Policies

1. **Policy Name**: Anyone can view active services
   - **Operation**: SELECT
   - **Expression**: `active = TRUE`

2. **Policy Name**: Providers can manage their own services
   - **Operation**: ALL
   - **Expression**: `provider_id::text = auth.uid()::text`

## Provider Availability Table Policies

1. **Policy Name**: Anyone can view provider availability
   - **Operation**: SELECT
   - **Expression**: `true`

2. **Policy Name**: Providers can manage their own availability
   - **Operation**: ALL
   - **Expression**: `provider_id::text = auth.uid()::text`

## Bookings Table Policies

1. **Policy Name**: Users can view their own bookings
   - **Operation**: SELECT
   - **Expression**: `user_id::text = auth.uid()::text OR provider_id::text = auth.uid()::text`

2. **Policy Name**: Users can create bookings
   - **Operation**: INSERT
   - **Check Expression**: `user_id::text = auth.uid()::text`

3. **Policy Name**: Users and providers can update their bookings
   - **Operation**: UPDATE
   - **Expression**: `user_id::text = auth.uid()::text OR provider_id::text = auth.uid()::text`

## Notes
- RLS is already enabled on all tables via the SQL script
- These policies ensure users can only access their own data
- Providers have additional permissions to manage their services and availability
- Public data (categories, active services, verified providers) is viewable by everyone