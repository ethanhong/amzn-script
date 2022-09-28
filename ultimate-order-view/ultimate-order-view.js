/* global React */
/* global ReactDOM */
/* global QRCode */

const e = React.createElement;
const SearchContext = React.createContext();
const QRCodeContext = React.createContext();

function getBags() {
  const bags = [];

  const picklistsTableRows = [...document.querySelectorAll('#picklists_table > tbody > tr')];
  picklistsTableRows.shift(); // drop header row

  const rowContents = picklistsTableRows.map(row => row.textContent.trim().split(/\s+/));
  const rowUrls = picklistsTableRows.map(row => row.querySelectorAll('a'));

  for (let i = 0; i < rowContents.length; i += 1) {
    const bag = {};
    bag.picker = {};
    [bag.id, bag.zone, bag.status, bag.spoo, bag.pickerLogin] = rowContents[i];
    bag.pickerUrl = rowUrls[i][1].href;
    bag.packUrl = rowUrls[i][4].href;
    bag.code = getBagCode(bag.spoo);
    bag.totalItem = getBagTotalItem(bag.spoo);
    bags.push(bag);
  }
  return bags;
}

function getBagCode(spoo) {
  const spooLink = [...document.querySelectorAll('a')].find(node => node.textContent === spoo);
  const contents = spooLink.parentNode.childNodes[5].textContent.trim().split(/\s+/);
  return contents[1] || '-';
}
function getBagTotalItem(spoo) {
  const spooLink = [...document.querySelectorAll('a')].find(node => node.textContent === spoo);
  const contents = spooLink.parentNode.childNodes[7].textContent.trim().split(/\s+/);
  return contents[0] || '-';
}

function BagRow({ bag, completionTime }) {
  const { searchTerm } = React.useContext(SearchContext);
  const { setQRCodeContent } = React.useContext(QRCodeContext);

  const handleOnClick = event => {
    event.stopPropagation();
    setQRCodeContent(event.target.textContent);
  };

  const pickerLik = e('a', { href: bag.pickerUrl }, `${bag.pickerLogin}`);
  const packLink = e('a', { href: bag.packUrl }, 'Pack');
  const rowCells = [
    e('td', null, bag.id),
    e('td', null, bag.zone),
    e('td', null, bag.status),
    e('td', null, completionTime),
    e('td', { onClick: handleOnClick }, bag.code),
    e('td', { onClick: handleOnClick }, bag.spoo),
    e('td', null, pickerLik),
    e('td', null, `${bag.totalItem} items`),
    e('td', null, packLink),
  ];

  const keyword = searchTerm.toUpperCase();
  const bagCode = bag.code.toUpperCase();
  const bagSpoo = bag.spoo.toUpperCase();
  const trAttr =
    keyword && (containsKeyword(bagCode, keyword) || containsKeyword(bagSpoo, keyword))
      ? { className: 'search-target' }
      : null;

  return e('tr', trAttr, rowCells);
}

function containsKeyword(str, keyword) {
  return str.indexOf(keyword) > -1;
}

function BagTable() {
  const headers = [
    'ID',
    'Zone',
    'Status',
    'Completion Time',
    'Tracking Code',
    'Spoo',
    'Picker',
    'Total Items',
    '',
  ];
  const headerRow = e(
    'tr',
    null,
    headers.map(header => e('th', null, `${header}`))
  );

  const bags = getBags();
  const [completionTimeArray, setCompletionTimeArray] = React.useState(
    Array(bags.length).fill('-')
  );

  React.useEffect(() => {
    for (let i = 0; i < bags.length; i += 1) {
      const bag = bags[i];
      const fetchURL =
        window.location.hostname === 'aftlite-na.amazon.com'
          ? '/wms/view_picklist_history?picklist_id='
          : '/picklist/view_picklist_history?picklist_id=';

      fetch(`${fetchURL}${encodeURIComponent(bag.id)}`)
        .then(res => res.text())
        .then(page => extractCompletionTime(page))
        .then(time =>
          setCompletionTimeArray(prevArray => [
            ...prevArray.slice(0, i),
            time,
            ...prevArray.slice(i + 1),
          ])
        );
    }
  }, []);

  const bagRows = bags.map((bag, i) => e(BagRow, { bag, completionTime: completionTimeArray[i] }));
  return e('table', { id: 'bag-table' }, [e('thead', null, headerRow), e('tbody', null, bagRows)]);
}

function extractCompletionTime(page) {
  const completionTimeSelector =
    window.location.hostname === 'aftlite-na.amazon.com'
      ? 'body > table:nth-child(6) > tbody > tr:nth-child(6)'
      : 'div.a-row:nth-child(10)';

  const timeRe = /\d{1,2}:\d{1,2}/;
  const html = new DOMParser().parseFromString(page, 'text/html');
  const completionTime = html.querySelector(completionTimeSelector).textContent.match(timeRe);

  return completionTime || '-';
}

function makeQRCode(str) {
  return new QRCode(document.querySelector('#qrcode-container'), {
    text: str,
    width: 160,
    height: 160,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H,
  });
}

function QRCodeArea() {
  const { qrcodeContent } = React.useContext(QRCodeContext);

  const qrcodeContainer = e('div', { id: 'qrcode-container' });
  const qrcodeText = e('div', { id: 'qrcode-text' }, qrcodeContent);

  return e('div', { id: 'qrcode-area' }, [qrcodeContainer, qrcodeText]);
}

function SearchBar() {
  const { searchTerm, setsearchTerm } = React.useContext(SearchContext);
  const handleOnChange = evt => setsearchTerm(evt.target.value);

  return e('form', null, [
    e('input', {
      type: 'text',
      placeholder: 'Search by tracking-code or spoo',
      size: '30',
      value: searchTerm,
      onChange: handleOnChange,
      style: { lineHeight: '1.5rem' },
    }),
    /*     e('input', {
      type: 'checkbox',
      checked: isStockOnly,
      onChange: this.handleInStockChange,
    }),
    'Only show related packages', */
  ]);
}

function UltimateTable() {
  const [qrcodeMaker, setQRCodeMaker] = React.useState(null);
  const [qrcodeContent, setQRCodeContent] = React.useState('');

  React.useEffect(() => {
    if (qrcodeMaker === null) {
      setQRCodeMaker(makeQRCode(qrcodeContent));
    } else {
      qrcodeMaker.makeCode(qrcodeContent);
    }
  }, [qrcodeContent]);

  const bagTable = e(BagTable);
  const qrcodeArea = e(QRCodeArea);
  const ultimateTableContainer = e('div', { id: 'ultimateTable-container' }, [
    bagTable,
    qrcodeArea,
  ]);
  return e(
    QRCodeContext.Provider,
    {
      value: { qrcodeContent, setQRCodeContent },
    },
    ultimateTableContainer
  );
}

function App() {
  const [searchTerm, setsearchTerm] = React.useState('');

  return e(SearchContext.Provider, { value: { searchTerm, setsearchTerm } }, [
    e(SearchBar),
    e(UltimateTable),
  ]);
}

function getLogin() {
  return document.getElementsByTagName('span')[0].innerHTML.match(/\(([^)]+)\)/)[1];
}

function isVerifiedUser(user) {
  console.log(`hello, ${user}`);
  return true;
}

// eslint-disable-next-line no-unused-vars
function ultimateOrderView() {
  if (!isVerifiedUser(getLogin())) {
    return;
  }
  const rootDiv = document.createElement('div');
  rootDiv.setAttribute('id', 'root');
  document.body.insertBefore(rootDiv, document.querySelector('#orders_form'));
  ReactDOM.render(e(App), document.querySelector('#root'));
}
