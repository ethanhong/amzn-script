// ==UserScript==
// @name         Tote Time Marker
// @namespace    mailto:py.hong@gmail.com
// @version      1.0
// @description  Mark totes with current pull time
// @author       Pei
// @match        https://aftlite-portal.amazon.com/labor_tracking/lookup_history?user_name=*
// @match        https://aftlite-na.amazon.com/labor_tracking/lookup_history?user_name=*
// @grant        GM_addStyle
// ==/UserScript==

(function () {

    'use strict';

    const PICKLIST_ID = 'table.a-bordered:nth-child(5) > tbody:nth-child(1) > tr > td:nth-child(13)';

    let picklistUrl = 'https://aftlite-na.amazon.com/picklist/pack_by_picklist?picklist_id=';
    if (window.location.href.indexOf('aftlite-portal') > -1) {
        picklistUrl = 'https://aftlite-portal.amazon.com/picklist/pack_by_picklist?picklist_id=';
    }

    // calulate window hour
    let currentTime = new Date();
    let lateWindow = (currentTime.getHours() + 1) % 12 || 12;
    let currentWindow = (currentTime.getHours() + 2) % 12 || 12;
    let nextWindow = (currentTime.getHours() + 3) % 12 || 12;

    // remove table a-vertical-stripes color setting
    let tbl = document.querySelector('table.a-bordered:nth-child(5)');
    tbl.className = tbl.className.replace('a-vertical-stripes', '')

    // grab all picklist elements
    let allPicklist = document.querySelectorAll(PICKLIST_ID);

    // start to fetch
    fetchPicklistPullTime(0);


    // wait for current fetch task complete then start next fetch
    function fetchPicklistPullTime(nextPickListIndex) {

        const PICKLIST_FORMAT = RegExp('[0-9]{7}', 'g'); // picklist id format, 7 digits numbers
        let picklistId = allPicklist[nextPickListIndex].textContent.trim();

        if (!PICKLIST_FORMAT.test(picklistId)) { // if picklist id is not valid, don't fetch and try next
            nextPickListIndex += 1;
            if (nextPickListIndex < allPicklist.length) {
                fetchPicklistPullTime(nextPickListIndex);
            }
            return;
        }

        // picklist id is valid, start to fetch
        fetch(picklistUrl + picklistId)
            .then(function (response) {
                return response.text();
            })
            .then(function (data) {
                let toteCell = allPicklist[nextPickListIndex].parentNode.childNodes[9];
                if (data.indexOf('between ' + lateWindow) > -1) { //late window
                    toteCell.className += ' late-window';
                    toteCell.textContent = '(' + lateWindow + ':00) ' + toteCell.textContent;
                } else if (data.indexOf('between ' + currentWindow) > -1) { //current window
                    toteCell.className += ' current-window';
                    toteCell.textContent = '(' + currentWindow + ':00) ' + toteCell.textContent;
                } else if (data.indexOf('between ' + nextWindow) > -1) { //next window
                    toteCell.className += ' next-window';
                    toteCell.textContent = '(' + nextWindow + ':00) ' + toteCell.textContent;
                } else {
                    // for future windows
                }

                // fetch next picklist
                nextPickListIndex += 1;
                if (nextPickListIndex < allPicklist.length) {
                    fetchPicklistPullTime(nextPickListIndex);
                }
            })
    }


}());

//--------------------------- CSS -------------------------------------------------------//
GM_addStyle(`
    .late-window {
        background-color: Pink;
    }

    .current-window {
        background-color: MediumAquaMarine;
    }

    .next-window {
        background-color: SkyBlue;
    }
`);