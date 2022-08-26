/* eslint-disable no-restricted-syntax */
/* eslint-disable func-names */
/* eslint-disable wrap-iife */
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

(function () {
  const urlParser = document.createElement('a');
  urlParser.href = window.location;

  let tableSelector = {};
  let fetchURL;
  if (urlParser.hostname === 'aftlite-na.amazon.com') {
    tableSelector = 'body > div.resultSet > table';
    fetchURL = 'https:/wms/view_picklist_history?picklist_id=';
  } else if (urlParser.hostname === 'aftlite-portal.amazon.com') {
    tableSelector = '#main-content > table';
    fetchURL = '/picklist/view_picklist_history?picklist_id=';
  } else {
    return;
  }

  function preparePage() {
    const tbl = document.querySelector(tableSelector);
    if (tbl == null) return;
    if (urlParser.hostname === 'aftlite-portal.amazon.com') {
      // remove table a-vertical-stripes class name
      tbl.classList.remove('a-vertical-stripes');
    }
    // change ExpDate title to Pull Time
    tbl.rows[0].cells[8].textContent = 'CPT';
    // change Cart title to Status
    tbl.rows[0].cells[10].textContent = 'Status';
  }

  function getRows() {
    return [...document.querySelector(tableSelector).rows].slice(1);
  }

  function extractToteInfo(page) {
    const info = {};
    const timeRe = /\d{1,2}:\d{1,2}/;
    const parcer = new DOMParser();
    const html = parcer.parseFromString(page, 'text/html');
    [info.cpt] = html.querySelector('#main-content > div:nth-child(12)').textContent.match(timeRe);
    return info;
  }

  async function fetchPicklistHistoryByID(id) {
    if (/^\d{7}$/.test(id)) {
      // id should be a 7-digit number
      return fetch(`${fetchURL}${encodeURIComponent(id)}`).then((res) => res.text());
    }
    return null;
  }

  // calulate window hour
  const now = new Date();
  const pullTimeStyle = new Map([
    [`${(now.getHours() + 1) % 24}:15`, 'late-window'],
    [`${(now.getHours() + 2) % 24}:15`, 'current-window'],
    [`${(now.getHours() + 3) % 24}:15`, 'next-window'],
  ]);

  async function totePainter() {
    preparePage();

    const allRows = getRows();

    // fetch picklist info by picklist id
    const savedInfo = new Map();
    for (const row of allRows) {
      if (row.cells[1].textContent.trim() === 'pack') {
        const id = row.cells[12].textContent.trim();
        let toteInfo = {};
        if (savedInfo.has(id)) {
          toteInfo = savedInfo.get(id);
        } else {
          // eslint-disable-next-line no-await-in-loop
          const page = await fetchPicklistHistoryByID(id);
          if (page) {
            toteInfo = extractToteInfo(page);
            savedInfo.set(id, toteInfo);
          }
        }

        // add CPT
        row.cells[8].textContent = toteInfo.cpt;

        // add css styling by CPT
        let style = 'less-important';
        if (pullTimeStyle.has(toteInfo.cpt)) {
          style = pullTimeStyle.get(toteInfo.cpt);
        }
        row.cells[8].classList.add(style);
        row.cells[9].classList.add(style);
      }
    }
  }

  totePainter();
})();

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
