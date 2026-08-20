import { Model } from 'mongoose';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';

export interface PaginationOptions {
    page?: number;
    limit?: number;
    sort?: Record<string, 1 | -1>;
    populate?: string | string[];
}

export async function paginate<T>(
    model: Model<any>,
    filter: Record<string, any>,        // 💡 Sin FilterQuery — compatible con nodenext
    options: PaginationOptions = {},
): Promise<PaginatedResponse<T>> {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, populate } = options;
    const skip = (page - 1) * limit;

    const baseQuery = model.find(filter).skip(skip).limit(limit).sort(sort as any);

    const populateList = populate
        ? Array.isArray(populate) ? populate : [populate]
        : [];

    const query = populateList.reduce(
        (q, p) => q.populate(p) as any,
        baseQuery as any,
    );

    const [data, total] = await Promise.all([
        query.exec(),
        model.countDocuments(filter),
    ]);

    return {
        data: data as T[],
        meta: {
            total,
            page,
            limit,
            lastPage: Math.ceil(total / limit),
        },
    };
}
