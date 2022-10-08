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
    #main-table tr:nth-last-child(1) {
      border-bottom: 2px solid firebrick;
    }
    .table-side-border {
      border-right: 2px solid firebrick;
      border-left: 2px solid firebrick;
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
    #main-table tr:nth-last-child(1) {
      border-bottom: 2px solid firebrick;
    }
    .table-side-border {
      border-right: 2px solid firebrick;
      border-left: 2px solid firebrick;
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

const filterUniquePackActions = (actions, isAftlitePortal) => {
  const pickedSpoo = [];
  return actions.filter((data) => {
    const [action, tool] = [data[1], data[2]];
    const spoo = isAftlitePortal ? data[9] : data[10];
    if (action === 'pack' && tool === 'pack' && !pickedSpoo.includes(spoo)) {
      pickedSpoo.push(spoo);
      return true;
    }
    return false;
  });
};

const TableHeader = () => {
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

const getTimeStyle = (cpt) => {
  if (!cpt) {
    return '';
  }

  const currentTime = new Date();
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

const getPsolveStyle = (status) => (['problem-solve', 'skipped'].includes(status) ? 'p-solve' : '');

const ActionRow = ({ action, i, allActions }) => {
  const actionClone = [...action];
  actionClone[3] = e('span', { className: 'monospace' }, action[3]);
  actionClone[8] = e('div', null, [
    e('span', { className: 'spoo-dot' }),
    e('span', { className: 'monospace' }, action[8]),
  ]);
  actionClone[9] = e('a', { href: `/orders/view_order?id=${action[9]}` }, action[9]);
  actionClone[10] = e('a', { href: `/picklist/pack_by_picklist?picklist_id=${action[10]}` }, action[10]);

  const style = `${getTimeStyle(actionClone[7])} ${getPsolveStyle(actionClone[5])}`;
  const topBorder = i === 0 || allActions[i][6] !== allActions[i - 1][6] ? 'table-top-border' : '';
  const cells = actionClone.map((cell, index) => e('td', { className: 'a-text-center', key: index }, cell));

  return e('tr', { className: `${style} ${topBorder} table-side-border` }, cells);
};

const transferToNewActions = (actions, isAftlitePortal) =>
  // convert old table data in to new table
  actions.map((action) => {
    const newActions = [];
    if (isAftlitePortal) {
      newActions[0] = action[0];
      newActions[1] = action[1];
      newActions[2] = action[2];
      newActions[3] = action[3];
      newActions[4] = action[4];
      newActions[5] = ''; // status
      newActions[6] = ''; // completion time
      newActions[7] = ''; // cpt
      newActions[8] = action[9];
      newActions[9] = ''; // orderId
      newActions[10] = action[12];
      newActions[11] = action[11];
    } else {
      newActions[0] = action[0];
      newActions[1] = action[1];
      newActions[2] = action[2];
      newActions[3] = action[3];
      newActions[4] = action[4];
      newActions[5] = ''; // status
      newActions[6] = ''; // completion time
      newActions[7] = ''; // cpt
      newActions[8] = action[10];
      newActions[9] = ''; // orderId
      newActions[10] = action[13];
      newActions[11] = action[12];
    }
    return newActions;
  });

const MainTable = ({ isAftlitePortal }) => {
  const actions = getActions();
  const uniquePackActions = filterUniquePackActions(actions, isAftlitePortal);
  const [newActions, setNewActions] = React.useState(transferToNewActions(uniquePackActions, isAftlitePortal));

  const header = e(TableHeader, { key: 'main-table-header' });
  const rows = newActions.map((action, i, allActions) => e(ActionRow, { action, i, allActions, key: action[8] }));

  React.useEffect(() => {
    newActions.map((na) => {
      const pickListId = na[10];
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

const TableSwitch = ({ isOriginalTable, setIsOriginalTable }) => {
  const handleTableChange = () => setIsOriginalTable((prev) => !prev);
  return e(
    'form',
    null,
    e('input', {
      type: 'checkbox',
      checked: isOriginalTable,
      onChange: handleTableChange,
    }),
    ' Show original table'
  );
};

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
