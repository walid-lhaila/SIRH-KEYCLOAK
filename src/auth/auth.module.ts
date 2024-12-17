import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { KeycloakStrategy } from './keycloak.strategy';
import { CustomAuthGuard } from './custom-auth.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'keycloak' })],
  providers: [KeycloakStrategy, CustomAuthGuard],
  exports: [PassportModule, CustomAuthGuard, KeycloakStrategy],
})
export class AuthModule {}