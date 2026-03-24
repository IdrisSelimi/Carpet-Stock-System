import { useQuery } from '@tanstack/react-query';
import { Card, Row, Col, Statistic, Spin, Typography } from 'antd';
import { ShoppingOutlined, InboxOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../api/client';

export default function Dashboard() {
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', { page: 1, limit: 1 }],
    queryFn: () => api.get('/products', { params: { page: 1, limit: 1 } }).then((r) => r.data),
  });
  const { data: inventory, isLoading: invLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory').then((r) => r.data),
  });
  const { data: invSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['reports', 'inventory-summary'],
    queryFn: () => api.get('/reports/inventory-summary').then((r) => r.data),
  });

  const loading = productsLoading || invLoading || summaryLoading;
  const totalProducts = products?.pagination?.total_items ?? 0;
  const totalInventory = Array.isArray(inventory) ? inventory.length : 0;
  const lowStock = invSummary?.summary?.low_stock_items ?? 0;

  return (
    <div>
      <Typography.Title level={4}>Контролна табла</Typography.Title>
      {loading ? (
        <Spin />
      ) : (
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic title="Производи" value={totalProducts} prefix={<ShoppingOutlined />} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="Записи за залиха" value={totalInventory} prefix={<InboxOutlined />} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="Предупредувања за мала залиха" value={lowStock} prefix={<WarningOutlined />} valueStyle={lowStock > 0 ? { color: '#faad14' } : undefined} />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
