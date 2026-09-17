/**
 * File: UserRecentActivityWidget.jsx
 * Widget hiển thị hoạt động gần nhất của người kiểm tra (QC):
 * - Công đoạn gần nhất (Nút 1-chạm áp dụng)
 * - PO gần nhất (Nút 1-chạm áp dụng)
 * Gọn gàng trên đúng 1 hàng duy nhất.
 */
import React from 'react'
import { Sparkles } from 'lucide-react'

const getCleanString = (val) => {
  if (!val) return ''
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'number') return String(val).trim()
  if (typeof val === 'object') {
    return String(val.name || val.code || val.stage || val.po || val.label || val.value || '').trim()
  }
  return ''
}

const UserRecentActivityWidget = ({
  userActivity,
  currentUser,
  currentStage,
  currentPo,
  onApplyStage,
  onApplyPo,
  readOnly = false
}) => {
  if (!userActivity) return null

  const { lastStage, lastPo } = userActivity

  const stageName = getCleanString(lastStage?.name || lastStage)
  const poCode = getCleanString(lastPo?.code || lastPo)
  const poStage = getCleanString(lastPo?.stage || stageName)

  // Nếu chưa có công đoạn hoặc PO nào -> không hiển thị
  const hasAnyActivity = Boolean(stageName || poCode)
  if (!hasAnyActivity) return null

  const cleanCurrentStage = getCleanString(currentStage)
  const cleanCurrentPo = getCleanString(currentPo)

  const isStageApplied = Boolean(
    cleanCurrentStage &&
    stageName &&
    cleanCurrentStage.toLowerCase() === stageName.toLowerCase()
  )
  const isPoApplied = Boolean(
    cleanCurrentPo &&
    poCode &&
    cleanCurrentPo.toLowerCase() === poCode.toLowerCase()
  )

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto 8px auto',
        padding: '5px 10px',
        backgroundColor: '#FAF7F2',
        borderRadius: '8px',
        border: '1px solid #EADBCE',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        overflowX: 'auto',
        scrollbarWidth: 'none'
      }}
    >
      <span style={{ fontSize: '11px', fontWeight: 700, color: '#7B5233', display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        <Sparkles size={12} color="#C85A1E" />
        <span>Gần nhất:</span>
      </span>

      {/* Công đoạn gần nhất */}
      {stageName && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            backgroundColor: isStageApplied ? '#DCFCE7' : '#FFFFFF',
            border: `1px solid ${isStageApplied ? '#86EFAC' : '#D8C3B3'}`,
            borderRadius: '6px',
            fontSize: '11px',
            flexShrink: 0
          }}
        >
          <span style={{ color: '#94A3B8', fontSize: '10px' }}>CĐ:</span>
          <strong
            style={{
              color: isStageApplied ? '#15803D' : '#4A240E',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={stageName}
          >
            {stageName}
          </strong>
          {!readOnly && !isStageApplied && (
            <button
              type="button"
              onClick={() => onApplyStage && onApplyStage(stageName)}
              style={{
                border: 'none',
                backgroundColor: '#7B5233',
                color: '#FFFFFF',
                fontSize: '9.5px',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: 2
              }}
            >
              Dùng
            </button>
          )}
        </div>
      )}

      {/* PO gần nhất */}
      {poCode && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            backgroundColor: isPoApplied ? '#DCFCE7' : '#FFFFFF',
            border: `1px solid ${isPoApplied ? '#86EFAC' : '#D8C3B3'}`,
            borderRadius: '6px',
            fontSize: '11px',
            flexShrink: 0
          }}
        >
          <span style={{ color: '#94A3B8', fontSize: '10px' }}>PO:</span>
          <strong
            style={{
              color: isPoApplied ? '#15803D' : '#4A240E',
              maxWidth: '100px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={poCode}
          >
            {poCode}
          </strong>
          {!readOnly && !isPoApplied && (
            <button
              type="button"
              onClick={() => onApplyPo && onApplyPo(poCode, poStage || stageName)}
              style={{
                border: 'none',
                backgroundColor: '#7B5233',
                color: '#FFFFFF',
                fontSize: '9.5px',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: 2
              }}
            >
              Dùng
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default UserRecentActivityWidget
