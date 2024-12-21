import { IsDate, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EmployesDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  role: string;

  @IsString()
  @IsNotEmpty()
  poste: string;

  @IsString()
  @IsNotEmpty()
  departement: string;

  @IsDate()
  @IsNotEmpty()
  dateEmbouche: Date;
}
