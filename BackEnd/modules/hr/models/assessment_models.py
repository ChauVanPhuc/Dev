# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base

class HRAssessment(Base):
    """
    Bảng Quản lý Đề thi & Bài kiểm tra Năng lực Nhân sự
    """
    __tablename__ = "hr_assessments"

    id = Column(Integer, primary_key=True, index=True)
    assessment_code = Column(NVARCHAR(50), unique=True, index=True, nullable=False) # quiz_qa_01, quiz6...
    title = Column(NVARCHAR(255), nullable=False) # Tên bài kiểm tra
    description = Column(NVARCHAR(1000), nullable=True) # Mô tả chi tiết
    category = Column(NVARCHAR(100), nullable=True, default="Quản lý chất lượng") # Danh mục / Bộ phận
    target_positions_json = Column(NVARCHAR(None), nullable=True) # Danh sách nhóm vị trí áp dụng ["QA", "QC", "Tổ trưởng", ...]
    
    duration_minutes = Column(Integer, default=45) # Thời gian làm bài (phút)
    total_questions = Column(Integer, default=0) # Tổng số câu hỏi
    pass_percentage = Column(Float, default=60.0) # Điểm % tối thiểu để đạt
    
    shuffle_questions = Column(Boolean, default=True) # Tự động xáo trộn câu hỏi
    shuffle_options = Column(Boolean, default=True) # Tự động xáo trộn phương án A, B, C, D
    
    status = Column(NVARCHAR(50), default="active") # active (Hoạt động), paused (Tạm dừng), draft (Nháp)
    instructions = Column(NVARCHAR(None), nullable=True) # Hướng dẫn làm bài
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    questions = relationship("HRAssessmentQuestion", back_populates="assessment", cascade="all, delete-orphan", order_by="HRAssessmentQuestion.order_index")
    submissions = relationship("HRAssessmentSubmission", back_populates="assessment", cascade="all, delete-orphan")


class HRAssessmentQuestion(Base):
    """
    Bảng Quản lý Ngân hàng Câu hỏi trong Bài kiểm tra
    """
    __tablename__ = "hr_assessment_questions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("hr_assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    
    question_type = Column(NVARCHAR(50), default="single_choice") # single_choice, multi_choice, essay, true_false
    question_text = Column(NVARCHAR(None), nullable=False) # Nội dung câu hỏi
    category_tag = Column(NVARCHAR(100), nullable=True) # Chủ đề / Tiêu chuẩn: CARB, FSC, SOP, CAPA...
    
    options_json = Column(NVARCHAR(None), nullable=False) # JSON: [{"id": "A", "text": "..."}, {"id": "B", "text": "..."}]
    correct_answers_json = Column(NVARCHAR(None), nullable=False) # JSON: ["B"] hoặc ["A", "C"]
    
    points = Column(Float, default=1.0) # Thang điểm cho câu hỏi
    explanation = Column(NVARCHAR(None), nullable=True) # Giải thích đáp án & tiêu chuẩn
    order_index = Column(Integer, default=0) # Thứ tự hiển thị mặc định
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assessment = relationship("HRAssessment", back_populates="questions")
    answers = relationship("HRAssessmentAnswer", back_populates="question")


class HRAssessmentSubmission(Base):
    """
    Bảng Lưu kết quả Làm bài kiểm tra của Nhân sự
    """
    __tablename__ = "hr_assessment_submissions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("hr_assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    
    candidate_name = Column(NVARCHAR(150), nullable=False) # Họ và tên nhân sự
    position_name = Column(NVARCHAR(150), nullable=False) # Vị trí công việc đánh giá
    department_name = Column(NVARCHAR(150), nullable=False) # Đội ngũ / Bộ phận / Chuyền xưởng
    employee_code = Column(NVARCHAR(50), nullable=True) # Mã nhân viên (NV-1082...)
    
    started_at = Column(DateTime, default=datetime.utcnow) # Thời gian bắt đầu làm
    submitted_at = Column(DateTime, default=datetime.utcnow) # Thời gian nộp bài
    time_spent_seconds = Column(Integer, default=0) # Thời gian làm bài thực tế (giây)
    
    total_score = Column(Float, default=0.0) # Điểm số đạt được
    max_score = Column(Float, default=0.0) # Điểm số tối đa của đề thi
    percentage = Column(Float, default=0.0) # Tỷ lệ % đạt được (0 - 100%)
    
    rank_level = Column(NVARCHAR(50), default="Level F") # Level A, Level B, Level C, Level D, Level F
    rank_title = Column(NVARCHAR(200), nullable=True) # Level F - Kém / Không đạt yêu cầu
    nine_box_category = Column(NVARCHAR(200), nullable=True) # Low Skill - Low Will (Underperformer / Risk)
    position_fit_status = Column(NVARCHAR(200), nullable=True) # Không phù hợp, xem xét điều chuyển, cắt giảm
    criteria_evaluation_json = Column(NVARCHAR(None), nullable=True) # JSON list: tiêu chí đánh giá cấp độ
    
    ai_summary = Column(NVARCHAR(None), nullable=True) # Đánh giá tổng quan của AI
    ai_recommendations_json = Column(NVARCHAR(None), nullable=True) # JSON: Định hướng & Đề xuất hành động nhân sự
    status = Column(NVARCHAR(50), default="completed") # completed (Đã nộp), timed_out (Hết giờ tự nộp), in_progress
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assessment = relationship("HRAssessment", back_populates="submissions")
    answers = relationship("HRAssessmentAnswer", back_populates="submission", cascade="all, delete-orphan")


class HRAssessmentAnswer(Base):
    """
    Bảng Chi tiết Câu trả lời của Nhân sự cho từng câu hỏi
    """
    __tablename__ = "hr_assessment_answers"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("hr_assessment_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("hr_assessment_questions.id", ondelete="NO ACTION"), nullable=False, index=True)
    
    selected_answers_json = Column(NVARCHAR(None), nullable=True) # JSON: ["B"]
    is_correct = Column(Boolean, default=False)
    points_earned = Column(Float, default=0.0)
    ai_feedback = Column(NVARCHAR(None), nullable=True)

    # Relationships
    submission = relationship("HRAssessmentSubmission", back_populates="answers")
    question = relationship("HRAssessmentQuestion", back_populates="answers")
