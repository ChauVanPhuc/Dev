# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy.orm import Session
from config.database import SessionLocal, engine, Base
from modules.hr.models.hr_models import (
    HRDepartment, HRPosition, HRSection, HREmployee, HROrgNode, HRNodeAssignment, HRHierarchyNode, HRPersonnelNode, HRFactoryStructure
)

def seed_hr_data():
    # Force creation of tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Clearing old HR database data for clean seed...")
        # Clear existing data to ensure no constraints or duplicate issues
        db.query(HRNodeAssignment).delete()
        db.query(HROrgNode).delete()
        db.query(HRHierarchyNode).delete()
        db.query(HRPersonnelNode).delete()
        db.query(HRFactoryStructure).delete()
        db.query(HREmployee).delete()
        db.query(HRSection).delete()
        db.query(HRPosition).delete()
        db.query(HRDepartment).delete()
        db.commit()

        print("Seeding rich and realistic HR database defaults...")
        
        # 1. Seed Departments
        dept_data = [
            {"code": "BGD", "name": "Ban Giám Đốc", "description": "Ban Giám Đốc điều hành công ty"},
            {"code": "SX", "name": "Phòng Sản Xuất", "description": "Phòng thực hiện sản xuất gia công"},
            {"code": "KH", "name": "Phòng Kế Hoạch", "description": "Phòng lên kế hoạch & điều phối sản xuất"},
            {"code": "QC", "name": "Phòng Chất Lượng", "description": "Phòng kiểm tra và đảm bảo chất lượng"},
            {"code": "HCNS", "name": "Phòng Hành Chính Nhân Sự", "description": "Phòng quản trị nguồn nhân lực và hành chính"}
        ]
        departments = {}
        for d in dept_data:
            dept = HRDepartment(**d)
            db.add(dept)
            db.flush()
            departments[d["code"]] = dept
            print(f"Added Department: {d['name']}")
                
        # 2. Seed Positions
        pos_data = [
            {"code": "GD", "name": "Giám Đốc", "description": "Giám đốc điều hành"},
            {"code": "TP", "name": "Trưởng Phòng", "description": "Trưởng phòng ban chức năng"},
            {"code": "TT", "name": "Tổ Trưởng", "description": "Tổ trưởng quản lý tổ sản xuất"},
            {"code": "CN", "name": "Công Nhân / Nhân Viên", "description": "Công nhân trực tiếp hoặc nhân viên văn phòng"}
        ]
        positions = {}
        for p in pos_data:
            pos = HRPosition(**p)
            db.add(pos)
            db.flush()
            positions[p["code"]] = pos
            print(f"Added Position: {p['name']}")
                
        # 3. Seed Sections
        sec_data = [
            {"code": "T1", "name": "Tổ Sản Xuất 1", "description": "Tổ trực tiếp vận hành dây chuyền 1"},
            {"code": "T2", "name": "Tổ Sản Xuất 2", "description": "Tổ trực tiếp vận hành dây chuyền 2"},
            {"code": "TQC", "name": "Tổ QC", "description": "Tổ kiểm soát chất lượng tại phân xưởng"},
            {"code": "TKH", "name": "Tổ Kế Hoạch", "description": "Tổ lập lịch và quản lý vật tư"}
        ]
        sections = {}
        for s in sec_data:
            sec = HRSection(**s)
            db.add(sec)
            db.flush()
            sections[s["code"]] = sec
            print(f"Added Section: {s['name']}")
                
        # 4. Seed Employees (15 employees!)
        emp_data = [
            {
                "employee_id": "NV0001",
                "full_name": "Nguyễn Văn A",
                "phone": "0901234567",
                "hire_date": "2020-01-01",
                "department_id": departments["BGD"].id,
                "position_id": positions["GD"].id,
                "section_id": None
            },
            {
                "employee_id": "NV0002",
                "full_name": "Trần Thị B",
                "phone": "0907654321",
                "hire_date": "2021-06-15",
                "department_id": departments["SX"].id,
                "position_id": positions["TP"].id,
                "section_id": None
            },
            {
                "employee_id": "NV0003",
                "full_name": "Phạm Văn C",
                "phone": "0988888888",
                "hire_date": "2022-09-01",
                "department_id": departments["SX"].id,
                "position_id": positions["TT"].id,
                "section_id": sections["T1"].id
            },
            {
                "employee_id": "NV0004",
                "full_name": "Hoàng Văn D",
                "phone": "0912345678",
                "hire_date": "2021-02-10",
                "department_id": departments["QC"].id,
                "position_id": positions["TP"].id,
                "section_id": None
            },
            {
                "employee_id": "NV0005",
                "full_name": "Lê Thị E",
                "phone": "0915678901",
                "hire_date": "2021-11-01",
                "department_id": departments["KH"].id,
                "position_id": positions["TP"].id,
                "section_id": None
            },
            {
                "employee_id": "NV0006",
                "full_name": "Nguyễn Thị F",
                "phone": "0934567890",
                "hire_date": "2022-03-20",
                "department_id": departments["SX"].id,
                "position_id": positions["TT"].id,
                "section_id": sections["T2"].id
            },
            {
                "employee_id": "NV0007",
                "full_name": "Phạm Thị G",
                "phone": "0976543210",
                "hire_date": "2022-10-05",
                "department_id": departments["QC"].id,
                "position_id": positions["TT"].id,
                "section_id": sections["TQC"].id
            },
            {
                "employee_id": "NV0008",
                "full_name": "Trần Văn H",
                "phone": "0945678901",
                "hire_date": "2022-05-12",
                "department_id": departments["KH"].id,
                "position_id": positions["TT"].id,
                "section_id": sections["TKH"].id
            },
            {
                "employee_id": "NV0009",
                "full_name": "Đặng Văn I",
                "phone": "0967890123",
                "hire_date": "2023-01-15",
                "department_id": departments["SX"].id,
                "position_id": positions["CN"].id,
                "section_id": sections["T1"].id
            },
            {
                "employee_id": "NV0010",
                "full_name": "Vũ Văn J",
                "phone": "0989012345",
                "hire_date": "2023-02-18",
                "department_id": departments["SX"].id,
                "position_id": positions["CN"].id,
                "section_id": sections["T1"].id
            },
            {
                "employee_id": "NV0011",
                "full_name": "Bùi Thị K",
                "phone": "0912121212",
                "hire_date": "2023-04-10",
                "department_id": departments["SX"].id,
                "position_id": positions["CN"].id,
                "section_id": sections["T2"].id
            },
            {
                "employee_id": "NV0012",
                "full_name": "Trần Văn L",
                "phone": "0923232323",
                "hire_date": "2023-05-22",
                "department_id": departments["SX"].id,
                "position_id": positions["CN"].id,
                "section_id": sections["T2"].id
            },
            {
                "employee_id": "NV0013",
                "full_name": "Ngô Quốc M",
                "phone": "0934343434",
                "hire_date": "2023-07-01",
                "department_id": departments["QC"].id,
                "position_id": positions["CN"].id,
                "section_id": sections["TQC"].id
            },
            {
                "employee_id": "NV0014",
                "full_name": "Đỗ Thị N",
                "phone": "0945454545",
                "hire_date": "2023-08-15",
                "department_id": departments["KH"].id,
                "position_id": positions["CN"].id,
                "section_id": sections["TKH"].id
            },
            {
                "employee_id": "NV0015",
                "full_name": "Trịnh Văn O",
                "phone": "0956565656",
                "hire_date": "2021-08-01",
                "department_id": departments["HCNS"].id,
                "position_id": positions["TP"].id,
                "section_id": None
            }
        ]
        employees = {}
        for e in emp_data:
            emp = HREmployee(**e)
            db.add(emp)
            db.flush()
            employees[e["employee_id"]] = emp
            print(f"Added Employee: {e['full_name']}")
                
        # 5. Seed Org Nodes & Assignments (Sơ đồ tổ chức)
        # Root node: Giám Đốc (Cấp 1)
        root_node = HROrgNode(
            level_name="Cấp 1",
            parent_id=None,
            department_id=departments["BGD"].id,
            position_id=positions["GD"].id,
            section_id=None,
            note="Nút điều hành gốc"
        )
        db.add(root_node)
        db.flush()
        print("Added Org Node Level 1 (Giám Đốc)")
        
        # Assign NV0001
        db.add(HRNodeAssignment(node_id=root_node.id, employee_id=employees["NV0001"].id, assigned_date="2020-01-01"))
            
        # Level 2.1: Trưởng Phòng Sản Xuất
        tp_sx_node = HROrgNode(
            level_name="Cấp 2",
            parent_id=root_node.id,
            department_id=departments["SX"].id,
            position_id=positions["TP"].id,
            section_id=None,
            note="Trưởng phòng sản xuất"
        )
        db.add(tp_sx_node)
        db.flush()
        db.add(HRNodeAssignment(node_id=tp_sx_node.id, employee_id=employees["NV0002"].id, assigned_date="2021-06-15"))
        
        # Level 2.2: Trưởng Phòng QC
        tp_qc_node = HROrgNode(
            level_name="Cấp 2",
            parent_id=root_node.id,
            department_id=departments["QC"].id,
            position_id=positions["TP"].id,
            section_id=None,
            note="Trưởng phòng chất lượng"
        )
        db.add(tp_qc_node)
        db.flush()
        db.add(HRNodeAssignment(node_id=tp_qc_node.id, employee_id=employees["NV0004"].id, assigned_date="2021-02-10"))

        # Level 2.3: Trưởng Phòng Kế Hoạch
        tp_kh_node = HROrgNode(
            level_name="Cấp 2",
            parent_id=root_node.id,
            department_id=departments["KH"].id,
            position_id=positions["TP"].id,
            section_id=None,
            note="Trưởng phòng kế hoạch"
        )
        db.add(tp_kh_node)
        db.flush()
        db.add(HRNodeAssignment(node_id=tp_kh_node.id, employee_id=employees["NV0005"].id, assigned_date="2021-11-01"))

        # Level 2.4: Trưởng Phòng HCNS
        tp_hc_node = HROrgNode(
            level_name="Cấp 2",
            parent_id=root_node.id,
            department_id=departments["HCNS"].id,
            position_id=positions["TP"].id,
            section_id=None,
            note="Trưởng phòng hành chính nhân sự"
        )
        db.add(tp_hc_node)
        db.flush()
        db.add(HRNodeAssignment(node_id=tp_hc_node.id, employee_id=employees["NV0015"].id, assigned_date="2021-08-01"))

        # Level 3.1: Tổ Trưởng Tổ 1 (Sản xuất)
        tt1_node = HROrgNode(
            level_name="Cấp 3",
            parent_id=tp_sx_node.id,
            department_id=departments["SX"].id,
            position_id=positions["TT"].id,
            section_id=sections["T1"].id,
            note="Tổ trưởng tổ sản xuất 1"
        )
        db.add(tt1_node)
        db.flush()
        db.add(HRNodeAssignment(node_id=tt1_node.id, employee_id=employees["NV0003"].id, assigned_date="2022-09-01"))

        # Level 3.2: Tổ Trưởng Tổ 2 (Sản xuất)
        tt2_node = HROrgNode(
            level_name="Cấp 3",
            parent_id=tp_sx_node.id,
            department_id=departments["SX"].id,
            position_id=positions["TT"].id,
            section_id=sections["T2"].id,
            note="Tổ trưởng tổ sản xuất 2"
        )
        db.add(tt2_node)
        db.flush()
        db.add(HRNodeAssignment(node_id=tt2_node.id, employee_id=employees["NV0006"].id, assigned_date="2022-03-20"))

        # Level 3.3: Tổ Trưởng QC
        ttqc_node = HROrgNode(
            level_name="Cấp 3",
            parent_id=tp_qc_node.id,
            department_id=departments["QC"].id,
            position_id=positions["TT"].id,
            section_id=sections["TQC"].id,
            note="Tổ trưởng QC"
        )
        db.add(ttqc_node)
        db.flush()
        db.add(HRNodeAssignment(node_id=ttqc_node.id, employee_id=employees["NV0007"].id, assigned_date="2022-10-05"))

        # Level 3.4: Tổ Trưởng Kế Hoạch
        ttkh_node = HROrgNode(
            level_name="Cấp 3",
            parent_id=tp_kh_node.id,
            department_id=departments["KH"].id,
            position_id=positions["TT"].id,
            section_id=sections["TKH"].id,
            note="Tổ trưởng kế hoạch"
        )
        db.add(ttkh_node)
        db.flush()
        db.add(HRNodeAssignment(node_id=ttkh_node.id, employee_id=employees["NV0008"].id, assigned_date="2022-05-12"))


        # 6. Seed Hierarchy Nodes (Sơ đồ cấp bậc)
        h1 = HRHierarchyNode(rank_level="Cấp 1", parent_id=None, position_id=positions["GD"].id, description="Ban Điều Hành cao nhất")
        db.add(h1)
        db.flush()
        
        h2 = HRHierarchyNode(rank_level="Cấp 2", parent_id=h1.id, position_id=positions["TP"].id, description="Quản lý cấp trung - Trưởng các phòng ban")
        db.add(h2)
        db.flush()

        h3 = HRHierarchyNode(rank_level="Cấp 3", parent_id=h2.id, position_id=positions["TT"].id, description="Quản lý cấp cơ sở - Tổ trưởng")
        db.add(h3)
        db.flush()

        h4 = HRHierarchyNode(rank_level="Cấp 4", parent_id=h3.id, position_id=positions["CN"].id, description="Nhân viên tác nghiệp trực tiếp")
        db.add(h4)


        # 7. Seed Personnel Nodes (Sơ đồ nhân sự - phân bổ số lượng nhân sự thực tế)
        p_bgd = HRPersonnelNode(node_name="Ban Giám Đốc", parent_id=None, department_id=departments["BGD"].id, section_id=None, employee_count=1, description="Đội ngũ lãnh đạo tối cao")
        db.add(p_bgd)
        db.flush()

        p_sx = HRPersonnelNode(node_name="Phòng Sản Xuất", parent_id=p_bgd.id, department_id=departments["SX"].id, section_id=None, employee_count=6, description="Khối sản xuất chính")
        db.add(p_sx)
        db.flush()

        p_t1 = HRPersonnelNode(node_name="Tổ Sản Xuất 1", parent_id=p_sx.id, department_id=departments["SX"].id, section_id=sections["T1"].id, employee_count=3, description="Chịu trách nhiệm Line 1")
        db.add(p_t1)
        
        p_t2 = HRPersonnelNode(node_name="Tổ Sản Xuất 2", parent_id=p_sx.id, department_id=departments["SX"].id, section_id=sections["T2"].id, employee_count=3, description="Chịu trách nhiệm Line 2")
        db.add(p_t2)

        p_qc = HRPersonnelNode(node_name="Phòng Chất Lượng (QC)", parent_id=p_bgd.id, department_id=departments["QC"].id, section_id=None, employee_count=3, description="Bảo đảm chất lượng sản phẩm")
        db.add(p_qc)
        db.flush()

        p_tqc = HRPersonnelNode(node_name="Tổ QC Hiện Trường", parent_id=p_qc.id, department_id=departments["QC"].id, section_id=sections["TQC"].id, employee_count=2, description="Kiểm soát chất lượng tại xưởng")
        db.add(p_tqc)

        p_kh = HRPersonnelNode(node_name="Phòng Kế Hoạch", parent_id=p_bgd.id, department_id=departments["KH"].id, section_id=None, employee_count=3, description="Kế hoạch vật tư và điều phối")
        db.add(p_kh)
        db.flush()

        p_tkh = HRPersonnelNode(node_name="Tổ Kế Hoạch Cung Ứng", parent_id=p_kh.id, department_id=departments["KH"].id, section_id=sections["TKH"].id, employee_count=2, description="Cung ứng nguyên vật liệu")
        db.add(p_tkh)

        p_hcns = HRPersonnelNode(node_name="Phòng HCNS", parent_id=p_bgd.id, department_id=departments["HCNS"].id, section_id=None, employee_count=1, description="Hành chính & Nhân sự")
        db.add(p_hcns)


        # 8. Seed Factory Structures (Sơ đồ cấu trúc nhà máy)
        sf_factory = HRFactoryStructure(structure_code="NM_SF", structure_name="Nhà Máy SmartFlow G7", structure_type="Nhà máy", parent_id=None, department_id=None, description="Trụ sở chính sản xuất")
        db.add(sf_factory)
        db.flush()

        px_ck = HRFactoryStructure(structure_code="PX_CK", structure_name="Phân Xưởng Cơ Khí", structure_type="Phân xưởng", parent_id=sf_factory.id, department_id=departments["SX"].id, description="Gia công cơ khí, cắt gọt")
        db.add(px_ck)
        db.flush()

        t1_ck = HRFactoryStructure(structure_code="T1_CK", structure_name="Khu Vực Tổ Sản Xuất 1", structure_type="Tổ sản xuất", parent_id=px_ck.id, department_id=departments["SX"].id, description="Đặt máy phay, tiện, bào")
        db.add(t1_ck)

        t2_ck = HRFactoryStructure(structure_code="T2_CK", structure_name="Khu Vực Tổ Sản Xuất 2", structure_type="Tổ sản xuất", parent_id=px_ck.id, department_id=departments["SX"].id, description="Khu vực đúc và tạo hình")
        db.add(t2_ck)

        px_lr = HRFactoryStructure(structure_code="PX_LR", structure_name="Phân Xưởng Lắp Ráp & QC", structure_type="Phân xưởng", parent_id=sf_factory.id, department_id=departments["QC"].id, description="Đóng gói lắp ráp thành phẩm")
        db.add(px_lr)
        db.flush()

        kv_vp = HRFactoryStructure(structure_code="KV_VP", structure_name="Khu Vực Văn Phòng", structure_type="Văn phòng", parent_id=sf_factory.id, department_id=departments["HCNS"].id, description="Văn phòng làm việc liên phòng ban")
        db.add(kv_vp)
        db.flush()

        p_bgd_room = HRFactoryStructure(structure_code="P_BGD", structure_name="Phòng họp Ban Giám Đốc", structure_type="Phòng họp", parent_id=kv_vp.id, department_id=departments["BGD"].id, description="Nơi họp của ban điều hành")
        db.add(p_bgd_room)

        p_qc_room = HRFactoryStructure(structure_code="P_QC", structure_name="Phòng Lab QC", structure_type="Phòng kiểm tra", parent_id=kv_vp.id, department_id=departments["QC"].id, description="Phòng thử nghiệm chất lượng cao")
        db.add(p_qc_room)


        db.commit()
        print("[SUCCESS] Rich HR Seeder executed successfully.")
    except Exception as e:
        db.rollback()
        print(f"[FAILED] Seeding HR failed: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_hr_data()
