// ==UserScript==
// @name         Find Bags [como]
// @namespace    https://github.com/ethanhong/amzntools
// @version      1.0
// @description  find bag tool - como part
// @author       Pei
// @match        file:///C:/Users/pyhon/git/ethanhong/amzntools-src/material/como-package.html
// @match        https://como-operations-dashboard-iad.iad.proxy.amazon.com/store/*/packages
// @require      https://unpkg.com/react@18/umd/react.production.min.js
// @require      https://unpkg.com/react-dom@18/umd/react-dom.production.min.js
// ==/UserScript==

/* global React */
/* global ReactDOM */
/* eslint-disable prefer-destructuring */

const e = React.createElement;

const getCSS = () => {
  const style = `
  #search-bar {
    margin-bottom: 1rem;
  }

  #search_input {
    margin-right: 0.2rem;
  }

  #search_input, #clear_btn {
    line-height: 2.5rem;
  }
  `;
  return style;
};

const SearchBar = ({ searchTerm, setSearchTerm, rows }) => {
  const handleOnChange = (evt) => {
    const searchValue = evt.target.value;
    setSearchTerm(searchValue);
    rows
      .filter((row) => !searchValue.includes(row.textContent.trim().split(/[\n\s]+/)[0]))
      .map((row) => row.classList.add('hide'));
  };
  const handleOnClear = () => {
    setSearchTerm('');
    rows.map((row) => row.classList.remove('hide'));
  };
  return e('form', null, [
    e('input', {
      id: 'search_input',
      type: 'text',
      placeholder: 'Search bags ...',
      size: '100',
      value: searchTerm,
      onChange: handleOnChange,
    }),
    e('input', {
      id: 'clear_btn',
      type: 'button',
      value: 'Clear',
      onClick: handleOnClear,
    }),
  ]);
};

const App = ({ rows }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  React.useEffect(() => {
    document.querySelector('#search_input').focus();
  }, []);
  return e('div', { id: 'search-bar' }, e(SearchBar, { searchTerm, setSearchTerm, rows }));
};

// eslint-disable-next-line no-unused-vars
const startFindBag = () => {
  // add stylesheet
  const styleSheet = document.createElement('style');
  styleSheet.innerText = getCSS();
  document.head.appendChild(styleSheet);

  // data rows
  const rows = [...document.querySelectorAll('div[role="rowgroup"]:nth-child(2) div.ui-grid-row')];

  // mount app
  const rootDiv = document.createElement('div');
  const countTextEle = document.querySelector('div.ng-scope > h2');
  countTextEle.after(rootDiv);
  ReactDOM.createRoot(rootDiv).render(e(App, { rows }));
};
