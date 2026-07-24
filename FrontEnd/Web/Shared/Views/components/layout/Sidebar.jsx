import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import "@assets/sidebar.css";
import amandaPhoto from '@mobile/assets/logo-no-bg.png';

/**
 * View: Component Sidebar tái sử dụng & linh hoạt trạng thái
 * Cập nhật cấu trúc menu đa phân hệ và đa cấp hoàn chỉnh theo sơ đồ thiết kế mới nhất.
 */
export const menuStructure = [
  {
    id: 'dashboard',
    type: 'link',
    path: '/admin/dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    text: 'Trang chủ'
  },
  {
    id: 'system',
    type: 'group',
    text: 'Quản lý hệ thống',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    children: [
      {
        id: 'monitor',
        path: '/admin/monitor',
        text: 'Giám sát hệ thống',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )
      },
      {
        id: 'screens',
        path: '/admin/screens',
        text: 'Danh sách màn hình',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
          </svg>
        )
      },
      {
        id: 'screen-bugs',
        permissionKey: 'bugs',
        path: '/admin/screens/bugs',
        text: 'Quản lý lỗi màn hình',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <path d="M21 9.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5" />
            <path d="M3 10h18" />
            <path d="M16 19h6" />
            <path d="M19 16v6" />
          </svg>
        )
      },
      {
        id: 'screen-progress',
        permissionKey: 'screens',
        path: '/admin/screens/progress',
        text: 'Tiến độ dự án',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        )
      },
      {
        id: 'feedback',
        path: '/admin/feedback',
        text: 'Theo dõi góp ý',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        )
      },
      {
        id: 'data',
        path: '/admin/data',
        text: 'Đóng gói dữ liệu',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        )
      },
      {
        id: 'accounts',
        permissionKey: 'users',
        path: '/admin/users',
        text: 'Quản lý tài khoản',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )
      }
    ]
  },
  {
    id: 'hr-management',
    type: 'group',
    text: 'Quản lý nhân sự',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    children: [
      {
        id: 'hr-org-chart',
        permissionKey: 'users',
        path: '/admin/hr/org-chart',
        text: 'Sơ đồ tổ chức',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        )
      },
      {
        id: 'hr-employees',
        permissionKey: 'users',
        path: '/admin/hr/employees',
        text: 'Danh sách nhân viên',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
        )
      },
      {
        id: 'hr-positions',
        permissionKey: 'users',
        path: '/admin/users/positions',
        text: 'Quản lý chức vụ',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
          </svg>
        )
      },
      {
        id: 'hr-departments',
        permissionKey: 'users',
        path: '/admin/users/departments',
        text: 'Quản lý phòng ban',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )
      }
    ]
  },
  {
    id: 'iso-records',
    type: 'group',
    text: 'Hồ sơ ISO',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
    children: [
      {
        id: 'iso-documents',
        path: '/admin/iso-documents',
        text: 'Quản lý mẫu tài liệu',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        )
      },
      {
        id: 'iso-processes',
        path: '/admin/iso-processes',
        text: 'Quy trình nghiệp vụ',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        )
      }
    ]
  },
  {
    id: 'manufacture',
    type: 'group',
    text: 'Quản lý sản xuất',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    children: [
      {
        id: 'plan',
        path: '/admin/plan',
        text: 'Kế hoạch sản xuất',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M9 16l2 2 4-4" />
          </svg>
        )
      },
      {
        id: 'delivery-tracking',
        path: '/admin/delivery-tracking',
        text: 'Kế hoạch bàn giao',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        )
      },
      {
        id: 'exception-deliveries',
        path: '/admin/exception-deliveries',
        text: 'Phiếu ngoại lệ',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )
      },
      {
        id: 'home',
        path: '/admin/manufacture-dashboard',
        text: 'Trang chủ sản xuất',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )
      },
      {
        id: 'backup-qrs',
        path: '/admin/backup-qrs',
        text: 'Quản lý mã QR',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="6" height="6" />
            <rect x="15" y="3" width="6" height="6" />
            <rect x="3" y="15" width="6" height="6" />
            <rect x="15" y="15" width="6" height="6" />
            <path d="M9 9h6v6H9z" />
          </svg>
        )
      }
    ]
  },
  {
    id: 'quality',
    type: 'group',
    text: 'Quản lý chất lượng',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
    children: [
      {
        id: 'quality-records',
        path: '/admin/quality-records',
        text: 'Hồ sơ chất lượng',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="11" r="3" />
            <path d="M17 17v-1a2 2 0 0 0-2-2h-3" />
            <line x1="16" y1="8" x2="18" y2="8" />
            <line x1="16" y1="11" x2="18" y2="11" />
          </svg>
        )
      },
      {
        id: 'defects',
        path: '/admin/defects',
        text: 'Danh sách lỗi',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )
      },
      {
        id: 'claim',
        path: '/admin/claims',
        text: 'Claim khách hàng',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="14" x2="12.01" y2="14" />
          </svg>
        )
      },
      {
        id: 'feedback',
        path: '/admin/feedback?type=quality',
        text: 'Quản lý CAPA',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )
      },
      {
        id: 'reports',
        path: '/admin/reports',
        text: 'Báo cáo kiểm tra',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M9 14l2 2 4-4" />
          </svg>
        )
      },
      {
        id: 'handovers',
        path: '/admin/handovers',
        text: 'Danh sách bàn giao',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <line x1="12" y1="11" x2="16" y2="11" />
            <line x1="12" y1="16" x2="16" y2="16" />
            <circle cx="8" cy="11" r="1" />
            <circle cx="8" cy="16" r="1" />
          </svg>
        )
      },
      {
        id: 'hotspots',
        path: '/admin/hotspots',
        text: 'Điểm nóng cần chú ý',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        )
      },
      {
        id: 'equipment',
        path: '/admin/equipment',
        text: 'Quản lý thiết bị',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        )
      },
      {
        id: 'logs',
        path: '/admin/logs',
        text: 'Nhật ký sự cố',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        )
      }
    ]
  },
  {
    id: 'business',
    type: 'group',
    text: 'Quản lý kinh doanh',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    children: [
      {
        id: 'shipments',
        path: '/admin/shipments',
        text: 'Thời gian xuất cont',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
            <line x1="6" y1="3" x2="6" y2="17" />
            <line x1="12" y1="3" x2="12" y2="17" />
            <line x1="18" y1="3" x2="18" y2="17" />
          </svg>
        )
      },
      {
        id: 'prices',
        path: '/admin/prices',
        text: 'Quản lý giá tủ',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        )
      },
      {
        id: 'purchase-requisitions',
        path: '/admin/purchase-requisitions',
        text: 'Đơn đặt mua',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        )
      },
      {
        id: 'purchase-order-items',
        path: '/admin/purchase-order-items',
        text: 'Đơn mua hàng',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        )
      }
    ]
  },
  {
    id: 'technical',
    type: 'group',
    text: 'Quản lý kỹ thuật',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
    children: [
      {
        id: 'products',
        path: '/admin/products',
        text: 'Bom sản phẩm',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        )
      }
    ]
  },
  {
    id: 'maintenance',
    type: 'group',
    text: 'Bảo trì - cơ sở hạ tầng',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    children: [
      {
        id: 'machines',
        path: '/admin/machines',
        text: 'Danh sách thiết bị',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        )
      },
      {
        id: 'machines-history',
        path: '/admin/machines/history',
        text: 'Lịch sử bảo trì',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )
      },
      {
        id: 'machines-training',
        path: '/admin/machines/training',
        text: 'Hướng dẫn sử dụng',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        )
      },
      {
        id: 'equipment-categories',
        path: '/admin/equipment/categories',
        text: 'Danh mục thiết bị',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        )
      },
      {
        id: 'equipment-history',
        path: '/admin/equipment/history',
        text: 'Lịch sử thiết bị',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )
      },
      {
        id: 'equipment-training',
        path: '/admin/equipment/training',
        text: 'Đào tạo thiết bị',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        )
      }
    ]
  },
  {
    id: 'kpi',
    type: 'group',
    text: 'Quản lý KPI',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    children: [
      {
        id: 'kpi-reports',
        path: '/admin/kpi',
        text: 'Báo cáo KPI',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M9 14l2 2 4-4" />
          </svg>
        )
      },
      {
        id: 'kpi-checklist',
        path: '/admin/kpi/checklist',
        text: 'Checklist KPI',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        )
      },
      {
        id: 'kpi-list',
        path: '/admin/kpi/list',
        text: 'Danh sách KPI',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        )
      },
      {
        id: 'kpi-rules',
        path: '/admin/kpi/rules',
        text: 'Quy tắc KPI',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        )
      },
      {
        id: 'kpi-feedback',
        path: '/admin/kpi/feedback',
        text: 'Phản hồi KPI',
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="9" y1="10" x2="15" y2="10" />
            <line x1="12" y1="7" x2="12" y2="13" />
          </svg>
        )
      }
    ]
  }
];

const Sidebar = ({ active, collapsed, onToggleCollapse, onLogout, onClose, uploads = [] }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const user = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const isAdmin = user.role_name === 'IT' || user.role_name === 'BGD' || user.username === 'admin';

  let activePermissions = {};
  try {
    activePermissions = JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
  } catch (e) {
    console.error('Failed to parse screen permissions in Sidebar:', e);
  }

  // Debug sidebar permissions to help troubleshoot
  console.log('--- SMARTFLOW SIDEBAR DEBUG ---');
  console.log('User profile:', user);
  console.log('Is Admin:', isAdmin);
  console.log('Active Permissions count:', Object.keys(activePermissions).length);
  console.log('Active Permissions keys:', Object.keys(activePermissions));
  console.log('Active Permissions Object:', activePermissions);

  const isBlocked = (item) => {
    if (isAdmin) return false;
    const key = item.permissionKey || item.id;
    const perm = activePermissions[key];
    if (perm === 'none') return true;
    if (Array.isArray(perm)) {
      return perm.length === 0 || perm.includes('none');
    }
    // Default to blocked if not defined in permissions map
    return perm === undefined || perm === null;
  };

  // Helper to check if a route is active
  const checkIsActive = (item) => {
    const hasQuery = item.path.includes('?');
    if (hasQuery) {
      return (location.pathname + location.search) === item.path;
    }

    // 1. Exact match
    if (location.pathname === item.path) {
      return true;
    }

    // 2. Prefix match
    if (item.path !== '/admin/dashboard' && 
        item.path !== '/admin/manufacture-dashboard' && 
        (location.pathname.startsWith(item.path + '/') || location.pathname.startsWith(item.path + '?'))) {

      // Check if there is another item in the sidebar that matches the pathname exactly
      let hasExactMatchSibling = false;
      for (const group of menuStructure) {
        if (group.type === 'link') {
          if (location.pathname === group.path) {
            hasExactMatchSibling = true;
            break;
          }
        } else if (group.type === 'group' && group.children) {
          for (const child of group.children) {
            if (location.pathname === child.path) {
              hasExactMatchSibling = true;
              break;
            }
          }
        }
        if (hasExactMatchSibling) break;
      }

      return !hasExactMatchSibling;
    }

    return false;
  };

  // Helper check xem group co child nao dang active ko
  const hasActiveChild = (group) => {
    if (!group.children) return false;
    return group.children.some(child => checkIsActive(child));
  };

  // Khoi tao state expand cho cac group
  const getInitialExpandedState = () => {
    const initialState = {};

    // Mặc định expand theo bộ phận của tài khoản người dùng
    const role = user.role_name;
    if (role === 'IT' || user.username === 'admin') {
      initialState['system'] = true;
      initialState['hr-management'] = true;
    } else if (role === 'Sx') {
      initialState['manufacture'] = true;
    } else if (role === 'QLCL') {
      initialState['quality'] = true;
    } else if (role === 'NS' || role === 'HR') {
      initialState['hr-management'] = true;
    }

    menuStructure.forEach(group => {
      if (group.type === 'group') {
        const hasActive = hasActiveChild(group);
        if (hasActive) {
          initialState[group.id] = true;
        }
      }
    });
    return initialState;
  };

  const [expandedGroups, setExpandedGroups] = React.useState(getInitialExpandedState);

  // Auto expand group khi location thay doi
  React.useEffect(() => {
    let activeGroupId = null;
    menuStructure.forEach(group => {
      if (group.type === 'group') {
        const hasActive = hasActiveChild(group);
        if (hasActive) {
          activeGroupId = group.id;
        }
      }
    });

    const nextState = {};
    if (activeGroupId) {
      nextState[activeGroupId] = true;
    }
    setExpandedGroups(nextState);
  }, [location.pathname, location.search]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const isAlreadyExpanded = !!prev[groupId];
      // Accordion style: chỉ mở tối đa 1 nhóm menu tại một thời điểm
      const nextState = {};
      if (!isAlreadyExpanded) {
        nextState[groupId] = true;
      }
      return nextState;
    });
  };

  const renderDirectLink = (item) => {
    const isActive = checkIsActive(item);

    return (
      <div key={item.id} className="nav-item" style={{ marginBottom: '4px' }}>
        <Link
          to={item.path}
          onClick={handleLinkClick}
          className={`nav-link-direct ${isActive ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            textDecoration: 'none',
            color: isActive ? '#5D3B32' : '#4B5563',
            backgroundColor: isActive ? '#FAF6F0' : 'transparent',
            fontWeight: isActive ? '800' : '600',
            transition: 'all 0.3s ease',
            borderRadius: '12px',
            outline: 'none',
            marginBottom: '4px'
          }}
        >
          <span className="nav-icon" style={{ marginRight: '12px', display: 'flex', alignItems: 'center', color: isActive ? '#5D3B32' : '#6B7280' }}>
            {item.icon}
          </span>
          <span className="nav-text" style={{ fontSize: '0.9rem' }}>{item.text}</span>
        </Link>
      </div>
    );
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${active ? 'visible' : ''}`}
        onClick={onClose}
      ></div>

      <aside className={`admin-sidebar ${active ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`} style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB' }}>
        {/* User profile section */}
        <div
          onClick={collapsed ? onToggleCollapse : undefined}
          style={{
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#7B5233',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            cursor: collapsed ? 'pointer' : 'default',
            position: 'relative'
          }}
          title={collapsed ? 'Mở rộng menu' : undefined}
        >
          {/* Circular avatar logo */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigate('/admin/profile');
              if (onClose) onClose();
            }}
            style={{
              width: '45px',
              height: '45px',
              backgroundColor: '#FFFFFF',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.2)',
              flexShrink: 0,
              cursor: 'pointer'
            }}
            title="Trang cá nhân"
          >
            <img src={amandaPhoto} alt="Avatar" style={{ width: '80%', height: 'auto' }} />
          </div>

          {/* Account info */}
          {!collapsed && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigate('/admin/profile');
                if (onClose) onClose();
              }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', cursor: 'pointer' }}
              title="Trang cá nhân"
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.full_name || user.username || 'Hệ thống SmartFlow'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email || 'smartflow@mail.com'}
              </span>
              <div style={{ marginTop: '4px', display: 'flex' }}>
                <span style={{
                  fontSize: '0.65rem',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  Vai trò: {user.role_name || 'N/A'}{isAdmin ? ' (Admin)' : ''}
                </span>
              </div>
            </div>
          )}
        </div>



        {/* Navigation items - Collapsible Grouped layout */}
        <nav className="sidebar-nav" style={{ padding: '15px 10px', overflowY: 'auto', flex: 1 }}>
          {menuStructure.map(item => {
            if (item.type === 'link') {
              if (isBlocked(item)) return null;
              return item;
            } else if (item.type === 'group') {
              const visibleChildren = item.children.filter(child => !isBlocked(child));
              if (visibleChildren.length === 0) return null;
              return { ...item, children: visibleChildren };
            }
            return null;
          }).filter(Boolean).map(item => {
            if (item.type === 'link') {
              return renderDirectLink(item);
            } else if (item.type === 'group') {
              const isExpanded = !!expandedGroups[item.id];
              const isGroupActive = hasActiveChild(item);

              return (
                <div key={item.id} className="sidebar-group-container" style={{ marginBottom: '6px' }}>
                  <button
                    onClick={() => {
                      toggleGroup(item.id);
                      if (item.id === 'system') {
                        navigate('/admin/monitor');
                      }
                      if (item.id === 'hr-management') {
                        navigate('/admin/hr/org-chart');
                      }
                      if (item.id === 'quality') {
                        navigate('/admin/quality');
                      }
                    }}
                    className={`sidebar-group-header ${isGroupActive ? 'active' : ''}`}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: 'none',
                      background: isGroupActive ? '#FAF6F0' : 'transparent',
                      color: isGroupActive ? '#5D3B32' : '#4B5563',
                      fontWeight: isGroupActive ? '800' : '600',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.3s ease',
                      outline: 'none',
                      marginBottom: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', color: isGroupActive ? '#5D3B32' : '#6B7280' }}>
                        {item.icon}
                      </span>
                      <span className="nav-text" style={{ fontSize: '0.9rem' }}>{item.text}</span>
                    </div>
                    <span className="chevron-icon" style={{
                      display: 'flex',
                      alignItems: 'center',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: isGroupActive ? '#5D3B32' : '#A0A3A8'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </span>
                  </button>
                  {isExpanded && (
                    <ul className="sidebar-group-children" style={{ listStyle: 'none', padding: '2px 0 6px 0', margin: 0 }}>
                      {item.children.map(child => {
                        const isChildActive = checkIsActive(child);

                        return (
                          <li key={child.id} className="nav-item" style={{ marginBottom: '2px' }}>
                            <Link
                              to={child.path}
                              onClick={handleLinkClick}
                              className={`nav-link-child ${isChildActive ? 'active' : ''}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px 16px 10px 36px',
                                textDecoration: 'none',
                                color: isChildActive ? '#5D3B32' : '#6B7280',
                                backgroundColor: isChildActive ? '#FAF6F0' : 'transparent',
                                fontWeight: isChildActive ? '800' : '500',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s ease',
                                borderRadius: '8px',
                                outline: 'none'
                              }}
                            >
                              <span className="nav-icon" style={{ marginRight: '10px', display: 'flex', alignItems: 'center', color: isChildActive ? '#5D3B32' : '#9CA3AF' }}>
                                {child.icon}
                              </span>
                              <span className="nav-text">{child.text}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            }
            return null;
          })}
        </nav>

        {/* Manufacture progress bar for file uploads */}
        {!collapsed && uploads && uploads.length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            margin: 'auto 15px 20px 15px',
            maxHeight: '300px',
            overflowY: 'auto',
            paddingRight: '5px'
          }}>
            {uploads.map((upload) => (
              <div key={upload.id} style={{
                padding: '12px',
                backgroundColor: upload.status === 'error' ? '#FEF2F2' : '#FDF2F2',
                borderRadius: '12px',
                border: `1px solid ${upload.status === 'error' ? '#FCA5A5' : 'rgba(160, 48, 27, 0.15)'}`,
                boxShadow: '0 4px 12px rgba(160, 48, 27, 0.08)',
                animation: 'slideUp 0.4s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: upload.status === 'error' ? '#DC2626' : '#A0301B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {upload.fileName}
                  </span>
                  <span style={{ fontSize: '10px', color: '#A0301B', fontWeight: '900' }}>{upload.progress}%</span>
                </div>

                <div style={{ height: '5px', backgroundColor: 'rgba(160, 48, 27, 0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{
                    width: `${upload.progress}%`,
                    height: '100%',
                    backgroundColor: upload.status === 'error' ? '#EF4444' : '#A0301B',
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: upload.status === 'error' ? 'none' : '0 0 8px rgba(160, 48, 27, 0.2)'
                  }} />
                </div>

                <div style={{ fontSize: '9px', color: '#7B5233', display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {upload.status === 'uploading' && (
                      <div style={{ width: '8px', height: '8px', border: '1.5px solid #A0301B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mgmtSpin 0.8s linear infinite' }} />
                    )}
                    <span>
                      {upload.status === 'uploading' ? 'Đang xử lý...' :
                        upload.status === 'completed' ? 'Hoàn thành' : 'Lỗi'}
                    </span>
                  </div>
                  <span>{upload.processed}/{upload.total || '?'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </aside>
    </>
  );
};

export default Sidebar;
