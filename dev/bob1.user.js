// ==UserScript==
// @name         bob1
// @namespace    https://github.com/ethanhong/amzn-tools/tree/main/release
// @version      1.0.0
// @description  A better outbound dashboard
// @author       Pei
// @match        https://aftlite-portal.amazon.com/ojs/OrchaJSFaaSTCoreProcess/OutboundDashboard
// @match        https://aftlite-na.amazon.com/outbound_dashboard/index
// @supportURL   https://github.com/ethanhong/amzn-tools/issues
// ==/UserScript==

const TIME_TH = '#cpt_table > thead > tr > th'
const DASHBOARD_TR = '#cpt_table > tbody:nth-child(2) > tr' // na

// const TIME_TH = 'tbody:nth-child(1) > tr > th'
// const DASHBOARD_TR = 'table > tbody:nth-child(2) > tr:not(tr:first-child)' // portal

function getTargetCells(withZone = false) {
  // ------------- check code below
  return withZone
    ? [...document.querySelectorAll(DASHBOARD_TR)].map((row) => [...row.children].slice(1, 5))
    : [...document.querySelectorAll(DASHBOARD_TR)].map((row) => [...row.children].slice(2, 5))
  // ------------- check code above
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
  getTargetCells()
  const rows = getTargetCells()
  const rowsWithTitle = getTargetCells(true)
  console.log(rows)
  console.log(rowsWithTitle)
  console.log([...rowsWithTitle[0][0].classList])
  console.log([...rowsWithTitle[1][0].classList])
  console.log([...rowsWithTitle[2][0].classList])
  console.log([...rowsWithTitle[3][0].classList])
  console.log([...rowsWithTitle[4][0].classList])
  console.log([...rowsWithTitle[5][0].classList])
  console.log([...rowsWithTitle[6][0].classList])
}

waitForElm(TIME_TH).then(() => test())
