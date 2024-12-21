import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employes } from './entity/employes.entity';
import { AuthModule } from '../auth/auth.module';
import { EmployeService } from './employe.service';
import { EmployeController } from './employe.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employes]), AuthModule],
  providers: [EmployeService],
  controllers: [EmployeController],
})
export class EmployeModule {}
