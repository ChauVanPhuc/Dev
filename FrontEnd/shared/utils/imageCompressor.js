/**
 * Tiện ích nén ảnh phía Client trước khi tải lên máy chủ.
 * Giảm kích thước ảnh từ 5-15MB xuống còn ~300-500KB để tránh timeout và lỗi mạng.
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    maxSizeKB = 350,
  } = options

  if (!file || !(file instanceof Blob)) {
    return file
  }

  // Nếu file quá nhỏ (dưới 350KB), không cần nén
  if (file.size <= maxSizeKB * 1024) {
    return file
  }

  // Chỉ nén các file ảnh thông dụng
  const type = file.type || ''
  if (!type.startsWith('image/') || type.includes('svg') || type.includes('gif')) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          let { width, height } = img

          // Giữ tỷ lệ và thu nhỏ nếu vượt quá maxWidth hoặc maxHeight
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            } else {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            resolve(file)
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                // Tạo lại đối tượng File với tên gốc
                const fileName = file.name ? file.name.replace(/\.[^/.]+$/, '.jpg') : 'compressed.jpg'
                const compressedFile = new File([blob], fileName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                resolve(file)
              }
            },
            'image/jpeg',
            quality
          )
        } catch (err) {
          console.warn('[imageCompressor] Lỗi khi nén ảnh, dùng file gốc:', err)
          resolve(file)
        }
      }
      img.onerror = () => resolve(file)
      img.src = e.target.result
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}
