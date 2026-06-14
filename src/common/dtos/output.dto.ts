import { Field, ObjectType } from '@nestjs/graphql/dist';

@ObjectType()
export class MutationOutput {
  @Field((type) => String, { nullable: true })
  error?: string;

  @Field((type) => Boolean)
  ok: boolean;
}
