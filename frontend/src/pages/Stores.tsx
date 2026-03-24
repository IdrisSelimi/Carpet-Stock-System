import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Typography, Tag, Button, Modal, Form, Input, Switch, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function Stores() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  if (user?.role !== 'MANAGER') return <Navigate to="/dashboard" replace />;

  const { data, isLoading } = useQuery({
    queryKey: ['stores', search],
    queryFn: () => api.get('/stores', { params: { search: search || undefined } }).then((r) => r.data),
  });

  const createStore = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post('/stores', values),
    onSuccess: () => {
      message.success('Продавницата е создадена');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се создаде продавница');
    },
  });

  const deleteStore = useMutation({
    mutationFn: (id: string) => api.delete(`/stores/${id}`),
    onSuccess: () => {
      message.success('Продавницата е деактивирана');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се деактивира продавницата');
    },
  });

  const columns = [
    { title: 'Код', dataIndex: 'code', key: 'code', width: 120 },
    { title: 'Име', dataIndex: 'name', key: 'name' },
    { title: 'Град', dataIndex: 'city', key: 'city' },
    { title: 'Земја', dataIndex: 'country', key: 'country' },
    { title: 'Статус', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => (v ? <Tag color="green">Активна</Tag> : <Tag>Неактивна</Tag>) },
    {
      title: 'Акции',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: { id: string; name: string }) => (
        <Popconfirm
          title="Деактивирај продавница?"
          description={`Деактивирај "${record.name}"?`}
          onConfirm={() => deleteStore.mutate(record.id)}
          okText="Деактивирај"
          okButtonProps={{ danger: true }}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>Избриши</Button>
        </Popconfirm>
      ),
    },
  ];

  const list = Array.isArray(data) ? data : [];

  const handleSubmit = (values: Record<string, unknown>) => {
    createStore.mutate({
      name: values.name,
      code: values.code,
      address: values.address || undefined,
      city: values.city || undefined,
      state_province: values.state_province || undefined,
      postal_code: values.postal_code || undefined,
      country: values.country || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      is_active: values.is_active ?? true,
    });
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Продавници</Typography.Title>
        <Space>
          <Input.Search placeholder="Пребарај по ime, код, град, земја" allowClear onSearch={setSearch} style={{ width: 280 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Додај продавница
          </Button>
        </Space>
      </Space>
      <Table loading={isLoading} dataSource={list} columns={columns} rowKey="id" />

      <Modal
        title="Додај продавница"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Име на продавница" rules={[{ required: true }]}>
            <Input placeholder="пр. Центар Шоурум" />
          </Form.Item>
          <Form.Item name="code" label="Код на продавница" rules={[{ required: true }]}>
            <Input placeholder="пр. ПРОДАВНИЦА-01" />
          </Form.Item>
          <Form.Item name="address" label="Адреса">
            <Input placeholder="Улица" />
          </Form.Item>
          <Form.Item name="city" label="Град">
            <Input placeholder="Град" />
          </Form.Item>
          <Form.Item name="state_province" label="Регион / Покраина">
            <Input placeholder="Регион или покраина" />
          </Form.Item>
          <Form.Item name="postal_code" label="Поштенски код">
            <Input placeholder="Поштенски / ZIP код" />
          </Form.Item>
          <Form.Item name="country" label="Земја">
            <Input placeholder="Земја" />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input placeholder="Телефонски број" />
          </Form.Item>
          <Form.Item name="email" label="Е-пошта">
            <Input type="email" placeholder="prodavnica@example.com" />
          </Form.Item>
          <Form.Item name="is_active" label="Активна" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createStore.isPending}>Создај продавница</Button>
              <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Откажи</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
