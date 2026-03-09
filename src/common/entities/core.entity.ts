import { Field } from '@nestjs/graphql/dist';
import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export class CoreEntity {
  @PrimaryGeneratedColumn()
  @Field((type) => Number)
  id: string;

  @CreateDateColumn()
  @Field((type) => Date)
  createdAt: Date;

  @CreateDateColumn()
  @Field((type) => Date)
  updatedAt: Date;
}
