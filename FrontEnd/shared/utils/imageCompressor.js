/**
 * Tiện ích nén ảnh phía Client trước khi tải lên máy chủ.
 * Giảm kích thước ảnh từ 5-15MB xuống còn ~60-120KB để upload siêu tốc ngay cả khi mạng 3G/WiFi yếu.
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.68,
    maxSizeKB = 80,
  } = options

  if (!file || !(file instanceof Blob)) {
    return file
  }

  // Nếu file quá nhỏ (dưới 80KB), không cần nén
  if (file.size <= maxSizeKB * 1024) {
    return file
  }

  // Chỉ nén các file ảnh thông dụng
  const type = file.type || ''
  if (!type.startsWith('image/') || type.includes('svg') || type.includes('gif')) {
    return file
  }

  const compressPass = (src, maxW, maxH, q) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          let { width, height } = img

          if (width > maxW || height > maxH) {
            if (width > height) {
              height = Math.round((height * maxW) / width)
              width = maxW
            } else {
              width = Math.round((width * maxH) / height)
              height = maxH
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(null)
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            q
          )
        } catch (err) {
          console.warn('[imageCompressor] Lỗi canvas toBlob:', err)
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = src
    })
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target.result
      // Lượt 1: nén chuẩn 1280px, quality 0.68
      let blob = await compressPass(dataUrl, maxWidth, maxHeight, quality)

      // Nếu sau lượt 1 vẫn > 180KB, nén lượt 2 sâu hơn (1024px, quality 0.55)
      if (blob && blob.size > 180 * 1024) {
        const pass2 = await compressPass(dataUrl, 1024, 1024, 0.55)
        if (pass2 && pass2.size < blob.size) {
          blob = pass2
        }
      }

      if (blob && blob.size < file.size) {
        const fileName = file.name ? file.name.replace(/\.[^/.]+$/, '.jpg') : 'compressed.jpg'
        const compressedFile = new File([blob], fileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
        resolve(compressedFile)
      } else {
        resolve(file)
      }
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

/**
 * Chuyển đổi File/Blob ảnh sang chuỗi Data URL Base64 để làm phương án cứu hộ dự phòng
 */
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    if (!blob) return resolve('')
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(blob)
  })
}
