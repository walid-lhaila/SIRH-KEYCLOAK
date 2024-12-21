import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Employes } from './entity/employes.entity';
import { Repository } from 'typeorm';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import * as uuid from 'uuid';
import * as process from 'node:process';
import axios from 'axios';
import { KeycloakDto } from './dto/keyckloak.dto';

@Injectable()
export class EmployeService {
  constructor(
    @InjectRepository(Employes)
    private employesRepository: Repository<Employes>,
  ) {}

  async importCsvFile(fileBuffer: Buffer): Promise<any> {
    const employees: Employes[] = [];
    const skippedEmployees: string[] = [];
    const asyncTasks: Promise<void>[] = [];

    return new Promise((resolve, reject) => {
      try {
        Readable.from(fileBuffer)
          .pipe(csv())
          .on('data', (row) => {
            asyncTasks.push(
              (async () => {
                const existingEmployee =
                  await this.employesRepository.findOneBy({
                    email: row.email,
                  });

                if (existingEmployee) {
                  skippedEmployees.push(row.email);
                  return;
                }

                const username = `${row.firstName}${row.lastName}${row.id}`;
                const password = uuid.v4();

                const employee = this.employesRepository.create({
                  firstName: row.firstName,
                  lastName: row.lastName,
                  username: username.toLowerCase(),
                  email: row.email,
                  poste: row.poste,
                  dateEmbouche: new Date(row.dateEmbouche),
                  departement: row.departement,
                  password: password,
                  role: 'Employee',
                });

                const savedEmployee =
                  await this.employesRepository.save(employee);

                await this.createEmployeesInKeycloak({
                  username: savedEmployee.username,
                  email: savedEmployee.email,
                  firstName: savedEmployee.firstName,
                  lastName: savedEmployee.lastName,
                  password: password,
                });

                employees.push(employee);
              })(),
            );
          })
          .on('end', async () => {
            await Promise.all(asyncTasks);

            resolve({
              message: 'CSV file Imported Successfully',
              addedCount: employees.length,
              skippedCount: skippedEmployees.length,
            });
          })
          .on('error', (error) => {
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  private async createEmployeesInKeycloak(
    employesDto: KeycloakDto,
  ): Promise<void> {
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

      const createEmployeesResponse = await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users`,
        {
          username: employesDto.username,
          email: employesDto.email,
          firstName: employesDto.firstName,
          lastName: employesDto.lastName,
          enabled: true,
          credentials: [
            {
              type: 'password',
              value: employesDto.password,
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

      console.log('Employees created successfully in Keycloak');

      const employeId = createEmployeesResponse.headers.location
        .split('/')
        .pop();

      const employeesRoleId = await this.getEmployeeRoleId(
        keycloakUrl,
        realm,
        accessToken,
      );

      await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users/${employeId}/role-mappings/realm`,
        [{ id: employeesRoleId, name: 'Employee' }],
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('Employee role assigned to user in Keycloak');
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

  private async getEmployeeRoleId(
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

    const employeeRole = rolesResponse.data.find(
      (role) => role.name === 'Employee',
    );
    if (!employeeRole) {
      throw new Error('HR Role Not Found In Keycloak');
    }
    return employeeRole.id;
  }
}
