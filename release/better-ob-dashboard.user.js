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
  URL.PICKLIST_BY_STATE = ''
  SELECTOR.PICKLIST_TR = ''
  SELECTOR.TIME_TH = ''
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
}

let now = new Date()

waitForElm(SELECTOR.TIME_TH).then(() => betterDashboard())

function betterDashboard() {
  changeTitles(getNewTitles(now.getHours()))
  doRefresh()

  setInterval(() => {
    now = new Date()
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
    setData(data[0], STATE.DROP)
    setData(data[1], STATE.ASSIGN)
    setData(data[2], STATE.PICK)
    setData(data[3], STATE.PACK)
    setData(data[4], STATE.SLAM)
    setData(data[5], STATE.PSOLVE)
    setData(data[6], STATE.GENERATED)
    const totalData = data.reduce((arr, x) => arr.concat(x), [])
    setTotal(totalData)
    if (now.getMinutes() === 0) {
      changeTitles(getNewTitles(now.getHours()))
    }
  })
  // getPicklistData(STATE.DROP).then((data) => setData(data, STATE.DROP))
  // getPicklistData(STATE.ASSIGN).then((data) => setData(data, STATE.ASSIGN))
  // getPicklistData(STATE.PICK).then((data) => setData(data, STATE.PICK))
  // getPicklistData(STATE.PACK).then((data) => setData(data, STATE.PACK))
  // getPicklistData(STATE.SLAM).then((data) => setData(data, STATE.SLAM))
  // getPicklistData(STATE.PSOLVE).then((data) => setData(data, STATE.PSOLVE))
  // getPicklistData(STATE.HOLD).then((data) => setData(data, STATE.GENERATED))
}

const diffMin = (t1, t2) => Math.ceil((t1 - t2) / 60000)

function setTotal(data) {
  const rows = [...document.querySelectorAll(SELECTOR.DASHBOARD_TR)]
    .map((row) => [...row.children].slice(1, 5))
    .filter((row) => [...row[0].classList].join().includes('total'))
    .map((row) => row.slice(1))

  const zones = ['ambient', 'bigs', 'chilled', 'frozen', 'produce']
  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i]
    const dataByZone = data.filter((d) => d.zone === zone)
    const data0 = dataByZone.filter((d) => diffMin(d.pullTime, now) > 0 && diffMin(d.pullTime, now) <= 60)
    const data1 = dataByZone.filter((d) => diffMin(d.pullTime, now) > 60 && diffMin(d.pullTime, now) <= 120)
    const data2 = dataByZone.filter((d) => diffMin(d.pullTime, now) > 120 && diffMin(d.pullTime, now) <= 180)

    const items0 = data0.reduce((acc, d) => acc + parseInt(d.items, 10), 0)
    const items1 = data1.reduce((acc, d) => acc + parseInt(d.items, 10), 0)
    const items2 = data2.reduce((acc, d) => acc + parseInt(d.items, 10), 0)

    const content0 = items0 ? `${items0} (${data0.length})` : 0
    const content1 = items1 ? `${items1} (${data1.length})` : 0
    const content2 = items2 ? `${items2} (${data2.length})` : 0

    const row = rows[i]
    row[0].innerHTML = content0
    row[1].innerHTML = content1
    row[2].innerHTML = content2

    row.forEach((cell) => {
      if (cell.textContent !== '0') {
        cell.classList.remove('obd-alt-bg')
        cell.classList.add(`obd-data-total`)
      } else {
        cell.classList.add('obd-alt-bg')
        cell.classList.remove(`obd-data-total`)
      }
    })
  }
}

function setData(data, state) {
  const rows = [...document.querySelectorAll(SELECTOR.DASHBOARD_TR)]
    .map((row) => [...row.children].slice(1, 5))
    .filter((row) => [...row[0].classList].join().includes(state))
    .map((row) => row.slice(1))

  const zones =
    state === STATE.GENERATED ? ['chilled', 'frozen', 'produce'] : ['ambient', 'bigs', 'chilled', 'frozen', 'produce']

  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i]
    const dataByZone = data.filter((d) => d.zone === zone)
    const data0 = dataByZone.filter((d) => diffMin(d.pullTime, now) > 0 && diffMin(d.pullTime, now) <= 60)
    const data1 = dataByZone.filter((d) => diffMin(d.pullTime, now) > 60 && diffMin(d.pullTime, now) <= 120)
    const data2 = dataByZone.filter((d) => diffMin(d.pullTime, now) > 120 && diffMin(d.pullTime, now) <= 180)

    const items0 = data0.reduce((acc, d) => acc + parseInt(d.items, 10), 0)
    const items1 = data1.reduce((acc, d) => acc + parseInt(d.items, 10), 0)
    const items2 = data2.reduce((acc, d) => acc + parseInt(d.items, 10), 0)

    let [content0, content1, content2] = [0, 0, 0]
    if (state === STATE.PSOLVE) {
      content0 = data0.length
      content1 = data1.length
      content2 = data2.length
    } else {
      content0 = items0 ? `${items0} (${data0.length})` : 0
      content1 = items1 ? `${items1} (${data1.length})` : 0
      content2 = items2 ? `${items2} (${data2.length})` : 0
    }

    const row = rows[i]
    row[0].innerHTML = ''
    row[0].append(content0 ? aTag(content0, zone, state, '0,60') : content0)
    row[1].innerHTML = ''
    row[1].append(content1 ? aTag(content1, zone, state, '60,120') : content1)
    row[2].innerHTML = ''
    row[2].append(content2 ? aTag(content2, zone, state, '120,180') : content2)

    row.forEach((cell) => {
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
