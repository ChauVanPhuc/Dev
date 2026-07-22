import React from 'react';


const ManufactureDashboard = () => {
    const metrics = [
        { label: 'Hiệu suất dây chuyền', value: '92%', status: 'Tăng 2%', color: '#4CAF50' },
        { label: 'Sản phẩm lỗi (QC)', value: '0.5%', status: 'Giảm 0.1%', color: '#F44336' },
        { label: 'Sử dụng nhân lực', value: '88%', status: 'Ổn định', color: '#2196F3' },
        { label: 'Thời gian dừng máy', value: '12h', status: 'Cần chú ý', color: '#FF9800' },
    ];

    return (
        <div className="manufacture-plan-container">
            {/* Title removed for Layout consistency */}
            
            <div className="stats-grid">
                {metrics.map((m, idx) => (
                    <div key={idx} className="stat-card" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: `5px solid ${m.color}` }}>
                        <span className="stat-title" style={{ color: '#666' }}>{m.label}</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px' }}>
                            <span className="stat-value" style={{ color: '#333' }}>{m.value}</span>
                            <span style={{ fontSize: '0.75rem', color: m.color, fontWeight: 700 }}>{m.status}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card-shadow" style={{ marginTop: '30px', padding: '30px', textAlign: 'center', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #FFF 0%, #F5F5F5 100%)' }}>
                <div>
                   <h3 style={{ color: '#7B5233' }}>Biểu đồ Sản lượng hàng tháng</h3>
                   <p style={{ color: '#666' }}>[ Biểu đồ năng suất sẽ được hiển thị tại đây khi có dữ liệu thật ]</p>
                </div>
            </div>
        </div>
    );
};

export default ManufactureDashboard;
