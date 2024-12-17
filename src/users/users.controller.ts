import {
  Body,
  Controller,
  UseGuards,
  UnauthorizedException,
  InternalServerErrorException,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Users } from './entity/users.entity';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CustomAuthGuard } from '../auth/custom-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern({ cmd: 'createHR' })
  @UseGuards(CustomAuthGuard, RolesGuard)
  @Roles('Administrator')
  createUsers(@Payload() data: any): Promise<Users> {
    return this.usersService.createUsers(data.payload);
  }

  @MessagePattern({ cmd: 'deleteHR' })
  @UseGuards(CustomAuthGuard, RolesGuard)
  @Roles('Administrator')
  async deleteUsers(
    data: {email: string }
  ): Promise<{ message: string }> {
    const { email } = data;
    return this.usersService.deleteUsers(email);
  }

  @MessagePattern({ cmd: 'login' })
  async login(@Body() body: { username: string; password: string }) {
    const { username, password } = body;
    if (!username || !password) {
      throw new UnauthorizedException('Username and password are required');
    }
    try {
      const result = await this.usersService.login(username, password);
      return {
        access_token: result.access_token,
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role,
        },
      };
    } catch (error) {
      console.error('Login error in controller:', error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}
