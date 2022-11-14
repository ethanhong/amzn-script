/* eslint-disable no-promise-executor-return */
// ==UserScript==
// @name         Better Outbound Dashboard [portal]
// @namespace    https://github.com/ethanhong/amzn-tools/tree/main/release
// @version      2.0.1
// @description  A better outbound dashboard
// @author       Pei
// @match        https://aftlite-portal.amazon.com/ojs/OrchaJSFaaSTCoreProcess/OutboundDashboard
// @updateURL    https://ethanhong.github.io/amzn-tools/release/better-ob-dashboard-portal.user.js
// @downloadURL  https://ethanhong.github.io/amzn-tools/release/better-ob-dashboard-portal.user.js
// @supportURL   https://github.com/ethanhong/amzn-tools/issues
// @require      https://ethanhong.github.io/amzn-tools/release/authenticator.js
// ==/UserScript==

const DEFAULT_NUMBER_OF_PULLTIME = 3
const NUMBER_OF_PULLTIME = parseInt(localStorage.getItem('numberOfPulltimeCol'), 10) || DEFAULT_NUMBER_OF_PULLTIME

const ZONES = ['ambient', 'bigs', 'chilled', 'frozen', 'produce']
const GET_STATES = ['hold', 'dropped', 'assigned', 'picking', 'packed', 'slammed', 'problem-solve', 'total']
const SET_STATES = ['generated', 'dropped', 'assigned', 'picking', 'packed', 'slammed', 'problem-solve', 'total']

const URL = {
  PICKLIST_BY_STATE: '/list_picklist/view_picklists?state=',
  PICKLIST_ALL_STATE: `/list_picklist/view_picklists?state=${GET_STATES.join()}`,
}

const SELECTOR = {
  TIME_TH: 'tbody:nth-child(1) > tr > th',
  DASHBOARD_TR: 'table > tbody:nth-child(2) > tr:not(tr:first-child)',
  PICKLIST_TR: 'tbody > tr:not(tr:first-child)',
  ELEMENT_TO_OBSERVE: '#orchaJsWebAppCanvas tbody:nth-child(2)',
}

// eslint-disable-next-line camelcase, no-undef
const scriptMeta = GM_info.script

// eslint-disable-next-line no-undef
if (isValid(scriptMeta.name, scriptMeta.version)) {
  waitForElm(SELECTOR.TIME_TH).then(() => betterDashboard())
}

async function betterDashboard() {
  bindTitleOnClick()

  // first load
  setTitles(getPullHours())
  let data = await getData()
  hideColSpanOne()
  setData(data)

  // fetch data in loop
  setAsyncInterval(async () => {
    try {
      data = await getData()
    } catch (error) {
      console.log(error)
    }
  }, 5000)

  // monitor content/attributes change to setData
  const elementToObserve = document.querySelector(SELECTOR.ELEMENT_TO_OBSERVE)
  const observerOptions = {
    attributeFilter: ['class'],
    childList: true,
    subtree: true,
  }
  const contentObserver = new MutationObserver((mutationList) => {
    contentObserver.disconnect()
    const mutationTypes = Array.from(new Set(mutationList.map((m) => m.type)))
    mutationTypes.map((type) => {
      switch (type) {
        case 'childList':
          setTitles(getPullHours())
          hideColSpanOne()
          setData(data)
          break
        case 'attributes':
          setZeroStyle()
          break
        default:
          break
      }
      return type
    })
    contentObserver.observe(elementToObserve, observerOptions)
  })
  contentObserver.observe(elementToObserve, observerOptions)
}

async function setAsyncInterval(f, interval) {
  await new Promise((r) => setTimeout(r, interval)) // ms
  await f()
  await setAsyncInterval(f, interval)
}

function hideColSpanOne() {
  const allSpanOne = [...document.querySelectorAll('td[colspan="1"]')]
  let spanOne = []
  for (let i = 0; i < NUMBER_OF_PULLTIME; i += 1) {
    const filtered = allSpanOne.filter((elm) => elm.getAttribute('data-reactid').includes(`:$${i}`))
    spanOne = spanOne.concat(filtered)
  }
  for (let i = 0; i < spanOne.length; i += 1) {
    if (i % 2) {
      spanOne[i].setAttribute('colspan', 2)
    } else {
      spanOne[i].style.display = 'none'
    }
  }
}

function setTitles(pullHours) {
  const titles = pullHours.map((h) => `0${h}:00`.slice(-5))
  for (let i = 0; i < titles.length; i += 1) {
    ;[...document.querySelectorAll(SELECTOR.TIME_TH)][2 + i].textContent = titles[i]
  }
}

function setData(data) {
  const zoneStartEndIndex = { ambient: [0, 7], bigs: [7, 14], chilled: [14, 22], frozen: [22, 30], produce: [30, 38] }
  ZONES.forEach((zone) => {
    // prepare cells
    const [start, end] = zoneStartEndIndex[zone]
    const cells = [...document.querySelectorAll(SELECTOR.DASHBOARD_TR)]
      .slice(start, end)
      .map((row) => [...row.querySelectorAll('.obd-data-cell')].filter((child) => child.style.display !== 'none')) // skip hidden colspan-1-cells
      .map((row) => row.slice(1, 1 + NUMBER_OF_PULLTIME))

    // prepare values
    const states = [...SET_STATES]
    const { values } = data.find((d) => d.zone === zone)
    if (zone === 'ambient' || zone === 'bigs') {
      states.shift()
      values.shift()
    }

    const timeFrames = getPullHours().map((hr) => getTimeFrame(hr, false))
    for (let i = 0; i < states.length; i += 1) {
      const state = states[i]
      for (let j = 0; j < NUMBER_OF_PULLTIME; j += 1) {
        const cell = cells[i][j]
        const [itmeCnt, bagCnt] = values[i][j]
        const timeFrame = timeFrames[j]
        // remove previous nodes we added
        ;[...cell.querySelectorAll('.bod-node')].forEach((elm) => elm.remove())
        // hide original nodes
        ;[...cell.children].forEach((elm) => {
          const elmStyle = elm.style
          elmStyle.display = 'none'
        })
        // add our new nodes
        if (itmeCnt === 0) {
          cell.append(createZeroElement())
          cell.classList.remove('obd-dim') // for last column which is set dim initially
          cell.classList.remove(`obd-data-${state}`)
          cell.classList.add('obd-alt-bg')
        } else {
          flash(cell)
          cell.append(createLinkElement(itmeCnt, bagCnt, zone, state, timeFrame))
          cell.classList.remove('obd-alt-bg')
          cell.classList.add(`obd-data-${state}`)
        }
      }
    }
  })
}

function flash(cell) {
  cell.classList.add('obd-dim')
  setTimeout(() => cell.classList.remove('obd-dim'), 100)
}

function getPullHours() {
  const timeTable = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 5, 6, 7, 8, 9, 10, 11, 12]
  const currentHour = new Date().getHours()
  const startTimeIdx = timeTable.indexOf(currentHour) + 1
  return timeTable.slice(startTimeIdx, startTimeIdx + NUMBER_OF_PULLTIME)
}

function createZeroElement() {
  const elm = document.createElement('span')
  elm.classList.add('bod-node')
  elm.textContent = '0'
  return elm
}

function createLinkElement(items, bags, zone, state, timeFrame = '') {
  const elm = document.createElement('a')
  if (state === 'generated') {
    elm.setAttribute('href', `${URL.PICKLIST_BY_STATE}generated,hold&zone=${zone}&cpt=${timeFrame}`)
  } else {
    elm.setAttribute('href', `${URL.PICKLIST_BY_STATE}${state}&zone=${zone}&cpt=${timeFrame}`)
  }
  elm.setAttribute('target', '_blank')
  elm.classList.add('bod-node')
  if (state === 'problem-solve') {
    elm.textContent = `${bags}`
  } else {
    elm.textContent = `${items} (${bags})`
  }
  return elm
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

async function getData() {
  const pullHours = getPullHours(NUMBER_OF_PULLTIME)
  const timeFrame = getTimeFrame(pullHours.slice(-1), true)
  const finalData = await Promise.all(
    ZONES.map((zone) =>
      fetch(`${URL.PICKLIST_ALL_STATE}&zone=${zone}&cpt=${timeFrame}`)
        .then((res) => res.text())
        .then((txt) => new DOMParser().parseFromString(txt, 'text/html'))
        .then((html) => [...html.querySelectorAll(SELECTOR.PICKLIST_TR)])
        .then((trs) => trs.map((tr) => [...tr.querySelectorAll('td')]))
        .then((trs) => trs.map((tr) => tr.map((td) => td.textContent.trim())))
        .then((trs) =>
          trs.reduce(
            (data, tr) => {
              const newValues = [...data.values]

              // update value by state
              const stateIndex = GET_STATES.indexOf(tr[2])
              const pullTimeIdx = Math.max(0, pullHours.indexOf(new Date(tr[7]).getHours()))
              const [prevItems, prevBags] = newValues[stateIndex][pullTimeIdx]
              const newItems = prevItems + parseInt(tr[5], 10)
              const newBags = prevBags + 1
              newValues[stateIndex][pullTimeIdx] = [newItems, newBags]

              // update total value
              const totalIndex = GET_STATES.indexOf('total')
              const [prevTotalItems, prevTotalBags] = newValues[totalIndex][pullTimeIdx]
              const newTotalItems = prevTotalItems + parseInt(tr[5], 10)
              const newTotalBags = prevTotalBags + 1
              newValues[totalIndex][pullTimeIdx] = [newTotalItems, newTotalBags]

              return { ...data, values: newValues }
            },
            {
              zone,
              values: makeArray(NUMBER_OF_PULLTIME, GET_STATES.length, [0, 0]),
            }
          )
        )
    )
  )
  return finalData
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

function bindTitleOnClick() {
  const handleOnClick = (event) => {
    const { tagName } = event.target // TH or SPAN
    const reactid = event.target.getAttribute('data-reactid')
    if (tagName === 'TH') {
      localStorage.setItem('numberOfPulltimeCol', parseInt(reactid.slice(-1), 16) - 1)
    } else if (tagName === 'SPAN') {
      localStorage.setItem('numberOfPulltimeCol', parseInt(reactid.slice(-3, -2), 16) - 1)
    }
    window.location.reload()
  }

  const titles = [...document.querySelectorAll('th.a-span1')]
  for (let i = 1; i < titles.length; i += 1) {
    // loop index must start from 1 to skip the status column
    const title = titles[i]
    title.addEventListener('dblclick', handleOnClick)
    title.style.cursor = 'default'
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

function setZeroStyle() {
  ;[...document.querySelectorAll('.bod-node')]
    .filter((elm) => elm.textContent === '0')
    .map((elm) => {
      elm.parentNode.classList.add('obd-alt-bg')
      return elm
    })
    .map((elm) => {
      const prefix = 'obd-data-'
      const parent = elm.parentNode
      const classes = parent.className.split(' ').filter((c) => c === 'obd-data-cell' || !c.startsWith(prefix))
      parent.className = classes.join(' ').trim()
      return elm
    })
}
