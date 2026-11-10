import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { User, UserDocument } from '../users/schema/users.schema';
import { OrderStatus } from '../orders/order-status.enum';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * KPIs principales y resumen de órdenes por estado usando Aggregation Pipelines
   */
  async getDashboardSummary() {
    const [revenueAggregation, ordersByStatus, totalUsers, totalProducts] =
      await Promise.all([
        this.orderModel.aggregate([
          {
            $match: {
              status: {
                $in: [
                  OrderStatus.PAID,
                  OrderStatus.CONFIRMED,
                  OrderStatus.PREPARING,
                  OrderStatus.OUT_FOR_DELIVERY,
                  OrderStatus.DELIVERED,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
              paidOrdersCount: { $sum: 1 },
              averageOrderValue: { $avg: '$total' },
            },
          },
        ]),
        this.orderModel.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),
        this.userModel.countDocuments(),
        this.productModel.countDocuments({ available: true }),
      ]);

    const revenueSummary = revenueAggregation[0] || {
      totalRevenue: 0,
      paidOrdersCount: 0,
      averageOrderValue: 0,
    };

    const statusBreakdown = ordersByStatus.reduce<Record<string, number>>(
      (acc, item: { _id: string; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      },
      {},
    );

    const totalOrders = Object.values(statusBreakdown).reduce(
      (sum: number, val: number) => sum + val,
      0,
    );

    return {
      kpis: {
        totalRevenue: Number((revenueSummary.totalRevenue || 0).toFixed(2)),
        totalOrders,
        paidOrdersCount: revenueSummary.paidOrdersCount || 0,
        averageOrderValue: Number(
          (revenueSummary.averageOrderValue || 0).toFixed(2),
        ),
        totalUsers,
        activeProducts: totalProducts,
      },
      ordersByStatus: statusBreakdown,
    };
  }

  /**
   * Ranking de productos más vendidos usando $unwind + $group + $sort
   */
  async getTopProducts(limit = 5) {
    return this.orderModel.aggregate([
      {
        $match: {
          status: { $ne: OrderStatus.CANCELLED },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: { $multiply: ['$items.quantity', '$items.price'] },
          },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantitySold: -1, totalRevenue: -1 } },
      { $limit: Number(limit) || 5 },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: 1,
          totalQuantitySold: 1,
          totalRevenue: 1,
          ordersCount: 1,
        },
      },
    ]);
  }

  /**
   * Ventas agrupadas por día para gráficas de evolución de ingresos
   */
  async getSalesByDay(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (Number(days) || 30));

    return this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: OrderStatus.CANCELLED },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          ordersCount: { $sum: 1 },
          dailyRevenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          ordersCount: 1,
          dailyRevenue: 1,
        },
      },
    ]);
  }
}
