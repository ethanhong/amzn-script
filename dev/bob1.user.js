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

const LAST_CELL = 'table#cpt_table > tbody > tr:nth-child(6) > td.pickers-col'
const DASHBOARD_TR = '#cpt_table > tbody > tr'

function getTargetCells() {
  const rows = [...document.querySelectorAll(DASHBOARD_TR)]
  return rows.map((row) => [...row.children].slice(1, 6))
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
  const rows = getTargetCells()
  console.log('Rows with cell 1-5', rows)

  let filteredRows = rows.filter((row) => row[0].textContent.includes('dropped')).map((row) => row.slice(2))
  console.log('Filtered: [dropped]', filteredRows)
  filteredRows = rows.filter((row) => row[0].textContent.includes('assigned')).map((row) => row.slice(2))
  console.log('Filtered: [assigned]', filteredRows)
  filteredRows = rows.filter((row) => row[0].textContent.includes('picking')).map((row) => row.slice(2))
  console.log('Filtered: [picking]', filteredRows)
  filteredRows = rows.filter((row) => row[0].textContent.includes('packed')).map((row) => row.slice(2))
  console.log('Filtered: [packed]', filteredRows)
  filteredRows = rows.filter((row) => row[0].textContent.includes('slammed')).map((row) => row.slice(2))
  console.log('Filtered: [slammed]', filteredRows)
  filteredRows = rows.filter((row) => row[0].textContent.includes('problem-solve')).map((row) => row.slice(2))
  console.log('Filtered: [problem-solve]', filteredRows)
  filteredRows = rows.filter((row) => row[0].textContent.includes('total')).map((row) => row.slice(2))
  console.log('Filtered: [total]', filteredRows)
  filteredRows = rows.filter((row) => row[0].textContent.includes('Restricted window')).map((row) => row.slice(2))
  console.log('Filtered: [Restricted window]', filteredRows)
}

waitForElm(LAST_CELL).then(() => test())
