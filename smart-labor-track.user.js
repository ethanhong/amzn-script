// ==UserScript==
// @name         Smart Labor Track
// @namespace    https://github.com/ethanhong/amzntools-src/tree/release
// @version      2.1.1
// @description  Sign in to OBindirect according to current action
// @author       Pei
// @match        https://aftlite-na.amazon.com/indirect_action/signin_indirect_action*
// @match        https://aftlite-portal.amazon.com/indirect_action*
// @updateURL    https://ethanhong.github.io/amzntools-src/smart-labor-track.user.js
// @downloadURL  https://ethanhong.github.io/amzntools-src/smart-labor-track.user.js
// @supportURL   https://github.com/ethanhong/amzntools-src/issues
// ==/UserScript==

const activity = 'OBINDIRECT'; // activity you'd like to be checked in
const skipActivities = ['EOS', 'ASM', 'BATCHING', 'OBINDIRECT']; // activities which would be skipped (targetActivity will always be skipped)
const interval = 5; // period to check current activity (in minutes)
const brkLength = 10; // break time (in minutes)
startLaborTrack(activity, skipActivities, interval, brkLength);

// eslint-disable-next-line no-unused-vars
async function startLaborTrack(
  targetAct,
  skip,
  period = 5,
  brkTime = 10,
  login = ''
) {
  const isNASite = window.location.hostname === 'aftlite-na.amazon.com';
  const name =
    login ||
    document.getElementsByTagName('span')[0].innerHTML.match(/\(([^)]+)\)/)[1];
  const url = '/labor_tracking/lookup_history?user_name=';
  const skipCaps = [targetAct, ...skip].map((x) => x.toUpperCase());

  const currentAct = await fetch(`${url}${name}`)
    .then((res) => res.text())
    .then((txt) => new DOMParser().parseFromString(txt, 'text/html'))
    .then((html) =>
      html
        .querySelector(
          isNASite
            ? '.reportLayout > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)'
            : 'table.a-bordered > tbody > tr:nth-child(2) > td:nth-child(2) > p:nth-child(1)'
        )
        .textContent.trim()
        .toUpperCase()
    );

  if (currentAct === 'EOS') {
    console.log(`Current activity is ${currentAct}. Stop the script.`);
    return;
  }

  if (skipCaps.includes(currentAct)) {
    // do fake checkin after ${period} minutes to trigger reloading page
    console.log(
      `Current activity is ${currentAct}. Wait ${period} minust to check again.`
    );
    setTimeout(
      () => startLaborTrack(targetAct, skip, period, brkTime, login),
      period * 60 * 1000
    );
    return;
  }

  if (currentAct === 'BRK') {
    // checkin after ${brkTime} minutes
    console.log(
      `Current activity is ${currentAct}. Wait ${brkTime} minutes to checkin.`
    );
    setTimeout(() => checkin(name, targetAct), brkTime * 60 * 1000);
    return;
  }
  // checkin immediately
  console.log(`Current activity is ${currentAct}. Checkin now.`);
  checkin(name, targetAct);
}

function checkin(user, activityCode) {
  console.log(`Checkin ${user} to ${activity}.`);
  document.getElementsByName('name')[0].value = user;
  document.getElementsByName('code')[0].value = activityCode;
  document.getElementsByTagName('form')[0].submit();
}
