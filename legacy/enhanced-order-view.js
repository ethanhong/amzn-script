/* global QRCode */
// ==UserScript==
// @name         Enhance Order View
// @namespace    https://github.com/ethanhong/amzn-script
// @version      1.1
// @description  enhance order view
// @author       Pei
// @match        https://aftlite-na.amazon.com/wms/view_order/*
// @match        https://aftlite-na.amazon.com/wms/view_order
// @require      https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js
// @grant        GM_addStyle
// ==/UserScript==

const SELECTOR = {
  pickLists: '#picklists_table',
  totesTable: 'body > table > tbody > tr > td > table > tbody > tr > td',
}
const allSpoo = []
const allTracking = []
const allItemNo = []

let qrcode
;(() => {
  // grab tote info
  const allTotes = document.querySelectorAll(SELECTOR.totesTable)

  // categorize tote info, (Spoo, tracking, number of items)
  allTotes.forEach((tote) => {
    const info = tote.innerText.split(/[\n:]+/)
    allSpoo.push(info[0])
    allTracking.push(info[2])
    allItemNo.push(info[3])
  })

  // clone the table of picklists
  const myTable = document.querySelector(SELECTOR.pickLists).cloneNode(true)
  myTable.setAttribute('id', 'myTable')

  // manipulate myTable
  // get rows
  const { rows } = myTable

  // remove useless attributes in th
  for (let j = 0; j < rows[0].cells.length; j += 1) {
    rows[0].cells[j].removeAttribute('width')
    rows[0].cells[j].removeAttribute('align')
  }

  // modify some header text
  rows[0].cells[0].textContent = 'Picklist'
  rows[0].cells[1].textContent = 'Zone'
  rows[0].cells[3].textContent = 'Totes'
  rows[0].cells[4].textContent = 'Picker'

  // remove and insert data
  for (let i = 0; i < rows.length; i += 1) {
    // remove unwanted columns
    rows[i].deleteCell(6)
    rows[i].deleteCell(5)

    // add useful columns
    let newCell
    const spooIndex = allSpoo.indexOf(rows[i].cells[3].textContent.trim())
    if (spooIndex === -1) {
      // add Tracking code
      newCell = rows[i].insertCell(3)
      newCell.outerHTML = '<th>Tracking</th>'
      // add number of items
      newCell = rows[i].insertCell(-1) // last column
      newCell.outerHTML = '<th></th>'
    } else {
      // add Tracking code
      newCell = rows[i].insertCell(3)
      const normalText = allTracking[spooIndex].slice(0, -4)
      const boldText = allTracking[spooIndex].slice(-4)
      newCell.innerHTML = `${normalText}<b>${boldText}</b>`
      newCell.addEventListener(
        'click',
        () => {
          makeQRCode(allTracking[spooIndex])
        },
        false
      )
      // add number of items
      newCell = rows[i].insertCell(-1) // last column
      newCell.appendChild(document.createTextNode(allItemNo[spooIndex]))
    }

    // remove link from spoo number
    if (i > 0) {
      // skip header
      const spooCell = rows[i].cells[4]
      const spooAnchorElement = spooCell.firstElementChild
      const spooTextNode = document.createTextNode(spooAnchorElement.textContent)
      spooAnchorElement.textContent = '[open]'
      spooAnchorElement.style.marginLeft = '5px'
      spooCell.insertBefore(spooTextNode, spooAnchorElement)

      // add click to generate qrcode function
      spooCell.addEventListener(
        'click',
        () => {
          makeQRCode(spooTextNode.nodeValue)
        },
        false
      )
    }
  }

  // create a container for qrcode
  const qr = document.createElement('div')
  qr.setAttribute('id', 'qrcode_container')

  // create a div showing qr_text and append to qrcode_container
  const qrText = document.createElement('div')
  qrText.setAttribute('id', 'qr_text')

  // create a container for qrcode_container + qr_text
  const qrcodeWithText = document.createElement('div')
  qrcodeWithText.setAttribute('id', 'qrcode_with_text')
  qrcodeWithText.appendChild(qr)
  qrcodeWithText.appendChild(qrText)

  // put whole container into body
  const b = document.body
  b.insertBefore(document.createElement('br'), b.childNodes[4])
  b.insertBefore(document.createElement('br'), b.childNodes[4])
  b.insertBefore(qrcodeWithText, b.childNodes[4])
  b.insertBefore(myTable, b.childNodes[4])
})()

function makeQRCode(str) {
  // console.log('make code: ', str);
  if (qrcode === undefined) {
    qrcode = new QRCode(document.getElementById('qrcode_container'), {
      text: str,
      width: 250,
      height: 250,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    })
  } else {
    qrcode.makeCode(str)
  }
  document.getElementById('qr_text').innerText = str
}

// --------------------------- CSS --------------------------- //
// eslint-disable-next-line no-undef
GM_addStyle(`
  html, body {
      margin-left:10px;
  }

  #myTable {
    display: inline-block;
    border-collapse: collapse;
    font-family: monospace;
    font-size: 18px;
    margin-right: 100px;
    vertical-align: top;
  }

  #myTable tr:nth-child(odd) {
    background-color: whitesmoke;
  }

  #myTable tr:hover {
    background-color: lightgrey;
  }

  #myTable tr th {
    background-color: whitesmoke;
    padding: 12px;
    text-align: center;
  }

  #myTable tr td {
    padding: 12px;
  }

  #qrcode_with_text {
    display: inline-block;
    font-family: monospace;
    vertical-align: top;
  }
`)
