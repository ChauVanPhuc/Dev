import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const SCREEN_ICONS = {
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

const SCREEN_GROUPS = [
  {
    title: 'Quản lý hệ thống',
    screens: [
      { key: 'users', name: 'Quản lý tài khoản', desc: 'Xem danh sách, phân quyền và thiết lập tài khoản nhân viên.' },
      { key: 'screens', name: 'Quản lý màn hình', desc: 'Cấu hình và định nghĩa danh mục các màn hình trên hệ thống.' },
      { key: 'logs', name: 'Quản lý lỗi hệ thống', desc: 'Theo dõi nhật ký sự cố phần mềm và hệ thống.' },
      { key: 'feedback', name: 'Quản lý góp ý', desc: 'Tiếp nhận ý kiến và phản hồi từ người sử dụng.' },
      { key: 'data', name: 'Backup data', desc: 'Sao lưu và đồng bộ cơ sở dữ liệu hệ thống.' },
      { key: 'bugs', name: 'Quản lý Bug', desc: 'Quản lý danh sách lỗi chức năng do người dùng báo cáo.' },
      { key: 'monitor', name: 'Giám sát hệ thống', desc: 'Theo dõi trực tiếp hiệu năng máy chủ và CSDL.' }
    ]
  },
  {
    title: 'Nhân sự',
    screens: [
      { key: 'iso-documents', name: 'Quản lý mẫu tài liệu', desc: 'Xem danh sách, chỉnh sửa cấu trúc và tải lên tệp quy trình ISO mẫu.' },
      { key: 'iso-processes', name: 'Quản lý quy trình', desc: 'Cấu hình chi tiết lưu đồ, quy trình thực tế và QC checklist.' }
    ]
  },
  {
    title: 'Module sản xuất',
    screens: [
      { key: 'plan', name: 'Kế hoạch sản xuất', desc: 'Lên kế hoạch sản xuất gỗ, quản lý tiến độ tổ và công đoạn.' },
      { key: 'delivery-tracking', name: 'Kế hoạch bàn giao', desc: 'Theo dõi lịch trình và khối lượng sản phẩm bàn giao.' },
      { key: 'exception-deliveries', name: 'Phiếu ngoại lệ', desc: 'Xử lý các trường hợp bàn giao ngoài quy trình chuẩn.' },
      { key: 'home', name: 'Trang chủ sản xuất', desc: 'Xem tổng quan báo cáo nhanh sản lượng xưởng.' },
      { key: 'backup-qrs', name: 'Quản lý mã QR', desc: 'Quản lý mã QR dự phòng dán trên sản phẩm.' }
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
      { key: 'shipments', name: 'Thời gian xuất cont', desc: 'Lịch trình đóng cont gỗ xuất khẩu của bộ phận logistics.' },
      { key: 'prices', name: 'Quản lý giá tủ', desc: 'Biểu giá các loại cabinet làm căn cứ bồi thường.' },
      { key: 'purchase-requisitions', name: 'Đơn đặt mua', desc: 'Quản lý đơn đặt mua từ nhà cung cấp, theo dõi trạng thái duyệt và nhập kho.' },
      { key: 'purchase-order-items', name: 'Đơn mua hàng', desc: 'Chi tiết mặt hàng trong mỗi đơn mua, theo dõi số lượng và giá trị.' }
    ]
  },
  {
    title: 'Khác',
    screens: [
      { key: 'kpi', name: 'Quản lý KPI', desc: 'Đánh giá KPI và hiệu suất làm việc của cán bộ công nhân viên.' }
    ]
  }
];

const MOBILE_SCREEN_GROUPS = [
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
  }
];

const GROUP_ICONS = [
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

const MOBILE_GROUP_ICONS = [
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
  </svg>
];

const LEGACY_RANK_MAP = {
  'none': [],
  'read': ['read'],
  'create': ['read', 'create'],
  'edit': ['read', 'create', 'edit'],
  'delete': ['read', 'create', 'edit', 'delete'],
  'approve': ['read', 'create', 'edit', 'delete', 'approve'],
  'export_import': ['read', 'create', 'edit', 'delete', 'approve', 'export_import'],
  'write': ['read', 'create', 'edit', 'delete', 'approve', 'export_import'],
};

const parseDbPermission = (rawVal) => {
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
  actions = actions.map(act => act === 'write' ? 'export_import' : act);
  return actions.length > 0 ? actions : ['none'];
};

const permissionLevels = [
  { key: 'read', label: 'Chỉ xem', color: '#2563EB' },
  { key: 'create', label: 'Thêm', color: '#16A34A' },
  { key: 'edit', label: 'Sửa', color: '#CA8A04' },
  { key: 'delete', label: 'Xóa', color: '#E11D48' },
  { key: 'approve', label: 'Duyệt', color: '#9333EA' },
  { key: 'export_import', label: 'Xuất file', color: '#0D9488' }
];

const UserPermissionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const outletContext = useOutletContext();
  const setCustomTitle = outletContext?.setCustomTitle;
  const setCustomSubtitle = outletContext?.setCustomSubtitle;
  const setCustomScreenCode = outletContext?.setCustomScreenCode;
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/users/:id/permissions');

  const [userInfo, setUserInfo] = useState(null);
  const [screenPermissions, setScreenPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState('web');
  const [expandedGroups, setExpandedGroups] = useState({ 'web_0': true, 'mobile_0': true });
  const [searchQuery, setSearchQuery] = useState('');

  // Cập nhật tiêu đề trang lên Layout Header
  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Phân quyền tài khoản');
    if (setCustomSubtitle) setCustomSubtitle('Thiết lập chi tiết quyền đọc, ghi, hoặc chặn hoàn toàn truy cập theo từng nhóm chức năng');
    if (setCustomScreenCode) setCustomScreenCode('AD3 - Phân quyền cho tài khoản');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Tải chi tiết người dùng và phân quyền từ backend CSDL
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userRes = await api.get(`/accounts/${id}`);
        setUserInfo(userRes);

        const permRes = await api.get(`/accounts/${id}/permissions?resolved=true`);
        const dbPerms = permRes.permissions || {};
        
        const initialPerms = {};
        SCREEN_GROUPS.forEach(group => {
          group.screens.forEach(scr => {
            initialPerms[scr.key] = parseDbPermission(dbPerms[scr.key] || 'none');
          });
        });
        MOBILE_SCREEN_GROUPS.forEach(group => {
          group.screens.forEach(scr => {
            initialPerms[scr.key] = parseDbPermission(dbPerms[scr.key] || 'none');
          });
        });
        setScreenPermissions(initialPerms);
      } catch (err) {
        console.error('Lỗi khi tải thông tin phân quyền:', err);
        setError('Không thể kết nối với máy chủ để tải thông tin phân quyền.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const isCheckboxChecked = (screenKey, levelKey) => {
    const currentPerms = screenPermissions[screenKey] || [];
    if (levelKey === 'none') {
      return currentPerms.includes('none') || currentPerms.length === 0;
    }
    return currentPerms.includes(levelKey);
  };

  const handleCheckboxClick = (screenKey, clickedLevel) => {
    setScreenPermissions(prev => {
      const currentPerms = prev[screenKey] || [];
      let newPerms = [];

      if (clickedLevel === 'none') {
        newPerms = ['none'];
      } else {
        const filtered = currentPerms.filter(p => p !== 'none');
        if (filtered.includes(clickedLevel)) {
          newPerms = filtered.filter(p => p !== clickedLevel);
        } else {
          newPerms = [...filtered, clickedLevel];
        }
        if (newPerms.length === 0) {
          newPerms = ['none'];
        }
      }

      return {
        ...prev,
        [screenKey]: newPerms
      };
    });
  };

  const isGroupAllowed = (groupIdx, isMobile = false) => {
    const groups = isMobile ? MOBILE_SCREEN_GROUPS : SCREEN_GROUPS;
    const group = groups[groupIdx];
    if (!group) return false;
    return group.screens.some(s => {
      const perms = screenPermissions[s.key] || [];
      return perms.length > 0 && !perms.includes('none');
    });
  };

  const handleGroupToggle = (groupIdx, allow, isMobile = false) => {
    const groups = isMobile ? MOBILE_SCREEN_GROUPS : SCREEN_GROUPS;
    const group = groups[groupIdx];
    if (!group) return;
    setScreenPermissions(prev => {
      const next = { ...prev };
      group.screens.forEach(s => {
        next[s.key] = allow ? ['read'] : ['none'];
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const permissionsToSave = {};
      Object.keys(screenPermissions).forEach(key => {
        const perms = screenPermissions[key] || [];
        permissionsToSave[key] = perms.includes('none') || perms.length === 0 ? 'none' : perms.join(',');
      });

      await api.put(`/accounts/${id}/permissions`, {
        permissions: permissionsToSave
      });

      setSuccess(true);
      
      const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      if (Number(loggedInUser.id) === Number(id)) {
        localStorage.setItem('smartflow_active_permissions', JSON.stringify(permissionsToSave));
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Lỗi khi cập nhật phân quyền:', err);
      setError('Đã xảy ra lỗi trong quá trình lưu trữ phân quyền vào database.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mọi ghi đè cá nhân và khôi phục về quyền mặc định của bộ phận/chức vụ không?')) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.put(`/accounts/${id}/permissions`, {
        permissions: {}
      });
      
      const permRes = await api.get(`/accounts/${id}/permissions?resolved=true`);
      const dbPerms = permRes.permissions || {};
      const initialPerms = {};
      SCREEN_GROUPS.forEach(group => {
        group.screens.forEach(scr => {
          initialPerms[scr.key] = parseDbPermission(dbPerms[scr.key] || 'none');
        });
      });
      MOBILE_SCREEN_GROUPS.forEach(group => {
        group.screens.forEach(scr => {
          initialPerms[scr.key] = parseDbPermission(dbPerms[scr.key] || 'none');
        });
      });
      setScreenPermissions(initialPerms);
      
      const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      if (Number(loggedInUser.id) === Number(id)) {
        localStorage.setItem('smartflow_active_permissions', JSON.stringify(initialPerms));
      }
      
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Lỗi khi khôi phục quyền mặc định:', err);
      setError('Đã xảy ra lỗi khi khôi phục quyền mặc định.');
    } finally {
      setSaving(false);
    }
  };

  // Tự động mở rộng tất cả các nhóm khi người dùng thực hiện tìm kiếm
  useEffect(() => {
    if (searchQuery) {
      const nextExpanded = { ...expandedGroups };
      SCREEN_GROUPS.forEach((group, index) => {
        const hasMatch = group.screens.some(s =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.key.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (hasMatch) {
          nextExpanded[`web_${index}`] = true;
        }
      });
      MOBILE_SCREEN_GROUPS.forEach((group, index) => {
        const hasMatch = group.screens.some(s =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.key.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (hasMatch) {
          nextExpanded[`mobile_${index}`] = true;
        }
      });
      setExpandedGroups(nextExpanded);
    }
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="permission-view-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #7B5233', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }} />
        <p style={{ color: '#7B5233', fontSize: '1.1rem', fontWeight: '600' }}>Đang tải dữ liệu cấu hình phân quyền...</p>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  const writeCount = Object.values(screenPermissions).filter(v => Array.isArray(v) && v.some(x => ['create', 'edit', 'delete', 'approve', 'export_import'].includes(x))).length;
  const readCount = Object.values(screenPermissions).filter(v => Array.isArray(v) && v.includes('read') && !v.some(x => ['create', 'edit', 'delete', 'approve', 'export_import'].includes(x))).length;
  const noneCount = Object.values(screenPermissions).filter(v => Array.isArray(v) && (v.includes('none') || v.length === 0)).length;

  return (
    <div className="permission-view-container">
      <div className="create-content card">
        {/* User Info Bar & Stats widgets */}
        {userInfo && (
          <div className="user-dashboard-info">
            <div className="user-info-bar">
              <div className="avatar">{userInfo.full_name?.charAt(0) || 'U'}</div>
              <div className="details">
                <h4>{userInfo.full_name} <span className="employee-id">#{userInfo.employee_id}</span></h4>
                <p>Username: <strong>{userInfo.username}</strong> | Vai trò: <strong>{userInfo.role_name || '-'}</strong></p>
                <p>Email: <strong>{userInfo.email || 'Chưa cung cấp'}</strong> | Số điện thoại: <strong>{userInfo.phone || 'Chưa cung cấp'}</strong></p>
              </div>
              <div className="status-badge" style={{ backgroundColor: userInfo.status === 'Đang sử dụng' ? '#E8F5E9' : '#FFEBEE', color: userInfo.status === 'Đang sử dụng' ? '#2E7D32' : '#C62828' }}>
                {userInfo.status}
              </div>
            </div>

            {/* Widget Thống kê quyền */}
            <div className="perms-stats-panel">
              <div className="stat-card stat-write">
                <span className="stat-num">{writeCount}</span>
                <span className="stat-label">Điều chỉnh</span>
              </div>
              <div className="stat-card stat-read">
                <span className="stat-num">{readCount}</span>
                <span className="stat-label">Chỉ đọc</span>
              </div>
              <div className="stat-card stat-none">
                <span className="stat-num">{noneCount}</span>
                <span className="stat-label">Không truy cập</span>
              </div>
            </div>
          </div>
        )}

        {/* Message Notifications */}
        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Đã đồng bộ và lưu cấu hình phân quyền vào cơ sở dữ liệu thành công!
          </div>
        )}

        {/* Search & Bulk actions panel */}
        <div className="action-control-row" style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
          <div className="search-box-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Tìm nhanh màn hình..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-field"
            />
          </div>
          <button 
            type="button" 
            className="btn btn-outline"
            onClick={handleRestoreDefaults}
            style={{ 
              borderColor: '#7B5233', 
              color: '#7B5233', 
              padding: '10px 18px', 
              fontSize: '0.88rem', 
              fontWeight: '700',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FAF6F0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Khôi phục mặc định bộ phận
          </button>
        </div>

        {/* Platform selection tabs */}
        <div className="permissions-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '2px solid #FAF6F0', paddingBottom: '12px', marginTop: '15px' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'web' ? 'active' : ''}`}
            onClick={() => setActiveTab('web')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === 'web' ? '#7B5233' : '#FAF6F0',
              color: activeTab === 'web' ? '#FFFFFF' : '#7B5233',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              outline: 'none'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Phân quyền Web
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'mobile' ? 'active' : ''}`}
            onClick={() => setActiveTab('mobile')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === 'mobile' ? '#7B5233' : '#FAF6F0',
              color: activeTab === 'mobile' ? '#FFFFFF' : '#7B5233',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              outline: 'none'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            Phân quyền Mobile
          </button>
        </div>

        {/* Danh sách nhóm Accordion */}
        <div className="accordion-list">
          {(() => {
            const isMobileTab = activeTab === 'mobile';
            const activeGroups = isMobileTab ? MOBILE_SCREEN_GROUPS : SCREEN_GROUPS;
            const activeIcons = isMobileTab ? MOBILE_GROUP_ICONS : GROUP_ICONS;

            // Kiểm tra tổng số màn hình trùng khớp với từ khóa tìm kiếm
            const totalMatches = activeGroups.reduce((sum, group) => {
              const matches = group.screens.filter(s =>
                s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.key.toLowerCase().includes(searchQuery.toLowerCase())
              );
              return sum + matches.length;
            }, 0);

            if (searchQuery && totalMatches === 0) {
              return (
                <div className="empty-search-state">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <p>Không tìm thấy màn hình nào phù hợp với từ khóa tìm kiếm.</p>
                </div>
              );
            }

            return activeGroups.map((group, groupIdx) => {
              // Lọc các màn hình trong nhóm
              const screensInGroup = group.screens.filter(s =>
                s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.key.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (searchQuery && screensInGroup.length === 0) {
                return null;
              }

              const isExpanded = !!expandedGroups[`${activeTab}_${groupIdx}`];
              const isAllowed = isGroupAllowed(groupIdx, isMobileTab);

              return (
                <div key={groupIdx} className={`accordion-group ${isExpanded ? 'is-expanded' : ''} ${isAllowed ? 'group-allowed' : 'group-blocked'}`}>
                  {/* Tiêu đề nhóm Accordion (Cha) */}
                  <div 
                    className="accordion-header"
                    onClick={() => setExpandedGroups(prev => ({ ...prev, [`${activeTab}_${groupIdx}`]: !prev[`${activeTab}_${groupIdx}`] }))}
                  >
                    <div className="accordion-header-left">
                      <span className={`chevron-icon ${isExpanded ? 'rotated' : ''}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </span>
                      <span className="group-icon-wrapper">
                        {activeIcons[groupIdx] || (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                          </svg>
                        )}
                      </span>
                      <h3 className="group-title">{group.title}</h3>
                    </div>

                    {/* Cho phép / Không cho phép Radio toggles */}
                    <div className="group-allow-toggle" onClick={(e) => e.stopPropagation()}>
                      <label className={`radio-label ${isAllowed ? 'active' : ''}`}>
                        <input 
                          type="radio" 
                          name={`group-allow-${activeTab}-${groupIdx}`} 
                          checked={isAllowed} 
                          onChange={() => handleGroupToggle(groupIdx, true, isMobileTab)}
                        />
                        <span className="radio-custom"></span>
                        Cho phép
                      </label>
                      <label className={`radio-label ${!isAllowed ? 'active-blocked' : ''}`}>
                        <input 
                          type="radio" 
                          name={`group-allow-${activeTab}-${groupIdx}`} 
                          checked={!isAllowed} 
                          onChange={() => handleGroupToggle(groupIdx, false, isMobileTab)}
                        />
                        <span className="radio-custom"></span>
                        Không cho phép
                      </label>
                    </div>
                  </div>

                  {/* Nội dung bên dưới Accordion (Các màn hình con) */}
                  {isExpanded && (
                    <div className="accordion-body">
                      {isAllowed ? (
                        <div className="accordion-body-list">
                          {screensInGroup.map((screen, sIdx) => {
                            const currentVal = screenPermissions[screen.key] || 'none';
                            return (
                              <div key={sIdx} className="permission-screen-row">
                                <div className="screen-info-left">
                                  <div className="screen-icon-box">
                                    {SCREEN_ICONS[screen.key] || (
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="screen-text-details">
                                    <div className="screen-title-row">
                                      <span className="screen-title-name">{screen.name}</span>
                                      <code className="screen-title-key">{screen.key}</code>
                                    </div>
                                    <p className="screen-desc-paragraph">{screen.desc}</p>
                                  </div>
                                </div>
                                
                                <div className="screen-checkboxes-container">
                                  {/* Cột các checkbox được phép */}
                                  <div className="checkboxes-allowed-group">
                                    {permissionLevels.map((lvl) => {
                                      const isChecked = isCheckboxChecked(screen.key, lvl.key);
                                      return (
                                        <label 
                                          key={lvl.key} 
                                          className={`perm-checkbox-label ${isChecked ? 'checked' : ''}`}
                                          style={{ '--theme-color': lvl.color }}
                                        >
                                          <input 
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleCheckboxClick(screen.key, lvl.key)}
                                          />
                                          <span className="checkbox-custom"></span>
                                          {lvl.label}
                                        </label>
                                      );
                                    })}
                                  </div>

                                  {/* Cột checkbox chặn */}
                                  <div className="checkboxes-blocked-group">
                                    <label 
                                      className={`perm-checkbox-label is-blocked-type ${currentVal === 'none' ? 'checked-blocked' : ''}`}
                                    >
                                      <input 
                                        type="checkbox"
                                        checked={currentVal === 'none'}
                                        onChange={() => handleCheckboxClick(screen.key, 'none')}
                                      />
                                      <span className="checkbox-custom red-border"></span>
                                      Chặn
                                    </label>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="group-blocked-message">
                          🚫 Nhóm này đang bị chặn truy cập. Chọn "Cho phép" ở trên để bắt đầu phân quyền chi tiết.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {/* Footer Actions */}
        <div className="form-actions" style={{ marginTop: '40px' }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/users')}>Hủy bỏ</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu cấu hình...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .permission-view-container { width: 100%; padding-bottom: 50px; }
        .create-content { background: white; padding: 30px; border-radius: 16px; border: 1px solid #EADCC9; box-shadow: 0 10px 30px rgba(123, 82, 51, 0.04); }
        
        /* Dashboard Info Layout */
        .user-dashboard-info { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; margin-bottom: 30px; }
        
        .user-info-bar { display: flex; align-items: center; gap: 18px; background: linear-gradient(135deg, #FAF6F0 0%, #F5EDE4 100%); border: 1px solid #EADCC9; padding: 20px; border-radius: 12px; height: 100%; box-sizing: border-box; }
        .user-info-bar .avatar { width: 52px; height: 52px; background-color: #7B5233; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.4rem; box-shadow: 0 4px 10px rgba(123, 82, 51, 0.2); }
        .user-info-bar .details { flex: 1; }
        .user-info-bar .details h4 { margin: 0 0 6px 0; color: #2D1A12; font-size: 1.15rem; font-weight: 800; }
        .user-info-bar .details h4 .employee-id { color: #A37F61; font-size: 0.88rem; font-weight: 700; margin-left: 6px; }
        .user-info-bar .details p { margin: 0 0 4px 0; color: #5D4037; font-size: 0.82rem; line-height: 1.4; font-weight: 500; }
        .user-info-bar .details p:last-child { margin-bottom: 0; color: #8D6E63; }
        .user-info-bar .status-badge { padding: 6px 12px; border-radius: 30px; font-size: 0.76rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; }
        
        /* Stats Panel */
        .perms-stats-panel { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; height: 100%; }
        .stat-card { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 15px; border-radius: 12px; text-align: center; border: 1.5px solid transparent; box-sizing: border-box; }
        .stat-card.stat-write { background-color: #F0FDF4; border-color: #DCFCE7; color: #16A34A; }
        .stat-card.stat-read { background-color: #EFF6FF; border-color: #DBEAFE; color: #2563EB; }
        .stat-card.stat-none { background-color: #FEF2F2; border-color: #FEE2E2; color: #DC2626; }
        .stat-num { font-size: 1.6rem; font-weight: 800; line-height: 1.2; }
        .stat-label { font-size: 0.75rem; font-weight: 700; margin-top: 4px; opacity: 0.8; }
        
        /* Search Box */
        .action-control-row { margin-bottom: 20px; gap: 15px; }
        .search-box-wrapper { position: relative; display: flex; align-items: center; width: 260px; }
        .search-box-wrapper .search-icon { position: absolute; left: 12px; color: #7B5233; pointer-events: none; }
        .search-box-wrapper .search-input-field { width: 100%; padding: 10px 12px 10px 36px; border: 1.5px solid #EADCC9; border-radius: 8px; font-size: 0.88rem; outline: none; transition: all 0.2s; color: #2D1A12; font-weight: 500; background-color: #FAF8F5; }
        .search-box-wrapper .search-input-field:focus { border-color: #7B5233; background-color: #FFFFFF; box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1); }
        
        /* Accordion List */
        .accordion-list { display: flex; flex-direction: column; gap: 12px; margin-top: 15px; }
        .accordion-group { background: #FFFFFF; border: 1.5px solid #EADCC9; border-radius: 12px; overflow: hidden; transition: all 0.2s ease; }
        .accordion-group.is-expanded { border-color: #C8B2A6; box-shadow: 0 6px 20px rgba(123, 82, 51, 0.04); }
        
        .accordion-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: linear-gradient(135deg, #FAF8F5 0%, #FAF6F0 100%); cursor: pointer; user-select: none; gap: 20px; }
        .accordion-header:hover { background-color: #F5EDE4; background-image: none; }
        
        .accordion-header-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .chevron-icon { display: flex; align-items: center; color: #7B5233; transition: transform 0.2s ease; transform: rotate(0deg); }
        .chevron-icon.rotated { transform: rotate(90deg); }
        
        .group-icon-wrapper { display: flex; align-items: center; justify-content: center; color: #7B5233; background-color: #FAF6F0; width: 32px; height: 32px; border-radius: 8px; border: 1px solid #EADCC9; flex-shrink: 0; }
        .accordion-header:hover .group-icon-wrapper { background-color: #7B5233; color: white; border-color: #7B5233; }
        .group-title { margin: 0; font-size: 1rem; font-weight: 800; color: #2D1A12; }
        
        /* Allow/Block Radio Buttons */
        .group-allow-toggle { display: flex; gap: 8px; align-items: center; }
        .radio-label { display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 700; color: #8C7B72; padding: 6px 12px; border-radius: 8px; border: 1.5px solid #EADCC9; background-color: #FFFFFF; transition: all 0.2s; user-select: none; }
        .radio-label input[type="radio"] { display: none; }
        .radio-custom { width: 6px; height: 6px; border-radius: 50%; background-color: transparent; border: 2px solid #8C7B72; transition: all 0.2s; display: inline-block; }
        
        .radio-label.active { background-color: #ECFDF5; border-color: #A7F3D0; color: #065F46; }
        .radio-label.active .radio-custom { border-color: #065F46; background-color: #065F46; }
        
        .radio-label.active-blocked { background-color: #FEF2F2; border-color: #FECACA; color: #991B1B; }
        .radio-label.active-blocked .radio-custom { border-color: #991B1B; background-color: #991B1B; }
        
        /* Accordion Body screens list */
        .accordion-body { padding: 0; background-color: #FFFFFF; border-top: 1.5px solid #F5EDE4; }
        .accordion-body-list { display: flex; flex-direction: column; padding: 0 0 0 20px; }
        
        .permission-screen-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px 10px 10px; border-bottom: 1.5px solid #FAF6F0; gap: 20px; }
        .permission-screen-row:last-child { border-bottom: none; }
        .permission-screen-row:hover { background-color: #FAF8F5; }
        
        .screen-info-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .screen-icon-box { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background-color: #FAF6F0; color: #7B5233; border: 1px solid #EADCC9; flex-shrink: 0; }
        .permission-screen-row:hover .screen-icon-box { background-color: #7B5233; color: white; border-color: #7B5233; }
        
        .screen-text-details { flex: 1; min-width: 0; }
        .screen-title-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
        .screen-title-name { font-size: 0.9rem; font-weight: 800; color: #2D1A12; }
        .screen-title-key { font-size: 0.72rem; color: #8D6E63; background-color: #F8F5F2; padding: 1px 4px; border-radius: 4px; border: 0.5px solid #EADCC9; font-weight: 500; font-family: monospace; }
        .screen-desc-paragraph { font-size: 0.78rem; color: #757575; margin: 0; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        /* Checkboxes styling */
        .screen-checkboxes-container { display: flex; align-items: center; gap: 16px; width: 660px; flex-shrink: 0; justify-content: space-between; }
        .checkboxes-allowed-group { display: flex; gap: 6px; flex: 1; justify-content: flex-start; }
        .checkboxes-blocked-group { width: 80px; display: flex; justify-content: flex-end; }
        
        .perm-checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 700; color: #5D4037; padding: 6px 12px; border-radius: 8px; border: 1.5px solid #EADCC9; background-color: #FFFFFF; transition: all 0.2s; user-select: none; white-space: nowrap; }
        .perm-checkbox-label input[type="checkbox"] { display: none; }
        .checkbox-custom { width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid #EADCC9; background-color: white; position: relative; transition: all 0.15s; display: inline-block; }
        
        .perm-checkbox-label.checked { border-color: color-mix(in srgb, var(--theme-color) 40%, white); background-color: color-mix(in srgb, var(--theme-color) 12%, white); color: var(--theme-color); }
        .perm-checkbox-label.checked .checkbox-custom { border-color: var(--theme-color); background-color: var(--theme-color); }
        .perm-checkbox-label.checked .checkbox-custom::after { content: ''; position: absolute; left: 3.5px; top: 0.5px; width: 3px; height: 6px; border: solid white; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg); }
        
        .perm-checkbox-label.is-blocked-type.checked-blocked { border-color: #FECACA; background-color: #FEF2F2; color: #DC2626; }
        .perm-checkbox-label.is-blocked-type.checked-blocked .checkbox-custom.red-border { border-color: #DC2626; background-color: #DC2626; }
        .perm-checkbox-label.is-blocked-type.checked-blocked .checkbox-custom.red-border::after { content: ''; position: absolute; left: 3.5px; top: 0.5px; width: 3px; height: 6px; border: solid white; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg); }
        
        .group-blocked-message { padding: 14px; text-align: center; font-size: 0.8rem; font-weight: 700; color: #991B1B; background-color: #FEF2F2; border-radius: 8px; border: 1.5px dashed #FECACA; margin: 10px 20px; }
        
        .empty-search-state { text-align: center; padding: 40px 20px; color: #8C7B72; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .empty-search-state p { margin: 0; font-size: 0.85rem; font-weight: 600; }
        
        /* Footer Actions */
        .form-actions { display: flex; justify-content: flex-end; gap: 15px; padding-top: 20px; border-top: 1.5px solid #F5EDE4; }
        .btn { padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.85rem; transition: all 0.2s; outline: none; }
        .btn-primary { background-color: #7B5233; color: white; border: none; box-shadow: 0 4px 12px rgba(123, 82, 51, 0.12); }
        .btn-primary:hover:not(:disabled) { background-color: #5D3E26; transform: translateY(-1px); }
        .btn-primary:disabled { background-color: #D3C1B4; cursor: not-allowed; box-shadow: none; color: white; }
        .btn-outline { background: white; border: 1.5px solid #EADCC9; color: #7B5233; }
        .btn-outline:hover { background-color: #FAF6F0; border-color: #C8B2A6; }
        
        .error-message { background-color: #FFEBEE; color: #C62828; padding: 10px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 0.82rem; border: 1px solid #FFCDD2; font-weight: 600; }
        .success-message { background-color: #E8F5E9; color: #2E7D32; padding: 10px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 0.82rem; border: 1px solid #C8E6C9; font-weight: 600; }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .user-dashboard-info { grid-template-columns: 1fr; gap: 15px; }
        }
        
        @media (max-width: 1280px) {
          .permission-screen-row { flex-direction: column; align-items: stretch; gap: 12px; }
          .screen-checkboxes-container { width: 100%; max-width: 100%; }
        }
        
        @media (max-width: 768px) {
          .action-control-row { flex-direction: column; align-items: stretch; }
          .search-box-wrapper { width: 100%; }
          .accordion-header { flex-direction: column; align-items: stretch; gap: 10px; }
          .checkboxes-allowed-group { flex-wrap: wrap; }
        }
      `}} />
    </div>
  );
};

export default UserPermissionView;
