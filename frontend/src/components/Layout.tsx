import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Dropdown, Avatar, Space, Typography, Select } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  InboxOutlined,
  BarChartOutlined,
  ShopOutlined,
  FolderOutlined,
  UserOutlined,
  LogoutOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useStoreContext } from '../contexts/StoreContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

const { Header, Sider, Content } = AntLayout;

const allMenuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Контролна табла' },
  { key: '/products', icon: <ShoppingOutlined />, label: 'Производи' },
  { key: '/inventory', icon: <InboxOutlined />, label: 'Залиха' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Извештаи' },
  { key: '/stores', icon: <ShopOutlined />, label: 'Продавници', managerOnly: true },
  { key: '/transfers', icon: <SwapOutlined />, label: 'Трансфери' },
  { key: '/categories', icon: <FolderOutlined />, label: 'Категории' },
  { key: '/users', icon: <UserOutlined />, label: 'Корисници', managerOnly: true },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { selectedStoreId, setSelectedStoreId, isStoreView } = useStoreContext();

  const isManager = user?.role === 'MANAGER';
  const items = allMenuItems.filter((item) => !('managerOnly' in item && item.managerOnly) || isManager);
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/stores').then((r) => r.data),
    enabled: isManager,
  });

  const storeOptions = [
    { value: '', label: 'Сите продавници (главен приказ)' },
    ...(Array.isArray(stores)
      ? stores.map((s: { id: string; name: string; code?: string }) => ({
          value: s.id,
          label: isStoreView && selectedStoreId === s.id ? `${s.name} ✓` : s.name,
        }))
      : []),
  ];

  const userMenu = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: 'Одјави се', danger: true, onClick: () => { logout(); navigate('/login'); } },
    ],
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{ height: 32, margin: 16, color: '#fff', fontWeight: 600, textAlign: 'center' }}>
          Xhan
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={items.map(({ managerOnly: _, ...item }) => item)}
          onClick={({ key }) => key && navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {isManager && (
            <Select
              value={selectedStoreId ?? ''}
              onChange={(v) => setSelectedStoreId(v || null)}
              options={storeOptions}
              placeholder="Избери продавница"
              style={{ minWidth: 220 }}
              allowClear
            />
          )}
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <Typography.Text>{user?.email} ({user?.role})</Typography.Text>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
