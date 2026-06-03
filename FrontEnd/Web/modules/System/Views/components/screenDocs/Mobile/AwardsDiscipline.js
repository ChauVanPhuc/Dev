const doc = {
  scenarios: [
    { title: "🏆 Ghi nhận khen thưởng / kỷ luật", description: "Ghi nhận vi phạm hoặc khen thưởng xuất sắc tại xưởng với ảnh bằng chứng.", steps: [
      { target: "AwardDisciplineForm", action: "Nhập thông tin", note: "Nhập NV vi phạm, nội dung, mức độ, điểm cộng/trừ." },
      { target: "CameraEvidence", action: "Chụp bằng chứng", note: "Chụp tối đa 3 ảnh bằng chứng tại hiện trường." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Nhập Thông Tin Sự Việc", desc: "Điền NV, nội dung, mức độ và điểm cộng/trừ.", component: "AwardDisciplineForm", api: "None", logic: "Form nhập liệu" },
    { step: 2, title: "Chụp Ảnh Bằng Chứng", desc: "Camera chụp tối đa 3 ảnh, chuyển thành URL xem trước.", component: "CameraEvidence", api: "Native Camera", logic: "Max 3 ảnh, preview URL" },
    { step: 3, title: "Gửi Khen Thưởng/Kỷ Luật", desc: "Lưu thông tin lên server.", component: "AwardDisciplineService", api: "POST /api/v1/awards-disciplines", logic: "Submit với ảnh" }
  ],
  connections: {
    "AwardDisciplineForm": ["CameraEvidence", "AwardDisciplineService"],
    "CameraEvidence": ["Native Camera SDK"],
    "AwardDisciplineService": ["API POST /awards-disciplines"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
