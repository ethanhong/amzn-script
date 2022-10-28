// ==UserScript==
// @name         One Item Image
// @namespace    https://github.com/ethanhong/amzn-tools/tree/main/release
// @version      1.0.1
// @description  Show image if there is only one item
// @author       Pei
// @match        https://aftlite-portal.amazon.com/picklist/view_pack_by_picklist*
// @match        https://aftlite-portal.amazon.com/picklist/pack_by_picklist?picklist_id=*
// @match        https://aftlite-na.amazon.com/wms/pack_by_picklist?picklist_id=*
// @updateURL    https://ethanhong.github.io/amzn-tools/release/one-item-image.user.js
// @downloadURL  https://ethanhong.github.io/amzn-tools/release/one-item-image.user.js
// @supportURL   https://github.com/ethanhong/amzn-tools/issues
// ==/UserScript==

// eslint-disable-next-line func-names
;(function () {
  const tds = document.querySelectorAll('td')
  const asin = [...tds].map((x) => x.textContent).filter((x) => x.match(/^[A-Z0-9]{10}$/))
  if (asin.length === 1) {
    addImage(asin[0])
  }
})()

function addImage(asin) {
  const img = document.createElement('img')
  img.src = `https://m.media-amazon.com/images/P/${asin}.jpg`
  img.width = 250
  img.style.marginLeft = '3rem'
  document.body.append(img)
}
