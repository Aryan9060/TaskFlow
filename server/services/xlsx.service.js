import ExcelJS from 'exceljs'

// Renders [{ title, headers, rows }] sheets into one XLSX file buffer.
// The header row is bolded and frozen so long exports stay readable; no
// formulas are ever written, every cell is a literal value.
export async function buildWorkbookBuffer(sheets) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'TaskFlow'

  for (const { title, headers, rows } of sheets) {
    const sheet = workbook.addWorksheet(title)
    sheet.addRow(headers)
    sheet.getRow(1).font = { bold: true }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]

    for (const row of rows) {
      sheet.addRow(row)
    }

    headers.forEach((header, index) => {
      sheet.getColumn(index + 1).width = Math.min(40, Math.max(12, String(header).length + 4))
    })
  }

  return workbook.xlsx.writeBuffer()
}
