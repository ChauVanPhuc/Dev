import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import { authService } from '@modules/Auth/Models/auth.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

// Icons mapping for screens
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


const PERM_RANK = {
  'none': 0,
  'read': 1,
  'create': 2,
  'edit': 3,
  'delete': 4,
  'approve': 5,
  'export_import': 6
};

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
  // Normalize 'write' to 'export_import'
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

/**
 * View: Trang Thông tin và phân quyền tài khoản (Merged View)
 */
const UserEdit = ({ isProfile = false }) => {
  const { id: paramId } = useParams();
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const id = isProfile ? loggedInUser.id : paramId;

  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setCustomTitle = outletContext?.setCustomTitle;
  const setCustomSubtitle = outletContext?.setCustomSubtitle;
  const setCustomScreenCode = outletContext?.setCustomScreenCode;
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/users/:id/edit');

  // Cập nhật tiêu đề trang lên Layout Header
  useEffect(() => {
    if (setCustomTitle) setCustomTitle(isProfile ? 'Thông tin cá nhân' : 'Thông tin tài khoản');
    if (setCustomSubtitle) setCustomSubtitle(isProfile ? 'Quản lý thông tin cá nhân của bạn' : 'Quản lý thông tin cá nhân và thiết lập chi tiết phân quyền hệ thống');
    if (setCustomScreenCode) setCustomScreenCode(isProfile ? 'AD3.2-P' : 'AD3.2');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, isProfile]);
  
  // Dữ liệu danh mục từ API
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [stages, setStages] = useState([]);
  
  // Trạng thái Form thông tin cơ bản
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: '', 
    status: 'Đang sử dụng',
    role_id: '',
    permission_id: '',
    stage_ids: [],
    permission_level: '' 
  });

  // Trạng thái phân quyền chi tiết (screen_key -> permission_string)
  const [screenPermissions, setScreenPermissions] = useState({});

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();
  const setToastMessage = (msg) => {
    if (msg) {
      toast('success', msg);
    }
  };
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Selected factory state for Phạm vi phụ trách
  const [selectedFactory, setSelectedFactory] = useState('');
  const hasAutoSelectedFactory = React.useRef(false);

  const getFactoryCode = (stageName) => {
    if (!stageName) return 'Khác';
    const match = stageName.match(/^(NM\d+)/i);
    return match ? match[1].toUpperCase() : 'Khác';
  };

  const uniqueFactories = useMemo(() => {
    const list = new Set();
    stages.forEach(s => {
      list.add(getFactoryCode(s.name));
    });
    return Array.from(list).sort();
  }, [stages]);

  useEffect(() => {
    if (uniqueFactories.length > 0) {
      // 1. Tự động nhận diện và chuyển sang nhà máy có công đoạn đã active (chỉ chạy 1 lần)
      if (!hasAutoSelectedFactory.current && stages.length > 0 && formData.stage_ids && formData.stage_ids.length > 0) {
        const activeStage = stages.find(s => formData.stage_ids.map(Number).includes(Number(s.id)));
        if (activeStage) {
          const factoryOfActiveStage = getFactoryCode(activeStage.name);
          if (factoryOfActiveStage && uniqueFactories.includes(factoryOfActiveStage)) {
            setSelectedFactory(factoryOfActiveStage);
            hasAutoSelectedFactory.current = true;
            return;
          }
        }
      }

      // 2. Mặc định chọn nhà máy đầu tiên nếu chưa chọn hoặc nhà máy hiện tại không còn tồn tại
      if (!selectedFactory || !uniqueFactories.includes(selectedFactory)) {
        setSelectedFactory(uniqueFactories[0]);
      }
    } else {
      setSelectedFactory('');
    }
  }, [uniqueFactories, stages, formData.stage_ids, selectedFactory]);

  const filteredStages = useMemo(() => {
    if (!selectedFactory) return stages;
    return stages.filter(s => getFactoryCode(s.name) === selectedFactory);
  }, [stages, selectedFactory]);

  // Mở rộng nhóm accordion và tìm kiếm
  const [activeTab, setActiveTab] = useState('web');
  const [expandedGroups, setExpandedGroups] = useState({ 'web_0': true, 'mobile_0': true });
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Trạng thái modal đổi mật khẩu
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdError, setPwdError] = useState(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // 1. Tải danh mục Roles khi mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await api.get('/roles/');
        setRoles(data);
      } catch (err) {
        console.error('Lỗi khi tải Roles:', err);
      }
    };
    fetchRoles();
  }, []);

  // 2. Tải thông tin người dùng & phân quyền khi mount/id thay đổi
  useEffect(() => {
    hasAutoSelectedFactory.current = false;
    const fetchUserDetailAndPermissions = async () => {
      setFetching(true);
      setError(null);
      try {
        // Tải chi tiết người dùng
        const data = await api.get(`/accounts/${id}`);
        setFormData({
          employee_id: data.employee_id || '',
          full_name: data.full_name || '',
          username: data.username || '',
          email: data.email || '',
          phone: data.phone || '',
          password: '', 
          status: data.status || 'Đang sử dụng',
          role_id: data.role_id || '',
          permission_id: data.permission_id || '',
          stage_ids: data.stage_ids || [],
          permission_level: data.permission_level || ''
        });

        // Tải phân quyền chi tiết
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
        console.error('Lỗi khi tải thông tin tài khoản và phân quyền:', err);
        setError('Không thể tải thông tin tài khoản người dùng.');
      } finally {
        setFetching(false);
      }
    };
    fetchUserDetailAndPermissions();
  }, [id]);

  // 3. Khi Role thay đổi -> Lấy danh sách Chức vụ (Permissions) tương ứng
  useEffect(() => {
    if (formData.role_id) {
      const fetchPermissions = async () => {
        try {
          const data = await api.get(`/roles/${formData.role_id}/permissions`);
          setPermissions(data);
        } catch (err) {
          console.error('Lỗi khi tải Permissions:', err);
        }
      };
      fetchPermissions();
    } else {
      setPermissions([]);
      setStages([]);
    }
  }, [formData.role_id]);

  // 4. Khi Permission thay đổi -> Lấy danh sách Stages tương ứng
  useEffect(() => {
    if (formData.permission_id) {
      const fetchStages = async () => {
        try {
          const data = await api.get(`/permissions/${formData.permission_id}/stages`);
          setStages(data);
        } catch (err) {
          console.error('Lỗi khi tải Stages:', err);
        }
      };
      fetchStages();
    } else {
      setStages([]);
    }
  }, [formData.permission_id]);

  // Mở rộng các nhóm accordion tự động khi tìm kiếm
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

  const generateUsername = (fullName) => {
    if (!fullName) return '';
    const removeVietnameseTones = (str) => {
      str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
      str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
      str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
      str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
      str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
      str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
      str = str.replace(/đ/g,"d");
      str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
      str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
      str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
      str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
      str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
      str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
      str = str.replace(/Đ/g, "D");
      return str;
    };
    
    const cleanName = removeVietnameseTones(fullName).trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length === 0) return '';
    
    const firstName = parts[parts.length - 1];
    let middleAndLastName = '';
    if (parts.length > 1) {
      middleAndLastName += parts[0].charAt(0).toUpperCase();
      for (let i = 1; i < parts.length - 1; i++) {
        middleAndLastName += parts[i].charAt(0).toUpperCase();
      }
    }
    
    const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    const randomNum = Math.floor(100 + Math.random() * 900); 
    
    return `${formattedFirstName}${middleAndLastName}${randomNum}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updates = { [name]: value };
      if (name === 'full_name') {
        updates.username = generateUsername(value);
      }
      return {
        ...prev,
        ...updates
      };
    });
    setIsDirty(true);
  };

  const handleStageCheckboxChange = (stageId, checked) => {
    setFormData(prev => {
      const currentIds = prev.stage_ids || [];
      if (checked) {
        return { ...prev, stage_ids: [...currentIds, stageId] };
      } else {
        return { ...prev, stage_ids: currentIds.filter(id => id !== stageId) };
      }
    });
    setIsDirty(true);
  };

  const toggleStatus = () => {
    setFormData(prev => ({
      ...prev,
      status: prev.status === 'Đang sử dụng' ? 'Dừng hoạt động' : 'Đang sử dụng'
    }));
    setIsDirty(true);
  };

  // Hàm đồng bộ thông tin từ danh mục nhân viên
  const handleAutoSync = async () => {
    if (!formData.employee_id) {
      return;
    }
    setSyncing(true);
    try {
      const response = await api.get(`/employees/by-code/${formData.employee_id}`);
      const employee = response.data;
      
      setFormData(prev => {
        const fetchedName = employee.full_name;
        const generatedUser = generateUsername(fetchedName);
        return {
          ...prev,
          full_name: fetchedName,
          phone: prev.phone || employee.phone || '',
          email: prev.email || employee.email || '',
          username: generatedUser
        };
      });
      setIsDirty(true);
      toast('success', 'Đồng bộ dữ liệu nhân sự thành công!');
    } catch (err) {
      console.error(err);
      toast('error', 'Lỗi khi đồng bộ hoặc mã nhân viên không tồn tại.');
    } finally {
      setSyncing(false);
    }
  };

  // Logic kiểm soát checkbox độc lập
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
        // Toggle/Select Chặn -> Chỉ giữ 'none'
        newPerms = ['none'];
      } else {
        // Loại bỏ 'none'
        const filtered = currentPerms.filter(p => p !== 'none');
        if (filtered.includes(clickedLevel)) {
          // Nếu đã chọn thì bỏ chọn
          newPerms = filtered.filter(p => p !== clickedLevel);
        } else {
          // Nếu chưa chọn thì chọn thêm
          newPerms = [...filtered, clickedLevel];
        }
        // Nếu sau khi bỏ chọn mà rỗng, thì tự động chuyển về 'none'
        if (newPerms.length === 0) {
          newPerms = ['none'];
        }
      }

      return {
        ...prev,
        [screenKey]: newPerms
      };
    });
    setIsDirty(true);
  };

  // Logic radio toggle Cho phép / Không cho phép ở header nhóm cha
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
    setIsDirty(true);
  };

  // Hàm khôi phục phân quyền mặc định của bộ phận
  const handleRestoreDefaults = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mọi phân quyền cá nhân và khôi phục về cấu hình mặc định của chức vụ này không?')) {
      return;
    }
    setLoading(true);
    setError(null);
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
        const activePermsToStore = {};
        Object.keys(initialPerms).forEach(key => {
          const perms = initialPerms[key] || [];
          activePermsToStore[key] = perms.includes('none') || perms.length === 0 ? 'none' : perms.join(',');
        });
        localStorage.setItem('smartflow_active_permissions', JSON.stringify(activePermsToStore));
      }
      
      setIsDirty(true);
      alert('Khôi phục phân quyền mặc định thành công!');
    } catch (err) {
      console.error('Lỗi khi khôi phục quyền mặc định:', err);
      setError('Đã xảy ra lỗi khi khôi phục cấu hình quyền mặc định.');
    } finally {
      setLoading(false);
    }
  };

  const isRowAllChecked = (screenKey) => {
    const current = screenPermissions[screenKey] || [];
    const lvlKeys = ['read', 'create', 'edit', 'delete', 'approve', 'export_import'];
    return lvlKeys.every(lvl => current.includes(lvl));
  };

  const handleRowAllClick = (screenKey) => {
    setScreenPermissions(prev => {
      const isAll = isRowAllChecked(screenKey);
      return {
        ...prev,
        [screenKey]: isAll ? ['none'] : ['read', 'create', 'edit', 'delete', 'approve', 'export_import']
      };
    });
    setIsDirty(true);
  };

  const isHeaderChecked = (screensInGroup, levelKey) => {
    if (screensInGroup.length === 0) return false;
    if (levelKey === 'all') {
      const actions = ['read', 'create', 'edit', 'delete', 'approve', 'export_import'];
      return screensInGroup.every(scr => {
        const cur = screenPermissions[scr.key] || [];
        return actions.every(act => cur.includes(act));
      });
    }
    return screensInGroup.every(scr => {
      const cur = screenPermissions[scr.key] || [];
      return cur.includes(levelKey);
    });
  };

  const handleHeaderToggle = (screensInGroup, levelKey) => {
    setScreenPermissions(prev => {
      const next = { ...prev };
      
      if (levelKey === 'all') {
        const actions = ['read', 'create', 'edit', 'delete', 'approve', 'export_import'];
        let allSelected = true;
        screensInGroup.forEach(scr => {
          const cur = prev[scr.key] || [];
          actions.forEach(act => {
            if (!cur.includes(act)) allSelected = false;
          });
        });
        
        screensInGroup.forEach(scr => {
          next[scr.key] = allSelected ? ['none'] : [...actions];
        });
      } else {
        let allSelected = true;
        screensInGroup.forEach(scr => {
          const cur = prev[scr.key] || [];
          if (!cur.includes(levelKey)) allSelected = false;
        });
        
        screensInGroup.forEach(scr => {
          const cur = prev[scr.key] || [];
          const filtered = cur.filter(p => p !== 'none');
          let nextPerms = [];
          if (allSelected) {
            nextPerms = filtered.filter(p => p !== levelKey);
          } else {
            if (!filtered.includes(levelKey)) {
              nextPerms = [...filtered, levelKey];
            } else {
              nextPerms = filtered;
            }
          }
          next[scr.key] = nextPerms.length === 0 ? ['none'] : nextPerms;
        });
      }
      
      return next;
    });
  };

  const renderPermissionButton = ({ label, isChecked, onClick, isDisabled = false }) => {
    if (isDisabled) {
      return (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            height: '32px',
            borderRadius: '6px',
            border: '1.5px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            color: '#94A3B8',
            fontSize: '0.78rem',
            fontWeight: '700',
            cursor: 'not-allowed',
            userSelect: 'none',
            width: '95px',
            boxSizing: 'border-box'
          }}
        >
          <span>🚫</span> {label}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isProfile}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '32px',
          borderRadius: '6px',
          border: isChecked ? '1.5px solid #10B981' : '1.5px solid #EADCC9',
          backgroundColor: isChecked ? '#EBFDF5' : '#FFFFFF',
          color: isChecked ? '#047857' : '#2D1A12',
          fontSize: '0.78rem',
          fontWeight: '700',
          cursor: isProfile ? 'default' : 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          width: '95px',
          boxSizing: 'border-box',
          outline: 'none',
          opacity: isProfile ? 0.8 : 1
        }}
      >
        <span style={{
          width: '12px',
          height: '12px',
          borderRadius: '3px',
          border: isChecked ? '1.5px solid #10B981' : '1.5px solid #EADCC9',
          backgroundColor: isChecked ? '#10B981' : 'transparent',
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {isChecked && (
            <span style={{
              width: '3px',
              height: '6px',
              border: 'solid white',
              borderWidth: '0 1.5px 1.5px 0',
              transform: 'rotate(45deg)',
              marginBottom: '1px'
            }} />
          )}
        </span>
        {label}
      </button>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  // Submit thực tế khi được xác nhận từ Popup Modal
  const handleConfirmSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const selectedPerm = permissions.find(p => p.id === parseInt(formData.permission_id));
      const isProductionOrQC = selectedPerm && (selectedPerm.name === 'NV SX' || selectedPerm.name === 'NV QC');

      // 1. Cập nhật thông tin tài khoản cơ bản (PUT)
      const baseUpdateData = {
        employee_code: formData.employee_id,
        name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        status: formData.status,
        is_active: formData.status === 'Đang sử dụng',
        permission_level: isProductionOrQC ? null : (formData.permission_level || null)
      };

      if (formData.password) {
        baseUpdateData.password = formData.password;
      }

      await api.put(`/accounts/${id}`, baseUpdateData);

      if (isProfile) {
        // Cập nhật thông tin user trong localStorage
        const updatedUser = {
          ...loggedInUser,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone
        };
        localStorage.setItem('smartflow_user', JSON.stringify(updatedUser));

        setSuccess(true);
        setIsDirty(false);
        setToastMessage('Cập nhật thông tin cá nhân thành công!');
        setTimeout(() => {
          setToastMessage(null);
          navigate('/admin/dashboard');
        }, 2000);
      } else {
        // 2. Đồng bộ bộ phận / chức vụ / công đoạn (sync-departments)
        const syncPayload = {
          role_id: formData.role_id ? parseInt(formData.role_id, 10) : null,
          permission_id: formData.permission_id ? parseInt(formData.permission_id, 10) : null,
          stage_ids: isProductionOrQC && formData.stage_ids && formData.stage_ids.length > 0 
            ? formData.stage_ids.map(sid => parseInt(sid, 10)) 
            : null
        };

        await api.post(`/accounts/${id}/sync-departments/`, syncPayload);

        // Convert arrays of actions to comma-separated strings for DB storage
        const permissionsToSave = {};
        Object.keys(screenPermissions).forEach(key => {
          const perms = screenPermissions[key] || [];
          permissionsToSave[key] = perms.includes('none') || perms.length === 0 ? 'none' : perms.join(',');
        });

        // 3. Đồng bộ phân quyền màn hình chi tiết (PUT)
        await api.put(`/accounts/${id}/permissions`, {
          permissions: permissionsToSave
        });

        // Nếu chỉnh sửa cho chính mình, lưu cấu hình vào localStorage của trình duyệt
        if (Number(loggedInUser.id) === Number(id)) {
          localStorage.setItem('smartflow_active_permissions', JSON.stringify(permissionsToSave));
        }

        setSuccess(true);
        setIsDirty(false);
        setToastMessage('Cập nhật thông tin tài khoản và cấu hình phân quyền thành công!');
        setTimeout(() => {
          setToastMessage(null);
          navigate('/admin/users');
        }, 2000);
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật tài khoản toàn diện:', err);
      setError(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu thông tin. Vui lòng kiểm tra lại.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPwdError('Vui lòng nhập đầy đủ các trường thông tin.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPwdError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    if (passwordData.newPassword.length < 3) {
      setPwdError('Mật khẩu mới phải có ít nhất 3 ký tự.');
      return;
    }
    
    setPwdLoading(true);
    setPwdError(null);
    try {
      await api.post(`/accounts/${id}/change-password`, {
        old_password: passwordData.oldPassword,
        new_password: passwordData.newPassword
      });
      setPwdSuccess(true);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwdSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Lỗi khi đổi mật khẩu:', err);
      setPwdError(err.response?.data?.detail || 'Mật khẩu cũ không chính xác hoặc có lỗi xảy ra.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (fetching) {
    return (
      <div className="user-create-container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #7B5233', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }} />
        <p style={{ color: '#7B5233', fontSize: '1.15rem', fontWeight: '700' }}>Đang tải dữ liệu tài khoản...</p>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  return (
    <div className="user-create-container">
      <div className="create-content-wrapper">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Cập nhật tài khoản và phân quyền thành công!</div>}
        
        <form onSubmit={handleSubmit} className="create-form-vertical-layout">
          
          {/* PHẦN 1: THÔNG TIN NGƯỜI DÙNG */}
          <div className="account-info-card card">
            <div className="card-header-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1.5px solid #F5EDE4', paddingBottom: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#FAF6F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7B5233',
                border: '1.5px solid #EADCC9',
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#7B5233' }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 className="section-title" style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800 }}>Thông tin người dùng</h3>
                  {!isProfile && (
                    <button 
                      type="button" 
                      className="btn-link-sync" 
                      onClick={handleAutoSync} 
                      disabled={syncing}
                    >
                      {syncing ? 'Đang đồng bộ...' : 'Lấy thông tin tự động...'}
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.78rem', color: '#8C7B72', fontWeight: 500 }}>Nhập thông tin người dùng và tài khoản đăng nhập hệ thống.</span>
              </div>
            </div>
            
            <div className="account-info-grid">
              {/* Cột trái: Avatar & Nút thao tác nhanh */}
              <div className="avatar-actions-column">
                <div className="avatar-wrapper">
                  <div className="avatar-circle">
                    {formData.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="user-name-subtitle">{formData.full_name || 'Họ và tên'}</div>
                </div>
                
                <div className="avatar-buttons">
                  <button 
                    type="button" 
                    className={`btn-action-custom btn-password ${showPasswordModal ? 'active' : ''}`}
                    onClick={() => {
                      setShowPasswordModal(true);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Đổi mật khẩu
                  </button>
                  
                  <button 
                    type="button" 
                    className={`btn-action-custom btn-status ${formData.status === 'Đang sử dụng' ? 'active' : 'suspended'}`}
                    onClick={isProfile ? undefined : toggleStatus}
                    disabled={isProfile}
                    style={isProfile ? { cursor: 'default', opacity: 0.8 } : {}}
                  >
                    <span className="status-indicator-dot"></span>
                    {formData.status === 'Đang sử dụng' ? 'Kích hoạt' : 'Tạm dừng hoạt động'}
                  </button>

                  {isProfile && (
                    <button 
                      type="button" 
                      className="btn-action-custom btn-logout"
                      onClick={handleLogout}
                      style={{ 
                        backgroundColor: '#A0301B', 
                        color: '#FFFFFF', 
                        borderColor: '#A0301B',
                        marginTop: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#8B2917';
                        e.currentTarget.style.borderColor = '#8B2917';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#A0301B';
                        e.currentTarget.style.borderColor = '#A0301B';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Đăng xuất
                    </button>
                  )}
                </div>
              </div>

              {/* Cột phải: Các trường nhập liệu */}
              <div className="inputs-column">
                <div className="form-inputs-grid">
                  <div className="form-group employee-code-group">
                    <label>Mã nhân viên</label>
                    <div className="input-with-button">
                      <input 
                        type="text" 
                        name="employee_id" 
                        placeholder="VD: 1245" 
                        value={formData.employee_id}
                        onChange={handleChange}
                        onBlur={handleAutoSync}
                        required
                        disabled={isProfile}
                        className={isProfile ? "input-disabled" : ""}
                      />
                      {!isProfile && (
                        <button 
                          type="button" 
                          className="btn-sync-input" 
                          onClick={handleAutoSync} 
                          title="Đồng bộ thông tin tự động"
                          disabled={syncing}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10" />
                            <polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Họ và tên</label>
                    <input 
                      type="text" 
                      name="full_name" 
                      placeholder="VD: Nguyễn Văn A" 
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Số điện thoại</label>
                    <input 
                      type="text" 
                      name="phone" 
                      placeholder="VD: 0987654321" 
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Tên đăng nhập (Username)</label>
                    <input 
                      type="text" 
                      name="username" 
                      value={formData.username}
                      onChange={handleChange}
                      disabled={isProfile}
                      className={isProfile ? "input-disabled" : ""}
                    />
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input 
                      type="password" 
                      name="password" 
                      placeholder="*******"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isProfile}
                      className={isProfile ? "input-disabled" : ""}
                    />
                  </div>

                  <div className="form-group span-two-columns">
                    <label>Email</label>
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="VD: anv01@mail.com" 
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Đường phân cách ngang mỏng */}
                <div style={{ borderTop: '1.5px solid #F5EDE4', margin: '20px 0' }}></div>

                {/* PHÂN QUYỀN PHÂN CẤP (GOM CHUNG TRONG CARD 1) */}
                <div style={{ width: '100%', boxSizing: 'border-box' }}>
                  <div className="card-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '16px', borderBottom: '1.5px solid #F5EDE4', paddingBottom: '12px', marginBottom: '20px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#FAF6F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#7B5233',
                      border: '1.5px solid #EADCC9',
                      flexShrink: 0
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#7B5233' }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <h3 className="section-title" style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800 }}>Phân quyền phân cấp</h3>
                      <span style={{ fontSize: '0.78rem', color: '#8C7B72', fontWeight: 500 }}>Chọn bộ phận/phòng ban, vị trí và phạm vi phụ trách.</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 18px', marginBottom: '20px' }}>
                    {/* Bộ phận/phòng ban */}
                    <div className="form-group">
                      <label>Bộ phận/phòng ban</label>
                      <select 
                        name="role_id" 
                        value={formData.role_id} 
                        onChange={handleChange} 
                        disabled={isProfile}
                        className={isProfile ? "select-disabled" : ""}
                      >
                        <option value="">-- Chọn bộ phận --</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Vị trí, chức vụ */}
                    <div className={`form-group ${(!formData.role_id || isProfile) ? 'disabled' : ''}`}>
                      <label>Vị trí, chức vụ</label>
                      <select 
                        name="permission_id" 
                        value={formData.permission_id} 
                        onChange={handleChange} 
                        disabled={isProfile || !formData.role_id}
                        className={(isProfile || !formData.role_id) ? "select-disabled" : ""}
                      >
                        <option value="">-- Chọn chức vụ --</option>
                        {permissions.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {!formData.role_id && <small className="hint">Hãy chọn Bộ phận trước</small>}
                    </div>
                  </div>

                  {/* PHÂN QUYỀN CHI TIẾT: CÔNG ĐOẠN PHỤ TRÁCH */}
                  {formData.permission_id && (
                    (() => {
                      const selectedPerm = permissions.find(p => p.id === parseInt(formData.permission_id));
                      const isProductionOrQC = selectedPerm && (selectedPerm.name === 'NV SX' || selectedPerm.name === 'NV QC');

                      if (isProductionOrQC) {
                        return (
                          <div style={{ borderTop: '1.5px solid #F5EDE4', paddingTop: '20px', marginTop: '10px' }}>
                            <div className={`form-group full-width-span ${(stages.length === 0 || isProfile) ? 'disabled' : ''}`}>
                              {stages.length === 0 ? (
                                <>
                                  <label>Phạm vi phụ trách (Công đoạn sản xuất)</label>
                                  <div className="empty-stages-hint">Quyền này không yêu cầu công đoạn sản xuất</div>
                                </>
                              ) : (
                                <>
                                  <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center', 
                                      width: '100%', 
                                      marginBottom: '12px',
                                      flexWrap: 'wrap',
                                      gap: '12px'
                                  }}>
                                      <div>
                                          <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#5D4037', margin: 0 }}>
                                              Phạm vi phụ trách (Công đoạn sản xuất)
                                          </label>
                                          <div style={{ fontSize: '0.75rem', color: '#8C7A6B', marginTop: '2px' }}>
                                              Chọn công đoạn tùy theo nhà máy để chọn phạm vi phụ trách.
                                          </div>
                                      </div>
                                      
                                      {/* Factory Selector */}
                                      {uniqueFactories.length > 0 && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#7B5233' }}>Chọn nhà máy</span>
                                              <div style={{ display: 'inline-flex', border: '1px solid #EADCC9', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FAF6F0', opacity: isProfile ? 0.7 : 1 }}>
                                                  {uniqueFactories.map(fac => {
                                                      const isActive = selectedFactory === fac;
                                                      return (
                                                          <button
                                                              type="button"
                                                              key={fac}
                                                              disabled={isProfile}
                                                              onClick={() => setSelectedFactory(fac)}
                                                              style={{
                                                                  padding: '6px 16px',
                                                                  border: 'none',
                                                                  backgroundColor: isActive ? '#7B5233' : 'transparent',
                                                                  color: isActive ? '#FFFFFF' : '#7B5233',
                                                                  fontWeight: 'bold',
                                                                  fontSize: '0.8rem',
                                                                  cursor: isProfile ? 'default' : 'pointer',
                                                                  display: 'flex',
                                                                  alignItems: 'center',
                                                                  gap: '6px',
                                                                  transition: 'all 0.2s',
                                                                  borderLeft: fac !== uniqueFactories[0] ? '1px solid #EADCC9' : 'none'
                                                              }}
                                                          >
                                                              <span style={{
                                                                  width: '8px',
                                                                  height: '8px',
                                                                  borderRadius: '50%',
                                                                  border: `1.5px solid ${isActive ? '#FFFFFF' : '#7B5233'}`,
                                                                  backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                                                                  display: 'inline-block'
                                                              }} />
                                                              {fac}
                                                          </button>
                                                      );
                                                  })}
                                              </div>
                                          </div>
                                      )}
                                  </div>

                                  <div className="stages-checkbox-grid" style={isProfile ? { opacity: 0.8, backgroundColor: '#FAF8F5' } : {}}>
                                    {filteredStages.map(s => (
                                      <label key={s.id} className="stage-checkbox-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isProfile ? 'default' : 'pointer', userSelect: 'none' }}>
                                        <input 
                                          type="checkbox"
                                          checked={formData.stage_ids.includes(s.id)}
                                          onChange={(e) => handleStageCheckboxChange(s.id, e.target.checked)}
                                          disabled={isProfile}
                                          style={{ margin: 0, width: '15px', height: '15px', accentColor: '#7B5233', cursor: isProfile ? 'default' : 'pointer' }}
                                        />
                                        <span>{s.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PHẦN 2: PHÂN QUYỀN CHI TIẾT */}
          {!isProfile && <div className="permissions-card card">
            <div className="card-header-row">
              <h3 className="section-title">Phân quyền chi tiết</h3>
              
              <div className="permissions-header-actions">
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
                  className="btn btn-outline btn-restore"
                  onClick={handleRestoreDefaults}
                >
                  Khôi phục mặc định bộ phận
                </button>
              </div>
            </div>

            {/* Platform selection tabs */}
            <div className="permissions-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '2px solid #FAF6F0', paddingBottom: '12px', marginTop: '10px' }}>
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

            <div className="accordion-list">
              {(() => {
                const isMobileTab = activeTab === 'mobile';
                const activeGroups = isMobileTab ? MOBILE_SCREEN_GROUPS : SCREEN_GROUPS;
                const activeIcons = isMobileTab ? MOBILE_GROUP_ICONS : GROUP_ICONS;

                // Kiểm định số màn hình tìm kiếm khớp
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
                  const screensInGroup = group.screens.filter(s =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.key.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (searchQuery && screensInGroup.length === 0) {
                    return null;
                  }

                  const isAllowed = isGroupAllowed(groupIdx, isMobileTab);
                  const isExpanded = !!expandedGroups[`${activeTab}_${groupIdx}`];

                  return (
                    <div key={groupIdx} className={`accordion-group ${isExpanded ? 'is-expanded' : ''} ${isAllowed ? 'group-allowed' : 'group-blocked'}`}>
                      {/* Accordion Header */}
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
                          <h4 className="group-title">{group.title}</h4>
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

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="accordion-body">
                          {isAllowed ? (
                            <div className="accordion-body-list">

                              {screensInGroup.map((screen, sIdx) => {
                                const isRowAll = isRowAllChecked(screen.key);
                                return (
                                  <div key={sIdx} className="permission-screen-row" style={{ padding: '12px 16px', borderBottom: '1px solid #FAF6F0' }}>
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
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 95px)', gap: '8px' }}>
                                      {renderPermissionButton({
                                        label: 'Tất cả',
                                        isChecked: isRowAll,
                                        onClick: () => handleRowAllClick(screen.key)
                                      })}
                                      {permissionLevels.map((lvl) => {
                                        const isChecked = isCheckboxChecked(screen.key, lvl.key);
                                        return (
                                          <React.Fragment key={lvl.key}>
                                            {renderPermissionButton({
                                              label: lvl.label,
                                              isChecked: isChecked,
                                              onClick: () => handleCheckboxClick(screen.key, lvl.key)
                                            })}
                                          </React.Fragment>
                                        );
                                      })}
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
          </div>}


          {/* HÀNG NÚT BẤM DƯỚI CÙNG (Chỉ hiển thị khi có thay đổi) */}
          {isDirty && (
            <div className="form-actions-row animate-slide-up" style={{
              position: 'fixed',
              bottom: '0',
              left: '260px',
              right: '0',
              backgroundColor: '#FFFFFF',
              borderTop: '2px solid #EADCC9',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              zIndex: 999,
              boxShadow: '0 -4px 20px rgba(123, 82, 51, 0.08)'
            }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => {
                  setIsDirty(false);
                  navigate(isProfile ? '/admin/dashboard' : '/admin/users');
                }}
              >
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          )}
        </form>
      </div>



      {showConfirmModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom animate-slide-down" style={{ maxWidth: '450px' }}>
            <div className="modal-header-custom">
              <h4>Xác nhận lưu thay đổi</h4>
              <button 
                type="button" 
                className="btn-close-modal" 
                onClick={() => setShowConfirmModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body-custom" style={{ padding: '24px 20px', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div style={{ fontSize: '0.88rem', color: '#5D4037', fontWeight: '600', lineHeight: '1.4' }}>
                  Bạn có chắc chắn muốn lưu toàn bộ các thay đổi về thông tin tài khoản và cấu hình phân quyền này không?
                </div>
              </div>
            </div>
            <div className="modal-footer-custom">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
              >
                Hủy bỏ
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleConfirmSave}
                disabled={loading}
              >
                {loading ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom animate-slide-down">
            <div className="modal-header-custom">
              <h4>Đổi mật khẩu</h4>
              <button 
                type="button" 
                className="btn-close-modal" 
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  setPwdError(null);
                  setPwdSuccess(false);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body-custom">
              {pwdError && <div className="error-message">{pwdError}</div>}
              {pwdSuccess && <div className="success-message">Đổi mật khẩu thành công!</div>}
              
              <div className="form-group-custom">
                <label>Mật khẩu cũ</label>
                <input 
                  type="password"
                  value={passwordData.oldPassword}
                  placeholder="Nhập mật khẩu cũ"
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  disabled={pwdLoading || pwdSuccess}
                />
              </div>
              <div className="form-group-custom">
                <label>Mật khẩu mới</label>
                <input 
                  type="password"
                  value={passwordData.newPassword}
                  placeholder="Nhập mật khẩu mới"
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  disabled={pwdLoading || pwdSuccess}
                />
              </div>
              <div className="form-group-custom">
                <label>Xác nhận mật khẩu mới</label>
                <input 
                  type="password"
                  value={passwordData.confirmPassword}
                  placeholder="Xác nhận mật khẩu mới"
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  disabled={pwdLoading || pwdSuccess}
                />
              </div>
            </div>
            <div className="modal-footer-custom">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  setPwdError(null);
                  setPwdSuccess(false);
                }}
                disabled={pwdLoading}
              >
                Đóng
              </button>
              {!pwdSuccess && (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handlePasswordChangeSubmit}
                  disabled={pwdLoading}
                >
                  {pwdLoading ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .user-create-container { width: 100%; padding-bottom: 90px; }
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .create-content-wrapper { width: 100%; }
        .create-form-vertical-layout { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .card { background: white; border-radius: 12px; border: 1px solid #EADCC9; box-shadow: 0 6px 20px rgba(123, 82, 51, 0.03); }
        .section-title { font-size: 1.05rem; color: #7B5233; margin: 0; font-weight: 800; }
        
        /* PHẦN 1: THÔNG TIN NGƯỜI DÙNG CARD */
        .account-info-card { padding: 16px 24px; }
        .card-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1.5px solid #F5EDE4; padding-bottom: 8px; }
        .btn-link-sync { background: none; border: none; color: #7B5233; font-weight: 700; text-decoration: underline; cursor: pointer; font-size: 0.82rem; transition: color 0.2s; outline: none; }
        .btn-link-sync:hover:not(:disabled) { color: #5D3E26; }
        .btn-link-sync:disabled { color: #D3C1B4; cursor: not-allowed; text-decoration: none; }
        
        .account-info-grid { display: grid; grid-template-columns: 200px 1fr; gap: 24px; align-items: start; }
        
        /* Cột Trái: Avatar & Trạng thái */
        .avatar-actions-column { display: flex; flex-direction: column; align-items: center; gap: 12px; border-right: 1.5px solid #F5EDE4; padding-right: 24px; }
        .avatar-wrapper { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
        .avatar-circle { width: 84px; height: 84px; background-color: #7B5233; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 800; box-shadow: 0 4px 12px rgba(123, 82, 51, 0.12); border: 3px solid #FAF6F0; user-select: none; }
        .user-name-subtitle { font-size: 0.95rem; font-weight: 800; color: #2D1A12; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
        
        .avatar-buttons { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .btn-action-custom { display: flex; align-items: center; justify-content: center; width: 100%; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease; border: 1.5px solid #EADCC9; background: white; color: #5D4037; outline: none; }
        .btn-action-custom:hover { background-color: #FAF6F0; border-color: #C8B2A6; }
        .btn-password.active { background-color: #7B5233; color: white; border-color: #7B5233; }
        
        .btn-status.active { background-color: #E8F5E9; border-color: #A5D6A7; color: #2E7D32; }
        .btn-status.suspended { background-color: #FFEBEE; border-color: #FFCDD2; color: #C62828; }
        .status-indicator-dot { width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; display: inline-block; }
        .btn-status.active .status-indicator-dot { background-color: #2E7D32; }
        .btn-status.suspended .status-indicator-dot { background-color: #C62828; }
        
        .password-input-container { width: 100%; display: flex; flex-direction: column; gap: 4px; margin-top: 3px; }
        .password-input-container label { font-size: 0.78rem; font-weight: 700; color: #5D4037; }
        .password-input-container input { padding: 8px 10px; border-radius: 6px; border: 1.5px solid #EADCC9; font-size: 0.85rem; outline: none; transition: all 0.2s; font-weight: 500; color: #2D1A12; }
        .password-input-container input:focus { border-color: #7B5233; box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1); }
        
        /* Cột Phải: Các Inputs */
        .inputs-column { flex: 1; width: 100%; }
        .form-inputs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 18px; }
        .form-inputs-grid .full-width-span { grid-column: span 3; }
        .form-inputs-grid .span-two-columns { grid-column: span 2; }
        
        .form-group { display: flex; flex-direction: column; gap: 4px; position: relative; }
        .form-group.disabled { opacity: 0.6; }
        .form-group label { font-size: 0.8rem; font-weight: 700; color: #5D4037; }
        .form-group input, .form-group select { padding: 8px 12px; border-radius: 8px; border: 1.5px solid #EADCC9; font-size: 0.85rem; outline: none; transition: all 0.2s; background-color: white; font-weight: 500; color: #2D1A12; width: 100%; box-sizing: border-box; }
        .form-group input:focus, .form-group select:focus { border-color: #7B5233; box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1); }
        
        .input-with-button { position: relative; display: flex; align-items: center; width: 100%; }
        .input-with-button input { width: 100%; padding-right: 32px; }
        .btn-sync-input { position: absolute; right: 8px; background: none; border: none; color: #7B5233; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; outline: none; padding: 0; }
        .btn-sync-input:hover { color: #5D3E26; }
        .input-disabled, .select-disabled { background-color: #FAF8F5 !important; cursor: not-allowed !important; opacity: 0.85 !important; }
        
        .empty-stages-hint { padding: 10px; border: 1.5px dashed #EADCC9; border-radius: 8px; background-color: #FAF8F5; color: #8C7B72; font-size: 0.82rem; text-align: center; font-weight: 500; }
        .stages-checkbox-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; padding: 12px; border: 1.5px solid #EADCC9; border-radius: 8px; background-color: #FAF8F5; }
        .stage-checkbox-item { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 600; color: #2D1A12; }
        .stage-checkbox-item input[type="checkbox"] { width: 14px; height: 14px; accent-color: #7B5233; cursor: pointer; margin: 0; }
        
        /* PHẦN 2: PHÂN QUYỀN CARD */
        .permissions-card { padding: 16px 24px; margin-top: 0px; }
        .permissions-header-actions { display: flex; align-items: center; gap: 12px; }
        
        .search-box-wrapper { position: relative; display: flex; align-items: center; width: 220px; }
        .search-box-wrapper .search-icon { position: absolute; left: 10px; color: #8D6E63; pointer-events: none; }
        .search-box-wrapper .search-input-field { width: 100%; padding: 6px 10px 6px 30px; border: 1.5px solid #EADCC9; border-radius: 8px; font-size: 0.82rem; outline: none; transition: all 0.2s; color: #2D1A12; font-weight: 500; }
        .search-box-wrapper .search-input-field:focus { border-color: #7B5233; box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1); }
        .btn-restore { height: 30px; padding: 0 12px; font-size: 0.78rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        
        /* Accordion List */
        .accordion-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
        .accordion-group { background: #FFFFFF; border: 1.5px solid #EADCC9; border-radius: 10px; overflow: hidden; transition: all 0.2s ease; }
        .accordion-group.is-expanded { border-color: #C8B2A6; box-shadow: 0 4px 12px rgba(123, 82, 51, 0.03); }
        
        .accordion-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: linear-gradient(135deg, #FAF8F5 0%, #FAF6F0 100%); cursor: pointer; user-select: none; gap: 20px; }
        .accordion-header:hover { background-color: #F5EDE4; background-image: none; }
        
        .accordion-header-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .chevron-icon { display: flex; align-items: center; color: #7B5233; transition: transform 0.2s ease; transform: rotate(0deg); }
        .chevron-icon.rotated { transform: rotate(90deg); }
        
        .group-icon-wrapper { display: flex; align-items: center; justify-content: center; color: #7B5233; background-color: #FAF6F0; width: 30px; height: 30px; border-radius: 6px; border: 1px solid #EADCC9; flex-shrink: 0; }
        .accordion-header:hover .group-icon-wrapper { background-color: #7B5233; color: white; border-color: #7B5233; }
        .group-title { margin: 0; font-size: 0.95rem; font-weight: 800; color: #2D1A12; }
        
        /* Allow/Block Radio Buttons */
        .group-allow-toggle { display: flex; gap: 8px; align-items: center; }
        .radio-label { display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 0.78rem; font-weight: 700; color: #8C7B72; padding: 4px 10px; border-radius: 6px; border: 1.5px solid #EADCC9; background-color: #FFFFFF; transition: all 0.2s; user-select: none; }
        .radio-label input[type="radio"] { display: none; }
        .radio-custom { width: 6px; height: 6px; border-radius: 50%; background-color: transparent; border: 2px solid #8C7B72; transition: all 0.2s; display: inline-block; }
        
        .radio-label.active { background-color: #ECFDF5; border-color: #A7F3D0; color: #065F46; }
        .radio-label.active .radio-custom { border-color: #065F46; background-color: #065F46; }
        
        .radio-label.active-blocked { background-color: #FEF2F2; border-color: #FECACA; color: #991B1B; }
        .radio-label.active-blocked .radio-custom { border-color: #991B1B; background-color: #991B1B; }
        
        /* Accordion Body screens list */
        .accordion-body { padding: 0; background-color: #FFFFFF; border-top: 1.5px solid #F5EDE4; }
        .accordion-body-list { display: flex; flex-direction: column; padding: 0 0 0 16px; }
        
        .permission-screen-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px 8px 10px; border-bottom: 1.5px solid #FAF6F0; gap: 20px; }
        .permission-screen-row:last-child { border-bottom: none; }
        .permission-screen-row:hover { background-color: #FAF8F5; }
        
        .screen-info-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .screen-icon-box { width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background-color: #FAF6F0; color: #7B5233; border: 1px solid #EADCC9; flex-shrink: 0; }
        .permission-screen-row:hover .screen-icon-box { background-color: #7B5233; color: white; border-color: #7B5233; }
        
        .screen-text-details { flex: 1; min-width: 0; }
        .screen-title-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
        .screen-title-name { font-size: 0.88rem; font-weight: 800; color: #2D1A12; }
        .screen-title-key { font-size: 0.7rem; color: #8D6E63; background-color: #F8F5F2; padding: 1px 4px; border-radius: 4px; border: 0.5px solid #EADCC9; font-weight: 500; font-family: monospace; }
        .screen-desc-paragraph { font-size: 0.75rem; color: #757575; margin: 0; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        /* Checkboxes styling */
        .screen-checkboxes-container { display: flex; align-items: center; gap: 16px; width: 660px; flex-shrink: 0; justify-content: space-between; }
        .checkboxes-allowed-group { display: flex; gap: 6px; flex: 1; justify-content: flex-start; }
        .checkboxes-blocked-group { width: 80px; display: flex; justify-content: flex-end; }
        
        .perm-checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 700; color: #5D4037; padding: 5px 10px; border-radius: 6px; border: 1.5px solid #EADCC9; background-color: #FFFFFF; transition: all 0.2s; user-select: none; white-space: nowrap; }
        .perm-checkbox-label input[type="checkbox"] { display: none; }
        .checkbox-custom { width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid #EADCC9; background-color: white; position: relative; transition: all 0.15s; display: inline-block; }
        
        .perm-checkbox-label.checked { border-color: color-mix(in srgb, var(--theme-color) 40%, white); background-color: color-mix(in srgb, var(--theme-color) 12%, white); color: var(--theme-color); }
        .perm-checkbox-label.checked .checkbox-custom { border-color: var(--theme-color); background-color: var(--theme-color); }
        .perm-checkbox-label.checked .checkbox-custom::after { content: ''; position: absolute; left: 3.5px; top: 0.5px; width: 3px; height: 6px; border: solid white; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg); }
        
        .perm-checkbox-label.is-blocked-type.checked-blocked { border-color: #FECACA; background-color: #FEF2F2; color: #DC2626; }
        .perm-checkbox-label.is-blocked-type.checked-blocked .checkbox-custom.red-border { border-color: #DC2626; background-color: #DC2626; }
        .perm-checkbox-label.is-blocked-type.checked-blocked .checkbox-custom.red-border::after { content: ''; position: absolute; left: 3.5px; top: 0.5px; width: 3px; height: 6px; border: solid white; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg); }
        
        .group-blocked-message { padding: 14px; text-align: center; font-size: 0.8rem; font-weight: 700; color: #991B1B; background-color: #FEF2F2; border-radius: 8px; border: 1.5px dashed #FECACA; margin: 10px 16px; }
        
        .empty-search-state { text-align: center; padding: 40px 20px; color: #8C7B72; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .empty-search-state p { margin: 0; font-size: 0.85rem; font-weight: 600; }
        
        /* HÀNG NÚT BẤM DƯỚI CÙNG */
        .form-actions-row { display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1.5px solid #F5EDE4; margin-top: 4px; }
        .btn { padding: 8px 20px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.82rem; transition: all 0.2s; outline: none; }
        .btn-primary { background-color: #7B5233; color: white; border: none; box-shadow: 0 4px 12px rgba(123, 82, 51, 0.12); }
        .btn-primary:hover:not(:disabled) { background-color: #5D3E26; transform: translateY(-1px); }
        .btn-primary:disabled { background-color: #D3C1B4; cursor: not-allowed; box-shadow: none; color: white; }
        .btn-outline { background: white; border: 1.5px solid #EADCC9; color: #7B5233; }
        .btn-outline:hover { background-color: #FAF6F0; border-color: #C8B2A6; }
        
        .error-message { background-color: #FFEBEE; color: #C62828; padding: 10px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 0.82rem; border: 1px solid #FFCDD2; font-weight: 600; }
        .success-message { background-color: #E8F5E9; color: #2E7D32; padding: 10px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 0.82rem; border: 1px solid #C8E6C9; font-weight: 600; }
        
        /* Animation slide down */
        .animate-slide-down { animation: slideDown 0.25s ease-out forwards; transform-origin: top; }
        @keyframes slideDown { from { opacity: 0; transform: scaleY(0.9); } to { opacity: 1; transform: scaleY(1); } }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .account-info-grid { grid-template-columns: 1fr; gap: 20px; }
          .avatar-actions-column { border-right: none; border-bottom: 1.5px solid #F5EDE4; padding-right: 0; padding-bottom: 20px; width: 100%; }
          .avatar-buttons { flex-direction: row; width: 100%; justify-content: center; }
          .btn-action-custom { width: auto; min-width: 160px; }
          .password-input-container { max-width: 320px; }
        }
        
        @media (max-width: 1280px) {
          .permission-screen-row { flex-direction: column; align-items: stretch; gap: 12px; }
          .screen-checkboxes-container { width: 100%; max-width: 100%; }
        }
        
        @media (max-width: 768px) {
          .form-inputs-grid { grid-template-columns: 1fr; }
          .form-inputs-grid .full-width-span { grid-column: span 1; }
          .form-inputs-grid .span-two-columns { grid-column: span 1; }
          .avatar-buttons { flex-direction: column; }
          .btn-action-custom { width: 100%; }
          .permissions-header-actions { flex-direction: column; align-items: stretch; width: 100%; }
          .search-box-wrapper { width: 100%; }
          .accordion-header { flex-direction: column; align-items: stretch; gap: 10px; }
          .group-allow-toggle { justify-content: space-between; }
          .checkboxes-allowed-group { flex-wrap: wrap; }
        }

        /* CSS Modal Đổi Mật Khẩu */
        .modal-backdrop-custom {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal-content-custom {
          background: #FFFFFF;
          border-radius: 12px;
          border: 1px solid #EADCC9;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 10px 30px rgba(123, 82, 51, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modal-header-custom {
          padding: 16px 20px;
          border-bottom: 1.5px solid #F5EDE4;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #FAF8F5;
        }
        .modal-header-custom h4 {
          margin: 0;
          color: #7B5233;
          font-size: 1.1rem;
          font-weight: 800;
        }
        .btn-close-modal {
          background: none;
          border: none;
          color: #8C7B72;
          font-size: 1.1rem;
          cursor: pointer;
          transition: color 0.2s;
          outline: none;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }
        .btn-close-modal:hover {
          color: #7B5233;
        }
        .modal-body-custom {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .form-group-custom {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-group-custom label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #5D4037;
        }
        .form-group-custom input {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1.5px solid #EADCC9;
          font-size: 0.85rem;
          outline: none;
          transition: all 0.2s;
          font-weight: 500;
          color: #2D1A12;
          background-color: #FFFFFF;
        }
        .form-group-custom input:focus {
          border-color: #7B5233;
          box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1);
        }
        .modal-footer-custom {
          padding: 14px 20px;
          border-top: 1.5px solid #F5EDE4;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background-color: #FAF8F5;
        }
      `}} />
    </div>
  );
};

export default UserEdit;
