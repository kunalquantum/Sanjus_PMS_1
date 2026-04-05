// Helper to generate IDs
const uid = () => Math.random().toString(36).substr(2, 9);

export const programs = [
  { id: 'p1', name: 'STEM Excellence Scholarship', objective: 'Supporting high-potential students in science and engineering.', budget: 2500000, allocated: 1850000, studentCount: 45, status: 'Active', region: 'Bengaluru Urban' },
  { id: 'p2', name: 'Rural Education Uplift', objective: 'Bridging the urban-rural divide through consistent academic support.', budget: 1200000, allocated: 950000, studentCount: 32, status: 'Active', region: 'Tumakuru' },
  { id: 'p3', name: 'Digital Literacy Merit', objective: 'Providing devices and internet stipends to exceptional schoolers.', budget: 850000, allocated: 420000, studentCount: 28, status: 'Monitoring', region: 'Mysuru' },
  { id: 'p4', name: 'Girls Future Tech', objective: 'Focused coding and robotics training for female students in Grade 8-12.', budget: 1500000, allocated: 1100000, studentCount: 20, status: 'Active', region: 'Hubballi' },
];

export const students = [
  {
    id: 's1',
    name: 'Ananya S. Rao',
    grade: 10,
    school: 'GHS Sarjapur',
    programName: 'STEM Excellence Scholarship',
    attendance: 92,
    average: 88,
    academicStatus: 'Strong',
    riskLevel: 'Low',
    fundsReceived: 12000,
    scholarshipApproved: 25000,
    region: 'Bengaluru Urban',
    guardian: { name: 'Srinivasa Rao', relation: 'Father', phone: '+91 98450 12345' },
    attendanceHistory: [
      { month: 'Oct', attendance: 90, score: 85 },
      { month: 'Nov', attendance: 94, score: 87 },
      { month: 'Dec', attendance: 88, score: 82 },
      { month: 'Jan', attendance: 95, score: 90 },
      { month: 'Feb', attendance: 92, score: 88 },
      { month: 'Mar', attendance: 93, score: 89 },
    ],
    marks: [
      { subject: 'Mathematics', term1: 85, term2: 92, latest: 94 },
      { subject: 'Science', term1: 78, term2: 85, latest: 88 },
      { subject: 'English', term1: 82, term2: 80, latest: 85 },
      { subject: 'SST', term1: 75, term2: 82, latest: 84 },
    ],
    installments: [
      { id: 'i1', label: 'Term 1 Payout', amount: 6000, date: '2025-06-12', status: 'Disbursed' },
      { id: 'i2', label: 'Term 2 Payout', amount: 6000, date: '2025-11-05', status: 'Disbursed' },
      { id: 'i3', label: 'Final Milestone', amount: 13000, date: '2026-04-20', status: 'Scheduled' },
    ],
    expenses: [
      { category: 'Textbooks', amount: 1200, date: '2025-06-15', receipt: 'REC-001', status: 'Approved' },
      { category: 'Uniform', amount: 1800, date: '2025-06-20', receipt: 'REC-002', status: 'Approved' },
      { category: 'Bus Pass', amount: 500, date: '2025-07-01', receipt: 'REC-003', status: 'Approved' },
      { category: 'Internet Stipend', amount: 600, date: '2025-08-01', receipt: 'REC-004', status: 'Pending' },
    ],
    alerts: [],
    pendingDocs: ['April Bus Receipt'],
    studentId: 'ST-001'
  },
  {
    id: 's2',
    name: 'Rahul Kumar',
    grade: 9,
    school: 'Adarsha Vidyalaya',
    programName: 'Rural Education Uplift',
    attendance: 74,
    average: 58,
    academicStatus: 'Needs Attention',
    riskLevel: 'High',
    fundsReceived: 8000,
    scholarshipApproved: 20000,
    region: 'Tumakuru',
    guardian: { name: 'Sunita Devi', relation: 'Mother', phone: '+91 99000 67890' },
    attendanceHistory: [
      { month: 'Oct', attendance: 82, score: 65 },
      { month: 'Nov', attendance: 78, score: 62 },
      { month: 'Dec', attendance: 70, score: 60 },
      { month: 'Jan', attendance: 65, score: 55 },
      { month: 'Feb', attendance: 72, score: 58 },
      { month: 'Mar', attendance: 74, score: 58 },
    ],
    marks: [
      { subject: 'Mathematics', term1: 55, term2: 50, latest: 58 },
      { subject: 'Science', term1: 60, term2: 55, latest: 54 },
      { subject: 'English', term1: 65, term2: 62, latest: 60 },
    ],
    installments: [
      { id: 'i4', label: 'Term 1 Payout', amount: 8000, date: '2025-07-10', status: 'Disbursed' },
      { id: 'i5', label: 'Term 2 Payout', amount: 12000, date: '2025-12-15', status: 'Pending' },
    ],
    expenses: [
      { category: 'Cycles', amount: 4500, date: '2025-07-15', receipt: 'REC-005', status: 'Approved' },
    ],
    alerts: [
      { id: 'a1', type: 'Low Attendance', severity: 'Critical', message: 'Attendance dropped below 75% for three consecutive months.', status: 'Open' },
      { id: 'a2', type: 'Poor Grades', severity: 'Warning', message: 'Mathematics scores showing downward trend.', status: 'In Progress' }
    ],
    pendingDocs: ['December Term Report'],
    studentId: 'ST-002'
  },
  {
     id: 's3',
     name: 'Priyanka Patil',
     grade: 11,
     school: 'PU College Hubballi',
     programName: 'Girls Future Tech',
     attendance: 88,
     average: 75,
     academicStatus: 'Stable',
     riskLevel: 'Medium',
     fundsReceived: 15000,
     scholarshipApproved: 35000,
     region: 'Hubballi',
     guardian: { name: 'Basavaraj Patil', relation: 'Father', phone: '+91 97700 11223' },
     attendanceHistory: [
       { month: 'Oct', attendance: 85, score: 72 },
       { month: 'Nov', attendance: 88, score: 75 },
       { month: 'Dec', attendance: 84, score: 70 },
       { month: 'Jan', attendance: 90, score: 78 },
       { month: 'Feb', attendance: 88, score: 75 },
       { month: 'Mar', attendance: 88, score: 75 },
     ],
     marks: [
       { subject: 'Physics', term1: 72, term2: 78, latest: 80 },
       { subject: 'Chemistry', term1: 68, term2: 72, latest: 75 },
       { subject: 'CS', term1: 85, term2: 90, latest: 92 },
     ],
     installments: [
        { id: 'i6', label: 'Cycle 1', amount: 15000, date: '2025-08-20', status: 'Disbursed' },
        { id: 'i7', label: 'Cycle 2', amount: 20000, date: '2026-01-10', status: 'Disbursed' },
     ],
     expenses: [
       { category: 'Laptop', amount: 25000, date: '2025-08-25', receipt: 'REC-006', status: 'Approved' },
     ],
     alerts: [],
     pendingDocs: [],
     studentId: 'ST-003'
  }
];

export const allUsers = [
  { id: 'u1', name: 'Kavya Reddy', email: 'kavya.admin@ngo.org', role: 'ADMIN', status: 'Active', lastSeen: 'Today, 09:45 AM' },
  { id: 'u2', name: 'Sahana Patil', email: 'sahana.pm@ngo.org', role: 'PROJECT_MANAGER', status: 'Active', lastSeen: 'Yesterday, 04:20 PM' },
  { id: 'u3', name: 'Gururaj Joshi', email: 'gururaj.teacher@school.edu', role: 'TEACHER', status: 'Active', lastSeen: 'Today, 08:30 AM' },
  { id: 'u4', name: 'Ananya S. Rao', email: 'ananya.rao@student.in', role: 'STUDENT', status: 'Active', lastSeen: '2 days ago', studentId: 'ST-001' },
  { id: 'u5', name: 'Vijay Mallya (CSR)', email: 'vijay@infosys.com', role: 'FUNDER', status: 'Active', lastSeen: '1 hour ago' },
  { id: 'u6', name: 'Priya Hegde', email: 'priya.inv@ngo.org', role: 'PROJECT_MANAGER', status: 'Invited', lastSeen: 'Never' },
];

export const funders = [
  { id: 'f1', name: 'Infosys Social Impact', commitment: 5000000, studentsSupported: 120, regions: ['Bengaluru', 'Mysuru'] },
  { id: 'f2', name: 'Tata CSR Foundation', commitment: 3500000, studentsSupported: 85, regions: ['Tumakuru', 'Hubballi'] },
  { id: 'f3', name: 'Wipro Education Trust', commitment: 2000000, studentsSupported: 50, regions: ['Belagavi'] },
];

export const alerts = [
  { id: 'al1', studentName: 'Rahul Kumar', type: 'Low Attendance', severity: 'Critical', message: 'Attendance dropped below 75% for 3 months.', owner: 'Sahana Patil', status: 'Open' },
  { id: 'al2', studentName: 'Priya G.', type: 'Poor Grades', severity: 'Warning', message: 'Major dip in Term 2 mathematics score.', owner: 'Gururaj Joshi', status: 'In Progress' },
  { id: 'al3', studentName: 'Sumit Deshpande', type: 'Missing Proofs', severity: 'Critical', message: 'Rs. 4500 laptop claim missing valid GST receipt.', owner: 'Kavya Reddy', status: 'Flagged' },
  { id: 'al4', studentName: 'Meghana Rao', type: 'Audit Flag', severity: 'Info', message: 'Address mismatch in guardian Aadhaar and profile.', owner: 'Sahana Patil', status: 'Resolved' },
];

export const activityLogs = [
  { id: 'l1', message: 'New student Ananya Rao assigned to STEM program', actor: 'Sahana Patil', time: '10 mins ago' },
  { id: 'l2', message: 'Expense proof for REC-002 verified', actor: 'Kavya Reddy', time: '1 hour ago' },
  { id: 'l3', message: 'Attendance for Grade 10 finalized', actor: 'Gururaj Joshi', time: '3 hours ago' },
  { id: 'l4', message: 'Funder report published: Q3 Impact Analysis', actor: 'System', time: 'Yesterday' },
];

export const auditLogs = [
  { id: 'au1', timestamp: '2026-04-04 10:15', actor: 'Kavya Reddy', action: 'Update Role', entity: 'User', entityId: 'u4', status: 'Success' },
  { id: 'au2', timestamp: '2026-04-04 09:30', actor: 'Sahana Patil', action: 'Approve Expense', entity: 'Expense', entityId: 'e25', status: 'Success' },
  { id: 'au3', timestamp: '2026-04-03 16:45', actor: 'System', action: 'Auto-Trigger Alert', entity: 'Student', entityId: 's12', status: 'Flagged' },
];

export const fundTrend = [
  { month: 'Oct', allocated: 800000, utilized: 450000 },
  { month: 'Nov', allocated: 800000, utilized: 520000 },
  { month: 'Dec', allocated: 950000, utilized: 710000 },
  { month: 'Jan', allocated: 1200000, utilized: 890000 },
  { month: 'Feb', allocated: 1200000, utilized: 950000 },
  { month: 'Mar', allocated: 1500000, utilized: 1100000 },
];

export const studentGrowthTrend = [
  { month: 'Oct', students: 45 },
  { month: 'Nov', students: 58 },
  { month: 'Dec', students: 72 },
  { month: 'Jan', students: 85 },
  { month: 'Feb', students: 105 },
  { month: 'Mar', students: 125 },
];

export const programDistribution = [
  { name: 'STEM', value: 45 },
  { name: 'Rural Uplift', value: 32 },
  { name: 'Digital Literacy', value: 28 },
  { name: 'Girls Future', value: 20 },
];

export const impactSummary = [
  { metric: 'Attendance Recovery', value: 85 },
  { metric: 'Grade Improvement', value: 68 },
  { metric: 'Proof Compliance', value: 92 },
  { metric: 'Beneficiary Reach', value: 74 },
];

export const reportSnapshots = [
  { id: 'r1', title: 'Q3 Transparency Report', description: 'Financial utilization and audit logs for Oct-Dec 2025.', period: 'Oct-Dec 2025', status: 'Ready' },
  { id: 'r2', title: 'Annual Impact Narrative', description: 'Detailed student success stories and academic stability charts.', period: 'FY 2024-25', status: 'In Review' },
  { id: 'r3', title: 'Funder Impact Deck', description: 'Simplified rollup for CSR stakeholders and donor engagement.', period: 'Last 12 Months', status: 'Draft' },
];

export const notifications = [
  { id: 'n1', title: 'Scholarship Disbursed', description: 'Your Term 2 installment of Rs. 6,000 has been credited to your bank account.', type: 'Success' },
  { id: 'n2', title: 'Missing Proof Reminder', description: 'Please upload the receipt for your Jan internet stipend to avoid delays in next payout.', type: 'Warning' },
  { id: 'n3', title: 'New Program Launched', description: 'You are now eligible to apply for the Coding Bootcamp starting summer 2026.', type: 'Info' },
];

export const disbursements = [
  { id: 'd1', studentName: 'Ananya S. Rao', programName: 'STEM Excellence', installment: 'Term 2', amount: 6000, dueDate: '2025-11-05', status: 'Disbursed', mode: 'Bank Transfer' },
  { id: 'd2', studentName: 'Rahul Kumar', programName: 'Rural Uplift', installment: 'Term 1', amount: 8000, dueDate: '2025-07-10', status: 'Disbursed', mode: 'Cheque' },
  { id: 'd3', studentName: 'Meghana Rao', programName: 'Girls Tech', installment: 'Cycle 1', amount: 15000, dueDate: '2025-08-20', status: 'Pending', mode: 'UPI' },
  { id: 'd4', studentName: 'Sumit Deshpande', programName: 'STEM Excellence', installment: 'Term 2', amount: 6000, dueDate: '2025-11-05', status: 'Scheduled', mode: 'Bank Transfer' },
];

export const attendanceRegister = [
  { studentName: 'Ananya S. Rao', className: 'Grade 10', status: 'Present', remarks: 'Consistent' },
  { studentName: 'Rahul Kumar', className: 'Grade 9', status: 'Absent', remarks: 'Sick leave' },
  { studentName: 'Priyanka Patil', className: 'Grade 11', status: 'Late', remarks: 'Transport delay' },
  { studentName: 'Sumit Hegde', className: 'Grade 10', status: 'Present', remarks: '' },
];

export const marksUploads = [
  { studentName: 'Ananya S. Rao', subject: 'Mathematics', latest: 94, teacherRemark: 'Outstanding performance in calculus.' },
  { studentName: 'Rahul Kumar', subject: 'Science', latest: 54, teacherRemark: 'Needs extra classes for physics.' },
  { studentName: 'Priyanka Patil', subject: 'CS', latest: 92, teacherRemark: 'Exceptional coding skills.' },
];

export const expenseRecords = [
  { studentName: 'Ananya S. Rao', category: 'Textbooks', amount: 1200, status: 'Approved', programName: 'STEM Excellence' },
  { studentName: 'Ananya S. Rao', category: 'Uniform', amount: 1800, status: 'Approved', programName: 'STEM Excellence' },
  { studentName: 'Rahul Kumar', category: 'Cycles', amount: 4500, status: 'Pending', programName: 'Rural Uplift' },
  { studentName: 'Priyanka Patil', category: 'Laptop', amount: 25000, status: 'Approved', programName: 'Girls Future Tech' },
];
