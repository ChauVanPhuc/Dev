import os
from docx import Document
from openpyxl import Workbook
from modules.system.services.export_template_engine import fill_template

# --- Word template ---
doc_path = 'test_export.docx'
doc = Document()
doc.add_paragraph('Company: {{company_name}}')
doc.add_paragraph('Date: {{date}}')
table = doc.add_table(rows=1, cols=2)
table.rows[0].cells[0].text = '{{stt}}'
table.rows[0].cells[1].text = '{{ten}}'
doc.save(doc_path)

data = [
    {'stt': 1, 'ten': 'Item A'},
    {'stt': 2, 'ten': 'Item B'},
]
context = {'company_name': 'G7 Corp', 'date': '17/07/2026'}
out = fill_template(doc_path, 'list', data, context)
open('test_export_filled.docx', 'wb').write(out)
print('docx filled size:', len(out))

# --- Excel template ---
xl_path = 'test_export.xlsx'
wb = Workbook()
ws = wb.active
ws['A1'] = 'Company: {{company_name}}'
ws['A2'] = 'Date: {{date}}'
ws['A4'] = '{{stt}}'
ws['B4'] = '{{ten}}'
wb.save(xl_path)

out = fill_template(xl_path, 'list', data, context)
open('test_export_filled.xlsx', 'wb').write(out)
print('xlsx filled size:', len(out))

# cleanup raw templates
os.remove(doc_path)
os.remove(xl_path)
print('test export engine ok')
