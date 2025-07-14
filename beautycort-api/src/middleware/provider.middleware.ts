import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError } from './error.middleware';
import { supabase } from '../config/supabase-simple';

// Middleware to validate provider access
export const validateProvider = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestedProviderId = req.params.providerId;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      throw new AppError('User not authenticated', 401);
    }

    // If no specific provider ID is requested, use the current user's ID
    if (!requestedProviderId) {
      // Verify the current user is a provider
      const { data: provider, error } = await supabase
        .from('providers')
        .select('id, business_name, verified, active')
        .eq('id', currentUserId)
        .single();

      if (error || !provider) {
        throw new AppError('Provider not found', 404);
      }

      if (!provider.verified) {
        throw new AppError('Provider account not verified', 403);
      }

      if (!provider.active) {
        throw new AppError('Provider account is inactive', 403);
      }

      // Set the provider ID in the request for downstream use
      req.params.providerId = currentUserId;
      next();
      return;
    }

    // If a specific provider ID is requested, verify access rights
    if (requestedProviderId !== currentUserId) {
      // Check if current user has admin rights or is a team member
      // For now, we'll only allow providers to access their own data
      throw new AppError('Access denied: You can only access your own provider data', 403);
    }

    // Verify the requested provider exists and is active
    const { data: provider, error } = await supabase
      .from('providers')
      .select('id, business_name, verified, active')
      .eq('id', requestedProviderId)
      .single();

    if (error || !provider) {
      throw new AppError('Provider not found', 404);
    }

    if (!provider.verified) {
      throw new AppError('Provider account not verified', 403);
    }

    if (!provider.active) {
      throw new AppError('Provider account is inactive', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check if user is a provider
export const requireProvider = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { data: provider, error } = await supabase
      .from('providers')
      .select('id')
      .eq('id', userId)
      .single();

    if (error || !provider) {
      throw new AppError('Access denied: Provider account required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to validate provider ownership of a resource
export const validateProviderResource = (resourceIdParam: string = 'id') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resourceId = req.params[resourceIdParam];
      const providerId = req.user?.id;

      if (!providerId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!resourceId) {
        throw new AppError('Resource ID is required', 400);
      }

      // This would need to be customized based on the resource type
      // For example, checking if a service belongs to the provider
      // For now, we'll skip this validation and let it be handled by the controllers

      next();
    } catch (error) {
      next(error);
    }
  };
};