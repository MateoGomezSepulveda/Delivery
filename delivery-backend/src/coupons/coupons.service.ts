import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coupon, CouponDocument, DiscountType } from './schemas/coupon.schema';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
  ) {}

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const normalizedCode = dto.code.toUpperCase().trim();

    if (
      dto.discountType === DiscountType.PERCENTAGE &&
      dto.discountValue > 100
    ) {
      throw new BadRequestException(
        'El porcentaje de descuento no puede ser mayor a 100%.',
      );
    }

    const existing = await this.couponModel.findOne({ code: normalizedCode });
    if (existing) {
      throw new ConflictException(
        `Ya existe un cupón con el código "${normalizedCode}".`,
      );
    }

    const coupon = new this.couponModel({
      ...dto,
      code: normalizedCode,
      expirationDate: new Date(dto.expirationDate),
    });

    return coupon.save();
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) {
      throw new NotFoundException('Cupón no encontrado.');
    }
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOne(id);

    const targetType = dto.discountType ?? coupon.discountType;
    const targetValue = dto.discountValue ?? coupon.discountValue;

    if (targetType === DiscountType.PERCENTAGE && targetValue > 100) {
      throw new BadRequestException(
        'El porcentaje de descuento no puede ser mayor a 100%.',
      );
    }

    if (dto.code) {
      const normalizedCode = dto.code.toUpperCase().trim();
      if (normalizedCode !== coupon.code) {
        const duplicate = await this.couponModel.findOne({
          code: normalizedCode,
          _id: { $ne: id },
        });
        if (duplicate) {
          throw new ConflictException(
            `Ya existe otro cupón con el código "${normalizedCode}".`,
          );
        }
      }
      dto.code = normalizedCode;
    }

    Object.assign(coupon, {
      ...dto,
      ...(dto.expirationDate && {
        expirationDate: new Date(dto.expirationDate),
      }),
    });

    return coupon.save();
  }

  async remove(id: string): Promise<{ message: string }> {
    const coupon = await this.findOne(id);
    await coupon.deleteOne();
    return { message: 'Cupón eliminado correctamente.' };
  }

  async applyCoupon(userId: string, dto: ApplyCouponDto) {
    const normalizedCode = dto.code.toUpperCase().trim();
    const coupon = await this.couponModel.findOne({ code: normalizedCode });

    if (!coupon) {
      throw new NotFoundException('El código de cupón ingresado no existe.');
    }

    if (!coupon.isActive) {
      throw new BadRequestException('Este cupón ya no está activo.');
    }

    if (new Date() > new Date(coupon.expirationDate)) {
      throw new BadRequestException('Este cupón ha expirado.');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException(
        'Este cupón ha alcanzado su límite máximo de usos.',
      );
    }

    const alreadyUsed = coupon.usedBy?.some(
      (id) => id.toString() === userId.toString(),
    );
    if (alreadyUsed) {
      throw new BadRequestException(
        'Ya has utilizado este cupón anteriormente.',
      );
    }

    if (dto.orderTotal < (coupon.minOrderAmount || 0)) {
      throw new BadRequestException(
        `El monto mínimo de compra para este cupón es de $${coupon.minOrderAmount}.`,
      );
    }

    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (dto.orderTotal * coupon.discountValue) / 100;
      if (
        coupon.maxDiscountAmount !== undefined &&
        coupon.maxDiscountAmount > 0
      ) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    // El descuento nunca puede superar el total del pedido
    discountAmount = Math.min(discountAmount, dto.orderTotal);
    const finalTotal = Number((dto.orderTotal - discountAmount).toFixed(2));

    coupon.usedCount += 1;
    coupon.usedBy.push(new Types.ObjectId(userId));
    await coupon.save();

    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      originalTotal: dto.orderTotal,
      discountAmount: Number(discountAmount.toFixed(2)),
      finalTotal,
    };
  }
}
