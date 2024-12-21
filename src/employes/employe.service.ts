import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Employes } from './entity/employes.entity';
import { Repository } from 'typeorm';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import * as uuid from 'uuid';

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

                employees.push(employee);
              })(),
            );
          })
          .on('end', async () => {
            await Promise.all(asyncTasks);

            const savedEmployees =
              await this.employesRepository.save(employees);

            resolve({
              message: 'CSV file Imported Successfully',
              addedCount: savedEmployees.length,
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
}
