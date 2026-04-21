import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Typography, Tag, Button, Modal, Form, InputNumber, Input, Space, message, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useStoreContext } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<{ id: string; storeId?: string; store?: { id?: string; name?: string }; variant?: { variantSku?: string; product?: { name?: string; sku?: string; category?: { name?: string }; cat?: { name?: string } }; color?: { name?: string }; dimension?: { displayName?: string } }; quantityAvailable?: number } | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedStoreId, isStoreView } = useStoreContext();
  const isManager = user?.role === 'MANAGER';
  const userStoreId = user?.storeId ?? null;
  const effectiveStoreId = isManager ? (selectedStoreId ?? undefined) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', effectiveStoreId, search],
    queryFn: () =>
      api
        .get('/inventory', {
          params: {
            ...(effectiveStoreId ? { store_id: effectiveStoreId } : {}),
            search: search || undefined,
          },
        })
        .then((r) => r.data),
  });

  const adjustStock = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { quantity_change: number; notes?: string } }) =>
      api.put(`/inventory/${id}/adjust`, { ...values, transaction_type: 'STOCK_IN' }),
    onSuccess: () => {
      message.success('Залихата е ажурирана');
      setAdjustModalOpen(false);
      setSelectedRow(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се ажурира залихата');
    },
  });

  const deleteInventory = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      message.success('Записот за залиха е избришан');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се избрише записот');
    },
  });

  const list = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];

  const isOwnStore = (record: { storeId?: string; store?: { id?: string } }) =>
    (record.storeId ?? record.store?.id) === userStoreId;

  const getCategoryName = (record: { variant?: { product?: { category?: { name?: string }; cat?: { name?: string } } } }) =>
    record?.variant?.product?.category?.name ?? record?.variant?.product?.cat?.name ?? '—';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: ColumnsType<any> = [
    { title: 'Категорија', key: 'category', width: 110, render: (_: unknown, record: { variant?: { product?: { category?: { name?: string }; cat?: { name?: string } } } }) => getCategoryName(record) },
    { title: 'Код', dataIndex: ['variant', 'product', 'sku'], key: 'code', width: 80 },
    { title: 'Боја', dataIndex: ['variant', 'color', 'name'], key: 'color', width: 90 },
    { title: 'Димензија', dataIndex: ['variant', 'dimension', 'displayName'], key: 'dimension', width: 90, render: (v: string) => v || '—' },
    ...(isManager && isStoreView ? [] : [{ title: 'Продавница', dataIndex: ['store', 'name'], key: 'store', width: 120 }]),
    { title: 'Достапно', dataIndex: 'quantityAvailable', key: 'available', width: 90, align: 'right' as const, render: (v: number) => +parseFloat(v?.toFixed(2)) },
    { title: 'Резервир.', dataIndex: 'quantityReserved', key: 'reserved', width: 85, align: 'right' as const, render: (v: number) => +parseFloat(v?.toFixed(2)) },
    { title: 'Реorder', dataIndex: 'reorderLevel', key: 'reorderLevel', width: 75, align: 'right' as const, render: (v: number) => +parseFloat(v?.toFixed(2)) },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) =>
        v === 'LOW_STOCK' ? <Tag color="orange">Мало</Tag> : v === 'OUT_OF_STOCK' ? <Tag color="red">Нема</Tag> : <Tag color="green">ОК</Tag>,
    },
    {
      title: 'Акции',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (
        _: unknown,
        record: { id: string; storeId?: string; store?: { id?: string; name?: string }; variant?: { variantSku?: string; product?: { name?: string }; color?: { name?: string } }; quantityAvailable?: number },
      ) => (
        <Space size={0} wrap={false}>
          {(isManager || isOwnStore(record)) && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedRow(record);
                setAdjustModalOpen(true);
                form.setFieldsValue({ quantity_change: 10, notes: '' });
              }}
            >
              Додај
            </Button>
          )}
          {!(isManager || isOwnStore(record)) && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Преглед</Typography.Text>}
          {isManager && (
            <Popconfirm
              title="Избриши запис за залиха?"
              description="Отстрани го овој запис за оваа варијанта во оваа продавница. Ова не може да се поврати."
              onConfirm={() => deleteInventory.mutate(record.id)}
              okText="Избриши"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Залиха</Typography.Title>
        <Input.Search
          placeholder="Пребарај по категорија, код, боја или продавница"
          allowClear
          onSearch={setSearch}
          style={{ width: '100%', maxWidth: 360 }}
        />
      </div>
      {isStoreView && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Преглед и уредување на залиха само за избраната продавница. Префрли на &quot;Сите продавници&quot; во заглавјето за да видите сè.
        </Typography.Paragraph>
      )}
      {!isManager && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Можете да ги прегледувате залихите на сите продавници. &quot;Додај залиха&quot; е достапно само за вашата продавница; останатите редови се само за преглед.
        </Typography.Paragraph>
      )}
      <Table
        loading={isLoading}
        dataSource={list}
        columns={columns}
        rowKey="id"
        scroll={{ x: 900 }}
        size="small"
      />

      <Modal
        title="Додај залиха"
        open={adjustModalOpen}
        onCancel={() => { setAdjustModalOpen(false); setSelectedRow(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={adjustStock.isPending}
        destroyOnClose
      >
        {selectedRow && (
          <p style={{ marginBottom: 16 }}>
            <strong>
              {[getCategoryName(selectedRow), selectedRow.variant?.product?.sku ?? '—', selectedRow.variant?.color?.name ?? '—'].join(' · ')}
              {selectedRow.store?.name && ` · ${selectedRow.store.name}`}
            </strong>
          </p>
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (selectedRow?.id) {
              adjustStock.mutate({ id: selectedRow.id, values: { quantity_change: values.quantity_change, notes: values.notes } });
            }
          }}
        >
          <Form.Item name="quantity_change" label="Количина за додавање" rules={[{ required: true }, { type: 'number', min: 0.01 }]}>
            <InputNumber min={0.01} step={0.1} precision={2} style={{ width: '100%' }} placeholder="пр. 13.8" />
          </Form.Item>
          <Form.Item name="notes" label="Забелешки (незадолжително)">
            <Input placeholder="пр. Пополнување од добавувач" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
