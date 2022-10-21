// ==UserScript==
// @name         Ultimate Order View
// @namespace    https://github.com/ethanhong/amzntools-src/tree/release
// @version      2.1.3
// @description  Show an integrated and functional table in order view page
// @author       Pei
// @match        https://aftlite-na.amazon.com/wms/view_order*
// @match        https://aftlite-portal.amazon.com/orders/view_order_details*
// @updateURL    https://ethanhong.github.io/amzn-tools/release/ultimate-order-view.user.js
// @downloadURL  https://ethanhong.github.io/amzn-tools/release/ultimate-order-view.user.js
// @supportURL   https://github.com/ethanhong/amzn-tools/issues
// @require      https://unpkg.com/react@18/umd/react.production.min.js
// @require      https://unpkg.com/react-dom@18/umd/react-dom.production.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js
// ==/UserScript==

/* global React */
/* global ReactDOM */
/* global QRCode */

const e = React.createElement

// eslint-disable-next-line no-unused-vars
;(function ultimateOrderView() {
  const isAftlitePortal = window.location.hostname === 'aftlite-portal.amazon.com'
  const rootDiv = document.createElement('div')
  if (isAftlitePortal) {
    document.querySelector('#main-content > div').after(rootDiv)
  } else {
    document.querySelector('#orders_form').before(rootDiv)
  }
  ReactDOM.createRoot(rootDiv).render(e(App))
  addCSS()
})()

function getBags() {
  const isAftlitePortal = window.location.hostname === 'aftlite-portal.amazon.com'
  const picklistsTableRows = isAftlitePortal
    ? [...document.querySelectorAll('#main-content > table:nth-child(20) > tbody > tr')]
    : [...document.querySelectorAll('#picklists_table > tbody > tr')]
  picklistsTableRows.shift() // drop header row

  const rowContents = picklistsTableRows.map((row) => row.outerText.trim().split(/\s+/))
  return rowContents.map((content) => {
    const bag = {}
    ;[bag.id, bag.zone, bag.status, bag.spoo, bag.pickerLogin] = content
    bag.pickerUrl = `/labor_tracking/lookup_history?user_name=${bag.pickerLogin}`
    bag.packUrl = isAftlitePortal
      ? `/picklist/pack_by_picklist?picklist_id=${bag.id}`
      : `/wms/pack_by_picklist?picklist_id=${bag.id}`
    bag.code = getBagCode(bag.spoo, isAftlitePortal)
    bag.totalItem = getBagTotalItem(bag.spoo, isAftlitePortal)
    return bag
  })
}

function isValidCode(str) {
  try {
    return Boolean(str.match(/[a-z,A-z,0-9]{20}/))
  } catch (error) {
    return false
  }
}

function getBagCode(spoo, isAftlitePortal) {
  if (!isValidCode(spoo)) {
    return '-'
  }

  let contents = '-'
  const spooLink = [...document.querySelectorAll('a')].find((node) => node.textContent === spoo)
  try {
    ;[, contents] = isAftlitePortal
      ? spooLink.parentNode.parentNode.childNodes[1].textContent.trim().split(/\s+/)
      : spooLink.parentNode.childNodes[5].textContent.trim().split(/\s+/)
  } catch (error) {
    // do nothing
  }
  return isValidCode(contents) ? contents : '-'
}

function getBagTotalItem(spoo, isAftlitePortal) {
  if (!isValidCode(spoo)) {
    return '-'
  }

  let contents = '-'
  const spooLink = [...document.querySelectorAll('a')].find((node) => node.textContent === spoo)
  try {
    contents = isAftlitePortal
      ? spooLink.parentNode.parentNode.childNodes[2].textContent.trim().split(/\s+/)
      : spooLink.parentNode.childNodes[7].textContent.trim().split(/\s+/)
  } catch (error) {
    // do nothing
  }
  return contents[0] || '-'
}

function BagRow({ bag, isTarget, isRelated, setQRCodeContent }) {
  const [completionTime, setCompletionTime] = React.useState('-')

  const handleOnClick = (event) => {
    const node = event.target.nodeName === 'TD' ? event.target : event.target.parentNode
    const value = node.innerText
    if (isValidCode(value)) {
      setQRCodeContent(value)
    }
  }

  React.useEffect(() => {
    const isAftlitePortal = window.location.hostname === 'aftlite-portal.amazon.com'
    const url = isAftlitePortal
      ? '/picklist/view_picklist_history?picklist_id='
      : '/wms/view_picklist_history?picklist_id='
    const completionTimeSelector = isAftlitePortal ? 'div.a-row:nth-child(10)' : 'tr:nth-child(6)'

    return fetch(`${url}${bag.id}`)
      .then((res) => res.text())
      .then((txt) => new DOMParser().parseFromString(txt, 'text/html'))
      .then((html) => html.querySelector(completionTimeSelector).textContent.match(/\d{1,2}:\d{1,2}/))
      .then((cTime) => (cTime ? setCompletionTime(cTime) : null))
      .catch((err) => console.log('[Completion Time Fetch Fail]\n', err))
  }, [])

  const rowCells = [
    e('td', null, bag.id),
    e('td', null, bag.zone),
    e('td', null, bag.status),
    e('td', null, completionTime),
    e(
      'td',
      { onClick: handleOnClick },
      isValidCode(bag.code) ? e('span', null, [bag.code.slice(0, -4), e('b', null, bag.code.slice(-4))]) : bag.code
    ),
    e('td', { onClick: handleOnClick }, bag.spoo),
    e('td', null, e('a', { href: bag.pickerUrl }, `${bag.pickerLogin}`)),
    e('td', null, `${bag.totalItem} items`),
    e('td', null, e('a', { href: bag.packUrl }, 'Pack')),
  ]

  const classVal = [isTarget ? 'target-bag' : '', isRelated ? 'related-bag' : ''].join(' ').trim()
  return e('tr', { className: classVal }, rowCells)
}

function isTargetBag(bag, searchTerm) {
  const key = searchTerm.toUpperCase()
  const bagCode = bag.code.toUpperCase()
  const bagSpoo = bag.spoo.toUpperCase()
  return key && (bagCode.includes(key) || bagSpoo.includes(key))
}

function isRelatedBag(currentBag, searchTerm, allBags) {
  const targetBag = allBags.find((b) => isTargetBag(b, searchTerm))
  if (!targetBag) return false
  if (targetBag.zone === 'bigs') return false // no need to mark related for bigs item
  return targetBag.pickerLogin === currentBag.pickerLogin && targetBag.zone === currentBag.zone
}

function BagTable({ searchTerm, setQRCodeContent }) {
  const headers = ['ID', 'Zone', 'Status', 'Completion Time', 'Tracking Code', 'Spoo', 'Picker', 'Total Items', '']
  const headerRow = e(
    'tr',
    null,
    headers.map((header) => e('th', null, header))
  )

  const bagRows = getBags().map((bag, _, allBags) =>
    e(BagRow, {
      bag,
      isTarget: isTargetBag(bag, searchTerm),
      isRelated: isRelatedBag(bag, searchTerm, allBags),
      setQRCodeContent,
      key: bag.id,
    })
  )
  return e('table', { id: 'bag-table' }, [e('thead', null, headerRow), e('tbody', null, bagRows)])
}

function makeQRCode(str) {
  return new QRCode(document.querySelector('#qrcode-container'), {
    text: str,
    width: 160,
    height: 160,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H,
  })
}

function QRCodeArea({ qrcodeContent }) {
  const qrcodeContainer = e('div', { id: 'qrcode-container' })
  const qrcodeText = e('div', { id: 'qrcode-text' }, qrcodeContent)
  return e('div', { id: 'qrcode-area' }, [qrcodeContainer, qrcodeText])
}

function SearchBar({ setSearchTerm }) {
  const inputRef = React.useRef(null)

  const handleOnChange = () => setSearchTerm(inputRef.current.value)

  React.useEffect(() => {
    inputRef.current.focus()
  }, [])

  return e('form', null, [
    e('input', {
      id: 'search_input',
      type: 'search',
      placeholder: 'Search by tracking-code or spoo',
      size: '30',
      ref: inputRef,
      onChange: handleOnChange,
      style: { lineHeight: '1.5rem' },
    }),
  ])
}

function UltimateTable({ searchTerm }) {
  const [qrcodeContent, setQRCodeContent] = React.useState('')
  const [qrcodeMaker, setQRcodeMaker] = React.useState(null)

  React.useEffect(() => {
    if (!qrcodeContent) return
    if (!qrcodeMaker) {
      setQRcodeMaker(makeQRCode(qrcodeContent))
    } else {
      qrcodeMaker.makeCode(qrcodeContent)
    }
  }, [qrcodeContent])

  const bagTable = e(BagTable, { searchTerm, setQRCodeContent })
  const qrcodeArea = e(QRCodeArea, { qrcodeContent })
  return e('div', { id: 'ultimateTable-container' }, [bagTable, qrcodeArea])
}

function App() {
  const [searchTerm, setSearchTerm] = React.useState('')
  return e('div', null, [e(SearchBar, { setSearchTerm }), e(UltimateTable, { searchTerm })])
}

function addCSS() {
  const styles = `
    :root,
    body,
    html {
      box-sizing: border-box;
    }
    
    div,
    table,
    thead,
    tbody,
    tr,
    th,
    td,
    a {
      margin: 0;
      padding: 0;
      border: 0;
      outline: none;
      font-size: 100%;
      vertical-align: baseline;
      background: transparent;
    }
    
    #ultimateTable-container {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      margin: 0.5rem 0 1rem 0;
    }
    
    #bag-table {
      flex-shrink: 0;
      border-collapse: collapse;
      font-size: 1rem;
      color: #101010;
      margin-right: 1rem;
      margin-bottom: 0.5rem;
      border: 1px solid #888;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    }
    
    #bag-table th {
      background-color: #e8e8e8;
      padding: 0.6rem;
      text-align: center;
      vertical-align: middle;
    }
    
    #bag-table td {
      font-family: monospace;
      padding: 0.8rem 1rem;
      text-align: center;
      vertical-align: middle;
    }
    
    #bag-table tbody tr:hover {
      background-color: #ccc;
    }
    
    #qrcode-text {
      width: 100%;
      font-size: 0.8rem;
      line-height: 1.2rem;
      text-align: center;
      font-family: monospace;
    }
    
    tr.target-bag {
      border: 2px solid firebrick;
    }
    tr.related-bag {
      background-color: rgb(34, 77, 23, 10%) !important;
    }
  `

  const styleSheet = document.createElement('style')
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
}
