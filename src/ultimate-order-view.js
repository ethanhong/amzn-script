// ==UserScript==
// @name         Ultimate Order View
// @namespace    https://github.com/ethanhong/amzntools-src/tree/release
// @version      2.0.1
// @description  Show an integrated and functional table in order view page
// @author       Pei
// @match        https://aftlite-na.amazon.com/wms/view_order*
// @updateURL    https://ethanhong.github.io/amzntools-src/ultimate-order-view.user.js
// @downloadURL  https://ethanhong.github.io/amzntools-src/ultimate-order-view.user.js
// @supportURL   https://github.com/ethanhong/amzntools-src/issues
// @require      https://unpkg.com/react@18/umd/react.production.min.js
// @require      https://unpkg.com/react-dom@18/umd/react-dom.production.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js
// ==/UserScript==

/* global React */
/* global ReactDOM */
/* global QRCode */

const e = React.createElement
const SearchContext = React.createContext()
const QRCodeContext = React.createContext()

// eslint-disable-next-line no-unused-vars
;(function ultimateOrderView() {
  const rootDiv = document.createElement('div')
  document.querySelector('#orders_form').before(rootDiv)
  ReactDOM.createRoot(rootDiv).render(e(App))
  addCSS()
})()

function getBags() {
  const bags = []

  const picklistsTableRows = [...document.querySelectorAll('#picklists_table > tbody > tr')]
  picklistsTableRows.shift() // drop header row

  const rowContents = picklistsTableRows.map((row) => row.textContent.trim().split(/\s+/))
  const packUrls = picklistsTableRows.map((row) => row.querySelector('td:last-child > a'))

  for (let i = 0; i < rowContents.length; i += 1) {
    const bag = {}
    bag.picker = {}
    ;[bag.id, bag.zone, bag.status, bag.spoo, bag.pickerLogin] = rowContents[i]
    bag.pickerUrl = `/labor_tracking/lookup_history?user_name=${bag.pickerLogin}`
    bag.packUrl = packUrls[i].href
    bag.code = getBagCode(bag.spoo)
    bag.totalItem = getBagTotalItem(bag.spoo)
    bag.completionTime = '-'
    bags.push(bag)
  }
  return bags
}

function isValidCode(str) {
  return Boolean(str.match(/[a-z,A-z,0-9]{20}/))
}

function getBagCode(spoo) {
  if (!isValidCode(spoo)) {
    return '-'
  }
  const spooLink = [...document.querySelectorAll('a')].find((node) => node.textContent === spoo)
  const contents = spooLink.parentNode.childNodes[5].textContent.trim().split(/\s+/)
  return contents[1] || '-'
}

function getBagTotalItem(spoo) {
  if (!isValidCode(spoo)) {
    return '-'
  }
  const spooLink = [...document.querySelectorAll('a')].find((node) => node.textContent === spoo)
  const contents = spooLink.parentNode.childNodes[7].textContent.trim().split(/\s+/)
  return contents[0] || '-'
}

function BagRow({ bag, allBags }) {
  const { searchTerm } = React.useContext(SearchContext)
  const { setQRCodeContent } = React.useContext(QRCodeContext)

  const handleOnClick = (event) => {
    const node = event.target.nodeName === 'TD' ? event.target : event.target.parentNode
    const value = node.innerText
    if (isValidCode(value)) {
      setQRCodeContent(value)
    }
  }

  const formattedCode = isValidCode(bag.code)
    ? e('span', null, [bag.code.slice(0, -4), e('b', null, bag.code.slice(-4))])
    : bag.code
  const pickerLik = e('a', { href: bag.pickerUrl }, `${bag.pickerLogin}`)
  const packLink = e('a', { href: bag.packUrl }, 'Pack')

  const rowCells = [
    e('td', null, bag.id),
    e('td', null, bag.zone),
    e('td', null, bag.status),
    e('td', null, bag.completionTime),
    e('td', { onClick: handleOnClick }, formattedCode),
    e('td', { onClick: handleOnClick }, bag.spoo),
    e('td', null, pickerLik),
    e('td', null, `${bag.totalItem} items`),
    e('td', null, packLink),
  ]

  const relatedClass = isRelatedBag(bag, searchTerm, allBags) ? 'related-bag' : ''
  const targetClass = isTargetBag(bag, searchTerm) ? 'target-bag' : ''

  return e('tr', { className: `${targetClass} ${relatedClass}` }, rowCells)
}

function containsKeyword(str, keyword) {
  return str.indexOf(keyword) > -1
}

function isTargetBag(bag, searchTerm) {
  const keyword = searchTerm.toUpperCase()
  const bagCode = bag.code.toUpperCase()
  const bagSpoo = bag.spoo.toUpperCase()
  return keyword && (containsKeyword(bagCode, keyword) || containsKeyword(bagSpoo, keyword))
}

function isRelatedBag(currentBag, searchTerm, allBags) {
  const targetBag = allBags.find((b) => isTargetBag(b, searchTerm))
  if (!targetBag) return false
  if (targetBag.zone === 'bigs') return false // no need to mark related for bigs item
  return targetBag.pickerLogin === currentBag.pickerLogin && targetBag.zone === currentBag.zone
}

function BagTable() {
  const headers = ['ID', 'Zone', 'Status', 'Completion Time', 'Tracking Code', 'Spoo', 'Picker', 'Total Items', '']
  const headerRow = e(
    'tr',
    null,
    headers.map((header) => e('th', null, `${header}`))
  )
  const [bags, setBags] = React.useState(getBags())

  React.useEffect(() => {
    for (let i = 0; i < bags.length; i += 1) {
      const bag = bags[i]
      const fetchURL = '/wms/view_picklist_history?picklist_id='
      fetch(`${fetchURL}${bag.id}`)
        .then((res) => res.text())
        .then((page) => {
          const html = new DOMParser().parseFromString(page, 'text/html')
          const completionTime = html.querySelector('tr:nth-child(6)').textContent.match(/\d{1,2}:\d{1,2}/)
          return completionTime
        })
        .then((cTime) => {
          setBags((prevArray) => {
            const newBag = prevArray[i]
            newBag.completionTime = cTime
            return [...prevArray.slice(0, i), newBag, ...prevArray.slice(i + 1)]
          })
        })
    }
  }, [])

  const bagRows = bags.map((bag, i, allBags) => e(BagRow, { bag, allBags, key: i }))
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
      type: 'text',
      placeholder: 'Search by tracking-code or spoo',
      size: '30',
      ref: inputRef,
      onChange: handleOnChange,
      style: { lineHeight: '1.5rem' },
    }),
  ])
}

function UltimateTable() {
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

  const bagTable = e(
    QRCodeContext.Provider,
    {
      value: { qrcodeContent, setQRCodeContent },
    },
    e(BagTable)
  )
  const qrcodeArea = e(QRCodeArea, { qrcodeContent })
  return e('div', { id: 'ultimateTable-container' }, [bagTable, qrcodeArea])
}

function App() {
  const [searchTerm, setSearchTerm] = React.useState('')
  return e(SearchContext.Provider, { value: { searchTerm, setSearchTerm } }, [
    e(SearchBar, { setSearchTerm }),
    e(UltimateTable),
  ])
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
