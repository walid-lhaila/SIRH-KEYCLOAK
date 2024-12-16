import { Body, Controller, Post, UseGuards, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Users } from './entity/users.entity';
import { UsersDto } from './dto/users.dto';




@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  @UseGuards(AuthGuard('keycloak'), RolesGuard)
  @Roles('Administrator')
  createUsers(@Body() userDto: UsersDto): Promise<Users> {
    return this.usersService.createUsers(userDto);
  }

  @Post('login')
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
