// ==UserScript==
// @name         P-solve Painter
// @namespace    https://github.com/ethanhong/amzn-script
// @version      1.0
// @description  Color p-solves by pull time
// @author       Pei
// @match        https://aftlite-na.amazon.com/wms/view_dwell_time?type=status&value=problem-solve
// @grant        GM_addStyle
// ==/UserScript==

(() => {
  const deliveryDateSelector = '#wms_table_dwell_time > tbody:nth-child(2) > tr > td:nth-child(10)';

  // calulate window hour
  const currentTime = new Date();
  const lateWindow = (currentTime.getHours() + 1) % 12 || 12;
  const currentWindow = (currentTime.getHours() + 2) % 12 || 12;
  const nextWindow = (currentTime.getHours() + 3) % 12 || 12;

  document.querySelectorAll(deliveryDateSelector).forEach((cell) => {
    let [startHour] = cell.textContent.match(/\d{1,2}(?=:00)/);
    startHour = parseInt(startHour, 10);
    if (startHour === lateWindow) {
      cell.classList.add('late-window');
    } else if (startHour === currentWindow) {
      cell.classList.add('current-window');
    } else if (startHour === nextWindow) {
      cell.classList.add('next-window');
    } else {
      cell.classList.add('future-window');
    }
  });
})();

// --------------------------- CSS --------------------------- //
// eslint-disable-next-line no-undef
GM_addStyle(`
  .late-window {
    background-color: Red;
  }

  .current-window {
    background-color: Pink;
  }

  .next-window {
    background-color: SkyBlue;
  }

  .future-window {
    background-color: LightGrey;
  }
`);
