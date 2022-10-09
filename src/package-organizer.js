// ==UserScript==
// @name         Package Organizer
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

const e = React.createElement;

const getCSS = (isAftlitePortal) => {
  const styleNA = `
    :root,
    body,
    html {
      box-sizing: border-box;
    }
    #main-table
    {
      margin: 0;
      padding: 0;
      outline: none;
      font-size: 100%;
      vertical-align: baseline;
      background: transparent;
      border-collapse: collapse;
      text-align: center;
    }
    #main-table tr {
      background: transparent;
    }
    #main-table tr:not(:first-child) {
      border-right: 2px solid firebrick;
      border-left: 2px solid firebrick;
    }
    #main-table tr:nth-last-child(1) {
      border-bottom: 2px solid firebrick;
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
  const stylePortal = `
  :root,
  body,
    html {
      box-sizing: border-box;
    }
    #main-table
    {
      margin: 0;
      padding: 0;
      outline: none;
      font-size: 100%;
      vertical-align: baseline;
      background: transparent;
    }
    #main-table tr {
      background: transparent;
    }
    #main-table tr:not(:first-child) {
      border-right: 2px solid firebrick;
      border-left: 2px solid firebrick;
    }
    #main-table tr:nth-last-child(1) {
      border-bottom: 2px solid firebrick;
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
};

const getActions = () => {
  const actionRows = [...document.querySelectorAll('#main-content > table > tbody > tr')];
  actionRows.shift(); // remove header
  return actionRows.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()));
};

const TableHeader = ({ titles }) => {
  const tableHeaders = titles.map((title) =>
    e('th', { className: 'a-text-center', style: { whiteSpace: 'pre-line' }, key: title }, title)
  );
  return e('tr', null, tableHeaders);
};

const getPackageInfo = async (pickListId, isAftlitePortal) => {
  const fetchURL = isAftlitePortal
    ? '/picklist/view_picklist_history?picklist_id='
    : '/wms/view_picklist_history?picklist_id=';
  const statusSelector = isAftlitePortal ? 'div.a-row:nth-child(6)' : 'table:nth-child(6) tr:nth-child(2)';
  const completionTimeSelector = isAftlitePortal ? 'div.a-row:nth-child(10)' : 'tr:nth-child(6)';
  const cptSelector = isAftlitePortal ? 'div.a-row:nth-child(12)' : 'tr:nth-child(8)';
  const orderIdSelector = isAftlitePortal ? 'div.a-row:nth-child(2)' : 'tr:nth-child(2)';

  const timeRe = /\d{1,2}:\d{1,2}/;
  const statusRe = /\(([\w-]+)\)/;
  const orderIdRe = /\d{7}/;

  return fetch(`${fetchURL}${pickListId}`)
    .then((res) => res.text())
    .then((page) => {
      const packageInfo = Array(4);
      const html = new DOMParser().parseFromString(page, 'text/html');

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
    })
    .catch((err) => {
      console.log('[getPackgeInfo]Fetch error: ', err);
      return Array(4).fill('-');
    });
};

const getTimeStyle = (timeStamp, cpt, currentTime) => {
  if (!timeStamp || !cpt) {
    return '';
  }

  const isToday = Number.parseInt(timeStamp.split(/[\s-]/)[2], 10) === currentTime.getDate();
  if (!isToday) return '';

  const lateWindow = (currentTime.getHours() + 1) % 24;
  const currentWindow = (currentTime.getHours() + 2) % 24;
  const nextWindow = (currentTime.getHours() + 3) % 24;
  const startHour = parseInt(cpt.split(':')[0], 10);
  if (startHour === lateWindow) {
    return 'late-window';
  }
  if (startHour === currentWindow) {
    return 'current-window';
  }
  if (startHour === nextWindow) {
    return 'next-window';
  }
  return '';
};

const ActionRow = ({ action, i, allActions }) => {
  const newAction = action.map((ele, j) => {
    if (j === 3) return e('span', { className: 'monospace' }, ele);
    if (j === 8)
      return e('div', null, [e('span', { className: 'spoo-dot' }), e('span', { className: 'monospace' }, ele)]);
    if (j === 9) return e('a', { href: `/orders/view_order?id=${ele}` }, ele);
    if (j === 10) return e('a', { href: `/picklist/pack_by_picklist?picklist_id=${ele}` }, ele);
    return ele;
  });

  const psolveStyle = newAction[5] === 'problem-solve' ? 'p-solve' : '';
  const timeWindowStyle = getTimeStyle(newAction[0], newAction[7], new Date());
  const topBorderStyle = i === 0 || allActions[i][6] !== allActions[i - 1][6] ? 'table-top-border' : '';

  const cells = newAction.map((cell, index) => e('td', { className: 'a-text-center', key: index }, cell));

  return e('tr', { className: `${psolveStyle} ${timeWindowStyle} ${topBorderStyle}` }, cells);
};

const mapToNewAction = (action, isAftlitePortal) => {
  // convert old table data in to new table
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

const isActionToKeep = (action, index, allActions, isAftlitePortal) => {
  const allSpoos = allActions.map((act) => (isAftlitePortal ? act[9] : act[10]));
  const [actionCell, toolCell] = [action[1], action[2]];
  const spooCell = isAftlitePortal ? action[9] : action[10];
  const isPackUniqeSpoo = actionCell === 'pack' && toolCell === 'pack' && allSpoos.indexOf(spooCell) === index;
  const isIndirect = toolCell === 'indirect';
  return isPackUniqeSpoo || isIndirect;
};

const MainTable = ({ isAftlitePortal }) => {
  const titles = [
    'Timestamp',
    'Action',
    'Tool',
    'Asin',
    'Bin',
    'Status',
    'Completion \n Time',
    'CPT',
    'Tote',
    'Order',
    'Picklist',
    'User',
  ];

  const [newActions, setNewActions] = React.useState(
    getActions()
      .filter((action, index, allActions) => isActionToKeep(action, index, allActions, isAftlitePortal))
      .map((action) => mapToNewAction(action, isAftlitePortal))
  );

  const header = e(TableHeader, { titles, key: 'main-table-header' });
  const rows = newActions.map((action, i, allActions) => e(ActionRow, { action, i, allActions, key: action[8] }));

  React.useEffect(() => {
    newActions.map((na) => {
      const pickListId = na[10];
      if (!pickListId) return null;
      getPackageInfo(pickListId, isAftlitePortal).then((packageInfo) => {
        setNewActions((prev) =>
          prev.map((value) => {
            if (value[10] === pickListId) {
              const newValue = value.slice();
              [newValue[6], newValue[7], newValue[5], newValue[9]] = packageInfo;
              return newValue;
            }
            return value;
          })
        );
      });
      return null;
    });
  }, []);

  return e(
    'table',
    { id: 'main-table', className: 'a-bordered a-spacing-top-large reportLayout' },
    e('tbody', null, [header, ...rows])
  );
};

const TableSwitch = ({ isOriginalTable, setIsOriginalTable }) =>
  e(
    'form',
    null,
    e('input', {
      type: 'checkbox',
      checked: isOriginalTable,
      onChange: () => setIsOriginalTable((prev) => !prev),
    }),
    ' Show original table'
  );

const App = ({ isAftlitePortal }) => {
  const [isOriginalTable, setIsOriginalTable] = React.useState(false);
  const mainTable = e(MainTable, { isAftlitePortal, key: 'main-table' });
  const tableSwitch = e(TableSwitch, { isOriginalTable, setIsOriginalTable, key: 'table-switch' });

  React.useEffect(() => {
    const originalTable = document.querySelector('#main-content > table');
    const newTable = document.querySelector('#main-table');
    originalTable.style.display = isOriginalTable ? 'table' : 'none';
    newTable.style.display = isOriginalTable ? 'none' : 'table';
  }, [isOriginalTable]);

  return e(React.Fragment, null, [tableSwitch, mainTable]);
};

// eslint-disable-next-line no-unused-vars
const packageSummarizer = () => {
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
  document.querySelector('#main-content > table').before(rootDiv);
  ReactDOM.createRoot(rootDiv).render(e(App, { isAftlitePortal }));
};
