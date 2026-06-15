import { PartialType } from '@nestjs/mapped-types';
import { CreateSystemOptionDto } from './create-system-option.dto';

export class UpdateSystemOptionDto extends PartialType(CreateSystemOptionDto) {}
