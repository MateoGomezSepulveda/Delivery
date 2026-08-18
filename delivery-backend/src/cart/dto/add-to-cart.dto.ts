import { IsMongoId, IsNumber, Min } from "class-validator";

export class AddToCartDto {
    @IsMongoId()
    productId: string;

    @IsNumber()
    @Min(1, { message: 'La cantidad debe ser mayor a cero' })
    quantity: number;
}