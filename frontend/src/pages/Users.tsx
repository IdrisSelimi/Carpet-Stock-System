import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Typography, Tag, Button, Modal, Form, Input, Select, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const ROLES = [
  { value: 'MANAGER', label: 'Менаџер (сопственик на продавница)' },
  { value: 'STORE_WORKER', label: 'Вработен во продавница' },
];

export default function Users() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  if (user?.role !== 'MANAGER') return <Navigate to="/dashboard" replace />;

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => api.get('/users', { params: { search: search || undefined } }).then((r) => r.data),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/stores').then((r) => r.data),
  });

  const createUser = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post('/users', values),
    onSuccess: () => {
      message.success('Корисникот е создаден');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се создаде корисник');
    },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      message.success('Корисникот е деактивиран');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се деактивира корисникот');
    },
  });

  const columns = [
    { title: 'Е-пошта', dataIndex: 'email', key: 'email' },
    { title: 'Ime', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Презиме', dataIndex: 'lastName', key: 'lastName' },
    { title: 'Улога', dataIndex: 'role', key: 'role', render: (v: string) => <Tag>{v === 'MANAGER' ? 'Менаџер' : 'Вработен'}</Tag> },
    { title: 'Продавница', dataIndex: ['store', 'name'], key: 'store', render: (v: string) => v || '-' },
    { title: 'Активен', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => (v ? <Tag color="green">Да</Tag> : <Tag>Не</Tag>) },
    {
      title: 'Акции',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: { id: string; email: string }) => (
        <Popconfirm
          title="Деактивирај корисник?"
          description={`Деактивирај "${record.email}"? Нема да можат повеќе да се најавуваат.`}
          onConfirm={() => deleteUser.mutate(record.id)}
          okText="Деактивирај"
          okButtonProps={{ danger: true }}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>Избриши</Button>
        </Popconfirm>
      ),
    },
  ];

  const list = Array.isArray(data) ? data : [];
  const storeOptions = Array.isArray(stores)
    ? stores.map((s: { id: string; name: string }) => ({ label: `${s.name} (${(s as { code?: string }).code || s.id})`, value: s.id }))
    : [];

  const handleSubmit = (values: Record<string, unknown>) => {
    createUser.mutate({
      email: values.email,
      password: values.password,
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone || undefined,
      role: values.role,
      store_id: values.role === 'STORE_WORKER' ? values.store_id : undefined,
    });
  };

  const role = Form.useWatch('role', form);

  return (
    <div>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Корисници</Typography.Title>
        <Space>
          <Input.Search placeholder="Пребарај по ime или е-пошта" allowClear onSearch={setSearch} style={{ width: 240 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Додај корисник
          </Button>
        </Space>
      </Space>
      <Table loading={isLoading} dataSource={list} columns={columns} rowKey="id" />

      <Modal
        title="Додај корисник (вработен)"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="email" label="Е-пошта" rules={[{ required: true }, { type: 'email' }]}>
            <Input placeholder="worker@example.com" />
          </Form.Item>
          <Form.Item name="password" label="Лозинка" rules={[{ required: true }, { min: 8, message: 'Најмалку 8 знаци' }]}>
            <Input.Password placeholder="Мин 8 знаци" />
          </Form.Item>
          <Form.Item name="first_name" label="Ime" rules={[{ required: true }]}>
            <Input placeholder="Ime" />
          </Form.Item>
          <Form.Item name="last_name" label="Презиме" rules={[{ required: true }]}>
            <Input placeholder="Презиме" />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input placeholder="Телефон (незадолжително)" />
          </Form.Item>
          <Form.Item name="role" label="Улога" rules={[{ required: true }]}>
            <Select placeholder="Избери улога" options={ROLES} />
          </Form.Item>
          <Form.Item
            name="store_id"
            label="Додели на продавница"
            rules={role === 'STORE_WORKER' ? [{ required: true, message: 'Вработените мора да бидат доделени на продавница' }] : []}
          >
            <Select
              placeholder={role === 'STORE_WORKER' ? 'Избери продавница' : 'Незадолжително за менаџер'}
              allowClear
              options={storeOptions}
              disabled={!role}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createUser.isPending}>Создај корисник</Button>
              <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Откажи</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
