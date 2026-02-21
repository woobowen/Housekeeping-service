import { getOrders } from '@/features/orders/actions';
import { OrderActionHandler } from '@/features/orders/components/order-action-handler';
import { OrderList } from '@/features/orders/components/order-list';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const orders = (await getOrders()) || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">订单管理</h1>
          <p className="text-muted-foreground mt-2">
            查看和管理所有服务订单
          </p>
        </div>
        <div>
          <OrderActionHandler />
        </div>
      </div>

      <OrderList orders={orders} />
    </div>
  );
}
