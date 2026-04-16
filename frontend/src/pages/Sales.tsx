import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Typography, Button, Modal, Form, InputNumber, Input, Select, Space, message, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ShoppingCartOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useStoreContext } from '../contexts/StoreContext';

export default function Sales() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string | undefined>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedStoreId } = useStoreContext();
  const isManager = user?.role === 'MANAGER';
  const userStoreId = (user as { storeId?: string }).storeId ?? null;

  const effectiveStoreId = isManager ? (selectedStoreFilter ?? selectedStoreId ?? undefined) : (userStoreId ?? undefined);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/stores').then((r) => r.data),
    enabled: isManager,
  });

  const { data: inventoryData = [], isLoading } = useQuery({
    queryKey: ['inventory-for-sale', effectiveStoreId],
    queryFn: () =>
      api.get('/inventory', {
        params: { ...(effectiveStoreId ? { store_id: effectiveStoreId } : {}) },
      }).then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? [])),
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['sale-transactions', effectiveStoreId],
    queryFn: () =>
      api.get('/inventory/transactions', {
        params: {
          ...(effectiveStoreId ? { store_id: effectiveStoreId } : {}),
          limit: 100,
        },
      }).then((r) => (Array.isArray(r.data) ? r.data : [])),
  });

  const sell = useMutation({
    mutationFn: ({ inventoryId, quantity, notes }: { inventoryId: string; quantity: number; notes?: string }) =>
      api.put(`/inventory/${inventoryId}/adjust`, {
        quantity_change: -quantity,
        transaction_type: 'STOCK_OUT',
        notes: notes || 'Продажба',
      }),
    onSuccess: () => {
      message.success('Продажбата е евидентирана, залихата е ажурирана');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-for-sale'] });
      queryClient.invalidateQueries({ queryKey: ['sale-transactions'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се евидентира продажбата');
    },
  });

  const inventoryList = Array.isArray(inventoryData) ? inventoryData : [];

  const availableItems = inventoryList.filter((inv: { quantityAvailable?: number }) => (inv.quantityAvailable ?? 0) > 0);

  const inventoryOptions = availableItems.map((inv: {
    id: string;
    quantityAvailable?: number;
    store?: { name?: string };
    variant?: { product?: { sku?: string; name?: string; category?: { name?: string } }; color?: { name?: string }; dimension?: { displayName?: string } };
  }) => ({
    value: inv.id,
    label: `[${inv.variant?.product?.category?.name ?? '—'}] ${inv.variant?.product?.sku ?? '—'} · ${inv.variant?.color?.name ?? '—'} · ${inv.variant?.dimension?.displayName ?? '—'}${!isManager || !effectiveStoreId ? ` (${inv.store?.name ?? '—'})` : ''} — Достапно: ${inv.quantityAvailable}`,
  }));

  const txColumns: ColumnsType<{
    id: string;
    createdAt: string;
    quantity: number;
    transactionType: string;
    notes?: string;
    variant?: { product?: { sku?: string; category?: { name?: string } }; color?: { name?: string }; dimension?: { displayName?: string } };
    store?: { name?: string };
    performedBy?: { firstName?: string; lastName?: string; email?: string };
  }> = [
    {
      title: 'Датум',
      dataIndex: 'createdAt',
      key: 'date',
      width: 160,
      render: (v: string) => new Date(v).toLocaleString('mk-MK'),
    },
    {
      title: 'Производ',
      key: 'product',
      render: (_, r) =>
        `[${r.variant?.product?.category?.name ?? '—'}] ${r.variant?.product?.sku ?? '—'} · ${r.variant?.color?.name ?? '—'} · ${r.variant?.dimension?.displayName ?? '—'}`,
    },
    { title: 'Продавница', dataIndex: ['store', 'name'], key: 'store', width: 120 },
    {
      title: 'Количина',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      render: (v: number) => (
        <Tag color={v < 0 ? 'red' : 'green'}>{v > 0 ? `+${v}` : v}</Tag>
      ),
    },
    {
      title: 'Тип',
      dataIndex: 'transactionType',
      key: 'type',
      width: 110,
      render: (v: string) =>
        v === 'STOCK_OUT' ? <Tag color="red">Продажба</Tag> :
        v === 'STOCK_IN' ? <Tag color="green">Влез</Tag> :
        v === 'TRANSFER' ? <Tag color="blue">Трансфер</Tag> :
        <Tag>{v}</Tag>,
    },
    { title: 'Забелешка', dataIndex: 'notes', key: 'notes' },
    {
      title: 'Извршил',
      key: 'by',
      width: 140,
      render: (_, r) => r.performedBy ? `${r.performedBy.firstName ?? ''} ${r.performedBy.lastName ?? ''}`.trim() || r.performedBy.email : '—',
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Продажби</Typography.Title>
        <Space>
          {isManager && (
            <Select
              allowClear
              placeholder="Филтрирај по продавница"
              style={{ width: 200 }}
              options={(Array.isArray(stores) ? stores : []).map((s: { id: string; name: string }) => ({ value: s.id, label: s.name }))}
              onChange={(v) => setSelectedStoreFilter(v)}
            />
          )}
          <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => setModalOpen(true)}>
            Нова продажба
          </Button>
        </Space>
      </Space>

      <Typography.Title level={5} style={{ marginBottom: 8 }}>Историја на трансакции</Typography.Title>
      <Table
        loading={txLoading}
        dataSource={transactions.filter((t: { transactionType: string }) => t.transactionType === 'STOCK_OUT')}
        columns={txColumns}
        rowKey="id"
        size="small"
      />

      <Modal
        title="Нова продажба"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={sell.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            sell.mutate({
              inventoryId: values.inventory_id,
              quantity: values.quantity,
              notes: values.notes,
            });
          }}
        >
          {isManager && !effectiveStoreId && (
            <Form.Item name="store_hint" label="Совет">
              <Typography.Text type="secondary">
                Избери продавница во горниот филтер за да ги видиш само нејзините артикли.
              </Typography.Text>
            </Form.Item>
          )}
          <Form.Item
            name="inventory_id"
            label="Производ (Код · Боја · Димензија)"
            rules={[{ required: true, message: 'Избери производ' }]}
          >
            <Select
              showSearch
              placeholder="Пребарај и избери производ"
              options={inventoryOptions}
              filterOption={(input, option) =>
                (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
              }
              loading={isLoading}
              notFoundContent={isLoading ? 'Вчитување...' : 'Нема достапни производи'}
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Количина"
            rules={[{ required: true, message: 'Внеси количина' }, { type: 'number', min: 1, message: 'Минимум 1' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="пр. 1" />
          </Form.Item>
          <Form.Item name="notes" label="Забелешка (незадолжително)">
            <Input placeholder="пр. Клиент: Марко" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
