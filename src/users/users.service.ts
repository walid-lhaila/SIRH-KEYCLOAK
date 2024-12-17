import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './entity/users.entity';
import { Repository } from 'typeorm';
import { UsersDto } from './dto/users.dto';
import * as bcrypt from 'bcrypt';
import * as process from 'node:process';
import axios from 'axios';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users) private usersRepository: Repository<Users>,
  ) {}

  async createUsers(userDto: UsersDto): Promise<Users> {
    const hashedPassword = await bcrypt.hash(userDto.password, 10);
    const user = this.usersRepository.create({
      ...userDto,
      password: hashedPassword,
      role: 'HR',
    });

    try {
      await this.createUsersInKeycloak(userDto);

      return await this.usersRepository.save(user);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new HttpException(
        'Failed To Create User',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async createUsersInKeycloak(userDto: UsersDto): Promise<void> {
    const keycloakUrl = process.env.KEYCLOAK_URL;
    const realm = process.env.KEYCLOAK_REALM;
    const clientId = process.env.KEYCLOAK_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;

    try {
      console.log('Attempting to get access token...');
      const tokenResponse = await axios.post(
        `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const accessToken = tokenResponse.data.access_token;
      console.log('Access token obtained successfully');

      console.log('Attempting to create user in Keycloak...');
      const createUserResponse = await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users`,
        {
          username: userDto.username,
          email: userDto.email,
          enabled: true,
          firstName: userDto.firstName,
          lastName: userDto.lastName,
          credentials: [
            {
              type: 'password',
              value: userDto.password,
              temporary: false,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('User created successfully in Keycloak');

      const userId = createUserResponse.headers.location.split('/').pop();

      const hrRoleId = await this.getHRRoleId(keycloakUrl, realm, accessToken);

      await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
        [{ id: hrRoleId, name: 'HR' }],
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('HR role assigned to user in Keycloak');
    } catch (error) {
      console.error('Detailed error in Keycloak user creation:');
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      throw new HttpException(
        `Failed to create user in Keycloak: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getHRRoleId(
    keycloakUrl: string,
    realm: string,
    accessToken: string,
  ): Promise<string> {
    const rolesResponse = await axios.get(
      `${keycloakUrl}/admin/realms/${realm}/roles`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const hrRole = rolesResponse.data.find((role) => role.name === 'HR');
    if (!hrRole) {
      throw new Error('HR Role Not Found In Keycloak');
    }
    return hrRole.id;
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string; user: Users }> {
    const keycloakUrl = process.env.KEYCLOAK_URL;
    const realm = process.env.KEYCLOAK_REALM;
    const clientId = process.env.KEYCLOAK_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
    try {
      const loginResponse = await axios.post(
        `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: clientId,
          client_secret: clientSecret,
          username: username,
          password: password,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      const user = await this.usersRepository.findOne({ where: { username } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        access_token: loginResponse.data.access_token,
        user: user,
      };
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw new UnauthorizedException('Login failed');
    }
  }

  async deleteUsers(email: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new HttpException('User Not Found', HttpStatus.NOT_FOUND);
    }
    try {
      await this.usersRepository.remove(user);
      return { message: 'HR Deleted Successfully' };
    } catch (error) {
      console.error('Error Deleting User: ', error);
      throw new HttpException(
        'Failed To Delete HR',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
