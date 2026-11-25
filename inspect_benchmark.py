import fitz

doc = fitz.open('BÁO CÁO TÌNH HÌNH KHIẾU NẠI T10_2026.pdf')
for page_num in range(len(doc)):
    p = doc[page_num]
    print(f'=== BENCHMARK PAGE {page_num+1} ({p.rect.width:.1f} x {p.rect.height:.1f}) ===')
    blocks = p.get_text('blocks')
    for b in blocks:
        first_line = b[4].strip().split('\n')[0] if b[4].strip() else ''
        print(f'   Text ({b[0]:.1f}, {b[1]:.1f}, {b[2]:.1f}, {b[3]:.1f}): "{first_line[:45]}"')
    for img in p.get_images():
        rects = p.get_image_rects(img[0])
        for r in rects:
            print(f'   Image {img[0]} ({r.x0:.1f}, {r.y0:.1f}, {r.x1:.1f}, {r.y1:.1f}) w={r.width:.1f}, h={r.height:.1f}')
doc.close()

