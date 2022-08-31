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

(function main() {
  const login = document.getElementsByTagName('span')[0].innerHTML.match(/\(([^)]+)\)/)[1];
  const code1 = 'OBINDIRECT';
  // const login = 'kauspenc';
  // const code1 = 'testAction';

  // create OBINDIRECT button
  const button1 = document.createElement('button');
  button1.innerHTML = code1;
  button1.onclick = () => {
    console.log('button clicked');
    document.getElementsByName('name')[0].value = login;
    document.getElementsByName('code')[0].value = code1;
    // tha page will auto reload after this point
    // const submitResponse = document.createElement('p');
    // submitResponse.innerText = `submint ${login} to ${code1}`;
    // document.querySelectorAll('form')[0].appendChild(submitResponse);
  };
  document.querySelectorAll('form')[0].appendChild(button1);

  wait(3 * 60 * 1000) // check every 3 mins
    .then(() => fetchUserHistoryPage(login))
    .then((html) => getLatestAction(html))
    .then((latestAction) => {
      console.log(latestAction);
      if (latestAction === code1 || latestAction === 'BATCHING' || latestAction === 'EOS') {
        // do nothing
        console.log('do nothing');
      } else if (latestAction === 'BRK') {
        console.log('wait 10 min brk');
        setTimeout(() => button1.click(), 10 * 60 * 1000); // 10 mimns
      } else {
        console.log('click right away');
        button1.click();
      }
    })
    .catch(() => console.error('[Smart Labot Tracking] Fail!'));
})();

function wait(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUserHistoryPage(login) {
  console.log('func: fetchUserHistoryPage');
  const url = '/labor_tracking/lookup_history?user_name=';
  const res = await fetch(`${url}${encodeURIComponent(login)}`);
  const txt = await res.text();
  return new DOMParser().parseFromString(txt, 'text/html');
}

function getLatestAction(html) {
  console.log('func: getLatestAction');
  const selector = 'table.a-bordered > tbody > tr:nth-child(2) > td:nth-child(2) > p:nth-child(1)';
  return html.querySelector(selector).textContent.trim();
}
