// ==UserScript==
// @name         Smart Labor Track
// @namespace    https://github.com/ethanhong/amzn-script
// @version      2.0
// @description  Sign in to OBindirect according to current action
// @author       Pei
// @match        https://aftlite-na.amazon.com/indirect_action/signin_indirect_action*
// @match        https://aftlite-portal.amazon.com/indirect_action*
// @grant        none
// ==/UserScript==

const login = ''; // type your login between quotation marks or the code will find one for you
const targetActivity = 'OBINDIRECT';
const skipList = [targetActivity, 'EOS', 'ASM', 'BATCHING'];
const checkPeriod = 3; // minutes
const delayAfterBRK = 10; // minutes

(function main() {
  fetchUserHistoryPage()
    .then(html => getCurrentActivity(html))
    .then(currentActivity => nextAction(currentActivity))
    .catch(() => console.error('[Smart Labot Tracking] Fail!'));
})();

function isNASite() {
  return window.location.hostname === 'aftlite-na.amazon.com';
}

function getLogin() {
  return login || document.getElementsByTagName('span')[0].innerHTML.match(/\(([^)]+)\)/)[1];
}

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function fetchUserHistoryPage() {
  console.log('func start: fetchUserHistoryPage');
  const url = '/labor_tracking/lookup_history?user_name=';
  const user = getLogin();
  const res = await fetch(`${url}${encodeURIComponent(user)}`);
  const txt = await res.text();
  return new DOMParser().parseFromString(txt, 'text/html');
}

function getCurrentActivity(html) {
  console.log('func start: getLatestAction');
  const selector = isNASite()
    ? '.reportLayout > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)'
    : 'table.a-bordered > tbody > tr:nth-child(2) > td:nth-child(2) > p:nth-child(1)';
  return html.querySelector(selector).textContent.trim();
}

async function nextAction(lastActivity) {
  if (skipList.includes(lastActivity)) {
    // do nothing
    console.log(`latest action is ${lastActivity}. Wait 3 minust to check again.`);
    await wait(checkPeriod * 60 * 1000);
    checkin(''); // fake checkin just for page reload
    return false;
  }

  if (lastActivity === 'BRK') {
    console.log(`latest action is ${lastActivity}. Wait 10 minutes to checkin.`);
    // checkin after 10 minutes
    await wait(delayAfterBRK * 60 * 1000);
    checkin(targetActivity);
    return false;
  }

  console.log(`latest action is ${lastActivity}. Checkin now.`);
  checkin(targetActivity);
  return false;
}

function checkin(activity) {
  const name = getLogin();
  console.log(`${name} is checked in to ${activity}`);
  document.getElementsByName('name')[0].value = name;
  document.getElementsByName('code')[0].value = activity;
  document.getElementsByTagName('form')[0].submit();
}
