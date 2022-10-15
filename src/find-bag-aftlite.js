// ==UserScript==
// @name         Find Bags [aftlite]
// @namespace    https://github.com/ethanhong/amzntools
// @version      1.0
// @description  remove useless package information
// @author       Pei
// @match        https://aftlite-portal.amazon.com/labor_tracking/lookup_history?user_name=*
// @match        https://aftlite-na.amazon.com/labor_tracking/lookup_history?user_name=*
// @require      https://unpkg.com/react@18/umd/react.production.min.js
// @require      https://unpkg.com/react-dom@18/umd/react-dom.production.min.js
// ==/UserScript==

/* global React */
/* global ReactDOM */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-alert */

const e = React.createElement;

function getCSS(isAftlitePortal) {
  const styleNA = `
    :root,
    body,
    html {
      box-sizing: border-box;
    }
    #search-bar {
      margin: 0.3rem 0rem;
    }
    #main-table
    {
      margin: 0;
      padding: 0;
      outline: none;
      font-size: 100%;
      vertical-align: baseline;
      background-color: transparent;
      border-collapse: collapse;
      text-align: center;
      white-space: nowrap;
    }
    #main-table tr {
      background-color: transparent;
      border: 1px solid #f6f6f6;
    }
    #main-table th {
      white-space: pre-line;
    }
    #main-table tr:not(:first-child) {
      border-right: 2px solid firebrick;
      border-left: 2px solid firebrick;
    }
    #main-table tr:nth-last-child(1) {
      border-bottom: 2px solid firebrick;
    }
    #main-table tr:hover {
      background-color: #f6f6f6;
    }
    .table-top-border {
      border-top: 2px solid firebrick !important;
    }
    .p-solve {
      color: firebrick;
    }
    .monospace {
      font-family: monospace;
      font-size: 0.9rem;
    }
    .spoo-dot {
      height: 0.5rem;
      width: 0.5rem;
      background-color: transparent;
      border-radius: 50%;
      display: inline-block;
      margin-right: 0.2rem;
    }
    .late-window .spoo-dot {
      background-color: rgb(184, 29, 19, 100%);
    }
    .current-window .spoo-dot {
      background-color: rgb(239, 183, 0, 100%);
    }
    .next-window .spoo-dot {
      background-color: rgb(0, 132, 80, 100%);
    }
  `;
  const stylePortal = `
  :root,
  body,
    html {
      box-sizing: border-box;
    }
    #main-table
    {
      margin: 0 !important;
      padding: 0;
      outline: none;
      font-size: 100%;
      vertical-align: baseline;
      background-color: transparent;
      white-space: nowrap;
    }
    #main-table tr {
      background-color: transparent;
    }
    #main-table th {
      white-space: pre-line;
    }
    #main-table tr:not(:first-child) {
      border-right: 2px solid firebrick;
      border-left: 2px solid firebrick;
    }
    #main-table tr:nth-last-child(1) {
      border-bottom: 2px solid firebrick;
    }
    #main-table tr:hover {
      background-color: #f6f6f6;
    }
    .table-top-border {
      border-top: 2px solid firebrick;
    }
    .p-solve {
      color: firebrick;
    }
    .monospace {
      font-family: monospace;
      font-size: 0.9rem;
    }
    .spoo-dot {
      height: 0.5rem;
      width: 0.5rem;
      background-color: transparent;
      border-radius: 50%;
      display: inline-block;
      margin-right: 0.2rem;
    }
    .late-window .spoo-dot {
      background-color: rgb(184, 29, 19, 100%);
    }
    .current-window .spoo-dot {
      background-color: rgb(239, 183, 0, 100%);
    }
    .next-window .spoo-dot {
      background-color: rgb(0, 132, 80, 100%);
    }
  `;
  return isAftlitePortal ? stylePortal : styleNA;
}

function getActions(table) {
  const [, ...actionRows] = [...table.querySelectorAll('tbody > tr')]; // exclude header
  const getTdTextContents = (tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim());
  return actionRows.map(getTdTextContents);
}

function TableHeader({ titles }) {
  const getHeaderComp = (t) => e('th', { className: 'a-text-center', key: t }, t);
  const tableHeaders = titles.map(getHeaderComp);
  return e('tr', null, tableHeaders);
}

async function getPackageInfo(pickListId, isAftlitePortal) {
  // url and selectors
  const fetchURL = isAftlitePortal
    ? '/picklist/view_picklist_history?picklist_id='
    : '/wms/view_picklist_history?picklist_id=';
  const statusSelector = isAftlitePortal ? 'div.a-row:nth-child(6)' : 'table:nth-child(6) tr:nth-child(2)';
  const completionTimeSelector = isAftlitePortal ? 'div.a-row:nth-child(10)' : 'tr:nth-child(6)';
  const cptSelector = isAftlitePortal ? 'div.a-row:nth-child(12)' : 'tr:nth-child(8)';
  const orderIdSelector = isAftlitePortal ? 'div.a-row:nth-child(2)' : 'tr:nth-child(2)';
  // define re
  const timeRe = /\d{1,2}:\d{1,2}/;
  const statusRe = /\(([\w-]+)\)/;
  const orderIdRe = /\d{7}/;

  try {
    const response = await fetch(`${fetchURL}${pickListId}`);
    const text = await response.text();
    const html = new DOMParser().parseFromString(text, 'text/html');
    const packageInfo = [];

    // extract completion time
    const completionTime = html.querySelector(completionTimeSelector).textContent.match(timeRe);
    packageInfo[0] = completionTime ? completionTime[0] : '-';
    // extract CPT
    const cpt = html.querySelector(cptSelector).textContent.match(timeRe);
    packageInfo[1] = cpt ? cpt[0] : '-';
    // extract status
    const status = html.querySelector(statusSelector).textContent.match(statusRe);
    packageInfo[2] = status ? status[1] : '-';
    // extract orderId
    const orderId = html.querySelector(orderIdSelector).textContent.match(orderIdRe);
    packageInfo[3] = orderId ? orderId[0] : '-';
    return packageInfo;
  } catch (err) {
    console.log('[getPackgeInfo]Fetch error: ', err);
    return Array(4).fill('-');
  }
}

function getTimeStyle(timeStamp, cpt, currentTime) {
  if (!timeStamp || !cpt) return '';

  const lateWindow = (currentTime.getHours() + 1) % 24;
  const currentWindow = (currentTime.getHours() + 2) % 24;
  const nextWindow = (currentTime.getHours() + 3) % 24;

  const startHour = parseInt(cpt.split(':')[0], 10);
  if (startHour === lateWindow) return 'late-window';
  if (startHour === currentWindow) return 'current-window';
  if (startHour === nextWindow) return 'next-window';
  return '';
}

function ActionRow({ action, isFirstPackage, isAftlitePortal }) {
  const orderviewUrl = isAftlitePortal ? '/orders/view_order?id=' : '/wms/view_order/';
  const picklistUrl = isAftlitePortal
    ? '/picklist/pack_by_picklist?picklist_id='
    : '/wms/pack_by_picklist?picklist_id=';

  const newAction = action.map((ele, i) => {
    if (i === 3) return e('span', { className: 'monospace' }, ele);
    if (i === 8)
      return e('div', null, [e('span', { className: 'spoo-dot' }), e('span', { className: 'monospace' }, ele)]);
    if (i === 9) return e('a', { href: `${orderviewUrl}${ele}` }, ele);
    if (i === 10) return e('a', { href: `${picklistUrl}${ele}` }, ele);
    return ele;
  });

  const psolveStyle = newAction[5] === 'problem-solve' ? 'p-solve' : '';
  const timeWindowStyle = getTimeStyle(newAction[0], newAction[7], new Date());
  const topBorderStyle = isFirstPackage ? 'table-top-border' : '';
  const cells = newAction.map((cell, index) => e('td', { className: 'a-text-center', key: index }, cell));
  return e('tr', { className: `${psolveStyle} ${timeWindowStyle} ${topBorderStyle}` }, cells);
}

function mapToNewAction(isAftlitePortal) {
  // convert old table data in to new table
  return (action) => {
    const newAction = [];
    if (isAftlitePortal) {
      newAction[0] = action[0];
      newAction[1] = action[1];
      newAction[2] = action[2];
      newAction[3] = action[3];
      newAction[4] = action[4];
      newAction[5] = ''; // status
      newAction[6] = ''; // completion time
      newAction[7] = ''; // cpt
      newAction[8] = action[9];
      newAction[9] = ''; // orderId
      newAction[10] = action[12];
      newAction[11] = action[11];
    } else {
      newAction[0] = action[0];
      newAction[1] = action[1];
      newAction[2] = action[2];
      newAction[3] = action[3];
      newAction[4] = action[4];
      newAction[5] = ''; // status
      newAction[6] = ''; // completion time
      newAction[7] = ''; // cpt
      newAction[8] = action[10];
      newAction[9] = ''; // orderId
      newAction[10] = action[13];
      newAction[11] = action[12];
    }
    return newAction;
  };
}

async function doRecursiveFetch(urlAndspoos, startIndex, setProgress) {
  if (!urlAndspoos[startIndex]) return [];
  const [url, spoo] = urlAndspoos[startIndex] ? urlAndspoos[startIndex] : [];
  // start fetching
  const response = await fetch(url);
  const text = await response.text();
  const [currResult] = text.slice(text.indexOf(spoo) + 20, text.indexOf(spoo) + 80).match(/[\w\d]{20}/) || [];
  // set progress
  const fetchPercentage = ((startIndex + 1) / urlAndspoos.length) * 100;
  setProgress(fetchPercentage % 100 ? fetchPercentage.toFixed(1) : fetchPercentage); // no decimal point when 0 and 100

  return [currResult, ...(await doRecursiveFetch(urlAndspoos, startIndex + 1, setProgress))];
}

async function fetchTrackCode(actionToFetch, setProgress, isAftlitePortal) {
  const orderUrl = isAftlitePortal ? '/orders/view_order?id=' : '/wms/view_order/';
  const getUrlAndSpoos = (action) => [`${orderUrl}${action[9]}`, action[8]];
  const urlAndspoos = actionToFetch.map(getUrlAndSpoos);

  const codes = await doRecursiveFetch(urlAndspoos, 0, setProgress);
  return codes.filter((x) => Boolean(x)); // remove empty, ex: problem bags
}

function getActionToFetch(searchTerm) {
  const allActions = getActions(document.querySelector('#main-table'));

  const isSearchTarget = (action) => action[8] === searchTerm;
  const [targetAction] = allActions.filter(isSearchTarget);

  const isRelated = (action) => action[6] === targetAction[6] && action[7] === targetAction[7]; // same completion time && same cpt
  const isNotSearchTarget = (action) => !isSearchTarget(action);
  const relatedActions = allActions.filter(isRelated).filter(isNotSearchTarget); // excludes target itself

  return [targetAction, ...relatedActions];
}

function SearchBar({ isAftlitePortal }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [progress, setProgress] = React.useState(0);

  const handleOnChange = (evt) => setSearchTerm(evt.target.value);

  const handleOnClick = async () => {
    if (!searchTerm) return;
    const actionToFetch = getActionToFetch(searchTerm);
    const scannableId = await fetchTrackCode(actionToFetch, setProgress, isAftlitePortal);
    if (scannableId.length <= 1) {
      alert('No related bags found.');
    } else {
      setTimeout(() => {
        prompt(
          `Found ${scannableId.length - 1} related bags.\nCopy and paste the relust into COMO for locations.`,
          scannableId
        );
        setProgress(0);
      }, 100);
    }
  };

  const searchForm = e('form', { id: 'search-form' }, [
    e('input', {
      id: 'search-input',
      type: 'text',
      placeholder: 'Search bags ...',
      size: '30',
      value: searchTerm,
      onChange: handleOnChange,
    }),
    e('input', {
      id: 'search-btn',
      type: 'button',
      value: 'Search',
      onClick: handleOnClick,
    }),
    ` ( ${progress} % )`,
  ]);

  return e('div', { id: 'search-bar' }, [searchForm]);
}

function MainTable({ oldTable, isAftlitePortal }) {
  const titles = [
    'Timestamp',
    'Action',
    'Tool',
    'Asin',
    'Bin',
    'Status',
    'Completion Time',
    'CPT',
    'Tote',
    'Order',
    'Picklist',
    'User',
  ];

  const isPack = (action) => action[1] === 'pack';
  const isIndirect = (action) => action[2] === 'indirect';
  const isLatestSpoo = (currAction, _, allActions) => {
    const spooIdx = isAftlitePortal ? 9 : 10;
    const firstMatch = allActions.find((x) => x[spooIdx] === currAction[spooIdx]);
    return !firstMatch[spooIdx] || firstMatch === currAction;
  };

  const [newActions, setNewActions] = React.useState(
    getActions(oldTable)
      .filter((action) => isPack(action) || isIndirect(action))
      .filter(isLatestSpoo)
      .map(mapToNewAction(isAftlitePortal))
  );

  const header = e(TableHeader, { titles, key: 'main-table-header' });
  const rows = newActions.map((action, i, allActions) => {
    const isFirstPackage = !i || allActions[i][6] !== allActions[i - 1][6];
    return e(ActionRow, { action, isFirstPackage, isAftlitePortal, key: action[8] });
  });

  React.useEffect(() => {
    newActions.map(async (action, i) => {
      const { 10: pickListId } = action;
      if (!pickListId) return;
      const packageInfo = await getPackageInfo(pickListId, isAftlitePortal);
      const fetchedActions = (prevState) => {
        const currAction = [...prevState[i]];
        [currAction[6], currAction[7], currAction[5], currAction[9]] = packageInfo;
        return [...prevState.slice(0, i), currAction, ...prevState.slice(i + 1)];
      };
      setNewActions(fetchedActions);
    });
  }, []);

  const searchBar = e(SearchBar, { isAftlitePortal, key: 'search-bar' });
  const newTable = e(
    'table',
    { id: 'main-table', className: 'a-bordered a-spacing-top-large reportLayout' },
    e('tbody', null, [header, ...rows])
  );
  return e('div', null, [searchBar, newTable]);
}

function TableSwitch({ isOriginalTable, setIsOriginalTable }) {
  return e('form', null, [
    e('input', {
      type: 'checkbox',
      checked: isOriginalTable,
      onChange: () => setIsOriginalTable((prev) => !prev),
    }),
    ' Show original table',
  ]);
}

function App({ oldTable, isAftlitePortal }) {
  const [isOriginalTable, setIsOriginalTable] = React.useState(false);
  const mainTable = e(MainTable, { oldTable, isAftlitePortal, key: 'main-table' });
  const tableSwitch = e(TableSwitch, { isOriginalTable, setIsOriginalTable, key: 'table-switch' });

  React.useEffect(() => {
    const originalTable = document.querySelector('#main-content > table');
    const newTable = document.querySelector('#main-table');
    originalTable.style.display = isOriginalTable ? 'table' : 'none';
    newTable.style.display = isOriginalTable ? 'none' : 'table';
  }, [isOriginalTable]);

  return e(React.Fragment, null, [tableSwitch, mainTable]);
}

// eslint-disable-next-line no-unused-vars
function startBagFinder() {
  const isAftlitePortal = window.location.hostname === 'aftlite-portal.amazon.com';

  // add stylesheet
  const styleSheet = document.createElement('style');
  styleSheet.innerText = getCSS(isAftlitePortal);
  document.head.appendChild(styleSheet);

  // add id for original table for easier access
  if (!isAftlitePortal) {
    document.querySelector('div.resultSet').setAttribute('id', 'main-content');
  }

  // mount app
  const rootDiv = document.createElement('div');
  const oldTable = document.querySelector('#main-content > table');
  oldTable.before(rootDiv);
  ReactDOM.createRoot(rootDiv).render(e(App, { oldTable, isAftlitePortal }));
}
