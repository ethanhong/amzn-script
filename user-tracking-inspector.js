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

let tableSelector = 'body > div.resultSet > table';
let statusSelector = 'div.a-row:nth-child(6)';
let completionTimeSelector = 'div.a-row:nth-child(10)';
let cptSelector = 'div.a-row:nth-child(12)';
let fetchURL = 'https:/wms/view_picklist_history?picklist_id=';

if (window.location.hostname === 'aftlite-portal.amazon.com') {
  tableSelector = '#main-content > table';
  statusSelector = 'div.a-row:nth-child(6)';
  completionTimeSelector = 'div.a-row:nth-child(10)';
  cptSelector = 'div.a-row:nth-child(12)';
  fetchURL = '/picklist/view_picklist_history?picklist_id=';
}

(() => {
  preparePage();
  const allRows = getRows();
  const checkedID = new Set();
  allRows.forEach(async (row, i, rows) => {
    const action = row.cells[1].textContent.trim();
    const id = row.cells[12].textContent.trim();
    if (action === 'pack' && !checkedID.has(id) && idIsValid(id)) {
      checkedID.add(id);
      const page = await fetch(`${fetchURL}${encodeURIComponent(id)}`).then((res) => res.text());
      if (page) {
        const toteInfo = extractToteInfo(page);
        changePageContent(id, toteInfo, rows);
      }
    }
  });
})();

function preparePage() {
  const tbl = document.querySelector(tableSelector);
  if (tbl == null) return;
  if (window.location.hostname === 'aftlite-portal.amazon.com') {
    // remove table a-vertical-stripes class name
    tbl.classList.remove('a-vertical-stripes');
  }
  // change Previous/Exp.Date title to Competion Time
  tbl.rows[0].cells[7].textContent = 'Completion Time';
  // change ExpDate title to CPT
  tbl.rows[0].cells[8].textContent = 'CPT';
  // change Cart title to Status
  tbl.rows[0].cells[10].textContent = 'Status';
}

function getRows() {
  return [...document.querySelector(tableSelector).rows].slice(1);
}

function extractToteInfo(page) {
  const info = {
    cpt: '',
    completionTime: '',
    status: '',
  };

  const timeRe = /\d{1,2}:\d{1,2}/;
  const statusRe = /\((\w+)\)/;
  const html = new DOMParser().parseFromString(page, 'text/html');
  // extract CPT
  let result = html.querySelector(cptSelector).textContent.match(timeRe);
  if (result) {
    [info.cpt] = result;
  }
  // extract completion time
  result = html.querySelector(completionTimeSelector).textContent.match(timeRe);
  if (result) {
    [info.completionTime] = result;
  }
  // extract status
  result = html.querySelector(statusSelector).textContent.match(statusRe);
  if (result) {
    [, info.status] = result;
  }
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
    const completionTimeCell = row.cells[7];
    const cptCell = row.cells[8];
    const toteSpooCell = row.cells[9];
    const statusCell = row.cells[10];
    const picklistIDCell = row.cells[12];

    if (picklistIDCell.textContent.trim() === id) {
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

function idIsValid(id) {
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
