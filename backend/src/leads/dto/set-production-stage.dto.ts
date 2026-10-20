import { IsIn } from 'class-validator';
import { PRODUCTION_STAGES, type ProductionStage } from '../leads.types.js';

export class SetProductionStageDto {
  @IsIn(PRODUCTION_STAGES, { message: 'Please choose a valid production stage.' })
  stage: ProductionStage;
}
