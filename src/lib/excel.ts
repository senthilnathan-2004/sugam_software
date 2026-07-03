import * as XLSX from 'xlsx';

/**
 * Exports JSON data into an Excel spreadsheet (.xlsx file)
 * and triggers client-side download.
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Write file buffer and trigger download in browser context
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Parses an Excel spreadsheet uploaded by a user
 * and returns JSON mapping row data.
 */
export function importFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      } catch (err) {
        reject(new Error('Failed to parse excel file structure.'));
      }
    };
    reader.onerror = () => reject(new Error('File reader trigger error.'));
    reader.readAsBinaryString(file);
  });
}
