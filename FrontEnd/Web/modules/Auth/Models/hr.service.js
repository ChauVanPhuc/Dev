import api from '@webShared/Services/api.service';

export const hrService = {
  // --- EMPLOYEES ---
  getEmployees: async ({ page = 1, size = 10, search = '', departmentId = null, positionId = null, sectionId = null } = {}) => {
    let url = `/hr/employees?page=${page}&size=${size}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (departmentId) url += `&department_id=${departmentId}`;
    if (positionId) url += `&position_id=${positionId}`;
    if (sectionId) url += `&section_id=${sectionId}`;
    return await api.get(url);
  },

  createEmployee: async (data) => {
    return await api.post('/hr/employees', data);
  },

  updateEmployee: async (id, data) => {
    return await api.put(`/hr/employees/${id}`, data);
  },

  deleteEmployee: async (id) => {
    return await api.delete(`/hr/employees/${id}`);
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/hr/employees/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  importEmployees: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post('/hr/employees/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  exportEmployees: async () => {
    // Return the download blob directly
    return await api.get('/hr/employees/export', { responseType: 'blob' });
  },

  // --- DEPARTMENTS ---
  getDepartments: async (search = '') => {
    const url = search ? `/hr/departments?search=${encodeURIComponent(search)}` : '/hr/departments';
    return await api.get(url);
  },

  createDepartment: async (data) => {
    return await api.post('/hr/departments', data);
  },

  deleteDepartment: async (id) => {
    return await api.delete(`/hr/departments/${id}`);
  },

  updateDepartment: async (id, data) => {
    return await api.put(`/hr/departments/${id}`, data);
  },

  // --- POSITIONS ---
  getPositions: async (search = '', departmentId = null, roleId = null) => {
    let url = '/hr/positions';
    const params = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (departmentId) params.push(`department_id=${departmentId}`);
    if (roleId) params.push(`role_id=${roleId}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return await api.get(url);
  },

  createPosition: async (data) => {
    return await api.post('/hr/positions', data);
  },

  deletePosition: async (id) => {
    return await api.delete(`/hr/positions/${id}`);
  },

  updatePosition: async (id, data) => {
    return await api.put(`/hr/positions/${id}`, data);
  },

  // --- SECTIONS ---
  getSections: async (search = '', roleId = null) => {
    let url = '/hr/sections';
    const params = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (roleId) params.push(`role_id=${roleId}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return await api.get(url);
  },

  createSection: async (data) => {
    return await api.post('/hr/sections', data);
  },

  deleteSection: async (id) => {
    return await api.delete(`/hr/sections/${id}`);
  },

  updateSection: async (id, data) => {
    return await api.put(`/hr/sections/${id}`, data);
  },

  // --- ORG CHART NODES ---
  getOrgNodes: async () => {
    return await api.get('/hr/org-nodes');
  },

  createOrgNode: async (data) => {
    return await api.post('/hr/org-nodes', data);
  },

  updateOrgNode: async (id, data) => {
    return await api.put(`/hr/org-nodes/${id}`, data);
  },

  deleteOrgNode: async (id) => {
    return await api.delete(`/hr/org-nodes/${id}`);
  },

  // --- ASSIGNMENTS ---
  assignEmployee: async (data) => {
    return await api.post('/hr/assignments', data);
  },

  unassignEmployee: async (id) => {
    return await api.delete(`/hr/assignments/${id}`);
  },

  // --- HIERARCHY NODES ---
  getHierarchyNodes: async () => {
    return await api.get('/hr/hierarchy-nodes');
  },

  createHierarchyNode: async (data) => {
    return await api.post('/hr/hierarchy-nodes', data);
  },

  updateHierarchyNode: async (id, data) => {
    return await api.put(`/hr/hierarchy-nodes/${id}`, data);
  },

  deleteHierarchyNode: async (id) => {
    return await api.delete(`/hr/hierarchy-nodes/${id}`);
  },

  // --- PERSONNEL NODES ---
  getPersonnelNodes: async () => {
    return await api.get('/hr/personnel-nodes');
  },

  createPersonnelNode: async (data) => {
    return await api.post('/hr/personnel-nodes', data);
  },

  updatePersonnelNode: async (id, data) => {
    return await api.put(`/hr/personnel-nodes/${id}`, data);
  },

  deletePersonnelNode: async (id) => {
    return await api.delete(`/hr/personnel-nodes/${id}`);
  },

  // --- FACTORY STRUCTURES ---
  getFactoryStructures: async () => {
    return await api.get('/hr/factory-structures');
  },

  createFactoryStructure: async (data) => {
    return await api.post('/hr/factory-structures', data);
  },

  updateFactoryStructure: async (id, data) => {
    return await api.put(`/hr/factory-structures/${id}`, data);
  },

  upsertFactoryStructure: async (code, data) => {
    return await api.put(`/hr/factory-structures/upsert/${encodeURIComponent(code)}`, data);
  },

  syncFactoryStructuresFromBOM: async () => {
    return await api.post('/hr/factory-structures/sync-from-bom');
  },

  deleteFactoryStructure: async (id) => {
    return await api.delete(`/hr/factory-structures/${id}`);
  },

  // --- SUB-TABLE SERVICES ---
  getFactoryDepartments: async (factoryId) => {
    return await api.get(`/hr/factory-structures/${factoryId}/departments`);
  },

  addFactoryDepartment: async (factoryId, departmentId) => {
    return await api.post(`/hr/factory-structures/${factoryId}/departments`, { department_id: departmentId });
  },

  removeFactoryDepartment: async (factoryId, departmentId) => {
    return await api.delete(`/hr/factory-structures/${factoryId}/departments/${departmentId}`);
  },

  getFactoryChildren: async (factoryId) => {
    return await api.get(`/hr/factory-structures/${factoryId}/children`);
  },

  getDepartmentEmployees: async (deptId) => {
    return await api.get(`/hr/departments/${deptId}/employees`);
  },

  getDepartmentPositions: async (deptId) => {
    return await api.get(`/hr/departments/${deptId}/positions`);
  },

  addDepartmentPosition: async (deptId, positionId) => {
    return await api.post(`/hr/departments/${deptId}/positions`, { position_id: positionId });
  },

  removeDepartmentPosition: async (deptId, positionId) => {
    return await api.delete(`/hr/departments/${deptId}/positions/${positionId}`);
  },

  getPositionEmployees: async (posId) => {
    return await api.get(`/hr/positions/${posId}/employees`);
  },

  getPositionDepartments: async (posId) => {
    return await api.get(`/hr/positions/${posId}/departments`);
  },

  getRoleEmployees: async (roleId) => {
    return await api.get(`/hr/roles/${roleId}/employees`);
  }
};
