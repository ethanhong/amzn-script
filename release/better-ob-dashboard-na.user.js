/* eslint-disable no-promise-executor-return */
// ==UserScript==
// @name         Better Outbound Dashboard [na]
// @namespace    https://github.com/ethanhong/amzn-tools/tree/main/release
// @version      2.1.1
// @description  A better outbound dashboard
// @author       Pei
// @match        https://aftlite-na.amazon.com/outbound_dashboard/index
// @updateURL    https://ethanhong.github.io/amzn-tools/release/better-ob-dashboard-na.user.js
// @downloadURL  https://ethanhong.github.io/amzn-tools/release/better-ob-dashboard-na.user.js
// @supportURL   https://github.com/ethanhong/amzn-tools/issues
// @require      https://ethanhong.github.io/amzn-tools/release/authenticator.js
// ==/UserScript==

// eslint-disable-next-line camelcase, no-undef
const SCRIPT_INFO = GM_info

const DEFAULT_NUMBER_OF_PULLTIME = 3 // 1-8
const NUMBER_OF_PULLTIME = parseInt(localStorage.getItem('numberOfPulltimeCol'), 10) || DEFAULT_NUMBER_OF_PULLTIME

const ZONES = ['ambient', 'bigs', 'chilled', 'frozen', 'produce']
const GET_STATES = ['hold', 'dropped', 'assigned', 'picking', 'packed', 'slammed', 'problem-solve', 'total']
const SET_STATES = ['generated', 'dropped', 'assigned', 'picking', 'packed', 'slammed', 'problem-solve', 'total']

const URL = {
  PICKLIST_BY_STATE: '/wms/view_picklists?state=',
  PICKLIST_ALL_STATE: `/wms/view_picklists?state=${GET_STATES.join()}`,
}

const SELECTOR = {
  TIME_TH: '#cpt_table > thead > tr > th',
  PICKLIST_TR: '#wms_orders_in_state > tbody > tr',
  DASHBOARD_TR: '#cpt_table > tbody > tr',
  ELEMENT_TO_OBSERVE: '#cpt_table > tbody',
}

waitForElm(SELECTOR.TIME_TH).then(() => betterDashboard())

async function betterDashboard() {
  // eslint-disable-next-line no-undef
  const isCheckValid = await isValid(SCRIPT_INFO)
  if (!isCheckValid) return

  const controller = new AbortController()
  const { signal } = controller
  let lastMutationTime = Date.now()

  bindTitleOnClick()

  // first load
  let data = await getData(signal)
  setTitles(getPullHours())
  clearCells()
  showData(data)

  // set listener
  window.addEventListener('offline', () => {
    console.log('Offline')
    controller.abort()
  })
  window.addEventListener('online', () => {
    console.log('Online')
    window.location.reload()
  })

  // fetch data in loop
  setAsyncInterval(
    async () => {
      try {
        data = await getData(signal)
        setTitles(getPullHours())
        clearCells()
        showData(data)
      } catch (error) {
        console.log(error)
      }
    },
    5000,
    signal
  )

  // monitor mutation period
  // if there is no mutation happen over 30 seconds means something went wrong
  setAsyncInterval(
    () => {
      if (Date.now() - lastMutationTime > 35 * 1000) {
        console.log('Mutation stopped, reload page.')
        controller.abort()
        window.location.reload()
      }
    },
    1000,
    signal
  )

  // monitor content change to showData
  const elementToObserve = document.querySelector(SELECTOR.ELEMENT_TO_OBSERVE)
  const observerOptions = {
    childList: true,
    subtree: true,
  }
  const contentObserver = new MutationObserver(() => {
    lastMutationTime = Date.now()
    contentObserver.disconnect()
    clearCells()
    showData(data)
    contentObserver.observe(elementToObserve, observerOptions)
  })
  contentObserver.observe(elementToObserve, observerOptions)
}

async function setAsyncInterval(f, interval, signal) {
  if (signal.aborted) {
    console.log('setAsyncInterval: aborted!')
    return
  }
  const sleepPromise = new Promise((r) => setTimeout(r, interval)) // ms
  const functionPromise = f()
  await Promise.all([sleepPromise, functionPromise])
  await setAsyncInterval(f, interval, signal)
}

function clearCells() {
  const tds = [...document.querySelectorAll(SELECTOR.DASHBOARD_TR)]
    .filter((tr) => tr.getAttribute('hidden') !== 'true')
    .slice(1, 1 + ZONES.length) // skip the first tr which we don't use
    .map((tr) => [...tr.children].slice(3, 3 + NUMBER_OF_PULLTIME))
    .flat()
  for (let i = 0; i < tds.length; i += 1) {
    tds[i].innerHTML = ''
  }
}

function showData(data) {
  ZONES.forEach((zone, idx) => {
    // prepare cells
    const trOfZone = [...document.querySelectorAll(SELECTOR.DASHBOARD_TR)].filter(
      (tr) => tr.getAttribute('hidden') !== 'true'
    )[idx + 1]
    const tds = [...trOfZone.children].slice(3, 3 + NUMBER_OF_PULLTIME)

    // prepare values
    const states = structuredClone(SET_STATES)
    const { values } = structuredClone(data.find((d) => d.zone === zone))
    if (zone === 'ambient' || zone === 'bigs') {
      states.shift()
      values.shift()
    }

    const timeFrames = getPullHours().map((hr) => getTimeFrame(hr, false))
    for (let i = 0; i < tds.length; i += 1) {
      const td = tds[i]
      for (let j = 0; j < states.length; j += 1) {
        const state = states[j]
        const [itmeCnt, bagCnt] = values[j][i]
        const timeFrame = timeFrames[i]
        if (itmeCnt === 0) {
          td.innerHTML += `<div class="status">0</div>`
        } else {
          td.append(createLinkElement(itmeCnt, bagCnt, zone, state, timeFrame))
        }
      }
    }
  })
}

function createLinkElement(items, bags, zone, state, timeFrame = '') {
  const elm = document.createElement('a')
  if (state === 'generated') {
    elm.setAttribute('href', `${URL.PICKLIST_BY_STATE}generated,hold&zone=${zone}&cpt=${timeFrame}`)
  } else {
    elm.setAttribute('href', `${URL.PICKLIST_BY_STATE}${state}&zone=${zone}&cpt=${timeFrame}`)
  }
  elm.setAttribute('target', '_blank')
  if (state === 'problem-solve') {
    elm.innerHTML = `<div class="status ${state}" style="white-space: nowrap">${bags}</div>`
  } else {
    elm.innerHTML = `<div class="status ${state}" style="white-space: nowrap">${items} (${bags})</div>`
  }
  return elm
}

function getPullHours() {
  const timeTable = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 5, 6, 7, 8, 9, 10, 11, 12]
  const currentHour = new Date().getHours()
  const startTimeIdx = timeTable.indexOf(currentHour) + 1
  return timeTable.slice(startTimeIdx, startTimeIdx + NUMBER_OF_PULLTIME)
}

function getTimeFrame(pullHour, allWindow = false) {
  const timeDiffInMin = (t1, t2) => Math.ceil((t1 - t2) / 60000)
  const pullTime = new Date()
  pullTime.setHours(pullHour)
  pullTime.setMinutes(15)
  pullTime.setSeconds(0)
  let timeDiff = timeDiffInMin(pullTime, new Date())
  timeDiff = timeDiff > 0 ? timeDiff : timeDiff + 24 * 60

  const buffer = 15
  return allWindow ? `0,${timeDiff + buffer}` : `${Math.max(0, timeDiff - buffer)},${timeDiff + buffer}`
}

function makeArray(x, y, val) {
  const arr = []
  for (let i = 0; i < y; i += 1) {
    arr[i] = []
    for (let j = 0; j < x; j += 1) {
      arr[i][j] = val
    }
  }
  return arr
}

async function getData(signal) {
  const pullHours = getPullHours(NUMBER_OF_PULLTIME)
  const timeFrame = getTimeFrame(pullHours.slice(-1), true)

  const rawData = await Promise.all(
    ZONES.map((zone) =>
      fetch(`${URL.PICKLIST_ALL_STATE}&zone=${zone}&cpt=${timeFrame}`, { signal })
        .then((res) => res.text())
        .then((txt) => new DOMParser().parseFromString(txt, 'text/html'))
        .then((html) => [...html.querySelectorAll(SELECTOR.PICKLIST_TR)])
        .then((trs) => trs.map((tr) => [...tr.querySelectorAll('td')]))
        .then((trs) => trs.map((tr) => tr.map((td) => td.textContent.trim())))
    )
  )

  const finalData = []
  for (let i = 0; i < ZONES.length; i += 1) {
    const zone = ZONES[i]
    const values = makeArray(NUMBER_OF_PULLTIME, GET_STATES.length, [0, 0])
    const trs = rawData[i]
    for (let j = 0; j < trs.length; j += 1) {
      const tr = trs[j]

      // update value by state
      const stateIndex = GET_STATES.indexOf(tr[2])
      const pullTimeIdx = Math.max(0, pullHours.indexOf(new Date(tr[8]).getHours()))
      const [prevItems, prevBags] = values[stateIndex][pullTimeIdx]
      const newItems = prevItems + parseInt(tr[6], 10)
      const newBags = prevBags + 1
      values[stateIndex][pullTimeIdx] = [newItems, newBags]

      // update total value
      const totalIndex = GET_STATES.indexOf('total')
      const [prevTotalItems, prevTotalBags] = values[totalIndex][pullTimeIdx]
      const newTotalItems = prevTotalItems + parseInt(tr[6], 10)
      const newTotalBags = prevTotalBags + 1
      values[totalIndex][pullTimeIdx] = [newTotalItems, newTotalBags]
    }
    finalData.push({ zone, values })
  }
  return finalData
}

function setTitles(pullHours) {
  const titles = pullHours.map((h) => `0${h}:00`.slice(-5))
  for (let i = 0; i < titles.length; i += 1) {
    ;[...document.querySelectorAll(SELECTOR.TIME_TH)][3 + i].textContent = titles[i]
  }
}

function bindTitleOnClick() {
  const titles = [...document.querySelectorAll(SELECTOR.TIME_TH)]

  const handleOnClick = (event) => {
    const index = titles.findIndex((title) => title === event.target)
    localStorage.setItem('numberOfPulltimeCol', index - 2)
    window.location.reload()
  }

  for (let i = 3; i < 11; i += 1) {
    // loop index must start from 3 to skip first 3 column
    titles[i].addEventListener('dblclick', handleOnClick)
    titles[i].style.cursor = 'default'
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
