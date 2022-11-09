/* eslint-disable no-promise-executor-return */
// ==UserScript==
// @name         Better Outbound Dashboard [na]
// @namespace    https://github.com/ethanhong/amzn-tools/tree/main/release
// @version      1.0.1
// @description  A better outbound dashboard
// @author       Pei
// @match        https://aftlite-na.amazon.com/outbound_dashboard/index
// @updateURL    https://ethanhong.github.io/amzn-tools/release/better-ob-dashboard-na.user.js
// @downloadURL  https://ethanhong.github.io/amzn-tools/release/better-ob-dashboard-na.user.js
// @supportURL   https://github.com/ethanhong/amzn-tools/issues
// ==/UserScript==

const SAVED_NUMBER_OF_PULLTIME = parseInt(localStorage.getItem('numberOfPulltimeCol'), 10)
const NUMBER_OF_PULLTIME = Number.isNaN(SAVED_NUMBER_OF_PULLTIME) ? 4 : SAVED_NUMBER_OF_PULLTIME // 0-8

const URL = {
  PICKLIST_BY_STATE: '/wms/view_picklists?state=',
}

const SELECTOR = {
  PICKLIST_TR: '#wms_orders_in_state > tbody > tr',
  TIME_TH: '#cpt_table > thead > th',
  DASHBOARD_TR: '#cpt_table > tbody > tr:not(tr:first-child)',
  ELEMENT_TO_OBSERVE: '#cpt_table > tbody',
  HEAD: '',
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

waitForElm(SELECTOR.TIME_TH).then(() => betterDashboard())

async function betterDashboard() {
  setTitles(getPullHours())
  const data = await getAllData()
  setAllData(data)
}

function setAllData(data) {
  setData(data[0], STATE.GENERATED)
  setData(data[1], STATE.DROP)
  setData(data[2], STATE.ASSIGN)
  setData(data[3], STATE.PICK)
  setData(data[4], STATE.PACK)
  setData(data[5], STATE.SLAM)
  setData(data[6], STATE.PSOLVE)
  const totalData = data.reduce((result, x) => result.concat(x), [])
  setData(totalData, STATE.TOTAL)
}

function setData(rawData, state) {
  console.log(state, rawData)
}

function setDataTemp(rawData, state) {
  const zones = ['ambient', 'bigs', 'chilled', 'frozen', 'produce']
  const rows = [...document.querySelectorAll(SELECTOR.DASHBOARD_TR)]
  if (state === STATE.GENERATED) {
    zones.splice(0, 2) // remove first 2 elements
    rows.splice(0, 2) // remove first 2 elements
  }

  // prepare cells to place data
  const filteredRows = rows.map(
    (tr) => [...tr.children].slice(3, 3 + NUMBER_OF_PULLTIME) // remove zone, state, and total
  )

  // prepare raw data
  const pullHours = getPullHours()
  const dataByPullTime = pullHours.map((hr) => rawData.filter((d) => d.pullTime.getHours() === hr))

  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i]
    const dataByZone = dataByPullTime.map((data) => data.filter((d) => d.zone === zone))
    const items = dataByZone.map((d) => d.reduce((acc, x) => acc + parseInt(x.items, 10), 0))

    let content = []
    if (state === STATE.PSOLVE) {
      content = dataByZone.map((d) => d.length)
    } else {
      content = items.map((item, idx) => (item ? `${item} (${dataByZone[idx].length})` : 0))
    }

    const timeDiffInMin = (t1, t2) => Math.ceil((t1 - t2) / 60000)
    const timeFrames = pullHours.map((hr) => {
      const pullTime = new Date()
      pullTime.setHours(hr)
      pullTime.setMinutes(15)
      pullTime.setSeconds(0)
      let timeDiff = timeDiffInMin(pullTime, new Date())
      timeDiff = timeDiff > 0 ? timeDiff : timeDiff + 24 * 60
      return `${Math.max(timeDiff - 60, 0)},${timeDiff}`
    })

    filteredRows[i].map((cell, j) => {
      // remove all elements not from us
      ;[...cell.childNodes].filter((elm) => !elm.className.includes('bod-node')).map((elm) => elm.remove())
      // append our elements
      const newElement =
        timeFrames[j] === 0 ? createZeroElement() : createLinkElement(content[j], zone, state, timeFrames[j])
      cell.append(newElement)
      return cell
    })
  }
}

function createZeroElement() {
  const div = document.createElement('div')
  div.classList.add('bod-node')
  div.classList.add('status')
  div.textContent = 0
}

function createLinkElement(content, zone, state, timeFrame) {
  const a = document.createElement('a')
  if (state === STATE.GENERATED) {
    a.setAttribute('href', `${URL.PICKLIST_BY_STATE}${STATE.HOLD}&zone=${zone}&cpt=${timeFrame}`)
  } else {
    a.setAttribute('href', `${URL.PICKLIST_BY_STATE}${state}&zone=${zone}&cpt=${timeFrame}`)
  }
  a.setAttribute('target', '_blank')

  const div = document.createElement('div')
  div.classList.add('bod-node')
  div.classList.add('status')
  div.classList.add('state')
  div.textContent = content

  a.append(div)
  return a
}

async function getAllData() {
  return Promise.all([
    getData(STATE.HOLD),
    getData(STATE.DROP),
    getData(STATE.ASSIGN),
    getData(STATE.PICK),
    getData(STATE.PACK),
    getData(STATE.SLAM),
    getData(STATE.PSOLVE),
  ])
}

async function getData(state) {
  const res = await fetch(URL.PICKLIST_BY_STATE + state)
  const txt = await res.text()
  const html = new DOMParser().parseFromString(txt, 'text/html')
  const picklists = [...html.querySelectorAll(SELECTOR.PICKLIST_TR)]
  return picklists
    .map((pl) => [...pl.querySelectorAll('td')])
    .map((pl) => pl.map((td) => td.textContent))
    .map((pl) => ({ zone: pl[3], items: pl[6], pullTime: new Date(pl[8]) }))
}

function setTitles(pullHours) {
  const titles = pullHours.map((h) => `0${h}:00`.slice(-5))
  const titleThs = [...document.querySelectorAll(SELECTOR.TIME_TH)].splice(2, titles.length)
  for (let i = 0; i < titleThs.length; i += 1) {
    titleThs[i].textContent = titles[i]
  }
}

function getPullHours() {
  const timeTable = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 5, 6, 7, 8, 9, 10, 11, 12]
  const currentHour = new Date().getHours()
  const startTimeIdx = currentHour > 22 || currentHour < 5 ? 0 : timeTable.indexOf(currentHour) + 1
  return timeTable.slice(startTimeIdx, startTimeIdx + NUMBER_OF_PULLTIME)
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
