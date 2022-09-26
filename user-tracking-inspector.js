// ==UserScript==
// @name         User Tracking Inspector
// @namespace    https://github.com/ethanhong/amzn-script
// @version      1.0
// @description  add useful info in user look up page
// @author       Pei
// @match        https://aftlite-portal.amazon.com/labor_tracking/lookup_history?user_name=*
// @match        https://aftlite-na.amazon.com/labor_tracking/lookup_history?user_name=*
// @grant        GM_addStyle
// ==/UserScript==

const isAftliteNa = window.location.hostname === 'aftlite-na.amazon.com';
const cellIndex = {};
[
  cellIndex.action,
  cellIndex.completionTime,
  cellIndex.cpt,
  cellIndex.toteSpoo,
  cellIndex.status,
  cellIndex.picklistId,
] = isAftliteNa ? [1, 8, 9, 10, 11, 13] : [1, 7, 8, 9, 10, 12];

function userTrackingInspector() {
  const bigTable = isAftliteNa
    ? document.querySelector('.reportLayout')
    : document.querySelector('#main-content > table');
  if (bigTable == null) return;

  preparePage(bigTable);

  const allRows = getRows(bigTable);

  const checkedID = new Set();
  allRows.forEach((row, _, rows) => {
    const action = row.cells[cellIndex.action].textContent.trim();
    const id = row.cells[cellIndex.picklistId].textContent.trim();
    if (action === 'pack' && !checkedID.has(id) && isValidID(id)) {
      checkedID.add(id);
      fetchPicklistHistoryPage(id)
        .then((page) => extractToteInfo(page))
        .then((toteInfo) => changePageContent(id, toteInfo, rows));
    }
  });
};

function preparePage(tbl) {
  if (!isAftliteNa) {
    // remove table a-vertical-stripes class name
    tbl.classList.remove('a-vertical-stripes');
  }
  // change titles
  const completionTimeTitleCell = tbl.rows[0].cells[cellIndex.completionTime];
  const cptTitleCell = tbl.rows[0].cells[cellIndex.cpt];
  const statusTitleCell = tbl.rows[0].cells[cellIndex.status];
  completionTimeTitleCell.textContent = 'Completion Time';
  cptTitleCell.textContent = 'CPT';
  statusTitleCell.textContent = 'Status';
}

function getRows(bigTable) {
  return [...bigTable.rows].slice(1);
}

async function fetchPicklistHistoryPage(id) {
  const fetchURL = isAftliteNa
    ? '/wms/view_picklist_history?picklist_id='
    : '/picklist/view_picklist_history?picklist_id=';

  return fetch(`${fetchURL}${encodeURIComponent(id)}`).then((res) => res.text());
}

function extractToteInfo(page) {
  const info = {
    cpt: '',
    completionTime: '',
    status: '',
  };
  const statusSelector = isAftliteNa
    ? 'body > table:nth-child(6) > tbody > tr:nth-child(2)'
    : 'div.a-row:nth-child(6)';
  const completionTimeSelector = isAftliteNa
    ? 'body > table:nth-child(6) > tbody > tr:nth-child(6)'
    : 'div.a-row:nth-child(10)';
  const cptSelector = isAftliteNa
    ? 'body > table:nth-child(6) > tbody > tr:nth-child(8)'
    : 'div.a-row:nth-child(12)';

  const timeRe = /\d{1,2}:\d{1,2}/;
  const statusRe = /\((\w+)\)/;
  const html = new DOMParser().parseFromString(page, 'text/html');
  // extract CPT
  let result = html.querySelector(cptSelector).textContent.match(timeRe);
  if (result) [info.cpt] = result;
  // extract completion time
  result = html.querySelector(completionTimeSelector).textContent.match(timeRe);
  if (result) [info.completionTime] = result;
  // extract status
  result = html.querySelector(statusSelector).textContent.match(statusRe);
  if (result) [, info.status] = result;

  return info;
}

// calulate window hour
const now = new Date();
const pullTimeStyle = new Map([
  [`${(now.getHours() + 1) % 24}:15`, 'late-window'],
  [`${(now.getHours() + 2) % 24}:15`, 'current-window'],
  [`${(now.getHours() + 3) % 24}:15`, 'next-window'],
]);

function changePageContent(id, toteInfo, rows) {
  rows.forEach((row) => {
    const picklistIDCell = row.cells[cellIndex.picklistId];
    if (picklistIDCell.textContent.trim() === id) {
      const completionTimeCell = row.cells[cellIndex.completionTime];
      const cptCell = row.cells[cellIndex.cpt];
      const toteSpooCell = row.cells[cellIndex.toteSpoo];
      const statusCell = row.cells[cellIndex.status];

      completionTimeCell.textContent = toteInfo.completionTime;
      statusCell.textContent = toteInfo.status;
      cptCell.textContent = toteInfo.cpt;

      let style = 'less-important';
      if (pullTimeStyle.has(toteInfo.cpt)) {
        style = pullTimeStyle.get(toteInfo.cpt);
      }
      cptCell.classList.add(style);
      toteSpooCell.classList.add(style);
    }
  });
}

function isValidID(id) {
  // id should be a 7-digit number
  return /^\d{7}$/.test(id);
}

// --------------------------- CSS --------------------------- //
// eslint-disable-next-line no-undef
GM_addStyle(`
.late-window {
  background-color: Pink;
}

.current-window {
  background-color: MediumAquaMarine;
}

.next-window {
  background-color: SkyBlue;
}

.less-important {
  background-color: LightGray;
}
`);
