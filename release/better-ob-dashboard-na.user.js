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
  TIME_TH: '#cpt_table > thead > tr > th',
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

  // monitor content/attributes change to setData
  // const elementToObserve = document.querySelector(SELECTOR.ELEMENT_TO_OBSERVE)
  // const observerOptions = {
  //   // attributeFilter: ['class'],
  //   childList: true,
  //   subtree: true,
  // }
  // const contentObserver = new MutationObserver((mutationList) => {
  //   contentObserver.disconnect()
  //   const mutationTypes = Array.from(new Set(mutationList.map((m) => m.type)))
  //   mutationTypes.map((type) => {
  //     switch (type) {
  //       case 'childList':
  //         console.log('mutation observer: childlist')
  //         break
  //       // case 'attributes':
  //       //   setZeroStyle()
  //       //   break
  //       default:
  //         break
  //     }
  //     return type
  //   })
  //   contentObserver.observe(elementToObserve, observerOptions)
  // })
  // contentObserver.observe(elementToObserve, observerOptions)

  // fetch data in loop
  // setAsyncInterval(async () => {
  //   data = await getAllData()
  // }, 5000)
}

async function setAsyncInterval(f, interval) {
  await new Promise((r) => setTimeout(r, interval)) // ms
  await f()
  await setAsyncInterval(f, interval)
}

function setAllData(data) {
  const states = [STATE.GENERATED, STATE.DROP, STATE.ASSIGN, STATE.PICK, STATE.PACK, STATE.SLAM, STATE.PSOLVE]
  states.map((state, i) => setData(data[i], state))
  const totalData = data.reduce((total, x) => total.concat(x), [])
  setData(totalData, STATE.TOTAL)
}

function setData(rawData, state) {
  console.log(state, rawData)
}

function setDataTemp(rawData, state) {
  const zones = ['ambient', 'bigs', 'chilled', 'frozen', 'produce']
  const rows = [...document.querySelectorAll(SELECTOR.DASHBOARD_TR)]
  if (state === STATE.GENERATED) {
    // remove first 2 zones
    zones.splice(0, 2)
    rows.splice(0, 2)
  }

  // prepare cells to place data
  const filteredRows = rows
    .filter((tr) => tr.getAttribute('hidden') !== 'true')
    .map((tr) => [...tr.children].slice(3, 3 + NUMBER_OF_PULLTIME)) // remove zone, state, and total

  // prepare raw data
  const pullHours = getPullHours()
  const dataFilteredByPullTime = pullHours.map((hr) => rawData.filter((d) => d.pullTime.getHours() === hr))

  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i]
    const dataOfZone = dataFilteredByPullTime.map((data) => data.filter((d) => d.zone === zone))
    const packages = dataOfZone.map((d) => d.length)
    const items = dataOfZone.map((d) => d.reduce((acc, x) => acc + parseInt(x.items, 10), 0))

    let content = []
    if (state === STATE.PSOLVE) {
      content = packages
    } else {
      content = items.map((item, idx) => (item ? `${item} (${packages[idx]})` : 0))
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

    filteredRows[i].map((td, j) => {
      // remove all elements not from us
      function hideElement(elm) {
        const elmStyle = elm.style
        elmStyle.display = 'none'
      }
      ;[...td.childNodes].filter((elm) => !elm.className.includes('bod-node')).map((elm) => hideElement(elm))
      // td.querySelectorAll('a:not(a.bod-node)').map((elm) => hideElement(elm))
      // td.querySelectorAll('div:not(div.bod-node)').map((elm) => elm.remove())
      // append our elements
      const newElement =
        timeFrames[j] === 0 ? createZeroElement() : createLinkElement(content[j], zone, state, timeFrames[j])
      td.append(newElement)
      return td
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
  a.classList.add('bod-node')

  const div = document.createElement('div')
  div.classList.add('status')
  div.classList.add('state')
  div.textContent = content

  a.append(div)
  return a
}

async function getAllData() {
  const states = [STATE.HOLD, STATE.DROP, STATE.ASSIGN, STATE.PICK, STATE.PACK, STATE.SLAM, STATE.PSOLVE]
  return Promise.all(states.map((state) => getData(state)))
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
  for (let i = 0; i < titles.length; i += 1) {
    ;[...document.querySelectorAll(SELECTOR.TIME_TH)][3 + i].textContent = titles[i]
  }
}

function getPullHours() {
  const timeTable = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 5, 6, 7, 8, 9, 10, 11, 12]
  const currentHour = new Date().getHours()
  const startTimeIdx = timeTable.indexOf(currentHour) + 1
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
