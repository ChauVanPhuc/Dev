import Editor, {
  EditorMode,
  PageMode,
  PaperDirection,
  IEditorOption
} from '../../editor'
import './settings.css'

export class SettingsModal {
  private instance: Editor
  private mask: HTMLDivElement | null = null
  private wrapper: HTMLDivElement | null = null
  private activeTab: string = 'page'
  private currentOptions: IEditorOption

  // Form state
  private formState: {
    paperType: string
    width: number
    height: number
    paperDirection: PaperDirection
    margins: [number, number, number, number]
    defaultFont: string
    defaultSize: number
    defaultColor: string
    defaultRowMargin: number
    watermarkEnabled: boolean
    watermarkData: string
    watermarkColor: string
    watermarkOpacity: number
    watermarkSize: number
    mode: EditorMode
    pageMode: PageMode
  }

  constructor(instance: Editor) {
    this.instance = instance
    this.currentOptions = JSON.parse(
      JSON.stringify(instance.command.getOptions() || {})
    )

    // Khởi tạo state từ options hiện tại
    const w = this.currentOptions.width || 794
    const h = this.currentOptions.height || 1123
    let pType = 'custom'
    if (w === 794 && h === 1123) pType = 'a4'
    else if (w === 1123 && h === 1588) pType = 'a3'
    else if (w === 561 && h === 794) pType = 'a5'
    else if (w === 703 && h === 994) pType = 'b5'
    else if (w === 816 && h === 1056) pType = 'letter'

    const m = this.currentOptions.margins || [100, 120, 100, 120]
    const wm = this.currentOptions.watermark

    this.formState = {
      paperType: pType,
      width: w,
      height: h,
      paperDirection:
        this.currentOptions.paperDirection || PaperDirection.VERTICAL,
      margins: [m[0] ?? 100, m[1] ?? 120, m[2] ?? 100, m[3] ?? 120],
      defaultFont: this.currentOptions.defaultFont || 'Times New Roman',
      defaultSize: this.currentOptions.defaultSize || 13,
      defaultColor: this.currentOptions.defaultColor || '#000000',
      defaultRowMargin: this.currentOptions.defaultRowMargin || 1,
      watermarkEnabled: !!(wm && wm.data),
      watermarkData: (wm && wm.data) || 'BẢN NHÁP',
      watermarkColor: (wm && wm.color) || '#AEB5C0',
      watermarkOpacity: (wm && wm.opacity) ?? 0.2,
      watermarkSize: (wm && wm.size) ?? 60,
      mode: this.currentOptions.mode || EditorMode.EDIT,
      pageMode: this.currentOptions.pageMode || PageMode.PAGING
    }

    this._render()
  }

  private _render() {
    // Mask
    const mask = document.createElement('div')
    mask.classList.add('settings-modal-mask')
    mask.onclick = () => this._close()
    document.body.append(mask)

    // Wrapper & Modal
    const wrapper = document.createElement('div')
    wrapper.classList.add('settings-modal-wrapper')

    const modal = document.createElement('div')
    modal.classList.add('settings-modal')

    // Header
    const header = document.createElement('div')
    header.classList.add('settings-modal__header')
    header.innerHTML = `
      <div class="settings-modal__header-title">
        <div class="settings-modal__header-badge">
          <i></i>
        </div>
        <div class="settings-modal__header-text">
          <h3>Cài đặt trình soạn thảo</h3>
          <p>Tùy chỉnh trang in, kiểu chữ mặc định, hình mờ và chế độ soạn thảo</p>
        </div>
      </div>
      <button class="settings-modal__header-close" title="Đóng (Esc)">
        <i></i>
      </button>
    `
    header
      .querySelector('.settings-modal__header-close')!
      .addEventListener('click', () => this._close())

    // Body
    const body = document.createElement('div')
    body.classList.add('settings-modal__body')

    // Sidebar
    const sidebar = document.createElement('div')
    sidebar.classList.add('settings-modal__sidebar')
    sidebar.innerHTML = `
      <button class="settings-modal__tab-btn active" data-tab="page">
        <span class="settings-modal__tab-icon">📄</span>
        <span>Trang & Khổ giấy</span>
      </button>
      <button class="settings-modal__tab-btn" data-tab="typography">
        <span class="settings-modal__tab-icon">✍️</span>
        <span>Kiểu chữ mặc định</span>
      </button>
      <button class="settings-modal__tab-btn" data-tab="watermark">
        <span class="settings-modal__tab-icon">🛡️</span>
        <span>Hình mờ (Watermark)</span>
      </button>
      <button class="settings-modal__tab-btn" data-tab="mode">
        <span class="settings-modal__tab-icon">⚡</span>
        <span>Chế độ soạn thảo</span>
      </button>
      <button class="settings-modal__tab-btn" data-tab="json">
        <span class="settings-modal__tab-icon">💻</span>
        <span>Nâng cao (JSON)</span>
      </button>
    `

    // Content container
    const content = document.createElement('div')
    content.classList.add('settings-modal__content')

    content.appendChild(this._renderPageTab())
    content.appendChild(this._renderTypographyTab())
    content.appendChild(this._renderWatermarkTab())
    content.appendChild(this._renderModeTab())
    content.appendChild(this._renderJsonTab())

    // Tab switching logic
    sidebar.querySelectorAll('.settings-modal__tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab!
        this._switchTab(tab, sidebar, content)
      })
    })

    body.appendChild(sidebar)
    body.appendChild(content)

    // Footer
    const footer = document.createElement('div')
    footer.classList.add('settings-modal__footer')
    footer.innerHTML = `
      <button class="settings-btn-reset" title="Đặt lại thông số mặc định ban đầu">
        <span>🔄</span>
        <span>Khôi phục mặc định</span>
      </button>
      <div class="settings-footer-actions">
        <button class="settings-btn-cancel">Hủy</button>
        <button class="settings-btn-save">Lưu & Áp dụng</button>
      </div>
    `

    footer
      .querySelector('.settings-btn-cancel')!
      .addEventListener('click', () => this._close())

    footer
      .querySelector('.settings-btn-reset')!
      .addEventListener('click', () => this._resetDefaults())

    footer
      .querySelector('.settings-btn-save')!
      .addEventListener('click', () => this._saveAndApply(content))

    modal.appendChild(header)
    modal.appendChild(body)
    modal.appendChild(footer)
    wrapper.appendChild(modal)
    document.body.appendChild(wrapper)

    this.mask = mask
    this.wrapper = wrapper

    // Keyboard ESC listener
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this._close()
        window.removeEventListener('keydown', escHandler)
      }
    }
    window.addEventListener('keydown', escHandler)

    // Entrance animation
    requestAnimationFrame(() => {
      mask.classList.add('active')
      modal.classList.add('active')
    })
  }

  // --- TAB 1: Trang & Khổ giấy ---
  private _renderPageTab(): HTMLElement {
    const pane = document.createElement('div')
    pane.classList.add('settings-tab-pane', 'active')
    pane.dataset.pane = 'page'

    pane.innerHTML = `
      <div class="settings-section">
        <div class="settings-section__title">📐 Khổ giấy (Paper Size)</div>
        <div class="settings-section__desc">Chọn định dạng trang in tiêu chuẩn hoặc tùy chỉnh kích thước theo pixel</div>
        <div class="settings-grid-2">
          <div class="settings-form-group">
            <label class="settings-label">Định dạng sẵn</label>
            <select class="settings-select" id="setting-paper-preset">
              <option value="a4" ${this.formState.paperType === 'a4' ? 'selected' : ''}>A4 (210 × 297 mm) - Tiêu chuẩn</option>
              <option value="a3" ${this.formState.paperType === 'a3' ? 'selected' : ''}>A3 (297 × 420 mm) - Bản vẽ/Sơ đồ</option>
              <option value="a5" ${this.formState.paperType === 'a5' ? 'selected' : ''}>A5 (148 × 210 mm) - Sổ tay</option>
              <option value="b5" ${this.formState.paperType === 'b5' ? 'selected' : ''}>B5 (176 × 250 mm)</option>
              <option value="letter" ${this.formState.paperType === 'letter' ? 'selected' : ''}>Letter (216 × 279 mm)</option>
              <option value="custom" ${this.formState.paperType === 'custom' ? 'selected' : ''}>Tùy chỉnh kích thước...</option>
            </select>
          </div>
          <div class="settings-grid-2">
            <div class="settings-form-group">
              <label class="settings-label">Rộng (px)</label>
              <input type="number" class="settings-input" id="setting-paper-w" value="${this.formState.width}" min="200" max="3000" />
            </div>
            <div class="settings-form-group">
              <label class="settings-label">Cao (px)</label>
              <input type="number" class="settings-input" id="setting-paper-h" value="${this.formState.height}" min="200" max="4000" />
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section__title">🔄 Hướng giấy (Orientation)</div>
        <div class="settings-section__desc">Thay đổi chiều xoay hiển thị của toàn bộ trang văn bản</div>
        <div class="settings-cards-grid">
          <div class="settings-card-choice ${this.formState.paperDirection === PaperDirection.VERTICAL ? 'active' : ''}" data-dir="vertical">
            <div class="settings-card-icon">📄</div>
            <div class="settings-card-info">
              <h4>Chiều dọc (Đứng)</h4>
              <p>Khổ in chuẩn cho tài liệu, văn bản, hồ sơ</p>
            </div>
          </div>
          <div class="settings-card-choice ${this.formState.paperDirection === PaperDirection.HORIZONTAL ? 'active' : ''}" data-dir="horizontal">
            <div class="settings-card-icon">📃</div>
            <div class="settings-card-info">
              <h4>Chiều ngang (Nằm)</h4>
              <p>Thích hợp cho bảng biểu rộng, biểu đồ</p>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section__title">📏 Căn lề trang (Margins - px)</div>
        <div class="settings-section__desc">Khoảng cách từ mép trang giấy đến phần nội dung văn bản (100px ≈ 26.5mm)</div>
        <div class="settings-margins-layout">
          <div class="settings-margin-field">
            <span>Lề trên (Top)</span>
            <input type="number" class="settings-input" id="setting-margin-top" value="${this.formState.margins[0]}" min="0" max="300" />
          </div>
          <div class="settings-margin-field">
            <span>Lề phải (Right)</span>
            <input type="number" class="settings-input" id="setting-margin-right" value="${this.formState.margins[1]}" min="0" max="300" />
          </div>
          <div class="settings-margin-field">
            <span>Lề dưới (Bottom)</span>
            <input type="number" class="settings-input" id="setting-margin-bottom" value="${this.formState.margins[2]}" min="0" max="300" />
          </div>
          <div class="settings-margin-field">
            <span>Lề trái (Left)</span>
            <input type="number" class="settings-input" id="setting-margin-left" value="${this.formState.margins[3]}" min="0" max="300" />
          </div>
        </div>
      </div>
    `

    // Event listener paper preset
    const presetSelect = pane.querySelector<HTMLSelectElement>(
      '#setting-paper-preset'
    )!
    const wInput = pane.querySelector<HTMLInputElement>('#setting-paper-w')!
    const hInput = pane.querySelector<HTMLInputElement>('#setting-paper-h')!

    presetSelect.addEventListener('change', () => {
      const val = presetSelect.value
      this.formState.paperType = val
      if (val === 'a4') {
        wInput.value = '794'
        hInput.value = '1123'
      } else if (val === 'a3') {
        wInput.value = '1123'
        hInput.value = '1588'
      } else if (val === 'a5') {
        wInput.value = '561'
        hInput.value = '794'
      } else if (val === 'b5') {
        wInput.value = '703'
        hInput.value = '994'
      } else if (val === 'letter') {
        wInput.value = '816'
        hInput.value = '1056'
      }
      this.formState.width = Number(wInput.value)
      this.formState.height = Number(hInput.value)
    })

    wInput.addEventListener('input', () => {
      this.formState.width = Number(wInput.value)
      presetSelect.value = 'custom'
      this.formState.paperType = 'custom'
    })
    hInput.addEventListener('input', () => {
      this.formState.height = Number(hInput.value)
      presetSelect.value = 'custom'
      this.formState.paperType = 'custom'
    })

    // Direction cards
    pane.querySelectorAll('.settings-card-choice[data-dir]').forEach(card => {
      card.addEventListener('click', () => {
        pane
          .querySelectorAll('.settings-card-choice[data-dir]')
          .forEach(c => c.classList.remove('active'))
        card.classList.add('active')
        const dir = (card as HTMLElement).dataset.dir!
        this.formState.paperDirection =
          dir === 'horizontal'
            ? PaperDirection.HORIZONTAL
            : PaperDirection.VERTICAL
      })
    })

    // Margins
    const mTop = pane.querySelector<HTMLInputElement>('#setting-margin-top')!
    const mRight = pane.querySelector<HTMLInputElement>('#setting-margin-right')!
    const mBottom = pane.querySelector<HTMLInputElement>(
      '#setting-margin-bottom'
    )!
    const mLeft = pane.querySelector<HTMLInputElement>('#setting-margin-left')!

    const updateMargins = () => {
      this.formState.margins = [
        Number(mTop.value) || 0,
        Number(mRight.value) || 0,
        Number(mBottom.value) || 0,
        Number(mLeft.value) || 0
      ]
    }
    mTop.addEventListener('input', updateMargins)
    mRight.addEventListener('input', updateMargins)
    mBottom.addEventListener('input', updateMargins)
    mLeft.addEventListener('input', updateMargins)

    return pane
  }

  // --- TAB 2: Kiểu chữ mặc định ---
  private _renderTypographyTab(): HTMLElement {
    const pane = document.createElement('div')
    pane.classList.add('settings-tab-pane')
    pane.dataset.pane = 'typography'

    pane.innerHTML = `
      <div class="settings-section">
        <div class="settings-section__title">🔤 Kiểu chữ & Cỡ chữ mặc định</div>
        <div class="settings-section__desc">Áp dụng cho văn bản mới khi nhập liệu hoặc văn bản chưa được gán định dạng riêng</div>
        <div class="settings-grid-2">
          <div class="settings-form-group">
            <label class="settings-label">Phông chữ mặc định</label>
            <select class="settings-select" id="setting-default-font">
              <option value="Arial" ${this.formState.defaultFont === 'Arial' ? 'selected' : ''}>Arial</option>
              <option value="Times New Roman" ${this.formState.defaultFont === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
              <option value="Segoe UI" ${this.formState.defaultFont === 'Segoe UI' ? 'selected' : ''}>Segoe UI</option>
              <option value="Tahoma" ${this.formState.defaultFont === 'Tahoma' ? 'selected' : ''}>Tahoma</option>
              <option value="Verdana" ${this.formState.defaultFont === 'Verdana' ? 'selected' : ''}>Verdana</option>
              <option value="Georgia" ${this.formState.defaultFont === 'Georgia' ? 'selected' : ''}>Georgia</option>
              <option value="Courier New" ${this.formState.defaultFont === 'Courier New' ? 'selected' : ''}>Courier New</option>
            </select>
          </div>
          <div class="settings-form-group">
            <label class="settings-label">Cỡ chữ mặc định (pt/px)</label>
            <select class="settings-select" id="setting-default-size">
              <option value="12" ${this.formState.defaultSize === 12 ? 'selected' : ''}>12 pt</option>
              <option value="13" ${this.formState.defaultSize === 13 ? 'selected' : ''}>13 pt (Tiêu chuẩn)</option>
              <option value="14" ${this.formState.defaultSize === 14 ? 'selected' : ''}>14 pt</option>
              <option value="15" ${this.formState.defaultSize === 15 ? 'selected' : ''}>15 pt</option>
              <option value="16" ${this.formState.defaultSize === 16 ? 'selected' : ''}>16 pt</option>
              <option value="18" ${this.formState.defaultSize === 18 ? 'selected' : ''}>18 pt</option>
              <option value="20" ${this.formState.defaultSize === 20 ? 'selected' : ''}>20 pt</option>
              <option value="24" ${this.formState.defaultSize === 24 ? 'selected' : ''}>24 pt</option>
            </select>
          </div>
        </div>
        <div class="settings-grid-2">
          <div class="settings-form-group">
            <label class="settings-label">Màu chữ mặc định</label>
            <div style="display:flex; align-items:center; gap:10px;">
              <input type="color" id="setting-default-color" value="${this.formState.defaultColor}" style="width:42px; height:38px; padding:2px; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer;" />
              <input type="text" class="settings-input" id="setting-default-color-hex" value="${this.formState.defaultColor}" style="flex:1;" />
            </div>
          </div>
          <div class="settings-form-group">
            <label class="settings-label">Khoảng cách giãn dòng cơ bản (Line Spacing)</label>
            <select class="settings-select" id="setting-default-rowmargin">
              <option value="1" ${this.formState.defaultRowMargin === 1 ? 'selected' : ''}>1.0 (Đơn tiêu chuẩn)</option>
              <option value="1.15" ${this.formState.defaultRowMargin === 1.15 ? 'selected' : ''}>1.15 (Văn bản hành chính)</option>
              <option value="1.25" ${this.formState.defaultRowMargin === 1.25 ? 'selected' : ''}>1.25 (Dễ đọc)</option>
              <option value="1.5" ${this.formState.defaultRowMargin === 1.5 ? 'selected' : ''}>1.5 (Rộng thoáng)</option>
              <option value="2" ${this.formState.defaultRowMargin === 2 ? 'selected' : ''}>2.0 (Gấp đôi)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section__title">👁️ Xem trước định dạng mẫu (Live Preview)</div>
        <div id="setting-font-preview" style="padding:16px 20px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; font-family:${this.formState.defaultFont}; font-size:${this.formState.defaultSize}px; color:${this.formState.defaultColor}; line-height:${this.formState.defaultRowMargin + 0.5};">
          Cộng hòa Xã hội Chủ nghĩa Việt Nam<br />
          Độc lập - Tự do - Hạnh phúc<br />
          <span style="font-size:0.9em; opacity:0.85;">Trình soạn thảo văn bản canvas-editor hỗ trợ hiển thị trang và định dạng tiếng Việt chuẩn mực.</span>
        </div>
      </div>
    `

    // Binding preview
    const fontSelect = pane.querySelector<HTMLSelectElement>(
      '#setting-default-font'
    )!
    const sizeSelect = pane.querySelector<HTMLSelectElement>(
      '#setting-default-size'
    )!
    const colorInput = pane.querySelector<HTMLInputElement>(
      '#setting-default-color'
    )!
    const colorHex = pane.querySelector<HTMLInputElement>(
      '#setting-default-color-hex'
    )!
    const rowMarginSelect = pane.querySelector<HTMLSelectElement>(
      '#setting-default-rowmargin'
    )!
    const previewBox = pane.querySelector<HTMLDivElement>(
      '#setting-font-preview'
    )!

    const updatePreview = () => {
      this.formState.defaultFont = fontSelect.value
      this.formState.defaultSize = Number(sizeSelect.value)
      this.formState.defaultColor = colorInput.value
      this.formState.defaultRowMargin = Number(rowMarginSelect.value)

      previewBox.style.fontFamily = this.formState.defaultFont
      previewBox.style.fontSize = `${this.formState.defaultSize}px`
      previewBox.style.color = this.formState.defaultColor
      previewBox.style.lineHeight = `${this.formState.defaultRowMargin + 0.5}`
    }

    fontSelect.addEventListener('change', updatePreview)
    sizeSelect.addEventListener('change', updatePreview)
    rowMarginSelect.addEventListener('change', updatePreview)
    colorInput.addEventListener('input', () => {
      colorHex.value = colorInput.value
      updatePreview()
    })
    colorHex.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(colorHex.value)) {
        colorInput.value = colorHex.value
        updatePreview()
      }
    })

    return pane
  }

  // --- TAB 3: Hình mờ (Watermark) ---
  private _renderWatermarkTab(): HTMLElement {
    const pane = document.createElement('div')
    pane.classList.add('settings-tab-pane')
    pane.dataset.pane = 'watermark'

    pane.innerHTML = `
      <div class="settings-section">
        <div class="settings-toggle-row">
          <div class="settings-toggle-label">
            <h4>Bật hiển thị hình mờ (Watermark)</h4>
            <p>In chìm chữ bản quyền, phân loại bảo mật chéo dưới nền trang</p>
          </div>
          <label class="settings-switch">
            <input type="checkbox" id="setting-wm-toggle" ${this.formState.watermarkEnabled ? 'checked' : ''} />
            <span class="settings-slider"></span>
          </label>
        </div>

        <div id="setting-wm-fields" style="display:${this.formState.watermarkEnabled ? 'block' : 'none'};">
          <div class="settings-form-group">
            <label class="settings-label">Nội dung chữ mờ</label>
            <input type="text" class="settings-input" id="setting-wm-text" value="${this.formState.watermarkData}" placeholder="Ví dụ: BẢN NHÁP, BẢO MẬT, MẪU BỆNH ÁN" />
          </div>

          <div class="settings-grid-2">
            <div class="settings-form-group">
              <label class="settings-label">Màu sắc hình mờ</label>
              <div style="display:flex; align-items:center; gap:10px;">
                <input type="color" id="setting-wm-color" value="${this.formState.watermarkColor}" style="width:42px; height:38px; padding:2px; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer;" />
                <input type="text" class="settings-input" id="setting-wm-color-hex" value="${this.formState.watermarkColor}" style="flex:1;" />
              </div>
            </div>
            <div class="settings-form-group">
              <label class="settings-label">Độ đậm / mờ (<span id="setting-wm-opacity-val">${Math.round(this.formState.watermarkOpacity * 100)}%</span>)</label>
              <input type="range" class="settings-input" id="setting-wm-opacity" min="0.05" max="0.5" step="0.05" value="${this.formState.watermarkOpacity}" style="padding:0; cursor:pointer;" />
            </div>
          </div>

          <div class="settings-form-group">
            <label class="settings-label">Cỡ chữ hình mờ (px)</label>
            <input type="number" class="settings-input" id="setting-wm-size" value="${this.formState.watermarkSize}" min="20" max="150" />
          </div>

          <div class="settings-watermark-preview">
            <div class="settings-watermark-preview-text" id="setting-wm-preview-text" style="color:${this.formState.watermarkColor}; opacity:${this.formState.watermarkOpacity}; font-size:${this.formState.watermarkSize / 2}px;">
              ${this.formState.watermarkData || 'BẢN NHÁP'}
            </div>
          </div>
        </div>
      </div>
    `

    const toggle = pane.querySelector<HTMLInputElement>('#setting-wm-toggle')!
    const fields = pane.querySelector<HTMLDivElement>('#setting-wm-fields')!
    const textInput = pane.querySelector<HTMLInputElement>('#setting-wm-text')!
    const colorInput =
      pane.querySelector<HTMLInputElement>('#setting-wm-color')!
    const colorHex = pane.querySelector<HTMLInputElement>(
      '#setting-wm-color-hex'
    )!
    const opacityInput = pane.querySelector<HTMLInputElement>(
      '#setting-wm-opacity'
    )!
    const opacityVal = pane.querySelector<HTMLSpanElement>(
      '#setting-wm-opacity-val'
    )!
    const sizeInput = pane.querySelector<HTMLInputElement>('#setting-wm-size')!
    const previewText = pane.querySelector<HTMLDivElement>(
      '#setting-wm-preview-text'
    )!

    const updateWmState = () => {
      this.formState.watermarkEnabled = toggle.checked
      fields.style.display = toggle.checked ? 'block' : 'none'
      this.formState.watermarkData = textInput.value || 'BẢN NHÁP'
      this.formState.watermarkColor = colorInput.value
      this.formState.watermarkOpacity = Number(opacityInput.value)
      this.formState.watermarkSize = Number(sizeInput.value) || 60

      opacityVal.innerText = `${Math.round(this.formState.watermarkOpacity * 100)}%`
      previewText.innerText = this.formState.watermarkData
      previewText.style.color = this.formState.watermarkColor
      previewText.style.opacity = `${this.formState.watermarkOpacity}`
      previewText.style.fontSize = `${Math.max(16, this.formState.watermarkSize / 2)}px`
    }

    toggle.addEventListener('change', updateWmState)
    textInput.addEventListener('input', updateWmState)
    colorInput.addEventListener('input', () => {
      colorHex.value = colorInput.value
      updateWmState()
    })
    colorHex.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(colorHex.value)) {
        colorInput.value = colorHex.value
        updateWmState()
      }
    })
    opacityInput.addEventListener('input', updateWmState)
    sizeInput.addEventListener('input', updateWmState)

    return pane
  }

  // --- TAB 4: Chế độ soạn thảo ---
  private _renderModeTab(): HTMLElement {
    const pane = document.createElement('div')
    pane.classList.add('settings-tab-pane')
    pane.dataset.pane = 'mode'

    pane.innerHTML = `
      <div class="settings-section">
        <div class="settings-section__title">⚙️ Chế độ soạn thảo (Editor Mode)</div>
        <div class="settings-section__desc">Chọn quyền tương tác và mức độ hiển thị các công cụ bổ trợ</div>
        <div class="settings-cards-grid">
          <div class="settings-card-choice ${this.formState.mode === EditorMode.EDIT ? 'active' : ''}" data-mode="edit">
            <div class="settings-card-icon">✏️</div>
            <div class="settings-card-info">
              <h4>Chỉnh sửa (Edit)</h4>
              <p>Chế độ đầy đủ, cho phép gõ phím, định dạng và thao tác tự do</p>
            </div>
          </div>
          <div class="settings-card-choice ${this.formState.mode === EditorMode.READONLY ? 'active' : ''}" data-mode="readonly">
            <div class="settings-card-icon">👁️</div>
            <div class="settings-card-info">
              <h4>Chỉ đọc (Readonly)</h4>
              <p>Khóa văn bản, ngăn chặn xóa hoặc chỉnh sửa nội dung</p>
            </div>
          </div>
          <div class="settings-card-choice ${this.formState.mode === EditorMode.FORM ? 'active' : ''}" data-mode="form">
            <div class="settings-card-icon">📋</div>
            <div class="settings-card-info">
              <h4>Biểu mẫu (Form Mode)</h4>
              <p>Chỉ cho phép điền và chọn giá trị vào các ô nhập liệu/dropdown</p>
            </div>
          </div>
          <div class="settings-card-choice ${this.formState.mode === EditorMode.CLEAN ? 'active' : ''}" data-mode="clean">
            <div class="settings-card-icon">📄</div>
            <div class="settings-card-info">
              <h4>Bản in sạch (Clean Mode)</h4>
              <p>Ẩn thước kẻ, đường gióng và đường viền phụ trợ</p>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section__title">📑 Chế độ trang (Page Display Mode)</div>
        <div class="settings-section__desc">Lựa chọn cách hiển thị ngắt trang giữa các tờ giấy</div>
        <div class="settings-cards-grid">
          <div class="settings-card-choice ${this.formState.pageMode === PageMode.PAGING ? 'active' : ''}" data-pagemode="paging">
            <div class="settings-card-icon">📑</div>
            <div class="settings-card-info">
              <h4>Từng trang rời (Paging)</h4>
              <p>Phân trang A4 tiêu chuẩn có khoảng cách giữa các tờ</p>
            </div>
          </div>
          <div class="settings-card-choice ${this.formState.pageMode === PageMode.CONTINUITY ? 'active' : ''}" data-pagemode="continuity">
            <div class="settings-card-icon">📜</div>
            <div class="settings-card-info">
              <h4>Cuộn liền mạch (Continuity)</h4>
              <p>Không phân cách trang giấy, cuộn đọc mượt mà như website</p>
            </div>
          </div>
        </div>
      </div>
    `

    // Mode cards
    pane.querySelectorAll('.settings-card-choice[data-mode]').forEach(card => {
      card.addEventListener('click', () => {
        pane
          .querySelectorAll('.settings-card-choice[data-mode]')
          .forEach(c => c.classList.remove('active'))
        card.classList.add('active')
        this.formState.mode = (card as HTMLElement).dataset
          .mode as unknown as EditorMode
      })
    })

    // PageMode cards
    pane
      .querySelectorAll('.settings-card-choice[data-pagemode]')
      .forEach(card => {
        card.addEventListener('click', () => {
          pane
            .querySelectorAll('.settings-card-choice[data-pagemode]')
            .forEach(c => c.classList.remove('active'))
          card.classList.add('active')
          this.formState.pageMode = (card as HTMLElement).dataset
            .pagemode as unknown as PageMode
        })
      })

    return pane
  }

  // --- TAB 5: Nâng cao (JSON) ---
  private _renderJsonTab(): HTMLElement {
    const pane = document.createElement('div')
    pane.classList.add('settings-tab-pane')
    pane.dataset.pane = 'json'

    pane.innerHTML = `
      <div class="settings-json-container">
        <div class="settings-json-header">
          <span>Dành cho lập trình viên: chỉnh sửa cấu hình JSON trực tiếp</span>
          <button class="settings-btn-format" type="button">✨ Định dạng JSON (Prettify)</button>
        </div>
        <div class="settings-json-error" id="settings-json-error-msg"></div>
        <textarea class="settings-json-textarea" id="settings-json-raw" spellcheck="false">${JSON.stringify(this.currentOptions, null, 2)}</textarea>
      </div>
    `

    const textarea = pane.querySelector<HTMLTextAreaElement>(
      '#settings-json-raw'
    )!
    const formatBtn = pane.querySelector<HTMLButtonElement>(
      '.settings-btn-format'
    )!
    const errorMsg = pane.querySelector<HTMLDivElement>(
      '#settings-json-error-msg'
    )!

    formatBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(textarea.value)
        textarea.value = JSON.stringify(parsed, null, 2)
        errorMsg.style.display = 'none'
      } catch (err: any) {
        errorMsg.innerText = `Lỗi cú pháp JSON: ${err.message}`
        errorMsg.style.display = 'block'
      }
    })

    return pane
  }

  // Switch tabs
  private _switchTab(
    tabName: string,
    sidebar: HTMLElement,
    content: HTMLElement
  ) {
    // If switching TO json tab: synchronize form state to JSON
    if (tabName === 'json' && this.activeTab !== 'json') {
      this._syncFormToJson(content)
    }

    this.activeTab = tabName

    sidebar.querySelectorAll('.settings-modal__tab-btn').forEach(btn => {
      if ((btn as HTMLElement).dataset.tab === tabName) {
        btn.classList.add('active')
      } else {
        btn.classList.remove('active')
      }
    })

    content.querySelectorAll('.settings-tab-pane').forEach(pane => {
      if ((pane as HTMLElement).dataset.pane === tabName) {
        pane.classList.add('active')
      } else {
        pane.classList.remove('active')
      }
    })
  }

  // Synchronize form controls to JSON textarea
  private _syncFormToJson(content: HTMLElement) {
    const textarea = content.querySelector<HTMLTextAreaElement>(
      '#settings-json-raw'
    )
    if (!textarea) return

    let currentJson: any = {}
    try {
      currentJson = JSON.parse(textarea.value)
    } catch {
      currentJson = { ...this.currentOptions }
    }

    currentJson.width = this.formState.width
    currentJson.height = this.formState.height
    currentJson.paperDirection = this.formState.paperDirection
    currentJson.margins = [...this.formState.margins]
    currentJson.defaultFont = this.formState.defaultFont
    currentJson.defaultSize = this.formState.defaultSize
    currentJson.defaultColor = this.formState.defaultColor
    currentJson.defaultRowMargin = this.formState.defaultRowMargin
    currentJson.mode = this.formState.mode
    currentJson.pageMode = this.formState.pageMode

    if (this.formState.watermarkEnabled) {
      currentJson.watermark = {
        data: this.formState.watermarkData,
        color: this.formState.watermarkColor,
        opacity: this.formState.watermarkOpacity,
        size: this.formState.watermarkSize
      }
    } else {
      delete currentJson.watermark
    }

    textarea.value = JSON.stringify(currentJson, null, 2)
  }

  // Reset defaults
  private _resetDefaults() {
    if (
      !confirm('Bạn có chắc chắn muốn khôi phục toàn bộ cài đặt về mặc định?')
    ) {
      return
    }

    this.formState = {
      paperType: 'a4',
      width: 794,
      height: 1123,
      paperDirection: PaperDirection.VERTICAL,
      margins: [100, 120, 100, 120],
      defaultFont: 'Times New Roman',
      defaultSize: 13,
      defaultColor: '#000000',
      defaultRowMargin: 1,
      watermarkEnabled: false,
      watermarkData: 'BẢN NHÁP',
      watermarkColor: '#AEB5C0',
      watermarkOpacity: 0.2,
      watermarkSize: 60,
      mode: EditorMode.EDIT,
      pageMode: PageMode.PAGING
    }

    // Refresh modal
    this._close()
    new SettingsModal(this.instance)
  }

  // Save and apply settings
  private _saveAndApply(content: HTMLElement) {
    // If currently on JSON tab, prioritize JSON input
    if (this.activeTab === 'json') {
      const textarea = content.querySelector<HTMLTextAreaElement>(
        '#settings-json-raw'
      )!
      const errorMsg = content.querySelector<HTMLDivElement>(
        '#settings-json-error-msg'
      )!
      try {
        const parsed = JSON.parse(textarea.value)
        errorMsg.style.display = 'none'
        this._applyAllOptions(parsed)
        this._close()
        return
      } catch (err: any) {
        errorMsg.innerText = `Lỗi cú pháp JSON: ${err.message}. Vui lòng sửa lỗi trước khi lưu!`
        errorMsg.style.display = 'block'
        return
      }
    }

    // Apply from formState
    const updatedOptions: any = {
      ...this.currentOptions,
      width: this.formState.width,
      height: this.formState.height,
      paperDirection: this.formState.paperDirection,
      margins: this.formState.margins,
      defaultFont: this.formState.defaultFont,
      defaultSize: this.formState.defaultSize,
      defaultColor: this.formState.defaultColor,
      defaultRowMargin: this.formState.defaultRowMargin,
      mode: this.formState.mode,
      pageMode: this.formState.pageMode
    }

    if (this.formState.watermarkEnabled) {
      updatedOptions.watermark = {
        data: this.formState.watermarkData,
        color: this.formState.watermarkColor,
        opacity: this.formState.watermarkOpacity,
        size: this.formState.watermarkSize
      }
    } else {
      updatedOptions.watermark = { data: '' }
    }

    this._applyAllOptions(updatedOptions)
    this._close()
  }

  // Execute commands in correct order
  private _applyAllOptions(opts: any) {
    // 1. Paper size
    if (opts.width && opts.height) {
      this.instance.command.executePaperSize(
        Number(opts.width),
        Number(opts.height)
      )
    }

    // 2. Paper direction
    if (opts.paperDirection) {
      this.instance.command.executePaperDirection(opts.paperDirection)
    }

    // 3. Margins
    if (Array.isArray(opts.margins) && opts.margins.length === 4) {
      this.instance.command.executeSetPaperMargin(
        opts.margins as [number, number, number, number]
      )
    }

    // 4. Page mode
    if (opts.pageMode) {
      this.instance.command.executePageMode(opts.pageMode)
    }

    // 5. Editor mode
    if (opts.mode) {
      this.instance.command.executeMode(opts.mode)
    }

    // 6. Watermark
    if (opts.watermark && opts.watermark.data) {
      this.instance.command.executeAddWatermark({
        data: opts.watermark.data,
        color: opts.watermark.color || '#AEB5C0',
        opacity: opts.watermark.opacity ?? 0.2,
        size: opts.watermark.size || 60
      })
    } else {
      this.instance.command.executeDeleteWatermark()
    }

    // 7. Update remaining options
    const rest = { ...opts }
    delete rest.width
    delete rest.height
    delete rest.paperDirection
    delete rest.margins
    delete rest.pageMode
    delete rest.mode
    delete rest.watermark

    this.instance.command.executeUpdateOptions(rest)
  }

  private _close() {
    if (this.mask && this.wrapper) {
      const modal = this.wrapper.querySelector('.settings-modal')
      this.mask.classList.remove('active')
      modal?.classList.remove('active')
      setTimeout(() => {
        this.mask?.remove()
        this.wrapper?.remove()
      }, 250)
    }
  }
}
