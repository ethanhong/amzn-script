// ==UserScript==
// @name         Clock
// @namespace    https://github.com/ethanhong/amzntools-src/tree/release
// @version      1.0.2
// @description  clock
// @author       Pei
// @match        https://aftlite-portal.amazon.com/*
// @match        https://aftlite-na.amazon.com/*
// @match        https://como-operations-dashboard-iad.iad.proxy.amazon.com/*
// @updateURL    https://ethanhong.github.io/amzntools-src/clock.user.js
// @downloadURL  https://ethanhong.github.io/amzntools-src/clock.user.js
// @grant        GM_addStyle
// ==/UserScript==

// eslint-disable-next-line no-unused-vars
(function clock() {
  const clockDiv = document.createElement('div');
  clockDiv.setAttribute('id', 'clock');
  document.body.append(clockDiv);
  startTime();
})();

function startTime() {
  const checkTime = (x) => (x < 10 ? `0${x}` : x);
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

// eslint-disable-next-line no-undef
GM_addStyle(`
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
`);
