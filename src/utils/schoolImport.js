import * as XLSX from 'xlsx';

const dataSheetNames = ['All Batch', 'Batch - 2', 'Batch - 3'];

const normalizeSheetName = (value = '') => value.replace(/\s+/g, ' ').trim();

const normalizeGender = (value = '') => {
  const gender = `${value}`.trim().toLowerCase();
  if (gender === 'male') return 'Male';
  if (gender === 'female') return 'Female';
  if (gender === 'transgender') return 'Transgender';
  return 'Unknown';
};

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = `${value}`.trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/\s*(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
};

const numericValue = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = `${value}`.replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getWorksheetRows = (worksheet) =>
  XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

const buildRowObject = (row, sheetName, index) => {
  const pen = `${row[0] || ''}`.trim();
  const studentName = `${row[1] || ''}`.trim();

  if (!pen || !studentName || studentName === 'Name of Student') {
    return null;
  }

  const sourceSheet = normalizeSheetName(sheetName);
  const totalAmount =
    numericValue(row[29]) ||
    numericValue(row[30]) ||
    [
      numericValue(row[15]),
      numericValue(row[16]),
      numericValue(row[18]),
      numericValue(row[19]),
      numericValue(row[20]),
      numericValue(row[21]),
      numericValue(row[22]),
      numericValue(row[23]),
      numericValue(row[24]),
      numericValue(row[25]),
      numericValue(row[26]),
      numericValue(row[27]),
      numericValue(row[28]),
    ].reduce((sum, amount) => sum + amount, 0);

  return {
    academic_year: '2025-26',
    source_sheet: sourceSheet,
    class_name: sourceSheet,
    section_name: 'A',
    pen,
    student_name: studentName,
    gender: normalizeGender(row[3]),
    date_of_birth: parseDateValue(row[4]),
    school_name: `${row[8] || ''}`.trim() || null,
    guardian_name: null,
    guardian_phone: `${row[7] || ''}`.trim() || `${row[6] || ''}`.trim() || null,
    aadhaar_verified: false,
    entry_status: 'Completed',
    is_new_student: false,
    updated_on: new Date().toISOString(),
    updated_by: 'ADMIN',
    updated_by_id: 'excel-import',
    program_name: `${row[11] || sourceSheet}`.trim() || sourceSheet,
    approved_amount: totalAmount,
    received_amount: 0,
    general_profile: {
      uid: pen,
      batch_value: row[2],
      age: row[5],
      student_contact_no: row[6],
      parent_contact_no: row[7],
      school_name: row[8],
      ssc_score: row[9],
      year_of_passing_ssc: row[10],
    },
    enrolment_profile: {
      future_goal: row[11],
      college_name_11th: row[12],
      enrolled_in_11th: row[13],
      coaching_class_name: row[14],
    },
    facility_profile: {
      amount_11th: numericValue(row[15]),
      amount_12th: numericValue(row[16]),
      amount_14th: numericValue(row[18]),
      amount_15th: numericValue(row[19]),
      coaching_amount_year_1: numericValue(row[20]),
      coaching_amount_year_2: numericValue(row[21]),
      sports_gym_amount_year_1: numericValue(row[22]),
      sports_gym_amount_year_2: numericValue(row[23]),
      extra_amounts: [row[24], row[25], row[26], row[27], row[28]].filter(Boolean),
    },
    preview_profile: {
      source_row_number: index + 1,
      imported_from_workbook: true,
      total_amount: totalAmount,
    },
  };
};

export const parseSchoolWorkbook = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const rows = workbook.SheetNames
    .filter((sheetName) => dataSheetNames.includes(normalizeSheetName(sheetName)))
    .flatMap((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const rows = getWorksheetRows(worksheet);
      return rows.map((row, index) => buildRowObject(row, sheetName, index)).filter(Boolean);
    });

  const uniqueRows = [...new Map(rows.map((row) => [row.pen, row])).values()];

  const classes = [...new Set(uniqueRows.map((row) => `${row.class_name}::${row.section_name}`))].map((value) => {
    const [class_name, section_name] = value.split('::');
    return { class_name, section_name };
  });

  return {
    workbookName: file.name,
    totalRows: uniqueRows.length,
    classes,
    rows: uniqueRows,
  };
};

export const importWorkbookToSupabase = async ({ supabase, parsedWorkbook }) => {
  const rows = [...new Map(parsedWorkbook.rows.map((row) => [row.pen, row])).values()];

  const { error: upsertError } = await supabase
    .from('school_data')
    .upsert(rows, { onConflict: 'pen' });

  if (upsertError) throw upsertError;

  return {
    importedStudents: rows.length,
    importedClasses: parsedWorkbook.classes.length,
  };
};
