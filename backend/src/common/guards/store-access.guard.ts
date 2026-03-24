import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../database/entities/user.entity';

@Injectable()
export class StoreAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requestedStoreId =
      request.params.storeId ||
      request.params.id ||
      request.body?.store_id ||
      request.query?.store_id;

    if (!user) return false;
    if (user.role === UserRole.MANAGER) return true;
    if (user.role === UserRole.STORE_WORKER) {
      if (!user.storeId) {
        throw new ForbiddenException('Store worker must be assigned to a store');
      }
      if (requestedStoreId && requestedStoreId !== user.storeId) {
        throw new ForbiddenException('Access denied to other stores');
      }
      if (!requestedStoreId && request.method === 'GET') {
        request.query = request.query || {};
        request.query.store_id = user.storeId;
      }
      return true;
    }
    return false;
  }
}
