import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class ParseMongoIdPipe implements PipeTransform<string, string> {
    transform(value: string): string {
        if (!isValidObjectId(value)) {
            throw new BadRequestException(`El ID "${value}" no es un MongoID válido`);
        }
        return value;
    }
}
