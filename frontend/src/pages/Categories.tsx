import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Typography, Tag, Input, Space, Button, Modal, Form, InputNumber, Switch, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function Categories() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isManager = user?.role === 'MANAGER';

  const { data, isLoading } = useQuery({
    queryKey: ['categories', search],
    queryFn: () => api.get('/categories', { params: { search: search || undefined } }).then((r) => r.data),
  });

  const createCategory = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post('/categories', values),
    onSuccess: () => {
      message.success('Категоријата е создадена');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се создаде категорија');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      message.success('Категоријата е избришана');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err.response?.data?.message || 'Не успеа да се избрише категоријата');
    },
  });

  const columns = [
    { title: 'Име', dataIndex: 'name', key: 'name' },
    { title: 'Слаг', dataIndex: 'slug', key: 'slug' },
    { title: 'Редослед', dataIndex: 'displayOrder', key: 'displayOrder', width: 90 },
    { title: 'Статус', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => (v ? <Tag color="green">Активна</Tag> : <Tag>Неактивна</Tag>) },
    ...(isManager
      ? [
          {
            title: 'Акции',
            key: 'actions',
            width: 100,
            render: (_: unknown, record: { id: string; name: string }) => (
              <Popconfirm
                title="Избриши категорија?"
                description={`Избриши "${record.name}"?`}
                onConfirm={() => deleteCategory.mutate(record.id)}
                okText="Избриши"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>Избриши</Button>
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  const list = Array.isArray(data) ? data : [];

  const handleSubmit = (values: Record<string, unknown>) => {
    createCategory.mutate({
      name: values.name,
      slug: values.slug || undefined,
      description: values.description || undefined,
      parent_id: values.parent_id || null,
      display_order: values.display_order ?? 0,
      is_active: values.is_active ?? true,
    });
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Категории</Typography.Title>
        <Space>
          <Input.Search placeholder="Пребарај по ime или слаг" allowClear onSearch={setSearch} style={{ width: 240 }} />
          {isManager && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              Додај категорија
            </Button>
          )}
        </Space>
      </Space>
      <Table loading={isLoading} dataSource={list} columns={columns} rowKey="id" />

      {isManager && (
        <Modal
          title="Додај категорија"
          open={modalOpen}
          onCancel={() => { setModalOpen(false); form.resetFields(); }}
          footer={null}
          width={480}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ display_order: 0, is_active: true }}>
            <Form.Item name="name" label="Име" rules={[{ required: true, message: 'Името е задолжително' }]}>
              <Input placeholder="пр. Персиски килими" />
            </Form.Item>
            <Form.Item name="slug" label="Слаг (незадолжително)">
              <Input placeholder="пр. persiski-kilimi (остави празно за автоматска генерација)" />
            </Form.Item>
            <Form.Item name="description" label="Опис">
              <Input.TextArea rows={2} placeholder="Незадолжителен опис" />
            </Form.Item>
            <Form.Item name="parent_id" label="Надредена категорија">
              <Select
                allowClear
                placeholder="Без (главна)"
                options={[{ value: '', label: 'Без (главна)' }, ...list.map((c: { id: string; name: string }) => ({ value: c.id, label: c.name }))]}
              />
            </Form.Item>
            <Form.Item name="display_order" label="Редослед на приказ">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="is_active" label="Активна" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={createCategory.isPending}>
                  Создај
                </Button>
                <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Откажи</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
}
