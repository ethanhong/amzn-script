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

const addCSSNa = () => {
  const styles = `
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
    // .late-window {
    //   background-color: rgb(255, 85, 94, 10%) !important;
    // }
    // .current-window {
    //   background-color: rgb(255, 233, 129, 10%) !important;
    // }
    // .next-window {
    //   background-color: rgb(139, 241, 139, 10%) !important;
    // }
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
  const styleSheet = document.createElement('style');
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
};

const addCSSPortal = () => {
  const styles = `
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
    // .late-window {
    //   background-color: rgb(255, 85, 94, 10%) !important;
    // }
    // .current-window {
    //   background-color: rgb(255, 233, 129, 10%) !important;
    // }
    // .next-window {
    //   background-color: rgb(139, 241, 139, 10%) !important;
    // }
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
  const styleSheet = document.createElement('style');
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
};

const getUniquePackActions = () => {
  const isAftlitePortal = window.location.hostname === 'aftlite-portal.amazon.com';
  const dataArray = [];
  const pickedSpoo = [];
  const isPicked = spoo => pickedSpoo.includes(spoo);
  const actionRows = [...document.querySelectorAll('#main-content > table > tbody > tr')];
  actionRows.shift(); // remove header
  actionRows.map(row => {
    const rowData = [...row.querySelectorAll('td')].map(cell => cell.textContent.trim());
    const [action, tool] = [rowData[1], rowData[2]];
    const spoo = isAftlitePortal ? rowData[9] : rowData[10];
    if (action === 'pack' && tool === 'pack' && !isPicked(spoo)) {
      pickedSpoo.push(spoo);
      dataArray.push(rowData);
    }
    return null;
  });
  return dataArray;
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
  const tableHeaders = titles.map(title =>
    e('th', { className: 'a-text-center', style: { whiteSpace: 'pre-line' }, key: title }, title)
  );
  return e('tr', null, tableHeaders);
};

const getPackageInfo = async pickListId => {
  const isAftlitePortal = window.location.hostname === 'aftlite-portal.amazon.com';
  const fetchURL = isAftlitePortal
    ? '/picklist/view_picklist_history?picklist_id='
    : '/wms/view_picklist_history?picklist_id=';
  const statusSelector = isAftlitePortal
    ? 'div.a-row:nth-child(6)'
    : 'table:nth-child(6) tr:nth-child(2)';
  const completionTimeSelector = isAftlitePortal ? 'div.a-row:nth-child(10)' : 'tr:nth-child(6)';
  const cptSelector = isAftlitePortal ? 'div.a-row:nth-child(12)' : 'tr:nth-child(8)';
  const orderIdSelector = isAftlitePortal ? 'div.a-row:nth-child(2)' : 'tr:nth-child(2)';

  const timeRe = /\d{1,2}:\d{1,2}/;
  const statusRe = /\(([\w-]+)\)/;
  const orderIdRe = /\d{7}/;

  return fetch(`${fetchURL}${pickListId}`)
    .then(res => res.text())
    .then(page => {
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
    .catch(err => {
      console.log('[getPackgeInfo]Fetch error: ', err);
      return Array(4).fill('-');
    });
};

const getTimeStyle = cpt => {
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

const getPsolveStyle = status => (['problem-solve', 'skipped'].includes(status) ? 'p-solve' : '');

const ActionRow = ({ rowData, i, allcompletionTime, setAllcompletionTime, allTopBorderClass }) => {
  const [cpt, setCPT] = React.useState('');
  const [packageStatus, setPackageStatus] = React.useState('');
  const [orderID, setOrderID] = React.useState('');
  const [style, setStyle] = React.useState('');
  const rowDataClone = [...rowData];
  const isAftlitePortal = window.location.hostname === 'aftlite-portal.amazon.com';
  if (isAftlitePortal) {
    rowDataClone[3] = e('span', { className: 'monospace' }, rowData[3]);
    rowDataClone[5] = packageStatus;
    rowDataClone[6] = allcompletionTime[i];
    rowDataClone[7] = cpt;
    rowDataClone[8] = e('div', null, [
      e('span', { className: 'spoo-dot' }),
      e('span', { className: 'monospace' }, rowData[9]),
    ]);
    rowDataClone[9] = orderID ? e('a', { href: `/orders/view_order?id=${orderID}` }, orderID) : '-';
    rowDataClone[10] = e(
      'a',
      { href: `/picklist/pack_by_picklist?picklist_id=${rowData[12]}` },
      rowData[12]
    );
    rowDataClone[11] = rowData[11];

    rowDataClone.splice(-1);
  } else {
    rowDataClone[3] = e('span', { className: 'monospace' }, rowData[3]);
    rowDataClone[5] = packageStatus;
    rowDataClone[6] = allcompletionTime[i];
    rowDataClone[7] = cpt;
    rowDataClone[8] = e('div', null, [
      e('span', { className: 'spoo-dot' }),
      e('span', { className: 'monospace' }, rowData[10]),
    ]);
    rowDataClone[9] = orderID ? e('a', { href: `/wms/view_order?id=${orderID}` }, orderID) : '-';
    rowDataClone[10] = e('a', { href: `/wms/view_order?id=${rowData[13]}` }, rowData[13]);
    rowDataClone[11] = rowData[12];
    rowDataClone.splice(-2);
  }

  const rowCells = rowDataClone.map((cellData, index) =>
    e('td', { className: 'a-text-center', key: index }, cellData)
  );

  React.useEffect(() => {
    const pickListId = rowData[12];
    getPackageInfo(pickListId).then(packageInfo => {
      setAllcompletionTime(prev =>
        prev.map((preValue, j) => (j === i ? packageInfo[0] : preValue))
      );
      setCPT(packageInfo[1]);
      setPackageStatus(packageInfo[2]);
      setOrderID(packageInfo[3]);
      setStyle(`${getTimeStyle(packageInfo[1])} ${getPsolveStyle(packageInfo[2])}`);
    });
  }, []);

  return e('tr', { className: `${style} ${allTopBorderClass[i]} table-side-border` }, rowCells);
};

const MainTable = () => {
  const allPackActions = getUniquePackActions();
  const [allcompletionTime, setAllcompletionTime] = React.useState(
    Array(allPackActions.length).fill('')
  );
  const [allTopBorderClass, setAllTopBorderClass] = React.useState(
    Array(allPackActions.length).fill('')
  );
  const header = e(TableHeader, { key: 'main-table-header' });
  const rows = allPackActions.map((rowData, i) =>
    e(ActionRow, {
      rowData,
      i,
      allcompletionTime,
      setAllcompletionTime,
      allTopBorderClass,
      key: rowData[9],
    })
  );

  React.useEffect(() => {
    for (let i = 0; i < allcompletionTime.length; i += 1) {
      let topAttr;
      if (i === 0) {
        topAttr = 'table-top-border';
      } else {
        topAttr = allcompletionTime[i] !== allcompletionTime[i - 1] ? 'table-top-border' : '';
      }
      setAllTopBorderClass(prev => prev.map((value, j) => (j === i ? topAttr : value)));
    }
  }, [allcompletionTime]);

  return e(
    'table',
    { id: 'main-table', className: 'a-bordered a-spacing-top-large reportLayout' },
    e('tbody', null, [header, ...rows])
  );
};

const TableSwitch = ({ isOriginalTable, setIsOriginalTable }) => {
  const handleTableChange = () => setIsOriginalTable(prev => !prev);
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

const App = () => {
  const [isOriginalTable, setIsOriginalTable] = React.useState(false);
  const mainTable = e(MainTable, { key: 'main-table' });
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

  const rootDiv = document.createElement('div');
  if (isAftlitePortal) {
    addCSSPortal();
  } else {
    document.querySelector('div.resultSet').setAttribute('id', 'main-content');
    addCSSNa();
  }

  document.querySelector('#main-content > table').before(rootDiv);
  ReactDOM.createRoot(rootDiv).render(e(App));
};
