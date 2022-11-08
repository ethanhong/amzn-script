/* eslint-disable no-promise-executor-return */
// ==UserScript==
// @name         Better Outbound Dashboard [portal]
// @namespace    https://github.com/ethanhong/amzn-tools/tree/main/release
// @version      1.1.1
// @description  A better outbound dashboard
// @author       Pei
// @match        https://aftlite-portal.amazon.com/ojs/OrchaJSFaaSTCoreProcess/OutboundDashboard
// @updateURL    https://ethanhong.github.io/amzn-tools/release/better-ob-dashboard-portal.user.js
// @downloadURL  https://ethanhong.github.io/amzn-tools/release/better-ob-dashboard-portal.user.js
// @supportURL   https://github.com/ethanhong/amzn-tools/issues
// ==/UserScript==

const SAVED_NUMBER_OF_PULLTIME = parseInt(localStorage.getItem('numberOfPulltimeCol'), 10)
const NUMBER_OF_PULLTIME = Number.isNaN(SAVED_NUMBER_OF_PULLTIME) ? 4 : SAVED_NUMBER_OF_PULLTIME

const URL = {
  PICKLIST_BY_STATE: '/list_picklist/view_picklists?state=',
}
const SELECTOR = {
  PICKLIST_TR: 'tbody > tr:not(tr:first-child)',
  TIME_TH: 'tbody:nth-child(1) > tr > th',
  DASHBOARD_TR: 'table > tbody:nth-child(2) > tr:not(tr:first-child)',
  ELEMENT_TO_OBSERVE: '#orchaJsWebAppCanvas tbody:nth-child(2)',
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

const NOW = new Date()

waitForElm(SELECTOR.TIME_TH).then(() => betterDashboard())

function bindTitleOnClick() {
  const handleOnClick = (event) => {
    const { tagName } = event.target // TH or SPAN
    const reactid = event.target.getAttribute('data-reactid')
    if (tagName === 'TH') {
      localStorage.setItem('numberOfPulltimeCol', parseInt(reactid.slice(-1), 16) - 1)
    } else if (tagName === 'SPAN') {
      localStorage.setItem('numberOfPulltimeCol', parseInt(reactid.slice(-3, -2), 16) - 1)
    }
    console.log(localStorage.getItem('numberOfPulltimeCol'))
    window.location.reload()
  }

  const titles = [...document.querySelectorAll('th.a-span1')]
  titles.map((t) => t.addEventListener('dblclick', handleOnClick))
}

async function betterDashboard() {
  bindTitleOnClick()
  // init load
  let data = await getAllData()
  setAllData(data)

  // monitor content/attributes change
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
          setAllData(data)
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

  // fetch data
  loop(async () => {
    data = await getAllData()
  }, 5000)
}

async function loop(f, interval) {
  await new Promise((r) => setTimeout(r, interval)) // ms
  await f()
  await loop(f, interval)
}

function getAllData() {
  // console.log('getAllData')
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

function setAllData(data) {
  // console.log('setAllData')
  NOW.setTime(Date.now())
  setData(data[0], STATE.DROP)
  setData(data[1], STATE.ASSIGN)
  setData(data[2], STATE.PICK)
  setData(data[3], STATE.PACK)
  setData(data[4], STATE.SLAM)
  setData(data[5], STATE.PSOLVE)
  setData(data[6], STATE.GENERATED)
  const totalData = data.reduce((result, x) => result.concat(x), [])
  setData(totalData, STATE.TOTAL)
}

const timeDiffInMin = (t1, t2) => Math.ceil((t1 - t2) / 60000)

function flash(rows) {
  const dimCells = () => rows.map((row) => row.map((cell) => cell.classList.add('obd-dim')))
  const unDimCells = () => rows.map((row) => row.map((cell) => cell.classList.remove('obd-dim')))
  dimCells()
  setTimeout(() => unDimCells(), 100)
}

function hideColSpanOne() {
  const allSpanOne = [...document.querySelectorAll('td[colspan="1"]')]
  let spanOne = []
  for (let i = 0; i < NUMBER_OF_PULLTIME; i += 1) {
    const filtered = allSpanOne.filter((elm) => elm.getAttribute('data-reactid').includes(`:$${i}`))
    spanOne = spanOne.concat(filtered)
  }

  spanOne.map((elm, i) => {
    if (i % 2) {
      const elmStyle = elm.style
      elmStyle.display = 'none'
    } else {
      elm.setAttribute('colspan', 2)
    }
    return elm
  })
}

function setData(rawData, state) {
  const timeTable = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 5, 6, 7, 8, 9, 10, 11, 12]
  const zones =
    state === STATE.GENERATED ? ['chilled', 'frozen', 'produce'] : ['ambient', 'bigs', 'chilled', 'frozen', 'produce']

  hideColSpanOne()
  const rows = [...document.querySelectorAll(SELECTOR.DASHBOARD_TR)]
    .map((tr) => [...tr.children].slice(1)) // remove zone col
    .map((tr) => tr.filter((elm) => elm.style.display !== 'none')) // skip hidden colspan-1-cells

  const filteredRows = rows
    .filter((row) => row[0].className.includes(state))
    .map((row) => row.slice(1, 1 + NUMBER_OF_PULLTIME)) // remove state col
  flash(filteredRows)

  const currentHour = NOW.getHours()
  const startTimeIdx = currentHour > 22 || currentHour < 5 ? 0 : timeTable.indexOf(currentHour) + 1
  const pullHours = timeTable.slice(startTimeIdx, startTimeIdx + NUMBER_OF_PULLTIME)
  setTitles(pullHours)

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

    const timeFrames = pullHours.map((hr) => {
      const pullTime = new Date(NOW)
      pullTime.setHours(hr)
      pullTime.setMinutes(15)
      pullTime.setSeconds(0)
      let timeDiff = timeDiffInMin(pullTime, NOW)
      timeDiff = timeDiff > 0 ? timeDiff : timeDiff + 24 * 60
      return `${Math.max(timeDiff - 60, 0)},${timeDiff}`
    })

    filteredRows[i].map((cell, j) => {
      // remove previous nodes we added
      ;[...cell.querySelectorAll('.bod-node')].map((elm) => elm.remove())
      // hide other nodes
      ;[...cell.querySelectorAll(':not(.bod-node)')].map((elm) => {
        const elmStyle = elm.style
        elmStyle.display = 'none'
        return elm
      })
      // add our new nodes
      if (content[j] === 0) {
        cell.append(createSpan(content[j]))
        cell.classList.remove(`obd-data-${state}`)
        cell.classList.add('obd-alt-bg')
      } else {
        cell.append(createLink(content[j], zone, state, timeFrames[j]))
        cell.classList.remove('obd-alt-bg')
        cell.classList.add(`obd-data-${state}`)
      }

      return cell
    })
  }
}

function createSpan(content) {
  const elm = document.createElement('span')
  elm.classList.add('bod-node')
  elm.textContent = content
  return elm
}

function createLink(content, zone, state, timeFrame) {
  const elm = document.createElement('a')
  if (state === STATE.GENERATED) {
    elm.setAttribute('href', `${URL.PICKLIST_BY_STATE}${STATE.HOLD}&zone=${zone}&cpt=${timeFrame}`)
  } else {
    elm.setAttribute('href', `${URL.PICKLIST_BY_STATE}${state}&zone=${zone}&cpt=${timeFrame}`)
  }
  elm.setAttribute('target', '_blank')
  elm.classList.add('bod-node')
  elm.textContent = content
  return elm
}

async function getData(state) {
  const res = await fetch(URL.PICKLIST_BY_STATE + state)
  const txt = await res.text()
  const html = new DOMParser().parseFromString(txt, 'text/html')
  const picklists = [...html.querySelectorAll(SELECTOR.PICKLIST_TR)]
  return picklists
    .map((pl) => [...pl.querySelectorAll('td')])
    .map((pl) => pl.map((td) => td.textContent))
    .map((pl) => ({ zone: pl[3], items: pl[5], pullTime: new Date(pl[7]) }))
}

function setTitles(pullHours) {
  const titles = pullHours.map((h) => `0${h}:00`.slice(-5))
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
