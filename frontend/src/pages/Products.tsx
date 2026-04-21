import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Input, Button, Space, Typography, Tag, Modal, Form, InputNumber, Select, message, Alert, Popconfirm } from 'antd';

import { PlusOutlined, AppstoreOutlined, ShopOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useStoreContext } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';

export default function Products() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Record<string, unknown> | null>(null);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showNewDimension, setShowNewDimension] = useState(false);
  const [form] = Form.useForm();
  const [variantForm] = Form.useForm();
  const [newDimensionForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isStoreView, selectedStoreId } = useStoreContext();
  const isManager = user?.role === 'MANAGER';
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/stores').then((r) => r.data),
    enabled: isManager && isStoreView,
  });
  const selectedStore = Array.isArray(stores) ? stores.find((s: { id: string }) => s.id === selectedStoreId) : null;
  const storeName = (selectedStore as { name?: string })?.name ?? selectedStoreId;

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, page, limit: 10 }],
    queryFn: () =>
      api.get('/products', { params: { search: search || undefined, page, limit: 10 } }).then((r) => r.data),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { data: colors = [] } = useQuery({
    queryKey: ['colors'],
    queryFn: () => api.get('/products/colors').then((r) => r.data),
  });

  const { data: dimensions = [] } = useQuery({
    queryKey: ['dimensions'],
    queryFn: () => api.get('/products/dimensions').then((r) => r.data),
  });

  const { data: productDetail, isLoading: productDetailLoading } = useQuery({
    queryKey: ['product', selectedProductId],
    queryFn: () => api.get(`/products/${selectedProductId}`, { params: { include: 'variants' } }).then((r) => r.data),
    enabled: !!selectedProductId && variantModalOpen,
    refetchOnMount: 'always',
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) => api.put(`/products/${id}`, values),
    onSuccess: () => {
      message.success('Производот е ажуриран');
      setModalOpen(false);
      setEditingProduct(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се ажурира производот');
    },
  });

  const createProduct = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post('/products', values),
    onSuccess: () => {
      message.success('Производот е создаден');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се создаде производот');
    },
  });

  const createVariant = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload: Record<string, unknown> = {
        dimension_id: values.dimension_id,
        weight: values.weight,
      };
      if (values.color_name && String(values.color_name).trim()) {
        payload.color_name = values.color_name;
      } else if (values.color_id) {
        payload.color_id = values.color_id;
      }
      return api.post(`/products/${selectedProductId}/variants`, payload);
    },
    onSuccess: () => {
      message.success('Варијантата е додадена');
      variantForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['colors'] });
    },
    onError: (err: { response?: { data?: { message?: string }; status?: number } }) => {
      const msg = err.response?.data?.message || 'Не успеа да се додаде варијанта';
      if (err.response?.status === 409) {
        message.warning(msg + ' Провери ја листата горе — можеби веќе постои.');
        queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] });
      } else {
        message.error(msg);
      }
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      message.success('Производот е избришан');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се избрише производот');
    },
  });

  const createDimension = useMutation({
    mutationFn: (values: { width: number; length: number; unit: string; display_name?: string }) =>
      api.post('/products/dimensions', {
        width: values.width,
        length: values.length,
        unit: values.unit,
        display_name: values.display_name || `${values.width} x ${values.length} ${values.unit === 'METERS' ? 'm' : 'ft'}`,
      }),
    onSuccess: (res: { data?: { id?: string } }) => {
      message.success('Димензијата е додадена');
      newDimensionForm.resetFields();
      setShowNewDimension(false);
      queryClient.invalidateQueries({ queryKey: ['dimensions'] });
      if (res?.data?.id) variantForm.setFieldValue('dimension_id', res.data.id);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се додаде димензија');
    },
  });

  const openEditModal = (record: Record<string, unknown>) => {
    setEditingProduct(record);
    form.setFieldsValue({
      sku: record.sku,
      name: record.name,
      description: record.description,
      category_id: (record.category as { id?: string })?.id ?? record.categoryId,
      brand: record.brand,
      material: record.material,
    });
    setModalOpen(true);
  };

  const openVariantModal = (productId: string) => {
    setSelectedProductId(productId);
    setVariantModalOpen(true);
    setShowNewDimension(false);
    variantForm.resetFields();
    newDimensionForm.resetFields();
    queryClient.invalidateQueries({ queryKey: ['product', productId] });
  };

  const columns = [
    { title: 'Категорија', dataIndex: ['category', 'name'], key: 'category', width: 120, render: (v: string) => v || '-' },
    { title: 'Код', dataIndex: 'sku', key: 'code', width: 100 },
    { title: 'Ime', dataIndex: 'name', key: 'name' },
    { title: 'Статус', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => (v ? <Tag color="green">Активен</Tag> : <Tag>Неактивен</Tag>) },
    {
      title: 'Акции',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: { id: string; name?: string }) => (
        <Space size="small">
          <Button type="link" size="small" icon={<AppstoreOutlined />} onClick={() => openVariantModal(record.id)}>
            Варијанти
          </Button>
          {isManager && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record as Record<string, unknown>)}>
              Уреди
            </Button>
          )}
          {isManager && (
            <Popconfirm
              title="Избриши производ?"
              description={`Избриши "${record.name ?? record.id}"? Ова ќе го отстрани производот и неговите варијанти.`}
              onConfirm={() => deleteProduct.mutate(record.id)}
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

  const categoryOptions = Array.isArray(categories)
    ? categories.map((c: { id: string; name: string }) => ({ label: c.name, value: c.id }))
    : [];

  return (
    <div>
      {isManager && isStoreView && (
        <Alert
          type="info"
          showIcon
          icon={<ShopOutlined />}
          message={`Контекст на продавница: ${storeName}`}
          description="Залихата и новите продажби се за оваа продавница. Додај производи/варијанти тука; залихата е за оваа продавница додека не се врати на 'Сите продавници' во заглавјето."
          style={{ marginBottom: 16 }}
        />
      )}
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Производи</Typography.Title>
        <Space>
          <Input.Search placeholder="Пребарај производи" allowClear onSearch={setSearch} onChange={(e) => !e.target.value && setSearch('')} style={{ width: 200 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Додај производ
          </Button>
        </Space>
      </Space>
      <Table
        loading={isLoading}
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        pagination={{
          current: page,
          total: data?.pagination?.total_items ?? 0,
          pageSize: 10,
          onChange: setPage,
        }}
      />

      <Modal
        title={editingProduct ? 'Уреди производ' : 'Додај производ'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingProduct(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createProduct.isPending || updateProduct.isPending}
        destroyOnHidden
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (editingProduct) {
              updateProduct.mutate({ id: editingProduct.id as string, values });
            } else {
              createProduct.mutate(values);
            }
          }}
        >
          <Form.Item name="sku" label="Код на производ" rules={[{ required: true }]}>
            <Input placeholder="пр. TH-001" />
          </Form.Item>
          <Form.Item name="name" label="Ime" rules={[{ required: true }]}>
            <Input placeholder="Ime на производ" />
          </Form.Item>
          <Form.Item name="description" label="Опис">
            <Input.TextArea rows={2} placeholder="Незадолжително" />
          </Form.Item>
          <Form.Item name="category_id" label="Категорија" rules={[{ required: true, message: 'Избери категорија' }]}>
            <Select placeholder="Избери категорија" options={categoryOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="brand" label="Бренд">
            <Input placeholder="Незадолжително" />
          </Form.Item>
          <Form.Item name="material" label="Материјал">
            <Input placeholder="пр. Волна, Синтетика" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={productDetail ? `Варијанти: ${productDetail.name}` : 'Варијанти'}
        open={variantModalOpen}
        onCancel={() => { setVariantModalOpen(false); setSelectedProductId(null); variantForm.resetFields(); }}
        footer={null}
        width={640}
        destroyOnHidden
      >
        {productDetailLoading && <Typography.Text>Се вчитува...</Typography.Text>}
        {productDetail && !productDetailLoading && (
          <>
            <Typography.Paragraph type="secondary">
              {productDetail.category?.name ?? '—'} · Код: {productDetail.sku}
            </Typography.Paragraph>
            {productDetail.variants?.length > 0 ? (
              <>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Сите варијанти за овој производ (листата се освежува при отворање на прозорецот).
                </Typography.Text>
                <Table
                  size="small"
                  dataSource={productDetail.variants}
                  rowKey="id"
                  columns={[
                    { title: 'Категорија', key: 'category', width: 100, render: () => productDetail.category?.name ?? '—' },
                    { title: 'Код', key: 'code', width: 80, render: () => productDetail.sku },
                    { title: 'Боја', dataIndex: ['color', 'name'], key: 'color' },
                    { title: 'Димензија', dataIndex: ['dimension', 'displayName'], key: 'dimension' },
                  ]}
                  pagination={false}
                  style={{ marginBottom: 16 }}
                />
              </>
            ) : (
              <Typography.Text type="secondary">Нема варијанти. Додај една подолу.</Typography.Text>
            )}

            <Typography.Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>Додај варијанта</Typography.Title>
            <Form
              form={variantForm}
              layout="vertical"
              onFinish={(values) => {
                if (!values.color_id && !(values.color_name && String(values.color_name).trim())) {
                  message.error('Избери боја или внеси нова');
                  return;
                }
                createVariant.mutate(values);
              }}
            >
              <Form.Item name="color_id" label="Боја">
                <Select
                  placeholder="Избери од листата или внеси нова подолу"
                  allowClear
                  options={Array.isArray(colors) ? colors.map((c: { id: string; name: string; colorCode?: string }) => ({ label: c.name, value: c.id })) : []}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item name="color_name" label="Или внеси нова боја">
                <Input placeholder="пр. Морнарско сино, Бежа" />
              </Form.Item>
              <Form.Item name="dimension_id" label="Димензија" rules={[{ required: true, message: 'Избери димензија или додај нова подолу' }]}>
                <Select
                  placeholder="Избери димензија"
                  options={Array.isArray(dimensions) ? dimensions.map((d: { id: string; displayName: string }) => ({ label: d.displayName, value: d.id })) : []}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
              {!showNewDimension ? (
                <Form.Item>
                  <Button type="link" size="small" onClick={() => setShowNewDimension(true)} style={{ padding: 0 }}>
                    + Додај нова димензија
                  </Button>
                </Form.Item>
              ) : (
                <>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Нова димензија
                  </Typography.Text>
                  <Form
                    form={newDimensionForm}
                    layout="vertical"
                    onFinish={(v) => createDimension.mutate(v)}
                  >
                    <Space align="start" style={{ width: '100%' }} wrap>
                      <Form.Item name="width" label="Ширина" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                        <InputNumber min={0.01} step={0.01} placeholder="2" style={{ width: 80 }} />
                      </Form.Item>
                      <Form.Item name="length" label="Должина" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                        <InputNumber min={0.01} step={0.01} placeholder="3" style={{ width: 80 }} />
                      </Form.Item>
                      <Form.Item name="unit" label="Единица" rules={[{ required: true }]} style={{ marginBottom: 8 }} initialValue="METERS">
                        <Select options={[{ label: 'Метри', value: 'METERS' }, { label: 'Стапки', value: 'FEET' }]} style={{ width: 100 }} />
                      </Form.Item>
                      <Form.Item name="display_name" label="Ime на приказ (незадолжително)" style={{ marginBottom: 8 }}>
                        <Input placeholder="пр. 2 x 3 м" style={{ width: 120 }} />
                      </Form.Item>
                      <Form.Item style={{ marginBottom: 8 }}>
                        <Space>
                          <Button
                            type="primary"
                            size="small"
                            loading={createDimension.isPending}
                            onClick={(e) => { e.stopPropagation(); newDimensionForm.submit(); }}
                          >
                            Создај
                          </Button>
                          <Button size="small" onClick={() => { setShowNewDimension(false); newDimensionForm.resetFields(); }}>
                            Откажи
                          </Button>
                        </Space>
                      </Form.Item>
                    </Space>
                  </Form>
                </>
              )}
              <Form.Item name="weight" label="Тежина (незадолжително)">
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="Незадолжително" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={createVariant.isPending}>
                  Додај варијанта
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
