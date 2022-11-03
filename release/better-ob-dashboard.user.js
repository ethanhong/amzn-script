/* eslint-disable prefer-destructuring */
/* eslint-disable no-loop-func */
// ==UserScript==
// @name         Better Outbound Dashboard
// @namespace    https://github.com/ethanhong/amzn-tools/tree/main/release
// @version      1.0.1
// @description  A better outbound dashboard
// @author       Pei
// @match        https://aftlite-portal.amazon.com/ojs/OrchaJSFaaSTCoreProcess/OutboundDashboard
// @updateURL    https://ethanhong.github.io/amzn-tools/release/better-ob-dashboard.user.js
// @downloadURL  https://ethanhong.github.io/amzn-tools/release/better-ob-dashboard.user.js
// @supportURL   https://github.com/ethanhong/amzn-tools/issues
// ==/UserScript==

const isPortal = window.location.hostname === 'aftlite-portal.amazon.com'
const URL = {}
const SELECTOR = {}

if (isPortal) {
  URL.PICKLIST_BY_STATE = '/list_picklist/view_picklists?state='
  SELECTOR.PICKLIST_TR = 'tbody > tr:not(tr:first-child)'
  SELECTOR.TIME_TH = 'tbody:nth-child(1) > tr > th'
  SELECTOR.DASHBOARD_TR = 'table > tbody:nth-child(2) > tr:not(tr:first-child)'
} else {
  // TODO: na URL, SELECTOR
  URL.PICKLIST_BY_STATE = '/wms/view_picklists?state='
  SELECTOR.PICKLIST_TR = '#wms_orders_in_state > tbody > tr'
  SELECTOR.TIME_TH = '#cpt_table > thead > tr > th'
  SELECTOR.DASHBOARD_TR = ''
}

const STATE = {
  DROP: 'dropped',
  ASSIGN: 'assigned',
  PICK: 'picking',
  PACK: 'packed',
  SLAM: 'slammed',
  PSOLVE: 'problem-solve',
  HOLD: 'generated,hold',
  GENERATED: 'generated',
  TOTAL: 'total',
}

let now = new Date()

waitForElm(SELECTOR.TIME_TH).then(() => betterDashboard())

function betterDashboard() {
  doRefresh()
  setInterval(() => {
    doRefresh()
  }, 30000)
}

function doRefresh() {
  Promise.all([
    getPicklistData(STATE.DROP),
    getPicklistData(STATE.ASSIGN),
    getPicklistData(STATE.PICK),
    getPicklistData(STATE.PACK),
    getPicklistData(STATE.SLAM),
    getPicklistData(STATE.PSOLVE),
    getPicklistData(STATE.HOLD),
  ]).then((data) => {
    now = new Date()
    setData(data[0], STATE.DROP)
    setData(data[1], STATE.ASSIGN)
    setData(data[2], STATE.PICK)
    setData(data[3], STATE.PACK)
    setData(data[4], STATE.SLAM)
    setData(data[5], STATE.PSOLVE)
    setData(data[6], STATE.GENERATED)
    const totalData = data.reduce((result, x) => result.concat(x), [])
    setData(totalData, STATE.TOTAL)
    changeTitles(getNewTitles(now.getHours()))
    flashCells()
  })
}

const diffMin = (t1, t2) => Math.ceil((t1 - t2) / 60000)

function dimCells() {
  ;[...document.querySelectorAll(SELECTOR.DASHBOARD_TR)]
    .map((row) => [...row.children].slice(2, 5))
    .map((row) => row.map((cell) => cell.classList.add('obd-dim')))
}

function unDimCells() {
  ;[...document.querySelectorAll(SELECTOR.DASHBOARD_TR)]
    .map((row) => [...row.children].slice(2, 5))
    .map((row) => row.map((cell) => cell.classList.remove('obd-dim')))
}

function flashCells() {
  dimCells()
  setTimeout(() => unDimCells(), 500)
}

function setData(data, state) {
  const rows = [...document.querySelectorAll(SELECTOR.DASHBOARD_TR)]
    .map((row) => [...row.children].slice(1, 5))
    .filter((row) => [...row[0].classList].join().includes(state))
    .map((row) => row.slice(1))

  const timeTable = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 5, 6]
  const zones =
    state === STATE.GENERATED ? ['chilled', 'frozen', 'produce'] : ['ambient', 'bigs', 'chilled', 'frozen', 'produce']

  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i]
    const currentHour = now.getHours()
    const startTimeIdx = currentHour > 22 || currentHour < 5 ? 0 : timeTable.indexOf(currentHour)

    const dataByZone = data.filter((d) => d.zone === zone)
    const dataByPullTime = Array(3)
    for (let j = 0; j < dataByPullTime.length; j += 1) {
      dataByPullTime[j] = dataByZone.filter((d) => d.pullTime.getHours() === timeTable[startTimeIdx + 1 + j])
    }

    const items = dataByPullTime.map((d) => d.reduce((acc, x) => acc + parseInt(x.items, 10), 0))

    let content = []
    if (state === STATE.PSOLVE) {
      content = dataByPullTime.map((d) => d.length)
    } else {
      content = items.map((item, idx) => (item ? `${item} (${dataByPullTime[idx].length})` : 0))
    }

    const timeFrames = Array(3)
    for (let j = 0; j < timeFrames.length; j += 1) {
      const timeIdx = startTimeIdx + 1 + j
      const pullTime = new Date(now)
      pullTime.setHours(timeTable[timeIdx])
      pullTime.setMinutes(15)
      pullTime.setSeconds(0)
      let timeDiff = diffMin(pullTime, now)
      timeDiff = timeDiff > 0 ? timeDiff : timeDiff + 24 * 60
      timeFrames[j] = `${Math.max(timeDiff - 60, 0)},${timeDiff}`
    }

    const row = rows[i]
    row.forEach((cell, j) => {
      cell.removeChild(cell.firstChild)
      cell.append(content[j] ? aTag(content[j], zone, state, timeFrames[j]) : content[j])
      if (cell.textContent !== '0') {
        cell.classList.remove('obd-alt-bg')
        cell.classList.add(`obd-data-${state}`)
      } else {
        cell.classList.add('obd-alt-bg')
        cell.classList.remove(`obd-data-${state}`)
      }
    })
  }
}

function aTag(content, zone, state, timeFrame) {
  const elm = document.createElement('a')
  elm.setAttribute('href', `/list_picklist/view_picklists?zone=${zone}&type=&state=${state}&cpt=${timeFrame}`)
  elm.setAttribute('target', '_obd')
  elm.textContent = content
  return elm
}

async function getPicklistData(state) {
  const res = await fetch(URL.PICKLIST_BY_STATE + state)
  const txt = await res.text()
  const html = new DOMParser().parseFromString(txt, 'text/html')
  const picklists = [...html.querySelectorAll(SELECTOR.PICKLIST_TR)]
  // aftlite-portal
  if (isPortal) {
    return picklists
      .map((pl) => [...pl.querySelectorAll('td')])
      .map((pl) => pl.map((td) => td.textContent))
      .map((pl) => ({ zone: pl[3], items: pl[5], pullTime: new Date(pl[7]) }))
  }
  // aftlite-na
  return picklists
    .map((pl) => [...pl.querySelectorAll('td')])
    .map((pl) => pl.map((td) => td.textContent.trim()))
    .map((pl) => ({ zone: pl[3], items: pl[6], pullTime: new Date(pl[8]) }))
}

function getNewTitles(startHr) {
  const timeTable = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 5, 6, 7, 8, 9, 10]
  const index = startHr > 22 || startHr < 5 ? 0 : timeTable.indexOf(startHr)
  return timeTable.splice(index + 1, 3).map((h) => `0${h}:00`.slice(-5))
}

function changeTitles(titles) {
  const titleThs = [...document.querySelectorAll(SELECTOR.TIME_TH)].splice(isPortal ? 2 : 3, titles.length)
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
