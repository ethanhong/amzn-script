// ==UserScript==
// @name         Smart Indirect Labor Tracking
// @namespace    https://github.com/ethanhong/amzn-script
// @version      2.0
// @description  Sign in to OBindirect according to current action
// @author       Pei
// @match        https://aftlite-na.amazon.com/indirect_action/signin_indirect_action*
// @match        https://aftlite-portal.amazon.com/indirect_action*
// @grant        none
// ==/UserScript==

(function main() {
  const checkinBtn = appendButton('OBINDIRECT');
  const reloadBtn = appendButton('');
  fetchUserHistoryPage()
    .then((html) => getLastAction(html))
    .then((lastAction) => nextActionAccordingTo(lastAction, checkinBtn, reloadBtn))
    .catch(() => console.error('[Smart Labot Tracking] Fail!'));
})();

function isNASite() {
  return window.location.hostname === 'aftlite-na.amazon.com';
}

function getLogin() {
  return isNASite()
    ? document.getElementsByTagName('span')[0].innerHTML.match(/\(([^)]+)\)/)[1]
    : 'your_login';
}

function appendButton(activity) {
  const login = getLogin();
  const btn = document.createElement('button');
  btn.innerHTML = activity;
  btn.onclick = () => {
    document.getElementsByName('name')[0].value = login;
    document.getElementsByName('code')[0].value = activity;
    // tha page will reload after clicking button
  };
  document.getElementsByTagName('form')[0].appendChild(btn);
  return btn;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchUserHistoryPage() {
  console.log('func start: fetchUserHistoryPage');
  const url = '/labor_tracking/lookup_history?user_name=';
  const login = getLogin();
  const res = await fetch(`${url}${encodeURIComponent(login)}`);
  const txt = await res.text();
  return new DOMParser().parseFromString(txt, 'text/html');
}

function getLastAction(html) {
  console.log('func start: getLatestAction');
  const selector = isNASite()
    ? '.reportLayout > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)'
    : 'table.a-bordered > tbody > tr:nth-child(2) > td:nth-child(2) > p:nth-child(1)';
  return html.querySelector(selector).textContent.trim();
}

async function nextActionAccordingTo(lastAction, checkinBtn, reloadBtn) {
  console.log('func start: nextActionAccordingTo');
  if (['OBINDIRECT', 'BATCHING', 'EOS'].includes(lastAction)) {
    // do nothing
    console.log(`latest action is ${lastAction}. Wait 3 minust to reload page.`);
    await wait(3 * 60 * 1000);
    // window.location = window.location;
    reloadBtn.click();
  } else if (lastAction === 'BRK') {
    console.log(`latest action is ${lastAction}. Wait 10 minutes to checkin.`);
    // checkin after 10 minutes
    await wait(10 * 60 * 1000);
    checkinBtn.click();
  } else {
    console.log(`latest action is ${lastAction}. Checkin now.`);
    checkinBtn.click();
  }
  return false;
}
