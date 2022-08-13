// ==UserScript==
// @name         Enhance Order View
// @namespace    https://github.com/ethanhong/amzn-script
// @version      0.1
// @description  enhance order view
// @author       Pei
// @match        https://aftlite-na.amazon.com/wms/view_order/*
// @match        https://aftlite-na.amazon.com/wms/view_order
// @require      https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js
// @grant        GM_addStyle
// ==/UserScript==

const SELECTOR = {
    pickLists: '#picklists_table',
    totesTable: 'body > table:nth-child(5) > tbody:nth-child(1) > tr:nth-child(12) > td:nth-child(2) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td'
}
let allSpoo = [];
let allTracking = [];
let allItemNo = [];

let qrcode;

(function () {

    'use strict';

    //grab tote info
    let allTotes = document.querySelectorAll(SELECTOR.totesTable);

    //categorize tote info, (Spoo, tracking, number of items)
    allTotes.forEach(function (tote) {
        let info = tote.innerText.split(/[\n:]+/);
        allSpoo.push(info[0]);
        allTracking.push(info[2]);
        allItemNo.push(info[3]);
    });

    //clone the table of picklists
    let myTable = document.querySelector(SELECTOR.pickLists).cloneNode(true);
    myTable.setAttribute('id', 'myTable');


    //manipulate myTable
    //get rows
    let rows = myTable.rows;

    //remove useless attributes in th
    for (let j = 0; j < rows[0].cells.length; j++) {
        rows[0].cells[j].removeAttribute('width');
        rows[0].cells[j].removeAttribute('align');
    }

    //modify some header text
    rows[0].cells[0].textContent = 'Picklist';
    rows[0].cells[1].textContent = 'Zone';
    rows[0].cells[3].textContent = 'Totes';
    rows[0].cells[4].textContent = 'Picker';

    //remove and insert data
    for (let i = 0; i < rows.length; i++) {

        //remove unwanted columns
        rows[i].deleteCell(6);
        rows[i].deleteCell(5);

        //add useful columns
        let new_cell;
        let spoo_index = allSpoo.indexOf(rows[i].cells[3].textContent.trim());
        if (spoo_index === -1) {
            //add Tracking code
            new_cell = rows[i].insertCell(3);
            new_cell.outerHTML = '<th>Tracking</th>'
            //add number of items
            new_cell = rows[i].insertCell(-1); //last column
            new_cell.outerHTML = '<th></th>'
        } else {
            //add Tracking code
            new_cell = rows[i].insertCell(3);
            new_cell.innerHTML = allTracking[spoo_index].slice(0, -4) + '<b>' + allTracking[spoo_index].slice(-4) + '</b>';
            new_cell.addEventListener('click', function () {
                makeQRCode(allTracking[spoo_index]);
            }, false);
            //add number of items
            new_cell = rows[i].insertCell(-1); //last column
            new_cell.appendChild(document.createTextNode(allItemNo[spoo_index]));
        }

        //remove link from spoo number
        if (i > 0) { //skip header
            let spoo_cell = rows[i].cells[4];
            let spoo_anchor_element = spoo_cell.firstElementChild;
            let spoo_text_node = document.createTextNode(spoo_anchor_element.textContent);
            spoo_anchor_element.textContent = '[open]';
            spoo_anchor_element.style.marginLeft = '5px';
            spoo_cell.insertBefore(spoo_text_node, spoo_anchor_element);

            //add click to generate qrcode function
            spoo_cell.addEventListener('click', function () {
                makeQRCode(spoo_text_node.nodeValue);
            }, false);
        }
    }

    //create a container for qrcode
    let qr = document.createElement('div');
    qr.setAttribute('id', 'qrcode_container');

    //create a div showing qr_text and append to qrcode_container
    let qrText = document.createElement('div');
    qrText.setAttribute('id', 'qr_text');

    //create a container for qrcode_container + qr_text
    let qrcodeWithText = document.createElement('div');
    qrcodeWithText.setAttribute('id', 'qrcode_with_text');
    qrcodeWithText.appendChild(qr);
    qrcodeWithText.appendChild(qrText);

    //put whole container into body
    let b = document.body;
    b.insertBefore(document.createElement('br'), b.childNodes[4]);
    b.insertBefore(document.createElement('br'), b.childNodes[4]);
    b.insertBefore(qrcodeWithText, b.childNodes[4]);
    b.insertBefore(myTable, b.childNodes[4]);

}());


function makeQRCode(str) {
    //console.log('make code: ', str);
    if (qrcode === undefined) {
        qrcode = new QRCode(document.getElementById("qrcode_container"), {
            text: str,
            width: 250,
            height: 250,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } else {
        qrcode.makeCode(str);
    }
    document.getElementById('qr_text').innerText = str;
}


//--------------------------- CSS -------------------------------------------------------//
GM_addStyle(`
    html, body {
        margin-left:10px;
    }

    #myTable {
        display: inline-block;
        border-collapse: collapse;
        font-family: monospace;
        font-size: 18px;
        margin-right: 100px;
        vertical-align: top;
    }

    #myTable tr:nth-child(odd) {
        background-color: whitesmoke;
    }

    #myTable tr:hover {
        background-color: lightgrey;
    }

    #myTable tr th {
        background-color: whitesmoke;
        padding: 12px;
        text-align: center;
    }

    #myTable tr td {
        padding: 12px;
     }

    #qrcode_with_text {
        display: inline-block;
        font-family: monospace;
        vertical-align: top;
    }
`);
