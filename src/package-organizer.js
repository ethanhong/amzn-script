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

const e = React.createElement;

const addCSS = () => {
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
    .late-window {
      background-color: rgb(255, 85, 94, 10%) !important;
    }
    .current-window {
      background-color: rgb(255, 233, 129, 10%) !important;
    }
    .next-window {
      background-color: rgb(139, 241, 139, 10%) !important;
    }
    .p-solve {
      color: firebrick;
    }
  `;
  const styleSheet = document.createElement('style');
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
};

const getUniquePackActions = () => {
  const dataArray = [];
  const pickedSpoo = [];
  const isPicked = spoo => pickedSpoo.includes(spoo);

  const actionRows = [...document.querySelectorAll('#main-content > table > tbody > tr')];
  actionRows.shift(); // remove header

  actionRows.map(row => {
    const rowData = [...row.querySelectorAll('td')].map(cell => cell.textContent.trim());
    const [action, tool, spoo] = [rowData[1], rowData[2], rowData[9]];
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
    'Order ID',
    'User',
    'Picklist \n ID',
  ];
  const tableHeaders = titles.map(title =>
    e('th', { className: 'a-text-center', style: { whiteSpace: 'pre-line' }, key: title }, title)
  );
  return e('tr', null, tableHeaders);
};

const getPackgeInfo = async pickListId => {
  const isAftliteNa = window.location.hostname === 'aftlite-na.amazon.com';
  const fetchURL = isAftliteNa
    ? '/wms/view_picklist_history?picklist_id='
    : '/picklist/view_picklist_history?picklist_id=';
  const statusSelector = isAftliteNa
    ? 'body > table:nth-child(6) > tbody > tr:nth-child(2)'
    : 'div.a-row:nth-child(6)';
  const completionTimeSelector = isAftliteNa
    ? 'body > table:nth-child(6) > tbody > tr:nth-child(6)'
    : 'div.a-row:nth-child(10)';
  const cptSelector = isAftliteNa
    ? 'body > table:nth-child(6) > tbody > tr:nth-child(8)'
    : 'div.a-row:nth-child(12)';
  const orderIdSelector = isAftliteNa
    ? 'body > table:nth-child(6) > tbody > tr:nth-child(8)' // to-do
    : 'div.a-row:nth-child(2)';

  const timeRe = /\d{1,2}:\d{1,2}/;
  const statusRe = /\(([\w-]+)\)/;
  const orderIdRe = /\d{7}/;

  return fetch(`${fetchURL}${pickListId}`)
    .then(res => res.text())
    .then(page => {
      const packageInfo = Array(4);
      const html = new DOMParser().parseFromString(page, 'text/html');

      // extract completion time
      let matchedValue = html.querySelector(completionTimeSelector).textContent.match(timeRe);
      packageInfo[0] = matchedValue ? matchedValue[0] : '-';
      // extract CPT
      matchedValue = html.querySelector(cptSelector).textContent.match(timeRe);
      packageInfo[1] = matchedValue ? matchedValue[0] : '-';
      // extract status
      matchedValue = html.querySelector(statusSelector).textContent.match(statusRe);
      packageInfo[2] = matchedValue ? matchedValue[1] : '-';
      // extract orderId
      matchedValue = html.querySelector(orderIdSelector).textContent.match(orderIdRe);
      packageInfo[3] = matchedValue ? matchedValue[0] : '-';

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
  rowDataClone.splice(5, 1); // remove 'FromQuantity' colunms
  rowDataClone[5] = packageStatus;
  rowDataClone[6] = allcompletionTime[i];
  rowDataClone[7] = cpt;

  const isAftliteNa = window.location.hostname === 'aftlite-na.amazon.com';
  const orderViewUrl = isAftliteNa ? '/wms/view_order?id=' : '/orders/view_order?id=';
  rowDataClone[9] = orderID ? e('a', { href: `${orderViewUrl}${orderID}` }, orderID) : '-';

  const packPicklistUrl = isAftliteNa
    ? '/wms/view_order?id=' // todo
    : '/picklist/pack_by_picklist?picklist_id=';
  rowDataClone[11] = e('a', { href: `${packPicklistUrl}${rowData[12]}` }, rowData[12]);

  const rowCells = rowDataClone.map((cellData, index) =>
    e('td', { className: 'a-text-center', key: index }, cellData)
  );

  React.useEffect(() => {
    const pickListId = rowData[12];
    getPackgeInfo(pickListId).then(packageInfo => {
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
    { id: 'main-table', className: 'a-bordered a-spacing-top-large' },
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
  const rootDiv = document.createElement('div');
  document
    .querySelector('#main-content')
    .insertBefore(rootDiv, document.querySelector('#main-content > table'));

  ReactDOM.createRoot(rootDiv).render(e(App));

  addCSS();
};
