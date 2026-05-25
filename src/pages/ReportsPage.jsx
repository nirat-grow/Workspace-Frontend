import React, { useState, useEffect } from 'react';
import * as StandardXLSX from 'xlsx';
import api from '../api/axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

const ReportsPage = ({ activeProject }) => {
  const [daily, setDaily] = useState({ pending: [], stuck: [], hold: [], progress: [] });
  const [weekly, setWeekly] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [hours, setHours] = useState([]);
  const [projectTeam, setProjectTeam] = useState([]);
  const [historyTasks, setHistoryTasks] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const leaderId = searchParams.get('leaderId');
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

  useEffect(() => {
    const projectId = activeProject?.id;
    const dateRange = getDateRange(filterType, customDate, customMonth);
    const dateQuery = `startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
    const baseQuery = projectId ? `projectId=${projectId}` : '';
    const leaderQuery = leaderId ? `leaderId=${leaderId}` : '';
    const tzQuery = `tzOffset=${new Date().getTimezoneOffset()}`;
    const combinedQuery = [baseQuery, leaderQuery, dateQuery, tzQuery].filter(Boolean).join('&');
    const query = combinedQuery ? `?${combinedQuery}` : '';

    api.get(`/reports/daily${query}`).then(res => setDaily(res.data)).catch(console.error);
    api.get(`/reports/weekly${query}`).then(res => {
      setWeekly(res.data.counts);
      setCompletedTasks(res.data.tasks);
    }).catch(console.error);
    api.get(`/reports/overdue${query}`).then(res => setOverdue(res.data)).catch(console.error);
    api.get(`/reports/hours${query}`).then(res => setHours(res.data)).catch(console.error);
    api.get(`/reports/history${query}`).then(res => setHistoryTasks(res.data)).catch(console.error);

    if (projectId) {
      api.get(`/reports/project-team${query}`).then(res => setProjectTeam(res.data.members)).catch(console.error);
    } else {
      setProjectTeam([]);
    }
  }, [activeProject, leaderId, filterType, customDate, customMonth, refreshKey]);

  const totalHours = parseFloat((hours.reduce((sum, p) => sum + p.totalHours, 0)).toFixed(2));
  const totalCompleted = weekly.reduce((sum, d) => sum + d.count, 0);
  const activeRangeText = getFriendlyDateRangeText(filterType, customDate, customMonth);

  const dateRangeObj = getDateRange(filterType, customDate, customMonth);
  const rStart = new Date(dateRangeObj.startDate);
  const rEnd = new Date(dateRangeObj.endDate);

  const progressTasks = (daily.progress || []).flatMap(t => {
    const mainRow = {
      id: t.id,
      rowKey: `${t.id}-current`,
      taskKey: t.taskKey,
      title: t.title,
      startTime: t.startTime,
      updatedAt: t.updatedAt,
      project: t.project,
      assignee: t.assignee,
      assigneeId: t.assigneeId,
      status: t.status,
      isLog: false
    };

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
          title: t.title,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          totalHours: log.hours,
          project: t.project,
          assignee: t.assignee,
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
  });

  const handleDownloadReport = () => {
    const title = leaderId ? 'Squad Performance Report' : (activeProject ? `${activeProject.name} - Reports` : 'Global Reports');
    
    const summaryRows = [
      ['Report Type', leaderId ? 'Squad' : 'Overall'],
      ['Selected Range', activeRangeText],
      ['Generated At', new Date()],
      [''],
      ['Hours Tracked', `${totalHours}h`],
      ['Completed Tasks', totalCompleted],
      ['Free / Idle Members', daily.freeMembers?.length || 0],
      ['Pending Tasks', daily.pending?.length || 0],
      ['Overdue Tasks', overdue.length],
      ['Stuck Tasks', daily.stuck?.length || 0],
      ['On Hold Tasks', daily.hold?.length || 0]
    ];

    const completedRows = completedTasks.map(task => {
      const totalHours = (task.timeLogs || []).reduce((sum, log) => sum + log.hours, 0);
      return [
        task.taskKey || '',
        task.title || '',
        task.project?.name || '',
        task.assignee ? `${task.assignee.name}${task.assignee.designation ? ` (${task.assignee.designation})` : ''}` : 'Unassigned',
        task.createdAt ? new Date(task.createdAt) : '',
        task.dueDate ? new Date(task.dueDate) : '',
        task.updatedAt ? new Date(task.updatedAt) : '',
        formatLoggedHours(totalHours)
      ];
    });

    const pendingRows = (daily.pending || []).map(task => [
      task.taskKey || '',
      task.title || '',
      task.project?.name || '',
      task.assignee ? `${task.assignee.name}${task.assignee.designation ? ` (${task.assignee.designation})` : ''}` : 'Unassigned',
      task.startTime ? new Date(task.startTime) : '',
      task.updatedAt ? new Date(task.updatedAt) : ''
    ]);

    const overdueRows = overdue.map(task => [
      task.taskKey || '',
      task.title || '',
      task.project?.name || '',
      task.assignee ? `${task.assignee.name}${task.assignee.designation ? ` (${task.assignee.designation})` : ''}` : 'Unassigned',
      task.dueDate ? new Date(task.dueDate) : '',
      task.daysOverdue || 0
    ]);

    const stuckRows = (daily.stuck || []).map(task => [
      task.taskKey || '',
      task.title || '',
      task.project?.name || '',
      task.assignee ? `${task.assignee.name}${task.assignee.designation ? ` (${task.assignee.designation})` : ''}` : 'Unassigned',
      task.stuckReason || 'No reason provided',
      task.updatedAt ? new Date(task.updatedAt) : ''
    ]);

    const holdRows = (daily.hold || []).map(task => [
      task.taskKey || '',
      task.title || '',
      task.project?.name || '',
      task.assignee ? `${task.assignee.name}${task.assignee.designation ? ` (${task.assignee.designation})` : ''}` : 'Unassigned',
      task.holdReason || 'Priority Shift',
      task.updatedAt ? new Date(task.updatedAt) : ''
    ]);

    // Build Current Tasks (Progress Tasks) rows for Excel
    const progressExcelRows = progressTasks.map(task => {
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
        const diffSecs = Math.floor(diffMs / 1000);
        const h = Math.floor(diffSecs / 3600);
        const m = Math.floor((diffSecs % 3600) / 60);
        const s = diffSecs % 60;
        workedTime = [h > 0 && `${h}h`, (m > 0 || h > 0) && `${m}m`, `${s}s`].filter(Boolean).join(' ');
      }
      return [
        task.taskKey || '',
        task.title || '',
        task.project?.name || '',
        task.assignee ? `${task.assignee.name}${task.assignee.designation ? ` (${task.assignee.designation})` : ''}` : 'Unassigned',
        startTimeStr,
        endTimeStr,
        workedTime,
        task.isLog ? 'Past Log' : 'Active'
      ];
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Metric', 'Value'], ...summaryRows], [24, 24], 1, 'FFFFFF', '0052CC', title), 'Summary');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Key', 'Title', 'Project', 'Assignee', 'Start Time', 'End Time / Status', 'Worked Time', 'Type'], ...progressExcelRows], [14, 30, 18, 28, 18, 18, 14, 12], 1, 'FFFFFF', '6D28D9', title), 'Current Tasks');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Key', 'Title', 'Project', 'Assignee', 'Task Start Date', 'Task End Date', 'Completed At', 'Total Worked Time'], ...completedRows], [14, 30, 18, 28, 18, 18, 18, 14], 1, 'FFFFFF', '10B981', title), 'Completed Tasks');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Key', 'Title', 'Project', 'Assignee', 'Started At', 'Last Updated'], ...pendingRows], [14, 30, 18, 28, 18, 18], 1, 'FFFFFF', '6366F1', title), 'Pending Tasks');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Key', 'Title', 'Project', 'Assignee', 'Due Date', 'Days Overdue'], ...overdueRows], [14, 30, 18, 28, 16, 14], 1, 'FFFFFF', 'F59E0B', title), 'Overdue Tasks');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Key', 'Title', 'Project', 'Assignee', 'Blocker Reason', 'Last Updated'], ...stuckRows], [14, 30, 18, 28, 24, 16], 1, 'FFFFFF', 'EF4444', title), 'Stuck Tasks');
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Key', 'Title', 'Project', 'Assignee', 'Hold Reason', 'Paused Date'], ...holdRows], [14, 30, 18, 28, 24, 16], 1, 'FFFFFF', '8B5CF6', title), 'On Hold Tasks');

    // Add Free Members sheet (if daily.freeMembers exists)
    if (daily.freeMembers && daily.freeMembers.length > 0) {
      const freeHeader = ['Member Name', 'Role', 'Designation', 'Status'];
      const freeRows = daily.freeMembers.map(m => [
        m.name || '',
        m.globalRole?.replace('_', ' ') || '',
        m.designation || 'N/A',
        'Available'
      ]);
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([freeHeader, ...freeRows], [24, 18, 24, 14], 1, 'FFFFFF', '10B981', title), 'Free Members');
    }

    // Add Team Performance sheet (if activeProject is selected and we have team members)
    if (projectTeam && projectTeam.length > 0) {
      const teamHeader = [(user?.globalRole === 'ADMIN' && !leaderId) ? 'Squad / Lead' : 'Team Member', 'Designation', 'Tasks', 'Completed Tasks', 'Completion %', 'Total Hours'];
      const teamRows = projectTeam.map(m => [
        m.name || '',
        m.designation || 'General',
        m.taskCount || 0,
        m.completedTasks || 0,
        `${Math.round((m.completedTasks / (m.taskCount || 1)) * 100)}%`,
        `${m.totalHours ? parseFloat(Number(m.totalHours).toFixed(2)) : 0}h`
      ]);
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([teamHeader, ...teamRows], [24, 18, 10, 16, 14, 14], 1, 'FFFFFF', '4F46E5', title), 'Team Performance');
    }

    // Add Project-Wise Hours Distribution sheet
    if (hours && hours.length > 0) {
      const hoursHeader = ['Project', 'Active Members', 'Total Logged Hours'];
      const hoursRows = hours.map(p => [
        p.name || '',
        `${p.memberCount || 0} people`,
        `${p.totalHours ? parseFloat(Number(p.totalHours).toFixed(2)) : 0}h`
      ]);
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([hoursHeader, ...hoursRows], [24, 18, 18], 1, 'FFFFFF', '0D9488', title), 'Project Hours');
    }

    // Add Full Task History sheet
    if (historyTasks && historyTasks.length > 0) {
      const historyHeader = ['Task Key', 'Title', 'Project', 'Assignee', 'Started At', 'Finished At', 'Total Worked'];
      const historyRows = historyTasks.map(t => [
        t.taskKey || '',
        t.title || '',
        t.project?.name || '',
        t.assignee ? `${t.assignee.name}${t.assignee.designation ? ` (${t.assignee.designation})` : ''}` : 'Unassigned',
        t.startTime ? new Date(t.startTime).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
        t.endTime ? new Date(t.endTime).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A',
        formatDuration(t.startTime, t.endTime)
      ]);
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([historyHeader, ...historyRows], [14, 30, 18, 20, 18, 18, 14], 1, 'FFFFFF', '2563EB', title), 'Full Task History');
    }

    const fileName = `Report_${filterType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadWorkbook(workbook, fileName);
  };

  return (
    <div className="report-page">
      {/* Top Header Section */}
      <div className="report-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>
            {leaderId ? 'Squad Performance Report' : (activeProject ? `${activeProject.name} - Reports` : 'Global Reports')}
          </h1>
          {leaderId ? (
            <p>
              Showing combined analytics for the selected squad in {activeProject?.name}
            </p>
          ) : (
            <p>
              Audit tasks, completion metrics, and resource logging details.
            </p>
          )}
        </div>
        {leaderId && (
          <button
            className="btn"
            onClick={() => navigate(-1)}
            style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              color: 'var(--text-dark)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
          >
            ← Back to Squad
          </button>
        )}
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
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="filter-date-input"
          />
        )}

        {filterType === 'month' && (
          <input
            type="month"
            value={customMonth}
            onChange={(e) => setCustomMonth(e.target.value)}
            className="filter-date-input"
          />
        )}

        <div className="filter-actions">
          <button onClick={handleDownloadReport} className="download-btn">
            📥 Download Report
          </button>
          <div className="active-range">
            Active range: <strong>{activeRangeText}</strong>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="report-metrics-grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))'}}>
        {/* Card 1: Hours Tracked */}
        <div className="report-metric-card accent-indigo">
          <div className="card-label">
            <span className="label-dot indigo"></span>
            Hours Tracked
          </div>
          <div className="big-value" style={{ color: 'var(--accent)' }}>{parseFloat(Number(totalHours || 0).toFixed(2))}h</div>
          <div className="small-label">Total hours logged in selected period</div>
        </div>

        {/* Card 2: Completed Tasks */}
        <div className="report-metric-card accent-emerald">
          <div className="card-label">
            <span className="label-dot emerald"></span>
            Completed Tasks
          </div>
          <div className="big-value" style={{ color: 'var(--status-done)' }}>{totalCompleted}</div>
          <div className="small-label">Tasks marked as done</div>
        </div>

        {/* Card 3: Period Completion Trend */}
        <div className="report-metric-card accent-amber">
          <div className="card-label">
            <span className="label-dot amber"></span>
            Completion Trend
          </div>
          <div style={{ height: '100px', display: 'flex', alignItems: 'flex-end', gap: weekly.length > 15 ? '2px' : (weekly.length > 7 ? '3px' : '5px'), padding: '6px 0 0 0', marginTop: 'auto' }}>
            {weekly.map((day, i) => {
              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const dateObj = new Date(day.date);
              const label = weekly.length > 7 ? dateObj.getUTCDate() : days[dateObj.getUTCDay()];
              const maxCount = Math.max(...weekly.map(d => d.count), 1);
              const heightPercent = Math.max((day.count / maxCount) * 100, 4);
              const showLabel = weekly.length <= 10 || (i % Math.ceil(weekly.length / 5) === 0);
              
              return (
                <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px', height: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }} title={`${day.count} tasks on ${day.date}`}>
                    <div className={`report-chart-bar ${day.count > 0 ? 'has-data' : 'no-data'}`} style={{ width: '100%', height: `${heightPercent}%`, minWidth: '3px' }}></div>
                  </div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-light)', fontWeight: 600, height: '10px', whiteSpace: 'nowrap' }}>
                    {showLabel ? label : ''}
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
              <div className="member-status-val" style={{ color: 'var(--text-dark)' }}>{daily.pending?.length || 0}</div>
              <div className="member-status-lbl">Pending</div>
            </div>
            <div className="member-status-item overdue">
              <div className="member-status-val" style={{ color: '#ef4444' }}>{overdue.length}</div>
              <div className="member-status-lbl" style={{ color: '#ef4444' }}>Overdue</div>
            </div>
            <div className="member-status-item stuck">
              <div className="member-status-val" style={{ color: '#f59e0b' }}>{daily.stuck?.length || 0}</div>
              <div className="member-status-lbl" style={{ color: '#f59e0b' }}>Stuck</div>
            </div>
            <div className="member-status-item hold">
              <div className="member-status-val" style={{ color: 'var(--accent)' }}>{daily.hold?.length || 0}</div>
              <div className="member-status-lbl">On Hold</div>
            </div>
          </div>
        </div>
      </div>
      <div className="report-tables-stack">
        {/* Current Tasks Table */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-indigo">⚡</div>
              <h3 style={{ color: 'var(--accent)' }}>Current Tasks</h3>
            </div>
            <span className="count-badge badge-indigo">
              {progressTasks.length} Active
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Project</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Worked Time</th>
                </tr>
              </thead>
              <tbody>
                {progressTasks.map(task => {
                  const canToggle = user?.globalRole === 'ADMIN' || user?.globalRole === 'TEAM_LEADER' || task.assigneeId === user?.id;
                  const isRunning = task.status === 'PROGRESS' && !task.isLog;

                  let startTimeStr = 'Paused';
                  let endTimeStr = 'Paused';
                  let workedTimeEl = <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.8rem' }}>Paused</span>;

                  if (task.isLog) {
                    startTimeStr = new Date(task.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                    endTimeStr = getRelativeTimeString(task.endTime);
                    workedTimeEl = <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{formatLoggedHours(task.totalHours)}</span>;
                  } else {
                    if (isRunning) {
                      startTimeStr = new Date(task.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                      endTimeStr = 'Running';
                      workedTimeEl = <LiveTimer startTime={task.startTime} />;
                    }
                  }

                  return (
                    <tr key={task.rowKey} style={{ background: task.isLog ? '#fafbff' : '#ffffff' }}>
                      <td data-label="Task" className="cell-bold">
                        <span style={{ color: 'var(--text-light)', marginRight: '6px', fontWeight: '500' }}>{task.taskKey}</span>
                        {task.title}
                        {task.isLog && <span className="past-log-badge" style={{ marginLeft: '8px' }}>Past Log</span>}
                      </td>
                      <td data-label="Assignee">
                        <div>
                          <div className="cell-bold">{task.assignee?.name || 'Unassigned'}</div>
                          {task.assignee?.designation && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{task.assignee.designation}</div>
                          )}
                        </div>
                      </td>
                      <td data-label="Project" className="cell-muted">{task.project?.name || 'N/A'}</td>
                      <td data-label="Start Time" className="cell-muted" style={{ fontSize: '0.8rem' }}>{startTimeStr}</td>
                      <td data-label="End Time" className="cell-muted" style={{ fontSize: '0.8rem' }}>
                        {endTimeStr === 'Running' ? (
                          <span className="running-indicator"><span className="pulse-dot"></span> Running</span>
                        ) : endTimeStr}
                      </td>
                      <td data-label="Worked Time">{workedTimeEl}</td>
                    </tr>
                  );
                })}
                {(!progressTasks || progressTasks.length === 0) && (
                  <tr>
                    <td colSpan="6" className="report-empty-state">
                      No tasks currently in progress.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Free Team Members Table */}
        {(daily.freeMembers?.length > 0) && (
          <div className="report-table-section">
            <div className="table-header">
              <div className="header-left">
                <div className="header-icon icon-green" style={{background: 'rgba(16,185,129,0.1)'}}>☕</div>
                <h3 style={{ color: 'var(--status-done)' }}>Idle / Free Team Members</h3>
              </div>
              <span className="count-badge badge-green">{daily.freeMembers.length} Free</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="responsive-table report-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Designation</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.freeMembers.map(member => (
                    <tr key={member.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/member-report/${member.id}`)}>
                      <td data-label="Member">
                        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                          {member.profilePic ? (
                            <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api${member.profilePic}`} alt={member.name} style={{width:'30px',height:'30px',borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(16,185,129,0.1)'}} />
                          ) : (
                            <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.08))',color:'var(--status-done)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:700}}>
                              {member.name?.split(' ').map(n=>n[0]).join('').toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="cell-bold">{member.name}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Role">
                        <span className={`status-pill ${member.globalRole==='ADMIN'?'pill-red':member.globalRole==='TEAM_LEADER'?'pill-green':'pill-neutral'}`}>{member.globalRole?.replace('_',' ')}</span>
                      </td>
                      <td data-label="Designation" className="cell-muted">{member.designation || 'N/A'}</td>
                      <td data-label="Status">
                        <span className="status-pill pill-green" style={{background: 'rgba(16,185,129,0.1)', color: '#059669', borderColor: 'rgba(16,185,129,0.2)'}}>
                          Available
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 1. Overdue Tasks */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-red">⏰</div>
              <h3 style={{ color: '#ef4444' }}>Overdue Tasks</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'right' }}>Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map(t => (
                  <tr key={t.id}>
                    <td data-label="Task" className="cell-bold">
                      <span style={{ color: 'var(--text-light)', marginRight: '6px', fontWeight: '500' }}>{t.taskKey}</span>
                      {t.title}
                    </td>
                    <td data-label="Assignee">
                      <span className="status-pill pill-neutral">
                        {t.assignee?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td data-label="Due Date" className="cell-muted">
                      {new Date(t.dueDate).toLocaleDateString()}
                    </td>
                    <td data-label="Days Overdue" className="cell-danger" style={{ textAlign: 'right' }}>
                      {t.daysOverdue} days
                    </td>
                  </tr>
                ))}
                {overdue.length === 0 && (
                  <tr>
                    <td colSpan="4" className="report-empty-state">
                      No overdue tasks found. Everything is on schedule! 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Recently Completed Tasks */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-green">✅</div>
              <h3 style={{ color: 'var(--status-done)' }}>Recently Completed Tasks (Last 7 Days)</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Task Start Date</th>
                  <th>Task End Date</th>
                  <th>Completion Date</th>
                  <th style={{ textAlign: 'right' }}>Total Worked Time</th>
                </tr>
              </thead>
              <tbody>
                {completedTasks.map(t => (
                  <tr key={t.id}>
                    <td data-label="Task" className="cell-bold">
                      <span style={{ color: 'var(--text-light)', marginRight: '6px', fontWeight: '500' }}>{t.taskKey}</span>
                      {t.title}
                    </td>
                    <td data-label="Assignee">
                      <span className="status-pill pill-neutral">
                        {t.assignee ? `${t.assignee.name}${t.assignee.designation ? ` (${t.assignee.designation})` : ''}` : 'Unassigned'}
                      </span>
                    </td>
                    <td data-label="Task Start Date" className="cell-muted" style={{ fontSize: '0.8rem' }}>
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'N/A'}
                    </td>
                    <td data-label="Task End Date" className="cell-muted" style={{ fontSize: '0.8rem' }}>
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'No Due Date'}
                    </td>
                    <td data-label="Completion Date" className="cell-muted">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </td>
                    <td data-label="Total Worked Time" className="cell-success" style={{ textAlign: 'right' }}>
                      {formatLoggedHours((t.timeLogs || []).reduce((sum, log) => sum + log.hours, 0))}
                    </td>
                  </tr>
                ))}
                {completedTasks.length === 0 && (
                  <tr>
                    <td colSpan="6" className="report-empty-state">
                      No tasks completed in the last 7 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Stuck Tasks & Blockers */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-red">🛑</div>
              <h3 style={{ color: '#ef4444' }}>Stuck Tasks & Blockers</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Blocker Reason</th>
                  <th style={{ textAlign: 'right' }}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {daily.stuck.map(t => (
                  <tr key={t.id}>
                    <td data-label="Task" className="cell-bold">
                      <span style={{ color: 'var(--text-light)', marginRight: '6px', fontWeight: '500' }}>{t.taskKey}</span>
                      {t.title}
                    </td>
                    <td data-label="Assignee" className="cell-bold">
                      {t.assignee?.name || 'Unassigned'}
                    </td>
                    <td data-label="Blocker Reason">
                      <span className="status-pill pill-red">
                        {t.stuckReason || 'No reason provided'}
                      </span>
                    </td>
                    <td data-label="Last Updated" className="cell-muted" style={{ textAlign: 'right' }}>
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {daily.stuck.length === 0 && (
                  <tr>
                    <td colSpan="4" className="report-empty-state">
                      No stuck tasks currently! 🚀
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Tasks on Hold */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-amber">⏸️</div>
              <h3 style={{ color: '#f59e0b' }}>Tasks on Hold</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Hold Reason</th>
                  <th style={{ textAlign: 'right' }}>Paused Date</th>
                </tr>
              </thead>
              <tbody>
                {daily.hold?.map(t => (
                  <tr key={t.id}>
                    <td data-label="Task" className="cell-bold">
                      <span style={{ color: 'var(--text-light)', marginRight: '6px', fontWeight: '500' }}>{t.taskKey}</span>
                      {t.title}
                    </td>
                    <td data-label="Assignee" className="cell-bold">
                      {t.assignee?.name || 'Unassigned'}
                    </td>
                    <td data-label="Hold Reason">
                      <span className="status-pill pill-amber">
                        {t.holdReason || 'Priority Shift'}
                      </span>
                    </td>
                    <td data-label="Paused Date" className="cell-muted" style={{ textAlign: 'right' }}>
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(daily.hold?.length === 0 || !daily.hold) && (
                  <tr>
                    <td colSpan="4" className="report-empty-state">
                      No tasks on hold.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Project Team Performance Table */}
        {activeProject && (
          <div className="report-table-section">
            <div className="table-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <div className="header-left">
                <div className="header-icon icon-purple">👥</div>
                <h3 style={{ color: 'var(--text-dark)' }}>Project Team Performance: {activeProject.name}</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '4px 0 0 0', paddingLeft: '46px' }}>
                Click on a team member to view their customized performance cards.
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="responsive-table report-table">
                <thead>
                  <tr>
                    <th>{(user.globalRole === 'ADMIN' && !leaderId) ? 'Squad / Lead' : 'Team Member'}</th>
                    <th>Designation</th>
                    <th>{(user.globalRole === 'ADMIN' && !leaderId) ? 'Squad Tasks' : 'Tasks'}</th>
                    <th>{(user.globalRole === 'ADMIN' && !leaderId) ? 'Squad Completion' : 'Completion'}</th>
                    <th style={{ textAlign: 'right' }}>Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {projectTeam.map(m => (
                    <tr
                      key={m.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (m.isAggregated) {
                          navigate(`/squad-details/${m.id}`);
                        } else {
                          navigate(`/member-report/${m.id}`);
                        }
                      }}
                    >
                      <td data-label={(user.globalRole === 'ADMIN' && !leaderId) ? 'Squad / Lead' : 'Team Member'} className="cell-bold" style={{ color: m.isAggregated ? 'var(--accent)' : 'var(--text-dark)' }}>
                        <div>{m.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px', fontWeight: '400' }}>{m.isAggregated ? `Squad of ${m.memberCount}` : m.role}</div>
                      </td>
                      <td data-label="Designation">
                        <span className={`status-pill ${m.isAggregated ? 'pill-green' : 'pill-indigo'}`}>
                          {m.designation || 'General'}
                        </span>
                      </td>
                      <td data-label={(user.globalRole === 'ADMIN' && !leaderId) ? 'Squad Tasks' : 'Tasks'} className="cell-bold">
                        {m.taskCount}
                      </td>
                      <td data-label={(user.globalRole === 'ADMIN' && !leaderId) ? 'Squad Completion' : 'Completion'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, minWidth: '80px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(m.completedTasks / (m.taskCount || 1)) * 100}%`, background: 'var(--status-done)', borderRadius: '3px' }}></div>
                          </div>
                          <span className="cell-bold">{Math.round((m.completedTasks / (m.taskCount || 1)) * 100)}%</span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>{m.completedTasks}/{m.taskCount} done</div>
                      </td>
                      <td data-label="Total Hours" className="cell-accent" style={{ textAlign: 'right' }}>
                        {parseFloat(Number(m.totalHours || 0).toFixed(2))}h
                      </td>
                    </tr>
                  ))}
                  {projectTeam.length === 0 && (
                    <tr>
                      <td colSpan="5" className="report-empty-state">
                        No team members found for this project.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Project-Wise Hours Distribution */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-indigo">⏱️</div>
              <h3 style={{ color: 'var(--text-dark)' }}>Project-Wise Hours Distribution</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Active Members</th>
                  <th style={{ textAlign: 'right' }}>Total Logged Hours</th>
                </tr>
              </thead>
              <tbody>
                {hours.map(p => (
                  <tr key={p.id}>
                    <td data-label="Project" className="cell-bold">{p.name}</td>
                    <td data-label="Active Members" className="cell-muted">{p.memberCount} people</td>
                    <td data-label="Total Logged Hours" className="cell-accent" style={{ textAlign: 'right' }}>{parseFloat(Number(p.totalHours || 0).toFixed(2))}h</td>
                  </tr>
                ))}
                {hours.length === 0 && (
                  <tr>
                    <td colSpan="3" className="report-empty-state">No hours logged yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. Full Task History */}
        <div className="report-table-section">
          <div className="table-header">
            <div className="header-left">
              <div className="header-icon icon-indigo">📜</div>
              <h3 style={{ color: 'var(--accent)' }}>Full Task History (All Completed Tasks)</h3>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table report-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assignee</th>
                  <th>Started At</th>
                  <th>Finished At</th>
                  <th style={{ textAlign: 'right' }}>Total Worked</th>
                </tr>
              </thead>
              <tbody>
                {historyTasks.map(t => (
                  <tr key={t.id}>
                    <td data-label="Task" className="cell-bold">
                      <span style={{ color: 'var(--text-light)', marginRight: '6px', fontWeight: '500' }}>{t.taskKey}</span>
                      {t.title}
                    </td>
                    <td data-label="Project" className="cell-muted">{t.project?.name}</td>
                    <td data-label="Assignee">
                      <span className="status-pill pill-neutral">
                        {t.assignee ? `${t.assignee.name}${t.assignee.designation ? ` (${t.assignee.designation})` : ''}` : 'Unassigned'}
                      </span>
                    </td>
                    <td data-label="Started At" className="cell-muted" style={{ fontSize: '0.8rem' }}>
                      {t.startTime ? new Date(t.startTime).toLocaleString() : 'N/A'}
                    </td>
                    <td data-label="Finished At" className="cell-muted" style={{ fontSize: '0.8rem' }}>
                      {t.endTime ? new Date(t.endTime).toLocaleString() : 'N/A'}
                    </td>
                    <td data-label="Total Worked" className="cell-success" style={{ textAlign: 'right' }}>
                      {formatDuration(t.startTime, t.endTime)}
                    </td>
                  </tr>
                ))}
                {historyTasks.length === 0 && (
                  <tr>
                    <td colSpan="6" className="report-empty-state">
                      No completed tasks in history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
