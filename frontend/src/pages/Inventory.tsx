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
  const userStoreId = (user as { storeId?: string }).storeId ?? (user as { store_id?: string }).store_id ?? null;
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
    { title: 'Категорија', key: 'category', width: 100, render: (_: unknown, record: { variant?: { product?: { category?: { name?: string }; cat?: { name?: string } } } }) => getCategoryName(record) },
    { title: 'Код', dataIndex: ['variant', 'product', 'sku'], key: 'code', width: 90 },
    { title: 'Боја', dataIndex: ['variant', 'color', 'name'], key: 'color', width: 100 },
    { title: 'Димензија', dataIndex: ['variant', 'dimension', 'displayName'], key: 'dimension', width: 90, render: (v: string) => v || '—' },
    ...(isManager && isStoreView ? [] : [{ title: 'Продавница', dataIndex: ['store', 'name'], key: 'store' }]),
    { title: 'Достапно', dataIndex: 'quantityAvailable', key: 'available', width: 100 },
    { title: 'Резервирано', dataIndex: 'quantityReserved', key: 'reserved', width: 100 },
    { title: 'Ниво за нарачка', dataIndex: 'reorderLevel', key: 'reorderLevel', width: 130 },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) =>
        v === 'LOW_STOCK' ? <Tag color="orange">Мало</Tag> : v === 'OUT_OF_STOCK' ? <Tag color="red">Нема</Tag> : <Tag color="green">ОК</Tag>,
    },
    {
      title: 'Акции',
      key: 'actions',
      width: 200,
      render: (
        _: unknown,
        record: { id: string; storeId?: string; store?: { id?: string; name?: string }; variant?: { variantSku?: string; product?: { name?: string }; color?: { name?: string } }; quantityAvailable?: number },
      ) => (
        <Space size="small">
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
              Додај залиха
            </Button>
          )}
          {!(isManager || isOwnStore(record)) && <Typography.Text type="secondary">Само за преглед</Typography.Text>}
          {isManager && (
            <Popconfirm
              title="Избриши запис за залиха?"
              description="Отстрани го овој запис за оваа варијанта во оваа продавница. Ова не може да се поврати."
              onConfirm={() => deleteInventory.mutate(record.id)}
              okText="Избриши"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>Избриши</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Залиха</Typography.Title>
        <Input.Search
          placeholder="Пребарај по категорија, код, боја или продавница"
          allowClear
          onSearch={setSearch}
          style={{ width: 320 }}
        />
      </Space>
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
      <Typography.Paragraph type="secondary">
        Користете &quot;Додај залиха&quot; на ред за да додадете количина. Залихата е по продавница и по варијанта на производ.
      </Typography.Paragraph>
      <Table loading={isLoading} dataSource={list} columns={columns} rowKey="id" />

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
          <Form.Item name="quantity_change" label="Количина за додавање" rules={[{ required: true }, { type: 'number', min: 1 }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="пр. 20" />
          </Form.Item>
          <Form.Item name="notes" label="Забелешки (незадолжително)">
            <Input placeholder="пр. Пополнување од добавувач" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
