import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { parseDbPermission } from './components/UserScreenConfig';
import { buildPermissionGroupsFromSidebar, getGroupIcon } from './utils/permissionUtils';


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
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/users/permissions/:id');

  const [userInfo, setUserInfo] = useState(null);
  const [screenPermissions, setScreenPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState('web');
  const [expandedGroups, setExpandedGroups] = useState({ 'web_0': true, 'mobile_0': true });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sidebarItems, setSidebarItems] = useState([]);
  const [screens, setScreens] = useState([]);
  // Lưu trữ phân quyền resolved ban đầu từ API để so sánh khi save
  const initialResolvedPerms = React.useRef({});

  const dynamicWebGroups = useMemo(() => {
    return buildPermissionGroupsFromSidebar(sidebarItems, 'web', screens);
  }, [sidebarItems, screens]);

  const dynamicMobileGroups = useMemo(() => {
    return buildPermissionGroupsFromSidebar(sidebarItems, 'mobile', screens);
  }, [sidebarItems, screens]);

  // Cập nhật tiêu đề trang lên Layout Header động từ CSDL
  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);

  // Tải chi tiết người dùng và phân quyền từ backend CSDL
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [userRes, permRes, sidebarRes, screensRes] = await Promise.all([
          api.get(`/accounts/${id}`),
          api.get(`/accounts/${id}/permissions?resolved=true`),
          api.get('/system/sidebar/all'),
          api.get('/screens')
        ]);
        setUserInfo(userRes);
        setSidebarItems(sidebarRes || []);
        setScreens(screensRes || []);

        const dbPerms = permRes.permissions || {};
        
        const webGroups = buildPermissionGroupsFromSidebar(sidebarRes || [], 'web', screensRes || []);
        const mobileGroups = buildPermissionGroupsFromSidebar(sidebarRes || [], 'mobile', screensRes || []);

        const initialPerms = {};
        webGroups.forEach(group => {
          group.screens.forEach(scr => {
            initialPerms[scr.key] = parseDbPermission(dbPerms[scr.key] || 'none');
          });
        });
        mobileGroups.forEach(group => {
          group.screens.forEach(scr => {
            initialPerms[scr.key] = parseDbPermission(dbPerms[scr.key] || 'none');
          });
        });
        // Lưu bản gốc resolved để so sánh khi save (chỉ lưu diff)
        initialResolvedPerms.current = JSON.parse(JSON.stringify(initialPerms));
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
    const groups = isMobile ? dynamicMobileGroups : dynamicWebGroups;
    const group = groups[groupIdx];
    if (!group) return false;
    return group.screens.some(s => {
      const perms = screenPermissions[s.key] || [];
      return perms.length > 0 && !perms.includes('none');
    });
  };

  const handleGroupToggle = (groupIdx, allow, isMobile = false) => {
    const groups = isMobile ? dynamicMobileGroups : dynamicWebGroups;
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
      // Chỉ lưu những key mà user đã thực sự thay đổi so với resolved mặc định
      const permissionsToSave = {};
      const initialPerms = initialResolvedPerms.current || {};
      Object.keys(screenPermissions).forEach(key => {
        const currentPerms = screenPermissions[key] || [];
        const initialPermsForKey = initialPerms[key] || [];
        
        const currentSorted = [...currentPerms].sort().join(',');
        const initialSorted = [...initialPermsForKey].sort().join(',');
        
        if (currentSorted !== initialSorted) {
          permissionsToSave[key] = currentPerms.includes('none') || currentPerms.length === 0 
            ? 'none' 
            : currentPerms.join(',');
        }
      });

      await api.put(`/accounts/${id}/permissions`, {
        permissions: permissionsToSave
      });

      setSuccess(true);
      
      // localStorage lưu full permissions (cho sidebar/navigation)
      const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      if (Number(loggedInUser.id) === Number(id)) {
        const fullPermsToStore = {};
        Object.keys(screenPermissions).forEach(key => {
          const perms = screenPermissions[key] || [];
          fullPermsToStore[key] = perms.includes('none') || perms.length === 0 ? 'none' : perms.join(',');
        });
        localStorage.setItem('smartflow_active_permissions', JSON.stringify(fullPermsToStore));
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
      dynamicWebGroups.forEach(group => {
        group.screens.forEach(scr => {
          initialPerms[scr.key] = parseDbPermission(dbPerms[scr.key] || 'none');
        });
      });
      dynamicMobileGroups.forEach(group => {
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
      dynamicWebGroups.forEach((group, index) => {
        const hasMatch = group.screens.some(s =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.key.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (hasMatch) {
          nextExpanded[`web_${index}`] = true;
        }
      });
      dynamicMobileGroups.forEach((group, index) => {
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
  }, [searchQuery, dynamicWebGroups, dynamicMobileGroups]);

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
            const activeGroups = isMobileTab ? dynamicMobileGroups : dynamicWebGroups;

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
                        {getGroupIcon(group.title)}
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
