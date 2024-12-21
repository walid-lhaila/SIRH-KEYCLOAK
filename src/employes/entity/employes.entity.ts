import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Employes {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  username: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  role: string;

  @Column()
  poste: string;

  @Column()
  departement: string;

  @Column()
  dateEmbouche: Date;
}
