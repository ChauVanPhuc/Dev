const InspectionStepsTable = ({ steps }) => (
  <div className="pv2-table-wrap">
    <table className="pv2-table pv2-table--steps">
      <thead>
        <tr>
          <th>Bước</th>
          <th>Mô tả</th>
          <th>Tiêu chuẩn</th>
          <th>SL</th>
          <th>Kết quả</th>
        </tr>
      </thead>
      <tbody>
        {steps.map((step) => (
          <tr key={step.id}>
            <td className="pv2-step-num">{step.step}</td>
            <td>{step.description}</td>
            <td>{step.standard}</td>
            <td>{step.qty}</td>
            <td>
              <span className={`pv2-result-badge pv2-result-badge--${step.result}`}>
                {step.result === 'pass' ? 'Đạt' : 'Không đạt'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default InspectionStepsTable
