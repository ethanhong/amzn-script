// ==UserScript==
// @name         Clock
// @namespace    https://github.com/ethanhong/amzn-script
// @version      1.0
// @description  clock
// @author       Pei
// @match        https://aftlite-portal.amazon.com/*
// @match        https://aftlite-na.amazon.com/*
// @match        https://como-operations-dashboard-iad.iad.proxy.amazon.com/*
// ==/UserScript==

// eslint-disable-next-line no-unused-vars
function clock() {
  const clockDiv = document.createElement('div');
  clockDiv.setAttribute('id', 'clock');
  document.body.append(clockDiv);
  addCSS();
  startTime();
}

function startTime() {
  const today = new Date();
  let h = today.getHours();
  let m = today.getMinutes();
  let s = today.getSeconds();
  h = checkTime(h);
  m = checkTime(m);
  s = checkTime(s);
  document.getElementById('clock').innerHTML = `${h}:${m}:${s}`;
  setTimeout(startTime, 1000);
}

function checkTime(i) {
  if (i < 10) {
    return `0${i}`;
  } // add zero in front of numbers < 10
  return i;
}

function addCSS() {
  const styles = `
    div#clock {
      width: 160px;
      height: 48px;
      line-height: 48px;
      font-size: 32px;
      color: #ccc;
      text-align: center;
      background-color: rgb(60, 60, 60, 90%);
      border: 2px solid rgb(60, 60, 60);;
      border-radius: 5px;
      position: fixed;
      bottom: 1%;
      left: 50%;
      margin-left: -80px;
      z-index: 99;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
