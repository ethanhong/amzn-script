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
    fetchURL = 'https:/wms/pack_by_picklist?picklist_id=';
  } else if (urlParser.hostname === 'aftlite-portal.amazon.com') {
    tableSelector = '#main-content > table';
    fetchURL = 'https:/picklist/pack_by_picklist?picklist_id=';
  } else {
    return;
  }

  function preparePage() {
    const tbl = document.querySelector(tableSelector);
    if (tbl == null) return;
    if (urlParser.hostname === 'aftlite-portal.amazon.com') {
      // remove table a-vertical-stripes color setting
      tbl.classList.remove('a-vertical-stripes');
    }
    // change ExpDate title to Pull Time
    tbl.rows[0].cells[8].textContent = 'Pull Time';
    // change Cart title to Aisle
    tbl.rows[0].cells[10].textContent = 'Aisle';
  }

  function getRows() {
    return [...document.querySelector(tableSelector).rows].slice(1);
  }

  function convertTime(timeStr) {
    // convert from 12hr to 24hr, ex: 2:00pm to 14:00
    let [hour] = timeStr.split(':00');
    const [, modifier] = timeStr.split(':00');
    if (hour === '12') {
      hour = '00';
    }
    if (modifier === 'pm') {
      hour = parseInt(hour, 10) + 12;
    }
    return `${hour}:00`;
  }

  function extractToteInfo(page) {
    const info = {};
    [info.pullTime] = /\d{1,2}:00[a,p]m/.exec(page);
    info.pullTime = convertTime(info.pullTime);
    return info;
  }

  async function fetchTotePage(spoo) {
    return fetch(`${fetchURL}${encodeURIComponent(spoo)}`).then((res) => res.text());
  }

  // calulate window hour
  const now = new Date();
  const pullTimeStyle = new Map([
    [`${(now.getHours() + 1) % 24}:00`, 'late-window'],
    [`${(now.getHours() + 2) % 24}:00`, 'current-window'],
    [`${(now.getHours() + 3) % 24}:00`, 'next-window'],
  ]);

  async function totePainter() {
    preparePage();

    const allRows = getRows();
    const savedInfo = new Map();
    for (const row of allRows) {
      const spoo = row.cells[9].textContent.trim();
      if (!spoo) {
        row.cells[10].textContent = `${row.cells[1].textContent}/${row.cells[2].textContent}`;
      } else {
        let toteInfo;
        if (savedInfo.has(spoo)) {
          toteInfo = savedInfo.get(spoo);
        } else {
          // eslint-disable-next-line no-await-in-loop
          const page = await fetchTotePage(spoo);
          toteInfo = extractToteInfo(page);
          savedInfo.set(spoo, toteInfo);
        }

        // add pull time value
        row.cells[8].textContent = toteInfo.pullTime;

        // add window class name for css styling
        let style = 'less-important';
        if (pullTimeStyle.has(toteInfo.pullTime)) {
          style = pullTimeStyle.get(toteInfo.pullTime);
        }
        row.cells[8].classList.add(style);
        row.cells[9].classList.add(style);

        // add aisle information
        [row.cells[10].textContent] = /\w\d{3}/.exec(row.cells[4].textContent);
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
