import * as XLSX from 'xlsx';

/**
 * Reusable utility to export JSON datasets into formatted Excel (.xlsx) files.
 * @param {Array<Object>} data - Array of raw data items.
 * @param {string} filename - Descriptive prefix for the downloaded file.
 * @param {Array<{key: string|Function, label: string}>} columns - List of column mapping configurations.
 */
export const exportToExcel = ({ data, filename, columns }) => {
  // 1. Map raw dataset into user-friendly localized keys
  const formattedData = data.map(item => {
    const formattedItem = {};
    columns.forEach(col => {
      let value = '';
      if (typeof col.key === 'function') {
        value = col.key(item);
      } else {
        value = item[col.key];
      }
      // Sanitize null, undefined, or empty values with clean placeholders
      formattedItem[col.label] = value !== null && value !== undefined && value !== '' ? value : 'N/A';
    });
    return formattedItem;
  });

  // 2. Build Excel Worksheet and Workbook structures
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, filename.substring(0, 31)); // sheet names are limited to 31 chars in Excel

  // 3. Dynamically compute optimal column widths
  const colWidths = {};
  formattedData.forEach(row => {
    Object.keys(row).forEach(key => {
      const valueLength = String(row[key]).length;
      colWidths[key] = Math.max(colWidths[key] || 10, valueLength);
    });
  });

  // Include column label lengths as a baseline
  Object.keys(colWidths).forEach(key => {
    colWidths[key] = Math.max(colWidths[key], key.length);
  });

  // Apply widths with standard padding, capping between 12 and 45 characters
  worksheet['!cols'] = Object.keys(colWidths).map(key => ({
    wch: Math.min(Math.max(colWidths[key] + 3, 12), 45)
  }));

  // 4. Write Excel binary file and trigger automatic browser download
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
};
