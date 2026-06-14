import { Field, InputType, ObjectType, PickType } from '@nestjs/graphql/dist';
import { MutationOutput } from '../../common/dtos/output.dto';
import { User } from '../entities/user.entity';

@InputType()
export class LoginInput extends PickType(User, ['email', 'password']) {}

@ObjectType()
export class LoginOutput extends MutationOutput {
  @Field((type) => String)
  token: string;
}
