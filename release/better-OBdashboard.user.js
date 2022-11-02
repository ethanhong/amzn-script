// ==UserScript==
// @name         Better Outbound Dashboard
// @namespace    https://github.com/ethanhong/amzn-tools/tree/main/release
// @version      1.0.1
// @description  A better outbound dashboard
// @author       Pei
// @match        https://aftlite-portal.amazon.com/ojs/OrchaJSFaaSTCoreProcess/OutboundDashboard
// ==/UserScript==

const isPortal = window.location.hostname === 'aftlite-portal.amazon.com'
const URL = {}
const SELECTOR = {}

if (isPortal) {
  URL.PICKLIST_BY_STATE = '/list_picklist/view_picklists?state='
  SELECTOR.TIME_TH = 'tbody:nth-child(1) > tr > th'
  SELECTOR.PICKLIST_TR = 'tbody > tr:not(tr:first-child)'
} else {
  URL.PICKLIST_BY_STATE = ''
  SELECTOR.TIME_TH = ''
}

waitForElm(SELECTOR.TIME_TH).then(() => betterDashboard())

function betterDashboard() {
  const now = new Date()
  const titles = getNewTitles(now.getHours())
  changeTitles(titles)

  getPicklistData('dropped').then((data) => console.log(data))
}

async function getPicklistData(state) {
  const res = await fetch(URL.PICKLIST_BY_STATE + state)
  const txt = await res.text()
  const html = new DOMParser().parseFromString(txt, 'text/html')
  const picklists = [...html.querySelectorAll(SELECTOR.PICKLIST_TR)]
  const data = picklists
    .map((pl) => [...pl.querySelectorAll('td')])
    .map((pl) => pl.map((td) => td.textContent))
    .map((pl) => ({ zone: pl[3], items: pl[5], pullTime: new Date(new Date(pl[7]) - 15 * 60000) }))
  return data
}

function getNewTitles(startHr) {
  const timeTable = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 5, 6, 7, 8, 9, 10]
  const index = startHr > 22 || startHr < 5 ? 0 : timeTable.indexOf(startHr)
  return timeTable.splice(index + 1, 3).map((h) => `0${h}:00`.slice(-5))
}

function changeTitles(titles) {
  const titleThs = [...document.querySelectorAll(SELECTOR.TIME_TH)].splice(2, titles.length)
  for (let i = 0; i < titleThs.length; i += 1) {
    titleThs[i].textContent = titles[i]
  }
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
