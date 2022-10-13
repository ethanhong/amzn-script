// ==UserScript==
// @name         Smart Labor Track
// @namespace    https://github.com/ethanhong/amzn-script
// @version      2.1
// @description  Sign in to OBindirect according to current action
// @author       Pei
// @match        https://aftlite-na.amazon.com/indirect_action/signin_indirect_action*
// ==/UserScript==

// eslint-disable-next-line no-unused-vars
async function smartLaborTrack(targetActivity, skipList, checkPeriod = 5, delayAfterBRK = 10, login = '') {
  const isNASite = window.location.hostname === 'aftlite-na.amazon.com';
  const name = login || document.getElementsByTagName('span')[0].innerHTML.match(/\(([^)]+)\)/)[1];
  const url = '/labor_tracking/lookup_history?user_name=';
  const skips = skipList.map((x) => x.toUpperCase());

  const currentAction = await fetch(`${url}${name}`)
    .then((res) => res.text())
    .then((txt) => new DOMParser().parseFromString(txt, 'text/html'))
    .then((page) =>
      page
        .querySelector(
          isNASite
            ? '.reportLayout > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)'
            : 'table.a-bordered > tbody > tr:nth-child(2) > td:nth-child(2) > p:nth-child(1)'
        )
        .textContent.trim()
        .toUpperCase()
    );

  if (currentAction === 'EOS') {
    console.log(`Current action is ${currentAction}. Stop smart labor tracking.`);
    return;
  }

  if (skips.includes(currentAction)) {
    // do fake checkin after checkPeriod minutes to trigger reloading page
    console.log(`Current action is ${currentAction}. Wait ${checkPeriod} minust to check again.`);
    setTimeout(() => smartLaborTrack(targetActivity, skipList, checkPeriod, delayAfterBRK), checkPeriod * 60 * 1000);
    return;
  }
  if (currentAction === 'BRK') {
    // checkin after delayAfterBRK minutes
    console.log(`Current action is ${currentAction}. Wait ${delayAfterBRK} minutes to checkin.`);
    setTimeout(() => checkin(name, targetActivity), delayAfterBRK * 60 * 1000);
    return;
  }
  // checkin immediately
  console.log(`Current action is ${currentAction}. Checkin now.`);
  checkin(name, targetActivity);
}

function checkin(user, activity) {
  console.log(`Checkin ${user} to ${activity}.`);
  console.log(`${user} is checked in to ${activity}`);
  document.getElementsByName('name')[0].value = user;
  document.getElementsByName('code')[0].value = activity;
  document.getElementsByTagName('form')[0].submit();
}
