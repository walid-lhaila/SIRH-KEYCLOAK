import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }

    // Extract user from RPC context
    const rpcContext = context.switchToRpc();
    const user = rpcContext.getContext()?.user;

    if (!user || !user.roles) {
      return false; // No user or roles, deny access
    }

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
