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
const NUMBER_OF_PULLTIME = Number.isNaN(SAVED_NUMBER_OF_PULLTIME) ? 4 : SAVED_NUMBER_OF_PULLTIME

const URL = {
  PICKLIST_BY_STATE: '/wms/view_picklists?state=',
}

const SELECTOR = {
  PICKLIST_TR: '#wms_orders_in_state > tbody > tr',
  TIME_TH: 'tbody:nth-child(1) > tr > th',
  DASHBOARD_TR: '#cpt_table > thead > th',
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
  setData(data[0], STATE.DROP)
  setData(data[1], STATE.ASSIGN)
  setData(data[2], STATE.PICK)
  setData(data[3], STATE.PACK)
  setData(data[4], STATE.SLAM)
  setData(data[5], STATE.PSOLVE)
  setData(data[6], STATE.GENERATED)
  // const totalData = data.reduce((result, x) => result.concat(x), [])
  // setData(totalData, STATE.TOTAL)
}

function setData(rawData, state) {
  console.log(state, rawData)
}

async function getAllData() {
  return Promise.all([
    getData(STATE.DROP),
    getData(STATE.ASSIGN),
    getData(STATE.PICK),
    getData(STATE.PACK),
    getData(STATE.SLAM),
    getData(STATE.PSOLVE),
    getData(STATE.HOLD),
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
