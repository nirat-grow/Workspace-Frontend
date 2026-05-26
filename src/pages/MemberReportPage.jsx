  import React, { useState, useEffect } from 'react';
import * as StandardXLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useParams } from 'react-router-dom';

const XLSX = window.XLSX || StandardXLSX;

const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 'N/A';
  const diffMs = new Date(endTime) - new Date(startTime);
  const diffMins = Math.round(diffMs / (1000 * 60));
  if (diffMins < 60) {
    const displayMins = diffMins > 0 ? diffMins : 1;
    return `${displayMins} min${displayMins !== 1 ? 's' : ''}`;
  }
  const hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
  return `${hours} hr${hours !== 1 ? 's' : ''}`;
};

const getDateRange = (filterType, customDate, customMonth) => {
  const start = new Date();
  const end = new Date();
  
  if (filterType === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  
  if (filterType === 'yesterday') {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  
  if (filterType === 'week') {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  
  if (filterType === 'custom' && customDate) {
    const d = new Date(customDate);
    d.setHours(0, 0, 0, 0);
    const dEnd = new Date(customDate);
    dEnd.setHours(23, 59, 59, 999);
    return { startDate: d.toISOString(), endDate: dEnd.toISOString() };
  }
  
  if (filterType === 'month' && customMonth) {
    const [year, month] = customMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const lastDay = new Date(year, month, 0, 23, 59, 59, 999);
    return { startDate: firstDay.toISOString(), endDate: lastDay.toISOString() };
  }

  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

const getFriendlyDateRangeText = (filterType, customDate, customMonth) => {
  if (filterType === 'today') {
    return `Today (${new Date().toLocaleDateString()})`;
  }
  if (filterType === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `Yesterday (${d.toLocaleDateString()})`;
  }
  if (filterType === 'week') {
    return 'Last 7 Days';
  }
  if (filterType === 'custom' && customDate) {
    return `Date: ${new Date(customDate).toLocaleDateString()}`;
  }
  if (filterType === 'month' && customMonth) {
    const [year, month] = customMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    return `${firstDay.toLocaleDateString()} - ${lastDay.toLocaleDateString()} (${firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
  }
  return 'Last 7 Days';
};

// ─── Professional Excel Helpers ────────────────────────────────────────────

const cellStyle = (overrides = {}) => ({
  font:      { name: 'Calibri', size: 11, color: { rgb: '1E293B' }, ...overrides.font },
  fill:      overrides.fill || { patternType: 'none' },
  alignment: { vertical: 'center', wrapText: false, ...overrides.alignment },
  border:    overrides.border || {},
  numFmt:    overrides.numFmt || '@'
});

const thinBorder = (color = 'CBD5E1') => ({
  top:    { style: 'thin', color: { rgb: color } },
  bottom: { style: 'thin', color: { rgb: color } },
  left:   { style: 'thin', color: { rgb: color } },
  right:  { style: 'thin', color: { rgb: color } }
});

const solidFill = (rgb) => ({ patternType: 'solid', fgColor: { rgb } });

const setCell = (ws, r, c, value, style) => {
  const addr = XLSX.utils.encode_cell({ r, c });
  const t = value instanceof Date ? 'd' : typeof value === 'number' ? 'n' : 's';
  ws[addr] = { v: value, t, s: style };
};

const createSheetFromRows = (rows, widths, headerRowCount = 1, headerColor = 'FFFFFF', headerBgColor = '0052CC', sheetTitle = '') => {
  const lastCol = (rows[0] || []).length;
  if (lastCol === 0) return XLSX.utils.aoa_to_sheet([[]]);

  // ── Build raw data: title row (row 0) + subtitle row (row 1) + headers + data
  const now = new Date();
  const generatedStr = `Generated: ${now.toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' })}  ${now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}`;

  const emptyRow   = Array(lastCol).fill('');
  const titleRow   = Array(lastCol).fill('');
  titleRow[0]      = sheetTitle || 'Report';
  const subRow     = Array(lastCol).fill('');
  subRow[0]        = generatedStr;
  const spacerRow  = Array(lastCol).fill('');

  // finalRows: [titleRow, subRow, spacerRow, ...headerRows, ...dataRows]
  const TITLE_ROW   = 0;
  const SUB_ROW     = 1;
  const SPACER_ROW  = 2;
  const HDR_START   = 3;
  const HDR_END     = HDR_START + headerRowCount; // exclusive
  const DATA_START  = HDR_END;

  const finalRows = [titleRow, subRow, spacerRow, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(finalRows);

  // ── Column widths (add a tiny padding)
  if (widths) ws['!cols'] = widths.map(wch => ({ wch: wch + 2 }));

  // ── Row heights
  const rowHeights = [];
  rowHeights[TITLE_ROW]  = { hpt: 36 };  // big title
  rowHeights[SUB_ROW]    = { hpt: 18 };  // subtitle
  rowHeights[SPACER_ROW] = { hpt: 6  };  // visual gap
  for (let r = HDR_START; r < HDR_END; r++)  rowHeights[r] = { hpt: 22 }; // header
  for (let r = DATA_START; r < finalRows.length; r++) rowHeights[r] = { hpt: 18 }; // data
  ws['!rows'] = rowHeights;

  // ── Merges: span title + subtitle across all columns
  ws['!merges'] = [
    { s: { r: TITLE_ROW, c: 0 }, e: { r: TITLE_ROW, c: lastCol - 1 } },
    { s: { r: SUB_ROW,   c: 0 }, e: { r: SUB_ROW,   c: lastCol - 1 } },
    { s: { r: SPACER_ROW,c: 0 }, e: { r: SPACER_ROW, c: lastCol - 1 } }
  ];

  try {
    // ── Title row style
    setCell(ws, TITLE_ROW, 0, sheetTitle || 'Report', cellStyle({
      font:      { name: 'Calibri', size: 18, bold: true, color: { rgb: headerColor } },
      fill:      solidFill(headerBgColor),
      alignment: { horizontal: 'center', vertical: 'center' }
    }));
    // Fill remaining title cells with same background
    for (let c = 1; c < lastCol; c++) {
      setCell(ws, TITLE_ROW, c, '', cellStyle({ fill: solidFill(headerBgColor) }));
    }

    // ── Subtitle row style (lighter shade of header color)
    const subBg = headerBgColor + '22'; // transparent-ish — fallback: use F1F5F9
    setCell(ws, SUB_ROW, 0, generatedStr, cellStyle({
      font:      { name: 'Calibri', size: 9, italic: true, color: { rgb: '64748B' } },
      fill:      solidFill('F1F5F9'),
      alignment: { horizontal: 'center', vertical: 'center' }
    }));
    for (let c = 1; c < lastCol; c++) {
      setCell(ws, SUB_ROW, c, '', cellStyle({ fill: solidFill('F1F5F9') }));
    }

    // ── Spacer row — plain white
    for (let c = 0; c < lastCol; c++) {
      setCell(ws, SPACER_ROW, c, '', cellStyle({ fill: solidFill('FFFFFF') }));
    }

    // ── Header rows
    for (let r = HDR_START; r < HDR_END; r++) {
      for (let c = 0; c < lastCol; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = cellStyle({
          font:      { name: 'Calibri', size: 11, bold: true, color: { rgb: headerColor } },
          fill:      solidFill(headerBgColor),
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border:    {
            top:    { style: 'medium', color: { rgb: headerBgColor } },
            bottom: { style: 'medium', color: { rgb: 'FFFFFF'      } },
            left:   { style: 'thin',   color: { rgb: headerBgColor } },
            right:  { style: 'thin',   color: { rgb: headerBgColor } }
          }
        });
      }
    }

    // ── Data rows
    for (let r = DATA_START; r < finalRows.length; r++) {
      const isEven = (r - DATA_START) % 2 === 0;
      const rowFill = isEven ? 'FFFFFF' : 'F8FAFC';
      const border  = thinBorder('E2E8F0');

      for (let c = 0; c < lastCol; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) continue;

        let align = 'left';
        let numFmt = '@';
        let fontColor = '1E293B';
        let isBold = false;

        if (cell.v instanceof Date) {
          align  = 'center';
          numFmt = 'dd-mmm-yyyy hh:mm';
          cell.t = 'd';
        } else if (typeof cell.v === 'number') {
          align  = 'right';
          numFmt = Number.isInteger(cell.v) ? '#,##0' : '#,##0.00';
        } else if (typeof cell.v === 'string') {
          const v = cell.v;
          // Duration / percentage alignment
          if (/\d+h(\s\d+m)?(\s\d+s)?$/.test(v) || /^\d+m(\s\d+s)?$/.test(v)) align = 'right';
          else if (v.endsWith('%')) align = 'center';
          // Status colouring
          if (v === 'Active' || v === 'Currently Running') fontColor = '059669';
          else if (v === 'Past Log')                        fontColor = '7C3AED';
          else if (v === 'Paused')                          fontColor = '94A3B8';
          // Bold first column (labels)
          if (c === 0) isBold = true;
        }

        cell.s = cellStyle({
          font:      { name: 'Calibri', size: 10, bold: isBold, color: { rgb: fontColor } },
          fill:      solidFill(rowFill),
          alignment: { horizontal: align, vertical: 'center' },
          border,
          numFmt
        });
      }
    }

    // ── Footer row (empty with accent bottom border)
    const footerR = finalRows.length;
    finalRows.push(Array(lastCol).fill(''));
    ws['!rows'][footerR] = { hpt: 4 };
    for (let c = 0; c < lastCol; c++) {
      setCell(ws, footerR, c, '', cellStyle({
        fill:   solidFill(headerBgColor),
        border: { top: { style: 'thin', color: { rgb: headerBgColor } } }
      }));
    }

    // ── Freeze panes below header + autofilter
    const lastColLetter = XLSX.utils.encode_col(lastCol - 1);
    ws['!autofilter'] = { ref: `A${DATA_START + 1}:${lastColLetter}${finalRows.length - 1}` };
    ws['!freeze']     = { xSplit: 0, ySplit: DATA_START };

    // ── Update sheet ref
    ws['!ref'] = `A1:${lastColLetter}${finalRows.length}`;
  } catch (e) {
    console.warn('Failed to apply Excel styles:', e);
  }

  return ws;
};

const downloadWorkbook = (workbook, filename) => {
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};


const getRelativeTimeString = (dateInput) => {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return date.toLocaleDateString();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

const formatLoggedHours = (hoursVal) => {
  if (!hoursVal) return '0s';
  const totalSeconds = Math.floor(hoursVal * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
};

const LiveTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startTime) {
      setElapsed('N/A');
      return;
    }

    const updateTimer = () => {
      const diffMs = new Date() - new Date(startTime);
      if (diffMs < 0) {
        setElapsed('0s');
        return;
      }
      const diffSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(diffSecs / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);
      const seconds = diffSecs % 60;

      let parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);
      setElapsed(parts.join(' '));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--accent)' }}>{elapsed}</span>;
};


const MemberReportPage = ({ activeProject }) => {
  const { user: currentUser } = useAuth();
  const { targetUserId } = useParams();
  const [targetUser, setTargetUser] = useState(null);
  const [data, setData] = useState({
    performance: { totalHours: 0, completedTasks: 0, productivity: 0 },
    dailyStatus: { pending: 0, stuck: 0, activity: [] },
    weekly: [],
    overdue: [],
    projectHours: [],
    completedTasks: [],
    stuckTasks: [],
    holdTasks: [],
    pendingTasks: [],
    delegatedTasks: [],
    historyTasks: [],
    progressTasks: []
  });
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'PROGRESS' ? 'TODO' : 'PROGRESS';
      await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error("Failed to update task status:", err);
      alert(err.response?.data?.error || "Failed to update task status.");
    }
  };

  const [filterType, setFilterType] = useState('today'); // 'today', 'yesterday', 'week', 'custom', 'month'
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [customMonth, setCustomMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7)); // YYYY-MM
  const activeRangeText = getFriendlyDateRangeText(filterType, customDate, customMonth);

  const handleDownloadReport = () => {
    const reportTitle = `Personal Report - ${targetUser?.name || 'User'}`;
    const summaryRows = [
      ['User', targetUser?.name || 'User'],
      ['Selected Range', activeRangeText],
      ['Generated At', new Date()],
      [''],
      ['Hours Tracked', `${data.performance.totalHours ? parseFloat(Number(data.performance.totalHours).toFixed(2)) : 0}h`],
      ['Completed Tasks', data.performance.completedTasks || 0],
      ['Pending Tasks', data.dailyStatus.pending || 0],
      ['Overdue Tasks', data.overdue.length || 0],
      ['Stuck Tasks', data.dailyStatus.stuck || 0],
      ['On Hold Tasks', data.holdTasks?.length || 0]
    ];

    const completedRows = data.completedTasks.map(task => [
      task.name || '',
      task.project || '',
      task.createdAt ? new Date(task.createdAt) : '',
      task.dueDate ? new Date(task.dueDate) : '',
      task.date ? new Date(task.date) : '',
      formatLoggedHours((task.timeLogs || []).reduce((sum, log) => sum + log.hours, 0))
    ]);

    const pendingRows = data.pendingTasks.map(task => [
      task.name || '',
      task.project || '',
      task.startTime ? new Date(task.startTime) : '',
      task.updatedAt ? new Date(task.updatedAt) : ''
    ]);

    const overdueRows = data.overdue.map(task => [
      task.name || '',
      task.project || '',
      task.dueDate ? new Date(task.dueDate) : '',
      task.daysOverdue || 0
    ]);

    const stuckRows = data.stuckTasks.map(task => [
      task.name || '',
      task.project || '',
      task.reason || 'No reason provided',
      task.updatedAt ? new Date(task.updatedAt) : ''
    ]);

    const holdRows = (data.holdTasks || []).map(task => [
      task.name || '',
      task.project || '',
      task.reason || 'Priority Shift',
      task.updatedAt ? new Date(task.updatedAt) : ''
    ]);

    // Build Current Tasks (Progress Tasks) rows for Excel
    const progressExcelRows = (data.progressTasks || []).map(task => {
      let startTimeStr = 'Paused';
      let endTimeStr = 'Paused';
      let workedTime = 'Paused';
      if (task.isLog) {
        startTimeStr = task.startTime ? new Date(task.startTime) : '';
        endTimeStr = task.endTime ? new Date(task.endTime) : '';
        workedTime = formatLoggedHours(task.totalHours);
      } else if (task.status === 'PROGRESS') {
        startTimeStr = task.startTime ? new Date(task.startTime) : '';
        endTimeStr = 'Currently Running';
        const diffMs = new Date() - new Date(task.startTime);
        const diffSecs = Math.floor(Math.max(diffMs, 0) / 1000);
        const h = Math.floor(diffSecs / 3600);
        const m = Math.floor((diffSecs % 3600) / 60);
        const s = diffSecs % 60;
        workedTime = [h > 0 && `${h}h`, (m > 0 || h > 0) && `${m}m`, `${s}s`].filter(Boolean).join(' ');
      }
      return [
        task.name || '',
        task.project || '',
        startTimeStr,
        endTimeStr,
        workedTime,
        task.isLog ? 'Past Log' : 'Active'
      ];
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Metric', 'Value'], ...summaryRows], [24, 24], 1, 'FFFFFF', '0052CC', reportTitle), 'Summary');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Name', 'Project', 'Start Time', 'End Time / Status', 'Worked Time', 'Type'], ...progressExcelRows], [30, 18, 18, 18, 14, 12], 1, 'FFFFFF', '6D28D9', reportTitle), 'Current Tasks');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Name', 'Project', 'Task Start Date', 'Task End Date', 'Completion Date', 'Total Worked Time'], ...completedRows], [26, 18, 18, 18, 16, 14], 1, 'FFFFFF', '10B981', reportTitle), 'Completed Tasks');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Name', 'Project', 'Started At', 'Last Updated'], ...pendingRows], [26, 18, 18, 18], 1, 'FFFFFF', '6366F1', reportTitle), 'Pending Tasks');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Name', 'Project', 'Due Date', 'Days Overdue'], ...overdueRows], [26, 18, 16, 14], 1, 'FFFFFF', 'F59E0B', reportTitle), 'Overdue Tasks');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Name', 'Project', 'Blocker Reason', 'Last Updated'], ...stuckRows], [26, 18, 24, 16], 1, 'FFFFFF', 'EF4444', reportTitle), 'Stuck Tasks');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Name', 'Project', 'Hold Reason', 'Paused Date'], ...holdRows], [26, 18, 24, 16], 1, 'FFFFFF', '8B5CF6', reportTitle), 'On Hold Tasks');

    // Add Project-Wise Hours Distribution sheet
    if (data.projectHours && data.projectHours.length > 0) {
      const projectHoursHeader = ['Project Name', 'My Role', 'Hours Contributed'];
      const projectHoursRows = data.projectHours.map(p => [
        p.name || '',
        p.role || '',
        `${p.hours || 0}h`
      ]);
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([projectHoursHeader, ...projectHoursRows], [24, 18, 18], 1, 'FFFFFF', '0D9488', reportTitle), 'Project Hours');
    }

    // Add Delegated Tasks sheet (if any delegated tasks exist)
    if (data.delegatedTasks && data.delegatedTasks.length > 0) {
      const delegatedHeader = ['Task Name', 'Assignee', 'Status', 'Project'];
      const delegatedRows = data.delegatedTasks.map(t => [
        t.name || '',
        t.assignee || '',
        t.status || '',
        t.project || ''
      ]);
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([delegatedHeader, ...delegatedRows], [26, 18, 14, 18], 1, 'FFFFFF', '4F46E5', reportTitle), 'Delegated Tasks');
    }

    // Add Full Task History sheet
    if (data.historyTasks && data.historyTasks.length > 0) {
      const historyHeader = ['Task Name', 'Project', 'Task Start Date', 'Task End Date', 'Completion Date', 'Total Worked Time'];
      const historyRows = data.historyTasks.map(task => [
        task.name || '',
        task.project || '',
        task.createdAt ? new Date(task.createdAt) : '',
        task.dueDate ? new Date(task.dueDate) : '',
        task.date ? new Date(task.date) : '',
        formatLoggedHours((task.timeLogs || []).reduce((sum, log) => sum + log.hours, 0))
      ]);
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([historyHeader, ...historyRows], [26, 18, 18, 18, 16, 14], 1, 'FFFFFF', '2563EB', reportTitle), 'Full Task History');
    }

    const fileName = `Personal_Report_${targetUser?.name?.replace(/\s+/g, '_') || 'User'}_${filterType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadWorkbook(workbook, fileName);
  };

  useEffect(() => {
    setTargetUser(null);
  }, [targetUserId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!targetUser) {
          setLoading(true);
        } else {
          setFilterLoading(true);
        }
        
        let displayUser = targetUser;
        if (!displayUser) {
          displayUser = currentUser;
          if (targetUserId && targetUserId !== currentUser.id) {
            try {
              const userRes = await api.get(`/auth/users/${targetUserId}`);
              displayUser = userRes.data;
            } catch (e) {
              console.error("Failed to fetch target user info", e);
            }
          }
          setTargetUser(displayUser);
        }

        const baseQuery = targetUserId ? `targetUserId=${targetUserId}` : 'personal=true';
        const projectQuery = activeProject?.id ? `projectId=${activeProject.id}` : '';
        const dateRange = getDateRange(filterType, customDate, customMonth);
        const dateQuery = `startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        const tzQuery = `tzOffset=${new Date().getTimezoneOffset()}`;
        const combinedQuery = [baseQuery, projectQuery, dateQuery, tzQuery].filter(Boolean).join('&');
        const query = combinedQuery ? `?${combinedQuery}` : '';
        
        const [dailyRes, weeklyRes, overdueRes, hoursRes, delegatedRes, historyRes] = await Promise.all([
          api.get(`/reports/daily${query}`),
          api.get(`/reports/weekly${query}`),
          api.get(`/reports/overdue${query}`),
          api.get(`/reports/hours${query}`),
          (displayUser.id === currentUser.id && displayUser.globalRole === 'TEAM_LEADER') 
            ? api.get(`/reports/delegated${query}`) 
            : Promise.resolve({ data: [] }),
          api.get(`/reports/history${query}`)
        ]);

        const dailyData = dailyRes.data;
        const weeklyData = weeklyRes.data.counts; 
        const completedTasks = weeklyRes.data.tasks;
        const overdueData = overdueRes.data;
        const hoursData = hoursRes.data; 
        const delegatedData = delegatedRes.data || [];
        const historyData = historyRes.data || [];

        const totalHours = parseFloat((hoursData.reduce((sum, p) => sum + (p.totalHours || 0), 0)).toFixed(2));
        const completedThisWeek = weeklyData.reduce((sum, d) => sum + d.count, 0);
        const pendingCount = dailyData.pending.length;
        
        const productivity = (completedThisWeek + pendingCount) > 0 
          ? Math.round((completedThisWeek / (completedThisWeek + pendingCount)) * 100) 
          : 0;

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const mappedWeekly = weeklyData.map(d => {
          const dateObj = new Date(d.date);
          const dayName = days[dateObj.getUTCDay()];
          const dayNum = dateObj.getUTCDate();
          return {
            day: weeklyData.length > 7 ? dayNum : dayName,
            count: d.count
          };
        });

        const mockActivity = dailyData.pending.slice(0, 3).map(t => ({
          time: new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: "Pending Action",
          task: `${t.taskKey} - ${t.title}`
        }));

        setData({
          performance: {
            totalHours,
            completedTasks: completedThisWeek,
            productivity
          },
          dailyStatus: {
            pending: pendingCount,
            stuck: dailyData.stuck.length,
            activity: mockActivity.length > 0 ? mockActivity : [
              { time: "Today", action: "No recent activity", task: "Start by picking a task!" }
            ]
          },
          weekly: mappedWeekly,
          overdue: overdueData.map(t => ({
            id: t.id,
            name: `${t.taskKey} - ${t.title}`,
            dueDate: t.dueDate,
            daysOverdue: t.daysOverdue,
            project: t.project?.name || ''
          })),
          completedTasks: completedTasks.map(t => ({
            id: t.id,
            name: `${t.taskKey} - ${t.title}`,
            date: t.updatedAt,
            startTime: t.startTime,
            endTime: t.endTime,
            project: t.project?.name || '',
            createdAt: t.createdAt,
            dueDate: t.dueDate,
            timeLogs: t.timeLogs || []
          })),
          stuckTasks: dailyData.stuck.map(t => ({
            id: t.id,
            name: `${t.taskKey} - ${t.title}`,
            reason: t.stuckReason || "Inactivity blocker",
            updatedAt: t.updatedAt,
            project: t.project?.name || ''
          })),
          holdTasks: dailyData.hold?.map(t => ({
            id: t.id,
            name: `${t.taskKey} - ${t.title}`,
            reason: t.holdReason || "Priority shift",
            updatedAt: t.updatedAt,
            project: t.project?.name || ''
          })) || [],
          pendingTasks: dailyData.pending.map(t => ({
            id: t.id,
            name: `${t.taskKey} - ${t.title}`,
            startTime: t.startTime,
            updatedAt: t.updatedAt,
            project: t.project?.name || ''
          })),
          projectHours: hoursData.map(p => ({
            name: p.name,
            role: displayUser?.globalRole?.replace('_', ' '),
            hours: p.totalHours
          })),
          delegatedTasks: delegatedData.map(t => ({
            id: t.id,
            name: `${t.taskKey} - ${t.title}`,
            assignee: t.assignee?.name || 'Unassigned',
            status: t.status,
            project: t.project?.name
          })),
          historyTasks: historyData.map(t => ({
            id: t.id,
            name: `${t.taskKey} - ${t.title}`,
            project: t.project?.name || '',
            createdAt: t.createdAt,
            dueDate: t.dueDate,
            date: t.updatedAt,
            timeLogs: t.timeLogs || []
          })),
          progressTasks: (dailyData.progress || []).flatMap(t => {
            const mainRow = {
              id: t.id,
              rowKey: `${t.id}-current`,
              taskKey: t.taskKey,
              name: `${t.taskKey} - ${t.title}`,
              title: t.title,
              startTime: t.startTime,
              updatedAt: t.updatedAt,
              project: t.project?.name || '',
              assigneeId: t.assigneeId,
              status: t.status,
              isLog: false
            };

            const rStart = new Date(dateRange.startDate);
            const rEnd = new Date(dateRange.endDate);

            const logRows = (t.timeLogs || [])
              .filter(log => {
                const logDate = new Date(log.loggedAt);
                return logDate >= rStart && logDate <= rEnd;
              })
              .map(log => {
                const endTime = new Date(log.loggedAt);
                const startTime = new Date(endTime.getTime() - log.hours * 60 * 60 * 1000);
                return {
                  id: t.id,
                  rowKey: `${t.id}-log-${log.id}`,
                  taskKey: t.taskKey,
                  name: `${t.taskKey} - ${t.title}`,
                  title: t.title,
                  startTime: startTime.toISOString(),
                  endTime: endTime.toISOString(),
                  totalHours: log.hours,
                  project: t.project?.name || '',
                  assigneeId: t.assigneeId,
                  status: t.status,
                  isLog: true,
                  loggedAt: log.loggedAt
                };
              });

            const rows = [...logRows];
            if (t.status === 'PROGRESS') {
              rows.unshift(mainRow);
            }
            return rows;
          })
        });

        setLoading(false);
        setFilterLoading(false);
      } catch (err) {
        console.error("Error fetching personal report data:", err);
        setLoading(false);
        setFilterLoading(false);
      }
    };

    fetchData();
  }, [currentUser, targetUserId, activeProject, filterType, customDate, customMonth, targetUser, refreshKey]);

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Loading report metrics...</div>
    </div>
  );

  return (
    <div className="report-page">
      {/* Premium Profile Header Bar */}
      <div className="report-header">
        {targetUser?.profilePic ? (
          <img 
            src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api${targetUser.profilePic}`} 
            alt={targetUser.name} 
            className="avatar"
          />
        ) : (
          <div className="avatar-placeholder">
            {getInitials(targetUser?.name)}
          </div>
        )}
        <div className="header-info">
          <h1>
            {targetUser?.name} 
            <span className="role-badge">
              {targetUser?.designation ? `${targetUser.designation} (${targetUser.globalRole?.replace('_', ' ')?.toLowerCase()})` : targetUser?.globalRole?.replace('_', ' ')}
            </span>
          </h1>
          <p>
            Joined Hopefly on {new Date(targetUser?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Date Filter Selector Bar */}
      <div className="report-filter-bar filter-selector-bar">
        <span className="filter-label">Period:</span>
        <div className="filter-group">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'custom', label: 'Pick Date' },
            { id: 'month', label: 'Pick Month' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilterType(opt.id)}
              className={`filter-btn${filterType === opt.id ? ' active' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {filterType === 'custom' && (
          <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="filter-date-input" />
        )}
        {filterType === 'month' && (
          <input type="month" value={customMonth} onChange={(e) => setCustomMonth(e.target.value)} className="filter-date-input" />
        )}
        
        <div className="filter-actions">
          <button onClick={handleDownloadReport} className="download-btn">
            📥 Download Report
          </button>
          <div className="active-range">
            {filterLoading && <div className="report-spinner" />}
            Active range: <strong>{activeRangeText}</strong>
          </div>
        </div>
      </div>

      <div style={{ opacity: filterLoading ? 0.65 : 1, transition: 'opacity 0.2s ease-in-out' }}>
        {/* Overview Cards Row */}
      <div className="report-metrics-grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))'}}>
        {/* Card 1: Hours Tracked */}
        <div className="report-metric-card accent-indigo">
          <div className="card-label">
            <span className="label-dot indigo"></span>
            Hours Tracked
          </div>
          <div className="big-value" style={{ color: 'var(--accent)' }}>{parseFloat(Number(data.performance.totalHours || 0).toFixed(2))}h</div>
          <div className="small-label">Total hours logged in selected period</div>
        </div>

        {/* Card 2: Completed Tasks */}
        <div className="report-metric-card accent-emerald">
          <div className="card-label">
            <span className="label-dot emerald"></span>
            Completed Tasks
          </div>
          <div className="big-value" style={{ color: 'var(--status-done)' }}>{data.performance.completedTasks}</div>
          <div className="small-label">Tasks marked as done</div>
        </div>

        {/* Card 3: Period Completion Trend */}
        <div className="report-metric-card accent-amber">
          <div className="card-label">
            <span className="label-dot amber"></span>
            Completion Trend
          </div>
          <div style={{ height: '100px', display: 'flex', alignItems: 'flex-end', gap: data.weekly.length > 15 ? '2px' : (data.weekly.length > 7 ? '3px' : '5px'), padding: '6px 0 0 0', marginTop: 'auto' }}>
            {data.weekly.map((day, i) => {
              const maxCount = Math.max(...data.weekly.map(d => d.count), 5);
              const heightPercent = Math.max((day.count / maxCount) * 100, 4);
              const showText = day.count > 0 || data.weekly.length <= 7;
              
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px', height: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', position: 'relative' }} title={`${day.count} tasks on ${day.day}`}>
                    {day.count > 0 && (
                      <div style={{ position: 'absolute', top: `calc(${100 - heightPercent}% - 20px)`, left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-dark)', opacity: 0, transition: 'opacity 0.2s', className: 'chart-val' }}>
                        {day.count}
                      </div>
                    )}
                    <div className={`report-chart-bar ${day.count > 0 ? 'has-data' : 'no-data'}`} style={{ width: '100%', height: `${heightPercent}%`, minWidth: '3px' }}></div>
                  </div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-light)', fontWeight: 600, height: '10px', whiteSpace: 'nowrap' }}>
                    {showText ? day.day : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 4: Issues Overview */}
        <div className="report-metric-card" style={{borderTop:'3px solid #ef4444'}}>
          <div className="card-label" style={{color:'#ef4444'}}>⚠️ Issues</div>
          <div className="member-status-grid" style={{gridTemplateColumns:'repeat(2, 1fr)',gap:'8px',marginBottom:0}}>
            <div className="member-status-item pending">
              <div className="member-status-val" style={{ color: 'var(--text-dark)' }}>{data.dailyStatus.pending}</div>
              <div className="member-status-lbl">Pending</div>
            </div>
            <div className="member-status-item overdue">
              <div className="member-status-val" style={{ color: '#ef4444' }}>{data.overdue.length}</div>
              <div className="member-status-lbl" style={{ color: '#ef4444' }}>Overdue</div>
            </div>
            <div className="member-status-item stuck">
              <div className="member-status-val" style={{ color: '#f59e0b' }}>{data.dailyStatus.stuck}</div>
              <div className="member-status-lbl" style={{ color: '#f59e0b' }}>Stuck</div>
            </div>
            <div className="member-status-item hold">
              <div className="member-status-val" style={{ color: 'var(--accent)' }}>{data.holdTasks.length}</div>
              <div className="member-status-lbl">On Hold</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tables Grid */}
      <div className="report-tables-stack">

        {/* Current Tasks Table */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-indigo">⚡</div>
              <h3 style={{ color: 'var(--accent)' }}>Current Tasks</h3>
            </div>
            <span className="count-badge badge-indigo">
              {data.progressTasks?.length || 0} Active
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Project</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Total Time</th>
                </tr>
              </thead>
              <tbody>
                {data.progressTasks?.map(task => {
                  const canToggle = currentUser.globalRole === 'ADMIN' || currentUser.globalRole === 'TEAM_LEADER' || task.assigneeId === currentUser.id;
                  const isRunning = task.status === 'PROGRESS';
                  
                  let startTimeStr = 'Paused';
                  let endTimeStr = 'Paused';
                  let totalTimeEl = <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.8rem' }}>Paused</span>;

                  if (task.isLog) {
                    startTimeStr = new Date(task.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                    endTimeStr = getRelativeTimeString(task.endTime);
                    totalTimeEl = <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{formatLoggedHours(task.totalHours)}</span>;
                  } else {
                    if (isRunning) {
                      startTimeStr = new Date(task.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                      endTimeStr = 'Running';
                      totalTimeEl = <LiveTimer startTime={task.startTime} />;
                    }
                  }

                  return (
                    <tr key={task.rowKey} style={{ background: task.isLog ? '#fafbff' : '#ffffff' }}>
                      <td data-label="Task Name" className="cell-bold">
                        {task.name}
                        {task.isLog && <span className="past-log-badge">Past Log</span>}
                      </td>
                      <td data-label="Project" className="cell-muted">{task.project}</td>
                      <td data-label="Start Time" className="cell-muted" style={{ fontSize: '0.8rem' }}>
                        {startTimeStr}
                      </td>
                      <td data-label="End Time" className="cell-muted" style={{ fontSize: '0.8rem' }}>
                        {endTimeStr === 'Running' ? (
                          <span className="running-indicator"><span className="pulse-dot"></span> Running</span>
                        ) : endTimeStr}
                      </td>
                      <td data-label="Total Time">
                        {totalTimeEl}
                      </td>
                    </tr>
                  );
                })}
                {(!data.progressTasks || data.progressTasks.length === 0) && (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>No tasks currently in progress.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* 1. Overdue Tasks Table */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-red">⏰</div>
              <h3 style={{ color: '#ef4444' }}>Overdue Tasks</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead><tr><th>Task Name</th><th>Due Date</th><th style={{ textAlign: 'right' }}>Days Overdue</th></tr></thead>
              <tbody>
                {data.overdue.map(task => (
                  <tr key={task.id}>
                    <td data-label="Task Name" className="cell-bold">{task.name}</td>
                    <td data-label="Due Date" className="cell-muted">{new Date(task.dueDate).toLocaleDateString()}</td>
                    <td data-label="Days Overdue" className="cell-danger" style={{ textAlign: 'right' }}>{task.daysOverdue} days</td>
                  </tr>
                ))}
                {data.overdue.length === 0 && (<tr><td colSpan="3" className="report-empty-state">No overdue tasks. Great job! 🎉</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Project-Wise Hours Table */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-indigo">⏱️</div>
              <h3 style={{ color: 'var(--text-dark)' }}>Project-Wise Hours</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead><tr><th>Project Name</th><th>My Role</th><th style={{ textAlign: 'right' }}>Hours Contributed</th></tr></thead>
              <tbody>
                {data.projectHours.map((project, i) => (
                  <tr key={i}>
                    <td data-label="Project Name" className="cell-bold">{project.name}</td>
                    <td data-label="My Role"><span className="status-pill pill-neutral">{project.role}</span></td>
                    <td data-label="Hours Contributed" className="cell-accent" style={{ textAlign: 'right' }}>{parseFloat(Number(project.hours || 0).toFixed(2))}h</td>
                  </tr>
                ))}
                {data.projectHours.length === 0 && (<tr><td colSpan="3" className="report-empty-state">No hours logged yet.</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Recently Completed Tasks Table */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-green">🎉</div>
              <h3 style={{ color: 'var(--status-done)' }}>Recently Completed Tasks</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead><tr><th>Task Name</th><th>Task Start Date</th><th>Task End Date</th><th>Completion Date</th><th style={{ textAlign: 'right' }}>Total Worked Time</th></tr></thead>
              <tbody>
                {data.completedTasks?.map(task => (
                  <tr key={task.id}>
                    <td data-label="Task Name" className="cell-bold">{task.name}</td>
                    <td data-label="Task Start Date" className="cell-muted" style={{ fontSize: '0.8rem' }}>
                      {task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'N/A'}
                    </td>
                    <td data-label="Task End Date" className="cell-muted" style={{ fontSize: '0.8rem' }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'No Due Date'}
                    </td>
                    <td data-label="Completion Date" className="cell-muted">{new Date(task.date).toLocaleDateString()}</td>
                    <td data-label="Total Worked Time" className="cell-success" style={{ textAlign: 'right' }}>
                      {formatLoggedHours((task.timeLogs || []).reduce((sum, log) => sum + log.hours, 0))}
                    </td>
                  </tr>
                ))}
                {(!data.completedTasks || data.completedTasks.length === 0) && (<tr><td colSpan="5" className="report-empty-state">No tasks completed recently.</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Stuck Tasks & Blockers Table */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-red">⚠️</div>
              <h3 style={{ color: '#ef4444' }}>Stuck Tasks & Blockers</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead><tr><th>Task Name</th><th>Stuck Reason</th><th style={{ textAlign: 'right' }}>Last Updated</th></tr></thead>
              <tbody>
                {data.stuckTasks?.map(task => (
                  <tr key={task.id}>
                    <td data-label="Task Name" className="cell-bold">{task.name}</td>
                    <td data-label="Stuck Reason"><span className="status-pill pill-red">{task.reason}</span></td>
                    <td data-label="Last Updated" className="cell-muted" style={{ textAlign: 'right' }}>{new Date(task.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!data.stuckTasks || data.stuckTasks.length === 0) && (<tr><td colSpan="3" className="report-empty-state">No stuck tasks currently. 🚀</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Tasks on Hold Table */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-amber">⏸️</div>
              <h3 style={{ color: '#f59e0b' }}>Tasks on Hold</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead><tr><th>Task Name</th><th>Hold Reason</th><th style={{ textAlign: 'right' }}>Date Paused</th></tr></thead>
              <tbody>
                {data.holdTasks?.map(task => (
                  <tr key={task.id}>
                    <td data-label="Task Name" className="cell-bold">{task.name}</td>
                    <td data-label="Hold Reason"><span className="status-pill pill-amber">{task.reason}</span></td>
                    <td data-label="Date Paused" className="cell-muted" style={{ textAlign: 'right' }}>{new Date(task.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!data.holdTasks || data.holdTasks.length === 0) && (<tr><td colSpan="3" className="report-empty-state">No tasks currently on hold.</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Delegated Tasks (Only for Team Leader's own report) */}
        {targetUser?.id === currentUser?.id && currentUser?.globalRole === 'TEAM_LEADER' && (
          <div className="report-table-section">
            <div className="table-header">
              <div className="header-left">
                <div className="header-icon icon-purple">👥</div>
                <h3 style={{ color: 'var(--accent)' }}>Tasks Created & Delegated by Me</h3>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="responsive-table report-table">
                <thead><tr><th>Task Name</th><th>Project</th><th>Assigned To</th><th style={{ textAlign: 'right' }}>Status</th></tr></thead>
                <tbody>
                  {data.delegatedTasks?.map(task => (
                    <tr key={task.id}>
                      <td data-label="Task Name" className="cell-bold">{task.name}</td>
                      <td data-label="Project" className="cell-muted">{task.project}</td>
                      <td data-label="Assigned To" className="cell-accent">{task.assignee}</td>
                      <td data-label="Status" style={{ textAlign: 'right' }}>
                        <span className={`status-pill ${task.status === 'DONE' ? 'pill-green' : task.status === 'STUCK' ? 'pill-red' : 'pill-neutral'}`}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data.delegatedTasks || data.delegatedTasks.length === 0) && (<tr><td colSpan="4" className="report-empty-state">You haven't assigned any tasks to your team yet.</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. Full Task History Table */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-indigo">📜</div>
              <h3 style={{ color: 'var(--accent)' }}>Full Task History (All Completed Tasks)</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead><tr><th>Task Name</th><th>Task Start Date</th><th>Task End Date</th><th>Completion Date</th><th style={{ textAlign: 'right' }}>Total Worked Time</th></tr></thead>
              <tbody>
                {data.historyTasks?.map(task => (
                  <tr key={task.id}>
                    <td data-label="Task Name" className="cell-bold">{task.name}</td>
                    <td data-label="Task Start Date" className="cell-muted" style={{ fontSize: '0.8rem' }}>
                      {task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'N/A'}
                    </td>
                    <td data-label="Task End Date" className="cell-muted" style={{ fontSize: '0.8rem' }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'No Due Date'}
                    </td>
                    <td data-label="Completion Date" className="cell-muted">{new Date(task.date).toLocaleDateString()}</td>
                    <td data-label="Total Worked Time" className="cell-success" style={{ textAlign: 'right' }}>
                      {formatLoggedHours((task.timeLogs || []).reduce((sum, log) => sum + log.hours, 0))}
                    </td>
                  </tr>
                ))}
                {(!data.historyTasks || data.historyTasks.length === 0) && (<tr><td colSpan="5" className="report-empty-state">No completed tasks in history yet.</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default MemberReportPage;

