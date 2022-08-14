// ==UserScript==
// @name         Auto Indirect Labor Tracking 
// @namespace    https://github.com/ethanhong/amzn-script
// @version      1.0
// @description  Sign in to OBindirect every period of time
// @author       Pei
// @match        https://aftlite-na.amazon.com/indirect_action/signin_indirect_action*
// @grant        none
// ==/UserScript==

(function () {

    let code1 = "OBINDIRECT";

    var button1 = document.createElement("button");
    button1.innerHTML = code1;
    button1.onclick = function () {
        var login = document.getElementsByTagName("span")[0].innerHTML.match(/\(([^)]+)\)/)[1];
        document.getElementsByName("name")[0].value = login;
        document.getElementsByName("code")[0].value = code1;
    };

    document.getElementsByTagName("form")[0].appendChild(button1);

    button1.click();
    setInterval(() => button1.click(), 420000);

})();