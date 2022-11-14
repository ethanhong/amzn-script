/* eslint-disable no-unused-vars */
const lists = [
  { app: 'Better Outbound Dashboard [dev]', blckList: [] },
  { app: 'Better Outbound Dashboard [portal]', blckList: [] },
  { app: 'Better Outbound Dashboard [na]', blckList: [] },
  { app: 'Ultimate Order View', blckList: [] },
  { app: 'Picklist Dashboard', blckList: [] },
  { app: 'Find Bags [como]', blckList: [] },
  { app: 'Find Bags [aftlite]', blckList: [] },
]

const isAftlitePortal = window.location.hostname === 'aftlite-portal.amazon.com'

async function isValid(scriptName, scriptVersion) {
  const appObj = lists.find((list) => list.app === scriptName)
  if (!appObj) {
    console.log('Script name is not exist.', scriptName)
    return false
  }

  const userName = isAftlitePortal ? await getPortalUser() : await getNaUser()

  console.log('User: ', userName)
  console.log('Script: ', scriptName)
  console.log('Version: ', scriptVersion)

  return true
}

async function getPortalUser() {
  const res = await fetch('/home')
  const txt = await res.text()
  const html = new DOMParser().parseFromString(txt, 'text/html')
  return html.querySelector('h2').textContent.split(/\s/).slice(-1)[0].trim()
}

async function getNaUser() {
  const res = await fetch('/indirect_action/signin_indirect_action')
  const txt = await res.text()
  const html = new DOMParser().parseFromString(txt, 'text/html')
  return html.getElementsByTagName('span')[0].innerHTML.match(/\(([^)]+)\)/)[1]
}
