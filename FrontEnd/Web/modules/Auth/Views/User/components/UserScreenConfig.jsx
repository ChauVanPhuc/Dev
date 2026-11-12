import React from 'react';

export const SCREEN_ICONS = {
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  'quality-records': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  'iso-documents': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  'iso-processes': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  screens: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  logs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  feedback: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  data: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  ),
  bugs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M8 21v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
      <path d="M12 2v3" />
      <path d="M4.22 4.22l2.12 2.12" />
      <path d="M19.78 4.22l-2.12 2.12" />
    </svg>
  ),
  monitor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  plan: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  'delivery-tracking': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  'exception-deliveries': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  ),
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  'backup-qrs': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <rect x="7" y="7" width="3" height="3" />
      <rect x="14" y="7" width="3" height="3" />
      <rect x="7" y="14" width="3" height="3" />
      <rect x="14" y="14" width="3" height="3" />
    </svg>
  ),
  defects: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  claim: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  handovers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  ),
  hotspots: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  products: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  equipment: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  shipments: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  prices: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  kpi: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  // Mobile Screen Icons
  'mobile_delivery-info': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  'mobile_delivery-create': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  'mobile_delivery-receive': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  ),
  'mobile_thermal-print': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  'mobile_plan': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  'mobile_inspection-daily': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  'mobile_inspection-first-article': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  ),
  'mobile_inspection-stage-moisture': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  'mobile_inspection-stage-process': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  'mobile_inspection-stage-adhesion': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  'mobile_inspection-stage': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  'mobile_quality-detail': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  'mobile_input-inspection': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  'mobile_logs': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  'mobile_capa-list': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  'mobile_capa-report': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  'mobile_capa-detail': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  'mobile_awards': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  ),
  'mobile_kpi': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  'mobile_kpi-staff': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  'mobile_staff-evaluation': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  ),
  'mobile_equipment-list': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  'mobile_feedback': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  'mobile_ctq-sos': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  'mobile_warnings': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

export const SCREEN_GROUPS = [
  {
    title: 'Quản lý hệ thống',
    screens: [
      { key: 'users', name: 'Quản lý tài khoản', desc: 'Xem danh sách, phân quyền và thiết lập tài khoản nhân viên.' },
      { key: 'screens', name: 'Quản lý màn hình', desc: 'Cấu hình và định nghĩa danh mục các màn hình trên hệ thống.' },
      { key: 'logs', name: 'Quản lý lỗi hệ thống', desc: 'Theo dõi nhật ký sự cố phần mềm và hệ thống.' },
      { key: 'feedback', name: 'Quản lý góp ý', desc: 'Tiếp nhận ý kiến và phản hồi từ người sử dụng.' },
      { key: 'data', name: 'Backup data', desc: 'Sao lưu và đồng bộ cơ sở dữ liệu hệ thống.' },
      { key: 'bugs', name: 'Quản lý Bug', desc: 'Quản lý danh sách lỗi chức năng do người dùng báo cáo.' },
      { key: 'monitor', name: 'Giám sát hệ thống', desc: 'Theo dõi trực tiếp hiệu năng máy chủ và CSDL.' },
      { key: 'backup-qrs', name: 'Quản lý mã QR tạm', desc: 'Quản lý mã QR dự phòng/tạm thời dán trên sản phẩm, giải phóng QR kẹt.' },
      { key: 'units', name: 'Quản lý đơn vị tính', desc: 'Quản lý danh mục đơn vị tính dùng chung cho Kho và BOM.' }
    ]
  },
  {
    title: 'Nhân sự',
    screens: [
      { key: 'iso-documents', name: 'Mẫu tài liệu', desc: 'Xem danh sách, chỉnh sửa cấu trúc và tải lên tệp quy trình ISO mẫu.' },
      { key: 'iso-processes', name: 'Quản lý quy trình', desc: 'Cấu hình chi tiết lưu đồ, quy trình thực tế và QC checklist.' }
    ]
  },
  {
    title: 'Module sản xuất',
    screens: [
      { key: 'plan', name: 'Kế hoạch sản xuất', desc: 'Lên kế hoạch sản xuất gỗ, quản lý tiến độ tổ và công đoạn.' },
      { key: 'delivery-tracking', name: 'Kế hoạch bàn giao', desc: 'Theo dõi lịch trình và khối lượng sản phẩm bàn giao.' },
      { key: 'exception-deliveries', name: 'Phiếu ngoại lệ', desc: 'Xử lý các trường hợp bàn giao ngoài quy trình chuẩn.' },
      { key: 'home', name: 'Trang chủ sản xuất', desc: 'Xem tổng quan báo cáo nhanh sản lượng xưởng.' }
    ]
  },
  {
    title: 'Module chất lượng',
    screens: [
      { key: 'quality-records', name: 'Hồ sơ chất lượng', desc: 'Lưu trữ và tra cứu hồ sơ chất lượng sản xuất.' },
      { key: 'defects', name: 'Danh sách lỗi', desc: 'Danh mục các loại lỗi gỗ xưởng sản xuất và AQL.' },
      { key: 'claim', name: 'Claim khách hàng', desc: 'Ghi nhận và đền bù khiếu nại chất lượng sản phẩm.' },
      { key: 'reports', name: 'Báo cáo kiểm tra', desc: 'Thống kê kết quả kiểm định chất lượng (IQC/OQC).' },
      { key: 'handovers', name: 'Danh sách bàn giao', desc: 'Quản lý chứng từ ký nhận giao nhận công đoạn.' },
      { key: 'hotspots', name: 'Điểm nóng cần chú ý', desc: 'Cảnh báo các vị trí/sản phẩm hay gặp lỗi chất lượng.' }
    ]
  },
  {
    title: 'Module kỹ thuật',
    screens: [
      { key: 'products', name: 'BOM sản phẩm', desc: 'Định nghĩa cơ cấu sản phẩm mẫu và định mức nguyên vật liệu.' }
    ]
  },
  {
    title: 'Module bảo trì - máy móc',
    screens: [
      { key: 'equipment', name: 'Quản lý thiết bị', desc: 'Quản lý danh sách máy và lịch bảo trì thiết bị.' },
      { key: 'machines', name: 'Danh sách thiết bị', desc: 'Quản lý danh sách chi tiết các thiết bị cơ khí và sản xuất.' },
      { key: 'machine-history', name: 'Lịch sử bảo trì', desc: 'Ghi chép và theo dõi lịch sử bảo trì, sửa chữa máy móc.' },
      { key: 'machine-training', name: 'Hướng dẫn sử dụng', desc: 'Tài liệu và quy trình đào tạo vận hành máy móc an toàn.' }
    ]
  },
  {
    title: 'Module kinh doanh',
    screens: [
      { key: 'customers', name: 'Quản lý khách hàng', desc: 'Quản lý danh sách khách hàng và đối tác kinh doanh.' },
      { key: 'shipments', name: 'Thời gian xuất cont', desc: 'Lịch trình đóng cont gỗ xuất khẩu của bộ phận logistics.' },
      { key: 'prices', name: 'Đơn giá sản phẩm', desc: 'Biểu giá các loại sản phẩm làm căn cứ bồi thường.' },
      { key: 'purchase-requisitions', name: 'Danh sách đơn hàng', desc: 'Quản lý danh sách đơn mua hàng và đơn bán hàng, theo dõi trạng thái duyệt.' },
      { key: 'order-shipping-monitoring', name: 'Giám sát vận chuyển', desc: 'Hiển thị danh sách về thời gian vận chuyển hàng và tiến độ giao nhận.' }
    ]
  },
  {
    title: 'Module quản lý kho',
    screens: [
      { key: 'goods-receipt', name: 'Nhập kho', desc: 'Quản lý danh sách phiếu nhập kho, kiểm đếm và đối soát vật tư.' },
      { key: 'goods-issue', name: 'Xuất kho', desc: 'Quản lý phiếu xuất kho sản xuất, bán hàng và kiểm soát tồn kho.' },
      { key: 'warehouse-management', name: 'Quản lý kho (XNT)', desc: 'Báo cáo Xuất - Nhập - Tồn tổng hợp, tuổi kho FIFO và Hàng loại/Trả về.' },
      { key: 'warehouse-rejected', name: 'Hàng trả về / Hàng loại', desc: 'Theo dõi phiếu trả hàng từ Mobile/Xưởng, QC đầu vào và duyệt xử lý.' }
    ]
  },
  {
    title: 'Khác',
    screens: [
      { key: 'kpi', name: 'Quản lý KPI', desc: 'Đánh giá KPI và hiệu suất làm việc của cán bộ công nhân viên.' }
    ]
  }
];

export const MOBILE_SCREEN_GROUPS = [
  {
    title: 'Bàn giao & In ấn',
    screens: [
      { key: 'mobile_delivery-info', name: 'Thông tin bàn giao', desc: 'Xem thông tin chi tiết và danh sách phiếu bàn giao gỗ.' },
      { key: 'mobile_delivery-create', name: 'Tạo phiếu bàn giao', desc: 'Khởi tạo phiếu bàn giao sản phẩm mới.' },
      { key: 'mobile_delivery-receive', name: 'Nhận bàn giao công đoạn', desc: 'Xác nhận ký nhận bàn giao công đoạn di động.' },
      { key: 'mobile_thermal-print', name: 'In phiếu/tem nhiệt', desc: 'Kết nối và in tem dán sản phẩm qua máy in nhiệt.' }
    ]
  },
  {
    title: 'Kế hoạch & Sản xuất',
    screens: [
      { key: 'mobile_plan', name: 'Theo dõi kế hoạch & Tiến độ', desc: 'Theo dõi kế hoạch sản xuất gỗ và tiến độ các tổ.' }
    ]
  },
  {
    title: 'QC & Chất lượng',
    screens: [
      { key: 'mobile_inspection-daily', name: 'Kiểm tra hàng ngày xưởng gỗ', desc: 'Ghi nhận lỗi kiểm tra hàng ngày tại xưởng gỗ.' },
      { key: 'mobile_inspection-stage', name: 'Kiểm tra sản phẩm công đoạn', desc: 'Kiểm QC chi tiết từng sản phẩm theo công đoạn.' },
      { key: 'mobile_inspection-first-article', name: 'Kiểm tra mẫu đầu tiên', desc: 'Kiểm QC chi tiết cho sản phẩm mẫu đầu tiên.' },
      { key: 'mobile_inspection-stage-moisture', name: 'Kiểm tra độ ẩm', desc: 'Kiểm tra và theo dõi độ ẩm của vật liệu gỗ.' },
      { key: 'mobile_inspection-stage-process', name: 'Kiểm tra quy trình', desc: 'Đánh giá quy trình thao tác của nhân viên.' },
      { key: 'mobile_inspection-stage-adhesion', name: 'Kiểm tra bám dính', desc: 'Kiểm tra chất lượng liên kết bám dính bề mặt.' },
      { key: 'mobile_quality-detail', name: 'Chi tiết biên bản kiểm QC', desc: 'Xem chi tiết biên bản lỗi và lịch sử kiểm QC.' },
      { key: 'mobile_input-inspection', name: 'Kiểm tra nguyên liệu đầu vào (IQC)', desc: 'Đánh giá chất lượng nguyên vật liệu đầu vào.' },
      { key: 'mobile_logs', name: 'Nhật ký kiểm QC & Sự cố', desc: 'Tra cứu nhật ký kiểm QC và các sự cố chất lượng.' },
      { key: 'mobile_capa-list', name: 'Danh sách cải tiến CAPA', desc: 'Xem danh sách các yêu cầu hành động khắc phục CAPA.' },
      { key: 'mobile_capa-report', name: 'Báo cáo sự cố CAPA', desc: 'Báo cáo sự cố chất lượng và đề xuất CAPA mới.' },
      { key: 'mobile_capa-detail', name: 'Chi tiết hành động khắc phục CAPA', desc: 'Xem chi tiết tiến trình thực hiện hành động CAPA.' },
      { key: 'mobile_feedback', name: 'Góp ý cải tiến', desc: 'Góp ý và phản hồi từ người sử dụng di động.' },
      { key: 'mobile_ctq-sos', name: 'Báo cáo CTQ / SOS', desc: 'Khai báo sự cố khẩn cấp (SOS) hoặc thông số kiểm soát chất lượng trọng yếu (CTQ).' },
      { key: 'mobile_warnings', name: 'Cảnh báo lỗi', desc: 'Theo dõi các cảnh báo và sự cố lỗi chất lượng trên thiết bị di động.' }
    ]
  },
  {
    title: 'Đánh giá & KPI',
    screens: [
      { key: 'mobile_awards', name: 'Khen thưởng & Kỷ luật', desc: 'Ghi nhận khen thưởng hoặc kỷ luật đối với nhân sự.' },
      { key: 'mobile_kpi', name: 'Theo dõi KPI cá nhân/tổ', desc: 'Xem biểu đồ KPI hiệu suất làm việc của bản thân/tổ.' },
      { key: 'mobile_kpi-staff', name: 'Danh sách nhân sự để đánh giá', desc: 'Danh sách nhân viên thuộc tổ để tiến hành đánh giá.' },
      { key: 'mobile_staff-evaluation', name: 'Đánh giá nhân sự tổ', desc: 'Đánh giá hiệu suất và thái độ làm việc của nhân sự.' }
    ]
  },
  {
    title: 'Thiết bị',
    screens: [
      { key: 'mobile_equipment-list', name: 'Danh sách thiết bị - máy móc', desc: 'Xem thông tin và trạng thái bảo trì thiết bị máy móc.' }
    ]
  },
  {
    title: 'Kho (Mobile)',
    screens: [
      { key: 'mobile_warehouse-receipt', name: 'Phiếu nhập kho (Mobile)', desc: 'Lập, kiểm đếm và xác nhận phiếu nhập kho từ thiết bị di động.' },
      { key: 'mobile_warehouse-handover', name: 'Phiếu bàn giao (Mobile)', desc: 'Lập phiếu xuất / bàn giao vật tư cho xưởng sản xuất & ký nhận.' },
      { key: 'mobile_warehouse-return', name: 'Phiếu trả về (Mobile)', desc: 'Lập phiếu trả hàng về kho (hàng lỗi hoặc hàng tốt dư) & xử lý.' }
    ]
  }
];

export const GROUP_ICONS = [
  // Quản lý hệ thống
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>,
  // Module sản xuất
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h20" />
    <path d="M5 17V8l4 4V8l4 4V8l4 4V5l3 3v9" />
  </svg>,
  // Module chất lượng
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>,
  // Module kỹ thuật
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>,
  // Module kinh doanh
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>,
  // Khác
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
];

export const MOBILE_GROUP_ICONS = [
  // Bàn giao & In ấn
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>,
  // Kế hoạch & Sản xuất
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h20" />
    <path d="M5 17V8l4 4V8l4 4V8l4 4V5l3 3v9" />
  </svg>,
  // QC & Chất lượng
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>,
  // Đánh giá & KPI
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>,
  // Thiết bị
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>,
  // Kho (Mobile)
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21V8l9-4 9 4v13" />
    <path d="M9 21v-6h6v6" />
    <path d="M10 10h4" />
  </svg>
];

export const PERM_RANK = {
  'none': 0,
  'read': 1,
  'create': 2,
  'edit': 3,
  'delete': 4,
  'approve': 5,
  'export_import': 6
};

export const LEGACY_RANK_MAP = {
  'none': [],
  'read': ['read'],
  'create': ['read', 'create'],
  'edit': ['read', 'create', 'edit'],
  'delete': ['read', 'create', 'edit', 'delete'],
  'approve': ['read', 'create', 'edit', 'delete', 'approve'],
  'export_import': ['read', 'create', 'edit', 'delete', 'approve', 'export_import'],
  'write': ['read', 'create', 'edit', 'delete', 'approve', 'export_import'],
};

export const parseDbPermission = (rawVal) => {
  let actions = [];
  if (Array.isArray(rawVal)) {
    actions = rawVal;
  } else if (typeof rawVal === 'string') {
    if (rawVal.includes(',')) {
      actions = rawVal.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      actions = LEGACY_RANK_MAP[rawVal] || [];
    }
  }
  // Normalize 'write' to 'export_import'
  actions = actions.map(act => act === 'write' ? 'export_import' : act);
  return actions.length > 0 ? actions : ['none'];
};

export const permissionLevels = [
  { key: 'read', label: 'Chỉ xem', color: '#2563EB' },
  { key: 'create', label: 'Thêm', color: '#16A34A' },
  { key: 'edit', label: 'Sửa', color: '#CA8A04' },
  { key: 'delete', label: 'Xóa', color: '#E11D48' },
  { key: 'approve', label: 'Duyệt', color: '#9333EA' },
  { key: 'export_import', label: 'Xuất file', color: '#0D9488' }
];

/**
 * View: Trang Tạo tài khoản người dùng mới có tích hợp phân quyền màn hình chi tiết
 */
