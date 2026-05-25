import React, { useState, useEffect } from 'react';
import * as StandardXLSX from 'xlsx';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const XLSX = window.XLSX || StandardXLSX;

const getDateRange = (filterType, customDate, customMonth) => {
  const start = new Date(), end = new Date();
  if (filterType === 'today') { start.setHours(0,0,0,0); end.setHours(23,59,59,999); return { startDate: start.toISOString(), endDate: end.toISOString() }; }
  if (filterType === 'yesterday') { start.setDate(start.getDate()-1); start.setHours(0,0,0,0); end.setDate(end.getDate()-1); end.setHours(23,59,59,999); return { startDate: start.toISOString(), endDate: end.toISOString() }; }
  if (filterType === 'week') { start.setDate(start.getDate()-7); start.setHours(0,0,0,0); end.setHours(23,59,59,999); return { startDate: start.toISOString(), endDate: end.toISOString() }; }
  if (filterType === 'custom' && customDate) { const d = new Date(customDate); d.setHours(0,0,0,0); const dEnd = new Date(customDate); dEnd.setHours(23,59,59,999); return { startDate: d.toISOString(), endDate: dEnd.toISOString() }; }
  if (filterType === 'month' && customMonth) { const [y,m] = customMonth.split('-').map(Number); return { startDate: new Date(y,m-1,1,0,0,0,0).toISOString(), endDate: new Date(y,m,0,23,59,59,999).toISOString() }; }
  start.setDate(start.getDate()-7); start.setHours(0,0,0,0); end.setHours(23,59,59,999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

const getFriendlyText = (filterType, customDate, customMonth) => {
  if (filterType === 'today') return `Today (${new Date().toLocaleDateString()})`;
  if (filterType === 'yesterday') { const d = new Date(); d.setDate(d.getDate()-1); return `Yesterday (${d.toLocaleDateString()})`; }
  if (filterType === 'week') return 'Last 7 Days';
  if (filterType === 'custom' && customDate) return `Date: ${new Date(customDate).toLocaleDateString()}`;
  if (filterType === 'month' && customMonth) { const [y,m] = customMonth.split('-').map(Number); return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'}); }
  return 'Last 7 Days';
};

const formatLoggedHours = (h) => {
  if (!h) return '0s';
  const ts = Math.floor(h*3600), hrs = Math.floor(ts/3600), mins = Math.floor((ts%3600)/60), secs = ts%60;
  let p = []; if(hrs>0) p.push(`${hrs}h`); if(mins>0||hrs>0) p.push(`${mins}m`); if(secs>0||p.length===0) p.push(`${secs}s`);
  return p.join(' ');
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

  const now = new Date();
  const generatedStr = `Generated: ${now.toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' })}  ${now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}`;

  const emptyRow   = Array(lastCol).fill('');
  const titleRow   = Array(lastCol).fill('');
  titleRow[0]      = sheetTitle || 'Report';
  const subRow     = Array(lastCol).fill('');
  subRow[0]        = generatedStr;
  const spacerRow  = Array(lastCol).fill('');

  const TITLE_ROW   = 0;
  const SUB_ROW     = 1;
  const SPACER_ROW  = 2;
  const HDR_START   = 3;
  const HDR_END     = HDR_START + headerRowCount;
  const DATA_START  = HDR_END;

  const finalRows = [titleRow, subRow, spacerRow, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(finalRows);

  if (widths) ws['!cols'] = widths.map(wch => ({ wch: wch + 2 }));

  const rowHeights = [];
  rowHeights[TITLE_ROW]  = { hpt: 36 };
  rowHeights[SUB_ROW]    = { hpt: 18 };
  rowHeights[SPACER_ROW] = { hpt: 6  };
  for (let r = HDR_START; r < HDR_END; r++)  rowHeights[r] = { hpt: 22 };
  for (let r = DATA_START; r < finalRows.length; r++) rowHeights[r] = { hpt: 18 };
  ws['!rows'] = rowHeights;

  ws['!merges'] = [
    { s: { r: TITLE_ROW, c: 0 }, e: { r: TITLE_ROW, c: lastCol - 1 } },
    { s: { r: SUB_ROW,   c: 0 }, e: { r: SUB_ROW,   c: lastCol - 1 } },
    { s: { r: SPACER_ROW,c: 0 }, e: { r: SPACER_ROW, c: lastCol - 1 } }
  ];

  try {
    setCell(ws, TITLE_ROW, 0, sheetTitle || 'Report', cellStyle({
      font:      { name: 'Calibri', size: 18, bold: true, color: { rgb: headerColor } },
      fill:      solidFill(headerBgColor),
      alignment: { horizontal: 'center', vertical: 'center' }
    }));
    for (let c = 1; c < lastCol; c++) {
      setCell(ws, TITLE_ROW, c, '', cellStyle({ fill: solidFill(headerBgColor) }));
    }

    const subBg = headerBgColor + '22';
    setCell(ws, SUB_ROW, 0, generatedStr, cellStyle({
      font:      { name: 'Calibri', size: 9, italic: true, color: { rgb: '64748B' } },
      fill:      solidFill('F1F5F9'),
      alignment: { horizontal: 'center', vertical: 'center' }
    }));
    for (let c = 1; c < lastCol; c++) {
      setCell(ws, SUB_ROW, c, '', cellStyle({ fill: solidFill('F1F5F9') }));
    }

    for (let c = 0; c < lastCol; c++) {
      setCell(ws, SPACER_ROW, c, '', cellStyle({ fill: solidFill('FFFFFF') }));
    }

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
          if (/\d+h(\s\d+m)?(\s\d+s)?$/.test(v) || /^\d+m(\s\d+s)?$/.test(v)) align = 'right';
          else if (v.endsWith('%')) align = 'center';
          if (v === 'Active' || v === 'Currently Running') fontColor = '059669';
          else if (v === 'Past Log')                        fontColor = '7C3AED';
          else if (v === 'Paused')                          fontColor = '94A3B8';
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

    const footerR = finalRows.length;
    finalRows.push(Array(lastCol).fill(''));
    ws['!rows'][footerR] = { hpt: 4 };
    for (let c = 0; c < lastCol; c++) {
      setCell(ws, footerR, c, '', cellStyle({
        fill:   solidFill(headerBgColor),
        border: { top: { style: 'thin', color: { rgb: headerBgColor } } }
      }));
    }

    const lastColLetter = XLSX.utils.encode_col(lastCol - 1);
    ws['!autofilter'] = { ref: `A${DATA_START + 1}:${lastColLetter}${finalRows.length - 1}` };
    ws['!freeze']     = { xSplit: 0, ySplit: DATA_START };
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

const GlobalReportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('today');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [customMonth, setCustomMonth] = useState(new Date().toISOString().split('T')[0].substring(0,7));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);

  useEffect(() => {
    setLoading(true);
    const dr = getDateRange(filterType, customDate, customMonth);
    const q = `startDate=${dr.startDate}&endDate=${dr.endDate}&tzOffset=${new Date().getTimezoneOffset()}`;
    api.get(`/reports/global?${q}`)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [filterType, customDate, customMonth]);

  const activeRangeText = getFriendlyText(filterType, customDate, customMonth);
  const gs = data?.globalStats || {};
  const ps = data?.projectSummaries || [];
  const trend = data?.completionTrend || [];
  const members = data?.memberPerformance || [];

  const handleDownloadReport = () => {
    if (!data) return;
    const reportTitle = `Global Report - ${user?.globalRole === 'TEAM_LEADER' ? 'Core Team' : 'All Projects'}`;
    
    const summaryRows = [
      ['Generated By', user?.name || 'User'],
      ['Role', user?.globalRole?.replace('_', ' ') || 'User'],
      ['Selected Range', activeRangeText],
      ['Generated At', new Date()],
      [''],
      ['Total Projects', data.globalStats?.totalProjects || 0],
      ['Completed Tasks', data.globalStats?.totalCompleted || 0],
      ['Hours Tracked', `${data.globalStats?.totalHours || 0}h`],
      ['Pending Tasks', data.globalStats?.totalPending || 0],
      ['Overdue Tasks', data.globalStats?.totalOverdue || 0],
      ['Stuck Tasks', data.globalStats?.totalStuck || 0],
      ['On Hold Tasks', data.globalStats?.totalHold || 0]
    ];

    const projectRows = (data.projectSummaries || []).map(p => [
      p.name || '',
      p.memberCount || 0,
      p.totalTasks || 0,
      p.completedCount || 0,
      p.pendingCount || 0,
      p.overdueCount || 0,
      p.stuckCount || 0,
      p.totalHours || 0,
      `${p.completionRate || 0}%`
    ]);

    const memberRows = (data.memberPerformance || []).map(m => [
      m.name || '',
      m.designation || '',
      m.role?.replace('_', ' ') || '',
      m.projectNames && m.projectNames.length > 0 ? m.projectNames.join(', ') : (m.projectCount || 0),
      m.totalTasks || 0,
      m.completedTasks || 0,
      `${Math.round((m.completedTasks / (m.totalTasks || 1)) * 100)}%`,
      `${parseFloat(Number(m.totalHours || 0).toFixed(2))}h`
    ]);

    const overdueRows = (data.overdueTasks || []).map(t => [
      t.title || '',
      t.project?.name || '',
      t.assignee?.name || 'Unassigned',
      t.dueDate ? new Date(t.dueDate) : '',
      t.daysOverdue || 0
    ]);

    const stuckRows = (data.stuckTasks || []).map(t => [
      t.title || '',
      t.project?.name || '',
      t.assignee?.name || 'Unassigned',
      t.stuckReason || 'No reason',
      t.updatedAt ? new Date(t.updatedAt) : ''
    ]);

    const completedRows = (data.completedTasks || []).map(t => [
      t.title || '',
      t.project?.name || '',
      t.assignee?.name || 'Unassigned',
      t.updatedAt ? new Date(t.updatedAt) : '',
      formatLoggedHours((t.timeLogs || []).reduce((sum, log) => sum + log.hours, 0))
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Metric', 'Value'], ...summaryRows], [24, 24], 1, 'FFFFFF', '0052CC', reportTitle), 'Summary');
    
    if (projectRows.length > 0) {
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Project', 'Members', 'Total Tasks', 'Completed', 'Pending', 'Overdue', 'Stuck', 'Hours', 'Completion'], ...projectRows], [26, 12, 12, 12, 12, 12, 12, 12, 14], 1, 'FFFFFF', '10B981', reportTitle), 'Project Breakdown');
    }
    
    if (memberRows.length > 0) {
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Member', 'Designation', 'Role', 'Projects', 'Total Tasks', 'Completed', 'Completion %', 'Total Hours'], ...memberRows], [24, 20, 16, 12, 12, 12, 14, 14], 1, 'FFFFFF', '6D28D9', reportTitle), 'Member Performance');
    }

    if (overdueRows.length > 0) {
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Name', 'Project', 'Assignee', 'Due Date', 'Days Overdue'], ...overdueRows], [26, 18, 20, 16, 14], 1, 'FFFFFF', 'F59E0B', reportTitle), 'Overdue Tasks');
    }

    if (stuckRows.length > 0) {
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Name', 'Project', 'Assignee', 'Blocker Reason', 'Last Updated'], ...stuckRows], [26, 18, 20, 24, 16], 1, 'FFFFFF', 'EF4444', reportTitle), 'Stuck Tasks');
    }

    if (completedRows.length > 0) {
      XLSX.utils.book_append_sheet(workbook, createSheetFromRows([['Task Name', 'Project', 'Assignee', 'Completed At', 'Worked Time'], ...completedRows], [26, 18, 20, 18, 14], 1, 'FFFFFF', '10B981', reportTitle), 'Completed Tasks');
    }

    const fileName = `Global_Report_${filterType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadWorkbook(workbook, fileName);
  };

  return (
    <div className="report-page">
      {/* Header */}
      <div className="report-title-section">
        <h1>🌐 Global Report</h1>
        <p>Cross-project analytics across all {user?.globalRole === 'TEAM_LEADER' ? 'your team\'s' : 'company'} projects</p>
      </div>

      {/* Filter Bar */}
      <div className="report-filter-bar filter-selector-bar">
        <span className="filter-label">Period:</span>
        <div className="filter-group">
          {[{id:'today',label:'Today'},{id:'yesterday',label:'Yesterday'},{id:'week',label:'Last 7 Days'},{id:'custom',label:'Pick Date'},{id:'month',label:'Pick Month'}].map(opt => (
            <button key={opt.id} onClick={() => setFilterType(opt.id)} className={`filter-btn${filterType===opt.id?' active':''}`}>{opt.label}</button>
          ))}
        </div>
        {filterType === 'custom' && <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="filter-date-input" />}
        {filterType === 'month' && <input type="month" value={customMonth} onChange={e => setCustomMonth(e.target.value)} className="filter-date-input" />}
        <div className="filter-actions">
          <button onClick={handleDownloadReport} className="download-btn" disabled={!data || loading}>
            📥 Download Report
          </button>
          <div className="active-range">Active range: <strong>{activeRangeText}</strong></div>
        </div>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:'4rem',color:'var(--text-light)'}}>
          <div className="report-spinner" style={{margin:'0 auto 12px'}}></div>
          Loading global report...
        </div>
      ) : (
        <>
          {/* Global Summary Cards */}
          <div className="report-metrics-grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))'}}>
            <div className="report-metric-card accent-indigo">
              <div className="card-label"><span className="label-dot indigo"></span>Total Projects</div>
              <div className="big-value" style={{color:'var(--accent)'}}>{gs.totalProjects || 0}</div>
            </div>
            <div className="report-metric-card accent-emerald">
              <div className="card-label"><span className="label-dot emerald"></span>Completed Tasks</div>
              <div className="big-value" style={{color:'var(--status-done)'}}>{gs.totalCompleted || 0}</div>
            </div>
            <div className="report-metric-card accent-amber">
              <div className="card-label"><span className="label-dot amber"></span>Hours Tracked</div>
              <div className="big-value" style={{color:'#f59e0b'}}>{gs.totalHours || 0}h</div>
            </div>
            <div className="report-metric-card" style={{borderTop:'3px solid #ef4444'}}>
              <div className="card-label" style={{color:'#ef4444'}}>⚠️ Issues</div>
              <div className="member-status-grid" style={{gridTemplateColumns:'repeat(2, 1fr)',gap:'8px',marginBottom:0}}>
                <div className="member-status-item pending"><div className="member-status-val">{gs.totalPending||0}</div><div className="member-status-lbl">Pending</div></div>
                <div className="member-status-item overdue"><div className="member-status-val" style={{color:'#ef4444'}}>{gs.totalOverdue||0}</div><div className="member-status-lbl" style={{color:'#ef4444'}}>Overdue</div></div>
                <div className="member-status-item stuck"><div className="member-status-val" style={{color:'#f59e0b'}}>{gs.totalStuck||0}</div><div className="member-status-lbl" style={{color:'#f59e0b'}}>Stuck</div></div>
                <div className="member-status-item hold"><div className="member-status-val" style={{color:'var(--accent)'}}>{gs.totalHold||0}</div><div className="member-status-lbl">On Hold</div></div>
              </div>
            </div>
          </div>

          {/* Completion Trend Chart */}
          {trend.length > 0 && (
            <div className="report-metric-card accent-emerald" style={{marginBottom:'2rem'}}>
              <div className="card-label"><span className="label-dot emerald"></span>Completion Trend (All Projects)</div>
              <div style={{height:'140px',display:'flex',alignItems:'flex-end',gap:trend.length>15?'3px':trend.length>7?'5px':'8px',padding:'10px 0 0',marginTop:'auto'}}>
                {trend.map((day,i) => {
                  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                  const dateObj = new Date(day.date);
                  const label = trend.length > 7 ? dateObj.getUTCDate() : days[dateObj.getUTCDay()];
                  const maxCount = Math.max(...trend.map(d=>d.count),1);
                  const hp = Math.max((day.count/maxCount)*100,4);
                  const showLabel = trend.length<=10||(i%Math.ceil(trend.length/5)===0);
                  return (
                    <div key={day.date} style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1,gap:'6px',height:'100%'}}>
                      <div style={{flex:1,display:'flex',alignItems:'flex-end',width:'100%'}} title={`${day.count} tasks on ${day.date}`}>
                        <div className={`report-chart-bar ${day.count>0?'has-data':'no-data'}`} style={{width:'100%',height:`${hp}%`,minWidth:'4px'}}></div>
                      </div>
                      <div style={{fontSize:'0.65rem',color:'var(--text-light)',fontWeight:600,height:'12px',whiteSpace:'nowrap'}}>{showLabel?label:''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Project-Wise Breakdown Table */}
          <div className="report-tables-stack">
            <div className="report-table-section">
              <div className="table-header">
                <div className="header-left">
                  <div className="header-icon icon-indigo">📊</div>
                  <h3 style={{color:'var(--accent)'}}>Project-Wise Breakdown</h3>
                </div>
                <span className="count-badge badge-indigo">{ps.length} Projects</span>
              </div>
              <div style={{overflowX:'auto'}}>
                <table className="responsive-table report-table">
                  <thead><tr>
                    <th>Project</th><th>Members</th><th>Total Tasks</th><th>Completed</th><th>Pending</th><th>Overdue</th><th>Stuck</th><th>Hours</th><th style={{textAlign:'right'}}>Completion</th>
                  </tr></thead>
                  <tbody>
                    {ps.map(p => (
                      <tr key={p.id} style={{cursor:'pointer'}} onClick={() => setExpandedProject(expandedProject===p.id?null:p.id)}>
                        <td data-label="Project" className="cell-bold" style={{color:'var(--accent)'}}>{p.name}</td>
                        <td data-label="Members" className="cell-muted">{p.memberCount}</td>
                        <td data-label="Total" className="cell-bold">{p.totalTasks}</td>
                        <td data-label="Completed" className="cell-success">{p.completedCount}</td>
                        <td data-label="Pending" className="cell-muted">{p.pendingCount}</td>
                        <td data-label="Overdue" className="cell-danger">{p.overdueCount}</td>
                        <td data-label="Stuck" style={{color:'#f59e0b',fontWeight:700}}>{p.stuckCount}</td>
                        <td data-label="Hours" className="cell-accent">{p.totalHours}h</td>
                        <td data-label="Completion" style={{textAlign:'right'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',justifyContent:'flex-end'}}>
                            <div style={{width:'60px',height:'6px',background:'#f1f5f9',borderRadius:'3px',overflow:'hidden'}}>
                              <div style={{height:'100%',width:`${p.completionRate}%`,background:'var(--status-done)',borderRadius:'3px'}}></div>
                            </div>
                            <span className="cell-bold">{p.completionRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {ps.length === 0 && <tr><td colSpan="9" className="report-empty-state">No projects found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Member Performance */}
            <div className="report-table-section">
              <div className="table-header">
                <div className="header-left">
                  <div className="header-icon icon-purple">👥</div>
                  <h3 style={{color:'var(--text-dark)'}}>Team Member Performance (Cross-Project)</h3>
                </div>
                <span className="count-badge badge-indigo">{members.length} Members</span>
              </div>
              <div style={{overflowX:'auto'}}>
                <table className="responsive-table report-table">
                  <thead><tr>
                    <th>Member</th><th>Role</th><th>Projects</th><th>Total Tasks</th><th>Completed</th><th>Completion %</th><th style={{textAlign:'right'}}>Total Hours</th>
                  </tr></thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id} style={{cursor:'pointer'}} onClick={() => navigate(`/member-report/${m.id}`)}>
                        <td data-label="Member">
                          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                            {m.profilePic ? (
                              <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api${m.profilePic}`} alt={m.name} style={{width:'30px',height:'30px',borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(99,102,241,0.1)'}} />
                            ) : (
                              <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.08))',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:700}}>
                                {m.name?.split(' ').map(n=>n[0]).join('').toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="cell-bold">{m.name}</div>
                              {m.designation && <div style={{fontSize:'0.68rem',color:'var(--text-light)'}}>{m.designation}</div>}
                            </div>
                          </div>
                        </td>
                        <td data-label="Role"><span className={`status-pill ${m.role==='ADMIN'?'pill-red':m.role==='TEAM_LEADER'?'pill-green':'pill-neutral'}`}>{m.role?.replace('_',' ')}</span></td>
                        <td data-label="Projects">
                          {m.projectNames && m.projectNames.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {m.projectNames.map((pn, idx) => (
                                <span key={idx} className="status-pill pill-indigo" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{pn}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="cell-muted">{m.projectCount}</span>
                          )}
                        </td>
                        <td data-label="Tasks" className="cell-bold">{m.totalTasks}</td>
                        <td data-label="Completed" className="cell-success">{m.completedTasks}</td>
                        <td data-label="Completion">
                          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <div style={{flex:1,minWidth:'60px',height:'6px',background:'#f1f5f9',borderRadius:'3px',overflow:'hidden'}}>
                              <div style={{height:'100%',width:`${Math.round((m.completedTasks/(m.totalTasks||1))*100)}%`,background:'var(--status-done)',borderRadius:'3px'}}></div>
                            </div>
                            <span className="cell-bold">{Math.round((m.completedTasks/(m.totalTasks||1))*100)}%</span>
                          </div>
                        </td>
                        <td data-label="Hours" className="cell-accent" style={{textAlign:'right'}}>{parseFloat(Number(m.totalHours||0).toFixed(2))}h</td>
                      </tr>
                    ))}
                    {members.length === 0 && <tr><td colSpan="7" className="report-empty-state">No members found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Overdue Tasks */}
            {(data?.overdueTasks?.length > 0) && (
              <div className="report-table-section">
                <div className="table-header">
                  <div className="header-left">
                    <div className="header-icon icon-red">⏰</div>
                    <h3 style={{color:'#ef4444'}}>Overdue Tasks (All Projects)</h3>
                  </div>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table className="responsive-table report-table">
                    <thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Due Date</th><th style={{textAlign:'right'}}>Days Overdue</th></tr></thead>
                    <tbody>
                      {data.overdueTasks.map(t => (
                        <tr key={t.id}>
                          <td data-label="Task" className="cell-bold"><span style={{color:'var(--text-light)',marginRight:'6px',fontWeight:500}}>{t.taskKey}</span>{t.title}</td>
                          <td data-label="Project" className="cell-muted">{t.project?.name}</td>
                          <td data-label="Assignee"><span className="status-pill pill-neutral">{t.assignee?.name||'Unassigned'}</span></td>
                          <td data-label="Due Date" className="cell-muted">{new Date(t.dueDate).toLocaleDateString()}</td>
                          <td data-label="Days" className="cell-danger" style={{textAlign:'right'}}>{t.daysOverdue} days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stuck Tasks */}
            {(data?.stuckTasks?.length > 0) && (
              <div className="report-table-section">
                <div className="table-header">
                  <div className="header-left">
                    <div className="header-icon icon-red">🛑</div>
                    <h3 style={{color:'#ef4444'}}>Stuck Tasks (All Projects)</h3>
                  </div>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table className="responsive-table report-table">
                    <thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Blocker</th><th style={{textAlign:'right'}}>Last Updated</th></tr></thead>
                    <tbody>
                      {data.stuckTasks.map(t => (
                        <tr key={t.id}>
                          <td data-label="Task" className="cell-bold"><span style={{color:'var(--text-light)',marginRight:'6px',fontWeight:500}}>{t.taskKey}</span>{t.title}</td>
                          <td data-label="Project" className="cell-muted">{t.project?.name}</td>
                          <td data-label="Assignee" className="cell-bold">{t.assignee?.name||'Unassigned'}</td>
                          <td data-label="Blocker"><span className="status-pill pill-red">{t.stuckReason||'No reason'}</span></td>
                          <td data-label="Updated" className="cell-muted" style={{textAlign:'right'}}>{new Date(t.updatedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {(data?.completedTasks?.length > 0) && (
              <div className="report-table-section">
                <div className="table-header">
                  <div className="header-left">
                    <div className="header-icon icon-green">✅</div>
                    <h3 style={{color:'var(--status-done)'}}>Completed Tasks (All Projects)</h3>
                  </div>
                  <span className="count-badge badge-indigo">{data.completedTasks.length} Done</span>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table className="responsive-table report-table">
                    <thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Completed At</th><th style={{textAlign:'right'}}>Worked Time</th></tr></thead>
                    <tbody>
                      {data.completedTasks.map(t => (
                        <tr key={t.id}>
                          <td data-label="Task" className="cell-bold"><span style={{color:'var(--text-light)',marginRight:'6px',fontWeight:500}}>{t.taskKey}</span>{t.title}</td>
                          <td data-label="Project" className="cell-muted">{t.project?.name}</td>
                          <td data-label="Assignee"><span className="status-pill pill-neutral">{t.assignee?`${t.assignee.name}${t.assignee.designation?` (${t.assignee.designation})`:''}` : 'Unassigned'}</span></td>
                          <td data-label="Completed" className="cell-muted">{new Date(t.updatedAt).toLocaleDateString()}</td>
                          <td data-label="Worked" className="cell-success" style={{textAlign:'right'}}>{formatLoggedHours((t.timeLogs||[]).reduce((s,l)=>s+l.hours,0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalReportPage;
