import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateAccountInput } from './dtos/create-account.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<string | undefined> {
    try {
      const exists = await this.users.findOne({ where: { email } });
      if (exists) {
        //make error
        return '동일한 이메일의 아이디가 존재합니다.';
      }
      await this.users.save(this.users.create({ email, password, role }));
    } catch (e) {
      return '계정을 생상하지 못하였습니다.';
    }
    // check new user
    // create user & hash password
  }
}
