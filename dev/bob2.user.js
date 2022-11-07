// ==UserScript==
// @name         bob2
// @namespace    https://github.com/ethanhong/amzn-tools/tree/main/release
// @version      1.0.0
// @description  A better outbound dashboard
// @author       Pei
// @match        https://aftlite-portal.amazon.com/ojs/OrchaJSFaaSTCoreProcess/OutboundDashboard
// @match        https://aftlite-na.amazon.com/outbound_dashboard/index
// @supportURL   https://github.com/ethanhong/amzn-tools/issues
// ==/UserScript==

// na
const LAST_CELL = 'table#cpt_table > tbody > tr:nth-child(6) > td.pickers-col'
const PICKLIST_BY_STATE = '/wms/view_picklists?state='

const ANY_CELL_SELECTOR = '#cpt_table > tbody > tr:nth-child(2) > td:nth-child(4) > '

function aTag(content, zone, state, timeFrame) {
  const a = document.createElement('a')
  a.setAttribute('href', `${PICKLIST_BY_STATE}${state}&zone=${zone}&type=&cpt=${timeFrame}`)
  a.setAttribute('target', '_obd')

  const div = document.createElement('div')
  div.setAttribute('class', `status ${state}`)
  div.textContent = content

  a.append(div)

  return a
}

function waitForElm(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      resolve(document.querySelector(selector))
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector))
        observer.disconnect()
      }
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  })
}

function test() {
  const anyCell = document.querySelector(ANY_CELL_SELECTOR)

  // ------------- check code below
  anyCell.innerHTML = ''
  anyCell.append(aTag(123, 'ambient', 'dropped', '64,89'))
  // ------------- check code above
}

waitForElm(LAST_CELL).then(() => test())
