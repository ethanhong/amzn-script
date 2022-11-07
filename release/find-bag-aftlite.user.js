// ==UserScript==
// @name         Find Bags [aftlite]
// @namespace    https://github.com/ethanhong/amzn-tools/tree/main/release
// @version      2.2.2
// @description  Find a missing bag by giving you the scannable codes of its sibling bags
// @author       Pei
// @match        https://aftlite-portal.amazon.com/labor_tracking/lookup_history?user_name=*
// @match        https://aftlite-na.amazon.com/labor_tracking/lookup_history?user_name=*
// @updateURL    https://ethanhong.github.io/amzn-tools/release/find-bag-aftlite.user.js
// @downloadURL  https://ethanhong.github.io/amzn-tools/release/find-bag-aftlite.user.js
// @supportURL   https://github.com/ethanhong/amzn-tools/issues
// @require      https://unpkg.com/react@18/umd/react.production.min.js
// @require      https://unpkg.com/react-dom@18/umd/react-dom.production.min.js
// ==/UserScript==

/* global React */
/* global ReactDOM */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-alert */

const e = React.createElement

startBagFinder()

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
  `
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
  `
  return isAftlitePortal ? stylePortal : styleNA
}

function getActions(table) {
  const [, ...actionRows] = [...table.querySelectorAll('tbody > tr')] // exclude header
  const getTdTextContents = (tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim())
  return actionRows.map(getTdTextContents)
}

function TableHeader({ titles }) {
  const getHeaderComp = (t) => e('th', { className: 'a-text-center', key: t }, t)
  const tableHeaders = titles.map(getHeaderComp)
  return e('tr', null, tableHeaders)
}

function toMilitaryFormat(str) {
  if (!str) return '-'
  let hh = parseInt(str.slice(0, 2), 10)
  const mm = str.slice(3, 5)
  const ampm = str.slice(-2)
  if (!['AM', 'PM'].includes(ampm)) return str

  if (hh === 12) hh = 0
  if (ampm === 'PM') hh += 12

  hh = `0${hh.toString()}`.slice(-2)

  return `${hh}:${mm}`
}

async function getPackageInfo(pickListId, isAftlitePortal, abortController) {
  if (!pickListId) return Array(4).fill('')
  // url and selectors
  const fetchURL = isAftlitePortal
    ? '/picklist/view_picklist_history?picklist_id='
    : '/wms/view_picklist_history?picklist_id='
  const statusSelector = isAftlitePortal ? 'div.a-row:nth-child(6)' : 'table:nth-child(6) tr:nth-child(2)'
  const completionTimeSelector = isAftlitePortal ? 'div.a-row:nth-child(10) h5' : 'tr:nth-child(6) > td:nth-child(2)'
  const cptSelector = isAftlitePortal ? 'div.a-row:nth-child(12) h5' : 'tr:nth-child(8) > td:nth-child(2)'
  const orderIdSelector = isAftlitePortal ? 'div.a-row:nth-child(2)' : 'tr:nth-child(2)'
  // define re
  const statusRe = /\(([\w-]+)\)/
  const orderIdRe = /\d{7}/

  try {
    const response = await fetch(`${fetchURL}${pickListId}`, { signal: abortController.signal })
    const text = await response.text()
    const html = new DOMParser().parseFromString(text, 'text/html')
    const packageInfo = []

    // extract completion time
    const completionTime = html.querySelector(completionTimeSelector).textContent.trim().split(' ')[1]
    packageInfo[0] = toMilitaryFormat(completionTime)
    // extract CPT
    const cpt = html.querySelector(cptSelector).textContent.trim().split(' ')[1]
    packageInfo[1] = toMilitaryFormat(cpt)
    // extract status
    const status = html.querySelector(statusSelector).textContent.match(statusRe)
    packageInfo[2] = status ? status[1] : '-'
    // extract orderId
    const orderId = html.querySelector(orderIdSelector).textContent.match(orderIdRe)
    packageInfo[3] = orderId ? orderId[0] : '-'
    return packageInfo
  } catch (err) {
    console.log('[getPackgeInfo]Fetch error: ', err)
    return Array(4).fill('-')
  }
}

function getTimeStyle(timeStamp, cpt, currentTime) {
  if (!timeStamp || !cpt) return ''

  const lateWindow = (currentTime.getHours() + 1) % 24
  const currentWindow = (currentTime.getHours() + 2) % 24
  const nextWindow = (currentTime.getHours() + 3) % 24

  const startHour = parseInt(cpt.split(':')[0], 10)
  if (startHour === lateWindow) return 'late-window'
  if (startHour === currentWindow) return 'current-window'
  if (startHour === nextWindow) return 'next-window'
  return ''
}

function ActionRow({ action, info, isFirstPackage, isAftlitePortal }) {
  const orderviewUrl = isAftlitePortal ? '/orders/view_order?id=' : '/wms/view_order/'
  const picklistUrl = isAftlitePortal ? '/picklist/pack_by_picklist?picklist_id=' : '/wms/pack_by_picklist?picklist_id='

  const newAction = action.map((ele, i) => {
    if (i === 3) return e('span', { className: 'monospace' }, ele)
    if (i === 5) return info[2]
    if (i === 6) return info[0]
    if (i === 7) return info[1]
    if (i === 8)
      return e('div', null, [e('span', { className: 'spoo-dot' }), e('span', { className: 'monospace' }, ele)])
    if (i === 9) return e('a', { href: `${orderviewUrl}${info[3]}` }, info[3])
    if (i === 10) return e('a', { href: `${picklistUrl}${ele}` }, ele)
    return ele
  })

  const psolveStyle = newAction[5] === 'problem-solve' ? 'p-solve' : ''
  const timeWindowStyle = getTimeStyle(newAction[0], newAction[7], new Date())
  const topBorderStyle = isFirstPackage ? 'table-top-border' : ''
  const cells = newAction.map((cell, index) => e('td', { className: 'a-text-center', key: index }, cell))
  return e('tr', { className: `${psolveStyle} ${timeWindowStyle} ${topBorderStyle}` }, cells)
}

function mapToNewAction(isAftlitePortal) {
  // convert old table data in to new table
  return (action) => {
    const newAction = []
    if (isAftlitePortal) {
      newAction[0] = action[0]
      newAction[1] = action[1]
      newAction[2] = action[2]
      newAction[3] = action[3]
      newAction[4] = action[4]
      newAction[5] = '' // status
      newAction[6] = '' // completion time
      newAction[7] = '' // cpt
      newAction[8] = action[9]
      newAction[9] = '' // orderId
      newAction[10] = action[12]
      newAction[11] = action[11]
    } else {
      newAction[0] = action[0]
      newAction[1] = action[1]
      newAction[2] = action[2]
      newAction[3] = action[3]
      newAction[4] = action[4]
      newAction[5] = '' // status
      newAction[6] = '' // completion time
      newAction[7] = '' // cpt
      newAction[8] = action[10]
      newAction[9] = '' // orderId
      newAction[10] = action[13]
      newAction[11] = action[12]
    }
    return newAction
  }
}

async function doSerialRecursion(array, fn, startIndex) {
  if (!array[startIndex]) return []
  const currResult = await fn(array[startIndex], startIndex, array)
  return [currResult, ...(await doSerialRecursion(array, fn, startIndex + 1))]
}

async function fetchTrackCode(actionToFetch, setProgress, isAftlitePortal) {
  const orderUrl = isAftlitePortal ? '/orders/view_order?id=' : '/wms/view_order/'
  const codes = await doSerialRecursion(
    actionToFetch,
    async (action, i) => {
      const url = `${orderUrl}${action[9]}`
      const spoo = action[8]
      // start fetching
      const [currResult] = await fetch(url)
        .then((response) => response.text())
        .then((text) => text.slice(text.indexOf(spoo) + 20, text.indexOf(spoo) + 80).match(/[\w\d]{20}/) || [])
      // set progress percentage
      const fetchPercentage = ((i + 1) / actionToFetch.length) * 100
      setProgress(fetchPercentage % 100 ? fetchPercentage.toFixed(1) : fetchPercentage) // no decimal point when 0 and 100

      return currResult
    },
    0
  )
  return codes.filter((x) => Boolean(x)) // remove empty, ex: problem bags or not yet slammed bags
}

function getActionToFetch(searchTerm) {
  const allActions = getActions(document.querySelector('#main-table'))

  const isSearchTarget = (action) => action[8] === searchTerm
  const [targetAction] = allActions.filter(isSearchTarget)

  const isRelated = (action) => action[6] === targetAction[6] && action[7] === targetAction[7] // same completion time && same cpt
  const isNotSearchTarget = (action) => !isSearchTarget(action)
  const relatedActions = allActions.filter(isRelated).filter(isNotSearchTarget) // excludes target itself

  return [targetAction, ...relatedActions]
}

function SearchBar({ isAftlitePortal }) {
  const [progress, setProgress] = React.useState(-1)
  const searchInputRef = React.useRef(null)
  const searchBtnRef = React.useRef(null)

  const handleOnClick = async () => {
    if (!searchInputRef.current.value) return
    // start fetching
    setProgress(0)
    searchBtnRef.current.disabled = true
    const actionToFetch = getActionToFetch(searchInputRef.current.value)
    const scannableId = await fetchTrackCode(actionToFetch, setProgress, isAftlitePortal)
    searchBtnRef.current.disabled = false
    // display result
    if (scannableId.length <= 1) {
      alert('No related bags found.')
    } else {
      setTimeout(() => {
        prompt(
          `Found ${scannableId.length - 1} related bags.\nCopy and paste the relust into COMO for locations.`,
          scannableId
        )
        setProgress(-1)
      }, 100)
    }
  }

  const searchForm = e('form', { id: 'search-form' }, [
    e('input', {
      id: 'search-input',
      type: 'search',
      placeholder: 'Search bags ...',
      size: '30',
      ref: searchInputRef,
    }),
    e('input', {
      id: 'search-btn',
      type: 'button',
      value: 'Search',
      onClick: handleOnClick,
      ref: searchBtnRef,
    }),
    e('span', { id: 'loading-text' }, ' Loading data ...'),
    progress < 0 ? '' : ` Analyzing ... ${progress} %`,
  ])

  return e('div', { id: 'search-bar' }, [searchForm])
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
  ]

  const isPack = (action) => action[1] === 'pack'
  const isIndirect = (action) => action[2] === 'indirect'
  const isLatestSpoo = (currAction, _, allActions) => {
    const spooIdx = isAftlitePortal ? 9 : 10
    const firstMatch = allActions.find((x) => x[spooIdx] === currAction[spooIdx])
    return !firstMatch[spooIdx] || firstMatch === currAction
  }
  const newActions = getActions(oldTable)
    .filter((action) => isPack(action) || isIndirect(action))
    .filter(isLatestSpoo)
    .map(mapToNewAction(isAftlitePortal))

  const [infos, setInfos] = React.useState(Array(newActions.length).fill(Array(4).fill('')))
  React.useEffect(() => {
    const searchBtn = document.querySelector('#search-btn')
    searchBtn.disabled = true
    const abortController = new AbortController()
    Promise.all(
      newActions.map((action, i) => {
        if (diffHours(new Date(), new Date(action[0])) > 12) {
          return null
        }
        return getPackageInfo(action[10], isAftlitePortal, abortController).then((info) =>
          setInfos((prev) => [...prev.slice(0, i), info, ...prev.slice(i + 1)])
        )
      })
    ).then(() => {
      searchBtn.disabled = false
      document.querySelector('#loading-text').textContent = ''
      return null
    })
    return () => abortController.abort()
  }, [])

  const searchBar = e(SearchBar, { isAftlitePortal, key: 'search-bar' })
  const header = e(TableHeader, { titles, key: 'main-table-header' })
  const rows = newActions.map((action, i) => {
    const isFirstPackage = !i || infos[i][0] !== infos[i - 1][0]
    return e(ActionRow, { action, info: infos[i], isFirstPackage, isAftlitePortal, key: action[8] })
  })
  const newTable = e(
    'table',
    { id: 'main-table', className: 'a-bordered a-spacing-top-large reportLayout' },
    e('tbody', null, [header, ...rows])
  )
  return e('div', null, [searchBar, newTable])
}

function diffHours(dt2, dt1) {
  return Math.abs(Math.floor((dt2.getTime() - dt1.getTime()) / 1000 / 60 / 60))
}

function TableSwitch({ isOriginalTable, setIsOriginalTable }) {
  return e('form', null, [
    e('input', {
      type: 'checkbox',
      checked: isOriginalTable,
      onChange: () => setIsOriginalTable((prev) => !prev),
    }),
    ' Show original table',
  ])
}

function App({ oldTable, isAftlitePortal }) {
  const [isOriginalTable, setIsOriginalTable] = React.useState(false)
  const mainTable = e(MainTable, { oldTable, isAftlitePortal, key: 'main-table' })
  const tableSwitch = e(TableSwitch, { isOriginalTable, setIsOriginalTable, key: 'table-switch' })

  React.useEffect(() => {
    const originalTable = document.querySelector('#main-content > table')
    const newTable = document.querySelector('#main-table')
    originalTable.style.display = isOriginalTable ? 'table' : 'none'
    newTable.style.display = isOriginalTable ? 'none' : 'table'
  }, [isOriginalTable])

  return e(React.Fragment, null, [tableSwitch, mainTable])
}

// eslint-disable-next-line no-unused-vars
function startBagFinder() {
  const isAftlitePortal = window.location.hostname === 'aftlite-portal.amazon.com'

  // add stylesheet
  const styleSheet = document.createElement('style')
  styleSheet.innerText = getCSS(isAftlitePortal)
  document.head.appendChild(styleSheet)

  // add id for original table for easier access
  if (!isAftlitePortal) {
    document.querySelector('div.resultSet').setAttribute('id', 'main-content')
  }

  // mount app
  const rootDiv = document.createElement('div')
  const oldTable = document.querySelector('#main-content > table')
  oldTable.before(rootDiv)
  ReactDOM.createRoot(rootDiv).render(e(App, { oldTable, isAftlitePortal }))
}
