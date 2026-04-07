import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const applyExportStyles = (root) => {
  root.style.background = '#f8fafc';
  root.style.color = '#0f172a';
  root.style.padding = '0';

  root.querySelectorAll('*').forEach((node) => {
    node.style.animation = 'none';
    node.style.transition = 'none';
    node.style.filter = 'none';
    node.style.backdropFilter = 'none';
    node.style.webkitBackdropFilter = 'none';
    node.style.opacity = '1';
    node.style.textShadow = 'none';
  });

  root.querySelectorAll('.panel-sheen').forEach((node) => {
    node.style.background = '#ffffff';
    node.style.border = '1px solid #dbe5f0';
    node.style.boxShadow = '0 10px 30px rgba(15, 23, 42, 0.08)';
  });

  root.querySelectorAll('[class*="text-slate-400"], [class*="text-slate-500"], [class*="text-slate-600"]').forEach((node) => {
    node.style.color = '#475569';
  });

  root.querySelectorAll('[class*="text-slate-900"], [class*="text-slate-950"]').forEach((node) => {
    node.style.color = '#0f172a';
  });

  root.querySelectorAll('[class*="bg-slate-50"], [class*="bg-white"]').forEach((node) => {
    if (!node.className.includes('bg-slate-950')) {
      node.style.background = '#ffffff';
    }
  });

  root.querySelectorAll('table').forEach((node) => {
    node.style.background = '#ffffff';
  });
};

const buildCaptureRoot = (element) => {
  const clone = element.cloneNode(true);
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = `${element.scrollWidth}px`;
  wrapper.style.background = '#f8fafc';
  wrapper.style.padding = '24px';
  wrapper.style.zIndex = '-1';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  applyExportStyles(clone);
  return { wrapper, clone };
};

/**
 * High-fidelity PDF exporter for NGO Education PMS.
 * Captures a DOM element and converts it to a professional multi-page or single-page PDF report.
 * @param {string} elementId - The ID of the container to capture.
 * @param {string} filename - Output name for the PDF.
 * @param {Object} options - Customization options (title, role, date).
 */
export const exportToPDF = async (elementId, filename = 'report.pdf', options = {}) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }

  let wrapper;
  try {
    const capture = buildCaptureRoot(element);
    wrapper = capture.wrapper;

    const canvas = await html2canvas(capture.clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#f8fafc',
      windowWidth: capture.clone.scrollWidth,
      windowHeight: capture.clone.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

    const margin = 10;
    const headerHeight = 30;
    
    pdf.setFillColor(11, 19, 32); // slate-950
    pdf.rect(0, 0, pdfWidth, headerHeight, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NGO EDUCATION PERFORMANCE MANAGEMENT SYSTEM', margin, 12);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(200, 200, 200);
    pdf.text(options.title || 'Executive Summary Report', margin, 20);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, pdfWidth - margin, 20, { align: 'right' });

    const contentY = headerHeight + margin;
    const availableWidth = pdfWidth - (margin * 2);
    const displayHeight = (imgProps.height * availableWidth) / imgProps.width;
    const usablePageHeight = pdfHeight - contentY - margin;
    let remainingHeight = displayHeight;
    let pageIndex = 0;

    while (remainingHeight > 0) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      if (pageIndex > 0) {
        pdf.setFillColor(11, 19, 32);
        pdf.rect(0, 0, pdfWidth, headerHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('NGO EDUCATION PERFORMANCE MANAGEMENT SYSTEM', margin, 12);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(200, 200, 200);
        pdf.text(options.title || 'Executive Summary Report', margin, 20);
        pdf.text(`Generated on: ${new Date().toLocaleString()}`, pdfWidth - margin, 20, { align: 'right' });
      }

      const offset = pageIndex * usablePageHeight;
      pdf.addImage(
        imgData,
        'PNG',
        margin,
        contentY - offset,
        availableWidth,
        displayHeight,
        undefined,
        'FAST'
      );

      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('CONFIDENTIAL - NGO INTERNAL USE ONLY', pdfWidth / 2, pdfHeight - 8, { align: 'center' });

      remainingHeight -= usablePageHeight;
      pageIndex += 1;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
  } finally {
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
};

export const exportRowsToCSV = (rows = [], filename = 'export.csv') => {
  if (!rows.length) {
    console.error('No rows provided for CSV export.');
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? '';
          const escaped = `${value}`.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportNarrativeToPDF = (title, sections = [], filename = 'report.pdf') => {
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  let y = 20;

  pdf.setFillColor(11, 19, 32);
  pdf.rect(0, 0, pageWidth, 28, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('NGO EDUCATION PERFORMANCE MANAGEMENT SYSTEM', margin, 12);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(title, margin, 21);

  y = 38;
  pdf.setTextColor(36, 44, 59);

  sections.forEach((section) => {
    if (y > pageHeight - 24) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(section.heading, margin, y);
    y += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const bodyLines = pdf.splitTextToSize(section.body, pageWidth - margin * 2);
    pdf.text(bodyLines, margin, y);
    y += bodyLines.length * 5 + 6;
  });

  pdf.setFontSize(8);
  pdf.setTextColor(140, 140, 140);
  pdf.text('CONFIDENTIAL - NGO INTERNAL USE ONLY', pageWidth / 2, pageHeight - 8, { align: 'center' });
  pdf.save(filename);
};

const createReportDocument = (title, subtitle) => {
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;

  const drawHeader = () => {
    pdf.setFillColor(11, 19, 32);
    pdf.rect(0, 0, pageWidth, 28, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text('NGO EDUCATION PERFORMANCE MANAGEMENT SYSTEM', margin, 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(subtitle, margin, 21);
    pdf.text(new Date().toLocaleString(), pageWidth - margin, 21, { align: 'right' });
  };

  const drawFooter = () => {
    pdf.setFontSize(8);
    pdf.setTextColor(140, 140, 140);
    pdf.text('CONFIDENTIAL - NGO INTERNAL USE ONLY', pageWidth / 2, pageHeight - 8, { align: 'center' });
  };

  const ensureSpace = (y, required = 18) => {
    if (y + required > pageHeight - 18) {
      drawFooter();
      pdf.addPage();
      drawHeader();
      return 38;
    }
    return y;
  };

  drawHeader();
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(title, margin, 36);

  return {
    pdf,
    pageWidth,
    pageHeight,
    margin,
    y: 46,
    ensureSpace,
    drawFooter,
  };
};

const addSectionHeading = (doc, heading, description = '') => {
  doc.y = doc.ensureSpace(doc.y, 18);
  doc.pdf.setTextColor(15, 23, 42);
  doc.pdf.setFont('helvetica', 'bold');
  doc.pdf.setFontSize(12);
  doc.pdf.text(heading, doc.margin, doc.y);
  doc.y += 6;

  if (description) {
    doc.pdf.setFont('helvetica', 'normal');
    doc.pdf.setFontSize(10);
    doc.pdf.setTextColor(71, 85, 105);
    const lines = doc.pdf.splitTextToSize(description, doc.pageWidth - doc.margin * 2);
    doc.pdf.text(lines, doc.margin, doc.y);
    doc.y += lines.length * 5 + 3;
  }
};

const addStatGrid = (doc, stats = []) => {
  const boxWidth = (doc.pageWidth - doc.margin * 2 - 8) / 2;
  const boxHeight = 24;
  let x = doc.margin;
  let y = doc.ensureSpace(doc.y, boxHeight * Math.ceil(stats.length / 2) + 6);

  stats.forEach((stat, index) => {
    if (index > 0 && index % 2 === 0) {
      y += boxHeight + 6;
      x = doc.margin;
      y = doc.ensureSpace(y, boxHeight + 6);
    }

    doc.pdf.setDrawColor(219, 229, 240);
    doc.pdf.setFillColor(255, 255, 255);
    doc.pdf.roundedRect(x, y, boxWidth, boxHeight, 4, 4, 'FD');
    doc.pdf.setFont('helvetica', 'bold');
    doc.pdf.setFontSize(8);
    doc.pdf.setTextColor(100, 116, 139);
    doc.pdf.text(stat.label.toUpperCase(), x + 4, y + 7);
    doc.pdf.setFontSize(14);
    doc.pdf.setTextColor(15, 23, 42);
    doc.pdf.text(`${stat.value}`, x + 4, y + 15);
    doc.pdf.setFont('helvetica', 'normal');
    doc.pdf.setFontSize(8);
    doc.pdf.setTextColor(71, 85, 105);
    doc.pdf.text(stat.helper || '', x + 4, y + 21);
    x += boxWidth + 8;
  });

  doc.y = y + boxHeight + 8;
};

const addListRows = (doc, rows = [], columns = []) => {
  let y = doc.ensureSpace(doc.y, 14);
  const usableWidth = doc.pageWidth - doc.margin * 2;
  const colWidth = usableWidth / columns.length;

  doc.pdf.setFillColor(241, 245, 249);
  doc.pdf.rect(doc.margin, y, usableWidth, 8, 'F');
  doc.pdf.setFont('helvetica', 'bold');
  doc.pdf.setFontSize(8);
  doc.pdf.setTextColor(71, 85, 105);
  columns.forEach((column, index) => {
    doc.pdf.text(column.label, doc.margin + index * colWidth + 2, y + 5.5);
  });
  y += 10;

  rows.forEach((row) => {
    y = doc.ensureSpace(y, 10);
    doc.pdf.setDrawColor(226, 232, 240);
    doc.pdf.line(doc.margin, y - 2, doc.pageWidth - doc.margin, y - 2);
    doc.pdf.setFont('helvetica', 'normal');
    doc.pdf.setFontSize(8);
    doc.pdf.setTextColor(15, 23, 42);
    columns.forEach((column, index) => {
      const value = `${row[column.key] ?? ''}`;
      const shortValue = value.length > 22 ? `${value.slice(0, 20)}..` : value;
      doc.pdf.text(shortValue, doc.margin + index * colWidth + 2, y + 2.5);
    });
    y += 8;
  });

  doc.y = y + 4;
};

const saveReportDocument = (doc, filename) => {
  doc.drawFooter();
  doc.pdf.save(filename);
};

export const exportAdminSnapshotPDF = ({
  metrics = [],
  programRows = [],
  alertRows = [],
  activityRows = [],
  filename = 'Admin_Dashboard_Snapshot.pdf',
}) => {
  const doc = createReportDocument('Executive Control Snapshot', 'Admin portfolio export');
  addSectionHeading(doc, 'Executive Summary', 'A dedicated export layout for NGO-wide operational review, financial oversight, and governance visibility.');
  addStatGrid(doc, metrics);
  addSectionHeading(doc, 'Program Utilization', 'Budget, allocation, and cohort coverage across the active portfolio.');
  addListRows(doc, programRows, [
    { key: 'name', label: 'Program' },
    { key: 'budget', label: 'Budget' },
    { key: 'allocated', label: 'Allocated' },
    { key: 'students', label: 'Students' },
  ]);
  addSectionHeading(doc, 'Priority Alerts', 'Current high-priority alerts requiring intervention or governance action.');
  addListRows(doc, alertRows, [
    { key: 'student', label: 'Student' },
    { key: 'type', label: 'Type' },
    { key: 'severity', label: 'Severity' },
    { key: 'owner', label: 'Owner' },
  ]);
  addSectionHeading(doc, 'Recent Activity', 'Latest portfolio operations captured in the dashboard feed.');
  addListRows(doc, activityRows, [
    { key: 'message', label: 'Activity' },
    { key: 'actor', label: 'Actor' },
    { key: 'time', label: 'Time' },
  ]);
  saveReportDocument(doc, filename);
};

export const exportFunderImpactPDF = ({
  metrics = [],
  programRows = [],
  impactRows = [],
  reportRows = [],
  filename = 'CSR_Funder_Impact_Report.pdf',
}) => {
  const doc = createReportDocument('CSR Funder Impact Analysis', 'Trust and transparency export');
  addSectionHeading(doc, 'Impact Summary', 'A print-safe stakeholder-facing report on fund movement, beneficiary outcomes, and program confidence signals.');
  addStatGrid(doc, metrics);
  addSectionHeading(doc, 'Funding By Program', 'Program-wise commitment and utilization rollup for current reporting scope.');
  addListRows(doc, programRows, [
    { key: 'program', label: 'Program' },
    { key: 'budget', label: 'Committed' },
    { key: 'utilized', label: 'Utilized' },
    { key: 'status', label: 'Status' },
  ]);
  addSectionHeading(doc, 'Impact Analytics', 'Key operational outcomes supported by CSR funding.');
  addListRows(doc, impactRows, [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ]);
  addSectionHeading(doc, 'Available Report Cards', 'Current reporting artifacts prepared for funder review.');
  addListRows(doc, reportRows, [
    { key: 'title', label: 'Report' },
    { key: 'period', label: 'Period' },
    { key: 'status', label: 'Status' },
  ]);
  saveReportDocument(doc, filename);
};

export const exportReportPackPDF = ({
  report,
  filters,
  studentRows = [],
  filename,
}) => {
  const doc = createReportDocument(report.title, 'Prepared reporting pack');
  addSectionHeading(doc, 'Report Metadata', report.description);
  addListRows(doc, [
    {
      period: report.period,
      status: report.status,
      date_range: filters.dateRange,
      region: filters.region,
    },
  ], [
    { key: 'period', label: 'Period' },
    { key: 'status', label: 'Status' },
    { key: 'date_range', label: 'Date Range' },
    { key: 'region', label: 'Region' },
  ]);
  addSectionHeading(doc, 'Filter Scope', `Program: ${filters.program} | Student: ${filters.student} | Funder: ${filters.funder}`);
  addSectionHeading(doc, 'Included Beneficiaries', 'Student rows currently included under the active report filters.');
  addListRows(
    doc,
    studentRows.length ? studentRows : [{ student_name: 'No matching students', program: '-', attendance: '-', marks: '-' }],
    [
      { key: 'student_name', label: 'Student' },
      { key: 'program', label: 'Program' },
      { key: 'attendance', label: 'Attendance' },
      { key: 'marks', label: 'Marks' },
    ]
  );
  saveReportDocument(doc, filename || `${report.title.replace(/[^a-z0-9]+/gi, '_')}.pdf`);
};

const addKeyValueRows = (doc, rows = []) => {
  rows.forEach((row) => {
    doc.y = doc.ensureSpace(doc.y, 12);
    doc.pdf.setDrawColor(226, 232, 240);
    doc.pdf.line(doc.margin, doc.y - 1.5, doc.pageWidth - doc.margin, doc.y - 1.5);
    doc.pdf.setFont('helvetica', 'bold');
    doc.pdf.setFontSize(9);
    doc.pdf.setTextColor(71, 85, 105);
    doc.pdf.text(row.label, doc.margin, doc.y + 3);
    doc.pdf.setFont('helvetica', 'normal');
    doc.pdf.setTextColor(15, 23, 42);
    const lines = doc.pdf.splitTextToSize(`${row.value}`, doc.pageWidth - doc.margin * 2 - 34);
    doc.pdf.text(lines, doc.margin + 34, doc.y + 3);
    doc.y += Math.max(8, lines.length * 4.5 + 2);
  });

  doc.y += 4;
};

const addWideTable = (doc, rows = [], columns = []) => {
  if (!columns.length) return;

  const usableWidth = doc.pageWidth - doc.margin * 2;
  const totalWeight = columns.reduce((sum, column) => sum + (column.width || 1), 0);
  const widths = columns.map((column) => (usableWidth * (column.width || 1)) / totalWeight);

  let y = doc.ensureSpace(doc.y, 18);
  doc.pdf.setFillColor(241, 245, 249);
  doc.pdf.rect(doc.margin, y, usableWidth, 8, 'F');
  doc.pdf.setFont('helvetica', 'bold');
  doc.pdf.setFontSize(7);
  doc.pdf.setTextColor(71, 85, 105);

  let x = doc.margin;
  columns.forEach((column, index) => {
    doc.pdf.text(column.label, x + 2, y + 5.3);
    x += widths[index];
  });

  y += 10;

  rows.forEach((row) => {
    y = doc.ensureSpace(y, 9);
    doc.pdf.setDrawColor(226, 232, 240);
    doc.pdf.line(doc.margin, y - 2, doc.pageWidth - doc.margin, y - 2);
    doc.pdf.setFont('helvetica', 'normal');
    doc.pdf.setFontSize(7);
    doc.pdf.setTextColor(15, 23, 42);

    let rowX = doc.margin;
    columns.forEach((column, index) => {
      const rawValue = `${row[column.key] ?? ''}`;
      const maxChars = column.maxChars || 12;
      const value = rawValue.length > maxChars ? `${rawValue.slice(0, maxChars - 2)}..` : rawValue;
      doc.pdf.text(value, rowX + 2, y + 2.2);
      rowX += widths[index];
    });

    y += 7;
  });

  doc.y = y + 4;
};

export const exportDashboardReportPDF = ({
  batch = 'All Batch',
  filters = {},
  stats = {},
  chartHighlights = {},
  rows = [],
  filename = 'SnehaAsha_Dashboard_Report.pdf',
}) => {
  const doc = createReportDocument('Sneha Asha Dashboard Report', `${batch} reporting export`);

  addSectionHeading(
    doc,
    'Reporting Scope',
    'This export captures the active dashboard selection as a print-friendly report for donor review, internal reporting, and batch-level follow-up.'
  );

  addKeyValueRows(doc, [
    { label: 'Batch', value: batch },
    { label: 'Student Search', value: filters.search || 'Not applied' },
    { label: 'Gender Filter', value: filters.gender || 'All' },
    { label: 'Age Filter', value: filters.age || 'All' },
    { label: 'Year Of Passing SSC', value: filters.year || 'All' },
    { label: 'Integrated Filter', value: filters.integrated || 'All' },
    { label: 'Table Search', value: filters.tableSearch || 'Not applied' },
  ]);

  addSectionHeading(doc, 'Headline Statistics', 'Current totals from the active filtered dashboard view.');
  addStatGrid(doc, [
    { label: 'Transactions', value: stats.transactions ?? 0, helper: 'Filtered student rows' },
    { label: 'Donors', value: stats.donors ?? 0, helper: 'Unique donor-linked records' },
    { label: 'Donations', value: stats.donations ?? '-', helper: 'Combined support amount' },
    { label: 'Average Gift', value: stats.avgGift ?? '-', helper: 'Average amount per record' },
  ]);

  addSectionHeading(doc, 'Analytics Highlights', 'A compact narrative summary of the charts currently shown on the dashboard.');
  addKeyValueRows(doc, [
    {
      label: 'Top 11th Amount Student',
      value: chartHighlights.topStudent || 'No matching student data',
    },
    {
      label: 'Strongest School Cluster',
      value: chartHighlights.topSchool || 'No school concentration detected',
    },
    {
      label: 'Largest Age Segment',
      value: chartHighlights.topAgeSegment || 'No age distribution available',
    },
    {
      label: '11th Amount Trend',
      value: chartHighlights.trendSummary || 'Trend data not available',
    },
  ]);

  addSectionHeading(doc, 'Top Students By 11th College Amount', 'Highest-value beneficiary rows under the current filter scope.');
  addListRows(
    doc,
    (chartHighlights.topStudents || []).length
      ? chartHighlights.topStudents
      : [{ name: 'No matching students', schoolName: '-', amount11thLabel: '-', totalAmountLabel: '-' }],
    [
      { key: 'name', label: 'Student' },
      { key: 'schoolName', label: 'School' },
      { key: 'amount11thLabel', label: '11th Amount' },
      { key: 'totalAmountLabel', label: 'Total Amount' },
    ]
  );

  addSectionHeading(doc, 'Transactions Register', 'Detailed rows prepared for follow-up, audit, and donor-ready circulation.');
  addWideTable(
    doc,
    rows.length
      ? rows
      : [{
          name: 'No matching rows',
          gender: '-',
          age: '-',
          yearOfPassingSSC: '-',
          amount11thLabel: '-',
          amount12thLabel: '-',
          coachingYear1Label: '-',
          coachingYear2Label: '-',
          amount14thLabel: '-',
          totalAmountLabel: '-',
        }],
    [
      { key: 'name', label: 'Student', width: 1.8, maxChars: 20 },
      { key: 'gender', label: 'Gender', width: 0.8, maxChars: 8 },
      { key: 'age', label: 'Age', width: 0.7, maxChars: 6 },
      { key: 'yearOfPassingSSC', label: 'SSC Year', width: 1, maxChars: 10 },
      { key: 'amount11thLabel', label: '11th', width: 1, maxChars: 11 },
      { key: 'amount12thLabel', label: '12th', width: 1, maxChars: 11 },
      { key: 'coachingYear1Label', label: 'Coach 1', width: 1, maxChars: 11 },
      { key: 'coachingYear2Label', label: 'Coach 2', width: 1, maxChars: 11 },
      { key: 'amount14thLabel', label: '14th', width: 1, maxChars: 11 },
      { key: 'totalAmountLabel', label: 'Total', width: 1.1, maxChars: 12 },
    ]
  );

  saveReportDocument(doc, filename);
};
