import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { User, UserDocument } from '../users/schema/users.schema';
import { OrderStatus } from '../orders/order-status.enum';
import { PaymentStatus } from '../orders/payment-method.enum';

const PAID_ORDER_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private resolveMonthBounds(
    month?: string,
  ): { month: string; start: Date; end: Date } | null {
    if (!month) return null;
    const trimmed = month.trim();
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(trimmed);
    if (!match) return null;

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    return { month: trimmed, start, end };
  }

  private buildDateRangeFilter(
    days?: number,
    from?: string,
    to?: string,
    month?: string,
  ): Record<string, any> {
    const monthBounds = this.resolveMonthBounds(month);
    if (monthBounds) {
      return { createdAt: { $gte: monthBounds.start, $lte: monthBounds.end } };
    }

    const range: Record<string, Date> = {};

    if (from) {
      const parsedFrom = new Date(from);
      if (!Number.isNaN(parsedFrom.getTime())) {
        range.$gte = parsedFrom;
      }
    }

    if (to) {
      const parsedTo = new Date(to);
      if (!Number.isNaN(parsedTo.getTime())) {
        // Si solo se envió YYYY-MM-DD (sin hora), incluimos todo ese día hasta 23:59:59.999 UTC
        if (/^\d{4}-\d{2}-\d{2}$/.test(to.trim())) {
          parsedTo.setUTCHours(23, 59, 59, 999);
        }
        range.$lte = parsedTo;
      }
    }

    if (Object.keys(range).length > 0) {
      return { createdAt: range };
    }

    const startDate = this.buildDateThreshold(days);
    return startDate ? { createdAt: { $gte: startDate } } : {};
  }

  private buildDateThreshold(days?: number): Date | null {
    if (!days || !Number.isFinite(days) || days <= 0) return null;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.floor(days));
    return startDate;
  }

  /**
   * Etapas reutilizables de agregación para resolver el costo real de cada orden:
   * - Usa el snapshot `totalCost` / `items.costPrice` guardado al momento de la compra.
   * - Para órdenes históricas sin snapshot, hace fallback al `costPrice` actual del producto.
   */
  private buildOrderCostResolutionStages(): PipelineStage[] {
    return [
      {
        $lookup: {
          from: 'products',
          let: {
            productIds: {
              $map: {
                input: { $ifNull: ['$items', []] },
                as: 'it',
                in: {
                  $convert: {
                    input: '$$it.productId',
                    to: 'objectId',
                    onError: null,
                    onNull: null,
                  },
                },
              },
            },
          },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$productIds'] } } },
            { $project: { _id: 1, costPrice: 1, stock: 1 } },
          ],
          as: '_productDocs',
        },
      },
      {
        $addFields: {
          _computedItemsCost: {
            $sum: {
              $map: {
                input: { $ifNull: ['$items', []] },
                as: 'it',
                in: {
                  $multiply: [
                    { $ifNull: ['$$it.quantity', 0] },
                    {
                      $cond: [
                        { $gt: [{ $ifNull: ['$$it.costPrice', 0] }, 0] },
                        '$$it.costPrice',
                        {
                          $let: {
                            vars: {
                              matched: {
                                $first: {
                                  $filter: {
                                    input: '$_productDocs',
                                    as: 'pd',
                                    cond: {
                                      $eq: [
                                        { $toString: '$$pd._id' },
                                        { $toString: '$$it.productId' },
                                      ],
                                    },
                                  },
                                },
                              },
                            },
                            in: { $ifNull: ['$$matched.costPrice', 0] },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
          _orderUnits: { $sum: '$items.quantity' },
        },
      },
      {
        $addFields: {
          _resolvedCost: {
            $cond: [
              { $gt: [{ $ifNull: ['$totalCost', 0] }, 0] },
              '$totalCost',
              '$_computedItemsCost',
            ],
          },
        },
      },
      {
        $addFields: {
          _resolvedProfit: {
            $subtract: [{ $ifNull: ['$total', 0] }, '$_resolvedCost'],
          },
        },
      },
    ];
  }

  /**
   * KPIs financieros reales del período (ingresos, costos de compra, ganancia neta, margen),
   * arrastre de deudas / cuentas por cobrar de meses anteriores, salud de inventario
   * y resumen de órdenes por estado usando Aggregation Pipelines
   */
  async getDashboardSummary(
    days?: number,
    from?: string,
    to?: string,
    month?: string,
  ) {
    const monthBounds = this.resolveMonthBounds(month);
    const dateFilter = this.buildDateRangeFilter(days, from, to, month);
    const hasDateFilter = Object.keys(dateFilter).length > 0;
    const periodStart: Date | null = dateFilter.createdAt?.$gte ?? null;
    const periodEnd: Date | null = dateFilter.createdAt?.$lte ?? null;

    const [
      revenueAggregation,
      ordersByStatus,
      totalUsers,
      activeProductsCount,
      inventoryAgg,
      inventoryAlertsRaw,
      priorMonthlyProfits,
      priorPendingOrders,
    ] = await Promise.all([
      this.orderModel.aggregate([
        {
          $match: {
            ...dateFilter,
            status: { $in: PAID_ORDER_STATUSES },
          },
        },
        ...this.buildOrderCostResolutionStages(),
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalCost: { $sum: '$_resolvedCost' },
            netProfit: { $sum: '$_resolvedProfit' },
            totalUnitsSold: { $sum: '$_orderUnits' },
            paidOrdersCount: { $sum: 1 },
            averageOrderValue: { $avg: '$total' },
          },
        },
      ]),
      this.orderModel.aggregate([
        ...(hasDateFilter ? [{ $match: dateFilter }] : []),
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      this.userModel.countDocuments(),
      this.productModel.countDocuments({ available: true }),
      typeof this.productModel.aggregate === 'function'
        ? this.productModel.aggregate([
            {
              $project: {
                price: { $ifNull: ['$price', 0] },
                costPrice: { $ifNull: ['$costPrice', 0] },
                stock: { $ifNull: ['$stock', 0] },
                lowStockThreshold: { $ifNull: ['$lowStockThreshold', 5] },
                available: { $ifNull: ['$available', true] },
              },
            },
            {
              $group: {
                _id: null,
                lowStockProducts: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$available', true] },
                          { $gt: ['$stock', 0] },
                          { $lte: ['$stock', '$lowStockThreshold'] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                outOfStockProducts: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ['$available', false] },
                          { $lte: ['$stock', 0] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                inventoryCostValue: {
                  $sum: {
                    $multiply: [{ $max: ['$stock', 0] }, '$costPrice'],
                  },
                },
                inventoryRetailValue: {
                  $sum: {
                    $multiply: [{ $max: ['$stock', 0] }, '$price'],
                  },
                },
                carriedInventoryUnits: {
                  $sum: { $max: ['$stock', 0] },
                },
              },
            },
          ])
        : Promise.resolve([]),
      typeof this.productModel.aggregate === 'function'
        ? this.productModel.aggregate([
            {
              $project: {
                name: 1,
                price: { $ifNull: ['$price', 0] },
                costPrice: { $ifNull: ['$costPrice', 0] },
                stock: { $ifNull: ['$stock', 0] },
                lowStockThreshold: { $ifNull: ['$lowStockThreshold', 5] },
                available: { $ifNull: ['$available', true] },
              },
            },
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$available', false] },
                    { $lte: ['$stock', '$lowStockThreshold'] },
                  ],
                },
              },
            },
            { $sort: { stock: 1, name: 1 } },
            { $limit: 8 },
            {
              $project: {
                _id: 0,
                productId: { $toString: '$_id' },
                name: 1,
                stock: 1,
                lowStockThreshold: 1,
                price: 1,
                costPrice: 1,
                available: 1,
              },
            },
          ])
        : Promise.resolve([]),
      periodStart
        ? this.orderModel.aggregate([
            {
              $match: {
                createdAt: { $lt: periodStart },
                status: { $in: PAID_ORDER_STATUSES },
              },
            },
            ...this.buildOrderCostResolutionStages(),
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m', date: '$createdAt' },
                },
                monthlyProfit: { $sum: '$_resolvedProfit' },
              },
            },
            { $sort: { _id: 1 } },
          ])
        : Promise.resolve([]),
      periodStart
        ? this.orderModel.aggregate([
            {
              $match: {
                createdAt: { $lt: periodStart },
                status: {
                  $nin: [
                    OrderStatus.DELIVERED,
                    OrderStatus.CANCELLED,
                    OrderStatus.FAILED,
                  ],
                },
                $or: [
                  { status: OrderStatus.PENDING },
                  { paymentStatus: PaymentStatus.PENDING },
                ],
              },
            },
            {
              $group: {
                _id: null,
                pendingReceivablesAmount: { $sum: '$total' },
                pendingReceivablesCount: { $sum: 1 },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const revenueSummary = revenueAggregation[0] || {
      totalRevenue: 0,
      totalCost: 0,
      netProfit: 0,
      totalUnitsSold: 0,
      paidOrdersCount: 0,
      averageOrderValue: 0,
    };

    const inventorySummary = inventoryAgg[0] || {
      lowStockProducts: 0,
      outOfStockProducts: 0,
      inventoryCostValue: 0,
      inventoryRetailValue: 0,
      carriedInventoryUnits: 0,
    };

    const totalRevenue = Number((revenueSummary.totalRevenue || 0).toFixed(2));
    const totalCost = Number((revenueSummary.totalCost || 0).toFixed(2));
    const netProfit = Number(
      (revenueSummary.netProfit !== undefined
        ? revenueSummary.netProfit
        : totalRevenue - totalCost
      ).toFixed(2),
    );
    const profitMargin =
      totalRevenue > 0
        ? Number(((netProfit / totalRevenue) * 100).toFixed(1))
        : 0;

    // Arrastre de pérdidas mes a mes: solo los meses cerrados en negativo transfieren deuda al mes siguiente
    let previousDeficitDebt = 0;
    for (const row of priorMonthlyProfits as Array<{ monthlyProfit: number }>) {
      const monthBalance = (row.monthlyProfit || 0) - previousDeficitDebt;
      previousDeficitDebt = monthBalance < 0 ? Math.abs(monthBalance) : 0;
    }
    previousDeficitDebt = Number(previousDeficitDebt.toFixed(2));

    const adjustedNetBalance = Number(
      (netProfit - previousDeficitDebt).toFixed(2),
    );
    const closingDeficitDebt =
      adjustedNetBalance < 0
        ? Number(Math.abs(adjustedNetBalance).toFixed(2))
        : 0;

    const pendingSummary = (
      priorPendingOrders as Array<{
        pendingReceivablesAmount: number;
        pendingReceivablesCount: number;
      }>
    )[0] || {
      pendingReceivablesAmount: 0,
      pendingReceivablesCount: 0,
    };

    const inventoryCostValue = Number(
      (inventorySummary.inventoryCostValue || 0).toFixed(2),
    );
    const inventoryRetailValue = Number(
      (inventorySummary.inventoryRetailValue || 0).toFixed(2),
    );

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
      period: {
        month: monthBounds?.month ?? null,
        from: periodStart ? periodStart.toISOString() : null,
        to: periodEnd ? periodEnd.toISOString() : null,
      },
      kpis: {
        totalRevenue,
        totalCost,
        netProfit,
        profitMargin,
        totalUnitsSold: revenueSummary.totalUnitsSold || 0,
        totalOrders,
        paidOrdersCount: revenueSummary.paidOrdersCount || 0,
        averageOrderValue: Number(
          (revenueSummary.averageOrderValue || 0).toFixed(2),
        ),
        totalUsers,
        activeProducts: activeProductsCount,
        lowStockProducts: inventorySummary.lowStockProducts || 0,
        outOfStockProducts: inventorySummary.outOfStockProducts || 0,
        inventoryCostValue,
        inventoryRetailValue,
      },
      carryOver: {
        previousDeficitDebt,
        adjustedNetBalance,
        closingDeficitDebt,
        pendingReceivablesAmount: Number(
          (pendingSummary.pendingReceivablesAmount || 0).toFixed(2),
        ),
        pendingReceivablesCount: pendingSummary.pendingReceivablesCount || 0,
        inventoryCostValue,
        inventoryRetailValue,
        carriedInventoryUnits: inventorySummary.carriedInventoryUnits || 0,
      },
      ordersByStatus: statusBreakdown,
      inventoryAlerts: inventoryAlertsRaw || [],
    };
  }

  /**
   * Ranking de productos con ingresos, costos reales de compra, ganancia neta y margen %
   */
  async getTopProducts(
    limit = 5,
    days?: number,
    from?: string,
    to?: string,
    month?: string,
  ) {
    const dateFilter = this.buildDateRangeFilter(days, from, to, month);

    return this.orderModel.aggregate([
      {
        $match: {
          ...dateFilter,
          status: { $nin: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          let: {
            pid: {
              $convert: {
                input: '$items.productId',
                to: 'objectId',
                onError: null,
                onNull: null,
              },
            },
          },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$pid'] } } },
            {
              $project: {
                _id: 1,
                costPrice: 1,
                stock: 1,
                lowStockThreshold: 1,
              },
            },
          ],
          as: '_product',
        },
      },
      {
        $addFields: {
          _prodDoc: { $first: '$_product' },
        },
      },
      {
        $addFields: {
          _unitCost: {
            $cond: [
              { $gt: [{ $ifNull: ['$items.costPrice', 0] }, 0] },
              '$items.costPrice',
              { $ifNull: ['$_prodDoc.costPrice', 0] },
            ],
          },
        },
      },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: { $multiply: ['$items.quantity', '$items.price'] },
          },
          totalCost: {
            $sum: { $multiply: ['$items.quantity', '$_unitCost'] },
          },
          ordersCount: { $sum: 1 },
          currentStock: { $last: '$_prodDoc.stock' },
          lowStockThreshold: { $last: '$_prodDoc.lowStockThreshold' },
        },
      },
      {
        $addFields: {
          totalProfit: { $subtract: ['$totalRevenue', '$totalCost'] },
        },
      },
      { $sort: { totalProfit: -1, totalQuantitySold: -1, totalRevenue: -1 } },
      { $limit: Number(limit) || 5 },
      {
        $project: {
          _id: 0,
          productId: { $toString: '$_id' },
          name: 1,
          totalQuantitySold: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalCost: { $round: ['$totalCost', 2] },
          totalProfit: { $round: ['$totalProfit', 2] },
          profitMargin: {
            $cond: [
              { $gt: ['$totalRevenue', 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$totalProfit', '$totalRevenue'] },
                      100,
                    ],
                  },
                  1,
                ],
              },
              0,
            ],
          },
          avgUnitPrice: {
            $cond: [
              { $gt: ['$totalQuantitySold', 0] },
              {
                $round: [
                  { $divide: ['$totalRevenue', '$totalQuantitySold'] },
                  2,
                ],
              },
              0,
            ],
          },
          avgUnitCost: {
            $cond: [
              { $gt: ['$totalQuantitySold', 0] },
              {
                $round: [{ $divide: ['$totalCost', '$totalQuantitySold'] }, 2],
              },
              0,
            ],
          },
          currentStock: { $ifNull: ['$currentStock', null] },
          lowStockThreshold: { $ifNull: ['$lowStockThreshold', 5] },
          ordersCount: 1,
        },
      },
    ]);
  }

  /**
   * Ventas, costos y ganancia real agrupados por día para gráficas comparativas
   */
  async getSalesByDay(days = 30, from?: string, to?: string, month?: string) {
    const dateFilter = this.buildDateRangeFilter(
      month || from || to ? undefined : Number(days) || 30,
      from,
      to,
      month,
    );

    return this.orderModel.aggregate([
      {
        $match: {
          ...dateFilter,
          status: { $nin: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
        },
      },
      ...this.buildOrderCostResolutionStages(),
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          ordersCount: { $sum: 1 },
          unitsSold: { $sum: '$_orderUnits' },
          dailyRevenue: { $sum: '$total' },
          dailyCost: { $sum: '$_resolvedCost' },
          dailyProfit: { $sum: '$_resolvedProfit' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          ordersCount: 1,
          unitsSold: 1,
          dailyRevenue: { $round: ['$dailyRevenue', 2] },
          dailyCost: { $round: ['$dailyCost', 2] },
          dailyProfit: { $round: ['$dailyProfit', 2] },
        },
      },
    ]);
  }
}
