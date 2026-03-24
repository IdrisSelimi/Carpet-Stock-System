import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, Form, Select, InputNumber, Input, Button, Table, Tag, message, Card, Space } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import api from '../api/client';

export default function Transfers() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const fromStoreId: string | undefined = Form.useWatch('from_store_id', form);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/stores').then((r) => r.data),
  });

  const { data: sourceInventory = [], isLoading: invLoading } = useQuery({
    queryKey: ['inventory', fromStoreId],
    queryFn: () =>
      api.get('/inventory', { params: { store_id: fromStoreId } }).then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        return list;
      }),
    enabled: !!fromStoreId,
  });

  const { data: transfers = [], isLoading: transfersLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => api.get('/inventory/transfers').then((r) => r.data),
  });

  const doTransfer = useMutation({
    mutationFn: (values: { from_store_id: string; to_store_id: string; variant_id: string; quantity: number; notes?: string }) =>
      api.post('/inventory/transfers/direct', values),
    onSuccess: () => {
      message.success('Трансферот е извршен успешно');
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Трансферот не успеа');
    },
  });

  const storeOptions = Array.isArray(stores)
    ? (stores as { id: string; name: string }[]).map((s) => ({ label: s.name, value: s.id }))
    : [];

  const variantOptions = (Array.isArray(sourceInventory) ? sourceInventory : [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((inv: any) => inv.quantityAvailable > 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((inv: any) => ({
      label: `${inv.variant?.product?.sku ?? '—'} — ${inv.variant?.color?.name ?? '—'} (${inv.variant?.dimension?.displayName ?? '—'}) · Достапно: ${inv.quantityAvailable}`,
      value: inv.variant?.id,
    }));

  const transferColumns = [
    {
      title: 'Код · Боја',
      key: 'variant',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: unknown, r: any) =>
        `${r.variant?.product?.sku ?? '—'} · ${r.variant?.color?.name ?? '—'}`,
    },
    { title: 'Од', key: 'from', dataIndex: ['fromStore', 'name'] },
    { title: 'До', key: 'to', dataIndex: ['toStore', 'name'] },
    { title: 'Количина', key: 'qty', dataIndex: 'quantity', width: 90 },
    {
      title: 'Статус',
      key: 'status',
      dataIndex: 'status',
      width: 110,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (v: any) => {
        const map: Record<string, [string, string]> = {
          COMPLETED: ['green', 'Завршен'],
          PENDING: ['orange', 'Во тек'],
          CANCELLED: ['red', 'Откажан'],
          IN_TRANSIT: ['blue', 'Во транзит'],
        };
        const [color, label] = map[v] ?? ['default', v];
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Датум',
      key: 'date',
      dataIndex: 'initiatedAt',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (v: any) => v ? new Date(v).toLocaleString('mk-MK') : '—',
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Трансфери помеѓу продавници</Typography.Title>

      <Card style={{ marginBottom: 24, maxWidth: 560 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => doTransfer.mutate(values)}
          initialValues={{ quantity: 1 }}
        >
          <Form.Item name="from_store_id" label="Од продавница" rules={[{ required: true, message: 'Избери изворна продавница' }]}>
            <Select
              placeholder="Избери продавница"
              options={storeOptions}
              onChange={() => form.setFieldValue('variant_id', undefined)}
            />
          </Form.Item>

          <Form.Item name="to_store_id" label="До продавница" rules={[
            { required: true, message: 'Избери одредишна продавница' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('from_store_id') !== value) return Promise.resolve();
                return Promise.reject(new Error('Продавниците мора да бидат различни'));
              },
            }),
          ]}>
            <Select placeholder="Избери продавница" options={storeOptions} />
          </Form.Item>

          <Form.Item name="variant_id" label="Производ (Код — Боја)" rules={[{ required: true, message: 'Избери варијанта' }]}>
            <Select
              placeholder={fromStoreId ? 'Избери производ' : 'Прво избери изворна продавница'}
              options={variantOptions}
              loading={invLoading}
              disabled={!fromStoreId}
              showSearch
              optionFilterProp="label"
              notFoundContent={fromStoreId ? 'Нема достапна залиха во оваа продавница' : null}
            />
          </Form.Item>

          <Form.Item name="quantity" label="Количина" rules={[{ required: true }, { type: 'number', min: 1 }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="notes" label="Забелешки (незадолжително)">
            <Input placeholder="пр. Барање од клиент" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SwapOutlined />}
              loading={doTransfer.isPending}
              block
            >
              Изврши трансфер
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Typography.Title level={5}>Историја на трансфери</Typography.Title>
      <Table
        loading={transfersLoading}
        dataSource={Array.isArray(transfers) ? transfers : []}
        columns={transferColumns}
        rowKey="id"
        size="small"
      />
    </div>
  );
}
