// ==UserScript==
// @name         Smart Indirect Labor Tracking
// @namespace    https://github.com/ethanhong/amzn-script
// @version      1.0
// @description  Sign in to OBindirect according to current action
// @author       Pei
// @match        https://aftlite-na.amazon.com/indirect_action/signin_indirect_action*
// @match        https://aftlite-portal.amazon.com/indirect_action*
// @grant        none
// ==/UserScript==

const isAftliteNa = window.location.hostname === 'aftlite-na.amazon.com';
const login = document.getElementsByTagName('span')[0].innerHTML.match(/\(([^)]+)\)/)[1];
const code1 = 'OBINDIRECT';

(function main() {
  const reloadNow = wait(3 * 60 * 1000) // check every 3 mins
    .then(() => fetchUserHistoryPage())
    .then((html) => getLastAction(html))
    .then((lastAction) => makeNextActionAccordingTo(lastAction))
    .then((reload) => reload)
    .catch(() => console.error('[Smart Labot Tracking] Fail!'));
  if (reloadNow) window.location.reload();
})();

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchUserHistoryPage() {
  console.log('func start: fetchUserHistoryPage');
  const url = '/labor_tracking/lookup_history?user_name=';
  const res = await fetch(`${url}${encodeURIComponent(login)}`);
  const txt = await res.text();
  return new DOMParser().parseFromString(txt, 'text/html');
}

function getLastAction(html) {
  console.log('func start: getLatestAction');
  const selector = isAftliteNa
    ? '.reportLayout > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)'
    : 'table.a-bordered > tbody > tr:nth-child(2) > td:nth-child(2) > p:nth-child(1)';
  return html.querySelector(selector).textContent.trim();
}

function makeNextActionAccordingTo(lastAction) {
  const reload = true;
  if (lastAction === 'OBINDIRECT' || lastAction === 'BATCHING' || lastAction === 'EOS') {
    // do nothing
    console.log(`latest action is ${lastAction}. No need to change.`);
    return reload;
  }
  if (lastAction === 'BRK') {
    console.log(`latest action is ${lastAction}. Wait for 10 minutes.`);
    setTimeout(() => checkIn(), 10 * 60 * 1000); // 10 mimns
    return !reload;
  }

  console.log(`latest action is ${lastAction}. Check in now.`);
  checkIn();
  return reload;
}

function checkIn() {
  console.log(`Check in ${login} to ${code1}`);
  document.getElementsByName('name')[0].value = login;
  document.getElementsByName('code')[0].value = code1;
}
