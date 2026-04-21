import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Typography,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  message,
} from 'antd';
import { ShoppingCartOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useStoreContext } from '../contexts/StoreContext';

const TAX_RATE = 0.09;
const PAYMENT_OPTIONS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Card', value: 'CARD' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
];

type CartLine = { variant_id: string; quantity: number; unit_price: number; label?: string };

export default function Orders() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const isManager = user?.role === 'MANAGER';
  const userStoreId = user?.storeId ?? null;
  const { selectedStoreId, isStoreView } = useStoreContext();
  const effectiveStoreForOrder = isManager ? (isStoreView ? selectedStoreId : null) : userStoreId;

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/stores').then((r) => r.data),
    enabled: isManager,
  });

  const storeIdForInventory = isManager
    ? (isStoreView ? selectedStoreId : Form.useWatch('store_id', form))
    : userStoreId;
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', storeIdForInventory],
    queryFn: () => api.get('/inventory', { params: { store_id: storeIdForInventory } }).then((r) => r.data),
    enabled: !!storeIdForInventory,
  });

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ['orders', effectiveStoreForOrder, search, page],
    queryFn: () =>
      api
        .get('/orders', {
          params: {
            ...(effectiveStoreForOrder ? { store_id: effectiveStoreForOrder } : {}),
            search: search || undefined,
            page,
            limit: 10,
          },
        })
        .then((r) => r.data),
  });

  const createOrder = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/orders', body),
    onSuccess: () => {
      message.success('Sale completed');
      setModalOpen(false);
      setCart([]);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Failed to complete sale');
    },
  });

  const inventoryOptions = useMemo(() => {
    const raw = inventory as unknown;
    const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'data' in raw ? (raw as { data: unknown[] }).data : []);
    const arr = Array.isArray(list) ? list : [];
    return arr.map((inv: {
      variantId: string;
      variant?: { product?: { name?: string; basePrice?: string; sku?: string; category?: { name?: string } }; color?: { name?: string }; dimension?: { displayName?: string }; priceModifier?: string };
      quantityAvailable?: number;
    }) => {
      const v = inv.variant;
      const base = Number(v?.product?.basePrice ?? 0);
      const mod = Number(v?.priceModifier ?? 0);
      const price = base + mod;
      const stock = inv.quantityAvailable ?? 0;
      const label = `${v?.product?.category?.name ?? '—'} · ${v?.product?.sku ?? '—'} · ${v?.color?.name ?? ''} · ${v?.dimension?.displayName ?? ''} | $${price.toFixed(2)} | Stock: ${stock}`;
      return { inv, variant_id: inv.variantId, label, unit_price: price };
    });
  }, [inventory]);

  const addCartLine = () => {
    if (!storeIdForInventory) {
      message.warning('Select a store first');
      return;
    }
    setCart((prev) => [...prev, { variant_id: '', quantity: 1, unit_price: 0 }]);
  };

  const removeCartLine = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const setCartLineVariant = (index: number, variantId: string) => {
    const opt = inventoryOptions.find((o) => o.variant_id === variantId);
    if (!opt) return;
    setCart((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], variant_id: variantId, unit_price: opt.unit_price, label: opt.label };
      return next;
    });
  };

  const setCartLineQty = (index: number, quantity: number) => {
    setCart((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity };
      return next;
    });
  };

  const setCartLinePrice = (index: number, unit_price: number) => {
    setCart((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], unit_price };
      return next;
    });
  };

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.quantity * line.unit_price, 0), [cart]);
  const discount = Form.useWatch('discount_amount', form) ?? 0;
  const tax = (subtotal - Number(discount)) * TAX_RATE;
  const total = subtotal - Number(discount) + tax;

  const handleCompleteSale = () => {
    form.validateFields().then((values) => {
      const store_id = isManager ? (isStoreView ? selectedStoreId : values.store_id) : userStoreId;
      if (!store_id) {
        message.error('Store is required');
        return;
      }
      const validLines = cart.filter((l) => l.variant_id && l.quantity > 0 && l.unit_price >= 0);
      if (validLines.length === 0) {
        message.error('Add at least one item to the sale');
        return;
      }
      createOrder.mutate({
        store_id,
        payment_method: values.payment_method || 'CASH',
        discount_amount: values.discount_amount ? Number(values.discount_amount) : 0,
        items: validLines.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity, unit_price: l.unit_price })),
      });
    }).catch(() => {});
  };

  const columns = [
    { title: 'Order #', dataIndex: 'orderNumber', key: 'orderNumber', width: 160 },
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
    { title: 'Store', dataIndex: ['store', 'name'], key: 'store' },
    { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: string) => `$${Number(v).toFixed(2)}` },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) =>
        v === 'COMPLETED' ? <Tag color="green">Completed</Tag> : v === 'CANCELLED' ? <Tag color="red">Cancelled</Tag> : <Tag>Pending</Tag>,
    },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString() },
  ];

  const ordersData = ordersResponse?.data ?? ordersResponse;
  const list = Array.isArray(ordersData) ? ordersData : [];
  const pagination = ordersResponse?.pagination;

  return (
    <div>
      {isStoreView && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Viewing orders for the selected store only. New sales will be recorded for this store. Switch to &quot;All stores&quot; in the header to see everything.
        </Typography.Paragraph>
      )}
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Orders (Sales)</Typography.Title>
        <Space>
          <Input.Search
            placeholder="Search by order # or customer"
            allowClear
            onSearch={(v) => { setSearch(v); setPage(1); }}
            style={{ width: 240 }}
          />
          <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => setModalOpen(true)}>
            New sale
          </Button>
        </Space>
      </Space>
      <Table
        loading={isLoading}
        dataSource={list}
        columns={columns}
        rowKey="id"
        pagination={
          pagination
            ? {
                current: pagination.page,
                total: pagination.total_items,
                pageSize: pagination.limit,
                onChange: setPage,
              }
            : false
        }
      />

      <Modal
        title="New sale (no payment integration — record only)"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setCart([]); form.resetFields(); }}
        onOk={handleCompleteSale}
        confirmLoading={createOrder.isPending}
        okText="Complete sale"
        width={640}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            payment_method: 'CASH',
            store_id: isStoreView ? selectedStoreId : undefined,
          }}
        >
          {isManager && !isStoreView && (
            <Form.Item name="store_id" label="Store" rules={[{ required: true }]}>
              <Select placeholder="Select store" options={stores.map((s: { id: string; name: string }) => ({ label: s.name, value: s.id }))} />
            </Form.Item>
          )}
        </Form>

        <Typography.Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>Items (cart)</Typography.Title>
        {!storeIdForInventory && isManager && (
          <Typography.Text type="secondary">Select a store to load items.</Typography.Text>
        )}
        {storeIdForInventory && inventoryOptions.length === 0 && !inventoryLoading && (
          <Typography.Text type="secondary">No items here yet. Add variants to your products (Products → open product → Add variant), then add stock from the Inventory page.</Typography.Text>
        )}
        {storeIdForInventory && (
          <>
            {cart.map((line, index) => (
              <Space key={index} align="start" style={{ marginBottom: 8, display: 'flex', width: '100%' }} wrap>
                <Select
                  placeholder="Select product variant"
                  options={inventoryOptions.map((o) => ({ label: o.label, value: o.variant_id }))}
                  value={line.variant_id || undefined}
                  onChange={(id) => setCartLineVariant(index, id)}
                  style={{ minWidth: 280 }}
                  showSearch
                  optionFilterProp="label"
                  loading={inventoryLoading}
                />
                <InputNumber
                  min={1}
                  value={line.quantity}
                  onChange={(n) => setCartLineQty(index, n ?? 1)}
                  placeholder="Qty"
                  style={{ width: 80 }}
                />
                <InputNumber
                  min={0}
                  step={0.01}
                  value={line.unit_price}
                  onChange={(n) => setCartLinePrice(index, n ?? 0)}
                  placeholder="Price"
                  style={{ width: 100 }}
                  prefix="$"
                />
                <span style={{ minWidth: 60 }}>${((line.quantity || 0) * (line.unit_price || 0)).toFixed(2)}</span>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeCartLine(index)} />
              </Space>
            ))}
            <Button type="dashed" onClick={addCartLine} icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
              Add item
            </Button>
          </>
        )}

        <Form form={form} layout="inline" style={{ marginBottom: 8 }}>
          <Form.Item name="payment_method" label="Payment (record only)">
            <Select options={PAYMENT_OPTIONS} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="discount_amount" label="Discount $">
            <InputNumber min={0} step={0.01} placeholder="0" style={{ width: 100 }} />
          </Form.Item>
        </Form>

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 12 }}>
          <Typography.Text>Subtotal: ${subtotal.toFixed(2)}</Typography.Text>
          <br />
          <Typography.Text>Tax (9%): ${tax.toFixed(2)}</Typography.Text>
          <br />
          <Typography.Text strong>Total: ${total.toFixed(2)}</Typography.Text>
        </div>
      </Modal>
    </div>
  );
}
