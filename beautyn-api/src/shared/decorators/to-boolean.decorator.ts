import { Transform } from 'class-transformer';
import { toBoolean } from '../transformers/to-boolean.transformer';

export function ToBoolean(): PropertyDecorator {
  return Transform(toBoolean);
}