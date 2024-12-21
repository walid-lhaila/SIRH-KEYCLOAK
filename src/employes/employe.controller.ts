import { Controller, Logger, UseGuards } from '@nestjs/common';
import { EmployeService } from './employe.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CustomAuthGuard } from '../auth/custom-auth.guard';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class EmployeController {
  constructor(private readonly employesService: EmployeService) {}

  @UseGuards(CustomAuthGuard, RolesGuard)
  @Roles('HR')
  @MessagePattern({ cmd: 'importEmployees' })
  async importEmployees(@Payload() data: { token: string; file: string }) {
    const fileBuffer = Buffer.from(data.file, 'base64');
    const result = await this.employesService.importCsvFile(fileBuffer);
    return result;
  }
}
