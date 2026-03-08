import { InputType, OmitType } from '@nestjs/graphql/dist';
import { Restaurant } from '../entities/restaurant.entity';
@InputType()
export class CreateRestaurantDto extends OmitType(
  Restaurant,
  ['id'],
  InputType,
) {}
