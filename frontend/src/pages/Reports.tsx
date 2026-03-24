import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Row, Col, Statistic } from 'antd';
import api from '../api/client';

export default function Reports() {
  const { data: invSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['reports', 'inventory-summary'],
    queryFn: () => api.get('/reports/inventory-summary').then((r) => r.data),
  });

  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: ['reports', 'low-stock'],
    queryFn: () => api.get('/reports/low-stock').then((r) => r.data),
  });

  return (
    <div>
      <Typography.Title level={4}>Извештаи</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="Преглед на залиха" loading={summaryLoading}>
            {invSummary?.summary && (
              <>
                <Statistic title="Вкупно записи" value={invSummary.summary.total_records} />
                <Statistic title="Вкупно единици во залиха" value={invSummary.summary.total_quantity} style={{ marginTop: 12 }} />
                <Statistic title="Производи со мала залиха" value={invSummary.summary.low_stock_items} style={{ marginTop: 12 }} valueStyle={invSummary.summary.low_stock_items > 0 ? { color: '#faad14' } : undefined} />
                <Statistic title="Производи без залиха" value={invSummary.summary.out_of_stock_items} style={{ marginTop: 12 }} valueStyle={invSummary.summary.out_of_stock_items > 0 ? { color: '#ff4d4f' } : undefined} />
              </>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Производи со мала залиха" loading={lowStockLoading}>
            {Array.isArray(lowStock) && lowStock.length === 0 && (
              <Typography.Text type="secondary">Сите производи имаат доволна залиха.</Typography.Text>
            )}
            {Array.isArray(lowStock) && lowStock.map((item: { id: string; variant?: { product?: { name?: string; sku?: string }; color?: { name?: string }; dimension?: { displayName?: string } }; store?: { name?: string }; quantityAvailable?: number; reorderLevel?: number }) => (
              <div key={item.id} style={{ marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Typography.Text strong>{item.variant?.product?.name ?? '—'}</Typography.Text>
                <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                  {item.variant?.color?.name} · {item.variant?.dimension?.displayName}
                </Typography.Text>
                <div>
                  <Typography.Text type="secondary">{item.store?.name}</Typography.Text>
                  <Typography.Text style={{ marginLeft: 8 }}>
                    Залиха: <Typography.Text type="danger">{item.quantityAvailable}</Typography.Text> / Нарачај при: {item.reorderLevel}
                  </Typography.Text>
                </div>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
