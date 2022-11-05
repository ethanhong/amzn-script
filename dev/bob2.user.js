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
const TIME_TH = '#cpt_table > thead > tr > th'
const PICKLIST_BY_STATE = '/wms/view_picklists?state='

// portal
// const TIME_TH = 'tbody:nth-child(1) > tr > th'
// const PICKLIST_BY_STATE = '/list_picklist/view_picklists?state='

const ANY_CELL_SELECTOR = 'any > cell > selector'

function aTag(content, zone, state, timeFrame) {
  const elm = document.createElement('a')
  elm.setAttribute('href', `${PICKLIST_BY_STATE}${state}&zone=${zone}&type=&cpt=${timeFrame}`)
  elm.setAttribute('target', '_obd')
  elm.textContent = content
  return elm
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
  anyCell.removeChild(anyCell.firstChild)
  anyCell.append(aTag(123, 'ambient', 'dropped', '64,89'))
  // ------------- check code above
}

waitForElm(TIME_TH).then(() => test())
